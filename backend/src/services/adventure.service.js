const mongoose = require("mongoose");

const Adventure = require("../models/Adventure");
const AdventureAccess = require("../models/AdventureAccess");
const generateCode = require("../utils/generateCode");
const { isObjectId } = require("../utils/validate");
const { httpError, sameId, toPerson } = require("./club.service");

const personFields = "firstName lastName username";

const byName = (a, b) => a.name.localeCompare(b.name);

/* ===================== CATALOGUE ===================== */

/** The adventures listed in the app: published entries that have a slug (eq1, eq2, ...). */
const listCatalogue = async () => {
  const adventures = await Adventure.find({
    slug: mongoose.trusted({ $exists: true, $ne: null }),
    isPublished: true,
  }).sort({ order: 1, createdAt: 1 });

  return adventures.map((a) => ({
    id: a._id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle || "",
    unlocked: a.unlocked !== false,
  }));
};

const assertOpen = (adventure) => {
  if (!adventure || adventure.isPublished === false) throw httpError(404, "Adventure not found");
  if (adventure.unlocked === false) throw httpError(400, "This adventure is not open yet");
};

/* ===================== CREATING CODES (GMs) ===================== */

const uniqueCodeError = (err) =>
  err.code === 11000 && err.keyPattern && err.keyPattern.accessCode;

/**
 * A GM's code for an adventure. One per GM per adventure: asking again returns the same
 * group. Returns { access, created }.
 */
const createCode = async (userId, adventureId) => {
  if (!isObjectId(adventureId)) throw httpError(400, "Adventure ID required");

  const adventure = await Adventure.findById(adventureId);
  assertOpen(adventure);

  const existing = await AdventureAccess.findOne({ adventure: adventure._id, owner: userId });
  if (existing) return { access: existing, adventure, created: false };

  // Codes are random; on the rare clash with an existing code just draw another.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const access = await AdventureAccess.create({
        adventure: adventure._id,
        owner: userId,
        accessCode: generateCode(),
        players: [userId],
      });
      return { access, adventure, created: true };
    } catch (err) {
      if (!uniqueCodeError(err)) throw err;
    }
  }

  throw httpError(500, "Could not create a code, please try again");
};

/* ===================== VIEWS ===================== */

const summarize = (access, adventure, userId) => {
  const owner = sameId(access.owner, userId);

  return {
    id: access._id,
    adventure: {
      id: adventure._id,
      title: adventure.title,
      subtitle: adventure.subtitle || "",
    },
    role: owner ? "owner" : "player",
    playerCount: access.players.length,
    // Only the owner sees (and can hand out) the code or its state.
    ...(owner && { code: access.accessCode, isActive: access.isActive }),
  };
};

/** Groups I belong to, newest activity first. */
const listGroups = async (userId) => {
  const groups = await AdventureAccess.find({ players: userId })
    .sort({ updatedAt: -1 })
    .populate("adventure", "title subtitle");

  return groups.filter((g) => g.adventure).map((g) => summarize(g, g.adventure, userId));
};

/** Loads a group the caller belongs to. Non-members get a 404 so ids can't be probed. */
const loadMemberGroup = async (userId, groupId) => {
  if (!isObjectId(groupId)) throw httpError(400, "Invalid group id");

  const access = await AdventureAccess.findById(groupId);
  if (!access || !access.players.some((p) => sameId(p, userId))) {
    throw httpError(404, "Group not found");
  }
  return access;
};

const loadOwnedGroup = async (userId, groupId) => {
  const access = await loadMemberGroup(userId, groupId);
  if (!sameId(access.owner, userId)) {
    throw httpError(403, "Only the group owner can do this");
  }
  return access;
};

/** A group with its players, for members. */
const getGroup = async (userId, groupId) => {
  const access = await loadMemberGroup(userId, groupId);

  const adventure = await Adventure.findById(access.adventure);
  if (!adventure) throw httpError(404, "Group not found");

  // Summarize first: once `players` is populated it holds user documents, not ids.
  const summary = summarize(access, adventure, userId);
  const ownerId = String(access.owner);

  await access.populate({ path: "players", select: personFields });

  const players = access.players
    .map((u) => toPerson(u, String(u._id) === ownerId ? "owner" : "player"))
    .sort((a, b) => (a.role === b.role ? byName(a, b) : a.role === "owner" ? -1 : 1));

  return { ...summary, players };
};

/* ===================== JOINING AND LEAVING ===================== */

/** Redeems a code. Returns the group (as the caller's summary) and its adventure. */
const joinByCode = async (userId, code) => {
  const access = await AdventureAccess.findOne({
    accessCode: String(code).trim().toUpperCase(),
    isActive: true,
  });

  // Same answer for unknown and paused codes, so a code's state isn't revealed.
  if (!access) throw httpError(404, "Invalid code");

  const adventure = await Adventure.findById(access.adventure);
  assertOpen(adventure);

  // $addToSet makes joining idempotent: entering a code twice (or as its owner) adds nothing.
  const updated = await AdventureAccess.findByIdAndUpdate(
    access._id,
    { $addToSet: { players: userId } },
    { new: true }
  );

  return { group: summarize(updated, adventure, userId), adventure };
};

const leaveGroup = async (userId, groupId) => {
  const access = await loadMemberGroup(userId, groupId);

  if (sameId(access.owner, userId)) {
    throw httpError(400, "The owner cannot leave. Delete the group instead.");
  }

  access.players = access.players.filter((p) => !sameId(p, userId));
  await access.save();
};

/* ===================== OWNER CONTROLS ===================== */

const removePlayer = async (userId, groupId, targetId) => {
  const access = await loadOwnedGroup(userId, groupId);

  if (!isObjectId(targetId)) throw httpError(400, "Valid userId is required");
  if (sameId(targetId, userId)) throw httpError(400, "You cannot remove yourself");
  if (!access.players.some((p) => sameId(p, targetId))) {
    throw httpError(404, "That player is not in this group");
  }

  access.players = access.players.filter((p) => !sameId(p, targetId));
  await access.save();
};

/** Replaces the code: the old one stops working, current players stay. */
const rotateCode = async (userId, groupId) => {
  const access = await loadOwnedGroup(userId, groupId);

  for (let attempt = 0; attempt < 5; attempt++) {
    access.accessCode = generateCode();
    try {
      await access.save();
      return;
    } catch (err) {
      if (!uniqueCodeError(err)) throw err;
    }
  }

  throw httpError(500, "Could not create a new code, please try again");
};

const setActive = async (userId, groupId, isActive) => {
  if (typeof isActive !== "boolean") throw httpError(400, "isActive must be true or false");

  const access = await loadOwnedGroup(userId, groupId);
  access.isActive = isActive;
  await access.save();
};

const deleteGroup = async (userId, groupId) => {
  const access = await loadOwnedGroup(userId, groupId);
  await AdventureAccess.deleteOne({ _id: access._id });
};

module.exports = {
  listCatalogue,
  createCode,
  listGroups,
  getGroup,
  joinByCode,
  leaveGroup,
  removePlayer,
  rotateCode,
  setActive,
  deleteGroup,
  summarize,
};

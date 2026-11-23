const mongoose = require("mongoose");

const User = require("../models/User");
const Adventure = require("../models/Adventure");
const AdventureAccess = require("../models/AdventureAccess");
const generateCode = require("../utils/generateCode");
const { isObjectId } = require("../utils/validate");
const { httpError, sameId } = require("./club.service");

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
    requiresGM: a.requiresGM === true,
  }));
};

const assertOpen = (adventure) => {
  if (!adventure || adventure.isPublished === false) throw httpError(404, "Adventure not found");
  if (adventure.unlocked === false) throw httpError(400, "This adventure is not open yet");
};

/* ===================== MY ADVENTURES ===================== */

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
    // Only the Game Mentor who bought the adventure sees (and can hand out) the codes.
    ...(owner && {
      memberCode: access.accessCode,
      gmCode: access.gmCode || null,
      isActive: access.isActive,
    }),
  };
};

/** Adventures I own or have joined, newest activity first. */
const listMine = async (userId) => {
  const list = await AdventureAccess.find({ players: userId })
    .sort({ updatedAt: -1 })
    .populate("adventure", "title subtitle");

  return list.filter((a) => a.adventure).map((a) => summarize(a, a.adventure, userId));
};

/* ===================== REDEEMING CODES ===================== */

/**
 * Redeems a code.
 *  - A Game Mentor code only works for the Game Mentor who bought the adventure.
 *  - A member code only works for approved members of that Game Mentor's club.
 * Unknown, paused and not-yours codes all answer "Invalid code" so a code's state isn't revealed.
 */
const redeemCode = async (userId, code) => {
  const value = String(code).trim().toUpperCase();

  const byGmCode = await AdventureAccess.findOne({ gmCode: value });
  const access = byGmCode || (await AdventureAccess.findOne({ accessCode: value, isActive: true }));
  if (!access) throw httpError(404, "Invalid code");

  if (byGmCode && !sameId(access.owner, userId)) throw httpError(404, "Invalid code");

  if (!byGmCode && !sameId(access.owner, userId)) {
    const [user, owner] = await Promise.all([User.findById(userId), User.findById(access.owner)]);
    const inSameClub =
      user && owner && owner.clubCode && user.clubApproved && user.clubCode === owner.clubCode;
    if (!inSameClub) {
      throw httpError(403, "Only approved members of this Game Mentor's club can join this adventure");
    }
  }

  const adventure = await Adventure.findById(access.adventure);
  assertOpen(adventure);

  // $addToSet makes joining idempotent.
  const updated = await AdventureAccess.findByIdAndUpdate(
    access._id,
    { $addToSet: { players: userId } },
    { new: true }
  );

  return { group: summarize(updated, adventure, userId), adventure };
};

/* ===================== OWNER CONTROLS ===================== */

const loadOwned = async (userId, id) => {
  if (!isObjectId(id)) throw httpError(400, "Invalid adventure id");
  const access = await AdventureAccess.findById(id);
  if (!access || !sameId(access.owner, userId)) throw httpError(404, "Adventure not found");
  return access;
};

/** Replaces the member code: the old one stops working, current players stay. */
const rotateMemberCode = async (userId, id) => {
  const access = await loadOwned(userId, id);

  for (let attempt = 0; attempt < 5; attempt++) {
    access.accessCode = generateCode();
    try {
      await access.save();
      return;
    } catch (err) {
      if (!(err.code === 11000 && err.keyPattern && err.keyPattern.accessCode)) throw err;
    }
  }
  throw httpError(500, "Could not create a new code, please try again");
};

const setActive = async (userId, id, isActive) => {
  if (typeof isActive !== "boolean") throw httpError(400, "isActive must be true or false");
  const access = await loadOwned(userId, id);
  access.isActive = isActive;
  await access.save();
};

module.exports = { listCatalogue, listMine, redeemCode, rotateMemberCode, setActive, summarize };

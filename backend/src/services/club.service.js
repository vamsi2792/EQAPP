const mongoose = require("mongoose");

const User = require("../models/User");
const Club = require("../models/Club");

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const sameId = (a, b) => String(a) === String(b);
const includesId = (list, id) => list.some((x) => sameId(x, id));

/** The caller's role in `club`: gm | moderator | member | pending | null. */
const roleIn = (club, userId) => {
  if (!club) return null;
  if (sameId(club.gm, userId)) return "gm";
  if (includesId(club.moderators, userId)) return "moderator";
  if (includesId(club.members, userId)) return "member";
  if (includesId(club.pendingMembers, userId)) return "pending";
  return null;
};

const clearClubFields = (userIds) =>
  User.updateMany(
    { _id: mongoose.trusted({ $in: userIds }) },
    { clubCode: null, clubRole: null, clubApproved: false }
  );

/**
 * Loads a user and the club their record points at. A dangling reference (club deleted,
 * or the player is not actually listed in it) is repaired on the spot, so callers can
 * trust `club` and `role`.
 */
const loadMyClub = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, "User not found");

  if (!user.clubCode) return { user, club: null, role: null };

  const club = await Club.findOne({ clubCode: user.clubCode });
  const role = roleIn(club, user._id);

  if (!club || !role) {
    await clearClubFields([user._id]);
    user.clubCode = null;
    user.clubRole = null;
    user.clubApproved = false;
    return { user, club: null, role: null };
  }

  return { user, club, role };
};

/** Removes a player from every list of the club (member, moderator, pending). */
const removeFromClub = (club, memberId) => {
  club.members = club.members.filter((id) => !sameId(id, memberId));
  club.moderators = club.moderators.filter((id) => !sameId(id, memberId));
  club.pendingMembers = club.pendingMembers.filter((id) => !sameId(id, memberId));
  club.totalMembers = club.members.length;
};

/** Leave the club, or withdraw a join request. The GM must delete the club instead. */
const leaveClub = async (userId) => {
  const { user, club, role } = await loadMyClub(userId);

  if (!club) throw httpError(400, "Not part of any club");
  if (role === "gm") {
    throw httpError(400, "GM cannot leave the club. Transfer ownership or delete club.");
  }

  removeFromClub(club, user._id);
  await club.save();
  await clearClubFields([user._id]);

  return role === "pending" ? "Join request cancelled" : "Left club successfully";
};

/** GM only: deletes the club and frees everyone in it. */
const deleteClub = async (userId) => {
  const { club, role } = await loadMyClub(userId);

  if (!club) throw httpError(404, "Club not found");
  if (role !== "gm") throw httpError(403, "Only the club GM can do this");

  const everyone = [club.gm, ...club.members, ...club.pendingMembers];
  await clearClubFields(everyone);
  await Club.deleteOne({ _id: club._id });
};

/* ===================== VIEW ===================== */

const personFields = "firstName lastName username";

const toPerson = (u, role) => ({
  id: u._id,
  name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Player",
  username: u.username || null,
  ...(role && { role }),
});

const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * What `userId` is allowed to see of their club:
 *   - everyone in it: the club's info and the approved roster
 *   - GM / moderators: also the pending requests and the banned list
 *   - a pending player: only the club's name (no roster, no code list)
 */
const buildMyClubView = async (userId) => {
  const { club, role } = await loadMyClub(userId);

  if (!club) return { club: null, myRole: null };

  const info = {
    id: club._id,
    name: club.clubName,
    code: club.clubCode,
    bio: club.bio || "",
    discord: club.discord || "",
    totalMembers: club.totalMembers,
  };

  if (role === "pending") return { club: { name: info.name, code: info.code }, myRole: role };

  const staff = role === "gm" || role === "moderator";

  // Work out roles from plain ids first: once populated, the lists hold user documents.
  const gmId = String(club.gm);
  const moderatorIds = new Set(club.moderators.map(String));
  const roleOf = (id) =>
    String(id) === gmId ? "gm" : moderatorIds.has(String(id)) ? "moderator" : "member";

  await club.populate([
    { path: "members", select: personFields },
    ...(staff
      ? [
          { path: "pendingMembers", select: personFields },
          { path: "bannedMembers", select: personFields },
        ]
      : []),
  ]);

  const members = club.members
    .map((u) => toPerson(u, roleOf(u._id)))
    .sort((a, b) => {
      const order = { gm: 0, moderator: 1, member: 2 };
      return order[a.role] - order[b.role] || byName(a, b);
    });

  return {
    club: info,
    myRole: role,
    members,
    ...(staff && {
      pending: club.pendingMembers.map((u) => toPerson(u)).sort(byName),
      banned: club.bannedMembers.map((u) => toPerson(u)).sort(byName),
    }),
  };
};

module.exports = {
  httpError,
  sameId,
  includesId,
  roleIn,
  clearClubFields,
  toPerson,
  loadMyClub,
  removeFromClub,
  leaveClub,
  deleteClub,
  buildMyClubView,
};

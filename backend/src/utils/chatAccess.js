const mongoose = require("mongoose");
const User = require("../models/User");
const AdventureAccess = require("../models/AdventureAccess");

const idStr = (v) => String(v);

// The app enables mongoose sanitizeFilter, which neutralises query operators. These filters
// are built on the server from ids we already loaded, so they are marked trusted.
const trusted = (obj) => mongoose.trusted(obj);

// Players can only chat with people they actually play with: an approved club mate, or
// someone who joined the same adventure access code.
const sharesApprovedClub = (a, b) =>
  !!a.clubCode && a.clubApproved === true && b.clubApproved === true && a.clubCode === b.clubCode;

const sharesAdventure = async (idA, idB) =>
  !!(await AdventureAccess.exists({ players: trusted({ $all: [idA, idB] }) }));

/** True when `userA` and `userB` (User documents) are allowed to chat. */
const canChat = async (userA, userB) => {
  if (!userA || !userB) return false;
  if (idStr(userA._id) === idStr(userB._id)) return false;
  if (userA.emailVerified !== true || userB.emailVerified !== true) return false;

  if (sharesApprovedClub(userA, userB)) return true;

  return sharesAdventure(userA._id, userB._id);
};

const publicUser = (u) => ({
  id: u._id,
  firstName: u.firstName,
  lastName: u.lastName,
  username: u.username || null,
});

/** Everyone `userId` may start a chat with: approved club mates + adventure co-players. */
const listContacts = async (userId) => {
  const me = await User.findById(userId);
  if (!me || me.emailVerified !== true) return [];

  const ids = new Set();

  if (me.clubCode && me.clubApproved === true) {
    const mates = await User.find({
      _id: trusted({ $ne: me._id }),
      clubCode: me.clubCode,
      clubApproved: true,
    }).select("_id");
    mates.forEach((m) => ids.add(idStr(m._id)));
  }

  const accesses = await AdventureAccess.find({ players: me._id }).select("players");
  accesses.forEach((a) =>
    a.players.forEach((p) => {
      if (idStr(p) !== idStr(me._id)) ids.add(idStr(p));
    })
  );

  const users = await User.find({ _id: trusted({ $in: [...ids] }), emailVerified: true }).select(
    "firstName lastName username"
  );

  return users
    .map(publicUser)
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
};

module.exports = { canChat, listContacts, publicUser };

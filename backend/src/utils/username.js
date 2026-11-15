const mongoose = require("mongoose");
const User = require("../models/User");

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const RULES = "Username must be 3-20 characters: letters, numbers and underscores only";

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Lowercases and validates a username. Returns the normalized value or throws a 400.
 * Usernames are stored lowercase, so "Alex" and "alex" are the same name.
 */
const normalizeUsername = (raw) => {
  if (typeof raw !== "string") throw httpError(400, RULES);

  const username = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw httpError(400, RULES);

  return username;
};

/** Throws 400 when somebody other than `exceptUserId` already uses `username`. */
const assertUsernameFree = async (username, exceptUserId = null) => {
  const filter = { username };

  // The app enables mongoose sanitizeFilter, so the operator must be marked as trusted.
  if (exceptUserId) filter._id = mongoose.trusted({ $ne: exceptUserId });

  if (await User.exists(filter)) throw httpError(400, "Username already taken");
};

/** True when a MongoDB duplicate-key error was about the username index. */
const isUsernameDuplicate = (err) =>
  !!err && err.code === 11000 && !!err.keyPattern && "username" in err.keyPattern;

module.exports = {
  RULES,
  httpError,
  normalizeUsername,
  assertUsernameFree,
  isUsernameDuplicate,
};

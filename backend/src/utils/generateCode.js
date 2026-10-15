const crypto = require("crypto");

// Uppercase alphanumerics without look-alikes (0/O, 1/I/L) so codes are easy to read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates a random, human-friendly join code (default 6 chars, e.g. "K7QX2M").
 * Uses crypto.randomInt so codes are not guessable. Uniqueness is enforced by the
 * unique index on Club.clubCode / Adventure code fields, not here.
 */
const generateCode = (length = 6) => {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
};

module.exports = generateCode;

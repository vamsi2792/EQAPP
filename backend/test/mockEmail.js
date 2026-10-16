// Replaces utils/email with an in-memory outbox. Must be required BEFORE the app is loaded.
const outbox = [];

const emailPath = require.resolve("../src/utils/email");
require.cache[emailPath] = {
  id: emailPath,
  filename: emailPath,
  loaded: true,
  exports: async (to, subject, text) => {
    outbox.push({ to, subject, text });
  },
};

// Returns the 6-digit code from the most recent email sent to `to`.
const lastOtpFor = (to) => {
  const mail = [...outbox].reverse().find((m) => m.to === to);
  return mail && mail.text.match(/\d{6}/)[0];
};

module.exports = { outbox, lastOtpFor };

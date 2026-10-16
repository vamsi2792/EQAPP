// Content admins are identified by a verified account whose email is listed in ADMIN_EMAILS
// (comma-separated, case-insensitive). No database flag, so access cannot be granted
// by editing a profile and revoking it is just removing the email and restarting.
const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isAdminUser = (user) =>
  !!user &&
  user.emailVerified === true &&
  adminEmails().includes(String(user.email).toLowerCase());

module.exports = { isAdminUser };

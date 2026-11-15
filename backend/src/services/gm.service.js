const User = require("../models/User");
const Club = require("../models/Club");
const AdventureAccess = require("../models/AdventureAccess");
const GmApplication = require("../models/GmApplication");
const conduct = require("../utils/conduct");
const { isObjectId } = require("../utils/validate");
const { httpError, destroyClub } = require("./club.service");

const personFields = "firstName lastName username email accountType membershipActive";

const nameOf = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Player";

/* ===================== APPLICANT SIDE ===================== */

const serializeMine = (a) => ({
  id: a._id,
  status: a.status,
  message: a.message,
  decisionNote: a.decisionNote || "",
  createdAt: a.createdAt,
  reviewedAt: a.reviewedAt,
});

/**
 * Where the caller stands:
 *   gm                  already a Game Mentor
 *   pending             an application is waiting for review
 *   can_apply           a member who may apply
 *   membership_required everyone else (they need a membership first)
 */
const myStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, "User not found");

  const latest = await GmApplication.findOne({ user: user._id }).sort({ createdAt: -1 });

  let state;
  if (user.accountType === "gm") state = "gm";
  else if (latest && latest.status === "pending") state = "pending";
  else if (user.accountType === "member") state = "can_apply";
  else state = "membership_required";

  return { state, application: latest ? serializeMine(latest) : null };
};

const apply = async (userId, { message, conductVersion }) => {
  const { state } = await myStatus(userId);

  if (state === "gm") throw httpError(400, "You are already a Game Mentor");
  if (state === "pending") throw httpError(400, "You already have an application under review");
  if (state !== "can_apply") {
    throw httpError(403, "Only members can apply to become a Game Mentor");
  }

  if (conductVersion !== conduct.version) {
    throw httpError(400, "Please read the latest code of conduct and agree to it");
  }

  const text = typeof message === "string" ? message.trim() : "";
  if (text.length < GmApplication.MIN_MESSAGE || text.length > GmApplication.MAX_MESSAGE) {
    throw httpError(
      400,
      `Tell us a little about yourself (${GmApplication.MIN_MESSAGE}-${GmApplication.MAX_MESSAGE} characters)`
    );
  }

  try {
    const application = await GmApplication.create({
      user: userId,
      message: text,
      conductVersion: conduct.version,
      conductAcceptedAt: new Date(),
    });
    return serializeMine(application);
  } catch (err) {
    if (err.code === 11000) throw httpError(400, "You already have an application under review");
    throw err;
  }
};

/* ===================== ADMIN: APPLICATIONS ===================== */

const serializeForAdmin = (a) => ({
  id: a._id,
  status: a.status,
  message: a.message,
  decisionNote: a.decisionNote || "",
  createdAt: a.createdAt,
  reviewedAt: a.reviewedAt,
  applicant: a.user && {
    id: a.user._id,
    name: nameOf(a.user),
    username: a.user.username || null,
    email: a.user.email,
    accountType: a.user.accountType,
  },
});

const listApplications = async (status = "pending") => {
  if (!["pending", "approved", "declined"].includes(status)) {
    throw httpError(400, "status must be pending, approved or declined");
  }

  const rows = await GmApplication.find({ status })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", personFields);

  return rows.filter((a) => a.user).map(serializeForAdmin);
};

const loadPending = async (applicationId) => {
  if (!isObjectId(applicationId)) throw httpError(400, "Invalid application id");

  const application = await GmApplication.findById(applicationId);
  if (!application) throw httpError(404, "Application not found");
  if (application.status !== "pending") throw httpError(400, "This application was already decided");

  return application;
};

const readNote = (note) => {
  if (note === undefined) return "";
  if (typeof note !== "string" || note.length > GmApplication.MAX_NOTE) {
    throw httpError(400, `note must be text of at most ${GmApplication.MAX_NOTE} characters`);
  }
  return note.trim();
};

const finish = async (application, adminId, status, note) => {
  application.status = status;
  application.reviewedBy = adminId;
  application.reviewedAt = new Date();
  application.decisionNote = note;
  await application.save();
  await application.populate("user", personFields);
  return serializeForAdmin(application);
};

const approve = async (adminId, applicationId, note) => {
  const text = readNote(note);
  const application = await loadPending(applicationId);

  const user = await User.findById(application.user);
  if (!user) throw httpError(404, "The applicant no longer exists");
  if (user.accountType !== "member") {
    throw httpError(400, "The applicant is not a member (anymore), so they cannot become a Game Mentor");
  }

  // save(), not an update query: the User pre-save hook turns the new account type into
  // the GM permissions (create clubs, moderate, ...).
  user.accountType = "gm";
  await user.save();

  return finish(application, adminId, "approved", text);
};

const decline = async (adminId, applicationId, note) => {
  const text = readNote(note);
  const application = await loadPending(applicationId);
  return finish(application, adminId, "declined", text);
};

/* ===================== ADMIN: CURRENT GAME MENTORS ===================== */

/** What revoking this Game Mentor would delete. */
const impactOf = async (userId) => {
  const club = await Club.findOne({ gm: userId });
  const groups = await AdventureAccess.find({ owner: userId }).select("players");

  return {
    club: club ? { name: club.clubName, members: Math.max(0, club.members.length - 1) } : null,
    groups: groups.length,
    groupPlayers: groups.reduce((sum, g) => sum + Math.max(0, g.players.length - 1), 0),
  };
};

const listGms = async () => {
  const gms = await User.find({ accountType: "gm" })
    .sort({ firstName: 1, lastName: 1 })
    .select(personFields);

  return Promise.all(
    gms.map(async (u) => ({
      id: u._id,
      name: nameOf(u),
      username: u.username || null,
      email: u.email,
      impact: await impactOf(u._id),
    }))
  );
};

/**
 * Takes Game Mentor status away. Their club and every adventure group they own are
 * deleted (the people in them are freed), and the account goes back to member, or to
 * registrant when the membership is not active.
 */
const revokeGm = async (userId) => {
  if (!isObjectId(userId)) throw httpError(400, "Valid userId is required");

  const user = await User.findById(userId);
  if (!user) throw httpError(404, "User not found");
  if (user.accountType !== "gm") throw httpError(400, "This player is not a Game Mentor");

  const impact = await impactOf(user._id);

  const club = await Club.findOne({ gm: user._id });
  if (club) await destroyClub(club);

  await AdventureAccess.deleteMany({ owner: user._id });

  // save(), so the pre-save hook rewrites the permissions for the new account type.
  user.accountType = user.membershipActive ? "member" : "registrant";
  await user.save();

  return { impact, accountType: user.accountType };
};

module.exports = {
  myStatus,
  apply,
  listApplications,
  approve,
  decline,
  listGms,
  revokeGm,
  conduct,
};

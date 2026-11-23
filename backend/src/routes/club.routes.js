const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const Club = require("../models/Club");
const User = require("../models/User");

const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");
const generateCode = require("../utils/generateCode");
const { isNonEmptyString, isObjectId, isHttpUrl } = require("../utils/validate");
const clubs = require("../services/club.service");

const { httpError, sameId, includesId } = clubs;

const NAME_MAX = 60;
const BIO_MAX = 300;
const DISCORD_MAX = 200;

// Service errors carry an HTTP status; anything else is an unexpected failure.
const fail = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(fallback, err.message);
  return res.status(500).json({ message: fallback });
};

/* ===================== GUARDS ===================== */
// Rights come from the player's role in their OWN club, not from their account type:
// a moderator (an ordinary member promoted by the GM) can moderate too.

const requireRole = (allowed, message) => async (req, res, next) => {
  try {
    const { user, club, role } = await clubs.loadMyClub(req.user.userId);

    if (!club || !allowed.includes(role)) {
      return res.status(403).json({ message });
    }

    req.currentUser = user;
    req.club = club;
    req.myRole = role;
    next();
  } catch (err) {
    fail(res, err, "Club check failed");
  }
};

const requireStaff = requireRole(["gm", "moderator"], "Not allowed to moderate this club");
const requireGm = requireRole(["gm"], "Only the club GM can do this");

const targetMember = (req) => {
  const { memberId } = req.body;
  if (!isObjectId(memberId)) throw httpError(400, "Valid memberId is required");
  return memberId;
};

/* ===================== INPUT ===================== */

// Validates the editable club fields. `partial` allows leaving fields out (edit).
const readClubFields = (body, { partial }) => {
  const out = {};

  if (!partial || body.clubName !== undefined) {
    if (!isNonEmptyString(body.clubName)) throw httpError(400, "Club name is required");
    if (body.clubName.trim().length > NAME_MAX) {
      throw httpError(400, `Club name must be at most ${NAME_MAX} characters`);
    }
    out.clubName = body.clubName.trim();
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.length > BIO_MAX) {
      throw httpError(400, `bio must be text of at most ${BIO_MAX} characters`);
    }
    out.bio = body.bio.trim();
  }

  if (body.discord !== undefined) {
    const d = typeof body.discord === "string" ? body.discord.trim() : null;
    if (d === null || d.length > DISCORD_MAX || (d !== "" && !isHttpUrl(d))) {
      throw httpError(400, "discord must be an http(s) link");
    }
    out.discord = d;
  }

  return out;
};

/* ===================== MY CLUB ===================== */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json(await clubs.buildMyClubView(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load club");
  }
});

/* ===================== CREATE CLUB (GMs only, one club each) ===================== */
router.post(
  "/create",
  authMiddleware,
  permissionMiddleware("canCreateClub"),
  async (req, res) => {
    try {
      const fields = readClubFields(req.body, { partial: false });

      const { user, club: existing } = await clubs.loadMyClub(req.user.userId);
      if (existing) throw httpError(400, "You are already in a club");

      let club = null;

      // Codes are random; on the rare clash with an existing club just draw another.
      for (let attempt = 0; attempt < 5 && !club; attempt++) {
        try {
          club = await Club.create({
            ...fields,
            clubCode: generateCode(),
            gm: user._id,
            members: [user._id],
            totalMembers: 1,
          });
        } catch (err) {
          if (!(err.code === 11000 && err.keyPattern && err.keyPattern.clubCode)) throw err;
        }
      }

      if (!club) throw httpError(500, "Could not create the club, please try again");

      user.clubCode = club.clubCode;
      user.clubRole = "gm";
      user.clubApproved = true;
      await user.save();

      res.json(club);
    } catch (err) {
      fail(res, err, "Create club failed");
    }
  }
);

/* ===================== EDIT / DELETE (GM) ===================== */
router.patch("/me", authMiddleware, requireGm, async (req, res) => {
  try {
    const updates = readClubFields(req.body, { partial: true });

    Object.assign(req.club, updates);
    await req.club.save();

    res.json(await clubs.buildMyClubView(req.user.userId));
  } catch (err) {
    fail(res, err, "Update club failed");
  }
});

router.delete("/me", authMiddleware, async (req, res) => {
  try {
    await clubs.deleteClub(req.user.userId);
    res.json({ message: "Club deleted" });
  } catch (err) {
    fail(res, err, "Delete club failed");
  }
});

/* ===================== FIND A CLUB BY NAME ===================== */
// Members search for a club by name and ask to join; the code is never revealed here.
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) return res.status(400).json({ message: "Type at least 2 characters" });

    const escaped = q.slice(0, NAME_MAX).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = await Club.find(
      { clubName: mongoose.trusted({ $regex: escaped, $options: "i" }) }
    )
      .sort({ clubName: 1 })
      .limit(20);

    res.json(
      found.map((c) => ({
        id: c._id,
        clubName: c.clubName,
        bio: c.bio || "",
        memberCount: c.members.length,
      }))
    );
  } catch (err) {
    fail(res, err, "Club search failed");
  }
});

/* ===================== JOIN CLUB ===================== */
router.post(
  "/join",
  authMiddleware,
  permissionMiddleware("canJoinClub"),
  async (req, res) => {
    try {
      const { clubCode, clubId } = req.body;

      if (!isNonEmptyString(clubCode) && !isObjectId(clubId)) {
        return res.status(400).json({ message: "Club code or club is required" });
      }

      // One club at a time: a second request would leave stale entries in the first club.
      const { user, club: current, role } = await clubs.loadMyClub(req.user.userId);
      if (current) {
        throw httpError(
          400,
          role === "pending"
            ? "You already have a pending request. Cancel it before joining another club."
            : "Leave your current club before joining another."
        );
      }

      const club = isObjectId(clubId)
        ? await Club.findById(clubId)
        : await Club.findOne({ clubCode: clubCode.trim().toUpperCase() });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      // 🚫 Prevent banned users
      if (includesId(club.bannedMembers, user._id)) {
        return res.status(403).json({ message: "You are banned from this club" });
      }

      club.pendingMembers.push(user._id);
      await club.save();

      user.clubCode = club.clubCode;
      user.clubApproved = false;
      user.clubRole = null;
      await user.save();

      res.json({ message: "Request sent to join club", clubName: club.clubName });
    } catch (err) {
      fail(res, err, "Join failed");
    }
  }
);

/* ===================== LEAVE CLUB / CANCEL REQUEST ===================== */
router.post("/leave", authMiddleware, async (req, res) => {
  try {
    res.json({ message: await clubs.leaveClub(req.user.userId) });
  } catch (err) {
    fail(res, err, "Failed to leave club");
  }
});

/* ===================== REQUESTS: APPROVE / DECLINE ===================== */
router.post("/approve", authMiddleware, requireStaff, async (req, res) => {
  try {
    const memberId = targetMember(req);
    const club = req.club;

    // Only people who actually asked to join can be approved.
    if (!includesId(club.pendingMembers, memberId)) {
      return res.status(404).json({ message: "No pending request from this user" });
    }

    club.pendingMembers = club.pendingMembers.filter((id) => !sameId(id, memberId));
    club.members.push(memberId);
    club.totalMembers = club.members.length;
    await club.save();

    await User.findByIdAndUpdate(memberId, {
      clubCode: club.clubCode,
      clubApproved: true,
      clubRole: "member",
    });

    res.json({ message: "Member approved" });
  } catch (err) {
    fail(res, err, "Approval failed");
  }
});

router.post("/decline", authMiddleware, requireStaff, async (req, res) => {
  try {
    const memberId = targetMember(req);
    const club = req.club;

    if (!includesId(club.pendingMembers, memberId)) {
      return res.status(404).json({ message: "No pending request from this user" });
    }

    clubs.removeFromClub(club, memberId);
    await club.save();
    await clubs.clearClubFields([memberId]);

    res.json({ message: "Request declined" });
  } catch (err) {
    fail(res, err, "Decline failed");
  }
});

/* ===================== ROSTER (approved members only) ===================== */
router.get("/members", authMiddleware, async (req, res) => {
  try {
    const view = await clubs.buildMyClubView(req.user.userId);
    // Pending players and people without a club see nothing.
    res.json(view.members ? view.members.map((m) => ({ _id: m.id, name: m.name, username: m.username, role: m.role })) : []);
  } catch (err) {
    fail(res, err, "Failed to fetch members");
  }
});

/* ===================== KICK / BAN / UNBAN ===================== */
// Rules shared by kick and ban: the GM can't be removed, nobody removes themselves
// (they should leave), and only the GM may remove a moderator.
const assertRemovable = (req, memberId) => {
  const { club, myRole } = req;

  if (sameId(memberId, club.gm)) throw httpError(400, "The GM cannot be removed");
  if (sameId(memberId, req.currentUser._id)) {
    throw httpError(400, "Use Leave club to remove yourself");
  }
  if (!includesId(club.members, memberId)) throw httpError(404, "Not a member of this club");
  if (includesId(club.moderators, memberId) && myRole !== "gm") {
    throw httpError(403, "Only the GM can remove a moderator");
  }
};

router.post("/kick", authMiddleware, requireStaff, async (req, res) => {
  try {
    const memberId = targetMember(req);
    assertRemovable(req, memberId);

    clubs.removeFromClub(req.club, memberId);
    await req.club.save();
    await clubs.clearClubFields([memberId]);

    res.json({ message: "Member kicked" });
  } catch (err) {
    fail(res, err, "Kick failed");
  }
});

router.post("/ban", authMiddleware, requireStaff, async (req, res) => {
  try {
    const memberId = targetMember(req);
    assertRemovable(req, memberId);

    clubs.removeFromClub(req.club, memberId);
    if (!includesId(req.club.bannedMembers, memberId)) {
      req.club.bannedMembers.push(memberId);
    }
    await req.club.save();
    await clubs.clearClubFields([memberId]);

    res.json({ message: "Member banned" });
  } catch (err) {
    fail(res, err, "Ban failed");
  }
});

router.post("/unban", authMiddleware, requireStaff, async (req, res) => {
  try {
    const memberId = targetMember(req);

    if (!includesId(req.club.bannedMembers, memberId)) {
      return res.status(404).json({ message: "This player is not banned" });
    }

    req.club.bannedMembers = req.club.bannedMembers.filter((id) => !sameId(id, memberId));
    await req.club.save();

    res.json({ message: "Player unbanned" });
  } catch (err) {
    fail(res, err, "Unban failed");
  }
});

/* ===================== MODERATORS (GM only) ===================== */
router.post("/assign-moderator", authMiddleware, requireGm, async (req, res) => {
  try {
    const memberId = targetMember(req);
    const club = req.club;

    if (sameId(memberId, club.gm)) throw httpError(400, "The GM is already in charge");

    // Only existing members can be made moderators.
    if (!includesId(club.members, memberId)) {
      return res.status(404).json({ message: "Not a member of this club" });
    }

    if (!includesId(club.moderators, memberId)) {
      club.moderators.push(memberId);
      await club.save();
    }

    res.json({ message: "Moderator assigned" });
  } catch (err) {
    fail(res, err, "Assign moderator failed");
  }
});

router.post("/remove-moderator", authMiddleware, requireGm, async (req, res) => {
  try {
    const memberId = targetMember(req);

    if (!includesId(req.club.moderators, memberId)) {
      return res.status(404).json({ message: "This member is not a moderator" });
    }

    req.club.moderators = req.club.moderators.filter((id) => !sameId(id, memberId));
    await req.club.save();

    res.json({ message: "Moderator removed" });
  } catch (err) {
    fail(res, err, "Remove moderator failed");
  }
});

module.exports = router;

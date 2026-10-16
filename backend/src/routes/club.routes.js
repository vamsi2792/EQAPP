const express = require("express");
const router = express.Router();

const Club = require("../models/Club");
const User = require("../models/User");

const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");
const generateCode = require("../utils/generateCode");
const { isNonEmptyString, isObjectId } = require("../utils/validate");

const sameId = (a, b) => a.toString() === b.toString();
const includesId = (list, id) => list.some((x) => sameId(x, id));

/**
 * Shared loader for moderation endpoints (approve / kick / ban / assign-moderator).
 * Validates `memberId`, loads the caller's own club and checks the caller is that
 * club's GM or a moderator. Sends the error response itself and returns null on failure.
 */
const loadClubForModeration = async (req, res) => {
  const user = req.currentUser;
  const { memberId } = req.body;

  if (!isObjectId(memberId)) {
    res.status(400).json({ message: "Valid memberId is required" });
    return null;
  }

  const club = user.clubCode
    ? await Club.findOne({ clubCode: user.clubCode })
    : null;

  if (!club) {
    res.status(404).json({ message: "Club not found" });
    return null;
  }

  if (!sameId(club.gm, user._id) && !includesId(club.moderators, user._id)) {
    res.status(403).json({ message: "Not allowed to moderate this club" });
    return null;
  }

  return { club, memberId };
};

const removeFromClub = (club, memberId) => {
  club.members = club.members.filter((id) => !sameId(id, memberId));
  club.moderators = club.moderators.filter((id) => !sameId(id, memberId));
  club.totalMembers = club.members.length;
};

const resetUserClub = (memberId) =>
  User.findByIdAndUpdate(memberId, {
    clubCode: null,
    clubRole: null,
    clubApproved: false,
  });

/* ===================== CREATE CLUB ===================== */
router.post(
  "/create",
  authMiddleware,
  permissionMiddleware("canCreateClub"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      const { clubName } = req.body;

      if (!isNonEmptyString(clubName)) {
        return res.status(400).json({ message: "Club name is required" });
      }

      const code = generateCode();

      const club = await Club.create({
        clubName,
        clubCode: code,
        gm: user._id,
        members: [user._id],
        totalMembers: 1,
      });

      user.clubCode = code;
      user.clubRole = "gm";
      user.clubApproved = true;

      await user.save();

      res.json(club);
    } catch (err) {
      res.status(500).json({ message: "Create club failed" });
    }
  }
);

/* ===================== JOIN CLUB ===================== */
router.post(
  "/join",
  authMiddleware,
  permissionMiddleware("canJoinClub"),
  async (req, res) => {
    try {
      const { clubCode } = req.body;
      const user = req.currentUser;

      if (!isNonEmptyString(clubCode)) {
        return res.status(400).json({ message: "Club code is required" });
      }

      const club = await Club.findOne({
        clubCode: clubCode.trim().toUpperCase(),
      });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      // 🚫 Prevent banned users
      if (includesId(club.bannedMembers, user._id)) {
        return res.status(403).json({ message: "You are banned from this club" });
      }

      // 🚫 Prevent duplicate join
      if (
        includesId(club.members, user._id) ||
        includesId(club.pendingMembers, user._id)
      ) {
        return res.json({ message: "Already requested or member" });
      }

      club.pendingMembers.push(user._id);
      await club.save();

      user.clubCode = club.clubCode;
      user.clubApproved = false;

      await user.save();

      res.json({ message: "Request sent to join club" });
    } catch (err) {
      res.status(500).json({ message: "Join failed" });
    }
  }
);

/* ===================== APPROVE MEMBER ===================== */
router.post(
  "/approve",
  authMiddleware,
  permissionMiddleware("canModerateClub"),
  async (req, res) => {
    try {
      const loaded = await loadClubForModeration(req, res);
      if (!loaded) return;
      const { club, memberId } = loaded;

      // Only people who actually asked to join can be approved.
      if (!includesId(club.pendingMembers, memberId)) {
        return res
          .status(404)
          .json({ message: "No pending request from this user" });
      }

      club.pendingMembers = club.pendingMembers.filter(
        (id) => !sameId(id, memberId)
      );
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
      res.status(500).json({ message: "Approval failed" });
    }
  }
);

/* ===================== GET MEMBERS ===================== */
router.get(
  "/members",
  authMiddleware,
  permissionMiddleware("canJoinClub"),
  async (req, res) => {
    try {
      const user = req.currentUser;

      if (!user.clubCode) {
        return res.json([]);
      }

      const club = await Club.findOne({ clubCode: user.clubCode }).populate(
        "members",
        "firstName lastName username"
      );

      res.json(club ? club.members : []);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  }
);

/* ===================== KICK MEMBER ===================== */
router.post(
  "/kick",
  authMiddleware,
  permissionMiddleware("canModerateClub"),
  async (req, res) => {
    try {
      const loaded = await loadClubForModeration(req, res);
      if (!loaded) return;
      const { club, memberId } = loaded;

      if (sameId(memberId, club.gm)) {
        return res.status(400).json({ message: "The GM cannot be removed" });
      }

      if (!includesId(club.members, memberId)) {
        return res.status(404).json({ message: "Not a member of this club" });
      }

      removeFromClub(club, memberId);
      await club.save();
      await resetUserClub(memberId);

      res.json({ message: "Member kicked" });
    } catch (err) {
      res.status(500).json({ message: "Kick failed" });
    }
  }
);

/* ===================== BAN MEMBER ===================== */
router.post(
  "/ban",
  authMiddleware,
  permissionMiddleware("canModerateClub"),
  async (req, res) => {
    try {
      const loaded = await loadClubForModeration(req, res);
      if (!loaded) return;
      const { club, memberId } = loaded;

      if (sameId(memberId, club.gm)) {
        return res.status(400).json({ message: "The GM cannot be removed" });
      }

      if (!includesId(club.members, memberId)) {
        return res.status(404).json({ message: "Not a member of this club" });
      }

      removeFromClub(club, memberId);

      if (!includesId(club.bannedMembers, memberId)) {
        club.bannedMembers.push(memberId);
      }

      await club.save();
      await resetUserClub(memberId);

      res.json({ message: "Member banned" });
    } catch (err) {
      res.status(500).json({ message: "Ban failed" });
    }
  }
);

/* ===================== ASSIGN MODERATOR ===================== */
router.post(
  "/assign-moderator",
  authMiddleware,
  permissionMiddleware("canModerateClub"),
  async (req, res) => {
    try {
      const loaded = await loadClubForModeration(req, res);
      if (!loaded) return;
      const { club, memberId } = loaded;

      // Only existing members can be made moderators.
      if (!includesId(club.members, memberId)) {
        return res.status(404).json({ message: "Not a member of this club" });
      }

      if (!includesId(club.moderators, memberId)) {
        club.moderators.push(memberId);
      }

      await club.save();

      res.json({ message: "Moderator assigned" });
    } catch (err) {
      res.status(500).json({ message: "Assign moderator failed" });
    }
  }
);

module.exports = router;

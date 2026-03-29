const express = require("express");
const router = express.Router();

const Club = require("../models/Club");
const User = require("../models/User");

const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");
const generateCode = require("../utils/generateCode");

/* ===================== CREATE CLUB ===================== */
router.post(
  "/create",
  authMiddleware,
  permissionMiddleware("canCreateClub"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      const { clubName } = req.body;

      if (!clubName) {
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

      if (!clubCode) {
        return res.status(400).json({ message: "Club code is required" });
      }

      const club = await Club.findOne({ clubCode });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      // 🚫 Prevent banned users
      if (club.bannedMembers.includes(user._id)) {
        return res.status(403).json({ message: "You are banned from this club" });
      }

      // 🚫 Prevent duplicate join
      if (
        club.members.includes(user._id) ||
        club.pendingMembers.includes(user._id)
      ) {
        return res.json({ message: "Already requested or member" });
      }

      club.pendingMembers.push(user._id);
      await club.save();

      user.clubCode = clubCode;
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
      const { memberId } = req.body;
      const user = req.currentUser;

      const club = await Club.findOne({ clubCode: user.clubCode });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      // Remove from pending
      club.pendingMembers = club.pendingMembers.filter(
        (id) => id.toString() !== memberId
      );

      // Add to members
      if (!club.members.includes(memberId)) {
        club.members.push(memberId);
        club.totalMembers += 1;
      }

      await club.save();

      await User.findByIdAndUpdate(memberId, {
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

      const club = await Club.findOne({ clubCode: user.clubCode })
        .populate("members", "firstName lastName username");

      res.json(club.members);
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
      const { memberId } = req.body;
      const user = req.currentUser;

      const club = await Club.findOne({ clubCode: user.clubCode });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      club.members = club.members.filter(
        (id) => id.toString() !== memberId
      );

      club.totalMembers = Math.max(0, club.totalMembers - 1);

      await club.save();

      await User.findByIdAndUpdate(memberId, {
        clubCode: null,
        clubRole: null,
        clubApproved: false,
      });

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
      const { memberId } = req.body;
      const user = req.currentUser;

      const club = await Club.findOne({ clubCode: user.clubCode });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      // Remove from members
      club.members = club.members.filter(
        (id) => id.toString() !== memberId
      );

      // Add to banned list
      if (!club.bannedMembers.includes(memberId)) {
        club.bannedMembers.push(memberId);
      }

      club.totalMembers = Math.max(0, club.totalMembers - 1);

      await club.save();

      await User.findByIdAndUpdate(memberId, {
        clubCode: null,
        clubRole: null,
        clubApproved: false,
      });

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
      const { memberId } = req.body;
      const user = req.currentUser;

      const club = await Club.findOne({ clubCode: user.clubCode });

      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      if (!club.moderators.includes(memberId)) {
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
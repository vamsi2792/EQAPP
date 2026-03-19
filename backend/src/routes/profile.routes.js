const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const User = require("../models/User");
const Club = require("../models/Club");

/* ===================== GET BASIC PROFILE ===================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      profile: user.profile,
      accountType: user.accountType,
      membershipActive: user.membershipActive,
      xp: user.xp,
      level: user.level,
      clubCode: user.clubCode,
      clubRole: user.clubRole,
      clubApproved: user.clubApproved,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});


/* ===================== UPDATE PROFILE ===================== */
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, profile } = req.body;

    // 🔒 Only allow safe updates
    const updates = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(profile && { profile }),
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});


/* ===================== GET FULL PROFILE ===================== */
router.get("/full", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let clubData = null;

    if (user.clubCode) {
      const club = await Club.findOne({ clubCode: user.clubCode })
        .populate("members", "firstName lastName username")
        .populate("pendingMembers", "firstName lastName username")
        .populate("gm", "firstName lastName username")
        .populate("moderators", "firstName lastName username");

      if (club) {
        clubData = {
          clubName: club.clubName,
          clubCode: club.clubCode,
          totalMembers: club.totalMembers,
          gm: club.gm,
          moderators: club.moderators,
          members: club.members,
          pendingMembers: club.pendingMembers,
        };
      }
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        profile: user.profile,
        accountType: user.accountType,
        membershipActive: user.membershipActive,
        xp: user.xp,
        level: user.level,
        permissions: user.permissions,
        clubRole: user.clubRole,
        clubApproved: user.clubApproved,
      },
      club: clubData,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch full profile" });
  }
});


/* ===================== LEAVE CLUB ===================== */
router.post("/leave-club", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.clubCode) {
      return res.status(400).json({ message: "Not part of any club" });
    }

    const club = await Club.findOne({ clubCode: user.clubCode });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    // 🚫 GM cannot leave
    if (club.gm.toString() === user._id.toString()) {
      return res.status(400).json({
        message: "GM cannot leave the club. Transfer ownership or delete club.",
      });
    }

    // Remove from members
    club.members = club.members.filter(
      (id) => id.toString() !== user._id.toString()
    );

    club.totalMembers = Math.max(0, club.totalMembers - 1);

    await club.save();

    // Reset user club data
    user.clubCode = null;
    user.clubRole = null;
    user.clubApproved = false;

    await user.save();

    res.json({ message: "Left club successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to leave club" });
  }
});


module.exports = router;
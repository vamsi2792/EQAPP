const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const User = require("../models/User");
const Club = require("../models/Club");

const SU_CATEGORIES = [
  { id: "food", questions: ["food_1", "food_2", "food_3"] },
  { id: "housing", questions: ["housing_1", "housing_2", "housing_3"] },
  {
    id: "transportation",
    questions: ["transportation_1", "transportation_2", "transportation_3"],
  },
  { id: "energy", questions: ["energy_1", "energy_2", "energy_3"] },
  {
    id: "landUseBiodiversity",
    questions: [
      "landUseBiodiversity_1",
      "landUseBiodiversity_2",
      "landUseBiodiversity_3",
    ],
  },
  { id: "waterUse", questions: ["waterUse_1", "waterUse_2", "waterUse_3"] },
  {
    id: "ancestorsLifestyle",
    questions: [
      "ancestorsLifestyle_1",
      "ancestorsLifestyle_2",
      "ancestorsLifestyle_3",
    ],
  },
  {
    id: "contaminantsToxics",
    questions: [
      "contaminantsToxics_1",
      "contaminantsToxics_2",
      "contaminantsToxics_3",
    ],
  },
  {
    id: "consumptionWaste",
    questions: [
      "consumptionWaste_1",
      "consumptionWaste_2",
      "consumptionWaste_3",
    ],
  },
  {
    id: "climateActions",
    questions: ["climateActions_1", "climateActions_2", "climateActions_3"],
  },
  {
    id: "healthWellness",
    questions: ["healthWellness_1", "healthWellness_2", "healthWellness_3"],
  },
  {
    id: "communityParticipation",
    questions: [
      "communityParticipation_1",
      "communityParticipation_2",
      "communityParticipation_3",
    ],
  },
];

const calculateSUScore = (answers) => {
  const normalizedAnswers = {};

  SU_CATEGORIES.forEach((category) => {
    category.questions.forEach((questionId) => {
      const value = Number(answers?.[questionId]);

      if (!Number.isInteger(value) || value < 0 || value > 4) {
        throw new Error(`Invalid score for ${questionId}`);
      }

      normalizedAnswers[questionId] = value;
    });
  });

  const categoryScores = {};

  SU_CATEGORIES.forEach((category) => {
    const sum = category.questions.reduce(
      (total, questionId) => total + normalizedAnswers[questionId],
      0
    );

    categoryScores[category.id] = Math.round(sum / category.questions.length);
  });

  const totalScore = Object.values(categoryScores).reduce(
    (total, score) => total + score,
    0
  );

  return { answers: normalizedAnswers, categoryScores, totalScore };
};

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
      suScore: user.suScore,
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
        suScore: user.suScore,
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


/* ===================== UPDATE SU SCORE / SUBADGE ===================== */
router.put("/su-score", authMiddleware, async (req, res) => {
  try {
    const { answers, categoryScores, totalScore } = calculateSUScore(
      req.body.answers
    );

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        suScore: {
          answers,
          categoryScores,
          totalScore,
          completedAt: new Date(),
        },
      },
      { new: true }
    ).select("suScore");

    res.json({
      message: "SUBadge score saved",
      suScore: user.suScore,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message || "Invalid SUBadge answers",
    });
  }
});


module.exports = router;

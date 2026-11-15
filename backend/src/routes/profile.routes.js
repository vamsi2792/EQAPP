const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const User = require("../models/User");
const Club = require("../models/Club");
const clubs = require("../services/club.service");
const {
  normalizeUsername,
  assertUsernameFree,
  isUsernameDuplicate,
} = require("../utils/username");

// Free-text profile fields a player may edit, with their maximum lengths.
const PROFILE_FIELDS = {
  age: 10,
  gender: 60,
  ethnicity: 60,
  language: 60,
  location: 60,
  discord: 60,
  aboutMe: 300,
};
const NAME_MAX = 50;

// The profile as the app sees it. Never includes password or OTP/token fields.
const serializeUser = (user) => ({
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
});

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
    const { firstName, lastName, username, profile } = req.body;

    // 🔒 Only allow safe updates. Everything is validated before anything is written.
    const updates = {};

    for (const [key, value] of [
      ["firstName", firstName],
      ["lastName", lastName],
    ]) {
      if (value === undefined) continue;
      if (typeof value !== "string" || !value.trim() || value.trim().length > NAME_MAX) {
        return res
          .status(400)
          .json({ message: `${key} must be text of 1-${NAME_MAX} characters` });
      }
      updates[key] = value.trim();
    }

    if (username !== undefined) {
      updates.username = normalizeUsername(username);
      await assertUsernameFree(updates.username, req.user.userId);
    }

    if (profile !== undefined) {
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        return res.status(400).json({ message: "profile must be an object" });
      }

      // Dotted paths change only the fields that were sent, so a partial update cannot
      // wipe the rest of the profile.
      for (const [key, value] of Object.entries(profile)) {
        const max = PROFILE_FIELDS[key];
        if (!max) continue; // unknown keys are ignored
        if (typeof value !== "string" || value.length > max) {
          return res
            .status(400)
            .json({ message: `${key} must be text of at most ${max} characters` });
        }
        updates[`profile.${key}`] = value.trim();
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated",
      user: serializeUser(updatedUser),
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (isUsernameDuplicate(err)) {
      return res.status(400).json({ message: "Username already taken" });
    }
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
      user: serializeUser(user),
      club: clubData,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch full profile" });
  }
});


/* ===================== LEAVE CLUB ===================== */
router.post("/leave-club", authMiddleware, async (req, res) => {
  try {
    res.json({ message: await clubs.leaveClub(req.user.userId) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
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

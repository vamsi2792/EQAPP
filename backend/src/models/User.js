const mongoose = require("mongoose");

/* ===================== PERMISSION HELPER ===================== */
const getPermissionsByRole = (role) => {
  switch (role) {

    case "viewer":
      return {
        canPlay: false,
        canPurchase: false,
        canDownloadPDF: false,
        canJoinClub: false,
        canCreateClub: false,
        canModerateClub: false,
      };

    case "registrant":
      return {
        canPlay: true,
        canPurchase: true,
        canDownloadPDF: true,
        canJoinClub: true,
        canCreateClub: false,
        canModerateClub: false,
      };

    case "member":
      return {
        canPlay: true,
        canPurchase: true,
        canDownloadPDF: true,
        canJoinClub: true,
        canCreateClub: false,
        canModerateClub: false,
      };

    case "gm":
      return {
        canPlay: true,
        canPurchase: true,
        canDownloadPDF: true,
        canJoinClub: true,
        canCreateClub: true,
        canModerateClub: true,
      };

    default:
      return {};
  }
};

/* ===================== SCHEMA ===================== */
const UserSchema = new mongoose.Schema(
  {
    // BASIC USER INFO
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    username: {
      type: String,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    // PROFILE IMAGE
    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    // PROFILE DETAILS
    profile: {
      age: String,
      gender: String,
      ethnicity: String,
      language: String,
      location: String,
    },

    // ACCOUNT TYPE
    accountType: {
      type: String,
      enum: ["viewer", "registrant", "member", "gm"],
      default: "viewer",
    },

    // PERMISSIONS (auto-managed)
    permissions: {
      canPlay: { type: Boolean, default: false },
      canPurchase: { type: Boolean, default: false },
      canDownloadPDF: { type: Boolean, default: false },
      canJoinClub: { type: Boolean, default: false },
      canCreateClub: { type: Boolean, default: false },
      canModerateClub: { type: Boolean, default: false },
    },

    // MEMBERSHIP STATUS
    membershipActive: {
      type: Boolean,
      default: false,
    },

    // CLUB INFORMATION
    clubCode: {
      type: String,
      default: null,
    },

    clubRole: {
      type: String,
      enum: ["member", "gm"],
      default: null,
    },

    clubApproved: {
      type: Boolean,
      default: false,
    },

    // GAME STATS (for profile screen)
    stats: {
      score: { type: Number, default: 0 },
      quests: { type: Number, default: 0 },
      badges: { type: Number, default: 0 },
    },

    // ACHIEVEMENTS
    achievements: [
      {
        name: String,
        unlockedAt: Date,
      },
    ],

    // ADVENTURE PROGRESS
    completedAdventures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Adventure",
      },
    ],

    xp: {
      type: Number,
      default: 0,
    },

    level: {
      type: Number,
      default: 1,
    },

    // EMAIL VERIFICATION
    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailOtp: String,
    emailOtpExpiry: Date,

    // PASSWORD RESET
    resetOtp: String,
    resetOtpExpiry: Date,
  },
  { timestamps: true }
);

/* ===================== AUTO ASSIGN PERMISSIONS ===================== */
UserSchema.pre("save", async function () {
  if (this.isModified("accountType")) {
    this.permissions = getPermissionsByRole(this.accountType);
  }
});

module.exports = mongoose.model("User", UserSchema);
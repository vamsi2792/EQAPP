const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // BASIC USER INFO
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    username: {
      type: String,
      unique: true,
      sparse: true, // allows null for existing users
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: { type: String, required: true },

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
      enum: ["registrant", "member", "gm"],
      default: "registrant",
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

    // 🔐 EMAIL VERIFICATION
    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailOtp: {
      type: String,
      default: null,
    },

    emailOtpExpiry: {
      type: Date,
      default: null,
    },

    // 🔐 PASSWORD RESET
    resetOtp: {
      type: String,
      default: null,
    },

    resetOtpExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
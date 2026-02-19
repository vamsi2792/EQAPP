const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    profile: {
      age: String,
      gender: String,
      ethnicity: String,
      language: String,
      location: String,
    },

    clubCode: {
      type: String,
      default: null,
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

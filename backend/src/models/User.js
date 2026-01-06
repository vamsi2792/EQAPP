const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["PLAYER", "GM", "ADMIN"],
      default: "PLAYER"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const AdventureAccessSchema = new mongoose.Schema(
  {
    adventure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Adventure",
      required: true,
    },

    // 👑 GM who owns this code
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔑 Unique code (shared with players)
    accessCode: {
      type: String,
      required: true,
      unique: true,
    },

    // 👥 Players using this adventure
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ⏱️ Optional expiry
    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdventureAccess", AdventureAccessSchema);
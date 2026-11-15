const mongoose = require("mongoose");

const ClubSchema = new mongoose.Schema(
  {
    clubName: {
      type: String,
      required: true,
      trim: true,
    },

    clubCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // Short description and an optional Discord invite link, edited by the GM.
    bio: { type: String, trim: true, maxlength: 300, default: "" },
    discord: { type: String, trim: true, maxlength: 200, default: "" },

    // 👑 Game Mentor (Owner of club)
    gm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 👥 Approved Members
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ⏳ Pending Join Requests
    pendingMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 🚫 Banned Members (NEW)
    bannedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 🛡️ Moderators (assigned by GM)
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 💬 Chat settings
    chatEnabled: {
      type: Boolean,
      default: true,
    },

    // (Optional future use)
    chatId: {
      type: String,
      default: null,
    },

    // 📊 Club stats (optional but useful)
    totalMembers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Club", ClubSchema);
const mongoose = require("mongoose");

const ClubSchema = new mongoose.Schema(
  {
    clubName: {
      type: String,
      required: true,
    },

    clubCode: {
      type: String,
      required: true,
      unique: true,
    },

    gm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    pendingMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    chatEnabled: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Club", ClubSchema);
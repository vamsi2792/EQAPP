const mongoose = require("mongoose");

const AdventureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    images: [
      {
        type: String,
      },
    ],

    location: {
      latitude: Number,
      longitude: Number,
    },

    xpReward: {
      type: Number,
      default: 100,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Adventure", AdventureSchema);
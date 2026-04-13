const mongoose = require("mongoose");

const AdventureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    // 🌍 REQUIRED FOR MAP
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },

    images: [String],

    // 🎮 Optional story content
    scenes: [
      {
        title: String,
        description: String,
        mediaUrl: String,
      },
    ],

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    category: {
      type: String,
      default: "climate",
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Adventure", AdventureSchema);
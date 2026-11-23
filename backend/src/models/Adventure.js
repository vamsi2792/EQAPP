const mongoose = require("mongoose");

const AdventureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Stable key for catalogue entries shown in the app (eq1, eq2, ...). The old sample
    // adventures have no slug and are not part of the catalogue.
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true },

    subtitle: { type: String, trim: true, default: "" },

    // false = shown as "Coming Soon": listed, but no codes can be created or redeemed for it.
    unlocked: { type: Boolean, default: true },

    order: { type: Number, default: 0 },

    // true = buying this adventure makes the buyer a Game Mentor (and they run it for a club).
    requiresGM: { type: Boolean, default: false },

    description: String,

    // Optional: only the old map endpoint pins adventures by location.
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
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
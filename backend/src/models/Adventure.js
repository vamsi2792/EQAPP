const mongoose = require("mongoose");

const AdventureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    // 🌍 Map / Story Data
    mapData: {
      type: Object, // can store JSON for map layers, locations, etc.
      default: {},
    },

    scenes: [
      {
        title: String,
        description: String,
        mediaUrl: String, // video/image
      },
    ],

    // 💰 Store info
    price: {
      type: Number,
      default: 0,
    },

    isFree: {
      type: Boolean,
      default: false,
    },

    // 🧠 Difficulty / category
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    category: {
      type: String,
      default: "climate",
    },

    // 📊 Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Adventure", AdventureSchema);
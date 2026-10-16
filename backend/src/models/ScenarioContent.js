const mongoose = require("mongoose");

/**
 * Admin-managed content for one map scenario (pin). The pin itself (code, title,
 * coordinates, built-in images) lives in the map page; this adds editable text and images
 * on top, keyed by the pin's id (e.g. "EQ1-F-1").
 */
const ScenarioContentSchema = new mongoose.Schema(
  {
    scenarioId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Admin-written text shown in the scenario popup. Empty = show the built-in text.
    description: { type: String, default: "", maxlength: 2000 },

    // True once an admin has imported/uploaded/removed/reordered images. From then on the
    // stored list is the whole truth (so deleting every image really shows none),
    // instead of falling back to the images built into the map page.
    customized: { type: Boolean, default: false },

    images: [
      {
        // Either an absolute http(s) URL or a path under /uploads served by this API.
        url: { type: String, required: true },
        caption: { type: String, default: "", maxlength: 200 },
        // Set for files stored on this server so they can be deleted from disk.
        storedFile: { type: String, default: null },
      },
    ],

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScenarioContent", ScenarioContentSchema);

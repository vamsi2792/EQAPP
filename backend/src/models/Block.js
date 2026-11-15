const mongoose = require("mongoose");

// `blocker` has blocked `blocked`. The unique pair index makes blocking idempotent.
const BlockSchema = new mongoose.Schema(
  {
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    blocked: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
// Lookups for "did anyone block me?" go the other way round.
BlockSchema.index({ blocked: 1, blocker: 1 });

module.exports = mongoose.model("Block", BlockSchema);

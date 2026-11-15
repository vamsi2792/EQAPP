const mongoose = require("mongoose");

// A direct (1:1) conversation. `pairKey` is the two participant ids sorted and joined,
// so the unique index guarantees a single conversation per pair even under races.
const ConversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: (v) => Array.isArray(v) && v.length === 2,
    },

    pairKey: { type: String, required: true, unique: true },

    lastMessage: {
      text: { type: String, default: "" },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, updatedAt: -1 });

ConversationSchema.statics.makePairKey = (a, b) => [String(a), String(b)].sort().join(":");

module.exports = mongoose.model("Conversation", ConversationSchema);

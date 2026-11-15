const mongoose = require("mongoose");

const MIN_MESSAGE = 20;
const MAX_MESSAGE = 500;
const MAX_NOTE = 300;

const GmApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Why the player wants to lead a group, in their own words.
    message: { type: String, trim: true, required: true, maxlength: MAX_MESSAGE },

    // Which version of the code of conduct they agreed to, and when.
    conductVersion: { type: String, required: true },
    conductAcceptedAt: { type: Date, required: true },

    status: { type: String, enum: ["pending", "approved", "declined"], default: "pending" },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, maxlength: MAX_NOTE, default: "" },
  },
  { timestamps: true }
);

// A player can have only one application waiting for review at a time.
GmApplicationSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
GmApplicationSchema.index({ status: 1, createdAt: -1 });

const GmApplication = mongoose.model("GmApplication", GmApplicationSchema);
GmApplication.MIN_MESSAGE = MIN_MESSAGE;
GmApplication.MAX_MESSAGE = MAX_MESSAGE;
GmApplication.MAX_NOTE = MAX_NOTE;

module.exports = GmApplication;

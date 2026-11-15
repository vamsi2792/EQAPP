const mongoose = require("mongoose");

const REASONS = ["harassment", "spam", "inappropriate", "other"];
const MAX_NOTE_LENGTH = 500;

// A copy of the messages around the reported one, taken at report time, so the evidence
// survives later edits or deletions.
const ContextMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    createdAt: Date,
    reported: { type: Boolean, default: false },
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reported: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },

    reason: { type: String, enum: REASONS, required: true },
    note: { type: String, trim: true, maxlength: MAX_NOTE_LENGTH, default: "" },

    context: [ContextMessageSchema],

    status: { type: String, enum: ["open", "resolved"], default: "open" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One report per reporter per message; repeat reports are ignored.
ReportSchema.index({ reporter: 1, message: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model("Report", ReportSchema);
Report.REASONS = REASONS;
Report.MAX_NOTE_LENGTH = MAX_NOTE_LENGTH;

module.exports = Report;

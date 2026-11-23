const mongoose = require("mongoose");

// One row per paid Stripe Checkout session. `sessionId` is unique so a retried webhook can
// never fulfil the same payment twice. `fulfilled: false` means we could not match the
// payment to an account; an admin can resolve it from here.
const PurchaseSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["membership", "adventure"], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adventure: { type: mongoose.Schema.Types.ObjectId, ref: "Adventure", default: null },
    email: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "" },
    fulfilled: { type: Boolean, default: false },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", PurchaseSchema);

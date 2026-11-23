const express = require("express");
const router = express.Router();

const { verifyStripeSignature } = require("../utils/stripeSignature");
const purchases = require("../services/purchase.service");

// Stripe signs the exact bytes it sends, so this route reads the raw body. It is mounted
// before express.json() in app.js.
router.post("/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: "Payments are not configured" });

  if (!verifyStripeSignature(req.body, req.get("stripe-signature"), secret)) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  try {
    const event = JSON.parse(req.body.toString("utf8"));

    if (event.type === "checkout.session.completed") {
      await purchases.handleCheckoutCompleted(event.data && event.data.object);
    }

    // Anything else is acknowledged so Stripe stops retrying it.
    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook failed:", err.message);
    // 500 makes Stripe retry; fulfilment is idempotent so a retry is safe.
    res.status(500).json({ message: "Webhook handling failed" });
  }
});

module.exports = router;

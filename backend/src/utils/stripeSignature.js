const crypto = require("crypto");

const TOLERANCE_SECONDS = 300;

/**
 * Verifies a Stripe webhook. `rawBody` must be the exact bytes Stripe sent. Returns true
 * only when a v1 signature matches and the timestamp is recent (guards against replays).
 */
const verifyStripeSignature = (rawBody, header, secret, now = Date.now()) => {
  if (!rawBody || !header || !secret) return false;

  const parts = String(header).split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || !signatures.length) return false;

  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");

  return signatures.some((sig) => {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
};

module.exports = { verifyStripeSignature };

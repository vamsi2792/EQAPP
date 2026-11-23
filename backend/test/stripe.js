const crypto = require("crypto");

const SECRET = "whsec_test";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const sign = (body, secret = SECRET, t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

// Sends a signed checkout.session.completed event, like Stripe does after a payment.
const sendCheckout = (api, session, { secret, header } = {}) => {
  const body = JSON.stringify({
    id: "evt_" + (session.id || "x"),
    type: "checkout.session.completed",
    data: { object: { payment_status: "paid", amount_total: 1000, currency: "usd", ...session } },
  });
  return fetch(`${api.base}/api/payments/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header || sign(body, secret) },
    body,
  });
};

module.exports = { sendCheckout, sign };

const User = require("../models/User");
const Adventure = require("../models/Adventure");
const AdventureAccess = require("../models/AdventureAccess");
const Purchase = require("../models/Purchase");
const generateCode = require("../utils/generateCode");
const { isObjectId } = require("../utils/validate");

const codeClash = (err) =>
  err.code === 11000 && err.keyPattern && (err.keyPattern.accessCode || err.keyPattern.gmCode);

/** The buyer: the website passes our user id as Stripe's client_reference_id. */
const findBuyer = async (session) => {
  if (isObjectId(session.client_reference_id)) {
    const user = await User.findById(session.client_reference_id);
    if (user) return user;
  }
  const email = session.customer_details?.email || session.customer_email;
  return email ? User.findOne({ email: String(email).trim().toLowerCase() }) : null;
};

/**
 * Gives a buyer their two codes for an adventure: `gmCode` for the Game Mentor only, and
 * `accessCode` for the members of their club. One pair per buyer per adventure, so a
 * repeated call returns the same codes.
 */
const issueCodes = async (userId, adventure) => {
  const existing = await AdventureAccess.findOne({ adventure: adventure._id, owner: userId });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await AdventureAccess.create({
        adventure: adventure._id,
        owner: userId,
        accessCode: generateCode(),
        gmCode: generateCode(8),
        players: [userId],
      });
    } catch (err) {
      if (!codeClash(err)) throw err;
    }
  }
  throw new Error("Could not generate unique adventure codes");
};

const fulfilMembership = async (user) => {
  // Never demote: a Game Mentor who renews stays a Game Mentor.
  if (user.accountType !== "gm") user.accountType = "member";
  user.membershipActive = true;
  await user.save();
};

const fulfilAdventure = async (user, adventure) => {
  // Only adventures flagged requiresGM make the buyer a Game Mentor.
  if (adventure.requiresGM && user.accountType !== "gm") {
    user.accountType = "gm";
    await user.save();
  }
  await issueCodes(user._id, adventure);
};

/** Handles a paid checkout.session.completed event. Safe to run more than once. */
const handleCheckoutCompleted = async (session) => {
  if (!session || !session.id || session.payment_status !== "paid") return { ignored: true };

  const kind = session.metadata?.kind;
  if (kind !== "membership" && kind !== "adventure") return { ignored: true };

  const record = {
    kind,
    email: session.customer_details?.email || session.customer_email || "",
    amount: session.amount_total || 0,
    currency: session.currency || "",
  };

  const user = await findBuyer(session);
  let adventure = null;

  if (kind === "adventure") {
    adventure = await Adventure.findOne({ slug: String(session.metadata.adventureSlug || "").toLowerCase() });
  }

  let note = "";
  if (!user) note = "No account matches this payment";
  else if (kind === "adventure" && !adventure) note = "Unknown adventure";

  if (!note) {
    if (kind === "membership") await fulfilMembership(user);
    else await fulfilAdventure(user, adventure);
  }

  await Purchase.updateOne(
    { sessionId: session.id },
    {
      $set: {
        ...record,
        user: user ? user._id : null,
        adventure: adventure ? adventure._id : null,
        fulfilled: !note,
        note,
      },
    },
    { upsert: true }
  );

  return { fulfilled: !note, note };
};

module.exports = { handleCheckoutCompleted, issueCodes };

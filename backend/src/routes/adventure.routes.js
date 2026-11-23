const express = require("express");
const router = express.Router();

const Adventure = require("../models/Adventure");
const AdventureAccess = require("../models/AdventureAccess");
const authMiddleware = require("../middleware/auth.middleware");
const { isNonEmptyString, isObjectId } = require("../utils/validate");
const adventures = require("../services/adventure.service");

// Service errors carry an HTTP status; anything else is an unexpected failure.
const fail = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(fallback, err.message);
  return res.status(500).json({ message: fallback });
};

/* ===================== GET MAP ADVENTURES (PUBLIC) ===================== */
router.get("/map", async (req, res) => {
  try {
    const list = await Adventure.find({ isPublished: true });

    const formatted = list.map((adv) => ({
      id: adv._id,
      title: adv.title,
      latitude: adv.location?.latitude,
      longitude: adv.location?.longitude,
      images: adv.images || [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch map adventures" });
  }
});

/* ===================== ADVENTURE LIST (what the app shows) ===================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    res.json(await adventures.listCatalogue());
  } catch (err) {
    fail(res, err, "Failed to fetch adventures");
  }
});

/* ===================== ENTER AN ADVENTURE CODE ===================== */
// Adventures are bought on the website; the payment webhook issues the buyer their codes.
// There is no way to create a code here.
router.post("/enter-code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!isNonEmptyString(code)) {
      return res.status(400).json({ message: "Code is required" });
    }

    const { group, adventure } = await adventures.redeemCode(req.user.userId, code);

    res.json({ message: "Access granted", adventure, group });
  } catch (err) {
    fail(res, err, "Failed to join adventure");
  }
});

/* ===================== MY ADVENTURES ===================== */
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    res.json(await adventures.listMine(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load your adventures");
  }
});

router.post("/mine/:id/new-code", authMiddleware, async (req, res) => {
  try {
    await adventures.rotateMemberCode(req.user.userId, req.params.id);
    res.json(await adventures.listMine(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to create a new code");
  }
});

router.post("/mine/:id/active", authMiddleware, async (req, res) => {
  try {
    await adventures.setActive(req.user.userId, req.params.id, req.body.isActive);
    res.json(await adventures.listMine(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to update the adventure");
  }
});

/* ===================== GET MY ADVENTURES (original route, kept) ===================== */
// The access code is only returned to the group's owner; players do not need it.
router.get("/my-adventures", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const accesses = await AdventureAccess.find({
      players: userId,
    }).populate("adventure");

    const mine = accesses.map((a) => ({
      ...(String(a.owner) === String(userId) && { accessCode: a.accessCode, gmCode: a.gmCode }),
      adventure: a.adventure,
    }));

    res.json(mine);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch adventures" });
  }
});

/* ===================== GET SINGLE ADVENTURE ===================== */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const adventureId = req.params.id;
    const userId = req.user.userId;

    if (!isObjectId(adventureId)) {
      return res.status(400).json({ message: "Invalid adventure id" });
    }

    const access = await AdventureAccess.findOne({
      adventure: adventureId,
      players: userId,
    });

    if (!access) {
      return res.status(403).json({
        message: "You do not have access to this adventure",
      });
    }

    const adventure = await Adventure.findById(adventureId);

    res.json(adventure);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch adventure" });
  }
});

/* ===================== DEACTIVATE CODE (original route, kept) ===================== */
router.post("/deactivate", authMiddleware, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const userId = req.user.userId;

    if (!isNonEmptyString(accessCode)) {
      return res.status(400).json({ message: "Access code is required" });
    }

    const access = await AdventureAccess.findOne({
      accessCode: accessCode.trim().toUpperCase(),
    });

    if (!access) {
      return res.status(404).json({ message: "Code not found" });
    }

    if (access.owner.toString() !== userId) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    access.isActive = false;
    await access.save();

    res.json({ message: "Adventure code deactivated" });

  } catch (err) {
    res.status(500).json({ message: "Deactivate failed" });
  }
});

module.exports = router;

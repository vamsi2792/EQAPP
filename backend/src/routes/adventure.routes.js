const express = require("express");
const router = express.Router();

const Adventure = require("../models/Adventure");
const AdventureAccess = require("../models/AdventureAccess");
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");
const generateCode = require("../utils/generateCode");


/* ===================== GET MAP ADVENTURES (PUBLIC) ===================== */
router.get("/map", async (req, res) => {
  try {
    const adventures = await Adventure.find({ isPublished: true });

    const formatted = adventures.map((adv) => ({
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

/* ===================== PURCHASE ADVENTURE ===================== */
router.post(
  "/purchase",
  authMiddleware,
  permissionMiddleware("canPurchase"),
  async (req, res) => {
    try {
      const { adventureId } = req.body;
      const user = req.currentUser;

      if (!adventureId) {
        return res.status(400).json({ message: "Adventure ID required" });
      }

      const adventure = await Adventure.findById(adventureId);

      if (!adventure) {
        return res.status(404).json({ message: "Adventure not found" });
      }

      // 🔥 Prevent duplicate purchase
      const existing = await AdventureAccess.findOne({
        adventure: adventureId,
        owner: user._id,
      });

      if (existing) {
        return res.json({
          message: "Already purchased",
          accessCode: existing.accessCode,
        });
      }

      const code = generateCode();

      const access = await AdventureAccess.create({
        adventure: adventure._id,
        owner: user._id,
        accessCode: code,
        players: [user._id],
      });

      res.json({
        message: "Adventure purchased successfully",
        accessCode: code,
        adventure,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Purchase failed" });
    }
  }
);

/* ===================== ENTER ADVENTURE CODE ===================== */
router.post("/enter-code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user.userId;

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const access = await AdventureAccess.findOne({
      accessCode: code,
      isActive: true,
    }).populate("adventure");

    if (!access) {
      return res.status(404).json({ message: "Invalid code" });
    }

    if (!access.players.includes(user)) {
      access.players.push(user);
      await access.save();
    }

    res.json({
      message: "Access granted",
      adventure: access.adventure,
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to join adventure" });
  }
});

/* ===================== GET MY ADVENTURES ===================== */
router.get("/my-adventures", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const accesses = await AdventureAccess.find({
      players: userId,
    }).populate("adventure");

    const adventures = accesses.map((a) => ({
      accessCode: a.accessCode,
      adventure: a.adventure,
    }));

    res.json(adventures);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch adventures" });
  }
});

/* ===================== GET SINGLE ADVENTURE ===================== */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const adventureId = req.params.id;
    const userId = req.user.userId;

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

/* ===================== DEACTIVATE CODE ===================== */
router.post("/deactivate", authMiddleware, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const userId = req.user.userId;

    const access = await AdventureAccess.findOne({ accessCode });

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
const express = require("express");
const router = express.Router();

const Adventure = require("../models/Adventure");
const AdventureAccess = require("../models/AdventureAccess");
const authMiddleware = require("../middleware/auth.middleware");
const permissionMiddleware = require("../middleware/permission.middleware");
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

/* ===================== CREATE A CODE (Game Masters only) ===================== */
// A code puts a table of players in one group. `/purchase` is the original name of this
// route and is kept so existing callers keep working. It is NOT a payment: there is no
// payment step yet, only the Game Master restriction.
const createCodeHandler = async (req, res) => {
  try {
    const { access, adventure, created } = await adventures.createCode(
      req.user.userId,
      req.body.adventureId
    );

    res.json({
      message: created ? "Adventure code created" : "You already have a code for this adventure",
      accessCode: access.accessCode,
      adventure,
      group: adventures.summarize(access, adventure, req.user.userId),
    });
  } catch (err) {
    fail(res, err, "Could not create the code");
  }
};

router.post("/codes", authMiddleware, permissionMiddleware("canCreateClub"), createCodeHandler);
router.post("/purchase", authMiddleware, permissionMiddleware("canCreateClub"), createCodeHandler);

/* ===================== ENTER ADVENTURE CODE ===================== */
router.post("/enter-code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!isNonEmptyString(code)) {
      return res.status(400).json({ message: "Code is required" });
    }

    const { group, adventure } = await adventures.joinByCode(req.user.userId, code);

    res.json({ message: "Access granted", adventure, group });
  } catch (err) {
    fail(res, err, "Failed to join adventure");
  }
});

/* ===================== MY GROUPS ===================== */
router.get("/groups", authMiddleware, async (req, res) => {
  try {
    res.json(await adventures.listGroups(req.user.userId));
  } catch (err) {
    fail(res, err, "Failed to load groups");
  }
});

router.get("/groups/:id", authMiddleware, async (req, res) => {
  try {
    res.json(await adventures.getGroup(req.user.userId, req.params.id));
  } catch (err) {
    fail(res, err, "Failed to load group");
  }
});

router.post("/groups/:id/leave", authMiddleware, async (req, res) => {
  try {
    await adventures.leaveGroup(req.user.userId, req.params.id);
    res.json({ message: "You left the group" });
  } catch (err) {
    fail(res, err, "Failed to leave group");
  }
});

router.delete("/groups/:id", authMiddleware, async (req, res) => {
  try {
    await adventures.deleteGroup(req.user.userId, req.params.id);
    res.json({ message: "Group deleted" });
  } catch (err) {
    fail(res, err, "Failed to delete group");
  }
});

router.post("/groups/:id/remove", authMiddleware, async (req, res) => {
  try {
    await adventures.removePlayer(req.user.userId, req.params.id, req.body.userId);
    res.json({ message: "Player removed" });
  } catch (err) {
    fail(res, err, "Failed to remove player");
  }
});

router.post("/groups/:id/new-code", authMiddleware, async (req, res) => {
  try {
    await adventures.rotateCode(req.user.userId, req.params.id);
    res.json(await adventures.getGroup(req.user.userId, req.params.id));
  } catch (err) {
    fail(res, err, "Failed to create a new code");
  }
});

router.post("/groups/:id/active", authMiddleware, async (req, res) => {
  try {
    await adventures.setActive(req.user.userId, req.params.id, req.body.isActive);
    res.json(await adventures.getGroup(req.user.userId, req.params.id));
  } catch (err) {
    fail(res, err, "Failed to update the group");
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
      ...(String(a.owner) === String(userId) && { accessCode: a.accessCode }),
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

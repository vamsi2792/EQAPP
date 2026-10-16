const express = require("express");
const router = express.Router();

const ScenarioContent = require("../models/ScenarioContent");
const authMiddleware = require("../middleware/auth.middleware");
const adminUserMiddleware = require("../middleware/adminUser.middleware");
const { isNonEmptyString, isObjectId } = require("../utils/validate");
const {
  upload,
  saveScenarioImage,
  deleteStoredFile,
  MAX_IMAGE_BYTES,
} = require("../utils/imageUpload");

const MAX_IMAGES_PER_SCENARIO = 30;
const SCENARIO_ID = /^[A-Za-z0-9_-]{1,40}$/;

const serialize = (doc, scenarioId) => ({
  scenarioId,
  exists: !!doc,
  customized: doc ? doc.customized : false,
  description: doc ? doc.description : "",
  images: doc
    ? doc.images.map((i) => ({ id: i._id, url: i.url, caption: i.caption }))
    : [],
});

const validScenario = (req, res, next) => {
  if (!SCENARIO_ID.test(req.params.scenarioId)) {
    return res.status(400).json({ message: "Invalid scenario id" });
  }
  next();
};

const isHttpUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/* ===================== READ (any logged-in player) ===================== */
router.get("/:scenarioId", authMiddleware, validScenario, async (req, res) => {
  try {
    const doc = await ScenarioContent.findOne({ scenarioId: req.params.scenarioId });
    res.json(serialize(doc, req.params.scenarioId));
  } catch (err) {
    res.status(500).json({ message: "Failed to load scenario content" });
  }
});

/* ===================== EDIT TEXT (admin) ===================== */
router.put(
  "/:scenarioId",
  authMiddleware,
  adminUserMiddleware,
  validScenario,
  async (req, res) => {
    try {
      const { description } = req.body;

      if (typeof description !== "string" || description.length > 2000) {
        return res
          .status(400)
          .json({ message: "description must be text of at most 2000 characters" });
      }

      const doc = await ScenarioContent.findOneAndUpdate(
        { scenarioId: req.params.scenarioId },
        { description: description.trim(), updatedBy: req.currentUser._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json(serialize(doc, req.params.scenarioId));
    } catch (err) {
      res.status(500).json({ message: "Failed to save text" });
    }
  }
);

/* ===================== IMPORT BUILT-IN IMAGES (admin) ===================== */
// The map page ships with default image URLs. This copies them into the database the
// first time an admin edits a scenario so they can be reordered/removed like uploads.
router.post(
  "/:scenarioId/seed",
  authMiddleware,
  adminUserMiddleware,
  validScenario,
  async (req, res) => {
    try {
      const { urls } = req.body;

      if (
        !Array.isArray(urls) ||
        urls.length > MAX_IMAGES_PER_SCENARIO ||
        !urls.every((u) => typeof u === "string" && isHttpUrl(u))
      ) {
        return res.status(400).json({ message: "urls must be a list of http(s) URLs" });
      }

      let doc = await ScenarioContent.findOne({ scenarioId: req.params.scenarioId });

      if (doc && doc.images.length > 0) {
        return res.json(serialize(doc, req.params.scenarioId)); // already imported
      }

      doc = await ScenarioContent.findOneAndUpdate(
        { scenarioId: req.params.scenarioId },
        {
          $set: { updatedBy: req.currentUser._id, customized: true },
          $push: { images: { $each: urls.map((url) => ({ url })) } },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json(serialize(doc, req.params.scenarioId));
    } catch (err) {
      res.status(500).json({ message: "Failed to import images" });
    }
  }
);

/* ===================== UPLOAD IMAGE (admin) ===================== */
router.post(
  "/:scenarioId/images",
  authMiddleware,
  adminUserMiddleware,
  validScenario,
  (req, res, next) =>
    upload.single("image")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: `Image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB)`,
        });
      }
      return res.status(400).json({ message: "Invalid upload" });
    }),
  async (req, res) => {
    let saved;
    try {
      const existing = await ScenarioContent.findOne({
        scenarioId: req.params.scenarioId,
      });

      if (existing && existing.images.length >= MAX_IMAGES_PER_SCENARIO) {
        return res.status(400).json({
          message: `A scenario can have at most ${MAX_IMAGES_PER_SCENARIO} images`,
        });
      }

      saved = await saveScenarioImage(req.file);

      const caption =
        typeof req.body.caption === "string" ? req.body.caption.trim().slice(0, 200) : "";

      const doc = await ScenarioContent.findOneAndUpdate(
        { scenarioId: req.params.scenarioId },
        {
          $set: { updatedBy: req.currentUser._id, customized: true },
          $push: { images: { url: saved.url, storedFile: saved.storedFile, caption } },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(201).json(serialize(doc, req.params.scenarioId));
    } catch (err) {
      if (saved) await deleteStoredFile(saved.storedFile).catch(() => {});
      if (err.status) return res.status(err.status).json({ message: err.message });
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

/* ===================== EDIT CAPTION (admin) ===================== */
router.patch(
  "/:scenarioId/images/:imageId",
  authMiddleware,
  adminUserMiddleware,
  validScenario,
  async (req, res) => {
    try {
      const { caption } = req.body;

      if (!isObjectId(req.params.imageId)) {
        return res.status(400).json({ message: "Invalid image id" });
      }
      if (typeof caption !== "string" || caption.length > 200) {
        return res.status(400).json({ message: "caption must be text of at most 200 characters" });
      }

      const doc = await ScenarioContent.findOneAndUpdate(
        { scenarioId: req.params.scenarioId, "images._id": req.params.imageId },
        { $set: { "images.$.caption": caption.trim(), updatedBy: req.currentUser._id } },
        { new: true }
      );

      if (!doc) return res.status(404).json({ message: "Image not found" });

      res.json(serialize(doc, req.params.scenarioId));
    } catch (err) {
      res.status(500).json({ message: "Failed to update caption" });
    }
  }
);

/* ===================== DELETE IMAGE (admin) ===================== */
router.delete(
  "/:scenarioId/images/:imageId",
  authMiddleware,
  adminUserMiddleware,
  validScenario,
  async (req, res) => {
    try {
      if (!isObjectId(req.params.imageId)) {
        return res.status(400).json({ message: "Invalid image id" });
      }

      const doc = await ScenarioContent.findOne({ scenarioId: req.params.scenarioId });
      const image = doc && doc.images.id(req.params.imageId);

      if (!image) return res.status(404).json({ message: "Image not found" });

      const storedFile = image.storedFile;
      image.deleteOne();
      doc.updatedBy = req.currentUser._id;
      doc.customized = true;
      await doc.save();
      await deleteStoredFile(storedFile);

      res.json(serialize(doc, req.params.scenarioId));
    } catch (err) {
      res.status(500).json({ message: "Failed to delete image" });
    }
  }
);

/* ===================== REORDER IMAGES (admin) ===================== */
router.put(
  "/:scenarioId/order",
  authMiddleware,
  adminUserMiddleware,
  validScenario,
  async (req, res) => {
    try {
      const { order } = req.body;
      const doc = await ScenarioContent.findOne({ scenarioId: req.params.scenarioId });

      if (!doc) return res.status(404).json({ message: "Scenario has no images yet" });

      const current = doc.images.map((i) => i._id.toString());
      const valid =
        Array.isArray(order) &&
        order.every(isNonEmptyString) &&
        order.length === current.length &&
        new Set(order).size === order.length &&
        order.every((id) => current.includes(id));

      if (!valid) {
        return res
          .status(400)
          .json({ message: "order must list every current image id exactly once" });
      }

      const byId = new Map(doc.images.map((i) => [i._id.toString(), i]));
      doc.images = order.map((id) => byId.get(id));
      doc.updatedBy = req.currentUser._id;
      doc.customized = true;
      await doc.save();

      res.json(serialize(doc, req.params.scenarioId));
    } catch (err) {
      res.status(500).json({ message: "Failed to reorder images" });
    }
  }
);

module.exports = router;

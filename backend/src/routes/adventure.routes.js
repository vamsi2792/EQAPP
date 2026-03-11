const express = require("express");
const router = express.Router();
const Adventure = require("../models/Adventure");


/* ================= CREATE ADVENTURE (GM) ================= */

router.post("/create", async (req, res) => {
  try {
    const {
      title,
      description,
      latitude,
      longitude,
      images,
      xpReward,
      difficulty,
      club,
      createdBy,
    } = req.body;

    const adventure = new Adventure({
      title,
      description,
      images,
      location: {
        latitude,
        longitude,
      },
      xpReward,
      difficulty,
      club,
      createdBy,
      isActive: true,
    });

    await adventure.save();

    res.json({
      message: "Adventure created successfully",
      adventure,
    });

  } catch (err) {

    res.status(500).json({
      message: "Failed to create adventure",
    });

  }
});


/* ================= GET ALL ADVENTURES ================= */

router.get("/", async (req, res) => {
  try {

    const adventures = await Adventure.find();

    res.json(adventures);

  } catch (err) {

    res.status(500).json({
      message: "Failed to fetch adventures",
    });

  }
});


/* ================= GET SINGLE ADVENTURE ================= */

router.get("/:id", async (req, res) => {
  try {

    const adventure = await Adventure.findById(req.params.id);

    if (!adventure) {
      return res.status(404).json({
        message: "Adventure not found",
      });
    }

    res.json(adventure);

  } catch (err) {

    res.status(500).json({
      message: "Failed to fetch adventure",
    });

  }
});


/* ================= MAP GEOJSON FOR ARCGIS ================= */
/* This route sends adventures as GeoJSON so ArcGIS can display them as pins */

router.get("/map", async (req, res) => {
  try {

    const adventures = await Adventure.find({ isActive: true });

    const geojson = adventures.map((adv) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          adv.location.longitude,
          adv.location.latitude,
        ],
      },
      properties: {
        id: adv._id,
        title: adv.title,
        description: adv.description,
        images: adv.images,
        xpReward: adv.xpReward,
      },
    }));

    res.json({
      type: "FeatureCollection",
      features: geojson,
    });

  } catch (err) {

    res.status(500).json({
      message: "Failed to fetch adventures",
    });

  }
});


module.exports = router;
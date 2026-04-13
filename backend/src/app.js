const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adventureRoutes = require("./routes/adventure.routes");
const clubRoutes = require("./routes/club.routes");
const profileRoutes = require("./routes/profile.routes");
const arcgisRoutes = require("./routes/arcgis.routes");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve static files (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/adventures", adventureRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", arcgisRoutes);

app.get("/", (req, res) => {
  res.send("EarthQuest API running");
});

module.exports = app;
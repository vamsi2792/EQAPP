const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

<<<<<<< Updated upstream
=======
// ✅ Serve static files (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);

>>>>>>> Stashed changes
app.get("/", (req, res) => {
  res.send("EarthQuest API running");
});

module.exports = app;
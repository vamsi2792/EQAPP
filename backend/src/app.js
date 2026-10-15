const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adventureRoutes = require("./routes/adventure.routes");
const clubRoutes = require("./routes/club.routes");
const profileRoutes = require("./routes/profile.routes");
const arcgisRoutes = require("./routes/arcgis.routes");
// const productRoutes = require("./routes/product.routes");


const app = express();

// CSP is off because the bundled ArcGIS map page relies on inline/third-party scripts.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS_ORIGINS="https://a.com,https://b.com" restricts browser origins.
// Unset = allow all (local dev). Native mobile requests send no Origin and are unaffected.
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));

app.use(express.json({ limit: "100kb" }));

// Broad ceiling for every route, plus a much tighter one for credential/OTP endpoints.
const limiterOpts = { standardHeaders: true, legacyHeaders: false };
app.use(rateLimit({ ...limiterOpts, windowMs: 15 * 60 * 1000, limit: 300 }));
const authLimiter = rateLimit({
  ...limiterOpts,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { message: "Too many attempts, please try again later" },
});

// ✅ Serve static files (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/adventures", adventureRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", arcgisRoutes);
// app.use("/products", productRoutes);

app.get("/", (req, res) => {
  res.send("EarthQuest API running");
});

module.exports = app;
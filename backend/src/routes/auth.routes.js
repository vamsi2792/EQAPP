const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const sendEmail = require("../utils/email");
const {
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  generateOtp,
  hashOtp,
  otpMatches,
} = require("../utils/otp");

const router = express.Router();

/* ===================== HELPERS ===================== */
const isStr = (v) => typeof v === "string" && v.length > 0;
const MIN_PASSWORD_LENGTH = 8;
const isStrongEnough = (pw) => isStr(pw) && pw.length >= MIN_PASSWORD_LENGTH;

/* ===================== SIGNUP ===================== */
router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, profile, clubCode } = req.body;

    if (!isStr(firstName) || !isStr(lastName) || !isStr(email) || !isStr(password)) {
      return res.status(400).json({
        message: "All required fields must be filled",
      });
    }

    if (!isStrongEnough(password)) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOtp();

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      profile,
      clubCode: clubCode || null,
      emailOtp: hashOtp(otp),
      emailOtpExpiry: Date.now() + OTP_TTL_MS,

      // 🔥 IMPORTANT
      accountType: "registrant", // permissions auto-handled in schema
    });

    await sendEmail(
      email,
      "Verify Your EarthQuest Email",
      `Your verification OTP is ${otp}. It expires in 10 minutes.`
    );

    res.status(201).json({
      message: "Account created. Please verify your email.",
    });

  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({
      message: "Server error during signup",
    });
  }
});

/* ===================== VERIFY EMAIL ===================== */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!isStr(email) || otp === undefined || otp === null) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.emailOtp ||
      user.emailOtpExpiry < Date.now() ||
      user.emailOtpAttempts >= MAX_OTP_ATTEMPTS
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    if (!otpMatches(otp, user.emailOtp)) {
      user.emailOtpAttempts += 1;
      await user.save();
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    user.emailVerified = true;
    user.emailOtp = null;
    user.emailOtpExpiry = null;
    user.emailOtpAttempts = 0;

    await user.save();

    res.json({
      message: "Email verified successfully",
    });

  } catch (err) {
    res.status(500).json({
      message: "Verification failed",
    });
  }
});

/* ===================== RESEND OTP ===================== */
// Always answers the same way so it cannot be used to discover registered emails.
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!isStr(email)) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (user && !user.emailVerified) {
      const otp = generateOtp();

      user.emailOtp = hashOtp(otp);
      user.emailOtpExpiry = Date.now() + OTP_TTL_MS;
      user.emailOtpAttempts = 0;

      await user.save();

      await sendEmail(
        email,
        "EarthQuest Email Verification OTP",
        `Your new OTP is ${otp}`
      );
    }

    res.json({
      message: "If the account exists, a new OTP has been sent",
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to resend OTP",
    });
  }
});

/* ===================== LOGIN ===================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isStr(email) || !isStr(password)) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        accountType: user.accountType,
        membershipActive: user.membershipActive,
        clubCode: user.clubCode,
        permissions: user.permissions, // 🔥 IMPORTANT FOR FRONTEND
      },
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error during login",
    });
  }
});

/* ===================== FORGOT PASSWORD ===================== */
// Always answers the same way so it cannot be used to discover registered emails.
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!isStr(email)) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (user) {
      const otp = generateOtp();

      user.resetOtp = hashOtp(otp);
      user.resetOtpExpiry = Date.now() + OTP_TTL_MS;
      user.resetOtpAttempts = 0;

      await user.save();

      await sendEmail(
        email,
        "EarthQuest Password Reset OTP",
        `Your OTP is ${otp}`
      );
    }

    res.json({
      message: "If the account exists, a reset OTP has been sent",
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to send reset OTP",
    });
  }
});

/* ===================== RESET PASSWORD ===================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!isStr(email) || otp === undefined || otp === null) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (!isStrongEnough(newPassword)) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetOtp ||
      user.resetOtpExpiry < Date.now() ||
      user.resetOtpAttempts >= MAX_OTP_ATTEMPTS
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    if (!otpMatches(otp, user.resetOtp)) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;

    await user.save();

    res.json({
      message: "Password reset successful",
    });

  } catch (err) {
    res.status(500).json({
      message: "Password reset failed",
    });
  }
});

/* ===================== SET USERNAME ===================== */
router.post("/set-username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;

    const existing = await User.findOne({ username });

    if (existing) {
      return res.status(400).json({
        message: "Username already taken",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { username },
      { new: true }
    );

    res.json({
      message: "Username set successfully",
      username: user.username,
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to set username",
    });
  }
});

/* ===================== UPGRADE TO MEMBER ===================== */
// Admin-only: callers must send the x-admin-key header. The target user is
// given by `userId` in the body. Users can no longer promote themselves.
router.post("/upgrade-member", adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.accountType = "member";
    user.membershipActive = true;

    if (user.username && !user.username.endsWith("M")) {
      user.username = user.username + "M";
    }

    await user.save(); // permissions auto-updated

    res.json({
      message: "Membership activated",
      accountType: user.accountType,
      permissions: user.permissions,
    });

  } catch (err) {
    res.status(500).json({
      message: "Membership upgrade failed",
    });
  }
});

/* ===================== UPGRADE TO GM ===================== */
// Admin-only, same contract as upgrade-member.
router.post("/upgrade-gm", adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.accountType !== "member") {
      return res.status(400).json({
        message: "Only members can become GM",
      });
    }

    user.accountType = "gm";

    if (user.username && !user.username.endsWith("G")) {
      user.username = user.username + "G";
    }

    await user.save(); // permissions auto-updated

    res.json({
      message: "User upgraded to GM",
      accountType: user.accountType,
      permissions: user.permissions,
    });

  } catch (err) {
    res.status(500).json({
      message: "GM upgrade failed",
    });
  }
});

/* ===================== GET CURRENT USER ===================== */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    res.json(user);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user",
    });
  }
});

module.exports = router;
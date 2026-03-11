const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth.middleware");
const sendEmail = require("../utils/email");

const router = express.Router();

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ===================== SIGNUP ===================== */
router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, profile, clubCode } =
      req.body;

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
      emailOtp: otp,
      emailOtpExpiry: Date.now() + 10 * 60 * 1000,
      accountType: "registrant",
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

    const user = await User.findOne({ email });

    if (
      !user ||
      user.emailOtp !== String(otp) ||
      user.emailOtpExpiry < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    user.emailVerified = true;
    user.emailOtp = null;
    user.emailOtpExpiry = null;

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
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({
        message: "User not found",
      });

    const otp = generateOtp();

    user.emailOtp = otp;
    user.emailOtpExpiry = Date.now() + 10 * 60 * 1000;

    await user.save();

    await sendEmail(
      email,
      "EarthQuest Email Verification OTP",
      `Your new OTP is ${otp}`
    );

    res.json({
      message: "OTP resent successfully",
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

    if (!email || !password)
      return res.status(400).json({
        message: "Email and password required",
      });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(401).json({
        message: "Invalid email or password",
      });

    if (!user.emailVerified)
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({
        message: "Invalid email or password",
      });

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
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during login",
    });
  }
});

/* ===================== FORGOT PASSWORD ===================== */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.status(404).json({
      message: "User not found",
    });

  const otp = generateOtp();

  user.resetOtp = otp;
  user.resetOtpExpiry = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(
    email,
    "EarthQuest Password Reset OTP",
    `Your OTP is ${otp}`
  );

  res.json({
    message: "Reset OTP sent to email",
  });
});

/* ===================== RESET PASSWORD ===================== */
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.resetOtp !== otp || user.resetOtpExpiry < Date.now()) {
    return res.status(400).json({
      message: "Invalid or expired OTP",
    });
  }

  const salt = await bcrypt.genSalt(10);

  user.password = await bcrypt.hash(newPassword, salt);

  user.resetOtp = null;
  user.resetOtpExpiry = null;

  await user.save();

  res.json({
    message: "Password reset successful",
  });
});

/* ===================== SET USERNAME ===================== */
router.post("/set-username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;

    const existing = await User.findOne({ username });

    if (existing)
      return res.status(400).json({
        message: "Username already taken",
      });

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
router.post("/upgrade-member", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    user.accountType = "member";
    user.membershipActive = true;

    if (user.username && !user.username.endsWith("M")) {
      user.username = user.username + "M";
    }

    await user.save();

    res.json({
      message: "Membership activated",
      accountType: user.accountType,
    });
  } catch (err) {
    res.status(500).json({
      message: "Membership upgrade failed",
    });
  }
});

/* ===================== UPGRADE TO GM ===================== */
router.post("/upgrade-gm", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (user.accountType !== "member") {
      return res.status(400).json({
        message: "Only members can become GM",
      });
    }

    user.accountType = "gm";

    if (!user.username.endsWith("G")) {
      user.username = user.username + "G";
    }

    await user.save();

    res.json({
      message: "User upgraded to GM",
      accountType: user.accountType,
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
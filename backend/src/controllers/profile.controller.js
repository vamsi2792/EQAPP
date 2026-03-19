const User = require("../models/User");
const Club = require("../models/club");

/* ===================== GET PROFILE ===================== */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Fetch profile failed" });
  }
};

/* ===================== UPDATE PROFILE ===================== */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, profile } = req.body;

    const updates = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(profile && { profile }),
    };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};

/* ===================== GET FULL PROFILE ===================== */
exports.getFullProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    let club = null;

    if (user.clubCode) {
      club = await Club.findOne({ clubCode: user.clubCode })
        .populate("members", "firstName lastName username")
        .populate("pendingMembers", "firstName lastName username")
        .populate("gm", "firstName lastName username");
    }

    res.json({
      user,
      club,
    });
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
};

/* ===================== LEAVE CLUB ===================== */
exports.leaveClub = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user.clubCode) {
      return res.status(400).json({ message: "Not part of any club" });
    }

    const club = await Club.findOne({ clubCode: user.clubCode });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    if (club.gm.toString() === user._id.toString()) {
      return res.status(400).json({
        message: "GM cannot leave the club",
      });
    }

    club.members = club.members.filter(
      (id) => id.toString() !== user._id.toString()
    );

    club.totalMembers = Math.max(0, club.totalMembers - 1);

    await club.save();

    user.clubCode = null;
    user.clubRole = null;
    user.clubApproved = false;

    await user.save();

    res.json({ message: "Left club successfully" });
  } catch (err) {
    res.status(500).json({ message: "Leave club failed" });
  }
};
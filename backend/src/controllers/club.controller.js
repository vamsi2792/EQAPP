const Club = require("../models/club");
const User = require("../models/User");
const generateCode = require("../utils/generateCode");

/* ===================== CREATE CLUB ===================== */
exports.createClub = async (req, res) => {
  try {
    const user = req.currentUser;

    const code = generateCode();

    const club = await Club.create({
      clubName: req.body.clubName,
      clubCode: code,
      gm: user._id,
      members: [user._id],
      totalMembers: 1,
    });

    user.clubCode = code;
    user.clubRole = "gm";
    user.clubApproved = true;

    await user.save();

    res.json(club);
  } catch (err) {
    res.status(500).json({ message: "Create club failed" });
  }
};

/* ===================== JOIN CLUB ===================== */
exports.joinClub = async (req, res) => {
  try {
    const { clubCode } = req.body;
    const user = req.currentUser;

    const club = await Club.findOne({ clubCode });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    if (club.bannedMembers.includes(user._id)) {
      return res.status(403).json({ message: "You are banned" });
    }

    if (
      club.members.includes(user._id) ||
      club.pendingMembers.includes(user._id)
    ) {
      return res.json({ message: "Already requested or member" });
    }

    club.pendingMembers.push(user._id);
    await club.save();

    user.clubCode = clubCode;
    user.clubApproved = false;

    await user.save();

    res.json({ message: "Join request sent" });
  } catch (err) {
    res.status(500).json({ message: "Join failed" });
  }
};

/* ===================== APPROVE MEMBER ===================== */
exports.approveMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const user = req.currentUser;

    const club = await Club.findOne({ clubCode: user.clubCode });

    club.pendingMembers = club.pendingMembers.filter(
      (id) => id.toString() !== memberId
    );

    if (!club.members.includes(memberId)) {
      club.members.push(memberId);
      club.totalMembers += 1;
    }

    await club.save();

    await User.findByIdAndUpdate(memberId, {
      clubApproved: true,
      clubRole: "member",
    });

    res.json({ message: "Member approved" });
  } catch (err) {
    res.status(500).json({ message: "Approval failed" });
  }
};

/* ===================== GET MEMBERS ===================== */
exports.getMembers = async (req, res) => {
  try {
    const user = req.currentUser;

    if (!user.clubCode) {
      return res.json([]);
    }

    const club = await Club.findOne({ clubCode: user.clubCode })
      .populate("members", "firstName lastName username");

    res.json(club.members);
  } catch (err) {
    res.status(500).json({ message: "Fetch members failed" });
  }
};

/* ===================== KICK MEMBER ===================== */
exports.kickMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const user = req.currentUser;

    const club = await Club.findOne({ clubCode: user.clubCode });

    club.members = club.members.filter(
      (id) => id.toString() !== memberId
    );

    club.totalMembers = Math.max(0, club.totalMembers - 1);

    await club.save();

    await User.findByIdAndUpdate(memberId, {
      clubCode: null,
      clubRole: null,
      clubApproved: false,
    });

    res.json({ message: "Member kicked" });
  } catch (err) {
    res.status(500).json({ message: "Kick failed" });
  }
};

/* ===================== BAN MEMBER ===================== */
exports.banMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const user = req.currentUser;

    const club = await Club.findOne({ clubCode: user.clubCode });

    club.members = club.members.filter(
      (id) => id.toString() !== memberId
    );

    if (!club.bannedMembers.includes(memberId)) {
      club.bannedMembers.push(memberId);
    }

    club.totalMembers = Math.max(0, club.totalMembers - 1);

    await club.save();

    await User.findByIdAndUpdate(memberId, {
      clubCode: null,
      clubRole: null,
      clubApproved: false,
    });

    res.json({ message: "Member banned" });
  } catch (err) {
    res.status(500).json({ message: "Ban failed" });
  }
};
import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

// --- OPTION 1: Backup Admin Emails
const ADMIN_EMAILS = ["lucidevil1969@gmail.com", "chippyticketing@gmail.com"];

// --- In-memory token store for reset password (demo/testing)
const resetTokens = {};


// ===============================
//        ADMIN CREATION
// ===============================
router.post("/create-admin", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ message: "This email is not allowed to be admin" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });

    const admin = new User({ name, email, password, role: "admin", verified: true });
    await admin.save();

    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===============================
//          STAFF SIGNUP
// ===============================
router.post("/staff-signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const staff = new User({ name, email, password, role: "staff", verified: false });
    await staff.save();

    res.status(201).json({ message: "Staff created, waiting for admin verification" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===============================
//            LOGIN
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    if (user.role === "staff" && !user.verified)
      return res.status(403).json({ message: "Staff not verified by admin" });

    if (!user.password)
      return res.status(400).json({
        message: "You haven't set a password. Please login with Google first."
      });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { _id:user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===============================
//         GOOGLE LOGIN
// ===============================
router.post("/google-login", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      const role = ADMIN_EMAILS.includes(email) ? "admin" : "staff";
      const verified = role === "admin";

      user = new User({ name, email, googleId, role, verified });
      await user.save();

      if (role === "staff") {
        return res.status(201).json({
          message: "Staff registered, waiting for admin verification",
          user,
          needsPassword: true,
        });
      }
    }

    if (user.role === "staff" && !user.verified) {
      return res.status(403).json({
        message: "Staff not verified by admin",
        user,
        needsPassword: !user.password,
      });
    }

    const needsPassword = !user.password;

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user,
      needsPassword,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===============================
//        VERIFY STAFF
// ===============================
router.patch("/verify-staff/:id", async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    staff.verified = true;
    await staff.save();

    res.json({ message: "Staff verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===============================
//         SET PASSWORD
// ===============================
router.post("/set-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found. Please contact admin.",
      });
    }

    // 🚫 HARD BLOCK — signup only
    if (user.passwordSet) {
      return res.status(409).json({
        message:
          "Password already set. Please login or use Forgot Password.",
      });
    }

    // ✅ First-time setup
    user.password = password;
    user.passwordSet = true;
    await user.save();

    return res.json({
      message: "Password set successfully. Please login.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===============================
//        FORGOT PASSWORD
// ===============================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    resetTokens[token] = user._id;

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below:</p>
        <a href="${resetLink}" target="_blank">Reset Password</a>
        <p>This link expires in 15 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: "Password reset email sent. Check your inbox.",
      resetLink,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ===============================
//        RESET PASSWORD
// ===============================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !resetTokens[token])
      return res.status(400).json({ message: "Invalid or expired token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    delete resetTokens[token];

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
//        SAVE FCM TOKEN
// ===============================
router.post("/save-fcm-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "FCM token missing" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const jwtToken = authHeader.split(" ")[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);

    await User.findByIdAndUpdate(decoded.id, {
      fcmToken: token,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Save FCM token error:", err);
    res.status(500).json({ message: "Failed to save FCM token" });
  }
});

export default router;

import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { ROLE_POLICY } from "../utils/rolePolicy.js";


const router = express.Router();

// --- GET all staff ---
router.get("/", authMiddleware, async (req, res) => {
  try {
    const staff = await User.find({}, "-password"); // exclude passwords
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ADD new staff manually ---
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const requesterRole = req.user.role;

    const policy = ROLE_POLICY[requesterRole];
    if (!policy)
      return res.status(403).json({ message: "Access denied" });

    if (!policy.canCreate.includes(role)) {
      return res.status(403).json({
        message: `You cannot create role: ${role}`,
      });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const user = new User({
      name,
      email,
      role,
      verified: true,
    });

    await user.save();

    res.status(201).json({
      message: `${role} created successfully`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- UPDATE role ---
router.patch("/update-role/:id", authMiddleware, async (req, res) => {
  try {
    const { role: newRole } = req.body;
    const requesterRole = req.user.role;

    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    const policy = ROLE_POLICY[requesterRole];
    if (!policy)
      return res.status(403).json({ message: "Access denied" });

    if (policy.protected.includes(targetUser.role)) {
      return res.status(403).json({
        message: "You cannot modify this user",
      });
    }

    if (!policy.canEdit.includes(targetUser.role)) {
      return res.status(403).json({
        message: "You cannot edit this user",
      });
    }

    if (!policy.canCreate.includes(newRole)) {
      return res.status(403).json({
        message: `You cannot assign role: ${newRole}`,
      });
    }

    targetUser.role = newRole;
    await targetUser.save();

    res.json({ message: "Role updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// --- TOGGLE verified status ---
router.patch("/toggle-verified/:id", authMiddleware, async (req, res) => {
  try {
    const requesterRole = req.user.role;

    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    const policy = ROLE_POLICY[requesterRole];
    if (!policy)
      return res.status(403).json({ message: "Access denied" });

    if (policy.protected.includes(targetUser.role)) {
      return res.status(403).json({
        message: "You cannot modify this user",
      });
    }

    targetUser.verified = !targetUser.verified;
    await targetUser.save();

    res.json({
      message: `User ${
        targetUser.verified ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- DELETE staff ---
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const requesterRole = req.user.role;

    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    const policy = ROLE_POLICY[requesterRole];
    if (!policy)
      return res.status(403).json({ message: "Access denied" });

    if (policy.protected.includes(targetUser.role)) {
      return res.status(403).json({
        message: "You cannot delete this user",
      });
    }

    await targetUser.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;

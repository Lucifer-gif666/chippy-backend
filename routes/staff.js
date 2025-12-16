import express from "express";
import User from "../models/User.js";

const router = express.Router();

// --- GET all staff ---
router.get("/", async (req, res) => {
  try {
    const staff = await User.find({}, "-password"); // exclude passwords
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ADD new staff manually ---
router.post("/add", async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const staff = new User({ name, email, role, verified: true }); // auto-verify if added manually
    await staff.save();

    res.status(201).json({ message: "Staff added successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- UPDATE role ---
router.patch("/update-role/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Role updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- TOGGLE verified status ---
router.patch("/toggle-verified/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.verified = !user.verified;
    await user.save();

    res.json({ message: `User ${user.verified ? "activated" : "deactivated"} successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- DELETE staff ---
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

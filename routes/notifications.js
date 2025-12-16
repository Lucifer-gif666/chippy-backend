import express from "express";
import mongoose from "mongoose";
import Notification from "../models/Notifications.js";

const router = express.Router();

/**
 * GET /api/notifications?staffId=xxxx
 * Fetch unread notifications for pop-ups
 */
router.get("/", async (req, res) => {
  try {
    const { staffId } = req.query;
    if (!staffId) return res.status(400).json({ message: "staffId is required" });

    const staffObjectId = new mongoose.Types.ObjectId(staffId);

    // Fetch notifications that are global or user-specific AND not read by this user
    const notifications = await Notification.find({
      $or: [{ userId: null }, { userId: staffObjectId }],
      readBy: { $ne: staffObjectId }
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a SINGLE notification as read (for pop-up)
 */
router.patch("/:id/read", async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ message: "staffId is required" });

    const staffObjectId = new mongoose.Types.ObjectId(staffId);

    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: staffObjectId }
    });

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification:", err);
    res.status(500).json({ message: "Error updating notification" });
  }
});

export default router;

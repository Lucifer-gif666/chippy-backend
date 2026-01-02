import express from "express";
import mongoose from "mongoose";
import Notification from "../models/Notifications.js";
import User from "../models/User.js";
import { sendPushNotification } from "../firebaseAdmin.js";

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

    const notifications = await Notification.find({
      $or: [{ userId: null }, { userId: staffObjectId }],
      readBy: { $ne: staffObjectId },
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
      $addToSet: { readBy: staffObjectId },
    });

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification:", err);
    res.status(500).json({ message: "Error updating notification" });
  }
});

/**
 * POST /api/notifications/send
 * Create DB notification + send PUSH notification
 */
router.post("/send", async (req, res) => {
  try {
    const { userId, title, message, url } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // 1️⃣ Create notification in DB (for in-app popup)
    const notification = await Notification.create({
      userId: userId || null,
      message,
      url: url || "/",
      readBy: [],
    });

    // 2️⃣ Send PUSH notification (if userId exists)
    if (userId) {
      const user = await User.findById(userId);

      if (user?.fcmToken) {
        await sendPushNotification({
          token: user.fcmToken,
          title,
          body: message,
          data: {
            url: url || "/",
            notificationId: notification._id.toString(),
          },
        });
      }
    }

    res.json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error("Notification send error:", err);
    res.status(500).json({ message: "Failed to send notification" });
  }
});

export default router;

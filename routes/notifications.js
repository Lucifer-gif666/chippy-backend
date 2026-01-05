import express from "express";
import mongoose from "mongoose";
import Notification from "../models/Notifications.js";
import User from "../models/User.js";
import { sendPushNotification } from "../firebaseAdmin.js";

const router = express.Router();

/**
 * GET /api/notifications?staffId=xxxx&includeRead=false
 * Fetch notifications for pop-ups (unread by default)
 */
router.get("/", async (req, res) => {
  try {
    const { staffId, includeRead = 'false' } = req.query;
    if (!staffId) return res.status(400).json({ message: "staffId is required" });

    const staffObjectId = new mongoose.Types.ObjectId(staffId);

    const query = {
      $or: [{ userId: null }, { userId: staffObjectId }],
    };

    // Only filter out read notifications if includeRead is false
    if (includeRead === 'false') {
      query.readBy = { $ne: staffObjectId };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50); // Limit to prevent too many results

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
 * Create DB notification + send PUSH notification + BROWSER notification
 */
router.post("/send", async (req, res) => {
  try {
    const { userId, title, message, url, isPWA } = req.body;

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

    // 2️⃣ Send PUSH notification (for PWA installed users)
    if (userId) {
      const user = await User.findById(userId);

      if (user?.fcmToken) {
        try {
          await sendPushNotification({
            token: user.fcmToken,
            title,
            body: message,
            data: {
              url: url || "/",
              notificationId: notification._id.toString(),
              type: "pwa", // Indicate this is for PWA
            },
          });
          console.log(`✅ PWA push sent to ${user.name}`);
        } catch (pushError) {
          console.error(`❌ PWA push failed for ${user.name}:`, pushError.message);
        }
      }
    }

    // 3️⃣ For BROWSER notifications (when PWA not installed)
    // This will be handled by frontend via WebSocket or polling
    // The notification is already saved in DB, frontend can poll for new notifications

    res.json({
      success: true,
      notification,
      sentPWA: !!(userId && (await User.findById(userId))?.fcmToken),
    });
  } catch (err) {
    console.error("Notification send error:", err);
    res.status(500).json({ message: "Failed to send notification" });
  }
});

/**
 * DEBUG: Check notification status
 */
router.get("/debug", async (req, res) => {
  try {
    const usersWithTokens = await User.find({
      fcmToken: { $exists: true, $ne: null }
    }).select('name email role fcmToken');

    const totalUsers = await User.countDocuments();
    const usersWithTokensCount = usersWithTokens.length;

    res.json({
      totalUsers,
      usersWithTokens: usersWithTokensCount,
      users: usersWithTokens.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasToken: !!user.fcmToken,
        tokenPreview: user.fcmToken ? user.fcmToken.substring(0, 20) + '...' : null
      }))
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ message: "Debug failed" });
  }
});

/**
 * DEBUG: Test push notification
 */
router.post("/test-push", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: "userId required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.fcmToken) {
      return res.status(400).json({ message: "User has no FCM token" });
    }

    await sendPushNotification({
      token: user.fcmToken,
      title: "Test Notification 🧪",
      body: "This is a test push notification",
      data: { url: "/test", test: true }
    });

    res.json({ message: "Test notification sent" });
  } catch (err) {
    console.error("Test push error:", err);
    res.status(500).json({ message: "Test push failed", error: err.message });
  }
});

export default router;

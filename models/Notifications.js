import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    // Optional: null means global notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null
    },

    ticketId: { type: String, required: true },

    type: {
      type: String,
      enum: ["created", "assigned", "accepted", "hold", "resolved", "closed"],
      required: true,
    },

    message: { type: String, required: true },

    // Track which users have read the notification (for pop-up disappear)
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    url: { type: String },

    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: "24h" }, // optional auto-delete after 24h
    },
  },
  { timestamps: true }
);

// TTL index to auto-delete after 24 hours
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;

import mongoose from "mongoose";

const NotificationReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },

    // null = unread
    readAt: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export default mongoose.model("NotificationRead", NotificationReadSchema);

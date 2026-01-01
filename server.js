// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import ticketRoutes from "./routes/tickets.js";
import zoneRoutes from "./routes/zones.js";
import staffRoutes from "./routes/staff.js";
import notificationsRouter from "./routes/notifications.js";

import Notification from "./models/Notifications.js";


dotenv.config();

const app = express();

// ✅ CORS FIRST
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://chippy-ticketing-system.pages.dev"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// routes AFTER
app.use("/api/auth", authRoutes);

app.use("/api/tickets", ticketRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/notifications", notificationsRouter);



// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("✅ MongoDB Atlas connected");

    // --- Cleanup job: delete notifications older than 24h ---
    const CLEANUP_INTERVAL_MS = 1000 * 60 * 60; // every hour

    setInterval(async () => {
      try {
        const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000); // 24 hours ago

        // Delete old notifications
        const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
        if (result.deletedCount > 0) {
          console.log(`Cleanup: removed ${result.deletedCount} notifications older than 24h`);
        }
      } catch (err) {
        console.error("Cleanup job error:", err);
      }
    }, CLEANUP_INTERVAL_MS);
  })
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


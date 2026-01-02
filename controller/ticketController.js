// server/controllers/ticketController.js
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Notification from "../models/Notifications.js";
import { sendPushNotification } from "../firebaseAdmin.js";

// ==================================================
// 🔔 COMMON HELPERS
// ==================================================

// Save DB notification
const createNotification = async ({ userId, ticketId, type, message, url }) => {
  return Notification.create({
    userId,
    ticketId,
    type,
    message,
    url
  });
};

// Generate ticket ID
const generateTicketId = () => {
  return `TICKET${Math.floor(1000 + Math.random() * 9000)}`;
};

// 🔥 BROADCAST PUSH TO ALL USERS
const broadcastPush = async ({ title, body, url }) => {
  const users = await User.find({
    fcmToken: { $exists: true, $ne: null }
  });

  for (const user of users) {
    try {
      await sendPushNotification({
        token: user.fcmToken,
        title,
        body,
        data: { url }
      });
    } catch (err) {
      console.error("Push failed:", user._id, err.message);
    }
  }
};

// ==================================================
// 1️⃣ CREATE TICKET
// ==================================================
export const createTicket = async (req, res) => {
  try {
    const { title, description, zoneNo, apartmentName, roomNo } = req.body;
    const currentUser = req.user;

    const ticket = await Ticket.create({
      title,
      description,
      zoneNo,
      apartmentName,
      roomNo,
      createdById: currentUser._id,
      createdBy: currentUser.name,
      status: "Pending",
      ticketId: generateTicketId()
    });

    const users = await User.find({ role: { $in: ["staff", "admin"] } });

    for (const user of users) {
      await createNotification({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "created",
        message: `${currentUser.name} created ticket ${ticket.ticketId}`,
        url: `/tickets/${ticket._id}`
      });
    }

    await broadcastPush({
      title: "New Ticket Created 🎫",
      body: `${currentUser.name} created ${ticket.ticketId}`,
      url: "/staff-dashboard"
    });

    res.status(201).json({ message: "Ticket created", ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create ticket" });
  }
};

// ==================================================
// 2️⃣ ASSIGN TICKET
// ==================================================
export const assignTicket = async (req, res) => {
  try {
    const { ticketId, assignedStaffId } = req.body;
    const currentStaff = req.user;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const assignedStaff = await User.findById(assignedStaffId);
    if (!assignedStaff)
      return res.status(404).json({ message: "Staff not found" });

    ticket.assignedToId = assignedStaff._id;
    ticket.assignedTo = assignedStaff.name;
    ticket.status = "In Progress";
    await ticket.save();

    const users = await User.find({ role: { $in: ["staff", "admin"] } });

    for (const user of users) {
      await createNotification({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "assigned",
        message: `${currentStaff.name} assigned ${ticket.ticketId} to ${assignedStaff.name}`,
        url: `/tickets/${ticket._id}`
      });
    }

    await broadcastPush({
      title: "Ticket Assigned 📌",
      body: `${currentStaff.name} assigned ${ticket.ticketId}`,
      url: `/tickets/${ticket._id}`
    });

    res.json({ message: "Ticket assigned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to assign ticket" });
  }
};

// ==================================================
// 3️⃣ ACCEPT TICKET
// ==================================================
export const acceptTicket = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const currentStaff = req.user;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "In Progress";
    ticket.assignedToId = currentStaff._id;
    ticket.assignedTo = currentStaff.name;
    await ticket.save();

    const users = await User.find({ role: { $in: ["staff", "admin"] } });

    for (const user of users) {
      await createNotification({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "accepted",
        message: `${currentStaff.name} accepted ${ticket.ticketId}`,
        url: `/tickets/${ticket._id}`
      });
    }

    await broadcastPush({
      title: "Ticket Accepted ✅",
      body: `${currentStaff.name} accepted ${ticket.ticketId}`,
      url: `/tickets/${ticket._id}`
    });

    res.json({ message: "Ticket accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept ticket" });
  }
};

// ==================================================
// 4️⃣ HOLD TICKET
// ==================================================
export const holdTicket = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const currentStaff = req.user;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "On Hold";
    await ticket.save();

    const users = await User.find({ role: { $in: ["staff", "admin"] } });

    for (const user of users) {
      await createNotification({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "hold",
        message: `${currentStaff.name} put ${ticket.ticketId} on hold`,
        url: `/tickets/${ticket._id}`
      });
    }

    await broadcastPush({
      title: "Ticket On Hold ⏸️",
      body: `${currentStaff.name} put ${ticket.ticketId} on hold`,
      url: `/tickets/${ticket._id}`
    });

    res.json({ message: "Ticket on hold" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to hold ticket" });
  }
};

// ==================================================
// 5️⃣ RESOLVE TICKET
// ==================================================
export const resolveTicket = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { updatedRemarks } = req.body;
    const currentStaff = req.user;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "Resolved";
    ticket.remarks = `${ticket.remarks || ""} | Updated: ${updatedRemarks}`;
    await ticket.save();

    const users = await User.find({ role: { $in: ["staff", "admin"] } });

    for (const user of users) {
      await createNotification({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "resolved",
        message: `${currentStaff.name} resolved ${ticket.ticketId}`,
        url: `/tickets/${ticket._id}`
      });
    }

    await broadcastPush({
      title: "Ticket Resolved 🎉",
      body: `${currentStaff.name} resolved ${ticket.ticketId}`,
      url: `/tickets/${ticket._id}`
    });

    res.json({ message: "Ticket resolved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to resolve ticket" });
  }
};

// ==================================================
// 6️⃣ CLOSE TICKET
// ==================================================
export const closeTicket = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const currentStaff = req.user;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "Closed";
    await ticket.save();

    const users = await User.find({ role: { $in: ["staff", "admin"] } });

    for (const user of users) {
      await createNotification({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "closed",
        message: `${currentStaff.name} closed ${ticket.ticketId}`,
        url: `/tickets/${ticket._id}`
      });
    }

    await broadcastPush({
      title: "Ticket Closed 🔒",
      body: `${currentStaff.name} closed ${ticket.ticketId}`,
      url: `/tickets/${ticket._id}`
    });

    res.json({ message: "Ticket closed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to close ticket" });
  }
};

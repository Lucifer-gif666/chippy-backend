// server/routes/tickets.js
import express from "express";
import Ticket from "../models/Ticket.js";
import Notification from "../models/Notifications.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET /api/tickets
 * Fetch tickets — if staffId is provided, returns tickets created by or assigned to that staff
 */
router.get("/", async (req, res) => {
  try {
    const { staffId } = req.query;

    const query = staffId
      ? { $or: [{ createdById: staffId }, { assignedToId: staffId }] }
      : {};

    const tickets = await Ticket.find(query)
      .populate("createdById", "name")
      .populate("assignedToId", "name")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/tickets
 * Create a new ticket + notifications to all staff/admin
 */
router.post("/", async (req, res) => {
  try {
    const { currentStaffId, createdBy } = req.body;

    const ticket = new Ticket({
      ...req.body,
      createdById: currentStaffId,
    });

    await ticket.save();

    // Notify all staff/admin
    const staffUsers = await User.find({ role: { $in: ["staff", "admin"] } });
    for (let user of staffUsers) {
      const actorName = req.user.name;

      await Notification.create({
        userId: adminId,
        ticketId: ticket.ticketId,
        type: "created",
        message: `${actorName} created a ticket`,
      
        url: `/dashboard/ticket/${ticket.ticketId}`,
      });
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/tickets/:id
 * General ticket update route
 */
router.patch("/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    Object.assign(ticket, req.body);
    ticket.lastUpdated = new Date().toLocaleString();
    await ticket.save();

    res.json(ticket);
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/tickets/assign/:id
 * Assign ticket + notify all staff/admin
 */
router.patch("/assign/:id", async (req, res) => {
  try {
    const { staffName, staffId, assignedBy } = req.body;
    if (!staffName || !staffId) {
      return res.status(400).json({ message: "staffName and staffId are required" });
    }
    //console.log(staffName);
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.assignedTo = staffName;
    ticket.assignedToId = staffId;
    ticket.status = "Pending";
    ticket.lastUpdated = new Date().toLocaleString();
    await ticket.save();

    // Notify all staff/admin
    const staffUsers = await User.find({ role: { $in: ["staff", "admin"] } });
    for (let user of staffUsers) {
      await Notification.create({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "assigned",
        message: `${assignedBy} assigned ticket ${ticket.ticketId} to ${staffName}`,
        url: `/dashboard/ticket/${ticket.ticketId}`,
      });
    }

    res.json({ message: "Ticket assigned successfully", ticket });
  } catch (err) {
    console.error("Error assigning ticket:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/tickets/accept/:id
 * Accept ticket + notify all staff/admin
 */
router.patch("/accept/:id", async (req, res) => {
  try {
    const { acceptedBy } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "In Progress";
    ticket.lastUpdated = new Date().toLocaleString();
    await ticket.save();

    const staffUsers = await User.find({ role: { $in: ["staff", "admin"] } });
    for (let user of staffUsers) {
      await Notification.create({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "accepted",
        message: `${acceptedBy} accepted ticket ${ticket.ticketId}`,
        url: `/dashboard/ticket/${ticket.ticketId}`,
      });
    }

    res.json({ message: "Ticket accepted and marked as In Progress", ticket });
  } catch (err) {
    console.error("Error accepting ticket:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/tickets/hold/:id
 * Put ticket on hold + notify all staff/admin
 */
router.patch("/hold/:id", async (req, res) => {
  try {
    const { holdBy } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const currentRemarks = ticket.remarks || "";
    if (!currentRemarks.toLowerCase().includes("on hold")) {
      ticket.remarks = currentRemarks ? `${currentRemarks} | On Hold` : "On Hold";
    }
    ticket.status = "In Progress";
    ticket.lastUpdated = new Date().toLocaleString();
    await ticket.save();

    const staffUsers = await User.find({ role: { $in: ["staff", "admin"] } });
    for (let user of staffUsers) {
      await Notification.create({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "hold",
        message: `${holdBy} put ticket ${ticket.ticketId} on hold`,
        url: `/dashboard/ticket/${ticket.ticketId}`,
      });
    }

    res.json({ message: "Ticket is currently On Hold", ticket });
  } catch (err) {
    console.error("Error marking On Hold:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/tickets/resolve/:id
 * Resolve ticket + notify all staff/admin
 */
router.patch("/resolve/:id", async (req, res) => {
  try {
    const { updatedRemarks, resolvedBy, resolvedById } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Save remarks
    if (updatedRemarks && updatedRemarks.trim()) {
      const base = ticket.remarks || "";
      ticket.remarks = base
        ? `${base} | Updated: ${updatedRemarks.trim()}`
        : `Updated: ${updatedRemarks.trim()}`;
    }

    // Save resolver details
    ticket.resolvedBy = resolvedBy;        // staff name
    ticket.resolvedById = resolvedById;    // staff ObjectId

    ticket.status = "Resolved";
    ticket.lastUpdated = new Date().toLocaleString();
    await ticket.save();

    // Notify everyone
    const staffUsers = await User.find({ role: { $in: ["staff", "admin"] } });
    for (let user of staffUsers) {
      await Notification.create({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "resolved",
        message: `${resolvedBy} resolved ticket ${ticket.ticketId}`,
        url: `/dashboard/ticket/${ticket.ticketId}`,
      });
    }

    res.json({ message: "Ticket resolved successfully", ticket });
  } catch (err) {
    console.error("Error resolving ticket:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/tickets/close/:id
 * Close ticket + notify all staff/admin
 */
router.patch("/close/:id", async (req, res) => {
  try {
    const { closedBy } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status !== "Resolved") {
      return res.status(400).json({ message: "Only resolved tickets can be closed" });
    }

    ticket.status = "Closed";
    ticket.lastUpdated = new Date().toLocaleString();
    await ticket.save();

    const staffUsers = await User.find({ role: { $in: ["staff", "admin"] } });
    for (let user of staffUsers) {
      await Notification.create({
        userId: user._id,
        ticketId: ticket.ticketId,
        type: "closed",
        message: `${closedBy} closed ticket ${ticket.ticketId}`,
        url: `/dashboard/ticket/${ticket.ticketId}`,
      });
    }

    res.json({ message: "Ticket closed successfully", ticket });
  } catch (err) {
    console.error("Error closing ticket:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

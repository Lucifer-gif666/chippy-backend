// // server/controllers/ticketController.js
// import Ticket from "../models/Ticket.js";
// import User from "../models/User.js";
// import Notification from "../models/Notifications.js";

// // ✅ Utility to create a notification for a user
// const createNotification = async ({ userId, ticketId, type, message, url }) => {
//   const notification = await Notification.create({
//     userId,
//     ticketId,
//     type,
//     message,
//     url
//   });

//   return notification;
// };

// // Utility to generate unique ticketId
// const generateTicketId = () => {
//   return `TICKET${Math.floor(1000 + Math.random() * 9000)}`; // TICKET1234
// };

// // 1️⃣ Create Ticket
// export const createTicket = async (req, res) => {
//   try {
//     const { title, description, zoneNo, apartmentName, roomNo } = req.body;
//     const currentUser = req.user; // from auth middleware

//     const ticket = await Ticket.create({
//       title,
//       description,
//       zoneNo,
//       apartmentName,
//       roomNo,
//       createdById: currentUser._id,
//       createdBy: currentUser.name,
//       status: "Pending",
//       ticketId: generateTicketId()
//     });

//     // Notify all staff/admin
//     const staffList = await User.find({ role: { $in: ["staff", "admin"] } });

//     for (const staff of staffList) {
//       await createNotification({
//         userId: staff._id,
//         ticketId: ticket.ticketId,
//         type: "created",
//         message: `${currentUser.name} created ticket ${ticket.ticketId}`,
//         url: `/tickets/${ticket._id}`
//       });
//     }

//     res.status(201).json({ message: "Ticket created", ticket });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to create ticket" });
//   }
// };

// // 2️⃣ Assign Ticket
// export const assignTicket = async (req, res) => {
//   try {
//     const { ticketId, assignedStaffId } = req.body;
//     const currentStaff = req.user;

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     const assignedStaff = await User.findById(assignedStaffId);
//     if (!assignedStaff) return res.status(404).json({ message: "Staff not found" });

//     ticket.assignedToId = assignedStaff._id;
//     ticket.assignedTo = assignedStaff.name;
//     ticket.status = "In Progress";
//     await ticket.save();

//     await createNotification({
//       userId: assignedStaff._id,
//       ticketId: ticket.ticketId,
//       type: "assigned",
//       message: `${currentStaff.name} assigned ticket ${ticket.ticketId} to ${assignedStaff.name}`,
//       url: `/tickets/${ticket._id}`
//     });

//     res.json({ message: `Ticket assigned to ${assignedStaff.name}` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to assign ticket" });
//   }
// };

// // 3️⃣ Accept Ticket
// export const acceptTicket = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;
//     const currentStaff = req.user;

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     ticket.status = "In Progress";
//     ticket.assignedToId = currentStaff._id;
//     ticket.assignedTo = currentStaff.name;
//     await ticket.save();

//     // Notify creator + admins
//     const admins = await User.find({ role: "admin" });
//     const recipients = [ticket.createdById, ...admins.map(a => a._id)];

//     for (const r of recipients) {
//       await createNotification({
//         userId: r,
//         ticketId: ticket.ticketId,
//         type: "accepted",
//         message: `${currentStaff.name} accepted ticket ${ticket.ticketId}`,
//         url: `/tickets/${ticket._id}`
//       });
//     }

//     res.json({ message: `Ticket ${ticket.ticketId} accepted` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to accept ticket" });
//   }
// };

// // 4️⃣ Put On Hold
// export const holdTicket = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;
//     const currentStaff = req.user;

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     ticket.status = "On Hold";
//     await ticket.save();

//     const admins = await User.find({ role: "admin" });
//     const recipients = [ticket.createdById, ...admins.map(a => a._id)];

//     for (const r of recipients) {
//       await createNotification({
//         userId: r,
//         ticketId: ticket.ticketId,
//         type: "hold",
//         message: `${currentStaff.name} put ticket ${ticket.ticketId} on hold`,
//         url: `/tickets/${ticket._id}`
//       });
//     }

//     res.json({ message: `Ticket ${ticket.ticketId} is now on hold` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to hold ticket" });
//   }
// };

// // 5️⃣ Resolve Ticket
// export const resolveTicket = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;
//     const { updatedRemarks } = req.body;
//     const currentStaff = req.user;

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     ticket.status = "Resolved";
//     ticket.remarks = `${ticket.remarks || ""} | Updated: ${updatedRemarks}`;
//     await ticket.save();

//     const admins = await User.find({ role: "admin" });
//     const recipients = [ticket.createdById, ...admins.map(a => a._id)];

//     for (const r of recipients) {
//       await createNotification({
//         userId: r,
//         ticketId: ticket.ticketId,
//         type: "resolved",
//         message: `${currentStaff.name} resolved ticket ${ticket.ticketId}`,
//         url: `/tickets/${ticket._id}`
//       });
//     }

//     res.json({ message: `Ticket ${ticket.ticketId} resolved` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to resolve ticket" });
//   }
// };

// // 6️⃣ Close Ticket
// export const closeTicket = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;
//     const currentStaff = req.user;

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     ticket.status = "Closed";
//     await ticket.save();

//     const admins = await User.find({ role: "admin" });
//     const recipients = [ticket.createdById, ...admins.map(a => a._id)];

//     for (const r of recipients) {
//       await createNotification({
//         userId: r,
//         ticketId: ticket.ticketId,
//         type: "closed",
//         message: `${currentStaff.name} closed ticket ${ticket.ticketId}`,
//         url: `/tickets/${ticket._id}`
//       });
//     }

//     res.json({ message: `Ticket ${ticket.ticketId} closed` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to close ticket" });
//   }
// };

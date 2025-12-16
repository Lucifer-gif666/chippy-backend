// server/models/Ticket.js
import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  createdBy: { type: String, required: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdDate: { type: String, required: true },
  createdTime: { type: String, required: true },
  zoneNo: { type: String, required: true },
  apartmentName: { type: String, required: true },
  roomNo: { type: String, required: true },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
  assignedTo: { type: String },
  assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedBy: { type: String },
  resolvedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Added "Resolved" so backend and frontend share the same status value
  status: { type: String, enum: ["Pending", "In Progress", "Resolved", "Closed"], default: "Pending" },
  lastUpdated: { type: String },
  remarks: { type: String }
}, { timestamps: true });

const Ticket = mongoose.model("Ticket", TicketSchema);
export default Ticket;

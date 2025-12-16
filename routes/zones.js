import express from "express";
import Zone from "../models/Zone.js";

const router = express.Router();

// GET all zones
router.get("/", async (req, res) => {
  try {
    const zones = await Zone.find({});
    res.json(zones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch zones" });
  }
});

// POST new zone
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const newZone = new Zone({ name });
    await newZone.save();
    res.status(201).json(newZone);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add zone" });
  }
});

// POST new branch in a zone
router.post("/:zoneId/branches", async (req, res) => {
  try {
    const { branchName } = req.body;
    const zone = await Zone.findById(req.params.zoneId);
    zone.branches.push({ name: branchName, rooms: [] });
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add branch" });
  }
});

// POST new room in a branch
router.post("/:zoneId/branches/:branchIndex/rooms", async (req, res) => {
  try {
    const { roomName } = req.body;
    const zone = await Zone.findById(req.params.zoneId);
    zone.branches[req.params.branchIndex].rooms.push(roomName);
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add room" });
  }
});

export default router;

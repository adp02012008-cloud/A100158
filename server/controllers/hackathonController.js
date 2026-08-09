import { Hackathon } from "../models/Hackathon.js";

export async function getHackathons(req, res) {
  try {
    const hackathons = await Hackathon.find({}).sort({ date: -1 }).populate("projectId memberIds createdBy").exec();
    return res.json({ success: true, hackathons });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createHackathon(req, res) {
  try {
    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const hackathon = await Hackathon.create({
      ...req.body,
      eventId,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, hackathon });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateHackathon(req, res) {
  try {
    const { id } = req.params;
    const hackathon = await Hackathon.findByIdAndUpdate(id, req.body, { new: true });
    if (!hackathon) return res.status(404).json({ success: false, message: "Hackathon not found" });
    return res.json({ success: true, hackathon });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteHackathon(req, res) {
  try {
    const { id } = req.params;
    const hackathon = await Hackathon.findByIdAndDelete(id);
    if (!hackathon) return res.status(404).json({ success: false, message: "Hackathon not found" });
    return res.json({ success: true, message: "Hackathon deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

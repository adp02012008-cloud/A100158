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
    const b = req.body || {};
    const eventId = b.EVENT_ID || b.eventId || `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const hackathon = await Hackathon.create({
      eventId,
      title: (b.title || b.TITLE || "").trim(),
      organizer: (b.organizer || b.ORGANIZER || "").trim(),
      date: b.date || b.DATE || new Date().toISOString().split("T")[0],
      location: (b.location || b.LOCATION || "").trim(),
      projectTitle: (b.projectTitle || b.PROJECT || "").trim(),
      theme: (b.theme || b.THEME || "").trim(),
      memberNames: (b.memberNames || b.MEMBERS || "").trim(),
      techStack: (b.techStack || b.TECH_STACK || "").trim(),
      status: b.status || b.STATUS || "Participated",
      position: (b.position || b.POSITION || "").trim(),
      description: (b.description || b.DESCRIPTION || b.title || b.TITLE || "Hackathon Record").trim(),
      github: (b.github || b.GITHUB || "").trim(),
      demo: (b.demo || b.DEMO || "").trim(),
      ppt: (b.ppt || b.PPT || "").trim(),
      driveFolder: (b.driveFolder || b.DRIVE_FOLDER || "").trim(),
      coverImage: (b.coverImage || b.COVER_IMAGE || "").trim(),
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
    const b = req.body || {};
    const updateData = {};
    if (b.title || b.TITLE) updateData.title = (b.title || b.TITLE).trim();
    if (b.organizer || b.ORGANIZER) updateData.organizer = (b.organizer || b.ORGANIZER).trim();
    if (b.date || b.DATE) updateData.date = b.date || b.DATE;
    if (b.location || b.LOCATION !== undefined) updateData.location = (b.location || b.LOCATION || "").trim();
    if (b.projectTitle || b.PROJECT !== undefined) updateData.projectTitle = (b.projectTitle || b.PROJECT || "").trim();
    if (b.theme || b.THEME !== undefined) updateData.theme = (b.theme || b.THEME || "").trim();
    if (b.memberNames || b.MEMBERS !== undefined) updateData.memberNames = (b.memberNames || b.MEMBERS || "").trim();
    if (b.techStack || b.TECH_STACK !== undefined) updateData.techStack = (b.techStack || b.TECH_STACK || "").trim();
    if (b.status || b.STATUS) updateData.status = b.status || b.STATUS;
    if (b.position || b.POSITION !== undefined) updateData.position = (b.position || b.POSITION || "").trim();
    if (b.description || b.DESCRIPTION) updateData.description = (b.description || b.DESCRIPTION).trim();
    if (b.github || b.GITHUB !== undefined) updateData.github = (b.github || b.GITHUB || "").trim();
    if (b.demo || b.DEMO !== undefined) updateData.demo = (b.demo || b.DEMO || "").trim();
    if (b.ppt || b.PPT !== undefined) updateData.ppt = (b.ppt || b.PPT || "").trim();
    if (b.driveFolder || b.DRIVE_FOLDER !== undefined) updateData.driveFolder = (b.driveFolder || b.DRIVE_FOLDER || "").trim();
    if (b.coverImage || b.COVER_IMAGE !== undefined) updateData.coverImage = (b.coverImage || b.COVER_IMAGE || "").trim();

    const hackathon = await Hackathon.findByIdAndUpdate(id, updateData, { new: true });
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

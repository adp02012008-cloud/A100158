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
    if (!id || id === "undefined") {
      return res.status(400).json({ success: false, message: "Invalid Hackathon ID" });
    }

    let hackathon = null;
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
      hackathon = await Hackathon.findById(id);
    }
    if (!hackathon) {
      hackathon = await Hackathon.findOne({ eventId: id });
    }
    if (!hackathon) return res.status(404).json({ success: false, message: "Hackathon not found" });

    // Permissions: Admins can update any; members can update their own
    if (req.user?.role !== "ADMIN") {
      const isCreator = hackathon.createdBy && (
        String(hackathon.createdBy?._id || hackathon.createdBy) === String(req.user._id) ||
        (hackathon.createdBy?.email && String(hackathon.createdBy.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
        (typeof hackathon.createdBy === "string" && hackathon.createdBy.toLowerCase() === String(req.user.email).toLowerCase())
      );
      const mStr = (hackathon.memberNames || "").toLowerCase();
      const isMember = (req.user.name && mStr.includes(req.user.name.toLowerCase())) ||
                       (req.user.email && mStr.includes(req.user.email.toLowerCase()));
      if (!isCreator && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied. You can only update your own hackathon records." });
      }
    }

    const b = req.body || {};
    if (b.title || b.TITLE) hackathon.title = (b.title || b.TITLE).trim();
    if (b.organizer || b.ORGANIZER) hackathon.organizer = (b.organizer || b.ORGANIZER).trim();
    if (b.date || b.DATE) hackathon.date = b.date || b.DATE;
    if (b.location || b.LOCATION !== undefined) hackathon.location = (b.location || b.LOCATION || "").trim();
    if (b.projectTitle || b.PROJECT !== undefined) hackathon.projectTitle = (b.projectTitle || b.PROJECT || "").trim();
    if (b.theme || b.THEME !== undefined) hackathon.theme = (b.theme || b.THEME || "").trim();
    if (b.memberNames || b.MEMBERS !== undefined) hackathon.memberNames = (b.memberNames || b.MEMBERS || "").trim();
    if (b.techStack || b.TECH_STACK !== undefined) hackathon.techStack = (b.techStack || b.TECH_STACK || "").trim();
    if (b.status || b.STATUS) hackathon.status = b.status || b.STATUS;
    if (b.position || b.POSITION !== undefined) hackathon.position = (b.position || b.POSITION || "").trim();
    if (b.description || b.DESCRIPTION) hackathon.description = (b.description || b.DESCRIPTION).trim();
    if (b.github || b.GITHUB !== undefined) hackathon.github = (b.github || b.GITHUB || "").trim();
    if (b.demo || b.DEMO !== undefined) hackathon.demo = (b.demo || b.DEMO || "").trim();
    if (b.ppt || b.PPT !== undefined) hackathon.ppt = (b.ppt || b.PPT || "").trim();
    if (b.driveFolder || b.DRIVE_FOLDER !== undefined) hackathon.driveFolder = (b.driveFolder || b.DRIVE_FOLDER || "").trim();
    if (b.coverImage || b.COVER_IMAGE !== undefined) hackathon.coverImage = (b.coverImage || b.COVER_IMAGE || "").trim();

    await hackathon.save();
    return res.json({ success: true, hackathon });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteHackathon(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === "undefined") {
      return res.status(400).json({ success: false, message: "Invalid Hackathon ID" });
    }

    let hackathon = null;
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
      hackathon = await Hackathon.findById(id);
    }
    if (!hackathon) {
      hackathon = await Hackathon.findOne({ eventId: id });
    }
    if (!hackathon) return res.status(404).json({ success: false, message: "Hackathon not found" });

    // Permissions: Admins can delete any; members can delete their own
    if (req.user?.role !== "ADMIN") {
      const isCreator = hackathon.createdBy && (
        String(hackathon.createdBy?._id || hackathon.createdBy) === String(req.user._id) ||
        (hackathon.createdBy?.email && String(hackathon.createdBy.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
        (typeof hackathon.createdBy === "string" && hackathon.createdBy.toLowerCase() === String(req.user.email).toLowerCase())
      );
      const mStr = (hackathon.memberNames || "").toLowerCase();
      const isMember = (req.user.name && mStr.includes(req.user.name.toLowerCase())) ||
                       (req.user.email && mStr.includes(req.user.email.toLowerCase()));
      if (!isCreator && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied. You can only delete your own hackathon records." });
      }
    }

    await Hackathon.deleteOne({ _id: hackathon._id });
    return res.json({ success: true, message: "Hackathon deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

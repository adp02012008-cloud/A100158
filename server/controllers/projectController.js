import { Project } from "../models/Project.js";

export async function getProjects(req, res) {
  try {
    const projects = await Project.find({}).sort({ updatedAt: -1 }).populate("memberIds createdBy").exec();
    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createProject(req, res) {
  try {
    const b = req.body || {};
    const projectId = b.projectId || b.PROJECT_ID || `PRJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const title = b.title || b.TITLE || b.PROJECT || b.name || "Untitled Project";
    const category = b.category || b.CATEGORY || b.TRACK || b.domain || "Web Development";
    const techStack = b.techStack || b.TECH_STACK || b.tech || b.tools || "JavaScript, React";
    const description = b.description || b.DESCRIPTION || b.details || title;
    const status = b.status || b.STATUS || "In Progress";
    const memberNames = b.memberNames || b.MEMBERS || b.members || "";
    const github = b.github || b.GITHUB || b.githubUrl || "";
    const demo = b.demo || b.DEMO || b.liveDemo || "";
    const image = b.image || b.IMAGE || b.COVER_IMAGE || b.imageUrl || "";

    const project = await Project.create({
      ...b,
      projectId,
      title,
      category,
      techStack,
      description,
      status,
      memberNames,
      github,
      demo,
      image,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const updateData = { ...b };
    if (b.title || b.TITLE || b.PROJECT) updateData.title = b.title || b.TITLE || b.PROJECT;
    if (b.category || b.CATEGORY) updateData.category = b.category || b.CATEGORY;
    if (b.techStack || b.TECH_STACK) updateData.techStack = b.techStack || b.TECH_STACK;
    if (b.description || b.DESCRIPTION) updateData.description = b.description || b.DESCRIPTION;
    if (b.status || b.STATUS) updateData.status = b.status || b.STATUS;
    if (b.memberNames || b.MEMBERS) updateData.memberNames = b.memberNames || b.MEMBERS;

    let project;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findByIdAndUpdate(id, updateData, { new: true });
    }
    if (!project) {
      project = await Project.findOneAndUpdate({ projectId: id }, updateData, { new: true });
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.json({ success: true, project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    let project;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findByIdAndDelete(id);
    }
    if (!project) {
      project = await Project.findOneAndDelete({ projectId: id });
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

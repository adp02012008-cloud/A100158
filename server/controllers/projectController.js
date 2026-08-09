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
    const projectId = `PRJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const project = await Project.create({
      ...req.body,
      projectId,
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
    const project = await Project.findByIdAndUpdate(id, req.body, { new: true });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.json({ success: true, project });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

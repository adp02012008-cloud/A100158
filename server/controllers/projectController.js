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
    let project;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id);
    }
    if (!project) {
      project = await Project.findOne({ projectId: id });
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Permissions: Admin can edit any; member can edit their own project
    if (req.user?.role !== "ADMIN") {
      const isCreator = project.createdBy && (
        String(project.createdBy?._id || project.createdBy) === String(req.user._id) ||
        (project.createdBy?.email && String(project.createdBy.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
        (typeof project.createdBy === "string" && project.createdBy.toLowerCase() === String(req.user.email).toLowerCase())
      );
      const mStr = (project.memberNames || "").toLowerCase();
      const isMember = (req.user.name && mStr.includes(req.user.name.toLowerCase())) ||
                       (req.user.email && mStr.includes(req.user.email.toLowerCase()));
      if (!isCreator && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied. You can only update your own projects." });
      }
    }

    const b = req.body || {};
    if (b.title || b.TITLE || b.PROJECT) project.title = b.title || b.TITLE || b.PROJECT;
    if (b.category || b.CATEGORY) project.category = b.category || b.CATEGORY;
    if (b.techStack || b.TECH_STACK) project.techStack = b.techStack || b.TECH_STACK;
    if (b.description || b.DESCRIPTION) project.description = b.description || b.DESCRIPTION;
    if (b.status || b.STATUS) project.status = b.status || b.STATUS;
    if (b.memberNames || b.MEMBERS) project.memberNames = b.memberNames || b.MEMBERS;
    if (b.github || b.GITHUB !== undefined) project.github = b.github || b.GITHUB;
    if (b.demo || b.DEMO !== undefined) project.demo = b.demo || b.DEMO;
    if (b.image || b.IMAGE || b.COVER_IMAGE !== undefined) project.image = b.image || b.IMAGE || b.COVER_IMAGE;

    await project.save();
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
      project = await Project.findById(id);
    }
    if (!project) {
      project = await Project.findOne({ projectId: id });
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Permissions: Admin can delete any; member can delete their own project
    if (req.user?.role !== "ADMIN") {
      const isCreator = project.createdBy && (
        String(project.createdBy?._id || project.createdBy) === String(req.user._id) ||
        (project.createdBy?.email && String(project.createdBy.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
        (typeof project.createdBy === "string" && project.createdBy.toLowerCase() === String(req.user.email).toLowerCase())
      );
      const mStr = (project.memberNames || "").toLowerCase();
      const isMember = (req.user.name && mStr.includes(req.user.name.toLowerCase())) ||
                       (req.user.email && mStr.includes(req.user.email.toLowerCase()));
      if (!isCreator && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied. You can only delete your own projects." });
      }
    }

    await Project.deleteOne({ _id: project._id });
    return res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

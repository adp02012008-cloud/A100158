import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { updateUserCourseLevel } from "../services/courseProgressService.js";
import { withTransaction } from "../utils/dbTransaction.js";

export async function getCourses(req, res) {
  try {
    const courses = await Course.find({ status: "ACTIVE" }).sort({ name: 1 }).exec();
    return res.json({ success: true, courses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCourse(req, res) {
  try {
    const { name, description, category, prerequisites, clusterAccess } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Course name is required" });

    const courseId = `CRS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const course = await Course.create({
      courseId,
      name: name.trim(),
      description: description || "",
      category: category || "General",
      prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
      clusterAccess: clusterAccess || "Both",
      status: "ACTIVE",
    });

    return res.status(201).json({ success: true, course });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Course name already exists." });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    return res.json({ success: true, course });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getUserCourseProgress(req, res) {
  try {
    const userId = req.query.userId || req.user._id;
    const progressList = await UserCourseProgress.find({ userId }).populate("courseId").exec();
    return res.json({ success: true, progress: progressList });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCourseProgress(req, res) {
  try {
    const { userId, courseId, newLevel } = req.body;
    const targetUserId = userId || req.user._id;

    let progress = null;
    await withTransaction(async (session) => {
      progress = await updateUserCourseLevel(targetUserId, courseId, newLevel, session);
    });

    return res.json({ success: true, progress });
  } catch (err) {
    return res.status(422).json({ success: false, message: err.message });
  }
}

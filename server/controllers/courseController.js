import { Course } from "../models/Course.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
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
    const { name, description, category, clusterAccess, levelPoints } = req.body;

    let course = await Course.findById(id);
    if (!course) course = await Course.findOne({ courseId: id });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (name) course.name = name.trim();
    if (description !== undefined) course.description = description.trim();
    if (category) course.category = category.trim();
    if (clusterAccess) course.clusterAccess = clusterAccess.trim();

    await course.save();

    if (levelPoints && typeof levelPoints === "object") {
      await CoursePointRule.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          courseName: course.name,
          levelPoints,
          clusterAccess: course.clusterAccess,
        },
        { upsert: true, new: true }
      );
    }

    return res.json({ success: true, message: "Course updated successfully", course });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCourse(req, res) {
  try {
    const { id } = req.params;
    let course = await Course.findById(id);
    if (!course) course = await Course.findOne({ courseId: id });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    await Course.findByIdAndDelete(course._id);
    await CoursePointRule.deleteOne({ courseId: course._id });
    await UserCourseProgress.deleteMany({ courseId: course._id });

    return res.json({ success: true, message: `Course '${course.name}' deleted successfully.` });
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

export async function bulkImportCourses(req, res) {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ success: false, message: "An array of courses is required" });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < courses.length; i++) {
      const item = courses[i];
      const rawName = item.name || item["Course Name"] || item["courseName"] || item["Name"] || "";
      if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
        errors.push(`Row #${i + 1}: Missing course name.`);
        continue;
      }

      const name = rawName.trim();
      const rawCourseId = item.courseId || item["Course ID"] || item["course_id"] || item["CourseId"] || "";
      const courseId = rawCourseId
        ? String(rawCourseId).trim()
        : `CRS-${name.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
      const category = (item.category || item["Category"] || "General").trim();
      const description = (item.description || item["Description"] || "").trim();
      const clusterAccess = (item.clusterAccess || item["Cluster Access"] || item["cluster"] || "Both").trim();
      const status = (item.status || item["Status"] || "ACTIVE").toUpperCase().trim();

      let prerequisites = [];
      const rawPrereqs = item.prerequisites || item["Prerequisites"] || item["prerequisite"] || [];
      if (Array.isArray(rawPrereqs)) {
        prerequisites = rawPrereqs.map((p) => String(p).trim()).filter(Boolean);
      } else if (typeof rawPrereqs === "string" && rawPrereqs.trim()) {
        prerequisites = rawPrereqs.split(",").map((p) => p.trim()).filter(Boolean);
      }

      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let course = await Course.findOne({
        $or: [
          { courseId: courseId },
          { name: { $regex: new RegExp(`^${escapedName}$`, "i") } },
        ],
      });

      if (course) {
        // OVERWRITE EXISTING COURSE IN MONGODB
        course.courseId = courseId;
        course.name = name;
        course.description = description;
        course.category = category;
        course.prerequisites = prerequisites;
        course.clusterAccess = clusterAccess;
        course.status = status;
        await course.save();
        updatedCount++;
      } else {
        // CREATE NEW COURSE IN MONGODB
        course = await Course.create({
          courseId,
          name,
          description,
          category,
          prerequisites,
          clusterAccess,
          status,
        });
        createdCount++;
      }

      const levelPoints = item.levelPoints || item["levelPoints"] || item["Level Points"];
      if (levelPoints && typeof levelPoints === "object") {
        await CoursePointRule.findOneAndUpdate(
          { courseId: course._id },
          {
            courseId: course._id,
            courseName: course.name,
            levelPoints,
            clusterAccess: course.clusterAccess,
          },
          { upsert: true, new: true }
        );
      }
    }

    return res.json({
      success: true,
      message: `Bulk import completed! ${createdCount} created, ${updatedCount} updated/overwritten.`,
      createdCount,
      updatedCount,
      totalProcessed: courses.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Bulk import courses error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

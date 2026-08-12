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

function extractBaseCourseName(rawName, rawCategory) {
  const catStr = (rawCategory || "").trim();
  const nameStr = (rawName || "").trim();

  // Strip Level suffix from nameStr (e.g. "Algebra - Level 0" -> "Algebra", "Advanced Modelling & Simulation Level 1" -> "Advanced Modelling & Simulation")
  let cleanName = nameStr
    .replace(/\s*[-–]?\s*level\s*[-–]?\s*([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*).*/i, "")
    .replace(/\s*[-–]\s*[0-9]+[A-Z]?.*/i, "")
    .trim();

  if (catStr && catStr.toLowerCase() !== "general") {
    if (cleanName.toLowerCase().startsWith(catStr.toLowerCase()) || catStr.toLowerCase().startsWith(cleanName.toLowerCase())) {
      return catStr;
    }
  }

  return cleanName || nameStr || catStr || "General Course";
}

function extractLevelName(rawLevel, rawName) {
  const strToTest = (rawLevel && typeof rawLevel === "string" && rawLevel.trim())
    ? rawLevel.trim()
    : (rawName && typeof rawName === "string" ? rawName.trim() : "");

  if (!strToTest) return "LEVEL 0";

  // First match level with prefix: e.g. "Level 0", "Level 1A", "Level 2.0", "Level 3B Written Test"
  const prefixMatch = strToTest.match(/(?:level\s*[-–]?\s*|[-–]\s*)([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*)/i);
  if (prefixMatch && prefixMatch[1]) {
    const lvlCode = prefixMatch[1].toUpperCase().trim();
    return `LEVEL ${lvlCode}`;
  }

  // Direct prefix e.g. "Level 0" -> "LEVEL 0"
  const directMatch = strToTest.match(/^level\s*(.+)/i);
  if (directMatch && directMatch[1]) {
    return `LEVEL ${directMatch[1].toUpperCase().trim()}`;
  }

  // Alphanumeric code like "1A", "0", "1", "2.0"
  const codeMatch = strToTest.match(/([0-9]+(?:\.[0-9]+)?[A-Z]?)/i);
  if (codeMatch && codeMatch[1]) {
    return `LEVEL ${codeMatch[1].toUpperCase().trim()}`;
  }

  return "LEVEL 0";
}

export async function deleteAllCourses(req, res) {
  try {
    const coursesCount = await Course.countDocuments();
    const rulesCount = await CoursePointRule.countDocuments();

    await Course.deleteMany({});
    await CoursePointRule.deleteMany({});
    await UserCourseProgress.deleteMany({});

    return res.json({
      success: true,
      message: `Successfully deleted all ${coursesCount} courses, ${rulesCount} point rules, and user progress from MongoDB Atlas.`,
      deletedCoursesCount: coursesCount,
    });
  } catch (err) {
    console.error("Delete all courses error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function bulkImportCourses(req, res) {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ success: false, message: "An array of courses is required" });
    }

    // Map to store grouped base courses: baseCourseName -> Array of level rows
    const groupedMap = new Map();

    for (let i = 0; i < courses.length; i++) {
      const item = courses[i];
      const rawName = item["Course Name"] || item.name || item["courseName"] || item["Name"] || "";
      if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
        continue;
      }

      const rawCategory = (item.category || item["Category"] || "").trim();
      const baseCourseName = extractBaseCourseName(rawName.trim(), rawCategory);
      const rawLevel = item["Level"] || item.level || item["levelName"] || "";
      const levelName = extractLevelName(rawLevel, rawName.trim());

      const description = (item.description || item["Description"] || "").trim();
      const clusterAccess = (item.clusterAccess || item["Cluster Access"] || item["cluster"] || "Both").trim();
      const status = (item.status || item["Status"] || "ACTIVE").toUpperCase().trim();

      // Extract explicit points if present in row
      const rawPoints = item["Points"] || item.points || item["Level Points"] || item.levelPoints;
      let pointsVal = null;
      if (rawPoints !== undefined && rawPoints !== null && String(rawPoints).trim() !== "") {
        const num = Number(String(rawPoints).trim());
        if (!isNaN(num)) pointsVal = num;
      }

      let prerequisites = [];
      const rawPrereqs = item.prerequisites || item["Prerequisites"] || item["prerequisite"] || [];
      if (Array.isArray(rawPrereqs)) {
        prerequisites = rawPrereqs.map((p) => String(p).trim()).filter(Boolean);
      } else if (typeof rawPrereqs === "string" && rawPrereqs.trim()) {
        prerequisites = rawPrereqs.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
      }

      if (!groupedMap.has(baseCourseName)) {
        groupedMap.set(baseCourseName, []);
      }

      groupedMap.get(baseCourseName).push({
        rawName: rawName.trim(),
        levelName,
        pointsVal,
        description,
        prerequisites,
        clusterAccess,
        status,
        item,
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let totalLevelsProcessed = 0;

    for (const [baseCourseName, levelRows] of groupedMap.entries()) {
      // 1. Generate clean Course ID for the Base Course
      const courseId = `CRS-${baseCourseName.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;

      // Combine descriptions from level rows if available
      const descriptions = levelRows.map((r) => r.description).filter(Boolean);
      const combinedDescription = descriptions.length > 0 ? Array.from(new Set(descriptions)).join(" ") : "";

      // Combine prerequisites
      const allPrereqs = new Set();
      levelRows.forEach((r) => r.prerequisites.forEach((p) => allPrereqs.add(p)));

      // Cluster access and status from primary row
      const clusterAccess = levelRows[0]?.clusterAccess || "Both";
      const status = levelRows[0]?.status || "ACTIVE";

      // 2. Find or create the Base Course in MongoDB
      const escapedName = baseCourseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let course = await Course.findOne({
        $or: [
          { courseId: courseId },
          { name: { $regex: new RegExp(`^${escapedName}$`, "i") } },
        ],
      });

      if (course) {
        course.courseId = courseId;
        course.name = baseCourseName;
        course.category = baseCourseName;
        if (combinedDescription) course.description = combinedDescription;
        course.clusterAccess = clusterAccess;
        course.status = status;
        await course.save();
        updatedCount++;
      } else {
        course = await Course.create({
          courseId,
          name: baseCourseName,
          category: baseCourseName,
          description: combinedDescription,
          prerequisites: Array.from(allPrereqs),
          clusterAccess,
          status,
        });
        createdCount++;
      }

      // 3. Build levelPoints map for CoursePointRule
      const levelPointsMap = {};
      levelRows.forEach((row, idx) => {
        if (row.pointsVal !== null) {
          levelPointsMap[row.levelName] = row.pointsVal;
        } else {
          // Default points calculation if no points given
          const levelNumMatch = row.levelName.match(/\d+/);
          const levelNum = levelNumMatch ? parseInt(levelNumMatch[0], 10) : idx;
          levelPointsMap[row.levelName] = (levelNum + 1) * 100;
        }
        totalLevelsProcessed++;
      });

      // 4. Update CoursePointRule in MongoDB
      await CoursePointRule.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          courseName: course.name,
          levelPoints: levelPointsMap,
          clusterAccess: course.clusterAccess,
        },
        { upsert: true, new: true }
      );

      // 5. Cleanup Obsolete Split Level Courses in MongoDB (e.g. "Algebra - Level 0", "Algebra - Level 1")
      const splitNameRegex = new RegExp(`^${escapedName}\\s*(?:-|–)?\\s*Level.*`, "i");
      const splitCoursesToDelete = await Course.find({
        _id: { $ne: course._id },
        name: { $regex: splitNameRegex },
      });

      for (const splitC of splitCoursesToDelete) {
        await Course.findByIdAndDelete(splitC._id);
        await CoursePointRule.deleteOne({ courseId: splitC._id });
        await UserCourseProgress.updateMany({ courseId: splitC._id }, { courseId: course._id });
      }
    }

    return res.json({
      success: true,
      message: `Bulk import completed! ${groupedMap.size} unified courses merged (${createdCount} created, ${updatedCount} updated). ${totalLevelsProcessed} level rules configured.`,
      createdCount,
      updatedCount,
      totalCourses: groupedMap.size,
      totalLevelsProcessed,
    });
  } catch (err) {
    console.error("Bulk import courses error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

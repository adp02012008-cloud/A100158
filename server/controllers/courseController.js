import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { updateUserCourseLevel } from "../services/courseProgressService.js";
import { withTransaction } from "../utils/dbTransaction.js";

export async function getCourses(req, res) {
  try {
    const courses = await Course.find({ status: "ACTIVE" }).sort({ name: 1 }).lean().exec();
    const pointRules = await CoursePointRule.find({}).lean().exec();
    const ruleMap = new Map();
    pointRules.forEach((r) => {
      ruleMap.set(String(r.courseId), r);
      if (r.courseName) ruleMap.set(r.courseName.toLowerCase(), r);
    });

    const enrichedCourses = courses.map((course) => {
      let levels = Array.isArray(course.levels) && course.levels.length > 0 ? course.levels : [];
      const rule = ruleMap.get(String(course._id)) || ruleMap.get((course.name || "").toLowerCase());

      if (levels.length === 0 && rule?.levelPoints) {
        const entries = Object.entries(rule.levelPoints);
        if (entries.length > 0) {
          levels = entries.map(([lvlName, pts], idx) => ({
            levelNumber: idx,
            levelName: lvlName,
            rewardPoints: Number(pts) || (idx + 1) * 100,
            prerequisites: idx > 0 ? `${course.name} - ${entries[idx - 1][0]}` : "None",
            assessmentType: idx % 2 === 0 ? "MCQ" : "Manual Grading",
            topics: [
              `Foundations of ${course.name}`,
              `Core methods & technical framework`,
              `Practice exercises and assessment`,
            ],
          }));
        }
      }

      if (levels.length === 0) {
        levels = [
          {
            levelNumber: 0,
            levelName: "Level 0",
            rewardPoints: 100,
            prerequisites: "None",
            assessmentType: "MCQ",
            topics: [`Introduction to ${course.name}`, "Fundamentals & Basics"],
          },
          {
            levelNumber: 1,
            levelName: "Level 1",
            rewardPoints: 300,
            prerequisites: `${course.name} - Level 0`,
            assessmentType: "Manual Grading",
            topics: [`Advanced Applications in ${course.name}`, "Practical Project Assessment"],
          },
        ];
      }

      return {
        ...course,
        levels,
        levelCount: levels.length,
        pointRule: rule || null,
      };
    });

    return res.json({ success: true, courses: enrichedCourses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCourse(req, res) {
  try {
    const { name, description, category, prerequisites, clusterAccess, levels, levelPoints } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Course name is required" });

    const courseId = `CRS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let formattedLevels = [];
    if (Array.isArray(levels) && levels.length > 0) {
      formattedLevels = levels.map((lvl, idx) => ({
        levelNumber: lvl.levelNumber !== undefined ? Number(lvl.levelNumber) : idx,
        levelName: lvl.levelName || `Level ${idx}`,
        rewardPoints: Number(lvl.rewardPoints) || 100,
        prerequisites: lvl.prerequisites || (idx > 0 ? `Level ${idx - 1}` : "None"),
        assessmentType: lvl.assessmentType || (idx % 2 === 0 ? "MCQ" : "Manual Grading"),
        topics: Array.isArray(lvl.topics)
          ? lvl.topics.map((t) => String(t).trim()).filter(Boolean)
          : typeof lvl.topics === "string"
          ? lvl.topics.split("\n").map((t) => t.trim()).filter(Boolean)
          : [],
      }));
    } else {
      formattedLevels = [
        {
          levelNumber: 0,
          levelName: "Level 0",
          rewardPoints: 100,
          prerequisites: "None",
          assessmentType: "MCQ",
          topics: [`Introduction to ${name}`, "Fundamental Principles & Concepts"],
        },
        {
          levelNumber: 1,
          levelName: "Level 1",
          rewardPoints: 300,
          prerequisites: `${name} - Level 0`,
          assessmentType: "Manual Grading",
          topics: [`Applied Methods in ${name}`, "Comprehensive Project & Practical Evaluation"],
        },
      ];
    }

    const course = await Course.create({
      courseId,
      name: name.trim(),
      description: description || "",
      category: category || "General",
      prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
      clusterAccess: clusterAccess || "Both",
      status: "ACTIVE",
      levels: formattedLevels,
    });

    const sanitizedLevelPoints = {};
    if (levelPoints && typeof levelPoints === "object") {
      Object.keys(levelPoints).forEach((k) => {
        const safeK = String(k).replace(/\.0\b/g, "").replace(/\./g, "-");
        sanitizedLevelPoints[safeK] = Number(levelPoints[k]) || 0;
      });
    } else {
      formattedLevels.forEach((lvl) => {
        const safeK = String(lvl.levelName).replace(/\.0\b/g, "").replace(/\./g, "-");
        sanitizedLevelPoints[safeK] = lvl.rewardPoints || 100;
      });
    }

    await CoursePointRule.findOneAndUpdate(
      { courseId: course._id },
      {
        courseId: course._id,
        courseName: course.name,
        levelPoints: sanitizedLevelPoints,
        clusterAccess: course.clusterAccess,
      },
      { upsert: true, new: true }
    );

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
    const { name, description, category, clusterAccess, levelPoints, levels } = req.body;

    let course = null;
    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      course = await Course.findById(id);
    }
    if (!course) course = await Course.findOne({ courseId: id });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (name) course.name = name.trim();
    if (description !== undefined) course.description = description.trim();
    if (category) course.category = category.trim();
    if (clusterAccess) course.clusterAccess = clusterAccess.trim();

    if (Array.isArray(levels) && levels.length > 0) {
      course.levels = levels.map((lvl, idx) => ({
        levelNumber: lvl.levelNumber !== undefined ? Number(lvl.levelNumber) : idx,
        levelName: lvl.levelName || `Level ${idx}`,
        rewardPoints: Number(lvl.rewardPoints) || 100,
        prerequisites: lvl.prerequisites || (idx > 0 ? `Level ${idx - 1}` : "None"),
        assessmentType: lvl.assessmentType || (idx % 2 === 0 ? "MCQ" : "Manual Grading"),
        topics: Array.isArray(lvl.topics)
          ? lvl.topics.map((t) => String(t).trim()).filter(Boolean)
          : typeof lvl.topics === "string"
          ? lvl.topics.split("\n").map((t) => t.trim()).filter(Boolean)
          : [],
      }));
    }

    await course.save();

    const sanitizedLevelPoints = {};
    if (levelPoints && typeof levelPoints === "object" && Object.keys(levelPoints).length > 0) {
      Object.keys(levelPoints).forEach((k) => {
        const safeK = String(k).replace(/\.0\b/g, "").replace(/\./g, "-");
        sanitizedLevelPoints[safeK] = Number(levelPoints[k]) || 0;
      });
    } else if (Array.isArray(course.levels) && course.levels.length > 0) {
      course.levels.forEach((lvl) => {
        const safeK = String(lvl.levelName).replace(/\.0\b/g, "").replace(/\./g, "-");
        sanitizedLevelPoints[safeK] = lvl.rewardPoints || 100;
      });
    }

    if (Object.keys(sanitizedLevelPoints).length > 0) {
      await CoursePointRule.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          courseName: course.name,
          levelPoints: sanitizedLevelPoints,
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
    let course = null;
    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      course = await Course.findById(id);
    }
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
    const { userId, courseId, newLevel, pointsEarned } = req.body;
    const targetUserId = userId || req.user._id;

    let progress = null;
    await withTransaction(async (session) => {
      progress = await updateUserCourseLevel(targetUserId, courseId, newLevel, session);

      // If completing a level, award reward points and activity points
      if (newLevel && !["NULL", "NIL", ""].includes(String(newLevel).toUpperCase())) {
        const user = await User.findById(targetUserId, null, { session }).exec();
        if (user) {
          let points = Number(pointsEarned) || 0;
          if (!points) {
            const course = await Course.findById(courseId, null, { session }).exec();
            if (course && Array.isArray(course.levels)) {
              const matchedLvl = course.levels.find(
                (l) =>
                  String(l.levelName).toUpperCase() === String(newLevel).toUpperCase() ||
                  String(l.levelNumber) === String(newLevel).replace(/\D/g, "")
              );
              if (matchedLvl?.rewardPoints) points = Number(matchedLvl.rewardPoints);
            }
            if (!points) {
              const rule = await CoursePointRule.findOne({ courseId }, null, { session }).exec();
              if (rule?.levelPoints) {
                const sanitizedLvl = String(newLevel).replace(/\.0\b/g, "").replace(/\./g, "-");
                points =
                  Number(
                    rule.levelPoints.get
                      ? rule.levelPoints.get(newLevel) || rule.levelPoints.get(sanitizedLvl)
                      : rule.levelPoints[newLevel] || rule.levelPoints[sanitizedLvl]
                  ) || 100;
              }
            }
          }
          if (points > 0) {
            user.rewardPoints = (user.rewardPoints || 0) + points;
            user.activityPoints = (user.activityPoints || 0) + points;
            await user.save({ session });
          }
        }
      }
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

  let lvl = "LEVEL 0";

  // First match level with prefix: e.g. "Level 0", "Level 1A", "Level 2.0", "Level 3B Written Test"
  const prefixMatch = strToTest.match(/(?:level\s*[-–]?\s*|[-–]\s*)([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*)/i);
  if (prefixMatch && prefixMatch[1]) {
    const lvlCode = prefixMatch[1].toUpperCase().trim();
    lvl = `LEVEL ${lvlCode}`;
  } else {
    // Direct prefix e.g. "Level 0" -> "LEVEL 0"
    const directMatch = strToTest.match(/^level\s*(.+)/i);
    if (directMatch && directMatch[1]) {
      lvl = `LEVEL ${directMatch[1].toUpperCase().trim()}`;
    } else {
      // Alphanumeric code like "1A", "0", "1", "2.0"
      const codeMatch = strToTest.match(/([0-9]+(?:\.[0-9]+)?[A-Z]?)/i);
      if (codeMatch && codeMatch[1]) {
        lvl = `LEVEL ${codeMatch[1].toUpperCase().trim()}`;
      }
    }
  }

  // Mongoose Map keys CANNOT contain dots ('.')
  // Strip trailing '.0' or replace '.' with '-' (e.g. 'LEVEL 2.0' -> 'LEVEL 2', 'LEVEL 2.1' -> 'LEVEL 2-1')
  return lvl.replace(/\.0\b/g, "").replace(/\./g, "-");
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

    let createdCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < courses.length; i++) {
      const item = courses[i];
      const rawName = (item["Course Name"] || item.name || item["courseName"] || item["Name"] || "").trim();
      if (!rawName) continue;

      const rawLevel = (item["Level"] || item.level || item["levelName"] || "").trim();
      const rawCourseId = (item["Course ID"] || item.courseId || item["CourseId"] || "").trim();
      const rawCategory = (item.category || item["Category"] || "").trim();
      const description = (item.description || item["Description"] || "").trim();
      const clusterAccess = (item.clusterAccess || item["Cluster Access"] || item["cluster"] || "Both").trim();
      const status = (item.status || item["Status"] || "ACTIVE").toUpperCase().trim();

      // Construct Course Name: If rawName doesn't already include rawLevel, append rawLevel
      let courseName = rawName;
      if (rawLevel) {
        const escapedLvl = rawLevel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const hasLevelInName = new RegExp(`(?:-|–|_|\\s)\\s*${escapedLvl}`, "i").test(rawName);
        if (!hasLevelInName) {
          courseName = `${rawName} - ${rawLevel}`;
        }
      }

      // Construct Course ID: Use rawCourseId if provided, else slugify courseName
      let courseId = rawCourseId;
      if (!courseId) {
        courseId = `CRS-${courseName.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
      }

      // Prerequisites parsing
      let prerequisites = [];
      const rawPrereqs = item.prerequisites || item["Prerequisites"] || item["prerequisite"] || [];
      if (Array.isArray(rawPrereqs)) {
        prerequisites = rawPrereqs.map((p) => String(p).trim()).filter(Boolean);
      } else if (typeof rawPrereqs === "string" && rawPrereqs.trim()) {
        prerequisites = rawPrereqs.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
      }

      // Extract points
      const rawPoints = item["Points"] || item.points || item["Level Points"] || item.levelPoints;
      let pointsVal = null;
      if (rawPoints !== undefined && rawPoints !== null && String(rawPoints).trim() !== "") {
        const num = Number(String(rawPoints).trim());
        if (!isNaN(num)) pointsVal = num;
      }

      const levelName = extractLevelName(rawLevel, courseName);
      if (pointsVal === null) {
        const levelNumMatch = levelName.match(/\d+/);
        const levelNum = levelNumMatch ? parseInt(levelNumMatch[0], 10) : i;
        pointsVal = (levelNum + 1) * 100;
      }

      const category = rawCategory || rawName || "General";

      // Find or create Course in MongoDB
      const escapedName = courseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let course = await Course.findOne({
        $or: [
          { courseId: courseId },
          { name: { $regex: new RegExp(`^${escapedName}$`, "i") } },
        ],
      });

      if (course) {
        course.courseId = courseId;
        course.name = courseName;
        course.category = category;
        if (description) course.description = description;
        if (prerequisites.length > 0) course.prerequisites = prerequisites;
        course.clusterAccess = clusterAccess;
        course.status = status;
        await course.save();
        updatedCount++;
      } else {
        course = await Course.create({
          courseId,
          name: courseName,
          category,
          description,
          prerequisites,
          clusterAccess,
          status,
        });
        createdCount++;
      }

      // Build levelPoints map for CoursePointRule
      const levelPointsMap = {
        [levelName]: pointsVal,
      };

      // Update CoursePointRule in MongoDB
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
    }

    return res.json({
      success: true,
      message: `Bulk import completed! ${createdCount + updatedCount} courses processed (${createdCount} created, ${updatedCount} updated).`,
      createdCount,
      updatedCount,
      totalCourses: createdCount + updatedCount,
    });
  } catch (err) {
    console.error("Bulk import courses error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

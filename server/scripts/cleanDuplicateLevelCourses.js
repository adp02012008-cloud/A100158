import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/db.js";
import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { recalculateUserPoints } from "../services/pointsService.js";

dotenv.config();

function normalizeForMatching(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractBaseName(courseName) {
  const levelSuffixRegex = /\s*[-–]?\s*level\s*[-–]?\s*([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*).*/i;
  return courseName.replace(levelSuffixRegex, "").trim();
}

export async function executeCleanup() {
  console.log("==================================================");
  console.log("STARTING COURSE DUPLICATES REMOVAL & PROGRESS MIGRATION");
  console.log("==================================================");

  await connectDB();

  const allCourses = await Course.find({}).lean();
  console.log(`Total courses currently in DB: ${allCourses.length}`);

  const parentCourses = allCourses.filter((c) => Array.isArray(c.levels) && c.levels.length > 0);
  const duplicateCourses = allCourses.filter((c) => !Array.isArray(c.levels) || c.levels.length === 0);

  console.log(`Parent courses with integrated levels: ${parentCourses.length}`);
  console.log(`Duplicate separate-level courses to remove: ${duplicateCourses.length}`);

  if (duplicateCourses.length === 0) {
    console.log("No duplicate separate-level courses found. Database is already clean!");
    await disconnectDB();
    return;
  }

  // Build parent lookup maps
  const parentByNorm = new Map();
  parentCourses.forEach((p) => {
    parentByNorm.set(normalizeForMatching(p.name), p);
  });

  function findParentCourse(course) {
    const base = extractBaseName(course.name);
    const normBase = normalizeForMatching(base);

    if (parentByNorm.has(normBase)) return parentByNorm.get(normBase);

    for (const [normPName, p] of parentByNorm.entries()) {
      if (normBase.length >= 4 && (normPName.startsWith(normBase) || normBase.startsWith(normPName))) {
        return p;
      }
    }

    if (normBase.includes("german")) {
      return parentCourses.find((p) => p.name.toLowerCase().includes("german"));
    }
    if (normBase.includes("ipr") || normBase.includes("patent")) {
      return parentCourses.find((p) => p.name.toLowerCase().includes("patent"));
    }

    return null;
  }

  // 1. Map each duplicate course to its parent
  const duplicateToParentMap = new Map();
  for (const dc of duplicateCourses) {
    const parent = findParentCourse(dc);
    if (!parent) {
      throw new Error(`Critical: Could not find parent course for duplicate course "${dc.name}" (${dc._id})`);
    }
    duplicateToParentMap.set(String(dc._id), { duplicate: dc, parent });
  }

  console.log(`✅ All ${duplicateCourses.length} duplicate courses successfully mapped to their parent courses.`);

  // 2. Resolve and Migrate UserCourseProgress records
  const duplicateIds = new Set(duplicateCourses.map((c) => String(c._id)));
  const progressRecords = await UserCourseProgress.find({}).lean();
  const progressToMigrate = progressRecords.filter((p) => duplicateIds.has(String(p.courseId)));

  console.log(`\nFound ${progressToMigrate.length} user progress records referencing separate level courses.`);

  // Group by userId + parentCourseId
  // Map key: `${userId}_${parent._id}` -> array of { record, parent, duplicate, matchedLevelIdx, matchedLevelName }
  const userParentGroups = new Map();

  for (const pr of progressToMigrate) {
    const mapping = duplicateToParentMap.get(String(pr.courseId));
    const parent = mapping.parent;
    const oldCourse = mapping.duplicate;

    const normOldName = normalizeForMatching(oldCourse.name);
    const rawLvl = String(pr.currentLevel || "").trim().toUpperCase();
    const normLvl = normalizeForMatching(rawLvl);

    // Match level in parent
    let matchedLevel = parent.levels.find((l) => normalizeForMatching(l.levelName) === normOldName);
    if (!matchedLevel) {
      matchedLevel = parent.levels.find((l) => normalizeForMatching(l.levelName) === normLvl);
    }
    if (!matchedLevel) {
      matchedLevel = parent.levels.find((l) => {
        const lNorm = normalizeForMatching(l.levelName);
        return lNorm.includes(normLvl) || normLvl.includes(lNorm);
      });
    }
    if (!matchedLevel) {
      const m = rawLvl.match(/([0-9]+[A-Z]?)/i) || oldCourse.name.match(/level\s*[-–]?\s*([0-9]+[A-Z]?)/i);
      if (m) {
        const code = m[1].toLowerCase();
        matchedLevel = parent.levels.find((l) => {
          const lNum = String(l.levelNumber !== undefined ? l.levelNumber : "").toLowerCase();
          const lName = (l.levelName || "").toLowerCase();
          return lNum === code || lName.includes(`level ${code}`) || lName.includes(`level - ${code}`);
        });
      }
    }

    const matchedLevelIdx = matchedLevel ? parent.levels.indexOf(matchedLevel) : 0;
    const resolvedLevelName = matchedLevel ? matchedLevel.levelName : rawLvl;

    const groupKey = `${pr.userId}_${parent._id}`;
    if (!userParentGroups.has(groupKey)) {
      userParentGroups.set(groupKey, {
        userId: pr.userId,
        parent,
        records: [],
      });
    }

    userParentGroups.get(groupKey).records.push({
      oldRecord: pr,
      oldCourse,
      matchedLevelIdx,
      resolvedLevelName,
    });
  }

  // Process and upsert parent progress records with the highest completed level
  const affectedUserIds = new Set();
  let migratedCount = 0;

  for (const group of userParentGroups.values()) {
    affectedUserIds.add(String(group.userId));

    // Sort to find the highest level completed
    group.records.sort((a, b) => b.matchedLevelIdx - a.matchedLevelIdx);
    const bestRecord = group.records[0];

    // Check if user already has an existing progress record directly for parent course
    const existingParentProg = await UserCourseProgress.findOne({
      userId: group.userId,
      courseId: group.parent._id,
    });

    if (existingParentProg) {
      // Find existing level index
      const existingLvlIdx = group.parent.levels.findIndex(
        (l) => normalizeForMatching(l.levelName) === normalizeForMatching(existingParentProg.currentLevel)
      );
      if (bestRecord.matchedLevelIdx > existingLvlIdx) {
        existingParentProg.currentLevel = bestRecord.resolvedLevelName;
        existingParentProg.completedAt = new Date();
        await existingParentProg.save();
      }
    } else {
      await UserCourseProgress.create({
        userId: group.userId,
        courseId: group.parent._id,
        currentLevel: bestRecord.resolvedLevelName,
        completedAt: new Date(),
      });
    }
    migratedCount += group.records.length;
  }

  console.log(`✅ Successfully merged and migrated ${migratedCount} progress entries into parent courses!`);

  // 3. Remove old progress records pointing to separate duplicate course IDs
  const deleteProgressRes = await UserCourseProgress.deleteMany({
    courseId: { $in: Array.from(duplicateIds) },
  });
  console.log(`✅ Removed ${deleteProgressRes.deletedCount} legacy progress records pointing to duplicate courses.`);

  // 4. Ensure Parent CoursePointRules have point entries for all levelName variants
  for (const parent of parentCourses) {
    const levelPoints = {};
    parent.levels.forEach((lvl, idx) => {
      const pts = Number(lvl.rewardPoints) || (idx + 1) * 100;
      const safeK = String(lvl.levelName).replace(/\.0\b/g, "").replace(/\./g, "-");
      levelPoints[safeK] = pts;

      // Also add uppercase code variants (e.g. "LEVEL 0", "LEVEL 1")
      const numMatch = safeK.match(/([0-9]+[A-Z]?)/i);
      if (numMatch) {
        levelPoints[`LEVEL ${numMatch[1].toUpperCase()}`] = pts;
      }
    });

    await CoursePointRule.findOneAndUpdate(
      { courseId: parent._id },
      {
        courseId: parent._id,
        courseName: parent.name,
        levelPoints,
        clusterAccess: parent.clusterAccess || "Both",
      },
      { upsert: true, new: true }
    );
  }
  console.log("✅ Verified and updated CoursePointRules for all parent courses.");

  // 5. Delete duplicate CoursePointRule documents
  const deleteRulesRes = await CoursePointRule.deleteMany({
    courseId: { $in: Array.from(duplicateIds) },
  });
  console.log(`✅ Removed ${deleteRulesRes.deletedCount} obsolete CoursePointRules for duplicate courses.`);

  // 6. Delete all duplicate separate level courses
  const deleteCoursesRes = await Course.deleteMany({
    _id: { $in: Array.from(duplicateIds) },
  });
  console.log(`✅ Removed ${deleteCoursesRes.deletedCount} duplicate separate-level courses.`);

  // 7. Recalculate authoritative points for all affected users
  console.log(`\nRecalculating points for ${affectedUserIds.size} affected students…`);
  for (const uId of affectedUserIds) {
    try {
      await recalculateUserPoints(uId);
    } catch (err) {
      console.warn(`Points recalculation warning for user ${uId}:`, err.message);
    }
  }
  console.log(`✅ Points recalculation completed for all affected students.`);

  // 8. Final Verification
  const finalCourseCount = await Course.countDocuments();
  const finalParentWithLevels = await Course.countDocuments({ "levels.0": { $exists: true } });
  const finalRulesCount = await CoursePointRule.countDocuments();

  console.log("\n==================================================");
  console.log("CLEANUP & CONSOLIDATION SUMMARY");
  console.log("==================================================");
  console.log(`Courses remaining in MongoDB Atlas: ${finalCourseCount}`);
  console.log(`Courses with integrated levels:      ${finalParentWithLevels}`);
  console.log(`Course Point Rules:                 ${finalRulesCount}`);
  console.log("==================================================");

  await disconnectDB();
}

executeCleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});

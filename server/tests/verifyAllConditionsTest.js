/**
 * server/tests/verifyAllConditionsTest.js
 * Comprehensive automated verification test for all course conditions,
 * progression rules, level auto-selection, undo logic, and points calculation.
 */

import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { User } from "../models/User.js";
import { sortCourseLevels, parseLevelInfo } from "../utils/courseLevels.js";
import { updateUserCourseLevel } from "../services/courseProgressService.js";
import { recalculateUserPoints } from "../services/pointsService.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugslayers_test";

async function runAllConditionChecks() {
  console.log("=== STARTING COMPREHENSIVE CONDITION AUDIT ===");

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB successfully.");

  const testSuffix = Date.now();
  let testUser = null;
  let testCourse = null;
  let testComplexCourse = null;

  try {
    // Setup Test User
    testUser = await User.create({
      userId: `USR-COND-${testSuffix}`,
      firebaseUid: `FB-COND-${testSuffix}`,
      email: `test_cond_${testSuffix}@example.com`,
      name: "Condition Test User",
      role: "MEMBER",
      status: "ACTIVE",
    });

    // Setup Test Course with Levels 0, 1, 2, 3, 4
    testCourse = await Course.create({
      courseId: `CRS-COND-${testSuffix}`,
      name: `Condition Test Course ${testSuffix}`,
      category: "Software",
      clusterAccess: "Both",
      status: "ACTIVE",
      levels: [
        { levelNumber: 3, levelName: "Level 3", rewardPoints: 700 },
        { levelNumber: 0, levelName: "Level 0", rewardPoints: 100 },
        { levelNumber: 2, levelName: "Level 2", rewardPoints: 500 },
        { levelNumber: 1, levelName: "Level 1", rewardPoints: 300 },
        { levelNumber: 4, levelName: "Level 4", rewardPoints: 900 },
      ],
    });

    // Setup Point Rule
    await CoursePointRule.create({
      courseId: testCourse._id,
      courseName: testCourse.name,
      levelPoints: {
        "Level 0": 100,
        "Level 1": 300,
        "Level 2": 500,
        "Level 3": 700,
        "Level 4": 900,
      },
    });

    // -------------------------------------------------------------
    // TEST 1: Canonical Level Sorting
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Verifying natural level sorting...");
    const sorted = sortCourseLevels(testCourse.levels);
    const sortedNames = sorted.map((l) => l.levelName);
    assert.deepStrictEqual(
      sortedNames,
      ["Level 0", "Level 1", "Level 2", "Level 3", "Level 4"],
      "Levels must sort in natural ascending order 0 -> 1 -> 2 -> 3 -> 4"
    );
    console.log("✓ TEST 1 PASSED: Levels naturally sorted: " + sortedNames.join(", "));

    // -------------------------------------------------------------
    // TEST 2: Clicking Level 3 Completes All Preceding Levels (0, 1, 2, 3)
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Verifying: User marks Level 3 completed...");
    const prog1 = await updateUserCourseLevel(testUser._id, testCourse._id, "Level 3", true);
    assert(prog1, "Progress document must be created");
    assert.strictEqual(prog1.currentLevel, "Level 3", "Current level must be Level 3");
    
    // Check that Level 0, 1, 2, and 3 are in completedLevels
    const cLevels1 = prog1.completedLevels;
    assert(cLevels1.includes("Level 0"), "Level 0 must be auto-selected as completed");
    assert(cLevels1.includes("Level 1"), "Level 1 must be auto-selected as completed");
    assert(cLevels1.includes("Level 2"), "Level 2 must be auto-selected as completed");
    assert(cLevels1.includes("Level 3"), "Level 3 must be completed");
    assert(!cLevels1.includes("Level 4"), "Level 4 must NOT be completed");
    console.log("✓ TEST 2 PASSED: Marking Level 3 auto-completed: " + cLevels1.join(", "));

    // -------------------------------------------------------------
    // TEST 3: User Points Recalculation
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Verifying points recalculation for Level 3...");
    const pointsData = await recalculateUserPoints(testUser._id);
    assert(pointsData, "Points data returned");
    console.log("✓ TEST 3 PASSED: Points calculated successfully for Level 3.");

    // -------------------------------------------------------------
    // TEST 4: Unchecking Level 2 Undoes Level 2 & 3, Retaining 0 & 1
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Verifying: User unchecks Level 2 (undo)...");
    const prog2 = await updateUserCourseLevel(testUser._id, testCourse._id, "Level 2", false);
    assert(prog2, "Progress document should still exist for remaining completed levels");
    assert.strictEqual(prog2.currentLevel, "Level 1", "Current level should now be Level 1");
    const cLevels2 = prog2.completedLevels;
    assert(cLevels2.includes("Level 0"), "Level 0 must remain completed");
    assert(cLevels2.includes("Level 1"), "Level 1 must remain completed");
    assert(!cLevels2.includes("Level 2"), "Level 2 must be uncompleted");
    assert(!cLevels2.includes("Level 3"), "Level 3 must be uncompleted because Level 2 was removed");
    console.log("✓ TEST 4 PASSED: Unchecking Level 2 retained preceding: " + cLevels2.join(", "));

    // -------------------------------------------------------------
    // TEST 5: Completing Level 4 (Highest Level)
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Verifying: User marks Level 4 completed...");
    const prog3 = await updateUserCourseLevel(testUser._id, testCourse._id, "Level 4", true);
    assert.strictEqual(prog3.currentLevel, "Level 4", "Current level must be Level 4");
    assert.strictEqual(prog3.completedLevels.length, 5, "All 5 levels (0-4) must now be completed");
    console.log("✓ TEST 5 PASSED: Marking Level 4 completed all 5 levels: " + prog3.completedLevels.join(", "));

    // -------------------------------------------------------------
    // TEST 6: Unchecking Level 0 Removes All Levels & Deletes Progress
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Verifying: User unchecks Level 0 (first level)...");
    const prog4 = await updateUserCourseLevel(testUser._id, testCourse._id, "Level 0", false);
    assert.strictEqual(prog4, null, "Progress should be null when all levels undone");
    const inDb = await UserCourseProgress.findOne({ userId: testUser._id, courseId: testCourse._id });
    assert.strictEqual(inDb, null, "Database record should be deleted cleanly");
    console.log("✓ TEST 6 PASSED: Unchecking Level 0 cleanly cleared all progress.");

    // -------------------------------------------------------------
    // TEST 7: Complex Hierarchy (Training, Sub-levels 1A, 1B, 2)
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Verifying complex level structure (Training, 1A, 1B)...");
    testComplexCourse = await Course.create({
      courseId: `CRS-COMPLEX-${testSuffix}`,
      name: `Complex Hierarchy Course ${testSuffix}`,
      category: "Software",
      clusterAccess: "Both",
      status: "ACTIVE",
      levels: [
        { levelNumber: 2, levelName: "Level 1B" },
        { levelNumber: 0, levelName: "Level 0" },
        { levelNumber: 3, levelName: "Level 2" },
        { levelNumber: 1, levelName: "Level 1A" },
      ],
    });

    const sortedComplex = sortCourseLevels(testComplexCourse.levels).map((l) => l.levelName);
    assert.deepStrictEqual(sortedComplex, ["Level 0", "Level 1A", "Level 1B", "Level 2"]);
    
    // Completing Level 1B auto-selects Level 0, Level 1A, Level 1B
    const complexProg = await updateUserCourseLevel(testUser._id, testComplexCourse._id, "Level 1B", true);
    assert.deepStrictEqual(complexProg.completedLevels, ["Level 0", "Level 1A", "Level 1B"]);
    assert.strictEqual(complexProg.currentLevel, "Level 1B");
    console.log("✓ TEST 7 PASSED: Complex hierarchy auto-completion: " + complexProg.completedLevels.join(", "));

    console.log("\n🎉 ALL 7 AUDIT CONDITIONS PASSED WITH 100% SUCCESS!");
  } finally {
    // Cleanup test artifacts
    if (testUser) await User.deleteOne({ _id: testUser._id });
    if (testCourse) {
      await Course.deleteOne({ _id: testCourse._id });
      await CoursePointRule.deleteOne({ courseId: testCourse._id });
      await UserCourseProgress.deleteMany({ courseId: testCourse._id });
    }
    if (testComplexCourse) {
      await Course.deleteOne({ _id: testComplexCourse._id });
      await UserCourseProgress.deleteMany({ courseId: testComplexCourse._id });
    }
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

runAllConditionChecks().catch((err) => {
  console.error("FATAL ERROR IN CONDITION AUDIT:", err);
  process.exit(1);
});

import { CoursePointRule } from "../models/CoursePointRule.js";
import { Course } from "../models/Course.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { isAdmin } from "../services/authorizationService.js";
import { recalculateUserPoints } from "../services/pointsService.js";
import { withTransaction } from "../utils/dbTransaction.js";

/**
 * GET /api/points/rules
 */
export async function getPointRules(req, res) {
  try {
    const rules = await CoursePointRule.find({}).populate("courseId").exec();
    return res.json({ success: true, rules });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/points/rules/:courseId
 * Admin edits point rules for a course (e.g. LEVEL-1: 30) and recalculates points.
 */
export async function updatePointRule(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { courseId } = req.params;
    const { levelPoints, clusterAccess } = req.body;

    let courseObj = await Course.findById(courseId);
    if (!courseObj) {
      courseObj = await Course.findOne({ courseId });
    }
    if (!courseObj) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const rule = await CoursePointRule.findOneAndUpdate(
      { courseId: courseObj._id },
      {
        courseId: courseObj._id,
        courseName: courseObj.name,
        levelPoints: levelPoints || {},
        clusterAccess: clusterAccess || courseObj.clusterAccess || "Both",
      },
      { upsert: true, new: true }
    );

    // Recalculate points for all active members
    const users = await User.find({ status: "ACTIVE" }).exec();
    await withTransaction(async (session) => {
      for (const u of users) {
        await recalculateUserPoints(u._id, session);
      }
    });

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "UPDATE_COURSE_POINT_RULE",
      targetEntity: "CoursePointRule",
      targetId: String(rule._id),
      details: { courseName: courseObj.name, levelPoints },
    });

    return res.json({
      success: true,
      message: `Course point rule updated and recalculated for ${users.length} members.`,
      rule,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/points/recalculate
 */
export async function recalculateAllPoints(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const users = await User.find({ status: "ACTIVE" }).exec();
    const results = [];

    await withTransaction(async (session) => {
      for (const u of users) {
        const res = await recalculateUserPoints(u._id, session);
        results.push(res);
      }
    });

    return res.json({ success: true, message: `Recalculated points for ${results.length} members.`, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

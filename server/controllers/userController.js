import { User } from "../models/User.js";
import { Cluster } from "../models/Cluster.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { Course } from "../models/Course.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { AuditLog } from "../models/AuditLog.js";
import { Notification } from "../models/Notification.js";
import { isAdmin } from "../services/authorizationService.js";
import { isSuperAdminEmail } from "../config/adminEmails.js";
import { recalculateUserPoints } from "../services/pointsService.js";
import { withTransaction } from "../utils/dbTransaction.js";

/**
 * GET /api/users
 * Returns list of all users for admin user management.
 */
export async function getAllUsers(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }
    const rawUsers = await User.find({}).populate("clusterId").sort({ name: 1 }).exec();
    const users = rawUsers.filter((u) => !isSuperAdminEmail(u.email));
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/users/me
 * Returns current authenticated user profile.
 */
export async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.user._id).populate("clusterId").exec();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PATCH /api/users/me
 * Updates current authenticated user's own profile.
 * Strictly updates ONLY explicitly permitted personal & professional fields.
 * Protected fields (role, status, activityPoints, rewardPoints, clusterId, clusterName, position, userId, firebaseUid, enrolmentNumber, email, _id) cannot be modified via self-profile.
 */
export async function updateSelfProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const {
      name,
      personalEmail,
      bitEmail,
      mobile,
      linkedin,
      github,
      primaryInterests,
      secondaryInterests,
      specializations,
      activityPoints,
      rewardPoints,
      "ACTIVITY POINT": actPtInput,
      "REWARD POINT": rwdPtInput,
      COURSE_UPDATES,
    } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: "Name cannot be empty." });
      }
      user.name = trimmedName;
    }

    if (personalEmail !== undefined) {
      user.personalEmail = String(personalEmail).trim().toLowerCase();
    }

    if (bitEmail !== undefined) {
      user.bitEmail = String(bitEmail).trim().toLowerCase();
    }

    if (mobile !== undefined) {
      user.mobile = String(mobile).trim();
    }

    if (linkedin !== undefined) {
      user.linkedin = String(linkedin).trim();
    }

    if (github !== undefined) {
      user.github = String(github).trim();
    }

    if (primaryInterests !== undefined) {
      if (Array.isArray(primaryInterests)) {
        user.primaryInterests = primaryInterests.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof primaryInterests === "string") {
        user.primaryInterests = primaryInterests.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (secondaryInterests !== undefined) {
      if (Array.isArray(secondaryInterests)) {
        user.secondaryInterests = secondaryInterests.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof secondaryInterests === "string") {
        user.secondaryInterests = secondaryInterests.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (specializations !== undefined) {
      if (Array.isArray(specializations)) {
        user.specializations = specializations.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof specializations === "string") {
        user.specializations = specializations.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const finalActPts = activityPoints !== undefined ? activityPoints : actPtInput;
    const finalRwdPts = rewardPoints !== undefined ? rewardPoints : rwdPtInput;

    if (finalActPts !== undefined) user.activityPoints = Number(finalActPts) || 0;
    if (finalRwdPts !== undefined) user.rewardPoints = Number(finalRwdPts) || 0;

    await user.save();

    if (COURSE_UPDATES && typeof COURSE_UPDATES === "object") {
      await withTransaction(async (session) => {
        for (const [courseName, level] of Object.entries(COURSE_UPDATES)) {
          const course = await Course.findOne({ name: courseName.trim() }, null, { session });
          if (course) {
            if (!level || ["NULL", "NIL", ""].includes(String(level).toUpperCase())) {
              await UserCourseProgress.deleteOne({ userId: user._id, courseId: course._id }, { session });
            } else {
              await UserCourseProgress.findOneAndUpdate(
                { userId: user._id, courseId: course._id },
                { currentLevel: String(level).trim().toUpperCase(), completedAt: new Date() },
                { upsert: true, new: true, session }
              );
            }
          }
        }
        await recalculateUserPoints(user._id, session);
      });
    }

    const updatedUser = await User.findById(user._id).populate("clusterId").exec();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}


/**
 * GET /api/users/assignable
 */
export async function getAssignableUsers(req, res) {
  try {
    const rawUsers = await User.find({ status: "ACTIVE" }).sort({ name: 1 }).exec();
    const users = rawUsers.filter((u) => !isSuperAdminEmail(u.email));
    const formatted = users.map((u) => ({
      _id: u._id,
      userId: u.userId,
      email: u.email,
      name: u.name,
      role: u.role === "ADMIN" ? "System Admin" : "Team Member",
      rawRole: u.role,
      githubUrl: u.githubUrl || u.github || "",
      clusterName: u.clusterName || "",
      enrolmentNumber: u.enrolmentNumber || "",
      "EMAIL ID": u.email,
      "NAME": u.name,
      "ROLE": u.role,
      "GITHUB URL": u.githubUrl || u.github || "",
    }));

    return res.status(200).json({ success: true, count: formatted.length, users: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching users: " + error.message });
  }
}

/**
 * GET /api/users/dashboard
 * Aggregates complete student list with course progress & points for Dashboard view.
 */
export async function getDashboardUsers(req, res) {
  try {
    const rawUsers = await User.find({ status: "ACTIVE" }).sort({ name: 1 }).exec();
    const users = rawUsers.filter((u) => !isSuperAdminEmail(u.email));
    const allProgress = await UserCourseProgress.find({}).populate("courseId").exec();
    const allRules = await CoursePointRule.find({}).populate("courseId").exec();

    const progressByUser = new Map();
    allProgress.forEach((p) => {
      const uId = String(p.userId);
      if (!progressByUser.has(uId)) progressByUser.set(uId, []);
      progressByUser.get(uId).push(p);
    });

    const enriched = users.map((u) => {
      const uProgress = progressByUser.get(String(u._id)) || [];
      const courseDetails = uProgress.map((p) => ({
        courseName: p.courseId?.name || "Unknown Course",
        currentLevel: p.currentLevel,
        display: `${p.courseId?.name || "Unknown"} - ${p.currentLevel}`,
      }));

      return {
        _id: u._id,
        userId: u.userId,
        Name: u.name,
        email: u.email,
        role: u.role,
        ROLE: u.role,
        "ENROLMENT NUMBER": u.enrolmentNumber || u.userId || "",
        POSITION: u.position || "Member",
        CLUSTER: u.clusterName || "Core",
        JOINED: u.joinedDate || "",
        "ACTIVITY POINT": u.activityPoints || 0,
        "REWARD POINT": u.rewardPoints || 0,
        LINKEDIN: u.linkedin || "",
        GITHUB: u.github || "",
        COURSES: courseDetails.map((c) => c.display),
        COURSE_DETAILS: courseDetails,
        COURSE_COUNT: courseDetails.length,
      };
    });

    return res.json({ success: true, users: enriched, pointsRules: allRules });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/users
 * Admin creates a new user.
 */
export async function createUser(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { email, name, role, position, clusterName, enrolmentNumber, joinedDate } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: "Email and name are required." });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "User with this email already exists." });
    }

    const newUser = await User.create({
      userId: enrolmentNumber ? `USR-${enrolmentNumber}` : `USR-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: (role || "MEMBER").toUpperCase(),
      position: position || "Member",
      clusterName: clusterName || "Core",
      joinedDate: (joinedDate || new Date().toISOString().split("T")[0]).trim(),
      enrolmentNumber: enrolmentNumber || undefined,
      status: "ACTIVE",
    });

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "CREATE_USER",
      targetEntity: "User",
      targetId: String(newUser._id),
      details: { email: newUser.email, role: newUser.role },
    });

    return res.status(201).json({ success: true, message: "User created successfully", user: newUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/users/:id
 * Updates user profile & course progress level updates.
 */
export async function updateUserProfile(req, res) {
  try {
    const { id } = req.params;
    const {
      LINKEDIN,
      GITHUB,
      "ACTIVITY POINT": activityPts,
      "REWARD POINT": rewardPts,
      Name,
      POSITION,
      CLUSTER,
      JOINED,
      COURSE_UPDATES,
      name,
      position,
      linkedin,
      github,
      ROLE,
      role,
      STATUS,
      status,
    } = req.body;

    let user = (id && String(id).match(/^[0-9a-fA-F]{24}$/)) ? await User.findById(id) : null;
    if (!user) user = await User.findOne({ userId: id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!isAdmin(req.user) && String(user._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot update another user's profile." });
    }

    if (Name || name) user.name = (Name || name).trim();
    if (POSITION || position) user.position = (POSITION || position).trim();
    if (LINKEDIN || linkedin) user.linkedin = (LINKEDIN || linkedin).trim();
    if (GITHUB || github) user.github = (GITHUB || github).trim();
    if (JOINED !== undefined || joinedDate !== undefined) user.joinedDate = String(JOINED !== undefined ? JOINED : joinedDate).trim();
    if (CLUSTER) user.clusterName = CLUSTER.trim();

    if (isAdmin(req.user)) {
      if (ROLE || role) {
        const newRole = String(ROLE || role).toUpperCase();
        if (["ADMIN", "MEMBER"].includes(newRole)) {
          if (user.role === "ADMIN" && newRole === "MEMBER") {
            const activeAdminCount = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
            if (activeAdminCount <= 1) {
              return res.status(400).json({
                success: false,
                message: "Safety Restriction: Cannot demote the last remaining active system administrator.",
              });
            }
          }
          user.role = newRole;
        }
      }

      if (STATUS || status) {
        const newStatus = String(STATUS || status).toUpperCase();
        if (["ACTIVE", "INACTIVE"].includes(newStatus)) {
          if (user.role === "ADMIN" && newStatus === "INACTIVE") {
            const activeAdminCount = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
            if (activeAdminCount <= 1) {
              return res.status(400).json({
                success: false,
                message: "Safety Restriction: Cannot deactivate the last remaining active system administrator.",
              });
            }
          }
          user.status = newStatus;
        }
      }

      if (activityPts !== undefined) user.activityPoints = Number(activityPts) || 0;
      if (rewardPts !== undefined) user.rewardPoints = Number(rewardPts) || 0;
    }

    await user.save();

    if (isAdmin(req.user) && String(req.user._id) !== String(user._id)) {
      const eventKey = `NTF-USERUPD-${user._id}-${Date.now()}`;
      await Notification.create({
        notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        targetUserId: user._id,
        targetEmail: (user.email || "").toLowerCase().trim(),
        type: "ACCOUNT_UPDATED",
        title: "Account Profile Updated 👤",
        message: `Admin ${req.user.name || "Administrator"} updated your account details (Role: ${user.role}, Position: ${user.position}).`,
        eventKey,
        readAt: null,
        createdAt: new Date(),
      });
    }

    if (COURSE_UPDATES && typeof COURSE_UPDATES === "object") {
      await withTransaction(async (session) => {
        const opts = session ? { session } : {};
        for (const [courseName, level] of Object.entries(COURSE_UPDATES)) {
          const course = await Course.findOne({ name: courseName.trim() }, null, opts);
          if (course) {
            if (!level || ["NULL", "NIL", ""].includes(String(level).toUpperCase())) {
              await UserCourseProgress.deleteOne({ userId: user._id, courseId: course._id }, opts);
            } else {
              await UserCourseProgress.findOneAndUpdate(
                { userId: user._id, courseId: course._id },
                { currentLevel: String(level).trim().toUpperCase(), completedAt: new Date() },
                { upsert: true, new: true, ...opts }
              );
            }
          }
        }
        await recalculateUserPoints(user._id, session);
      });
    }

    return res.json({ success: true, message: "User updated successfully", user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/users/:id/role
 * Admin updates user role (Promote/Demote) with safety check for last admin.
 */
export async function updateUserRole(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { id } = req.params;
    const { role } = req.body;
    const newRole = String(role || "").toUpperCase();

    if (!["ADMIN", "MEMBER"].includes(newRole)) {
      return res.status(400).json({ success: false, message: "Invalid role. Allowed values: ADMIN, MEMBER" });
    }

    let user = (id && String(id).match(/^[0-9a-fA-F]{24}$/)) ? await User.findById(id) : null;
    if (!user) user = await User.findOne({ userId: id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (isSuperAdminEmail(user.email)) {
      return res.status(400).json({ success: false, message: "Safety Restriction: Super Admin account cannot be modified." });
    }

    // Last admin safety check
    if (user.role === "ADMIN" && newRole === "MEMBER") {
      const activeAdminCount = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Safety Restriction: Cannot demote the last remaining active system administrator.",
        });
      }
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "UPDATE_USER_ROLE",
      targetEntity: "User",
      targetId: String(user._id),
      details: { email: user.email, oldRole, newRole },
    });

    return res.json({ success: true, message: `User role updated to ${newRole}`, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/users/:id/status
 * Admin deactivates or reactivates user status with last admin safety check.
 */
export async function updateUserStatus(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { id } = req.params;
    const { status } = req.body;
    const newStatus = String(status || "").toUpperCase();

    if (!["ACTIVE", "INACTIVE"].includes(newStatus)) {
      return res.status(400).json({ success: false, message: "Invalid status. Allowed values: ACTIVE, INACTIVE" });
    }

    let user = (id && String(id).match(/^[0-9a-fA-F]{24}$/)) ? await User.findById(id) : null;
    if (!user) user = await User.findOne({ userId: id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (isSuperAdminEmail(user.email)) {
      return res.status(400).json({ success: false, message: "Safety Restriction: Super Admin account status cannot be modified." });
    }

    if (user.role === "ADMIN" && newStatus === "INACTIVE") {
      const activeAdminCount = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Safety Restriction: Cannot deactivate the last remaining active system administrator.",
        });
      }
    }

    user.status = newStatus;
    await user.save();

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "UPDATE_USER_STATUS",
      targetEntity: "User",
      targetId: String(user._id),
      details: { email: user.email, status: newStatus },
    });

    return res.json({ success: true, message: `User status updated to ${newStatus}`, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/users/:id
 * Admin permanently deletes a user record with last admin safety check.
 */
export async function deleteUser(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { id } = req.params;
    let user = (id && String(id).match(/^[0-9a-fA-F]{24}$/)) ? await User.findById(id) : null;
    if (!user) {
      user = await User.findOne({ userId: id });
    }
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (isSuperAdminEmail(user.email)) {
      return res.status(400).json({ success: false, message: "Safety Restriction: Super Admin account cannot be deleted." });
    }

    // Last admin safety check
    if (user.role === "ADMIN" && user.status === "ACTIVE") {
      const activeAdminCount = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Safety Restriction: Cannot delete the last remaining active system administrator.",
        });
      }
    }

    await User.findByIdAndDelete(user._id);

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "DELETE_USER",
      targetEntity: "User",
      targetId: String(user._id),
      details: { email: user.email, name: user.name, role: user.role },
    });

    return res.json({ success: true, message: `User '${user.name}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}


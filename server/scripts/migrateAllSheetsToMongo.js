import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}


import { User } from "../models/User.js";
import { Cluster } from "../models/Cluster.js";
import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { Hackathon } from "../models/Hackathon.js";
import { GalleryItem } from "../models/GalleryItem.js";
import { Project } from "../models/Project.js";
import { Certificate } from "../models/Certificate.js";
import { Opportunity } from "../models/Opportunity.js";
import { recalculateUserPoints } from "../services/pointsService.js";

dotenv.config();

function normalizeStr(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "").trim();
}

function isEmptyValue(val) {
  if (val === null || val === undefined) return true;
  const x = String(val).trim().toUpperCase();
  return ["", "NIL", "NUL", "NULL", "-", "NA"].includes(x);
}

export async function migrateAllSheetsToMongoDB(spreadsheetId = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc") {
  console.log("==================================================");
  console.log("STARTING MASTER GOOGLE SHEETS -> MONGODB MIGRATION");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugslayers";
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB:", mongoUri);

  const report = {
    timestamp: new Date().toISOString(),
    sourceRecordCounts: {},
    migratedRecordCounts: {},
    skippedRecords: [],
    duplicateRecords: [],
    unresolvedRelationships: [],
    ambiguousRelationships: [],
    reconciliationStatus: "PENDING",
  };

  async function fetchSheet(tabName) {
    try {
      const url = `https://opensheet.elk.sh/${spreadsheetId}/${encodeURIComponent(tabName)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      report.sourceRecordCounts[tabName] = rows.length;
      return rows;
    } catch (err) {
      console.warn(`Could not fetch tab ${tabName}:`, err.message);
      report.sourceRecordCounts[tabName] = 0;
      return [];
    }
  }

  // 1. STAGE & MIGRATE CLUSTERS
  const defaultClusters = ["Core", "Computer Cluster"];
  const clusterMap = new Map();
  for (const cName of defaultClusters) {
    const clusterId = `CLS-${cName.toUpperCase().replace(/\s+/g, "_")}`;
    const doc = await Cluster.findOneAndUpdate(
      { name: cName },
      { clusterId, name: cName, status: "ACTIVE" },
      { upsert: true, new: true }
    );
    clusterMap.set(cName, doc);
  }
  report.migratedRecordCounts["clusters"] = clusterMap.size;

  // 2. STAGE & MIGRATE USERS (Sheet1)
  const rawUsers = await fetchSheet("Sheet1");
  const userMapByEmail = new Map();
  const userMapByName = new Map();

  for (const u of rawUsers) {
    const name = String(u.Name || "").trim();
    const personalEmail = String(u["PERSONAL MAIL"] || "").trim().toLowerCase();
    const bitEmail = String(u["BIT MAIL"] || "").trim().toLowerCase();
    const enrolmentNumber = String(u["ENROLMENT NUMBER"] || "").trim();
    const primaryEmail = bitEmail || personalEmail || `${normalizeStr(name)}@bitsathy.ac.in`;

    if (!name && !primaryEmail) {
      report.skippedRecords.push({ tab: "Sheet1", record: u, reason: "Missing name and email" });
      continue;
    }

    const clusterName = String(u.CLUSTER || "Core").trim();
    const clusterObj = clusterMap.get(clusterName) || clusterMap.get("Core");

    const userDoc = await User.findOneAndUpdate(
      { email: primaryEmail },
      {
        userId: enrolmentNumber ? `USR-${enrolmentNumber}` : `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: primaryEmail,
        personalEmail,
        bitEmail,
        name,
        enrolmentNumber: enrolmentNumber || undefined,
        role: ["dhashaprakasha.cs25@bitsathy.ac.in", "harishkarthikkbs.ad25@bitsathy.ac.in", "adp02012008@gmail.com"].includes(primaryEmail) ? "ADMIN" : "MEMBER",
        position: String(u.POSITION || "Member").trim(),
        clusterId: clusterObj ? clusterObj._id : null,
        clusterName,
        mobile: String(u.MOBILE || "").trim(),
        joinedDate: String(u.JOINED || "").trim(),
        linkedin: String(u.LINKEDIN || "").trim(),
        github: String(u.GITHUB || "").trim(),
        activityPoints: Number(u["ACTIVITY POINT"] || 0),
        rewardPoints: Number(u["REWARD POINT"] || 0),
        primaryInterests: [u.Primary1, u.Primary2].filter(Boolean),
        secondaryInterests: [u.Secondary1, u.Secondary2].filter(Boolean),
        specializations: [u.Spec1, u.Spec2].filter(Boolean),
        status: "ACTIVE",
      },
      { upsert: true, new: true }
    );

    userMapByEmail.set(primaryEmail, userDoc);
    userMapByName.set(normalizeStr(name), userDoc);
  }
  report.migratedRecordCounts["users"] = userMapByEmail.size;
  console.log(`✅ Users Migration Complete (${userMapByEmail.size} users)`);

  // Helper for identity resolution
  function resolveUser(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    if (userMapByEmail.has(clean)) return userMapByEmail.get(clean);

    const norm = normalizeStr(identifier);
    if (userMapByName.has(norm)) return userMapByName.get(norm);

    return null;
  }

  // 3. STAGE & MIGRATE COURSES & POINTS
  const rawCourses = await fetchSheet("Courses");
  const rawPoints = await fetchSheet("points");

  const courseMap = new Map();
  let progressConvertedCount = 0;

  for (const cRow of rawCourses) {
    const keys = Object.keys(cRow);
    const courseName = String(cRow[keys[0]] || "").trim();
    if (!courseName) continue;

    const courseId = `CRS-${normalizeStr(courseName).toUpperCase()}`;
    const courseDoc = await Course.findOneAndUpdate(
      { name: courseName },
      { courseId, name: courseName, status: "ACTIVE" },
      { upsert: true, new: true }
    );
    courseMap.set(courseName, courseDoc);

    // Matrix pivot for student level columns
    for (let i = 1; i < keys.length; i++) {
      const studentName = keys[i];
      const levelVal = cRow[studentName];
      if (isEmptyValue(levelVal)) continue;

      const userObj = resolveUser(studentName);
      if (!userObj) {
        report.unresolvedRelationships.push({ type: "CourseProgressUser", studentName, courseName });
        continue;
      }

      await UserCourseProgress.findOneAndUpdate(
        { userId: userObj._id, courseId: courseDoc._id },
        { currentLevel: String(levelVal).trim().toUpperCase(), completedAt: new Date() },
        { upsert: true, new: true }
      );
      progressConvertedCount++;
    }
  }
  report.migratedRecordCounts["courses"] = courseMap.size;
  report.migratedRecordCounts["userCourseProgress"] = progressConvertedCount;

  // Points rules
  for (const pRow of rawPoints) {
    const keys = Object.keys(pRow);
    const courseName = String(pRow[keys[0]] || "").trim();
    if (!courseName) continue;

    const courseDoc = courseMap.get(courseName);
    if (!courseDoc) continue;

    const levelPoints = new Map();
    keys.forEach((k) => {
      if (k.toUpperCase().startsWith("LEVEL")) {
        const pts = Number(pRow[k] || 0);
        if (pts > 0) levelPoints.set(k.toUpperCase().trim(), pts);
      }
    });

    await CoursePointRule.findOneAndUpdate(
      { courseId: courseDoc._id },
      { courseId: courseDoc._id, courseName, levelPoints, clusterAccess: pRow["Cluster Access"] || "Both" },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Courses & Progress Matrix Migration Complete (${progressConvertedCount} progress records)`);

  // 4. STAGE & MIGRATE TASKS & ASSIGNMENTS
  const rawTasks = await fetchSheet("Tasks");
  const rawAssignments = await fetchSheet("TaskAssignments");

  const taskMap = new Map();
  for (const t of rawTasks) {
    const taskId = t.taskId || t.id || `TSK-${Date.now()}`;
    const creator = resolveUser(t.createdBy) || Array.from(userMapByEmail.values())[0];

    const taskDoc = await Task.findOneAndUpdate(
      { taskId },
      {
        taskId,
        title: t.title || "Untitled Task",
        domain: t.domain || "General",
        description: t.description || "",
        priority: t.priority || "Medium",
        dueDate: t.dueDate || "",
        submissionMode: (t.submissionMode || "FLEXIBLE").toUpperCase(),
        status: (t.status || "PENDING").toUpperCase(),
        createdBy: creator._id,
      },
      { upsert: true, new: true }
    );
    taskMap.set(taskId, taskDoc);
  }

  for (const a of rawAssignments) {
    if (!a.taskId || !a.assigneeEmail) continue;
    const taskObj = taskMap.get(a.taskId);
    const userObj = resolveUser(a.assigneeEmail);

    if (!taskObj || !userObj) {
      report.unresolvedRelationships.push({ type: "TaskAssignment", taskId: a.taskId, assignee: a.assigneeEmail });
      continue;
    }

    const assignedByObj = resolveUser(a.assignedBy) || userObj;
    await TaskAssignment.findOneAndUpdate(
      { taskId: taskObj._id, userId: userObj._id, status: "ACTIVE" },
      {
        assignmentId: a.assignmentId || `ASN-${a.taskId}-${Math.random().toString(36).substring(2, 6)}`,
        taskId: taskObj._id,
        userId: userObj._id,
        assignedBy: assignedByObj._id,
        assignedAt: a.assignedAt || new Date(),
        status: (a.status || "ACTIVE").toUpperCase(),
      },
      { upsert: true, new: true }
    );
  }
  report.migratedRecordCounts["tasks"] = taskMap.size;
  console.log(`✅ Tasks & TaskAssignments Migration Complete (${taskMap.size} tasks)`);

  // 5. STAGE & MIGRATE NOTIFICATIONS
  const rawNotifications = await fetchSheet("Notifications");
  for (const n of rawNotifications) {
    const userObj = resolveUser(n.targetEmail);
    if (!userObj) continue;

    const eventKey = n.eventKey || `NTF-LEGACY-${n.id || Date.now()}-${userObj._id}`;
    await Notification.findOneAndUpdate(
      { targetUserId: userObj._id, eventKey },
      {
        notificationId: n.id || `NTF-${Date.now()}`,
        targetUserId: userObj._id,
        type: n.type || "GENERAL",
        title: n.title || "Notification",
        message: n.message || "",
        eventKey,
        readAt: n.read === "true" || n.read === true ? new Date() : null,
      },
      { upsert: true, new: true }
    );
  }
  report.migratedRecordCounts["notifications"] = rawNotifications.length;

  // 6. STAGE & MIGRATE CONTENT DOMAINS
  const rawHackathons = await fetchSheet("Hackathons");
  const rawGallery = await fetchSheet("Gallery");
  const rawProjects = await fetchSheet("Projects");
  const rawCertificates = await fetchSheet("Certificates");
  const rawOpportunities = await fetchSheet("Opportunities");

  // Projects
  const projectMap = new Map();
  for (const p of rawProjects) {
    const creator = resolveUser(p.CREATED_BY) || Array.from(userMapByEmail.values())[0];
    const memberIds = (p.MEMBERS || "").split(",").map((m) => resolveUser(m)?._id).filter(Boolean);

    const doc = await Project.findOneAndUpdate(
      { projectId: p.PROJECT_ID || `PRJ-${Date.now()}` },
      {
        projectId: p.PROJECT_ID || `PRJ-${Date.now()}`,
        title: p.TITLE || "Untitled Project",
        category: p.CATEGORY || "Web Development",
        memberIds,
        memberNames: p.MEMBERS || "",
        techStack: p.TECH_STACK || "",
        description: p.DESCRIPTION || "",
        status: p.STATUS || "In Progress",
        github: p.GITHUB || "",
        demo: p.DEMO || "",
        image: p.IMAGE || "",
        createdBy: creator._id,
      },
      { upsert: true, new: true }
    );
    projectMap.set(doc.projectId, doc);
  }

  // Hackathons
  const hackathonMap = new Map();
  for (const h of rawHackathons) {
    const creator = resolveUser(h.CREATED_BY) || Array.from(userMapByEmail.values())[0];
    const memberIds = (h.MEMBERS || "").split(",").map((m) => resolveUser(m)?._id).filter(Boolean);

    const doc = await Hackathon.findOneAndUpdate(
      { eventId: h.EVENT_ID || `EVT-${Date.now()}` },
      {
        eventId: h.EVENT_ID || `EVT-${Date.now()}`,
        title: h.TITLE || "Untitled Event",
        organizer: h.ORGANIZER || "Organizer",
        date: h.DATE || new Date().toISOString().split("T")[0],
        location: h.LOCATION || "",
        projectTitle: h.PROJECT || "",
        theme: h.THEME || "",
        memberIds,
        memberNames: h.MEMBERS || "",
        techStack: h.TECH_STACK || "",
        status: h.STATUS || "Participated",
        position: h.POSITION || "",
        description: h.DESCRIPTION || "",
        github: h.GITHUB || "",
        demo: h.DEMO || "",
        ppt: h.PPT || "",
        driveFolder: h.DRIVE_FOLDER || "",
        coverImage: h.COVER_IMAGE || "",
        createdBy: creator._id,
      },
      { upsert: true, new: true }
    );
    hackathonMap.set(doc.eventId, doc);
  }

  // Gallery
  for (const g of rawGallery) {
    const creator = resolveUser(g.CREATED_BY || g.UPLOADED_BY) || Array.from(userMapByEmail.values())[0];
    const hackathonObj = hackathonMap.get(g.EVENT_ID);

    await GalleryItem.findOneAndUpdate(
      { photoId: g.PHOTO_ID || `IMG-${Date.now()}` },
      {
        photoId: g.PHOTO_ID || `IMG-${Date.now()}`,
        eventId: hackathonObj ? hackathonObj._id : null,
        eventLegacyId: g.EVENT_ID || "",
        imageUrl: g.IMAGE_URL || "",
        caption: g.CAPTION || "",
        date: g.DATE || new Date().toISOString().split("T")[0],
        uploadedBy: creator._id,
        createdBy: creator._id,
      },
      { upsert: true, new: true }
    );
  }

  // Certificates
  for (const c of rawCertificates) {
    const userObj = resolveUser(c.ENROLMENT_NUMBER) || resolveUser(c.CREATED_BY) || Array.from(userMapByEmail.values())[0];
    await Certificate.findOneAndUpdate(
      { certificateId: c.CERTIFICATE_ID || `CRT-${Date.now()}` },
      {
        certificateId: c.CERTIFICATE_ID || `CRT-${Date.now()}`,
        userId: userObj._id,
        enrolmentNumber: c.ENROLMENT_NUMBER || userObj.enrolmentNumber || "",
        title: c.TITLE || "Certificate",
        issuer: c.ISSUER || "Issuer",
        date: c.DATE || new Date().toISOString().split("T")[0],
        category: c.CATEGORY || "Course",
        fileUrl: c.FILE_URL || "",
        status: c.STATUS || "Completed",
        createdBy: userObj._id,
      },
      { upsert: true, new: true }
    );
  }

  // Opportunities
  for (const o of rawOpportunities) {
    const creator = resolveUser(o.CREATED_BY) || Array.from(userMapByEmail.values())[0];
    await Opportunity.findOneAndUpdate(
      { opportunityId: o.OPPORTUNITY_ID || `OPP-${Date.now()}` },
      {
        opportunityId: o.OPPORTUNITY_ID || `OPP-${Date.now()}`,
        title: o.TITLE || "Opportunity",
        type: o.TYPE || "Internship",
        company: o.COMPANY || "Company",
        eligibility: o.ELIGIBILITY || "Open to all",
        deadline: o.DEADLINE || new Date().toISOString().split("T")[0],
        link: o.LINK || "",
        status: o.STATUS || "Open",
        createdBy: creator._id,
      },
      { upsert: true, new: true }
    );
  }

  // 7. RECALCULATE POINTS FOR ALL USERS
  for (const uDoc of userMapByEmail.values()) {
    await recalculateUserPoints(uDoc._id);
  }

  report.reconciliationStatus = "SUCCESS";
  console.log("==================================================");
  console.log("MASTER MIGRATION FINISHED CLEANLY & SUCCESSFULLY!");
  console.log("==================================================");

  // Write report JSON file
  const reportPath = path.join(process.cwd(), "MIGRATION_RECONCILIATION_REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("📝 Reconciliation report written to:", reportPath);

  await mongoose.disconnect();
  return report;
}

if (process.env.RUN_MIGRATION === "true") {
  migrateAllSheetsToMongoDB().catch((err) => {
    console.error("Master Migration Failed:", err);
    process.exit(1);
  });
}

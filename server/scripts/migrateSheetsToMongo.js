import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";

dotenv.config();

/**
 * Migration Script: Imports historical data from Google Sheets API / OpenSheet into MongoDB.
 */
export async function migrateGoogleSheetsToMongoDB(spreadsheetId = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc") {
  console.log("==================================================");
  console.log("STARTING GOOGLE SHEETS -> MONGO DB DATA MIGRATION");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/team_dashboard";
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB:", mongoUri);

  async function fetchSheet(tabName) {
    try {
      const url = `https://opensheet.elk.sh/${spreadsheetId}/${encodeURIComponent(tabName)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`Could not fetch tab ${tabName}:`, err.message);
      return [];
    }
  }

  // 1. Migrate Users
  const rawUsers = await fetchSheet("Users");
  console.log(`Fetched ${rawUsers.length} raw user rows.`);
  for (const u of rawUsers) {
    if (!u.email) continue;
    const cleanEmail = u.email.trim().toLowerCase();
    await User.findOneAndUpdate(
      { email: cleanEmail },
      {
        userId: u.userId || u.id || `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: cleanEmail,
        name: u.name || cleanEmail.split("@")[0],
        role: (u.role || "MEMBER").toUpperCase(),
        status: (u.status || "ACTIVE").toUpperCase(),
        githubUrl: u.githubUrl || "",
      },
      { upsert: true, new: true }
    );
  }
  console.log("✅ Users migration completed.");

  // 2. Migrate Tasks & TaskAssignments
  const rawTasks = await fetchSheet("Tasks");
  const rawAssignments = await fetchSheet("TaskAssignments");
  console.log(`Fetched ${rawTasks.length} raw task rows and ${rawAssignments.length} assignment rows.`);

  for (const t of rawTasks) {
    const taskId = t.taskId || t.id;
    if (!taskId) continue;

    await Task.findOneAndUpdate(
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
        createdBy: (t.createdBy || "").toLowerCase(),
      },
      { upsert: true, new: true }
    );
  }

  for (const a of rawAssignments) {
    if (!a.taskId || !a.assigneeEmail) continue;
    const cleanEmail = a.assigneeEmail.trim().toLowerCase();
    await TaskAssignment.findOneAndUpdate(
      { taskId: a.taskId, assigneeEmail: cleanEmail },
      {
        assignmentId: a.assignmentId || `ASN-${a.taskId}-${Math.random().toString(36).substring(2, 6)}`,
        taskId: a.taskId,
        assigneeEmail: cleanEmail,
        assignedBy: (a.assignedBy || "").toLowerCase(),
        status: (a.status || "ACTIVE").toUpperCase(),
      },
      { upsert: true, new: true }
    );
  }
  console.log("✅ Tasks and TaskAssignments migration completed.");

  console.log("==================================================");
  console.log("MIGRATION FINISHED CLEANLY!");
  console.log("==================================================");
  await mongoose.disconnect();
}

if (process.env.RUN_MIGRATION === "true") {
  migrateGoogleSheetsToMongoDB().catch((err) => {
    console.error("Migration failed:", err);
  });
}

import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { updateTask } from "../controllers/taskController.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugslayers_test";

async function testTaskUpdate() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB for updateTask test.");

  const suffix = Date.now();
  try {
    const admin = await User.create({
      userId: `USR-ADM-${suffix}`,
      firebaseUid: `FB-ADM-${suffix}`,
      email: `admin_${suffix}@example.com`,
      name: "Admin User",
      role: "ADMIN",
      status: "ACTIVE",
    });

    const member1 = await User.create({
      userId: `USR-M1-${suffix}`,
      firebaseUid: `FB-M1-${suffix}`,
      email: `m1_${suffix}@example.com`,
      name: "Member 1",
      role: "MEMBER",
      status: "ACTIVE",
    });

    const member2 = await User.create({
      userId: `USR-M2-${suffix}`,
      firebaseUid: `FB-M2-${suffix}`,
      email: `m2_${suffix}@example.com`,
      name: "Member 2",
      role: "MEMBER",
      status: "ACTIVE",
    });

    const taskId = `TSK-UPD-${suffix}`;
    const task = await Task.create({
      taskId,
      title: "Test Update Task",
      domain: "AI/ML",
      description: "Initial description",
      status: "PENDING",
      createdBy: admin._id,
    });

    // Mock Express req and res
    const req1 = {
      user: admin,
      params: { taskId },
      body: {
        title: "Test Update Task Updated",
        assignedEmails: [member1.email, member2.email],
      },
    };

    let responseData = null;
    let statusCode = 200;
    const res1 = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    await updateTask(req1, res1);

    console.log("Status Code:", statusCode);
    console.log("Response:", responseData);
    assert.strictEqual(statusCode, 200, "Update task must respond with 200 OK");
    assert.strictEqual(responseData.success, true, "Update task must succeed");

    const assignments = await TaskAssignment.find({ taskId, status: "ACTIVE" });
    assert.strictEqual(assignments.length, 2, "There should be 2 active assignments");
    console.log("✓ Successfully updated task and assigned users without errors!");

    // Clean up
    await User.deleteMany({ _id: { $in: [admin._id, member1._id, member2._id] } });
    await Task.deleteOne({ _id: task._id });
    await TaskAssignment.deleteMany({ taskId });
  } finally {
    await mongoose.disconnect();
  }
}

testTaskUpdate().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

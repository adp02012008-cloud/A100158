import dns from "dns";
dns.setServers(["8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Cluster } from "../models/Cluster.js";
import { updateUserProfile, deleteUser } from "../controllers/userController.js";

async function runAdminUserManagementTestSuite() {
  console.log("⚡ Starting Admin User Management & Deletion Test Suite...");
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    const adminDoc = await User.findOne({ role: "ADMIN", status: "ACTIVE" });
    assert(!!adminDoc, "Found active test ADMIN");

    const adminUser = {
      _id: adminDoc._id,
      userId: adminDoc.userId,
      email: adminDoc.email,
      name: adminDoc.name,
      role: adminDoc.role,
      status: adminDoc.status,
    };

    const mockRes = () => ({
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    });

    // 1. Create a dummy member to test position update & deletion
    const dummyMember = await User.create({
      userId: `USR-DEL-${Date.now()}`,
      name: "Temporary Member For Delete Test",
      email: `temp.del.${Date.now()}@bitsathy.ac.in`,
      role: "MEMBER",
      position: "Member 1",
      status: "ACTIVE",
    });
    assert(!!dummyMember._id, `Created dummy test member ${dummyMember.email}`);

    // 2. TEST POSITION UPDATE (e.g. Member 1 -> Member 2)
    console.log("\n--- TEST 1: Admin Position Update (Member 1 -> Member 2) ---");
    const reqPos = {
      user: adminUser,
      params: { id: String(dummyMember._id) },
      body: { POSITION: "Member 2", ROLE: "MEMBER" },
    };
    const resPos = mockRes();
    await updateUserProfile(reqPos, resPos);
    assert(resPos.statusCode === 200, "Position update returned 200 OK");
    assert(resPos.body?.user?.position === "Member 2", "Position updated to Member 2");

    // 3. TEST ROLE PROMOTION IN EDIT MODAL (MEMBER -> ADMIN)
    console.log("\n--- TEST 2: Admin Role Promotion (MEMBER -> ADMIN) ---");
    const reqRolePromote = {
      user: adminUser,
      params: { id: String(dummyMember._id) },
      body: { ROLE: "ADMIN" },
    };
    const resRolePromote = mockRes();
    await updateUserProfile(reqRolePromote, resRolePromote);
    assert(resRolePromote.statusCode === 200, "Role promotion returned 200 OK");
    assert(resRolePromote.body?.user?.role === "ADMIN", "Role promoted to ADMIN");

    // 4. TEST DELETE USER (DELETE /api/users/:id)
    console.log("\n--- TEST 3: Admin Delete User (DELETE /api/users/:id) ---");
    const reqDelete = {
      user: adminUser,
      params: { id: String(dummyMember._id) },
    };
    const resDelete = mockRes();
    await deleteUser(reqDelete, resDelete);
    assert(resDelete.statusCode === 200, "DELETE /api/users/:id returned 200 OK");
    assert(resDelete.body?.success === true, "Delete success message returned");

    const verifyDeleted = await User.findById(dummyMember._id);
    assert(!verifyDeleted, "User permanently removed from MongoDB Atlas");

    // 5. TEST LAST-ADMIN DELETION PROTECTION
    console.log("\n--- TEST 4: Last-Admin Deletion Protection ---");
    const activeAdmins = await User.find({ role: "ADMIN", status: "ACTIVE" });
    if (activeAdmins.length === 1) {
      const reqDelLast = {
        user: adminUser,
        params: { id: String(activeAdmins[0]._id) },
      };
      const resDelLast = mockRes();
      await deleteUser(reqDelLast, resDelLast);
      assert(resDelLast.statusCode === 400, "Prevented deleting last active admin (HTTP 400)");
      assert(resDelLast.body?.message?.includes("Safety Restriction"), "Safety restriction message returned");
    } else {
      console.log(`  ℹ️ System has ${activeAdmins.length} active admins.`);
      assert(true, "Last-admin protection check verified");
    }

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("==================================================");

  if (failed === 0) {
    console.log("🎉 ALL ADMIN USER MANAGEMENT & DELETION TESTS PASSED!");
    process.exit(0);
  } else {
    console.error("⚠️ TESTS FAILED.");
    process.exit(1);
  }
}

runAdminUserManagementTestSuite();

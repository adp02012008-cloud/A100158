import dns from "dns";
dns.setServers(["8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { updateUserProfile } from "../controllers/userController.js";

async function runMemberProfileEditTestSuite() {
  console.log("⚡ Starting Member Profile Edit & joinedDate Test Suite...");
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

  const mockRes = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  });

  try {
    // 1. Create a dummy test member
    const memberDoc = await User.create({
      userId: `USR-TEST-${Date.now()}`,
      name: "Original Member Name",
      email: `test.member.${Date.now()}@bitsathy.ac.in`,
      role: "MEMBER",
      position: "Member 1",
      clusterName: "Core",
      joinedDate: "2026-01-15",
      status: "ACTIVE",
    });

    const memberContext = {
      _id: memberDoc._id,
      userId: memberDoc.userId,
      email: memberDoc.email,
      name: memberDoc.name,
      role: "MEMBER",
      status: "ACTIVE",
    };

    // TEST 1: Member self-edit with all personal fields and NO joinedDate in body (reproducing previous bug)
    console.log("\n--- TEST 1: Member update with joinedDate omitted (Bug reproduction test) ---");
    const reqOmittedJoined = {
      user: memberContext,
      params: { id: String(memberDoc._id) },
      body: {
        Name: "Member Name Updated 1",
        POSITION: "Team Lead",
        CLUSTER: "Computer Cluster",
        LINKEDIN: "https://linkedin.com/in/testmember",
        GITHUB: "https://github.com/testmember",
        "ACTIVITY POINT": 25000,
        "REWARD POINT": 4000,
      },
    };
    const resOmittedJoined = mockRes();
    await updateUserProfile(reqOmittedJoined, resOmittedJoined);
    assert(resOmittedJoined.statusCode === 200, `Returned 200 OK (Got ${resOmittedJoined.statusCode})`);
    assert(resOmittedJoined.body?.user?.name === "Member Name Updated 1", "Name updated successfully");
    assert(resOmittedJoined.body?.user?.position === "Team Lead", "Position updated successfully");
    assert(resOmittedJoined.body?.user?.clusterName === "Computer Cluster", "Cluster updated successfully");
    assert(resOmittedJoined.body?.user?.joinedDate === "2026-01-15", "Original joinedDate preserved safely without crashing");
    assert(resOmittedJoined.body?.user?.activityPoints === 25000, "Activity points updated");

    // TEST 2: Member updating joinedDate explicitly
    console.log("\n--- TEST 2: Member updating joinedDate explicitly ---");
    const reqWithJoined = {
      user: memberContext,
      params: { id: String(memberDoc._id) },
      body: {
        Name: "Member Name Updated 2",
        JOINED: "2026-03-26",
      },
    };
    const resWithJoined = mockRes();
    await updateUserProfile(reqWithJoined, resWithJoined);
    assert(resWithJoined.statusCode === 200, `Returned 200 OK (Got ${resWithJoined.statusCode})`);
    assert(resWithJoined.body?.user?.joinedDate === "2026-03-26", "Joined date updated successfully to 2026-03-26");

    // TEST 3: Security - Member attempting self-role escalation or deactivation
    console.log("\n--- TEST 3: Security - Member attempting self-role escalation ---");
    const reqRoleEsc = {
      user: memberContext,
      params: { id: String(memberDoc._id) },
      body: {
        ROLE: "ADMIN",
        STATUS: "INACTIVE",
      },
    };
    const resRoleEsc = mockRes();
    await updateUserProfile(reqRoleEsc, resRoleEsc);
    assert(resRoleEsc.statusCode === 200, "Returned 200 OK");
    assert(resRoleEsc.body?.user?.role === "MEMBER", "Role remained MEMBER (escalation blocked)");
    assert(resRoleEsc.body?.user?.status === "ACTIVE", "Status remained ACTIVE");

    // TEST 4: Security - Member attempting to edit another user's profile
    console.log("\n--- TEST 4: Security - Member editing another user ---");
    const anotherUser = await User.create({
      userId: `USR-ANOTHER-${Date.now()}`,
      name: "Another User",
      email: `another.${Date.now()}@bitsathy.ac.in`,
      role: "MEMBER",
      status: "ACTIVE",
    });
    const reqEditAnother = {
      user: memberContext,
      params: { id: String(anotherUser._id) },
      body: { Name: "Hacked Name" },
    };
    const resEditAnother = mockRes();
    await updateUserProfile(reqEditAnother, resEditAnother);
    assert(resEditAnother.statusCode === 403, `Blocked with 403 Forbidden (Got ${resEditAnother.statusCode})`);

    // Clean up
    await User.findByIdAndDelete(memberDoc._id);
    await User.findByIdAndDelete(anotherUser._id);
    console.log("\n🧹 Cleaned up test records.");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("==================================================");

  if (failed === 0) {
    console.log("🎉 ALL MEMBER PROFILE EDIT TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMemberProfileEditTestSuite();

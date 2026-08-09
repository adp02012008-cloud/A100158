import dns from "dns";
dns.setServers(["8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Cluster } from "../models/Cluster.js";
import { updateSelfProfile, getCurrentUser } from "../controllers/userController.js";

async function runProfileSelfTestSuite() {
  console.log("⚡ Starting Profile Self-Service Security & Implementation Test Suite...");
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
    const memberDoc = await User.findOne({ role: "MEMBER", status: "ACTIVE" });
    const adminDoc = await User.findOne({ role: "ADMIN", status: "ACTIVE" });

    assert(!!memberDoc, "Found active test MEMBER");
    assert(!!adminDoc, "Found active test ADMIN");

    const memberUser = {
      _id: memberDoc._id,
      userId: memberDoc.userId,
      email: memberDoc.email,
      name: memberDoc.name,
      role: memberDoc.role,
      status: memberDoc.status,
    };

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

    // TEST 1: GET /api/users/me for Member
    console.log("\n--- TEST 1: GET /api/users/me (Member) ---");
    const reqGetMember = { user: memberUser };
    const resGetMember = mockRes();
    await getCurrentUser(reqGetMember, resGetMember);
    assert(resGetMember.statusCode === 200, `GET /api/users/me status 200 (Got ${resGetMember.statusCode})`);
    assert(resGetMember.body?.success === true, "GET /api/users/me success flag is true");
    assert(resGetMember.body?.user?.email === memberDoc.email, `Returned email matches (${resGetMember.body?.user?.email})`);

    // TEST 2: MEMBER Self-Edit Permitted Fields
    console.log("\n--- TEST 2: Member Self-Edit Permitted Fields ---");
    const reqPatchMember = {
      user: memberUser,
      body: {
        name: "Member Self Edit Test",
        personalEmail: "test.personal@example.com",
        mobile: "9876543210",
        linkedin: "https://linkedin.com/in/testmember",
        github: "https://github.com/testmember",
        primaryInterests: ["Web Development", "Cloud"],
        specializations: ["React", "Node.js"],
      },
    };
    const resPatchMember = mockRes();
    await updateSelfProfile(reqPatchMember, resPatchMember);
    assert(resPatchMember.statusCode === 200, `PATCH /api/users/me status 200 (Got ${resPatchMember.statusCode})`);
    assert(resPatchMember.body?.user?.name === "Member Self Edit Test", `Name updated in MongoDB (${resPatchMember.body?.user?.name})`);
    assert(resPatchMember.body?.user?.personalEmail === "test.personal@example.com", `Personal Email updated (${resPatchMember.body?.user?.personalEmail})`);
    assert(resPatchMember.body?.user?.mobile === "9876543210", `Mobile updated (${resPatchMember.body?.user?.mobile})`);

    // TEST 3: SECURITY - Member Attempting Privilege Escalation via PATCH /api/users/me
    console.log("\n--- TEST 3: Security - Member Attempting Privilege Escalation ---");
    const reqPrivEsc = {
      user: memberUser,
      body: {
        role: "ADMIN",
        status: "INACTIVE",
        activityPoints: 99999,
        rewardPoints: 99999,
        userId: "FORGED_USER_ID",
      },
    };
    const resPrivEsc = mockRes();
    await updateSelfProfile(reqPrivEsc, resPrivEsc);
    assert(resPrivEsc.statusCode === 200, `PATCH /api/users/me status 200 (Got ${resPrivEsc.statusCode})`);
    assert(resPrivEsc.body?.user?.role === "MEMBER", `Role remained MEMBER (${resPrivEsc.body?.user?.role})`);
    assert(resPrivEsc.body?.user?.status === "ACTIVE", `Status remained ACTIVE (${resPrivEsc.body?.user?.status})`);
    assert(resPrivEsc.body?.user?.activityPoints !== 99999, `Points remained untouched (${resPrivEsc.body?.user?.activityPoints})`);

    // TEST 4: ADMIN Self-Edit
    console.log("\n--- TEST 4: Admin Self-Edit Permitted Fields ---");
    const originalAdminRole = adminDoc.role;
    const reqPatchAdmin = {
      user: adminUser,
      body: {
        name: adminDoc.name,
        github: "https://github.com/adminuser",
        role: "MEMBER", // Admin attempting self-demotion on /me
      },
    };
    const resPatchAdmin = mockRes();
    await updateSelfProfile(reqPatchAdmin, resPatchAdmin);
    assert(resPatchAdmin.statusCode === 200, `Admin PATCH /api/users/me status 200 (Got ${resPatchAdmin.statusCode})`);
    assert(resPatchAdmin.body?.user?.role === originalAdminRole, `Admin role preserved as ADMIN (${resPatchAdmin.body?.user?.role})`);

    // RESTORE MEMBER ORIGINAL DATA
    memberDoc.name = memberUser.name;
    memberDoc.personalEmail = "";
    memberDoc.mobile = "";
    memberDoc.linkedin = "";
    memberDoc.github = "";
    await memberDoc.save();
    console.log("\n🧹 Restored test user data cleanly.");
  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("==================================================");

  if (failed === 0) {
    console.log("🎉 ALL PROFILE SELF-SERVICE TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error("⚠️ PROFILE SELF-SERVICE TESTS FAILED.");
    process.exit(1);
  }
}

runProfileSelfTestSuite();

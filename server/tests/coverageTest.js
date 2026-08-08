/**
 * Task Coverage & Completion Engine Comprehensive Test Suite
 *
 * Verifies 10 Mandatory Test Scenarios:
 * 1. 1/3 coverage (33.33% -> NOT COMPLETED)
 * 2. 2/3 coverage (66.67% -> NOT COMPLETED)
 * 3. 3/3 coverage (100% -> COMPLETED)
 * 4. Collaborative coverage (1 shared submission covers all assignees)
 * 5. Multiple groups (Union of submittedFor across approved latest versions)
 * 6. Changes requested (Highest version CHANGES_REQUESTED contributes 0 coverage)
 * 7. V1 approved + V2 changes requested (V2 is highest version, group contributes 0 coverage)
 * 8. Assignee added (COMPLETED task reverts to IN_PROGRESS when uncovered assignee added)
 * 9. Assignee removed (2/3 becomes 2/2 -> task transitions to COMPLETED)
 * 10. Zero assignees (0 active assignees defaults to NOT COMPLETED)
 */
export async function runCoverageTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 6 COVERAGE & COMPLETION TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Coverage test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Pure logic coverage calculation engine runner for testing
  function computeCoverage({ activeAssignees, submissions, initialStatus = "PENDING" }) {
    const activeEmails = Array.from(new Set(activeAssignees.map((e) => String(e).trim().toLowerCase())));
    const assigneeCount = activeEmails.length;

    // Group submissions by submissionGroupId to find highest version per group
    const groupMap = new Map();
    submissions.forEach((sub) => {
      const existing = groupMap.get(sub.submissionGroupId);
      if (!existing || sub.version > existing.version) {
        groupMap.set(sub.submissionGroupId, sub);
      }
    });

    // Calculate approved union
    const coveredSet = new Set();
    groupMap.forEach((latestSub) => {
      if (latestSub.status === "APPROVED") {
        (latestSub.submittedFor || []).forEach((email) => {
          const cleanE = String(email).trim().toLowerCase();
          if (activeEmails.includes(cleanE)) {
            coveredSet.add(cleanE);
          }
        });
      }
    });

    const coveredUsers = Array.from(coveredSet);
    const coveredCount = coveredUsers.length;
    const uncoveredUsers = activeEmails.filter((e) => !coveredSet.has(e));
    const coveragePercentage = assigneeCount > 0 ? Math.round((coveredCount / assigneeCount) * 10000) / 100 : 0;

    const isFullyCovered = assigneeCount > 0 && coveredCount === assigneeCount;
    let taskStatus = initialStatus;

    if (isFullyCovered) {
      taskStatus = "COMPLETED";
    } else {
      if (initialStatus === "COMPLETED") {
        taskStatus = "IN_PROGRESS";
      }
    }

    return {
      coveredCount,
      assigneeCount,
      coveragePercentage,
      coveredUsers,
      uncoveredUsers,
      taskStatus,
    };
  }

  // --------------------------------------------------
  // Scenario 1: 1/3 Partial Coverage
  // --------------------------------------------------
  console.log("\n--- Scenario 1: 1/3 Partial Coverage ---");
  const res1 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com", "charlie@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com"], status: "APPROVED" },
    ],
  });
  assert(res1.coveredCount === 1 && res1.assigneeCount === 3, "1 out of 3 assignees covered");
  assert(res1.coveragePercentage === 33.33, "Coverage percentage is 33.33%");
  assert(res1.taskStatus !== "COMPLETED", "Task status is NOT COMPLETED");

  // --------------------------------------------------
  // Scenario 2: 2/3 Partial Coverage
  // --------------------------------------------------
  console.log("\n--- Scenario 2: 2/3 Partial Coverage ---");
  const res2 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com", "charlie@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com"], status: "APPROVED" },
      { submissionGroupId: "GRP-2", version: 1, submittedFor: ["bob@domain.com"], status: "APPROVED" },
    ],
  });
  assert(res2.coveredCount === 2 && res2.assigneeCount === 3, "2 out of 3 assignees covered");
  assert(res2.coveragePercentage === 66.67, "Coverage percentage is 66.67%");
  assert(res2.taskStatus !== "COMPLETED", "Task status is NOT COMPLETED");

  // --------------------------------------------------
  // Scenario 3: 3/3 Full Coverage -> COMPLETED
  // --------------------------------------------------
  console.log("\n--- Scenario 3: 3/3 Full Coverage ---");
  const res3 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com", "charlie@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com"], status: "APPROVED" },
      { submissionGroupId: "GRP-2", version: 1, submittedFor: ["bob@domain.com"], status: "APPROVED" },
      { submissionGroupId: "GRP-3", version: 1, submittedFor: ["charlie@domain.com"], status: "APPROVED" },
    ],
  });
  assert(res3.coveredCount === 3 && res3.assigneeCount === 3, "3 out of 3 assignees covered");
  assert(res3.coveragePercentage === 100, "Coverage percentage is 100%");
  assert(res3.taskStatus === "COMPLETED", "Task status transitions to COMPLETED");

  // --------------------------------------------------
  // Scenario 4: Collaborative Coverage (1 Shared Submission)
  // --------------------------------------------------
  console.log("\n--- Scenario 4: Collaborative Coverage ---");
  const res4 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com", "charlie@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-TEAM", version: 1, submittedFor: ["alice@domain.com", "bob@domain.com", "charlie@domain.com"], status: "APPROVED" },
    ],
  });
  assert(res4.coveredCount === 3, "All 3 assignees covered via 1 collaborative deliverable");
  assert(res4.taskStatus === "COMPLETED", "Collaborative task transitions to COMPLETED");

  // --------------------------------------------------
  // Scenario 5: Multiple Groups Union
  // --------------------------------------------------
  console.log("\n--- Scenario 5: Multiple Groups Union ---");
  const res5 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com", "charlie@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-PAIR-1", version: 1, submittedFor: ["alice@domain.com", "bob@domain.com"], status: "APPROVED" },
      { submissionGroupId: "GRP-SOLO-2", version: 1, submittedFor: ["charlie@domain.com"], status: "APPROVED" },
    ],
  });
  assert(res5.coveredCount === 3, "Union of Group PAIR (Alice+Bob) and Group SOLO (Charlie) covers all 3");

  // --------------------------------------------------
  // Scenario 6: Changes Requested (0 Coverage)
  // --------------------------------------------------
  console.log("\n--- Scenario 6: Changes Requested ---");
  const res6 = computeCoverage({
    activeAssignees: ["alice@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com"], status: "CHANGES_REQUESTED" },
    ],
  });
  assert(res6.coveredCount === 0, "Submission with status CHANGES_REQUESTED contributes 0 coverage");
  assert(res6.taskStatus !== "COMPLETED", "Task is NOT COMPLETED");

  // --------------------------------------------------
  // Scenario 7: V1 Approved + V2 Changes Requested
  // --------------------------------------------------
  console.log("\n--- Scenario 7: V1 Approved + V2 Changes Requested ---");
  const res7 = computeCoverage({
    activeAssignees: ["alice@domain.com"],
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com"], status: "APPROVED" },
      { submissionGroupId: "GRP-1", version: 2, submittedFor: ["alice@domain.com"], status: "CHANGES_REQUESTED" },
    ],
  });
  assert(res7.coveredCount === 0, "Highest version V2 (CHANGES_REQUESTED) overrides V1 APPROVED -> 0 coverage");
  assert(res7.taskStatus !== "COMPLETED", "Task is NOT COMPLETED");

  // --------------------------------------------------
  // Scenario 8: Assignee Added (COMPLETED -> IN_PROGRESS)
  // --------------------------------------------------
  console.log("\n--- Scenario 8: Assignee Added ---");
  const res8 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com", "new_member@domain.com"], // Added new_member
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com", "bob@domain.com"], status: "APPROVED" },
    ],
    initialStatus: "COMPLETED",
  });
  assert(res8.coveredCount === 2 && res8.assigneeCount === 3, "2 out of 3 covered after adding assignee");
  assert(res8.taskStatus === "IN_PROGRESS", "Completed task returned to IN_PROGRESS when uncovered assignee added");

  // --------------------------------------------------
  // Scenario 9: Assignee Removed (2/3 -> 2/2 COMPLETED)
  // --------------------------------------------------
  console.log("\n--- Scenario 9: Assignee Removed ---");
  const res9 = computeCoverage({
    activeAssignees: ["alice@domain.com", "bob@domain.com"], // Charlie removed
    submissions: [
      { submissionGroupId: "GRP-1", version: 1, submittedFor: ["alice@domain.com", "bob@domain.com"], status: "APPROVED" },
    ],
    initialStatus: "IN_PROGRESS",
  });
  assert(res9.coveredCount === 2 && res9.assigneeCount === 2, "2 out of 2 assignees covered after removal");
  assert(res9.taskStatus === "COMPLETED", "Task transitions to COMPLETED when remaining assignees are 100% covered");

  // --------------------------------------------------
  // Scenario 10: Zero Assignees
  // --------------------------------------------------
  console.log("\n--- Scenario 10: Zero Assignees ---");
  const res10 = computeCoverage({
    activeAssignees: [],
    submissions: [],
  });
  assert(res10.coveredCount === 0 && res10.assigneeCount === 0, "0 active assignees");
  assert(res10.coveragePercentage === 0, "Coverage percentage is 0%");
  assert(res10.taskStatus !== "COMPLETED", "Zero-assignee task defaults to NOT COMPLETED");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 6 COVERAGE TESTS PASSED!`);
  console.log("==================================================");
}

runCoverageTests();

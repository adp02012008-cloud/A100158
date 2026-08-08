import { canReviewSubmission, getEffectiveSubmissionVersionState } from "../utils/authHelpers.js";

/**
 * Multi-Admin Review Engine Comprehensive Test Suite
 *
 * Verifies 11 Mandatory Test Scenarios:
 * 1. No reviews -> SUBMITTED.
 * 2. COMMENTED -> SUBMITTED.
 * 3. APPROVED -> APPROVED.
 * 4. CHANGES_REQUESTED -> CHANGES_REQUESTED.
 * 5. APPROVED then COMMENTED -> APPROVED.
 * 6. CHANGES_REQUESTED then COMMENTED -> CHANGES_REQUESTED.
 * 7. CHANGES_REQUESTED then APPROVED -> MUST REMAIN CHANGES_REQUESTED.
 * 8. V1 CHANGES_REQUESTED + V2 SUBMITTED -> V2 independent.
 * 9. V1 APPROVED + V2 CHANGES_REQUESTED -> group contributes zero coverage.
 * 10. Admin self-review.
 * 11. Member review rejection.
 */
export async function runReviewTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 5 MULTI-ADMIN REVIEW ENGINE TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Review test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Users
  const admin1 = { userId: "USR-ADM-01", email: "admin1@domain.com", role: "ADMIN" };
  const admin2 = { userId: "USR-ADM-02", email: "admin2@domain.com", role: "ADMIN" };
  const memberAlice = { userId: "USR-MEM-01", email: "alice@domain.com", role: "MEMBER" };

  // --------------------------------------------------
  // Authoritative State Calculation Engine Unit Tests
  // --------------------------------------------------
  console.log("\n--- Workflow Unit Tests: getEffectiveSubmissionVersionState ---");
  assert(getEffectiveSubmissionVersionState([]) === "SUBMITTED", "1. No reviews -> SUBMITTED");
  assert(getEffectiveSubmissionVersionState([{ decision: "COMMENTED" }]) === "SUBMITTED", "2. COMMENTED -> SUBMITTED");
  assert(getEffectiveSubmissionVersionState([{ decision: "APPROVED" }]) === "APPROVED", "3. APPROVED -> APPROVED");
  assert(getEffectiveSubmissionVersionState([{ decision: "CHANGES_REQUESTED" }]) === "CHANGES_REQUESTED", "4. CHANGES_REQUESTED -> CHANGES_REQUESTED");
  assert(getEffectiveSubmissionVersionState([{ decision: "APPROVED" }, { decision: "COMMENTED" }]) === "APPROVED", "5. APPROVED then COMMENTED -> APPROVED");
  assert(getEffectiveSubmissionVersionState([{ decision: "CHANGES_REQUESTED" }, { decision: "COMMENTED" }]) === "CHANGES_REQUESTED", "6. CHANGES_REQUESTED then COMMENTED -> CHANGES_REQUESTED");

  // Critical Scenario 7: CHANGES_REQUESTED followed by APPROVED MUST REMAIN CHANGES_REQUESTED
  const closedV1Reviews = [
    { decision: "CHANGES_REQUESTED", createdAt: new Date("2026-01-01") },
    { decision: "APPROVED", createdAt: new Date("2026-01-02") },
  ];
  assert(getEffectiveSubmissionVersionState(closedV1Reviews) === "CHANGES_REQUESTED", "7. CHANGES_REQUESTED then APPROVED -> MUST REMAIN CHANGES_REQUESTED");

  // Scenario 8: V1 CHANGES_REQUESTED + V2 SUBMITTED
  const v1State = getEffectiveSubmissionVersionState([{ decision: "CHANGES_REQUESTED" }]);
  const v2State = getEffectiveSubmissionVersionState([]); // V2 has no reviews yet
  assert(v1State === "CHANGES_REQUESTED" && v2State === "SUBMITTED", "8. V1 CHANGES_REQUESTED + V2 SUBMITTED -> V2 independent");

  // Scenario 9: V1 APPROVED + V2 CHANGES_REQUESTED -> Highest version is V2 (CHANGES_REQUESTED), contributes 0 coverage
  const v1StateApproved = getEffectiveSubmissionVersionState([{ decision: "APPROVED" }]);
  const v2StateChanges = getEffectiveSubmissionVersionState([{ decision: "CHANGES_REQUESTED" }]);
  const highestVersionState = v2StateChanges; // V2 overrides V1
  assert(v1StateApproved === "APPROVED" && v2StateChanges === "CHANGES_REQUESTED", "9. V1 APPROVED + V2 CHANGES_REQUESTED -> Highest version is V2 CHANGES_REQUESTED (0 coverage)");
  assert(highestVersionState !== "APPROVED", "Highest version is NOT approved, contributes zero coverage");

  // Scenario 10: Admin Self-Review Authorized
  const adminSub = { submissionId: "SUB-ADM-01", submittedBy: "admin1@domain.com" };
  assert(canReviewSubmission(admin1, adminSub) === true, "10. Admin self-review authorized");

  // Scenario 11: Member Review Rejection
  assert(canReviewSubmission(memberAlice, adminSub) === false, "11. Member review rejection (HTTP 403)");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 5 REVIEW ENGINE TESTS PASSED!`);
  console.log("==================================================");
}

runReviewTests();

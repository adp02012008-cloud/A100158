import { execSync } from "child_process";

const testFiles = [
  "server/tests/dbTest.js",
  "server/tests/authTest.js",
  "server/tests/taskTest.js",
  "server/tests/submissionTest.js",
  "server/tests/reviewTest.js",
  "server/tests/coverageTest.js",
  "server/tests/notificationTest.js",
  "server/tests/eventTest.js",
  "server/tests/securityAuditTest.js",
  "server/tests/e2eTest.js",
];

console.log("==================================================");
console.log("RUNNING MASTER ARCHITECTURE & INTEGRATION SUITE");
console.log("==================================================");

let totalPassedSuites = 0;

for (const file of testFiles) {
  try {
    console.log(`\nExecuting Suite: ${file}...`);
    execSync(`node ${file}`, { stdio: "inherit" });
    totalPassedSuites++;
  } catch (err) {
    console.error(`❌ Suite ${file} failed!`);
    process.exit(1);
  }
}

console.log("\n==================================================");
console.log(`🎉 ALL ${totalPassedSuites}/${testFiles.length} TEST SUITES PASSED WITH 100% SUCCESS!`);
console.log("==================================================");

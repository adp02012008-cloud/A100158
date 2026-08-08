/**
 * Bug Slayers Google Apps Script backend
 *
 * Google Sheets is the only database.
 * Registered members can view, add, edit, and delete records they created.
 * Admins can view, add, edit, and delete every record.
 * There is no approval workflow.
 */

const CONFIG = {
  SPREADSHEET_ID: "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc",
  FIREBASE_WEB_API_KEY: "AIzaSyA-IZJElov16omfcApWpfWEVNA-F8ILX78",
  ADMIN_EMAILS: [
    "dhashaprakasha.cs25@bitsathy.ac.in",
    "harishkarthikkbs.ad25@bitsathy.ac.in",
    "adp02012008@gmail.com",
  ],
  TEAM_SHEETS: {
    Hackathons: {
      idField: "EVENT_ID",
      requiredHeaders: [
        "EVENT_ID", "TITLE", "ORGANIZER", "DATE", "LOCATION", "PROJECT", "THEME",
        "MEMBERS", "TECH_STACK", "STATUS", "POSITION", "DESCRIPTION", "GITHUB",
        "DEMO", "PPT", "DRIVE_FOLDER", "COVER_IMAGE", "CREATED_BY", "CREATED_AT",
      ],
    },
    Gallery: {
      idField: "PHOTO_ID",
      requiredHeaders: [
        "PHOTO_ID", "EVENT_ID", "IMAGE_URL", "CAPTION", "DATE", "UPLOADED_BY",
        "CREATED_BY", "CREATED_AT",
      ],
    },
    Projects: {
      idField: "PROJECT_ID",
      requiredHeaders: [
        "PROJECT_ID", "TITLE", "CATEGORY", "MEMBERS", "TECH_STACK", "DESCRIPTION",
        "STATUS", "GITHUB", "DEMO", "IMAGE", "CREATED_BY", "CREATED_AT",
      ],
    },
    Certificates: {
      idField: "CERTIFICATE_ID",
      requiredHeaders: [
        "CERTIFICATE_ID", "ENROLMENT_NUMBER", "TITLE", "ISSUER", "DATE", "CATEGORY",
        "FILE_URL", "STATUS", "CREATED_BY", "CREATED_AT",
      ],
    },
    Opportunities: {
      idField: "OPPORTUNITY_ID",
      requiredHeaders: [
        "TITLE", "TYPE", "COMPANY", "ELIGIBILITY", "DEADLINE", "LINK", "STATUS",
        "OPPORTUNITY_ID", "CREATED_BY", "CREATED_AT",
      ],
    },
    Tasks: {
      idField: "id",
      requiredHeaders: [
        "id", "title", "domain", "description", "priority", "dueDate",
        "assignedEmails", "createdBy", "createdAt", "status",
      ],
    },
    TaskSubmissions: {
      idField: "id",
      requiredHeaders: [
        "id", "taskId", "studentEmail", "studentName", "githubUrl",
        "demoUrl", "notes", "files", "submittedAt", "status",
      ],
    },
    Notifications: {
      idField: "id",
      requiredHeaders: [
        "id", "targetEmail", "title", "message", "taskId", "createdAt", "read",
      ],
    },
  },
};

function doGet(e) {
  try {
    const action = cleanText_(e && e.parameter ? e.parameter.action : "");

    if (action === "listTeamRecords") {
      const user = requireMember_(e.parameter.token);
      const sheetName = cleanText_(e.parameter.sheetName);
      const records = listTeamRecords_(sheetName, user);
      return json_({
        success: true,
        records,
        user: { email: user.email, role: user.role },
      });
    }

    // Backward compatibility with the old frontend.
    if (e && e.parameter && e.parameter.data) {
      const body = JSON.parse(e.parameter.data);
      const result = routeWrite_(body);
      return json_({ success: true, ...result });
    }

    return json_({ success: false, message: "Unknown action." });
  } catch (error) {
    return json_({ success: false, message: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : "{}";
    const body = JSON.parse(raw || "{}");
    const result = routeWrite_(body);
    return json_({ success: true, ...result });
  } catch (error) {
    return json_({ success: false, message: error.message || String(error) });
  }
}

function routeWrite_(body) {
  const action = cleanText_(body.action);

  if (action === "addTeamRecord") return addTeamRecord_(body);
  if (action === "updateTeamRecord") return updateTeamRecord_(body);
  if (action === "deleteTeamRecord") return deleteTeamRecord_(body);

  // Existing dashboard editing actions are preserved.
  if (action === "adminUpdateStudent") return updateStudent_(body, true);
  if (action === "studentUpdateOwn") return updateStudent_(body, false);
  if (action === "updateCourses") return updateCourses_(body);

  throw new Error("Unknown write action.");
}

function addTeamRecord_(body) {
  const user = requireMember_(body.token);
  const sheetName = cleanText_(body.sheetName);
  const definition = getTeamSheetDefinition_(sheetName);
  const submittedRecord = body.record && typeof body.record === "object" ? body.record : {};
  const lock = LockService.getScriptLock();

  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet_(sheetName, definition.requiredHeaders);
    const headers = ensureHeaders_(sheet, definition.requiredHeaders);
    const idValue = cleanText_(submittedRecord[definition.idField]);

    if (!idValue) throw new Error(`${definition.idField} is required.`);
    if (findRowByField_(sheet, headers, definition.idField, idValue) !== -1) {
      throw new Error("A record with the same ID already exists.");
    }

    const safeRecord = {};
    headers.forEach((header) => {
      safeRecord[header] = sanitizeCell_(submittedRecord[header]);
    });

    safeRecord[definition.idField] = idValue;
    safeRecord.CREATED_BY = user.email;
    safeRecord.CREATED_AT = new Date();

    if (sheetName === "Gallery") {
      safeRecord.UPLOADED_BY = user.email;
    }

    if (sheetName === "Tasks") {
      if (!canCreateTask_(user)) {
        throw new Error("Only admins can create tasks.");
      }
      validateTaskStatus_(safeRecord.status || "Pending");
      safeRecord.createdBy = user.email;
      safeRecord.CREATED_BY = user.email;
    }

    if (sheetName === "Notifications") {
      if (user.role !== "admin") {
        throw new Error("Only admins can send task notifications.");
      }
    }

    if (sheetName === "TaskSubmissions") {
      var taskId = cleanText_(submittedRecord.taskId || submittedRecord.taskid);
      var taskMap = {};
      var rawTasks = listTeamRecords_("Tasks", { role: "admin" });
      rawTasks.forEach(function (t) {
        if (t.id) taskMap[cleanText_(t.id)] = t;
      });
      var parentTask = taskMap[taskId];
      if (!canCreateSubmission_(user, parentTask)) {
        throw new Error("You are not authorized to submit deliverables for this task.");
      }
      safeRecord.studentEmail = user.email;
      safeRecord.STUDENTEMAIL = user.email;
    }

    if (sheetName === "Certificates" && user.role !== "admin") {
      const enrolment = findMemberEnrolment_(user.email);
      if (!enrolment) throw new Error("Your enrolment number was not found in Sheet1.");
      safeRecord.ENROLMENT_NUMBER = enrolment;
    } else if (sheetName === "Certificates" && !safeRecord.ENROLMENT_NUMBER) {
      safeRecord.ENROLMENT_NUMBER = findMemberEnrolment_(user.email);
    }

    const row = headers.map((header) =>
      safeRecord[header] === undefined ? "" : safeRecord[header]
    );

    sheet.appendRow(row);
    SpreadsheetApp.flush();

    return {
      message: "Record added directly.",
      id: idValue,
      record: safeRecord,
    };
  } finally {
    lock.releaseLock();
  }
}

function validateTaskStatus_(status) {
  var norm = normalize_(status);
  var valid = ["pending", "in progress", "completed"];
  if (valid.indexOf(norm) === -1) {
    throw new Error("Invalid task status: '" + status + "'. Status must be Pending, In Progress, or Completed.");
  }
}

function updateTeamRecord_(body) {
  const user = requireMember_(body.token);
  const sheetName = cleanText_(body.sheetName);
  const definition = getTeamSheetDefinition_(sheetName);
  const idField = cleanText_(body.idField || definition.idField);
  const idValue = cleanText_(body.idValue);
  const submittedRecord = body.record && typeof body.record === "object" ? body.record : {};
  const lock = LockService.getScriptLock();

  if (idField !== definition.idField) throw new Error("Invalid ID field.");
  if (!idValue) throw new Error("Record ID is required.");

  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet_(sheetName, definition.requiredHeaders);
    const headers = ensureHeaders_(sheet, definition.requiredHeaders);
    const rowNumber = findRowByField_(sheet, headers, idField, idValue);

    if (rowNumber === -1) throw new Error("Record not found.");

    const currentRecord = getRecordFromRow_(sheet, headers, rowNumber);

    if (sheetName === "Tasks") {
      if (Object.prototype.hasOwnProperty.call(submittedRecord, "status")) {
        validateTaskStatus_(submittedRecord.status);
      }

      var statusChanged = Object.prototype.hasOwnProperty.call(submittedRecord, "status") &&
        normalize_(submittedRecord.status) !== normalize_(currentRecord.status);

      if (statusChanged) {
        if (!canChangeTaskStatus_(user, currentRecord, submittedRecord.status)) {
          throw new Error("You are not authorized to update the status of this task.");
        }
      }

      var adminFields = ["title", "domain", "description", "priority", "dueDate", "assignedEmails", "createdBy", "createdAt"];
      var adminModified = adminFields.some(function(f) {
        return Object.prototype.hasOwnProperty.call(submittedRecord, f) &&
          String(submittedRecord[f]) !== String(currentRecord[f]);
      });

      if (adminModified && !canEditTask_(user, currentRecord)) {
        throw new Error("Only admins can modify administrative task properties.");
      }
    } else if (sheetName === "TaskSubmissions") {
      if (!canEditSubmission_(user, currentRecord)) {
        throw new Error("You can edit only your own task submissions.");
      }
    } else if (sheetName === "Notifications") {
      if (!canMarkNotificationRead_(user, currentRecord)) {
        throw new Error("You can modify only your own notifications.");
      }
    } else {
      assertCanManageRecord_(user, currentRecord);
    }

    const currentValues = sheet
      .getRange(rowNumber, 1, 1, headers.length)
      .getValues()[0];

    headers.forEach((header, index) => {
      const normalizedHeader = normalize_(header);
      const isSystemField = [
        normalize_(definition.idField),
        normalize_("CREATED_BY"),
        normalize_("CREATED_AT"),
        normalize_("UPLOADED_BY"),
      ].includes(normalizedHeader);

      if (isSystemField) return;
      if (!Object.prototype.hasOwnProperty.call(submittedRecord, header)) return;

      // Force studentEmail in TaskSubmissions to remain authenticated user identity
      if (sheetName === "TaskSubmissions" && (normalizedHeader === "studentemail" || normalizedHeader === "student_email")) {
        currentValues[index] = user.email;
        return;
      }

      // A normal member cannot move a certificate to another student.
      if (
        sheetName === "Certificates" &&
        header === "ENROLMENT_NUMBER" &&
        user.role !== "admin"
      ) {
        currentValues[index] = findMemberEnrolment_(user.email);
        return;
      }

      currentValues[index] = sanitizeCell_(submittedRecord[header]);
    });

    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([currentValues]);
    SpreadsheetApp.flush();

    return {
      message: user.role === "admin"
        ? "Record updated by admin."
        : "Your record was updated.",
      id: idValue,
    };
  } finally {
    lock.releaseLock();
  }
}

function deleteTeamRecord_(body) {
  const user = requireMember_(body.token);
  const sheetName = cleanText_(body.sheetName);
  const definition = getTeamSheetDefinition_(sheetName);
  const idField = cleanText_(body.idField || definition.idField);
  const idValue = cleanText_(body.idValue);
  const lock = LockService.getScriptLock();

  if (idField !== definition.idField) throw new Error("Invalid ID field.");
  if (!idValue) throw new Error("Record ID is required.");

  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet_(sheetName, definition.requiredHeaders);
    const headers = ensureHeaders_(sheet, definition.requiredHeaders);
    const rowNumber = findRowByField_(sheet, headers, idField, idValue);

    if (rowNumber === -1) throw new Error("Record not found.");

    const currentRecord = getRecordFromRow_(sheet, headers, rowNumber);
    if (sheetName === "Tasks") {
      if (!canDeleteTask_(user, currentRecord)) {
        throw new Error("Only admins can delete tasks.");
      }
    } else {
      assertCanManageRecord_(user, currentRecord);
    }

    sheet.deleteRow(rowNumber);
    SpreadsheetApp.flush();

    return {
      message: user.role === "admin"
        ? `Record deleted by admin ${user.email}.`
        : "Your record was deleted.",
    };
  } finally {
    lock.releaseLock();
  }
}

function listTeamRecords_(sheetName, user) {
  const definition = getTeamSheetDefinition_(sheetName);
  const sheet = getOrCreateSheet_(sheetName, definition.requiredHeaders);
  const headers = ensureHeaders_(sheet, definition.requiredHeaders);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const values = sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getDisplayValues();

  const allRecords = values
    .filter((row) => row.some((value) => String(value).trim() !== ""))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || "";
      });
      return record;
    })
    .reverse();

  if (!user || user.role === "admin") {
    return allRecords;
  }

  if (sheetName === "Tasks") {
    return allRecords.filter(function (t) {
      return canViewTask_(user, t);
    });
  }

  if (sheetName === "TaskSubmissions") {
    var taskMap = {};
    var rawTasks = listTeamRecords_("Tasks", { role: "admin" });
    rawTasks.forEach(function (t) {
      if (t.id) taskMap[cleanText_(t.id)] = t;
    });
    return allRecords.filter(function (s) {
      return canViewSubmission_(user, s, taskMap);
    });
  }

  if (sheetName === "Notifications") {
    return allRecords.filter(function (n) {
      return canViewNotification_(user, n);
    });
  }

  return allRecords;
}

function parseAssignedEmails_(raw) {
  if (!raw) return [];
  var text = String(raw).trim();
  if (text.indexOf("[") === 0) {
    try {
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(normalize_).filter(Boolean);
      }
    } catch (e) {
      // Fall through to regex extraction
    }
  }

  var matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (matches && matches.length > 0) {
    var set = {};
    matches.forEach(function (m) {
      set[normalize_(m)] = true;
    });
    return Object.keys(set);
  }

  return text
    .split(/[\s,;]+/)
    .map(normalize_)
    .filter(Boolean);
}

function canViewTask_(user, task) {
  if (!user) return false;
  if (user.role === "admin") return true;

  var status = normalize_(task.status);
  if (status === "completed") return true;

  return isUserAssignedToTaskBackend_(user, task);
}

function canCreateTask_(user) {
  return Boolean(user && user.role === "admin");
}

function canEditTask_(user, task) {
  return Boolean(user && user.role === "admin");
}

function canDeleteTask_(user, task) {
  return Boolean(user && user.role === "admin");
}

function canChangeTaskStatus_(user, task, newStatus) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return isUserAssignedToTaskBackend_(user, task);
}

function canViewSubmission_(user, submission, taskMap) {
  if (!user) return false;
  if (user.role === "admin") return true;

  var userEmail = normalize_(user.email);
  var studentEmail = normalize_(submission.studentEmail || submission.studentemail);
  if (studentEmail && studentEmail === userEmail) return true;

  var taskId = cleanText_(submission.taskId || submission.taskid);
  if (taskId && taskMap && taskMap[taskId]) {
    var parentTask = taskMap[taskId];
    var status = normalize_(parentTask.status);
    if (status === "completed") return true;
  }

  return false;
}

function canCreateSubmission_(user, parentTask) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return parentTask ? isUserAssignedToTaskBackend_(user, parentTask) : false;
}

function canEditSubmission_(user, submission) {
  if (!user) return false;
  if (user.role === "admin") return true;
  var studentEmail = normalize_(submission.studentEmail || submission.studentemail);
  return studentEmail === normalize_(user.email);
}

function canViewNotification_(user, notification) {
  if (!user) return false;
  if (user.role === "admin") return true;
  var target = normalize_(notification.targetEmail || notification.targetemail);
  return target === normalize_(user.email);
}

function canMarkNotificationRead_(user, notification) {
  if (!user) return false;
  if (user.role === "admin") return true;
  var target = normalize_(notification.targetEmail || notification.targetemail);
  return target === normalize_(user.email);
}

function isUserAssignedToTaskBackend_(user, task) {
  if (!user || !task) return false;
  var userEmail = normalize_(user.email);
  var assigned = parseAssignedEmails_(task.assignedEmails);
  if (assigned.indexOf(userEmail) !== -1) return true;

  var aliases = getStudentEmailAliases_(user.email);
  for (var i = 0; i < aliases.length; i++) {
    if (assigned.indexOf(normalize_(aliases[i])) !== -1) return true;
  }
  return false;
}

function getStudentEmailAliases_(userEmail) {
  var clean = normalize_(userEmail);
  if (!clean) return [];
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName("Sheet1");
  if (!sheet) return [clean];

  var headers = getHeaders_(sheet);
  var mailIndexes = [];
  headers.forEach(function (h, idx) {
    var norm = normalize_(h);
    if (norm.indexOf("mail") !== -1 || norm.indexOf("email") !== -1) {
      mailIndexes.push(idx);
    }
  });

  if (mailIndexes.length === 0 || sheet.getLastRow() < 2) return [clean];

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
  var foundRow = null;
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    for (var m = 0; m < mailIndexes.length; m++) {
      if (normalize_(row[mailIndexes[m]]) === clean) {
        foundRow = row;
        break;
      }
    }
    if (foundRow) break;
  }

  if (!foundRow) return [clean];

  var aliases = [];
  mailIndexes.forEach(function (idx) {
    var val = normalize_(foundRow[idx]);
    if (val && val.indexOf("@") !== -1 && aliases.indexOf(val) === -1) {
      aliases.push(val);
    }
  });

  return aliases.length > 0 ? aliases : [clean];
}

function assertCanManageRecord_(user, record) {
  if (user.role === "admin") return;

  const owner = normalize_(
    record.CREATED_BY ||
      record.createdBy ||
      record.targetEmail ||
      record.TARGETEMAIL ||
      record.studentEmail ||
      record.STUDENTEMAIL
  );
  if (!owner || owner !== normalize_(user.email)) {
    throw new Error("You can edit or delete only records that you added.");
  }
}

function getRecordFromRow_(sheet, headers, rowNumber) {
  const values = sheet
    .getRange(rowNumber, 1, 1, headers.length)
    .getDisplayValues()[0];
  const record = {};

  headers.forEach((header, index) => {
    record[header] = values[index] || "";
  });

  return record;
}

function updateStudent_(body, adminOnly) {
  const user = adminOnly ? requireAdmin_(body.token) : requireMember_(body.token);
  const payload = body.payload || {};
  const enrolment = cleanText_(payload["ENROLMENT NUMBER"]);
  if (!enrolment) throw new Error("ENROLMENT NUMBER is required.");

  if (!adminOnly) {
    const ownedEnrolment = findMemberEnrolment_(user.email);
    if (!ownedEnrolment || normalize_(ownedEnrolment) !== normalize_(enrolment)) {
      throw new Error("Students can update only their own record.");
    }
  }

  const sheet = getSpreadsheet_().getSheetByName("Sheet1");
  if (!sheet) throw new Error("Sheet1 was not found.");

  const headers = getHeaders_(sheet);
  const enrolmentColumn = findHeaderIndex_(headers, ["ENROLMENT NUMBER"]);
  if (enrolmentColumn === -1) throw new Error("ENROLMENT NUMBER column was not found.");

  const rowNumber = findRowByColumnValue_(sheet, enrolmentColumn + 1, enrolment);
  if (rowNumber === -1) throw new Error("Student record was not found.");

  const studentAllowed = ["LINKEDIN", "GITHUB", "ACTIVITY POINT", "REWARD POINT"];
  const adminAllowed = [...studentAllowed, "Name", "POSITION", "CLUSTER", "JOINED"];
  const allowed = adminOnly ? adminAllowed : studentAllowed;

  allowed.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) return;
    const columnIndex = headers.findIndex(
      (header) => normalize_(header) === normalize_(field)
    );
    if (columnIndex !== -1) {
      sheet
        .getRange(rowNumber, columnIndex + 1)
        .setValue(sanitizeCell_(payload[field]));
    }
  });

  SpreadsheetApp.flush();
  return { message: "Student record updated." };
}

function updateCourses_(body) {
  const user = requireMember_(body.token);
  const payload = body.payload || {};
  const enrolment = cleanText_(payload["ENROLMENT NUMBER"]);
  const studentName = cleanText_(payload.studentName);
  const updates = payload.COURSE_UPDATES || {};

  if (!studentName) throw new Error("Student name is required.");

  if (user.role !== "admin") {
    const ownedEnrolment = findMemberEnrolment_(user.email);
    if (!ownedEnrolment || normalize_(ownedEnrolment) !== normalize_(enrolment)) {
      throw new Error("Students can update only their own courses.");
    }
  }

  const sheet = getSpreadsheet_().getSheetByName("Courses");
  if (!sheet) throw new Error("Courses sheet was not found.");

  const headers = getHeaders_(sheet);
  const studentColumn = headers.findIndex(
    (header) => normalize_(header) === normalize_(studentName)
  );
  if (studentColumn === -1) throw new Error("Student column was not found in Courses.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { message: "No courses to update." };

  const courseNames = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues()
    .flat();

  Object.keys(updates).forEach((courseName) => {
    const index = courseNames.findIndex(
      (name) => normalize_(name) === normalize_(courseName)
    );
    if (index !== -1) {
      sheet
        .getRange(index + 2, studentColumn + 1)
        .setValue(sanitizeCell_(updates[courseName]));
    }
  });

  SpreadsheetApp.flush();
  return { message: "Courses updated." };
}

function requireMember_(token) {
  const identity = verifyFirebaseToken_(token);
  const email = normalize_(identity.email);
  const role = isAdminEmail_(email)
    ? "admin"
    : isRegisteredMemberEmail_(email)
      ? "student"
      : "public";

  if (role === "public") {
    throw new Error("This private section is available only to registered group members.");
  }

  return { email, role };
}

function requireAdmin_(token) {
  const user = requireMember_(token);
  if (user.role !== "admin") throw new Error("Only admins can perform this action.");
  return user;
}

function verifyFirebaseToken_(token) {
  const cleanToken = cleanText_(token);
  if (!cleanToken) throw new Error("Authentication token is missing. Sign in again.");

  const url =
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
    encodeURIComponent(CONFIG.FIREBASE_WEB_API_KEY);

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ idToken: cleanToken }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const data = JSON.parse(response.getContentText() || "{}");

  if (status < 200 || status >= 300 || !data.users || !data.users.length) {
    throw new Error("Google sign-in could not be verified. Please sign in again.");
  }

  return {
    email: data.users[0].email || "",
    localId: data.users[0].localId || "",
  };
}

function isRegisteredMemberEmail_(email) {
  const sheet = getSpreadsheet_().getSheetByName("Sheet1");
  if (!sheet || sheet.getLastRow() < 2) return false;

  const headers = getHeaders_(sheet);
  const emailHeaderNames = ["PERSONAL MAIL", "BIT MAIL", "PERSONAL_MAIL", "BIT_MAIL"];
  const indexes = headers
    .map((header, index) =>
      emailHeaderNames.some((name) => normalize_(header) === normalize_(name))
        ? index
        : -1
    )
    .filter((index) => index !== -1);

  if (!indexes.length) return false;

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getDisplayValues();

  return values.some((row) =>
    indexes.some((index) => normalize_(row[index]) === email)
  );
}

function findMemberEnrolment_(email) {
  const sheet = getSpreadsheet_().getSheetByName("Sheet1");
  if (!sheet || sheet.getLastRow() < 2) return "";

  const headers = getHeaders_(sheet);
  const enrolmentIndex = findHeaderIndex_(headers, ["ENROLMENT NUMBER"]);
  const emailIndexes = headers
    .map((header, index) =>
      ["PERSONAL MAIL", "BIT MAIL", "PERSONAL_MAIL", "BIT_MAIL"].some(
        (name) => normalize_(header) === normalize_(name)
      )
        ? index
        : -1
    )
    .filter((index) => index !== -1);

  if (enrolmentIndex === -1 || !emailIndexes.length) return "";

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getDisplayValues();

  const row = values.find((record) =>
    emailIndexes.some(
      (index) => normalize_(record[index]) === normalize_(email)
    )
  );

  return row ? cleanText_(row[enrolmentIndex]) : "";
}

function isAdminEmail_(email) {
  return CONFIG.ADMIN_EMAILS.map(normalize_).indexOf(normalize_(email)) !== -1;
}

function getTeamSheetDefinition_(sheetName) {
  const definition = CONFIG.TEAM_SHEETS[sheetName];
  if (!definition) throw new Error("Invalid team sheet name.");
  return definition;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, requiredHeaders) {
  let headers = getHeaders_(sheet);

  if (!headers.length || headers.every((header) => !header)) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
    return requiredHeaders.slice();
  }

  requiredHeaders.forEach((requiredHeader) => {
    if (!headers.some((header) => normalize_(header) === normalize_(requiredHeader))) {
      headers.push(requiredHeader);
      sheet.getRange(1, headers.length).setValue(requiredHeader);
    }
  });

  sheet.setFrozenRows(1);
  return getHeaders_(sheet);
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(cleanText_);
}

function findHeaderIndex_(headers, possibleNames) {
  return headers.findIndex((header) =>
    possibleNames.some((name) => normalize_(header) === normalize_(name))
  );
}

function findRowByField_(sheet, headers, fieldName, value) {
  const index = headers.findIndex(
    (header) => normalize_(header) === normalize_(fieldName)
  );
  if (index === -1 || sheet.getLastRow() < 2) return -1;
  return findRowByColumnValue_(sheet, index + 1, value);
}

function findRowByColumnValue_(sheet, columnNumber, value) {
  if (sheet.getLastRow() < 2) return -1;
  const values = sheet
    .getRange(2, columnNumber, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .flat();
  const index = values.findIndex(
    (item) => normalize_(item) === normalize_(value)
  );
  return index === -1 ? -1 : index + 2;
}

function sanitizeCell_(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  // Prevent spreadsheet formula injection from submitted text.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function cleanText_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalize_(value) {
  return cleanText_(value).toLowerCase().replace(/\s+/g, " ");
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run once manually after replacing Code.gs.
 * Creates missing tabs and appends missing headers without deleting data.
 */
function setupTeamSheets() {
  Object.keys(CONFIG.TEAM_SHEETS).forEach((sheetName) => {
    const definition = CONFIG.TEAM_SHEETS[sheetName];
    const sheet = getOrCreateSheet_(sheetName, definition.requiredHeaders);
    ensureHeaders_(sheet, definition.requiredHeaders);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });
}

/**
 * Run once manually after adding the script.external_request OAuth scope.
 * A 400 response is expected because the token is intentionally fake.
 * The purpose is only to make Google request the external-request permission.
 */
function authorizeFirebaseVerification() {
  const url =
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
    encodeURIComponent(CONFIG.FIREBASE_WEB_API_KEY);

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ idToken: "permission-check" }),
    muteHttpExceptions: true,
  });

  console.log(
    "External request permission granted. Test response code: " +
      response.getResponseCode()
  );
}

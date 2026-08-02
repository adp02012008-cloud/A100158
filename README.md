# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

------------------------------------------------------------------------------------------

const SHEET_ID = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc";

function cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader("Access-Control-Allow-Origin", "*");
}

function ok(data) {
  return cors(ContentService.createTextOutput(JSON.stringify({ success: true, ...data })));
}

function err(msg) {
  return cors(ContentService.createTextOutput(JSON.stringify({ error: msg })));
}

function normalizeStr(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "").trim();
}

function isEmptyValue(val) {
  var x = String(val || "").trim().toUpperCase();
  return x === "" || x === "NULL" || x === "NIL" || x === "NUL" || x === "-" || x === "NA";
}

function doGet(e) {
  try {
    var raw    = e.parameter.data;
    var body   = raw ? JSON.parse(raw) : {};
    var action = body.action || e.parameter.action || "";
    switch (action) {
      case "adminUpdateStudent": return adminUpdateStudent(body);
      case "studentUpdateOwn":  return studentUpdateOwn(body);
      case "updateCourses":     return updateCourses(body);
      default: return err("Unknown action: " + action);
    }
  } catch (ex) {
    return err("Script error: " + ex.message);
  }
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents || "{}");
    var action = body.action || "";
    switch (action) {
      case "adminUpdateStudent": return adminUpdateStudent(body);
      case "studentUpdateOwn":  return studentUpdateOwn(body);
      case "updateCourses":     return updateCourses(body);
      default: return err("Unknown action: " + action);
    }
  } catch (ex) {
    return err("Script error: " + ex.message);
  }
}

var ADMIN_EMAILS = [
  "dhashaprakasha.cs25@bitsathy.ac.in",
  "harishkarthikkbs.ad25@bitsathy.ac.in",
  "adp02012008@gmail.com",
];

function isAdmin(email) {
  var clean = (email || "").toLowerCase();
  for (var i = 0; i < ADMIN_EMAILS.length; i++) {
    if (ADMIN_EMAILS[i].toLowerCase() === clean) return true;
  }
  return false;
}

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function getHeaderRow(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function findStudentRow(sheet, enrolment) {
  var data     = sheet.getDataRange().getValues();
  var headers  = data[0];
  var enrolIdx = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).toUpperCase().replace(/\s+/g, " ").trim() === "ENROLMENT NUMBER") {
      enrolIdx = h; break;
    }
  }
  if (enrolIdx === -1) return -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][enrolIdx]).trim() === String(enrolment).trim()) return i + 1;
  }
  return -1;
}

function updateCell(sheet, rowNum, headers, colName, value) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toUpperCase().trim() === colName.toUpperCase().trim()) {
      sheet.getRange(rowNum, i + 1).setValue(value); break;
    }
  }
}

function adminUpdateStudent(body) {
  if (!isAdmin(body.requesterEmail)) return err("Unauthorized");
  var sheet   = getSheet("Sheet1");
  var payload = body.payload || {};
  var enrol   = payload["ENROLMENT NUMBER"];
  if (!enrol) return err("Missing ENROLMENT NUMBER");
  var rowNum = findStudentRow(sheet, enrol);
  if (rowNum === -1) return err("Student not found");
  var headers = getHeaderRow(sheet);
  var fields  = [
    ["LINKEDIN",       payload.LINKEDIN],
    ["GITHUB",         payload.GITHUB],
    ["ACTIVITY POINT", payload["ACTIVITY POINT"]],
    ["REWARD POINT",   payload["REWARD POINT"]],
    ["NAME",           payload.Name],
    ["POSITION",       payload.POSITION],
    ["CLUSTER",        payload.CLUSTER],
    ["JOINED",         payload.JOINED],
  ];
  for (var i = 0; i < fields.length; i++) {
    if (fields[i][1] !== undefined && fields[i][1] !== null && fields[i][1] !== "") {
      updateCell(sheet, rowNum, headers, fields[i][0], fields[i][1]);
    }
  }
  return ok({ message: "Student updated" });
}

function studentUpdateOwn(body) {
  var sheet   = getSheet("Sheet1");
  var payload = body.payload || {};
  var enrol   = payload["ENROLMENT NUMBER"];
  if (!enrol) return err("Missing ENROLMENT NUMBER");
  var rowNum = findStudentRow(sheet, enrol);
  if (rowNum === -1) return err("Student not found");
  var headers = getHeaderRow(sheet);
  var fields  = [
    ["LINKEDIN",       payload.LINKEDIN],
    ["GITHUB",         payload.GITHUB],
    ["ACTIVITY POINT", payload["ACTIVITY POINT"]],
    ["REWARD POINT",   payload["REWARD POINT"]],
  ];
  for (var i = 0; i < fields.length; i++) {
    if (fields[i][1] !== undefined && fields[i][1] !== null && fields[i][1] !== "") {
      updateCell(sheet, rowNum, headers, fields[i][0], fields[i][1]);
    }
  }
  return ok({ message: "Profile updated" });
}

function updateCourses(body) {
  var payload       = body.payload || {};
  var studentName   = String(payload.studentName || "").trim();
  var courseUpdates = payload.COURSE_UPDATES || {};

  if (!studentName) return err("Missing studentName");
  if (Object.keys(courseUpdates).length === 0) return ok({ message: "No course updates" });

  var courseSheet = getSheet("Courses");
  if (!courseSheet) return err("Courses sheet not found");

  var data    = courseSheet.getDataRange().getValues();
  var headers = data[0];

  var studentColIdx = -1;
  for (var c = 1; c < headers.length; c++) {
    if (normalizeStr(headers[c]) === normalizeStr(studentName)) {
      studentColIdx = c; break;
    }
  }
  if (studentColIdx === -1) return err("Student column not found: " + studentName);

  var keys = Object.keys(courseUpdates);
  for (var k = 0; k < keys.length; k++) {
    var courseName   = keys[k];
    var level        = courseUpdates[courseName];
    var courseRowIdx = -1;

    for (var r = 1; r < data.length; r++) {
      if (normalizeStr(data[r][0]) === normalizeStr(courseName)) {
        courseRowIdx = r; break;
      }
    }
    if (courseRowIdx === -1) continue;

    var cell          = courseSheet.getRange(courseRowIdx + 1, studentColIdx + 1);
    var existingRule  = cell.getDataValidation();
    var allowedValues = [];

    if (existingRule) {
      try {
        var criteria = existingRule.getCriteriaValues();
        if (criteria && criteria[0]) allowedValues = criteria[0];
      } catch(e) { allowedValues = []; }
    }

    var valueToWrite = isEmptyValue(level) ? "" : level;
    cell.clearDataValidations();
    cell.setValue(valueToWrite);

    if (valueToWrite !== "") {
      if (allowedValues.length > 0 && allowedValues.indexOf(valueToWrite) === -1) {
        allowedValues.push(valueToWrite);
      }
      if (allowedValues.length > 0) {
        var newRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(allowedValues, true)
          .setAllowInvalid(false)
          .build();
        cell.setDataValidation(newRule);
      } else if (existingRule) {
        cell.setDataValidation(existingRule);
      }
    } else {
      if (existingRule) cell.setDataValidation(existingRule);
    }
  }
  return ok({ message: "Courses updated for " + studentName });
}

import { User } from "../models/User.js";
import { isSuperAdminEmail } from "../config/adminEmails.js";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseTextToObjects(rawText) {
  const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Auto-detect tab-separated vs comma-separated
  const firstLine = lines[0];
  const isTabSeparated = firstLine.includes("\t");

  const parseLine = (line) => {
    if (isTabSeparated) {
      return line.split("\t").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
    } else {
      return parseCsvLine(line);
    }
  };

  const headers = parseLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      const cleanHeader = h.trim();
      if (cleanHeader) {
        obj[cleanHeader] = values[idx] !== undefined ? values[idx].trim() : "";
      }
    });
    results.push(obj);
  }
  return results;
}

/**
 * Fetches or parses Sheet data and updates ONLY rewardPoints for members and admins.
 * Matches primarily by Roll Number / Enrolment Number.
 * Does NOT touch name, position, cluster, activityPoints, courses, or any other field.
 */
export async function syncRewardPointsFromGoogleSheet(
  spreadsheetId = "1t5uHtrRMSXQkxrFRUudDpwuN23A6K61PhdrjDNZFaV8",
  tabName = "Sheet1",
  rawCsvData = null
) {
  let rows = [];

  if (rawCsvData && typeof rawCsvData === "string" && rawCsvData.trim().length > 0) {
    rows = parseTextToObjects(rawCsvData);
  } else {
    let cleanId = String(spreadsheetId).trim();
    if (cleanId.includes("spreadsheets/d/")) {
      const match = cleanId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) cleanId = match[1];
    }

    const endpoints = [
      `https://opensheet.elk.sh/${cleanId}/${encodeURIComponent(tabName)}`,
      `https://opensheet.elk.sh/${cleanId}/Sheet1`,
      `https://opensheet.elk.sh/${cleanId}/1`,
      `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv`,
      `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv`,
    ];

    let fetched = false;
    let fetchError = "";

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("json")) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              rows = data;
              fetched = true;
              break;
            }
          } else {
            const text = await res.text();
            if (text && !text.includes("<!DOCTYPE html>") && text.length > 10) {
              const parsed = parseTextToObjects(text);
              if (parsed.length > 0) {
                rows = parsed;
                fetched = true;
                break;
              }
            }
          }
        } else if (res.status === 401 || res.status === 403) {
          fetchError = `Google Sheet access restricted (HTTP ${res.status}). You can paste copied sheet cells directly in the Sync Modal!`;
        }
      } catch (e) {
        fetchError = e.message;
      }
    }

    if (!fetched && rows.length === 0) {
      throw new Error(fetchError || `Unable to fetch Google Sheet (${cleanId}).`);
    }
  }

  const activeUsers = await User.find({ status: "ACTIVE" }).exec();
  const updatedResults = [];

  for (const row of rows) {
    // 1. Identify Roll Number / Enrolment Number candidates from row
    const rollCandidate = (
      row["Roll No"] ||
      row["ROLL NO"] ||
      row["Roll Number"] ||
      row["ROLL NUMBER"] ||
      row["Roll"] ||
      row["ROLL"] ||
      row["Reg No"] ||
      row["REG NO"] ||
      row["Register No"] ||
      row["REGISTER NO"] ||
      row["ENROLMENT NUMBER"] ||
      row["ENROLMENT NO"] ||
      row["Enrolment Number"] ||
      row["enrolmentNumber"] ||
      row["Rollno"] ||
      row["rollno"] ||
      row["RollNo"] ||
      ""
    ).trim().toLowerCase();

    const emailCandidate = (row["EMAIL ID"] || row["EMAIL"] || row["Email"] || row["email"] || "").trim().toLowerCase();
    const bitEmailCandidate = (row["BIT EMAIL"] || row["BIT Email"] || "").trim().toLowerCase();
    const nameCandidate = (row["NAME"] || row["Name"] || row["name"] || "").trim().toLowerCase();

    // 2. Extract ONLY Reward Points column from row
    const rawRewardVal =
      row["REWARD POINT"] ??
      row["REWARD"] ??
      row["Reward Points"] ??
      row["Reward Point"] ??
      row["rewardPoints"] ??
      row["Reward"] ??
      row["Points"] ??
      row["PTS"];

    if (rawRewardVal === undefined || rawRewardVal === null || String(rawRewardVal).trim() === "") {
      continue;
    }

    const newRewardPoints = Number(String(rawRewardVal).replace(/[^0-9.-]/g, ""));
    if (isNaN(newRewardPoints)) continue;

    // 3. Find matching member/admin in MongoDB strictly matching Roll Number / Enrolment Number first
    const targetUser = activeUsers.find((u) => {
      if (isSuperAdminEmail(u.email)) return false; // Skip super admin

      const uEnrol = (u.enrolmentNumber || "").trim().toLowerCase();
      const uUserId = (u.userId || "").trim().toLowerCase();
      const uEmail = (u.email || "").trim().toLowerCase();
      const uBit = (u.bitEmail || "").trim().toLowerCase();
      const uPersonal = (u.personalEmail || "").trim().toLowerCase();
      const uName = (u.name || "").trim().toLowerCase();

      // Priority 1: Match Roll Number / Enrolment Number
      if (rollCandidate) {
        if (uEnrol && (uEnrol === rollCandidate || uEnrol.includes(rollCandidate) || rollCandidate.includes(uEnrol))) return true;
        if (uUserId && (uUserId === rollCandidate || uUserId.includes(rollCandidate) || rollCandidate.includes(uUserId))) return true;
        if (uEmail && uEmail.startsWith(rollCandidate)) return true;
        if (uBit && uBit.startsWith(rollCandidate)) return true;
      }

      // Priority 2: Match Email ID
      if (emailCandidate && (uEmail === emailCandidate || uBit === emailCandidate || uPersonal === emailCandidate)) return true;
      if (bitEmailCandidate && (uEmail === bitEmailCandidate || uBit === bitEmailCandidate)) return true;

      // Priority 3: Match Name
      if (nameCandidate && uName === nameCandidate) return true;

      return false;
    });

    if (targetUser) {
      // Update ONLY rewardPoints - nothing else!
      targetUser.rewardPoints = newRewardPoints;
      await targetUser.save();
      updatedResults.push({
        userId: targetUser._id,
        name: targetUser.name,
        enrolmentNumber: targetUser.enrolmentNumber || targetUser.userId || "",
        email: targetUser.email,
        rewardPoints: newRewardPoints,
      });
    }
  }

  return {
    success: true,
    totalRows: rows.length,
    updatedCount: updatedResults.length,
    updatedUsers: updatedResults,
  };
}

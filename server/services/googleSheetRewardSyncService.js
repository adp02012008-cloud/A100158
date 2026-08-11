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

function parseCsvToObjects(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
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
 * Fetches Google Sheet data and updates ONLY rewardPoints for team members and admins.
 * Does NOT touch name, position, cluster, activityPoints, courses, or any other field.
 */
export async function syncRewardPointsFromGoogleSheet(
  spreadsheetId = "1t5uHtrRMSXQkxrFRUudDpwuN23A6K61PhdrjDNZFaV8",
  tabName = "Sheet1",
  rawCsvData = null
) {
  let rows = [];

  if (rawCsvData && typeof rawCsvData === "string" && rawCsvData.trim().length > 0) {
    rows = parseCsvToObjects(rawCsvData);
  } else {
    const cleanId = String(spreadsheetId).trim();
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
              const parsed = parseCsvToObjects(text);
              if (parsed.length > 0) {
                rows = parsed;
                fetched = true;
                break;
              }
            }
          }
        } else if (res.status === 401 || res.status === 403) {
          fetchError = `Google Sheet access restricted (HTTP ${res.status}). Please set sharing permission to "Anyone with the link can view" or use File -> Share -> Publish to Web.`;
        }
      } catch (e) {
        fetchError = e.message;
      }
    }

    if (!fetched && rows.length === 0) {
      throw new Error(fetchError || `Unable to fetch Google Sheet (${cleanId}). Please verify sheet sharing permissions.`);
    }
  }

  const activeUsers = await User.find({ status: "ACTIVE" }).exec();
  const updatedResults = [];

  for (const row of rows) {
    // Determine user identifier candidates from row
    const emailCandidate = (row["EMAIL ID"] || row["EMAIL"] || row["Email"] || row["email"] || "").trim().toLowerCase();
    const bitEmailCandidate = (row["BIT EMAIL"] || row["BIT Email"] || "").trim().toLowerCase();
    const enrolmentCandidate = (row["ENROLMENT NUMBER"] || row["ENROLMENT NO"] || row["Enrolment Number"] || row["enrolmentNumber"] || "").trim().toLowerCase();
    const nameCandidate = (row["NAME"] || row["Name"] || row["name"] || "").trim().toLowerCase();

    // Find ONLY Reward Points column from row
    const rawRewardVal =
      row["REWARD POINT"] ??
      row["REWARD"] ??
      row["Reward Points"] ??
      row["Reward Point"] ??
      row["rewardPoints"] ??
      row["Reward"];

    if (rawRewardVal === undefined || rawRewardVal === null || String(rawRewardVal).trim() === "") {
      continue;
    }

    const newRewardPoints = Number(rawRewardVal);
    if (isNaN(newRewardPoints)) continue;

    // Find matching member/admin in MongoDB
    const targetUser = activeUsers.find((u) => {
      if (isSuperAdminEmail(u.email)) return false; // Skip super admin
      const uEmail = (u.email || "").toLowerCase();
      const uBit = (u.bitEmail || "").toLowerCase();
      const uPersonal = (u.personalEmail || "").toLowerCase();
      const uEnrol = (u.enrolmentNumber || u.userId || "").toLowerCase();
      const uName = (u.name || "").toLowerCase();

      if (emailCandidate && (uEmail === emailCandidate || uBit === emailCandidate || uPersonal === emailCandidate)) return true;
      if (bitEmailCandidate && (uEmail === bitEmailCandidate || uBit === bitEmailCandidate)) return true;
      if (enrolmentCandidate && uEnrol === enrolmentCandidate) return true;
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

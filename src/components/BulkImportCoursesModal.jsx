// src/components/BulkImportCoursesModal.jsx
import { useState } from "react";
import { apiFetch } from "../utils/api";

const SAMPLE_JSON_TEMPLATE = [
  {
    courseId: "CRS-REACT-101",
    name: "React Fundamentals",
    category: "Web Development",
    description: "Master JSX, Components, Hooks, and State Management.",
    clusterAccess: "Both",
    prerequisites: ["HTML & CSS"],
    status: "ACTIVE"
  },
  {
    courseId: "CRS-NODE-201",
    name: "Advanced Node.js & Express",
    category: "Backend",
    description: "REST APIs, Authentication, Mongoose, and Performance.",
    clusterAccess: "Cluster A",
    prerequisites: ["React Fundamentals"],
    status: "ACTIVE"
  }
];

const SAMPLE_CSV_TEMPLATE = `Course Name,Course ID,Category,Description,Cluster Access,Prerequisites,Status
React Fundamentals,CRS-REACT-101,Web Development,"Master JSX, Components, Hooks, and State Management.",Both,HTML & CSS,ACTIVE
Advanced Node.js & Express,CRS-NODE-201,Backend,"REST APIs, Authentication, Mongoose, and Performance.",Cluster A,React Fundamentals,ACTIVE`;

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : "";
    });
    results.push(rowObj);
  }

  return results;
}

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ""));
  return result;
}

export default function BulkImportCoursesModal({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("file"); // 'file' | 'text' | 'help'
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState(null);
  const [parsedCourses, setParsedCourses] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setError("");
    setResultMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let parsed = [];
        if (selected.name.endsWith(".json")) {
          parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            throw new Error("JSON file must contain an array of course objects.");
          }
        } else if (selected.name.endsWith(".csv")) {
          parsed = parseCSV(text);
        } else {
          // Try JSON first, fallback to CSV
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = parseCSV(text);
          }
        }

        if (parsed.length === 0) {
          throw new Error("No valid courses found in file.");
        }
        setParsedCourses(parsed);
      } catch (err) {
        setError("Failed to parse file: " + err.message);
        setParsedCourses([]);
      }
    };
    reader.readAsText(selected);
  };

  const handleTextParse = () => {
    setError("");
    setResultMsg("");
    if (!rawText.trim()) {
      setError("Please paste JSON or CSV text first.");
      return;
    }

    try {
      let parsed = [];
      const trimmed = rawText.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) parsed = [parsed];
      } else {
        parsed = parseCSV(trimmed);
      }

      if (parsed.length === 0) {
        throw new Error("No valid course rows detected.");
      }

      setParsedCourses(parsed);
    } catch (err) {
      setError("Parsing error: " + err.message);
      setParsedCourses([]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedCourses.length === 0) {
      setError("No courses to import.");
      return;
    }

    setImporting(true);
    setError("");
    setResultMsg("");

    try {
      const res = await apiFetch("/courses/bulk-import", {
        method: "POST",
        body: JSON.stringify({ courses: parsedCourses }),
      });

      if (res?.success) {
        setResultMsg(`🎉 ${res.message}`);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setError(res?.message || "Bulk import failed.");
      }
    } catch (err) {
      setError("Import Error: " + (err.message || "Failed to process bulk import"));
    } finally {
      setImporting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Template copied to clipboard!");
  };

  const downloadSampleJSON = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_courses_template.json";
    a.click();
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_courses_template.csv";
    a.click();
  };

  return (
    <div className="modal" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-box edit-modal-box"
        style={{
          maxWidth: "760px",
          width: "95%",
          padding: "26px",
          borderRadius: "18px",
          background: "#120b24",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          color: "#f8fafc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose} style={{ top: "20px", right: "20px" }}>
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: "20px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>📤</span> Bulk Import &amp; Overwrite Courses
          </h3>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0 0", lineHeight: "1.5" }}>
            Upload a JSON or CSV file to import 50+ courses directly into MongoDB Atlas.
          </p>
        </div>

        {/* Notice Banner */}
        <div
          style={{
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px",
            fontSize: "13px",
            color: "#93c5fd",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "16px" }}>⚡</span>
          <div>
            <strong>Automatic Overwrite Enabled:</strong> If a course name or Course ID already exists in your site,
            it will be <strong>overwritten with the new version</strong> in MongoDB Atlas automatically.
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
          <button
            type="button"
            className={`btn ${activeTab === "file" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("file")}
            style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px" }}
          >
            📁 Upload File (.json / .csv)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "text" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("text")}
            style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px" }}
          >
            📋 Paste Raw JSON / CSV
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "help" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("help")}
            style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", marginLeft: "auto" }}
          >
            📖 Formatting Instructions
          </button>
        </div>

        {/* TAB 1: FILE UPLOAD */}
        {activeTab === "file" && (
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                border: "2px dashed rgba(255, 255, 255, 0.2)",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.03)",
                cursor: "pointer",
                transition: "border-color 0.2s ease",
              }}
            >
              <span style={{ fontSize: "32px", marginBottom: "8px" }}>📄</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>
                {file ? file.name : "Click to select or drag & drop .JSON or .CSV file"}
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                Supports standard JSON arrays or CSV files
              </span>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {/* TAB 2: PASTE TEXT */}
        {activeTab === "text" && (
          <div style={{ marginBottom: "20px" }}>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste JSON array or CSV content here..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#0a0618",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                fontSize: "12.5px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
            <button
              type="button"
              className="btn secondary"
              onClick={handleTextParse}
              style={{ marginTop: "10px", fontSize: "12.5px", padding: "6px 14px" }}
            >
              🔍 Parse Text
            </button>
          </div>
        )}

        {/* TAB 3: HELP / INSTRUCTIONS */}
        {activeTab === "help" && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              fontSize: "13px",
              maxHeight: "280px",
              overflowY: "auto",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#a7f3d0", fontSize: "15px" }}>
              📌 File &amp; Header Formatting Rules
            </h4>
            <p style={{ margin: "0 0 10px 0", color: "#cbd5e1", lineHeight: "1.5" }}>
              Your CSV or JSON file can contain the following fields for each course:
            </p>
            <ul style={{ paddingLeft: "20px", margin: "0 0 14px 0", color: "#e2e8f0", lineHeight: "1.6" }}>
              <li><strong>Course Name</strong> (or <code>name</code>) — <em>Required</em>. Unique course title.</li>
              <li><strong>Course ID</strong> (or <code>courseId</code>) — <em>Optional</em>. Unique ID (e.g., <code>CRS-REACT-101</code>). Auto-generated if blank.</li>
              <li><strong>Category</strong> (or <code>category</code>) — <em>Optional</em>. Field/Domain (e.g., <code>Web Dev</code>, <code>Data Science</code>).</li>
              <li><strong>Description</strong> (or <code>description</code>) — <em>Optional</em>. Course summary.</li>
              <li><strong>Cluster Access</strong> (or <code>clusterAccess</code>) — <em>Optional</em>. <code>Cluster A</code>, <code>Cluster B</code>, or <code>Both</code>.</li>
              <li><strong>Prerequisites</strong> (or <code>prerequisites</code>) — <em>Optional</em>. Comma-separated prior courses.</li>
              <li><strong>Status</strong> (or <code>status</code>) — <em>Optional</em>. <code>ACTIVE</code> or <code>INACTIVE</code>.</li>
            </ul>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={downloadSampleJSON}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                ⬇️ Download Sample JSON
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={downloadSampleCSV}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                ⬇️ Download Sample CSV
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => copyToClipboard(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2))}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                📋 Copy Sample JSON
              </button>
            </div>
          </div>
        )}

        {/* PARSED PREVIEW SUMMARY */}
        {parsedCourses.length > 0 && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontWeight: "700", color: "#6ee7b7", fontSize: "14px", marginBottom: "6px" }}>
              ✅ Ready to Import: {parsedCourses.length} Courses Detected
            </div>
            <div style={{ fontSize: "12.5px", color: "#cbd5e1" }}>
              <strong>Sample Courses:</strong>{" "}
              {parsedCourses
                .slice(0, 5)
                .map((c) => c.name || c["Course Name"] || c["courseName"])
                .filter(Boolean)
                .join(", ")}
              {parsedCourses.length > 5 ? ` ...and ${parsedCourses.length - 5} more.` : ""}
            </div>
          </div>
        )}

        {/* ERROR / SUCCESS ALERTS */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.18)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            ❌ {error}
          </div>
        )}

        {resultMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              color: "#a7f3d0",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "13.5px",
              fontWeight: "600",
            }}
          >
            {resultMsg}
          </div>
        )}

        {/* MODAL FOOTER ACTIONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={importing}
            style={{ fontSize: "13px", padding: "10px 18px", borderRadius: "10px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleExecuteImport}
            disabled={importing || parsedCourses.length === 0}
            style={{
              fontSize: "13px",
              padding: "10px 22px",
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: importing || parsedCourses.length === 0 ? "not-allowed" : "pointer",
              opacity: importing || parsedCourses.length === 0 ? 0.6 : 1,
            }}
          >
            {importing ? "Importing to MongoDB…" : `🚀 Import & Overwrite ${parsedCourses.length} Courses`}
          </button>
        </div>
      </div>
    </div>
  );
}

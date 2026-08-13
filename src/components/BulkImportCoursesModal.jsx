// src/components/BulkImportCoursesModal.jsx
import { useState } from "react";
import { apiFetch } from "../utils/api";

const SAMPLE_JSON_TEMPLATE = [
  {
    "Course Name": "Advanced Modelling & Simulation",
    "Level": "Level 0",
    "Course ID": "AMS-L0",
    "Category": "Advanced Modelling & Simulation",
    "Description": "Introduction to FEA, mathematical framework, meshing...",
    "Cluster Access": "Both",
    "Prerequisites": "",
    "Points": 100,
    "Status": "ACTIVE"
  },
  {
    "Course Name": "Advanced Modelling & Simulation",
    "Level": "Level 1",
    "Course ID": "AMS-L1",
    "Category": "Advanced Modelling & Simulation",
    "Description": "Thermal-structural analysis, material properties...",
    "Cluster Access": "Both",
    "Prerequisites": "Advanced Modelling & Simulation - Level 0",
    "Points": 300,
    "Status": "ACTIVE"
  },
  {
    "Course Name": "Algebra",
    "Level": "Level 0",
    "Course ID": "ALG-L0",
    "Category": "Algebra",
    "Description": "Variables, constants, algebraic expressions, exponents...",
    "Cluster Access": "Both",
    "Prerequisites": "",
    "Points": 100,
    "Status": "ACTIVE"
  }
];

const SAMPLE_CSV_TEMPLATE = `Course Name,Level,Course ID,Category,Description,Cluster Access,Prerequisites,Points,Status
Advanced Modelling & Simulation,Level 0,AMS-L0,Advanced Modelling & Simulation,"Introduction to FEA, meshing, elements...",Both,,100,ACTIVE
Advanced Modelling & Simulation,Level 1,AMS-L1,Advanced Modelling & Simulation,"Introduction to thermal-structural analysis...",Both,Advanced Modelling & Simulation - Level 0,300,ACTIVE
Algebra,Level 0,ALG-L0,Algebra,"Variables, constants, algebraic expressions...",Both,,100,ACTIVE
Algebra,Level 1,ALG-L1,Algebra,"Linear equations and inequalities...",Both,Algebra - Level 0,200,ACTIVE
Algebra,Level 2,ALG-L2,Algebra,"Polynomials, rational expressions...",Both,Algebra - Level 1,300,ACTIVE`;

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect delimiter: tab (\t) or comma (,)
  const delimiter = lines[0].includes("\t") ? "\t" : ",";

  const headers = parseCSVLine(lines[0], delimiter);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : "";
    });
    results.push(rowObj);
  }

  return results;
}

function parseCSVLine(line, delimiter = ",") {
  const result = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
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
            <strong>Level-Specific Import Enabled:</strong> Each course row (including the same course with different levels) will be imported as a <strong>distinct course</strong> into MongoDB Atlas.
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
              Your CSV, TSV, or JSON file should contain the following fields for each course level:
            </p>
            <ul style={{ paddingLeft: "20px", margin: "0 0 14px 0", color: "#e2e8f0", lineHeight: "1.6" }}>
              <li><strong>Course Name</strong> — <em>Required</em>. Main subject title (e.g., <code>Algebra</code>, <code>Advanced Modelling &amp; Simulation</code>).</li>
              <li><strong>Level</strong> — <em>Required</em>. Level code/name (e.g., <code>Level 0</code>, <code>Level 1</code>, <code>Level 1A</code>, <code>Level 2.0</code>).</li>
              <li><strong>Points</strong> — <em>Optional</em>. Points awarded for completing this level (e.g., <code>100</code>, <code>200</code>, <code>300</code>).</li>
              <li><strong>Course ID</strong> — <em>Optional</em>. Unique ID code (e.g., <code>AMS-L0</code>, <code>ALG-L0</code>). Auto-generated if blank.</li>
              <li><strong>Category</strong> — <em>Optional</em>. Subject category (e.g., <code>Algebra</code>, <code>Analog Electronics</code>).</li>
              <li><strong>Description</strong> — <em>Optional</em>. Course summary for this level.</li>
              <li><strong>Cluster Access</strong> — <em>Optional</em>. <code>Cluster A</code>, <code>Cluster B</code>, or <code>Both</code> (default).</li>
              <li><strong>Prerequisites</strong> — <em>Optional</em>. Prior course requirements.</li>
              <li><strong>Status</strong> — <em>Optional</em>. <code>ACTIVE</code> or <code>INACTIVE</code>.</li>
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
                .map((c) => {
                  const name = (c.name || c["Course Name"] || c["courseName"] || "").trim();
                  const lvl = (c.level || c["Level"] || c["levelName"] || "").trim();
                  if (lvl) {
                    const escapedLvl = lvl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    if (!new RegExp(`(?:-|–|_|\\s)\\s*${escapedLvl}`, "i").test(name)) {
                      return `${name} - ${lvl}`;
                    }
                  }
                  return name;
                })
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

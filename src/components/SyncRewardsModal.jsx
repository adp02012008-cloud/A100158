import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function SyncRewardsModal({ onClose, onSaved }) {
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1t5uHtrRMSXQkxrFRUudDpwuN23A6K61PhdrjDNZFaV8/edit?usp=sharing");
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [error, setError] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === "string") {
        setPastedText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSync = async () => {
    setLoading(true);
    setError("");
    setResultMessage(null);

    try {
      const payload = {};
      if (pastedText && pastedText.trim().length > 0) {
        payload.rawCsvData = pastedText.trim();
      } else if (sheetUrl && sheetUrl.trim().length > 0) {
        payload.spreadsheetId = sheetUrl.trim();
      } else {
        throw new Error("Please enter a Google Sheet URL or paste row data.");
      }

      const res = await apiFetch("/points/sync-sheet-rewards", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        setResultMessage(res.result || { updatedCount: res.result?.updatedCount || 0 });
        if (onSaved) onSaved();
      } else {
        setError(res?.message || "Failed to sync reward points.");
      }
    } catch (err) {
      console.error("Reward sync error:", err);
      setError(err.message || "Failed to sync reward points.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "620px", width: "90%", padding: "28px", borderRadius: "16px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            🎁 Sync Reward Points by Roll Number
          </h2>
          <button className="close-btn" onClick={onClose} style={{ fontSize: "24px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            ✕
          </button>
        </div>

        <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: 0, marginBottom: "20px" }}>
          Update <strong>Reward Points ONLY</strong> for team members and admins using their Roll Number / Enrolment Number. All other member details remain completely untouched.
        </p>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {resultMessage ? (
          <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", padding: "20px", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎉</div>
            <h3 style={{ margin: "0 0 8px 0", color: "#4ade80" }}>
              Successfully Updated {resultMessage.updatedCount} Members!
            </h3>
            <p style={{ color: "#cbd5e1", fontSize: "13px", margin: "0 0 16px 0" }}>
              Reward points have been updated in MongoDB. No other fields were modified.
            </p>
            {Array.isArray(resultMessage.updatedUsers) && resultMessage.updatedUsers.length > 0 && (
              <div style={{ maxHeight: "160px", overflowY: "auto", textAlign: "left", background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
                {resultMessage.updatedUsers.map((u, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
                    <span>{u.name} ({u.enrolmentNumber || u.email})</span>
                    <strong style={{ color: "#f59e0b" }}>{u.rewardPoints} pts</strong>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              style={{ marginTop: "20px", width: "100%", padding: "10px", borderRadius: "8px", background: "#22c55e", color: "#fff", border: "none", fontWeight: "600", cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            {/* OPTION 1: Paste Text from Google Sheets */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#f1f5f9" }}>
                Option 1: Paste Copied Sheet Rows / Text (Recommended)
              </label>
              <textarea
                placeholder="Select rows in Google Sheets, copy (Ctrl+C), and paste here...&#10;&#10;Example:&#10;Roll No&#tReward Points&#10;7376221CS101&#t50;&#10;7376221EI102&#t80;"
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* OPTION 2: Upload CSV File */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#f1f5f9" }}>
                Option 2: Or Upload Exported CSV File
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                style={{ width: "100%", fontSize: "13px", color: "#94a3b8" }}
              />
            </div>

            {/* OPTION 3: Google Sheet URL */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#f1f5f9" }}>
                Option 3: Or Direct Google Sheet URL
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{
                  width: "100%",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{ padding: "10px 18px", borderRadius: "8px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={loading}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "#fff",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {loading ? "⏳ Updating Rewards..." : "⚡ Update Reward Points"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

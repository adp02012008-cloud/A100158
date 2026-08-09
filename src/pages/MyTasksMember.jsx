// src/pages/MyTasksMember.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchSheetData } from "../utils/api";
import { isUserAssignedToTask, normalizeEmail } from "../utils/roles";
import {
  getReviews,
  getSubmissions,
  getTasks,
  saveSubmission,
} from "../utils/taskStorage";

export default function MyTasksMember({ search = "" }) {
  const { auth } = useAuth();
  const userEmail = normalizeEmail(auth.email || "");

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all");

  // Submission Modal State
  const [activeTask, setActiveTask] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Submitted");
  const [files, setFiles] = useState([]);
  const [submitForAll, setSubmitForAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, sList, rList, sheetStudents] = await Promise.all([
        getTasks(userEmail),
        getSubmissions(userEmail),
        getReviews(userEmail).catch(() => []),
        fetchSheetData("Sheet1").catch(() => []),
      ]);
      setTasks(tList || []);
      setSubmissions(sList || []);
      setReviews(rList || []);
      setStudents(Array.isArray(sheetStudents) ? sheetStudents : []);
    } catch (err) {
      console.error("Error loading member tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userEmail]);

  // Filter tasks assigned to current logged-in member
  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Admins see all tasks in Member View so they can test/review deliverables for any assigned member
      const isAdmin = auth.role === "admin";
      const isAssigned = isAdmin || isUserAssignedToTask(userEmail, t.assignedEmails, students);
      if (!isAssigned) return false;

      const matchSearch =
        !search ||
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.domain || "").toLowerCase().includes(search.toLowerCase());

      if (filterTab === "pending") return matchSearch && t.status !== "Completed";
      if (filterTab === "completed") return matchSearch && t.status === "Completed";
      return matchSearch;
    });
  }, [tasks, userEmail, students, auth.role, search, filterTab]);

  const openSubmitModal = (task) => {
    setActiveTask(task);
    // Prefill existing submission if any
    const existing = submissions.find((s) => s.taskId === task.id && normalizeEmail(s.studentEmail) === userEmail);
    if (existing) {
      setGithubUrl(existing.githubUrl || "");
      setDemoUrl(existing.demoUrl || "");
      setNotes(existing.notes || "");
      setStatus(existing.status || "Submitted");
      setFiles(existing.files || []);
      setSubmitForAll(existing.submissionType === "COLLABORATIVE");
    } else {
      setGithubUrl("");
      setDemoUrl("");
      setNotes("");
      setStatus("Submitted");
      setFiles([]);
      setSubmitForAll(task.submissionMode === "COLLABORATIVE");
    }
    setSubmitError("");
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: event.target.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDeliverable = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim() && !demoUrl.trim() && files.length === 0 && !notes.trim()) {
      setSubmitError("Please provide at least a GitHub link, demo link, photo/zip file, or notes.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await saveSubmission({
        taskId: activeTask.id,
        studentEmail: userEmail,
        studentName: auth.email ? auth.email.split("@")[0] : "Member",
        githubUrl: githubUrl.trim(),
        demoUrl: demoUrl.trim(),
        notes: notes.trim(),
        status,
        files,
        submitForAll,
      }, userEmail);

      setActiveTask(null);
      await loadData();
    } catch (err) {
      setSubmitError("Failed to submit deliverable: " + (err?.message || "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section-container">
        <div className="login-loading">Loading My Assigned Tasks…</div>
      </div>
    );
  }

  return (
    <div className="section-container">
      {/* Header */}
      <div className="section-header-row">
        <div>
          <h2 className="section-title">📥 My Assigned Tasks & Deliverables</h2>
          <p className="section-subtitle">
            View your project domains, track deadlines, and submit your GitHub code, photos, and deliverables.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-pills-row">
        <button
          type="button"
          className={`tab-pill ${filterTab === "all" ? "active" : ""}`}
          onClick={() => setFilterTab("all")}
        >
          All Assigned ({myTasks.length})
        </button>
        <button
          type="button"
          className={`tab-pill ${filterTab === "pending" ? "active" : ""}`}
          onClick={() => setFilterTab("pending")}
        >
          In Progress / Pending
        </button>
        <button
          type="button"
          className={`tab-pill ${filterTab === "completed" ? "active" : ""}`}
          onClick={() => setFilterTab("completed")}
        >
          Completed
        </button>
      </div>

      {/* My Tasks Cards */}
      <div className="task-grid">
        {myTasks.length === 0 ? (
          <div className="empty-card">
            No assigned tasks found under this filter. Enjoy your day! 🌟
          </div>
        ) : (
          myTasks.map((t) => {
            const mySub = submissions.find(
              (s) => s.taskId === t.id && normalizeEmail(s.studentEmail) === userEmail
            );

            return (
              <div key={t.id} className="task-card">
                <div className="task-card-header">
                  <span className="task-domain-badge">{t.domain}</span>
                  <span
                    className={`task-priority-badge priority-${(t.priority || "Medium").toLowerCase()}`}
                  >
                    {t.priority} Priority
                  </span>
                </div>

                <h3 className="task-title">{t.title}</h3>
                <p className="task-desc">{t.description}</p>

                <div className="task-meta-row">
                  <span>📅 Deadline: {t.dueDate || "Flexible"}</span>
                  <span
                    className={`task-status-pill status-${(t.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {t.status}
                  </span>
                </div>

                {mySub && (
                  <div className="my-sub-banner">
                    ✅ Deliverable Submitted ({new Date(mySub.submittedAt).toLocaleDateString()})
                  </div>
                )}

                <div className="task-actions-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openSubmitModal(t)}
                  >
                    {mySub ? "✏️ Update Submission" : "📤 Submit Deliverables"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submit Work Modal */}
      {activeTask && (
        <div className="modal-overlay" onClick={() => setActiveTask(null)}>
          <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Submit Work for: {activeTask.title}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveTask(null)}
              >
                ✕
              </button>
            </div>

            <p className="modal-sub-info">
              Domain: <strong>{activeTask.domain}</strong> | Due: {activeTask.dueDate || "N/A"}
            </p>

            {/* Submission Versions & Admin Review History Log */}
            {(() => {
              const taskSubs = submissions.filter((s) => s.taskId === activeTask.id || s.taskId === activeTask.taskId);
              const taskRevs = reviews.filter((r) => r.taskId === activeTask.id || r.taskId === activeTask.taskId);
              if (taskSubs.length === 0) return null;

              return (
                <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "16px" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8", fontSize: "0.95rem" }}>📜 Submission & Admin Review History:</h4>
                  {taskSubs.map((sub) => {
                    const subRevs = taskRevs.filter((r) => r.submissionId === sub.id || r.submissionId === sub.submissionId);
                    return (
                      <div key={sub.id || sub.submissionId} style={{ background: "#1e293b", padding: "10px", borderRadius: "6px", marginBottom: "8px", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            {(() => {
                              const submitterName = typeof sub.submittedBy === "object" ? sub.submittedBy?.name || sub.submittedBy?.email : (sub.submittedBy || sub.studentEmail);
                              return (
                                <>
                                  <strong style={{ color: "#f8fafc" }}>Version V{sub.version || 1}</strong>
                                  <span style={{ marginLeft: "8px", color: "#94a3b8", fontSize: "0.75rem" }}>
                                    by {submitterName} on {new Date(sub.submittedAt).toLocaleDateString()}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <span className={`task-status-pill status-${(sub.status || "Submitted").toLowerCase().replace(/ /g, "-")}`}>
                            {sub.status || "SUBMITTED"}
                          </span>
                        </div>
                        {sub.notes && <div style={{ color: "#cbd5e1", marginTop: "4px" }}>Notes: {sub.notes}</div>}
                        {subRevs.length > 0 && (
                          <div style={{ marginTop: "6px", borderTop: "1px dashed #334155", paddingTop: "6px" }}>
                            {subRevs.map((rev) => (
                              <div key={rev.id || rev.reviewId} style={{ color: rev.decision === "APPROVED" ? "#4ade80" : rev.decision === "CHANGES_REQUESTED" ? "#f87171" : "#38bdf8", fontSize: "0.8rem" }}>
                                💬 <strong>{rev.reviewerEmail}:</strong> {rev.decision} {rev.feedback ? `- "${rev.feedback}"` : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {submitError && <div className="login-error-banner">{submitError}</div>}

            <form onSubmit={handleSubmitDeliverable} className="task-form">
              {activeTask.submissionMode !== "INDIVIDUAL" && (
                <div className="form-group" style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <label style={{ color: "#38bdf8", fontWeight: 700 }}>Submission Representation Method</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="radio"
                        name="submitMode"
                        checked={!submitForAll}
                        onChange={() => setSubmitForAll(false)}
                      />
                      <span>👤 Submit for myself only</span>
                    </label>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="radio"
                        name="submitMode"
                        checked={submitForAll}
                        onChange={() => setSubmitForAll(true)}
                      />
                      <span>👥 Submit on behalf of all assigned members (Collaborative Repo)</span>
                    </label>
                  </div>

                  {submitForAll && (
                    <div style={{ marginTop: "10px", background: "#1e293b", padding: "10px", borderRadius: "6px" }}>
                      <small style={{ color: "#4ade80", fontWeight: 600, display: "block" }}>
                        ✓ This submission will cover all active assignees for this task:
                      </small>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                        {(activeTask.assignedEmails || []).map((email) => (
                          <span key={email} style={{ background: "#334155", color: "#f8fafc", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem" }}>
                            ✓ {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>GitHub Repository / Commit URL</label>
                <input
                  type="url"
                  className="login-form-input"
                  placeholder="https://github.com/your-username/your-repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Live Demo / Deployment URL (Optional)</label>
                <input
                  type="url"
                  className="login-form-input"
                  placeholder="https://your-app.vercel.app or demo link"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Upload Deliverables (Photos, Screenshots, Zip Archives, Docs)</label>
                <input
                  type="file"
                  multiple
                  className="file-input"
                  onChange={handleFileChange}
                  accept="image/*,.zip,.rar,.pdf,.doc,.docx"
                />
                <small className="help-text">Select photos or zip files from your device to attach.</small>
              </div>

              {files.length > 0 && (
                <div className="selected-files-list">
                  <h5>Attached Files ({files.length}):</h5>
                  {files.map((f, i) => (
                    <div key={i} className="file-chip">
                      <span>📄 {f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                      <button type="button" onClick={() => removeFile(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label>Submission Notes & Highlights</label>
                <textarea
                  className="textarea-input"
                  rows="3"
                  placeholder="Describe your implementation details, features built, or instructions for testing..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Update Status</label>
                <select
                  className="select-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted">Submitted for Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTask(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Deliverable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

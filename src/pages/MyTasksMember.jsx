// src/pages/MyTasksMember.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchSheetData } from "../utils/api";
import { isUserAssignedToTask, normalizeEmail } from "../utils/roles";
import {
  getSubmissions,
  getTasks,
  saveSubmission,
} from "../utils/taskStorage";

export default function MyTasksMember({ search = "" }) {
  const { auth } = useAuth();
  const userEmail = normalizeEmail(auth.userEmail || "");

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, sList, sheetStudents] = await Promise.all([
        getTasks(),
        getSubmissions(),
        fetchSheetData("Sheet1").catch(() => []),
      ]);
      setTasks(tList || []);
      setSubmissions(sList || []);
      setStudents(Array.isArray(sheetStudents) ? sheetStudents : []);
    } catch (err) {
      console.error("Error loading member tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter tasks assigned to current logged-in member
  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isAssigned = isUserAssignedToTask(userEmail, t.assignedEmails, students);
      if (!isAssigned) return false;

      const matchSearch =
        !search ||
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.domain || "").toLowerCase().includes(search.toLowerCase());

      if (filterTab === "pending") return matchSearch && t.status !== "Completed";
      if (filterTab === "completed") return matchSearch && t.status === "Completed";
      return matchSearch;
    });
  }, [tasks, userEmail, students, search, filterTab]);

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
    } else {
      setGithubUrl("");
      setDemoUrl("");
      setNotes("");
      setStatus("Submitted");
      setFiles([]);
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
        studentName: auth.userEmail ? auth.userEmail.split("@")[0] : "Member",
        githubUrl: githubUrl.trim(),
        demoUrl: demoUrl.trim(),
        notes: notes.trim(),
        status,
        files,
      });

      setActiveTask(null);
      await loadData();
    } catch (err) {
      setSubmitError("Failed to submit deliverable. Please try again.");
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

            {submitError && <div className="login-error-banner">{submitError}</div>}

            <form onSubmit={handleSubmitDeliverable} className="task-form">
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

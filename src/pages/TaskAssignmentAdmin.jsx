// src/pages/TaskAssignmentAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchSheetData } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { extractStudentEmails, getAllAssignableUsers, normalizeEmail } from "../utils/roles";
import {
  createReview,
  deleteTask,
  getReviews,
  getSubmissions,
  getTasks,
  saveTask,
} from "../utils/taskStorage";

const DOMAINS = [
  "Full-Stack Software Development",
  "Agentic AI & LLM Optimization",
  "DevOps and IT Infra",
  "Cloud Computing",
  "Cyber Security and Cryptography",
  "Big Data Analytics and machine learning",
  "IoT and Sensor Integration",
  "Embedded Systems & Firmware",
  "Mobile Application",
  "User Experience (UI/UX) Design",
  "Other",
];

export default function TaskAssignmentAdmin({ search = "" }) {
  const { auth } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [domainFilter, setDomainFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submissionsModalTask, setSubmissionsModalTask] = useState(null);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [taskReviews, setTaskReviews] = useState([]);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDomain, setFormDomain] = useState(DOMAINS[0]);
  const [formCustomDomain, setFormCustomDomain] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formAssigned, setFormAssigned] = useState([]);
  const [formSubmissionMode, setFormSubmissionMode] = useState("FLEXIBLE");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Review State
  const [reviewingSubId, setReviewingSubId] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("APPROVED");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tList, sheetStudents] = await Promise.all([
        getTasks(auth.email),
        fetchSheetData("Sheet1").catch(() => []),
      ]);
      setTasks(tList || []);
      setStudents(Array.isArray(sheetStudents) ? sheetStudents : []);
    } catch (err) {
      console.error("Error loading admin tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const availableDomains = useMemo(() => {
    const set = new Set(DOMAINS.filter((d) => d !== "Other"));
    tasks.forEach((t) => {
      if (t.domain) set.add(t.domain);
    });
    return Array.from(set);
  }, [tasks]);

  const assignableUsers = useMemo(() => {
    return getAllAssignableUsers(students);
  }, [students]);

  const userMap = useMemo(() => {
    const map = {};
    assignableUsers.forEach((u) => {
      map[normalizeEmail(u.email)] = u.name;
    });
    return map;
  }, [assignableUsers]);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle("");
    setFormDomain(DOMAINS[0]);
    setFormCustomDomain("");
    setFormDescription("");
    setFormPriority("Medium");
    setFormDueDate("");
    setFormAssigned([]);
    setFormSubmissionMode("FLEXIBLE");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title || "");
    if (DOMAINS.includes(task.domain) && task.domain !== "Other") {
      setFormDomain(task.domain);
      setFormCustomDomain("");
    } else {
      setFormDomain("Other");
      setFormCustomDomain(task.domain || "");
    }
    setFormDescription(task.description || "");
    setFormPriority(task.priority || "Medium");
    setFormDueDate(task.dueDate || "");
    setFormAssigned(task.assignedEmails || []);
    setFormSubmissionMode(task.submissionMode || "FLEXIBLE");
    setFormError("");
    setModalOpen(true);
  };

  const handleMemberToggle = (email) => {
    const clean = normalizeEmail(email);
    setFormAssigned((prev) =>
      prev.includes(clean) ? prev.filter((e) => e !== clean) : [...prev, clean]
    );
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Please enter a task title.");
      return;
    }

    if (formDomain === "Other" && !formCustomDomain.trim()) {
      setFormError("Please enter the custom domain name to assign.");
      return;
    }

    const finalDomain =
      formDomain === "Other"
        ? formCustomDomain.trim()
        : formDomain;

    if (!finalDomain) {
      setFormError("Please select or enter a valid project domain.");
      return;
    }

    if (formAssigned.length === 0) {
      setFormError("Please assign at least one team member.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await saveTask(
        {
          id: editingTask?.id || null,
          title: formTitle.trim(),
          domain: finalDomain,
          description: formDescription.trim(),
          priority: formPriority,
          dueDate: formDueDate,
          assignedEmails: formAssigned,
          submissionMode: formSubmissionMode,
          createdBy: auth.email || "admin",
          status: editingTask?.status || "PENDING",
        },
        auth.email
      );
      setModalOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(err?.message || "Failed to save task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId, auth.email);
      await loadAll();
    }
  };

  const openSubmissionsModal = async (task) => {
    setSubmissionsModalTask(task);
    setReviewingSubId(null);
    setReviewFeedback("");
    try {
      const [subs, revs] = await Promise.all([
        getSubmissions(auth.email),
        getReviews(auth.email).catch(() => []),
      ]);
      setTaskSubmissions(subs.filter((s) => s.taskId === task.id));
      setTaskReviews(revs.filter((r) => r.taskId === task.id));
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const handleReviewSubmit = async (subId) => {
    if (!subId) return;
    setSubmittingReview(true);
    try {
      await createReview({
        submissionId: subId,
        decision: reviewDecision,
        feedback: reviewFeedback.trim(),
      }, auth.email);

      setReviewingSubId(null);
      setReviewFeedback("");
      
      // Reload submissions and reviews
      if (submissionsModalTask) {
        await openSubmissionsModal(submissionsModalTask);
      }
      await loadAll();
    } catch (err) {
      alert("Failed to submit review: " + (err?.message || "Unknown error"));
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !search ||
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.domain || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());

      const matchDomain = domainFilter === "All" || t.domain === domainFilter;
      const matchStatus = statusFilter === "All" || t.status === statusFilter;

      return matchSearch && matchDomain && matchStatus;
    });
  }, [tasks, search, domainFilter, statusFilter]);

  if (loading) {
    return (
      <div className="section-container">
        <div className="login-loading">Loading Task Assignments…</div>
      </div>
    );
  }

  return (
    <div className="section-container">
      {/* Header */}
      <div className="section-header-row">
        <div>
          <h2 className="section-title">📋 Task & Domain Assignments</h2>
          <p className="section-subtitle">
            Assign project domains and tasks to single members or team squads.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          ➕ Assign New Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar-row">
        <div className="filter-group">
          <label>Filter by Domain:</label>
          <select
            className="select-input"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <option value="All">All Domains</option>
            {availableDomains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Filter by Status:</label>
          <select
            className="select-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="task-grid">
        {filteredTasks.length === 0 ? (
          <div className="empty-card">
            No tasks found. Click <strong>"➕ Assign New Task"</strong> to assign work to members!
          </div>
        ) : (
          filteredTasks.map((t) => (
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
                <span>📅 Due: {t.dueDate || "No deadline"}</span>
                <span className={`task-status-pill status-${(t.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                  {t.status}
                </span>
              </div>

              <div className="task-assigned-section">
                <div className="task-assigned-title">Assigned Squad / Members:</div>
                <div className="task-members-chips">
                  {(t.assignedEmails || []).map((email) => (
                    <span key={email} className="member-chip">
                      👤 {userMap[normalizeEmail(email)] || email}
                    </span>
                  ))}
                </div>
              </div>

              <div className="task-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openSubmissionsModal(t)}
                >
                  📥 Deliverables
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openEditModal(t)}
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleDeleteTask(t.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Task Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? "✏️ Edit Task Assignment" : "➕ Assign New Task / Domain"}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {formError && <div className="login-error-banner">{formError}</div>}

            <form onSubmit={handleSaveTask} className="task-form">
              <div className="form-group full-width">
                <label>Task / Project Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Example: Full-Stack Authentication & RBAC"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Project Domain *</label>
                  <select
                    className="form-select"
                    value={formDomain}
                    onChange={(e) => {
                      setFormDomain(e.target.value);
                      if (e.target.value !== "Other") {
                        setFormCustomDomain("");
                      }
                    }}
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {formDomain === "Other" && (
                    <div style={{ marginTop: "10px" }}>
                      <label style={{ fontSize: "0.85rem", color: "#38bdf8", marginBottom: "4px", display: "block", fontWeight: 600 }}>
                        Custom Domain Name *
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Type custom domain (e.g. Blockchain & Smart Contracts)..."
                        value={formCustomDomain}
                        onChange={(e) => setFormCustomDomain(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-select"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                  >
                    <option value="High">🔴 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Submission Mode</label>
                  <select
                    className="form-select"
                    value={formSubmissionMode}
                    onChange={(e) => setFormSubmissionMode(e.target.value)}
                  >
                    <option value="FLEXIBLE">⚡ Flexible (Individual or Group)</option>
                    <option value="INDIVIDUAL">👤 Individual Only</option>
                    <option value="COLLABORATIVE">👥 Collaborative Group Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Description & Requirements</label>
                <textarea
                  className="form-textarea"
                  rows="4"
                  placeholder="Detail the deliverable specifications, expected repository submission, and guidelines..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <div className="form-label-row">
                  <label>Assign to Members / Group Squad *</label>
                  <span className="count-pill">{formAssigned.length} selected</span>
                </div>
                <div className="member-select-grid">
                  {assignableUsers.map((user) => {
                    const isChecked = formAssigned.includes(user.email);

                    return (
                      <label key={user.email} className={`member-select-card ${isChecked ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMemberToggle(user.email)}
                        />
                        <div className="member-select-info">
                          <strong>{user.name}</strong>
                          <small>{user.role}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingTask ? "Update Task" : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions & Multi-Admin Review Modal */}
      {submissionsModalTask && (
        <div className="modal-overlay" onClick={() => setSubmissionsModalTask(null)}>
          <div className="modal-content task-modal" style={{ maxWidth: "850px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>📥 Submissions & Reviews for: {submissionsModalTask.title}</h3>
                <small style={{ color: "#94a3b8" }}>
                  Submission Mode: <strong>{submissionsModalTask.submissionMode || "FLEXIBLE"}</strong>
                </small>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSubmissionsModalTask(null)}
              >
                ✕
              </button>
            </div>

            <div className="submissions-list">
              {taskSubmissions.length === 0 ? (
                <div className="empty-card">
                  No deliverables submitted yet by assigned members for this task.
                </div>
              ) : (
                taskSubmissions.map((sub) => {
                  const submitterEmail = typeof sub.submittedBy === "object" ? sub.submittedBy?.email || sub.submittedBy?.name : sub.submittedBy;
                  const submitterName = typeof sub.submittedBy === "object" ? sub.submittedBy?.name || sub.submittedBy?.email : (userMap[normalizeEmail(sub.submittedBy)] || sub.submittedBy);
                  const isSelfSubmission = normalizeEmail(submitterEmail) === normalizeEmail(auth.email);
                  const subReviews = taskReviews.filter((r) => r.submissionId === sub.id || r.submissionId === sub._id);

                  return (
                    <div key={sub.id || sub._id} className="submission-card" style={{ marginBottom: "20px", border: "1px solid #334155", padding: "16px", borderRadius: "10px" }}>
                      <div className="submission-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "1.1rem", color: "#f8fafc" }}>
                            {submitterName}
                          </strong>
                          {sub.version && (
                            <span style={{ marginLeft: "10px", padding: "2px 8px", borderRadius: "12px", background: "#0284c7", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>
                              Version V{sub.version}
                            </span>
                          )}
                          {sub.submissionType === "COLLABORATIVE" && (
                            <span style={{ marginLeft: "6px", padding: "2px 8px", borderRadius: "12px", background: "#7c3aed", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>
                              👥 Collaborative Team
                            </span>
                          )}
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                            Submitted: {new Date(sub.submittedAt).toLocaleString()}
                          </div>
                        </div>
                        <span className={`task-status-pill status-${(sub.status || "Submitted").toLowerCase().replace(/ /g, "-")}`}>
                          {sub.status || "SUBMITTED"}
                        </span>
                      </div>

                      {Array.isArray(sub.submittedFor) && sub.submittedFor.length > 0 && (
                        <div style={{ marginTop: "10px", background: "#1e293b", padding: "8px 12px", borderRadius: "6px" }}>
                          <small style={{ color: "#94a3b8", display: "block" }}>Represented Members Covered:</small>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                            {sub.submittedFor.map((mItem, idx) => {
                              const mName = typeof mItem === "object" ? mItem.name || mItem.email : (userMap[normalizeEmail(mItem)] || mItem);
                              return (
                                <span key={typeof mItem === "object" ? mItem._id || idx : mItem} style={{ background: "#334155", color: "#e2e8f0", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem" }}>
                                  ✓ {mName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {sub.notes && <p className="submission-notes" style={{ marginTop: "10px" }}>💬 <strong>Notes:</strong> {sub.notes}</p>}

                      <div className="submission-links" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        {sub.githubUrl && (
                          <a href={sub.githubUrl} target="_blank" rel="noreferrer" className="sub-link-btn github">
                            📦 GitHub Repository
                          </a>
                        )}
                        {sub.demoUrl && (
                          <a href={sub.demoUrl} target="_blank" rel="noreferrer" className="sub-link-btn demo">
                            🌐 Live Demo
                          </a>
                        )}
                      </div>

                      {/* Existing Reviews Log */}
                      {subReviews.length > 0 && (
                        <div style={{ marginTop: "14px", borderTop: "1px dashed #334155", paddingTop: "10px" }}>
                          <h5 style={{ margin: "0 0 8px 0", color: "#38bdf8" }}>📜 Admin Review Log:</h5>
                          {subReviews.map((rev) => (
                            <div key={rev.id} style={{ background: "#0f172a", padding: "8px 12px", borderRadius: "6px", marginBottom: "6px", fontSize: "0.85rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>{rev.reviewerEmail}</strong>
                                <span style={{ fontWeight: 700, color: rev.decision === "APPROVED" ? "#4ade80" : rev.decision === "CHANGES_REQUESTED" ? "#f87171" : "#38bdf8" }}>
                                  {rev.decision}
                                </span>
                              </div>
                              {rev.feedback && <div style={{ color: "#cbd5e1", marginTop: "4px" }}>"{rev.feedback}"</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Admin Review Action Box */}
                      <div style={{ marginTop: "14px", background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                        {isSelfSubmission && (
                          <div style={{ fontSize: "0.8rem", color: "#fbbf24", marginBottom: "8px", fontWeight: 600 }}>
                            ⭐ Self-Review Authorized: As an Admin, you are reviewing your own submission.
                          </div>
                        )}

                        {reviewingSubId === sub.id ? (
                          <div>
                            <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
                              <label style={{ cursor: "pointer", color: "#4ade80", fontWeight: 600 }}>
                                <input type="radio" name={`dec-${sub.id}`} value="APPROVED" checked={reviewDecision === "APPROVED"} onChange={() => setReviewDecision("APPROVED")} />
                                {" "}✅ Approve
                              </label>
                              <label style={{ cursor: "pointer", color: "#f87171", fontWeight: 600 }}>
                                <input type="radio" name={`dec-${sub.id}`} value="CHANGES_REQUESTED" checked={reviewDecision === "CHANGES_REQUESTED"} onChange={() => setReviewDecision("CHANGES_REQUESTED")} />
                                {" "}⚠️ Request Changes
                              </label>
                              <label style={{ cursor: "pointer", color: "#38bdf8", fontWeight: 600 }}>
                                <input type="radio" name={`dec-${sub.id}`} value="COMMENTED" checked={reviewDecision === "COMMENTED"} onChange={() => setReviewDecision("COMMENTED")} />
                                {" "}💬 Comment Only
                              </label>
                            </div>

                            <textarea
                              rows="2"
                              className="form-textarea"
                              placeholder="Type review feedback for team members..."
                              value={reviewFeedback}
                              onChange={(e) => setReviewFeedback(e.target.value)}
                              style={{ width: "100%", marginBottom: "10px" }}
                            />

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={submittingReview}
                                onClick={() => handleReviewSubmit(sub.id)}
                              >
                                {submittingReview ? "Submitting..." : "Submit Official Review"}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setReviewingSubId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.85rem" }}
                            onClick={() => {
                              setReviewingSubId(sub.id);
                              setReviewDecision("APPROVED");
                              setReviewFeedback("");
                            }}
                          >
                            ✍️ Add Admin Review / Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

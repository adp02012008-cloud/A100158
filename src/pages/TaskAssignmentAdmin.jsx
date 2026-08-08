// src/pages/TaskAssignmentAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchSheetData } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { extractStudentEmails, normalizeEmail } from "../utils/roles";
import {
  deleteTask,
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

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDomain, setFormDomain] = useState(DOMAINS[0]);
  const [formCustomDomain, setFormCustomDomain] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formAssigned, setFormAssigned] = useState([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const availableDomains = useMemo(() => {
    const set = new Set(DOMAINS.filter((d) => d !== "Other"));
    tasks.forEach((t) => {
      if (t.domain) set.add(t.domain);
    });
    return Array.from(set);
  }, [tasks]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tList, sList] = await Promise.all([
        getTasks(),
        fetchSheetData("Sheet1"),
      ]);
      setTasks(tList || []);
      setStudents(Array.isArray(sList) ? sList : []);
    } catch (err) {
      console.error("Error loading task assignment admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      const emails = extractStudentEmails(s);
      emails.forEach((email) => {
        map[normalizeEmail(email)] = s.Name || email;
      });
    });
    return map;
  }, [students]);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle("");
    setFormDomain(DOMAINS[0]);
    setFormCustomDomain("");
    setFormDescription("");
    setFormPriority("Medium");
    setFormDueDate("");
    setFormAssigned([]);
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

    const finalDomain =
      formDomain === "Other"
        ? formCustomDomain.trim() || "Other Domain"
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
      await saveTask({
        id: editingTask?.id || null,
        title: formTitle.trim(),
        domain: finalDomain,
        description: formDescription.trim(),
        priority: formPriority,
        dueDate: formDueDate,
        assignedEmails: formAssigned,
        createdBy: auth.userEmail || "admin",
        status: editingTask?.status || "Pending",
      });
      setModalOpen(false);
      await loadAll();
    } catch (err) {
      setFormError("Failed to save task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId);
      await loadAll();
    }
  };

  const openSubmissionsModal = async (task) => {
    setSubmissionsModalTask(task);
    const subs = await getSubmissions(task.id);
    setTaskSubmissions(subs);
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
                      👤 {studentMap[email] || email}
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
                    onChange={(e) => setFormDomain(e.target.value)}
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {formDomain === "Other" && (
                    <input
                      type="text"
                      className="form-input"
                      style={{ marginTop: "8px" }}
                      placeholder="Type custom domain (e.g. Blockchain & Smart Contracts)..."
                      value={formCustomDomain}
                      onChange={(e) => setFormCustomDomain(e.target.value)}
                      required
                    />
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
                  {students.map((st) => {
                    const emails = extractStudentEmails(st);
                    const primaryEmail = emails[0] || "";
                    if (!primaryEmail) return null;
                    const isChecked = formAssigned.includes(primaryEmail);

                    return (
                      <label key={primaryEmail} className={`member-select-card ${isChecked ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMemberToggle(primaryEmail)}
                        />
                        <div className="member-select-info">
                          <strong>{st.Name}</strong>
                          <small>{st.POSITION || "Team Member"}</small>
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

      {/* Submissions Review Modal */}
      {submissionsModalTask && (
        <div className="modal-overlay" onClick={() => setSubmissionsModalTask(null)}>
          <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📥 Submissions for: {submissionsModalTask.title}</h3>
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
                taskSubmissions.map((sub) => (
                  <div key={sub.id} className="submission-card">
                    <div className="submission-card-header">
                      <div>
                        <strong>{sub.studentName || sub.studentEmail}</strong>
                        <small>Submitted on {new Date(sub.submittedAt).toLocaleDateString()}</small>
                      </div>
                      <span className="task-status-pill status-completed">{sub.status || "Submitted"}</span>
                    </div>

                    {sub.notes && <p className="submission-notes">💬 {sub.notes}</p>}

                    <div className="submission-links">
                      {sub.githubUrl && (
                        <a
                          href={sub.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="sub-link-btn github"
                        >
                          📦 View GitHub Repository
                        </a>
                      )}

                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="sub-link-btn demo"
                        >
                          🌐 View Live Demo
                        </a>
                      )}
                    </div>

                    {sub.files && sub.files.length > 0 && (
                      <div className="submission-files">
                        <h5>Attached Deliverable Files & Screenshots:</h5>
                        <div className="file-previews-grid">
                          {sub.files.map((file, idx) => (
                            <div key={idx} className="file-preview-item">
                              {file.dataUrl && file.dataUrl.startsWith("data:image/") ? (
                                <img src={file.dataUrl} alt={file.name} className="img-preview" />
                              ) : (
                                <div className="file-icon-box">📄 {file.name}</div>
                              )}
                              <a
                                href={file.dataUrl || file.url}
                                download={file.name || "deliverable"}
                                target="_blank"
                                rel="noreferrer"
                                className="file-download-link"
                              >
                                ⬇ Download {file.name}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

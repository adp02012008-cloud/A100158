import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function AdminSubmissionsReview({ search = "" }) {
  const { auth } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("PENDING"); // "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "ALL"
  const [selectedSub, setSelectedSub] = useState(null);

  // Review form state
  const [reviewDecision, setReviewDecision] = useState("APPROVED");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Post-approval Edit & Member Window Modal state
  const [editModalSub, setEditModalSub] = useState(null);
  const [editForm, setEditForm] = useState({ githubUrl: "", demoUrl: "", notes: "", memberEditHours: 24 });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, revRes, userRes] = await Promise.all([
        apiFetch("/submissions"),
        apiFetch("/reviews"),
        apiFetch("/users"),
      ]);

      setSubmissions(subRes?.submissions || []);
      setReviews(revRes?.reviews || []);
      setUsers(userRes?.users || []);
    } catch (err) {
      console.error("Failed to load review data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const userMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u.email) map[u.email.toLowerCase().trim()] = u.name || u.email;
    });
    return map;
  }, [users]);

  const getDisplayName = (val) => {
    if (!val) return "Unknown";
    if (typeof val === "object") return val.name || val.email || "Unknown";
    const str = String(val).trim().toLowerCase();
    return userMap[str] || val;
  };

  const getDisplayEmail = (val) => {
    if (!val) return "";
    if (typeof val === "object") return val.email || "";
    return String(val).trim();
  };

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const cleanStatus = (sub.status || "SUBMITTED").toUpperCase();

      // Tab filter
      if (statusTab === "PENDING" && cleanStatus !== "SUBMITTED") return false;
      if (statusTab === "APPROVED" && cleanStatus !== "APPROVED") return false;
      if (statusTab === "CHANGES_REQUESTED" && cleanStatus !== "CHANGES_REQUESTED") return false;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const title = sub.taskId?.title || sub.taskId?.domain || "";
        const submitter = getDisplayName(sub.submittedBy);
        const notes = sub.notes || "";
        return title.toLowerCase().includes(q) || submitter.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
      }

      return true;
    });
  }, [submissions, statusTab, search, userMap]);

  const handleOpenReviewModal = (sub) => {
    setSelectedSub(sub);
    setReviewDecision("APPROVED");
    setReviewFeedback("");
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSubmittingReview(true);
    try {
      await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          submissionId: selectedSub._id || selectedSub.id,
          decision: reviewDecision,
          feedback: reviewFeedback,
        }),
      });

      // Update local state status
      setSubmissions((prev) =>
        prev.map((s) =>
          (s._id || s.id) === (selectedSub._id || selectedSub.id)
            ? { ...s, status: reviewDecision === "COMMENTED" ? s.status : reviewDecision }
            : s
        )
      );

      alert(`Review recorded successfully (${reviewDecision})!`);
      setSelectedSub(null);
      loadData();
    } catch (err) {
      alert("Failed to submit review: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenEditModal = (sub) => {
    setEditModalSub(sub);
    setEditForm({
      githubUrl: sub.githubUrl || "",
      demoUrl: sub.demoUrl || "",
      notes: sub.notes || "",
      memberEditHours: 24,
    });
  };

  const handleSaveSubmissionEdit = async (enableMemberWindow = false) => {
    if (!editModalSub) return;
    setSavingEdit(true);

    try {
      const payload = {
        githubUrl: editForm.githubUrl,
        demoUrl: editForm.demoUrl,
        notes: editForm.notes,
      };

      if (enableMemberWindow) {
        const hours = Number(editForm.memberEditHours || 24);
        payload.memberEditUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      }

      await apiFetch(`/submissions/${editModalSub._id || editModalSub.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      alert(
        enableMemberWindow
          ? `Member edit window unlocked for ${editForm.memberEditHours} hours! Assigned members can now update their deliverable.`
          : "Project deliverable details updated successfully."
      );
      setEditModalSub(null);
      loadData();
    } catch (err) {
      alert("Failed to update submission: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLockMemberEdit = async (sub) => {
    if (!window.confirm("Lock member editing for this submission immediately?")) return;
    try {
      await apiFetch(`/submissions/${sub._id || sub.id}`, {
        method: "PUT",
        body: JSON.stringify({ memberEditUntil: null }),
      });
      alert("Member edit window locked.");
      loadData();
    } catch (err) {
      alert("Failed to lock submission: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)",
          border: "1px solid rgba(167, 139, 250, 0.25)",
          borderRadius: "16px",
          padding: "24px 32px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#f8fafc" }}>
            📥 Submissions Review Queue
          </h2>
          <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
            Review, approve, and provide feedback on member project deliverables. Approved submissions automatically publish to the Projects Showcase.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={loadData}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🔄 Refresh Queue
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { key: "PENDING", label: `⏳ Pending Review (${submissions.filter((s) => (s.status || "SUBMITTED").toUpperCase() === "SUBMITTED").length})` },
          { key: "APPROVED", label: `✅ Approved & Published (${submissions.filter((s) => (s.status || "").toUpperCase() === "APPROVED").length})` },
          { key: "CHANGES_REQUESTED", label: `⚠️ Changes Requested (${submissions.filter((s) => (s.status || "").toUpperCase() === "CHANGES_REQUESTED").length})` },
          { key: "ALL", label: `📁 All History (${submissions.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              border: "1px solid",
              background: statusTab === tab.key ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" : "rgba(15, 23, 42, 0.6)",
              borderColor: statusTab === tab.key ? "#6366f1" : "rgba(255, 255, 255, 0.12)",
              color: statusTab === tab.key ? "#ffffff" : "#94a3b8",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          ⏳ Loading project deliverables for review…
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
            borderRadius: "16px",
            padding: "48px",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          ✨ No submissions match the selected filter!
        </div>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {filteredSubmissions.map((sub) => {
            const subId = sub._id || sub.id;
            const taskTitle = sub.taskId?.title || "Untitled Task";
            const taskDomain = sub.taskId?.domain || "Core";
            const submitterName = getDisplayName(sub.submittedBy);
            const statusUpper = (sub.status || "SUBMITTED").toUpperCase();
            const subRevs = reviews.filter((r) => r.submissionId === subId || r.submissionId === sub.id);

            const isEditWindowActive = sub.memberEditUntil && new Date(sub.memberEditUntil) > new Date();

            const hasHigherResubmission = submissions.some(
              (other) =>
                other.submissionGroupId === sub.submissionGroupId &&
                other.version > sub.version
            );

            return (
              <div
                key={subId}
                style={{
                  background: "rgba(26, 15, 52, 0.8)",
                  border: "1px solid rgba(167, 139, 250, 0.2)",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", fontSize: "12px", fontWeight: "700" }}>
                        {taskDomain}
                      </span>
                      <span style={{ padding: "4px 10px", borderRadius: "12px", background: sub.version > 1 ? "rgba(168, 85, 247, 0.25)" : "rgba(14, 165, 233, 0.2)", color: sub.version > 1 ? "#c084fc" : "#38bdf8", fontSize: "12px", fontWeight: "700" }}>
                        {sub.version > 1 ? `🔄 Resubmitted Version V${sub.version}` : `Version V${sub.version || 1}`}
                      </span>
                      {hasHigherResubmission && (
                        <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", fontSize: "12px", fontWeight: "700" }}>
                          🎉 Corrected Version Received!
                        </span>
                      )}
                      {sub.submissionType === "COLLABORATIVE" && (
                        <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontSize: "12px", fontWeight: "700" }}>
                          👥 Collaborative Team
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#f8fafc", fontWeight: "700" }}>
                      {taskTitle}
                    </h3>

                    <div style={{ fontSize: "14px", color: "#cbd5e1" }}>
                      Submitted by: <strong style={{ color: "#f8fafc" }}>{submitterName}</strong> ({getDisplayEmail(sub.submittedBy)})
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                      📅 Date: {new Date(sub.submittedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <span
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background:
                          statusUpper === "APPROVED"
                            ? "rgba(34, 197, 94, 0.2)"
                            : statusUpper === "CHANGES_REQUESTED"
                            ? "rgba(239, 68, 68, 0.2)"
                            : "rgba(234, 179, 8, 0.2)",
                        color:
                          statusUpper === "APPROVED"
                            ? "#4ade80"
                            : statusUpper === "CHANGES_REQUESTED"
                            ? "#f87171"
                            : "#facc15",
                        border: `1px solid ${
                          statusUpper === "APPROVED"
                            ? "rgba(34, 197, 94, 0.4)"
                            : statusUpper === "CHANGES_REQUESTED"
                            ? "rgba(239, 68, 68, 0.4)"
                            : "rgba(234, 179, 8, 0.4)"
                        }`,
                      }}
                    >
                      {statusUpper === "APPROVED"
                        ? "✅ Approved & Published"
                        : statusUpper === "CHANGES_REQUESTED"
                        ? "⚠️ Changes Requested"
                        : "⏳ Pending Admin Review"}
                    </span>

                    {isEditWindowActive && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(56, 189, 248, 0.15)",
                          color: "#38bdf8",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                        }}
                      >
                        ⏱️ Member Edit Window Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Represented Members */}
                {Array.isArray(sub.submittedFor) && sub.submittedFor.length > 0 && (
                  <div style={{ marginTop: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: "600" }}>
                      Covered / Represented Members:
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {sub.submittedFor.map((m, idx) => (
                        <span
                          key={typeof m === "object" ? m._id || idx : m}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "#e2e8f0",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        >
                          ✓ {getDisplayName(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes & Links */}
                {sub.notes && (
                  <div style={{ marginTop: "12px", fontSize: "14px", color: "#cbd5e1", background: "rgba(15, 23, 42, 0.4)", padding: "10px 14px", borderRadius: "8px" }}>
                    💬 <strong>Submitter Notes:</strong> {sub.notes}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                  {sub.demoUrl && (
                    <a
                      href={sub.demoUrl.startsWith("http") ? sub.demoUrl : `https://${sub.demoUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      🚀 Live Demo Link
                    </a>
                  )}

                  {sub.githubUrl && (
                    <a
                      href={sub.githubUrl.startsWith("http") ? sub.githubUrl : `https://${sub.githubUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      📦 GitHub Repository
                    </a>
                  )}
                </div>

                {/* Review History */}
                {subRevs.length > 0 && (
                  <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", marginBottom: "8px" }}>
                      💬 Admin Review History:
                    </div>
                    {subRevs.map((rev) => (
                      <div
                        key={rev._id || rev.id}
                        style={{
                          fontSize: "13px",
                          color: rev.decision === "APPROVED" ? "#4ade80" : rev.decision === "CHANGES_REQUESTED" ? "#f87171" : "#38bdf8",
                          marginBottom: "4px",
                        }}
                      >
                        • <strong>{rev.decision}:</strong> {rev.feedback || "No feedback written"}
                        <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                          ({new Date(rev.createdAt).toLocaleDateString()})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Controls */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "16px",
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <button
                    onClick={() => handleOpenReviewModal(sub)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                      color: "#fff",
                      border: "none",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                    }}
                  >
                    📝 Add Review & Decision
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(sub)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#cbd5e1",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit Deliverable & Unlock Member Window
                  </button>

                  {isEditWindowActive && (
                    <button
                      onClick={() => handleLockMemberEdit(sub)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      🔒 Lock Member Edit Window
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "20px",
          }}
          onClick={() => setSelectedSub(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "rgba(26, 15, 52, 0.98)",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              borderRadius: "16px",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>
              📝 Review Deliverable — {selectedSub.taskId?.title}
            </h3>

            <form onSubmit={handleSaveReview} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Decision *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                  }}
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value)}
                >
                  <option value="APPROVED">✅ APPROVE (Publish to Showcase & Award Coverage)</option>
                  <option value="CHANGES_REQUESTED">⚠️ REQUEST CHANGES (Notify member for corrections)</option>
                  <option value="COMMENTED">💬 ADD COMMENT ONLY</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Feedback / Corrections Notes
                </label>
                <textarea
                  style={{
                    width: "100%",
                    minHeight: "100px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  placeholder="Type feedback, code review notes, or required corrections..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#94a3b8",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {submittingReview ? "Saving…" : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Approval Edit & Member Window Modal */}
      {editModalSub && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "20px",
          }}
          onClick={() => setEditModalSub(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "rgba(26, 15, 52, 0.98)",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              borderRadius: "16px",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>
              ✏️ Edit Deliverable & Member Edit Window
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                  Live Demo URL
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  value={editForm.demoUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, demoUrl: e.target.value }))}
                  placeholder="e.g. https://my-project-demo.vercel.app"
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                  GitHub Repository URL
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  value={editForm.githubUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, githubUrl: e.target.value }))}
                  placeholder="e.g. https://github.com/myteam/project"
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                  Notes / Description
                </label>
                <textarea
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              {/* Allow Member Editing Window */}
              <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.25)", padding: "14px", borderRadius: "10px", marginTop: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#818cf8", display: "block", marginBottom: "6px" }}>
                  ⏳ Grant Temporary Edit Window to Members
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "#0f172a",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#f8fafc",
                    }}
                    value={editForm.memberEditHours}
                    onChange={(e) => setEditForm((p) => ({ ...p, memberEditHours: e.target.value }))}
                  >
                    <option value="24">24 Hours</option>
                    <option value="48">48 Hours</option>
                    <option value="168">7 Days</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSaveSubmissionEdit(true)}
                    disabled={savingEdit}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                      color: "#fff",
                      border: "none",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    🔓 Unlock Member Editing
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setEditModalSub(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#94a3b8",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSubmissionEdit(false)}
                  disabled={savingEdit}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {savingEdit ? "Saving…" : "Save Admin Edits"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

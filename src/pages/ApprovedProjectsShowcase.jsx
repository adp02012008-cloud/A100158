import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function ApprovedProjectsShowcase({ search = "" }) {
  const { auth, currentUser } = useAuth();
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("All");

  // Member Self-Edit Modal state
  const [editModalSub, setEditModalSub] = useState(null);
  const [editForm, setEditForm] = useState({ githubUrl: "", demoUrl: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, userRes] = await Promise.all([
        apiFetch("/submissions?status=APPROVED&publicView=true"),
        apiFetch("/users"),
      ]);
      setApprovedSubmissions(subRes?.submissions || []);
      setUsers(userRes?.users || []);
    } catch (err) {
      console.error("Failed to load approved projects:", err);
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
    return String(val).trim().toLowerCase();
  };

  const availableDomains = useMemo(() => {
    const set = new Set();
    approvedSubmissions.forEach((s) => {
      if (s.taskId?.domain) set.add(s.taskId.domain);
    });
    return ["All", ...Array.from(set)];
  }, [approvedSubmissions]);

  const filteredProjects = useMemo(() => {
    return approvedSubmissions.filter((sub) => {
      const domain = sub.taskId?.domain || "Core";
      if (domainFilter !== "All" && domain !== domainFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const title = sub.taskId?.title || sub.taskId?.domain || "";
        const submitter = getDisplayName(sub.submittedBy);
        const notes = sub.notes || "";
        return title.toLowerCase().includes(q) || submitter.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
      }

      return true;
    });
  }, [approvedSubmissions, domainFilter, search, userMap]);

  // Check if current user is owner and edit window is active
  const isMemberEditAllowed = (sub) => {
    if (!auth.isLoggedIn || !currentUser) return false;
    if (auth.role === "admin") return true;

    const userEmail = (auth.email || currentUser.email || "").toLowerCase().trim();
    const submitterEmail = getDisplayEmail(sub.submittedBy);

    const forEmails = (sub.submittedFor || []).map((m) => getDisplayEmail(m));
    const isOwner = submitterEmail === userEmail || forEmails.includes(userEmail);

    const isEditWindowActive = sub.memberEditUntil && new Date(sub.memberEditUntil) > new Date();

    return isOwner && isEditWindowActive;
  };

  const handleOpenEditModal = (sub) => {
    setEditModalSub(sub);
    setEditForm({
      githubUrl: sub.githubUrl || "",
      demoUrl: sub.demoUrl || "",
      notes: sub.notes || "",
    });
  };

  const handleSaveMemberEdit = async (e) => {
    e.preventDefault();
    if (!editModalSub) return;
    setSavingEdit(true);

    try {
      await apiFetch(`/submissions/${editModalSub._id || editModalSub.id}`, {
        method: "PUT",
        body: JSON.stringify({
          githubUrl: editForm.githubUrl,
          demoUrl: editForm.demoUrl,
          notes: editForm.notes,
        }),
      });

      alert("Your deliverable details have been updated successfully!");
      setEditModalSub(null);
      loadData();
    } catch (err) {
      alert("Failed to update submission: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      {/* Hero Header */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
          border: "1px solid rgba(52, 211, 153, 0.25)",
          borderRadius: "16px",
          padding: "28px 32px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#f8fafc" }}>
            🏆 Approved Projects & Deliverables Showcase
          </h2>
          <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
            Explore verified, high-impact deliverables approved by team leads and system administrators.
          </p>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 18px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <span style={{ fontSize: "20px", fontWeight: "800", color: "#34d399" }}>{approvedSubmissions.length}</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "6px" }}>Published Projects</span>
        </div>
      </div>

      {/* Domain Filters */}
      {availableDomains.length > 1 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {availableDomains.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid",
                background: domainFilter === d ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(15, 23, 42, 0.6)",
                borderColor: domainFilter === d ? "#10b981" : "rgba(255, 255, 255, 0.12)",
                color: domainFilter === d ? "#ffffff" : "#94a3b8",
              }}
            >
              {d === "All" ? "🌐 All Domains" : d}
            </button>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          🚀 Loading published team projects…
        </div>
      ) : filteredProjects.length === 0 ? (
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
          ✨ No approved projects published yet under this view.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
          {filteredProjects.map((sub) => {
            const subId = sub._id || sub.id;
            const taskTitle = sub.taskId?.title || "Untitled Project";
            const taskDomain = sub.taskId?.domain || "Core";
            const submitterName = getDisplayName(sub.submittedBy);
            const isEditAllowed = isMemberEditAllowed(sub);

            return (
              <div
                key={subId}
                style={{
                  background: "rgba(26, 15, 52, 0.85)",
                  border: "1px solid rgba(52, 211, 153, 0.25)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontSize: "12px", fontWeight: "700" }}>
                      {taskDomain}
                    </span>
                    <span style={{ padding: "4px 10px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", fontSize: "12px", fontWeight: "700" }}>
                      V{sub.version || 1} Approved
                    </span>
                  </div>

                  <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#f8fafc", fontWeight: "700" }}>
                    {taskTitle}
                  </h3>

                  <div style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "10px" }}>
                    Lead Submitter: <strong style={{ color: "#f8fafc" }}>{submitterName}</strong>
                  </div>

                  <div style={{ marginBottom: "14px", background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.18) 100%)", border: "1px solid rgba(52, 211, 153, 0.3)", padding: "10px 14px", borderRadius: "10px" }}>
                    <small style={{ color: "#34d399", fontWeight: "700", display: "block", fontSize: "12px", marginBottom: "6px" }}>
                      🏆 Task Completed & Recognized By:
                    </small>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {(Array.isArray(sub.submittedFor) && sub.submittedFor.length > 0 ? sub.submittedFor : [sub.submittedBy]).map((m, idx) => (
                        <span
                          key={typeof m === "object" ? m._id || idx : m}
                          style={{ background: "rgba(16, 185, 129, 0.25)", color: "#ecfdf5", border: "1px solid rgba(52, 211, 153, 0.4)", padding: "3px 10px", borderRadius: "14px", fontSize: "12px", fontWeight: "600" }}
                        >
                          🏅 {getDisplayName(m)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {sub.notes && (
                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 14px 0", lineClamp: 3, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      💬 {sub.notes}
                    </p>
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    {sub.demoUrl && (
                      <a
                        href={sub.demoUrl.startsWith("http") ? sub.demoUrl : `https://${sub.demoUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "#fff",
                          textDecoration: "none",
                          fontWeight: "600",
                          fontSize: "13px",
                        }}
                      >
                        🚀 Live Demo
                      </a>
                    )}

                    {sub.githubUrl && (
                      <a
                        href={sub.githubUrl.startsWith("http") ? sub.githubUrl : `https://${sub.githubUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#fff",
                          textDecoration: "none",
                          fontWeight: "600",
                          fontSize: "13px",
                        }}
                      >
                        📦 Code Repo
                      </a>
                    )}
                  </div>

                  {isEditAllowed && (
                    <button
                      onClick={() => handleOpenEditModal(sub)}
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontWeight: "600",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit Deliverable (Edit Window Active)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Member Self-Edit Modal */}
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
              maxWidth: "500px",
              background: "rgba(26, 15, 52, 0.98)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "16px",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>
              ✏️ Update Deliverable Links & Notes
            </h3>

            <form onSubmit={handleSaveMemberEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
                  placeholder="https://my-demo.vercel.app"
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
                  placeholder="https://github.com/org/repo"
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
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {savingEdit ? "Updating…" : "Save Deliverable Edits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

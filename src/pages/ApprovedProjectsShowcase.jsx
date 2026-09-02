import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import UnifiedLoader from "../components/UnifiedLoader";

export default function ApprovedProjectsShowcase({ search = "" }) {
  const { auth, currentUser } = useAuth();
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("All");

  const isUserAdmin = auth?.role === "ADMIN" || currentUser?.role === "ADMIN";

  // Member Self-Edit Modal state
  const [editModalSub, setEditModalSub] = useState(null);
  const [editForm, setEditForm] = useState({ githubUrl: "", demoUrl: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Two-Step Verification Delete Modal State
  const [deleteSub, setDeleteSub] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Direct Add Project Modal State
  const [directAddOpen, setDirectAddOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [directForm, setDirectForm] = useState({
    title: "",
    domain: "Full-Stack Software Development",
    githubUrl: "",
    demoUrl: "",
    notes: "",
    submittedBy: "",
    submittedFor: [],
  });
  const [savingDirect, setSavingDirect] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, userRes] = await Promise.all([
        apiFetch("/submissions?status=APPROVED&publicView=true"),
        apiFetch("/users"),
      ]);
      setApprovedSubmissions(subRes?.submissions || []);
      const uList = userRes?.users || [];
      setUsers(uList);
      if (uList.length > 0 && !directForm.submittedBy) {
        setDirectForm((prev) => ({ ...prev, submittedBy: uList[0]._id }));
      }
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

  const availableDomains = useMemo(() => {
    const set = new Set();
    approvedSubmissions.forEach((s) => {
      const d = s.taskId?.domain || "Core";
      set.add(d);
    });
    return ["All", ...Array.from(set)];
  }, [approvedSubmissions]);

  const filteredProjects = useMemo(() => {
    return approvedSubmissions.filter((sub) => {
      const title = sub.taskId?.title || "Untitled Project";
      const domain = sub.taskId?.domain || "Core";
      const notes = sub.notes || "";
      const leadName = getDisplayName(sub.submittedBy);

      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        title.toLowerCase().includes(q) ||
        domain.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q) ||
        leadName.toLowerCase().includes(q);

      const matchDomain = domainFilter === "All" || domain === domainFilter;

      return matchSearch && matchDomain;
    });
  }, [approvedSubmissions, search, domainFilter, userMap]);

  const isMemberEditAllowed = (sub) => {
    if (!sub.memberEditUntil) return false;
    return new Date(sub.memberEditUntil) > new Date();
  };

  const handleOpenEditModal = (sub) => {
    setEditModalSub(sub);
    setEditForm({
      githubUrl: sub.githubUrl || "",
      demoUrl: sub.demoUrl || "",
      notes: sub.notes || "",
      editHours: "0",
    });
  };

  const handleSaveMemberEdit = async (e) => {
    e.preventDefault();
    if (!editModalSub) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/submissions/${editModalSub._id || editModalSub.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      alert("✅ Deliverable updated successfully!");
      setEditModalSub(null);
      await loadData();
    } catch (err) {
      alert("Failed to update deliverable: " + (err?.message || "Unknown error"));
    } finally {
      setSavingEdit(false);
    }
  };

  // 2-Step Verification Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteSub || deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await apiFetch(`/submissions/${deleteSub._id || deleteSub.id}`, {
        method: "DELETE",
      });
      alert("🗑️ Project deliverable deleted successfully!");
      setDeleteSub(null);
      setDeleteConfirmText("");
      await loadData();
    } catch (err) {
      alert("Failed to delete project: " + (err?.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  // Direct Publish Handler
  const handleDirectPublishSubmit = async (e) => {
    e.preventDefault();
    if (!directForm.title) return alert("Project title is required.");

    const finalDomain = directForm.domain === "Other" ? (customDomain.trim() || "Other") : directForm.domain;

    setSavingDirect(true);
    try {
      await apiFetch("/submissions/direct", {
        method: "POST",
        body: JSON.stringify({
          ...directForm,
          domain: finalDomain,
        }),
      });
      alert("🚀 Project directly published to showcase successfully!");
      setDirectAddOpen(false);
      setCustomDomain("");
      setDirectForm({
        title: "",
        domain: "Full-Stack Software Development",
        githubUrl: "",
        demoUrl: "",
        notes: "",
        submittedBy: users[0]?._id || "",
        submittedFor: [],
      });
      await loadData();
    } catch (err) {
      alert("Failed to direct publish project: " + (err?.message || "Unknown error"));
    } finally {
      setSavingDirect(false);
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

        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          {isUserAdmin && (
            <button
              type="button"
              onClick={() => {
                setDirectForm({
                  title: "",
                  domain: "Full-Stack Software Development",
                  githubUrl: "",
                  demoUrl: "",
                  notes: "",
                  submittedBy: users[0]?._id || "",
                  submittedFor: [],
                });
                setDirectAddOpen(true);
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
              }}
            >
              ⚡ Direct Publish Project
            </button>
          )}

          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 18px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#34d399" }}>{approvedSubmissions.length}</span>
            <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "6px" }}>Published Projects</span>
          </div>
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
        <UnifiedLoader
          title="Loading Published Projects…"
          subtitle="Fetching showcase portfolio and live project demos"
          minHeight="300px"
        />
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

                  {(isEditAllowed || isUserAdmin) && (
                    <button
                      onClick={() => handleOpenEditModal(sub)}
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      ✏️ {isUserAdmin ? "Edit Project & Assign Permissions" : "Edit Deliverable (Edit Window Active)"}
                    </button>
                  )}

                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        setDeleteSub(sub);
                        setDeleteConfirmText("");
                      }}
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        boxShadow: "0 2px 10px rgba(239, 68, 68, 0.15)",
                      }}
                    >
                      🗑️ Delete Project
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2-Step Verification Delete Modal */}
      {deleteSub && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            padding: "20px",
          }}
          onClick={() => setDeleteSub(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "rgba(24, 15, 38, 0.98)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#f87171", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ Confirm Permanent Project Deletion
            </h3>

            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete <strong>"{deleteSub.taskId?.title || "this project"}"</strong> from the showcase?
            </p>

            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px", padding: "12px 16px", margin: "16px 0" }}>
              <p style={{ margin: 0, color: "#fca5a5", fontSize: "13px", fontWeight: "600" }}>
                🔒 Two-Step Verification Security Required:
              </p>
              <p style={{ margin: "4px 0 0 0", color: "#e2e8f0", fontSize: "12px" }}>
                To confirm, please type <strong style={{ color: "#f87171", letterSpacing: "1px" }}>DELETE</strong> in the box below:
              </p>
            </div>

            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.9)",
                border: deleteConfirmText === "DELETE" ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                letterSpacing: "1px",
                marginBottom: "20px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteSub(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteConfirmText !== "DELETE" || deleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: deleteConfirmText === "DELETE" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(239, 68, 68, 0.2)",
                  border: "none",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: deleteConfirmText === "DELETE" && !deleting ? "pointer" : "not-allowed",
                  opacity: deleteConfirmText === "DELETE" && !deleting ? 1 : 0.4,
                }}
              >
                {deleting ? "Deleting…" : "🗑️ Confirm Permanent Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Add Project Modal */}
      {directAddOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            padding: "20px",
          }}
          onClick={() => setDirectAddOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "rgba(24, 15, 38, 0.98)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#34d399", fontSize: "20px" }}>
              ⚡ Direct Add / Publish Project to Showcase
            </h3>

            <form onSubmit={handleDirectPublishSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI-Powered Team Dashboard"
                  value={directForm.title}
                  onChange={(e) => setDirectForm({ ...directForm, title: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Domain *
                </label>
                <select
                  value={directForm.domain}
                  onChange={(e) => setDirectForm({ ...directForm, domain: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                >
                  <option value="Full-Stack Software Development">Full-Stack Software Development</option>
                  <option value="UI/UX Design & Prototyping">UI/UX Design & Prototyping</option>
                  <option value="AI / Machine Learning">AI / Machine Learning</option>
                  <option value="Mobile App Development">Mobile App Development</option>
                  <option value="Cloud & DevOps Engineering">Cloud & DevOps Engineering</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Core">Core</option>
                  <option value="Other">Other (Custom Domain)</option>
                </select>

                {directForm.domain === "Other" && (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#34d399", display: "block", marginBottom: "4px" }}>
                      Type Custom Domain Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Blockchain & Web3, Game Development, Data Science..."
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid #34d399", color: "#fff" }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Lead Submitter / Creator *
                </label>
                <select
                  value={directForm.submittedBy}
                  onChange={(e) => setDirectForm({ ...directForm, submittedBy: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                >
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>
                    Team Contributors / Squad Members (Click buttons to select)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setDirectForm({ ...directForm, submittedFor: users.map((u) => u._id) })}
                      style={{ fontSize: "11px", color: "#34d399", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", padding: "2px 8px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                    >
                      ✓ Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectForm({ ...directForm, submittedFor: [] })}
                      style={{ fontSize: "11px", color: "#f87171", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "2px 8px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                    >
                      ✕ Clear All
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    maxHeight: "160px",
                    overflowY: "auto",
                    padding: "12px",
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                  }}
                >
                  {users.map((u) => {
                    const isSelected = (directForm.submittedFor || []).includes(u._id);
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => {
                          const current = directForm.submittedFor || [];
                          const next = isSelected
                            ? current.filter((id) => id !== u._id)
                            : [...current, u._id];
                          setDirectForm({ ...directForm, submittedFor: next });
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: isSelected
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "rgba(255, 255, 255, 0.06)",
                          border: isSelected
                            ? "1px solid #34d399"
                            : "1px solid rgba(255, 255, 255, 0.15)",
                          color: isSelected ? "#ffffff" : "#94a3b8",
                          boxShadow: isSelected ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "} {u.name}
                      </button>
                    );
                  })}
                </div>
                <small style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  Selected {directForm.submittedFor.length} contributor(s)
                </small>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Live Demo URL
                </label>
                <input
                  type="text"
                  placeholder="https://my-demo-app.vercel.app"
                  value={directForm.demoUrl}
                  onChange={(e) => setDirectForm({ ...directForm, demoUrl: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  GitHub Code Repository URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/my-org/my-repo"
                  value={directForm.githubUrl}
                  onChange={(e) => setDirectForm({ ...directForm, githubUrl: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Project Overview / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Key features, tech stack, and achievements..."
                  value={directForm.notes}
                  onChange={(e) => setDirectForm({ ...directForm, notes: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setDirectAddOpen(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDirect}
                  style={{ padding: "10px 22px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                >
                  {savingDirect ? "Publishing…" : "🚀 Publish Directly Now"}
                </button>
              </div>
            </form>
          </div>
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
              maxWidth: "540px",
              background: "rgba(26, 15, 52, 0.98)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "16px",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#f8fafc" }}>
              ✏️ Edit Deliverable — {editModalSub.taskId?.title}
            </h3>

            <form onSubmit={handleSaveMemberEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Live Demo URL
                </label>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                  }}
                  value={editForm.demoUrl}
                  onChange={(e) => setEditForm({ ...editForm, demoUrl: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  GitHub Code Repo URL
                </label>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                  }}
                  value={editForm.githubUrl}
                  onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Notes / Overview
                </label>
                <textarea
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "14px",
                  }}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              {isUserAdmin && (
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#fbbf24", display: "block", marginBottom: "6px" }}>
                    ⏱️ Assign Temporary Member Edit Window Permission
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#f8fafc",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                    value={editForm.editHours || "0"}
                    onChange={(e) => setEditForm({ ...editForm, editHours: e.target.value })}
                  >
                    <option value="0">🔒 Locked (No Member Edit Allowed)</option>
                    <option value="1">⏱️ Allow Member Edit for 1 Hour</option>
                    <option value="24">⏱️ Allow Member Edit for 24 Hours</option>
                    <option value="48">⏱️ Allow Member Edit for 48 Hours</option>
                    <option value="168">⏱️ Allow Member Edit for 7 Days</option>
                  </select>
                  <small style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    {editModalSub?.memberEditUntil && new Date(editModalSub.memberEditUntil) > new Date()
                      ? `Current window active until: ${new Date(editModalSub.memberEditUntil).toLocaleString()}`
                      : "Members currently cannot edit links until a window is granted."}
                  </small>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditModalSub(null)}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                    border: "none",
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

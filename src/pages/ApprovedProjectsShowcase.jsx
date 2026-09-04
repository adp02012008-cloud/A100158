import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import UnifiedLoader from "../components/UnifiedLoader";
import "./ApprovedProjectsShowcase.css";

// Vector & emoji icons per domain
const DOMAIN_CONFIG = {
  "Full-Stack Software Development": { icon: "💻", color: "#10b981", bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" },
  "UI/UX Design & Prototyping": { icon: "🎨", color: "#ec4899", bg: "linear-gradient(135deg, #180927 0%, #31103f 100%)" },
  "AI / Machine Learning": { icon: "🤖", color: "#8b5cf6", bg: "linear-gradient(135deg, #091a2f 0%, #1e1b4b 100%)" },
  "Mobile App Development": { icon: "📱", color: "#0ea5e9", bg: "linear-gradient(135deg, #0c1a2c 0%, #0f2e46 100%)" },
  "Cloud & DevOps Engineering": { icon: "☁️", color: "#f59e0b", bg: "linear-gradient(135deg, #1f1607 0%, #2f200c 100%)" },
  "Cyber Security": { icon: "🛡️", color: "#ef4444", bg: "linear-gradient(135deg, #240b0b 0%, #3b1111 100%)" },
  "Core": { icon: "⚡", color: "#6366f1", bg: "linear-gradient(135deg, #110d29 0%, #1a1542 100%)" },
};

function getDomainMeta(domain = "Core") {
  return (
    DOMAIN_CONFIG[domain] || {
      icon: "🚀",
      color: "#34d399",
      bg: "linear-gradient(135deg, #0f172a 0%, #181135 100%)",
    }
  );
}

// Convert presentation link to embeddable preview if possible (Google Slides, etc.)
function getPresentationEmbedUrl(url = "") {
  if (!url) return "";
  const trimmed = url.trim();
  // Google Slides edit link -> embed link
  if (trimmed.includes("docs.google.com/presentation")) {
    return trimmed.replace(/\/edit.*$/, "/embed?start=false&loop=false&delayms=3000");
  }
  // OneDrive / Office Online PowerPoint embed
  if (trimmed.includes("onedrive.live.com/embed") || trimmed.includes("view.officeapps.live.com")) {
    return trimmed;
  }
  return trimmed;
}

export default function ApprovedProjectsShowcase({ search: navbarSearch = "" }) {
  const { auth, currentUser } = useAuth();
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [localSearch, setLocalSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const isUserAdmin = auth?.role === "ADMIN" || currentUser?.role === "ADMIN";

  // Lightbox Modal State
  const [lightbox, setLightbox] = useState({
    open: false,
    images: [],
    currentIndex: 0,
    title: "",
  });

  // Presentation (PPT / Slides) Viewer Modal State
  const [pptModal, setPptModal] = useState({
    open: false,
    url: "",
    title: "",
  });

  // Team Contributors Modal State (for full member list popup)
  const [teamModal, setTeamModal] = useState({
    open: false,
    title: "",
    members: [],
  });

  // Member Self-Edit Modal State
  const [editModalSub, setEditModalSub] = useState(null);
  const [editForm, setEditForm] = useState({
    githubUrl: "",
    demoUrl: "",
    presentationUrl: "",
    images: [],
    notes: "",
    editHours: "0",
  });
  const [editImgInput, setEditImgInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Two-Step Verification Delete Modal State
  const [deleteSub, setDeleteSub] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Direct Add Project Modal State
  const [directAddOpen, setDirectAddOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [directImgInput, setDirectImgInput] = useState("");
  const [directForm, setDirectForm] = useState({
    title: "",
    domain: "Full-Stack Software Development",
    githubUrl: "",
    demoUrl: "",
    presentationUrl: "",
    images: [],
    notes: "",
    submittedBy: "",
    submittedFor: [],
  });
  const [savingDirect, setSavingDirect] = useState(false);

  // Fetch projects and users
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
      if (u._id) map[String(u._id)] = u.name || u.email;
    });
    return map;
  }, [users]);

  const getDisplayName = (val) => {
    if (!val) return "Unknown Submitter";
    if (typeof val === "object") return val.name || val.email || "Unknown Submitter";
    const str = String(val).trim();
    return userMap[str] || userMap[str.toLowerCase()] || val;
  };

  const getInitials = (name) => {
    const clean = String(name || "").trim();
    if (!clean) return "BS";
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  // Compute available domains with counts
  const domainStats = useMemo(() => {
    const counts = { All: approvedSubmissions.length };
    approvedSubmissions.forEach((s) => {
      const d = s.taskId?.domain || "Core";
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [approvedSubmissions]);

  const availableDomains = useMemo(() => {
    const set = new Set();
    approvedSubmissions.forEach((s) => {
      set.add(s.taskId?.domain || "Core");
    });
    return ["All", ...Array.from(set)];
  }, [approvedSubmissions]);

  // Total unique contributors count
  const totalContributorsCount = useMemo(() => {
    const set = new Set();
    approvedSubmissions.forEach((s) => {
      if (s.submittedBy) set.add(String(s.submittedBy._id || s.submittedBy));
      if (Array.isArray(s.submittedFor)) {
        s.submittedFor.forEach((m) => set.add(String(m._id || m)));
      }
    });
    return set.size;
  }, [approvedSubmissions]);

  // Combined Search & Filter
  const activeSearch = localSearch || navbarSearch;

  const filteredProjects = useMemo(() => {
    let result = approvedSubmissions.filter((sub) => {
      const title = sub.taskId?.title || "Untitled Project";
      const domain = sub.taskId?.domain || "Core";
      const notes = sub.notes || "";
      const leadName = getDisplayName(sub.submittedBy);

      const q = activeSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        title.toLowerCase().includes(q) ||
        domain.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q) ||
        leadName.toLowerCase().includes(q);

      const matchDomain = domainFilter === "All" || domain === domainFilter;

      return matchSearch && matchDomain;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "title") {
        const titleA = (a.taskId?.title || "").toLowerCase();
        const titleB = (b.taskId?.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      }
      if (sortBy === "contributors") {
        const countA = Array.isArray(a.submittedFor) ? a.submittedFor.length : 1;
        const countB = Array.isArray(b.submittedFor) ? b.submittedFor.length : 1;
        return countB - countA;
      }
      // Default: newest
      return new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0);
    });

    return result;
  }, [approvedSubmissions, activeSearch, domainFilter, sortBy, userMap]);

  const isMemberEditAllowed = (sub) => {
    if (!sub.memberEditUntil) return false;
    return new Date(sub.memberEditUntil) > new Date();
  };

  // ── Handlers for Images (File & URL) ──
  const handleImageFileUpload = (e, formType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (formType === "direct") {
          setDirectForm((prev) => ({
            ...prev,
            images: [...prev.images, dataUrl],
          }));
        } else {
          setEditForm((prev) => ({
            ...prev,
            images: [...prev.images, dataUrl],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleAddImageUrl = (formType) => {
    const input = formType === "direct" ? directImgInput.trim() : editImgInput.trim();
    if (!input) return;

    if (formType === "direct") {
      setDirectForm((prev) => ({
        ...prev,
        images: [...prev.images, input],
      }));
      setDirectImgInput("");
    } else {
      setEditForm((prev) => ({
        ...prev,
        images: [...prev.images, input],
      }));
      setEditImgInput("");
    }
  };

  const handleRemoveImage = (index, formType) => {
    if (formType === "direct") {
      setDirectForm((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
  };

  // ── Edit Modal Handlers ──
  const handleOpenEditModal = (sub) => {
    setEditModalSub(sub);
    const existingImages = Array.isArray(sub.images) && sub.images.length > 0
      ? [...sub.images]
      : (sub.files && sub.files.filter((f) => String(f).match(/\.(png|jpg|jpeg|webp|gif)/i))) || [];

    setEditForm({
      githubUrl: sub.githubUrl || "",
      demoUrl: sub.demoUrl || "",
      presentationUrl: sub.presentationUrl || sub.pptUrl || "",
      images: existingImages,
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

  // ── Delete Handlers ──
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

  // ── Direct Publish Handler ──
  const handleDirectPublishSubmit = async (e) => {
    e.preventDefault();
    if (!directForm.title.trim()) return alert("Project title is required.");

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
      alert("🚀 Project published to showcase successfully!");
      setDirectAddOpen(false);
      setCustomDomain("");
      setDirectImgInput("");
      setDirectForm({
        title: "",
        domain: "Full-Stack Software Development",
        githubUrl: "",
        demoUrl: "",
        presentationUrl: "",
        images: [],
        notes: "",
        submittedBy: users[0]?._id || "",
        submittedFor: [],
      });
      await loadData();
    } catch (err) {
      alert("Failed to publish project: " + (err?.message || "Unknown error"));
    } finally {
      setSavingDirect(false);
    }
  };

  return (
    <div className="projects-showcase-container">
      {/* ── Executive Hero Header ── */}
      <section className="showcase-hero">
        <div className="showcase-hero-content">
          <div className="showcase-hero-badge">
            <span className="showcase-pulse-dot" />
            Verified Deliverables Portfolio
          </div>
          <h1 className="showcase-hero-title">
            Engineering Projects & Deliverables Showcase
          </h1>
          <p className="showcase-hero-subtitle">
            Explore peer-reviewed software systems, production web apps, AI models, and executive presentations
            crafted and certified by the Bug Slayers squad.
          </p>
        </div>

        <div className="showcase-hero-actions">
          {/* Key Stats Counter */}
          <div className="showcase-stats-chip">
            <div className="stat-item">
              <span className="stat-num">{approvedSubmissions.length}</span>
              <span className="stat-lbl">Projects</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{Math.max(1, availableDomains.length - 1)}</span>
              <span className="stat-lbl">Domains</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{totalContributorsCount}</span>
              <span className="stat-lbl">Minds</span>
            </div>
          </div>

          {isUserAdmin && (
            <button
              type="button"
              className="btn-direct-publish"
              onClick={() => {
                setDirectForm({
                  title: "",
                  domain: "Full-Stack Software Development",
                  githubUrl: "",
                  demoUrl: "",
                  presentationUrl: "",
                  images: [],
                  notes: "",
                  submittedBy: users[0]?._id || "",
                  submittedFor: [],
                });
                setDirectAddOpen(true);
              }}
            >
              ⚡ Direct Publish Project
            </button>
          )}
        </div>
      </section>

      {/* ── Search, Filter & Sort Controls ── */}
      <section className="showcase-control-bar">
        <div className="showcase-search-sort-row">
          <div className="showcase-search-box">
            <span className="showcase-search-icon">🔍</span>
            <input
              type="text"
              className="showcase-search-input"
              placeholder="Search projects, domains, leads, or technologies…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                className="showcase-search-clear"
                onClick={() => setLocalSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>Sort By:</span>
            <select
              className="showcase-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">📅 Newest Published</option>
              <option value="title">🔤 Project Name (A-Z)</option>
              <option value="contributors">👥 Most Collaborators</option>
            </select>
          </div>
        </div>

        {/* Domain Filter Chips */}
        {availableDomains.length > 1 && (
          <div className="domain-chips-wrap">
            {availableDomains.map((d) => {
              const isActive = domainFilter === d;
              const meta = getDomainMeta(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomainFilter(d)}
                  className={`domain-chip-btn ${isActive ? "active" : ""}`}
                >
                  <span>{d === "All" ? "🌐" : meta.icon}</span>
                  <span>{d === "All" ? "All Domains" : d}</span>
                  <span className="domain-count-tag">{domainStats[d] || 0}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Main Projects Grid ── */}
      {loading ? (
        <UnifiedLoader
          title="Loading Showcase Portfolio…"
          subtitle="Gathering certified project deliverables, presentations, and live demos"
          minHeight="340px"
        />
      ) : filteredProjects.length === 0 ? (
        <div
          style={{
            background: "rgba(24, 16, 46, 0.6)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
            borderRadius: "20px",
            padding: "60px 24px",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: "38px", marginBottom: "12px" }}>🔍</div>
          <h3 style={{ margin: "0 0 8px 0", color: "#f8fafc", fontSize: "18px" }}>
            No projects matched your criteria
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Try adjusting your search query or selecting a different domain category.
          </p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((sub) => {
            const subId = sub._id || sub.id;
            const taskTitle = sub.taskId?.title || "Untitled Project";
            const taskDomain = sub.taskId?.domain || "Core";
            const domainMeta = getDomainMeta(taskDomain);
            const submitterName = getDisplayName(sub.submittedBy);
            const isEditAllowed = isMemberEditAllowed(sub);

            // Images logic
            const projectImages = Array.isArray(sub.images) && sub.images.length > 0
              ? sub.images
              : (sub.files && sub.files.filter((f) => String(f).match(/\.(png|jpg|jpeg|webp|gif)/i))) || [];
            const coverImage = projectImages.length > 0 ? projectImages[0] : null;

            // Presentation logic
            const pptUrl = sub.presentationUrl || sub.pptUrl || "";

            // Contributor list logic
            const contributorsList = Array.isArray(sub.submittedFor) && sub.submittedFor.length > 0
              ? sub.submittedFor
              : [sub.submittedBy];

            return (
              <div key={subId} className="project-card">
                {/* ── 16:9 Media Cover ── */}
                <div
                  className="project-card-media"
                  onClick={() => {
                    if (projectImages.length > 0) {
                      setLightbox({
                        open: true,
                        images: projectImages,
                        currentIndex: 0,
                        title: taskTitle,
                      });
                    }
                  }}
                  title={projectImages.length > 0 ? "Click to inspect screenshots" : taskTitle}
                >
                  {coverImage ? (
                    <img src={coverImage} alt={taskTitle} className="project-card-img" />
                  ) : (
                    <div className="project-card-fallback-banner" style={{ background: domainMeta.bg }}>
                      <div className="banner-grid-overlay" />
                      <span className="banner-tech-icon">{domainMeta.icon}</span>
                      <span className="banner-domain-tag">{taskDomain}</span>
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="media-overlay-top">
                    <span className="media-domain-badge">
                      {domainMeta.icon} {taskDomain}
                    </span>
                    <span className="media-version-badge">
                      ✓ V{sub.version || 1} Approved
                    </span>
                  </div>

                  <div className="media-overlay-bottom">
                    {projectImages.length > 0 && (
                      <span className="media-badge-pill">
                        📷 {projectImages.length} {projectImages.length === 1 ? "Photo" : "Photos"}
                      </span>
                    )}
                    {pptUrl && (
                      <span className="media-badge-pill ppt">
                        📊 PPT Deck
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Card Content Body ── */}
                <div className="project-card-body">
                  <h3 className="project-card-title">{taskTitle}</h3>

                  {/* Submitter & Team Facepile */}
                  <div className="project-team-row">
                    <div className="project-lead-bar">
                      <span className="lead-crown-icon">👑</span>
                      <span>Lead Submitter:</span>
                      <span className="lead-name-highlight">{submitterName}</span>
                    </div>

                    <div className="team-facepile-container">
                      <div className="facepile-avatars">
                        {contributorsList.slice(0, 5).map((m, idx) => {
                          const name = getDisplayName(m);
                          return (
                            <div
                              key={typeof m === "object" ? m._id || idx : `${m}-${idx}`}
                              className="facepile-avatar-circle"
                              title={name}
                            >
                              {getInitials(name)}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="facepile-count-btn"
                        onClick={() =>
                          setTeamModal({
                            open: true,
                            title: taskTitle,
                            members: contributorsList,
                          })
                        }
                      >
                        👥 {contributorsList.length} Team {contributorsList.length === 1 ? "Member" : "Members"} &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Project Overview / Notes */}
                  {sub.notes && (
                    <p className="project-card-notes" title={sub.notes}>
                      {sub.notes}
                    </p>
                  )}
                </div>

                {/* ── Card Footer Action Bar ── */}
                <div className="project-card-footer">
                  {/* Primary Link Buttons */}
                  <div className="primary-links-grid">
                    {sub.demoUrl && (
                      <a
                        href={sub.demoUrl.startsWith("http") ? sub.demoUrl : `https://${sub.demoUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="action-btn-demo"
                      >
                        🚀 Live Demo
                      </a>
                    )}

                    {sub.githubUrl && (
                      <a
                        href={sub.githubUrl.startsWith("http") ? sub.githubUrl : `https://${sub.githubUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="action-btn-repo"
                      >
                        📦 Code Repo
                      </a>
                    )}
                  </div>

                  {/* PPT Presentation Button */}
                  {pptUrl && (
                    <button
                      type="button"
                      className="action-btn-ppt"
                      onClick={() =>
                        setPptModal({
                          open: true,
                          url: pptUrl,
                          title: taskTitle,
                        })
                      }
                    >
                      📊 View Presentation / PPT Deck
                    </button>
                  )}

                  {/* Admin / Edit Action Row */}
                  {(isEditAllowed || isUserAdmin) && (
                    <div className="admin-action-row">
                      <button
                        type="button"
                        className="action-btn-edit"
                        onClick={() => handleOpenEditModal(sub)}
                      >
                        ✏️ {isUserAdmin ? "Edit Project & Grant Perms" : "Edit Deliverable (Window Open)"}
                      </button>

                      {isUserAdmin && (
                        <button
                          type="button"
                          className="action-btn-delete"
                          onClick={() => {
                            setDeleteSub(sub);
                            setDeleteConfirmText("");
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Presentation / Slides Viewer Modal ── */}
      {pptModal.open && (
        <div className="ppt-modal-wrapper" onClick={() => setPptModal({ open: false, url: "", title: "" })}>
          <div className="ppt-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="ppt-modal-header">
              <div className="ppt-modal-title">
                <span>📊</span>
                <span>Presentation Slides — {pptModal.title}</span>
              </div>
              <div className="ppt-modal-actions">
                <a
                  href={pptModal.url.startsWith("http") ? pptModal.url : `https://${pptModal.url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#f8fafc",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  🔗 Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPptModal({ open: false, url: "", title: "" })}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="ppt-modal-body">
              {pptModal.url.includes("docs.google.com/presentation") ||
              pptModal.url.includes("view.officeapps.live.com") ||
              pptModal.url.endsWith(".pdf") ? (
                <iframe
                  src={getPresentationEmbedUrl(pptModal.url)}
                  className="ppt-iframe"
                  title="Presentation Slide Deck"
                  allowFullScreen
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: "52px", marginBottom: "16px" }}>📽️</div>
                  <h3 style={{ margin: "0 0 10px 0", color: "#f8fafc" }}>
                    Presentation Deck Attached
                  </h3>
                  <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "0 auto 20px auto", fontSize: "14px" }}>
                    This presentation can be launched directly in your browser or PowerPoint viewer.
                  </p>
                  <a
                    href={pptModal.url.startsWith("http") ? pptModal.url : `https://${pptModal.url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: "700",
                      fontSize: "14px",
                      boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    🚀 Launch Slide Deck in Full Screen
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Image Lightbox Gallery Modal ── */}
      {lightbox.open && lightbox.images.length > 0 && (
        <div className="lightbox-modal-wrapper" onClick={() => setLightbox({ open: false, images: [], currentIndex: 0, title: "" })}>
          <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px" }}>
              🖼️ {lightbox.title} — Screenshot {lightbox.currentIndex + 1} of {lightbox.images.length}
            </div>
            <button
              type="button"
              onClick={() => setLightbox({ open: false, images: [], currentIndex: 0, title: "" })}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ✕
            </button>
          </div>

          <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
            {lightbox.images.length > 1 && (
              <button
                type="button"
                className="lightbox-nav-btn prev"
                onClick={() =>
                  setLightbox((prev) => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
                  }))
                }
              >
                ‹
              </button>
            )}

            <img
              src={lightbox.images[lightbox.currentIndex]}
              alt={`Screenshot ${lightbox.currentIndex + 1}`}
              className="lightbox-img"
            />

            {lightbox.images.length > 1 && (
              <button
                type="button"
                className="lightbox-nav-btn next"
                onClick={() =>
                  setLightbox((prev) => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.images.length,
                  }))
                }
              >
                ›
              </button>
            )}
          </div>

          {lightbox.images.length > 1 && (
            <div className="lightbox-thumbnails-bar" onClick={(e) => e.stopPropagation()}>
              {lightbox.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Thumb ${idx + 1}`}
                  className={`lightbox-thumb ${idx === lightbox.currentIndex ? "active" : ""}`}
                  onClick={() => setLightbox((prev) => ({ ...prev, currentIndex: idx }))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Team Contributors Modal ── */}
      {teamModal.open && (
        <div className="ppt-modal-wrapper" onClick={() => setTeamModal({ open: false, title: "", members: [] })}>
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#181033",
              border: "1px solid rgba(52, 211, 153, 0.35)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#34d399", fontSize: "18px" }}>
                🏆 Recognized Squad Contributors
              </h3>
              <button
                type="button"
                onClick={() => setTeamModal({ open: false, title: "", members: [] })}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "16px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 16px 0", color: "#cbd5e1", fontSize: "13px" }}>
              Team members recognized for contributing to <strong>"{teamModal.title}"</strong>:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
              {teamModal.members.map((m, idx) => {
                const name = getDisplayName(m);
                const email = typeof m === "object" ? m.email : "";
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "10px 14px",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #10b981 0%, #0284c7 100%)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getInitials(name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "14px" }}>
                        {name}
                      </div>
                      {email && (
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                          {email}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Add / Publish Project Modal ── */}
      {directAddOpen && (
        <div className="ppt-modal-wrapper" onClick={() => setDirectAddOpen(false)}>
          <div
            style={{
              width: "100%",
              maxWidth: "640px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#160f2e",
              border: "1px solid rgba(52, 211, 153, 0.35)",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#34d399", fontSize: "20px", fontWeight: "800" }}>
                ⚡ Direct Publish Project to Showcase
              </h3>
              <button
                type="button"
                onClick={() => setDirectAddOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDirectPublishSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Section 1: Basic Information */}
              <div className="modal-form-section">
                <div className="modal-section-heading">
                  <span>📌</span> Basic Project Details
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI-Powered Team Analytics Dashboard"
                    value={directForm.title}
                    onChange={(e) => setDirectForm({ ...directForm, title: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                    Domain / Category *
                  </label>
                  <select
                    value={directForm.domain}
                    onChange={(e) => setDirectForm({ ...directForm, domain: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  >
                    <option value="Full-Stack Software Development">💻 Full-Stack Software Development</option>
                    <option value="UI/UX Design & Prototyping">🎨 UI/UX Design & Prototyping</option>
                    <option value="AI / Machine Learning">🤖 AI / Machine Learning</option>
                    <option value="Mobile App Development">📱 Mobile App Development</option>
                    <option value="Cloud & DevOps Engineering">☁️ Cloud & DevOps Engineering</option>
                    <option value="Cyber Security">🛡️ Cyber Security</option>
                    <option value="Core">⚡ Core Engineering</option>
                    <option value="Other">✨ Other (Custom Domain)</option>
                  </select>

                  {directForm.domain === "Other" && (
                    <div style={{ marginTop: "10px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#34d399", display: "block", marginBottom: "4px" }}>
                        Type Custom Domain Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Blockchain & Web3, Game Development, Data Science…"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#0c081e", border: "1px solid #34d399", color: "#fff" }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Team Attribution */}
              <div className="modal-form-section">
                <div className="modal-section-heading">
                  <span>👥</span> Team Attribution & Contributors
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                    Lead Submitter / Creator *
                  </label>
                  <select
                    value={directForm.submittedBy}
                    onChange={(e) => setDirectForm({ ...directForm, submittedBy: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
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
                      Team Contributors (Recognize collaborators)
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
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
                        ✕ Clear
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      maxHeight: "140px",
                      overflowY: "auto",
                      padding: "10px",
                      background: "#0c081e",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
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
                            padding: "5px 10px",
                            borderRadius: "16px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            background: isSelected
                              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                              : "rgba(255, 255, 255, 0.06)",
                            border: isSelected ? "1px solid #34d399" : "1px solid rgba(255, 255, 255, 0.12)",
                            color: isSelected ? "#ffffff" : "#94a3b8",
                          }}
                        >
                          {isSelected ? "✓ " : "+ "} {u.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: PPT / Presentation & Screenshots */}
              <div className="modal-form-section">
                <div className="modal-section-heading">
                  <span>📊</span> Presentation (PPT / Slides) & Screenshots
                </div>

                {/* PPT Option */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#fbbf24", display: "block", marginBottom: "6px" }}>
                    Presentation / PPT URL (Google Slides, Canva, Microsoft PowerPoint Online, or OneDrive)
                  </label>
                  <input
                    type="text"
                    placeholder="https://docs.google.com/presentation/d/... or PPTX link"
                    value={directForm.presentationUrl}
                    onChange={(e) => setDirectForm({ ...directForm, presentationUrl: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#0c081e", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fff" }}
                  />
                  <small style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    Supports Google Slides, PowerPoint Online, Canva decks, or direct presentation links.
                  </small>
                </div>

                {/* Screenshots / Images Option */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8", display: "block", marginBottom: "6px" }}>
                    Project Images & Screenshots Gallery
                  </label>

                  {/* Upload from device + Paste URL */}
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <label
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>📁 Upload Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageFileUpload(e, "direct")}
                        style={{ display: "none" }}
                      />
                    </label>

                    <div style={{ flex: 1, minWidth: "200px", display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Or paste image URL (https://…)"
                        value={directImgInput}
                        onChange={(e) => setDirectImgInput(e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "12px" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddImageUrl("direct")}
                        style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview Strip */}
                  {directForm.images.length > 0 && (
                    <div className="image-preview-strip">
                      {directForm.images.map((img, idx) => (
                        <div key={idx} className="image-preview-thumb-wrap">
                          <img src={img} alt={`Preview ${idx}`} className="image-preview-thumb" />
                          <button
                            type="button"
                            className="image-remove-badge"
                            onClick={() => handleRemoveImage(idx, "direct")}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: URLs & Overview */}
              <div className="modal-form-section">
                <div className="modal-section-heading">
                  <span>🔗</span> Links & Deliverable Overview
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                      Live Demo URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://my-app.vercel.app"
                      value={directForm.demoUrl}
                      onChange={(e) => setDirectForm({ ...directForm, demoUrl: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                      GitHub Repository URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://github.com/..."
                      value={directForm.githubUrl}
                      onChange={(e) => setDirectForm({ ...directForm, githubUrl: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Project Description / Key Highlights
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Key architectural highlights, tech stack, and achievements…"
                    value={directForm.notes}
                    onChange={(e) => setDirectForm({ ...directForm, notes: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setDirectAddOpen(false)}
                  style={{ padding: "10px 18px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDirect}
                  style={{ padding: "10px 24px", borderRadius: "10px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)" }}
                >
                  {savingDirect ? "Publishing…" : "🚀 Publish Directly to Showcase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Member Self-Edit Modal ── */}
      {editModalSub && (
        <div className="ppt-modal-wrapper" onClick={() => setEditModalSub(null)}>
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#160f2e",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#38bdf8", fontWeight: "700" }}>
                ✏️ Edit Project Deliverable — {editModalSub.taskId?.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalSub(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="modal-form-section">
                <div className="modal-section-heading">
                  <span>📊</span> Presentation (PPT / Slides) & Screenshots
                </div>

                {/* PPT Input */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#fbbf24", display: "block", marginBottom: "6px" }}>
                    Presentation / PPT URL (Google Slides, PowerPoint Online, Canva)
                  </label>
                  <input
                    type="text"
                    placeholder="https://docs.google.com/presentation/d/... or PPTX link"
                    value={editForm.presentationUrl}
                    onChange={(e) => setEditForm({ ...editForm, presentationUrl: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "#0c081e", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fff" }}
                  />
                </div>

                {/* Images Input */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8", display: "block", marginBottom: "6px" }}>
                    Project Screenshots & Media Gallery
                  </label>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <label
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>📁 Upload Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageFileUpload(e, "edit")}
                        style={{ display: "none" }}
                      />
                    </label>

                    <div style={{ flex: 1, minWidth: "180px", display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Paste image URL…"
                        value={editImgInput}
                        onChange={(e) => setEditImgInput(e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "12px" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddImageUrl("edit")}
                        style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview Strip */}
                  {editForm.images.length > 0 && (
                    <div className="image-preview-strip">
                      {editForm.images.map((img, idx) => (
                        <div key={idx} className="image-preview-thumb-wrap">
                          <img src={img} alt={`Preview ${idx}`} className="image-preview-thumb" />
                          <button
                            type="button"
                            className="image-remove-badge"
                            onClick={() => handleRemoveImage(idx, "edit")}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Links & Notes */}
              <div className="modal-form-section">
                <div className="modal-section-heading">
                  <span>🔗</span> Project URLs & Description
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Live Demo URL
                  </label>
                  <input
                    type="text"
                    value={editForm.demoUrl}
                    onChange={(e) => setEditForm({ ...editForm, demoUrl: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px" }}
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    GitHub Code Repo URL
                  </label>
                  <input
                    type="text"
                    value={editForm.githubUrl}
                    onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Notes / Highlights
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Admin Temporary Edit Window Grant */}
              {isUserAdmin && (
                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "12px", padding: "14px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#fbbf24", display: "block", marginBottom: "6px" }}>
                    ⏱️ Grant Temporary Member Edit Window
                  </label>
                  <select
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0c081e", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#f8fafc", fontSize: "13px", fontWeight: "600" }}
                    value={editForm.editHours || "0"}
                    onChange={(e) => setEditForm({ ...editForm, editHours: e.target.value })}
                  >
                    <option value="0">🔒 Locked (No Member Edit Allowed)</option>
                    <option value="1">⏱️ Allow Member Edit for 1 Hour</option>
                    <option value="24">⏱️ Allow Member Edit for 24 Hours</option>
                    <option value="48">⏱️ Allow Member Edit for 48 Hours</option>
                    <option value="168">⏱️ Allow Member Edit for 7 Days</option>
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setEditModalSub(null)}
                  style={{ padding: "9px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ padding: "9px 22px", borderRadius: "8px", background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", border: "none", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2-Step Verification Delete Modal ── */}
      {deleteSub && (
        <div className="ppt-modal-wrapper" onClick={() => setDeleteSub(null)}>
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#180f24",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#f87171", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ Confirm Permanent Project Deletion
            </h3>

            <p style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>
              Are you sure you want to permanently remove <strong>"{deleteSub.taskId?.title || "this project"}"</strong> from the showcase?
            </p>

            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px", padding: "12px 14px", margin: "14px 0" }}>
              <p style={{ margin: 0, color: "#fca5a5", fontSize: "12px", fontWeight: "700" }}>
                🔒 Two-Step Security Verification:
              </p>
              <p style={{ margin: "4px 0 0 0", color: "#e2e8f0", fontSize: "12px" }}>
                Type <strong style={{ color: "#f87171", letterSpacing: "1px" }}>DELETE</strong> to confirm:
              </p>
            </div>

            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                background: "#0d0718",
                border: deleteConfirmText === "DELETE" ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "1px",
                marginBottom: "18px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteSub(null)}
                style={{ padding: "9px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "DELETE" || deleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  background: deleteConfirmText === "DELETE" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(239, 68, 68, 0.2)",
                  border: "none",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: deleteConfirmText === "DELETE" && !deleting ? "pointer" : "not-allowed",
                  opacity: deleteConfirmText === "DELETE" && !deleting ? 1 : 0.4,
                  fontSize: "13px",
                }}
              >
                {deleting ? "Deleting…" : "🗑️ Confirm Permanent Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/Opportunities.jsx - Executive Hackathon & Opportunities Hub
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import UnifiedLoader from "../components/UnifiedLoader";
import "./Opportunities.css";

const CATEGORIES = ["All", "Hackathon", "Internship", "Contest", "Workshop", "Scholarship"];

export default function Opportunities({ search: navbarSearch = "" }) {
  const { auth, currentUser, isTeamMember, isAdmin } = useAuth();

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [sortBy, setSortBy] = useState("deadline"); // 'deadline', 'newest', 'prizes'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [detailsOpp, setDetailsOpp] = useState(null);
  const [thoughtsOpp, setThoughtsOpp] = useState(null);

  // Form State (ALL FIELDS ARE COMPLETELY OPTIONAL - ZERO MANDATORY)
  const [formData, setFormData] = useState({
    title: "",
    organizer: "",
    type: "Hackathon",
    eventLevel: "National",
    description: "",
    link: "",
    guidelinesUrl: "",
    internalFormUrl: "",
    deadline: "",
    teamSize: "2-5 Members",
    registrationFee: "Free",
    tracks: "",
    schedule: "",
    prizes: "",
    rewardPoints: "",
    pskillEligibility: "",
    facultyMentor: "",
    contactInfo: "",
    bannerImage: "",
  });

  // Circular / Announcement Text Importer State
  const [circularText, setCircularText] = useState("");
  const [showImporter, setShowImporter] = useState(false);
  const [importerSuccess, setImporterSuccess] = useState("");

  // Thoughts modal state & tabs
  const [thoughtsTab, setThoughtsTab] = useState("discussion"); // 'discussion' | 'interested'
  const [newThoughtText, setNewThoughtText] = useState("");
  const [newThoughtTag, setNewThoughtTag] = useState("Looking for Team");
  const [submittingThought, setSubmittingThought] = useState(false);
  const [thoughtError, setThoughtError] = useState("");
  const [copiedEmail, setCopiedEmail] = useState("");

  const handleCopyEmail = (email) => {
    if (!email) return;
    try {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(""), 2500);
    } catch {
      // Fallback
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(""), 2500);
    }
  };

  // Current user info
  const userEmail = currentUser?.email || auth?.email || "";
  const userName = currentUser?.name || currentUser?.displayName || auth?.displayName || userEmail.split("@")[0] || "Member";

  // Load Opportunities from API
  const loadOpportunities = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/opportunities");
      const list = Array.isArray(res) ? res : res.opportunities || [];
      setOpportunities(list);
    } catch (err) {
      console.error("Failed to load opportunities:", err);
      setError("Unable to load opportunities right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  // Smart Circular / Announcement Text Auto-Parser
  const handleParseCircular = () => {
    if (!circularText.trim()) return;

    const text = circularText;
    const parsed = { ...formData };

    // 1. URLs extraction
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = text.match(urlRegex) || [];

    urls.forEach((url) => {
      const cleanUrl = url.replace(/[),.]+$/, "");
      if (cleanUrl.includes("drive.google.com") || cleanUrl.toLowerCase().includes("guidelines")) {
        if (!parsed.guidelinesUrl) parsed.guidelinesUrl = cleanUrl;
      } else if (
        cleanUrl.includes("forms.gle") ||
        cleanUrl.includes("docs.google.com/forms")
      ) {
        if (!parsed.link) {
          parsed.link = cleanUrl;
        } else if (!parsed.internalFormUrl) {
          parsed.internalFormUrl = cleanUrl;
        }
      } else if (!parsed.link) {
        parsed.link = cleanUrl;
      }
    });

    // 2. Title detection: look for lines mentioning Hackathon, Challenge, Contest, or early uppercase title
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let line of lines) {
      if (
        /hackathon|challenge|contest|symposium|internship/i.test(line) &&
        !line.toLowerCase().startsWith("warm greetings") &&
        !line.toLowerCase().startsWith("hackathon tracks") &&
        !line.toLowerCase().startsWith("event structure") &&
        line.length < 80
      ) {
        parsed.title = line.replace(/^[\s*#-]+/, "").trim();
        break;
      }
    }
    if (!parsed.title && lines.length > 1) {
      // Fallback: second line or first substantive line
      parsed.title = lines[0].length < 60 ? lines[0] : lines[1]?.slice(0, 60);
    }

    // 3. Organizer detection
    if (/c-dac/i.test(text)) {
      parsed.organizer = "C-DAC India";
    } else {
      const orgMatch = text.match(/organized by[:\s]+([^\n\r,.!]+)/i) || text.match(/from\s+([^\n\r,.!]+)/i);
      if (orgMatch) parsed.organizer = orgMatch[1].trim();
    }

    // 4. Team Size
    const teamMatch = text.match(/team size[:\s]+([^\n\r]+)/i);
    if (teamMatch) parsed.teamSize = teamMatch[1].trim();

    // 5. Registration Fees
    if (/no registration fee|free registration|free/i.test(text)) {
      parsed.registrationFee = "Free (No Registration Fees)";
    } else {
      const feeMatch = text.match(/registration fees?[:\s]+([^\n\r]+)/i);
      if (feeMatch) parsed.registrationFee = feeMatch[1].trim();
    }

    // 6. Level (National / Global / College)
    if (/national-level|national level/i.test(text)) {
      parsed.eventLevel = "National";
    } else if (/international|global/i.test(text)) {
      parsed.eventLevel = "International";
    } else if (/state level|state-level/i.test(text)) {
      parsed.eventLevel = "State Level";
    }

    // 7. PSkill / Eligibility
    const pskillMatch = text.match(/(?:PSkill|Level)\s*Eligibility[:\s]+([^\n\r]+(?:\n[^\n\r]+)?)/i) ||
      text.match(/Eligibility\s*:?\s*([\s\S]*?)(?=Team size|Registration|Event Structure|Hackathon Tracks|$)/i);
    if (pskillMatch) {
      parsed.pskillEligibility = pskillMatch[1].trim();
    }

    // 8. Reward Points
    const pointsMatch = text.match(/Reward points?[:\s]+([^\n\r]+)/i) ||
      text.match(/(\d+\s*(?:points|pts)[^\n\r]*)/i);
    if (pointsMatch) {
      parsed.rewardPoints = pointsMatch[1].trim();
    }

    // 9. Faculty Mentor & Contact
    const mentorMatch = text.match(/Faculty Mentor[:\s]+([^\n\r]+)/i);
    if (mentorMatch) parsed.facultyMentor = mentorMatch[1].trim();

    const contactMatch = text.match(/(?:Contact|Queries|Coordinator)[:\s]+([^\n\r]+)/i);
    if (contactMatch) parsed.contactInfo = contactMatch[1].trim();

    // 10. Tracks extraction
    const tracksMatch = text.match(/Hackathon Tracks?[:\s]+([\s\S]*?)(?=Important Dates|Event Structure|Registration|Prize|$)/i);
    if (tracksMatch) {
      parsed.tracks = tracksMatch[1].trim();
    }

    // 11. Prizes extraction
    const prizesMatch = text.match(/(?:Prize Distribution|Prizes?|Cash Prizes?)[:\s]+([\s\S]*?)(?=Registration|Important Dates|Contact|Guidelines|$)/i);
    if (prizesMatch) {
      parsed.prizes = prizesMatch[1].trim();
    }

    // 12. Schedule / Dates
    const datesMatch = text.match(/(?:Important Dates|Event Schedule|Structure)[:\s]+([\s\S]*?)(?=Hackathon Tracks|Registration|Prizes|$)/i);
    if (datesMatch) {
      parsed.schedule = datesMatch[1].trim();
    }

    // 13. Deadline extraction
    const deadlineMatch = text.match(/Deadline[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
      text.match(/(?:Last Date|Submission Date)[:\s]+([^\n\r]+)/i);
    if (deadlineMatch) {
      parsed.deadline = deadlineMatch[1].trim();
    }

    // 14. Description / Overview snippet
    const introMatch = text.match(/(?:The [^.\n]+ is a [^.\n]+\.)/i);
    if (introMatch) {
      parsed.description = introMatch[0].trim();
    } else {
      parsed.description = text.slice(0, 260).trim() + "...";
    }

    setFormData(parsed);
    setImporterSuccess("✨ Successfully extracted event details! You can fine-tune any fields below.");
    setTimeout(() => setImporterSuccess(""), 6000);
  };

  // Open Edit Modal
  const handleOpenEdit = (opp) => {
    setEditingOpp(opp);
    setFormData({
      title: opp.title || "",
      organizer: opp.organizer || "",
      type: opp.type || "Hackathon",
      eventLevel: opp.eventLevel || "National",
      description: opp.description || "",
      link: opp.link || "",
      guidelinesUrl: opp.guidelinesUrl || "",
      internalFormUrl: opp.internalFormUrl || "",
      deadline: opp.deadline || "",
      teamSize: opp.teamSize || "2-5 Members",
      registrationFee: opp.registrationFee || "Free",
      tracks: Array.isArray(opp.tracks) ? opp.tracks.join("\n") : opp.tracks || "",
      schedule: Array.isArray(opp.schedule) ? opp.schedule.join("\n") : opp.schedule || "",
      prizes: opp.prizes || "",
      rewardPoints: opp.rewardPoints || "",
      pskillEligibility: opp.pskillEligibility || "",
      facultyMentor: opp.facultyMentor || "",
      contactInfo: opp.contactInfo || "",
      bannerImage: opp.bannerImage || "",
    });
    setShowAddModal(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOpp(null);
    setFormData({
      title: "",
      organizer: "",
      type: "Hackathon",
      eventLevel: "National",
      description: "",
      link: "",
      guidelinesUrl: "",
      internalFormUrl: "",
      deadline: "",
      teamSize: "2-5 Members",
      registrationFee: "Free",
      tracks: "",
      schedule: "",
      prizes: "",
      rewardPoints: "",
      pskillEligibility: "",
      facultyMentor: "",
      contactInfo: "",
      bannerImage: "",
    });
    setCircularText("");
    setShowImporter(false);
    setShowAddModal(true);
  };

  // Save Opportunity (ZERO MANDATORY VALIDATION - COMPLETELY VOLUNTARY)
  const handleSaveOpportunity = async (e) => {
    if (e) e.preventDefault();

    try {
      const payload = {
        title: formData.title.trim() || "Untitled Opportunity",
        organizer: formData.organizer.trim() || "Independent / Open",
        type: formData.type || "Hackathon",
        eventLevel: formData.eventLevel || "National",
        description: formData.description.trim() || "No detailed description provided.",
        link: formData.link.trim() || "",
        guidelinesUrl: formData.guidelinesUrl.trim() || "",
        internalFormUrl: formData.internalFormUrl.trim() || "",
        deadline: formData.deadline.trim() || "",
        teamSize: formData.teamSize.trim() || "Open",
        registrationFee: formData.registrationFee.trim() || "Free",
        tracks: formData.tracks
          ? formData.tracks.split("\n").map((t) => t.trim()).filter(Boolean)
          : [],
        schedule: formData.schedule
          ? formData.schedule.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
        prizes: formData.prizes.trim() || "",
        rewardPoints: formData.rewardPoints.trim() || "",
        pskillEligibility: formData.pskillEligibility.trim() || "",
        facultyMentor: formData.facultyMentor.trim() || "",
        contactInfo: formData.contactInfo.trim() || "",
        bannerImage: formData.bannerImage.trim() || "",
      };

      if (editingOpp) {
        const id = editingOpp._id || editingOpp.id || editingOpp.opportunityId;
        const res = await apiFetch(`/opportunities/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const updated = res.opportunity || res;
        setOpportunities((prev) =>
          prev.map((o) => ((o._id || o.opportunityId) === id ? { ...o, ...updated } : o))
        );
      } else {
        const res = await apiFetch("/opportunities", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const created = res.opportunity || res;
        setOpportunities((prev) => [created, ...prev]);
      }

      setShowAddModal(false);
    } catch (err) {
      console.error("Error saving opportunity:", err);
      alert(`Could not save opportunity: ${err.message}`);
    }
  };

  // Delete Opportunity
  const handleDeleteOpportunity = async (opp, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${opp.title}"?`)) return;

    try {
      const id = opp._id || opp.id || opp.opportunityId;
      await apiFetch(`/opportunities/${id}`, { method: "DELETE" });
      setOpportunities((prev) => prev.filter((o) => (o._id || o.opportunityId) !== id));
      if (detailsOpp && (detailsOpp._id || detailsOpp.opportunityId) === id) {
        setDetailsOpp(null);
      }
    } catch (err) {
      console.error("Failed to delete opportunity:", err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  // 1-Click RSVP: Express Interest / Looking for Teammates
  const handleToggleInterest = async (opp, e) => {
    if (e) e.stopPropagation();
    const id = opp._id || opp.id || opp.opportunityId;

    try {
      const res = await apiFetch(`/opportunities/${id}/interest`, {
        method: "POST",
      });

      const updatedUsers = res.interestedUsers || [];
      setOpportunities((prev) =>
        prev.map((o) =>
          (o._id || o.opportunityId) === id
            ? { ...o, interestedUsers: updatedUsers }
            : o
        )
      );

      if (detailsOpp && (detailsOpp._id || detailsOpp.opportunityId) === id) {
        setDetailsOpp((prev) => ({ ...prev, interestedUsers: updatedUsers }));
      }
      if (thoughtsOpp && (thoughtsOpp._id || thoughtsOpp.opportunityId) === id) {
        setThoughtsOpp((prev) => ({ ...prev, interestedUsers: updatedUsers }));
      }
    } catch (err) {
      console.error("Failed to toggle interest:", err);
      alert(`Could not update interest: ${err.message}`);
    }
  };

  // Post Community Thought / Comment
  const handlePostThought = async (e) => {
    if (e) e.preventDefault();
    if (!thoughtsOpp || !newThoughtText.trim()) return;

    const id = thoughtsOpp._id || thoughtsOpp.id || thoughtsOpp.opportunityId;
    setSubmittingThought(true);
    setThoughtError("");

    try {
      const res = await apiFetch(`/opportunities/${id}/thoughts`, {
        method: "POST",
        body: JSON.stringify({
          content: newThoughtText.trim(),
          text: newThoughtText.trim(),
          tag: newThoughtTag,
        }),
      });

      const updatedThoughts = res.thoughts || [];
      setThoughtsOpp((prev) => ({ ...prev, thoughts: updatedThoughts }));
      setOpportunities((prev) =>
        prev.map((o) =>
          (o._id || o.opportunityId) === id
            ? { ...o, thoughts: updatedThoughts }
            : o
        )
      );
      setNewThoughtText("");
    } catch (err) {
      console.error("Failed to post thought:", err);
      setThoughtError(err.message || "Failed to post message. Please try again.");
    } finally {
      setSubmittingThought(false);
    }
  };

  // Delete Community Thought
  const handleDeleteThought = async (thoughtId) => {
    if (!thoughtsOpp) return;
    const id = thoughtsOpp._id || thoughtsOpp.id || thoughtsOpp.opportunityId;

    try {
      const res = await apiFetch(`/opportunities/${id}/thoughts/${thoughtId}`, {
        method: "DELETE",
      });

      const updatedThoughts = res.thoughts || [];
      setThoughtsOpp((prev) => ({ ...prev, thoughts: updatedThoughts }));
      setOpportunities((prev) =>
        prev.map((o) =>
          (o._id || o.opportunityId) === id
            ? { ...o, thoughts: updatedThoughts }
            : o
        )
      );
    } catch (err) {
      console.error("Failed to delete thought:", err);
      alert(`Could not delete comment: ${err.message}`);
    }
  };

  // Filtered & Sorted Opportunities
  const filteredOpportunities = useMemo(() => {
    const q = (navbarSearch || localSearch).toLowerCase().trim();

    return opportunities
      .filter((opp) => {
        // Category filter
        if (selectedCategory !== "All") {
          const type = (opp.type || "Hackathon").toLowerCase();
          if (type !== selectedCategory.toLowerCase()) return false;
        }

        // Search query
        if (!q) return true;
        const matchTitle = (opp.title || "").toLowerCase().includes(q);
        const matchOrg = (opp.organizer || "").toLowerCase().includes(q);
        const matchDesc = (opp.description || "").toLowerCase().includes(q);
        const matchTracks = Array.isArray(opp.tracks)
          ? opp.tracks.some((t) => t.toLowerCase().includes(q))
          : (opp.tracks || "").toLowerCase().includes(q);
        const matchLevel = (opp.eventLevel || "").toLowerCase().includes(q);

        return matchTitle || matchOrg || matchDesc || matchTracks || matchLevel;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === "prizes") {
          return (b.prizes ? 1 : 0) - (a.prizes ? 1 : 0);
        }
        // default: upcoming deadline
        return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      });
  }, [opportunities, selectedCategory, navbarSearch, localSearch, sortBy]);

  // Metric Stats
  const metrics = useMemo(() => {
    const total = opportunities.length;
    const hackathons = opportunities.filter((o) => (o.type || "").toLowerCase() === "hackathon").length;
    const internships = opportunities.filter((o) => (o.type || "").toLowerCase() === "internship").length;
    const totalInterested = opportunities.reduce((acc, o) => acc + (o.interestedUsers?.length || 0), 0);
    return { total, hackathons, internships, totalInterested };
  }, [opportunities]);

  return (
    <div className="opportunities-hub-container">
      {/* ── Executive Hero Banner ── */}
      <section className="opp-hero">
        <div className="opp-hero-content">
          <div className="opp-hero-badge">
            <span className="opp-pulse-dot" />
            Active Innovation & Careers Hub
          </div>
          <h1 className="opp-hero-title">Hackathons & Opportunities</h1>
          <p className="opp-hero-desc">
            Explore national competitions, technology challenges, paid internships, and symposiums. Express your interest, connect with teammates, and build real-world solutions.
          </p>
        </div>

        <div className="opp-hero-actions">
          <button className="opp-primary-btn" onClick={handleOpenCreate}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Post Opportunity
          </button>
          <button
            className="opp-secondary-btn"
            onClick={() => {
              handleOpenCreate();
              setShowImporter(true);
            }}
          >
            <span>✨</span> Paste Circular
          </button>
        </div>
      </section>

      {/* ── Metric Stats Row ── */}
      <div className="opp-metrics-grid">
        <div className="opp-metric-card">
          <div className="opp-metric-icon" style={{ background: "rgba(245, 158, 11, 0.18)", color: "#fbbf24" }}>
            🏆
          </div>
          <div className="opp-metric-info">
            <span className="opp-metric-value">{metrics.total}</span>
            <span className="opp-metric-label">Active Opportunities</span>
          </div>
        </div>

        <div className="opp-metric-card">
          <div className="opp-metric-icon" style={{ background: "rgba(99, 102, 241, 0.18)", color: "#818cf8" }}>
            💻
          </div>
          <div className="opp-metric-info">
            <span className="opp-metric-value">{metrics.hackathons}</span>
            <span className="opp-metric-label">Hackathons & Contests</span>
          </div>
        </div>

        <div className="opp-metric-card">
          <div className="opp-metric-icon" style={{ background: "rgba(16, 185, 129, 0.18)", color: "#34d399" }}>
            💼
          </div>
          <div className="opp-metric-info">
            <span className="opp-metric-value">{metrics.internships}</span>
            <span className="opp-metric-label">Internships & Roles</span>
          </div>
        </div>

        <div className="opp-metric-card">
          <div className="opp-metric-icon" style={{ background: "rgba(236, 72, 153, 0.18)", color: "#f472b6" }}>
            🙋
          </div>
          <div className="opp-metric-info">
            <span className="opp-metric-value">{metrics.totalInterested}</span>
            <span className="opp-metric-label">Squad Team RSVPs</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <div className="opp-filter-bar">
        <div className="opp-category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`opp-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "All" && "🌐"}
              {cat === "Hackathon" && "🏆"}
              {cat === "Internship" && "💼"}
              {cat === "Contest" && "⚡"}
              {cat === "Workshop" && "🎓"}
              {cat === "Scholarship" && "🎖️"}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        <div className="opp-search-controls">
          <div className="opp-search-box">
            <span className="opp-search-icon">🔍</span>
            <input
              type="text"
              className="opp-search-input"
              placeholder="Search hackathons, tracks, skills..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <select
            className="opp-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="deadline">📅 Upcoming Deadline</option>
            <option value="newest">✨ Newly Added</option>
            <option value="prizes">💰 Has Cash Prizes</option>
          </select>
        </div>
      </div>

      {/* ── Main Opportunities Grid ── */}
      {loading ? (
        <UnifiedLoader
          title="Loading Innovation Hub..."
          subtitle="Fetching latest national hackathons, challenges & internships"
          size="lg"
        />
      ) : error ? (
        <div className="opp-empty-state">
          <div className="opp-empty-icon">⚠️</div>
          <h3 className="opp-empty-title">Connection Notice</h3>
          <p className="opp-empty-subtitle">{error}</p>
          <button className="opp-primary-btn" onClick={loadOpportunities}>
            Retry Fetch
          </button>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="opp-empty-state">
          <div className="opp-empty-icon">🎯</div>
          <h3 className="opp-empty-title">No Opportunities Found</h3>
          <p className="opp-empty-subtitle">
            {localSearch || navbarSearch
              ? `No opportunities match your filter "${localSearch || navbarSearch}".`
              : "No listings currently in this category. Be the first to share one!"}
          </p>
          <button className="opp-primary-btn" onClick={handleOpenCreate}>
            + Add First Opportunity
          </button>
        </div>
      ) : (
        <div className="opp-cards-grid">
          {filteredOpportunities.map((opp) => {
            const oppId = opp._id || opp.id || opp.opportunityId;
            const categoryClass = (opp.type || "hackathon").toLowerCase();
            const interestedList = opp.interestedUsers || [];
            const isUserInterested = interestedList.some(
              (u) => (u.email || u) === userEmail
            );
            const thoughtsList = opp.thoughts || [];

            return (
              <div
                key={oppId}
                className="opp-card opp-card-interactive"
                onClick={() => setDetailsOpp(opp)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailsOpp(opp);
                  }
                }}
                title="Click anywhere to view full event details, timeline & rules"
              >
                {/* Header ribbon */}
                <div className="opp-card-header">
                  <div className="opp-card-tags">
                    <span className={`opp-tag-category ${categoryClass}`}>
                      {opp.type || "Hackathon"}
                    </span>
                    {opp.eventLevel && (
                      <span className="opp-tag-level">
                        🇮🇳 {opp.eventLevel}
                      </span>
                    )}
                    {opp.deadline && (
                      <span className="opp-tag-deadline" title={`Deadline: ${opp.deadline}`}>
                        ⏳ {opp.deadline}
                      </span>
                    )}
                  </div>

                  <div className="opp-card-actions-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="opp-icon-btn"
                      title="Edit Opportunity"
                      onClick={() => handleOpenEdit(opp)}
                    >
                      ✏️
                    </button>
                    {(isAdmin || opp.createdBy === userEmail) && (
                      <button
                        className="opp-icon-btn danger"
                        title="Delete Opportunity"
                        onClick={(e) => handleDeleteOpportunity(opp, e)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="opp-card-body">
                  <h3 className="opp-card-title">
                    {opp.title}
                  </h3>

                  <div className="opp-card-organizer">
                    <span className="opp-organizer-badge">🏢</span>
                    <span>{opp.organizer || "Independent"}</span>
                  </div>

                  {/* Prize / Reward Banner */}
                  {(opp.prizes || opp.rewardPoints) && (
                    <div className="opp-prize-banner">
                      <div className="opp-prize-text">
                        <span>🏆</span>
                        <span>{opp.prizes ? opp.prizes.split("\n")[0] : "Certification & Awards"}</span>
                      </div>
                      {opp.rewardPoints && (
                        <span className="opp-reward-badge">
                          ⭐ {opp.rewardPoints}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="opp-card-desc">{opp.description}</p>

                  {/* Specs Box with Multi-Item Row and Eligibility Bar */}
                  <div className="opp-specs-box">
                    <div className="opp-specs-chips-row">
                      <div className="opp-spec-chip" title="Team Size">
                        <span className="opp-spec-icon">👥</span>
                        <span className="opp-spec-value">{opp.teamSize || "Any Size"}</span>
                      </div>

                      <div className="opp-spec-chip" title="Registration Fee">
                        <span className="opp-spec-icon">🎟️</span>
                        <span className="opp-spec-value">{opp.registrationFee || "Free"}</span>
                      </div>

                      {opp.deadline && (
                        <div className="opp-spec-chip" title="Deadline">
                          <span className="opp-spec-icon">⏳</span>
                          <span className="opp-spec-value" style={{ color: "#fbbf24" }}>
                            {opp.deadline}
                          </span>
                        </div>
                      )}
                    </div>

                    {opp.pskillEligibility && (
                      <div className="opp-spec-eligibility-row" title="Eligibility Criteria">
                        <span className="opp-spec-icon" style={{ color: "#38bdf8" }}>🎯</span>
                        <span className="opp-spec-eligibility-text">
                          <strong>Eligibility:</strong> {opp.pskillEligibility}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tracks row if present */}
                  {Array.isArray(opp.tracks) && opp.tracks.length > 0 && (
                    <div className="opp-tracks-row">
                      {opp.tracks.slice(0, 3).map((track, i) => (
                        <span key={i} className="opp-track-chip">
                          ⚡ {track.replace(/^track\s*\d+[\s:–-]*/i, "")}
                        </span>
                      ))}
                      {opp.tracks.length > 3 && (
                        <span className="opp-track-chip" style={{ background: "rgba(255,255,255,0.06)" }}>
                          +{opp.tracks.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Quick Action Links Row */}
                  <div className="opp-quick-links-row" onClick={(e) => e.stopPropagation()}>
                    {opp.link ? (
                      <a
                        href={opp.link}
                        target="_blank"
                        rel="noreferrer"
                        className="opp-link-btn primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>🌐</span> Register / Apply
                      </a>
                    ) : (
                      <button
                        className="opp-link-btn primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsOpp(opp);
                        }}
                      >
                        <span>ℹ️</span> View Details
                      </button>
                    )}

                    {opp.internalFormUrl && (
                      <a
                        href={opp.internalFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="opp-link-btn secondary"
                        title="College internal tracking form"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>📋</span> Internal Form
                      </a>
                    )}

                    {opp.guidelinesUrl && (
                      <a
                        href={opp.guidelinesUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="opp-link-btn guidelines"
                        title="View Official Guidelines"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>📄</span> Guidelines
                      </a>
                    )}
                  </div>
                </div>

                {/* Social & Community Teammate Footer */}
                <div className="opp-card-social-footer" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className={`opp-interest-toggle-btn ${
                        isUserInterested ? "interested" : ""
                      }`}
                      onClick={(e) => handleToggleInterest(opp, e)}
                      title={
                        isUserInterested
                          ? "You are RSVP'd as interested! Click to withdraw."
                          : "Let team members know you are interested / looking for a team"
                      }
                    >
                      <span>{isUserInterested ? "✅" : "🙋"}</span>
                      <span>{isUserInterested ? "Interested" : "I'm Interested"}</span>
                    </button>

                    {/* Facepile of interested users */}
                    {interestedList.length > 0 && (
                      <div
                        className="opp-facepile"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setThoughtsOpp(opp);
                          setThoughtsTab("interested");
                          setThoughtError("");
                        }}
                        title={`${interestedList.length} squad members interested — Click to view names & contact info`}
                      >
                        {interestedList.slice(0, 3).map((u, idx) => (
                          <div key={idx} className="opp-avatar-bubble">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {interestedList.length > 3 && (
                          <div className="opp-avatar-more">
                            +{interestedList.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="opp-thoughts-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setThoughtsOpp(opp);
                        setThoughtsTab("discussion");
                        setThoughtError("");
                      }}
                      title="Squad thoughts & teammate finder discussion"
                    >
                      <span>💬</span>
                      <span>{thoughtsList.length}</span>
                    </button>

                    <button
                      className="opp-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsOpp(opp);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: ADD / EDIT OPPORTUNITY (ZERO MANDATORY FIELDS) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="opp-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="opp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="opp-modal-header">
              <div className="opp-modal-title-wrap">
                <div className="opp-modal-icon">
                  {editingOpp ? "✏️" : "🚀"}
                </div>
                <div>
                  <h2 className="opp-modal-title">
                    {editingOpp ? "Edit Opportunity" : "Post New Opportunity"}
                  </h2>
                  <p className="opp-modal-subtitle">
                    Share a hackathon, contest or internship. Zero mandatory fields — fill whatever you have!
                  </p>
                </div>
              </div>

              <button
                className="opp-modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="opp-modal-body">
              {/* Circular / Announcement Importer Toggle */}
              <div className="opp-circular-importer">
                <div className="opp-importer-header">
                  <div className="opp-importer-title">
                    <span>✨</span> Smart Circular / Announcement Importer
                  </div>
                  <button
                    type="button"
                    className="opp-pill"
                    onClick={() => setShowImporter(!showImporter)}
                    style={{ fontSize: 11 }}
                  >
                    {showImporter ? "Hide Importer" : "Paste Text"}
                  </button>
                </div>

                <p className="opp-importer-desc">
                  Have a college WhatsApp circular or email announcement? Paste the raw text below and let the auto-parser fill out titles, links, tracks, and prizes automatically.
                </p>

                {showImporter && (
                  <div>
                    <textarea
                      className="opp-importer-textarea"
                      placeholder="Paste your circular here... (e.g. Next-Gen Kernel Hackathon organized by C-DAC India, Eligibility, Tracks, Prizes, Registration link, etc.)"
                      value={circularText}
                      onChange={(e) => setCircularText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="opp-importer-btn"
                      onClick={handleParseCircular}
                    >
                      ⚡ Auto-Fill Form from Circular
                    </button>
                  </div>
                )}

                {importerSuccess && (
                  <div style={{ marginTop: 8, color: "#34d399", fontSize: 13, fontWeight: 600 }}>
                    {importerSuccess}
                  </div>
                )}
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveOpportunity}>
                {/* Section 1: Overview */}
                <div className="opp-form-section">
                  <div className="opp-form-section-title">
                    <span>📌</span> Basic Information
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group" style={{ gridColumn: "span 2" }}>
                      <label className="opp-form-label">
                        Opportunity Title <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. Next-Gen Kernel Hackathon 2026"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Organizer / Company <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. C-DAC India, Google, IIT Bombay"
                        value={formData.organizer}
                        onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Type <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <select
                        className="opp-form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Hackathon">🏆 Hackathon</option>
                        <option value="Internship">💼 Internship</option>
                        <option value="Contest">⚡ Coding Contest</option>
                        <option value="Workshop">🎓 Workshop / Symposium</option>
                        <option value="Scholarship">🎖️ Scholarship</option>
                        <option value="Full-Time">🚀 Job Opportunity</option>
                      </select>
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Event Level <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <select
                        className="opp-form-select"
                        value={formData.eventLevel}
                        onChange={(e) => setFormData({ ...formData, eventLevel: e.target.value })}
                      >
                        <option value="National">National Level</option>
                        <option value="International">International</option>
                        <option value="State Level">State Level</option>
                        <option value="Inter-College">Inter-College</option>
                        <option value="Internal Campus">Internal Campus</option>
                      </select>
                    </div>
                  </div>

                  <div className="opp-form-group">
                    <label className="opp-form-label">
                      Brief Description / Objective <span className="opp-form-optional-tag">(Optional)</span>
                    </label>
                    <textarea
                      className="opp-form-textarea"
                      placeholder="Summary of what the challenge or role is about..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 2: Links & Registration */}
                <div className="opp-form-section">
                  <div className="opp-form-section-title">
                    <span>🔗</span> Registration & Guidelines Links
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Official Registration Link <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="url"
                        className="opp-form-input"
                        placeholder="https://cdac.in or Google Form URL"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Internal College Google Form <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="url"
                        className="opp-form-input"
                        placeholder="https://forms.gle/... (for college tracking)"
                        value={formData.internalFormUrl}
                        onChange={(e) => setFormData({ ...formData, internalFormUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Guidelines Document / Drive Link <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="url"
                        className="opp-form-input"
                        placeholder="https://drive.google.com/... (PDF / rules doc)"
                        value={formData.guidelinesUrl}
                        onChange={(e) => setFormData({ ...formData, guidelinesUrl: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Submission Deadline <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. 25/09/2026 or Oct 15"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Participation Specs */}
                <div className="opp-form-section">
                  <div className="opp-form-section-title">
                    <span>👥</span> Team & Eligibility Specs
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Team Size <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. 2-5 Members or Individual"
                        value={formData.teamSize}
                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Registration Fee <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. Free (No Registration Fees)"
                        value={formData.registrationFee}
                        onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        PSkill / College Level Eligibility <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. Level 2A, Level 3, Level 4"
                        value={formData.pskillEligibility}
                        onChange={(e) => setFormData({ ...formData, pskillEligibility: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Tracks & Prizes */}
                <div className="opp-form-section">
                  <div className="opp-form-section-title">
                    <span>🏆</span> Tracks, Rounds & Prizes
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Hackathon Tracks / Themes <span className="opp-form-optional-tag">(1 per line, Optional)</span>
                      </label>
                      <textarea
                        className="opp-form-textarea"
                        placeholder={"Track 1 - AI at OS & Kernel Level\nTrack 2 - Secure Design & Isolation"}
                        value={formData.tracks}
                        onChange={(e) => setFormData({ ...formData, tracks: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Prizes & Awards <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <textarea
                        className="opp-form-textarea"
                        placeholder={"1st Prize: ₹2,50,000\n2nd Prize: ₹1,50,000\n3rd Prize: ₹1,00,000"}
                        value={formData.prizes}
                        onChange={(e) => setFormData({ ...formData, prizes: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Event Schedule / Structure <span className="opp-form-optional-tag">(1 per line, Optional)</span>
                      </label>
                      <textarea
                        className="opp-form-textarea"
                        placeholder={"Round 1: Online Submission\nRound 2: Online Technical Presentation\nRound 3: Grand Finale"}
                        value={formData.schedule}
                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        College Reward Points <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. 500 Shortlist / 1000 Winner"
                        value={formData.rewardPoints}
                        onChange={(e) => setFormData({ ...formData, rewardPoints: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Mentors & Contact */}
                <div className="opp-form-section">
                  <div className="opp-form-section-title">
                    <span>📞</span> Faculty Mentor & Coordinator Contact
                  </div>

                  <div className="opp-form-row">
                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Faculty Mentor <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. Dr CL Chinnadurrai (Lab In-charge)"
                        value={formData.facultyMentor}
                        onChange={(e) => setFormData({ ...formData, facultyMentor: e.target.value })}
                      />
                    </div>

                    <div className="opp-form-group">
                      <label className="opp-form-label">
                        Coordinator Contact / Queries <span className="opp-form-optional-tag">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="opp-form-input"
                        placeholder="e.g. 9600770944 or email@domain.com"
                        value={formData.contactInfo}
                        onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="opp-modal-footer">
                  <button
                    type="button"
                    className="opp-secondary-btn"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="opp-primary-btn">
                    {editingOpp ? "Save Changes" : "Publish Opportunity"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: FULL DETAILS MODAL ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {detailsOpp && (
        <div className="opp-modal-overlay" onClick={() => setDetailsOpp(null)}>
          <div className="opp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="opp-modal-header">
              <div className="opp-modal-title-wrap">
                <div className="opp-modal-icon">🏆</div>
                <div>
                  <h2 className="opp-modal-title">{detailsOpp.title}</h2>
                  <p className="opp-modal-subtitle">
                    Organized by {detailsOpp.organizer || "Independent"} • {detailsOpp.eventLevel || "National"}
                  </p>
                </div>
              </div>
              <button
                className="opp-modal-close-btn"
                onClick={() => setDetailsOpp(null)}
              >
                ✕
              </button>
            </div>

            <div className="opp-modal-body">
              {/* Quick Links Top Bar */}
              <div className="opp-quick-links-row" style={{ marginBottom: 20 }}>
                {detailsOpp.link && (
                  <a
                    href={detailsOpp.link}
                    target="_blank"
                    rel="noreferrer"
                    className="opp-link-btn primary"
                  >
                    <span>🌐</span> Official Registration Site
                  </a>
                )}
                {detailsOpp.internalFormUrl && (
                  <a
                    href={detailsOpp.internalFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="opp-link-btn secondary"
                  >
                    <span>📋</span> College Internal Google Form
                  </a>
                )}
                {detailsOpp.guidelinesUrl && (
                  <a
                    href={detailsOpp.guidelinesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="opp-link-btn guidelines"
                  >
                    <span>📄</span> Official Guidelines PDF / Doc
                  </a>
                )}
              </div>

              {/* Specs Grid */}
              <div className="opp-details-grid">
                <div className="opp-detail-block">
                  <div className="opp-detail-block-title">👥 Team Size</div>
                  <div className="opp-detail-block-content">{detailsOpp.teamSize || "Open to any size"}</div>
                </div>

                <div className="opp-detail-block">
                  <div className="opp-detail-block-title">🎟️ Registration Fee</div>
                  <div className="opp-detail-block-content">{detailsOpp.registrationFee || "Free"}</div>
                </div>

                <div className="opp-detail-block">
                  <div className="opp-detail-block-title">🎯 PSkill / Eligibility</div>
                  <div className="opp-detail-block-content">{detailsOpp.pskillEligibility || "Open to all students"}</div>
                </div>

                <div className="opp-detail-block">
                  <div className="opp-detail-block-title">⏳ Submission Deadline</div>
                  <div className="opp-detail-block-content" style={{ color: "#fbbf24" }}>
                    {detailsOpp.deadline || "Open"}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="opp-details-hero">
                <h4 style={{ margin: "0 0 8px 0", color: "#f59e0b", fontSize: 13, textTransform: "uppercase" }}>
                  Overview
                </h4>
                <p style={{ margin: 0, lineHeight: 1.6, color: "#cbd5e1", fontSize: 14 }}>
                  {detailsOpp.description}
                </p>
              </div>

              {/* Tracks */}
              {/* Tracks */}
              {(() => {
                const trackList = Array.isArray(detailsOpp.tracks)
                  ? detailsOpp.tracks
                  : (detailsOpp.tracks ? detailsOpp.tracks.split("\n").filter(Boolean) : []);
                if (trackList.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#818cf8", fontSize: 13, textTransform: "uppercase" }}>
                      ⚡ Hackathon Tracks & Problem Statements
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {trackList.map((track, i) => (
                        <div
                          key={i}
                          style={{
                            background: "rgba(99, 102, 241, 0.12)",
                            border: "1px solid rgba(99, 102, 241, 0.25)",
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontSize: 13.5,
                            color: "#e0e7ff",
                          }}
                        >
                          {track}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Schedule */}
              {(() => {
                const scheduleList = Array.isArray(detailsOpp.schedule)
                  ? detailsOpp.schedule
                  : (detailsOpp.schedule ? detailsOpp.schedule.split("\n").filter(Boolean) : []);
                if (scheduleList.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#34d399", fontSize: 13, textTransform: "uppercase" }}>
                      📅 Event Schedule & Rounds
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {scheduleList.map((step, i) => (
                        <div
                          key={i}
                          style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.25)",
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontSize: 13.5,
                            color: "#d1fae5",
                          }}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Prizes & Points */}
              {(detailsOpp.prizes || detailsOpp.rewardPoints) && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#fbbf24", fontSize: 13, textTransform: "uppercase" }}>
                    💰 Prizes & Activity Points
                  </h4>
                  {detailsOpp.prizes && (
                    <div
                      style={{
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
                        borderRadius: 10,
                        padding: "12px 16px",
                        fontSize: 13.5,
                        color: "#fef3c7",
                        whiteSpace: "pre-wrap",
                        marginBottom: 10,
                      }}
                    >
                      {detailsOpp.prizes}
                    </div>
                  )}
                  {detailsOpp.rewardPoints && (
                    <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                      ⭐ <strong>Reward Points:</strong> {detailsOpp.rewardPoints}
                    </div>
                  )}
                </div>
              )}

              {/* Mentors & Contact */}
              {(detailsOpp.facultyMentor || detailsOpp.contactInfo) && (
                <div>
                  <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8", fontSize: 13, textTransform: "uppercase" }}>
                    📞 Faculty Mentor & Contact
                  </h4>
                  <div className="opp-details-grid">
                    {detailsOpp.facultyMentor && (
                      <div className="opp-detail-block">
                        <div className="opp-detail-block-title">Faculty Mentor</div>
                        <div className="opp-detail-block-content">{detailsOpp.facultyMentor}</div>
                      </div>
                    )}
                    {detailsOpp.contactInfo && (
                      <div className="opp-detail-block">
                        <div className="opp-detail-block-title">Queries & Contact</div>
                        <div className="opp-detail-block-content">{detailsOpp.contactInfo}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="opp-modal-footer">
              <button
                className="opp-secondary-btn"
                onClick={() => {
                  setDetailsOpp(null);
                  setThoughtsOpp(detailsOpp);
                }}
              >
                💬 Squad Thoughts & Teammate Search
              </button>
              <button
                className="opp-primary-btn"
                onClick={() => setDetailsOpp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: SQUAD TEAMMATE FINDER & COMMUNITY HUB ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {thoughtsOpp && (
        <div className="opp-modal-overlay" onClick={() => setThoughtsOpp(null)}>
          <div
            className="opp-modal-box"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="opp-modal-header">
              <div className="opp-modal-title-wrap">
                <div
                  className="opp-modal-icon"
                  style={{
                    background: thoughtsTab === "interested" ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                    color: thoughtsTab === "interested" ? "#34d399" : "#818cf8",
                  }}
                >
                  {thoughtsTab === "interested" ? "👥" : "💬"}
                </div>
                <div>
                  <h2 className="opp-modal-title">
                    {thoughtsTab === "interested" ? "Interested Squad Members" : "Squad Teammate Finder"}
                  </h2>
                  <p className="opp-modal-subtitle">
                    {thoughtsOpp.title} • Connect & brainstorm with peers
                  </p>
                </div>
              </div>
              <button
                className="opp-modal-close-btn"
                onClick={() => setThoughtsOpp(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="opp-teammate-tabs-bar">
              <button
                type="button"
                className={`opp-teammate-tab ${thoughtsTab === "discussion" ? "active" : ""}`}
                onClick={() => setThoughtsTab("discussion")}
              >
                <span>💬</span> Squad Discussion ({ (thoughtsOpp.thoughts || []).length })
              </button>
              <button
                type="button"
                className={`opp-teammate-tab ${thoughtsTab === "interested" ? "active" : ""}`}
                onClick={() => setThoughtsTab("interested")}
              >
                <span>👥</span> Interested Members ({ (thoughtsOpp.interestedUsers || []).length })
              </button>
            </div>

            <div className="opp-modal-body">
              {/* RSVP Top Banner */}
              <div className="opp-modal-rsvp-banner">
                <div>
                  <div className="opp-rsvp-banner-title">
                    👥 {(thoughtsOpp.interestedUsers || []).length} Squad Members Interested
                  </div>
                  <div className="opp-rsvp-banner-subtitle">
                    {thoughtsTab === "discussion"
                      ? "Looking to team up? RSVP to let peers know you are available."
                      : "Directly connect with peers who want to participate."}
                  </div>
                </div>

                <button
                  className={`opp-interest-toggle-btn ${
                    (thoughtsOpp.interestedUsers || []).some((u) => (u.email || u) === userEmail)
                      ? "interested"
                      : ""
                  }`}
                  onClick={(e) => handleToggleInterest(thoughtsOpp, e)}
                  title="Toggle your RSVP status"
                >
                  <span>{(thoughtsOpp.interestedUsers || []).some((u) => (u.email || u) === userEmail) ? "✅" : "🙋"}</span>
                  <span>{(thoughtsOpp.interestedUsers || []).some((u) => (u.email || u) === userEmail) ? "RSVP'd" : "I'm Interested"}</span>
                </button>
              </div>

              {/* ── TAB 1: SQUAD DISCUSSION ── */}
              {thoughtsTab === "discussion" && (
                <>
                  <div className="opp-thoughts-list">
                    {(thoughtsOpp.thoughts || []).length === 0 ? (
                      <div className="opp-empty-feed">
                        <div style={{ fontSize: 36, marginBottom: 8 }}>💡</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
                          No discussions yet
                        </div>
                        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                          Looking for teammates? Have an idea? Post below to start the conversation!
                        </div>
                      </div>
                    ) : (
                      thoughtsOpp.thoughts.map((item) => {
                        const tagClass =
                          item.tag === "Looking for Team"
                            ? "looking"
                            : item.tag === "Idea / Proposal"
                            ? "idea"
                            : item.tag === "Question"
                            ? "question"
                            : "comment";

                        const isMine = item.userEmail === userEmail || isAdmin;
                        const thoughtContent = item.content || item.text || "";

                        return (
                          <div key={item._id || item.id} className="opp-thought-card">
                            <div className="opp-thought-header">
                              <div className="opp-thought-user">
                                <div className="opp-thought-avatar">
                                  {(item.userName || item.userEmail || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="opp-thought-name">
                                    {item.userName || item.userEmail}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className={`opp-thought-tag ${tagClass}`}>
                                  {item.tag || "Comment"}
                                </span>
                                {isMine && (
                                  <button
                                    className="opp-icon-btn danger"
                                    style={{ padding: "2px 6px" }}
                                    title="Delete comment"
                                    onClick={() => handleDeleteThought(item._id || item.id)}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="opp-thought-text">{thoughtContent}</p>

                            <span className="opp-thought-time">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Inline Error if any */}
                  {thoughtError && (
                    <div className="opp-thought-error-banner">
                      ⚠️ {thoughtError}
                    </div>
                  )}

                  {/* New Thought Form */}
                  <form className="opp-new-thought-box" onSubmit={handlePostThought}>
                    <div className="opp-intent-selector">
                      {[
                        "Looking for Team",
                        "Idea / Proposal",
                        "General Thought",
                        "Question",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`opp-intent-btn ${newThoughtTag === tag ? "active" : ""}`}
                          onClick={() => setNewThoughtTag(tag)}
                        >
                          {tag === "Looking for Team" && "🙋 "}
                          {tag === "Idea / Proposal" && "💡 "}
                          {tag === "General Thought" && "💬 "}
                          {tag === "Question" && "❓ "}
                          {tag}
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="opp-form-textarea"
                      style={{ minHeight: 75, marginBottom: 10 }}
                      placeholder={
                        newThoughtTag === "Looking for Team"
                          ? "e.g. Looking for 2 teammates skilled in Linux / Python for Track 1! Ping me on email."
                          : "Share your thought, idea or pitch..."
                      }
                      value={newThoughtText}
                      onChange={(e) => {
                        setNewThoughtText(e.target.value);
                        if (thoughtError) setThoughtError("");
                      }}
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Press Post to share with all squad members
                      </span>
                      <button
                        type="submit"
                        className="opp-primary-btn"
                        disabled={submittingThought || !newThoughtText.trim()}
                        style={{ padding: "8px 18px", fontSize: 13 }}
                      >
                        {submittingThought ? "Posting..." : "Post Thought"}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ── TAB 2: INTERESTED SQUAD MEMBERS DIRECTORY ── */}
              {thoughtsTab === "interested" && (
                <div className="opp-interested-directory">
                  <div className="opp-directory-header">
                    <span style={{ fontSize: 13, color: "#cbd5e1" }}>
                      Showing members who indicated they want to participate in this opportunity:
                    </span>
                  </div>

                  {(thoughtsOpp.interestedUsers || []).length === 0 ? (
                    <div className="opp-empty-feed">
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🙋</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
                        No members RSVP'd yet
                      </div>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                        Click "I'm Interested" above to be the first to RSVP!
                      </div>
                    </div>
                  ) : (
                    <div className="opp-members-roster">
                      {(thoughtsOpp.interestedUsers || []).map((u, idx) => {
                        const name = u.name || u.email?.split("@")[0] || "Squad Member";
                        const email = u.email || "";
                        const isMe = email && email.toLowerCase() === userEmail.toLowerCase();
                        const isCopied = copiedEmail === email;

                        return (
                          <div key={idx} className="opp-member-row-card">
                            <div className="opp-member-info-wrap">
                              <div className="opp-member-avatar">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="opp-member-name">
                                  {name}
                                  {isMe && <span className="opp-me-pill">You</span>}
                                </div>
                                <div className="opp-member-email">{email || "No email listed"}</div>
                              </div>
                            </div>

                            <div className="opp-member-actions">
                              {email && (
                                <>
                                  <button
                                    type="button"
                                    className={`opp-copy-btn ${isCopied ? "copied" : ""}`}
                                    onClick={() => handleCopyEmail(email)}
                                    title="Copy email address"
                                  >
                                    {isCopied ? "✓ Copied" : "📋 Copy"}
                                  </button>
                                  <a
                                    href={`mailto:${email}?subject=${encodeURIComponent(`Teaming up for ${thoughtsOpp.title}`)}&body=${encodeURIComponent(`Hi ${name},\n\nI saw your interest in "${thoughtsOpp.title}" on the Squad Dashboard. Would you like to connect and form a team?`)}`}
                                    className="opp-contact-btn"
                                    title="Send email to team up"
                                  >
                                    ✉️ Email
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/Profile.jsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyProfile, updateMyProfile, apiFetch, fetchSheetData } from "../utils/api";
import { normalizeEmail } from "../utils/roles";

export default function Profile() {
  const { auth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW, COURSES, PROJECTS, HACKATHONS, CERTIFICATES

  // Showcase Data States
  const [userCourses, setUserCourses] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [userHackathons, setUserHackathons] = useState([]);
  const [userCertificates, setUserCertificates] = useState([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    personalEmail: "",
    bitEmail: "",
    mobile: "",
    linkedin: "",
    github: "",
    primaryInterests: "",
    secondaryInterests: "",
    specializations: "",
    activityPoints: "",
    rewardPoints: "",
  });

  const loadProfile = async () => {
    if (!auth.isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await fetchMyProfile();
      if (res?.user) {
        setProfile(res.user);
        initFormData(res.user);
        await loadShowcaseData(res.user);
      } else {
        setError("Failed to load user profile.");
      }
    } catch (err) {
      console.error("Error fetching self profile:", err);
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const loadShowcaseData = async (userProfile) => {
    if (!userProfile) return;
    setShowcaseLoading(true);
    try {
      const cleanEmail = normalizeEmail(userProfile.email || "");
      const cleanName = (userProfile.name || "").toLowerCase().trim();
      const cleanEnrolment = (userProfile.enrolmentNumber || "").toLowerCase().trim();

      // 1. Fetch Submitted & Approved Projects (Projects Showcase)
      const subRes = await apiFetch("/submissions?publicView=true").catch(() => ({ submissions: [] }));
      const allSubs = subRes?.submissions || [];
      const matchedProjects = allSubs.filter((sub) => {
        const isApproved = (sub.status || "").toUpperCase() === "APPROVED";
        if (!isApproved) return false;

        const subByObj = typeof sub.submittedBy === "object" ? sub.submittedBy : null;
        const subByEmail = normalizeEmail(subByObj?.email || String(sub.submittedBy || ""));
        const subByName = (subByObj?.name || "").toLowerCase().trim();

        const isSubmitter = subByEmail === cleanEmail || (cleanName && subByName.includes(cleanName));

        const isFor = (sub.submittedFor || []).some((u) => {
          const uEmail = normalizeEmail(typeof u === "object" ? u.email : String(u));
          const uName = (typeof u === "object" ? u.name || "" : "").toLowerCase().trim();
          return uEmail === cleanEmail || (cleanName && uName.includes(cleanName));
        });

        return isSubmitter || isFor;
      });
      setUserProjects(matchedProjects);

      // 2. Fetch Hackathons Participated
      const hackRes = await apiFetch("/hackathons").catch(() => null) || await fetchSheetData("Hackathons").catch(() => []);
      const allHackathons = Array.isArray(hackRes) ? hackRes : hackRes?.hackathons || [];
      const matchedHackathons = allHackathons.filter((h) => {
        const membersStr = (h.MEMBERS || h.members || "").toLowerCase();
        const uBy = (h.UPLOADED_BY || h.uploadedBy || h.email || "").toLowerCase();

        return (
          (cleanName && membersStr.includes(cleanName)) ||
          (cleanEmail && membersStr.includes(cleanEmail)) ||
          (cleanEnrolment && membersStr.includes(cleanEnrolment)) ||
          uBy.includes(cleanEmail)
        );
      });
      setUserHackathons(matchedHackathons);

      // 3. Fetch Certificates
      const certRes = await apiFetch("/certificates").catch(() => null) || await fetchSheetData("Certificates").catch(() => []);
      const allCertificates = Array.isArray(certRes) ? certRes : certRes?.certificates || [];
      const matchedCerts = allCertificates.filter((c) => {
        const cEnrol = (c.ENROLMENT_NUMBER || c.enrolmentNumber || c.ENROLMENT || "").toLowerCase().trim();
        const cEmail = normalizeEmail(c.EMAIL || c.email || "");
        const cName = (c.STUDENT_NAME || c.name || "").toLowerCase().trim();

        return (
          (cleanEnrolment && cEnrol === cleanEnrolment) ||
          (cleanEmail && cEmail === cleanEmail) ||
          (cleanName && cName.includes(cleanName))
        );
      });
      setUserCertificates(matchedCerts);

      // 4. Fetch Completed Courses for this specific individual
      const dashRes = await apiFetch("/users/dashboard").catch(() => ({ users: [] }));
      const allDashUsers = dashRes?.users || [];
      const meDash = allDashUsers.find((u) => {
        const uEmail = normalizeEmail(u.email || u["EMAIL ID"] || "");
        const uEnrol = (u["ENROLMENT NUMBER"] || u.enrolmentNumber || "").toLowerCase().trim();
        const uName = (u.Name || u.name || "").toLowerCase().trim();

        return (
          uEmail === cleanEmail ||
          (cleanEnrolment && uEnrol === cleanEnrolment) ||
          (cleanName && uName === cleanName)
        );
      });

      if (meDash) {
        if (Array.isArray(meDash.COURSE_DETAILS) && meDash.COURSE_DETAILS.length > 0) {
          setUserCourses(
            meDash.COURSE_DETAILS.map((cd) => ({
              title: cd.courseName || cd.display,
              level: cd.currentLevel || "Completed",
              display: cd.display,
            }))
          );
        } else if (Array.isArray(meDash.COURSES) && meDash.COURSES.length > 0) {
          setUserCourses(
            meDash.COURSES.map((cStr) => {
              const parts = String(cStr).split(" - ");
              return {
                title: parts[0] || cStr,
                level: parts[1] || "Completed",
                display: String(cStr),
              };
            })
          );
        } else {
          setUserCourses([]);
        }
      } else {
        setUserCourses([]);
      }
    } catch (err) {
      console.error("Error loading profile showcase data:", err);
    } finally {
      setShowcaseLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [auth.isLoggedIn]);

  const initFormData = (user) => {
    setFormData({
      name: user.name || "",
      personalEmail: user.personalEmail || "",
      bitEmail: user.bitEmail || "",
      mobile: user.mobile || "",
      linkedin: user.linkedin || "",
      github: user.github || "",
      primaryInterests: Array.isArray(user.primaryInterests)
        ? user.primaryInterests.join(", ")
        : user.primaryInterests || "",
      secondaryInterests: Array.isArray(user.secondaryInterests)
        ? user.secondaryInterests.join(", ")
        : user.secondaryInterests || "",
      specializations: Array.isArray(user.specializations)
        ? user.specializations.join(", ")
        : user.specializations || "",
      activityPoints: user.activityPoints ?? "",
      rewardPoints: user.rewardPoints ?? "",
    });
  };

  const handleStartEdit = () => {
    if (profile) {
      initFormData(profile);
      setIsEditing(true);
      setSuccessMsg("");
      setError("");
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      initFormData(profile);
    }
    setIsEditing(false);
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const payload = {
        name: formData.name.trim(),
        personalEmail: formData.personalEmail.trim(),
        bitEmail: formData.bitEmail.trim(),
        mobile: formData.mobile.trim(),
        linkedin: formData.linkedin.trim(),
        github: formData.github.trim(),
        primaryInterests: formData.primaryInterests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        secondaryInterests: formData.secondaryInterests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        specializations: formData.specializations
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        activityPoints: Number(formData.activityPoints) || 0,
        rewardPoints: Number(formData.rewardPoints) || 0,
      };

      const res = await updateMyProfile(payload);
      if (res?.success && res?.user) {
        setProfile(res.user);
        initFormData(res.user);
        setIsEditing(false);
        setSuccessMsg("Profile updated successfully!");
        await loadShowcaseData(res.user);
      } else {
        setError(res?.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!auth.isLoggedIn) {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔒</div>
        <h2 style={{ color: "#f8fafc", fontSize: "24px", fontWeight: "800" }}>Authentication Required</h2>
        <p style={{ color: "#94a3b8", marginTop: "8px", fontSize: "14px" }}>
          Please sign in to view and manage your personal profile and showcase portfolio.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔄</div>
        <p style={{ color: "#94a3b8", fontSize: "15px", fontWeight: "600" }}>Loading member profile & showcase portfolio...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center", padding: "30px 20px" }}>
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>⚠️</div>
        <h3 style={{ color: "#ef4444", fontSize: "20px", fontWeight: "800" }}>Error Loading Profile</h3>
        <p style={{ color: "#94a3b8", margin: "12px 0" }}>{error}</p>
        <button
          onClick={loadProfile}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            border: "none",
            color: "#fff",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          🔁 Retry Loading
        </button>
      </div>
    );
  }

  const initials = (profile?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="profile-container">
      {/* Header Notification Banners */}
      {successMsg && (
        <div
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            color: "#4ade80",
            padding: "14px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          <span>🎉 {successMsg}</span>
          <button
            onClick={() => setSuccessMsg("")}
            style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#f87171",
            padding: "14px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero User Header Banner */}
      <div className="profile-hero-card">
        <div className="profile-hero-user-info">
          {/* Squircle Avatar */}
          <div className="profile-hero-avatar">
            {initials}
          </div>

          <div className="profile-hero-details">
            <div className="profile-hero-name-container">
              <h2 className="profile-hero-name">
                {profile?.name}
              </h2>
              {profile?.enrolmentNumber && (
                <div className="profile-hero-id-pill">
                  🆔 {profile.enrolmentNumber}
                </div>
              )}
            </div>

            <div className="profile-hero-badges-row">
              <span
                className="profile-badge-pill"
                style={{
                  background: profile?.role === "ADMIN" ? "linear-gradient(135deg, rgba(234, 179, 8, 0.3) 0%, rgba(202, 138, 4, 0.4) 100%)" : "rgba(99, 102, 241, 0.25)",
                  border: profile?.role === "ADMIN" ? "1px solid #eab308" : "1px solid #6366f1",
                  color: profile?.role === "ADMIN" ? "#fef08a" : "#a5b4fc",
                }}
              >
                {profile?.role === "ADMIN" ? "👑 System Admin" : "🎓 Team Member"}
              </span>

              <span
                className="profile-badge-pill"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                }}
              >
                💼 {profile?.position || "Member"}
              </span>

              {profile?.clusterName && (
                <span
                  className="profile-badge-pill"
                  style={{
                    background: "rgba(168, 85, 247, 0.25)",
                    border: "1px solid #a855f7",
                    color: "#e9d5ff",
                  }}
                >
                  🚀 {profile.clusterName}
                </span>
              )}

              <span
                className="profile-badge-pill"
                style={{
                  background: profile?.status === "ACTIVE" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  border: profile?.status === "ACTIVE" ? "1px solid #22c55e" : "1px solid #ef4444",
                  color: profile?.status === "ACTIVE" ? "#4ade80" : "#f87171",
                }}
              >
                {profile?.status === "ACTIVE" ? "🟢 ACTIVE" : "🔴 INACTIVE"}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            onClick={() => loadShowcaseData(profile)}
            disabled={showcaseLoading}
            className="profile-hero-btn"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
            }}
          >
            🔄 {showcaseLoading ? "Refreshing…" : "Refresh Portfolio"}
          </button>

          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="profile-hero-btn"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
              }}
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="profile-hero-btn"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
              }}
            >
              ✕ Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* Overview Quick Stats Summary Cards */}
      <div className="profile-stats-grid">
        <div
          onClick={() => setActiveTab("COURSES")}
          className="profile-stat-card"
          style={{ border: "1px solid rgba(99, 102, 241, 0.3)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "28px" }}>🎓</span>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#818cf8" }}>{userCourses.length}</span>
          </div>
          <h4 style={{ margin: "10px 0 2px 0", color: "#f8fafc", fontSize: "15px", fontWeight: "700" }}>Completed Courses</h4>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Verified course progress</span>
        </div>

        <div
          onClick={() => setActiveTab("PROJECTS")}
          className="profile-stat-card"
          style={{ border: "1px solid rgba(16, 185, 129, 0.3)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "28px" }}>🏆</span>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#34d399" }}>{userProjects.length}</span>
          </div>
          <h4 style={{ margin: "10px 0 2px 0", color: "#f8fafc", fontSize: "15px", fontWeight: "700" }}>Published Projects</h4>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Approved showcase items</span>
        </div>

        <div
          onClick={() => setActiveTab("HACKATHONS")}
          className="profile-stat-card"
          style={{ border: "1px solid rgba(245, 158, 11, 0.3)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "28px" }}>🚀</span>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#fbbf24" }}>{userHackathons.length}</span>
          </div>
          <h4 style={{ margin: "10px 0 2px 0", color: "#f8fafc", fontSize: "15px", fontWeight: "700" }}>Hackathons Participated</h4>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Events & competitions</span>
        </div>

        <div
          onClick={() => setActiveTab("CERTIFICATES")}
          className="profile-stat-card"
          style={{ border: "1px solid rgba(168, 85, 247, 0.3)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "28px" }}>📜</span>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#c084fc" }}>{userCertificates.length}</span>
          </div>
          <h4 style={{ margin: "10px 0 2px 0", color: "#f8fafc", fontSize: "15px", fontWeight: "700" }}>Verified Certificates</h4>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Official credentials</span>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="profile-tabs-row">
        {[
          { key: "OVERVIEW", label: "👤 Profile Details & Meta" },
          { key: "COURSES", label: `🎓 Courses (${userCourses.length})` },
          { key: "PROJECTS", label: `🏆 Projects (${userProjects.length})` },
          { key: "HACKATHONS", label: `🚀 Hackathons (${userHackathons.length})` },
          { key: "CERTIFICATES", label: `📜 Certificates (${userCertificates.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`profile-tab-btn ${tab.key === "OVERVIEW" ? "tab-overview" : ""} ${activeTab === tab.key ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* EDIT MODE FORM */}
      {isEditing ? (
        <form onSubmit={handleSave} style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "20px", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <h3 style={{ margin: "0 0 20px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", color: "#f8fafc", fontSize: "20px" }}>
            ✏️ Edit Personal Profile Information
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Personal Email</label>
              <input
                type="email"
                placeholder="name@personal.com"
                value={formData.personalEmail}
                onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>BIT / Institutional Email</label>
              <input
                type="email"
                placeholder="user.cs25@bitsathy.ac.in"
                value={formData.bitEmail}
                onChange={(e) => setFormData({ ...formData, bitEmail: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Mobile Number</label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>GitHub Profile URL</label>
              <input
                type="text"
                placeholder="https://github.com/username"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>LinkedIn Profile URL</label>
              <input
                type="text"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Primary Interests (comma-separated)</label>
              <input
                type="text"
                placeholder="Web Development, Artificial Intelligence, Mobile Apps"
                value={formData.primaryInterests}
                onChange={(e) => setFormData({ ...formData, primaryInterests: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Secondary Interests (comma-separated)</label>
              <input
                type="text"
                placeholder="Cloud Computing, UI/UX Design, Open Source"
                value={formData.secondaryInterests}
                onChange={(e) => setFormData({ ...formData, secondaryInterests: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>Specializations (comma-separated)</label>
              <input
                type="text"
                placeholder="React.js, Node.js, Python, MongoDB"
                value={formData.specializations}
                onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>
          </div>

          <div style={{ marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", borderLeft: "4px solid #6366f1" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              🔒 Protected fields (Role, Status, Position, Cluster, Enrolment Number, Points) remain administrator-controlled.
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              style={{ padding: "10px 18px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontWeight: "600", cursor: "pointer" }}
            >
              ❌ Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff", fontWeight: "700", cursor: "pointer" }}
            >
              {saving ? "💾 Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        /* VIEW TAB CONTENTS */
        <div>
          {/* TAB 1: OVERVIEW & META */}
          {activeTab === "OVERVIEW" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Personal Information */}
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 18px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", color: "#f8fafc", fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                  👤 Personal Information
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>Full Name</label>
                    <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "15px" }}>{profile?.name || "-"}</div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>Account Email (System)</label>
                    <div style={{ fontWeight: "600", color: "#cbd5e1", fontSize: "14px" }}>{profile?.email || "-"}</div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>Personal Email</label>
                    <div style={{ fontSize: "14px", color: profile?.personalEmail ? "#f8fafc" : "#64748b" }}>
                      {profile?.personalEmail || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>BIT / Institutional Email</label>
                    <div style={{ fontSize: "14px", color: profile?.bitEmail ? "#f8fafc" : "#64748b" }}>
                      {profile?.bitEmail || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>Mobile Number</label>
                    <div style={{ fontSize: "14px", color: profile?.mobile ? "#f8fafc" : "#64748b" }}>
                      {profile?.mobile || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>Enrolment Number (Protected)</label>
                    <div style={{ fontSize: "14px", fontFamily: "monospace", color: profile?.enrolmentNumber ? "#60a5fa" : "#64748b", fontWeight: "700" }}>
                      {profile?.enrolmentNumber || "Not assigned"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional & Social Profiles */}
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 18px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", color: "#f8fafc", fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                  🔗 Professional & Social Profiles
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600" }}>Position (Admin Managed)</label>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>{profile?.position || "Member"}</div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600" }}>GitHub Profile</label>
                    <div>
                      {profile?.github ? (
                        <a
                          href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#60a5fa",
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          📦 {profile.github}
                        </a>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "14px" }}>Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600" }}>LinkedIn Profile</label>
                    <div>
                      {profile?.linkedin ? (
                        <a
                          href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            background: "rgba(59, 130, 246, 0.15)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            color: "#93c5fd",
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          🔗 {profile.linkedin}
                        </a>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "14px" }}>Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interests & Specializations */}
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 18px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", color: "#f8fafc", fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                  💡 Interests & Specializations
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "8px", fontWeight: "600" }}>Primary Interests</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {profile?.primaryInterests?.length > 0 ? (
                        profile.primaryInterests.map((item, idx) => (
                          <span key={idx} style={{ background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#a5b4fc", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "13px" }}>None added yet</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "8px", fontWeight: "600" }}>Secondary Interests</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {profile?.secondaryInterests?.length > 0 ? (
                        profile.secondaryInterests.map((item, idx) => (
                          <span key={idx} style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "13px" }}>None added yet</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "8px", fontWeight: "600" }}>Specializations</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {profile?.specializations?.length > 0 ? (
                        profile.specializations.map((item, idx) => (
                          <span key={idx} style={{ background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#d8b4fe", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "13px" }}>None added yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Protected System Status */}
              <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "18px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", color: "#94a3b8", fontSize: "15px", fontWeight: "700" }}>
                  🔒 Protected System Metadata (Administrator Controlled)
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <div>
                    <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>System User ID</label>
                    <div style={{ fontFamily: "monospace", color: "#94a3b8", fontWeight: "600" }}>{profile?.userId || "-"}</div>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Role Status</label>
                    <div style={{ fontWeight: "700", color: profile?.role === "ADMIN" ? "#eab308" : "#cbd5e1" }}>{profile?.role}</div>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Account Status</label>
                    <div style={{ fontWeight: "700", color: profile?.status === "ACTIVE" ? "#22c55e" : "#ef4444" }}>{profile?.status}</div>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Cluster Assignment</label>
                    <div style={{ fontWeight: "600", color: "#f8fafc" }}>{profile?.clusterName || "Core"}</div>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Activity Points</label>
                    <div style={{ fontWeight: "800", color: "#38bdf8", fontSize: "16px" }}>{profile?.activityPoints || 0} pts</div>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Reward Points</label>
                    <div style={{ fontWeight: "800", color: "#f59e0b", fontSize: "16px" }}>{profile?.rewardPoints || profile?.rewardPts || 0} pts</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETED COURSES */}
          {activeTab === "COURSES" && (
            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#818cf8", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                🎓 Verified Completed Courses
              </h3>

              {userCourses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📚</div>
                  <p style={{ fontSize: "15px", fontWeight: "600" }}>No completed courses recorded yet.</p>
                  <small style={{ color: "#64748b" }}>Complete assigned courses on the Dashboard to earn completion badges!</small>
                </div>
              ) : (
                <div className="profile-showcase-grid">
                  {userCourses.map((c, idx) => (
                    <div
                      key={idx}
                      className="profile-showcase-card"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                            border: "1px solid rgba(99, 102, 241, 0.4)",
                            color: "#a5b4fc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                            fontSize: "18px",
                            flexShrink: 0,
                          }}
                        >
                          🎓
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", color: "#f8fafc", fontSize: "15px", fontWeight: "700" }}>
                            {c.title || c.courseName || c.display || c}
                          </h4>
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            Level: <strong style={{ color: "#c084fc", fontWeight: "700" }}>{c.level || c.currentLevel || "Completed"}</strong>
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "#4ade80",
                          background: "rgba(34, 197, 94, 0.15)",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✓ Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PUBLISHED PROJECTS */}
          {activeTab === "PROJECTS" && (
            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#34d399", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                🏆 Submitted & Published Showcase Projects
              </h3>

              {userProjects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>💻</div>
                  <p style={{ fontSize: "15px", fontWeight: "600" }}>No published showcase projects found for your account.</p>
                  <small style={{ color: "#64748b" }}>Submit assigned deliverables to get them approved and published to the Projects Showcase!</small>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                  {userProjects.map((p) => {
                    const title = p.taskId?.title || "Published Project";
                    const domain = p.taskId?.domain || "Software Development";

                    return (
                      <div
                        key={p._id}
                        style={{
                          background: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(52, 211, 153, 0.3)",
                          borderRadius: "16px",
                          padding: "22px",
                          display: "flex",
                          flexDirection: "column",
                          justify: "space-between",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "4px 10px", borderRadius: "20px" }}>
                              {domain}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "4px 10px", borderRadius: "20px" }}>
                              Version {p.version || "V1"}
                            </span>
                          </div>

                          <h4 style={{ margin: "6px 0 10px 0", color: "#f8fafc", fontSize: "18px", fontWeight: "800" }}>
                            {title}
                          </h4>

                          {p.notes && (
                            <p style={{ margin: "0 0 14px 0", color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>
                              {p.notes.substring(0, 110)}{p.notes.length > 110 ? "…" : ""}
                            </p>
                          )}
                        </div>

                        <div>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                            {p.demoUrl && (
                              <a
                                href={p.demoUrl.startsWith("http") ? p.demoUrl : `https://${p.demoUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  flex: 1,
                                  textAlign: "center",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  color: "#ffffff",
                                  fontWeight: "700",
                                  fontSize: "12px",
                                  textDecoration: "none",
                                }}
                              >
                                🚀 Live Demo
                              </a>
                            )}

                            {p.githubUrl && (
                              <a
                                href={p.githubUrl.startsWith("http") ? p.githubUrl : `https://${p.githubUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  flex: 1,
                                  textAlign: "center",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  background: "rgba(255, 255, 255, 0.08)",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  color: "#f8fafc",
                                  fontWeight: "700",
                                  fontSize: "12px",
                                  textDecoration: "none",
                                }}
                              >
                                📦 GitHub Repo
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HACKATHONS */}
          {activeTab === "HACKATHONS" && (
            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#fbbf24", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                🚀 Hackathons Participated
              </h3>

              {userHackathons.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏆</div>
                  <p style={{ fontSize: "15px", fontWeight: "600" }}>No hackathon records matched your profile.</p>
                  <small style={{ color: "#64748b" }}>Register and participate in hackathons on the Hackathons page to showcase team achievements!</small>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px" }}>
                  {userHackathons.map((h, idx) => (
                    <div
                      key={h.EVENT_ID || h._id || idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: "16px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        justify: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)", padding: "3px 10px", borderRadius: "20px" }}>
                            {h.STATUS || "Participated"}
                          </span>
                          {h.POSITION && (
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "3px 10px", borderRadius: "20px" }}>
                              {h.POSITION}
                            </span>
                          )}
                        </div>

                        <h4 style={{ margin: "6px 0 4px 0", color: "#f8fafc", fontSize: "17px", fontWeight: "800" }}>
                          {h.TITLE || h.title}
                        </h4>

                        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
                          🏛️ {h.ORGANIZER || h.organizer || "College Competition"} • 📅 {h.DATE || "Recent"}
                        </div>

                        {(h.PROJECT || h.project) && (
                          <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", marginBottom: "10px", fontSize: "12px", color: "#cbd5e1" }}>
                            <strong>Project:</strong> {h.PROJECT || h.project}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        {(h.GITHUB || h.github) && (
                          <a
                            href={String(h.GITHUB || h.github).startsWith("http") ? (h.GITHUB || h.github) : `https://${h.GITHUB || h.github}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ flex: 1, textAlign: "center", padding: "6px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: "12px", textDecoration: "none", fontWeight: "600" }}
                          >
                            📦 Code
                          </a>
                        )}
                        {(h.DEMO || h.demo) && (
                          <a
                            href={String(h.DEMO || h.demo).startsWith("http") ? (h.DEMO || h.demo) : `https://${h.DEMO || h.demo}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ flex: 1, textAlign: "center", padding: "6px 10px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontSize: "12px", textDecoration: "none", fontWeight: "600" }}
                          >
                            🚀 Demo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CERTIFICATES */}
          {activeTab === "CERTIFICATES" && (
            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "18px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#c084fc", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                📜 Submitted & Verified Certificates
              </h3>

              {userCertificates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📜</div>
                  <p style={{ fontSize: "15px", fontWeight: "600" }}>No certificates linked to your enrolment number or email.</p>
                  <small style={{ color: "#64748b" }}>Upload your course and hackathon certificates on the Certificates page!</small>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                  {userCertificates.map((cert, idx) => (
                    <div
                      key={cert.CERTIFICATE_ID || cert._id || idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        borderRadius: "16px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        justify: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", background: "rgba(168, 85, 247, 0.15)", padding: "3px 10px", borderRadius: "20px" }}>
                            {cert.CATEGORY || "Certificate"}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#4ade80", background: "rgba(34, 197, 94, 0.15)", padding: "3px 10px", borderRadius: "20px" }}>
                            {cert.STATUS || "Verified"}
                          </span>
                        </div>

                        <h4 style={{ margin: "6px 0 4px 0", color: "#f8fafc", fontSize: "17px", fontWeight: "800" }}>
                          {cert.TITLE || cert.title}
                        </h4>

                        <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>
                          🏛️ {cert.ISSUER || cert.issuer || "Issuing Organization"}
                        </div>

                        {cert.DATE && (
                          <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                            📅 Completion: {cert.DATE}
                          </div>
                        )}
                      </div>

                      {(cert.FILE_URL || cert.fileUrl) && (
                        <a
                          href={String(cert.FILE_URL || cert.fileUrl).startsWith("http") ? (cert.FILE_URL || cert.fileUrl) : `https://${cert.FILE_URL || cert.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            marginTop: "16px",
                            textAlign: "center",
                            padding: "10px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                            color: "#ffffff",
                            fontWeight: "700",
                            fontSize: "13px",
                            textDecoration: "none",
                            boxShadow: "0 4px 14px rgba(168, 85, 247, 0.3)",
                          }}
                        >
                          📄 View Verified Certificate
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

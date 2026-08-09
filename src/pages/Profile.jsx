// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyProfile, updateMyProfile } from "../utils/api";

export default function Profile() {
  const { auth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
      };

      const res = await updateMyProfile(payload);
      if (res?.success && res?.user) {
        setProfile(res.user);
        initFormData(res.user);
        setIsEditing(false);
        setSuccessMsg("Profile updated successfully!");
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
      <div className="page-container">
        <div className="card" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2>Authentication Required</h2>
          <p style={{ color: "#94a3b8", marginTop: "8px" }}>
            Please sign in to view and manage your personal profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>🔄</div>
        <p style={{ color: "#94a3b8" }}>Loading your profile data...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center", padding: "30px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ color: "#ef4444" }}>Error Loading Profile</h3>
          <p style={{ color: "#94a3b8", margin: "12px 0" }}>{error}</p>
          <button className="btn primary" onClick={loadProfile}>
            🔁 Retry Loading
          </button>
        </div>
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
    <div className="page-container" style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {/* Header Notification Banners */}
      {successMsg && (
        <div
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            color: "#4ade80",
            padding: "14px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>🎉 {successMsg}</span>
          <button
            onClick={() => setSuccessMsg("")}
            style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer" }}
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
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Profile Header Banner */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "28px",
          marginBottom: "24px",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "700",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
            }}
          >
            {initials}
          </div>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "24px" }}>{profile?.name}</h2>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: profile?.role === "ADMIN" ? "rgba(234, 179, 8, 0.2)" : "rgba(99, 102, 241, 0.2)",
                  color: profile?.role === "ADMIN" ? "#eab308" : "#818cf8",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {profile?.role === "ADMIN" ? "👑 System Admin" : "🎓 Team Member"}
              </span>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                }}
              >
                💼 {profile?.position || "Member"}
              </span>
              {profile?.clusterName && (
                <span
                  style={{
                    background: "rgba(168, 85, 247, 0.2)",
                    color: "#c084fc",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                  }}
                >
                  🚀 {profile.clusterName}
                </span>
              )}
            </div>
          </div>
        </div>

        {!isEditing && (
          <button className="btn primary" onClick={handleStartEdit} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {!isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Personal Info Card */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              👤 Personal Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>Full Name</label>
                <div style={{ fontWeight: "600" }}>{profile?.name || "-"}</div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>Account Email (System)</label>
                <div style={{ fontWeight: "500", color: "#cbd5e1" }}>{profile?.email || "-"}</div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>Personal Email</label>
                <div>{profile?.personalEmail || <span style={{ color: "#64748b" }}>Not specified</span>}</div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>BIT / Institutional Email</label>
                <div>{profile?.bitEmail || <span style={{ color: "#64748b" }}>Not specified</span>}</div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>Mobile Number</label>
                <div>{profile?.mobile || <span style={{ color: "#64748b" }}>Not specified</span>}</div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>Enrolment Number (Protected)</label>
                <div>{profile?.enrolmentNumber || <span style={{ color: "#64748b" }}>Not assigned</span>}</div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              🔗 Professional & Social Profiles
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>Position (Admin Managed)</label>
                <div>{profile?.position || "Member"}</div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>GitHub Profile</label>
                <div>
                  {profile?.github ? (
                    <a href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
                      🔗 {profile.github}
                    </a>
                  ) : (
                    <span style={{ color: "#64748b" }}>Not specified</span>
                  )}
                </div>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>LinkedIn Profile</label>
                <div>
                  {profile?.linkedin ? (
                    <a href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
                      🔗 {profile.linkedin}
                    </a>
                  ) : (
                    <span style={{ color: "#64748b" }}>Not specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interests & Specializations */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              💡 Interests & Specializations
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px" }}>Primary Interests</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {profile?.primaryInterests?.length > 0 ? (
                    profile.primaryInterests.map((item, idx) => (
                      <span key={idx} style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", color: "#a5b4fc", padding: "4px 10px", borderRadius: "6px", fontSize: "13px" }}>
                        {item}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#64748b" }}>None added yet</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px" }}>Secondary Interests</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {profile?.secondaryInterests?.length > 0 ? (
                    profile.secondaryInterests.map((item, idx) => (
                      <span key={idx} style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#cbd5e1", padding: "4px 10px", borderRadius: "6px", fontSize: "13px" }}>
                        {item}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#64748b" }}>None added yet</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px" }}>Specializations</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {profile?.specializations?.length > 0 ? (
                    profile.specializations.map((item, idx) => (
                      <span key={idx} style={{ background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#d8b4fe", padding: "4px 10px", borderRadius: "6px", fontSize: "13px" }}>
                        {item}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#64748b" }}>None added yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Protected System Status */}
          <div className="card" style={{ padding: "24px", background: "rgba(15, 23, 42, 0.4)" }}>
            <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", color: "#94a3b8", fontSize: "15px" }}>
              🔒 Protected System Metadata (Administrator Controlled)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>System User ID</label>
                <div style={{ fontFamily: "monospace", color: "#94a3b8" }}>{profile?.userId || "-"}</div>
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Role Status</label>
                <div style={{ fontWeight: "600", color: profile?.role === "ADMIN" ? "#eab308" : "#cbd5e1" }}>{profile?.role}</div>
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Account Status</label>
                <div style={{ fontWeight: "600", color: profile?.status === "ACTIVE" ? "#22c55e" : "#ef4444" }}>{profile?.status}</div>
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Cluster Assignment</label>
                <div>{profile?.clusterName || "Core"}</div>
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Activity Points</label>
                <div style={{ fontWeight: "700", color: "#38bdf8" }}>{profile?.activityPoints || 0} pts</div>
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Reward Points</label>
                <div style={{ fontWeight: "700", color: "#f59e0b" }}>{profile?.rewardPoints || profile?.rewardPts || 0} pts</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE FORM */
        <form onSubmit={handleSave} className="card" style={{ padding: "28px" }}>
          <h3 style={{ margin: "0 0 20px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
            ✏️ Edit Personal Profile Information
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {/* Permitted Field: Name */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>Full Name *</label>
              <input
                className="search"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: "100%" }}
              />
            </div>

            {/* Permitted Field: Personal Email */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>Personal Email</label>
              <input
                className="search"
                type="email"
                placeholder="name@personal.com"
                value={formData.personalEmail}
                onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Permitted Field: BIT Email */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>BIT / Institutional Email</label>
              <input
                className="search"
                type="email"
                placeholder="user.cs25@bitsathy.ac.in"
                value={formData.bitEmail}
                onChange={(e) => setFormData({ ...formData, bitEmail: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Permitted Field: Mobile */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>Mobile Number</label>
              <input
                className="search"
                type="text"
                placeholder="+91 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Permitted Field: GitHub */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>GitHub Profile URL</label>
              <input
                className="search"
                type="text"
                placeholder="https://github.com/username"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Permitted Field: LinkedIn */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>LinkedIn Profile URL</label>
              <input
                className="search"
                type="text"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
            {/* Primary Interests */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>Primary Interests (comma-separated)</label>
              <input
                className="search"
                type="text"
                placeholder="Web Development, Artificial Intelligence, Mobile Apps"
                value={formData.primaryInterests}
                onChange={(e) => setFormData({ ...formData, primaryInterests: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Secondary Interests */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>Secondary Interests (comma-separated)</label>
              <input
                className="search"
                type="text"
                placeholder="Cloud Computing, UI/UX Design, Open Source"
                value={formData.secondaryInterests}
                onChange={(e) => setFormData({ ...formData, secondaryInterests: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Specializations */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>Specializations (comma-separated)</label>
              <input
                className="search"
                type="text"
                placeholder="React.js, Node.js, Python, MongoDB"
                value={formData.specializations}
                onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Protected Fields Notice */}
          <div style={{ marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", borderLeft: "3px solid #6366f1" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              🔒 Protected fields (Role, Status, Position, Cluster, Enrolment Number, Points) remain administrator-controlled and cannot be edited self-service.
            </span>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
            <button type="button" className="btn secondary" onClick={handleCancelEdit} disabled={saving}>
              ❌ Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "💾 Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

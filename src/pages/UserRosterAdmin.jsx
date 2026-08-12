// src/pages/UserRosterAdmin.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { isSuperAdminEmail } from "../utils/roles";
import EditModal from "../components/EditModal";
import AddMemberModal from "../components/AddMemberModal";

export default function UserRosterAdmin({ search = "" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingUser, setEditingUser] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch("/users");
      if (res?.users) {
        const cleaned = res.users.filter((u) => !isSuperAdminEmail(u.email) && !isSuperAdminEmail(u.personalEmail) && !isSuperAdminEmail(u.bitEmail));
        setUsers(cleaned);
      } else {
        setError("Failed to fetch users.");
      }
    } catch (err) {
      console.error("Error loading users for admin:", err);
      setError(err.message || "Failed to load system user roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleToggle = async (user) => {
    const isCurrentlyAdmin = user.role === "ADMIN";
    const newRole = isCurrentlyAdmin ? "MEMBER" : "ADMIN";
    const confirmMsg = isCurrentlyAdmin
      ? `Demote ${user.name} from System Admin to Team Member?`
      : `Promote ${user.name} to System Administrator?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(user._id);
    try {
      await apiFetch(`/users/${user._id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      await loadUsers();
    } catch (err) {
      alert("Failed to update role: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusToggle = async (user) => {
    const isCurrentlyActive = user.status === "ACTIVE";
    const newStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    const confirmMsg = isCurrentlyActive
      ? `Deactivate ${user.name}'s account?`
      : `Reactivate ${user.name}'s account?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(user._id);
    try {
      await apiFetch(`/users/${user._id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      await loadUsers();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete ${user.name} (${user.email}) from MongoDB Atlas.\n\nThis action cannot be undone.`)) {
      return;
    }

    setActionLoadingId(user._id);
    try {
      await apiFetch(`/users/${user._id}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter === "ADMIN" && u.role !== "ADMIN") return false;
      if (roleFilter === "MEMBER" && u.role !== "MEMBER") return false;
      if (roleFilter === "INACTIVE" && u.status !== "INACTIVE") return false;

      // Text search
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        (u.name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        (u.enrolmentNumber || "").toLowerCase().includes(term) ||
        (u.position || "").toLowerCase().includes(term) ||
        (u.clusterName || "").toLowerCase().includes(term) ||
        (u.role || "").toLowerCase().includes(term)
      );
    });
  }, [users, roleFilter, search]);

  const adminCount = users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE").length;
  const memberCount = users.filter((u) => u.role === "MEMBER" && u.status === "ACTIVE").length;
  const inactiveCount = users.filter((u) => u.status === "INACTIVE").length;

  return (
    <div className="user-roster-container">
      {/* Header Hub Card */}
      <div className="user-roster-hub">
        <div className="user-roster-hub-top">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "24px" }}>👥</span>
              <h2 style={{ margin: 0, fontSize: "24px", color: "#f8fafc", fontWeight: "800", letterSpacing: "-0.3px" }}>
                Manage Members Hub
              </h2>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px", lineHeight: "1.5" }}>
              Control member access, assign system roles, positions, clusters, and account statuses.
            </p>
          </div>

          <button
            className="user-roster-add-btn"
            onClick={() => setShowAddMember(true)}
          >
            <span>➕</span> Add New Member
          </button>
        </div>

        {/* Filter Tab Pills - Horizontal Scrollable */}
        <div className="user-roster-filter-pills">
          <button
            onClick={() => setRoleFilter("ALL")}
            className={`roster-pill ${roleFilter === "ALL" ? "active" : ""}`}
            style={{
              background: roleFilter === "ALL" ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "rgba(255,255,255,0.04)",
              boxShadow: roleFilter === "ALL" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
            }}
          >
            <span>👥</span> All Users <span className="roster-pill-count">{users.length}</span>
          </button>

          <button
            onClick={() => setRoleFilter("ADMIN")}
            className={`roster-pill ${roleFilter === "ADMIN" ? "active" : ""}`}
            style={{
              background: roleFilter === "ADMIN" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255,255,255,0.04)",
              boxShadow: roleFilter === "ADMIN" ? "0 4px 12px rgba(245, 158, 11, 0.3)" : "none",
            }}
          >
            <span>👑</span> System Admins <span className="roster-pill-count">{adminCount}</span>
          </button>

          <button
            onClick={() => setRoleFilter("MEMBER")}
            className={`roster-pill ${roleFilter === "MEMBER" ? "active" : ""}`}
            style={{
              background: roleFilter === "MEMBER" ? "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)" : "rgba(255,255,255,0.04)",
              boxShadow: roleFilter === "MEMBER" ? "0 4px 12px rgba(56, 189, 248, 0.3)" : "none",
            }}
          >
            <span>🎓</span> Team Members <span className="roster-pill-count">{memberCount}</span>
          </button>

          <button
            onClick={() => setRoleFilter("INACTIVE")}
            className={`roster-pill ${roleFilter === "INACTIVE" ? "active" : ""}`}
            style={{
              background: roleFilter === "INACTIVE" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(255,255,255,0.04)",
              boxShadow: roleFilter === "INACTIVE" ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none",
            }}
          >
            <span>⛔</span> Deactivated <span className="roster-pill-count">{inactiveCount}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "16px 20px", marginBottom: "24px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "70px 20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "14px" }}>⏳</div>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading system user records from database...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ padding: "50px 20px", textAlign: "center", background: "rgba(30, 27, 75, 0.35)", borderRadius: "20px", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <div style={{ fontSize: "42px", marginBottom: "14px" }}>🔍</div>
          <h3 style={{ color: "#f8fafc", margin: "0 0 8px 0", fontSize: "18px" }}>No matching members found</h3>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Try adjusting your search query or filter selection.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredUsers.map((user) => {
            const isTargetAdmin = user.role === "ADMIN";
            const isTargetActive = user.status === "ACTIVE";
            const isProcessing = actionLoadingId === user._id;

            return (
              <div
                key={user._id}
                className={`user-roster-card ${!isTargetActive ? "inactive-user" : ""}`}
              >
                {/* Left Metadata Area - Spacious, Uncluttered & Structured */}
                <div className="user-roster-left">
                  {/* Styled Avatar Circle */}
                  <div
                    className="user-roster-avatar"
                    style={{
                      background: isTargetAdmin
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      boxShadow: isTargetAdmin
                        ? "0 4px 14px rgba(245, 158, 11, 0.35)"
                        : "0 4px 14px rgba(99, 102, 241, 0.35)",
                    }}
                  >
                    {(user.name || "U")[0]?.toUpperCase()}
                  </div>

                  {/* Details Block */}
                  <div className="user-roster-details">
                    {/* Row 1: Full Name & Role/Status Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <h3 className="user-roster-name">
                        {user.name}
                      </h3>

                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontWeight: "600",
                            background: isTargetAdmin ? "rgba(245, 158, 11, 0.18)" : "rgba(99, 102, 241, 0.18)",
                            color: isTargetAdmin ? "#fbbf24" : "#a5b4fc",
                            border: isTargetAdmin ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(99, 102, 241, 0.35)",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {isTargetAdmin ? "👑 ADMIN" : "🎓 MEMBER"}
                        </span>

                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: isTargetActive ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: isTargetActive ? "#4ade80" : "#f87171",
                            border: isTargetActive ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                            fontWeight: "600",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {isTargetActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Email & Enrolment ID */}
                    <div className="user-roster-meta-row">
                      <span className="user-roster-email">
                        <span style={{ opacity: 0.8 }}>✉️</span> {user.email}
                      </span>

                      {user.enrolmentNumber && (
                        <span className="user-roster-enrolment">
                          <span>🆔</span> {user.enrolmentNumber}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Meta Tag Pills (Position & Cluster) */}
                    <div className="user-roster-tags-row">
                      <span className="user-roster-tag">
                        <span>💼</span> Position: <strong>{user.position || "Member"}</strong>
                      </span>

                      <span className="user-roster-tag">
                        <span>🚀</span> Cluster: <strong>{user.clusterName || "Core"}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="user-roster-actions">
                  {/* Role Switch Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="user-roster-action-btn"
                    style={{
                      background: isTargetAdmin ? "rgba(99, 102, 241, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: isTargetAdmin ? "#818cf8" : "#fbbf24",
                      border: isTargetAdmin ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                    onClick={() => handleRoleToggle(user)}
                    title={isTargetAdmin ? "Demote Admin to Member" : "Promote Member to Admin"}
                  >
                    {isTargetAdmin ? "🎓 Make Member" : "👑 Make Admin"}
                  </button>

                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="user-roster-action-btn"
                    style={{
                      background: isTargetActive ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                      color: isTargetActive ? "#f87171" : "#4ade80",
                      border: isTargetActive ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                    onClick={() => handleStatusToggle(user)}
                  >
                    {isTargetActive ? "⛔ Deactivate" : "✅ Activate"}
                  </button>

                  {/* Edit Full Profile */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="user-roster-action-btn btn-secondary-style"
                    onClick={() => setEditingUser(user)}
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete User */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="user-roster-action-btn btn-delete-style"
                    onClick={() => handleDeleteUser(user)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <EditModal
          student={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onCreated={() => {
            setShowAddMember(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

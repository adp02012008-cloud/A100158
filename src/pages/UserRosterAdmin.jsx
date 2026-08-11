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
    <div className="page-container" style={{ maxWidth: "1240px", margin: "0 auto", padding: "24px 20px" }}>
      {/* Header Hub Card */}
      <div
        style={{
          padding: "28px 32px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.75) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
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
            onClick={() => setShowAddMember(true)}
            style={{
              fontSize: "13.5px",
              padding: "10px 22px",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: "600",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "transform 0.15s ease",
            }}
          >
            <span>➕</span> Add New Member
          </button>
        </div>

        {/* Filter Tab Pills */}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
          <button
            onClick={() => setRoleFilter("ALL")}
            style={{
              fontSize: "12.5px",
              padding: "8px 18px",
              borderRadius: "24px",
              border: roleFilter === "ALL" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "ALL" ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "rgba(255,255,255,0.04)",
              color: roleFilter === "ALL" ? "#fff" : "#cbd5e1",
              fontWeight: roleFilter === "ALL" ? "600" : "500",
              cursor: "pointer",
              boxShadow: roleFilter === "ALL" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👥</span> All Users <span style={{ opacity: 0.85, fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "1px 7px", borderRadius: "10px" }}>{users.length}</span>
          </button>

          <button
            onClick={() => setRoleFilter("ADMIN")}
            style={{
              fontSize: "12.5px",
              padding: "8px 18px",
              borderRadius: "24px",
              border: roleFilter === "ADMIN" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "ADMIN" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255,255,255,0.04)",
              color: roleFilter === "ADMIN" ? "#fff" : "#cbd5e1",
              fontWeight: roleFilter === "ADMIN" ? "600" : "500",
              cursor: "pointer",
              boxShadow: roleFilter === "ADMIN" ? "0 4px 12px rgba(245, 158, 11, 0.3)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👑</span> System Admins <span style={{ opacity: 0.85, fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "1px 7px", borderRadius: "10px" }}>{adminCount}</span>
          </button>

          <button
            onClick={() => setRoleFilter("MEMBER")}
            style={{
              fontSize: "12.5px",
              padding: "8px 18px",
              borderRadius: "24px",
              border: roleFilter === "MEMBER" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "MEMBER" ? "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)" : "rgba(255,255,255,0.04)",
              color: roleFilter === "MEMBER" ? "#fff" : "#cbd5e1",
              fontWeight: roleFilter === "MEMBER" ? "600" : "500",
              cursor: "pointer",
              boxShadow: roleFilter === "MEMBER" ? "0 4px 12px rgba(56, 189, 248, 0.3)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🎓</span> Team Members <span style={{ opacity: 0.85, fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "1px 7px", borderRadius: "10px" }}>{memberCount}</span>
          </button>

          <button
            onClick={() => setRoleFilter("INACTIVE")}
            style={{
              fontSize: "12.5px",
              padding: "8px 18px",
              borderRadius: "24px",
              border: roleFilter === "INACTIVE" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "INACTIVE" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(255,255,255,0.04)",
              color: roleFilter === "INACTIVE" ? "#fff" : "#cbd5e1",
              fontWeight: roleFilter === "INACTIVE" ? "600" : "500",
              cursor: "pointer",
              boxShadow: roleFilter === "INACTIVE" ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⛔</span> Deactivated <span style={{ opacity: 0.85, fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "1px 7px", borderRadius: "10px" }}>{inactiveCount}</span>
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
                style={{
                  padding: "22px 26px",
                  background: "linear-gradient(135deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%)",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.09)",
                  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.25)",
                  backdropFilter: "blur(16px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "20px",
                  opacity: isTargetActive ? 1 : 0.6,
                  transition: "all 0.2s ease",
                }}
              >
                {/* Left Metadata Area - Spacious, Uncluttered & Structured */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flex: "1 1 420px", minWidth: 0 }}>
                  {/* Styled Avatar Circle */}
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "16px",
                      background: isTargetAdmin
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "800",
                      fontSize: "20px",
                      flexShrink: 0,
                      boxShadow: isTargetAdmin
                        ? "0 4px 14px rgba(245, 158, 11, 0.35)"
                        : "0 4px 14px rgba(99, 102, 241, 0.35)",
                      border: "2px solid rgba(255, 255, 255, 0.15)",
                      marginTop: "2px",
                    }}
                  >
                    {(user.name || "U")[0]?.toUpperCase()}
                  </div>

                  {/* Details Block */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: Full Name & Role/Status Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                          fontWeight: "700",
                          color: "#f8fafc",
                          letterSpacing: "-0.2px",
                          wordBreak: "break-word",
                        }}
                      >
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
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "10px", fontSize: "13.5px", color: "#94a3b8" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                        <span style={{ opacity: 0.8 }}>✉️</span> {user.email}
                      </span>

                      {user.enrolmentNumber && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "#a5b4fc",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>🆔</span> {user.enrolmentNumber}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Meta Tag Pills (Position & Cluster) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "5px 12px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          color: "#94a3b8",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>💼</span> Position: <strong style={{ color: "#f1f5f9", fontWeight: "600" }}>{user.position || "Member"}</strong>
                      </span>

                      <span
                        style={{
                          fontSize: "12px",
                          padding: "5px 12px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          color: "#94a3b8",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>🚀</span> Cluster: <strong style={{ color: "#f1f5f9", fontWeight: "600" }}>{user.clusterName || "Core"}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
                  {/* Role Switch Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: isTargetAdmin ? "rgba(99, 102, 241, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: isTargetAdmin ? "#818cf8" : "#fbbf24",
                      border: isTargetAdmin ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
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
                    style={{
                      fontSize: "12px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: isTargetActive ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                      color: isTargetActive ? "#f87171" : "#4ade80",
                      border: isTargetActive ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    onClick={() => handleStatusToggle(user)}
                  >
                    {isTargetActive ? "⛔ Deactivate" : "✅ Activate"}
                  </button>

                  {/* Edit Full Profile */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#f8fafc",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    onClick={() => setEditingUser(user)}
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete User */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
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


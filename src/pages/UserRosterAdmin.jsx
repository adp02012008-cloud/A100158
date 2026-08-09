// src/pages/UserRosterAdmin.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
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
        setUsers(res.users);
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
    <div className="page-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header Container */}
      <div
        style={{
          padding: "24px",
          marginBottom: "24px",
          background: "rgba(30, 27, 75, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "22px", color: "#f8fafc", fontWeight: "700" }}>
              👥 Manage Members Hub
            </h2>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              Control member access, manage roles, positions, clusters, and account statuses.
            </p>
          </div>

          <button
            onClick={() => setShowAddMember(true)}
            style={{
              fontSize: "13px",
              padding: "9px 18px",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
              cursor: "pointer",
            }}
          >
            ➕ Add New Member
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            onClick={() => setRoleFilter("ALL")}
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "20px",
              border: roleFilter === "ALL" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "ALL" ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "rgba(255,255,255,0.05)",
              color: roleFilter === "ALL" ? "#fff" : "#94a3b8",
              fontWeight: roleFilter === "ALL" ? "600" : "500",
              cursor: "pointer",
            }}
          >
            👥 All Users ({users.length})
          </button>

          <button
            onClick={() => setRoleFilter("ADMIN")}
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "20px",
              border: roleFilter === "ADMIN" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "ADMIN" ? "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)" : "rgba(255,255,255,0.05)",
              color: roleFilter === "ADMIN" ? "#fff" : "#94a3b8",
              fontWeight: roleFilter === "ADMIN" ? "600" : "500",
              cursor: "pointer",
            }}
          >
            👑 System Admins ({adminCount})
          </button>

          <button
            onClick={() => setRoleFilter("MEMBER")}
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "20px",
              border: roleFilter === "MEMBER" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "MEMBER" ? "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)" : "rgba(255,255,255,0.05)",
              color: roleFilter === "MEMBER" ? "#fff" : "#94a3b8",
              fontWeight: roleFilter === "MEMBER" ? "600" : "500",
              cursor: "pointer",
            }}
          >
            🎓 Team Members ({memberCount})
          </button>

          <button
            onClick={() => setRoleFilter("INACTIVE")}
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "20px",
              border: roleFilter === "INACTIVE" ? "none" : "1px solid rgba(255,255,255,0.1)",
              background: roleFilter === "INACTIVE" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(255,255,255,0.05)",
              color: roleFilter === "INACTIVE" ? "#fff" : "#94a3b8",
              fontWeight: roleFilter === "INACTIVE" ? "600" : "500",
              cursor: "pointer",
            }}
          >
            ⛔ Deactivated ({inactiveCount})
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "16px", marginBottom: "20px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <p style={{ color: "#94a3b8" }}>Loading system user records from MongoDB Atlas...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", background: "rgba(30, 27, 75, 0.4)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
          <h3 style={{ color: "#f8fafc", margin: "0 0 6px 0" }}>No matching members found</h3>
          <p style={{ color: "#94a3b8", margin: 0 }}>Try adjusting your search query or filter selection.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredUsers.map((user) => {
            const isTargetAdmin = user.role === "ADMIN";
            const isTargetActive = user.status === "ACTIVE";
            const isProcessing = actionLoadingId === user._id;

            return (
              <div
                key={user._id}
                style={{
                  padding: "16px 20px",
                  background: "rgba(30, 27, 75, 0.35)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                  opacity: isTargetActive ? 1 : 0.65,
                }}
              >
                {/* Left Metadata Block */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 320px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: isTargetAdmin ? "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {(user.name || "U")[0]?.toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "15px", color: "#f8fafc" }}>{user.name}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontWeight: "600",
                          background: isTargetAdmin ? "rgba(234, 179, 8, 0.2)" : "rgba(99, 102, 241, 0.2)",
                          color: isTargetAdmin ? "#eab308" : "#818cf8",
                        }}
                      >
                        {isTargetAdmin ? "👑 ADMIN" : "🎓 MEMBER"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: isTargetActive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: isTargetActive ? "#4ade80" : "#f87171",
                          fontWeight: "500",
                        }}
                      >
                        {isTargetActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                      ✉️ {user.email} {user.enrolmentNumber && `• 🆔 ${user.enrolmentNumber}`}
                    </div>
                    <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "3px" }}>
                      💼 Position: <strong style={{ color: "#f1f5f9" }}>{user.position || "Member"}</strong> • 🚀 Cluster: <strong style={{ color: "#f1f5f9" }}>{user.clusterName || "Core"}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {/* Role Switch Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: isTargetAdmin ? "rgba(99, 102, 241, 0.15)" : "rgba(234, 179, 8, 0.15)",
                      color: isTargetAdmin ? "#818cf8" : "#eab308",
                      border: isTargetAdmin ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
                      fontWeight: "600",
                      cursor: "pointer",
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
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: isTargetActive ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                      color: isTargetActive ? "#f87171" : "#4ade80",
                      border: isTargetActive ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
                      fontWeight: "600",
                      cursor: "pointer",
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
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#f8fafc",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      fontWeight: "600",
                      cursor: "pointer",
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
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      fontWeight: "600",
                      cursor: "pointer",
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

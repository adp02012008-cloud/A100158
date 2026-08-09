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
      {/* Page Header */}
      <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "24px" }}>👥 Manage Members Hub</h2>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              Dedicated administrative control center for user roles, positions, permissions, and account statuses.
            </p>
          </div>
          <button className="btn primary" onClick={() => setShowAddMember(true)}>
            ➕ Add New Member
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            className={`btn ${roleFilter === "ALL" ? "primary" : "secondary"}`}
            onClick={() => setRoleFilter("ALL")}
            style={{ fontSize: "13px", padding: "6px 14px" }}
          >
            👥 All Users ({users.length})
          </button>
          <button
            className={`btn ${roleFilter === "ADMIN" ? "primary" : "secondary"}`}
            onClick={() => setRoleFilter("ADMIN")}
            style={{ fontSize: "13px", padding: "6px 14px", background: roleFilter === "ADMIN" ? "#eab308" : undefined, color: roleFilter === "ADMIN" ? "#000" : undefined }}
          >
            👑 System Admins ({adminCount})
          </button>
          <button
            className={`btn ${roleFilter === "MEMBER" ? "primary" : "secondary"}`}
            onClick={() => setRoleFilter("MEMBER")}
            style={{ fontSize: "13px", padding: "6px 14px" }}
          >
            🎓 Team Members ({memberCount})
          </button>
          <button
            className={`btn ${roleFilter === "INACTIVE" ? "primary" : "secondary"}`}
            onClick={() => setRoleFilter("INACTIVE")}
            style={{ fontSize: "13px", padding: "6px 14px", background: roleFilter === "INACTIVE" ? "#ef4444" : undefined }}
          >
            ⛔ Deactivated ({inactiveCount})
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: "16px", marginBottom: "20px", border: "1px solid #ef4444", color: "#f87171" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <p style={{ color: "#94a3b8" }}>Loading system user records from MongoDB Atlas...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <h3>No users found</h3>
          <p style={{ color: "#94a3b8" }}>Try adjusting your search query or filter selection.</p>
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
                className="card"
                style={{
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                  borderLeft: isTargetAdmin ? "4px solid #eab308" : "4px solid #6366f1",
                  opacity: isTargetActive ? 1 : 0.6,
                }}
              >
                {/* Left Metadata */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "1 1 300px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: isTargetAdmin ? "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    {(user.name || "U")[0]?.toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "16px" }}>{user.name}</strong>
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
                        }}
                      >
                        {isTargetActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                      ✉️ {user.email} {user.enrolmentNumber && `• 🆔 ${user.enrolmentNumber}`}
                    </div>
                    <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>
                      💼 Position: <strong>{user.position || "Member"}</strong> • 🚀 Cluster: <strong>{user.clusterName || "Core"}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {/* Role Switch Button */}
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "8px 12px",
                      borderColor: isTargetAdmin ? "rgba(99, 102, 241, 0.4)" : "rgba(234, 179, 8, 0.4)",
                      color: isTargetAdmin ? "#818cf8" : "#eab308",
                    }}
                    onClick={() => handleRoleToggle(user)}
                    title={isTargetAdmin ? "Demote Admin to Member" : "Promote Member to Admin"}
                  >
                    {isTargetAdmin ? "🎓 Make Member" : "👑 Make Admin"}
                  </button>

                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "8px 12px",
                      borderColor: isTargetActive ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)",
                      color: isTargetActive ? "#f87171" : "#4ade80",
                    }}
                    onClick={() => handleStatusToggle(user)}
                  >
                    {isTargetActive ? "⛔ Deactivate" : "✅ Activate"}
                  </button>

                  {/* Edit Full Profile */}
                  <button
                    type="button"
                    className="btn primary"
                    disabled={isProcessing}
                    style={{ fontSize: "12px", padding: "8px 12px" }}
                    onClick={() => setEditingUser(user)}
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete User */}
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={isProcessing}
                    style={{
                      fontSize: "12px",
                      padding: "8px 12px",
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "#f87171",
                      borderColor: "rgba(239, 68, 68, 0.3)",
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

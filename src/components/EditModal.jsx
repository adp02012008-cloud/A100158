import { useState, useEffect, useRef, useMemo } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatDateForInput } from "../utils/dateUtils";
import UnsavedChangesModal from "./UnsavedChangesModal";

export default function EditModal({ student, onClose, onSaved }) {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin" && auth.viewMode === "admin";

  const [personalForm, setPersonalForm] = useState({
    Name: student.Name || student.name || "",
    POSITION: student.POSITION || student.position || "",
    CLUSTER: student.CLUSTER || student.clusterName || "Core",
    JOINED: formatDateForInput(student.JOINED || student.joinedDate || ""),
  });

  const [form, setForm] = useState({
    LINKEDIN: student.LINKEDIN || student.linkedin || "",
    GITHUB: student.GITHUB || student.github || "",
    "ACTIVITY POINT": student.ACTIVITY ?? student["ACTIVITY POINT"] ?? student.activityPoints ?? "",
    "REWARD POINT": student.REWARD ?? student["REWARD POINT"] ?? student.rewardPoints ?? "",
  });

  const [adminForm, setAdminForm] = useState({
    ROLE: student.ROLE || student.role || "MEMBER",
    STATUS: student.STATUS || student.status || "ACTIVE",
  });

  const [clusterOptions, setClusterOptions] = useState(["Core", "Computer Cluster"]);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Snapshot for dirty-state comparison
  const initialSnapshotRef = useRef({
    personal: { ...personalForm },
    form: { ...form },
    admin: { ...adminForm },
  });

  const isDirty = useMemo(() => {
    const init = initialSnapshotRef.current;
    if (!init) return false;

    if (personalForm.Name !== init.personal.Name) return true;
    if (personalForm.POSITION !== init.personal.POSITION) return true;
    if (personalForm.CLUSTER !== init.personal.CLUSTER) return true;
    if (personalForm.JOINED !== init.personal.JOINED) return true;

    if (form.LINKEDIN !== init.form.LINKEDIN) return true;
    if (form.GITHUB !== init.form.GITHUB) return true;
    if (String(form["ACTIVITY POINT"]) !== String(init.form["ACTIVITY POINT"])) return true;
    if (String(form["REWARD POINT"]) !== String(init.form["REWARD POINT"])) return true;

    if (adminForm.ROLE !== init.admin.ROLE) return true;
    if (adminForm.STATUS !== init.admin.STATUS) return true;

    return false;
  }, [personalForm, form, adminForm]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };
  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      apiFetch("/clusters"),
      apiFetch("/users/dashboard"),
    ]).then(([clustersRes, dashRes]) => {
      if (!isMounted) return;
      const set = new Set(["Core", "Computer Cluster"]);

      if (clustersRes.status === "fulfilled" && Array.isArray(clustersRes.value?.clusters)) {
        clustersRes.value.clusters.forEach((c) => {
          if (c?.name) set.add(c.name.trim());
        });
      }

      if (dashRes.status === "fulfilled" && Array.isArray(dashRes.value?.users)) {
        dashRes.value.users.forEach((u) => {
          const cName = u.CLUSTER || u.clusterName;
          if (cName) set.add(cName.trim());
        });
      }

      if (student.CLUSTER || student.clusterName) {
        set.add((student.CLUSTER || student.clusterName).trim());
      }

      setClusterOptions(Array.from(set).filter(Boolean).sort());
    });

    return () => {
      isMounted = false;
    };
  }, [student]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setPersonal = (key, val) => setPersonalForm((p) => ({ ...p, [key]: val }));
  const setAdmin = (key, val) => setAdminForm((p) => ({ ...p, [key]: val }));

  const handleDeleteUser = async () => {
    const userName = personalForm.Name || student.Name || student.name || "this user";
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete ${userName} from MongoDB.\n\nThis action cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const targetId = student._id || student.userId;
      await apiFetch(`/users/${targetId}`, { method: "DELETE" });
      alert(`User '${userName}' deleted successfully.`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!personalForm.Name.trim()) {
      alert("Please enter a valid name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        "ENROLMENT NUMBER": student["ENROLMENT NUMBER"] || student.enrolmentNumber,
        Name: personalForm.Name.trim(),
        name: personalForm.Name.trim(),
        POSITION: personalForm.POSITION.trim(),
        position: personalForm.POSITION.trim(),
        CLUSTER: personalForm.CLUSTER.trim(),
        clusterName: personalForm.CLUSTER.trim(),
        JOINED: personalForm.JOINED,
        joinedDate: personalForm.JOINED,
        LINKEDIN: form.LINKEDIN.trim(),
        linkedin: form.LINKEDIN.trim(),
        GITHUB: form.GITHUB.trim(),
        github: form.GITHUB.trim(),
        "ACTIVITY POINT": form["ACTIVITY POINT"] === "" ? 0 : Number(form["ACTIVITY POINT"]),
        "REWARD POINT": form["REWARD POINT"] === "" ? 0 : Number(form["REWARD POINT"]),
        activityPoints: form["ACTIVITY POINT"] === "" ? 0 : Number(form["ACTIVITY POINT"]),
        rewardPoints: form["REWARD POINT"] === "" ? 0 : Number(form["REWARD POINT"]),
        ...(isAdmin ? {
          ROLE: adminForm.ROLE,
          role: adminForm.ROLE,
          STATUS: adminForm.STATUS,
          status: adminForm.STATUS,
        } : {}),
      };

      const targetId = student._id || student.userId || student.enrolmentNumber || student["ENROLMENT NUMBER"] || (isAdmin ? null : "me");
      try {
        await apiFetch(`/users/${targetId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } catch (putErr) {
        if (!isAdmin && (putErr.status === 403 || putErr.status === 404)) {
          await apiFetch("/users/me", {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          throw putErr;
        }
      }

      if (onSaved) onSaved({ ...student, ...payload });
      onClose();
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={handleRequestClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleRequestClose}>✕</button>

        <h3 className="edit-modal-title">
          {isAdmin ? `✏️ Edit — ${personalForm.Name || student.Name || student.name}` : "✏️ Update My Profile"}
        </h3>

        <div className="edit-section">
          <h4 className="edit-section-title">
            {isAdmin ? "Identity & Administrative Settings" : "Identity & Personal Information"}
          </h4>
          <div className="edit-grid">
            <EditField label="Name" value={personalForm.Name} onChange={(v) => setPersonal("Name", v)} />
            <EditField label="Position (e.g. Member 1, Team Lead, Admin)" value={personalForm.POSITION} onChange={(v) => setPersonal("POSITION", v)} />
            <div className="edit-field">
              <label className="edit-label">Cluster</label>
              <select
                className="edit-input"
                style={{ background: "#0f172a", color: "#f8fafc" }}
                value={personalForm.CLUSTER}
                onChange={(e) => setPersonal("CLUSTER", e.target.value)}
              >
                {clusterOptions.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
            <EditField label="Joined Date" type="date" value={personalForm.JOINED} onChange={(v) => setPersonal("JOINED", v)} />
            
            {isAdmin && (
              <>
                <div className="edit-field">
                  <label className="edit-label">Role (Permission)</label>
                  <select
                    className="edit-input"
                    style={{ background: "#0f172a", color: "#f8fafc" }}
                    value={adminForm.ROLE}
                    onChange={(e) => setAdmin("ROLE", e.target.value)}
                  >
                    <option value="MEMBER">🎓 MEMBER (Team Member)</option>
                    <option value="ADMIN">👑 ADMIN (System Administrator)</option>
                  </select>
                </div>

                <div className="edit-field">
                  <label className="edit-label">Account Status</label>
                  <select
                    className="edit-input"
                    style={{ background: "#0f172a", color: "#f8fafc" }}
                    value={adminForm.STATUS}
                    onChange={(e) => setAdmin("STATUS", e.target.value)}
                  >
                    <option value="ACTIVE">✅ ACTIVE</option>
                    <option value="INACTIVE">⛔ INACTIVE (Deactivated)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="edit-section">
          <h4 className="edit-section-title">Social Links</h4>
          <div className="edit-grid">
            <EditField label="LinkedIn URL" value={form.LINKEDIN} onChange={(v) => set("LINKEDIN", v)} />
            <EditField label="GitHub URL" value={form.GITHUB} onChange={(v) => set("GITHUB", v)} />
          </div>
        </div>

        <div className="edit-section">
          <h4 className="edit-section-title">Points</h4>
          <div className="edit-grid">
            <EditField
              label="Activity Points"
              type="number"
              value={form["ACTIVITY POINT"]}
              onChange={(v) => set("ACTIVITY POINT", v)}
            />
            <EditField
              label="Reward Points"
              type="number"
              value={form["REWARD POINT"]}
              onChange={(v) => set("REWARD POINT", v)}
            />
          </div>
        </div>


        <div className="edit-actions">
          {isAdmin && (
            <button
              type="button"
              className="delete-user-btn"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                marginRight: "auto",
              }}
              onClick={handleDeleteUser}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "🗑️ Delete User"}
            </button>
          )}

          <button className="edit-cancel-btn" onClick={handleRequestClose} disabled={saving || deleting}>
            Cancel
          </button>
          <button className="edit-save-btn" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onKeepEditing={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          onClose();
        }}
        onSave={async () => {
          setShowUnsavedModal(false);
          await handleSave();
        }}
        saving={saving}
      />
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }) {
  const inputValue = type === "date" ? formatDateForInput(value) : (value ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label className="edit-label" style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>{label}</label>
      <input
        className="edit-input"
        type={type}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          color: "#f8fafc",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
          colorScheme: type === "date" ? "dark" : undefined,
        }}
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
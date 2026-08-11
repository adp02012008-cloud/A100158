// src/components/TeamCollectionPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addTeamRecord,
  deleteTeamRecord,
  listTeamRecords,
  updateTeamRecord,
  apiFetch,
} from "../utils/api";
import { useAuth } from "../context/AuthContext";

function getRecordValue(record, key) {
  if (!record || !key) return "";
  
  if (record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];

  const upper = key.toUpperCase();
  if (record[upper] !== undefined && record[upper] !== null && record[upper] !== "") return record[upper];

  const lower = key.toLowerCase();
  if (record[lower] !== undefined && record[lower] !== null && record[lower] !== "") return record[lower];

  const ALIASES = {
    TITLE: ["title", "name", "caption"],
    ORGANIZER: ["organizer", "issuer", "company"],
    DATE: ["date", "eventDate"],
    LOCATION: ["location", "venue"],
    PROJECT: ["projectTitle", "project", "title"],
    THEME: ["theme", "track"],
    MEMBERS: ["memberNames", "members", "teamMembers", "students"],
    TECH_STACK: ["techStack", "technologyStack", "skills"],
    STATUS: ["status", "state"],
    POSITION: ["position", "result", "rank"],
    DESCRIPTION: ["description", "desc", "details", "notes"],
    GITHUB: ["github", "githubUrl", "codeUrl"],
    DEMO: ["demo", "demoUrl", "liveUrl"],
    PPT: ["ppt", "pptUrl", "presentationUrl"],
    DRIVE_FOLDER: ["driveFolder", "driveUrl", "folderUrl"],
    COVER_IMAGE: ["coverImage", "imageUrl", "image", "fileUrl"],
    EVENT_ID: ["eventId", "_id", "id"],
    PROJECT_ID: ["projectId", "_id", "id"],
    CERTIFICATE_ID: ["certificateId", "_id", "id"],
    PHOTO_ID: ["photoId", "_id", "id"],
    OPPORTUNITY_ID: ["opportunityId", "_id", "id"],
    CREATED_BY: ["createdBy", "email", "uploadedBy", "user"],
  };

  const aliases = ALIASES[upper] || [];
  for (const alias of aliases) {
    if (record[alias] !== undefined && record[alias] !== null && record[alias] !== "") {
      if (typeof record[alias] === "object" && record[alias]?.email) {
        return record[alias].email;
      }
      return record[alias];
    }
  }

  return "";
}

function MemberSelectionSelector({ value = "", onChange, readOnly }) {
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    let isMounted = true;
    apiFetch("/users/assignable")
      .then((res) => {
        if (!isMounted) return;
        const users = (res.users || []).map((u) => u.name || u.NAME).filter(Boolean);
        setGroupMembers(users.length > 0 ? users : [
          "DHASHAPRAKASH A",
          "HARISH KARTHIK K B S",
          "MITHUN N B",
          "SWETHA K",
          "NITHISH KUMAR S",
          "SUDARSAN K",
          "SRINATH T S",
          "SRIVARSHINI R",
          "DEEPIKA K",
          "DHANUSSH R S",
        ]);
      })
      .catch(() => {
        if (!isMounted) return;
        setGroupMembers([
          "DHASHAPRAKASH A",
          "HARISH KARTHIK K B S",
          "MITHUN N B",
          "SWETHA K",
          "NITHISH KUMAR S",
          "SUDARSAN K",
          "SRINATH T S",
          "SRIVARSHINI R",
          "DEEPIKA K",
          "DHANUSSH R S",
        ]);
      })
      .finally(() => {
        if (isMounted) setLoadingMembers(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Parse current tokens from parent prop `value` directly
  const currentTokens = useMemo(() => {
    return String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  // Determine selected group members derived from `currentTokens`
  const selectedGroupMembers = useMemo(() => {
    return groupMembers.filter((g) =>
      currentTokens.some((t) => t.toLowerCase() === g.toLowerCase())
    );
  }, [groupMembers, currentTokens]);

  // Determine external member tokens
  const externalTokens = useMemo(() => {
    return currentTokens.filter((t) =>
      !groupMembers.some((g) => g.toLowerCase() === t.toLowerCase())
    );
  }, [groupMembers, currentTokens]);

  const toggleMember = (memberName) => {
    if (readOnly) return;
    const isCurrentlySelected = selectedGroupMembers.some(
      (m) => m.toLowerCase() === memberName.toLowerCase()
    );

    let nextGroup;
    if (isCurrentlySelected) {
      nextGroup = selectedGroupMembers.filter(
        (m) => m.toLowerCase() !== memberName.toLowerCase()
      );
    } else {
      nextGroup = [...selectedGroupMembers, memberName];
    }

    const extTextToUse = showOther ? otherText : externalTokens.join(", ");
    const extTokens = extTextToUse.split(",").map((s) => s.trim()).filter(Boolean);
    const combined = Array.from(new Set([...nextGroup, ...extTokens])).join(", ");
    onChange(combined);
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    const extTextToUse = showOther ? otherText : externalTokens.join(", ");
    const extTokens = extTextToUse.split(",").map((s) => s.trim()).filter(Boolean);
    const combined = Array.from(new Set([...groupMembers, ...extTokens])).join(", ");
    onChange(combined);
  };

  const handleClearAll = () => {
    if (readOnly) return;
    const extTextToUse = showOther ? otherText : externalTokens.join(", ");
    const extTokens = extTextToUse.split(",").map((s) => s.trim()).filter(Boolean);
    onChange(extTokens.join(", "));
  };

  const toggleOther = () => {
    if (readOnly) return;
    const nextShowOther = !showOther;
    setShowOther(nextShowOther);
    if (!nextShowOther) {
      setOtherText("");
      onChange(selectedGroupMembers.join(", "));
    }
  };

  const handleOtherTextChange = (e) => {
    const val = e.target.value;
    setOtherText(val);
    const extTokens = val.split(",").map((s) => s.trim()).filter(Boolean);
    const combined = Array.from(new Set([...selectedGroupMembers, ...extTokens])).join(", ");
    onChange(combined);
  };

  return (
    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(167, 139, 250, 0.25)", borderRadius: "16px", padding: "18px", marginTop: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#a78bfa" }}>
          Group Members Selection ({selectedGroupMembers.length} selected)
        </span>
        {!readOnly && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{ fontSize: "11px", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#818cf8", padding: "4px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: "700" }}
            >
              ✓ Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{ fontSize: "11px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "4px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: "700" }}
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {loadingMembers ? (
        <div style={{ fontSize: "13px", color: "#94a3b8", padding: "8px 0" }}>Loading group members…</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
          {groupMembers.map((mName) => {
            const isChecked = selectedGroupMembers.some(
              (m) => m.toLowerCase() === mName.toLowerCase()
            );
            return (
              <div
                key={mName}
                onClick={() => toggleMember(mName)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: readOnly ? "default" : "pointer",
                  userSelect: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: isChecked ? "rgba(16, 185, 129, 0.25)" : "rgba(30, 41, 59, 0.8)",
                  border: isChecked ? "1.5px solid rgba(52, 211, 153, 0.8)" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: isChecked ? "#34d399" : "#e2e8f0",
                  boxShadow: isChecked ? "0 0 14px rgba(52, 211, 153, 0.25)" : "none",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "800", color: isChecked ? "#34d399" : "#94a3b8" }}>
                  {isChecked ? "☑" : "☐"}
                </span>
                <span>{mName}</span>
              </div>
            );
          })}

          {/* OTHER OPTION TOGGLE */}
          <div
            onClick={toggleOther}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: readOnly ? "default" : "pointer",
              userSelect: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              background: showOther || externalTokens.length > 0 ? "rgba(168, 85, 247, 0.3)" : "rgba(30, 41, 59, 0.8)",
              border: showOther || externalTokens.length > 0 ? "1.5px solid rgba(192, 132, 252, 0.8)" : "1px solid rgba(168, 85, 247, 0.4)",
              color: showOther || externalTokens.length > 0 ? "#c084fc" : "#a78bfa",
              boxShadow: showOther || externalTokens.length > 0 ? "0 0 14px rgba(168, 85, 247, 0.25)" : "none",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "800" }}>
              {showOther || externalTokens.length > 0 ? "☑" : "☐"}
            </span>
            <span>+ Others (Non-Group Member)</span>
          </div>
        </div>
      )}

      {/* EXTERNAL MEMBER TEXTINPUT IF OTHER IS CHECKED */}
      {(showOther || externalTokens.length > 0) && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed rgba(168, 85, 247, 0.35)" }}>
          <label style={{ fontSize: "12px", color: "#c084fc", fontWeight: "700", display: "block", marginBottom: "6px" }}>
            Type External / Non-Group Member Names (separated by commas)
          </label>
          <input
            type="text"
            value={otherText || externalTokens.join(", ")}
            placeholder="e.g. John Doe, Sarah Connor..."
            readOnly={readOnly}
            onChange={handleOtherTextChange}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              borderRadius: "10px",
              color: "#f8fafc",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

function createRecordId(prefix) {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

function buildInitialForm(config, auth) {
  return config.fields.reduce((result, field) => {
    if (field.prefill === "ownedEnrolment") {
      result[field.name] = auth.ownedEnrolment || "";
    } else {
      result[field.name] = field.defaultValue || "";
    }
    return result;
  }, {});
}

function buildEditForm(config, record) {
  return config.fields.reduce((result, field) => {
    result[field.name] = getRecordValue(record, field.name);
    return result;
  }, {});
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function fixDriveImageUrl(url = "") {
  const value = String(url).trim();
  if (!value) return "";

  const fileMatch = value.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }

  const idMatch = value.match(/[?&]id=([^&]+)/);
  if (value.includes("drive.google.com") && idMatch) {
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }

  return value;
}

function isUrlField(fieldName) {
  return [
    "GITHUB",
    "DEMO",
    "PPT",
    "DRIVE_FOLDER",
    "COVER_IMAGE",
    "IMAGE_URL",
    "IMAGE",
    "FILE_URL",
    "LINK",
  ].includes(fieldName);
}

function labelFromName(name) {
  return String(name || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function TeamCollectionPage({ config, search = "" }) {
  const { auth, isTeamMember, isAdmin } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null); // "add" | "edit" | null
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [form, setForm] = useState(() => buildInitialForm(config, auth));

  const loadRecords = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");

      try {
        const data = await listTeamRecords(config.sheetName);
        setRecords(data);

        setSelected((current) => {
          if (!current) return null;
          return (
            data.find(
              (item) => item[config.idField] === current[config.idField]
            ) || null
          );
        });
      } catch (requestError) {
        setError(requestError.message || "Unable to load data.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [config.sheetName, config.idField]
  );

  useEffect(() => {
    if (isTeamMember) loadRecords();
  }, [isTeamMember, loadRecords]);

  useEffect(() => {
    if (!formMode) {
      setForm(buildInitialForm(config, auth));
      setEditingRecord(null);
    }
  }, [formMode, config, auth]);

  const filteredRecords = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((record) =>
      config.searchFields.some((field) =>
        String(record[field] || "").toLowerCase().includes(query)
      )
    );
  }, [records, search, config.searchFields]);

  const canManageRecord = useCallback(
    (record) => {
      if (isAdmin) return true;
      if (!record || !auth) return false;

      const userEmail = normalizeEmail(auth.email || auth.user?.email || "");
      const userName = (auth.name || auth.user?.name || "").toLowerCase().trim();
      const createdByEmail = normalizeEmail(getRecordValue(record, "CREATED_BY"));

      // 1. Check if user is creator
      if (createdByEmail && createdByEmail === userEmail) return true;

      // 2. Check if user is in MEMBERS list (by name or email)
      const membersStr = String(getRecordValue(record, "MEMBERS") || "").toLowerCase();
      if (membersStr) {
        if (userName && membersStr.includes(userName)) return true;
        if (userEmail && membersStr.includes(userEmail)) return true;
      }

      return false;
    },
    [auth, isAdmin]
  );

  const setField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validateForm = () => {
    for (const field of config.fields) {
      if (field.required && !String(form[field.name] || "").trim()) {
        return `${field.label} is required.`;
      }
    }
    return "";
  };

  const openAddForm = () => {
    setError("");
    setNotice("");
    setEditingRecord(null);
    setForm(buildInitialForm(config, auth));
    setFormMode("add");
  };

  const openEditForm = (record) => {
    if (!canManageRecord(record)) return;
    setError("");
    setNotice("");
    setEditingRecord(record);
    setForm(buildEditForm(config, record));
    setFormMode("edit");
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setEditingRecord(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const submittedFields = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        String(value || "").trim(),
      ])
    );

    if (config.sheetName === "Hackathons") {
      if (!submittedFields.DESCRIPTION) {
        submittedFields.DESCRIPTION = submittedFields.TITLE || "Hackathon Event Record";
      }
    }

    try {
      setSaving(true);

      if (formMode === "edit" && editingRecord) {
        const idValue =
          getRecordValue(editingRecord, config.idField) ||
          getRecordValue(editingRecord, "_id") ||
          editingRecord._id ||
          editingRecord[config.idField];

        await updateTeamRecord(
          config.sheetName,
          config.idField,
          idValue,
          submittedFields
        );

        const updatedLocalRecord = {
          ...editingRecord,
          ...submittedFields,
        };

        setRecords((previous) =>
          previous.map((record) => {
            const rId =
              getRecordValue(record, config.idField) ||
              getRecordValue(record, "_id") ||
              record._id;
            return rId === idValue ? updatedLocalRecord : record;
          })
        );

        if (selected) {
          const selId =
            getRecordValue(selected, config.idField) ||
            getRecordValue(selected, "_id") ||
            selected._id;
          if (selId === idValue) setSelected(updatedLocalRecord);
        }

        setNotice("Record updated successfully.");
      } else {
        const newRecord = {
          [config.idField]: createRecordId(config.idPrefix),
          ...submittedFields,
          CREATED_BY: auth.email,
          CREATED_AT: new Date().toLocaleString(),
        };

        if (config.sheetName === "Gallery") {
          newRecord.UPLOADED_BY = auth.email;
        }

        await addTeamRecord(config.sheetName, newRecord);
        setRecords((previous) => [newRecord, ...previous]);
        setNotice(`${config.pageTitle} record added directly.`);
      }

      setFormMode(null);
      setEditingRecord(null);

      await sleep(900);
      await loadRecords({ silent: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to save the record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!canManageRecord(record)) return;

    const idValue =
      getRecordValue(record, config.idField) ||
      getRecordValue(record, "_id") ||
      record._id ||
      record[config.idField];

    const title = getRecordValue(record, config.titleField) || getRecordValue(record, "TITLE") || "Record";
    const confirmed = window.confirm(
      `Delete “${title}” permanently?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(idValue);
      setError("");
      setNotice("");

      await deleteTeamRecord(config.sheetName, config.idField, idValue);

      setRecords((previous) =>
        previous.filter((item) => {
          const rId =
            getRecordValue(item, config.idField) ||
            getRecordValue(item, "_id") ||
            item._id;
          return rId !== idValue;
        })
      );

      if (selected) {
        const selId =
          getRecordValue(selected, config.idField) ||
          getRecordValue(selected, "_id") ||
          selected._id;
        if (selId === idValue) setSelected(null);
      }
      setNotice("Record deleted successfully.");

      await sleep(800);
      await loadRecords({ silent: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the record.");
    } finally {
      setDeletingId("");
    }
  };

  if (!isTeamMember) {
    return (
      <section className="team-access-denied">
        <div className="team-access-icon">🔒</div>
        <h2>Private Team Section</h2>
        <p>This page is available only to registered Bug Slayers group members.</p>
      </section>
    );
  }

  return (
    <section className="team-page">
      <div className="team-page-header">
        <div>
          <div className="team-page-kicker">BUG SLAYERS TEAM HUB</div>
          <h1>
            {config.icon} {config.pageTitle}
          </h1>
          <p>{config.pageSubtitle}</p>
        </div>

        <button className="team-primary-btn" type="button" onClick={openAddForm}>
          ＋ Add {config.pageTitle.replace(/s$/, "")}
        </button>
      </div>

      <div className="team-summary-row">
        <div className="team-summary-card">
          <span>Total records</span>
          <strong>{records.length}</strong>
        </div>
        <div className="team-summary-card">
          <span>Signed in as</span>
          <strong className="team-summary-email">{auth.email}</strong>
        </div>
        <div className="team-summary-card">
          <span>Your permission</span>
          <strong>
            {isAdmin
              ? "Add, edit & delete all"
              : "Add, edit & delete your own"}
          </strong>
        </div>
      </div>

      {notice && <div className="team-notice success">{notice}</div>}
      {error && <div className="team-notice error">{error}</div>}

      {loading ? (
        <div className="team-empty-state">
          Loading {config.pageTitle.toLowerCase()}…
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="team-empty-state">
          <div className="team-empty-icon">{config.icon}</div>
          <h3>
            {records.length === 0
              ? `No ${config.pageTitle.toLowerCase()} added yet`
              : "No matching records"}
          </h3>
          <p>
            {records.length === 0
              ? "Use the Add button to create the first record."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div
          className={`team-record-grid ${
            config.sheetName === "Gallery" ? "gallery-record-grid" : ""
          }`}
        >
          {filteredRecords.map((record) => {
            const recordId =
              getRecordValue(record, config.idField) ||
              getRecordValue(record, "_id") ||
              record._id;
            const imageUrl = fixDriveImageUrl(getRecordValue(record, config.imageField));
            const canManage = canManageRecord(record);
            const title = getRecordValue(record, config.titleField) || getRecordValue(record, "TITLE") || "Untitled record";
            const subtitle = getRecordValue(record, config.subtitleField) || getRecordValue(record, "ORGANIZER") || getRecordValue(record, "PROJECT");
            const badge = getRecordValue(record, config.badgeField) || getRecordValue(record, "STATUS");
            const date = getRecordValue(record, "DATE");
            const location = getRecordValue(record, "LOCATION");
            const techStack = getRecordValue(record, "TECH_STACK");
            const issuer = getRecordValue(record, "ISSUER");
            const description = getRecordValue(record, "DESCRIPTION");

            return (
              <article className="team-record-card" key={recordId}>
                {config.imageField && (
                  <button
                    className="team-card-image-wrap"
                    type="button"
                    onClick={() => setSelected(record)}
                    aria-label={`Open ${title}`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={title}
                        className="team-card-image"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          if (event.currentTarget.nextElementSibling) {
                            event.currentTarget.nextElementSibling.style.display =
                              "flex";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="team-card-image-fallback"
                      style={{ display: imageUrl ? "none" : "flex" }}
                    >
                      {config.icon}
                    </div>
                  </button>
                )}

                <div className="team-record-content">
                  <div className="team-record-heading">
                    <div>
                      <h3>{title}</h3>
                      {subtitle && <p>{subtitle}</p>}
                    </div>
                    {badge && (
                      <span className="team-record-badge">
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="team-record-meta">
                    {date && <span>📅 {date}</span>}
                    {location && <span>📍 {location}</span>}
                    {techStack && <span>🧩 {techStack}</span>}
                    {issuer && <span>🏢 {issuer}</span>}
                  </div>

                  {description && (
                    <p className="team-record-description">
                      {description.length > 120 ? description.substring(0, 120) + "…" : description}
                    </p>
                  )}

                  <div className="team-record-actions">
                    <button
                      className="team-secondary-btn"
                      type="button"
                      onClick={() => setSelected(record)}
                    >
                      View details
                    </button>

                    {canManage && (
                      <button
                        className="team-secondary-btn"
                        type="button"
                        onClick={() => openEditForm(record)}
                      >
                        Edit
                      </button>
                    )}

                    {canManage && (
                      <button
                        className="team-danger-btn"
                        type="button"
                        disabled={deletingId === recordId}
                        onClick={() => handleDelete(record)}
                      >
                        {deletingId === recordId ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formMode && (
        <div className="team-modal-overlay" onMouseDown={closeForm}>
          <div
            className="team-modal-box team-form-modal"
            style={{
              position: "relative",
              background: "#0f172a",
              border: "1px solid rgba(167, 139, 250, 0.35)",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "800px",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="team-modal-close"
              type="button"
              onClick={closeForm}
              disabled={saving}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                fontSize: "16px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", paddingRight: "44px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(167, 139, 250, 0.18)", border: "1px solid rgba(167, 139, 250, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
                {config.icon}
              </div>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "800", color: "#f8fafc" }}>
                  {formMode === "edit" ? "Edit" : "Add"} {config.pageTitle.replace(/s$/, "")}
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                  {formMode === "edit"
                    ? "Changes are saved directly to database."
                    : "The record is added directly. There is no approval step."}
                </p>
              </div>
            </div>

            <form className="team-form-grid" onSubmit={handleSubmit}>
              {config.fields.map((field) => {
                const memberReadOnly =
                  field.studentReadOnly && auth.role === "student";

                return (
                  <label
                    className={
                      field.type === "textarea"
                        ? "team-form-field full"
                        : "team-form-field"
                    }
                    key={field.name}
                  >
                    <span>
                      {field.label} {field.required && <b>*</b>}
                    </span>

                    {field.name === "MEMBERS" ? (
                      <MemberSelectionSelector
                        value={form[field.name] || ""}
                        onChange={(newVal) => setField(field.name, newVal)}
                        readOnly={memberReadOnly}
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                        rows="4"
                        value={form[field.name] || ""}
                        placeholder={field.placeholder || ""}
                        required={field.required}
                        readOnly={memberReadOnly}
                        onChange={(event) =>
                          setField(field.name, event.target.value)
                        }
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={form[field.name] || ""}
                        required={field.required}
                        disabled={memberReadOnly}
                        onChange={(event) =>
                          setField(field.name, event.target.value)
                        }
                      >
                        <option value="">
                          Select {field.label.toLowerCase()}
                        </option>
                        {field.options.map((option) => (
                          <option value={option} key={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={form[field.name] || ""}
                        placeholder={field.placeholder || ""}
                        required={field.required}
                        readOnly={memberReadOnly}
                        onChange={(event) =>
                          setField(field.name, event.target.value)
                        }
                      />
                    )}

                    {field.help && <small>{field.help}</small>}
                  </label>
                );
              })}

              <div
                className="team-form-actions full"
                style={{
                  display: "flex",
                  justify: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <button
                  className="team-secondary-btn"
                  type="button"
                  style={{
                    padding: "10px 22px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "700",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#cbd5e1",
                    cursor: "pointer",
                  }}
                  disabled={saving}
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  className="team-primary-btn"
                  type="submit"
                  style={{
                    padding: "10px 24px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    border: "none",
                    color: "#ffffff",
                    boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
                    cursor: "pointer",
                  }}
                  disabled={saving}
                >
                  {saving
                    ? formMode === "edit"
                      ? "Saving…"
                      : "Adding…"
                    : formMode === "edit"
                      ? "Save changes"
                      : "Add directly"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="team-modal-overlay"
          onMouseDown={() => setSelected(null)}
        >
          <div
            className="team-modal-box team-detail-modal"
            style={{
              position: "relative",
              maxWidth: "680px",
              borderRadius: "24px",
              border: "1px solid rgba(167, 139, 250, 0.35)",
              padding: "32px",
              background: "#0f172a",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="team-modal-close"
              type="button"
              onClick={() => setSelected(null)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                fontSize: "16px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              ✕
            </button>

            {config.imageField &&
              getRecordValue(selected, config.imageField) &&
              String(getRecordValue(selected, config.imageField)).match(/\.(png|jpg|jpeg|gif|webp)|uc\?export=view/i) && (
                <img
                  className="team-detail-image"
                  src={fixDriveImageUrl(getRecordValue(selected, config.imageField))}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  style={{
                    borderRadius: "16px",
                    marginBottom: "20px",
                    maxHeight: "260px",
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
              )}

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", paddingRight: "44px" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "16px", background: "rgba(167, 139, 250, 0.18)", border: "1px solid rgba(167, 139, 250, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>
                {config.icon}
              </div>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", margin: "0 0 4px 0" }}>
                  {getRecordValue(selected, config.titleField) || getRecordValue(selected, "TITLE") || "Record Details"}
                </h2>
                {(getRecordValue(selected, config.subtitleField) || getRecordValue(selected, "ORGANIZER")) && (
                  <p style={{ color: "#a78bfa", fontSize: "14px", fontWeight: "600", margin: 0 }}>
                    {getRecordValue(selected, config.subtitleField) || getRecordValue(selected, "ORGANIZER")}
                  </p>
                )}
              </div>
            </div>

            <div className="team-detail-list" style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {config.detailOrder.map((fieldName) => {
                const value = getRecordValue(selected, fieldName);
                if (!value) return null;

                const isUrl = isUrlField(fieldName) || String(value).startsWith("http");

                return (
                  <div
                    className="team-detail-row"
                    key={fieldName}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600", minWidth: "120px" }}>
                      {labelFromName(fieldName)}
                    </span>
                    {isUrl ? (
                      <a
                        href={value.startsWith("http") ? value : `https://${value}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#38bdf8", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}
                      >
                        Open Link ↗
                      </a>
                    ) : fieldName === "MEMBERS" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "flex-end" }}>
                        {String(value).split(",").map((m, i) => (
                          <span key={i} style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(52, 211, 153, 0.4)", color: "#34d399", fontSize: "12px", fontWeight: "700", padding: "3px 10px", borderRadius: "14px" }}>
                            👤 {m.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <strong style={{ color: "#f8fafc", fontSize: "13.5px", fontWeight: "700", textAlign: "right" }}>
                        {value}
                      </strong>
                    )}
                  </div>
                );
              })}

              {getRecordValue(selected, "CREATED_BY") && (
                <div
                  className="team-detail-row"
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    justify: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>Added By</span>
                  <strong style={{ color: "#cbd5e1", fontSize: "13px" }}>{getRecordValue(selected, "CREATED_BY")}</strong>
                </div>
              )}
            </div>

            {canManageRecord(selected) && (
              <div className="team-detail-footer" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <button
                  className="team-secondary-btn"
                  type="button"
                  style={{ padding: "10px 20px", fontSize: "13.5px", fontWeight: "700" }}
                  onClick={() => {
                    const record = selected;
                    setSelected(null);
                    openEditForm(record);
                  }}
                >
                  ✏️ Edit record
                </button>
                <button
                  className="team-danger-btn"
                  type="button"
                  style={{ padding: "10px 20px", fontSize: "13.5px", fontWeight: "700" }}
                  disabled={deletingId === (getRecordValue(selected, config.idField) || getRecordValue(selected, "_id") || selected._id)}
                  onClick={() => handleDelete(selected)}
                >
                  {deletingId === (getRecordValue(selected, config.idField) || getRecordValue(selected, "_id") || selected._id)
                    ? "Deleting…"
                    : "🗑️ Delete record"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

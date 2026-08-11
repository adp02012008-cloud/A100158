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

function MemberSelectionSelector({ value = "", onChange, readOnly }) {
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedNames, setSelectedNames] = useState([]);
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

  useEffect(() => {
    if (!value) {
      setSelectedNames([]);
      setOtherText("");
      setShowOther(false);
      return;
    }

    const tokens = String(value).split(",").map((s) => s.trim()).filter(Boolean);
    const inGroup = [];
    const external = [];

    tokens.forEach((token) => {
      const match = groupMembers.find((g) => g.toLowerCase() === token.toLowerCase());
      if (match) {
        if (!inGroup.includes(match)) inGroup.push(match);
      } else {
        external.push(token);
      }
    });

    setSelectedNames(inGroup);
    if (external.length > 0) {
      setShowOther(true);
      setOtherText(external.join(", "));
    }
  }, [value, groupMembers]);

  const updateParent = (nextSelected, isOtherActive, nextOtherText) => {
    const extTokens = isOtherActive
      ? nextOtherText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const combined = Array.from(new Set([...nextSelected, ...extTokens])).join(", ");
    onChange(combined);
  };

  const toggleMember = (memberName) => {
    if (readOnly) return;
    const next = selectedNames.includes(memberName)
      ? selectedNames.filter((n) => n !== memberName)
      : [...selectedNames, memberName];
    setSelectedNames(next);
    updateParent(next, showOther, otherText);
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    setSelectedNames([...groupMembers]);
    updateParent(groupMembers, showOther, otherText);
  };

  const handleClearAll = () => {
    if (readOnly) return;
    setSelectedNames([]);
    updateParent([], showOther, otherText);
  };

  const toggleOther = () => {
    if (readOnly) return;
    const nextOther = !showOther;
    setShowOther(nextOther);
    updateParent(selectedNames, nextOther, otherText);
  };

  const handleOtherTextChange = (e) => {
    const val = e.target.value;
    setOtherText(val);
    updateParent(selectedNames, showOther, val);
  };

  return (
    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(167, 139, 250, 0.25)", borderRadius: "14px", padding: "16px", marginTop: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#a78bfa" }}>
          Group Members Selection ({selectedNames.length} selected)
        </span>
        {!readOnly && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{ fontSize: "11px", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#818cf8", padding: "3px 10px", borderRadius: "12px", cursor: "pointer", fontWeight: "700" }}
            >
              ✓ Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{ fontSize: "11px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "3px 10px", borderRadius: "12px", cursor: "pointer", fontWeight: "700" }}
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {loadingMembers ? (
        <div style={{ fontSize: "13px", color: "#94a3b8", padding: "8px 0" }}>Loading group members…</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          {groupMembers.map((mName) => {
            const isChecked = selectedNames.includes(mName);
            return (
              <div
                key={mName}
                onClick={() => toggleMember(mName)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: readOnly ? "default" : "pointer",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                  background: isChecked ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.8)",
                  border: isChecked ? "1px solid rgba(52, 211, 153, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
                  color: isChecked ? "#34d399" : "#cbd5e1",
                  boxShadow: isChecked ? "0 0 10px rgba(52, 211, 153, 0.2)" : "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  readOnly
                  style={{ accentColor: "#10b981", cursor: "pointer" }}
                />
                <span>{mName}</span>
              </div>
            );
          })}

          {/* OTHER OPTION TOGGLE */}
          <div
            onClick={toggleOther}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: "700",
              cursor: readOnly ? "default" : "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              background: showOther ? "rgba(168, 85, 247, 0.25)" : "rgba(30, 41, 59, 0.8)",
              border: showOther ? "1px solid rgba(192, 132, 252, 0.6)" : "1px solid rgba(168, 85, 247, 0.3)",
              color: showOther ? "#c084fc" : "#a78bfa",
            }}
          >
            <input
              type="checkbox"
              checked={showOther}
              onChange={() => {}}
              readOnly
              style={{ accentColor: "#a855f7", cursor: "pointer" }}
            />
            <span>+ Others (Non-Group Member)</span>
          </div>
        </div>
      )}

      {/* EXTERNAL MEMBER TEXTINPUT IF OTHER IS CHECKED */}
      {showOther && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed rgba(168, 85, 247, 0.3)" }}>
          <label style={{ fontSize: "12px", color: "#c084fc", fontWeight: "700", display: "block", marginBottom: "6px" }}>
            Type External / Non-Group Member Names (separated by commas)
          </label>
          <input
            type="text"
            value={otherText}
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
    result[field.name] = record[field.name] || "";
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
      return (
        normalizeEmail(record?.CREATED_BY) !== "" &&
        normalizeEmail(record?.CREATED_BY) === normalizeEmail(auth.email)
      );
    },
    [auth.email, isAdmin]
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
        const idValue = editingRecord[config.idField];

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
          previous.map((record) =>
            record[config.idField] === idValue ? updatedLocalRecord : record
          )
        );

        if (selected?.[config.idField] === idValue) {
          setSelected(updatedLocalRecord);
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

      // POST responses are opaque, so reload from the authenticated GET API.
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

    const idValue = record[config.idField];
    const title = record[config.titleField] || idValue;
    const confirmed = window.confirm(
      `Delete “${title}” permanently from Google Sheets?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(idValue);
      setError("");
      setNotice("");

      await deleteTeamRecord(config.sheetName, config.idField, idValue);

      setRecords((previous) =>
        previous.filter((item) => item[config.idField] !== idValue)
      );

      if (selected?.[config.idField] === idValue) setSelected(null);
      setNotice(isAdmin ? "Record deleted by admin." : "Your record was deleted.");

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
            const recordId = record[config.idField];
            const imageUrl = fixDriveImageUrl(record[config.imageField]);
            const canManage = canManageRecord(record);

            return (
              <article className="team-record-card" key={recordId}>
                {config.imageField && (
                  <button
                    className="team-card-image-wrap"
                    type="button"
                    onClick={() => setSelected(record)}
                    aria-label={`Open ${
                      record[config.titleField] || config.pageTitle
                    }`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={record[config.titleField] || config.pageTitle}
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
                      <h3>{record[config.titleField] || "Untitled record"}</h3>
                      {config.subtitleField && record[config.subtitleField] && (
                        <p>{record[config.subtitleField]}</p>
                      )}
                    </div>
                    {config.badgeField && record[config.badgeField] && (
                      <span className="team-record-badge">
                        {record[config.badgeField]}
                      </span>
                    )}
                  </div>

                  <div className="team-record-meta">
                    {record.DATE && <span>📅 {record.DATE}</span>}
                    {record.DEADLINE && <span>⏳ {record.DEADLINE}</span>}
                    {record.LOCATION && <span>📍 {record.LOCATION}</span>}
                    {record.TECH_STACK && <span>🧩 {record.TECH_STACK}</span>}
                    {record.ISSUER && <span>🏢 {record.ISSUER}</span>}
                  </div>

                  {record.DESCRIPTION && (
                    <p className="team-record-description">
                      {record.DESCRIPTION}
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
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="team-modal-close"
              type="button"
              onClick={closeForm}
              disabled={saving}
            >
              ✕
            </button>

            <div className="team-modal-title-row">
              <span>{config.icon}</span>
              <div>
                <h2>
                  {formMode === "edit" ? "Edit" : "Add"}{" "}
                  {config.pageTitle.replace(/s$/, "")}
                </h2>
                <p>
                  {formMode === "edit"
                    ? "Changes are saved directly to Google Sheets."
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

              <div className="team-form-actions full">
                <button
                  className="team-secondary-btn"
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  className="team-primary-btn"
                  type="submit"
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
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="team-modal-close"
              type="button"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>

            {config.imageField && selected[config.imageField] && (
              <img
                className="team-detail-image"
                src={fixDriveImageUrl(selected[config.imageField])}
                alt={selected[config.titleField] || config.pageTitle}
              />
            )}

            <div className="team-modal-title-row">
              <span>{config.icon}</span>
              <div>
                <h2>{selected[config.titleField] || "Record details"}</h2>
                {config.subtitleField && (
                  <p>{selected[config.subtitleField]}</p>
                )}
              </div>
            </div>

            <div className="team-detail-list">
              {config.detailOrder.map((fieldName) => {
                const value = selected[fieldName];
                if (!value) return null;

                return (
                  <div className="team-detail-row" key={fieldName}>
                    <span>{labelFromName(fieldName)}</span>
                    {isUrlField(fieldName) ? (
                      <a href={value} target="_blank" rel="noreferrer">
                        Open link ↗
                      </a>
                    ) : (
                      <strong>{value}</strong>
                    )}
                  </div>
                );
              })}

              {selected.CREATED_BY && (
                <div className="team-detail-row">
                  <span>Added By</span>
                  <strong>{selected.CREATED_BY}</strong>
                </div>
              )}
              {selected.CREATED_AT && (
                <div className="team-detail-row">
                  <span>Added At</span>
                  <strong>{selected.CREATED_AT}</strong>
                </div>
              )}
            </div>

            {canManageRecord(selected) && (
              <div className="team-detail-footer">
                <button
                  className="team-secondary-btn"
                  type="button"
                  onClick={() => {
                    const record = selected;
                    setSelected(null);
                    openEditForm(record);
                  }}
                >
                  Edit record
                </button>
                <button
                  className="team-danger-btn"
                  type="button"
                  disabled={deletingId === selected[config.idField]}
                  onClick={() => handleDelete(selected)}
                >
                  {deletingId === selected[config.idField]
                    ? "Deleting…"
                    : "Delete record"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// src/components/TeamCollectionPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const camel = key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  if (record[camel] !== undefined && record[camel] !== null && record[camel] !== "") return record[camel];

  const ALIASES = {
    TITLE: ["title", "name", "caption", "CAPTION"],
    CAPTION: ["caption", "title", "name"],
    ORGANIZER: ["organizer", "issuer", "company"],
    DATE: ["date", "eventDate", "CREATED_AT", "createdAt"],
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
    COVER_IMAGE: ["coverImage", "imageUrl", "image", "fileUrl", "url"],
    IMAGE_URL: ["imageUrl", "coverImage", "image", "fileUrl", "url"],
    IMAGE: ["image", "imageUrl", "coverImage", "fileUrl", "url"],
    FILE_URL: ["fileUrl", "imageUrl", "coverImage", "image", "url"],
    EVENT_ID: ["eventId", "eventLegacyId", "_id", "id"],
    PROJECT_ID: ["projectId", "_id", "id"],
    CERTIFICATE_ID: ["certificateId", "_id", "id"],
    PHOTO_ID: ["photoId", "_id", "id"],
    OPPORTUNITY_ID: ["opportunityId", "_id", "id"],
    CREATED_BY: ["createdBy", "email", "uploadedBy", "user"],
    UPLOADED_BY: ["uploadedBy", "createdBy", "email", "user"],
  };

  const aliases = ALIASES[upper] || ALIASES[key] || [];
  for (const alias of aliases) {
    if (record[alias] !== undefined && record[alias] !== null && record[alias] !== "") {
      if (typeof record[alias] === "object") {
        if (record[alias]?.email) return record[alias].email;
        if (record[alias]?.name) return record[alias].name;
        if (record[alias]?._id) return String(record[alias]._id);
      }
      return record[alias];
    }
  }

  return "";
}

function MemberSelectionSelector({ value = "", onChange, readOnly }) {
  const [groupUsers, setGroupUsers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  const DEFAULT_USERS = useMemo(
    () => [
      { name: "dhashaprakasha.cs25", role: "Admin" },
      { name: "harishkarthikkbs.ad25", role: "Admin" },
      { name: "indhumathig.al25", role: "Team Member 5" },
      { name: "kaviyadharshinir.al25", role: "Team Member 4" },
      { name: "kishorer.ei25", role: "Team Strategist" },
      { name: "kowshickts.ad25", role: "Team Member 8" },
      { name: "lathikas.it25", role: "Team Member 6" },
      { name: "mithunnb.cs25", role: "Team Member 1" },
      { name: "sriranganaathsks.cs25", role: "Team Member 2" },
      { name: "swethak.cs25", role: "Team Member 3" },
      { name: "nithishkumars.cs25", role: "Team Member 7" },
    ],
    []
  );

  useEffect(() => {
    let isMounted = true;
    apiFetch("/users/assignable")
      .then((res) => {
        if (!isMounted) return;
        const users = (res.users || []).map((u) => ({
          name: u.name || u.NAME || u.email || "",
          role: u.role || u.ROLE || "Team Member",
        })).filter((u) => u.name);

        setGroupUsers(users.length > 0 ? users : DEFAULT_USERS);
      })
      .catch(() => {
        if (!isMounted) return;
        setGroupUsers(DEFAULT_USERS);
      })
      .finally(() => {
        if (isMounted) setLoadingMembers(false);
      });
    return () => {
      isMounted = false;
    };
  }, [DEFAULT_USERS]);

  // Current tokens array
  const currentTokens = useMemo(() => {
    return String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  // Active list of group users
  const activeUsersList = groupUsers.length > 0 ? groupUsers : DEFAULT_USERS;

  // External (non-group) member tokens
  const externalTokens = useMemo(() => {
    return currentTokens.filter(
      (t) => !activeUsersList.some((g) => g.name.toLowerCase() === t.toLowerCase())
    );
  }, [currentTokens, activeUsersList]);

  // Count selected group members
  const selectedCount = useMemo(() => {
    return activeUsersList.filter((g) =>
      currentTokens.some((t) => t.toLowerCase() === g.name.toLowerCase())
    ).length;
  }, [activeUsersList, currentTokens]);

  const toggleMember = (mName) => {
    if (readOnly) return;
    const exists = currentTokens.some((t) => t.toLowerCase() === mName.toLowerCase());

    let nextTokens;
    if (exists) {
      nextTokens = currentTokens.filter((t) => t.toLowerCase() !== mName.toLowerCase());
    } else {
      nextTokens = [...currentTokens, mName];
    }

    onChange(nextTokens.join(", "));
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    const allGroupNames = activeUsersList.map((u) => u.name);
    const combined = Array.from(new Set([...allGroupNames, ...externalTokens])).join(", ");
    onChange(combined);
  };

  const handleClearAll = () => {
    if (readOnly) return;
    onChange(externalTokens.join(", "));
  };

  const toggleOther = () => {
    if (readOnly) return;
    const nextShowOther = !showOther;
    setShowOther(nextShowOther);
    if (!nextShowOther) {
      setOtherText("");
      const groupTokens = currentTokens.filter((t) =>
        activeUsersList.some((g) => g.name.toLowerCase() === t.toLowerCase())
      );
      onChange(groupTokens.join(", "));
    }
  };

  const handleOtherTextChange = (e) => {
    const val = e.target.value;
    setOtherText(val);
    const newExtTokens = val.split(",").map((s) => s.trim()).filter(Boolean);
    const groupTokens = currentTokens.filter((t) =>
      activeUsersList.some((g) => g.name.toLowerCase() === t.toLowerCase())
    );
    const combined = Array.from(new Set([...groupTokens, ...newExtTokens])).join(", ");
    onChange(combined);
  };

  return (
    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(167, 139, 250, 0.25)", borderRadius: "16px", padding: "18px", marginTop: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#a78bfa" }}>
          Assign to Members / Group Squad ({selectedCount} selected)
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
        <div className="member-select-grid">
          {activeUsersList.map((user) => {
            const isChecked = currentTokens.some(
              (t) => t.toLowerCase() === user.name.toLowerCase()
            );

            return (
              <label
                key={user.name}
                className={`member-select-card ${isChecked ? "selected" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  toggleMember(user.name);
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                />
                <div className="member-select-info">
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </div>
              </label>
            );
          })}

          {/* OTHER OPTION TOGGLE CARD */}
          <label
            className={`member-select-card ${showOther || externalTokens.length > 0 ? "selected" : ""}`}
            style={{
              borderColor: showOther || externalTokens.length > 0 ? "#a855f7" : "rgba(168, 85, 247, 0.35)",
              background: showOther || externalTokens.length > 0 ? "rgba(168, 85, 247, 0.2)" : "rgba(30, 41, 59, 0.6)",
            }}
            onClick={(e) => {
              e.preventDefault();
              toggleOther();
            }}
          >
            <input
              type="checkbox"
              checked={showOther || externalTokens.length > 0}
              onChange={() => {}}
              style={{ accentColor: "#a855f7" }}
            />
            <div className="member-select-info">
              <strong style={{ color: showOther || externalTokens.length > 0 ? "#c084fc" : "#a78bfa" }}>
                + Others (Non-Group Member)
              </strong>
              <small>Type external member names</small>
            </div>
          </label>
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

function ImageCropperModal({ imageSrc, onCropComplete, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [cropWidth, setCropWidth] = useState(400);
  const [cropHeight, setCropHeight] = useState(300);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspect, setAspect] = useState("4:3");

  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const handleAspectChange = (newAspect) => {
    setAspect(newAspect);
    if (newAspect === "16:9") {
      setCropWidth(400);
      setCropHeight(225);
    } else if (newAspect === "4:3") {
      setCropWidth(400);
      setCropHeight(300);
    } else if (newAspect === "1:1") {
      setCropWidth(350);
      setCropHeight(350);
    }
  };

  const handleSwapDimensions = () => {
    const temp = cropWidth;
    setCropWidth(cropHeight);
    setCropHeight(temp);
    setAspect("custom");
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = parseInt(cropWidth, 10) || 400;
    canvas.height = parseInt(cropHeight, 10) || 300;
    const ctx = canvas.getContext("2d");

    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const displayedWidth = (img.clientWidth || 300) * zoom;
    const displayedHeight = (img.clientHeight || 300) * zoom;

    const scaleX = (img.naturalWidth || displayedWidth) / displayedWidth;
    const scaleY = (img.naturalHeight || displayedHeight) / displayedHeight;

    const centerX = containerWidth / 2 + panX;
    const centerY = containerHeight / 2 + panY;

    const cropBoxLeft = containerWidth / 2 - cropWidth / 2;
    const cropBoxTop = containerHeight / 2 - cropHeight / 2;

    const imgLeft = centerX - displayedWidth / 2;
    const imgTop = centerY - displayedHeight / 2;

    const sourceX = Math.max(0, (cropBoxLeft - imgLeft) * scaleX);
    const sourceY = Math.max(0, (cropBoxTop - imgTop) * scaleY);
    const sourceW = Math.min((img.naturalWidth || displayedWidth) - sourceX, cropWidth * scaleX);
    const sourceH = Math.min((img.naturalHeight || displayedHeight) - sourceY, cropHeight * scaleY);

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onCropComplete(croppedDataUrl);
  };

  return (
    <div
      className="team-modal-overlay"
      style={{ zIndex: 1100 }}
      onMouseDown={onClose}
    >
      <div
        className="team-modal-box"
        style={{
          position: "relative",
          maxWidth: "760px",
          width: "92%",
          background: "#0f172a",
          border: "1px solid rgba(167, 139, 250, 0.35)",
          borderRadius: "24px",
          padding: "28px",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8)",
          color: "#f8fafc",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="team-modal-close"
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#cbd5e1",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <h3 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: "800", color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>✂️</span> Crop & Adjust Photo Framing
        </h3>

        {/* Interactive Viewport Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: "relative",
            width: "100%",
            height: "380px",
            background: "#020617",
            borderRadius: "16px",
            overflow: "hidden",
            cursor: isDragging ? "grabbing" : "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Background Image */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="To crop"
            style={{
              position: "absolute",
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
              transition: isDragging ? "none" : "transform 0.1s ease",
              pointerEvents: "none",
            }}
          />

          {/* Rule of Thirds Crop Overlay Box */}
          <div
            style={{
              position: "absolute",
              width: `${cropWidth}px`,
              height: `${cropHeight}px`,
              border: "2px solid #ffffff",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          >
            {/* Rule of thirds grid lines */}
            <div style={{ position: "absolute", top: "33.33%", left: 0, right: 0, height: "1px", background: "rgba(255,255,255,0.4)" }} />
            <div style={{ position: "absolute", top: "66.66%", left: 0, right: 0, height: "1px", background: "rgba(255,255,255,0.4)" }} />
            <div style={{ position: "absolute", left: "33.33%", top: 0, bottom: 0, width: "1px", background: "rgba(255,255,255,0.4)" }} />
            <div style={{ position: "absolute", left: "66.66%", top: 0, bottom: 0, width: "1px", background: "rgba(255,255,255,0.4)" }} />

            {/* Corner Handles */}
            <div style={{ position: "absolute", top: "-4px", left: "-4px", width: "12px", height: "12px", borderTop: "3px solid #ffffff", borderLeft: "3px solid #ffffff" }} />
            <div style={{ position: "absolute", top: "-4px", right: "-4px", width: "12px", height: "12px", borderTop: "3px solid #ffffff", borderRight: "3px solid #ffffff" }} />
            <div style={{ position: "absolute", bottom: "-4px", left: "-4px", width: "12px", height: "12px", borderBottom: "3px solid #ffffff", borderLeft: "3px solid #ffffff" }} />
            <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "12px", height: "12px", borderBottom: "3px solid #ffffff", borderRight: "3px solid #ffffff" }} />
          </div>
        </div>

        {/* Controls Toolbar Matching Screenshot 2 */}
        <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Aspect Ratio Presets */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: "700" }}>Presets:</span>
            {["4:3", "16:9", "1:1"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleAspectChange(r)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: aspect === r ? "rgba(99, 102, 241, 0.3)" : "rgba(30, 41, 59, 0.8)",
                  border: aspect === r ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.12)",
                  color: aspect === r ? "#818cf8" : "#cbd5e1",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Zoom Slider */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: "700" }}>Zoom:</span>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ accentColor: "#6366f1", width: "110px", cursor: "pointer" }}
            />
            <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "700", minWidth: "35px" }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Dimension Controls Matching Screenshot 2 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.12)", padding: "6px 12px", borderRadius: "12px" }}>
            <input
              type="number"
              value={cropWidth}
              onChange={(e) => { setCropWidth(Math.max(100, parseInt(e.target.value) || 100)); setAspect("custom"); }}
              style={{ width: "55px", background: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#ffffff", padding: "4px 8px", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
            />
            <span style={{ color: "#94a3b8", fontWeight: "700" }}>×</span>
            <input
              type="number"
              value={cropHeight}
              onChange={(e) => { setCropHeight(Math.max(100, parseInt(e.target.value) || 100)); setAspect("custom"); }}
              style={{ width: "55px", background: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#ffffff", padding: "4px 8px", fontSize: "13px", fontWeight: "700", textAlign: "center" }}
            />
            <button
              type="button"
              onClick={handleSwapDimensions}
              title="Swap Width / Height"
              style={{ background: "transparent", border: "none", color: "#818cf8", fontSize: "16px", cursor: "pointer", padding: "0 4px" }}
            >
              ⇆
            </button>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "18px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <button
            type="button"
            className="team-secondary-btn"
            onClick={onClose}
            style={{ padding: "9px 20px", fontSize: "13.5px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="team-primary-btn"
            onClick={handleApplyCrop}
            style={{ padding: "9px 22px", fontSize: "13.5px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)" }}
          >
            ✓ Crop & Use Photo
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageOrUrlInput({ field, value, onChange, readOnly }) {
  const [mode, setMode] = useState(value && !value.startsWith("data:") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploading(true);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
        setUploading(false);
        // Automatically prompt cropper modal on file select
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const isDataUrl = value && value.startsWith("data:");
  const isImage = isDataUrl
    ? value.startsWith("data:image/")
    : value && String(value).match(/\.(png|jpg|jpeg|gif|webp)|uc\?export=view/i);

  return (
    <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(167, 139, 250, 0.25)", borderRadius: "14px", padding: "14px", marginTop: "4px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setMode("upload")}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            border: mode === "upload" ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.12)",
            background: mode === "upload" ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
            color: mode === "upload" ? "#60a5fa" : "#94a3b8",
            transition: "all 0.2s ease",
          }}
        >
          📁 Upload Photo / File
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            border: mode === "url" ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.12)",
            background: mode === "url" ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
            color: mode === "url" ? "#60a5fa" : "#94a3b8",
            transition: "all 0.2s ease",
          }}
        >
          🔗 Paste URL Link
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px 14px",
              border: "2px dashed rgba(167, 139, 250, 0.35)",
              borderRadius: "12px",
              background: "rgba(30, 41, 59, 0.4)",
              cursor: readOnly ? "default" : "pointer",
              transition: "all 0.2s ease",
              textAlign: "center",
            }}
          >
            <input
              type="file"
              accept="image/*,.pdf"
              disabled={readOnly}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: "26px", marginBottom: "6px" }}>📸</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>
              {uploading ? "Converting photo to URL…" : "Click to select a photo / file from your device"}
            </span>
            <small style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              Supports PNG, JPG, JPEG, WEBP, GIF, PDF
            </small>
          </label>
        </div>
      ) : (
        <input
          type="url"
          value={value || ""}
          placeholder={field.placeholder || "https://..."}
          required={field.required}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(167, 139, 250, 0.3)",
            borderRadius: "10px",
            color: "#f8fafc",
            fontSize: "13px",
            outline: "none",
          }}
        />
      )}

      {value && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "12px" }}>
          {isImage ? (
            <img
              src={fixDriveImageUrl(value)}
              alt="Preview"
              style={{ width: "54px", height: "54px", borderRadius: "10px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }}
            />
          ) : (
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
              📄
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#34d399", display: "block" }}>
              ✓ Photo/File URL Attached
            </span>
            <small style={{ fontSize: "11px", color: "#94a3b8", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {value.length > 45 ? value.substring(0, 45) + "…" : value}
            </small>
          </div>
          {!readOnly && isImage && (
            <button
              type="button"
              onClick={() => setCropperOpen(true)}
              style={{ background: "rgba(99, 102, 241, 0.25)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#a5b4fc", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "8px", cursor: "pointer" }}
            >
              ✂️ Crop
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "8px", cursor: "pointer" }}
            >
              Remove
            </button>
          )}
        </div>
      )}

      {cropperOpen && value && (
        <ImageCropperModal
          imageSrc={fixDriveImageUrl(value)}
          onCropComplete={(croppedUrl) => {
            onChange(croppedUrl);
            setCropperOpen(false);
          }}
          onClose={() => setCropperOpen(false)}
        />
      )}
    </div>
  );
}

function isImageOrUrlField(field) {
  if (!field) return false;
  if (field.type === "url") return true;
  const name = String(field.name || "").toUpperCase();
  return (
    ["COVER_IMAGE", "IMAGE_URL", "IMAGE", "FILE_URL", "PHOTO_ID", "LINK"].includes(name) ||
    name.endsWith("_IMAGE") ||
    name.endsWith("_URL") ||
    name.endsWith("_FILE")
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

  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

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
            const title = getRecordValue(record, config.titleField) || getRecordValue(record, "TITLE") || getRecordValue(record, "CAPTION") || "Untitled record";
            const subtitle = getRecordValue(record, config.subtitleField) || getRecordValue(record, "ORGANIZER") || getRecordValue(record, "PROJECT") || getRecordValue(record, "EVENT_ID");
            const badge = getRecordValue(record, config.badgeField) || getRecordValue(record, "STATUS");
            const date = getRecordValue(record, "DATE") || getRecordValue(record, "CREATED_AT");
            const location = getRecordValue(record, "LOCATION");
            const techStack = getRecordValue(record, "TECH_STACK");
            const issuer = getRecordValue(record, "ISSUER");
            const description = getRecordValue(record, "DESCRIPTION");
            const uploadedBy = getRecordValue(record, "UPLOADED_BY") || getRecordValue(record, "CREATED_BY");

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
                      {subtitle && <p className="team-record-subtitle">{subtitle}</p>}
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
                    {uploadedBy && <span>👤 {uploadedBy}</span>}
                    {recordId && <span className="record-id-chip">ID: {recordId}</span>}
                  </div>

                  {description && (
                    <p className="team-record-description">
                      {description.length > 140 ? description.substring(0, 140) + "…" : description}
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
                const isMediaField = isImageOrUrlField(field);

                return (
                  <label
                    className={
                      field.type === "textarea" || isMediaField
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
                    ) : isMediaField ? (
                      <ImageOrUrlInput
                        field={field}
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
              (String(getRecordValue(selected, config.imageField)).startsWith("data:image/") ||
               String(getRecordValue(selected, config.imageField)).match(/\.(png|jpg|jpeg|gif|webp)|uc\?export=view/i)) && (
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
                    maxHeight: "380px",
                    objectFit: "contain",
                    background: "#020617",
                    width: "100%",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
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

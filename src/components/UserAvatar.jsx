// src/components/UserAvatar.jsx
import React, { useState, useEffect } from "react";

export function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Robust, responsive User Avatar component
 * Displays Google/custom profile picture with automatic fallback to initials.
 */
export default function UserAvatar({
  src,
  name = "User",
  size,
  shape = "circle",
  className = "",
  style = {},
  alt,
  fontSize,
  showBorder = false,
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const initials = getInitials(name);
  const cleanSrc = typeof src === "string" ? src.trim() : "";
  const hasValidSrc = Boolean(cleanSrc) && !imageError;

  // Compute sizing
  const sizeMap = {
    xs: 28,
    small: 36,
    medium: 46,
    large: 64,
    xlarge: 88,
  };

  const resolvedSize = typeof size === "number" ? `${size}px` : (sizeMap[size] ? `${sizeMap[size]}px` : (size || "46px"));
  const resolvedRadius = shape === "squircle" ? "22%" : (shape === "rounded" ? "12px" : "50%");

  const containerStyle = {
    width: resolvedSize,
    height: resolvedSize,
    minWidth: resolvedSize,
    minHeight: resolvedSize,
    borderRadius: resolvedRadius,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    userSelect: "none",
    flexShrink: 0,
    border: showBorder ? "2px solid rgba(255, 255, 255, 0.2)" : undefined,
    ...style,
  };

  return (
    <div
      className={`user-avatar-container ${className}`}
      style={containerStyle}
      title={name}
      aria-label={name}
    >
      {hasValidSrc ? (
        <>
          <img
            src={cleanSrc}
            alt={alt || name || "User Avatar"}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.2s ease-in-out",
            }}
          />
          {!imageLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: fontSize || "calc(0.4 * 100%)",
                fontFamily: "var(--font-heading, inherit)",
              }}
            >
              {initials}
            </div>
          )}
        </>
      ) : (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            color: "inherit",
            fontWeight: 700,
            fontSize: fontSize || undefined,
            fontFamily: "var(--font-heading, inherit)",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

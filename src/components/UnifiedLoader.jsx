// src/components/UnifiedLoader.jsx
export default function UnifiedLoader({
  title = "Loading…",
  subtitle = "Please wait a moment",
  minHeight = "380px",
}) {
  return (
    <div className="unified-loading-container" style={{ minHeight }}>
      <div className="unified-spinner-glow">
        <div className="circle-spinner" />
      </div>
      <div className="unified-loading-text">
        <div className="unified-loading-title">{title}</div>
        {subtitle && <div className="unified-loading-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

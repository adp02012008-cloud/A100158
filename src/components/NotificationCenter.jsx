// src/components/NotificationCenter.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "../utils/taskStorage";

function getNotifCategoryIcon(type) {
  switch (type) {
    case "OPPORTUNITY_NEW":
      return "🚀";
    case "OPPORTUNITY_THOUGHT":
      return "💬";
    case "CERTIFICATE_ISSUED":
      return "🎓";
    case "POINTS_AWARDED":
      return "⭐";
    case "TASK_DEADLINE_APPROACHING":
      return "⏰";
    case "TASK_ASSIGNED":
      return "🎯";
    case "TASK_REASSIGNED":
      return "🔄";
    case "NEW_SUBMISSION":
    case "RESUBMISSION_DELIVERED":
      return "📥";
    case "REVIEW_DECISION":
      return "📝";
    case "PROJECT_APPROVED":
      return "🏆";
    case "ACCOUNT_UPDATED":
      return "👤";
    case "REMINDER":
      return "⚡";
    default:
      return "🔔";
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const now = Date.now();
  const diffMs = now - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function NotificationCenter({ onSelectTask, onNavigate }) {
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [viewTab, setViewTab] = useState("unread"); // "unread" | "all"
  const popoverRef = useRef(null);

  const userEmail = auth.email || "";

  const loadNotifs = async () => {
    if (!auth?.isLoggedIn || !userEmail) return;
    try {
      const list = await getNotificationsForUser(userEmail);
      setNotifications(list || []);
    } catch (err) {
      console.warn("Notification load error:", err?.message);
    }
  };

  useEffect(() => {
    if (!auth?.isLoggedIn || !userEmail) {
      setNotifications([]);
      return;
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 5000);
    return () => clearInterval(interval);
  }, [userEmail, auth?.isLoggedIn]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read && !n.readAt),
    [notifications]
  );
  const unreadCount = unreadNotifications.length;

  const handleMarkAllRead = async () => {
    const previousState = [...notifications];
    const nowStr = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: n.readAt || nowStr })));

    try {
      await markAllNotificationsRead(userEmail);
    } catch (err) {
      console.warn("Mark all read error, rolling back state:", err?.message);
      setNotifications(previousState);
    }
  };

  const handleItemClick = async (notif) => {
    const notifId = notif.id || notif._id || notif.notificationId;
    if (!notif.read && !notif.readAt) {
      const previousState = [...notifications];
      const nowStr = new Date().toISOString();

      // Immediately update local state optimistically
      setNotifications((prev) =>
        prev.map((n) => ((n.id === notifId || n._id === notifId || n.notificationId === notifId) ? { ...n, read: true, readAt: n.readAt || nowStr } : n))
      );

      try {
        await markNotificationRead(notifId, userEmail);
      } catch (err) {
        console.warn("Mark single read error, rolling back state:", err?.message);
        setNotifications(previousState);
      }
    }
    setOpen(false);

    // Deep link navigation
    let targetPage = notif.targetPage;
    if (!targetPage) {
      if (notif.type === "NEW_SUBMISSION" || notif.type === "RESUBMISSION_DELIVERED") {
        targetPage = "review-deliverables";
      } else if (notif.taskId) {
        targetPage = "my-tasks";
      } else if (notif.type?.startsWith("OPPORTUNITY")) {
        targetPage = "opportunities";
      } else if (notif.type?.startsWith("CERTIFICATE")) {
        targetPage = "certificates";
      } else if (notif.type === "REMINDER") {
        targetPage = notif.targetPage || "profile";
      }
    }
    const refId = notif.referenceId || notif.taskId;

    if (onNavigate && targetPage) {
      onNavigate(targetPage, refId);
    } else if (onSelectTask && notif.taskId) {
      onSelectTask(notif.taskId);
    }
  };

  const displayedList = viewTab === "unread" ? unreadNotifications : notifications;

  return (
    <div className="notif-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
      >
        <span>🔔</span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-popover">
          <div className="notif-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Notifications 🔔</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #334155", padding: "8px 12px", background: "#0f172a" }}>
            <button
              type="button"
              className={`tab-pill ${viewTab === "unread" ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "3px 10px" }}
              onClick={() => setViewTab("unread")}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              className={`tab-pill ${viewTab === "all" ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "3px 10px" }}
              onClick={() => setViewTab("all")}
            >
              All History ({notifications.length})
            </button>
          </div>

          <div className="notif-list">
            {displayedList.length === 0 ? (
              <div className="notif-empty">
                {viewTab === "unread" ? "No unread notifications! ✨" : "No notification history yet."}
              </div>
            ) : (
              displayedList.map((n) => (
                <div
                  key={n.id || n._id || n.notificationId}
                  className={`notif-item ${!n.read && !n.readAt ? "unread" : ""}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notif-item-flex" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div
                      className="notif-category-icon"
                      style={{
                        fontSize: "1.2rem",
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255, 255, 255, 0.08)",
                        flexShrink: 0,
                      }}
                    >
                      {getNotifCategoryIcon(n.type)}
                    </div>
                    <div className="notif-item-body" style={{ flex: 1, minWidth: 0 }}>
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-msg">{n.message}</div>
                      <div className="notif-item-time">
                        {formatRelativeTime(n.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

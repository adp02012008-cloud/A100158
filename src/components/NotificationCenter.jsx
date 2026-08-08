// src/components/NotificationCenter.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchSheetData } from "../utils/api";
import { getNotificationsForUser, markNotificationsRead, markSingleNotificationRead } from "../utils/taskStorage";

export default function NotificationCenter({ onSelectTask }) {
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [viewTab, setViewTab] = useState("unread"); // "unread" | "all"
  const popoverRef = useRef(null);

  const userEmail = auth.email || "";

  const loadNotifs = async () => {
    if (!userEmail) return;
    try {
      const list = await getNotificationsForUser(userEmail);
      setNotifications(list || []);
    } catch (err) {
      console.warn("Notification load error:", err?.message);
    }
  };

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 5000);
    return () => clearInterval(interval);
  }, [userEmail]);

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
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    try {
      await markNotificationsRead(userEmail);
    } catch (err) {
      console.warn("Mark read error:", err?.message);
    }
  };

  const handleItemClick = async (notif) => {
    const notifId = notif.id || notif.notificationId;
    if (!notif.read && !notif.readAt) {
      // Immediately remove from unread state UI
      setNotifications((prev) =>
        prev.map((n) => ((n.id === notifId || n.notificationId === notifId) ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      try {
        await markSingleNotificationRead(notifId, userEmail);
      } catch (err) {
        console.warn("Mark single read error:", err?.message);
      }
    }
    setOpen(false);
    if (onSelectTask && notif.taskId) {
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
                  key={n.id}
                  className={`notif-item ${!n.read ? "unread" : ""}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-msg">{n.message}</div>
                  <div className="notif-item-time">
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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

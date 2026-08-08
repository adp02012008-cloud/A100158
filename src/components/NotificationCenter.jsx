// src/components/NotificationCenter.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getNotificationsForUser, markNotificationsRead } from "../utils/taskStorage";

export default function NotificationCenter({ onSelectTask }) {
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const popoverRef = useRef(null);

  const userEmail = auth.userEmail || "";

  useEffect(() => {
    if (!userEmail) return;

    const loadNotifs = () => {
      const list = getNotificationsForUser(userEmail);
      setNotifications(list);
    };

    loadNotifs();

    // Check periodically for new notifications
    const interval = setInterval(loadNotifs, 4000);
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    if (!open && unreadCount > 0) {
      markNotificationsRead(userEmail);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    setOpen((prev) => !prev);
  };

  const handleItemClick = (taskId) => {
    setOpen(false);
    if (onSelectTask && taskId) {
      onSelectTask(taskId);
    }
  };

  return (
    <div className="notif-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={handleToggle}
        title="Notifications"
      >
        <span>🔔</span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-popover">
          <div className="notif-header">
            <h4>Notifications 🔔</h4>
            <span className="notif-count-pill">{notifications.length} Total</span>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet. You're all caught up! ✨</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? "unread" : ""}`}
                  onClick={() => handleItemClick(n.taskId)}
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

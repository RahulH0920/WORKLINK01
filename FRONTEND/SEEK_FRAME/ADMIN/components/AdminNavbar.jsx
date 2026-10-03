import React, { useState, useEffect } from "react";
import { getAdminNotifications } from "../../data/api";

const AdminNavbar = ({ searchQuery, setSearchQuery, activePage = "Dashboard", setActivePage }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadNotifBadge = async () => {
      try {
        const res = await getAdminNotifications();
        if (res && res.success && isMounted) {
          setUnreadCount(res.summary?.unread || 0);
          setRecentNotifs((res.notifications || []).slice(0, 4));
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    loadNotifBadge();
    const interval = setInterval(loadNotifBadge, 30000); // 30s poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-left">
        <div className="admin-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search workers, employers, jobs, verifications..."
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          />
          <span className="search-shortcut">Ctrl K</span>
        </div>
      </div>

      <div className="admin-navbar-right">
        <div className="admin-system-status">
          <span className="status-dot green"></span>
          <span className="status-text">AI Verification Engine Live</span>
        </div>

        <div className="notification-wrapper">
          <button
            className="notification-button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <strong>Admin Alerts</strong>
                <span className="badge-new">{unreadCount > 0 ? `${unreadCount} Unread` : "Live Feed"}</span>
              </div>
              <div className="dropdown-body">
                {recentNotifs.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    No recent notifications
                  </div>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="dropdown-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setShowNotifications(false);
                        if (setActivePage) setActivePage("Notifications");
                      }}
                    >
                      <span className={`item-icon ${n.priority === "High" ? "amber" : "blue"}`}>
                        {n.priority === "High" ? "🚨" : "🔔"}
                      </span>
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <span className="time">{n.category}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="dropdown-footer" style={{ padding: "10px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
                <button
                  className="admin-btn-link"
                  style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  onClick={() => {
                    setShowNotifications(false);
                    if (setActivePage) setActivePage("Notifications");
                  }}
                >
                  View All Notifications &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="admin-profile-divider"></div>

        <div className="admin-profile">
          <div className="admin-avatar-container">
            <div className="admin-avatar">A</div>
            <span className="avatar-online-dot"></span>
          </div>

          <div className="admin-profile-info">
            <strong className="admin-name">Administrator</strong>
            <span className="admin-role">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
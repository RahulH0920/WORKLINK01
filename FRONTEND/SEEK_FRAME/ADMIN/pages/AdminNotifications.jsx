import React, { useState, useEffect, useMemo } from "react";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  dismissAdminNotification,
} from "../../data/api";
import "../styles/AdminNotifications.css";

const CATEGORIES = [
  { key: "all", label: "All Notifications", icon: "🔔" },
  { key: "System", label: "System", icon: "⚙️" },
  { key: "Fraud/Safety", label: "Security", icon: "🛡️" },
  { key: "Verification", label: "User Activity", icon: "👥" },
  { key: "Payments", label: "Payments", icon: "💳" },
  { key: "Jobs", label: "Jobs", icon: "💼" },
  { key: "Other", label: "Other", icon: "💬" },
];

const ITEMS_PER_PAGE = 7;

const AdminNotifications = ({ setActivePage }) => {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    unread: 0,
    read: 0,
    highPriority: 0,
    systemCount: 0,
    safetyAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'Verification', 'Jobs', 'Payments', 'Fraud/Safety', 'System'
  const [priorityFilter, setPriorityFilter] = useState("all"); // 'all', 'High', 'Medium', 'Low'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'unread', 'read'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminNotifications();
      if (res && res.success) {
        const notifs = res.notifications || [];
        setNotifications(notifs);
        const unreadCount = notifs.filter((n) => !n.isRead).length;
        const readCount = notifs.filter((n) => n.isRead).length;
        setSummary({
          total: res.summary?.total ?? notifs.length,
          unread: res.summary?.unread ?? unreadCount,
          read: readCount,
          highPriority: res.summary?.highPriority ?? notifs.filter((n) => n.priority === "High").length,
          systemCount: res.summary?.systemCount ?? notifs.filter((n) => n.category === "System").length,
          safetyAlerts: res.summary?.safetyAlerts ?? notifs.filter((n) => n.category === "Fraud/Safety").length,
        });
      } else {
        setError(res?.message || "Failed to load notifications");
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Unable to connect to notifications service. Please verify server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id, isRead) => {
    try {
      const res = await markAdminNotificationRead(id, isRead);
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead, readAt: isRead ? new Date().toISOString() : null } : n))
        );
        setSummary((prev) => ({
          ...prev,
          unread: isRead ? Math.max(0, prev.unread - 1) : prev.unread + 1,
          read: isRead ? prev.read + 1 : Math.max(0, prev.read - 1),
        }));
        if (selectedNotif && selectedNotif.id === id) {
          setSelectedNotif((prev) => ({ ...prev, isRead, readAt: isRead ? new Date().toISOString() : null }));
        }
      }
    } catch (err) {
      console.error("Failed to update notification read status:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      const res = await markAllAdminNotificationsRead();
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setSummary((prev) => ({
          ...prev,
          unread: 0,
          read: prev.total,
        }));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      const res = await dismissAdminNotification(id);
      if (res && res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (selectedNotif && selectedNotif.id === id) {
          setSelectedNotif(null);
        }
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  const handleNavigate = (targetRoute, notif) => {
    if (!setActivePage || !notif) return;
    if (selectedNotif) setSelectedNotif(null);

    // Auto mark as read on visit
    if (!notif.isRead) {
      handleMarkRead(notif.id, true);
    }

    if (targetRoute) {
      if (targetRoute.includes("jobs")) {
        setActivePage("Jobs", { selectedJobId: notif.jobId });
      } else if (targetRoute.includes("applications")) {
        setActivePage("Applications", { selectedJobId: notif.jobId });
      } else if (targetRoute.includes("transactions")) {
        setActivePage("Transactions", { selectedTxnId: notif.transactionId });
      } else if (targetRoute.includes("fraud")) {
        setActivePage("Fraud Detection", { selectedAlertId: notif.alertId });
      } else if (targetRoute.includes("trust") || targetRoute.includes("safety")) {
        setActivePage("Trust & Safety");
      } else if (targetRoute.includes("verification") || targetRoute.includes("ai-verification")) {
        setActivePage("AI Verification");
      } else if (targetRoute.includes("workers")) {
        setActivePage("Workers", { selectedWorkerId: notif.userId });
      } else if (targetRoute.includes("employers")) {
        setActivePage("Employers", { selectedEmployerId: notif.userId });
      } else {
        setActivePage("Dashboard");
      }
    } else {
      switch (notif.category) {
        case "Verification":
          setActivePage("AI Verification");
          break;
        case "Fraud/Safety":
          setActivePage("Fraud Detection", { selectedAlertId: notif.alertId });
          break;
        case "Jobs":
          setActivePage("Jobs", { selectedJobId: notif.jobId });
          break;
        case "Applications":
          setActivePage("Applications", { selectedJobId: notif.jobId });
          break;
        case "Payments":
          setActivePage("Transactions", { selectedTxnId: notif.transactionId });
          break;
        case "Disputes":
          setActivePage("Trust & Safety");
          break;
        default:
          setActivePage("Dashboard");
      }
    }
  };

  // Filtered Notifications calculation
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category / Sidebar filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "Fraud/Safety" && notif.category !== "Fraud/Safety") return false;
        else if (selectedCategory === "Verification" && notif.category !== "Verification") return false;
        else if (selectedCategory === "System" && notif.category !== "System") return false;
        else if (selectedCategory === "Payments" && notif.category !== "Payments") return false;
        else if (selectedCategory === "Jobs" && notif.category !== "Jobs") return false;
        else if (selectedCategory === "Other" && (notif.category === "System" || notif.category === "Fraud/Safety" || notif.category === "Verification" || notif.category === "Payments" || notif.category === "Jobs")) return false;
        else if (selectedCategory !== "Other" && notif.category !== selectedCategory) return false;
      }

      // Type dropdown filter
      if (typeFilter !== "all" && notif.category !== typeFilter) {
        return false;
      }

      // Priority dropdown filter
      if (priorityFilter !== "all" && notif.priority !== priorityFilter) {
        return false;
      }

      // Status dropdown filter
      if (statusFilter === "unread" && notif.isRead) return false;
      if (statusFilter === "read" && !notif.isRead) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (notif.title || "").toLowerCase().includes(q);
        const matchesMessage = (notif.message || "").toLowerCase().includes(q);
        const matchesCategory = (notif.category || "").toLowerCase().includes(q);
        const matchesUser = (notif.userName || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesMessage && !matchesCategory && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, selectedCategory, typeFilter, priorityFilter, statusFilter, search]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE));
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Verification": return "👥";
      case "Fraud/Safety": return "⚠️";
      case "Jobs": return "💼";
      case "Applications": return "📄";
      case "Payments": return "💳";
      case "Disputes": return "⚖️";
      case "System": return "ℹ️";
      default: return "🔔";
    }
  };

  const getAvatarClass = (notif) => {
    const title = (notif.title || "").toLowerCase();
    const cat = (notif.category || "").toLowerCase();

    if (title.includes("employer") || cat === "verification") return "cat-user";
    if (title.includes("verification completed") || title.includes("verified") || title.includes("success")) return "cat-success";
    if (title.includes("suspicious") || title.includes("fraud") || cat === "fraud/safety") return "cat-security";
    if (title.includes("payment") || cat === "payments") return "cat-payment";
    if (title.includes("job") || cat === "jobs") return "cat-jobs";
    if (cat === "system" || title.includes("maintenance")) return "cat-system";
    return "cat-other";
  };

  const getPriorityTag = (priority, notif) => {
    const p = (priority || "Low").toLowerCase();
    const title = (notif.title || "").toLowerCase();

    if (p === "high" || title.includes("suspicious") || title.includes("dispute")) {
      return { label: "✦ High", class: "high" };
    }
    if (p === "medium" || title.includes("maintenance")) {
      return { label: "✓ Medium", class: "medium" };
    }
    if (title.includes("completed") || title.includes("posted") || title.includes("approved")) {
      return { label: "✓ Success", class: "success" };
    }
    return { label: "✦ Info", class: "info" };
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Just now";
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Just now";
    }
  };

  const getCategoryCount = (key) => {
    if (key === "all") return notifications.length;
    if (key === "Other") {
      return notifications.filter(
        (n) => n.category !== "System" && n.category !== "Fraud/Safety" && n.category !== "Verification" && n.category !== "Payments" && n.category !== "Jobs"
      ).length;
    }
    return notifications.filter((n) => n.category === key).length;
  };

  return (
    <div className="admin-notif-container">
      {/* ── 1. Page Header & Top 3 Summary Cards (Reference Design) ── */}
      <div className="notif-header-wrapper">
        <div className="notif-header-left">
          <div className="notif-header-icon-box">
            🔔
          </div>
          <div className="notif-header-text">
            <h1>Notifications</h1>
            <p>Stay updated with the latest activities, alerts and system notifications.</p>
          </div>
        </div>

        {/* 3 Summary Stat Cards on Right */}
        <div className="notif-stats-strip">
          <div className="notif-stat-pill-card">
            <div className="notif-stat-icon-circle blue">🔔</div>
            <div className="notif-stat-pill-info">
              <span className="notif-stat-pill-label">Total Notifications</span>
              <span className="notif-stat-pill-val">{summary.total || notifications.length}</span>
            </div>
          </div>

          <div className="notif-stat-pill-card">
            <div className="notif-stat-icon-circle green">✉️</div>
            <div className="notif-stat-pill-info">
              <span className="notif-stat-pill-label">Unread</span>
              <span className="notif-stat-pill-val" style={{ color: "#16a34a" }}>
                {summary.unread}
              </span>
            </div>
          </div>

          <div className="notif-stat-pill-card">
            <div className="notif-stat-icon-circle purple">✓</div>
            <div className="notif-stat-pill-info">
              <span className="notif-stat-pill-label">Read</span>
              <span className="notif-stat-pill-val" style={{ color: "#8b5cf6" }}>
                {summary.read || Math.max(0, notifications.length - summary.unread)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Filter & Search Toolbar ── */}
      <div className="notif-toolbar-card">
        <div className="notif-toolbar-left">
          {/* Search Box */}
          <div className="notif-search-box">
            <span className="notif-search-icon">🔍</span>
            <input
              type="text"
              className="notif-search-input"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            {search && (
              <button className="notif-clear-search" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>

          {/* Filter Selects */}
          <div className="notif-filter-selects">
            <select
              className="notif-select-dropdown"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="Verification">Verification</option>
              <option value="Fraud/Safety">Security & Safety</option>
              <option value="Jobs">Jobs</option>
              <option value="Payments">Payments</option>
              <option value="System">System</option>
            </select>

            <select
              className="notif-select-dropdown"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low / Standard</option>
            </select>

            <select
              className="notif-select-dropdown"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>
        </div>

        {/* Toolbar Right */}
        <div className="notif-toolbar-right">
          <button
            className="notif-mark-all-btn"
            onClick={handleMarkAllRead}
            disabled={actionLoading || summary.unread === 0}
            title="Mark all notifications as read"
          >
            ✓ Mark All as Read
          </button>
        </div>
      </div>

      {/* ── 3. 2-Column Main Content Layout ── */}
      <div className="notif-main-layout">
        {/* Left Column: Categories Sidebar */}
        <div className="notif-category-sidebar">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.key);
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                className={`notif-category-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setCurrentPage(1);
                }}
              >
                <div className="notif-cat-left">
                  <span className="notif-cat-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                <span className="notif-cat-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Notifications Feed List */}
        <div className="notif-feed-container">
          {loading ? (
            <div className="notif-empty-state-card" style={{ padding: 48 }}>
              <div className="review-spinner" style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>Loading live notification feed...</p>
            </div>
          ) : error ? (
            <div className="notif-empty-state-card">
              <span className="notif-empty-state-icon">⚠️</span>
              <h3>Unable to Connect</h3>
              <p>{error}</p>
              <button className="btn-secondary" onClick={fetchNotifications} style={{ marginTop: 10 }}>
                🔄 Retry Connection
              </button>
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="notif-empty-state-card">
              <span className="notif-empty-state-icon">🔔</span>
              <h3>No Notifications Found</h3>
              <p>
                {search || statusFilter !== "all" || selectedCategory !== "all" || priorityFilter !== "all" || typeFilter !== "all"
                  ? "No notifications match your current filter or search criteria."
                  : "You're all caught up! No active notifications in the system."}
              </p>
              {(search || statusFilter !== "all" || selectedCategory !== "all" || priorityFilter !== "all" || typeFilter !== "all") && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setTypeFilter("all");
                    setPriorityFilter("all");
                    setStatusFilter("all");
                  }}
                  style={{ marginTop: 12, padding: "6px 14px", fontSize: 12.5 }}
                >
                  ✕ Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {paginatedNotifications.map((notif) => {
                const priorityTag = getPriorityTag(notif.priority, notif);
                const isUnread = !notif.isRead;
                const avatarClass = getAvatarClass(notif);
                const catIcon = getCategoryIcon(notif.category);

                return (
                  <div
                    key={notif.id}
                    className={`notif-row-card ${isUnread ? "unread" : "read"}`}
                    onClick={() => setSelectedNotif(notif)}
                  >
                    {/* Left: Avatar Icon & Text */}
                    <div className="notif-row-left-content">
                      <div className={`notif-category-avatar ${avatarClass}`}>
                        {catIcon}
                      </div>

                      <div className="notif-text-block">
                        <span className="notif-row-title">{notif.title || "Notification"}</span>
                        <p className="notif-row-message">{notif.message}</p>
                      </div>
                    </div>

                    {/* Right: Meta, Badges & Action */}
                    <div className="notif-row-right-meta" onClick={(e) => e.stopPropagation()}>
                      <span className="notif-time-ago">{formatTimeAgo(notif.createdAt)}</span>

                      <span className={`notif-badge-pill ${priorityTag.class}`}>
                        {priorityTag.label}
                      </span>

                      <span
                        className={`notif-badge-pill ${isUnread ? "unread" : "read"}`}
                        onClick={() => handleMarkRead(notif.id, !notif.isRead)}
                        style={{ cursor: "pointer" }}
                        title={isUnread ? "Click to mark as Read" : "Click to mark as Unread"}
                      >
                        ✦ {isUnread ? "Unread" : "Read"}
                      </span>

                      <button
                        className="notif-more-options-btn"
                        onClick={() => setSelectedNotif(notif)}
                        title="View notification details"
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls Matching Design */}
              {totalPages > 1 && (
                <div className="notif-pagination-bar">
                  <button
                    className="notif-page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`notif-page-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="notif-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detailed Notification Review Modal ── */}
      {selectedNotif && (
        <div className="admin-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="admin-modal-header">
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "22px" }}>{getCategoryIcon(selectedNotif.category)}</span>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: 16 }}>{selectedNotif.title}</h3>
                  <span className="text-muted text-sm">Event ID: <code>{selectedNotif.id}</code></span>
                </div>
              </div>
              <button className="admin-modal-close" onClick={() => setSelectedNotif(null)}>
                ✕
              </button>
            </div>

            <div className="admin-modal-body" style={{ padding: "20px 24px" }}>
              <div className="modal-alert-banner mb-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 10 }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div style={{ fontSize: 13 }}>
                    <strong>Category:</strong> {selectedNotif.category} &bull; <strong>Priority:</strong> {selectedNotif.priority}
                  </div>
                  <div>
                    <span className={`notif-badge-pill ${!selectedNotif.isRead ? "unread" : "read"}`}>
                      ✦ {!selectedNotif.isRead ? "Unread" : "Read"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Message & Description
                </h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#0f172a", lineHeight: 1.5, background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  {selectedNotif.message}
                </p>
              </div>

              <div className="detail-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b" }}>TIMESTAMP</span>
                  <strong style={{ fontSize: 12.5 }}>
                    {selectedNotif.createdAt ? new Date(selectedNotif.createdAt).toLocaleString("en-IN") : "Not Available"}
                  </strong>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b" }}>READ STATUS</span>
                  <strong style={{ fontSize: 12.5, color: selectedNotif.isRead ? "#16a34a" : "#2563eb" }}>
                    {selectedNotif.isRead ? "Read" : "Unread"}
                  </strong>
                </div>

                {selectedNotif.userName && (
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b" }}>RELATED USER</span>
                    <strong style={{ fontSize: 12.5 }}>{selectedNotif.userName}</strong>
                  </div>
                )}

                {selectedNotif.jobTitle && (
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b" }}>RELATED JOB</span>
                    <strong style={{ fontSize: 12.5 }}>{selectedNotif.jobTitle}</strong>
                  </div>
                )}

                {selectedNotif.transactionId && (
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b" }}>TRANSACTION ID</span>
                    <strong style={{ fontSize: 12, fontFamily: "monospace", color: "#2563eb" }}>{selectedNotif.transactionId}</strong>
                  </div>
                )}

                {selectedNotif.alertId && (
                  <div style={{ background: "#fef2f2", padding: "10px 12px", borderRadius: 8, border: "1px solid #fee2e2" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#dc2626" }}>ALERT ID</span>
                    <strong style={{ fontSize: 12, fontFamily: "monospace", color: "#dc2626" }}>{selectedNotif.alertId}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-modal-footer" style={{ padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleMarkRead(selectedNotif.id, !selectedNotif.isRead)}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {selectedNotif.isRead ? "Mark Unread" : "✓ Mark Read"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleDismiss(selectedNotif.id)}
                  style={{ padding: "6px 12px", fontSize: 12, color: "#dc2626", borderColor: "#fecaca" }}
                >
                  Dismiss
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => setSelectedNotif(null)} style={{ padding: "6px 14px", fontSize: 12 }}>
                  Close
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleNavigate(selectedNotif.targetRoute, selectedNotif)}
                  style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                >
                  Open Page &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;

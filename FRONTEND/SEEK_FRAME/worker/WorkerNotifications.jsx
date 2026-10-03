import React, { useState, useEffect, useMemo } from 'react';
import { getMyApplications } from '../data/api';
import { getUnreadMessageNotifications, subscribeToChatUpdates } from '../data/chatService';
import './WorkerNotifications.css';

export default function WorkerNotifications({ user, onNavigate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'
  const [chatRefresh, setChatRefresh] = useState(0);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`wl_read_notifs_${user?._id || user?.id || 'worker'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const workerId = String(user?._id || user?.id || 'worker');

  useEffect(() => {
    const unsub = subscribeToChatUpdates(() => {
      setChatRefresh((p) => p + 1);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let isMounted = true;
    getMyApplications()
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.applications)) {
          setApplications(res.applications);
        }
      })
      .catch((err) => {
        console.error('Error fetching notifications data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Construct real notifications based on actual user data and application states
  const notifications = useMemo(() => {
    const list = [];

    // 0. Dynamic Chat Notifications
    const chatNotifs = getUnreadMessageNotifications('worker', workerId);
    chatNotifs.forEach((cn) => {
      list.push({
        id: cn.id,
        isChat: true,
        type: 'Message',
        icon: '💬',
        bg: '#eff6ff',
        color: '#2563eb',
        title: `New message from ${cn.senderName}`,
        message: cn.message,
        time: cn.time,
        senderId: cn.senderId,
        senderName: cn.senderName,
        jobId: cn.jobId,
        jobTitle: cn.jobTitle,
        targetTab: 'messages',
        actionText: 'Open Chat →',
      });
    });

    // 1. Notifications from Applications
    applications.forEach((app, idx) => {
      const job = app.job || {};
      const employerName =
        job.employer?.name ||
        (job.employer?.firstName
          ? `${job.employer.firstName} ${job.employer.lastName || ''}`.trim()
          : 'WorkLink Employer');


      const dateStr = app.appliedAt
        ? new Date(app.appliedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : 'Recent';

      if (app.status === 'accepted' || app.status === 'hired') {
        list.push({
          id: `app-accepted-${app.applicationId || app._id || idx}`,
          type: 'Application Accepted',
          icon: '✓',
          bg: '#ecfdf5',
          color: '#059669',
          title: 'Application Accepted',
          message: `Your application for "${job.title || 'Work'}" has been accepted by ${employerName}.`,
          time: dateStr,
          targetTab: 'work-upcoming',
          actionText: 'View in My Work →',
        });
      } else if (app.status === 'rejected') {
        list.push({
          id: `app-rejected-${app.applicationId || app._id || idx}`,
          type: 'Application Status',
          icon: '❌',
          bg: '#fef2f2',
          color: '#dc2626',
          title: 'Application Update',
          message: `Your application for "${job.title || 'Work'}" was not selected by ${employerName}.`,
          time: dateStr,
          targetTab: 'applications',
          actionText: 'View Applications →',
        });
      } else if (app.status === 'completed') {
        list.push({
          id: `app-completed-${app.applicationId || app._id || idx}`,
          type: 'Work Completed',
          icon: '🎉',
          bg: '#eff6ff',
          color: '#2563eb',
          title: 'Work Completed & Signed Off',
          message: `Your work assignment for "${job.title || 'Work'}" has been marked as completed.`,
          time: dateStr,
          targetTab: 'work-completed',
          actionText: 'View Completed Work →',
        });
      }
    });

    // 2. Notifications from Identity Verification
    if (user?.isVerified) {
      list.push({
        id: 'verification-approved',
        type: 'Verification Update',
        icon: '🛡️',
        bg: '#ecfdf5',
        color: '#059669',
        title: 'Identity Verification Confirmed',
        message: 'Your profile and Aadhaar verification have been confirmed by WorkLink AI. You are a Verified Worker.',
        time: user.verifiedAt ? new Date(user.verifiedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Verified',
        targetTab: 'trust',
        actionText: 'View Trust Engine →',
      });
    } else if (user?.verificationStatus === 'pending') {
      list.push({
        id: 'verification-pending',
        type: 'Verification Update',
        icon: '⏳',
        bg: '#fffbeb',
        color: '#d97706',
        title: 'Verification In Progress',
        message: 'Your document verification is currently being processed by WorkLink AI.',
        time: 'Pending',
        targetTab: 'trust',
        actionText: 'Check Verification Status →',
      });
    }

    // 3. New Opportunities Alert
    list.push({
      id: 'new-jobs-available',
      type: 'New Job',
      icon: '💼',
      bg: '#eff6ff',
      color: '#2563eb',
      title: 'New Gigs Available',
      message: 'New verified job listings have been published in Catering, Driving, Cleaning, and Delivery.',
      time: 'Today',
      targetTab: 'jobs',
      actionText: 'Explore Jobs →',
    });

    return list;
  }, [applications, user]);

  // Mark single notification as read
  const handleMarkAsRead = (id) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem(`wl_read_notifs_${user?._id || user?.id || 'worker'}`, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save read state', err);
      }
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(`wl_read_notifs_${user?._id || user?.id || 'worker'}`, JSON.stringify(allIds));
    } catch (err) {
      console.error('Failed to save read state', err);
    }
  };

  // Click notification to navigate
  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif.id);
    if (onNavigate && notif.targetTab) {
      if (notif.isChat) {
        onNavigate('messages', {
          employerId: notif.senderId,
          employerName: notif.senderName,
          jobId: notif.jobId,
          jobTitle: notif.jobTitle,
        });
      } else {
        onNavigate(notif.targetTab);
      }
    }
  };


  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((n) => !readIds.includes(n.id));
    }
    return notifications;
  }, [notifications, activeFilter, readIds]);

  return (
    <div className="wrk-notifs-container">
      {/* ── Page Header ── */}
      <div className="wrk-notifs-header">
        <div className="wrk-notifs-header-text">
          <h1 className="wrk-notifs-title">Notifications</h1>
          <p className="wrk-notifs-subtitle">
            Stay updated with your job applications, shift confirmations, and trust milestones.
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="wrk-notifs-actions">
            <button
              type="button"
              className="wrk-notifs-mark-btn"
              onClick={handleMarkAllAsRead}
            >
              ✓ Mark All as Read
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs Filter ── */}
      <div className="wrk-notifs-tabs">
        <button
          type="button"
          className={`wrk-notif-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <span>All</span>
          <span className="wrk-notif-tab-badge">{notifications.length}</span>
        </button>

        <button
          type="button"
          className={`wrk-notif-tab ${activeFilter === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveFilter('unread')}
        >
          <span>Unread</span>
          <span className="wrk-notif-tab-badge">{unreadCount}</span>
        </button>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="wrk-notifs-empty">
          <div className="wrk-state-spinner" />
          <h3 className="wrk-notifs-empty-title">Loading notifications…</h3>
        </div>
      )}

      {/* ── Notification List ── */}
      {!loading && (
        <>
          {filteredNotifications.length === 0 ? (
            <div className="wrk-notifs-empty">
              <div className="wrk-notifs-empty-icon">🔔</div>
              <h2 className="wrk-notifs-empty-title">No Notifications</h2>
              <p className="wrk-notifs-empty-desc">
                {activeFilter === 'unread'
                  ? "You have read all your notifications."
                  : "You're all caught up! New updates on jobs and verification will appear here."}
              </p>
            </div>
          ) : (
            <div className="wrk-notifs-list">
              {filteredNotifications.map((notif) => {
                const isUnread = !readIds.includes(notif.id);

                return (
                  <div
                    key={notif.id}
                    className={`wrk-notif-card ${isUnread ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div
                      className="wrk-notif-icon-box"
                      style={{ background: notif.bg, color: notif.color }}
                    >
                      {notif.icon}
                    </div>

                    <div className="wrk-notif-content">
                      <div className="wrk-notif-top-row">
                        <h3 className="wrk-notif-card-title">
                          {isUnread && <span className="wrk-notif-unread-dot" />}
                          {notif.title}
                        </h3>
                        <span className="wrk-notif-time">{notif.time}</span>
                      </div>

                      <p className="wrk-notif-message">{notif.message}</p>

                      <div className="wrk-notif-footer-row">
                        <span className="wrk-notif-action-hint">
                          {notif.actionText}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React from 'react';
import './EmployerNotificationsView.css';

export default function EmployerNotificationsView({ notifications = [], onClose, onMarkAllRead, onNotificationClick, isModal = true }) {
  const content = (
    <div className="notif-view-container">
      <div className="notif-header-row">
        <div>
          <h2 className="notif-main-title">🔔 WorkLink Notifications</h2>
          <p className="notif-sub-title">Stay updated on worker applications, payouts, KYC verification, messages, and safety alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onMarkAllRead && (
            <button className="notif-mark-btn" onClick={onMarkAllRead}>
              Mark all as read
            </button>
          )}
          {isModal && (
            <button className="notif-close-btn" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      <div className="notif-list-wrap">
        {notifications.length === 0 ? (
          <div className="notif-empty-state">
            <span style={{ fontSize: 36 }}>🔔</span>
            <h4>No notifications</h4>
            <p>You're all caught up with your latest hiring activities.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notif-card-item ${n.unread ? 'unread' : ''}`}
              style={{ cursor: onNotificationClick ? 'pointer' : 'default' }}
              onClick={() => onNotificationClick && onNotificationClick(n)}
            >
              <div className="notif-icon-col" style={{ background: n.iconBg || '#eff6ff', color: n.iconColor || '#2563eb' }}>
                {n.icon}
              </div>

              <div className="notif-content-col">
                <div className="notif-title-row">
                  <strong className="notif-item-title">{n.title}</strong>
                  <span className="notif-time-badge">{n.time}</span>
                </div>
                <p className="notif-item-message">{n.message}</p>
                {n.category && (
                  <span className="notif-category-tag">{n.category}</span>
                )}
              </div>

              {n.unread && (
                <div className="notif-unread-dot" title="Unread notification" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );


  if (!isModal) {
    return content;
  }

  return (
    <div className="notif-modal-backdrop" onClick={onClose}>
      <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

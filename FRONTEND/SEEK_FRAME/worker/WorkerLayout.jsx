import React, { useState, useEffect, useRef } from 'react';
import JobsPage from '../seeker/Jobs/JobsPage';
import MessagesPage from '../seeker/Messages/MessagesPage';
import ProfilePage from '../seeker/Profile/ProfilePage';
import TrustPage from '../seeker/Trust/TrustPage';
import WorkerHome from './WorkerHome';
import WorkerFindJobs from './WorkerFindJobs';
import WorkerMyWork from './WorkerMyWork';
import WorkerNotifications from './WorkerNotifications';
import WorkerMessages from './WorkerMessages';
import WorkerApplications from './WorkerApplications';
import WorkerProfile from './WorkerProfile';
import WorkerTrust from './WorkerTrust';
import WorkerEarnings from './WorkerEarnings';
import WorkerSettings from './WorkerSettings';
import {
  getUnreadMessagesForRole,
  getUnreadMessageNotifications,
  subscribeToChatUpdates,
} from '../data/chatService';
import './WorkerLayout.css';

export default function WorkerLayout({
  user,
  activePage = 'dashboard',
  setActivePage,
  onLogout,
  onUserUpdate,
  requireProfile,
  onCompleteProfile,
  selectedDepartment = 'All',
  onSelectDepartment,
}) {
  const [currentTab, setCurrentTab] = useState(activePage || 'dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadChatMessages, setUnreadChatMessages] = useState([]);

  const workerId = String(user?._id || user?.id || 'worker');

  const refreshUnreadChat = () => {
    const unread = getUnreadMessagesForRole('worker', workerId);
    setUnreadChatMessages(unread);
  };

  useEffect(() => {
    refreshUnreadChat();
    const unsub = subscribeToChatUpdates(() => {
      refreshUnreadChat();
    });
    return unsub;
  }, [workerId]);


  // Submenu states
  const [jobsExpanded, setJobsExpanded] = useState(
    ['jobs', 'jobs-categories', 'jobs-nearby'].includes(activePage)
  );
  const [workExpanded, setWorkExpanded] = useState(
    ['work-upcoming', 'work-completed'].includes(activePage)
  );

  // Topbar dropdowns
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Sync activePage prop with currentTab
  useEffect(() => {
    if (activePage && activePage !== currentTab) {
      setCurrentTab(activePage);
      if (['jobs', 'jobs-categories', 'jobs-nearby'].includes(activePage)) {
        setJobsExpanded(true);
      }
      if (['work-upcoming', 'work-completed'].includes(activePage)) {
        setWorkExpanded(true);
      }
    }
  }, [activePage]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Worker display information from real user prop
  const workerFullName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Worker');
  const workerFirstName = user?.name ? user.name.split(' ')[0] : (user?.firstName || 'Worker');
  const initials = workerFullName
    ? workerFullName.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : 'WK';

  const isVerified = Boolean(user?.isVerified || user?.verificationStatus === 'approved');
  const trustScore = typeof user?.trustScore === 'number' ? user.trustScore : 0;
  const isProfileComplete = Boolean(user?.profileComplete);

  const [selectedEmployerContact, setSelectedEmployerContact] = useState(null);

  const handleNav = (tabId, extraData = null) => {
    if (tabId === 'messages' && extraData) {
      setSelectedEmployerContact(extraData);
    }
    setCurrentTab(tabId);
    if (setActivePage) setActivePage(tabId);
    setMobileDrawerOpen(false);
  };

  // Dynamic Page Titles
  const PAGE_TITLES = {
    dashboard: 'Worker Dashboard',
    jobs: 'Find Jobs — All Jobs',
    'jobs-categories': 'Find Jobs — Categories',
    'jobs-nearby': 'Find Jobs — Nearby Jobs',
    applications: 'My Applications',
    'my-work': 'My Work',
    'work-upcoming': 'My Work — Upcoming',
    'work-completed': 'My Work — Completed',
    messages: 'Messages',
    notifications: 'Notifications',
    earnings: 'Earnings & Payouts',
    profile: 'My Profile',
    reviews: 'My Reviews',
    trust: 'Trust & Verification',
    settings: 'Settings',
  };

  // Render the view corresponding to currentTab
  const renderContent = () => {
    switch (currentTab) {
      case 'jobs':
      case 'jobs-categories':
      case 'jobs-nearby':
        return (
          <WorkerFindJobs
            user={user}
            requireProfile={requireProfile}
            initialDepartment={selectedDepartment || 'All'}
            onSelectDepartment={onSelectDepartment}
          />
        );

      case 'messages':
        return (
          <WorkerMessages
            user={user}
            activeEmployerContact={selectedEmployerContact}
            onNavigate={handleNav}
            requireProfile={requireProfile}
          />
        );

      case 'work-upcoming':
      case 'work-completed':
      case 'my-work':
        return (
          <WorkerMyWork
            initialTab={currentTab === 'work-completed' ? 'completed' : 'upcoming'}
            user={user}
            onNavigate={handleNav}
          />
        );

      case 'notifications':
        return (
          <WorkerNotifications
            user={user}
            onNavigate={handleNav}
          />
        );

      case 'profile':
      case 'reviews':
        return <WorkerProfile user={user} onUserUpdate={onUserUpdate} onNavigate={handleNav} />;

      case 'trust':
        return <WorkerTrust user={user} />;

      case 'applications':
        return (
          <WorkerApplications
            user={user}
            onNavigate={handleNav}
          />
        );

      case 'earnings':
        return <WorkerEarnings user={user} onNavigate={handleNav} />;

      case 'settings':
        return (
          <WorkerSettings
            user={user}
            onUserUpdate={onUserUpdate}
            onLogout={onLogout}
            onNavigate={handleNav}
          />
        );

      case 'dashboard':
      default:
        return (
          <WorkerHome
            user={user}
            onNavigate={handleNav}
            onCompleteProfile={onCompleteProfile}
          />
        );
    }
  };

  const isFindJobsActive = ['jobs', 'jobs-categories', 'jobs-nearby'].includes(currentTab);
  const isMyWorkActive = ['work-upcoming', 'work-completed'].includes(currentTab);

  return (
    <div className={`wrk-layout ${collapsed ? 'collapsed' : ''}`}>
      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="wrk-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Dark Navy) ── */}
      <aside className={`wrk-sidebar ${collapsed ? 'collapsed' : ''} ${mobileDrawerOpen ? 'drawer-open' : ''}`}>
        {/* WorkLink logo/branding */}
        <div className="wrk-sidebar-header">
          <div className="wrk-brand" onClick={() => handleNav('dashboard')}>
            <div className="wrk-brand-logo">W</div>
            {!collapsed && (
              <div className="wrk-brand-info">
                <span className="wrk-brand-name">WorkLink</span>
                <span className="wrk-brand-badge">WORKER</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            className="wrk-collapse-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>

          {/* Mobile Close Drawer Button */}
          <button
            type="button"
            className="wrk-close-drawer-btn mobile-only"
            onClick={() => setMobileDrawerOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="wrk-sidebar-nav">
          <div className="wrk-nav-section-label">{!collapsed && 'MENU'}</div>

          {/* 1. Dashboard */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNav('dashboard')}
            title={collapsed ? 'Dashboard' : undefined}
          >
            <span className="wrk-nav-icon">⊞</span>
            {!collapsed && <span className="wrk-nav-label">Dashboard</span>}
          </button>

          {/* 2. Find Jobs (with sub-items) */}
          <button
            type="button"
            className={`wrk-nav-item ${isFindJobsActive ? 'active' : ''}`}
            onClick={() => {
              if (collapsed) {
                handleNav('jobs');
              } else {
                setJobsExpanded(!jobsExpanded);
              }
            }}
            title={collapsed ? 'Find Jobs' : undefined}
          >
            <span className="wrk-nav-icon">💼</span>
            {!collapsed && <span className="wrk-nav-label">Find Jobs</span>}
            {!collapsed && (
              <span className="wrk-nav-caret">
                {jobsExpanded ? '▼' : '▶'}
              </span>
            )}
          </button>

          {/* Submenu for Find Jobs */}
          {!collapsed && jobsExpanded && (
            <div className="wrk-submenu">
              <button
                type="button"
                className={`wrk-submenu-item ${currentTab === 'jobs' ? 'active' : ''}`}
                onClick={() => handleNav('jobs')}
              >
                All Jobs
              </button>
              <button
                type="button"
                className={`wrk-submenu-item ${currentTab === 'jobs-categories' ? 'active' : ''}`}
                onClick={() => handleNav('jobs-categories')}
              >
                Categories
              </button>
              <button
                type="button"
                className={`wrk-submenu-item ${currentTab === 'jobs-nearby' ? 'active' : ''}`}
                onClick={() => handleNav('jobs-nearby')}
              >
                Nearby Jobs
              </button>
            </div>
          )}

          {/* 3. My Applications */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'applications' ? 'active' : ''}`}
            onClick={() => handleNav('applications')}
            title={collapsed ? 'My Applications' : undefined}
          >
            <span className="wrk-nav-icon">📑</span>
            {!collapsed && <span className="wrk-nav-label">My Applications</span>}
          </button>

          {/* 4. My Work (with sub-items) */}
          <button
            type="button"
            className={`wrk-nav-item ${isMyWorkActive ? 'active' : ''}`}
            onClick={() => {
              if (collapsed) {
                handleNav('work-upcoming');
              } else {
                setWorkExpanded(!workExpanded);
              }
            }}
            title={collapsed ? 'My Work' : undefined}
          >
            <span className="wrk-nav-icon">👷</span>
            {!collapsed && <span className="wrk-nav-label">My Work</span>}
            {!collapsed && (
              <span className="wrk-nav-caret">
                {workExpanded ? '▼' : '▶'}
              </span>
            )}
          </button>

          {/* Submenu for My Work */}
          {!collapsed && workExpanded && (
            <div className="wrk-submenu">
              <button
                type="button"
                className={`wrk-submenu-item ${currentTab === 'work-upcoming' ? 'active' : ''}`}
                onClick={() => handleNav('work-upcoming')}
              >
                Upcoming
              </button>
              <button
                type="button"
                className={`wrk-submenu-item ${currentTab === 'work-completed' ? 'active' : ''}`}
                onClick={() => handleNav('work-completed')}
              >
                Completed
              </button>
            </div>
          )}

          {/* 5. Messages */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'messages' ? 'active' : ''}`}
            onClick={() => handleNav('messages')}
            title={collapsed ? 'Messages' : undefined}
          >
            <span className="wrk-nav-icon">💬</span>
            {!collapsed && <span className="wrk-nav-label">Messages</span>}
            {!collapsed && unreadChatMessages.length > 0 && (
              <span style={{ background: '#2563eb', color: '#ffffff', borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>
                {unreadChatMessages.length}
              </span>
            )}
          </button>

          {/* 6. Notifications */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleNav('notifications')}
            title={collapsed ? 'Notifications' : undefined}
          >
            <span className="wrk-nav-icon">🔔</span>
            {!collapsed && <span className="wrk-nav-label">Notifications</span>}
            {!collapsed && unreadChatMessages.length > 0 && (
              <span style={{ background: '#ef4444', color: '#ffffff', borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>
                {unreadChatMessages.length}
              </span>
            )}
          </button>

          {/* 7. Earnings */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'earnings' ? 'active' : ''}`}
            onClick={() => handleNav('earnings')}
            title={collapsed ? 'Earnings' : undefined}
          >
            <span className="wrk-nav-icon">💳</span>
            {!collapsed && <span className="wrk-nav-label">Earnings</span>}
          </button>

          {/* 8. My Profile */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'profile' || currentTab === 'reviews' ? 'active' : ''}`}
            onClick={() => handleNav('profile')}
            title={collapsed ? 'My Profile' : undefined}
          >
            <span className="wrk-nav-icon">👤</span>
            {!collapsed && <span className="wrk-nav-label">My Profile</span>}
          </button>

          {/* 9. Trust & Verification */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'trust' ? 'active' : ''}`}
            onClick={() => handleNav('trust')}
            title={collapsed ? 'Trust & Verification' : undefined}
          >
            <span className="wrk-nav-icon">🛡️</span>
            {!collapsed && <span className="wrk-nav-label">Trust & Verification</span>}
          </button>

          {/* 10. Settings */}
          <button
            type="button"
            className={`wrk-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleNav('settings')}
            title={collapsed ? 'Settings' : undefined}
          >
            <span className="wrk-nav-icon">⚙️</span>
            {!collapsed && <span className="wrk-nav-label">Settings</span>}
          </button>
        </nav>

        {/* Sidebar Footer with Worker Profile Mini-Card & Logout */}
        <div className="wrk-sidebar-footer">
          {!collapsed && (
            <div
              className="wrk-profile-minicard"
              onClick={() => handleNav('profile')}
              title="View Profile"
            >
              <div className="wrk-minicard-avatar">{initials}</div>
              <div className="wrk-minicard-info">
                <span className="wrk-minicard-name">{workerFullName}</span>
                <span className={`wrk-minicard-status ${isVerified ? 'verified' : 'pending'}`}>
                  {isVerified ? '✓ Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="wrk-nav-item wrk-logout-btn"
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
          >
            <span className="wrk-nav-icon">🚪</span>
            {!collapsed && <span className="wrk-nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Layout Wrapper ── */}
      <div className="wrk-main-wrapper">
        {/* ── Top Header ── */}
        <header className="wrk-topbar">
          <div className="wrk-topbar-left">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="wrk-hamburger-btn mobile-only"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open sidebar"
            >
              ☰
            </button>

            {/* Page Title */}
            <h1 className="wrk-topbar-title">
              {PAGE_TITLES[currentTab] || 'WorkLink'}
            </h1>

            {/* Search Area */}
            <div className="wrk-topbar-search desktop-only">
              <span className="wrk-topbar-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search jobs, skills, applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleNav('jobs');
                  }
                }}
              />
              <span className="wrk-search-kbd">⌘K</span>
            </div>
          </div>

          <div className="wrk-topbar-right">
            {/* Verified Badge if user is verified */}
            {isVerified && (
              <span className="wrk-topbar-verified-badge desktop-only" title="Identity Verified by WorkLink AI">
                ✓ Verified
              </span>
            )}

            {/* Message Icon */}
            <button
              type="button"
              className="wrk-topbar-icon-btn"
              onClick={() => handleNav('messages')}
              title="Messages"
              style={{ position: 'relative' }}
            >
              💬
              {unreadChatMessages.length > 0 && (
                <span className="wrk-notif-dot" style={{ background: '#2563eb' }} />
              )}
            </button>

            {/* Notification Icon */}
            <div className="wrk-profile-dropdown-wrap" ref={notifRef}>
              <button
                type="button"
                className="wrk-topbar-icon-btn"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                title="Notifications"
                style={{ position: 'relative' }}
              >
                🔔
                {unreadChatMessages.length > 0 && (
                  <span className="wrk-notif-dot" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="wrk-profile-menu" style={{ width: 300 }}>
                  <div className="wrk-menu-header">
                    <strong className="wrk-menu-name">Notifications</strong>
                    <span className="wrk-menu-email">Latest updates & alerts</span>
                  </div>
                  <div className="wrk-menu-divider" />

                  {unreadChatMessages.length > 0 ? (
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {unreadChatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: '#eff6ff',
                          }}
                          onClick={() => {
                            setNotifDropdownOpen(false);
                            handleNav('messages', {
                              employerId: msg.senderId,
                              employerName: msg.senderName,
                              jobId: msg.jobId,
                              jobTitle: msg.jobTitle,
                            });
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            💬 New message from {msg.senderName}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{msg.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                      No new notifications right now.
                    </div>
                  )}

                  <div className="wrk-menu-divider" />
                  <button
                    type="button"
                    className="wrk-menu-item"
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      handleNav('notifications');
                    }}
                  >
                    View All Notifications →
                  </button>
                </div>
              )}
            </div>


            {/* Worker Profile Photo / Name & Verified Badge */}
            <div className="wrk-profile-dropdown-wrap" ref={profileRef}>
              <div
                className="wrk-topbar-profile-trigger"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="wrk-topbar-avatar">{initials}</div>
                <div className="wrk-topbar-user-info desktop-only">
                  <div className="wrk-topbar-name-row">
                    <span className="wrk-topbar-name">{workerFullName}</span>
                  </div>
                  <span
                    className="wrk-topbar-status"
                    style={{
                      color: isVerified ? '#10b981' : isProfileComplete ? '#3b82f6' : '#f59e0b',
                    }}
                  >
                    {isVerified
                      ? 'Verified Worker'
                      : isProfileComplete
                      ? 'Verification Pending'
                      : 'Profile Incomplete'}
                  </span>
                </div>
                <span className="wrk-dropdown-caret">▼</span>
              </div>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="wrk-profile-menu">
                  <div className="wrk-menu-header">
                    <strong className="wrk-menu-name">{workerFullName}</strong>
                    <span className="wrk-menu-email">{user?.email || 'worker@worklink.com'}</span>
                    <div className="wrk-menu-trust-badge">
                      🛡️ Trust Score: <strong>{trustScore} pts</strong>
                    </div>
                  </div>
                  <div className="wrk-menu-divider" />
                  <button
                    type="button"
                    className="wrk-menu-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNav('profile');
                    }}
                  >
                    👤 My Profile
                  </button>
                  <button
                    type="button"
                    className="wrk-menu-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNav('trust');
                    }}
                  >
                    🛡️ Trust & Verification
                  </button>
                  <button
                    type="button"
                    className="wrk-menu-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNav('settings');
                    }}
                  >
                    ⚙️ Settings
                  </button>
                  <div className="wrk-menu-divider" />
                  <button
                    type="button"
                    className="wrk-menu-item text-danger"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main View Content Area ── */}
        <main className="wrk-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

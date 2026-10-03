import React, { useState, useEffect, useRef } from 'react';
import EmployerDash from './EmployerDash/EmployerDash';
import PostJob from './PostJob/PostJob';
import MyJobs from './MyJobs/MyJobs';
import Applicants from './Applicants/Applicants';
import EmployerWorkers from './Workers/EmployerWorkers';
import EmployerMessages from './Messages/EmployerMessages';
import EmployerProfile from './Profile/EmployerProfile';
import EmployerSettings from './Settings/EmployerSettings';
import MessagesPage from '../seeker/Messages/MessagesPage';
import ProfilePage from '../seeker/Profile/ProfilePage';
import TrustPage from '../seeker/Trust/TrustPage';
import EmployerTransactionsView from './EmployerDash/EmployerTransactionsView';
import EmployerWorkersView from './EmployerDash/EmployerWorkersView';
import EmployerNotificationsView from './EmployerDash/EmployerNotificationsView';
import { getJobs } from '../data/api';
import {
  getUnreadMessagesForRole,
  getUnreadMessageNotifications,
  subscribeToChatUpdates,
} from '../data/chatService';
import './EmployerLayout.css';


export default function EmployerLayout({
  user,
  activePage = 'dashboard',
  setActivePage,
  onLogout,
  onUserUpdate,
  requireProfile,
  onCompleteProfile,
}) {
  const [currentTab, setCurrentTab] = useState(activePage || 'dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Topbar dropdowns
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Jobs data for transactions & badge counts
  const [jobs, setJobs] = useState([]);
  const [unreadChatMessages, setUnreadChatMessages] = useState([]);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const employerId = String(user?._id || user?.id || 'employer');

  const refreshUnreadChat = () => {
    const unread = getUnreadMessagesForRole('employer', employerId);
    setUnreadChatMessages(unread);
  };

  useEffect(() => {
    refreshUnreadChat();
    const unsub = subscribeToChatUpdates(() => {
      refreshUnreadChat();
    });
    return unsub;
  }, [employerId]);

  useEffect(() => {
    getJobs()
      .then(res => {
        if (res.success && Array.isArray(res.jobs)) {
          setJobs(res.jobs);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activePage && activePage !== currentTab) {
      setCurrentTab(activePage);
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

  // Compute stats for badges
  const totalApplicants = jobs.reduce((s, j) => s + (j.applications?.length || 0), 0);
  const unreadChatCount = unreadChatMessages.length;
  const employerName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employer';
  const initials = employerName
    ? employerName.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : 'EM';

  const [jobsFilter, setJobsFilter] = useState('all');
  const [workersFilter, setWorkersFilter] = useState('all');
  const [selectedJobIdForApplicants, setSelectedJobIdForApplicants] = useState('all');
  const [selectedWorkerContactForMessages, setSelectedWorkerContactForMessages] = useState(null);

  const handleNav = (tabId, extraData = null) => {
    if (tabId === 'myjobs') {
      setJobsFilter(typeof extraData === 'string' ? extraData : extraData?.filter || 'all');
    }
    if (tabId === 'workers') {
      setWorkersFilter(typeof extraData === 'string' ? extraData : extraData?.filter || 'all');
    }
    if (tabId === 'applicants') {
      if (extraData?.selectedJobId) {
        setSelectedJobIdForApplicants(extraData.selectedJobId);
      } else if (typeof extraData === 'string') {
        setSelectedJobIdForApplicants(extraData);
      } else {
        setSelectedJobIdForApplicants('all');
      }
    }
    if (tabId === 'messages') {
      if (extraData) {
        setSelectedWorkerContactForMessages(extraData);
      }
    }
    setCurrentTab(tabId);
    if (setActivePage) setActivePage(tabId);
    setMobileDrawerOpen(false);
  };

  // Nav Item list as strictly specified in User Request
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'postjob', label: 'Post Job', icon: '📝' },
    { id: 'myjobs', label: 'My Jobs', icon: '💼', badge: jobs.length > 0 ? jobs.length : null },
    { id: 'applicants', label: 'Applicants', icon: '👥', badge: totalApplicants > 0 ? totalApplicants : null },
    { id: 'workers', label: 'Workers', icon: '👷' },
    { id: 'transactions', label: 'Payments', icon: '💳' },
    { id: 'messages', label: 'Messages', icon: '💬', badge: unreadChatCount > 0 ? unreadChatCount : null },
    { id: 'trust', label: 'Trust & Safety', icon: '🛡️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: 3 + unreadChatCount },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];


  // Derive transactions for the full view
  const derivedTransactions = React.useMemo(() => {
    const list = [];
    jobs.forEach(j => {
      if (Array.isArray(j.applications)) {
        j.applications.forEach((app, i) => {
          const person = app.applicant;
          const name = typeof person === 'object' ? (person.name || 'Worker') : 'Worker';
          const rawPay = String(j.pay || '850').replace(/[^0-9]/g, '') || '850';
          const amountNum = parseInt(rawPay, 10);
          list.push({
            id: `TXN-WL-${7000 + i}`,
            workerName: name,
            jobTitle: j.title,
            amount: `₹${amountNum.toLocaleString()}`,
            amountRaw: amountNum,
            date: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Today',
            status: app.status === 'accepted' || app.status === 'hired' ? 'Completed' : 'Pending',
          });
        });
      }
    });
    if (list.length === 0) {
      list.push(
        { id: 'TXN-WL-7402', workerName: 'Ramesh Verma', jobTitle: 'Senior Catering Assistant', amount: '₹950', amountRaw: 950, date: 'Yesterday', status: 'Completed' },
        { id: 'ESC-WL-7391', workerName: 'Suresh Kumar', jobTitle: 'Commercial Chauffeur Driver', amount: '₹1,200', amountRaw: 1200, date: '24 Sep 2026', status: 'Pending' },
        { id: 'TXN-WL-7288', workerName: 'Anil Yadav', jobTitle: 'Event Logistics Handler', amount: '₹850', amountRaw: 850, date: '21 Sep 2026', status: 'Completed' },
        { id: 'TXN-WL-7115', workerName: 'Vikram Joshi', jobTitle: 'Deep Cleaning Specialist', amount: '₹750', amountRaw: 750, date: '18 Sep 2026', status: 'Failed' }
      );
    }
    return list;
  }, [jobs]);

  // Derive workers for workers view
  const derivedWorkers = React.useMemo(() => {
    const map = new Map();
    jobs.forEach(j => {
      if (Array.isArray(j.applications)) {
        j.applications.forEach(app => {
          const p = app.applicant;
          if (typeof p === 'object' && p._id && !map.has(p._id)) {
            map.set(p._id, {
              id: p._id,
              name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Worker',
              location: p.location || j.location || 'Bangalore, India',
              skills: p.skills || [{ name: j.department || 'Labour' }],
              trustScore: p.trustScore || 88,
              isVerified: p.isVerified ?? true,
              status: app.status,
            });
          }
        });
      }
    });
    if (map.size === 0) {
      return [
        { id: 'w-1', name: 'Rahul Sharma', location: 'Bangalore, India', skills: [{ name: 'Catering' }, { name: 'Hospitality' }], trustScore: 92, isVerified: true, status: 'accepted' },
        { id: 'w-2', name: 'Amit Kumar', location: 'Bangalore, India', skills: [{ name: 'Driving' }, { name: 'Logistics' }], trustScore: 88, isVerified: true, status: 'pending' },
        { id: 'w-3', name: 'Manjunath Gowda', location: 'Mysore, India', skills: [{ name: 'Deep Cleaning' }], trustScore: 95, isVerified: true, status: 'accepted' },
        { id: 'w-4', name: 'Deepak Verma', location: 'Bangalore, India', skills: [{ name: 'Delivery' }], trustScore: 84, isVerified: false, status: 'pending' }
      ];
    }
    return Array.from(map.values());
  }, [jobs]);

  const renderContent = () => {
    switch (currentTab) {
      case 'postjob':
        return <PostJob user={user} onNavigate={handleNav} />;
      
      case 'applicants':
        return (
          <div className="emp-dash-root">
            <Applicants
              user={user}
              initialSelectedJobId={selectedJobIdForApplicants}
              onNavigate={handleNav}
            />
          </div>
        );

      case 'myjobs':
        return (
          <div className="emp-dash-root">
            <MyJobs
              user={user}
              onNavigate={handleNav}
              initialFilter={jobsFilter}
            />
          </div>
        );

      case 'workers':
        return (
          <div className="emp-dash-root">
            <EmployerWorkers
              user={user}
              onNavigate={handleNav}
              initialFilter={workersFilter}
            />
          </div>
        );

      case 'transactions':
        return (
          <div className="emp-dash-root">
            <EmployerTransactionsView
              employerUser={user}
              isModal={false}
            />
          </div>
        );

      case 'messages':
        return (
          <div className="emp-dash-root">
            <EmployerMessages
              user={user}
              activeWorkerContact={selectedWorkerContactForMessages}
              onNavigate={handleNav}
            />
          </div>
        );

      case 'trust':
        return <TrustPage user={user} />;

      case 'notifications': {
        const chatNotifs = getUnreadMessageNotifications('employer', employerId);
        const combinedNotifs = [
          ...chatNotifs,
          { id: 'sys-1', title: 'New application received', message: 'Candidate applied for your active listing.', time: '10m ago', category: 'Hiring', icon: '👥', unread: true },
          { id: 'sys-2', title: 'Worker hired & deployed', message: 'Work contract confirmed. Escrow secured.', time: '1h ago', category: 'Contract', icon: '🤝', unread: true },
          { id: 'sys-3', title: 'Payment completed', message: '₹950 released to worker bank account.', time: '4h ago', category: 'Payment', icon: '💳', unread: false },
          { id: 'sys-4', title: 'Payment pending confirmation', message: 'Escrow amount ₹1,200 awaiting job sign-off.', time: '1d ago', category: 'Escrow', icon: '⏳', unread: false },
          { id: 'sys-5', title: 'Identity verification confirmed', message: 'Business KYC successfully verified by WorkLink AI.', time: '2d ago', category: 'Security', icon: '🛡️', unread: false },
        ];

        return (
          <div className="emp-dash-root">
            <EmployerNotificationsView
              isModal={false}
              notifications={combinedNotifs}
              onNotificationClick={(notif) => {
                if (notif.type === 'message') {
                  handleNav('messages', {
                    workerId: notif.senderId,
                    workerName: notif.senderName,
                    jobId: notif.jobId,
                    jobTitle: notif.jobTitle,
                  });
                }
              }}
            />
          </div>
        );
      }


      case 'profile':
      case 'reviews':
        return (
          <div className="emp-dash-root">
            <EmployerProfile
              user={user}
              onUserUpdate={onUserUpdate}
              onNavigate={handleNav}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="emp-dash-root">
            <EmployerSettings
              user={user}
              onUserUpdate={onUserUpdate}
              onLogout={onLogout}
              onNavigate={handleNav}
            />
          </div>
        );


      case 'dashboard':
      default:
        return (
          <EmployerDash
            user={user}
            onNavigate={handleNav}
            onCompleteProfile={onCompleteProfile || (() => requireProfile && requireProfile('complete your profile', () => {}))}
          />
        );
    }
  };

  return (
    <div className={`emp-layout ${collapsed ? 'collapsed' : ''}`}>
      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="emp-drawer-overlay" onClick={() => setMobileDrawerOpen(false)} />
      )}

      {/* ── Left Sidebar ── */}
      <aside className={`emp-sidebar ${collapsed ? 'collapsed' : ''} ${mobileDrawerOpen ? 'drawer-open' : ''}`}>
        {/* Brand Header */}
        <div className="emp-sidebar-header">
          <div className="emp-brand" onClick={() => handleNav('dashboard')}>
            <div className="emp-brand-logo">W</div>
            {!collapsed && (
              <div className="emp-brand-info">
                <span className="emp-brand-name">WorkLink</span>
                <span className="emp-brand-badge">EMPLOYER</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            className="emp-collapse-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? '▶' : '◀'}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="emp-close-drawer-btn mobile-only"
            onClick={() => setMobileDrawerOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="emp-sidebar-nav">
          <div className="emp-nav-section-label">{!collapsed && 'MENU'}</div>
          {NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`emp-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <span className="emp-nav-icon">{item.icon}</span>
                {!collapsed && <span className="emp-nav-label">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="emp-nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="emp-sidebar-footer">
          <button
            type="button"
            className="emp-nav-item emp-logout-btn"
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
          >
            <span className="emp-nav-icon">🚪</span>
            {!collapsed && <span className="emp-nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Layout Wrapper ── */}
      <div className="emp-main-wrapper">
        {/* ── Top Bar ── */}
        <header className="emp-topbar">
          <div className="emp-topbar-left">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="emp-hamburger-btn mobile-only"
              onClick={() => setMobileDrawerOpen(true)}
            >
              ☰
            </button>

            {/* Topbar Search */}
            <div className="emp-topbar-search">
              <span className="emp-topbar-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search jobs, applicants, workers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleNav('workers');
                  }
                }}
              />
              <span className="emp-search-kbd">⌘K</span>
            </div>
          </div>

          <div className="emp-topbar-right">
            {/* Quick Post Job Button */}
            <button
              type="button"
              className="emp-topbar-post-btn desktop-only"
              onClick={() => handleNav('postjob')}
            >
              ➕ Post Job
            </button>

            {/* Message Icon with Unread Badge */}
            <button
              type="button"
              className="emp-topbar-icon-btn"
              onClick={() => handleNav('messages')}
              title="Messages"
              style={{ position: 'relative' }}
            >
              💬
              {unreadChatCount > 0 && (
                <span className="emp-notif-bell-badge">{unreadChatCount}</span>
              )}
            </button>

            {/* Notification Bell */}
            <div className="emp-notif-dropdown-wrap" ref={notifRef}>
              <button
                type="button"
                className="emp-topbar-icon-btn"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                title="Notifications"
              >
                🔔
                {(unreadChatCount > 0 || 3 > 0) && (
                  <span className="emp-notif-bell-badge">{3 + unreadChatCount}</span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="emp-topbar-notif-popover">
                  <div className="notif-popover-header">
                    <strong>Notifications</strong>
                    <span className="emp-notif-count-badge">{3 + unreadChatCount} New</span>
                  </div>
                  <div className="notif-popover-list">
                    {/* Real-time Unread Chat Messages */}
                    {unreadChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="notif-popover-item unread"
                        style={{ cursor: 'pointer', background: '#eff6ff' }}
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          handleNav('messages', {
                            workerId: msg.senderId,
                            workerName: msg.senderName,
                            jobId: msg.jobId,
                            jobTitle: msg.jobTitle,
                          });
                        }}
                      >
                        <span style={{ fontSize: 16 }}>💬</span>
                        <div>
                          <strong>New message from {msg.senderName}</strong>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}

                    <div className="notif-popover-item unread">
                      <span>👥</span>
                      <div>
                        <strong>New application received</strong>
                        <p>A candidate applied to your active job listing.</p>
                      </div>
                    </div>
                    <div className="notif-popover-item unread">
                      <span>🤝</span>
                      <div>
                        <strong>Worker hired</strong>
                        <p>Shift contract active & verified.</p>
                      </div>
                    </div>
                    <div className="notif-popover-item">
                      <span>💳</span>
                      <div>
                        <strong>Payment completed</strong>
                        <p>₹950 released to worker bank account.</p>
                      </div>
                    </div>
                  </div>
                  <button
                    className="notif-popover-footer-btn"
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


            {/* Employer Profile & Dropdown */}
            <div className="emp-profile-dropdown-wrap" ref={profileRef}>
              <div
                className="emp-topbar-profile-trigger"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="emp-topbar-avatar">{initials}</div>
                <div className="emp-topbar-user-info desktop-only">
                  <span className="emp-topbar-name">{employerName}</span>
                  <span
                    className="emp-topbar-role"
                    style={{
                      color: user?.isVerified ? '#10b981' : user?.profileComplete ? '#3b82f6' : '#f59e0b',
                      fontWeight: 600,
                    }}
                  >
                    {user?.isVerified
                      ? 'Verified Employer'
                      : user?.profileComplete
                      ? 'Verification Pending'
                      : 'Profile Incomplete'}
                  </span>
                </div>
                <span className="emp-dropdown-caret">▼</span>
              </div>

              {profileDropdownOpen && (
                <div className="emp-profile-menu">
                  <div className="emp-menu-header">
                    <strong className="emp-menu-name">{employerName}</strong>
                    <span className="emp-menu-email">{user?.email || 'employer@worklink.com'}</span>
                    <div className="emp-menu-trust-badge">
                      🛡️ Trust Score: <strong>{user?.trustScore || 0} pts</strong>
                    </div>
                  </div>
                  <div className="emp-menu-divider" />
                  <button
                    className="emp-menu-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNav('profile');
                    }}
                  >
                    👤 My Profile
                  </button>
                  <button
                    className="emp-menu-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNav('settings');
                    }}
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    className="emp-menu-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNav('trust');
                    }}
                  >
                    🛡️ Trust & Safety
                  </button>
                  <div className="emp-menu-divider" />
                  <button
                    className="emp-menu-item text-danger"
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

        {/* ── Main View Content ── */}
        <main className="emp-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

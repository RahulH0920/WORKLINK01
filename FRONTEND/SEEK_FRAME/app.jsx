import { useState, useEffect } from 'react';
import { logoutUser, getStoredUser, getStoredToken, getMe } from './data/api';

import Sidebar from './components/Sidebar/Sidebar';
import Topbar from './components/Topbar/Topbar';
import ProfileNudge from './components/ProfileNudge/ProfileNudge';
import ProfileWizardModal from './components/ProfileWizard/ProfileWizardModal';
import useProfileGate from './components/ProfileWizard/useProfileGate';

// ── Shared pages (both roles) ──
import Landing from './pages/Landing/Landing';
import AuthPage from './pages/Auth/AuthPage';
import AdminLogin from './ADMIN/pages/AdminLogin';
import AdminLayout from './ADMIN/pages/AdminLayout';

// ── Seeker pages ──
import Dashboard from './seeker/Dashboard/Dashboard';
import JobsPage from './seeker/Jobs/JobsPage';
import ProfilePage from './seeker/Profile/ProfilePage';
import TrustPage from './seeker/Trust/TrustPage';
import MessagesPage from './seeker/Messages/MessagesPage';

// ── Employer pages ──
import EmployerLayout from './employer/EmployerLayout';
import EmployerDash from './employer/EmployerDash/EmployerDash';
import PostJob from './employer/PostJob/PostJob';
import Applicants from './employer/Applicants/Applicants';

// ── Worker layout ──
import WorkerLayout from './worker/WorkerLayout';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  jobs: 'Browse Jobs',
  postjob: 'Post a Job',
  applicants: 'My Applicants',
  profile: 'My Profile',
  reviews: 'My Reviews',
  messages: 'Messages',
  trust: 'Trust Engine',
  admin: 'Admin Panel',
};

export default function App() {
  const [page, setPage] = useState('landing');
  const [role, setRole] = useState('seeker');
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  const { showWizard, pendingAction, requireProfile, onWizardComplete, onWizardClose } = useProfileGate(user);

  /* ── Session persistence: auto-login on refresh ── */
  useEffect(() => {
    const token = getStoredToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
      setRole(stored.role || 'seeker');
      if (stored.role === 'admin' || window.location.pathname.startsWith('/admin')) {
        setPage(stored.role === 'admin' ? 'admin' : 'admin-login');
      } else {
        setPage('dashboard');
      }
      // Silently refresh user data from server
      getMe().then(res => {
        if (res.success) {
          setUser(res.user);
          setRole(res.user.role || 'seeker');
          if (res.user.role === 'admin') setPage('admin');
          localStorage.setItem('wl_user', JSON.stringify(res.user));
        }
      }).catch(() => {
        // Token expired — clear and stay on landing
        logoutUser();
        setUser(null);
        setPage(window.location.pathname.startsWith('/admin') ? 'admin-login' : 'landing');
      });
    } else {
      if (window.location.pathname.startsWith('/admin')) {
        setPage('admin-login');
      }
    }
    setRestoring(false);
  }, []);

  /* ── Loading screen while restoring session ── */
  if (restoring) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--accent)' }}>W</span>orkLink
          </div>
          <div className="text-muted">Loading…</div>
        </div>
      </div>
    );
  }

  if (page === 'landing') {
    return <Landing onNavigate={setPage} />;
  }

  if (page === 'login' || page === 'register') {
    return <AuthPage mode={page} onNavigate={setPage} onRoleSelect={setRole} role={role} onUserSet={setUser} />;
  }
  if (page === 'admin-login') {
    return (
      <AdminLogin
        onLogin={(adminUser) => {
          setUser(adminUser);
          setRole('admin');
          setPage('admin');
        }}
        onBack={() => setPage('landing')}
      />
    );
  }

  const renderPage = () => {
  switch (page) {
    case 'jobs':
      return (
        <JobsPage
          user={user}
          requireProfile={requireProfile}
          initialDepartment={selectedDepartment}
          onSelectDepartment={setSelectedDepartment}
        />
      );

    case 'postjob':
      return <PostJob user={user} onNavigate={setPage} />;

    case 'applicants':
      return <Applicants user={user} />;

    case 'profile':
      return (
        <ProfilePage
          activeSidebarPage="profile"
          user={user}
          onUserUpdate={setUser}
        />
      );

    case 'reviews':
      return (
        <ProfilePage
          activeSidebarPage="reviews"
          user={user}
          onUserUpdate={setUser}
        />
      );

    case 'messages':
      return (
        <MessagesPage
          user={user}
          requireProfile={requireProfile}
        />
      );

    case 'trust':
      return <TrustPage user={user} />;

    case 'dashboard':
    default:
      if (role === 'employer') {
        return <EmployerDash user={user} onNavigate={setPage} />;
      }

      return (
        <Dashboard
          user={user}
          requireProfile={requireProfile}
          onNavigate={setPage}
          onSelectDepartment={(dept) => {
            setSelectedDepartment(dept);
            setPage('jobs');
          }}
        />
      );
  }
};

  if (page === 'admin') {
    return (
      <AdminLayout
        onLogout={() => {
          logoutUser();
          setUser(null);
          setPage('landing');
          setRole('seeker');
        }}
      />
    );
  }

  if (role === 'employer') {
    return (
      <>
        <EmployerLayout
          user={user}
          activePage={page}
          setActivePage={setPage}
          onLogout={() => {
            logoutUser();
            setUser(null);
            setPage('landing');
            setRole('seeker');
          }}
          onUserUpdate={(updated) => {
            setUser(updated);
            if (updated) localStorage.setItem('wl_user', JSON.stringify(updated));
          }}
          requireProfile={requireProfile}
          onCompleteProfile={() => requireProfile('complete your profile', () => {})}
        />

        {showWizard && (
          <ProfileWizardModal
            user={user}
            actionName={pendingAction?.name}
            onComplete={onWizardComplete}
            onUserUpdate={(updated) => {
              setUser(updated);
              if (updated) localStorage.setItem('wl_user', JSON.stringify(updated));
            }}
            onClose={onWizardClose}
          />
        )}
      </>
    );
  }

return (
  <>
    <WorkerLayout
      user={user}
      activePage={page}
      setActivePage={setPage}
      onLogout={() => {
        logoutUser();
        setUser(null);
        setPage('landing');
        setRole('seeker');
      }}
      onUserUpdate={(updated) => {
        setUser(updated);
        if (updated) localStorage.setItem('wl_user', JSON.stringify(updated));
      }}
      requireProfile={requireProfile}
      onCompleteProfile={() => requireProfile('complete your profile', () => {})}
      selectedDepartment={selectedDepartment}
      onSelectDepartment={setSelectedDepartment}
    />

    {showWizard && (
      <ProfileWizardModal
        user={user}
        actionName={pendingAction?.name}
        onComplete={onWizardComplete}
        onUserUpdate={(updated) => {
          setUser(updated);
          if (updated) localStorage.setItem('wl_user', JSON.stringify(updated));
        }}
        onClose={onWizardClose}
      />
    )}
  </>
);
}
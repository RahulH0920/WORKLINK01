import { useState, useEffect } from 'react';
import { logoutUser, getStoredUser, getStoredToken, getMe } from './data/api';

import Sidebar from './components/Sidebar/Sidebar';
import Topbar from './components/Topbar/Topbar';
import ProfileNudge from './components/ProfileNudge/ProfileNudge';
import ProfileWizardModal from './components/ProfileWizard/ProfileWizardModal';
import useProfileGate from './components/ProfileWizard/useProfileGate';

// ── Shared pages ──
import Landing from './pages/Landing/Landing';
import AuthPage from './pages/Auth/AuthPage';
import AdminPage from './pages/Admin/AdminPage';
import TermsOfService from './pages/Legal/TermsOfService';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import CookiePolicy from './pages/Legal/CookiePolicy';

// ── Seeker pages ──
import Dashboard from './seeker/Dashboard/Dashboard';
import JobsPage from './seeker/Jobs/JobsPage';
import ProfilePage from './seeker/Profile/ProfilePage';
import TrustPage from './seeker/Trust/TrustPage';
import MessagesPage from './seeker/Messages/MessagesPage';

// ── Employer pages ──
import EmployerDash from './employer/EmployerDash/EmployerDash';
import PostJob from './employer/PostJob/PostJob';
import Applicants from './employer/Applicants/Applicants';

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
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('seeker');
  const [restoring, setRestoring] = useState(true);

  const { showWizard, pendingAction, requireProfile, onWizardComplete, onWizardClose } = useProfileGate(user);

  /* ── Session persistence: auto-login on refresh ── */
  useEffect(() => {
    const token = getStoredToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
      setRole(stored.role || 'seeker');
      setPage('dashboard');
      // Silently refresh user data from server
      getMe().then(res => {
        if (res.success) {
          setUser(res.user);
          setRole(res.user.role || 'seeker');
          localStorage.setItem('wl_user', JSON.stringify(res.user));
        }
      }).catch(() => {
        logoutUser();
        setUser(null);
        setPage('landing');
      });
    }
    setRestoring(false);
  }, []);

  const handleUserSet = (userData) => {
    setUser(userData);
    if (userData?.role) {
      setRole(userData.role);
    }
  };

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
    return (
      <AuthPage
        mode={page}
        onNavigate={setPage}
        onRoleSelect={setRole}
        role={role}
        onUserSet={handleUserSet}
      />
    );
  }

  if (page === 'terms') return <TermsOfService onNavigate={setPage} />;
  if (page === 'privacy') return <PrivacyPolicy onNavigate={setPage} />;
  if (page === 'cookies') return <CookiePolicy onNavigate={setPage} />;

  const renderPage = () => {
    switch (page) {
      // Employer-specific
      case 'postjob':
        return <PostJob user={user} onNavigate={setPage} />;
      case 'applicants':
        return <Applicants user={user} />;
      
      // Seeker-specific
      case 'jobs':
        return <JobsPage user={user} requireProfile={requireProfile} />;
      
      // Shared across roles
      case 'profile':
        return <ProfilePage activeSidebarPage="profile" user={user} onUserUpdate={setUser} />;
      case 'reviews':
        return <ProfilePage activeSidebarPage="reviews" user={user} onUserUpdate={setUser} />;
      case 'messages':
        return <MessagesPage user={user} requireProfile={requireProfile} />;
      case 'trust':
        return <TrustPage user={user} />;
      case 'admin':
        return <AdminPage />;

      // Role-aware Dashboard
      case 'dashboard':
      default:
        if (role === 'employer') {
          return <EmployerDash user={user} onNavigate={setPage} />;
        }
        return <Dashboard user={user} requireProfile={requireProfile} onNavigate={setPage} />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={page}
        setActivePage={setPage}
        onBackHome={() => { logoutUser(); setUser(null); setPage('landing'); }}
        role={role}
      />
      <div className="main">
        <Topbar 
          title={PAGE_TITLES[page] || 'WorkLink'} 
          user={user}
          onNavMessage={() => setPage('messages')} 
          onSignOut={() => { logoutUser(); setUser(null); setPage('landing'); }}
          onViewProfile={() => setPage('profile')}
        />

        {/* Profile Nudge Banner — shown when profile is incomplete */}
        {page === 'dashboard' && (
          <div style={{ padding: '32px 32px 0' }}>
            <ProfileNudge 
              user={user} 
              onCompleteClick={() => requireProfile('complete your profile', () => {})} 
            />
          </div>
        )}

        {renderPage()}
      </div>

      {/* Profile Wizard Modal — appears when gated action is triggered */}
      {showWizard && (
        <ProfileWizardModal
          user={user}
          actionName={pendingAction?.name}
          onComplete={onWizardComplete}
          onUserUpdate={setUser}
          onClose={onWizardClose}
        />
      )}
    </div>
  );
}
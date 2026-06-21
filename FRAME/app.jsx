import { useState, useEffect } from 'react';
import { logoutUser, getStoredUser, getStoredToken, getMe } from './data/api';

import Sidebar from './components/Sidebar/Sidebar';
import Topbar from './components/Topbar/Topbar';
import ProfileNudge from './components/ProfileNudge/ProfileNudge';
import ProfileWizardModal from './components/ProfileWizard/ProfileWizardModal';
import useProfileGate from './components/ProfileWizard/useProfileGate';

import Landing from './pages/Landing/Landing';
import AuthPage from './pages/Auth/AuthPage';
import Dashboard from './pages/Dashboard/Dashboard';
import EmployerDash from './pages/Employer/EmployerDash';
import PostJob from './pages/Employer/PostJob';
import Applicants from './pages/Employer/Applicants';
import JobsPage from './pages/Jobs/JobsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import TrustPage from './pages/Trust/TrustPage';
import AdminPage from './pages/Admin/AdminPage';
import MessagesPage from './pages/Messages/MessagesPage';

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
        // Token expired — clear and stay on landing
        logoutUser();
        setUser(null);
        setPage('landing');
      });
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

  const renderPage = () => {
    switch (page) {
      case 'jobs':
        return <JobsPage user={user} requireProfile={requireProfile} />;
      case 'postjob':
        return <PostJob user={user} onNavigate={setPage} />;
      case 'applicants':
        return <Applicants user={user} />;
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
      case 'dashboard':
      default:
        // Show employer dashboard for employer role
        if (role === 'employer') {
          return <EmployerDash user={user} onNavigate={setPage} />;
        }
        return <Dashboard user={user} requireProfile={requireProfile} />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={page}
        setActivePage={setPage}
        onBackHome={() => { logoutUser(); setUser(null); setPage('landing'); setRole('seeker'); }}
        role={role}
      />
      <div className="main">
        <Topbar 
          title={PAGE_TITLES[page] || 'WorkLink'} 
          user={user}
          onNavMessage={() => setPage('messages')} 
          onSignOut={() => { logoutUser(); setUser(null); setPage('landing'); setRole('seeker'); }}
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
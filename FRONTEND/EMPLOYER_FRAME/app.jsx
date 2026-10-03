import { useState } from 'react';
import { logoutUser, getStoredUser } from './data/api';

import Sidebar from './components/Sidebar/Sidebar';
import Topbar from './components/Topbar/Topbar';
import ProfileNudge from './components/ProfileNudge/ProfileNudge';
import ProfileWizardModal from './components/ProfileWizard/ProfileWizardModal';
import useProfileGate from './components/ProfileWizard/useProfileGate';

import Landing from './pages/Landing/Landing';
import AuthPage from './pages/Auth/AuthPage';
import Dashboard from './pages/Dashboard/Dashboard';
import JobsPage from './pages/Jobs/JobsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import TrustPage from './pages/Trust/TrustPage';
import AdminPage from './pages/Admin/AdminPage';
import MessagesPage from './pages/Messages/MessagesPage';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  jobs: 'Browse Jobs',
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

  const { showWizard, pendingAction, requireProfile, onWizardComplete, onWizardClose } = useProfileGate(user);

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
import { useState } from 'react';
import './Topbar.css';

export default function Topbar({ title, user, onNavMessage, onSignOut, onViewProfile }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const initials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`
    : '??';

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        <div className="notif">
          <button className="icon-btn" onClick={onNavMessage}>🔔</button>
          <div className="notif-count">3</div>
        </div>
        <button className="icon-btn">⚙️</button>
        
        <div style={{ position: 'relative' }}>
          <div 
            className="avatar" 
            style={{ cursor: 'pointer' }}
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          >
            {initials}
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown card fade-up" style={{ padding: '8px' }}>
              <button 
                className="dropdown-item" 
                onClick={() => { setProfileDropdownOpen(false); onViewProfile(); }}
              >
                View Profile
              </button>
              <button 
                className="dropdown-item text-danger" 
                onClick={() => { setProfileDropdownOpen(false); onSignOut(); }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

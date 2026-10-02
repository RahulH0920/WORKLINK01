import { useState, useEffect, useRef } from 'react';
import './Topbar.css';

export default function Topbar({ title, user, onNavMessage, onSignOut, onViewProfile }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const initials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`
    : '??';

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        <button className="icon-btn" onClick={onNavMessage} title="Messages">💬</button>
        <button className="icon-btn" title="Settings">⚙️</button>
        
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            className="avatar" 
            style={{ cursor: 'pointer' }}
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title={user ? `${user.firstName} ${user.lastName}` : 'Profile'}
          >
            {initials}
          </div>
          {profileDropdownOpen && (
            <div className="profile-dropdown card fade-up" style={{ padding: '8px' }}>
              <div className="dropdown-user-info">
                <div className="dropdown-user-name">{user ? `${user.firstName} ${user.lastName}` : 'User'}</div>
                <div className="dropdown-user-email">{user?.email || ''}</div>
              </div>
              <div className="dropdown-divider" />
              <button 
                className="dropdown-item" 
                onClick={() => { setProfileDropdownOpen(false); onViewProfile(); }}
              >
                👤 View Profile
              </button>
              <button 
                className="dropdown-item text-danger" 
                onClick={() => { setProfileDropdownOpen(false); onSignOut(); }}
              >
                🚪 Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

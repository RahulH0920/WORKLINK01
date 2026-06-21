import { useState, useEffect } from 'react';
import { NAV } from '../../data/constants';
import './Sidebar.css';

export default function Sidebar({ activePage, setActivePage, onBackHome, role = "seeker" }) {
  const filtered = NAV.filter(n => n.roles.includes(role));
  const MAIN_IDS = ["dashboard", "jobs", "postjob", "applicants", "admin"];
  const mainItems = filtered.filter(n => MAIN_IDS.includes(n.id));
  const workItems = filtered.filter(n => !MAIN_IDS.includes(n.id));

  const [profileOpen, setProfileOpen] = useState(activePage === "profile" || activePage === "reviews");

  useEffect(() => {
    if (activePage === "profile" || activePage === "reviews") {
      setProfileOpen(true);
    }
  }, [activePage]);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">W</div>
        <span className="logo-text">WorkLink</span>
      </div>

      <nav className="nav">
        <div className="nav-section">Main</div>
        {mainItems.map(n => (
          <button key={n.id} className={`nav-item ${activePage === n.id ? "active" : ""}`} onClick={() => setActivePage(n.id)}>
            <span className="nav-icon">{n.icon}</span><span>{n.label}</span>
          </button>
        ))}

        <div className="nav-section">Workspace</div>
        {workItems.map(n => {
          if (n.id === "profile") {
            return (
              <div key={n.id}>
                <button
                  className={`nav-item ${(activePage === "profile" || activePage === "reviews") ? "active" : ""}`}
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    if (activePage !== "profile" && activePage !== "reviews") {
                      setActivePage("profile");
                    }
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="nav-icon">{n.icon}</span><span>{n.label}</span>
                  </div>
                  <span style={{ fontSize: '10px', opacity: 0.5 }}>{profileOpen ? '▼' : '▶'}</span>
                </button>
                {profileOpen && (
                  <div style={{ paddingLeft: '44px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', marginBottom: '8px' }}>
                    <div
                      className={`nav-sub-item ${activePage === "profile" ? "active" : ""}`}
                      onClick={() => setActivePage("profile")}
                    >
                      Overview
                    </div>
                    <div
                      className={`nav-sub-item ${activePage === "reviews" ? "active" : ""}`}
                      onClick={() => setActivePage("reviews")}
                    >
                      Reviews
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return (
            <button key={n.id} className={`nav-item ${activePage === n.id ? "active" : ""}`} onClick={() => setActivePage(n.id)}>
              <span className="nav-icon">{n.icon}</span><span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <button className="nav-item" style={{ color: "rgba(255,255,255,.4)" }} onClick={onBackHome}>
          <span className="nav-icon">←</span><span>Back to Home</span>
        </button>
      </div>
    </aside>
  );
}

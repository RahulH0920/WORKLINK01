import React from "react";

const AdminSidebar = ({ activePage, setActivePage, onLogout }) => {
  const mainMenuItems = [
    { name: "Dashboard", icon: "⊞" },
    { name: "Workers", icon: "👥" },
    { name: "Employers", icon: "🏢" },
    { name: "Transactions", icon: "💳" },
    { name: "AI Verification", icon: "🛡️" },
    { name: "Fraud Detection", icon: "🚨" },
    { name: "Trust & Safety", icon: "⚖️" },
    { name: "Jobs", icon: "💼" },
    { name: "Applications", icon: "📄" },
    { name: "Notifications", icon: "🔔" },
    { name: "Reports & Analytics", icon: "📊" },
  ];

  const bottomMenuItems = [
    { name: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="admin-sidebar">
      {/* Brand Header */}
      <div className="admin-logo">
        <div className="admin-logo-brand">
          <div className="logo-icon-svg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6"/>
              <path d="M2 17L12 22L22 17" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2>WorkLink AI</h2>
            <p className="logo-tagline">Secure. Smart. Together.</p>
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <nav className="admin-menu">
        {mainMenuItems.map((item) => {
          const isActive = activePage === item.name;
          return (
            <button
              key={item.name}
              className={`admin-menu-item ${isActive ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              <span className="admin-menu-text">{item.name}</span>
            </button>
          );
        })}

        <div className="menu-divider" />

        {bottomMenuItems.map((item) => {
          const isActive = activePage === item.name;
          return (
            <button
              key={item.name}
              className={`admin-menu-item ${isActive ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              <span className="admin-menu-text">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="admin-sidebar-logout">
        <button
          className="admin-menu-item logout"
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              localStorage.removeItem("wl_token");
              localStorage.removeItem("wl_user");
              window.location.reload();
            }
          }}
        >
          <span className="admin-menu-icon">🚪</span>
          <span className="admin-menu-text">Logout</span>
        </button>
      </div>

      {/* Bottom Promo Card */}
      <div className="sidebar-promo-card">
        <div className="promo-text">
          <strong>Smarter Hiring</strong>
          <span>Safer Communities</span>
        </div>
        <div className="promo-shield-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
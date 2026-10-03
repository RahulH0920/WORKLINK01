import React, { useState } from 'react';
import './EmployerWorkersView.css';

export default function EmployerWorkersView({ workers = [], onSelectWorker, onClose, isModal = true, initialFilter = 'all' }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter); // 'all' | 'verified' | 'hired'

  React.useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      w.name.toLowerCase().includes(q) ||
      (w.location && w.location.toLowerCase().includes(q)) ||
      (w.skills && w.skills.some(s => (typeof s === 'string' ? s : s.name).toLowerCase().includes(q)));
    
    if (filter === 'verified') return matchesSearch && w.isVerified;
    if (filter === 'hired') return matchesSearch && (w.status === 'accepted' || w.status === 'hired');
    return matchesSearch;
  });

  const content = (
    <div className="workers-view-container">
      <div className="workers-header-row">
        <div>
          <h2 className="workers-main-title">👷 Workers & Talent Directory</h2>
          <p className="workers-sub-title">Browse verified skilled labourers, view biometric trust ratings, and inspect credentials.</p>
        </div>
        {isModal && (
          <button className="workers-close-btn" onClick={onClose}>✕</button>
        )}
      </div>

      {/* Search & Filter Header */}
      <div className="workers-toolbar">
        <div className="workers-search-wrap">
          <span className="workers-search-icon">🔍</span>
          <input
            type="text"
            className="workers-search-input"
            placeholder="Search by worker name, city, or skill (e.g. Catering, Driver, Plumber)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="workers-filter-group">
          <button
            className={`workers-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Workers ({workers.length})
          </button>
          <button
            className={`workers-filter-btn ${filter === 'verified' ? 'active' : ''}`}
            onClick={() => setFilter('verified')}
          >
            🛡️ Verified Only
          </button>
          <button
            className={`workers-filter-btn ${filter === 'hired' ? 'active' : ''}`}
            onClick={() => setFilter('hired')}
          >
            🤝 Hired by You
          </button>
        </div>
      </div>

      {/* Grid of Workers */}
      <div className="workers-grid">
        {filtered.length === 0 ? (
          <div className="workers-empty">
            <span style={{ fontSize: 40 }}>🔍</span>
            <h3>No workers found</h3>
            <p>Try searching for a different skill, name, or change filter.</p>
          </div>
        ) : (
          filtered.map((w, idx) => {
            const initials = w.name
              ? w.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
              : 'W';

            return (
              <div key={idx} className="worker-card">
                <div className="worker-card-top">
                  <div className="worker-avatar-wrap">
                    <div className="worker-card-avatar" style={{ background: w.isVerified ? '#10b981' : '#2563eb' }}>
                      {initials}
                    </div>
                    {w.isVerified && (
                      <span className="worker-verified-icon" title="Identity Verified">✓</span>
                    )}
                  </div>

                  <div className="worker-card-score">
                    <span className="worker-score-label">Trust Score</span>
                    <strong className="worker-score-num">{w.trustScore || 85} pts</strong>
                  </div>
                </div>

                <h4 className="worker-card-name">{w.name}</h4>
                <div className="worker-card-location">📍 {w.location || 'Bangalore, India'}</div>

                {/* Skills tags */}
                <div className="worker-skills-list">
                  {w.skills && w.skills.length > 0 ? (
                    w.skills.slice(0, 3).map((s, sIdx) => (
                      <span key={sIdx} className="worker-skill-tag">
                        {typeof s === 'string' ? s : s.name}
                      </span>
                    ))
                  ) : (
                    <span className="worker-skill-tag">General Skilled Labour</span>
                  )}
                </div>

                <div className="worker-card-footer">
                  <span className={`worker-status-badge ${w.isVerified ? 'verified' : 'pending'}`}>
                    {w.isVerified ? '● Verified Worker' : '● In Review'}
                  </span>

                  <button
                    className="worker-view-btn"
                    onClick={() => onSelectWorker && onSelectWorker(w)}
                  >
                    View Profile →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="workers-modal-backdrop" onClick={onClose}>
      <div className="workers-modal-card" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

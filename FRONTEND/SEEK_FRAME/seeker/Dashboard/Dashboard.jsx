import { useState, useEffect } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import JobCard from '../../components/JobCard/JobCard';
import { getJobs, getMyApplications } from '../../data/api';
import './Dashboard.css';

export default function Dashboard({ user, requireProfile, onNavigate, onSelectDepartment }) {
  const userName = user ? (user.name ? user.name.split(' ')[0] : user.firstName || 'there') : 'there';
  const trustScore = user ? user.trustScore : 0;

  /* ── Fetch jobs and seeker's applications ── */
  const [recJobs, setRecJobs] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [deptCounts, setDeptCounts] = useState({
    Catering: 0,
    Driving: 0,
    Cleaning: 0,
    Delivery: 0
  });
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    // Fetch seeker's applications
    getMyApplications()
      .then(res => {
        if (res.success && res.applications) {
          setMyApps(res.applications);
        }
      })
      .catch(() => {});

    getJobs()
      .then(res => {
        if (res.success && res.jobs) {
          const counts = { Catering: 0, Driving: 0, Cleaning: 0, Delivery: 0 };
          res.jobs.forEach(j => {
            if (j.department && counts.hasOwnProperty(j.department)) {
              counts[j.department] += 1;
            }
          });
          setDeptCounts(counts);

          const formatted = res.jobs.slice(0, 3).map(j => ({
            _id: j._id,
            id: j._id,
            title: j.title,
            department: j.department,
            company: j.employer?.name || (j.employer?.firstName
              ? `${j.employer.firstName} ${j.employer.lastName || ''}`.trim()
              : 'Unknown'),
            emoji: '💼',
            type: j.type,
            location: j.location,
            pay: j.pay,
            tags: j.tags || [],
            apps: j.applications?.length || 0,
            posted: new Date(j.createdAt).toLocaleDateString(),
            trust: j.employer?.trustScore || 0,
          }));
          setRecJobs(formatted);
        }
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, []);

  /* ── Category definitions ── */
  const categories = [
    {
      id: 'Catering',
      name: 'Catering',
      icon: '🍽️',
      bgGradient: 'linear-gradient(135deg, rgba(234,88,12,0.06) 0%, rgba(255,255,255,1) 100%)',
      iconBg: 'rgba(234,88,12,0.1)',
      accentColor: '#ea580c'
    },
    {
      id: 'Driving',
      name: 'Driving',
      icon: '🚗',
      bgGradient: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(255,255,255,1) 100%)',
      iconBg: 'rgba(37,99,235,0.1)',
      accentColor: '#2563eb'
    },
    {
      id: 'Cleaning',
      name: 'Cleaning',
      icon: '🧹',
      bgGradient: 'linear-gradient(135deg, rgba(22,163,74,0.06) 0%, rgba(255,255,255,1) 100%)',
      iconBg: 'rgba(22,163,74,0.1)',
      accentColor: '#16a34a'
    },
    {
      id: 'Delivery',
      name: 'Delivery',
      icon: '📦',
      bgGradient: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,1) 100%)',
      iconBg: 'rgba(124,58,237,0.1)',
      accentColor: '#7c3aed'
    },
  ];

  /* ── Derived application statuses ── */
  const acceptedApp = myApps.find(a => a.status === 'accepted');
  const rejectedApp = myApps.find(a => a.status === 'rejected');

  /* ── All stats derived from real user data ── */
  const stats = [
    {
      icon: "💼",
      label: "Applications",
      value: myApps.length > 0 ? String(myApps.length) : "0",
      change: acceptedApp
        ? "🎉 Application Accepted!"
        : (myApps.length > 0 ? `${myApps.length} active application${myApps.length > 1 ? 's' : ''}` : "Apply to jobs to track"),
      up: true,
      bg: "rgba(37,99,235,.08)",
      color: "var(--accent)"
    },
    { icon: "🛡️", label: "Trust Score", value: String(trustScore), change: trustScore > 0 ? "Score active" : "Complete profile to build", up: true, bg: "rgba(22,163,74,.08)", color: "var(--green)" },
    { icon: "✅", label: "Profile Status", value: user?.profileComplete ? "Complete" : "Incomplete", change: user?.profileComplete ? "All set!" : "Finish setup", up: user?.profileComplete, bg: "rgba(234,88,12,.08)", color: "var(--orange)" },
  ];

  /* ── Trust breakdown from real user fields ── */
  const hasDocuments = user?.documents?.length > 0;
  const isVerified = user?.isVerified;
  const trustSignals = [
    { label: "Profile Completion", val: user?.profileComplete ? 100 : 0, color: "var(--green)" },
    { label: "Document Verification", val: isVerified ? 100 : (hasDocuments ? 50 : 0), color: "var(--accent)" },
    { label: "Trust Score", val: trustScore, color: "var(--orange)" },
  ];

  return (
    <div className="page dashboard-page-wrapper">
      
      {/* ── Premium Hero Welcome Banner ── */}
      <div className="dashboard-hero-card">
        <div className="hero-content">
          <div className="hero-badge-row">
            <span className="hero-status-pill">
              <span className="hero-status-dot" />
              {trustScore > 0 ? 'Verified Worker Portal' : 'WorkLink Seeker Portal'}
            </span>
            <span className="hero-date-pill">
              📅 {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="hero-welcome-title">
            Welcome back, <span className="hero-name-highlight">{userName}</span>! 👋
          </h1>
          <p className="hero-subtitle">
            {trustScore > 0
              ? 'Your profile is active. Browse top verified gig opportunities matched for your skills.'
              : 'Complete your profile verification to unlock premium job applications and boost employer trust.'}
          </p>
        </div>
        <div className="hero-quick-actions">
          <button
            className="hero-primary-btn"
            onClick={() => onNavigate && onNavigate('jobs')}
          >
            🔍 Browse Verified Jobs
          </button>
          {!user?.profileComplete && (
            <button
              className="hero-secondary-btn"
              onClick={() => requireProfile && requireProfile('complete your profile', () => {})}
            >
              📄 Complete Profile
            </button>
          )}
        </div>
      </div>

      {/* Accepted Application Banner */}
      {acceptedApp && (
        <div className="accepted-banner-card fade-up">
          <div className="banner-icon-bg">🎉</div>
          <div className="banner-text-content">
            <h3>Application Accepted!</h3>
            <p>
              Your application for <strong>{acceptedApp.job?.title || 'the job'}</strong> has been accepted by the employer.
            </p>
          </div>
        </div>
      )}

      {/* Rejected Application Notice */}
      {!acceptedApp && rejectedApp && (
        <div className="rejected-banner-card fade-up">
          <div className="banner-icon-bg">ℹ️</div>
          <div className="banner-text-content">
            <h4>Application Status Update</h4>
            <p>
              Your application for <strong>{rejectedApp.job?.title || 'the job'}</strong> was marked as rejected.
            </p>
          </div>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="dashboard-stats-grid fade-up">
        {stats.map((s, idx) => (
          <div key={s.label} className="dash-stat-card" style={{ animationDelay: `${idx * 0.08}s` }}>
            <div className="dash-stat-top">
              <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <span className="dash-stat-trend">{s.up ? '↑ Active' : '• Status'}</span>
            </div>
            <div className="dash-stat-val">{s.value}</div>
            <div className="dash-stat-lbl">{s.label}</div>
            <div className={`dash-stat-change ${s.up ? 'up' : 'down'}`}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Trust Score & Quick Actions Row */}
      <div className="dashboard-two-col-grid fade-up-2">
        
        {/* Polished Trust Score Card */}
        <div className="dash-card trust-score-card">
          <div className="trust-card-header">
            <div>
              <h2 className="dash-card-title">Trust Engine Status</h2>
              <p className="dash-card-subtitle">Real-time profile credibility & verification rating</p>
            </div>
            <span className="trust-score-badge">
              {trustScore >= 75 ? '🟢 High Trust' : '🟡 Build Score'}
            </span>
          </div>

          <div className="trust-card-body">
            <div className="trust-ring-container">
              <TrustRing score={trustScore} size={130} stroke={10} />
            </div>

            <div className="trust-signals-wrapper">
              {trustSignals.map((p) => (
                <div key={p.label} className="trust-progress-item">
                  <div className="trust-progress-header">
                    <span>{p.label}</span>
                    <strong>{p.val}%</strong>
                  </div>
                  <div className="trust-progress-track">
                    <div
                      className="trust-progress-fill"
                      style={{ width: `${p.val}%`, background: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="dash-card quick-actions-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Quick Actions</h2>
            <p className="dash-card-subtitle">Essential steps for your gig journey</p>
          </div>

          <div className="quick-actions-list">
            {[
              { icon: '📄', label: 'Complete Profile', desc: 'Upload documents & add skills', done: user?.profileComplete, action: () => requireProfile && requireProfile('complete your profile', () => {}) },
              { icon: '💼', label: 'Browse Jobs', desc: 'Find verified gig opportunities', done: false, action: () => onNavigate && onNavigate('jobs') },
              { icon: '🤖', label: 'View Trust Engine', desc: 'Understand your trust score', done: false, action: () => onNavigate && onNavigate('trust') },
            ].map((a) => (
              <div
                key={a.label}
                className={`quick-action-item ${a.done ? 'completed' : ''}`}
                onClick={a.action}
              >
                <div className="quick-action-icon">{a.done ? '✅' : a.icon}</div>
                <div className="quick-action-info">
                  <div className="quick-action-title">{a.label}</div>
                  <div className="quick-action-desc">{a.done ? 'Completed & verified' : a.desc}</div>
                </div>
                <div className="quick-action-arrow">→</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Premium Category Marketplace Grid */}
      <div className="dept-section fade-up-2">
        <div className="section-header-row">
          <div>
            <h2 className="section-main-title">Find Work by Category</h2>
            <p className="section-main-subtitle">Explore high-demand gig roles in your preferred department</p>
          </div>
        </div>

        <div className="dept-grid">
          {categories.map((cat, idx) => {
            const count = deptCounts[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="dept-card"
                style={{
                  background: cat.bgGradient,
                  animationDelay: `${0.08 * (idx + 1)}s`
                }}
                onClick={() => {
                  if (onSelectDepartment) {
                    onSelectDepartment(cat.id);
                  } else if (onNavigate) {
                    onNavigate('jobs');
                  }
                }}
              >
                <div className="dept-card-header">
                  <div className="dept-icon-wrapper" style={{ background: cat.iconBg }}>
                    <span className="dept-icon">{cat.icon}</span>
                  </div>
                  <div className="dept-arrow-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </div>

                <div className="dept-card-body">
                  <div className="dept-name">{cat.name}</div>
                  <div className="dept-count-badge">
                    <span className="dept-count-num" style={{ color: cat.accentColor }}>{jobsLoading ? '…' : count}</span>
                    <span>{count === 1 ? 'active job' : 'active jobs'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Jobs Section */}
      <div className="recommended-jobs-section fade-up-3">
        <div className="section-header-row">
          <div>
            <h2 className="section-main-title">Recommended Jobs</h2>
            <p className="section-main-subtitle">Handpicked opportunities from verified employers</p>
          </div>
          <button
            className="view-all-jobs-btn"
            onClick={() => onNavigate && onNavigate('jobs')}
          >
            View All Jobs →
          </button>
        </div>

        {jobsLoading ? (
          <div className="dash-loading-card">Loading recommended jobs…</div>
        ) : recJobs.length > 0 ? (
          <div className="grid-3 rec-jobs-grid">
            {recJobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <div className="dash-empty-card">
            No jobs available yet. Check back soon!
          </div>
        )}
      </div>

    </div>
  );
}

import TrustRing from '../../components/TrustRing/TrustRing';
import JobCard from '../../components/JobCard/JobCard';
import { JOBS } from '../../data/constants';
import './Dashboard.css';

export default function Dashboard({ user, requireProfile }) {
  /* Use real user data if available, otherwise default to zeros for new users */
  const isNewUser = !user || user.trustScore <= 0;
  const userName = user ? user.firstName : 'there';
  const trustScore = user ? user.trustScore : 0;

  const stats = isNewUser
    ? [
        { icon: "💼", label: "Applications", value: "0", change: "Get started!", up: true, bg: "rgba(91,108,248,.1)", color: "var(--indigo)" },
        { icon: "✅", label: "Jobs Completed", value: "0", change: "No jobs yet", up: true, bg: "rgba(0,201,167,.1)", color: "var(--teal)" },
        { icon: "⭐", label: "Avg. Rating", value: "—", change: "No ratings yet", up: true, bg: "rgba(255,181,71,.1)", color: "var(--amber)" },
      ]
    : [
        { icon: "💼", label: "Applications", value: "7", change: "+2 today", up: true, bg: "rgba(91,108,248,.1)", color: "var(--indigo)" },
        { icon: "✅", label: "Jobs Completed", value: "14", change: "98% rate", up: true, bg: "rgba(0,201,167,.1)", color: "var(--teal)" },
        { icon: "⭐", label: "Avg. Rating", value: "4.8", change: "+0.2 this month", up: true, bg: "rgba(255,181,71,.1)", color: "var(--amber)" },
      ];

  const trustSignals = isNewUser
    ? [
        { label: "Average Rating", val: 0, color: "var(--teal)" },
        { label: "Completion Rate", val: 0, color: "var(--indigo)" },
        { label: "Responsiveness", val: 0, color: "var(--amber)" },
      ]
    : [
        { label: "Average Rating", val: 96, color: "var(--teal)" },
        { label: "Completion Rate", val: 98, color: "var(--indigo)" },
        { label: "Responsiveness", val: 79, color: "var(--amber)" },
      ];

  const bars = isNewUser ? [0, 0, 0, 0, 0, 0, 0] : [40, 65, 55, 80, 70, 90, 75];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome{isNewUser ? `, ${userName}! Start exploring jobs to build your profile.` : ` back, ${userName}! Here's what's happening today.`}</p>
      </div>

      <div className="grid-4 fade-up" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-change ${s.up ? "up" : "down"}`}>{s.change}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2 fade-up-2" style={{ marginBottom: 24 }}>
        {/* Trust Score */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <TrustRing score={trustScore} />
          <div>
            <div className="card-title">Your Trust Score</div>
            <div className="card-sub" style={{ marginBottom: 16 }}>
              {isNewUser ? 'Complete jobs to improve your score' : 'Based on 3 performance signals'}
            </div>
            {trustSignals.map(p => (
              <div key={p.label} className="progress-wrap" style={{ marginBottom: 12 }}>
                <div className="progress-label"><span>{p.label}</span><span>{p.val}%</span></div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${p.val}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity chart */}
        <div className="card">
          <div className="section-heading">
            <h2>Applications Activity</h2>
            <span className="text-muted">Last 7 days</span>
          </div>
          <div className="mini-chart" style={{ height: 80 }}>
            {bars.map((h, i) => (
              <div key={i} className={`mini-bar ${i === 5 ? "accent" : ""}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          {isNewUser && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 16 }}>
              No activity yet — start applying to see your stats here
            </div>
          )}
          <div className="flex gap8 mt16">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--muted)" }}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="fade-up-3">
        <div className="section-heading">
          <h2>Recommended Jobs</h2>
          <button className="btn btn-outline btn-sm">View All</button>
        </div>
        <div className="grid-3">
          {JOBS.slice(0, 3).map(j => <JobCard key={j.id} job={j} />)}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getJobs } from '../../data/api';
import TrustRing from '../../components/TrustRing/TrustRing';
import './EmployerDash.css';

export default function EmployerDash({ user, onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobs()
      .then(res => { if (res.success) setJobs(res.jobs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalApplicants = jobs.reduce((s, j) => s + (j.applications?.length || 0), 0);
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const closedJobs = jobs.filter(j => j.status === 'closed').length;
  const trustScore = user?.trustScore || 0;
  const userName = user?.firstName || 'Employer';

  const stats = [
    { icon: '📋', label: 'Active Listings', value: activeJobs, change: `${closedJobs} closed`, up: true, bg: 'rgba(37,99,235,.08)', color: 'var(--accent)' },
    { icon: '👥', label: 'Total Applicants', value: totalApplicants, change: 'Across all jobs', up: true, bg: 'rgba(22,163,74,.08)', color: 'var(--green)' },
    { icon: '✅', label: 'Jobs Posted', value: jobs.length, change: 'All time', up: true, bg: 'rgba(234,88,12,.08)', color: 'var(--orange)' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Employer Dashboard</h1>
        <p>Welcome back, {userName}! Manage your job listings and review applicants.</p>
      </div>

      {/* Stats Row */}
      <div className="grid-4 fade-up" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-change up">{s.change}</div>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <TrustRing score={trustScore} size={64} stroke={5} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid-2 fade-up-2" style={{ marginBottom: 24 }}>
        <div className="emp-action-card card" onClick={() => onNavigate('postjob')}>
          <div className="emp-action-icon">📝</div>
          <div>
            <div className="card-title">Post a New Job</div>
            <div className="card-sub">Create a listing to find skilled workers</div>
          </div>
          <span className="emp-action-arrow">→</span>
        </div>
        <div className="emp-action-card card" onClick={() => onNavigate('applicants')}>
          <div className="emp-action-icon">👥</div>
          <div>
            <div className="card-title">Review Applicants</div>
            <div className="card-sub">{totalApplicants} applicant{totalApplicants !== 1 ? 's' : ''} waiting for review</div>
          </div>
          <span className="emp-action-arrow">→</span>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="card fade-up-3">
        <div className="section-heading">
          <h2>Your Job Listings</h2>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('postjob')}>+ Post New</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="emp-empty">
            <div className="emp-empty-icon">📋</div>
            <h3>No jobs posted yet</h3>
            <p className="text-muted">Create your first job listing to start receiving applications from verified workers.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('postjob')}>Post Your First Job →</button>
          </div>
        ) : (
          <div className="emp-jobs-list">
            {jobs.map(j => (
              <div key={j._id} className="emp-job-row">
                <div className="emp-job-info">
                  <div className="emp-job-title">{j.title}</div>
                  <div className="text-muted">{j.type} · {j.location} · {j.pay}</div>
                </div>
                <div className="emp-job-stats">
                  <span className={`pill ${j.status === 'active' ? 'pill-green' : 'pill-gray'}`}>
                    {j.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                  <div className="emp-applicant-count">
                    <span className="emp-applicant-num">{j.applications?.length || 0}</span>
                    <span className="text-muted">applicants</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getJobs } from '../../data/api';
import './Applicants.css';

export default function Applicants({ user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    getJobs()
      .then(res => {
        if (res.success) {
          setJobs(res.jobs);
          if (res.jobs.length > 0) setSelectedJob(res.jobs[0]._id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentJob = jobs.find(j => j._id === selectedJob);
  const applicants = currentJob?.applications || [];

  const statusColor = {
    pending: 'pill-amber',
    shortlisted: 'pill-blue',
    hired: 'pill-green',
    rejected: 'pill-red',
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Applicants</h1>
        <p>Review candidates who applied to your job listings.</p>
      </div>

      {loading ? (
        <div className="card fade-up" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="card fade-up" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>No Jobs Posted</h3>
          <p className="text-muted">Post a job first to start receiving applications.</p>
        </div>
      ) : (
        <div className="applicants-layout fade-up">
          {/* Job Selector Sidebar */}
          <div className="applicants-sidebar card">
            <div className="card-title" style={{ marginBottom: 12 }}>Your Jobs</div>
            {jobs.map(j => (
              <div
                key={j._id}
                className={`applicant-job-item ${selectedJob === j._id ? 'active' : ''}`}
                onClick={() => setSelectedJob(j._id)}
              >
                <div className="applicant-job-title">{j.title}</div>
                <div className="applicant-job-meta">
                  <span className="text-muted">{j.type}</span>
                  <span className="applicant-job-count">{j.applications?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Applicants List */}
          <div className="applicants-main card">
            {currentJob ? (
              <>
                <div className="section-heading">
                  <div>
                    <h2>{currentJob.title}</h2>
                    <div className="text-muted">{currentJob.type} · {currentJob.location} · {currentJob.pay}</div>
                  </div>
                  <span className="tag teal">{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</span>
                </div>

                {applicants.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>No Applicants Yet</h3>
                    <p className="text-muted">Verified workers will appear here when they apply.</p>
                  </div>
                ) : (
                  <div className="applicants-list">
                    {applicants.map((app, i) => {
                      const person = app.applicant;
                      const name = typeof person === 'object'
                        ? `${person.firstName} ${person.lastName}`
                        : 'Unknown User';
                      const initials = typeof person === 'object'
                        ? `${person.firstName?.charAt(0) || ''}${person.lastName?.charAt(0) || ''}`
                        : '??';
                      const email = typeof person === 'object' ? person.email : '';
                      const trust = typeof person === 'object' ? person.trustScore : 0;
                      const verified = typeof person === 'object' ? person.isVerified : false;
                      const appliedDate = app.appliedAt
                        ? new Date(app.appliedAt).toLocaleDateString()
                        : 'Unknown';

                      return (
                        <div key={i} className="applicant-row">
                          <div className="applicant-avatar" style={{ background: verified ? 'var(--teal)' : 'var(--indigo)' }}>
                            {initials}
                          </div>
                          <div className="applicant-info">
                            <div className="applicant-name">
                              {name}
                              {verified && <span className="applicant-verified-badge" title="Verified">🛡️</span>}
                            </div>
                            <div className="text-muted">{email}</div>
                          </div>
                          <div className="applicant-trust">
                            <div className="applicant-trust-score">{trust}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>Trust</div>
                          </div>
                          <div className="applicant-date text-muted">{appliedDate}</div>
                          <span className={`pill ${statusColor[app.status] || 'pill-amber'}`}>
                            {app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Select a job to view applicants</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

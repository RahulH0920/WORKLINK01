import React, { useState, useEffect } from 'react';
import { getMyApplications } from '../data/api';
import './WorkerApplications.css';

export default function WorkerApplications({ user, onNavigate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);

  // Fetch real applications
  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications();
      if (res && res.success && Array.isArray(res.applications)) {
        setApplications(res.applications);
      } else if (Array.isArray(res)) {
        setApplications(res);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
      setError('Unable to load your applications. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Map application status normalized
  const getNormalizedStatus = (app) => {
    const rawStatus = (app.status || 'pending').toLowerCase();
    const jobStatus = (app.job?.status || '').toLowerCase();

    if (jobStatus === 'completed' || rawStatus === 'completed') {
      return 'completed';
    }
    if (rawStatus === 'accepted' || rawStatus === 'hired') {
      return 'accepted';
    }
    if (rawStatus === 'rejected') {
      return 'rejected';
    }
    return 'pending';
  };

  // Filter applications by tab
  const filteredApplications = applications.filter((app) => {
    const status = getNormalizedStatus(app);
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return status === 'pending';
    if (activeTab === 'accepted') return status === 'accepted';
    if (activeTab === 'rejected') return status === 'rejected';
    if (activeTab === 'completed') return status === 'completed';
    return true;
  });

  // Calculate counts for tab badges
  const counts = {
    all: applications.length,
    pending: applications.filter((a) => getNormalizedStatus(a) === 'pending').length,
    accepted: applications.filter((a) => getNormalizedStatus(a) === 'accepted').length,
    rejected: applications.filter((a) => getNormalizedStatus(a) === 'rejected').length,
    completed: applications.filter((a) => getNormalizedStatus(a) === 'completed').length,
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not available';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <span className="wrk-status-badge status-accepted">🟢 Accepted</span>;
      case 'rejected':
        return <span className="wrk-status-badge status-rejected">🔴 Rejected</span>;
      case 'completed':
        return <span className="wrk-status-badge status-completed">🔵 Completed</span>;
      case 'pending':
      default:
        return <span className="wrk-status-badge status-pending">🟡 Pending</span>;
    }
  };

  // Empty state messages
  const getEmptyState = () => {
    switch (activeTab) {
      case 'pending':
        return {
          title: 'No pending applications',
          desc: 'You currently have no applications awaiting response.',
        };
      case 'accepted':
        return {
          title: 'No accepted applications yet',
          desc: 'When an employer accepts your application, it will appear here.',
        };
      case 'rejected':
        return {
          title: 'No rejected applications',
          desc: 'None of your applications have been declined.',
        };
      case 'completed':
        return {
          title: 'No completed applications',
          desc: 'Completed gigs and assignments will be archived here.',
        };
      case 'all':
      default:
        return {
          title: "You haven't applied for any jobs yet.",
          desc: 'Explore available job opportunities and start applying today.',
        };
    }
  };

  return (
    <div className="wrk-apps-page-container">
      {/* ── Page Header ── */}
      <div className="wrk-apps-header">
        <h1 className="wrk-apps-title">My Applications</h1>
        <p className="wrk-apps-subtitle">
          Track the jobs you have applied for and manage your application status.
        </p>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="wrk-apps-tabs-bar">
        <button
          type="button"
          className={`wrk-apps-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
          <span className="wrk-apps-tab-badge">{counts.all}</span>
        </button>
        <button
          type="button"
          className={`wrk-apps-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending
          <span className="wrk-apps-tab-badge">{counts.pending}</span>
        </button>
        <button
          type="button"
          className={`wrk-apps-tab-btn ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          Accepted
          <span className="wrk-apps-tab-badge">{counts.accepted}</span>
        </button>
        <button
          type="button"
          className={`wrk-apps-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected
          <span className="wrk-apps-tab-badge">{counts.rejected}</span>
        </button>
        <button
          type="button"
          className={`wrk-apps-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
          <span className="wrk-apps-tab-badge">{counts.completed}</span>
        </button>
      </div>

      {/* ── Content Area ── */}
      {loading ? (
        <div className="wrk-apps-grid">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="wrk-application-card"
              style={{ opacity: 0.6, minHeight: 180, justifyContent: 'center', alignItems: 'center' }}
            >
              <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>
                Loading application data...
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="wrk-apps-empty">
          <div className="wrk-apps-empty-icon">⚠️</div>
          <div className="wrk-apps-empty-title">Error Loading Applications</div>
          <p className="wrk-apps-empty-desc">{error}</p>
          <button
            type="button"
            className="wrk-app-view-btn"
            onClick={fetchApplications}
          >
            🔄 Try Again
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="wrk-apps-empty">
          <div className="wrk-apps-empty-icon">📑</div>
          <div className="wrk-apps-empty-title">{getEmptyState().title}</div>
          <p className="wrk-apps-empty-desc">{getEmptyState().desc}</p>
          {activeTab === 'all' && onNavigate && (
            <button
              type="button"
              className="wrk-app-view-btn"
              style={{ padding: '10px 20px', fontSize: 13 }}
              onClick={() => onNavigate('jobs')}
            >
              🔍 Browse Jobs
            </button>
          )}
        </div>
      ) : (
        <div className="wrk-apps-grid">
          {filteredApplications.map((app, idx) => {
            const job = app.job || {};
            const employerName =
              typeof job.employer === 'object' && job.employer?.name
                ? job.employer.name
                : typeof job.employer === 'string'
                ? job.employer
                : 'Direct Employer';
            const status = getNormalizedStatus(app);

            return (
              <div key={app.applicationId || app._id || idx} className="wrk-application-card">
                {/* Header */}
                <div className="wrk-app-card-header">
                  <div className="wrk-app-card-title-group">
                    <h3 className="wrk-app-card-title">{job.title || 'Untitled Job'}</h3>
                    <div className="wrk-app-card-subline">
                      <span>{job.department || 'General'}</span>
                      {job.location && (
                        <>
                          <span>•</span>
                          <span>📍 {job.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {renderStatusBadge(status)}
                </div>

                {/* Metadata */}
                <div className="wrk-app-card-meta">
                  <div className="wrk-app-meta-item">
                    <span>🏢</span>
                    <span>{employerName}</span>
                  </div>
                  {job.type && (
                    <div className="wrk-app-meta-item">
                      <span>⏱️</span>
                      <span>{job.type}</span>
                    </div>
                  )}
                </div>

                {/* Pay Row */}
                <div className="wrk-app-card-pay-row">
                  <span className="wrk-app-pay-label">Offered Compensation</span>
                  <span className="wrk-app-pay-val">
                    {job.pay
                      ? job.pay.toString().startsWith('₹')
                        ? job.pay
                        : `₹${job.pay}`
                      : 'Negotiable'}
                  </span>
                </div>

                {/* Footer */}
                <div className="wrk-app-card-footer">
                  <div className="wrk-app-applied-date">
                    Applied: <strong>{formatDate(app.appliedAt || job.createdAt)}</strong>
                  </div>
                  <button
                    type="button"
                    className="wrk-app-view-btn"
                    onClick={() => setSelectedApp(app)}
                  >
                    View Job
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Application Details Modal ── */}
      {selectedApp && (
        <div
          className="wrk-app-modal-overlay"
          onClick={() => setSelectedApp(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            className="wrk-app-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 16,
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  {selectedApp.job?.department || 'General'}
                </span>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {selectedApp.job?.title || 'Job Details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Application Status Banner */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                background:
                  getNormalizedStatus(selectedApp) === 'accepted'
                    ? '#ecfdf5'
                    : getNormalizedStatus(selectedApp) === 'rejected'
                    ? '#fef2f2'
                    : getNormalizedStatus(selectedApp) === 'completed'
                    ? '#eff6ff'
                    : '#fef3c7',
                border: `1px solid ${
                  getNormalizedStatus(selectedApp) === 'accepted'
                    ? '#a7f3d0'
                    : getNormalizedStatus(selectedApp) === 'rejected'
                    ? '#fecaca'
                    : getNormalizedStatus(selectedApp) === 'completed'
                    ? '#bfdbfe'
                    : '#fde68a'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>
                  Current Status
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color:
                      getNormalizedStatus(selectedApp) === 'accepted'
                        ? '#047857'
                        : getNormalizedStatus(selectedApp) === 'rejected'
                        ? '#b91c1c'
                        : getNormalizedStatus(selectedApp) === 'completed'
                        ? '#1d4ed8'
                        : '#b45309',
                  }}
                >
                  {getNormalizedStatus(selectedApp) === 'accepted' && 'Accepted — Ready for work'}
                  {getNormalizedStatus(selectedApp) === 'rejected' && 'Application Rejected'}
                  {getNormalizedStatus(selectedApp) === 'completed' && 'Work Completed'}
                  {getNormalizedStatus(selectedApp) === 'pending' && 'Waiting for employer response.'}
                </div>
              </div>
              {renderStatusBadge(getNormalizedStatus(selectedApp))}
            </div>

            {/* Job Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
                background: '#f8fafc',
                padding: 16,
                borderRadius: 14,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Employer</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {typeof selectedApp.job?.employer === 'object' && selectedApp.job?.employer?.name
                    ? selectedApp.job.employer.name
                    : typeof selectedApp.job?.employer === 'string'
                    ? selectedApp.job.employer
                    : 'Direct Employer'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Location</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  📍 {selectedApp.job?.location || 'Not specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Offered Pay</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                  {selectedApp.job?.pay
                    ? selectedApp.job.pay.toString().startsWith('₹')
                      ? selectedApp.job.pay
                      : `₹${selectedApp.job.pay}`
                    : 'Negotiable'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Job Type</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  ⏱️ {selectedApp.job?.type || 'Standard Gig'}
                </div>
              </div>

              {selectedApp.job?.duration && (
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Duration</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    📅 {selectedApp.job.duration}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Applied On</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  🗓️ {formatDate(selectedApp.appliedAt || selectedApp.job?.createdAt)}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                Job Description
              </h4>
              <p
                style={{
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-line',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                {selectedApp.job?.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

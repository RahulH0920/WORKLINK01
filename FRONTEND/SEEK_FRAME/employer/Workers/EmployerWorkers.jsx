import React, { useState, useEffect, useMemo } from 'react';
import { getJobs } from '../../data/api';
import ApplicantDetailsModal from '../Applicants/ApplicantDetailsModal';
import './EmployerWorkers.css';

export default function EmployerWorkers({ user, onNavigate, initialFilter = 'all' }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicantData, setSelectedApplicantData] = useState(null); // { applicant, job }

  const fetchJobsData = async () => {
    setLoading(true);
    try {
      const res = await getJobs();
      if (res.success && Array.isArray(res.jobs)) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error('Failed to load jobs for workers view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
  }, []);

  useEffect(() => {
    if (initialFilter) {
      setActiveTab(initialFilter);
    }
  }, [initialFilter]);

  // Aggregate unique workers across employer's jobs
  const workersList = useMemo(() => {
    const map = new Map();

    jobs.forEach((j) => {
      if (Array.isArray(j.applications)) {
        j.applications.forEach((app) => {
          const person = app.applicant;
          if (typeof person === 'object' && person && person._id) {
            const key = `${person._id}_${j._id}`;
            const isCompleted =
              j.completionStatus === 'completed' ||
              j.status === 'completed' ||
              app.status === 'completed';
            const isActive =
              !isCompleted &&
              (app.status === 'accepted' ||
                app.status === 'hired' ||
                j.completionStatus === 'in_progress' ||
                j.completionStatus === 'waiting_employer_confirmation' ||
                String(j.hiredWorker) === String(person._id));

            if (!map.has(key)) {
              map.set(key, {
                id: person._id,
                workerId: person._id,
                name:
                  person.name ||
                  `${person.firstName || ''} ${person.lastName || ''}`.trim() ||
                  'Worker Candidate',
                email: person.email || '',
                phone: person.phone || '',
                location: person.location || j.location || 'Bengaluru, India',
                skills:
                  Array.isArray(person.skills) && person.skills.length > 0
                    ? person.skills
                    : [{ name: j.department || 'General Labour' }],
                trustScore: person.trustScore || 88,
                isVerified: person.isVerified ?? true,
                verificationStatus: person.verificationStatus || 'approved',
                jobId: j._id,
                jobTitle: j.title,
                jobDepartment: j.department,
                jobPay: j.pay,
                jobLocation: j.location,
                applicationStatus: app.status || 'pending',
                completionStatus: j.completionStatus || 'in_progress',
                isActive,
                isCompleted,
                appliedAt: app.appliedAt,
                rawApplicant: app,
                parentJob: j,
              });
            }
          }
        });
      }
    });

    // Return real employer workers directly
    return Array.from(map.values());
  }, [jobs]);

  // Tab metric counts
  const counts = useMemo(() => {
    const total = workersList.length;
    const active = workersList.filter((w) => w.isActive).length;
    const completed = workersList.filter((w) => w.isCompleted).length;
    const previous = workersList.filter(
      (w) => w.isCompleted || w.applicationStatus === 'accepted' || w.applicationStatus === 'hired'
    ).length;

    return { total, active, completed, previous };
  }, [workersList]);

  // Filter workers based on activeTab and searchQuery
  const filteredWorkers = useMemo(() => {
    return workersList.filter((w) => {
      // Tab filter
      if (activeTab === 'active' && !w.isActive) return false;
      if (activeTab === 'completed' && !w.isCompleted) return false;
      if (
        activeTab === 'previous' &&
        !w.isCompleted &&
        w.applicationStatus !== 'accepted' &&
        w.applicationStatus !== 'hired'
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name && w.name.toLowerCase().includes(q);
        const matchLoc = w.location && w.location.toLowerCase().includes(q);
        const matchJob = w.jobTitle && w.jobTitle.toLowerCase().includes(q);
        const matchSkill =
          w.skills &&
          w.skills.some((s) =>
            (typeof s === 'string' ? s : s.name || '').toLowerCase().includes(q)
          );

        if (!matchName && !matchLoc && !matchJob && !matchSkill) return false;
      }

      return true;
    });
  }, [workersList, activeTab, searchQuery]);

  const handleOpenProfile = (w, e) => {
    if (e) e.stopPropagation();
    setSelectedApplicantData({
      applicant: w.rawApplicant,
      job: w.parentJob,
    });
  };

  const handleOpenMessage = (w, e) => {
    if (e) e.stopPropagation();
    if (onNavigate) {
      onNavigate('messages', {
        workerId: w.workerId,
        workerName: w.name,
        jobId: w.jobId,
        jobTitle: w.jobTitle,
      });
    }
  };

  return (
    <div className="workers-container fade-in">
      {/* ── 1. Page Header ── */}
      <div className="workers-header">
        <div className="workers-header-info">
          <div className="workers-title-row">
            <h2>👷 Workers & Talent Directory</h2>
            <span className="workers-total-pill">{workersList.length} Total Workforce</span>
          </div>
          <p>
            Browse verified skilled labourers, view biometric trust ratings, track active shifts,
            and inspect work contracts.
          </p>
        </div>
        <div className="workers-header-stats">
          <div className="worker-stat-chip">
            <span className="wstat-num text-success">{counts.active}</span>
            <span className="wstat-label">Active Shifts</span>
          </div>
          <div className="worker-stat-chip">
            <span className="wstat-num">{counts.completed}</span>
            <span className="wstat-label">Completed</span>
          </div>
          <div className="worker-stat-chip">
            <span className="wstat-num text-blue">{counts.total}</span>
            <span className="wstat-label">Total Talent</span>
          </div>
        </div>
      </div>

      {/* ── 2. Filter Tabs & Search Bar ── */}
      <div className="workers-toolbar">
        {/* Status Tabs */}
        <div className="workers-tabs-scroll">
          <button
            type="button"
            className={`wtab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Workers <span className="tab-badge">{counts.total}</span>
          </button>
          <button
            type="button"
            className={`wtab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <span className="tab-dot dot-green" /> Active Shifts{' '}
            <span className="tab-badge">{counts.active}</span>
          </button>
          <button
            type="button"
            className={`wtab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            ✓ Completed <span className="tab-badge">{counts.completed}</span>
          </button>
          <button
            type="button"
            className={`wtab-btn ${activeTab === 'previous' ? 'active' : ''}`}
            onClick={() => setActiveTab('previous')}
          >
            🤝 Previous Hires <span className="tab-badge">{counts.previous}</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="workers-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by worker name, city, skill, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Workers Grid ── */}
      {loading ? (
        <div className="workers-loading-shell">
          <div className="workers-spinner" />
          <p>Loading worker directory...</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="workers-empty-state">
          <div className="empty-icon">👷</div>
          <h3>
            {searchQuery || activeTab !== 'all'
              ? 'No workers matching your search'
              : 'No workers in directory yet'}
          </h3>
          <p>
            {searchQuery || activeTab !== 'all'
              ? 'Try changing your filter tabs or searching for a different name or skill.'
              : 'When you accept and hire workers for your job postings, they will appear here.'}
          </p>
          {searchQuery || activeTab !== 'all' ? (
            <button
              type="button"
              className="wbtn-secondary"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              className="wbtn-primary"
              onClick={() => onNavigate && onNavigate('postjob')}
            >
              ➕ Post a Job to Hire Workers
            </button>
          )}
        </div>
      ) : (
        <div className="workers-grid">
          {filteredWorkers.map((w, idx) => {
            const initials = w.name
              ? w.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'WK';

            return (
              <div key={idx} className="worker-card" onClick={(e) => handleOpenProfile(w, e)}>
                {/* Header: Avatar, Name, Trust Score */}
                <div className="worker-card-header">
                  <div className="worker-profile-wrap">
                    <div
                      className="worker-avatar"
                      style={{ background: w.isVerified ? '#10b981' : '#2563eb' }}
                    >
                      {initials}
                      {w.isVerified && (
                        <span className="avatar-verified-badge" title="Identity Verified">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="worker-id-info">
                      <h4 className="worker-name">{w.name}</h4>
                      <span className="worker-loc">📍 {w.location}</span>
                    </div>
                  </div>

                  <div className="worker-score-box">
                    <span className="score-label">Trust Score</span>
                    <strong className="score-val">{w.trustScore} pts</strong>
                  </div>
                </div>

                {/* Job Context Banner */}
                <div className="worker-job-banner">
                  <div className="wjob-text">
                    <span className="wjob-label">Current / Related Job</span>
                    <strong className="wjob-title">{w.jobTitle}</strong>
                  </div>
                  <span className="wjob-pay-pill">{w.jobPay}</span>
                </div>

                {/* Skills Row */}
                <div className="worker-skills-row">
                  {w.skills.slice(0, 3).map((s, sIdx) => (
                    <span key={sIdx} className="skill-chip">
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                  {w.skills.length > 3 && (
                    <span className="skill-chip-more">+{w.skills.length - 3}</span>
                  )}
                </div>

                {/* Status & Contract Information */}
                <div className="worker-status-row">
                  {w.isCompleted ? (
                    <span className="wstatus-pill pill-completed">✓ Contract Completed</span>
                  ) : w.isActive ? (
                    <span className="wstatus-pill pill-active">⚡ Active Shift • Escrow Secured</span>
                  ) : (
                    <span className="wstatus-pill pill-hired">🤝 Hired & Verified</span>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="worker-card-footer" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="wbtn-view"
                    onClick={(e) => handleOpenProfile(w, e)}
                  >
                    View Profile →
                  </button>

                  <button
                    type="button"
                    className="wbtn-message"
                    onClick={(e) => handleOpenMessage(w, e)}
                  >
                    💬 Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Worker Profile Modal ── */}
      {selectedApplicantData && (
        <ApplicantDetailsModal
          applicant={selectedApplicantData.applicant}
          job={selectedApplicantData.job}
          onClose={() => setSelectedApplicantData(null)}
          onStatusUpdate={() => {
            fetchJobsData();
          }}
        />
      )}
    </div>
  );
}

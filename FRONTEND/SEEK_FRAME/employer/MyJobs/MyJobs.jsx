import React, { useState, useEffect, useMemo } from 'react';
import { getJobs, updateJob, deleteJob } from '../../data/api';
import './MyJobs.css';

const DEPARTMENTS = ['All', 'Catering', 'Driving', 'Cleaning', 'Delivery'];
const JOB_TYPES = ['Part-time', 'Short-term', 'Freelance', 'Full-time'];

export default function MyJobs({ user, onNavigate, initialFilter = 'all' }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [toast, setToast] = useState(null);

  // Edit Job Modal State
  const [editingJob, setEditingJob] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    department: 'Catering',
    type: 'Part-time',
    location: '',
    pay: '',
    description: '',
    status: 'active',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Job Confirmation Modal State
  const [deletingJob, setDeletingJob] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchJobsList = async () => {
    setLoading(true);
    try {
      const res = await getJobs();
      if (res.success && Array.isArray(res.jobs)) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error('Failed to load employer jobs:', err);
      showToast('Failed to load job postings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsList();
  }, []);

  useEffect(() => {
    if (initialFilter) {
      setActiveTab(initialFilter);
    }
  }, [initialFilter]);

  // Compute metric counts for tabs
  const metrics = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(
      (j) => j.status === 'active' && j.completionStatus !== 'completed'
    ).length;
    const withApplications = jobs.filter(
      (j) => Array.isArray(j.applications) && j.applications.length > 0
    ).length;
    const inProgress = jobs.filter(
      (j) =>
        j.status === 'active' &&
        (j.completionStatus === 'in_progress' ||
          j.completionStatus === 'waiting_employer_confirmation' ||
          j.hiredWorker ||
          (Array.isArray(j.applications) &&
            j.applications.some((a) => a.status === 'accepted' || a.status === 'hired')))
    ).length;
    const completed = jobs.filter(
      (j) => j.completionStatus === 'completed' || j.status === 'completed'
    ).length;
    const closed = jobs.filter((j) => j.status === 'closed').length;

    return { total, active, withApplications, inProgress, completed, closed };
  }, [jobs]);

  // Filter jobs based on activeTab, searchQuery, and selectedDept
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Tab filter
      if (activeTab === 'active') {
        if (job.status !== 'active' || job.completionStatus === 'completed') return false;
      } else if (activeTab === 'applications') {
        if (!Array.isArray(job.applications) || job.applications.length === 0) return false;
      } else if (activeTab === 'in_progress') {
        const hasAccepted =
          Array.isArray(job.applications) &&
          job.applications.some((a) => a.status === 'accepted' || a.status === 'hired');
        const isInProg =
          job.completionStatus === 'in_progress' ||
          job.completionStatus === 'waiting_employer_confirmation' ||
          job.hiredWorker ||
          hasAccepted;
        if (!isInProg || job.completionStatus === 'completed') return false;
      } else if (activeTab === 'completed') {
        if (job.completionStatus !== 'completed' && job.status !== 'completed') return false;
      } else if (activeTab === 'closed') {
        if (job.status !== 'closed') return false;
      }

      // 2. Department filter
      if (selectedDept !== 'All' && job.department !== selectedDept) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = job.title && job.title.toLowerCase().includes(q);
        const matchLoc = job.location && job.location.toLowerCase().includes(q);
        const matchDept = job.department && job.department.toLowerCase().includes(q);
        const matchDesc = job.description && job.description.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchDept && !matchDesc) return false;
      }

      return true;
    });
  }, [jobs, activeTab, selectedDept, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (job, e) => {
    if (e) e.stopPropagation();
    setEditingJob(job);
    setEditFormData({
      title: job.title || '',
      department: job.department || 'Catering',
      type: job.type || 'Part-time',
      location: job.location || '',
      pay: job.pay || '',
      description: job.description || '',
      status: job.status || 'active',
    });
    setEditError('');
  };

  // Submit Edit Job Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingJob) return;

    if (!editFormData.title.trim()) {
      setEditError('Job title is required.');
      return;
    }
    if (!editFormData.location.trim()) {
      setEditError('Location is required.');
      return;
    }
    if (!editFormData.pay.trim()) {
      setEditError('Payment wage is required.');
      return;
    }
    if (!editFormData.description.trim()) {
      setEditError('Job description is required.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const res = await updateJob(editingJob._id, editFormData);
      if (res.success && res.job) {
        showToast('✓ Job details updated successfully!', 'success');
        setEditingJob(null);
        // Update local jobs list
        setJobs((prev) => prev.map((j) => (j._id === res.job._id ? res.job : j)));
      } else {
        setEditError(res.message || 'Failed to update job.');
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update job details.');
    } finally {
      setEditLoading(false);
    }
  };

  // Toggle Job Status (Active <-> Closed)
  const handleToggleStatus = async (job, e) => {
    if (e) e.stopPropagation();
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    try {
      const res = await updateJob(job._id, { status: newStatus });
      if (res.success) {
        showToast(
          `Job marked as ${newStatus === 'active' ? 'Active' : 'Closed'}!`,
          'success'
        );
        setJobs((prev) =>
          prev.map((j) => (j._id === job._id ? { ...j, status: newStatus } : j))
        );
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle job status.', 'error');
    }
  };

  // Confirm Delete Job
  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    setDeleteLoading(true);
    try {
      const res = await deleteJob(deletingJob._id);
      if (res.success) {
        showToast('Job listing removed successfully.', 'info');
        setJobs((prev) => prev.filter((j) => j._id !== deletingJob._id));
        setDeletingJob(null);
      } else {
        showToast(res.message || 'Failed to delete job.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete job.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Navigate to Applicants page for this specific job
  const handleViewApplications = (job, e) => {
    if (e) e.stopPropagation();
    if (onNavigate) {
      onNavigate('applicants', { selectedJobId: job._id });
    }
  };

  return (
    <div className="myjobs-container fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className={`myjobs-toast myjobs-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── 1. Page Header ── */}
      <div className="myjobs-header">
        <div className="myjobs-header-info">
          <div className="myjobs-title-row">
            <h2>💼 My Job Postings</h2>
            <span className="myjobs-total-pill">{jobs.length} Total Listings</span>
          </div>
          <p>
            Track and manage all your job openings, review candidate applications, and monitor work
            shifts.
          </p>
        </div>
        <div className="myjobs-header-actions">
          <button
            type="button"
            className="myjobs-btn-post"
            onClick={() => onNavigate && onNavigate('postjob')}
          >
            <span>➕</span> Post New Job
          </button>
        </div>
      </div>

      {/* ── 2. Filter Tabs & Controls Bar ── */}
      <div className="myjobs-toolbar">
        {/* Status Tabs */}
        <div className="myjobs-tabs-scroll">
          <button
            type="button"
            className={`myjobs-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Jobs <span className="tab-badge">{metrics.total}</span>
          </button>
          <button
            type="button"
            className={`myjobs-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <span className="tab-dot dot-green" /> Active{' '}
            <span className="tab-badge">{metrics.active}</span>
          </button>
          <button
            type="button"
            className={`myjobs-tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            📑 Applications <span className="tab-badge">{metrics.withApplications}</span>
          </button>
          <button
            type="button"
            className={`myjobs-tab ${activeTab === 'in_progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in_progress')}
          >
            ⚡ In Progress <span className="tab-badge">{metrics.inProgress}</span>
          </button>
          <button
            type="button"
            className={`myjobs-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            ✓ Completed <span className="tab-badge">{metrics.completed}</span>
          </button>
          <button
            type="button"
            className={`myjobs-tab ${activeTab === 'closed' ? 'active' : ''}`}
            onClick={() => setActiveTab('closed')}
          >
            Closed <span className="tab-badge">{metrics.closed}</span>
          </button>
        </div>

        {/* Search & Department Selector */}
        <div className="myjobs-filters-row">
          <div className="myjobs-search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, location, category..."
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

          <div className="myjobs-dept-wrap">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="myjobs-dept-select"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Categories' : `🏷️ ${dept}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. Jobs Cards Content ── */}
      {loading ? (
        <div className="myjobs-loading-shell">
          <div className="myjobs-spinner" />
          <p>Loading your job listings...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="myjobs-empty-state">
          <div className="empty-icon">💼</div>
          <h3>
            {searchQuery || selectedDept !== 'All' || activeTab !== 'all'
              ? 'No matching jobs found'
              : 'No jobs posted yet'}
          </h3>
          <p>
            {searchQuery || selectedDept !== 'All' || activeTab !== 'all'
              ? 'Try adjusting your filters or search keywords to find what you are looking for.'
              : 'Create your first job listing to start receiving applications from verified skilled workers.'}
          </p>
          {searchQuery || selectedDept !== 'All' || activeTab !== 'all' ? (
            <button
              type="button"
              className="myjobs-btn-secondary"
              onClick={() => {
                setActiveTab('all');
                setSelectedDept('All');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              className="myjobs-btn-post"
              onClick={() => onNavigate && onNavigate('postjob')}
            >
              ➕ Post Your First Job
            </button>
          )}
        </div>
      ) : (
        <div className="myjobs-grid">
          {filteredJobs.map((job) => {
            const appCount = Array.isArray(job.applications) ? job.applications.length : 0;
            const isCompleted =
              job.completionStatus === 'completed' || job.status === 'completed';
            const isInProg =
              !isCompleted &&
              job.status === 'active' &&
              (job.completionStatus === 'in_progress' ||
                job.completionStatus === 'waiting_employer_confirmation' ||
                job.hiredWorker ||
                (Array.isArray(job.applications) &&
                  job.applications.some((a) => a.status === 'accepted' || a.status === 'hired')));

            const postedDateStr = job.createdAt
              ? new Date(job.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently';

            return (
              <div
                key={job._id}
                className={`myjob-card ${job.status === 'closed' ? 'card-closed' : ''}`}
              >
                {/* Top Status & Pay Header */}
                <div className="myjob-card-top">
                  <div className="myjob-badges-group">
                    {/* Status Pill */}
                    {isCompleted ? (
                      <span className="myjob-status-pill pill-completed">✓ Completed</span>
                    ) : isInProg ? (
                      <span className="myjob-status-pill pill-inprog">⚡ In Progress</span>
                    ) : job.status === 'active' ? (
                      <span className="myjob-status-pill pill-active">● Active</span>
                    ) : (
                      <span className="myjob-status-pill pill-closed">Closed</span>
                    )}

                    {/* Department Badge */}
                    {job.department && (
                      <span className="myjob-dept-pill">🏷️ {job.department}</span>
                    )}
                  </div>

                  {/* Payment Amount */}
                  <div className="myjob-pay-badge">
                    <span className="pay-amount">{job.pay}</span>
                  </div>
                </div>

                {/* Job Title & Meta */}
                <h3 className="myjob-title">{job.title}</h3>

                <div className="myjob-meta-row">
                  <span className="meta-item">📍 {job.location}</span>
                  <span className="meta-item">⏱️ {job.type}</span>
                  <span className="meta-item">📅 {postedDateStr}</span>
                </div>

                {/* Description snippet */}
                <p className="myjob-desc">{job.description}</p>

                {/* Hired Worker Highlight if assigned */}
                {isInProg && (
                  <div className="myjob-hired-banner">
                    <span>🤝</span>
                    <div>
                      <strong>Work in Progress</strong>
                      <span>Worker assigned & escrow secured.</span>
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="myjob-card-footer">
                  <div className="myjob-apps-stat">
                    <span className="apps-count-badge">{appCount}</span>
                    <span className="apps-label">
                      {appCount === 1 ? 'Applicant' : 'Applicants'}
                    </span>
                  </div>

                  <div className="myjob-actions-group">
                    <button
                      type="button"
                      className="myjob-btn-apps"
                      onClick={(e) => handleViewApplications(job, e)}
                    >
                      View Applications →
                    </button>

                    <button
                      type="button"
                      className="myjob-btn-icon"
                      onClick={(e) => handleOpenEdit(job, e)}
                      title="Edit Job Details"
                    >
                      ✏️
                    </button>

                    <button
                      type="button"
                      className={`myjob-btn-icon ${job.status === 'active' ? 'text-warn' : 'text-success'}`}
                      onClick={(e) => handleToggleStatus(job, e)}
                      title={job.status === 'active' ? 'Close Job' : 'Reopen Job'}
                    >
                      {job.status === 'active' ? '⏸️' : '▶️'}
                    </button>

                    <button
                      type="button"
                      className="myjob-btn-icon text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingJob(job);
                      }}
                      title="Delete Job"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: EDIT JOB DETAILS
          ══════════════════════════════════════════ */}
      {editingJob && (
        <div className="myjobs-modal-overlay" onClick={() => setEditingJob(null)}>
          <div className="myjobs-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="myjobs-modal-header">
              <h3>✏️ Edit Job Posting</h3>
              <button
                type="button"
                className="myjobs-modal-close"
                onClick={() => setEditingJob(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="myjobs-modal-body">
                {editError && <div className="myjobs-alert-error">{editError}</div>}

                <div className="myjobs-form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, title: e.target.value })
                    }
                    placeholder="e.g. Senior Catering Assistant"
                    required
                  />
                </div>

                <div className="myjobs-form-grid-2">
                  <div className="myjobs-form-group">
                    <label>Category / Department</label>
                    <select
                      value={editFormData.department}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, department: e.target.value })
                      }
                    >
                      <option value="Catering">Catering</option>
                      <option value="Driving">Driving</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Delivery">Delivery</option>
                    </select>
                  </div>

                  <div className="myjobs-form-group">
                    <label>Job Type</label>
                    <select
                      value={editFormData.type}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, type: e.target.value })
                      }
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="myjobs-form-grid-2">
                  <div className="myjobs-form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={editFormData.location}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, location: e.target.value })
                      }
                      placeholder="e.g. Indiranagar, Bengaluru"
                      required
                    />
                  </div>

                  <div className="myjobs-form-group">
                    <label>Pay Wage (e.g. ₹950/day)</label>
                    <input
                      type="text"
                      value={editFormData.pay}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, pay: e.target.value })
                      }
                      placeholder="e.g. ₹850/day"
                      required
                    />
                  </div>
                </div>

                <div className="myjobs-form-group">
                  <label>Job Description & Requirements</label>
                  <textarea
                    rows="4"
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, description: e.target.value })
                    }
                    placeholder="Describe job tasks, working hours, and candidate requirements..."
                    required
                  />
                </div>

                <div className="myjobs-form-group">
                  <label>Listing Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                  >
                    <option value="active">Active (Accepting applications)</option>
                    <option value="closed">Closed (Archived)</option>
                  </select>
                </div>
              </div>

              <div className="myjobs-modal-footer">
                <button
                  type="button"
                  className="myjobs-btn-secondary"
                  onClick={() => setEditingJob(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="myjobs-btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: DELETE JOB CONFIRMATION
          ══════════════════════════════════════════ */}
      {deletingJob && (
        <div className="myjobs-modal-overlay" onClick={() => setDeletingJob(null)}>
          <div className="myjobs-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="myjobs-modal-header">
              <h3 className="text-danger">🗑️ Delete Job Posting</h3>
              <button
                type="button"
                className="myjobs-modal-close"
                onClick={() => setDeletingJob(null)}
              >
                ✕
              </button>
            </div>

            <div className="myjobs-modal-body">
              <p style={{ color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete <strong>"{deletingJob.title}"</strong>?
              </p>
              <div className="myjobs-alert-warning" style={{ marginTop: 12 }}>
                This will permanently remove the listing and its candidate application records.
              </div>
            </div>

            <div className="myjobs-modal-footer">
              <button
                type="button"
                className="myjobs-btn-secondary"
                onClick={() => setDeletingJob(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="myjobs-btn-danger"
                disabled={deleteLoading}
                onClick={handleDeleteJob}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { getJobs, applyJob, getMyApplications } from '../data/api';
import { useToast } from '../components/Toast/Toast';
import WorkerFeeReceiptModal from '../components/FeeReceipt/FeeReceiptModal';
import './WorkerFindJobs.css';

const DEPARTMENTS_DATA = [
  { id: 'Catering', name: 'Catering', icon: '🍽️', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)' },
  { id: 'Driving', name: 'Driving', icon: '🚗', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)' },
  { id: 'Cleaning', name: 'Cleaning', icon: '🧹', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
  { id: 'Delivery', name: 'Delivery', icon: '📦', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)' },
];

const JOB_TYPES = ['All Types', 'Part-time', 'Short-term', 'Freelance', 'Full-time'];

const PAY_RANGES = [
  { id: 'all', label: 'All Pay Ranges' },
  { id: 'under-500', label: 'Up to ₹500' },
  { id: '500-1000', label: '₹500 - ₹1,000' },
  { id: 'over-1000', label: '₹1,000+' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'pay-desc', label: 'Pay: High to Low' },
  { id: 'pay-asc', label: 'Pay: Low to High' },
];

// Helper to extract numerical value from pay string (e.g., "₹850/day" -> 850)
function parsePayNumber(payStr) {
  if (!payStr) return 0;
  const num = parseInt(String(payStr).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

// Helper: Check if job date is today or in the future
export function isJobTodayOrFuture(job) {
  if (!job) return false;
  const dateVal = job.startDate || job.scheduledDate || job.date || job.createdAt;
  if (!dateVal) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let jDate;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    const [year, month, day] = dateVal.trim().split('-').map(Number);
    jDate = new Date(year, month - 1, day);
  } else {
    jDate = new Date(dateVal);
  }

  if (isNaN(jDate.getTime())) return true;
  jDate.setHours(0, 0, 0, 0);

  return jDate.getTime() >= today.getTime();
}

export default function WorkerFindJobs({
  user,
  requireProfile,
  initialDepartment = 'All',
  onSelectDepartment,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appliedMap, setAppliedMap] = useState({});

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(initialDepartment || 'All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedPayRange, setSelectedPayRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Job Details Modal & Fee Receipt Modal States
  const [activeJobModal, setActiveJobModal] = useState(null);
  const [feeReceiptJob, setFeeReceiptJob] = useState(null);
  const [applying, setApplying] = useState(false);

  const { addToast } = useToast();

  // Sync initialDepartment prop if changed externally
  useEffect(() => {
    if (initialDepartment) {
      setSelectedDept(initialDepartment);
    }
  }, [initialDepartment]);

  // Fetch real jobs and applied status from API
  const fetchJobsAndApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        getJobs(),
        getMyApplications().catch(() => ({ success: false, applications: [] })),
      ]);

      if (jobsRes?.success && Array.isArray(jobsRes.jobs)) {
        setJobs(jobsRes.jobs);
      } else {
        setJobs([]);
      }

      // Map user's applied status
      const appStatusMap = {};
      if (appsRes?.success && Array.isArray(appsRes.applications)) {
        appsRes.applications.forEach((app) => {
          const jobId = app.job?._id || app.job?.id || app.job;
          if (jobId) {
            appStatusMap[String(jobId)] = app.status || 'pending';
          }
        });
      }
      setAppliedMap(appStatusMap);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Unable to load jobs. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndApplications();
  }, []);

  // Compute real active job counts per department (scheduled today or future)
  const departmentCounts = useMemo(() => {
    const counts = { Catering: 0, Driving: 0, Cleaning: 0, Delivery: 0 };
    jobs.forEach((j) => {
      const isLive = (j.status === 'active' || !j.status) && isJobTodayOrFuture(j);
      if (isLive && j.department && counts.hasOwnProperty(j.department)) {
        counts[j.department] += 1;
      }
    });
    return counts;
  }, [jobs]);

  // Extract unique locations from real jobs (scheduled today or future)
  const availableLocations = useMemo(() => {
    const locSet = new Set();
    jobs.forEach((j) => {
      const isLive = (j.status === 'active' || !j.status) && isJobTodayOrFuture(j);
      if (isLive && j.location && j.location.trim()) {
        locSet.add(j.location.trim());
      }
    });
    return Array.from(locSet).sort();
  }, [jobs]);

  // Filter and sort jobs based on user criteria
  const filteredAndSortedJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = jobs.filter((job) => {
      // Live jobs scheduled today or future only
      const isLive = (job.status === 'active' || !job.status) && isJobTodayOrFuture(job);
      if (!isLive) return false;

      // Department filter
      if (selectedDept !== 'All') {
        if (!job.department || job.department.toLowerCase() !== selectedDept.toLowerCase()) {
          return false;
        }
      }

      // Location filter
      if (selectedLocation !== 'All') {
        if (!job.location || job.location.toLowerCase() !== selectedLocation.toLowerCase()) {
          return false;
        }
      }

      // Job Type filter
      if (selectedType !== 'All Types') {
        if (!job.type || job.type !== selectedType) {
          return false;
        }
      }

      // Pay Range filter
      if (selectedPayRange !== 'all') {
        const payNum = parsePayNumber(job.pay);
        if (selectedPayRange === 'under-500' && payNum > 500) return false;
        if (selectedPayRange === '500-1000' && (payNum < 500 || payNum > 1000)) return false;
        if (selectedPayRange === 'over-1000' && payNum < 1000) return false;
      }

      // Search Query (matches title, location, tags, employer name, description)
      if (query) {
        const titleMatch = job.title?.toLowerCase().includes(query);
        const locMatch = job.location?.toLowerCase().includes(query);
        const tagsMatch = Array.isArray(job.tags) && job.tags.some((t) => t.toLowerCase().includes(query));
        const descMatch = job.description?.toLowerCase().includes(query);
        const empName = job.employer?.name || `${job.employer?.firstName || ''} ${job.employer?.lastName || ''}`;
        const empMatch = empName.toLowerCase().includes(query);

        if (!titleMatch && !locMatch && !tagsMatch && !descMatch && !empMatch) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'pay-desc') {
        return parsePayNumber(b.pay) - parsePayNumber(a.pay);
      }
      if (sortBy === 'pay-asc') {
        return parsePayNumber(a.pay) - parsePayNumber(b.pay);
      }
      // default: newest
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [jobs, searchQuery, selectedDept, selectedLocation, selectedType, selectedPayRange, sortBy]);

  // Handle department card selection
  const handleDepartmentCardClick = (deptId) => {
    const nextDept = selectedDept === deptId ? 'All' : deptId;
    setSelectedDept(nextDept);
    if (onSelectDepartment) {
      onSelectDepartment(nextDept);
    }
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setSelectedLocation('All');
    setSelectedType('All Types');
    setSelectedPayRange('all');
    setSortBy('newest');
    if (onSelectDepartment) {
      onSelectDepartment('All');
    }
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    selectedDept !== 'All' ||
    selectedLocation !== 'All' ||
    selectedType !== 'All Types' ||
    selectedPayRange !== 'all' ||
    sortBy !== 'newest';

  // Step 12A: Trigger Fee Receipt Modal before applying
  const handleInitiateApply = (job) => {
    if (!job?._id && !job?.id) return;
    if (requireProfile) {
      requireProfile(`apply for "${job.title}"`, () => {
        setFeeReceiptJob(job);
      });
    } else {
      setFeeReceiptJob(job);
    }
  };

  // Submit Application after 2% fee agreement
  const handleConfirmApplication = async () => {
    if (!feeReceiptJob) return;
    const jobId = feeReceiptJob._id || feeReceiptJob.id;
    setApplying(true);
    try {
      const res = await applyJob(jobId);
      if (res?.success) {
        setAppliedMap((prev) => ({ ...prev, [String(jobId)]: 'pending' }));
        addToast(`Successfully applied for "${feeReceiptJob.title}"!`, { type: 'success' });
        setFeeReceiptJob(null);
        setActiveJobModal(null);
      } else {
        addToast(res?.message || 'Failed to submit application. Please try again.', { type: 'error' });
      }
    } catch (err) {
      addToast(err?.message || 'Failed to submit application. Please try again.', { type: 'error' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="wrk-jobs-container">
      {/* ── PAGE HEADER ── */}
      <div className="wrk-jobs-header">
        <h1 className="wrk-jobs-title">Find Your Next Job</h1>
        <p className="wrk-jobs-subtitle">
          Discover work opportunities that match your skills and location.
        </p>
      </div>

      {/* ── SEARCH & FILTERS CARD ── */}
      <div className="wrk-search-filter-card">
        {/* Search Bar */}
        <div className="wrk-search-main-row">
          <div className="wrk-search-input-wrap">
            <span className="wrk-search-icon">🔍</span>
            <input
              type="text"
              className="wrk-search-input"
              placeholder="Search jobs, skills or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="wrk-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Clean, Responsive Filters Row */}
        <div className="wrk-filters-row">
          {/* Department Filter */}
          <div className="wrk-filter-item">
            <label className="wrk-filter-label" htmlFor="filter-dept">Department:</label>
            <select
              id="filter-dept"
              className="wrk-filter-select"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                if (onSelectDepartment) onSelectDepartment(e.target.value);
              }}
            >
              <option value="All">All Departments</option>
              <option value="Catering">🍽️ Catering</option>
              <option value="Driving">🚗 Driving</option>
              <option value="Cleaning">🧹 Cleaning</option>
              <option value="Delivery">📦 Delivery</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="wrk-filter-item">
            <label className="wrk-filter-label" htmlFor="filter-loc">Location:</label>
            <select
              id="filter-loc"
              className="wrk-filter-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="All">All Locations</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Job Type Filter */}
          <div className="wrk-filter-item">
            <label className="wrk-filter-label" htmlFor="filter-type">Job Type:</label>
            <select
              id="filter-type"
              className="wrk-filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Pay Range Filter */}
          <div className="wrk-filter-item">
            <label className="wrk-filter-label" htmlFor="filter-pay">Pay:</label>
            <select
              id="filter-pay"
              className="wrk-filter-select"
              value={selectedPayRange}
              onChange={(e) => setSelectedPayRange(e.target.value)}
            >
              {PAY_RANGES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="wrk-filter-item">
            <label className="wrk-filter-label" htmlFor="filter-sort">Sort:</label>
            <select
              id="filter-sort"
              className="wrk-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear All Filters */}
          {isAnyFilterActive && (
            <button
              type="button"
              className="wrk-filter-clear-all"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── STEP 3: DEPARTMENT SECTION ── */}
      <div className="wrk-departments-section">
        <div className="wrk-departments-header">
          <h2 className="wrk-departments-title">
            <span>🏷️</span> Explore by Department
          </h2>
        </div>

        <div className="wrk-departments-grid">
          {DEPARTMENTS_DATA.map((dept) => {
            const count = departmentCounts[dept.id] || 0;
            const isSelected = selectedDept === dept.id;

            return (
              <div
                key={dept.id}
                className={`wrk-department-card ${isSelected ? 'active' : ''}`}
                onClick={() => handleDepartmentCardClick(dept.id)}
                title={`Filter by ${dept.name}`}
              >
                <div className="wrk-dept-card-top">
                  <div className="wrk-dept-icon-box" style={{ background: dept.bg }}>
                    {dept.icon}
                  </div>
                  {isSelected && (
                    <span className="wrk-dept-active-indicator">Selected</span>
                  )}
                </div>

                <div className="wrk-dept-card-main">
                  <div className="wrk-dept-name">{dept.name}</div>
                  <div className="wrk-dept-count">
                    {loading ? '…' : `${count} Active Job${count === 1 ? '' : 's'}`}
                  </div>
                </div>

                <div className="wrk-dept-card-footer">
                  <span className="wrk-dept-action-text">
                    {isSelected ? 'Showing Jobs ✓' : 'View Jobs →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 4: JOB LIST SECTION ── */}
      <div className="wrk-job-list-section">
        <div className="wrk-job-list-header">
          <div className="wrk-job-list-count">
            Showing <strong>{filteredAndSortedJobs.length}</strong> active job
            {filteredAndSortedJobs.length === 1 ? '' : 's'}
            {selectedDept !== 'All' && (
              <span className="wrk-active-dept-pill">
                Department: {selectedDept}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDept('All');
                    if (onSelectDepartment) onSelectDepartment('All');
                  }}
                  title="Remove department filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="wrk-state-box">
            <div className="wrk-state-spinner" />
            <div className="wrk-state-title">Loading Available Jobs</div>
            <p className="wrk-state-desc">
              Retrieving the latest verified gig opportunities from employers...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="wrk-state-box">
            <div className="wrk-state-icon">⚠️</div>
            <div className="wrk-state-title">Unable to Load Jobs</div>
            <p className="wrk-state-desc">{error}</p>
            <button
              type="button"
              className="wrk-state-btn"
              onClick={fetchJobsAndApplications}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedJobs.length === 0 && (
          <div className="wrk-state-box">
            <div className="wrk-state-icon">🔍</div>
            <div className="wrk-state-title">No jobs found</div>
            <p className="wrk-state-desc">
              Try changing your search or filters to see more opportunities.
            </p>
            {isAnyFilterActive && (
              <button
                type="button"
                className="wrk-state-btn"
                onClick={handleClearFilters}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Real Job Cards Grid */}
        {!loading && !error && filteredAndSortedJobs.length > 0 && (
          <div className="wrk-jobs-grid">
            {filteredAndSortedJobs.map((job) => {
              const jobId = job._id || job.id;
              const employerName =
                job.employer?.name ||
                (job.employer?.firstName
                  ? `${job.employer.firstName} ${job.employer.lastName || ''}`.trim()
                  : 'WorkLink Employer');

              const isEmpVerified = Boolean(
                job.employer?.isVerified || (job.employer?.trustScore && job.employer.trustScore >= 70)
              );

              const appliedStatus = appliedMap[String(jobId)];
              const isApplied = Boolean(appliedStatus);

              // Posted date formatting
              const postedDateStr = job.createdAt
                ? new Date(job.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently';

              return (
                <div key={jobId} className="wrk-job-card">
                  <div className="wrk-job-card-header">
                    <div className="wrk-job-card-title-group">
                      <h3 className="wrk-job-card-title">{job.title}</h3>
                      <div className="wrk-job-card-subline">
                        <span>🏷️ {job.department || 'General'}</span>
                        <span>•</span>
                        <span>📍 {job.location}</span>
                      </div>
                    </div>

                    <div className="wrk-job-card-pay">{job.pay}</div>
                  </div>

                  <div className="wrk-job-card-meta">
                    <span className="wrk-job-card-meta-item">
                      ⏱️ {job.type}
                    </span>
                    {job.duration && (
                      <span className="wrk-job-card-meta-item">
                        ⌛ {job.duration}
                      </span>
                    )}
                    {job.workersRequired && (
                      <span className="wrk-job-card-meta-item">
                        👥 {job.workersRequired} worker{job.workersRequired > 1 ? 's' : ''} needed
                      </span>
                    )}
                    <span className="wrk-job-card-meta-item">
                      📅 Posted {postedDateStr}
                    </span>
                  </div>

                  {Array.isArray(job.tags) && job.tags.length > 0 && (
                    <div className="wrk-job-card-tags">
                      {job.tags.map((tag) => (
                        <span key={tag} className="wrk-job-card-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="wrk-job-card-footer">
                    <div className="wrk-job-card-employer-info">
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        🏢 {employerName}
                      </span>
                      {isEmpVerified && (
                        <span className="wrk-verified-employer-badge" title="Verified Employer">
                          ✓ Verified Employer
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="wrk-view-details-btn"
                      onClick={() => setActiveJobModal(job)}
                    >
                      {isApplied ? 'View Details (Applied)' : 'View Details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STEP 4: JOB DETAILS MODAL ── */}
      {activeJobModal && (
        <div
          className="wrk-modal-backdrop"
          onClick={() => setActiveJobModal(null)}
        >
          <div
            className="wrk-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="wrk-modal-header">
              <div className="wrk-modal-title-group">
                <div className="wrk-modal-badges">
                  <span className="wrk-modal-dept-badge">
                    {activeJobModal.department}
                  </span>
                  <span className="wrk-modal-active-badge">
                    ● Active Listing
                  </span>
                </div>
                <h2 className="wrk-modal-title">{activeJobModal.title}</h2>
              </div>
              <button
                type="button"
                className="wrk-modal-close-btn"
                onClick={() => setActiveJobModal(null)}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="wrk-modal-body">
              {/* 1. Job Information Section */}
              <div className="wrk-modal-section">
                <h3 className="wrk-modal-section-title">Job Information</h3>
                <div className="wrk-modal-info-grid">
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Department</span>
                    <span className="wrk-modal-info-value">{activeJobModal.department}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Payment</span>
                    <span className="wrk-modal-info-value" style={{ color: '#059669' }}>
                      {activeJobModal.pay}
                    </span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Location</span>
                    <span className="wrk-modal-info-value">{activeJobModal.location}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Job Type</span>
                    <span className="wrk-modal-info-value">{activeJobModal.type}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Duration</span>
                    <span className="wrk-modal-info-value">
                      {activeJobModal.duration || 'Not specified'}
                    </span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Workers Required</span>
                    <span className="wrk-modal-info-value">
                      {activeJobModal.workersRequired
                        ? `${activeJobModal.workersRequired} worker${activeJobModal.workersRequired > 1 ? 's' : ''}`
                        : 'Not specified'}
                    </span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Posted Date</span>
                    <span className="wrk-modal-info-value">
                      {activeJobModal.createdAt
                        ? new Date(activeJobModal.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Recently'}
                    </span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Listing Status</span>
                    <span className="wrk-modal-info-value" style={{ color: '#2563eb' }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Work Description Section */}
              <div className="wrk-modal-section">
                <h3 className="wrk-modal-section-title">Work Description</h3>
                <div className="wrk-modal-desc-box">
                  {activeJobModal.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* 3. Requirements Section */}
              {Array.isArray(activeJobModal.tags) && activeJobModal.tags.length > 0 && (
                <div className="wrk-modal-section">
                  <h3 className="wrk-modal-section-title">Skills & Requirements</h3>
                  <div className="wrk-modal-tags-box">
                    {activeJobModal.tags.map((tag) => (
                      <span key={tag} className="wrk-modal-tag">
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Employer Information Section */}
              <div className="wrk-modal-section">
                <h3 className="wrk-modal-section-title">Employer Information</h3>
                <div className="wrk-modal-employer-box">
                  <div className="wrk-modal-employer-left">
                    <div className="wrk-modal-emp-avatar">
                      {(activeJobModal.employer?.name || activeJobModal.employer?.firstName || 'E')[0].toUpperCase()}
                    </div>
                    <div className="wrk-modal-emp-details">
                      <span className="wrk-modal-emp-name">
                        {activeJobModal.employer?.name ||
                          `${activeJobModal.employer?.firstName || ''} ${activeJobModal.employer?.lastName || ''}`.trim() ||
                          'WorkLink Employer'}
                      </span>
                      <span className="wrk-modal-emp-sub">
                        <span>📍 {activeJobModal.location}</span>
                        {activeJobModal.employer?.trustScore && (
                          <>
                            <span>•</span>
                            <span>🛡️ Trust Score: {activeJobModal.employer.trustScore} pts</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    {Boolean(
                      activeJobModal.employer?.isVerified ||
                        (activeJobModal.employer?.trustScore && activeJobModal.employer.trustScore >= 70)
                    ) ? (
                      <span className="wrk-verified-employer-badge" style={{ fontSize: 12, padding: '4px 10px' }}>
                        ✓ Verified Employer
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Employer Registered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer: Pay & Apply Now Action */}
            <div className="wrk-modal-footer">
              <div className="wrk-modal-footer-pay">
                <span className="wrk-modal-footer-pay-label">Offered Compensation</span>
                <span className="wrk-modal-footer-pay-val">{activeJobModal.pay}</span>
              </div>

              {appliedMap[String(activeJobModal._id || activeJobModal.id)] ? (
                <button
                  type="button"
                  className="wrk-modal-apply-btn applied"
                  disabled
                >
                  ✓ Already Applied ({appliedMap[String(activeJobModal._id || activeJobModal.id)]})
                </button>
              ) : (
                <button
                  type="button"
                  className="wrk-modal-apply-btn"
                  onClick={() => handleInitiateApply(activeJobModal)}
                  disabled={applying}
                >
                  {applying ? 'Submitting Application…' : 'Apply Now →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 12A: DYNAMIC 2% PLATFORM FEE CONFIRMATION RECEIPT MODAL ── */}
      <WorkerFeeReceiptModal
        job={feeReceiptJob}
        isOpen={Boolean(feeReceiptJob)}
        onClose={() => setFeeReceiptJob(null)}
        onConfirmApply={handleConfirmApplication}
        applying={applying}
      />
    </div>
  );
}

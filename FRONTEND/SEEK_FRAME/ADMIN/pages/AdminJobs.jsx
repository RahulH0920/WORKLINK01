import React, { useState, useEffect, useMemo } from "react";
import { getAdminJobs, getJobs } from "../../data/api";

const AdminJobs = ({ setActivePage, initialJobId = null, initialFilter = "all", initialSearch = "" }) => {
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filters
  const [search, setSearch] = useState(initialSearch || "");
  const [statusFilter, setStatusFilter] = useState(initialFilter || "all"); // 'all', 'active', 'with_applications', 'in_progress', 'completed', 'closed', 'disputed'
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  
  // Selected Job for Details Modal
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      // Try admin-specific jobs API first, fallback to getJobs
      let loadedJobs = [];
      let loadedSummary = null;

      try {
        const res = await getAdminJobs();
        if (res.success && res.jobs) {
          loadedJobs = res.jobs;
          loadedSummary = res.summary || null;
        }
      } catch (adminErr) {
        console.warn("getAdminJobs failed, falling back to getJobs:", adminErr);
        const fallbackRes = await getJobs();
        if (fallbackRes.success && fallbackRes.jobs) {
          loadedJobs = fallbackRes.jobs;
        }
      }

      setJobs(loadedJobs);
      setSummary(loadedSummary);

      // Auto open job modal if initialJobId was provided
      if (initialJobId) {
        const found = loadedJobs.find((j) => (j._id || j.id) === initialJobId);
        if (found) setSelectedJob(found);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setError("Unable to load job listings from database. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [initialJobId]);

  // Unique departments & locations for filter dropdowns
  const availableDepartments = useMemo(() => {
    const set = new Set();
    jobs.forEach((j) => {
      if (j.department) set.add(j.department);
    });
    return ["All", ...Array.from(set)];
  }, [jobs]);

  const availableLocations = useMemo(() => {
    const set = new Set();
    jobs.forEach((j) => {
      if (j.location && j.location !== "Not specified") set.add(j.location);
    });
    return ["All", ...Array.from(set)];
  }, [jobs]);

  // Dynamic summary metrics calculated from real data
  const totalJobsCount = summary?.totalJobs ?? jobs.length;
  const activeJobsCount = summary?.activeJobs ?? jobs.filter((j) => (j.status || "active").toLowerCase() === "active" && j.completionStatus !== "completed" && j.completionStatus !== "disputed" && !j.disputeReason).length;
  const withAppsCount = summary?.jobsWithApplications ?? jobs.filter((j) => (j.applications?.length || 0) > 0).length;
  const inProgressCount = summary?.inProgressJobs ?? jobs.filter((j) => j.completionStatus === "in_progress" || j.completionStatus === "waiting_employer_confirmation").length;
  const completedCount = summary?.completedJobs ?? jobs.filter((j) => j.completionStatus === "completed").length;
  const closedCount = summary?.closedJobs ?? jobs.filter((j) => (j.status || "").toLowerCase() === "closed").length;
  const disputedCount = summary?.disputedJobs ?? jobs.filter((j) => j.completionStatus === "disputed" || Boolean(j.disputeReason) || j.isDisputed).length;

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.trim().toLowerCase();
      const title = (j.title || "").toLowerCase();
      const description = (j.description || "").toLowerCase();
      const location = (j.location || "").toLowerCase();
      const department = (j.department || "").toLowerCase();

      const employer = j.employer || {};
      const empName = (employer.name || `${employer.firstName || ""} ${employer.lastName || ""}`.trim() || "").toLowerCase();
      const empEmail = (employer.email || "").toLowerCase();

      const worker = j.hiredWorker || {};
      const wrkName = (worker.name || `${worker.firstName || ""} ${worker.lastName || ""}`.trim() || "").toLowerCase();
      const wrkEmail = (worker.email || "").toLowerCase();

      const matchesSearch =
        !q ||
        title.includes(q) ||
        description.includes(q) ||
        location.includes(q) ||
        department.includes(q) ||
        empName.includes(q) ||
        empEmail.includes(q) ||
        wrkName.includes(q) ||
        wrkEmail.includes(q);

      if (!matchesSearch) return false;

      // Department filter
      if (departmentFilter !== "All" && j.department !== departmentFilter) {
        return false;
      }

      // Location filter
      if (locationFilter !== "All" && j.location !== locationFilter) {
        return false;
      }

      // Status filter
      const jobStatus = (j.status || "active").toLowerCase();
      const completionStatus = j.completionStatus || "in_progress";
      const isDisputed = completionStatus === "disputed" || Boolean(j.disputeReason) || j.isDisputed;
      const isCompleted = completionStatus === "completed";
      const isInProgress = completionStatus === "in_progress" || completionStatus === "waiting_employer_confirmation";
      const hasApps = (j.applications?.length || 0) > 0;

      if (statusFilter === "active") {
        return jobStatus === "active" && !isCompleted && !isDisputed;
      }
      if (statusFilter === "with_applications") {
        return hasApps;
      }
      if (statusFilter === "in_progress") {
        return isInProgress;
      }
      if (statusFilter === "completed") {
        return isCompleted;
      }
      if (statusFilter === "closed") {
        return jobStatus === "closed";
      }
      if (statusFilter === "disputed") {
        return isDisputed;
      }

      return true;
    });
  }, [jobs, search, statusFilter, departmentFilter, locationFilter]);

  const getJobStatusBadge = (job) => {
    if (job.completionStatus === "disputed" || Boolean(job.disputeReason) || job.isDisputed) {
      return { label: "Disputed", className: "danger", icon: "🚨" };
    }
    if (job.completionStatus === "completed" || job.status === "completed") {
      return { label: "Completed", className: "verified", icon: "✅" };
    }
    if (job.completionStatus === "waiting_employer_confirmation") {
      return { label: "Reviewing Completion", className: "pending", icon: "⏳" };
    }
    if (job.hiredWorker || job.completionStatus === "in_progress") {
      return { label: "In Progress", className: "in-progress", icon: "⚡" };
    }
    if (job.status === "closed") {
      return { label: "Closed", className: "closed", icon: "🔒" };
    }
    return { label: "Active", className: "verified", icon: "🟢" };
  };

  const getPaymentStageBadge = (job) => {
    if (job.paymentStage) {
      return job.paymentStage;
    }
    if (job.workerSettled || job.isSettled) return "Settled";
    if (job.remainingPaymentPaid || job.paymentStatus === "fully_paid") return "Remaining Payment";
    if (job.hiredWorker || job.transactionId || job.advancePaidAmount > 0) return "Advance Paid";
    return "Pending";
  };

  const formatCurrency = (val) => {
    const num = typeof val === "number" ? val : parseFloat(String(val || "0").replace(/[^0-9.]/g, "") || "0");
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="admin-page-container fade-in">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>💼 Job Management</h1>
          <p>Complete moderation of employer gig postings, worker applications, milestones, payments, and resolution lifecycle.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={fetchJobs} title="Refresh live database data">
            🔄 Refresh Data
          </button>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (Clickable to Filter) */}
      <div className="overview-7-cards-grid" style={{ marginBottom: 24 }}>
        {/* Total Jobs */}
        <div
          className={`ref-stat-card card-theme-blue ${statusFilter === "all" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">💼</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Jobs</span>
            <div className="stat-card-value">{loading ? "..." : totalJobsCount}</div>
            <span className="stat-card-subtext positive">All Database Postings</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-blue">→</div>
          </div>
        </div>

        {/* Active Jobs */}
        <div
          className={`ref-stat-card card-theme-green ${statusFilter === "active" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("active")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-green">🟢</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Active Jobs</span>
            <div className="stat-card-value">{loading ? "..." : activeJobsCount}</div>
            <span className="stat-card-subtext positive">Open for Hiring</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-green">→</div>
          </div>
        </div>

        {/* Jobs with Applications */}
        <div
          className={`ref-stat-card card-theme-purple ${statusFilter === "with_applications" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("with_applications")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-purple">👥</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">With Applications</span>
            <div className="stat-card-value">{loading ? "..." : withAppsCount}</div>
            <span className="stat-card-subtext positive">Worker Applied</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-purple">→</div>
          </div>
        </div>

        {/* Jobs In Progress */}
        <div
          className={`ref-stat-card card-theme-amber ${statusFilter === "in_progress" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("in_progress")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">⚡</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">In Progress</span>
            <div className="stat-card-value">{loading ? "..." : inProgressCount}</div>
            <span className="stat-card-subtext warning">Hired / Working</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-amber">→</div>
          </div>
        </div>

        {/* Completed Jobs */}
        <div
          className={`ref-stat-card card-theme-teal ${statusFilter === "completed" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("completed")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-teal">✅</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Completed</span>
            <div className="stat-card-value">{loading ? "..." : completedCount}</div>
            <span className="stat-card-subtext positive">Finished & Settled</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-teal">→</div>
          </div>
        </div>

        {/* Closed Jobs */}
        <div
          className={`ref-stat-card card-theme-pink ${statusFilter === "closed" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("closed")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-pink">🔒</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Cancelled / Closed</span>
            <div className="stat-card-value">{loading ? "..." : closedCount}</div>
            <span className="stat-card-subtext">Inactive Listings</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-pink">→</div>
          </div>
        </div>

        {/* Disputed Jobs */}
        <div
          className={`ref-stat-card card-theme-red ${statusFilter === "disputed" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("disputed")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-red">🚨</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Disputed Jobs</span>
            <div className="stat-card-value">{loading ? "..." : disputedCount}</div>
            <span className="stat-card-subtext" style={{ color: "var(--admin-red)" }}>Needs Resolution</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-red">→</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="admin-filter-bar card-shell" style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div className="admin-search-wrapper" style={{ flex: "1 1 300px", minWidth: 260 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by job title, employer, worker, location, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--admin-muted)" }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Category:</label>
            <select
              className="admin-select-input"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All Categories" : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Location:</label>
            <select
              className="admin-select-input"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === "All" ? "All Locations" : loc}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(search || statusFilter !== "all" || departmentFilter !== "All" || locationFilter !== "All") && (
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDepartmentFilter("All");
                setLocationFilter("All");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Quick Status Chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", borderTop: "1px solid var(--admin-border-light)", paddingTop: 12 }}>
          {[
            { id: "all", label: "All Jobs", count: totalJobsCount },
            { id: "active", label: "Active", count: activeJobsCount },
            { id: "with_applications", label: "With Applications", count: withAppsCount },
            { id: "in_progress", label: "In Progress", count: inProgressCount },
            { id: "completed", label: "Completed", count: completedCount },
            { id: "closed", label: "Closed", count: closedCount },
            { id: "disputed", label: "Disputed", count: disputedCount },
          ].map((chip) => (
            <button
              key={chip.id}
              className={`filter-chip ${statusFilter === chip.id ? "active" : ""}`}
              onClick={() => setStatusFilter(chip.id)}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Jobs Table */}
      <div className="admin-panel card-shell">
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Job Listings ({filteredJobs.length})
            </h3>
            {statusFilter !== "all" && (
              <span className="doc-chip" style={{ background: "rgba(37, 99, 235, 0.1)", color: "var(--admin-blue)", fontSize: 11, padding: "2px 8px" }}>
                Filtered: {statusFilter.replace("_", " ").toUpperCase()}
              </span>
            )}
          </div>
          <span className="panel-tag blue">Real Database Sync</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div className="review-spinner" />
            <p style={{ color: "var(--admin-muted)", marginTop: 12 }}>Loading job listings from MongoDB...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <p style={{ color: "var(--admin-red)", fontWeight: 600 }}>{error}</p>
            <button className="btn-action review" style={{ marginTop: 12, padding: "8px 16px" }} onClick={fetchJobs}>
              Retry Loading
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h4 style={{ margin: "0 0 6px", color: "var(--admin-text-dark)" }}>No jobs found</h4>
            <p style={{ color: "var(--admin-muted)", margin: "0 0 16px" }}>
              No job postings matched your current search and filter settings.
            </p>
            <button
              className="btn-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDepartmentFilter("All");
                setLocationFilter("All");
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Job Title & Category</th>
                  <th>Employer</th>
                  <th>Location & Pay</th>
                  <th>Applications</th>
                  <th>Selected Worker</th>
                  <th>Job Status</th>
                  <th>Payment Status</th>
                  <th>Posted / Completed Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j) => {
                  const employer = j.employer || {};
                  const empName = typeof employer === "object"
                    ? (employer.name || `${employer.firstName || ""} ${employer.lastName || ""}`.trim() || "WorkLink Employer")
                    : "WorkLink Employer";
                  const empId = typeof employer === "object" ? (employer._id || employer.id) : employer;

                  const worker = j.hiredWorker || (j.applications?.find((a) => a.status === "accepted" || a.status === "hired")?.applicant);
                  const workerName = worker && typeof worker === "object"
                    ? (worker.name || `${worker.firstName || ""} ${worker.lastName || ""}`.trim() || "Assigned Worker")
                    : null;
                  const workerId = worker && typeof worker === "object" ? (worker._id || worker.id) : worker;

                  const statusBadge = getJobStatusBadge(j);
                  const paymentStage = getPaymentStageBadge(j);
                  const appsCount = j.applications?.length || 0;

                  return (
                    <tr key={j._id || j.id} className="ref-table-row">
                      {/* Job Title & Details */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <strong
                            className="user-name"
                            style={{ cursor: "pointer", color: "var(--admin-blue)" }}
                            onClick={() => setSelectedJob(j)}
                            title="Click to view complete details"
                          >
                            {j.title}
                          </strong>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span className="doc-chip" style={{ background: "#eff6ff", color: "#2563eb", fontSize: 10.5, padding: "2px 6px" }}>
                              {j.department || "General"}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>• {j.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Employer */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong style={{ fontSize: 13, color: "var(--admin-text-dark)" }}>{empName}</strong>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {employer?.trustScore !== undefined && (
                              <span style={{ fontSize: 11, color: "var(--admin-green)", fontWeight: 700 }}>
                                🛡️ {employer.trustScore} pts
                              </span>
                            )}
                            {employer?.isVerified && (
                              <span style={{ fontSize: 10, background: "rgba(22, 163, 74, 0.1)", color: "var(--admin-green)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Pay */}
                      <td>
                        <div style={{ fontSize: 12.5, color: "var(--admin-text-dark)" }}>📍 {j.location}</div>
                        <div style={{ fontSize: 13, color: "var(--admin-green)", fontWeight: 800 }}>
                          💰 {j.pay}
                        </div>
                      </td>

                      {/* Applications Count */}
                      <td>
                        <button
                          className={`btn-action ${appsCount > 0 ? "review" : "btn-secondary"}`}
                          style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 20 }}
                          onClick={() => setActivePage("Applications", { selectedJobId: j._id || j.id })}
                          title="View applications for this job"
                        >
                          👥 {appsCount} {appsCount === 1 ? "applicant" : "applicants"}
                        </button>
                      </td>

                      {/* Selected Worker */}
                      <td>
                        {workerName ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <strong
                              style={{ fontSize: 12.5, color: "var(--admin-text-dark)", cursor: workerId ? "pointer" : "default" }}
                              onClick={() => workerId && setActivePage("Workers", { selectedWorkerId: workerId })}
                            >
                              👤 {workerName}
                            </strong>
                            {worker?.trustScore !== undefined && (
                              <span style={{ fontSize: 11, color: "var(--admin-green)" }}>
                                🛡️ {worker.trustScore} pts
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--admin-muted)", fontStyle: "italic" }}>
                            None selected
                          </span>
                        )}
                      </td>

                      {/* Job Status */}
                      <td>
                        <span className={`status-pill ${statusBadge.className}`}>
                          {statusBadge.icon} {statusBadge.label}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td>
                        <span
                          className="txn-stage-pill"
                          style={{
                            background:
                              paymentStage === "Settled"
                                ? "rgba(22, 163, 74, 0.12)"
                                : paymentStage === "Remaining Payment"
                                ? "rgba(37, 99, 235, 0.12)"
                                : paymentStage === "Advance Paid"
                                ? "rgba(245, 158, 11, 0.12)"
                                : paymentStage === "Disputed"
                                ? "rgba(239, 68, 68, 0.12)"
                                : "rgba(100, 116, 139, 0.12)",
                            color:
                              paymentStage === "Settled"
                                ? "#15803d"
                                : paymentStage === "Remaining Payment"
                                ? "#2563eb"
                                : paymentStage === "Advance Paid"
                                ? "#b45309"
                                : paymentStage === "Disputed"
                                ? "#dc2626"
                                : "#475569",
                          }}
                        >
                          {paymentStage}
                        </span>
                      </td>

                      {/* Posted Date / Completion */}
                      <td>
                        <div style={{ fontSize: 12, color: "var(--admin-text-dark)" }}>
                          📅 {new Date(j.createdAt).toLocaleDateString()}
                        </div>
                        {j.completionDate && (
                          <div style={{ fontSize: 11, color: "var(--admin-green)", fontWeight: 600 }}>
                            🏁 {new Date(j.completionDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            className="btn-action review"
                            style={{ fontSize: 11.5, padding: "5px 10px" }}
                            onClick={() => setSelectedJob(j)}
                            title="View Full Job Details"
                          >
                            👁️ View
                          </button>
                          {empId && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11.5, padding: "5px 8px" }}
                              onClick={() => setActivePage("Employers", { selectedEmployerId: empId })}
                              title="View Employer Profile"
                            >
                              🏢 Employer
                            </button>
                          )}
                          {workerId && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11.5, padding: "5px 8px" }}
                              onClick={() => setActivePage("Workers", { selectedWorkerId: workerId })}
                              title="View Worker Profile"
                            >
                              👤 Worker
                            </button>
                          )}
                          {(j.effectiveTransactionId || j.transactionId) && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11.5, padding: "5px 8px", background: "rgba(37, 99, 235, 0.08)", color: "var(--admin-blue)" }}
                              onClick={() => setActivePage("Transactions", { selectedTxnId: j.effectiveTransactionId || j.transactionId, selectedJobId: j._id || j.id })}
                              title="View Financial Transaction"
                            >
                              💳 Txn
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COMPLETE READ-ONLY JOB DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedJob && (
        <div className="txn-modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="txn-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960 }}>
            {/* Modal Header */}
            <div className="txn-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2>💼 {selectedJob.title}</h2>
                <span className="panel-tag blue" style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff" }}>
                  {selectedJob.department || "General"}
                </span>
                <span className="txn-readonly-badge" style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }}>
                  🔒 Admin Read-Only
                </span>
              </div>
              <button className="txn-modal-close-btn" onClick={() => setSelectedJob(null)}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="txn-modal-body">
              {/* Dispute Warning Banner (if disputed) */}
              {(selectedJob.completionStatus === "disputed" || Boolean(selectedJob.disputeReason) || selectedJob.isDisputed) && (
                <div className="txn-dispute-banner">
                  <div className="txn-dispute-icon">🚨</div>
                  <div className="txn-dispute-content" style={{ flex: 1 }}>
                    <h4>Job Completion Disputed</h4>
                    <p>{selectedJob.disputeReason || "A completion dispute was registered on this job. Worker remaining payment is currently held."}</p>
                    <div className="txn-dispute-meta">
                      Disputed by: <strong>{selectedJob.disputedBy?.name || "Employer"}</strong>
                      {selectedJob.disputedAt && ` • Date: ${new Date(selectedJob.disputedAt).toLocaleString()}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Quick Metrics */}
              <div className="txn-grid-3">
                <div className="txn-party-card" style={{ textAlign: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>Job Amount / Pay</label>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--admin-green)", marginTop: 4 }}>
                    {selectedJob.pay || "₹1000"}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>Type: {selectedJob.type}</span>
                </div>

                <div className="txn-party-card" style={{ textAlign: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>Lifecycle Status</label>
                  <div style={{ marginTop: 6 }}>
                    {(() => {
                      const badge = getJobStatusBadge(selectedJob);
                      return (
                        <span className={`status-pill ${badge.className}`}>
                          {badge.icon} {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginTop: 4 }}>
                    Stage: {getPaymentStageBadge(selectedJob)}
                  </span>
                </div>

                <div className="txn-party-card" style={{ textAlign: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>Total Applications</label>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--admin-blue)", marginTop: 4 }}>
                    {selectedJob.applications?.length || 0}
                  </div>
                  <button
                    className="btn-action review"
                    style={{ fontSize: 11, padding: "3px 10px", marginTop: 4 }}
                    onClick={() => {
                      setSelectedJob(null);
                      setActivePage("Applications", { selectedJobId: selectedJob._id || selectedJob.id });
                    }}
                  >
                    View in Applications →
                  </button>
                </div>
              </div>

              {/* Parties Section (Employer & Hired Worker) */}
              <div className="txn-grid-2">
                {/* Employer Info */}
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar employer">🏢</div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Employer Details</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Job Poster</div>
                    </div>
                  </div>
                  {selectedJob.employer ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <div className="detail-item">
                        <label>Name</label>
                        <span>{selectedJob.employer.name || `${selectedJob.employer.firstName || ""} ${selectedJob.employer.lastName || ""}`.trim() || "Employer"}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email</label>
                        <span>{selectedJob.employer.email || "Not provided"}</span>
                      </div>
                      <div className="detail-item">
                        <label>Phone / Location</label>
                        <span>{selectedJob.employer.phone || "N/A"} • {selectedJob.employer.location || selectedJob.location}</span>
                      </div>
                      <div className="detail-item">
                        <label>Trust Score & Verification</label>
                        <span>
                          🛡️ {selectedJob.employer.trustScore || 0} pts • {selectedJob.employer.isVerified ? "✅ Verified" : "⏳ Pending"}
                        </span>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ marginTop: 8, fontSize: 12 }}
                        onClick={() => {
                          const empId = selectedJob.employer._id || selectedJob.employer.id || selectedJob.employer;
                          setSelectedJob(null);
                          setActivePage("Employers", { selectedEmployerId: empId });
                        }}
                      >
                        Open Employer Profile →
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: "var(--admin-muted)", fontSize: 13 }}>Employer record not available</p>
                  )}
                </div>

                {/* Selected / Hired Worker Info */}
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar worker">👤</div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Selected Worker</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Assigned Freelancer / Seeker</div>
                    </div>
                  </div>
                  {selectedJob.hiredWorker || selectedJob.applications?.find((a) => a.status === "accepted" || a.status === "hired") ? (
                    (() => {
                      const wrk = selectedJob.hiredWorker || selectedJob.applications?.find((a) => a.status === "accepted" || a.status === "hired")?.applicant;
                      const wrkId = typeof wrk === "object" ? (wrk._id || wrk.id) : wrk;
                      const wrkName = typeof wrk === "object" ? (wrk.name || `${wrk.firstName || ""} ${wrk.lastName || ""}`.trim() || "Worker") : "Worker";

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                          <div className="detail-item">
                            <label>Name</label>
                            <span>{wrkName}</span>
                          </div>
                          <div className="detail-item">
                            <label>Email</label>
                            <span>{wrk?.email || "Not provided"}</span>
                          </div>
                          <div className="detail-item">
                            <label>Phone / Location</label>
                            <span>{wrk?.phone || "N/A"} • {wrk?.location || "Not specified"}</span>
                          </div>
                          <div className="detail-item">
                            <label>Trust Score & Verification</label>
                            <span>
                              🛡️ {wrk?.trustScore || 0} pts • {wrk?.isVerified ? "✅ Verified Worker" : "⏳ Pending"}
                            </span>
                          </div>
                          {wrkId && (
                            <button
                              className="btn-secondary"
                              style={{ marginTop: 8, fontSize: 12 }}
                              onClick={() => {
                                setSelectedJob(null);
                                setActivePage("Workers", { selectedWorkerId: wrkId });
                              }}
                            >
                              Open Worker Profile →
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ padding: "16px 0", textAlign: "center", color: "var(--admin-muted)" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 13 }}>No worker has been hired for this job yet.</p>
                      <span style={{ fontSize: 12 }}>Review applicants below or under Applications tab.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Specification Section */}
              <div className="txn-section-card">
                <h4 className="txn-section-title">📋 Job Description & Requirements</h4>
                <div style={{ fontSize: 13.5, color: "var(--admin-text-dark)", lineHeight: 1.6, marginBottom: 14 }}>
                  {selectedJob.description || "No description provided."}
                </div>

                <div className="txn-grid-3" style={{ marginBottom: 12 }}>
                  <div className="detail-item">
                    <label>Department / Category</label>
                    <span>{selectedJob.department || "General"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Job Type</label>
                    <span>{selectedJob.type}</span>
                  </div>
                  <div className="detail-item">
                    <label>Location</label>
                    <span>📍 {selectedJob.location}</span>
                  </div>
                </div>

                {selectedJob.tags && selectedJob.tags.length > 0 && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Required Skills & Tags
                    </label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedJob.tags.map((tag, idx) => (
                        <span key={idx} className="doc-chip" style={{ background: "#f1f5f9", color: "#334155", padding: "4px 8px", fontSize: 12 }}>
                          🏷️ {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Financial & Payment Overview */}
              <div className="txn-section-card">
                <h4 className="txn-section-title">💳 Financials & Milestone Payments</h4>
                {(() => {
                  const fin = selectedJob.finances || {
                    jobAmount: 1000,
                    employerFee: 20,
                    employerTotal: 1020,
                    advanceAmount: 510,
                    remainingAmount: 510,
                    workerFee: 20,
                    workerNetEarning: 980,
                    platformRevenue: 40,
                  };

                  return (
                    <div>
                      <div className="txn-grid-2" style={{ marginBottom: 12 }}>
                        <div>
                          <div className="txn-financial-row">
                            <span>Base Job Amount:</span>
                            <strong>{formatCurrency(fin.jobAmount)}</strong>
                          </div>
                          <div className="txn-financial-row">
                            <span>Employer Fee (2% Platform):</span>
                            <span>{formatCurrency(fin.employerFee)}</span>
                          </div>
                          <div className="txn-financial-row highlight">
                            <span>Employer Total Paid:</span>
                            <span>{formatCurrency(fin.employerTotal)}</span>
                          </div>
                        </div>

                        <div>
                          <div className="txn-financial-row">
                            <span>Advance Payment (50% Milestone):</span>
                            <strong style={{ color: selectedJob.hiredWorker ? "var(--admin-green)" : "var(--admin-muted)" }}>
                              {formatCurrency(fin.advanceAmount)} {selectedJob.hiredWorker ? "(Paid)" : "(Pending)"}
                            </strong>
                          </div>
                          <div className="txn-financial-row">
                            <span>Remaining Payment (50% Milestone):</span>
                            <strong style={{ color: selectedJob.remainingPaymentPaid ? "var(--admin-green)" : "var(--admin-muted)" }}>
                              {formatCurrency(fin.remainingAmount)} {selectedJob.remainingPaymentPaid ? "(Paid)" : "(Pending Completion)"}
                            </strong>
                          </div>
                          <div className="txn-financial-row success-highlight">
                            <span>Worker Net Earning:</span>
                            <span>{formatCurrency(fin.workerNetEarning)}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--admin-border-light)", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                          Platform Total Revenue: <strong style={{ color: "var(--admin-blue)" }}>{formatCurrency(fin.platformRevenue)}</strong>
                          {selectedJob.effectiveTransactionId && ` • Linked Txn: ${selectedJob.effectiveTransactionId}`}
                        </div>

                        {(selectedJob.effectiveTransactionId || selectedJob.transactionId) && (
                          <button
                            className="btn-action review"
                            style={{ fontSize: 11.5, padding: "5px 12px" }}
                            onClick={() => {
                              const txnId = selectedJob.effectiveTransactionId || selectedJob.transactionId;
                              setSelectedJob(null);
                              setActivePage("Transactions", { selectedTxnId: txnId, selectedJobId: selectedJob._id || selectedJob.id });
                            }}
                          >
                            View Full Transaction Record →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Job Applications List */}
              <div className="txn-section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 className="txn-section-title" style={{ margin: 0 }}>
                    👥 Job Applications ({selectedJob.applications?.length || 0})
                  </h4>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 11.5, padding: "4px 10px" }}
                    onClick={() => {
                      setSelectedJob(null);
                      setActivePage("Applications", { selectedJobId: selectedJob._id || selectedJob.id });
                    }}
                  >
                    Open in Applications Page →
                  </button>
                </div>

                {!selectedJob.applications || selectedJob.applications.length === 0 ? (
                  <p style={{ color: "var(--admin-muted)", fontSize: 13, margin: 0 }}>No workers have applied for this job yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="ref-table" style={{ background: "#ffffff", borderRadius: 8 }}>
                      <thead>
                        <tr>
                          <th>Worker Name</th>
                          <th>Trust Score</th>
                          <th>Verification</th>
                          <th>Applied Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedJob.applications.map((app) => {
                          const applicant = app.applicant || {};
                          const applicantId = typeof applicant === "object" ? (applicant._id || applicant.id) : applicant;
                          const applicantName = typeof applicant === "object"
                            ? (applicant.name || `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Worker")
                            : "Worker";

                          return (
                            <tr key={app._id || applicantId}>
                              <td>
                                <strong style={{ fontSize: 13 }}>{applicantName}</strong>
                                <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{applicant?.email || ""}</div>
                              </td>
                              <td>
                                <strong style={{ color: "var(--admin-green)", fontSize: 12 }}>
                                  🛡️ {applicant?.trustScore || 0} pts
                                </strong>
                              </td>
                              <td>
                                <span className={`status-pill ${applicant?.isVerified ? "verified" : "pending"}`} style={{ fontSize: 10 }}>
                                  {applicant?.isVerified ? "Verified" : "Pending"}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                                  {new Date(app.appliedAt || selectedJob.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${
                                    app.status === "accepted" || app.status === "hired"
                                      ? "verified"
                                      : app.status === "rejected"
                                      ? "danger"
                                      : "pending"
                                  }`}
                                  style={{ fontSize: 10.5 }}
                                >
                                  {app.status === "accepted" || app.status === "hired"
                                    ? "🎉 Hired"
                                    : app.status === "rejected"
                                    ? "❌ Rejected"
                                    : "⏳ Pending"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {applicantId && (
                                  <button
                                    className="btn-secondary"
                                    style={{ fontSize: 11, padding: "3px 8px" }}
                                    onClick={() => {
                                      setSelectedJob(null);
                                      setActivePage("Workers", { selectedWorkerId: applicantId });
                                    }}
                                  >
                                    View Worker
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dates & Timeline Info */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--admin-muted)", padding: "8px 4px" }}>
                <span>Job ID: <code style={{ color: "var(--admin-text-dark)" }}>{selectedJob._id || selectedJob.id}</code></span>
                <span>Created: {new Date(selectedJob.createdAt).toLocaleString()}</span>
                <span>Last Updated: {new Date(selectedJob.updatedAt || selectedJob.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJobs;

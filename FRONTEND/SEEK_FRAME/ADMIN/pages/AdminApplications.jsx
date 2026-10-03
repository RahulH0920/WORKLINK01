import React, { useState, useEffect, useMemo } from "react";
import { getAdminApplications, getJobs } from "../../data/api";

const AdminApplications = ({
  setActivePage,
  initialAppId = null,
  initialJobId = null,
  initialStatusFilter = "all",
  initialSearch = ""
}) => {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filters
  const [search, setSearch] = useState(initialSearch || "");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "all"); // 'all', 'pending', 'accepted', 'rejected', 'active_jobs', 'completed_jobs'
  const [jobFilter, setJobFilter] = useState(initialJobId || "All");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // Selected Application for Details Modal
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");
    try {
      let loadedApps = [];
      let loadedSummary = null;

      try {
        const res = await getAdminApplications();
        if (res.success && res.applications) {
          loadedApps = res.applications;
          loadedSummary = res.summary || null;
        }
      } catch (adminErr) {
        console.warn("getAdminApplications failed, fallback to getJobs:", adminErr);
        const fallbackRes = await getJobs();
        if (fallbackRes.success && fallbackRes.jobs) {
          const apps = [];
          fallbackRes.jobs.forEach((j) => {
            if (j.applications && Array.isArray(j.applications)) {
              j.applications.forEach((app) => {
                const applicant = app.applicant || {};
                const applicantId = typeof applicant === "object" ? (applicant._id || applicant.id) : applicant;
                const emp = j.employer || {};
                const isHired = (app.status === "accepted" || app.status === "hired") || (j.hiredWorker && (j.hiredWorker._id || j.hiredWorker) === applicantId);

                let hiringStage = "Pending Review";
                if (app.status === "rejected") {
                  hiringStage = "Rejected";
                } else if (isHired) {
                  if (j.completionStatus === "completed" || j.workerSettled) hiringStage = "Completed";
                  else if (j.completionStatus === "disputed") hiringStage = "Disputed";
                  else if (j.completionStatus === "waiting_employer_confirmation") hiringStage = "Work Submitted";
                  else hiringStage = "Hired / In Progress";
                } else if (app.status === "shortlisted") {
                  hiringStage = "Shortlisted";
                }

                apps.push({
                  _id: app._id || `${j._id}-${applicantId}`,
                  applicationId: app._id || `${j._id}-${applicantId}`,
                  status: app.status || "pending",
                  appliedAt: app.appliedAt || j.createdAt,
                  hiringStage,
                  isHired,
                  worker: {
                    _id: applicantId,
                    id: applicantId,
                    name: typeof applicant === "object" ? (applicant.name || `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Worker") : "Worker",
                    email: applicant.email || "Not available",
                    phone: applicant.phone || "Not available",
                    location: applicant.location || "Not specified",
                    trustScore: applicant.trustScore || 0,
                    isVerified: Boolean(applicant.isVerified),
                    verificationStatus: applicant.verificationStatus || (applicant.isVerified ? "approved" : "not_submitted"),
                    skills: applicant.skills || [],
                    bio: applicant.bio || "",
                  },
                  job: {
                    _id: j._id,
                    id: j._id,
                    title: j.title,
                    department: j.department,
                    pay: j.pay,
                    type: j.type,
                    location: j.location,
                    description: j.description,
                    status: j.status || "active",
                    completionStatus: j.completionStatus || "in_progress",
                    createdAt: j.createdAt,
                    transactionId: j.transactionId,
                  },
                  employer: {
                    _id: typeof emp === "object" ? (emp._id || emp.id) : emp,
                    id: typeof emp === "object" ? (emp._id || emp.id) : emp,
                    name: typeof emp === "object" ? (emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employer") : "Employer",
                    email: emp.email || "Not available",
                    phone: emp.phone || "Not available",
                    location: emp.location || "Not specified",
                    trustScore: emp.trustScore || 0,
                    isVerified: Boolean(emp.isVerified),
                  },
                  transaction: j.transactionId ? { transactionId: j.transactionId } : null,
                });
              });
            }
          });
          loadedApps = apps;
        }
      }

      setApplications(loadedApps);
      setSummary(loadedSummary);

      // Auto open application modal if initialAppId was specified
      if (initialAppId) {
        const found = loadedApps.find((a) => a._id === initialAppId || a.applicationId === initialAppId);
        if (found) setSelectedApp(found);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError("Unable to load application records from database. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [initialAppId, initialJobId]);

  // Unique jobs & departments list for filters
  const uniqueJobsList = useMemo(() => {
    const map = new Map();
    applications.forEach((a) => {
      if (a.job?._id && a.job?.title) {
        map.set(a.job._id, a.job.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [applications]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    applications.forEach((a) => {
      if (a.job?.department) set.add(a.job.department);
    });
    return ["All", ...Array.from(set)];
  }, [applications]);

  // Dynamic summary metrics calculated from real data
  const totalAppsCount = summary?.totalApplications ?? applications.length;
  const pendingAppsCount = summary?.pendingApplications ?? applications.filter((a) => a.status === "pending").length;
  const acceptedAppsCount = summary?.acceptedApplications ?? applications.filter((a) => a.status === "accepted" || a.status === "hired" || a.isHired).length;
  const rejectedAppsCount = summary?.rejectedApplications ?? applications.filter((a) => a.status === "rejected").length;
  const activeJobAppsCount = summary?.activeJobApplications ?? applications.filter((a) => (a.job?.status || "active").toLowerCase() === "active").length;
  const completedJobAppsCount = summary?.completedJobApplications ?? applications.filter((a) => a.job?.completionStatus === "completed").length;

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((a) => {
      const q = search.trim().toLowerCase();
      const workerName = (a.worker?.name || "").toLowerCase();
      const workerEmail = (a.worker?.email || "").toLowerCase();
      const jobTitle = (a.job?.title || "").toLowerCase();
      const employerName = (a.employer?.name || "").toLowerCase();
      const location = (a.worker?.location || a.job?.location || "").toLowerCase();

      const matchesSearch =
        !q ||
        workerName.includes(q) ||
        workerEmail.includes(q) ||
        jobTitle.includes(q) ||
        employerName.includes(q) ||
        location.includes(q);

      if (!matchesSearch) return false;

      // Job specific filter
      if (jobFilter !== "All" && a.job?._id !== jobFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== "All" && a.job?.department !== departmentFilter) {
        return false;
      }

      // Status filter
      const st = a.status?.toLowerCase();
      const isAcceptedOrHired = st === "accepted" || st === "hired" || a.isHired;
      const isJobActive = (a.job?.status || "active").toLowerCase() === "active";
      const isJobCompleted = a.job?.completionStatus === "completed";

      if (statusFilter === "pending") {
        return st === "pending";
      }
      if (statusFilter === "accepted") {
        return isAcceptedOrHired;
      }
      if (statusFilter === "rejected") {
        return st === "rejected";
      }
      if (statusFilter === "active_jobs") {
        return isJobActive;
      }
      if (statusFilter === "completed_jobs") {
        return isJobCompleted;
      }

      return true;
    });
  }, [applications, search, statusFilter, jobFilter, departmentFilter]);

  const getApplicationStatusPill = (app) => {
    const st = app.status?.toLowerCase();
    if (st === "accepted" || st === "hired" || app.isHired) {
      return {
        label: "🎉 Hired / Accepted",
        className: "verified",
        style: { background: "var(--admin-green-light, rgba(22, 163, 74, 0.12))", color: "var(--admin-green)" },
      };
    }
    if (st === "rejected") {
      return {
        label: "❌ Rejected",
        className: "danger",
        style: { background: "var(--admin-red-light, rgba(239, 68, 68, 0.12))", color: "var(--admin-red)" },
      };
    }
    if (st === "shortlisted") {
      return {
        label: "⭐ Shortlisted",
        className: "in-progress",
        style: { background: "rgba(139, 92, 246, 0.12)", color: "var(--admin-purple)" },
      };
    }
    return {
      label: "⏳ Pending Review",
      className: "pending",
      style: { background: "var(--admin-amber-light, rgba(245, 158, 11, 0.12))", color: "#b45309" },
    };
  };

  const getHiringStageBadge = (stage) => {
    const s = (stage || "Pending Review").toLowerCase();
    if (s.includes("completed")) {
      return { label: stage, bg: "rgba(22, 163, 74, 0.1)", color: "var(--admin-green)" };
    }
    if (s.includes("disputed")) {
      return { label: stage, bg: "rgba(239, 68, 68, 0.1)", color: "var(--admin-red)" };
    }
    if (s.includes("hired") || s.includes("in progress")) {
      return { label: stage, bg: "rgba(37, 99, 235, 0.1)", color: "var(--admin-blue)" };
    }
    if (s.includes("submitted")) {
      return { label: stage, bg: "rgba(139, 92, 246, 0.1)", color: "var(--admin-purple)" };
    }
    if (s.includes("rejected")) {
      return { label: stage, bg: "rgba(239, 68, 68, 0.1)", color: "var(--admin-red)" };
    }
    return { label: stage, bg: "rgba(245, 158, 11, 0.1)", color: "#b45309" };
  };

  return (
    <div className="admin-page-container fade-in">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>📝 Application Management</h1>
          <p>Real-time monitoring of worker gig applications, employer hiring decisions, trust metrics, and milestone synchronization.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={fetchApplications} title="Refresh live database data">
            🔄 Refresh Data
          </button>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* 6 Clickable Summary Cards */}
      <div className="overview-6-cards-grid" style={{ marginBottom: 24 }}>
        {/* Total Applications */}
        <div
          className={`ref-stat-card card-theme-blue ${statusFilter === "all" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">📄</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Applications</span>
            <div className="stat-card-value">{loading ? "..." : totalAppsCount}</div>
            <span className="stat-card-subtext positive">All Database Submissions</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-blue">→</div>
          </div>
        </div>

        {/* Pending Applications */}
        <div
          className={`ref-stat-card card-theme-amber ${statusFilter === "pending" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("pending")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">⏳</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Pending Review</span>
            <div className="stat-card-value">{loading ? "..." : pendingAppsCount}</div>
            <span className="stat-card-subtext warning">Awaiting Employer Decision</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-amber">→</div>
          </div>
        </div>

        {/* Accepted / Hired */}
        <div
          className={`ref-stat-card card-theme-green ${statusFilter === "accepted" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("accepted")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-green">🎉</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Accepted / Hired</span>
            <div className="stat-card-value">{loading ? "..." : acceptedAppsCount}</div>
            <span className="stat-card-subtext positive">Selected by Employer</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-green">→</div>
          </div>
        </div>

        {/* Rejected */}
        <div
          className={`ref-stat-card card-theme-pink ${statusFilter === "rejected" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("rejected")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-pink">❌</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Rejected</span>
            <div className="stat-card-value">{loading ? "..." : rejectedAppsCount}</div>
            <span className="stat-card-subtext">Declined Submissions</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-pink">→</div>
          </div>
        </div>

        {/* For Active Jobs */}
        <div
          className={`ref-stat-card card-theme-purple ${statusFilter === "active_jobs" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("active_jobs")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-purple">💼</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Active Job Apps</span>
            <div className="stat-card-value">{loading ? "..." : activeJobAppsCount}</div>
            <span className="stat-card-subtext positive">For Open Postings</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-purple">→</div>
          </div>
        </div>

        {/* For Completed Jobs */}
        <div
          className={`ref-stat-card card-theme-teal ${statusFilter === "completed_jobs" ? "card-selected-active" : ""}`}
          onClick={() => setStatusFilter("completed_jobs")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-teal">🏁</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Completed Job Apps</span>
            <div className="stat-card-value">{loading ? "..." : completedJobAppsCount}</div>
            <span className="stat-card-subtext positive">Concluded Work</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-teal">→</div>
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
              placeholder="Search by worker name, job title, employer, email..."
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

          {/* Job Specific Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Job:</label>
            <select
              className="admin-select-input"
              style={{ maxWidth: 220 }}
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
            >
              <option value="All">All Jobs ({uniqueJobsList.length})</option>
              {uniqueJobsList.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title.length > 30 ? `${job.title.substring(0, 30)}...` : job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Category:</label>
            <select
              className="admin-select-input"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All Categories" : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(search || statusFilter !== "all" || jobFilter !== "All" || departmentFilter !== "All") && (
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setJobFilter("All");
                setDepartmentFilter("All");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Quick Status Chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", borderTop: "1px solid var(--admin-border-light)", paddingTop: 12 }}>
          {[
            { id: "all", label: "All Applications", count: totalAppsCount },
            { id: "pending", label: "Pending", count: pendingAppsCount },
            { id: "accepted", label: "Accepted / Hired", count: acceptedAppsCount },
            { id: "rejected", label: "Rejected", count: rejectedAppsCount },
            { id: "active_jobs", label: "Active Jobs", count: activeJobAppsCount },
            { id: "completed_jobs", label: "Completed Jobs", count: completedJobAppsCount },
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

      {/* Main Applications Table */}
      <div className="admin-panel card-shell">
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Worker Applications ({filteredApps.length})
            </h3>
            {jobFilter !== "All" && (
              <span className="doc-chip" style={{ background: "rgba(37, 99, 235, 0.1)", color: "var(--admin-blue)", fontSize: 11, padding: "2px 8px" }}>
                Filtered for Specific Job
              </span>
            )}
          </div>
          <span className="panel-tag blue">Real MongoDB Records</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div className="review-spinner" />
            <p style={{ color: "var(--admin-muted)", marginTop: 12 }}>Loading worker applications...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <p style={{ color: "var(--admin-red)", fontWeight: 600 }}>{error}</p>
            <button className="btn-action review" style={{ marginTop: 12, padding: "8px 16px" }} onClick={fetchApplications}>
              Retry Loading
            </button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h4 style={{ margin: "0 0 6px", color: "var(--admin-text-dark)" }}>No applications found</h4>
            <p style={{ color: "var(--admin-muted)", margin: "0 0 16px" }}>
              No applications matched your current search and filter criteria.
            </p>
            <button
              className="btn-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setJobFilter("All");
                setDepartmentFilter("All");
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
                  <th>Applicant Worker</th>
                  <th>Job Title & Category</th>
                  <th>Employer</th>
                  <th>Trust & KYC</th>
                  <th>App Status</th>
                  <th>Hiring Stage</th>
                  <th>Job Status</th>
                  <th>Applied Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((a) => {
                  const worker = a.worker || {};
                  const job = a.job || {};
                  const employer = a.employer || {};
                  const statusPill = getApplicationStatusPill(a);
                  const stageBadge = getHiringStageBadge(a.hiringStage);

                  const workerId = worker._id || worker.id;
                  const jobId = job._id || job.id;
                  const empId = employer._id || employer.id;

                  return (
                    <tr key={a._id || a.applicationId} className="ref-table-row">
                      {/* Applicant / Worker */}
                      <td>
                        <div className="worker-cell">
                          <div
                            className="worker-avatar"
                            style={{
                              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                              cursor: workerId ? "pointer" : "default",
                            }}
                            onClick={() => workerId && setActivePage("Workers", { selectedWorkerId: workerId })}
                            title="Click to view worker profile"
                          >
                            {(worker.name || "W").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong
                              className="worker-name"
                              style={{ cursor: "pointer", color: "var(--admin-blue)" }}
                              onClick={() => setSelectedApp(a)}
                              title="Click to view application details"
                            >
                              {worker.name}
                            </strong>
                            <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{worker.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Job Title & Pay */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong
                            style={{ fontSize: 13, cursor: jobId ? "pointer" : "default", color: "var(--admin-text-dark)" }}
                            onClick={() => jobId && setActivePage("Jobs", { selectedJobId: jobId })}
                            title="Click to view job in Admin Jobs"
                          >
                            {job.title}
                          </strong>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span className="doc-chip" style={{ background: "#eff6ff", color: "#2563eb", fontSize: 10, padding: "1px 5px" }}>
                              {job.department || "General"}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--admin-green)", fontWeight: 700 }}>
                              💰 {job.pay}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employer */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong
                            style={{ fontSize: 12.5, cursor: empId ? "pointer" : "default", color: "var(--admin-text-dark)" }}
                            onClick={() => empId && setActivePage("Employers", { selectedEmployerId: empId })}
                            title="Click to view employer profile"
                          >
                            🏢 {employer.name}
                          </strong>
                          <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>
                            📍 {employer.location || job.location}
                          </div>
                        </div>
                      </td>

                      {/* Worker Trust & KYC */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong style={{ fontSize: 12.5, color: "var(--admin-green)" }}>
                            🛡️ {worker.trustScore || 0} pts
                          </strong>
                          <div>
                            <span
                              className={`status-pill ${worker.isVerified ? "verified" : "pending"}`}
                              style={{ fontSize: 10, padding: "1px 6px" }}
                            >
                              {worker.isVerified ? "✅ KYC Verified" : "⏳ Unverified"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Application Status */}
                      <td>
                        <span className={`status-pill ${statusPill.className}`} style={statusPill.style}>
                          {statusPill.label}
                        </span>
                      </td>

                      {/* Hiring Stage */}
                      <td>
                        <span
                          className="doc-chip"
                          style={{
                            background: stageBadge.bg,
                            color: stageBadge.color,
                            fontSize: 11,
                            padding: "3px 8px",
                            fontWeight: 700,
                          }}
                        >
                          {stageBadge.label}
                        </span>
                      </td>

                      {/* Related Job Status */}
                      <td>
                        <span
                          className={`status-pill ${
                            job.completionStatus === "completed"
                              ? "verified"
                              : job.completionStatus === "disputed"
                              ? "danger"
                              : job.status === "closed"
                              ? "pending"
                              : "verified"
                          }`}
                          style={{ fontSize: 10.5 }}
                        >
                          {job.completionStatus === "completed"
                            ? "🏁 Completed"
                            : job.completionStatus === "disputed"
                            ? "🚨 Disputed"
                            : job.status === "closed"
                            ? "🔒 Closed"
                            : "🟢 Active"}
                        </span>
                      </td>

                      {/* Applied Date */}
                      <td>
                        <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                          📅 {new Date(a.appliedAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            className="btn-action review"
                            style={{ fontSize: 11, padding: "4px 9px" }}
                            onClick={() => setSelectedApp(a)}
                            title="View Full Application Details"
                          >
                            👁️ View
                          </button>
                          {workerId && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: "4px 7px" }}
                              onClick={() => setActivePage("Workers", { selectedWorkerId: workerId })}
                              title="View Worker Profile"
                            >
                              👤 Worker
                            </button>
                          )}
                          {jobId && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: "4px 7px" }}
                              onClick={() => setActivePage("Jobs", { selectedJobId: jobId })}
                              title="View Job Details"
                            >
                              💼 Job
                            </button>
                          )}
                          {employer && empId && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: "4px 7px" }}
                              onClick={() => setActivePage("Employers", { selectedEmployerId: empId })}
                              title="View Employer Profile"
                            >
                              🏢 Employer
                            </button>
                          )}
                          {(a.transaction?.transactionId || job.transactionId) && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: "4px 7px", background: "rgba(37, 99, 235, 0.08)", color: "var(--admin-blue)" }}
                              onClick={() => setActivePage("Transactions", { selectedTxnId: a.transaction?.transactionId || job.transactionId, selectedJobId: jobId })}
                              title="View Related Transaction"
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
      {/* COMPLETE READ-ONLY APPLICATION DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedApp && (
        <div className="txn-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="txn-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 940 }}>
            {/* Modal Header */}
            <div className="txn-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2>📝 Application: {selectedApp.worker?.name} → {selectedApp.job?.title}</h2>
                <span className="txn-readonly-badge" style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }}>
                  🔒 Admin Monitor (Read-Only)
                </span>
              </div>
              <button className="txn-modal-close-btn" onClick={() => setSelectedApp(null)}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="txn-modal-body">
              {/* Top Highlights Banner */}
              <div className="txn-grid-3">
                <div className="txn-party-card" style={{ textAlign: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>Application Status</label>
                  <div style={{ marginTop: 6 }}>
                    {(() => {
                      const pill = getApplicationStatusPill(selectedApp);
                      return (
                        <span className={`status-pill ${pill.className}`} style={pill.style}>
                          {pill.label}
                        </span>
                      );
                    })()}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginTop: 4 }}>
                    Applied: {new Date(selectedApp.appliedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="txn-party-card" style={{ textAlign: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>Hiring Stage</label>
                  <div style={{ marginTop: 6 }}>
                    {(() => {
                      const badge = getHiringStageBadge(selectedApp.hiringStage);
                      return (
                        <span className="doc-chip" style={{ background: badge.bg, color: badge.color, fontSize: 12, padding: "3px 10px", fontWeight: 700 }}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginTop: 4 }}>
                    Job Status: {selectedApp.job?.status || "active"}
                  </span>
                </div>

                <div className="txn-party-card" style={{ textAlign: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>Worker Trust Rating</label>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--admin-green)", marginTop: 4 }}>
                    🛡️ {selectedApp.worker?.trustScore || 0} pts
                  </div>
                  <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>
                    {selectedApp.worker?.isVerified ? "✅ KYC Document Verified" : "⏳ Unverified"}
                  </span>
                </div>
              </div>

              {/* Worker & Employer Information Cards */}
              <div className="txn-grid-2">
                {/* Worker Details Card */}
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar worker">👤</div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Applicant Worker</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Freelancer Profile</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    <div className="detail-item">
                      <label>Full Name</label>
                      <span>{selectedApp.worker?.name || "Worker"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email & Phone</label>
                      <span>{selectedApp.worker?.email || "N/A"} • {selectedApp.worker?.phone || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Location</label>
                      <span>📍 {selectedApp.worker?.location || "Not specified"}</span>
                    </div>
                    {selectedApp.worker?.bio && (
                      <div className="detail-item">
                        <label>Bio / Summary</label>
                        <span style={{ fontStyle: "italic", fontSize: 12.5 }}>"{selectedApp.worker.bio}"</span>
                      </div>
                    )}
                    {selectedApp.worker?.skills && selectedApp.worker.skills.length > 0 && (
                      <div className="detail-item">
                        <label>Skills</label>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                          {selectedApp.worker.skills.map((s, idx) => (
                            <span key={idx} className="doc-chip" style={{ background: "#f1f5f9", fontSize: 11, padding: "2px 6px" }}>
                              {typeof s === "object" ? s.name : s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ marginTop: 8, fontSize: 12 }}
                      onClick={() => {
                        const wid = selectedApp.worker?._id || selectedApp.worker?.id;
                        setSelectedApp(null);
                        setActivePage("Workers", { selectedWorkerId: wid });
                      }}
                    >
                      Open Full Worker Profile →
                    </button>
                  </div>
                </div>

                {/* Employer Details Card */}
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar employer">🏢</div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Employer Details</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Job Poster</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    <div className="detail-item">
                      <label>Company / Employer Name</label>
                      <span>{selectedApp.employer?.name || "Employer"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email & Phone</label>
                      <span>{selectedApp.employer?.email || "N/A"} • {selectedApp.employer?.phone || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Location</label>
                      <span>📍 {selectedApp.employer?.location || selectedApp.job?.location || "Not specified"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Trust Score & Status</label>
                      <span>
                        🛡️ {selectedApp.employer?.trustScore || 0} pts • {selectedApp.employer?.isVerified ? "✅ Verified" : "⏳ Pending"}
                      </span>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ marginTop: 8, fontSize: 12 }}
                      onClick={() => {
                        const eid = selectedApp.employer?._id || selectedApp.employer?.id;
                        setSelectedApp(null);
                        setActivePage("Employers", { selectedEmployerId: eid });
                      }}
                    >
                      Open Employer Profile →
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Job Information */}
              <div className="txn-section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 className="txn-section-title" style={{ margin: 0 }}>
                    💼 Target Job: {selectedApp.job?.title}
                  </h4>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 11.5, padding: "4px 10px" }}
                    onClick={() => {
                      const jid = selectedApp.job?._id || selectedApp.job?.id;
                      setSelectedApp(null);
                      setActivePage("Jobs", { selectedJobId: jid });
                    }}
                  >
                    Open in Admin Jobs →
                  </button>
                </div>

                <div className="txn-grid-3" style={{ marginBottom: 10 }}>
                  <div className="detail-item">
                    <label>Department / Category</label>
                    <span>{selectedApp.job?.department || "General"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Job Pay Amount</label>
                    <strong style={{ color: "var(--admin-green)", fontSize: 14 }}>💰 {selectedApp.job?.pay}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Location & Type</label>
                    <span>📍 {selectedApp.job?.location} • {selectedApp.job?.type}</span>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "var(--admin-text-sub)", lineHeight: 1.5, background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid var(--admin-border-light)" }}>
                  {selectedApp.job?.description || "No job description provided."}
                </div>
              </div>

              {/* Application Lifecycle & Hiring Synchronization Flow */}
              <div className="txn-section-card">
                <h4 className="txn-section-title">🔄 Application & Hiring Workflow Stage</h4>
                <div className="txn-timeline-container">
                  {/* Step 1: Application Submitted */}
                  <div className="txn-timeline-step">
                    <div className="txn-timeline-dot completed" />
                    <div className="txn-timeline-info">
                      <strong>1. Worker Submitted Application</strong>
                      <span>Worker applied with verified trust score of {selectedApp.worker?.trustScore || 0} pts</span>
                    </div>
                    <span className="txn-timeline-badge completed">
                      {new Date(selectedApp.appliedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Step 2: Employer Review */}
                  <div className="txn-timeline-step">
                    <div className={`txn-timeline-dot ${selectedApp.status !== "pending" ? "completed" : ""}`} />
                    <div className="txn-timeline-info">
                      <strong>2. Employer Review & Decision</strong>
                      <span>
                        {selectedApp.status === "accepted" || selectedApp.status === "hired" || selectedApp.isHired
                          ? "Employer approved and hired this worker."
                          : selectedApp.status === "rejected"
                          ? "Employer declined this application."
                          : "Application is currently pending employer evaluation."}
                      </span>
                    </div>
                    <span
                      className={`txn-timeline-badge ${
                        selectedApp.status === "accepted" || selectedApp.status === "hired" || selectedApp.isHired
                          ? "completed"
                          : selectedApp.status === "rejected"
                          ? "disputed"
                          : ""
                      }`}
                    >
                      {selectedApp.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Step 3: Advance Payment & Work Execution */}
                  {(selectedApp.status === "accepted" || selectedApp.status === "hired" || selectedApp.isHired) && (
                    <div className="txn-timeline-step">
                      <div className="txn-timeline-dot completed" />
                      <div className="txn-timeline-info">
                        <strong>3. Advance Milestone Payment (50%) & Gig In-Progress</strong>
                        <span>50% Advance escrow secured for worker commencement.</span>
                      </div>
                      <span className="txn-timeline-badge completed">
                        {selectedApp.transaction?.transactionId || "Secured"}
                      </span>
                    </div>
                  )}

                  {/* Step 4: Completion & Settlement */}
                  {selectedApp.job?.completionStatus === "completed" && (
                    <div className="txn-timeline-step">
                      <div className="txn-timeline-dot completed" />
                      <div className="txn-timeline-info">
                        <strong>4. Work Completed & Settled</strong>
                        <span>Remaining 50% milestone processed and settled to worker earnings.</span>
                      </div>
                      <span className="txn-timeline-badge completed">
                        Completed
                      </span>
                    </div>
                  )}
                </div>

                {/* Related Transaction Link */}
                {(selectedApp.transaction?.transactionId || selectedApp.job?.transactionId) && (
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--admin-border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                      Linked Transaction: <code style={{ color: "var(--admin-blue)" }}>{selectedApp.transaction?.transactionId || selectedApp.job?.transactionId}</code>
                    </span>
                    <button
                      className="btn-action review"
                      style={{ fontSize: 11.5, padding: "4px 10px" }}
                      onClick={() => {
                        const tid = selectedApp.transaction?.transactionId || selectedApp.job?.transactionId;
                        const jid = selectedApp.job?._id || selectedApp.job?.id;
                        setSelectedApp(null);
                        setActivePage("Transactions", { selectedTxnId: tid, selectedJobId: jid });
                      }}
                    >
                      Open Transaction Record →
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer / Meta */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--admin-muted)", padding: "4px 2px" }}>
                <span>Application ID: <code>{selectedApp._id || selectedApp.applicationId}</code></span>
                <span>Job ID: <code>{selectedApp.job?._id || selectedApp.job?.id}</code></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;

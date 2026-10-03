import React, { useState, useEffect, useMemo } from "react";
import { getTrustSafetyData, updateSafetyIssueStatus } from "../../data/api";

const AdminTrustSafety = ({
  setActivePage,
  initialSection = "safety_issues", // 'workers', 'employers', 'safety_issues'
  initialIssueId = null,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState(initialSection || "safety_issues"); // 'safety_issues', 'workers', 'employers'

  // Search & Filters
  const [search, setSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState("all"); // 'all', 'open', 'investigating', 'resolved', 'disputes', 'violations'
  const [userFilter, setUserFilter] = useState("all"); // 'all', 'issues_only', 'verified', 'unverified'

  // Modal / Selected Safety Issue
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getTrustSafetyData();
      if (res.success) {
        setData(res);
        if (initialIssueId && res.safetyIssues) {
          const found = res.safetyIssues.find((s) => s.issueId === initialIssueId || s._id === initialIssueId);
          if (found) {
            setSelectedIssue(found);
            setActiveTab("safety_issues");
          }
        }
      } else {
        setError(res.message || "Unable to retrieve trust & safety metrics");
      }
    } catch (err) {
      console.error("Failed to load trust safety data:", err);
      setError("Unable to connect to Trust & Safety service. Please verify server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [initialIssueId]);

  const summary = data?.summary || {
    workerTrustIssues: 0,
    employerTrustIssues: 0,
    activeSafetyIssues: 0,
    openDisputes: 0,
    confirmedViolations: 0,
    resolvedIssues: 0,
  };

  const workers = data?.workers || [];
  const employers = data?.employers || [];
  const safetyIssues = data?.safetyIssues || [];

  // Filtered Workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const q = search.trim().toLowerCase();
      const name = (w.name || "").toLowerCase();
      const email = (w.email || "").toLowerCase();
      const location = (w.location || "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || location.includes(q);
      if (!matchesSearch) return false;

      if (userFilter === "issues_only") return w.hasIssues;
      if (userFilter === "verified") return w.isVerified;
      if (userFilter === "unverified") return !w.isVerified;

      return true;
    });
  }, [workers, search, userFilter]);

  // Filtered Employers
  const filteredEmployers = useMemo(() => {
    return employers.filter((e) => {
      const q = search.trim().toLowerCase();
      const name = (e.name || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      const location = (e.location || "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || location.includes(q);
      if (!matchesSearch) return false;

      if (userFilter === "issues_only") return e.hasIssues;
      if (userFilter === "verified") return e.isVerified;
      if (userFilter === "unverified") return !e.isVerified;

      return true;
    });
  }, [employers, search, userFilter]);

  // Filtered Safety Issues
  const filteredSafetyIssues = useMemo(() => {
    return safetyIssues.filter((s) => {
      const q = search.trim().toLowerCase();
      const issueId = (s.issueId || "").toLowerCase();
      const userName = (s.user?.name || "").toLowerCase();
      const description = (s.description || "").toLowerCase();
      const jobTitle = (s.relatedJob?.title || "").toLowerCase();

      const matchesSearch =
        !q ||
        issueId.includes(q) ||
        userName.includes(q) ||
        description.includes(q) ||
        jobTitle.includes(q);

      if (!matchesSearch) return false;

      if (issueFilter === "open") return s.status === "open";
      if (issueFilter === "investigating") return s.status === "investigating";
      if (issueFilter === "resolved") return s.status === "resolved" || s.status === "closed";
      if (issueFilter === "disputes") return s.issueType === "Completion Dispute";
      if (issueFilter === "violations") return s.issueType === "Trust Penalty";

      return true;
    });
  }, [safetyIssues, search, issueFilter]);

  const handleUpdateStatus = async (issueId, status, note = "") => {
    try {
      setActionLoading(true);
      setActionMsg("");
      const res = await updateSafetyIssueStatus(issueId, status, note);
      if (res.success) {
        setActionMsg(`Safety issue marked as ${status.toUpperCase()} successfully.`);
        // Update local state
        setData((prev) => {
          if (!prev) return prev;
          const updatedIssues = prev.safetyIssues.map((item) => {
            if (item.issueId === issueId) {
              const updatedNotes = note
                ? [...(item.adminNotes || []), { note, createdAt: new Date() }]
                : (item.adminNotes || []);
              return { ...item, status, adminNotes: updatedNotes };
            }
            return item;
          });
          return { ...prev, safetyIssues: updatedIssues };
        });

        if (selectedIssue && selectedIssue.issueId === issueId) {
          const updatedNotes = note
            ? [...(selectedIssue.adminNotes || []), { note, createdAt: new Date() }]
            : (selectedIssue.adminNotes || []);
          setSelectedIssue({ ...selectedIssue, status, adminNotes: updatedNotes });
        }
        setNewNote("");
      } else {
        alert(res.message || "Failed to update safety issue");
      }
    } catch (err) {
      console.error("Failed to update safety issue:", err);
      alert("Error updating status. Please check backend connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedIssue) return;
    await handleUpdateStatus(selectedIssue.issueId, selectedIssue.status || "investigating", newNote.trim());
  };

  const getSeverityBadge = (severity) => {
    if (severity === "High") {
      return { label: "High Severity", bg: "rgba(239, 68, 68, 0.12)", color: "var(--admin-red)", icon: "🚨" };
    }
    if (severity === "Medium") {
      return { label: "Medium", bg: "rgba(245, 158, 11, 0.12)", color: "#b45309", icon: "⚠️" };
    }
    return { label: "Low", bg: "rgba(37, 99, 235, 0.12)", color: "var(--admin-blue)", icon: "ℹ️" };
  };

  return (
    <div className="admin-page-container fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>⚖️ Trust & Safety Central</h1>
          <p>Holistic platform governance: worker & employer trust ratings, active safety issues, completion disputes, and confirmed policy violations.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={fetchData} title="Refresh real data">
            🔄 Refresh Data
          </button>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* 6 Summary Stat Cards (Real Database Data) */}
      <div className="overview-6-cards-grid" style={{ marginBottom: 24 }}>
        {/* Worker Trust Issues */}
        <div
          className={`ref-stat-card card-theme-amber ${activeTab === "workers" && userFilter === "issues_only" ? "card-selected-active" : ""}`}
          onClick={() => { setActiveTab("workers"); setUserFilter("issues_only"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">👤</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Worker Trust Issues</span>
            <div className="stat-card-value">{loading ? "..." : summary.workerTrustIssues}</div>
            <span className="stat-card-subtext warning">Low Trust / Penalties</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-amber">→</div>
          </div>
        </div>

        {/* Employer Trust Issues */}
        <div
          className={`ref-stat-card card-theme-pink ${activeTab === "employers" && userFilter === "issues_only" ? "card-selected-active" : ""}`}
          onClick={() => { setActiveTab("employers"); setUserFilter("issues_only"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-pink">🏢</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Employer Trust Issues</span>
            <div className="stat-card-value">{loading ? "..." : summary.employerTrustIssues}</div>
            <span className="stat-card-subtext">Disputes / Low Score</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-pink">→</div>
          </div>
        </div>

        {/* Active Safety Issues */}
        <div
          className={`ref-stat-card card-theme-purple ${activeTab === "safety_issues" && issueFilter === "open" ? "card-selected-active" : ""}`}
          onClick={() => { setActiveTab("safety_issues"); setIssueFilter("open"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-purple">🛡️</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Active Safety Issues</span>
            <div className="stat-card-value">{loading ? "..." : summary.activeSafetyIssues}</div>
            <span className="stat-card-subtext positive">Open & Investigating</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-purple">→</div>
          </div>
        </div>

        {/* Open Disputes */}
        <div
          className={`ref-stat-card card-theme-red ${activeTab === "safety_issues" && issueFilter === "disputes" ? "card-selected-active" : ""}`}
          onClick={() => { setActiveTab("safety_issues"); setIssueFilter("disputes"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-red">🚨</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Open Disputes</span>
            <div className="stat-card-value" style={{ color: "var(--admin-red)" }}>
              {loading ? "..." : summary.openDisputes}
            </div>
            <span className="stat-card-subtext" style={{ color: "var(--admin-red)" }}>Held Milestones</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-red">→</div>
          </div>
        </div>

        {/* Confirmed Violations */}
        <div
          className={`ref-stat-card card-theme-blue ${activeTab === "safety_issues" && issueFilter === "violations" ? "card-selected-active" : ""}`}
          onClick={() => { setActiveTab("safety_issues"); setIssueFilter("violations"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">⚖️</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Confirmed Violations</span>
            <div className="stat-card-value">{loading ? "..." : summary.confirmedViolations}</div>
            <span className="stat-card-subtext positive">Penalty Records</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-blue">→</div>
          </div>
        </div>

        {/* Resolved Issues */}
        <div
          className={`ref-stat-card card-theme-teal ${activeTab === "safety_issues" && issueFilter === "resolved" ? "card-selected-active" : ""}`}
          onClick={() => { setActiveTab("safety_issues"); setIssueFilter("resolved"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-teal">✅</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Resolved Issues</span>
            <div className="stat-card-value">{loading ? "..." : summary.resolvedIssues}</div>
            <span className="stat-card-subtext positive">Closed & Settled</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-teal">→</div>
          </div>
        </div>
      </div>

      {/* Main Governance Navigation Tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, borderBottom: "2px solid var(--admin-border)", paddingBottom: 8 }}>
        <button
          className={`filter-chip ${activeTab === "safety_issues" ? "active" : ""}`}
          style={{ fontSize: 13.5, padding: "8px 18px", borderRadius: 10 }}
          onClick={() => { setActiveTab("safety_issues"); setSearch(""); }}
        >
          🛡️ Safety & Dispute Issues ({safetyIssues.length})
        </button>

        <button
          className={`filter-chip ${activeTab === "workers" ? "active" : ""}`}
          style={{ fontSize: 13.5, padding: "8px 18px", borderRadius: 10 }}
          onClick={() => { setActiveTab("workers"); setSearch(""); }}
        >
          👤 Worker Trust Directory ({workers.length})
        </button>

        <button
          className={`filter-chip ${activeTab === "employers" ? "active" : ""}`}
          style={{ fontSize: 13.5, padding: "8px 18px", borderRadius: 10 }}
          onClick={() => { setActiveTab("employers"); setSearch(""); }}
        >
          🏢 Employer Trust Directory ({employers.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-filter-bar card-shell" style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div className="admin-search-wrapper" style={{ flex: "1 1 300px", minWidth: 260 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="admin-search-input"
              placeholder={
                activeTab === "safety_issues"
                  ? "Search safety issues by ID, member, description, or job..."
                  : `Search ${activeTab === "workers" ? "workers" : "employers"} by name, email, location...`
              }
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

          {/* Sub-Filters per active tab */}
          {activeTab === "safety_issues" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["all", "open", "investigating", "disputes", "violations", "resolved"].map((f) => (
                <button
                  key={f}
                  className={`filter-chip ${issueFilter === f ? "active" : ""}`}
                  onClick={() => setIssueFilter(f)}
                >
                  {f.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All Records" },
                { id: "issues_only", label: "⚠️ Issues & Penalties Only" },
                { id: "verified", label: "✅ Verified" },
                { id: "unverified", label: "⏳ Unverified" },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`filter-chip ${userFilter === f.id ? "active" : ""}`}
                  onClick={() => setUserFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Reset Filters */}
          {(search || (activeTab === "safety_issues" && issueFilter !== "all") || (activeTab !== "safety_issues" && userFilter !== "all")) && (
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                setSearch("");
                setIssueFilter("all");
                setUserFilter("all");
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Sections */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <div className="review-spinner" />
          <p style={{ color: "var(--admin-muted)", marginTop: 12 }}>Loading trust & safety records from MongoDB...</p>
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <p style={{ color: "var(--admin-red)", fontWeight: 600 }}>{error}</p>
          <button className="btn-action review" style={{ marginTop: 12, padding: "8px 16px" }} onClick={fetchData}>
            Retry Loading
          </button>
        </div>
      ) : activeTab === "safety_issues" ? (
        /* ========================================================================= */
        /* SECTION C: SAFETY ISSUES & DISPUTES FEED */
        /* ========================================================================= */
        <div className="admin-panel card-shell">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              🛡️ Safety Issues & Dispute Log ({filteredSafetyIssues.length})
            </h3>
            <span className="panel-tag purple">Real Dispute & Policy Events</span>
          </div>

          {filteredSafetyIssues.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "var(--admin-muted)" }}>
              No safety issues found matching filter criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>User & Role</th>
                    <th>Issue Type</th>
                    <th>Related Job / Txn</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSafetyIssues.map((s) => {
                    const sevBadge = getSeverityBadge(s.severity);
                    const user = s.user || {};
                    const userId = user._id || user.id;

                    return (
                      <tr key={s.issueId} className="ref-table-row">
                        {/* Issue ID */}
                        <td>
                          <strong
                            style={{ color: "var(--admin-blue)", cursor: "pointer", fontSize: 12 }}
                            onClick={() => setSelectedIssue(s)}
                          >
                            {s.issueId}
                          </strong>
                        </td>

                        {/* User */}
                        <td>
                          <strong
                            style={{ fontSize: 13, color: "var(--admin-text-dark)", cursor: userId ? "pointer" : "default" }}
                            onClick={() => {
                              if (userId && userId !== "N/A") {
                                if (s.userType.toLowerCase().includes("employer")) setActivePage("Employers", { selectedEmployerId: userId });
                                else setActivePage("Workers", { selectedWorkerId: userId });
                              }
                            }}
                          >
                            {user.name || "Member"}
                          </strong>
                          <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{s.userType}</div>
                        </td>

                        {/* Issue Type */}
                        <td>
                          <span className="doc-chip" style={{ background: "#f8fafc", color: "var(--admin-text-dark)", fontSize: 11 }}>
                            {s.issueType}
                          </span>
                        </td>

                        {/* Related Job */}
                        <td>
                          {s.relatedJob ? (
                            <strong
                              style={{ fontSize: 12.5, color: "var(--admin-blue)", cursor: s.relatedJob._id ? "pointer" : "default" }}
                              onClick={() => s.relatedJob._id && setActivePage("Jobs", { selectedJobId: s.relatedJob._id })}
                            >
                              💼 {s.relatedJob.title}
                            </strong>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>Not Available</span>
                          )}
                        </td>

                        {/* Severity */}
                        <td>
                          <span className="doc-chip" style={{ background: sevBadge.bg, color: sevBadge.color, fontSize: 11, padding: "2px 7px", fontWeight: 700 }}>
                            {sevBadge.icon} {s.severity}
                          </span>
                        </td>

                        {/* Description */}
                        <td style={{ maxWidth: 260 }}>
                          <span style={{ fontSize: 12.5, color: "var(--admin-text-dark)", lineHeight: 1.4 }}>
                            {s.description}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`status-pill ${
                              s.status === "resolved" || s.status === "closed"
                                ? "verified"
                                : s.status === "investigating"
                                ? "in-progress"
                                : "pending"
                            }`}
                          >
                            {s.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Date */}
                        <td>
                          <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                            <button
                              className="btn-action review"
                              style={{ fontSize: 11, padding: "4px 8px" }}
                              onClick={() => setSelectedIssue(s)}
                            >
                              👁️ Details
                            </button>
                            {s.status !== "resolved" && (
                              <button
                                className="btn-secondary"
                                style={{ fontSize: 11, padding: "4px 7px", color: "var(--admin-green)", borderColor: "rgba(22,163,74,0.3)" }}
                                onClick={() => handleUpdateStatus(s.issueId, "resolved")}
                              >
                                ✅ Resolve
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
      ) : activeTab === "workers" ? (
        /* ========================================================================= */
        /* SECTION A: WORKER TRUST DIRECTORY */
        /* ========================================================================= */
        <div className="admin-panel card-shell">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              👤 Worker Trust & Governance ({filteredWorkers.length})
            </h3>
            <span className="panel-tag blue">Real Worker Trust Scores</span>
          </div>

          {filteredWorkers.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "var(--admin-muted)" }}>
              No workers found matching filter criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Worker Name</th>
                    <th>KYC Verification</th>
                    <th>Trust Score</th>
                    <th>Completed Jobs</th>
                    <th>Issues / Violations</th>
                    <th>Governance Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((w) => (
                    <tr key={w._id} className="ref-table-row">
                      {/* Name */}
                      <td>
                        <div className="worker-cell">
                          <div className="worker-avatar" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
                            {(w.name || "W").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong
                              style={{ fontSize: 13, color: "var(--admin-blue)", cursor: "pointer" }}
                              onClick={() => setActivePage("Workers", { selectedWorkerId: w._id })}
                            >
                              {w.name}
                            </strong>
                            <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{w.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Verification */}
                      <td>
                        <span className={`status-pill ${w.isVerified ? "verified" : "pending"}`} style={{ fontSize: 10.5 }}>
                          {w.isVerified ? "✅ Verified" : "⏳ Pending"}
                        </span>
                      </td>

                      {/* Trust Score */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong style={{ fontSize: 14, color: w.trustScore >= 50 ? "var(--admin-green)" : "var(--admin-amber)" }}>
                            🛡️ {w.trustScore} pts
                          </strong>
                          <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>/100</span>
                        </div>
                      </td>

                      {/* Completed Jobs */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-text-dark)" }}>
                          🏁 {w.completedJobsCount} jobs
                        </span>
                      </td>

                      {/* Issues / Violations */}
                      <td>
                        {w.penaltiesCount > 0 ? (
                          <span className="doc-chip" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--admin-red)", fontSize: 11, padding: "2px 6px", fontWeight: 700 }}>
                            ⚠️ {w.penaltiesCount} penalty recorded
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--admin-green)", fontWeight: 600 }}>
                            ✓ No Violations
                          </span>
                        )}
                      </td>

                      {/* Governance Status */}
                      <td>
                        <span
                          className={`status-pill ${
                            w.status.includes("Rejected")
                              ? "danger"
                              : w.status.includes("Warning")
                              ? "pending"
                              : "verified"
                          }`}
                          style={{ fontSize: 11 }}
                        >
                          {w.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-action review"
                          style={{ fontSize: 11.5, padding: "5px 10px" }}
                          onClick={() => setActivePage("Workers", { selectedWorkerId: w._id })}
                        >
                          View Profile →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* SECTION B: EMPLOYER TRUST DIRECTORY */
        /* ========================================================================= */
        <div className="admin-panel card-shell">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              🏢 Employer Trust & Governance ({filteredEmployers.length})
            </h3>
            <span className="panel-tag green">Real Employer Trust Scores</span>
          </div>

          {filteredEmployers.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "var(--admin-muted)" }}>
              No employers found matching filter criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Employer Name</th>
                    <th>KYC Verification</th>
                    <th>Employer Trust Score</th>
                    <th>Jobs Completed</th>
                    <th>Payment / Settlement</th>
                    <th>Issues / Violations</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployers.map((e) => (
                    <tr key={e._id} className="ref-table-row">
                      {/* Name */}
                      <td>
                        <div className="worker-cell">
                          <div className="worker-avatar" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
                            {(e.name || "E").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong
                              style={{ fontSize: 13, color: "var(--admin-blue)", cursor: "pointer" }}
                              onClick={() => setActivePage("Employers", { selectedEmployerId: e._id })}
                            >
                              {e.name}
                            </strong>
                            <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{e.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Verification */}
                      <td>
                        <span className={`status-pill ${e.isVerified ? "verified" : "pending"}`} style={{ fontSize: 10.5 }}>
                          {e.isVerified ? "✅ Verified" : "⏳ Pending"}
                        </span>
                      </td>

                      {/* Employer Trust Score */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong style={{ fontSize: 14, color: e.trustScore >= 50 ? "var(--admin-green)" : "var(--admin-amber)" }}>
                            🛡️ {e.trustScore} pts
                          </strong>
                          <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>/100</span>
                        </div>
                      </td>

                      {/* Jobs Completed */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-text-dark)" }}>
                          🏁 {e.completedJobsCount} completed
                        </span>
                      </td>

                      {/* Payment / Settlement */}
                      <td>
                        <span
                          className="txn-stage-pill"
                          style={{
                            background:
                              e.paymentStatus === "Payments Settled"
                                ? "rgba(22, 163, 74, 0.1)"
                                : e.paymentStatus === "Dispute Flagged"
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(37, 99, 235, 0.1)",
                            color:
                              e.paymentStatus === "Payments Settled"
                                ? "var(--admin-green)"
                                : e.paymentStatus === "Dispute Flagged"
                                ? "var(--admin-red)"
                                : "var(--admin-blue)",
                          }}
                        >
                          {e.paymentStatus}
                        </span>
                      </td>

                      {/* Issues */}
                      <td>
                        {e.hasDisputedJobs ? (
                          <span className="doc-chip" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--admin-red)", fontSize: 11, padding: "2px 6px", fontWeight: 700 }}>
                            🚨 Dispute on Job
                          </span>
                        ) : e.penaltiesCount > 0 ? (
                          <span className="doc-chip" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--admin-red)", fontSize: 11, padding: "2px 6px", fontWeight: 700 }}>
                            ⚠️ {e.penaltiesCount} penalty
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--admin-green)", fontWeight: 600 }}>
                            ✓ In Good Standing
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`status-pill ${
                            e.status.includes("Rejected") || e.status.includes("Dispute")
                              ? "danger"
                              : e.status.includes("Warning")
                              ? "pending"
                              : "verified"
                          }`}
                          style={{ fontSize: 11 }}
                        >
                          {e.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-action review"
                          style={{ fontSize: 11.5, padding: "5px 10px" }}
                          onClick={() => setActivePage("Employers", { selectedEmployerId: e._id })}
                        >
                          View Profile →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAFETY ISSUE DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedIssue && (
        <div className="txn-modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="txn-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880 }}>
            {/* Header */}
            <div className="txn-modal-header" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2>🛡️ Safety Issue: {selectedIssue.issueId}</h2>
                <span className="panel-tag purple" style={{ background: "rgba(255, 255, 255, 0.2)", color: "#ffffff" }}>
                  {selectedIssue.issueType}
                </span>
                <span className="txn-readonly-badge" style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }}>
                  Status: {selectedIssue.status.toUpperCase()}
                </span>
              </div>
              <button className="txn-modal-close-btn" onClick={() => setSelectedIssue(null)}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="txn-modal-body">
              {actionMsg && (
                <div style={{ background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", color: "var(--admin-green)", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  ✓ {actionMsg}
                </div>
              )}

              {/* Issue Description Banner */}
              <div className="txn-dispute-banner" style={{ background: "rgba(139, 92, 246, 0.08)", borderColor: "rgba(139, 92, 246, 0.25)" }}>
                <div className="txn-dispute-icon">📋</div>
                <div className="txn-dispute-content" style={{ flex: 1 }}>
                  <h4 style={{ color: "var(--admin-purple)" }}>Issue Description & Governance Audit</h4>
                  <p style={{ fontSize: 13.5, color: "var(--admin-text-dark)", margin: "4px 0 6px" }}>
                    {selectedIssue.description}
                  </p>
                  <div style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                    Severity: <strong>{selectedIssue.severity}</strong> • Category: {selectedIssue.issueType}
                  </div>
                </div>
              </div>

              {/* Related Parties & Job */}
              <div className="txn-grid-2">
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar employer">👤</div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Involved Member</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{selectedIssue.userType}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    <div className="detail-item">
                      <label>Name</label>
                      <span>{selectedIssue.user?.name || "Member"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email</label>
                      <span>{selectedIssue.user?.email || "Not Available"}</span>
                    </div>
                    {selectedIssue.user?._id && selectedIssue.user._id !== "N/A" && (
                      <button
                        className="btn-secondary"
                        style={{ marginTop: 8, fontSize: 12 }}
                        onClick={() => {
                          const uid = selectedIssue.user._id || selectedIssue.user.id;
                          setSelectedIssue(null);
                          if (selectedIssue.userType.toLowerCase().includes("employer")) setActivePage("Employers", { selectedEmployerId: uid });
                          else setActivePage("Workers", { selectedWorkerId: uid });
                        }}
                      >
                        Open Member Profile →
                      </button>
                    )}
                  </div>
                </div>

                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar worker">💼</div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Related Gig Posting</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Job Milestone</div>
                    </div>
                  </div>
                  {selectedIssue.relatedJob ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <div className="detail-item">
                        <label>Title</label>
                        <span>{selectedIssue.relatedJob.title}</span>
                      </div>
                      <div className="detail-item">
                        <label>Pay</label>
                        <span>💰 {selectedIssue.relatedJob.pay || "N/A"}</span>
                      </div>
                      {selectedIssue.relatedJob._id && (
                        <button
                          className="btn-secondary"
                          style={{ marginTop: 8, fontSize: 12 }}
                          onClick={() => {
                            const jid = selectedIssue.relatedJob._id || selectedIssue.relatedJob.id;
                            setSelectedIssue(null);
                            setActivePage("Jobs", { selectedJobId: jid });
                          }}
                        >
                          Open Job in Admin Jobs →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "16px 0", textAlign: "center", color: "var(--admin-muted)" }}>
                      <p style={{ margin: 0, fontSize: 13 }}>Not associated with a specific job listing.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Management & Admin Notes */}
              <div className="txn-section-card">
                <h4 className="txn-section-title">⚖️ Issue Resolution Controls</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  <button
                    className={`btn-action ${selectedIssue.status === "open" ? "review" : "btn-secondary"}`}
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedIssue.issueId, "open")}
                  >
                    Set as Open
                  </button>
                  <button
                    className={`btn-action ${selectedIssue.status === "investigating" ? "review" : "btn-secondary"}`}
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedIssue.issueId, "investigating")}
                  >
                    🔍 Mark Under Investigation
                  </button>
                  <button
                    className="btn-action review"
                    style={{ background: "var(--admin-green)", borderColor: "var(--admin-green)" }}
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedIssue.issueId, "resolved")}
                  >
                    ✅ Mark as Resolved
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Investigation Audit Notes ({selectedIssue.adminNotes?.length || 0})
                  </label>

                  {(!selectedIssue.adminNotes || selectedIssue.adminNotes.length === 0) ? (
                    <p style={{ color: "var(--admin-muted)", fontSize: 12, margin: "0 0 12px" }}>No admin notes recorded yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                      {selectedIssue.adminNotes.map((n, idx) => (
                        <div key={idx} style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--admin-border-light)", fontSize: 12.5 }}>
                          <div style={{ color: "var(--admin-text-dark)", fontWeight: 600 }}>{n.note}</div>
                          <div style={{ fontSize: 10.5, color: "var(--admin-muted)", marginTop: 2 }}>
                            📅 {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddNote} style={{ display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Add resolution note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      style={{ flex: 1, padding: "8px 12px" }}
                    />
                    <button
                      type="submit"
                      className="btn-action review"
                      style={{ padding: "8px 14px", fontSize: 12 }}
                      disabled={actionLoading || !newNote.trim()}
                    >
                      Add Note
                    </button>
                  </form>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--admin-muted)", padding: "4px 2px" }}>
                <span>Issue ID: <code>{selectedIssue.issueId}</code></span>
                <span>Created: {new Date(selectedIssue.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrustSafety;

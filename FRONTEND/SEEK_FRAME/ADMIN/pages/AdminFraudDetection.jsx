import React, { useState, useEffect, useMemo } from "react";
import { getFraudAlerts, updateFraudAlertStatus } from "../../data/api";

const AdminFraudDetection = ({ setActivePage, initialAlertId = null }) => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All"); // 'All', 'High', 'Medium', 'Low'
  const [statusFilter, setStatusFilter] = useState("All"); // 'All', 'open', 'investigating', 'resolved'
  const [userTypeFilter, setUserTypeFilter] = useState("All"); // 'All', 'Worker', 'Employer'

  // Modal / Selected Alert
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getFraudAlerts();
      if (res.success) {
        const loadedAlerts = res.alerts || [];
        setAlerts(loadedAlerts);
        setSummary(res.summary || null);

        if (initialAlertId) {
          const found = loadedAlerts.find((a) => a.alertId === initialAlertId || a._id === initialAlertId);
          if (found) setSelectedAlert(found);
        }
      } else {
        setError(res.message || "Unable to retrieve fraud alerts");
      }
    } catch (err) {
      console.error("Failed to load fraud alerts:", err);
      setError("Unable to connect to fraud monitoring service. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [initialAlertId]);

  // Dynamic summary metrics from real data
  const totalAlertsCount = summary?.totalAlerts ?? alerts.length;
  const highRiskCount = summary?.highRisk ?? alerts.filter((a) => a.riskLevel === "High").length;
  const mediumRiskCount = summary?.mediumRisk ?? alerts.filter((a) => a.riskLevel === "Medium").length;
  const lowRiskCount = summary?.lowRisk ?? alerts.filter((a) => a.riskLevel === "Low").length;
  const investigatingCount = summary?.investigating ?? alerts.filter((a) => a.status === "investigating").length;
  const resolvedCount = summary?.resolved ?? alerts.filter((a) => a.status === "resolved" || a.status === "closed").length;

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const q = search.trim().toLowerCase();
      const alertId = (a.alertId || "").toLowerCase();
      const userName = (a.user?.name || "").toLowerCase();
      const userEmail = (a.user?.email || "").toLowerCase();
      const jobTitle = (a.relatedJob?.title || "").toLowerCase();
      const reason = (a.detectionReason || "").toLowerCase();

      const matchesSearch =
        !q ||
        alertId.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        jobTitle.includes(q) ||
        reason.includes(q);

      if (!matchesSearch) return false;

      // Risk filter
      if (riskFilter !== "All" && a.riskLevel !== riskFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "All") {
        if (statusFilter === "resolved") {
          if (a.status !== "resolved" && a.status !== "closed") return false;
        } else if (a.status !== statusFilter) {
          return false;
        }
      }

      // User Type filter
      if (userTypeFilter !== "All" && a.userType !== userTypeFilter) {
        return false;
      }

      return true;
    });
  }, [alerts, search, riskFilter, statusFilter, userTypeFilter]);

  const handleUpdateStatus = async (alertId, status, note = "") => {
    try {
      setActionLoading(true);
      setActionMsg("");
      const res = await updateFraudAlertStatus(alertId, status, note);
      if (res.success) {
        setActionMsg(`Alert marked as ${status.toUpperCase()} successfully.`);
        // Update local state
        setAlerts((prev) =>
          prev.map((a) => {
            if (a.alertId === alertId) {
              const updatedNotes = note
                ? [...(a.adminNotes || []), { note, createdAt: new Date() }]
                : (a.adminNotes || []);
              return { ...a, status, adminNotes: updatedNotes };
            }
            return a;
          })
        );
        if (selectedAlert && selectedAlert.alertId === alertId) {
          const updatedNotes = note
            ? [...(selectedAlert.adminNotes || []), { note, createdAt: new Date() }]
            : (selectedAlert.adminNotes || []);
          setSelectedAlert({ ...selectedAlert, status, adminNotes: updatedNotes });
        }
        setNewNote("");
      } else {
        alert(res.message || "Failed to update alert status");
      }
    } catch (err) {
      console.error("Failed to update alert status:", err);
      alert("Error updating status. Please verify backend connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedAlert) return;
    await handleUpdateStatus(selectedAlert.alertId, selectedAlert.status || "investigating", newNote.trim());
  };

  const getRiskBadge = (risk) => {
    if (risk === "High") {
      return { label: "High Risk", bg: "rgba(239, 68, 68, 0.12)", color: "var(--admin-red)", icon: "🚨" };
    }
    if (risk === "Medium") {
      return { label: "Medium Risk", bg: "rgba(245, 158, 11, 0.12)", color: "#b45309", icon: "⚠️" };
    }
    return { label: "Low Risk", bg: "rgba(37, 99, 235, 0.12)", color: "var(--admin-blue)", icon: "ℹ️" };
  };

  const getStatusBadge = (status) => {
    const s = (status || "open").toLowerCase();
    if (s === "resolved" || s === "closed") {
      return { label: "Resolved", className: "verified", icon: "✅" };
    }
    if (s === "investigating") {
      return { label: "Investigating", className: "in-progress", icon: "🔍" };
    }
    return { label: "Open", className: "pending", icon: "⏳" };
  };

  return (
    <div className="admin-page-container fade-in">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>🚨 Fraud Detection & Risk Monitoring</h1>
          <p>Real-time suspicious activity monitoring, biometric failure detection, dispute escalation, and fraud prevention audit.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={fetchAlerts} title="Refresh real data">
            🔄 Refresh Data
          </button>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* 6 Clickable Summary Cards (Real Data Only) */}
      <div className="overview-6-cards-grid" style={{ marginBottom: 24 }}>
        {/* Total Alerts */}
        <div
          className={`ref-stat-card card-theme-purple ${statusFilter === "All" && riskFilter === "All" ? "card-selected-active" : ""}`}
          onClick={() => { setStatusFilter("All"); setRiskFilter("All"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-purple">🚨</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Fraud Alerts</span>
            <div className="stat-card-value">{loading ? "..." : totalAlertsCount}</div>
            <span className="stat-card-subtext positive">Flagged Issues in DB</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-purple">→</div>
          </div>
        </div>

        {/* High Risk */}
        <div
          className={`ref-stat-card card-theme-red ${riskFilter === "High" ? "card-selected-active" : ""}`}
          onClick={() => { setRiskFilter("High"); setStatusFilter("All"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-red">🔥</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">High Risk</span>
            <div className="stat-card-value" style={{ color: "var(--admin-red)" }}>
              {loading ? "..." : highRiskCount}
            </div>
            <span className="stat-card-subtext" style={{ color: "var(--admin-red)" }}>Critical Anomaly</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-red">→</div>
          </div>
        </div>

        {/* Medium Risk */}
        <div
          className={`ref-stat-card card-theme-amber ${riskFilter === "Medium" ? "card-selected-active" : ""}`}
          onClick={() => { setRiskFilter("Medium"); setStatusFilter("All"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">⚠️</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Medium Risk</span>
            <div className="stat-card-value">{loading ? "..." : mediumRiskCount}</div>
            <span className="stat-card-subtext warning">Verification Discrepancies</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-amber">→</div>
          </div>
        </div>

        {/* Low Risk */}
        <div
          className={`ref-stat-card card-theme-blue ${riskFilter === "Low" ? "card-selected-active" : ""}`}
          onClick={() => { setRiskFilter("Low"); setStatusFilter("All"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">ℹ️</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Low Risk</span>
            <div className="stat-card-value">{loading ? "..." : lowRiskCount}</div>
            <span className="stat-card-subtext positive">Minor Warnings</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-blue">→</div>
          </div>
        </div>

        {/* Investigating */}
        <div
          className={`ref-stat-card card-theme-pink ${statusFilter === "investigating" ? "card-selected-active" : ""}`}
          onClick={() => { setStatusFilter("investigating"); setRiskFilter("All"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-pink">🔍</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Investigating</span>
            <div className="stat-card-value">{loading ? "..." : investigatingCount}</div>
            <span className="stat-card-subtext">Admin Active Review</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-pink">→</div>
          </div>
        </div>

        {/* Resolved */}
        <div
          className={`ref-stat-card card-theme-teal ${statusFilter === "resolved" ? "card-selected-active" : ""}`}
          onClick={() => { setStatusFilter("resolved"); setRiskFilter("All"); }}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-teal">✅</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Resolved</span>
            <div className="stat-card-value">{loading ? "..." : resolvedCount}</div>
            <span className="stat-card-subtext positive">Addressed & Cleared</span>
          </div>
          <div className="stat-card-action">
            <div className="circle-arrow arrow-teal">→</div>
          </div>
        </div>
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
              placeholder="Search by alert ID, user name, email, job, or detection reason..."
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

          {/* Risk Level Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Risk Level:</label>
            <select
              className="admin-select-input"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          {/* User Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>User Type:</label>
            <select
              className="admin-select-input"
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Worker">Worker</option>
              <option value="Employer">Employer</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(search || riskFilter !== "All" || statusFilter !== "All" || userTypeFilter !== "All") && (
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                setSearch("");
                setRiskFilter("All");
                setStatusFilter("All");
                setUserTypeFilter("All");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Quick Status Chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", borderTop: "1px solid var(--admin-border-light)", paddingTop: 12 }}>
          {[
            { id: "All", label: "All Alerts", count: totalAlertsCount },
            { id: "open", label: "Open Issues", count: alerts.filter((a) => a.status === "open").length },
            { id: "investigating", label: "Under Investigation", count: investigatingCount },
            { id: "resolved", label: "Resolved", count: resolvedCount },
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

      {/* Fraud & Suspicious Activity Table */}
      <div className="admin-panel card-shell">
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Flagged Suspicious Activity & Fraud Log ({filteredAlerts.length})
            </h3>
            {riskFilter !== "All" && (
              <span className="doc-chip" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--admin-red)", fontSize: 11, padding: "2px 8px" }}>
                Risk: {riskFilter}
              </span>
            )}
          </div>
          <span className="panel-tag red">Verified Backend Evidence</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div className="review-spinner" />
            <p style={{ color: "var(--admin-muted)", marginTop: 12 }}>Aggregating security and fraud alerts from MongoDB...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <p style={{ color: "var(--admin-red)", fontWeight: 600 }}>{error}</p>
            <button className="btn-action review" style={{ marginTop: 12, padding: "8px 16px" }} onClick={fetchAlerts}>
              Retry Loading
            </button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
            <h4 style={{ margin: "0 0 6px", color: "var(--admin-text-dark)" }}>No suspicious activity alerts found</h4>
            <p style={{ color: "var(--admin-muted)", margin: "0 0 16px" }}>
              All identity verifications, escrow jobs, and trust activities are in healthy standing according to current filters.
            </p>
            <button
              className="btn-secondary"
              onClick={() => {
                setSearch("");
                setRiskFilter("All");
                setStatusFilter("All");
                setUserTypeFilter("All");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>User & Role</th>
                  <th>Related Job / Txn</th>
                  <th>Risk Level</th>
                  <th>Detection Reason</th>
                  <th>Status</th>
                  <th>Date / Time</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((a) => {
                  const riskBadge = getRiskBadge(a.riskLevel);
                  const statusBadge = getStatusBadge(a.status);
                  const user = a.user || {};
                  const userId = user._id || user.id;

                  return (
                    <tr key={a.alertId} className="ref-table-row">
                      {/* Alert ID */}
                      <td>
                        <strong
                          style={{ color: "var(--admin-blue)", cursor: "pointer", fontSize: 12 }}
                          onClick={() => setSelectedAlert(a)}
                          title="Click to view full investigation details"
                        >
                          {a.alertId}
                        </strong>
                        <div style={{ fontSize: 10.5, color: "var(--admin-muted)" }}>
                          Category: {a.category}
                        </div>
                      </td>

                      {/* User & Role */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong
                            style={{ fontSize: 13, color: "var(--admin-text-dark)", cursor: userId ? "pointer" : "default" }}
                            onClick={() => {
                              if (userId) {
                                if (a.userType === "Employer") setActivePage("Employers", { selectedEmployerId: userId });
                                else setActivePage("Workers", { selectedWorkerId: userId });
                              }
                            }}
                          >
                            {user.name || "WorkLink User"}
                          </strong>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span className="doc-chip" style={{ fontSize: 10, padding: "1px 5px" }}>
                              {a.userType}
                            </span>
                            {user.trustScore !== undefined && (
                              <span style={{ fontSize: 11, color: "var(--admin-green)", fontWeight: 700 }}>
                                🛡️ {user.trustScore} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Related Job / Txn */}
                      <td>
                        {a.relatedJob ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <strong
                              style={{ fontSize: 12.5, color: "var(--admin-text-dark)", cursor: a.relatedJob._id ? "pointer" : "default" }}
                              onClick={() => a.relatedJob._id && setActivePage("Jobs", { selectedJobId: a.relatedJob._id })}
                              title="View in Admin Jobs"
                            >
                              💼 {a.relatedJob.title}
                            </strong>
                            {a.relatedTransaction?.transactionId && (
                              <span style={{ fontSize: 11, color: "var(--admin-blue)" }}>
                                💳 {a.relatedTransaction.transactionId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>Not Available</span>
                        )}
                      </td>

                      {/* Risk Level */}
                      <td>
                        <span
                          className="doc-chip"
                          style={{
                            background: riskBadge.bg,
                            color: riskBadge.color,
                            fontSize: 11,
                            padding: "3px 8px",
                            fontWeight: 700,
                          }}
                        >
                          {riskBadge.icon} {riskBadge.label}
                        </span>
                      </td>

                      {/* Detection Reason */}
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: 12.5, color: "var(--admin-text-dark)", fontWeight: 500, lineHeight: 1.4 }}>
                          {a.detectionReason}
                        </div>
                        {a.evidence && (
                          <div style={{ fontSize: 11, color: "var(--admin-muted)", marginTop: 2 }}>
                            {a.evidence.length > 50 ? `${a.evidence.substring(0, 50)}...` : a.evidence}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill ${statusBadge.className}`}>
                          {statusBadge.icon} {statusBadge.label}
                        </span>
                      </td>

                      {/* Date / Time */}
                      <td>
                        <div style={{ fontSize: 12, color: "var(--admin-text-dark)" }}>
                          📅 {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--admin-muted)" }}>
                          {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            className="btn-action review"
                            style={{ fontSize: 11.5, padding: "5px 10px" }}
                            onClick={() => setSelectedAlert(a)}
                            title="Open Investigation Modal"
                          >
                            👁️ Details
                          </button>

                          {a.status !== "investigating" && a.status !== "resolved" && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: "5px 8px" }}
                              onClick={() => handleUpdateStatus(a.alertId, "investigating")}
                              title="Mark as Investigating"
                            >
                              🔍 Investigate
                            </button>
                          )}

                          {a.status !== "resolved" && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: "5px 8px", color: "var(--admin-green)", borderColor: "rgba(22,163,74,0.3)" }}
                              onClick={() => handleUpdateStatus(a.alertId, "resolved")}
                              title="Mark as Resolved"
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

      {/* ========================================================================= */}
      {/* FRAUD & RISK INVESTIGATION DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedAlert && (
        <div className="txn-modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="txn-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 920 }}>
            {/* Modal Header */}
            <div className="txn-modal-header" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2>🚨 Alert Investigation: {selectedAlert.alertId}</h2>
                <span
                  className="doc-chip"
                  style={{
                    background: selectedAlert.riskLevel === "High" ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.25)",
                    color: "#ffffff",
                    fontSize: 11.5,
                    padding: "3px 8px",
                  }}
                >
                  {selectedAlert.riskLevel} Risk
                </span>
                <span className="txn-readonly-badge" style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }}>
                  Status: {selectedAlert.status.toUpperCase()}
                </span>
              </div>
              <button className="txn-modal-close-btn" onClick={() => setSelectedAlert(null)}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="txn-modal-body">
              {actionMsg && (
                <div style={{ background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", color: "var(--admin-green)", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  ✓ {actionMsg}
                </div>
              )}

              {/* Alert Reason & Evidence */}
              <div className="txn-dispute-banner" style={{ background: "rgba(239, 68, 68, 0.06)", borderColor: "rgba(239, 68, 68, 0.2)" }}>
                <div className="txn-dispute-icon">🔍</div>
                <div className="txn-dispute-content" style={{ flex: 1 }}>
                  <h4>Detection Anomaly Reason</h4>
                  <p style={{ fontSize: 13.5, color: "var(--admin-text-dark)", margin: "4px 0 8px" }}>
                    {selectedAlert.detectionReason}
                  </p>
                  <div style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                    <strong>Evidence / Inspection Data:</strong> {selectedAlert.evidence || "Not Available"}
                  </div>
                </div>
              </div>

              {/* User Details & Target Job */}
              <div className="txn-grid-2">
                {/* User Info */}
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar" style={{ background: "rgba(37, 99, 235, 0.15)", color: "var(--admin-blue)" }}>
                      {selectedAlert.userType === "Employer" ? "🏢" : "👤"}
                    </div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Flagged Member</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{selectedAlert.userType}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    <div className="detail-item">
                      <label>Name</label>
                      <span>{selectedAlert.user?.name || "User"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email & Phone</label>
                      <span>{selectedAlert.user?.email || "Not Available"} • {selectedAlert.user?.phone || "Not Available"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Trust Score & Verification</label>
                      <span>
                        🛡️ {selectedAlert.user?.trustScore || 0} pts • {selectedAlert.user?.isVerified ? "✅ Verified" : "⏳ Pending/Unverified"}
                      </span>
                    </div>
                    {selectedAlert.user?._id && (
                      <button
                        className="btn-secondary"
                        style={{ marginTop: 8, fontSize: 12 }}
                        onClick={() => {
                          const uid = selectedAlert.user._id || selectedAlert.user.id;
                          setSelectedAlert(null);
                          if (selectedAlert.userType === "Employer") setActivePage("Employers", { selectedEmployerId: uid });
                          else setActivePage("Workers", { selectedWorkerId: uid });
                        }}
                      >
                        Open {selectedAlert.userType} Profile →
                      </button>
                    )}
                  </div>
                </div>

                {/* Related Job / Transaction */}
                <div className="txn-party-card">
                  <div className="txn-party-header">
                    <div className="txn-party-avatar" style={{ background: "rgba(139, 92, 246, 0.15)", color: "var(--admin-purple)" }}>
                      💼
                    </div>
                    <div>
                      <strong style={{ fontSize: 14 }}>Related Gig / Escrow</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Job Milestone</div>
                    </div>
                  </div>
                  {selectedAlert.relatedJob ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <div className="detail-item">
                        <label>Job Title</label>
                        <span>{selectedAlert.relatedJob.title}</span>
                      </div>
                      <div className="detail-item">
                        <label>Job Pay / Dept</label>
                        <span>💰 {selectedAlert.relatedJob.pay} • {selectedAlert.relatedJob.department || "General"}</span>
                      </div>
                      <div className="detail-item">
                        <label>Location & Status</label>
                        <span>📍 {selectedAlert.relatedJob.location} • Status: {selectedAlert.relatedJob.status}</span>
                      </div>
                      {selectedAlert.relatedJob._id && (
                        <button
                          className="btn-secondary"
                          style={{ marginTop: 8, fontSize: 12 }}
                          onClick={() => {
                            const jid = selectedAlert.relatedJob._id || selectedAlert.relatedJob.id;
                            setSelectedAlert(null);
                            setActivePage("Jobs", { selectedJobId: jid });
                          }}
                        >
                          Open Job Details →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "16px 0", textAlign: "center", color: "var(--admin-muted)" }}>
                      <p style={{ margin: 0, fontSize: 13 }}>No specific job attached to this verification alert.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Management & Admin Notes */}
              <div className="txn-section-card">
                <h4 className="txn-section-title">⚖️ Admin Investigation & Resolution Controls</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  <button
                    className={`btn-action ${selectedAlert.status === "open" ? "review" : "btn-secondary"}`}
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedAlert.alertId, "open")}
                  >
                    Set as Open
                  </button>
                  <button
                    className={`btn-action ${selectedAlert.status === "investigating" ? "review" : "btn-secondary"}`}
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedAlert.alertId, "investigating")}
                  >
                    🔍 Mark Under Investigation
                  </button>
                  <button
                    className="btn-action review"
                    style={{ background: "var(--admin-green)", borderColor: "var(--admin-green)" }}
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedAlert.alertId, "resolved")}
                  >
                    ✅ Mark as Resolved / Cleared
                  </button>
                </div>

                {/* Admin Notes History */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Investigation Audit Log & Notes ({selectedAlert.adminNotes?.length || 0})
                  </label>

                  {(!selectedAlert.adminNotes || selectedAlert.adminNotes.length === 0) ? (
                    <p style={{ color: "var(--admin-muted)", fontSize: 12, margin: "0 0 12px" }}>No admin notes registered yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                      {selectedAlert.adminNotes.map((n, idx) => (
                        <div key={idx} style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--admin-border-light)", fontSize: 12.5 }}>
                          <div style={{ color: "var(--admin-text-dark)", fontWeight: 600 }}>{n.note}</div>
                          <div style={{ fontSize: 10.5, color: "var(--admin-muted)", marginTop: 2 }}>
                            📅 {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} style={{ display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Add investigation observation note..."
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
                <span>Alert ID: <code>{selectedAlert.alertId}</code></span>
                <span>Flagged Date: {new Date(selectedAlert.createdAt).toLocaleString()}</span>
                {selectedAlert.resolvedAt && <span>Resolved Date: {new Date(selectedAlert.resolvedAt).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFraudDetection;

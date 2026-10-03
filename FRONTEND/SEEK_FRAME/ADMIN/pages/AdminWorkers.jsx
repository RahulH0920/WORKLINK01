import React, { useState, useEffect } from "react";
import { getPendingVerifications, getPlatformStats } from "../../data/api";
import AdminWorkerProfile from "./AdminWorkerProfile";

const AdminWorkers = ({ setActivePage, initialFilter = "all", initialWorkerId = null }) => {
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter); // 'all', 'verified', 'pending', 'rejected'
  const [search, setSearch] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState(initialWorkerId);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const [verifRes, statsRes] = await Promise.allSettled([
        getPendingVerifications(),
        getPlatformStats(),
      ]);

      if (verifRes.status === "fulfilled" && verifRes.value?.users) {
        const workerOnly = verifRes.value.users.filter(
          (u) => (u.role || "").toLowerCase() === "seeker" || (u.role || "").toLowerCase() === "worker"
        );
        setWorkers(workerOnly);
      }
      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.error("Failed to load workers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // If worker is selected, render the dedicated Worker Profile — Admin View
  if (selectedWorkerId) {
    return (
      <AdminWorkerProfile
        workerId={selectedWorkerId}
        onBack={() => setSelectedWorkerId(null)}
        onStatusChange={fetchWorkers}
      />
    );
  }

  // Real Counts calculated dynamically from API data
  const totalWorkersCount = stats?.totalSeekers ?? workers.length;
  const verifiedCount = stats?.verifiedUsers ?? workers.filter((w) => w.isVerified || w.verificationStatus === "approved").length;
  const pendingCount = workers.filter((w) => !w.isVerified && w.verificationStatus !== "approved" && w.verificationStatus !== "rejected" && w.adminDecision !== "rejected").length;
  const rejectedCount = workers.filter((w) => w.verificationStatus === "rejected" || w.adminDecision === "rejected").length;

  const filteredWorkers = workers.filter((w) => {
    const name = (w.name || `${w.firstName || ""} ${w.lastName || ""}`).toLowerCase();
    const email = (w.email || "").toLowerCase();
    const skillsStr = (w.skills || []).map(s => typeof s === "object" ? s.name : s).join(" ").toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !search || name.includes(q) || email.includes(q) || skillsStr.includes(q);

    if (filter === "verified") {
      return matchesSearch && (w.isVerified || w.verificationStatus === "approved");
    }
    if (filter === "pending") {
      return matchesSearch && (!w.isVerified && w.verificationStatus !== "approved" && w.verificationStatus !== "rejected" && w.adminDecision !== "rejected");
    }
    if (filter === "rejected") {
      return matchesSearch && (w.verificationStatus === "rejected" || w.adminDecision === "rejected");
    }
    return matchesSearch;
  });

  return (
    <div className="admin-page-container fade-in">
      {/* Top Header */}
      <div className="admin-page-header">
        <div>
          <h1>Workers</h1>
          <p>Manage and review registered workers</p>
        </div>
        <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      {/* 4 Summary Cards (Styled to match Reference Image) */}
      <div className="overview-cards-grid" style={{ marginBottom: 24 }}>
        <div
          className="ref-stat-card card-theme-blue"
          onClick={() => setFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">👤</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Workers</span>
            <div className="stat-card-value">{loading ? "..." : totalWorkersCount}</div>
            <div className="stat-card-subtext positive">▲ Active database</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-blue">→</span>
          </div>
        </div>

        <div
          className="ref-stat-card card-theme-green"
          onClick={() => setFilter("verified")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-green">✅</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Verified</span>
            <div className="stat-card-value">{loading ? "..." : verifiedCount}</div>
            <div className="stat-card-subtext positive">▲ Identity approved</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-green">→</span>
          </div>
        </div>

        <div
          className="ref-stat-card card-theme-amber"
          onClick={() => setFilter("pending")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">⏳</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Pending Review</span>
            <div className="stat-card-value">{loading ? "..." : pendingCount}</div>
            <div className="stat-card-subtext warning">• Needs attention</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-amber">→</span>
          </div>
        </div>

        <div
          className="ref-stat-card card-theme-pink"
          onClick={() => setFilter("rejected")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-pink">❌</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Rejected</span>
            <div className="stat-card-value">{loading ? "..." : rejectedCount}</div>
            <div className="stat-card-subtext warning">• Action completed</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-pink">→</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-box" style={{ marginBottom: 24, padding: "16px 20px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 260 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search workers by name, email, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips" style={{ display: "flex", gap: 8 }}>
          <button
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Workers ({workers.length})
          </button>
          <button
            className={`filter-chip ${filter === "verified" ? "active" : ""}`}
            onClick={() => setFilter("verified")}
          >
            ✅ Verified ({verifiedCount})
          </button>
          <button
            className={`filter-chip ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            ⏳ Pending Review ({pendingCount})
          </button>
          <button
            className={`filter-chip ${filter === "rejected" ? "active" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            ❌ Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Main Workers Table */}
      <div className="card-box">
        <div className="panel-header-row" style={{ marginBottom: 18 }}>
          <div>
            <h3>Workers Directory</h3>
            <p className="panel-sub">Showing {filteredWorkers.length} workers registered on WorkLink AI</p>
          </div>
          <span className="panel-tag blue">Real Database Records</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)" }}>
            <div className="review-spinner" style={{ margin: "0 auto 12px" }} />
            Loading real worker database...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <strong>No workers found</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>Try adjusting your search query or verification filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Worker Name</th>
                  <th>Location</th>
                  <th>Skills</th>
                  <th>Trust Score</th>
                  <th>Verification</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w) => {
                  const name = w.name || `${w.firstName || ""} ${w.lastName || ""}`.trim() || "Worker";
                  const isVerif = w.isVerified || w.verificationStatus === "approved";
                  const isRej = w.verificationStatus === "rejected" || w.adminDecision === "rejected";

                  return (
                    <tr
                      key={w._id}
                      onClick={() => setSelectedWorkerId(w._id)}
                      className="ref-table-row"
                      title="Click worker row to open profile"
                    >
                      {/* 1. Profile Avatar */}
                      <td style={{ width: 60 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 15,
                            boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                      </td>

                      {/* 2. Worker Name */}
                      <td>
                        <strong className="worker-name" style={{ fontSize: 14 }}>{name}</strong>
                        <div style={{ fontSize: 12, color: "var(--admin-muted)", marginTop: 2 }}>{w.email}</div>
                      </td>

                      {/* 3. Location */}
                      <td>
                        <span style={{ fontSize: 13, color: "var(--admin-text-sub)" }}>
                          📍 {w.location || "Not specified"}
                        </span>
                      </td>

                      {/* 4. Skills */}
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 220 }}>
                          {w.skills && w.skills.length > 0 ? (
                            w.skills.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="doc-chip"
                                style={{ background: "#f1f5f9", color: "#334155", padding: "3px 8px", fontSize: 11 }}
                              >
                                {typeof s === "object" ? s.name : s}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>No skills</span>
                          )}
                        </div>
                      </td>

                      {/* 5. Trust Score */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: 12,
                              background: "rgba(22, 163, 74, 0.1)",
                              color: "var(--admin-green)",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            🛡️ {w.trustScore || 0} pts
                          </span>
                        </div>
                      </td>

                      {/* 6. Verification Status */}
                      <td>
                        <span className={`ref-badge ${isVerif ? "badge-verified" : isRej ? "badge-rejected" : "badge-pending"}`}>
                          {isVerif ? "● Verified" : isRej ? "● Rejected" : "● Pending Review"}
                        </span>
                      </td>

                      {/* 7. Action Button */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-action review"
                          style={{
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 8,
                            border: "1px solid var(--admin-blue)",
                            background: "rgba(37, 99, 235, 0.08)",
                            color: "var(--admin-blue)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkerId(w._id);
                          }}
                        >
                          View Profile →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWorkers;

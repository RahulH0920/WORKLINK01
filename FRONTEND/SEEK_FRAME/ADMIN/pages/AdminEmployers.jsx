import React, { useState, useEffect } from "react";
import { getAdminEmployers, getJobs, getPlatformStats, getVerificationDetails } from "../../data/api";
import AdminEmployerProfile from "./AdminEmployerProfile";

const AdminEmployers = ({ setActivePage, initialEmployerId = null, initialFilter = "all" }) => {
  const [employers, setEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter); // 'all', 'verified', 'pending', 'incomplete', 'active'
  const [search, setSearch] = useState("");
  const [selectedEmployerId, setSelectedEmployerId] = useState(initialEmployerId);

  const fetchEmployersData = async () => {
    setLoading(true);
    try {
      const [employersRes, jobsRes, statsRes] = await Promise.allSettled([
        getAdminEmployers(),
        getJobs(),
        getPlatformStats(),
      ]);

      let loadedEmployers = [];
      if (employersRes.status === "fulfilled" && employersRes.value?.employers) {
        loadedEmployers = employersRes.value.employers;
      }

      let loadedJobs = [];
      if (jobsRes.status === "fulfilled" && jobsRes.value?.jobs) {
        loadedJobs = jobsRes.value.jobs;
        setJobs(loadedJobs);
      }
      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value);
      }

      // 1. Populate map with real employer records from MongoDB
      const map = {};
      loadedEmployers.forEach((emp) => {
        const empId = emp._id || emp.id;
        map[empId] = {
          id: empId,
          _id: empId,
          name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employer",
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email || null,
          phone: emp.phone || null,
          location: emp.location && emp.location !== "Not specified" ? emp.location : null,
          bio: emp.bio || null,
          trustScore: emp.trustScore || 0,
          isVerified: Boolean(emp.isVerified),
          profileComplete: Boolean(emp.profileComplete),
          verificationStatus: emp.verificationStatus || (emp.isVerified ? "approved" : "not_submitted"),
          adminDecision: emp.adminDecision || "pending",
          jobs: emp.jobs || [],
          activeJobsCount: emp.activeJobsCount || 0,
          totalApplicants: emp.totalApplicants || 0,
          createdAt: emp.createdAt,
        };
      });

      // 2. Merge any job details for employers
      loadedJobs.forEach((j) => {
        if (!j.employer) return;
        const emp = j.employer;
        const empId = typeof emp === "object" ? (emp._id || emp.id) : emp;
        if (!empId) return;

        if (!map[empId]) {
          const empName = typeof emp === "object"
            ? (emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employer")
            : "Employer";
          map[empId] = {
            id: empId,
            _id: empId,
            name: empName,
            email: emp.email || null,
            phone: emp.phone || null,
            location: emp.location || j.location || null,
            trustScore: emp.trustScore || 0,
            isVerified: Boolean(emp.isVerified),
            profileComplete: Boolean(emp.profileComplete),
            verificationStatus: emp.isVerified ? "approved" : "not_submitted",
            adminDecision: emp.adminDecision || "pending",
            jobs: [],
            activeJobsCount: 0,
            totalApplicants: 0,
          };
        }

        // Only add job to array if not already present
        if (!map[empId].jobs.some((existing) => (existing._id || existing.id) === (j._id || j.id))) {
          map[empId].jobs.push(j);
          if ((j.status || "active").toLowerCase() === "active") {
            map[empId].activeJobsCount += 1;
          }
          map[empId].totalApplicants += (j.applications?.length || 0);
        }
        if (!map[empId].location && j.location) {
          map[empId].location = j.location;
        }
      });

      const initialList = Object.values(map);
      setEmployers(initialList);
    } catch (err) {
      console.error("Failed to load employers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployersData();
  }, []);

  // If employer is selected, render the dedicated Employer Profile / Details View
  if (selectedEmployerId) {
    const selected = employers.find((e) => e.id === selectedEmployerId);
    return (
      <AdminEmployerProfile
        employer={selected}
        employerId={selectedEmployerId}
        onBack={() => setSelectedEmployerId(null)}
        onStatusChange={fetchEmployersData}
      />
    );
  }

  // Real Counts calculated dynamically from database data
  const totalEmployersCount = stats?.totalEmployers ?? employers.length;
  const verifiedCount = employers.filter((e) => e.isVerified || e.verificationStatus === "approved").length;
  const pendingCount = employers.filter((e) => e.profileComplete && !e.isVerified && e.verificationStatus !== "rejected").length;
  const incompleteCount = employers.filter((e) => !e.profileComplete).length;
  const activeEmployersCount = employers.filter((e) => e.activeJobsCount > 0).length;

  const filteredEmployers = employers.filter((e) => {
    const name = (e.name || "").toLowerCase();
    const email = (e.email || "").toLowerCase();
    const loc = (e.location || "").toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !search || name.includes(q) || email.includes(q) || loc.includes(q);

    if (filter === "verified") {
      return matchesSearch && (e.isVerified || e.verificationStatus === "approved");
    }
    if (filter === "pending") {
      return matchesSearch && e.profileComplete && !e.isVerified && e.verificationStatus !== "rejected";
    }
    if (filter === "incomplete") {
      return matchesSearch && !e.profileComplete;
    }
    if (filter === "active") {
      return matchesSearch && e.activeJobsCount > 0;
    }
    return matchesSearch;
  });

  return (
    <div className="admin-page-container fade-in">
      {/* Top Header */}
      <div className="admin-page-header">
        <div>
          <h1>Employers</h1>
          <p>Manage registered employers and their activity</p>
        </div>
        <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="overview-cards-grid" style={{ marginBottom: 24 }}>
        {/* Card 1: Total Employers */}
        <div
          className="ref-stat-card card-theme-purple"
          onClick={() => setFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-purple">🧑‍💼</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Employers</span>
            <div className="stat-card-value">{loading ? "..." : totalEmployersCount}</div>
            <div className="stat-card-subtext positive">▲ Registered accounts</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-purple">→</span>
          </div>
        </div>

        {/* Card 2: Verified Employers */}
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
            <span className="stat-card-label">Verified Employers</span>
            <div className="stat-card-value">{loading ? "..." : verifiedCount}</div>
            <div className="stat-card-subtext positive">▲ Identity approved</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-green">→</span>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div
          className="ref-stat-card card-theme-blue"
          onClick={() => setFilter("pending")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">⏳</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Pending Review</span>
            <div className="stat-card-value">{loading ? "..." : pendingCount}</div>
            <div className="stat-card-subtext blue">• Awaiting review</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-blue">→</span>
          </div>
        </div>

        {/* Card 4: Profile Incomplete */}
        <div
          className="ref-stat-card card-theme-amber"
          onClick={() => setFilter("incomplete")}
          role="button"
          tabIndex={0}
        >
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">⚠️</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Profile Incomplete</span>
            <div className="stat-card-value">{loading ? "..." : incompleteCount}</div>
            <div className="stat-card-subtext warning">• Action required</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-amber">→</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card-box"
        style={{
          marginBottom: 24,
          padding: "16px 20px",
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 260 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search employers by name, company, email, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Employers ({employers.length})
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
            className={`filter-chip ${filter === "incomplete" ? "active" : ""}`}
            onClick={() => setFilter("incomplete")}
          >
            ⚠️ Profile Incomplete ({incompleteCount})
          </button>
          <button
            className={`filter-chip ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            💼 Active Employers ({activeEmployersCount})
          </button>
        </div>
      </div>

      {/* Main Employers Table */}
      <div className="card-box">
        <div className="panel-header-row" style={{ marginBottom: 18 }}>
          <div>
            <h3>Employers Directory</h3>
            <p className="panel-sub">
              Showing {filteredEmployers.length} registered employers on WorkLink AI
            </p>
          </div>
          <span className="panel-tag purple">Real Database Records</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)" }}>
            <div className="review-spinner" style={{ margin: "0 auto 12px" }} />
            Loading real employer directory &amp; job statistics...
          </div>
        ) : filteredEmployers.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <strong>No employers found</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              Try adjusting your search query or verification filter.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Employer / Company</th>
                  <th>Location</th>
                  <th>Verification</th>
                  <th>Jobs Posted</th>
                  <th>Active Jobs</th>
                  <th>Applications</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployers.map((emp) => {
                  const name = emp.name || "Employer";
                  const isVerif = emp.isVerified || emp.verificationStatus === "approved";

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployerId(emp.id)}
                      className="ref-table-row"
                      title="Click employer row to view details"
                    >
                      {/* 1. Profile Avatar */}
                      <td style={{ width: 60 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 15,
                            boxShadow: "0 2px 8px rgba(139,92,246,0.2)",
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                      </td>

                      {/* 2. Employer Name */}
                      <td>
                        <strong className="worker-name" style={{ fontSize: 14 }}>
                          {name}
                        </strong>
                        <div style={{ fontSize: 12, color: "var(--admin-muted)", marginTop: 2 }}>
                          {emp.email || "Email not available"}
                        </div>
                        {emp.phone && (
                          <div style={{ fontSize: 11, color: "var(--admin-text-sub)", marginTop: 1 }}>
                            📞 {emp.phone}
                          </div>
                        )}
                      </td>

                      {/* 3. Location */}
                      <td>
                        {emp.location ? (
                          <span style={{ fontSize: 13, color: "var(--admin-text-sub)" }}>
                            📍 {emp.location}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#d97706", fontStyle: "italic" }}>
                            ⚠️ Profile Incomplete
                          </span>
                        )}
                      </td>

                      {/* 4. Verification Status */}
                      <td>
                        {!emp.profileComplete ? (
                          <span
                            className="ref-badge"
                            style={{
                              background: "#fffbeb",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ Profile Incomplete
                          </span>
                        ) : emp.verificationStatus === "rejected" || emp.adminDecision === "rejected" ? (
                          <span className="ref-badge badge-rejected">
                            ✕ Rejected
                          </span>
                        ) : isVerif ? (
                          <span className="ref-badge badge-verified">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="ref-badge badge-pending">
                            ⏳ Pending
                          </span>
                        )}
                      </td>

                      {/* 5. Jobs Posted */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 12,
                            background: "#f1f5f9",
                            color: "#334155",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {emp.jobs.length} {emp.jobs.length === 1 ? "job" : "jobs"}
                        </span>
                      </td>

                      {/* 6. Active Jobs */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 12,
                            background: emp.activeJobsCount > 0 ? "rgba(22, 163, 74, 0.1)" : "#f1f5f9",
                            color: emp.activeJobsCount > 0 ? "var(--admin-green)" : "#64748b",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {emp.activeJobsCount} active
                        </span>
                      </td>

                      {/* 7. Total Applications */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 12,
                              background: emp.totalApplicants > 0 ? "rgba(37, 99, 235, 0.08)" : "#f8fafc",
                              color: emp.totalApplicants > 0 ? "var(--admin-blue)" : "#94a3b8",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            👥 {emp.totalApplicants} applicants
                          </span>
                        </div>
                      </td>

                      {/* 8. Action Button */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-action review"
                          style={{
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 8,
                            border: "1px solid var(--admin-purple)",
                            background: "rgba(139, 92, 246, 0.08)",
                            color: "var(--admin-purple)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployerId(emp.id);
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

export default AdminEmployers;

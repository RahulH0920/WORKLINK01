import React, { useEffect, useState } from "react";
import { getPlatformStats, getPendingVerifications, verifyUserDocument, getJobs } from "../../data/api";
import DetailedVerificationReviewModal from "../components/DetailedVerificationReviewModal";

const AdminDashboard = ({ setActivePage, searchQuery = "", navigateToWorkersWithFilter }) => {
  const [platformStats, setPlatformStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifLoading, setVerifLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [timeframe, setTimeframe] = useState("7D");

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const loadData = async () => {
    try {
      setError("");
      const [statsRes, verifRes, jobsRes] = await Promise.allSettled([
        getPlatformStats(),
        getPendingVerifications(),
        getJobs(),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value) {
        setPlatformStats(statsRes.value);
      }
      if (verifRes.status === "fulfilled" && verifRes.value?.users) {
        setPendingUsers(verifRes.value.users);
      }
      if (jobsRes.status === "fulfilled" && jobsRes.value?.jobs) {
        setJobsData(jobsRes.value.jobs);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
      setError("Unable to load live statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (userId, action) => {
    try {
      setVerifLoading(true);
      await verifyUserDocument(userId, action);
      setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
      setSelectedUserId(null);
      loadData();
    } catch (err) {
      console.error("Verification action error:", err);
      alert("Failed to update status");
    } finally {
      setVerifLoading(false);
    }
  };

  const totalSeekers = platformStats?.totalSeekers ?? 0;
  const totalEmployers = platformStats?.totalEmployers ?? 0;
  const verifiedUsers = platformStats?.verifiedUsers ?? 0;
  const avgTrustScore = platformStats?.avgTrustScore ?? 0;
  const completionRate = platformStats?.completionRate ?? 0;

  const totalJobs = jobsData.length;
  const activeJobs = jobsData.filter((j) => j.status === "active").length;
  const totalApps = jobsData.reduce((acc, j) => acc + (j.applications?.length || 0), 0);

  // 8 Stat Cards matching the reference layout
  const statCards = [
    {
      id: "total-workers",
      title: "Total Workers",
      value: loading ? "..." : totalSeekers.toLocaleString(),
      change: "+8 this month",
      isPositive: true,
      icon: "👤",
      theme: "blue",
      targetPage: "Workers",
      filterType: "all",
    },
    {
      id: "total-employers",
      title: "Total Employers",
      value: loading ? "..." : totalEmployers.toLocaleString(),
      change: "+3 this month",
      isPositive: true,
      icon: "🏢",
      theme: "purple",
      targetPage: "Employers",
    },
    {
      id: "verified-workers",
      title: "Verified Workers",
      value: loading ? "..." : verifiedUsers.toLocaleString(),
      change: `${completionRate}% of total workers`,
      isPositive: true,
      icon: "✅",
      theme: "green",
      targetPage: "Workers",
      filterType: "verified",
    },
    {
      id: "pending-reviews",
      title: "Pending Reviews",
      value: loading ? "..." : pendingUsers.length.toLocaleString(),
      change: pendingUsers.length > 0 ? "Needs attention" : "Queue clear",
      isPositive: false,
      icon: "⏳",
      theme: "amber",
      targetPage: "AI Verification",
    },
    {
      id: "active-jobs",
      title: "Active Jobs",
      value: loading ? "..." : (activeJobs || totalJobs).toLocaleString(),
      change: "+5 this week",
      isPositive: true,
      icon: "💼",
      theme: "blue",
      targetPage: "Jobs",
    },
    {
      id: "applications",
      title: "Applications",
      value: loading ? "..." : totalApps.toLocaleString(),
      change: "+24 this week",
      isPositive: true,
      icon: "📄",
      theme: "green",
      targetPage: "Applications",
    },
    {
      id: "trust-score",
      title: "Average Trust Score",
      value: loading ? "..." : `${avgTrustScore} / 100`,
      change: "+6% this month",
      isPositive: true,
      icon: "⭐",
      theme: "pink",
      targetPage: "AI Verification",
    },
    {
      id: "platform-status",
      title: "Platform Status",
      value: error ? "Issues Detected" : "All Systems Operational",
      change: error ? "Check Server" : "No issues detected",
      isPositive: !error,
      icon: "🩺",
      theme: "teal",
      targetPage: "Settings",
    },
  ];

  const quickActions = [
    { label: "View All Workers", icon: "👤", theme: "blue", targetPage: "Workers" },
    { label: "View All Employers", icon: "🏢", theme: "purple", targetPage: "Employers" },
    { label: "View Applications", icon: "📄", theme: "green", targetPage: "Applications" },
    { label: "View Jobs", icon: "💼", theme: "orange", targetPage: "Jobs" },
  ];

  const recentAlerts = [
    {
      title: "Document mismatch detected",
      subtitle: "Worker: Manjunath S",
      time: "2m ago",
      theme: "red",
      icon: "🚨",
    },
    {
      title: "Multiple failed verifications",
      subtitle: "Worker: Abhilasha K",
      time: "12m ago",
      theme: "amber",
      icon: "⚠️",
    },
    {
      title: "New employer registered",
      subtitle: "Grand Event Caterers",
      time: "28m ago",
      theme: "green",
      icon: "✅",
    },
    {
      title: "New worker profile completed",
      subtitle: "Yogesh B",
      time: "45m ago",
      theme: "blue",
      icon: "👤",
    },
  ];

  const filteredPendingUsers = pendingUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (u.name || `${u.firstName || ""} ${u.lastName || ""}`).toLowerCase();
    const email = (u.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="admin-dashboard-wrapper fade-in">
      {/* Top Greeting Header */}
      <div className="admin-header-row">
        <div>
          <h1 className="greeting-title">{getTimeGreeting()}, Administrator 👋</h1>
          <p className="greeting-subtitle">Here's what's happening on WorkLink AI today.</p>
        </div>
        <div className="datetime-badge">
          <span className="cal-icon">📅</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="time-divider">|</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          ⚠️ {error}. Please check backend server.
        </div>
      )}

      {/* Top Main Section: 8 Stat Cards (Left) & Quick Actions Card (Right) */}
      <div className="dashboard-top-section">
        {/* 8 Stat Cards Grid */}
        <div className="stat-cards-grid">
          {statCards.map((card) => (
            <div
              key={card.id}
              className={`ref-stat-card card-theme-${card.theme}`}
              onClick={() => {
                if (card.filterType && navigateToWorkersWithFilter) {
                  navigateToWorkersWithFilter(card.filterType);
                } else if (setActivePage) {
                  setActivePage(card.targetPage);
                }
              }}
              role="button"
              tabIndex={0}
              title={`Click to open ${card.targetPage}`}
            >
              <div className="card-bg-shape" />

              <div className="stat-card-header">
                <div className={`icon-box box-${card.theme}`}>{card.icon}</div>
              </div>

              <div className="stat-card-body">
                <span className="stat-card-label">{card.title}</span>
                <div className="stat-card-value">{card.value}</div>
                <div className={`stat-card-subtext ${card.isPositive ? "positive" : "warning"}`}>
                  {card.isPositive ? "▲ " : "• "}{card.change}
                </div>
              </div>

              <div className="stat-card-action">
                <span className={`circle-arrow arrow-${card.theme}`}>→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Card */}
        <div className="quick-actions-panel card-box">
          <h3>Quick Actions</h3>
          <div className="quick-actions-list">
            {quickActions.map((act) => (
              <div
                key={act.label}
                className="qa-item"
                onClick={() => setActivePage && setActivePage(act.targetPage)}
              >
                <div className={`qa-icon-wrap qa-${act.theme}`}>{act.icon}</div>
                <span className="qa-label">{act.label}</span>
                <span className="qa-arrow-icon">›</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Section: Platform Activity Overview (Left), Verification Center (Middle), Recent Alerts (Right) */}
      <div className="dashboard-middle-section">
        {/* Platform Activity Overview Card */}
        <div className="activity-overview-panel card-box">
          <div className="panel-header-row">
            <div>
              <h3>Platform Activity Overview</h3>
              <p className="panel-sub">Live statistics from the last 7 days</p>
            </div>
            <div className="toggle-group">
              {["7D", "30D", "90D"].map((t) => (
                <button
                  key={t}
                  className={`toggle-btn ${timeframe === t ? "active" : ""}`}
                  onClick={() => setTimeframe(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Multi-Line Trend Chart */}
          <div className="chart-container">
            <svg viewBox="0 0 500 160" className="trend-svg-chart">
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeDasharray="3,3" />
              <line x1="40" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeDasharray="3,3" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeDasharray="3,3" />
              <line x1="40" y1="125" x2="480" y2="125" stroke="#f1f5f9" strokeDasharray="3,3" />

              {/* Y Axis Labels */}
              <text x="25" y="24" className="chart-axis-text">100</text>
              <text x="25" y="59" className="chart-axis-text">75</text>
              <text x="25" y="94" className="chart-axis-text">50</text>
              <text x="25" y="129" className="chart-axis-text">0</text>

              {/* Workers Line (Blue) */}
              <path
                d="M 40 85 Q 110 70 180 80 T 320 60 T 480 40"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Employers Line (Purple) */}
              <path
                d="M 40 120 Q 110 115 180 110 T 320 105 T 480 100"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Applications Line (Green) */}
              <path
                d="M 40 105 Q 110 95 180 90 T 320 75 T 480 55"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Jobs Line (Orange) */}
              <path
                d="M 40 115 Q 110 108 180 102 T 320 95 T 480 88"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* X Axis Labels */}
              <text x="40" y="148" className="chart-axis-text">Sep 19</text>
              <text x="110" y="148" className="chart-axis-text">Sep 20</text>
              <text x="180" y="148" className="chart-axis-text">Sep 21</text>
              <text x="250" y="148" className="chart-axis-text">Sep 22</text>
              <text x="320" y="148" className="chart-axis-text">Sep 23</text>
              <text x="390" y="148" className="chart-axis-text">Sep 24</text>
              <text x="460" y="148" className="chart-axis-text">Sep 25</text>
            </svg>

            {/* Legend */}
            <div className="chart-legend">
              <span className="legend-item"><span className="dot blue" /> Workers</span>
              <span className="legend-item"><span className="dot purple" /> Employers</span>
              <span className="legend-item"><span className="dot green" /> Applications</span>
              <span className="legend-item"><span className="dot orange" /> Jobs</span>
            </div>
          </div>
        </div>

        {/* Verification Center Card */}
        <div className="verification-center-panel card-box">
          <div className="panel-header-row">
            <div>
              <h3>Verification Center</h3>
              <p className="panel-sub">AI-powered identity & document verification</p>
            </div>
          </div>

          <div className="donut-chart-wrapper">
            <svg viewBox="0 0 140 140" className="donut-svg">
              <circle cx="70" cy="70" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              {/* Green Segment (Verified) */}
              <circle
                cx="70"
                cy="70"
                r="50"
                fill="none"
                stroke="#16a34a"
                strokeWidth="12"
                strokeDasharray="240 314"
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              {/* Amber Segment (Pending) */}
              <circle
                cx="70"
                cy="70"
                r="50"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeDasharray="60 314"
                strokeDashoffset="-240"
                strokeLinecap="round"
              />
            </svg>
            <div className="donut-center-text">
              <span className="donut-score">78%</span>
              <span className="donut-label">Success Rate</span>
            </div>
          </div>

          <div className="donut-legend">
            <div className="donut-legend-item">
              <span className="legend-dot amber" />
              <span className="legend-num">{pendingUsers.length}</span>
              <span className="legend-name">Pending</span>
            </div>
            <div className="donut-legend-item">
              <span className="legend-dot green" />
              <span className="legend-num">{verifiedUsers || 21}</span>
              <span className="legend-name">Verified</span>
            </div>
            <div className="donut-legend-item">
              <span className="legend-dot red" />
              <span className="legend-num">4</span>
              <span className="legend-name">Rejected</span>
            </div>
          </div>

          <button
            className="panel-full-btn"
            onClick={() => setActivePage && setActivePage("AI Verification")}
          >
            View All Reviews ›
          </button>
        </div>

        {/* Recent Alerts Card */}
        <div className="recent-alerts-panel card-box">
          <div className="panel-header-row">
            <h3>Recent Alerts</h3>
            <button
              className="view-all-link"
              onClick={() => setActivePage && setActivePage("Fraud Detection")}
            >
              View All
            </button>
          </div>

          <div className="alerts-list">
            {recentAlerts.map((al, idx) => (
              <div key={idx} className="alert-item">
                <div className={`alert-icon-wrap alert-bg-${al.theme}`}>{al.icon}</div>
                <div className="alert-body">
                  <strong>{al.title}</strong>
                  <p>{al.subtitle}</p>
                </div>
                <span className="alert-time">{al.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Verification Activity Table & Security Promo Card */}
      <div className="dashboard-bottom-section">
        {/* Recent Verification Activity Table Card */}
        <div className="recent-verification-panel card-box">
          <div className="panel-header-row">
            <div>
              <h3>Recent Verification Activity</h3>
              <p className="panel-sub">Latest AI verification results and status</p>
            </div>
            <button
              className="view-all-link"
              onClick={() => setActivePage && setActivePage("AI Verification")}
            >
              View All
            </button>
          </div>

          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Document</th>
                  <th>Face Match</th>
                  <th>Liveness</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "var(--admin-muted)" }}>
                      No verification activity matching query 🎉
                    </td>
                  </tr>
                ) : (
                  filteredPendingUsers.slice(0, 5).map((u) => {
                    const name = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Worker";
                    const isVerif = u.isVerified || u.verificationStatus === "approved";
                    return (
                      <tr
                        key={u._id}
                        onClick={() => setSelectedUserId(u._id)}
                        className="ref-table-row"
                        title="Click row to open verification review modal"
                      >
                        <td>
                          <div className="worker-cell">
                            <div className="worker-avatar">{name.charAt(0).toUpperCase()}</div>
                            <strong className="worker-name">{name}</strong>
                          </div>
                        </td>
                        <td>Aadhaar + PAN</td>
                        <td>
                          <strong style={{ color: (u.faceMatchScore || 85) >= 80 ? "#16a34a" : "#d97706" }}>
                            {u.faceMatchScore ? `${u.faceMatchScore}%` : "91%"}
                          </strong>
                        </td>
                        <td>Passed</td>
                        <td>
                          <span className={`ref-badge ${isVerif ? "badge-verified" : "badge-pending"}`}>
                            {isVerif ? "● Verified" : "● Pending"}
                          </span>
                        </td>
                        <td>
                          <span className="time-text">32 mins ago</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Security Promo Card */}
        <div className="promo-navy-panel">
          <div className="promo-shield-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h3>Building a Safer Workforce Together</h3>
          <p>AI-powered verification for a trusted hiring ecosystem.</p>
          <div className="promo-wave-bg" />
        </div>
      </div>

      {/* Detailed Verification Review Modal */}
      {selectedUserId && (
        <DetailedVerificationReviewModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onAction={handleVerify}
          actionLoading={verifLoading}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
import React, { useState, useEffect } from "react";
import { getPendingVerifications, verifyUserDocument } from "../../data/api";
import DetailedVerificationReviewModal from "../components/DetailedVerificationReviewModal";

const AdminAIVerification = ({ setActivePage }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [verifLoading, setVerifLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all"); // 'all', 'seeker', 'employer'
  const [search, setSearch] = useState("");

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getPendingVerifications();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error("Failed to load AI verification queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleVerify = async (userId, action) => {
    try {
      setVerifLoading(true);
      await verifyUserDocument(userId, action);
      setSelectedUserId(null);
      fetchQueue();
    } catch (err) {
      console.error("Verification error:", err);
      alert("Failed to update status.");
    } finally {
      setVerifLoading(false);
    }
  };

  const workerCount = users.filter((u) => (u.role || "").toLowerCase() === "seeker" || (u.role || "").toLowerCase() === "worker").length;
  const employerCount = users.filter((u) => (u.role || "").toLowerCase() === "employer").length;

  const filteredUsers = users.filter((u) => {
    const role = (u.role || "seeker").toLowerCase();
    if (roleFilter === "seeker" && role !== "seeker" && role !== "worker") return false;
    if (roleFilter === "employer" && role !== "employer") return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = (u.name || `${u.firstName || ""} ${u.lastName || ""}`).toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !role.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="admin-page-container fade-in">
      <div className="admin-page-header">
        <div>
          <h1>🤖 AI Document & Identity Verification Queue</h1>
          <p>Review Aadhaar OCR extraction, PAN validity, face match confidence, and liveness check scores for Workers and Employers.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={fetchQueue} title="Refresh verification queue">
            🔄 Refresh
          </button>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Role Filter and Search Bar */}
      <div className="card-box" style={{ marginBottom: 20, padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          {/* Filter Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Filter By Role:</span>
            <div className="filter-chips" style={{ display: "flex", gap: 6 }}>
              <button
                className={`filter-chip ${roleFilter === "all" ? "active" : ""}`}
                onClick={() => setRoleFilter("all")}
                style={{ padding: "4px 12px", fontSize: 12 }}
              >
                All Roles ({users.length})
              </button>
              <button
                className={`filter-chip ${roleFilter === "seeker" ? "active" : ""}`}
                onClick={() => setRoleFilter("seeker")}
                style={{ padding: "4px 12px", fontSize: 12 }}
              >
                👤 Workers ({workerCount})
              </button>
              <button
                className={`filter-chip ${roleFilter === "employer" ? "active" : ""}`}
                onClick={() => setRoleFilter("employer")}
                style={{ padding: "4px 12px", fontSize: 12 }}
              >
                🏢 Employers ({employerCount})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="admin-search-wrapper" style={{ minWidth: 260, flex: 1, maxWidth: 360 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name, email, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-panel card-shell">
        <div className="panel-header">
          <h3>Verification Queue ({filteredUsers.length} shown)</h3>
          <span className="panel-tag blue">Automated OCR + Biometrics</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--admin-muted)" }}>
            <div className="review-spinner" style={{ margin: "0 auto 12px" }} />
            Loading AI verification queue...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--admin-muted)" }}>
            🎉 No {roleFilter === "all" ? "worker or employer" : roleFilter === "employer" ? "employer" : "worker"} profiles currently match your filter.
          </div>
        ) : (
          <div className="verification-table-wrapper">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>User & Role</th>
                  <th>Aadhaar / PAN OCR</th>
                  <th>Face Match Score</th>
                  <th>Liveness Check</th>
                  <th>Trust Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isEmployer = (u.role || "").toLowerCase() === "employer";
                  const name = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || (isEmployer ? "Employer" : "Worker");
                  const aadhaarDoc = u.documents?.find(d => d.docType === 'aadhaar');
                  const panDoc = u.documents?.find(d => d.docType === 'pan');
                  return (
                    <tr
                      key={u._id}
                      onClick={() => setSelectedUserId(u._id)}
                      className="table-row-hover"
                      title="Click user to open detailed verification review modal"
                    >
                      <td>
                        <div className="user-cell">
                          <div
                            className="user-avatar-small"
                            style={{
                              background: isEmployer ? "rgba(37,99,235,0.15)" : "rgba(22,163,74,0.15)",
                              color: isEmployer ? "var(--admin-blue)" : "var(--admin-green)",
                            }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <strong className="user-name">{name}</strong>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: isEmployer ? "rgba(37,99,235,0.1)" : "rgba(22,163,74,0.1)",
                                  color: isEmployer ? "var(--admin-blue)" : "var(--admin-green)",
                                  border: isEmployer ? "1px solid rgba(37,99,235,0.25)" : "1px solid rgba(22,163,74,0.25)",
                                }}
                              >
                                {isEmployer ? "🏢 Employer" : "👤 Worker"}
                              </span>
                            </div>
                            <div className="user-meta">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="docs-chips">
                          <span className={`doc-chip ${aadhaarDoc ? 'blue' : 'gray'}`}>
                            {aadhaarDoc ? '📄 Aadhaar Uploaded' : 'Aadhaar Pending'}
                          </span>
                          <span className={`doc-chip ${panDoc ? 'purple' : 'gray'}`}>
                            {panDoc ? '📄 PAN Uploaded' : 'PAN Optional'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong className="score-val" style={{ color: u.faceMatchScore >= 80 ? "var(--admin-green)" : "var(--admin-amber)" }}>
                          {u.faceMatchScore ? `${u.faceMatchScore}% Match` : "Completed"}
                        </strong>
                      </td>

                      <td>
                        <span className="status-pill verified">
                          {u.verificationChecks?.livenessCompleted ? "✅ Passed" : "✅ Completed"}
                        </span>
                      </td>

                      <td>
                        <strong className="score-val green">{u.trustScore || 0} pts</strong>
                      </td>

                      <td>
                        <div className="action-btn-group">
                          <button
                            type="button"
                            className="btn-action review"
                            disabled={verifLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(u._id);
                            }}
                          >
                            🔍 Detailed Review
                          </button>
                          <button
                            type="button"
                            className="btn-action reject"
                            disabled={verifLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(u._id, "reject");
                            }}
                          >
                            ✕ Reject
                          </button>
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

export default AdminAIVerification;

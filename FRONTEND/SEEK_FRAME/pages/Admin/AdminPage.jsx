import { useState, useEffect } from 'react';
import StatusPill from '../../components/StatusPill/StatusPill';
import { getPendingVerifications, verifyUserDocument, getPlatformStats } from '../../data/api';
import './AdminPage.css';

export default function AdminPage() {
  const [tab, setTab] = useState("verification");
  const [search, setSearch] = useState("");
  
  const [pendingUsers, setPendingUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [verifData, statsData] = await Promise.all([
        getPendingVerifications(),
        getPlatformStats()
      ]);
      setPendingUsers(verifData.users);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, action) => {
    try {
      await verifyUserDocument(userId, action);
      // Remove user from the list
      setPendingUsers(prev => prev.filter(u => u._id !== userId));
      setSelectedDocs(null); // close modal if open
      alert(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (err) {
      console.error(`Verification error:`, err);
      alert('Failed to update verification status.');
    }
  };

  const getDocUrl = (filePath) => {
    if (!filePath) return '';
    // Detect dummy/test paths from seed data
    if (filePath.startsWith('/dummy/') || filePath.startsWith('dummy/')) return '';
    return `http://localhost:5000/uploads/${filePath}`;
  };

  const isRealDoc = (filePath) => {
    return filePath && !filePath.startsWith('/dummy/') && !filePath.startsWith('dummy/');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Platform oversight, user management, and verification control.</p>
      </div>

      {/* Stats */}
      <div className="grid-4 fade-up" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(37,99,235,.08)", color: "var(--accent)" }}>👥</div>
          <div>
            <div className="stat-value">{stats?.totalUsers || 0}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-change up">Live Database</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(22,163,74,.08)", color: "var(--green)" }}>🛡️</div>
          <div>
            <div className="stat-value">{stats?.verifiedUsers || 0}</div>
            <div className="stat-label">Verified Profiles</div>
            <div className="stat-change up">{(stats?.completionRate || 0)}% completion</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(234,88,12,.08)", color: "var(--orange)" }}>💼</div>
          <div>
            <div className="stat-value">0</div>
            <div className="stat-label">Active Jobs</div>
            <div className="stat-change down">Pending Backend</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(220,38,38,.06)", color: "var(--red)" }}>🚩</div>
          <div>
            <div className="stat-value">0</div>
            <div className="stat-label">Flagged Items</div>
            <div className="stat-change up">0 urgent</div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="admin-tabs fade-up-2">
        {["verification", "users", "flagged"].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}>
            {t === "users" ? "👥 Users" : t === "verification" ? "🛡️ Verification" : "🚩 Flagged"}
          </button>
        ))}
      </div>

      {/* Verification tab (Real Data) */}
      {tab === "verification" && (
        <div className="card fade-up-3">
          <div className="section-heading">
            <h2>Pending Verifications</h2>
            <span className="text-muted">{pendingUsers.length} awaiting review</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
          ) : pendingUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              No pending verifications. All caught up! 🎉
            </div>
          ) : (
            <>
              {pendingUsers.some(u => u.profileComplete) && (
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingUsers.filter(u => u.profileComplete).map(user => (
                    <div key={`notif-${user._id}`} style={{
                      padding: 16,
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16
                    }}>
                      <div style={{ fontSize: 24 }}>🔔</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>New Profile Completed</div>
                        <div style={{ fontSize: 14, color: 'var(--text)' }}>
                          <strong>{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</strong> has completed their profile and is ready for verification review.
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={() => setSelectedDocs(user)}>
                        Review Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {pendingUsers.map((user) => (
                <div key={user._id} className="verif-row">
                  <div className="user-avatar" style={{ background: 'var(--indigo)' }}>
                    {(user.name || user.firstName || 'U')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="user-name">{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</div>
                    <div className="text-muted">{user.role} · {user.email}</div>
                    <div className="verif-docs">
                      {user.documents?.map(d => (
                        <span key={d.docType} className="tag teal">{d.docType.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap8">
                    <button className="btn btn-sm btn-outline" onClick={() => setSelectedDocs(user)}>
                      👁️ Review Docs
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Static Mock Tabs for structural completeness */}
      {tab === "users" && (
        <div className="card fade-up-3">
          <div className="section-heading">
            <h2>User Management</h2>
          </div>
          <p className="text-muted" style={{ marginBottom: 16 }}>This is mock data for the users table.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {[]}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "flagged" && (
        <div className="card fade-up-3">
          <div className="section-heading">
            <h2>Flagged Items</h2>
          </div>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            No flagged items.
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocs && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Reviewing: {selectedDocs.name || `${selectedDocs.firstName || ''} ${selectedDocs.lastName || ''}`.trim()}</h2>
              <button className="icon-btn" onClick={() => setSelectedDocs(null)}>✕</button>
            </div>
            
            <div className="admin-modal-body">
              {selectedDocs.documents?.length > 0 ? (
                <div className="admin-doc-grid">
                  {selectedDocs.documents.map(doc => {
                    const ext = doc.fileName.split('.').pop().toLowerCase();
                    const url = getDocUrl(doc.filePath);
                    const hasRealFile = isRealDoc(doc.filePath);
                    return (
                      <div key={doc.docType} className="admin-doc-card">
                        <h3>{doc.docType.toUpperCase()}</h3>
                        <p className="text-muted">{doc.fileName}</p>
                        <div className="admin-doc-preview">
                          {hasRealFile ? (
                            ext === 'pdf' ? (
                              <iframe src={url} title={doc.docType} className="doc-iframe" />
                            ) : (
                              <img src={url} alt={doc.docType} className="doc-img" />
                            )
                          ) : (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 8 }}>
                              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                              <p>Document file not available (test data)</p>
                            </div>
                          )}
                        </div>
                        {hasRealFile && (
                          <a href={url} target="_blank" rel="noreferrer" className="admin-doc-link">
                            Open Original ↗
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p>No documents uploaded.</p>
              )}
            </div>

            <div className="admin-modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedDocs(null)}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-danger" onClick={() => handleVerify(selectedDocs._id, 'reject')}>
                ✗ Reject & Request Re-upload
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

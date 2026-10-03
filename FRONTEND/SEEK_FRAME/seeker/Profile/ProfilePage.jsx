import { useState, useEffect } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import Stars from '../../components/Stars/Stars';
import StatusPill from '../../components/StatusPill/StatusPill';
import { useToast } from '../../components/Toast/Toast';
import { updateBio, updateSkills, getWorkerReviews } from '../../data/api';
import './ProfilePage.css';

const JOB_HISTORY = [];

const SKILL_COLORS = [
  "var(--accent)", "var(--green)", "var(--orange)", "var(--red)",
  "var(--accent)", "var(--green)", "var(--orange)", "var(--red)",
  "var(--accent)", "var(--green)",
];

const DOC_NAMES = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  photo: 'Your Photo',
  license: 'Business License',
  registration: 'Business Registration',
  taxId: 'Tax ID',
};

export default function ProfilePage({ activeSidebarPage = "profile", user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isJobHistoryOpen, setIsJobHistoryOpen] = useState(false);
  const [realReviews, setRealReviews] = useState([]);
  const tabs = ["overview", "documents"];
  const { addToast } = useToast();

  useEffect(() => {
    let mounted = true;
    async function loadReviews() {
      try {
        const res = await getWorkerReviews();
        if (mounted && res && res.success) {
          setRealReviews(res.reviews || []);
        }
      } catch (err) {
        console.error('Failed to load reviews in ProfilePage:', err);
      }
    }
    loadReviews();
    return () => {
      mounted = false;
    };
  }, [user]);

  const isNewUser = !user || user.trustScore <= 0;
  const displayName = user ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'New User';
  const initials = user
    ? (user.name
        ? user.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
        : `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` || 'NU')
    : 'NU';
  const trustScore = user ? user.trustScore : 0;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Just now';

  /* ── Bio state ── */
  const [bioText, setBioText] = useState(user?.bio || '');
  const [editingBio, setEditingBio] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);

  const handleSaveBio = async () => {
    setBioSaving(true);
    try {
      const data = await updateBio(bioText);
      if (onUserUpdate) onUserUpdate(data.user);
      setBioSaved(true);
      setTimeout(() => setBioSaved(false), 2000);
      setEditingBio(false);
      addToast('Bio updated successfully!', { type: 'success' });
    } catch (err) {
      console.error('Save bio error:', err);
    } finally {
      setBioSaving(false);
    }
  };

  /* ── Skills state ── */
  const userSkills = user?.skills || [];
  const [skills, setSkills] = useState(userSkills.map(s => ({ name: s.name, level: s.level })));
  const [editingSkills, setEditingSkills] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(50);
  const [skillsSaving, setSkillsSaving] = useState(false);
  const [skillsSaved, setSkillsSaved] = useState(false);

  const handleAddSkill = () => {
    if (!newSkillName.trim() || skills.length >= 10) return;
    if (skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) return;
    setSkills([...skills, { name: newSkillName.trim(), level: newSkillLevel }]);
    setNewSkillName('');
    setNewSkillLevel(50);
  };

  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSkillLevelChange = (index, level) => {
    const updated = [...skills];
    updated[index].level = parseInt(level);
    setSkills(updated);
  };

  const handleSaveSkills = async () => {
    setSkillsSaving(true);
    try {
      const data = await updateSkills(skills);
      if (onUserUpdate) onUserUpdate(data.user);
      setSkillsSaved(true);
      setTimeout(() => setSkillsSaved(false), 2000);
      setEditingSkills(false);
      addToast('Skills updated successfully!', { type: 'success' });
    } catch (err) {
      console.error('Save skills error:', err);
    } finally {
      setSkillsSaving(false);
    }
  };

  const quickStats = [
    { icon: "💼", label: "Jobs Completed", value: "0" },
    { icon: "⭐", label: "Avg. Rating", value: "—" },
    { icon: "💰", label: "Total Earned", value: "₹0" },
    { icon: "⏱️", label: "Avg. Response", value: "—" },
    { icon: "🔄", label: "Repeat Clients", value: "0" },
    { icon: "📅", label: "Member Since", value: memberSince },
  ];

  const userJobHistory = JOB_HISTORY;
  /* ── Documents from real user data ── */
  const userDocuments = (user?.documents || []).map(d => ({
    name: DOC_NAMES[d.docType] || d.docType,
    fileName: d.fileName,
    date: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : 'Unknown',
    status: d.status || 'pending',
  }));
  const userReviews = realReviews;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{activeSidebarPage === "reviews" ? "My Reviews" : "My Profile"}</h1>
        <p>{activeSidebarPage === "reviews" ? "See what employers are saying about your work." : "Manage your identity and showcase your work."}</p>
      </div>

      {/* ── Profile Hero ── */}
      {activeSidebarPage === "profile" && (
        <div className="profile-hero card fade-up">
          <div className="profile-hero-left">
            <div className="profile-avatar-lg">{initials}</div>
            <div className="profile-info">
              <h2 className="profile-name">{displayName}</h2>
              <p className="profile-role">
                {(() => {
                  const roleName = user?.role === 'employer' ? 'Employer' : 'Job Seeker';
                  const loc = user?.location ? ` · ${user.location}` : '';
                  if (isNewUser) return `${roleName} · New Member`;
                  return `${roleName}${loc}`;
                })()}
              </p>
              <div className="profile-badges">
                {isNewUser ? (
                  <span className="badge badge-new">🌱 New Member</span>
                ) : (
                  <>
                    {user?.isVerified && <span className="badge badge-verified">🛡️ Verified</span>}
                    {user?.profileComplete && <span className="badge badge-pro">⚡ Profile Complete</span>}
                    {user?.trustScore >= 80 && <span className="badge badge-top">⭐ High Trust</span>}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="profile-hero-right">
            <TrustRing score={trustScore} size={100} stroke={8} />
          </div>
        </div>
      )}

      {/* ── Tab nav ── */}
      {activeSidebarPage === "profile" && (
        <div className="profile-tabs fade-up-2">
          {tabs.map(t => (
            <button
              key={t}
              className={`profile-tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab content: Overview ── */}
      {activeSidebarPage === "profile" && activeTab === "overview" && (
        <div className="fade-up-3">
          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Quick stats */}
            <div className="card">
              <div className="card-title">Quick Stats</div>
              <div className="card-sub" style={{ marginBottom: 20 }}>
                {isNewUser ? 'Start completing jobs to build your stats' : 'Your performance at a glance'}
              </div>
              <div className="profile-stats-grid">
                {quickStats.map(s => (
                  <div key={s.label} className="profile-stat-item">
                    <span className="profile-stat-icon">{s.icon}</span>
                    <div>
                      <div className="profile-stat-value">{s.value}</div>
                      <div className="profile-stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ Skills & Expertise ═══ */}
            <div className="card">
              <div className="section-heading" style={{ marginBottom: 16 }}>
                <div>
                  <div className="card-title">Skills & Expertise</div>
                  <div className="card-sub">
                    {editingSkills ? 'Add skills and set proficiency levels' : 'Proficiency based on your self-assessment'}
                  </div>
                </div>
                {!editingSkills ? (
                  <button className="btn btn-outline btn-sm" onClick={() => setEditingSkills(true)}>
                    {skills.length > 0 ? '✏️ Edit' : '+ Add Skills'}
                  </button>
                ) : (
                  <div className="flex gap8">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingSkills(false); setSkills(userSkills.map(s => ({ name: s.name, level: s.level }))); }}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveSkills} disabled={skillsSaving}>
                      {skillsSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {skillsSaved && (
                <div className="save-success fade-up">✅ Skills saved successfully!</div>
              )}

              {editingSkills ? (
                /* ── Edit mode ── */
                <div className="skills-edit-area">
                  {/* Existing skills */}
                  {skills.map((s, i) => (
                    <div key={i} className="skill-edit-row">
                      <span className="skill-edit-name">{s.name}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={s.level}
                        onChange={e => handleSkillLevelChange(i, e.target.value)}
                        className="skill-slider"
                      />
                      <span className="skill-edit-level">{s.level}%</span>
                      <button className="skill-remove-btn" onClick={() => handleRemoveSkill(i)} title="Remove">✕</button>
                    </div>
                  ))}

                  {/* Add new skill */}
                  {skills.length < 10 && (
                    <div className="skill-add-row">
                      <input
                        className="input"
                        placeholder="Skill name (e.g. React)"
                        value={newSkillName}
                        onChange={e => setNewSkillName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                        maxLength={30}
                      />
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={newSkillLevel}
                        onChange={e => setNewSkillLevel(parseInt(e.target.value))}
                        className="skill-slider"
                      />
                      <span className="skill-edit-level">{newSkillLevel}%</span>
                      <button className="btn btn-primary btn-sm" onClick={handleAddSkill} disabled={!newSkillName.trim()}>
                        Add
                      </button>
                    </div>
                  )}
                  <p className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>
                    {skills.length}/10 skills · Drag the slider to set your proficiency level
                  </p>
                </div>
              ) : (
                /* ── Display mode ── */
                skills.length > 0 ? (
                  skills.map((s, i) => (
                    <div key={i} className="progress-wrap" style={{ marginBottom: 16 }}>
                      <div className="progress-label">
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        <span>{s.level}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${s.level}%`, background: SKILL_COLORS[i % SKILL_COLORS.length] }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-mini">
                    <div className="empty-state-icon">🎯</div>
                    <p>No skills added yet. Click "Add Skills" to showcase your expertise.</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* ═══ About Me ═══ */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-heading" style={{ marginBottom: 12 }}>
              <div className="card-title">About Me</div>
              {!editingBio ? (
                <button className="btn btn-outline btn-sm" onClick={() => setEditingBio(true)}>
                  {bioText ? '✏️ Edit' : '+ Add Bio'}
                </button>
              ) : (
                <div className="flex gap8">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingBio(false); setBioText(user?.bio || ''); }}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveBio} disabled={bioSaving}>
                    {bioSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {bioSaved && (
              <div className="save-success fade-up">✅ Bio saved successfully!</div>
            )}

            {editingBio ? (
              <div className="bio-edit-area">
                <textarea
                  className="textarea"
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  placeholder="Tell employers about yourself — your experience, skills, and what you're looking for..."
                  maxLength={500}
                  rows={5}
                />
                <div className="bio-char-count">
                  <span className={bioText.length > 450 ? 'warn' : ''}>{bioText.length}</span>/500
                </div>
              </div>
            ) : (
              bioText ? (
                <p className="profile-bio">{bioText}</p>
              ) : (
                <div className="empty-state-mini">
                  <div className="empty-state-icon">✏️</div>
                  <p>Tell employers about yourself — your experience, skills, and what you're looking for.</p>
                </div>
              )
            )}
          </div>

          {/* Job History Dropdown */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div 
              className="section-heading" 
              style={{ cursor: 'pointer', marginBottom: isJobHistoryOpen ? 20 : 0, userSelect: 'none' }}
              onClick={() => setIsJobHistoryOpen(!isJobHistoryOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0 }}>Job History</h2>
                <span className="text-muted">{userJobHistory.length} completed</span>
              </div>
              <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                {isJobHistoryOpen ? '▲' : '▼'}
              </div>
            </div>
            
            {isJobHistoryOpen && (
              <div className="fade-up" style={{ marginTop: '20px' }}>
                {userJobHistory.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Job</th>
                          <th>Company</th>
                          <th>Date</th>
                          <th>Earnings</th>
                          <th>Rating</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userJobHistory.map((j, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{j.title}</td>
                            <td>{j.company}</td>
                            <td className="text-muted">{j.date}</td>
                            <td style={{ fontWeight: 600, color: "var(--green)" }}>{j.pay}</td>
                            <td><Stars n={j.rating} /></td>
                            <td><StatusPill s={j.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-mini">
                    <div className="empty-state-icon">📋</div>
                    <p>No job history yet. Your completed jobs will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSidebarPage === "profile" && activeTab === "documents" && (
        <div className="fade-up-3">
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-heading">
              <h2>Identity Documents</h2>
              <button className="btn btn-primary btn-sm">+ Upload Document</button>
            </div>
            <p className="card-sub" style={{ marginBottom: 20 }}>
              Upload government-issued documents to get verified and boost your trust score.
            </p>
            {userDocuments.length > 0 ? (
              userDocuments.map((d, i) => (
                <div key={i} className="doc-row">
                  <div className="doc-icon">
                    {d.status === "verified" ? "✅" : "⏳"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                    {d.fileName && <div className="text-muted" style={{ fontSize: 12 }}>{d.fileName}</div>}
                    <div className="text-muted">Uploaded {d.date}</div>
                  </div>
                  <StatusPill s={d.status === "verified" ? "verified" : "pending_verif"} />
                </div>
              ))
            ) : (
              <div className="empty-state-mini">
                <div className="empty-state-icon">📄</div>
                <p>No documents uploaded yet. Upload your Aadhaar, PAN, and a clear photo to get verified.</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Verification Benefits</div>
            <div className="card-sub" style={{ marginBottom: 16 }}>Why verification matters on WorkLink</div>
            <div className="grid-3">
              {[
                { icon: "🛡️", title: "Higher Trust Score", desc: "Verified users get +15 points on their trust score." },
                { icon: "👑", title: "Priority Listing", desc: "Your profile appears higher in employer searches." },
                { icon: "💎", title: "Verified Badge", desc: "A visible badge that builds instant credibility." },
              ].map(b => (
                <div key={b.title} className="benefit-card">
                  <div style={{ fontSize: 28 }}>{b.icon}</div>
                  <div style={{ fontWeight: 600, marginTop: 8 }}>{b.title}</div>
                  <div className="text-muted" style={{ marginTop: 4 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSidebarPage === "reviews" && (
        <div className="card fade-up">
          {userReviews.length > 0 ? (
            <>
              <div className="section-heading">
                <h2>Client Reviews</h2>
                <span className="text-muted">{userReviews.length} total reviews</span>
              </div>
              <div className="grid-2">
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: 'none' }}>
                  <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--primary)' }}>4.8</div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <Stars n={5} />
                  </div>
                  <div className="text-muted">Based on {userReviews.length} reviews</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                  {[
                    { s: 5, pct: 85 },
                    { s: 4, pct: 15 },
                    { s: 3, pct: 0 },
                    { s: 2, pct: 0 },
                    { s: 1, pct: 0 },
                  ].map(bar => (
                    <div key={bar.s} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, width: '30px' }}>{bar.s} ★</div>
                      <div className="progress-bar-track" style={{ flex: 1, height: '6px', margin: 0 }}>
                        <div className="progress-bar-fill" style={{ width: `${bar.pct}%`, background: 'var(--amber)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                {userReviews.map((r, i) => (
                  <div key={r._id || i} className="review-card" style={{ marginBottom: i < userReviews.length - 1 ? '16px' : 0 }}>
                    <div className="review-header">
                      <div className="review-author-avatar">{(r.employerName || 'E').charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.employerName || 'Verified Employer'}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {r.jobTitle ? <span>Job: <strong>{r.jobTitle}</strong> • </span> : null}
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <div className="ml-auto"><Stars n={r.rating || 5} /></div>
                    </div>
                    <p className="review-text">{r.review || 'Completed the work properly and on time.'}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ fontSize: 48 }}>⭐</div>
              <h3>No Reviews Yet</h3>
              <p className="text-muted">Complete your first job to start receiving employer reviews. Reviews help build your trust score and attract more opportunities.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

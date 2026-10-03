import React, { useState, useEffect, useRef } from 'react';
import {
  getJobs,
  updateProfileDetails,
  uploadProfilePhoto,
  removeProfilePhoto,
  getTrustHistory,
  getEmployerPayments,
} from '../../data/api';
import './EmployerProfile.css';

export default function EmployerProfile({ user, onUserUpdate, onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [trustHistory, setTrustHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'activity' | 'trust'

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [industry, setIndustry] = useState('Hospitality & Catering');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');

  const fileInputRef = useRef(null);

  // Load real employer data, jobs, and trust history
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      getJobs(),
      getTrustHistory(),
      getEmployerPayments().catch(() => ({ success: false })),
    ])
      .then(([jobsRes, trustRes, payRes]) => {
        if (!isMounted) return;

        if (jobsRes.status === 'fulfilled' && jobsRes.value?.success && Array.isArray(jobsRes.value.jobs)) {
          setJobs(jobsRes.value.jobs);
        }
        if (trustRes.status === 'fulfilled' && trustRes.value?.success && Array.isArray(trustRes.value.history)) {
          setTrustHistory(trustRes.value.history);
        }
        if (payRes.status === 'fulfilled' && payRes.value?.success && Array.isArray(payRes.value.payments)) {
          setPayments(payRes.value.payments);
        }
      })
      .catch((err) => console.error('Error loading employer profile data:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Sync form state when user changes
  useEffect(() => {
    if (user) {
      setCompanyName(user.companyName || user.name || 'WorkLink Employer');
      setContactPerson(user.contactPerson || user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Employer'));
      setIndustry(user.industry || 'Hospitality & General Labour');
      setLocation(user.location || 'Bengaluru, Karnataka');
      setBio(user.bio || 'Verified enterprise employer on WorkLink AI. We hire verified labour professionals across hospitality, construction, driving, and facility management with 100% escrow protection.');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Computed Real Stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status === 'open' || j.status === 'active' || !j.status).length;
  const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'closed').length;

  let totalApplications = 0;
  let totalHired = 0;
  let totalSpentNum = 0;

  jobs.forEach((j) => {
    if (Array.isArray(j.applications)) {
      totalApplications += j.applications.length;
      totalHired += j.applications.filter((a) => a.status === 'accepted' || a.status === 'hired').length;
    }
    const rawPay = String(j.pay || '0').replace(/[^0-9]/g, '');
    const payNum = parseInt(rawPay, 10) || 0;
    const hiredInJob = j.applications?.filter((a) => a.status === 'accepted' || a.status === 'hired')?.length || 0;
    totalSpentNum += payNum * (hiredInJob > 0 ? hiredInJob : (j.status === 'completed' ? 1 : 0));
  });

  const employerDisplayName = companyName || user?.name || 'WorkLink Employer';
  const isVerified = Boolean(user?.isVerified || user?.verificationStatus === 'approved');
  const trustScore = typeof user?.trustScore === 'number' ? user.trustScore : 88;
  const avatarInitials = employerDisplayName.slice(0, 2).toUpperCase();

  // Profile completion score calculation
  const completionItems = [
    { label: 'Company / Employer Name', done: Boolean(companyName), field: 'companyName' },
    { label: 'Contact Phone Number', done: Boolean(phone || user?.phone), field: 'phone' },
    { label: 'Official Email Verified', done: Boolean(user?.email), field: 'email' },
    { label: 'Operating Location / Address', done: Boolean(location), field: 'location' },
    { label: 'About & Hiring Bio', done: Boolean(bio), field: 'bio' },
    { label: 'Identity & Business KYC', done: isVerified, field: 'kyc' },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);

  // Profile Photo Upload Handler
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    try {
      setPhotoUploading(true);
      const res = await uploadProfilePhoto(file);
      if (res?.success && res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
        try {
          const stored = JSON.parse(localStorage.getItem('wl_user') || '{}');
          localStorage.setItem('wl_user', JSON.stringify({ ...stored, ...res.user, photoUrl: res.photoUrl }));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to upload profile photo:', err);
      alert(err.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const details = {
        name: companyName.trim(),
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        industry: industry.trim(),
        location: location.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
      };

      const res = await updateProfileDetails(details);
      if (res?.success && res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
        try {
          const stored = JSON.parse(localStorage.getItem('wl_user') || '{}');
          localStorage.setItem('wl_user', JSON.stringify({ ...stored, ...res.user }));
        } catch {}
        setSaveSuccess('Employer profile updated successfully.');
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess('');
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Generate real recent activities from jobs & applications
  const derivedRecentActivity = React.useMemo(() => {
    const list = [];
    jobs.forEach((j) => {
      list.push({
        id: `job-post-${j._id}`,
        title: `Job Posted: "${j.title}"`,
        time: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'Recent',
        type: 'job',
      });
      if (Array.isArray(j.applications)) {
        j.applications.forEach((app) => {
          const pName = typeof app.applicant === 'object' ? app.applicant.name || 'Applicant' : 'Applicant';
          if (app.status === 'accepted' || app.status === 'hired') {
            list.push({
              id: `hire-${app._id || j._id}`,
              title: `Worker Hired: ${pName} for "${j.title}"`,
              time: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent',
              type: 'hire',
            });
          } else {
            list.push({
              id: `app-${app._id || j._id}`,
              title: `Application Received from ${pName} for "${j.title}"`,
              time: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent',
              type: 'app',
            });
          }
        });
      }
    });

    if (list.length === 0) {
      list.push(
        { id: 'act-1', title: 'Job Posted: Senior Catering Assistant', time: 'Yesterday', type: 'job' },
        { id: 'act-2', title: 'Worker Hired: Rahul Sharma (Escrow deposited)', time: '2 days ago', type: 'hire' },
        { id: 'act-3', title: 'Business Identity Verified by WorkLink AI', time: '1 week ago', type: 'verify' }
      );
    }

    return list.slice(0, 6);
  }, [jobs]);

  return (
    <div className="emp-profile-page-container fade-in">
      {/* ── 1. Profile Hero Card ── */}
      <section className="emp-profile-hero-card">
        <div className="emp-profile-hero-left">
          {/* Avatar / Photo with hover upload */}
          <div
            className="emp-profile-avatar-wrapper"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile picture"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={employerDisplayName} className="emp-profile-avatar-img" />
            ) : (
              <span className="emp-avatar-fallback">{avatarInitials}</span>
            )}
            <div className="emp-avatar-hover-overlay">
              {photoUploading ? <div className="emp-avatar-uploading-spinner" /> : '📷'}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* Employer Name & Meta Info */}
          <div className="emp-profile-hero-info">
            <div className="emp-profile-name-row">
              <h1 className="emp-profile-name">{employerDisplayName}</h1>
              {isVerified ? (
                <span className="emp-verified-pill" title="Verified Business Identity">
                  ✓ Verified Employer
                </span>
              ) : (
                <span className="emp-unverified-pill" title="Verification In Progress">
                  ⏳ Verification Pending
                </span>
              )}
            </div>

            <div className="emp-profile-meta-row">
              <span className="emp-profile-meta-item">📍 {location || 'Bengaluru, India'}</span>
              <span className="emp-profile-meta-item">✉️ {user?.email || 'employer@worklink.com'}</span>
              {phone && <span className="emp-profile-meta-item">📞 {phone}</span>}
              <span className="emp-profile-meta-item">🏢 {industry}</span>
            </div>
          </div>
        </div>

        {/* Hero Right Actions */}
        <div className="emp-profile-hero-right">
          <div className="emp-trust-badge-card">
            <div>
              <div className="emp-trust-score-num">{trustScore}</div>
              <div className="emp-trust-score-label">Trust Score</div>
            </div>
            <span style={{ fontSize: 24 }}>🛡️</span>
          </div>

          <button
            type="button"
            className="emp-edit-profile-btn"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Profile
          </button>
        </div>
      </section>

      {/* ── 2. Real Statistics Cards Grid ── */}
      <section className="emp-profile-stats-grid">
        <div className="emp-stat-card">
          <div className="emp-stat-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            💼
          </div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{totalJobs}</div>
            <div className="emp-stat-title">Total Jobs Posted</div>
          </div>
        </div>

        <div className="emp-stat-card">
          <div className="emp-stat-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            ⚡
          </div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{activeJobs}</div>
            <div className="emp-stat-title">Active Gigs</div>
          </div>
        </div>

        <div className="emp-stat-card">
          <div className="emp-stat-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            👥
          </div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{totalApplications}</div>
            <div className="emp-stat-title">Applications Received</div>
          </div>
        </div>

        <div className="emp-stat-card">
          <div className="emp-stat-icon-box" style={{ background: '#fffbeb', color: '#d97706' }}>
            🤝
          </div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{totalHired}</div>
            <div className="emp-stat-title">Workers Hired</div>
          </div>
        </div>

        <div className="emp-stat-card">
          <div className="emp-stat-icon-box" style={{ background: '#fdf2f8', color: '#db2777' }}>
            ✅
          </div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{completedJobs}</div>
            <div className="emp-stat-title">Completed Shifts</div>
          </div>
        </div>

        <div className="emp-stat-card">
          <div className="emp-stat-icon-box" style={{ background: '#ecfeff', color: '#0891b2' }}>
            💳
          </div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">₹{totalSpentNum.toLocaleString()}</div>
            <div className="emp-stat-title">Total Payouts</div>
          </div>
        </div>
      </section>

      {/* ── 3. Tabs Navigation ── */}
      <nav className="emp-profile-tabs-nav">
        <button
          type="button"
          className={`emp-profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview & Organization
        </button>
        <button
          type="button"
          className={`emp-profile-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📈 Activity & Hiring History
        </button>
        <button
          type="button"
          className={`emp-profile-tab-btn ${activeTab === 'trust' ? 'active' : ''}`}
          onClick={() => setActiveTab('trust')}
        >
          🛡️ Trust & Safety Verification
        </button>
      </nav>

      {/* ── 4. Main Tab Content ── */}
      {activeTab === 'overview' && (
        <div className="emp-profile-main-layout">
          {/* Left Column: Organization Details */}
          <div className="emp-col-main">
            <div className="emp-card-section">
              <div className="emp-section-header">
                <h3 className="emp-section-title">🏢 Business & Organization Profile</h3>
              </div>
              <div className="emp-info-grid">
                <div className="emp-info-item">
                  <span className="emp-info-label">Company / Entity</span>
                  <span className="emp-info-val">{employerDisplayName}</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Contact Person</span>
                  <span className="emp-info-val">{contactPerson}</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Industry Sector</span>
                  <span className="emp-info-val">{industry}</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Headquarters / Location</span>
                  <span className="emp-info-val">{location}</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Account Role</span>
                  <span className="emp-info-val">Verified Hiring Organization</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Escrow Settlement</span>
                  <span className="emp-info-val">50% Advance + 50% Post-Shift Sign-Off</span>
                </div>
              </div>
            </div>

            <div className="emp-card-section">
              <div className="emp-section-header">
                <h3 className="emp-section-title">📝 About Employer & Hiring Culture</h3>
              </div>
              <p className="emp-bio-paragraph">{bio}</p>
            </div>
          </div>

          {/* Right Column: Profile Completion & Quick Links */}
          <div className="emp-col-side">
            <div className="emp-completion-meter-card">
              <div className="emp-meter-top">
                <strong style={{ fontSize: 14, color: '#0f172a' }}>Profile Completeness</strong>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>
                  {completionPercent}%
                </span>
              </div>
              <div className="emp-progress-bar-bg">
                <div className="emp-progress-bar-fill" style={{ width: `${completionPercent}%` }} />
              </div>

              <div className="emp-checklist-items">
                {completionItems.map((item, idx) => (
                  <div key={idx} className={`emp-check-item ${item.done ? 'done' : 'todo'}`}>
                    <span>{item.done ? '✓' : '○'} {item.label}</span>
                    {!item.done && (
                      <span
                        className="emp-check-action-link"
                        onClick={() => {
                          if (item.field === 'kyc') {
                            if (onNavigate) onNavigate('trust');
                          } else {
                            setIsEditing(true);
                          }
                        }}
                      >
                        Complete →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="emp-profile-main-layout">
          <div className="emp-col-main">
            <div className="emp-card-section">
              <div className="emp-section-header">
                <h3 className="emp-section-title">⏱️ Recent Hiring & Job Activity</h3>
              </div>
              <div className="emp-activity-timeline">
                {derivedRecentActivity.map((act) => (
                  <div key={act.id} className="emp-activity-row">
                    <div className="emp-activity-dot" />
                    <span className="emp-activity-title">{act.title}</span>
                    <span className="emp-activity-time">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="emp-col-side">
            <div className="emp-card-section">
              <h3 className="emp-section-title" style={{ marginBottom: 12 }}>🚀 Quick Actions</h3>
              <button
                type="button"
                className="emp-edit-profile-btn"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                onClick={() => onNavigate && onNavigate('postjob')}
              >
                ➕ Post New Job
              </button>
              <button
                type="button"
                className="emp-btn-cancel"
                style={{ width: '100%', textAlign: 'center', padding: '11px 0' }}
                onClick={() => onNavigate && onNavigate('applicants')}
              >
                👥 View Applicants ({totalApplications})
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trust' && (
        <div className="emp-profile-main-layout">
          <div className="emp-col-main">
            <div className="emp-card-section">
              <div className="emp-section-header">
                <h3 className="emp-section-title">🛡️ Employer Trust & Verification Engine</h3>
                <span className="emp-trust-score-num">{trustScore} / 100</span>
              </div>
              <p className="emp-bio-paragraph" style={{ marginBottom: 18 }}>
                WorkLink AI calculates your employer Trust Score dynamically based on verified financial
                and hiring milestones: business KYC verification (+20), advance payments (+1), genuine job completion (+2),
                remaining payment (+2), and full settlement (+1). Workers do not rate employers.
              </p>

              <div className="emp-info-grid">
                <div className="emp-info-item">
                  <span className="emp-info-label">Verification Status</span>
                  <span className="emp-info-val" style={{ color: isVerified ? '#059669' : '#d97706' }}>
                    {isVerified ? '✓ Identity & KYC Approved' : '⏳ Verification In Progress'}
                  </span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Escrow Reliability</span>
                  <span className="emp-info-val">100% Guaranteed</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Payment Track Record</span>
                  <span className="emp-info-val">Zero Defaults</span>
                </div>
                <div className="emp-info-item">
                  <span className="emp-info-label">Trust Score Scale</span>
                  <span className="emp-info-val">0 (Min) – 100 (Max)</span>
                </div>
              </div>
            </div>

            <div className="emp-card-section">
              <div className="emp-section-header">
                <h3 className="emp-section-title">📜 Verified Trust Score History</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>{trustHistory.length} Recorded Events</span>
              </div>
              
              {trustHistory.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🛡️</span>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    {isVerified
                      ? 'Initial verification awarded (+20 pts). Complete job and payment milestones to earn more points.'
                      : 'Complete business verification to unlock your initial 20 / 100 Trust Score.'}
                  </p>
                </div>
              ) : (
                <div className="emp-activity-timeline">
                  {trustHistory.map((item, idx) => {
                    const isPositive = item.change >= 0;
                    const dateStr = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Recent';

                    return (
                      <div key={item._id || idx} className="emp-activity-row">
                        <div
                          className="emp-activity-dot"
                          style={{
                            background: isPositive ? '#10b981' : '#ef4444',
                            boxShadow: `0 0 0 2px ${isPositive ? '#a7f3d0' : '#fecaca'}`,
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span className="emp-activity-title">
                            {item.reason} ({isPositive ? `+${item.change}` : item.change} pts)
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: isPositive ? '#059669' : '#dc2626',
                              background: isPositive ? '#ecfdf5' : '#fef2f2',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            Score: {item.previousScore} → {item.newScore}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {item.jobTitle && <span>💼 {item.jobTitle} • </span>}
                          {item.transactionId && <span>🧾 Ref: {item.transactionId} • </span>}
                          <span className="emp-activity-time">{dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="emp-col-side">
            <div className="emp-card-section" style={{ background: '#f8fafc' }}>
              <strong style={{ display: 'block', fontSize: 14, color: '#0f172a', marginBottom: 10 }}>
                📊 Employer Scoring Rules
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Verified Employer KYC:</span>
                  <strong style={{ color: '#059669' }}>+20 pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Advance Payment Completed:</span>
                  <strong style={{ color: '#059669' }}>+1 pt</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Job Completion Confirmed:</span>
                  <strong style={{ color: '#059669' }}>+2 pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Remaining Payment Paid:</span>
                  <strong style={{ color: '#059669' }}>+2 pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaction Fully Settled:</span>
                  <strong style={{ color: '#059669' }}>+1 pt</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Payment Failure / Default:</span>
                  <strong>-5 pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Fraudulent Job Listing:</span>
                  <strong>-10 pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Serious Platform Misuse:</span>
                  <strong>-15 pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Repeated Violations:</span>
                  <strong>-20 pts</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── 5. Edit Profile Modal ── */}
      {isEditing && (
        <div className="emp-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="emp-edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">✏️ Edit Employer Profile</h3>
              <button
                type="button"
                className="emp-modal-close-btn"
                onClick={() => setIsEditing(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="emp-modal-body">
                {saveError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div style={{ padding: '10px 14px', background: '#ecfdf5', color: '#059669', borderRadius: 8, fontSize: 13 }}>
                    {saveSuccess}
                  </div>
                )}

                <div className="emp-modal-form-group">
                  <label>Company / Organization Name</label>
                  <input
                    type="text"
                    className="emp-modal-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="emp-modal-form-group">
                  <label>Contact Person Name</label>
                  <input
                    type="text"
                    className="emp-modal-input"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>

                <div className="emp-modal-form-group">
                  <label>Industry / Sector</label>
                  <select
                    className="emp-modal-select"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="Hospitality & Catering">Hospitality & Catering</option>
                    <option value="Construction & Building">Construction & Building</option>
                    <option value="Deep Cleaning & Sanitation">Deep Cleaning & Sanitation</option>
                    <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                    <option value="Driver & Transportation">Driver & Transportation</option>
                    <option value="Security & Guarding">Security & Guarding</option>
                    <option value="General Labour & Maintenance">General Labour & Maintenance</option>
                  </select>
                </div>

                <div className="emp-modal-form-group">
                  <label>Location / City</label>
                  <input
                    type="text"
                    className="emp-modal-input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="emp-modal-form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    className="emp-modal-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="emp-modal-form-group">
                  <label>Hiring Bio & Description</label>
                  <textarea
                    rows={4}
                    className="emp-modal-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your organization, shifts, and worker benefits..."
                  />
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="emp-btn-cancel"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-btn-save"
                  disabled={saving}
                >
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

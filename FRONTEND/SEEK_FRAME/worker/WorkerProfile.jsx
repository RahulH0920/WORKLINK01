import React, { useState, useEffect, useRef } from 'react';
import {
  updateProfileDetails,
  uploadProfilePhoto,
  removeProfilePhoto,
  getWorkerStats,
  getTrustHistory,
  getWorkerReviews,
} from '../data/api';
import './WorkerProfile.css';

export default function WorkerProfile({ user, onUserUpdate, onNavigate }) {
  // State for stats, reviews, and loading
  const [statsData, setStatsData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [trustHistory, setTrustHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('personal'); // 'personal' | 'professional' | 'preferences'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Form states
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLanguages, setEditLanguages] = useState([]);
  const [newLanguage, setNewLanguage] = useState('');
  const [editSkills, setEditSkills] = useState([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [editWorkCategories, setEditWorkCategories] = useState([]);
  const [editExperience, setEditExperience] = useState('2+ years');
  const [editJobType, setEditJobType] = useState('Part-time');
  const [editAvailability, setEditAvailability] = useState('Monday – Saturday');
  const [editHours, setEditHours] = useState('Flexible Hours (Morning / Evening)');
  const [editMaxDistance, setEditMaxDistance] = useState(15);

  const fileInputRef = useRef(null);

  // Load real worker data & analytics from backend
  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [statsRes, reviewsRes, trustRes] = await Promise.allSettled([
        getWorkerStats(),
        getWorkerReviews(),
        getTrustHistory(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStatsData(statsRes.value);
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value?.success) {
        setReviews(reviewsRes.value.reviews || []);
      }
      if (trustRes.status === 'fulfilled' && trustRes.value?.success) {
        setTrustHistory(trustRes.value.history || []);
      }
    } catch (err) {
      console.error('Failed to load worker profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [user]);

  // Sync form states with current user data
  useEffect(() => {
    if (user) {
      setEditName(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '');
      setEditLocation(user.location || '');
      setEditBio(user.bio || '');
      setEditLanguages(Array.isArray(user.languages) && user.languages.length > 0 ? user.languages : ['English', 'Kannada', 'Hindi']);
      setEditSkills(Array.isArray(user.skills) ? [...user.skills] : []);
      setEditWorkCategories(Array.isArray(user.workCategories) && user.workCategories.length > 0 ? user.workCategories : ['Catering', 'Cleaning', 'Delivery']);
      setEditExperience(user.experience || '2+ years');
      setEditJobType(user.preferredJobType || 'Part-time');
      setEditAvailability(user.availability || 'Monday – Saturday');
      setEditHours(user.preferredHours || 'Flexible Hours (Morning / Evening)');
      setEditMaxDistance(user.maxDistance || 15);
    }
  }, [user]);

  // Resolved worker details
  const workerFullName = (
    user?.name ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    'Worker'
  );
  const isVerified = Boolean(user?.isVerified);
  const trustScore = typeof user?.trustScore === 'number' ? user.trustScore : (isVerified ? 20 : 0);
  const avatarInitials = (workerFullName.charAt(0) || 'W').toUpperCase();

  // Mask phone safely
  const maskPhone = (phoneStr) => {
    if (!phoneStr) return 'Not provided';
    const clean = phoneStr.toString().trim();
    if (clean.length >= 4) {
      return `•••••••${clean.slice(-4)}`;
    }
    return '••••••••••';
  };

  // Profile photo upload handler
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
      if (res.success && res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
        // Persist in localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('wl_user') || '{}');
          localStorage.setItem('wl_user', JSON.stringify({ ...stored, ...res.user, photoUrl: res.photoUrl }));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
      alert(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    try {
      setPhotoUploading(true);
      const res = await removeProfilePhoto();
      if (res.success && res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
      }
    } catch (err) {
      console.error('Failed to remove photo:', err);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Save profile modal handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const updatePayload = {
        name: editName,
        location: editLocation,
        bio: editBio,
        languages: editLanguages,
        skills: editSkills,
        workCategories: editWorkCategories,
        experience: editExperience,
        preferredJobType: editJobType,
        availability: editAvailability,
        preferredHours: editHours,
        maxDistance: editMaxDistance,
      };

      const res = await updateProfileDetails(updatePayload);
      if (res.success && res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
        setSaveSuccess('Profile updated successfully!');
        loadProfileData();
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess('');
        }, 800);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaveError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for star rating UI
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= rating ? '#f59e0b' : '#cbd5e1',
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      );
    }
    return <div style={{ display: 'inline-flex', gap: '2px' }}>{stars}</div>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Available Category Options
  const availableCategories = ['Catering', 'Cleaning', 'Delivery', 'Driving', 'Construction', 'Gardening', 'Warehouse', 'Event Support'];

  const toggleWorkCategory = (cat) => {
    if (editWorkCategories.includes(cat)) {
      setEditWorkCategories(editWorkCategories.filter((c) => c !== cat));
    } else {
      setEditWorkCategories([...editWorkCategories, cat]);
    }
  };

  const handleAddLanguage = (e) => {
    e.preventDefault();
    const trimmed = newLanguage.trim();
    if (!trimmed) return;
    if (!editLanguages.includes(trimmed)) {
      setEditLanguages([...editLanguages, trimmed]);
    }
    setNewLanguage('');
  };

  const handleRemoveLanguage = (lang) => {
    setEditLanguages(editLanguages.filter((l) => l !== lang));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (!editSkills.some((s) => (typeof s === 'string' ? s : s.name).toLowerCase() === trimmed.toLowerCase())) {
      setEditSkills([...editSkills, { name: trimmed, level: 80 }]);
    }
    setNewSkillName('');
  };

  const handleRemoveSkill = (index) => {
    setEditSkills(editSkills.filter((_, idx) => idx !== index));
  };

  // Stats from backend
  const stats = statsData?.stats || {
    completedJobs: 0,
    totalApplications: 0,
    acceptedJobs: 0,
    totalEarnings: 0,
    avgRating: 0,
    totalReviews: reviews.length,
    trustScore,
    successRate: null,
    completionPercentage: 80,
    missingFields: [],
  };

  const statusDist = statsData?.statusDistribution || {
    applied: 0,
    accepted: 0,
    completed: 0,
    rejected: 0,
  };

  const activityTimelineData = statsData?.activityTimelineData || [];
  const recentActivities = statsData?.recentActivities || [];

  return (
    <div className="wrk-profile-page-container">
      {/* ── 1. PROFILE HEADER ── */}
      <div className="wrk-profile-hero-card">
        <div className="wrk-profile-hero-left">
          {/* Avatar with photo upload overlay */}
          <div className="wrk-profile-avatar-wrapper" onClick={() => fileInputRef.current?.click()} title="Click to change profile photo">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={workerFullName}
                className="wrk-profile-avatar-img"
              />
            ) : (
              <div className="wrk-avatar-fallback">{avatarInitials}</div>
            )}
            <div className="wrk-avatar-hover-overlay">
              <span>{photoUploading ? '⏳' : '📷'}</span>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelect}
          />

          <div className="wrk-profile-hero-info">
            <div className="wrk-profile-name-row">
              <h1 className="wrk-profile-name">{workerFullName}</h1>
              {isVerified ? (
                <span className="wrk-verified-pill">✓ Verified Worker</span>
              ) : (
                <span className="wrk-unverified-pill">⏳ Verification Pending</span>
              )}
            </div>

            <div className="wrk-profile-meta-row">
              <span className="wrk-profile-meta-item">
                📍 {user?.location || 'Location not set'}
              </span>
              <span>•</span>
              <span className="wrk-profile-meta-item">
                💼 {user?.preferredJobType || 'Part-time'}
              </span>
              <span>•</span>
              <span className="wrk-profile-meta-item">
                ⭐ {stats.avgRating > 0 ? `${stats.avgRating} / 5.0 (${stats.totalReviews} reviews)` : 'New Worker'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Badges & Edit Button */}
        <div className="wrk-profile-hero-actions">
          {/* Trust Score Chip */}
          <div className="wrk-hero-metric-box" onClick={() => onNavigate && onNavigate('trust')} style={{ cursor: 'pointer' }} title="View Trust & Verification">
            <span className="wrk-hero-metric-label">TRUST SCORE</span>
            <span className="wrk-hero-metric-value">{trustScore} <small>/ 100</small></span>
          </div>

          {/* Profile Completion Chip */}
          <div className="wrk-hero-metric-box">
            <span className="wrk-hero-metric-label">COMPLETION</span>
            <span className="wrk-hero-metric-value">{stats.completionPercentage}%</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="wrk-edit-profile-btn"
              onClick={() => {
                setIsEditing(true);
                setActiveEditTab('personal');
              }}
            >
              ✏️ Edit Profile
            </button>
            {user?.photoUrl && (
              <button
                type="button"
                className="wrk-remove-photo-btn"
                onClick={handleRemovePhoto}
                title="Remove photo"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 7. PROFILE STATISTICS SUMMARY CARDS ── */}
      <div className="wrk-stats-grid">
        <div className="wrk-stat-card">
          <div className="wrk-stat-icon-wrapper bg-blue">💼</div>
          <div className="wrk-stat-details">
            <span className="wrk-stat-label">Completed Jobs</span>
            <span className="wrk-stat-number">{stats.completedJobs}</span>
          </div>
        </div>

        <div className="wrk-stat-card">
          <div className="wrk-stat-icon-wrapper bg-purple">📝</div>
          <div className="wrk-stat-details">
            <span className="wrk-stat-label">Applications</span>
            <span className="wrk-stat-number">{stats.totalApplications}</span>
          </div>
        </div>

        <div className="wrk-stat-card">
          <div className="wrk-stat-icon-wrapper bg-green">💰</div>
          <div className="wrk-stat-details">
            <span className="wrk-stat-label">Total Earnings</span>
            <span className="wrk-stat-number">₹{stats.totalEarnings.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="wrk-stat-card">
          <div className="wrk-stat-icon-wrapper bg-amber">⭐</div>
          <div className="wrk-stat-details">
            <span className="wrk-stat-label">Average Rating</span>
            <span className="wrk-stat-number">{stats.avgRating > 0 ? `${stats.avgRating} ★` : '—'}</span>
          </div>
        </div>

        <div className="wrk-stat-card">
          <div className="wrk-stat-icon-wrapper bg-teal">🛡️</div>
          <div className="wrk-stat-details">
            <span className="wrk-stat-label">Trust Score</span>
            <span className="wrk-stat-number">{trustScore} / 100</span>
          </div>
        </div>

        <div className="wrk-stat-card">
          <div className="wrk-stat-icon-wrapper bg-indigo">🎯</div>
          <div className="wrk-stat-details">
            <span className="wrk-stat-label">Success Rate</span>
            <span className="wrk-stat-number">{stats.successRate !== null ? `${stats.successRate}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN MAIN LAYOUT ── */}
      <div className="wrk-main-columns-grid">
        {/* LEFT COLUMN: Personal Info, Professional Info & Verification */}
        <div className="wrk-left-column">
          {/* 3. Personal Information Card */}
          <div className="wrk-section-card">
            <div className="wrk-section-header">
              <h2 className="wrk-section-title">
                <span>👤</span> Personal Information
              </h2>
              <button
                type="button"
                className="wrk-card-action-link"
                onClick={() => {
                  setIsEditing(true);
                  setActiveEditTab('personal');
                }}
              >
                Edit
              </button>
            </div>

            <div className="wrk-field-list">
              <div className="wrk-field-row">
                <span className="wrk-field-label">Full Name</span>
                <span className="wrk-field-value font-semibold">{workerFullName}</span>
              </div>
              <div className="wrk-field-row">
                <span className="wrk-field-label">Phone Number</span>
                <span className="wrk-field-value">{maskPhone(user?.phone)}</span>
              </div>
              <div className="wrk-field-row">
                <span className="wrk-field-label">Email Address</span>
                <span className="wrk-field-value">{user?.email || 'Not provided'}</span>
              </div>
              <div className="wrk-field-row">
                <span className="wrk-field-label">Location</span>
                <span className="wrk-field-value">{user?.location || 'Not set'}</span>
              </div>
              <div className="wrk-field-row">
                <span className="wrk-field-label">Languages</span>
                <div className="wrk-pill-group">
                  {(user?.languages || ['English', 'Kannada', 'Hindi']).map((lang) => (
                    <span key={lang} className="wrk-badge-pill">{lang}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Professional Profile Card */}
          <div className="wrk-section-card">
            <div className="wrk-section-header">
              <h2 className="wrk-section-title">
                <span>⚡</span> Professional Profile
              </h2>
              <button
                type="button"
                className="wrk-card-action-link"
                onClick={() => {
                  setIsEditing(true);
                  setActiveEditTab('professional');
                }}
              >
                Edit
              </button>
            </div>

            <div className="wrk-field-list">
              {/* About Me */}
              <div className="wrk-field-block">
                <span className="wrk-field-label">About Me</span>
                <p className="wrk-bio-paragraph">
                  {user?.bio || 'No bio provided yet. Add an introduction to help employers know your skills and experience.'}
                </p>
              </div>

              {/* Skills */}
              <div className="wrk-field-block">
                <span className="wrk-field-label">Skills & Expertise</span>
                <div className="wrk-skills-wrap">
                  {Array.isArray(user?.skills) && user.skills.length > 0 ? (
                    user.skills.map((s, idx) => {
                      const name = typeof s === 'object' ? s.name : s;
                      const level = typeof s === 'object' && s.level ? s.level : 80;
                      return (
                        <div key={idx} className="wrk-skill-chip">
                          <span>{name}</span>
                          <span className="wrk-skill-level-dot" title={`Proficiency: ${level}%`} />
                        </div>
                      );
                    })
                  ) : (
                    <span className="wrk-empty-inline-text">No skills added yet.</span>
                  )}
                </div>
              </div>

              {/* Work Categories */}
              <div className="wrk-field-block">
                <span className="wrk-field-label">Work Categories</span>
                <div className="wrk-pill-group">
                  {(user?.workCategories || ['Catering', 'Cleaning', 'Delivery']).map((cat) => (
                    <span key={cat} className="wrk-category-pill">{cat}</span>
                  ))}
                </div>
              </div>

              {/* Work Preferences Grid */}
              <div className="wrk-two-col-fields">
                <div className="wrk-field-row">
                  <span className="wrk-field-label">Experience</span>
                  <span className="wrk-field-value">{user?.experience || '2+ years'}</span>
                </div>
                <div className="wrk-field-row">
                  <span className="wrk-field-label">Job Type</span>
                  <span className="wrk-field-value">{user?.preferredJobType || 'Part-time'}</span>
                </div>
                <div className="wrk-field-row">
                  <span className="wrk-field-label">Availability</span>
                  <span className="wrk-field-value">{user?.availability || 'Monday – Saturday'}</span>
                </div>
                <div className="wrk-field-row">
                  <span className="wrk-field-label">Working Hours</span>
                  <span className="wrk-field-value">{user?.preferredHours || 'Flexible Hours'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Identity Verification Card */}
          <div className="wrk-section-card">
            <div className="wrk-section-header">
              <h2 className="wrk-section-title">
                <span>🛡️</span> Identity Verification
              </h2>
              <span className={`wrk-status-badge ${isVerified ? 'verified' : 'pending'}`}>
                {isVerified ? '✓ Verified' : '⏳ Pending'}
              </span>
            </div>

            <div className="wrk-verif-checklist">
              <div className="wrk-verif-check-row">
                <span className="wrk-check-icon">{isVerified ? '✓' : '•'}</span>
                <span className="wrk-check-title">Identity & Document Authenticity</span>
                <span className="wrk-check-status">{isVerified ? 'Verified' : 'Pending'}</span>
              </div>
              <div className="wrk-verif-check-row">
                <span className="wrk-check-icon">{user?.verificationChecks?.aadhaarValid || isVerified ? '✓' : '•'}</span>
                <span className="wrk-check-title">Aadhaar Validation</span>
                <span className="wrk-check-status">{user?.verificationChecks?.aadhaarValid || isVerified ? 'Verified' : 'Pending'}</span>
              </div>
              <div className="wrk-verif-check-row">
                <span className="wrk-check-icon">{user?.verificationChecks?.panValid || isVerified ? '✓' : '•'}</span>
                <span className="wrk-check-title">PAN Verification</span>
                <span className="wrk-check-status">{user?.verificationChecks?.panValid || isVerified ? 'Verified' : 'Pending'}</span>
              </div>
              <div className="wrk-verif-check-row">
                <span className="wrk-check-icon">{user?.verificationChecks?.faceMatchCompleted || isVerified ? '✓' : '•'}</span>
                <span className="wrk-check-title">Biometric Face Matching</span>
                <span className="wrk-check-status">{user?.verificationChecks?.faceMatchCompleted || isVerified ? 'Verified' : 'Pending'}</span>
              </div>
            </div>

            <button
              type="button"
              className="wrk-full-trust-btn"
              onClick={() => onNavigate && onNavigate('trust')}
            >
              🛡️ View Trust & Verification Details
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Activity Analytics & Graphs */}
        <div className="wrk-right-column">
          {/* 8. Activity Analytics Card */}
          <div className="wrk-section-card">
            <div className="wrk-section-header">
              <h2 className="wrk-section-title">
                <span>📈</span> Activity Analytics
              </h2>
              <span className="wrk-badge-pill">Real Database Records</span>
            </div>

            {/* 8A. Job Activity Timeline Graph */}
            <div className="wrk-analytics-block">
              <div className="wrk-subheading-row">
                <h3 className="wrk-subheading">Monthly Job Activity</h3>
                <div className="wrk-chart-legend">
                  <span className="legend-item"><span className="legend-dot applied" /> Applied</span>
                  <span className="legend-item"><span className="legend-dot accepted" /> Accepted</span>
                  <span className="legend-item"><span className="legend-dot completed" /> Completed</span>
                </div>
              </div>

              {activityTimelineData.length === 0 ? (
                <div className="wrk-chart-empty-box">
                  <span>📊</span>
                  <p>Not enough activity data yet.</p>
                  <small>Apply for and complete jobs to see your monthly activity trends.</small>
                </div>
              ) : (
                <div className="wrk-bar-chart-container">
                  {activityTimelineData.map((item) => {
                    const maxVal = Math.max(...activityTimelineData.map((d) => Math.max(d.applied, d.accepted, d.completed, 1)));
                    return (
                      <div key={item.key} className="wrk-bar-chart-group">
                        <div className="wrk-bar-columns">
                          <div className="wrk-bar applied" style={{ height: `${(item.applied / maxVal) * 90}%` }} title={`Applied: ${item.applied}`} />
                          <div className="wrk-bar accepted" style={{ height: `${(item.accepted / maxVal) * 90}%` }} title={`Accepted: ${item.accepted}`} />
                          <div className="wrk-bar completed" style={{ height: `${(item.completed / maxVal) * 90}%` }} title={`Completed: ${item.completed}`} />
                        </div>
                        <span className="wrk-bar-label">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 8B. Application Status Distribution & 8D. Performance Metrics */}
            <div className="wrk-split-analytics-row">
              {/* Status Breakdown */}
              <div className="wrk-dist-box">
                <h3 className="wrk-subheading">Application Status</h3>
                {stats.totalApplications === 0 ? (
                  <div className="wrk-chart-empty-box small">
                    <p>No application data yet.</p>
                  </div>
                ) : (
                  <div className="wrk-dist-bars-list">
                    <div className="wrk-dist-item">
                      <div className="wrk-dist-label-row">
                        <span>Applied</span>
                        <span>{statusDist.applied}</span>
                      </div>
                      <div className="wrk-progress-track">
                        <div className="wrk-progress-fill applied" style={{ width: `${(statusDist.applied / stats.totalApplications) * 100}%` }} />
                      </div>
                    </div>

                    <div className="wrk-dist-item">
                      <div className="wrk-dist-label-row">
                        <span>Accepted / Hired</span>
                        <span>{statusDist.accepted}</span>
                      </div>
                      <div className="wrk-progress-track">
                        <div className="wrk-progress-fill accepted" style={{ width: `${(statusDist.accepted / stats.totalApplications) * 100}%` }} />
                      </div>
                    </div>

                    <div className="wrk-dist-item">
                      <div className="wrk-dist-label-row">
                        <span>Completed</span>
                        <span>{statusDist.completed}</span>
                      </div>
                      <div className="wrk-progress-track">
                        <div className="wrk-progress-fill completed" style={{ width: `${(statusDist.completed / stats.totalApplications) * 100}%` }} />
                      </div>
                    </div>

                    {statusDist.rejected > 0 && (
                      <div className="wrk-dist-item">
                        <div className="wrk-dist-label-row">
                          <span>Rejected</span>
                          <span>{statusDist.rejected}</span>
                        </div>
                        <div className="wrk-progress-track">
                          <div className="wrk-progress-fill rejected" style={{ width: `${(statusDist.rejected / stats.totalApplications) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 8D. Work Performance Box */}
              <div className="wrk-performance-box">
                <h3 className="wrk-subheading">Work Performance</h3>
                <div className="wrk-performance-grid">
                  <div className="wrk-perf-metric">
                    <span className="wrk-perf-val">{stats.completedJobs}</span>
                    <span className="wrk-perf-lbl">Completed</span>
                  </div>
                  <div className="wrk-perf-metric">
                    <span className="wrk-perf-val">{stats.successRate !== null ? `${stats.successRate}%` : '—'}</span>
                    <span className="wrk-perf-lbl">Success Rate</span>
                  </div>
                  <div className="wrk-perf-metric">
                    <span className="wrk-perf-val">{stats.avgRating > 0 ? `${stats.avgRating} ★` : '—'}</span>
                    <span className="wrk-perf-lbl">Avg Rating</span>
                  </div>
                  <div className="wrk-perf-metric">
                    <span className="wrk-perf-val">{stats.totalReviews}</span>
                    <span className="wrk-perf-lbl">Reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 10. Recent Activity Timeline */}
          <div className="wrk-section-card">
            <div className="wrk-section-header">
              <h2 className="wrk-section-title">
                <span>⏱️</span> Recent Activity
              </h2>
              <span className="wrk-muted-count">{recentActivities.length} Events</span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="wrk-chart-empty-box">
                <span>⏳</span>
                <p>No recent activity.</p>
                <small>Activities will appear as you apply, complete jobs, and receive ratings.</small>
              </div>
            ) : (
              <div className="wrk-timeline-list">
                {recentActivities.map((act) => (
                  <div key={act.id} className="wrk-timeline-item">
                    <div className="wrk-timeline-icon">{act.icon}</div>
                    <div className="wrk-timeline-content">
                      <div className="wrk-timeline-header-row">
                        <span className="wrk-timeline-title">{act.title}</span>
                        <span className="wrk-timeline-date">{formatDate(act.date)}</span>
                      </div>
                      <p className="wrk-timeline-desc">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 11. Profile Completion Card */}
          <div className="wrk-section-card">
            <div className="wrk-section-header">
              <h2 className="wrk-section-title">
                <span>🎯</span> Profile Completion
              </h2>
              <span className="wrk-completion-pill">{stats.completionPercentage}%</span>
            </div>

            <div className="wrk-progress-track large">
              <div className="wrk-progress-fill brand" style={{ width: `${stats.completionPercentage}%` }} />
            </div>

            {stats.missingFields && stats.missingFields.length > 0 ? (
              <div className="wrk-missing-fields-box">
                <span className="wrk-missing-title">Complete these to reach 100%:</span>
                <div className="wrk-missing-tags">
                  {stats.missingFields.map((field, idx) => (
                    <span key={idx} className="wrk-missing-tag">
                      + {field}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="wrk-complete-msg">🎉 Your profile is complete and verified!</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 9. EMPLOYER REVIEWS SECTION ── */}
      <div className="wrk-section-card" style={{ marginTop: 8 }}>
        <div className="wrk-section-header">
          <h2 className="wrk-section-title">
            <span>⭐</span> Employer Reviews ({reviews.length})
          </h2>
          <span className="wrk-muted-count">Verified Performance Feedback</span>
        </div>

        {reviews.length === 0 ? (
          <div className="wrk-chart-empty-box">
            <span>💬</span>
            <p>No employer reviews yet.</p>
            <small>When employers confirm job completion and rate your work, verified reviews will appear here.</small>
          </div>
        ) : (
          <div className="wrk-reviews-grid">
            {reviews.map((rev, idx) => (
              <div key={rev._id || idx} className="wrk-review-card">
                <div className="wrk-review-card-top">
                  {renderStars(rev.rating)}
                  <span className={`wrk-score-impact-pill ${rev.trustScoreChange >= 0 ? 'pos' : 'neg'}`}>
                    {rev.trustScoreChange >= 0 ? `+${rev.trustScoreChange}` : rev.trustScoreChange} pts
                  </span>
                </div>
                <p className="wrk-review-text">
                  {rev.review ? `"${rev.review}"` : 'Completed the work properly and on time.'}
                </p>
                <div className="wrk-review-footer">
                  <span><strong>Job:</strong> {rev.jobTitle || 'Completed Job'}</span>
                  <span><strong>Employer:</strong> {rev.employerName || 'Verified Employer'}</span>
                </div>
                <div className="wrk-review-date-row">
                  <span>{formatDate(rev.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 12. EDIT PROFILE MODAL ── */}
      {isEditing && (
        <div className="wrk-modal-overlay" onClick={() => !saving && setIsEditing(false)}>
          <div className="wrk-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <div>
                <h2 className="wrk-modal-title">Edit Worker Profile</h2>
                <p className="wrk-modal-subtitle">Update your personal and professional profile details</p>
              </div>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => !saving && setIsEditing(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="wrk-modal-tabs">
              <button
                type="button"
                className={`wrk-modal-tab-btn ${activeEditTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('personal')}
              >
                👤 Personal
              </button>
              <button
                type="button"
                className={`wrk-modal-tab-btn ${activeEditTab === 'professional' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('professional')}
              >
                ⚡ Professional
              </button>
              <button
                type="button"
                className={`wrk-modal-tab-btn ${activeEditTab === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('preferences')}
              >
                ⚙️ Work Preferences
              </button>
            </div>

            {saveError && <div className="wrk-modal-alert error">⚠️ {saveError}</div>}
            {saveSuccess && <div className="wrk-modal-alert success">✓ {saveSuccess}</div>}

            <form onSubmit={handleSaveProfile} className="wrk-modal-form">
              {/* TAB 1: PERSONAL INFORMATION */}
              {activeEditTab === 'personal' && (
                <div className="wrk-form-section">
                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Full Name</label>
                    <input
                      type="text"
                      className="wrk-form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Location / City</label>
                    <input
                      type="text"
                      className="wrk-form-input"
                      placeholder="e.g. Bengaluru, Mumbai, Delhi"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                    />
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Languages Spoken</label>
                    <div className="wrk-inline-input-group">
                      <input
                        type="text"
                        className="wrk-form-input"
                        placeholder="Add a language (e.g. Kannada, English, Hindi)"
                        value={newLanguage}
                        onChange={(e) => setNewLanguage(e.target.value)}
                      />
                      <button type="button" className="wrk-btn-add" onClick={handleAddLanguage}>
                        + Add
                      </button>
                    </div>
                    <div className="wrk-tags-wrap">
                      {editLanguages.map((lang) => (
                        <span key={lang} className="wrk-removable-tag">
                          {lang}
                          <button type="button" onClick={() => handleRemoveLanguage(lang)}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFESSIONAL PROFILE */}
              {activeEditTab === 'professional' && (
                <div className="wrk-form-section">
                  <div className="wrk-form-group">
                    <label className="wrk-form-label">About / Bio</label>
                    <textarea
                      rows={3}
                      className="wrk-form-textarea"
                      placeholder="Describe your experience, work ethic, and background..."
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                    />
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Skills</label>
                    <div className="wrk-inline-input-group">
                      <input
                        type="text"
                        className="wrk-form-input"
                        placeholder="Add a skill (e.g. Cooking, Driving, Cleaning)"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                      />
                      <button type="button" className="wrk-btn-add" onClick={handleAddSkill}>
                        + Add
                      </button>
                    </div>
                    <div className="wrk-tags-wrap">
                      {editSkills.map((s, idx) => {
                        const name = typeof s === 'object' ? s.name : s;
                        return (
                          <span key={idx} className="wrk-removable-tag">
                            {name}
                            <button type="button" onClick={() => handleRemoveSkill(idx)}>✕</button>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Work Categories</label>
                    <div className="wrk-selectable-tags-wrap">
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`wrk-category-toggle-btn ${editWorkCategories.includes(cat) ? 'selected' : ''}`}
                          onClick={() => toggleWorkCategory(cat)}
                        >
                          {editWorkCategories.includes(cat) ? '✓ ' : '+ '} {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Years of Experience</label>
                    <select
                      className="wrk-form-select"
                      value={editExperience}
                      onChange={(e) => setEditExperience(e.target.value)}
                    >
                      <option value="Less than 1 year">Less than 1 year</option>
                      <option value="1 - 2 years">1 - 2 years</option>
                      <option value="2+ years">2+ years</option>
                      <option value="5+ years">5+ years</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 3: WORK PREFERENCES */}
              {activeEditTab === 'preferences' && (
                <div className="wrk-form-section">
                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Preferred Job Type</label>
                    <select
                      className="wrk-form-select"
                      value={editJobType}
                      onChange={(e) => setEditJobType(e.target.value)}
                    >
                      <option value="Part-time">Part-time</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Short-term">Short-term</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Availability (Days)</label>
                    <input
                      type="text"
                      className="wrk-form-input"
                      placeholder="e.g. Monday – Saturday, Weekends Only"
                      value={editAvailability}
                      onChange={(e) => setEditAvailability(e.target.value)}
                    />
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Preferred Working Hours</label>
                    <input
                      type="text"
                      className="wrk-form-input"
                      placeholder="e.g. Morning (8 AM - 2 PM), Evening"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                    />
                  </div>

                  <div className="wrk-form-group">
                    <label className="wrk-form-label">Maximum Work Travel Distance ({editMaxDistance} km)</label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      step={1}
                      value={editMaxDistance}
                      onChange={(e) => setEditMaxDistance(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="wrk-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
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

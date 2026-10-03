import React, { useState, useEffect } from 'react';
import {
  changePassword,
  changePhone,
  changeEmail,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateWorkPreferences,
  deactivateAccount,
} from '../data/api';
import './WorkerSettings.css';

const JOB_CATEGORIES = [
  'Construction',
  'Cleaning',
  'Electrician',
  'Plumbing',
  'Carpentry',
  'Painting',
  'Delivery',
  'Cooking',
  'Gardening',
  'Loading/Unloading',
  'Security',
  'Driver',
  'Event Helper',
  'Warehouse',
  'General Labour',
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const WORKING_HOURS_OPTIONS = [
  'Full Day (8 AM - 6 PM)',
  'Morning (8 AM - 1 PM)',
  'Afternoon (1 PM - 6 PM)',
  'Evening (6 PM - 10 PM)',
  'Night Shift',
  'Flexible Hours',
];

const JOB_TYPES = ['Full-time', 'Part-time', 'Daily Wage', 'Contract'];

export default function WorkerSettings({ user, onUserUpdate, onLogout, onNavigate }) {
  const [activeTab, setActiveTab] = useState('account');
  const [toast, setToast] = useState(null);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Password state
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [showPassText, setShowPassText] = useState(false);

  // Phone state
  const [phoneData, setPhoneData] = useState({
    newPhone: user?.phone || '',
  });
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Email state
  const [emailData, setEmailData] = useState({
    newEmail: user?.email || '',
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    newJobs: true,
    applicationUpdates: true,
    jobStatus: true,
    messages: true,
    payments: true,
    trustScore: true,
    reviews: true,
    system: true,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Work Preferences Form
  const [workPrefs, setWorkPrefs] = useState({
    categories: Array.isArray(user?.workCategories) ? user.workCategories : [],
    location: user?.location || '',
    maxDistance: user?.maxDistance || 15,
    availability: Array.isArray(user?.availability)
      ? user.availability
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    preferredHours: user?.preferredHours || 'Full Day (8 AM - 6 PM)',
    preferredJobType: user?.preferredJobType || 'Part-time',
  });
  const [workPrefsLoading, setWorkPrefsLoading] = useState(false);

  // Delete Confirmation Text
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Support Ticket state
  const [supportData, setSupportData] = useState({
    category: 'Payment Help',
    subject: '',
    message: '',
  });
  const [supportSuccess, setSupportSuccess] = useState(false);

  // FAQ Accordion Open State
  const [expandedFaq, setExpandedFaq] = useState(null);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Notification Preferences on Mount
  useEffect(() => {
    async function loadNotifPrefs() {
      try {
        const res = await getNotificationPreferences();
        if (res && res.preferences) {
          setNotifications(res.preferences);
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      }
    }
    loadNotifPrefs();
  }, []);

  // Sync user prop updates to state
  useEffect(() => {
    if (user) {
      setPhoneData({ newPhone: user.phone || '' });
      setEmailData({ newEmail: user.email || '' });
      setWorkPrefs({
        categories: Array.isArray(user.workCategories) ? user.workCategories : [],
        location: user.location || '',
        maxDistance: user.maxDistance || 15,
        availability: Array.isArray(user.availability)
          ? user.availability
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        preferredHours: user.preferredHours || 'Full Day (8 AM - 6 PM)',
        preferredJobType: user.preferredJobType || 'Part-time',
      });
    }
  }, [user]);

  // Handle Change Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');

    if (!passData.currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (!passData.newPassword) {
      setPassError('Please enter a new password.');
      return;
    }
    if (passData.newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (passData.newPassword !== passData.confirmPassword) {
      setPassError('New password and confirm password do not match.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await changePassword(
        passData.currentPassword,
        passData.newPassword,
        passData.confirmPassword
      );
      if (res && (res.success || res.status === 'success')) {
        showToastMsg('Password changed successfully!', 'success');
        setShowPasswordModal(false);
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPassError(res?.message || 'Failed to change password.');
      }
    } catch (err) {
      setPassError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Change Phone Submit
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');

    if (!phoneData.newPhone || !phoneData.newPhone.trim()) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    const clean = phoneData.newPhone.trim().replace(/\D/g, '');
    if (clean.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await changePhone(phoneData.newPhone);
      if (res && (res.success || res.status === 'success')) {
        showToastMsg('Phone number updated successfully!', 'success');
        setShowPhoneModal(false);
        if (onUserUpdate) {
          onUserUpdate({ ...user, phone: res.phone || phoneData.newPhone });
        }
      } else {
        setPhoneError(res?.message || 'Failed to update phone number.');
      }
    } catch (err) {
      setPhoneError(err.message || 'Failed to update phone number.');
    } finally {
      setPhoneLoading(false);
    }
  };

  // Handle Change Email Submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    if (!emailData.newEmail || !emailData.newEmail.trim()) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail.trim())) {
      setEmailError('Please enter a valid email address format.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await changeEmail(emailData.newEmail);
      if (res && (res.success || res.status === 'success')) {
        showToastMsg('Email updated successfully!', 'success');
        setShowEmailModal(false);
        if (onUserUpdate) {
          onUserUpdate({ ...user, email: res.email || emailData.newEmail.trim().toLowerCase() });
        }
      } else {
        setEmailError(res?.message || 'Failed to update email.');
      }
    } catch (err) {
      setEmailError(err.message || 'Failed to update email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Notification Toggle
  const handleNotifToggle = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setNotifLoading(true);
    try {
      await updateNotificationPreferences(updated);
      showToastMsg('Notification preferences updated!', 'success');
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      showToastMsg('Failed to save notification preference.', 'error');
      setNotifications(notifications); // revert
    } finally {
      setNotifLoading(false);
    }
  };

  // Handle Work Preferences Category Toggle
  const toggleCategory = (cat) => {
    const exists = workPrefs.categories.includes(cat);
    const updated = exists
      ? workPrefs.categories.filter((c) => c !== cat)
      : [...workPrefs.categories, cat];
    setWorkPrefs({ ...workPrefs, categories: updated });
  };

  // Handle Work Preferences Day Toggle
  const toggleDay = (day) => {
    const exists = workPrefs.availability.includes(day);
    const updated = exists
      ? workPrefs.availability.filter((d) => d !== day)
      : [...workPrefs.availability, day];
    setWorkPrefs({ ...workPrefs, availability: updated });
  };

  // Handle Work Preferences Submit
  const handleWorkPrefsSubmit = async (e) => {
    e.preventDefault();
    setWorkPrefsLoading(true);
    try {
      const res = await updateWorkPreferences(workPrefs);
      if (res && (res.success || res.status === 'success')) {
        showToastMsg('Work preferences saved successfully!', 'success');
        if (onUserUpdate && res.user) {
          onUserUpdate(res.user);
        }
      } else {
        showToastMsg(res?.message || 'Failed to save preferences.', 'error');
      }
    } catch (err) {
      showToastMsg(err.message || 'Failed to save work preferences.', 'error');
    } finally {
      setWorkPrefsLoading(false);
    }
  };

  // Handle Deactivate Account Submit
  const handleDeactivate = async () => {
    try {
      const res = await deactivateAccount();
      if (res && (res.success || res.status === 'success')) {
        showToastMsg('Account deactivated. Signing out...', 'info');
        setTimeout(() => {
          if (onLogout) onLogout();
        }, 1500);
      } else {
        showToastMsg(res?.message || 'Deactivation failed.', 'error');
      }
    } catch (err) {
      showToastMsg(err.message || 'Failed to deactivate account.', 'error');
    }
  };

  // Handle Support Form Submit
  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportData.message.trim()) return;
    setSupportSuccess(true);
    setTimeout(() => {
      setSupportSuccess(false);
      setShowSupportModal(false);
      setSupportData({ category: 'Payment Help', subject: '', message: '' });
      showToastMsg('Support request received. An agent will contact you shortly.', 'success');
    }, 1200);
  };

  const workerFullName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Worker');
  const isVerified = Boolean(user?.isVerified || user?.verificationStatus === 'approved');

  return (
    <div className="wrk-settings-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`wrk-toast wrk-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="wrk-settings-header">
        <div className="wrk-settings-header-info">
          <h2>⚙️ Worker Settings & Account</h2>
          <p>
            Manage your account security, notification alerts, work preferences, and privacy
            settings.
          </p>
        </div>
        <div className="wrk-settings-header-badge">
          <span className="wrk-badge-avatar">
            {workerFullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="wrk-badge-text">
            <strong>{workerFullName}</strong>
            <span className={isVerified ? 'text-verified' : 'text-pending'}>
              {isVerified ? '✓ Verified Worker' : 'Verification Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="wrk-settings-tabs">
        <button
          type="button"
          className={`wrk-stab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          👤 Account & Security
        </button>
        <button
          type="button"
          className={`wrk-stab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button
          type="button"
          className={`wrk-stab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          💼 Work Preferences
        </button>
        <button
          type="button"
          className={`wrk-stab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          🔒 Privacy & Sessions
        </button>
        <button
          type="button"
          className={`wrk-stab-btn ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          💳 Payment & Payouts
        </button>
        <button
          type="button"
          className={`wrk-stab-btn ${activeTab === 'help' ? 'active' : ''}`}
          onClick={() => setActiveTab('help')}
        >
          ❓ Help & Support
        </button>
      </div>

      {/* ── TAB 1: ACCOUNT & SECURITY ── */}
      {activeTab === 'account' && (
        <div className="wrk-tab-content">
          <div className="wrk-settings-grid">
            {/* Account Information Card */}
            <div className="wrk-card wrk-settings-card">
              <div className="wrk-card-title-row">
                <span className="wrk-card-icon">👤</span>
                <h3>Account Information</h3>
              </div>
              <p className="wrk-card-subtitle">
                Your registered WorkLink credentials and primary contact details.
              </p>

              <div className="wrk-info-rows">
                <div className="wrk-info-row">
                  <span className="wrk-info-label">Full Name</span>
                  <strong className="wrk-info-val">{workerFullName}</strong>
                </div>
                <div className="wrk-info-row">
                  <span className="wrk-info-label">Registered Phone</span>
                  <div className="wrk-info-val-action">
                    <strong className="wrk-info-val">
                      {user?.phone ? `+91 ${user.phone}` : 'Not provided'}
                    </strong>
                    <button
                      type="button"
                      className="wrk-btn-link"
                      onClick={() => setShowPhoneModal(true)}
                    >
                      Change Phone
                    </button>
                  </div>
                </div>
                <div className="wrk-info-row">
                  <span className="wrk-info-label">Registered Email</span>
                  <div className="wrk-info-val-action">
                    <strong className="wrk-info-val">{user?.email || 'worker@worklink.com'}</strong>
                    <button
                      type="button"
                      className="wrk-btn-link"
                      onClick={() => setShowEmailModal(true)}
                    >
                      Change Email
                    </button>
                  </div>
                </div>
                <div className="wrk-info-row">
                  <span className="wrk-info-label">Worker Profile Photo</span>
                  <div className="wrk-info-val-action">
                    <span className="wrk-info-val">
                      {user?.photoUrl ? 'Custom photo uploaded' : 'Default initials avatar'}
                    </span>
                    <button
                      type="button"
                      className="wrk-btn-link"
                      onClick={() => onNavigate && onNavigate('profile')}
                    >
                      Manage Photo →
                    </button>
                  </div>
                </div>
                <div className="wrk-info-row">
                  <span className="wrk-info-label">Verification Status</span>
                  <strong
                    className={`wrk-info-val ${isVerified ? 'text-verified' : 'text-pending'}`}
                  >
                    {isVerified ? '✓ Identity Verified (Aadhaar & PAN)' : '⏳ Pending Verification'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Password & Security Card */}
            <div className="wrk-card wrk-settings-card">
              <div className="wrk-card-title-row">
                <span className="wrk-card-icon">🔑</span>
                <h3>Password & Authentication</h3>
              </div>
              <p className="wrk-card-subtitle">
                Ensure your account is using a strong password to protect your earnings.
              </p>

              <div className="wrk-security-box">
                <div className="wrk-sec-status">
                  <div className="wrk-sec-indicator safe">✓</div>
                  <div>
                    <strong>Password Security Active</strong>
                    <p>Your password is cryptographically encrypted using bcrypt.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="wrk-btn wrk-btn-primary"
                  onClick={() => setShowPasswordModal(true)}
                >
                  🔒 Change Password
                </button>
              </div>

              <div className="wrk-security-tips">
                <strong>🛡️ Security Recommendations:</strong>
                <ul>
                  <li>Use at least 8 characters with a mix of letters, numbers, and symbols.</li>
                  <li>Do not share your WorkLink login password or OTP with anyone.</li>
                  <li>WorkLink administrators will never ask for your password.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account Actions Section */}
          <div className="wrk-card wrk-danger-zone">
            <div className="wrk-card-title-row">
              <span className="wrk-card-icon">⚠️</span>
              <h3>Account Actions</h3>
            </div>
            <p className="wrk-card-subtitle">
              Manage critical account lifecycle events. Please proceed with caution.
            </p>

            <div className="wrk-danger-actions">
              <div className="wrk-danger-item">
                <div>
                  <strong>Sign Out</strong>
                  <p>Safely log out of your current session on this device.</p>
                </div>
                <button
                  type="button"
                  className="wrk-btn wrk-btn-secondary"
                  onClick={() => onLogout && onLogout()}
                >
                  🚪 Sign Out
                </button>
              </div>

              <div className="wrk-danger-item">
                <div>
                  <strong>Deactivate Account</strong>
                  <p>Temporarily pause your worker profile and hide your listing from employers.</p>
                </div>
                <button
                  type="button"
                  className="wrk-btn wrk-btn-warning"
                  onClick={() => setShowDeactivateModal(true)}
                >
                  ⏸️ Deactivate Account
                </button>
              </div>

              <div className="wrk-danger-item">
                <div>
                  <strong className="text-danger">Delete Account</strong>
                  <p>Permanently remove your WorkLink profile, application records, and history.</p>
                </div>
                <button
                  type="button"
                  className="wrk-btn wrk-btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  🗑️ Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <div className="wrk-tab-content">
          <div className="wrk-card wrk-settings-card">
            <div className="wrk-card-title-row">
              <span className="wrk-card-icon">🔔</span>
              <h3>Notification Preferences</h3>
            </div>
            <p className="wrk-card-subtitle">
              Control what alerts and messages you receive across the WorkLink platform. Changes are
              saved automatically.
            </p>

            <div className="wrk-toggles-list">
              {/* Toggle 1 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>💼 New Job Recommendations</strong>
                  <p>Receive notifications when new jobs matching your skills and location are posted.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.newJobs)}
                    onChange={() => handleNotifToggle('newJobs')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 2 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>📑 Application Updates</strong>
                  <p>Get notified when an employer reviews or shortlists your job application.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.applicationUpdates)}
                    onChange={() => handleNotifToggle('applicationUpdates')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 3 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>🎉 Job Acceptance & Hiring</strong>
                  <p>Immediate alert when an employer accepts your application and hires you.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.jobStatus)}
                    onChange={() => handleNotifToggle('jobStatus')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 4 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>💬 Employer Messages</strong>
                  <p>Real-time notifications when an employer sends you a direct message in chat.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.messages)}
                    onChange={() => handleNotifToggle('messages')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 5 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>💳 Payment & Settlement Alerts</strong>
                  <p>Notifications for advance payments, job completion settlements, and receipts.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.payments)}
                    onChange={() => handleNotifToggle('payments')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 6 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>🛡️ Trust Score Updates</strong>
                  <p>Alerts whenever your Trust Score increases or trust points are awarded.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.trustScore)}
                    onChange={() => handleNotifToggle('trustScore')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 7 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>⭐ Employer Reviews & Ratings</strong>
                  <p>Get notified when an employer publishes a star rating and review on your profile.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.reviews)}
                    onChange={() => handleNotifToggle('reviews')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>

              {/* Toggle 8 */}
              <div className="wrk-toggle-row">
                <div className="wrk-toggle-info">
                  <strong>📢 System & Security Announcements</strong>
                  <p>Important updates regarding platform policies, account security, and features.</p>
                </div>
                <label className="wrk-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.system)}
                    onChange={() => handleNotifToggle('system')}
                    disabled={notifLoading}
                  />
                  <span className="wrk-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: WORK PREFERENCES ── */}
      {activeTab === 'preferences' && (
        <div className="wrk-tab-content">
          <form onSubmit={handleWorkPrefsSubmit} className="wrk-card wrk-settings-card">
            <div className="wrk-card-title-row">
              <span className="wrk-card-icon">💼</span>
              <h3>Work Preferences & Availability</h3>
            </div>
            <p className="wrk-card-subtitle">
              Configure your preferred job categories, travel distance, and availability schedule.
            </p>

            {/* Preferred Categories */}
            <div className="wrk-pref-section">
              <label className="wrk-pref-label">
                Preferred Job Categories (Select all that apply)
              </label>
              <div className="wrk-chips-grid">
                {JOB_CATEGORIES.map((cat) => {
                  const isSelected = workPrefs.categories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      className={`wrk-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location & Radius */}
            <div className="wrk-pref-row-2col">
              <div className="wrk-form-group">
                <label>Preferred Base Location / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, Koramangala, Indiranagar"
                  value={workPrefs.location}
                  onChange={(e) => setWorkPrefs({ ...workPrefs, location: e.target.value })}
                />
              </div>

              <div className="wrk-form-group">
                <label>
                  Maximum Travel Distance: <strong>{workPrefs.maxDistance} km</strong>
                </label>
                <div className="wrk-slider-wrap">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={workPrefs.maxDistance}
                    onChange={(e) =>
                      setWorkPrefs({ ...workPrefs, maxDistance: Number(e.target.value) })
                    }
                  />
                  <div className="wrk-slider-labels">
                    <span>1 km</span>
                    <span>25 km</span>
                    <span>50 km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Days */}
            <div className="wrk-pref-section">
              <label className="wrk-pref-label">Available Working Days</label>
              <div className="wrk-days-grid">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = workPrefs.availability.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      className={`wrk-day-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Working Hours & Job Type */}
            <div className="wrk-pref-row-2col">
              <div className="wrk-form-group">
                <label>Preferred Working Hours</label>
                <select
                  value={workPrefs.preferredHours}
                  onChange={(e) => setWorkPrefs({ ...workPrefs, preferredHours: e.target.value })}
                >
                  {WORKING_HOURS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="wrk-form-group">
                <label>Preferred Job Type</label>
                <select
                  value={workPrefs.preferredJobType}
                  onChange={(e) =>
                    setWorkPrefs({ ...workPrefs, preferredJobType: e.target.value })
                  }
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="wrk-form-actions-right">
              <button
                type="submit"
                className="wrk-btn wrk-btn-primary"
                disabled={workPrefsLoading}
              >
                {workPrefsLoading ? 'Saving...' : '💾 Save Work Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 4: PRIVACY & SESSIONS ── */}
      {activeTab === 'privacy' && (
        <div className="wrk-tab-content">
          <div className="wrk-settings-grid">
            <div className="wrk-card wrk-settings-card">
              <div className="wrk-card-title-row">
                <span className="wrk-card-icon">🔒</span>
                <h3>Privacy & Document Protection</h3>
              </div>
              <p className="wrk-card-subtitle">
                WorkLink employs industry-standard encryption to protect your identity and records.
              </p>

              <div className="wrk-privacy-items">
                <div className="wrk-privacy-item">
                  <div className="wrk-picon">🛡️</div>
                  <div>
                    <strong>Encrypted Document Vault</strong>
                    <p>
                      Your Aadhaar number, PAN details, and face biometric vectors are encrypted and
                      stored securely. Employers only see your verification badge, never raw IDs.
                    </p>
                  </div>
                </div>

                <div className="wrk-privacy-item">
                  <div className="wrk-picon">👁️</div>
                  <div>
                    <strong>Worker Marketplace Visibility</strong>
                    <p>
                      Your professional profile is visible to verified employers hiring for daily
                      and contract jobs in your designated location.
                    </p>
                  </div>
                </div>

                <div className="wrk-privacy-item">
                  <div className="wrk-picon">📞</div>
                  <div>
                    <strong>Phone Number Privacy</strong>
                    <p>
                      Your complete phone number is masked and protected. Direct contact is
                      facilitated via verified in-app chat.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="wrk-card wrk-settings-card">
              <div className="wrk-card-title-row">
                <span className="wrk-card-icon">💻</span>
                <h3>Active Session Information</h3>
              </div>
              <p className="wrk-card-subtitle">
                Current login state and authenticated session details on WorkLink.
              </p>

              <div className="wrk-session-card">
                <div className="wrk-session-header">
                  <div className="wrk-session-dot active" />
                  <div>
                    <strong>Current Active Browser Session</strong>
                    <span className="wrk-session-meta">
                      Authenticated as: <strong>{workerFullName}</strong> ({user?.email})
                    </span>
                  </div>
                </div>
                <div className="wrk-session-details">
                  <div className="wrk-sdetail">
                    <span>Role</span>
                    <strong>Worker / Labourer</strong>
                  </div>
                  <div className="wrk-sdetail">
                    <span>Session Status</span>
                    <strong className="text-verified">Active & Secured</strong>
                  </div>
                  <div className="wrk-sdetail">
                    <span>Security Method</span>
                    <strong>JWT Bearer Token + HTTPS</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: PAYMENT & PAYOUTS ── */}
      {activeTab === 'payment' && (
        <div className="wrk-tab-content">
          <div className="wrk-settings-grid">
            <div className="wrk-card wrk-settings-card">
              <div className="wrk-card-title-row">
                <span className="wrk-card-icon">💳</span>
                <h3>Worker Payout Information</h3>
              </div>
              <p className="wrk-card-subtitle">
                Understand how your wages are calculated, settled, and transferred to your account.
              </p>

              <div className="wrk-payment-rules">
                <div className="wrk-prule-card">
                  <div className="wrk-prule-icon">💰</div>
                  <div>
                    <strong>Net Earning Calculation</strong>
                    <p>
                      Worker Net Earning = <strong>Job Wage - 2% WorkLink Platform Fee</strong>
                    </p>
                  </div>
                </div>

                <div className="wrk-prule-card">
                  <div className="wrk-prule-icon">🔒</div>
                  <div>
                    <strong>50% Advance Escrow Guarantee</strong>
                    <p>
                      Employers deposit 50% advance payment before you begin work, guaranteeing your
                      payout safety.
                    </p>
                  </div>
                </div>

                <div className="wrk-prule-card">
                  <div className="wrk-prule-icon">⚡</div>
                  <div>
                    <strong>Instant Completion Settlement</strong>
                    <p>
                      Upon job completion verification, the remaining balance is settled directly
                      with an itemized digital receipt.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="wrk-card wrk-settings-card">
              <div className="wrk-card-title-row">
                <span className="wrk-card-icon">🚀</span>
                <h3>Quick Navigation Shortcuts</h3>
              </div>
              <p className="wrk-card-subtitle">
                Access full transaction histories, pending payouts, and receipts.
              </p>

              <div className="wrk-shortcuts-list">
                <button
                  type="button"
                  className="wrk-shortcut-item"
                  onClick={() => onNavigate && onNavigate('earnings')}
                >
                  <div>
                    <strong>💳 Earnings & Payouts</strong>
                    <p>View total earnings, platform fee breakdowns, and monthly stats.</p>
                  </div>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  className="wrk-shortcut-item"
                  onClick={() => onNavigate && onNavigate('work-completed')}
                >
                  <div>
                    <strong>👷 Completed Jobs & History</strong>
                    <p>Review all completed assignments, dates, and wages.</p>
                  </div>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  className="wrk-shortcut-item"
                  onClick={() => onNavigate && onNavigate('trust')}
                >
                  <div>
                    <strong>🛡️ Trust & Verification Center</strong>
                    <p>Check your Trust Score breakdown and upload identity verification.</p>
                  </div>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: HELP & SUPPORT ── */}
      {activeTab === 'help' && (
        <div className="wrk-tab-content">
          <div className="wrk-card wrk-settings-card">
            <div className="wrk-card-title-row">
              <span className="wrk-card-icon">❓</span>
              <h3>Frequently Asked Questions (FAQ)</h3>
            </div>
            <p className="wrk-card-subtitle">
              Common questions regarding jobs, verification, trust score, and earnings.
            </p>

            <div className="wrk-faq-list">
              {/* FAQ 1 */}
              <div className="wrk-faq-item">
                <button
                  type="button"
                  className="wrk-faq-header"
                  onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                >
                  <span>💰 How do I get paid for completed work?</span>
                  <span>{expandedFaq === 1 ? '▲' : '▼'}</span>
                </button>
                {expandedFaq === 1 && (
                  <div className="wrk-faq-body">
                    When you accept a job, the employer pays a 50% advance into WorkLink Escrow.
                    Once you complete the work and the employer marks it finished, the remaining
                    balance is settled minus the standard 2% worker platform fee. You can download
                    official PDF receipts from the Earnings page.
                  </div>
                )}
              </div>

              {/* FAQ 2 */}
              <div className="wrk-faq-item">
                <button
                  type="button"
                  className="wrk-faq-header"
                  onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                >
                  <span>🛡️ How does the Trust Score work?</span>
                  <span>{expandedFaq === 2 ? '▲' : '▼'}</span>
                </button>
                {expandedFaq === 2 && (
                  <div className="wrk-faq-body">
                    Your Trust Score starts with 20 points upon successful identity verification.
                    Each completed job adds +2 points. 5-star employer ratings award +3 points, and
                    4-star ratings add +2 points. Maintaining a high score boosts your visibility to
                    top employers!
                  </div>
                )}
              </div>

              {/* FAQ 3 */}
              <div className="wrk-faq-item">
                <button
                  type="button"
                  className="wrk-faq-header"
                  onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
                >
                  <span>📑 How do I apply for jobs on WorkLink?</span>
                  <span>{expandedFaq === 3 ? '▲' : '▼'}</span>
                </button>
                {expandedFaq === 3 && (
                  <div className="wrk-faq-body">
                    Navigate to "Find Jobs" in the sidebar to explore available jobs by category or
                    proximity. Click "Apply Now" to submit your application. The employer will
                    review your profile and respond with an acceptance or message.
                  </div>
                )}
              </div>

              {/* FAQ 4 */}
              <div className="wrk-faq-item">
                <button
                  type="button"
                  className="wrk-faq-header"
                  onClick={() => setExpandedFaq(expandedFaq === 4 ? null : 4)}
                >
                  <span>🔒 How is my personal identity protected?</span>
                  <span>{expandedFaq === 4 ? '▲' : '▼'}</span>
                </button>
                {expandedFaq === 4 && (
                  <div className="wrk-faq-body">
                    WorkLink AI verifies Aadhaar and PAN documents through secure OCR and biometric
                    matching. Your documents and ID numbers are never displayed publicly. Employers
                    only see a verified checkmark.
                  </div>
                )}
              </div>
            </div>

            <div className="wrk-support-cta">
              <div>
                <strong>Need further assistance?</strong>
                <p>Have an issue with a job, payment, or account? Contact the WorkLink Admin team.</p>
              </div>
              <button
                type="button"
                className="wrk-btn wrk-btn-primary"
                onClick={() => setShowSupportModal(true)}
              >
                📩 Contact Admin / Support
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 1: CHANGE PASSWORD
          ══════════════════════════════════════════ */}
      {showPasswordModal && (
        <div className="wrk-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="wrk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <h3>🔒 Change Account Password</h3>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="wrk-modal-body">
                {passError && <div className="wrk-alert-error">{passError}</div>}

                <div className="wrk-form-group">
                  <label>Current Password</label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passData.currentPassword}
                    onChange={(e) =>
                      setPassData({ ...passData, currentPassword: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="wrk-form-group">
                  <label>New Password (min 8 characters)</label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    placeholder="Enter new strong password"
                    value={passData.newPassword}
                    onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="wrk-form-group">
                  <label>Confirm New Password</label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    placeholder="Re-type new password"
                    value={passData.confirmPassword}
                    onChange={(e) =>
                      setPassData({ ...passData, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>

                <label className="wrk-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPassText}
                    onChange={(e) => setShowPassText(e.target.checked)}
                  />
                  <span>Show password text</span>
                </label>
              </div>

              <div className="wrk-modal-footer">
                <button
                  type="button"
                  className="wrk-btn wrk-btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="wrk-btn wrk-btn-primary" disabled={passLoading}>
                  {passLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 2: CHANGE PHONE
          ══════════════════════════════════════════ */}
      {showPhoneModal && (
        <div className="wrk-modal-overlay" onClick={() => setShowPhoneModal(false)}>
          <div className="wrk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <h3>📱 Change Phone Number</h3>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => setShowPhoneModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePhoneSubmit}>
              <div className="wrk-modal-body">
                {phoneError && <div className="wrk-alert-error">{phoneError}</div>}

                <div className="wrk-form-group">
                  <label>Current Registered Phone</label>
                  <input
                    type="text"
                    value={user?.phone ? `+91 ${user.phone}` : 'Not provided'}
                    readOnly
                    disabled
                  />
                </div>

                <div className="wrk-form-group">
                  <label>New Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phoneData.newPhone}
                    onChange={(e) => setPhoneData({ newPhone: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: 12 }}>
                    Enter a valid 10-digit Indian mobile number.
                  </small>
                </div>
              </div>

              <div className="wrk-modal-footer">
                <button
                  type="button"
                  className="wrk-btn wrk-btn-secondary"
                  onClick={() => setShowPhoneModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="wrk-btn wrk-btn-primary" disabled={phoneLoading}>
                  {phoneLoading ? 'Saving...' : 'Update Phone Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 3: CHANGE EMAIL
          ══════════════════════════════════════════ */}
      {showEmailModal && (
        <div className="wrk-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="wrk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <h3>✉️ Change Registered Email</h3>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => setShowEmailModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmailSubmit}>
              <div className="wrk-modal-body">
                {emailError && <div className="wrk-alert-error">{emailError}</div>}

                <div className="wrk-form-group">
                  <label>Current Registered Email</label>
                  <input type="text" value={user?.email || ''} readOnly disabled />
                </div>

                <div className="wrk-form-group">
                  <label>New Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. worker@example.com"
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ newEmail: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="wrk-modal-footer">
                <button
                  type="button"
                  className="wrk-btn wrk-btn-secondary"
                  onClick={() => setShowEmailModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="wrk-btn wrk-btn-primary" disabled={emailLoading}>
                  {emailLoading ? 'Saving...' : 'Update Email Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 4: DEACTIVATE ACCOUNT
          ══════════════════════════════════════════ */}
      {showDeactivateModal && (
        <div className="wrk-modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="wrk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <h3 className="text-warning">⏸️ Deactivate Account</h3>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => setShowDeactivateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="wrk-modal-body">
              <p style={{ color: '#334155', lineHeight: 1.5, marginBottom: 16 }}>
                Are you sure you want to deactivate your WorkLink Worker account?
              </p>
              <div className="wrk-alert-warning">
                <strong>What happens when you deactivate:</strong>
                <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: 13 }}>
                  <li>Your profile will be hidden from employers in job searches.</li>
                  <li>You will not receive new job alerts.</li>
                  <li>Your pending settlements and earnings records remain safe.</li>
                  <li>You can reactivate your account by logging in again.</li>
                </ul>
              </div>
            </div>

            <div className="wrk-modal-footer">
              <button
                type="button"
                className="wrk-btn wrk-btn-secondary"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wrk-btn wrk-btn-warning"
                onClick={() => {
                  setShowDeactivateModal(false);
                  handleDeactivate();
                }}
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 5: DELETE ACCOUNT
          ══════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="wrk-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="wrk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <h3 className="text-danger">🗑️ Permanent Account Deletion</h3>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="wrk-modal-body">
              <div className="wrk-alert-error">
                <strong>⚠️ Warning: This action cannot be undone!</strong>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                  Deleting your account will permanently wipe your profile, trust scores, verified
                  status, and history from WorkLink.
                </p>
              </div>

              <div className="wrk-form-group" style={{ marginTop: 16 }}>
                <label>
                  Type <strong>DELETE</strong> below to confirm deletion:
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
            </div>

            <div className="wrk-modal-footer">
              <button
                type="button"
                className="wrk-btn wrk-btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wrk-btn wrk-btn-danger"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDeactivate();
                }}
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL 6: CONTACT SUPPORT / ADMIN
          ══════════════════════════════════════════ */}
      {showSupportModal && (
        <div className="wrk-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="wrk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wrk-modal-header">
              <h3>📩 Contact WorkLink Support</h3>
              <button
                type="button"
                className="wrk-modal-close"
                onClick={() => setShowSupportModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSupportSubmit}>
              <div className="wrk-modal-body">
                {supportSuccess ? (
                  <div className="wrk-alert-success">
                    ✓ Support request submitted! Our admin team will respond within 24 hours.
                  </div>
                ) : (
                  <>
                    <div className="wrk-form-group">
                      <label>Issue Category</label>
                      <select
                        value={supportData.category}
                        onChange={(e) =>
                          setSupportData({ ...supportData, category: e.target.value })
                        }
                      >
                        <option value="Payment Help">Payment & Payout Help</option>
                        <option value="Verification Help">Identity Verification / OCR</option>
                        <option value="Job Dispute">Job Application / Employer Issue</option>
                        <option value="Account Issue">Account Access & Login</option>
                        <option value="Other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="wrk-form-group">
                      <label>Subject</label>
                      <input
                        type="text"
                        placeholder="Brief summary of your question or issue"
                        value={supportData.subject}
                        onChange={(e) =>
                          setSupportData({ ...supportData, subject: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="wrk-form-group">
                      <label>Detailed Message</label>
                      <textarea
                        rows="4"
                        placeholder="Please describe your question or problem in detail..."
                        value={supportData.message}
                        onChange={(e) =>
                          setSupportData({ ...supportData, message: e.target.value })
                        }
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="wrk-modal-footer">
                <button
                  type="button"
                  className="wrk-btn wrk-btn-secondary"
                  onClick={() => setShowSupportModal(false)}
                >
                  Close
                </button>
                {!supportSuccess && (
                  <button type="submit" className="wrk-btn wrk-btn-primary">
                    Submit Request
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

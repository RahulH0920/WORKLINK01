import React, { useState, useEffect } from 'react';
import {
  changePassword,
  changePhone,
  changeEmail,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateProfileDetails,
  deactivateAccount,
} from '../../data/api';
import './EmployerSettings.css';

const HIRING_DEPARTMENTS = [
  'Hospitality & Catering',
  'Construction & Building',
  'Deep Cleaning & Sanitation',
  'Logistics & Warehousing',
  'Driver & Transportation',
  'Security & Guarding',
  'General Labour & Maintenance',
  'Event Logistics',
];

export default function EmployerSettings({ user, onUserUpdate, onLogout, onNavigate }) {
  const [activeTab, setActiveTab] = useState('account');
  const [toast, setToast] = useState(null);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Password state
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  // Phone state
  const [phoneVal, setPhoneVal] = useState(user?.phone || '');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Email state
  const [emailVal, setEmailVal] = useState(user?.email || '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    newApplications: true,
    messages: true,
    workerHired: true,
    payments: true,
    shiftCompletion: true,
    trustScore: true,
    systemUpdates: true,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Hiring Preferences
  const [preferredDepartments, setPreferredDepartments] = useState([
    'Hospitality & Catering',
    'Deep Cleaning & Sanitation',
    'Logistics & Warehousing',
  ]);
  const [payoutMode, setPayoutMode] = useState('auto');
  const [defaultShiftLocation, setDefaultShiftLocation] = useState(user?.location || 'Bengaluru, India');

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Delete Confirmation Text
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Support Ticket Form
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load notification preferences
  useEffect(() => {
    getNotificationPreferences()
      .then((res) => {
        if (res?.preferences) {
          setNotifications((prev) => ({ ...prev, ...res.preferences }));
        }
      })
      .catch(() => {});
  }, []);

  // Handle Notification Toggle
  const handleToggleNotif = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      setNotifLoading(true);
      await updateNotificationPreferences(updated);
      showToastMsg('Notification preferences updated.');
    } catch (err) {
      console.error(err);
      showToastMsg('Failed to update preferences.', 'error');
    } finally {
      setNotifLoading(false);
    }
  };

  // Handle Change Password
  const handlePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setPassError('');

    if (passData.newPassword !== passData.confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }
    if (passData.newPassword.length < 6) {
      setPassError('Password must be at least 6 characters.');
      return;
    }

    try {
      setPassLoading(true);
      await changePassword(passData.currentPassword, passData.newPassword, passData.confirmPassword);
      showToastMsg('Password changed successfully.');
      setShowPasswordModal(false);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Change Phone
  const handlePhoneSubmit = async (e) => {
    if (e) e.preventDefault();
    setPhoneError('');
    if (!phoneVal.trim()) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }

    try {
      setPhoneLoading(true);
      const res = await changePhone(phoneVal.trim());
      if (res?.user && onUserUpdate) onUserUpdate(res.user);
      showToastMsg('Phone number updated successfully.');
      setShowPhoneModal(false);
    } catch (err) {
      setPhoneError(err.message || 'Failed to update phone number.');
    } finally {
      setPhoneLoading(false);
    }
  };

  // Handle Change Email
  const handleEmailSubmit = async (e) => {
    if (e) e.preventDefault();
    setEmailError('');
    if (!emailVal.trim() || !emailVal.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    try {
      setEmailLoading(true);
      const res = await changeEmail(emailVal.trim());
      if (res?.user && onUserUpdate) onUserUpdate(res.user);
      showToastMsg('Email updated successfully.');
      setShowEmailModal(false);
    } catch (err) {
      setEmailError(err.message || 'Failed to update email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Deactivate Account
  const handleDeactivate = async () => {
    try {
      await deactivateAccount();
      alert('Your employer account has been deactivated. Logging out now.');
      if (onLogout) onLogout();
    } catch (err) {
      alert(err.message || 'Failed to deactivate account.');
    }
  };

  // Toggle Department Selection
  const toggleDepartment = (dept) => {
    if (preferredDepartments.includes(dept)) {
      setPreferredDepartments(preferredDepartments.filter((d) => d !== dept));
    } else {
      setPreferredDepartments([...preferredDepartments, dept]);
    }
    showToastMsg('Hiring preference updated.');
  };

  // FAQ Items
  const FAQ_ITEMS = [
    {
      q: 'How does WorkLink AI 50% Advance Escrow work?',
      a: 'When you hire a worker, 50% advance is deposited into the secure WorkLink Escrow. The remaining 50% is released after the shift is completed and you confirm completion.',
    },
    {
      q: 'How is the 2% platform fee calculated?',
      a: 'A nominal 2% platform service charge is applied to the total shift compensation for securing biometric ID checks, instant escrow, and AI matching.',
    },
    {
      q: 'What happens if a worker does not show up for the shift?',
      a: 'You can raise a dispute directly from the Workers or My Jobs section. Escrow funds will be 100% refunded to your employer wallet or primary payment method.',
    },
    {
      q: 'How is the Employer Trust Score calculated?',
      a: 'Trust Score increases with verified KYC identity (+20), timely post-shift sign-offs (+15), and positive reviews from hired workers (+10).',
    },
  ];

  return (
    <div className="emp-settings-page-container fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className="emp-toast-msg">
          {toast.type === 'error' ? '❌ ' : '✓ '}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="emp-settings-header">
        <h1 className="emp-settings-title">⚙️ Employer Settings</h1>
        <p className="emp-settings-subtitle">
          Manage your organization account, security protocols, hiring alerts, and escrow preferences.
        </p>
      </div>

      {/* Main 2-Column Layout */}
      <div className="emp-settings-layout">
        {/* Left Settings Sidebar Navigation */}
        <aside className="emp-settings-nav-card">
          <button
            type="button"
            className={`emp-settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <span className="emp-settings-nav-icon">👤</span>
            <span>Account Settings</span>
          </button>

          <button
            type="button"
            className={`emp-settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="emp-settings-nav-icon">🔒</span>
            <span>Password & Security</span>
          </button>

          <button
            type="button"
            className={`emp-settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <span className="emp-settings-nav-icon">🔔</span>
            <span>Notification Alerts</span>
          </button>

          <button
            type="button"
            className={`emp-settings-tab-btn ${activeTab === 'hiring' ? 'active' : ''}`}
            onClick={() => setActiveTab('hiring')}
          >
            <span className="emp-settings-nav-icon">💼</span>
            <span>Hiring Preferences</span>
          </button>

          <button
            type="button"
            className={`emp-settings-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <span className="emp-settings-nav-icon">💳</span>
            <span>Payment & Escrow</span>
          </button>

          <button
            type="button"
            className={`emp-settings-tab-btn ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            <span className="emp-settings-nav-icon">❓</span>
            <span>Help & FAQ Support</span>
          </button>

          <button
            type="button"
            className={`emp-settings-tab-btn danger-tab ${activeTab === 'danger' ? 'active' : ''}`}
            onClick={() => setActiveTab('danger')}
          >
            <span className="emp-settings-nav-icon">⚠️</span>
            <span>Danger Zone</span>
          </button>
        </aside>

        {/* Right Settings Content Card */}
        <main className="emp-settings-content-card">
          {/* TAB 1: ACCOUNT SETTINGS */}
          {activeTab === 'account' && (
            <div>
              <h2 className="emp-settings-section-title">👤 Employer Account Information</h2>
              <p className="emp-settings-section-desc">
                Review your registered company details, verified credentials, and official contact channels.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">Company / Employer Name</span>
                    <span className="emp-settings-row-sub">{user?.companyName || user?.name || 'WorkLink Employer'}</span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    onClick={() => onNavigate && onNavigate('profile')}
                  >
                    Edit in Profile →
                  </button>
                </div>

                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">Official Email Address</span>
                    <span className="emp-settings-row-sub">{user?.email || 'employer@worklink.com'}</span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    onClick={() => {
                      setEmailVal(user?.email || '');
                      setShowEmailModal(true);
                    }}
                  >
                    Change Email
                  </button>
                </div>

                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">Contact Phone Number</span>
                    <span className="emp-settings-row-sub">{user?.phone || 'Not provided'}</span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    onClick={() => {
                      setPhoneVal(user?.phone || '');
                      setShowPhoneModal(true);
                    }}
                  >
                    Update Phone
                  </button>
                </div>

                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">Account Status & Verification</span>
                    <span className="emp-settings-row-sub" style={{ color: user?.isVerified ? '#059669' : '#d97706', fontWeight: 700 }}>
                      {user?.isVerified ? '✓ Identity & KYC Verified' : '⏳ Verification In Progress'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    onClick={() => onNavigate && onNavigate('trust')}
                  >
                    View Trust Center →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASSWORD & SECURITY */}
          {activeTab === 'security' && (
            <div>
              <h2 className="emp-settings-section-title">🔒 Password & Security Protocols</h2>
              <p className="emp-settings-section-desc">
                Ensure your account is secure with strong authentication and active session controls.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">Account Password</span>
                    <span className="emp-settings-row-sub">Last updated recently. Keep it secure and unique.</span>
                  </div>
                  <button
                    type="button"
                    className="emp-edit-profile-btn"
                    style={{ padding: '8px 18px', fontSize: 13 }}
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change Password
                  </button>
                </div>

                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">WorkLink AI Security Shield</span>
                    <span className="emp-settings-row-sub">All payment releases and worker contracts are end-to-end encrypted.</span>
                  </div>
                  <span style={{ color: '#059669', fontWeight: 800, fontSize: 13 }}>● Active</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATION ALERTS */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="emp-settings-section-title">🔔 Notification & Dispatch Preferences</h2>
              <p className="emp-settings-section-desc">
                Configure real-time alerts for worker applications, chat messages, and escrow releases.
              </p>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                <div className="emp-toggle-row">
                  <div className="emp-toggle-info">
                    <strong className="emp-toggle-title">New Candidate Applications</strong>
                    <span className="emp-toggle-desc">Receive instant alerts when workers apply for your posted jobs.</span>
                  </div>
                  <label className="emp-switch-label">
                    <input
                      type="checkbox"
                      checked={notifications.newApplications}
                      onChange={() => handleToggleNotif('newApplications')}
                      disabled={notifLoading}
                    />
                    <span className="emp-switch-slider" />
                  </label>
                </div>

                <div className="emp-toggle-row">
                  <div className="emp-toggle-info">
                    <strong className="emp-toggle-title">Direct Messages & Chat</strong>
                    <span className="emp-toggle-desc">Notify me when a worker sends a message regarding a shift.</span>
                  </div>
                  <label className="emp-switch-label">
                    <input
                      type="checkbox"
                      checked={notifications.messages}
                      onChange={() => handleToggleNotif('messages')}
                      disabled={notifLoading}
                    />
                    <span className="emp-switch-slider" />
                  </label>
                </div>

                <div className="emp-toggle-row">
                  <div className="emp-toggle-info">
                    <strong className="emp-toggle-title">Worker Hiring Confirmations</strong>
                    <span className="emp-toggle-desc">Alerts when worker contracts are confirmed and advance is secured.</span>
                  </div>
                  <label className="emp-switch-label">
                    <input
                      type="checkbox"
                      checked={notifications.workerHired}
                      onChange={() => handleToggleNotif('workerHired')}
                      disabled={notifLoading}
                    />
                    <span className="emp-switch-slider" />
                  </label>
                </div>

                <div className="emp-toggle-row">
                  <div className="emp-toggle-info">
                    <strong className="emp-toggle-title">Escrow & Payment Receipts</strong>
                    <span className="emp-toggle-desc">Transaction receipts and settlement notifications.</span>
                  </div>
                  <label className="emp-switch-label">
                    <input
                      type="checkbox"
                      checked={notifications.payments}
                      onChange={() => handleToggleNotif('payments')}
                      disabled={notifLoading}
                    />
                    <span className="emp-switch-slider" />
                  </label>
                </div>

                <div className="emp-toggle-row">
                  <div className="emp-toggle-info">
                    <strong className="emp-toggle-title">Shift Completion Sign-offs</strong>
                    <span className="emp-toggle-desc">Alert when a worker marks their shift completed for approval.</span>
                  </div>
                  <label className="emp-switch-label">
                    <input
                      type="checkbox"
                      checked={notifications.shiftCompletion}
                      onChange={() => handleToggleNotif('shiftCompletion')}
                      disabled={notifLoading}
                    />
                    <span className="emp-switch-slider" />
                  </label>
                </div>

                <div className="emp-toggle-row">
                  <div className="emp-toggle-info">
                    <strong className="emp-toggle-title">Trust & Safety Engine Updates</strong>
                    <span className="emp-toggle-desc">Updates on your employer Trust Score milestone adjustments.</span>
                  </div>
                  <label className="emp-switch-label">
                    <input
                      type="checkbox"
                      checked={notifications.trustScore}
                      onChange={() => handleToggleNotif('trustScore')}
                      disabled={notifLoading}
                    />
                    <span className="emp-switch-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HIRING PREFERENCES */}
          {activeTab === 'hiring' && (
            <div>
              <h2 className="emp-settings-section-title">💼 Hiring & Job Dispatch Preferences</h2>
              <p className="emp-settings-section-desc">
                Set your primary hiring sectors and default dispatch location for faster job posting.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="emp-settings-label" style={{ display: 'block', marginBottom: 8 }}>
                    Preferred Hiring Sectors
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {HIRING_DEPARTMENTS.map((dept) => {
                      const isSelected = preferredDepartments.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDepartment(dept)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: `1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#2563eb' : '#475569',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="emp-settings-grid">
                  <div className="emp-settings-field">
                    <label className="emp-settings-label">Default Hiring Location</label>
                    <input
                      type="text"
                      className="emp-settings-input"
                      value={defaultShiftLocation}
                      onChange={(e) => setDefaultShiftLocation(e.target.value)}
                    />
                  </div>
                  <div className="emp-settings-field">
                    <label className="emp-settings-label">Shift Settlement Release Mode</label>
                    <select
                      className="emp-settings-select"
                      value={payoutMode}
                      onChange={(e) => setPayoutMode(e.target.value)}
                    >
                      <option value="auto">Automatic Release Upon Shift Completion</option>
                      <option value="manual">Manual Approval for Each Individual Shift</option>
                    </select>
                  </div>
                </div>

                <div style={{ paddingTop: 8 }}>
                  <button
                    type="button"
                    className="emp-edit-profile-btn"
                    onClick={() => showToastMsg('Hiring preferences saved.')}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT & ESCROW */}
          {activeTab === 'payments' && (
            <div>
              <h2 className="emp-settings-section-title">💳 Payment & Escrow Preferences</h2>
              <p className="emp-settings-section-desc">
                WorkLink protects both employers and workers with the 50% Advance Escrow Protocol.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 18, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                  <strong style={{ fontSize: 14, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                    🛡️ 50% Advance Escrow System
                  </strong>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    When hiring a verified worker, 50% advance compensation is held safely in escrow.
                    The remaining 50% is paid post-shift. Platform fee is fixed at 2% with zero hidden commissions.
                  </p>
                </div>

                <div className="emp-settings-row-item">
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title">Transaction History & Receipts</span>
                    <span className="emp-settings-row-sub">View all processed advance payments and download tax invoices.</span>
                  </div>
                  <button
                    type="button"
                    className="emp-edit-profile-btn"
                    style={{ padding: '8px 18px', fontSize: 13 }}
                    onClick={() => onNavigate && onNavigate('transactions')}
                  >
                    View Payments →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HELP & SUPPORT */}
          {activeTab === 'support' && (
            <div>
              <h2 className="emp-settings-section-title">❓ Help Center & Support FAQs</h2>
              <p className="emp-settings-section-desc">
                Find quick answers to common employer hiring, payment, and verification questions.
              </p>

              {/* FAQ Accordion */}
              <div style={{ marginBottom: 24 }}>
                {FAQ_ITEMS.map((faq, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div key={idx} className="emp-faq-item">
                      <div
                        className="emp-faq-header"
                        onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      >
                        <span>{faq.q}</span>
                        <span>{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && <div className="emp-faq-body">{faq.a}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Contact Support */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
                <strong style={{ fontSize: 15, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                  📩 Contact WorkLink AI Support
                </strong>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                  Have an urgent issue with an active shift or dispute? Our support team responds within 15 minutes.
                </p>

                {supportSuccess ? (
                  <div style={{ padding: 12, background: '#ecfdf5', color: '#059669', borderRadius: 8, fontSize: 13 }}>
                    ✓ Support request submitted! A WorkLink support specialist will contact you shortly.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSupportSuccess(true);
                      setTimeout(() => {
                        setSupportSubject('');
                        setSupportMessage('');
                        setSupportSuccess(false);
                      }, 3000);
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    <input
                      type="text"
                      className="emp-settings-input"
                      placeholder="Subject (e.g. Escrow Inquiry, Shift Coordination)"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      required
                    />
                    <textarea
                      rows={3}
                      className="emp-settings-textarea"
                      placeholder="Describe your issue or question in detail..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      required
                    />
                    <div>
                      <button type="submit" className="emp-edit-profile-btn">
                        Submit Support Ticket
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div>
              <h2 className="emp-settings-section-title" style={{ color: '#dc2626' }}>
                ⚠️ Danger Zone & Account Actions
              </h2>
              <p className="emp-settings-section-desc">
                Irreversible account operations. Please proceed with caution.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="emp-settings-row-item" style={{ borderColor: '#fecaca', background: '#fff5f5' }}>
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title" style={{ color: '#991b1b' }}>Sign Out of Account</span>
                    <span className="emp-settings-row-sub">End your active employer session on this device.</span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    style={{ color: '#991b1b', borderColor: '#fca5a5' }}
                    onClick={onLogout}
                  >
                    🚪 Sign Out
                  </button>
                </div>

                <div className="emp-settings-row-item" style={{ borderColor: '#fecaca', background: '#fff5f5' }}>
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title" style={{ color: '#991b1b' }}>Deactivate Employer Account</span>
                    <span className="emp-settings-row-sub">Temporarily pause job postings and hide active listings.</span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    style={{ color: '#991b1b', borderColor: '#fca5a5' }}
                    onClick={() => setShowDeactivateModal(true)}
                  >
                    Deactivate Account
                  </button>
                </div>

                <div className="emp-settings-row-item" style={{ borderColor: '#fecaca', background: '#fff5f5' }}>
                  <div className="emp-settings-row-info">
                    <span className="emp-settings-row-title" style={{ color: '#991b1b' }}>Delete Employer Account</span>
                    <span className="emp-settings-row-sub">Permanently delete your profile, jobs, and history.</span>
                  </div>
                  <button
                    type="button"
                    className="emp-settings-action-btn"
                    style={{ background: '#dc2626', color: '#ffffff', borderColor: '#dc2626' }}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS ── */}

      {/* 1. Password Modal */}
      {showPasswordModal && (
        <div className="emp-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="emp-edit-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">🔒 Change Password</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowPasswordModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="emp-modal-body">
                {passError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                    {passError}
                  </div>
                )}
                <div className="emp-modal-form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    className="emp-modal-input"
                    value={passData.currentPassword}
                    onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="emp-modal-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="emp-modal-input"
                    value={passData.newPassword}
                    onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="emp-modal-form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    className="emp-modal-input"
                    value={passData.confirmPassword}
                    onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="emp-btn-save" disabled={passLoading}>
                  {passLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Phone Modal */}
      {showPhoneModal && (
        <div className="emp-modal-overlay" onClick={() => setShowPhoneModal(false)}>
          <div className="emp-edit-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">📞 Update Phone Number</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowPhoneModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handlePhoneSubmit}>
              <div className="emp-modal-body">
                {phoneError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                    {phoneError}
                  </div>
                )}
                <div className="emp-modal-form-group">
                  <label>Official Contact Phone</label>
                  <input
                    type="tel"
                    className="emp-modal-input"
                    value={phoneVal}
                    onChange={(e) => setPhoneVal(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={() => setShowPhoneModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="emp-btn-save" disabled={phoneLoading}>
                  {phoneLoading ? 'Saving…' : 'Save Phone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Email Modal */}
      {showEmailModal && (
        <div className="emp-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="emp-edit-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title">✉️ Update Email Address</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowEmailModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleEmailSubmit}>
              <div className="emp-modal-body">
                {emailError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                    {emailError}
                  </div>
                )}
                <div className="emp-modal-form-group">
                  <label>New Official Email</label>
                  <input
                    type="email"
                    className="emp-modal-input"
                    value={emailVal}
                    onChange={(e) => setEmailVal(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="emp-modal-footer">
                <button type="button" className="emp-btn-cancel" onClick={() => setShowEmailModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="emp-btn-save" disabled={emailLoading}>
                  {emailLoading ? 'Saving…' : 'Save Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Deactivate Modal */}
      {showDeactivateModal && (
        <div className="emp-modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="emp-edit-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title" style={{ color: '#dc2626' }}>⚠️ Deactivate Account</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowDeactivateModal(false)}>
                ✕
              </button>
            </div>
            <div className="emp-modal-body">
              <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to deactivate your employer account? Your posted jobs will be paused
                and workers won't be able to apply until you log back in.
              </p>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn-cancel" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="emp-btn-save"
                style={{ background: '#dc2626' }}
                onClick={handleDeactivate}
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Modal */}
      {showDeleteModal && (
        <div className="emp-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="emp-edit-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 className="emp-modal-title" style={{ color: '#dc2626' }}>🗑️ Delete Employer Account</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div className="emp-modal-body">
              <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                This action is permanent and cannot be undone. All your job listings, applicant records,
                and trust history will be deleted.
              </p>
              <div className="emp-modal-form-group" style={{ marginTop: 12 }}>
                <label>Type <strong>DELETE</strong> to confirm:</label>
                <input
                  type="text"
                  className="emp-modal-input"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="emp-btn-save"
                style={{ background: '#dc2626' }}
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={handleDeactivate}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

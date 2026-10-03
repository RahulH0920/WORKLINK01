import React, { useState, useEffect } from "react";
import {
  getMe,
  getStoredUser,
  updateProfileDetails,
  uploadProfilePhoto,
  removeProfilePhoto,
  changePassword,
  getNotificationPreferences,
  updateNotificationPreferences,
  getAdminAuditLogs,
  logoutUser,
} from "../../data/api";

const SECTIONS = [
  { id: "profile", label: "Admin Profile", icon: "👤", badge: "Personal" },
  { id: "security", label: "Account & Security", icon: "🔒", badge: "Security" },
  { id: "notifications", label: "Notification Preferences", icon: "🔔", badge: "Alerts" },
  { id: "platform", label: "Platform Settings", icon: "🌐", badge: "System" },
  { id: "trust_safety", label: "Trust & Safety Settings", icon: "🛡️", badge: "Governance" },
  { id: "payments", label: "Payment & Commission", icon: "💳", badge: "Finance" },
  { id: "preferences", label: "System Preferences", icon: "⚙️", badge: "Local" },
  { id: "audit_log", label: "Admin Activity / Audit Log", icon: "📋", badge: "History" },
];

const AdminSettings = ({ setActivePage }) => {
  const [activeSection, setActiveSection] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // 1. Admin Profile State
  const [adminUser, setAdminUser] = useState(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // 2. Security / Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 3. Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    system: true,
    applicationUpdates: true,
    trustScore: true,
    newJobs: true,
    jobStatus: true,
    payments: true,
    messages: true,
  });
  const [notifSaveSuccess, setNotifSaveSuccess] = useState(false);

  // 4. System Preferences State (Saved in LocalStorage)
  const [systemPrefs, setSystemPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("wl_admin_system_prefs");
      return saved
        ? JSON.parse(saved)
        : {
            dateFormat: "DD/MM/YYYY hh:mm A",
            defaultLanding: "Dashboard",
            refreshInterval: "10",
            tablePageSize: "25",
            theme: "Light (Admin SaaS)",
          };
    } catch {
      return {
        dateFormat: "DD/MM/YYYY hh:mm A",
        defaultLanding: "Dashboard",
        refreshInterval: "10",
        tablePageSize: "25",
        theme: "Light (Admin SaaS)",
      };
    }
  });

  // 5. Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditModuleFilter, setAuditModuleFilter] = useState("All");

  // Clear feedback after timeout
  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 4500);
  };

  // Initial Data Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch Admin User Profile
        let user = getStoredUser();
        try {
          const meRes = await getMe();
          if (meRes && meRes.success && meRes.user) {
            user = meRes.user;
          }
        } catch (e) {
          console.warn("Could not fetch meRes, using stored user:", e);
        }

        if (user) {
          setAdminUser(user);
          setProfileForm({
            firstName: user.firstName || (user.name ? user.name.split(" ")[0] : "Admin"),
            lastName: user.lastName || (user.name && user.name.split(" ").length > 1 ? user.name.split(" ").slice(1).join(" ") : "User"),
            name: user.name || "System Admin",
            email: user.email || "admin@worklink.com",
            phone: user.phone || "9999999999",
            location: user.location || "Bengaluru, Karnataka, India",
            bio: user.bio || "WorkLink AI Platform Administrator & Governance Controller",
          });
          if (user.photoUrl) {
            setPhotoPreview(user.photoUrl);
          }
        }

        // Fetch Notification Preferences
        try {
          const prefRes = await getNotificationPreferences();
          if (prefRes && prefRes.success && prefRes.notificationPreferences) {
            setNotifPrefs((prev) => ({
              ...prev,
              ...prefRes.notificationPreferences,
            }));
          }
        } catch (e) {
          console.warn("Notification prefs fetch skipped:", e);
        }
      } catch (err) {
        console.error("Settings initial load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch Audit Logs on tab selection
  useEffect(() => {
    if (activeSection === "audit_log") {
      const fetchLogs = async () => {
        setAuditLoading(true);
        try {
          const res = await getAdminAuditLogs();
          if (res && res.success) {
            setAuditLogs(res.logs || []);
          }
        } catch (err) {
          console.error("Error fetching audit logs:", err);
          setAuditLogs([]);
        } finally {
          setAuditLoading(false);
        }
      };
      fetchLogs();
    }
  }, [activeSection]);

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const resolvedName = `${profileForm.firstName} ${profileForm.lastName}`.trim() || profileForm.name;
      const payload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        name: resolvedName,
        phone: profileForm.phone,
        location: profileForm.location,
        bio: profileForm.bio,
      };

      const res = await updateProfileDetails(payload);
      if (res && res.success) {
        const updated = res.user || { ...adminUser, ...payload };
        setAdminUser(updated);
        localStorage.setItem("wl_user", JSON.stringify(updated));
        setIsEditingProfile(false);
        showFeedback("success", "Admin profile details updated successfully.");
      } else {
        showFeedback("error", res?.message || "Failed to update profile details.");
      }
    } catch (err) {
      console.error("Update profile error:", err);
      showFeedback("error", err?.message || "Error updating profile details.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFeedback("error", "Photo size exceeds 5MB limit.");
      return;
    }

    setSaveLoading(true);
    try {
      const res = await uploadProfilePhoto(file);
      if (res && res.success) {
        const updated = res.user || { ...adminUser, photoUrl: res.photoUrl };
        setAdminUser(updated);
        setPhotoPreview(res.photoUrl || URL.createObjectURL(file));
        localStorage.setItem("wl_user", JSON.stringify(updated));
        showFeedback("success", "Profile photo uploaded successfully.");
      } else {
        showFeedback("error", res?.message || "Failed to upload photo.");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      showFeedback("error", err?.message || "Error uploading profile photo.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Photo Remove
  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    setSaveLoading(true);
    try {
      const res = await removeProfilePhoto();
      if (res && res.success) {
        const updated = { ...adminUser, photoUrl: "" };
        setAdminUser(updated);
        setPhotoPreview("");
        localStorage.setItem("wl_user", JSON.stringify(updated));
        showFeedback("success", "Profile photo removed.");
      } else {
        showFeedback("error", res?.message || "Failed to remove photo.");
      }
    } catch (err) {
      console.error("Photo remove error:", err);
      showFeedback("error", err?.message || "Error removing photo.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback("error", "New password and confirmation do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showFeedback("error", "New password must be at least 8 characters long.");
      return;
    }

    setSaveLoading(true);
    try {
      const res = await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      if (res && res.success) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        showFeedback("success", "Password changed successfully. Your account is secured.");
      } else {
        showFeedback("error", res?.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Password update error:", err);
      showFeedback("error", err?.message || "Error changing password.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Notification Preference Toggle
  const handleToggleNotif = async (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      const res = await updateNotificationPreferences(updated);
      if (res && res.success) {
        setNotifSaveSuccess(true);
        setTimeout(() => setNotifSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to sync notification preferences:", err);
      showFeedback("error", "Failed to save preference to server.");
    }
  };

  // Handle System Preferences Save
  const handleSaveSystemPrefs = (newPrefs) => {
    setSystemPrefs(newPrefs);
    localStorage.setItem("wl_admin_system_prefs", JSON.stringify(newPrefs));
    showFeedback("success", "System preferences saved locally for this browser session.");
  };

  // Handle Logout
  const handleConfirmLogout = () => {
    logoutUser();
    window.location.reload();
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesModule = auditModuleFilter === "All" || log.module === auditModuleFilter;
    const matchesSearch =
      !auditSearch ||
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.targetUser?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.description?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.id?.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesModule && matchesSearch;
  });

  return (
    <div className="admin-page-container fade-in">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="admin-breadcrumb">
            <span onClick={() => setActivePage("Dashboard")} style={{ cursor: "pointer" }}>
              WorkLink Admin
            </span>{" "}
            / <span>Settings</span>
          </div>
          <h1>⚙️ Platform Settings & Governance Control</h1>
          <p>
            Manage administrator credentials, notification rules, security parameters, system preferences, and audited logs.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div
          className={`settings-callout ${feedback.type === "error" ? "warning" : "success"} fade-in`}
          style={{ marginBottom: 20 }}
        >
          <span>{feedback.type === "error" ? "⚠️" : "✅"}</span>
          <div style={{ flex: 1, fontWeight: 600 }}>{feedback.message}</div>
          <button
            onClick={() => setFeedback({ type: "", message: "" })}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Two-Column Layout */}
      <div className="settings-layout">
        {/* Left Settings Sidebar Navigation */}
        <aside className="settings-sidebar-nav">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                className={`settings-nav-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="settings-nav-icon">{section.icon}</span>
                <span className="settings-nav-label">{section.label}</span>
                <span className="settings-nav-badge">{section.badge}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Settings Content Pane */}
        <main className="settings-content-pane">
          {/* =========================================================================
              SECTION 1: ADMIN PROFILE
             ========================================================================= */}
          {activeSection === "profile" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>👤</span> Administrator Profile
                  </h2>
                  <p>Manage your administrative identity, display name, contact phone, and public bio.</p>
                </div>
                {!isEditingProfile ? (
                  <button className="btn-secondary" onClick={() => setIsEditingProfile(true)}>
                    ✏️ Edit Profile
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => setIsEditingProfile(false)}>
                    ✕ Cancel
                  </button>
                )}
              </div>

              {/* Avatar Box */}
              <div className="settings-avatar-box">
                {photoPreview ? (
                  <img src={photoPreview} alt="Admin Avatar" className="settings-avatar-img" />
                ) : (
                  <div className="settings-avatar-img">🛡️</div>
                )}
                <div className="settings-avatar-actions">
                  <strong style={{ fontSize: 15, color: "var(--admin-text-dark)" }}>
                    {adminUser?.name || `${profileForm.firstName} ${profileForm.lastName}`}
                  </strong>
                  <span style={{ fontSize: 12.5, color: "var(--admin-muted)" }}>
                    {adminUser?.email || "admin@worklink.com"} • Role: <strong style={{ color: "var(--admin-blue)" }}>Administrator</strong>
                  </span>
                  <div className="settings-avatar-btn-row" style={{ marginTop: 4 }}>
                    <label className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                      📁 Upload Photo
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={handleRemovePhoto}
                        disabled={saveLoading}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSaveProfile}>
                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      disabled={!isEditingProfile || saveLoading}
                      placeholder="Admin First Name"
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      disabled={!isEditingProfile || saveLoading}
                      placeholder="Admin Last Name"
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label>Admin Email Address</label>
                    <input type="email" value={profileForm.email} disabled={true} />
                    <span className="settings-field-hint">Primary login credential (managed via system auth).</span>
                  </div>

                  <div className="settings-field">
                    <label>Contact Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      disabled={!isEditingProfile || saveLoading}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="settings-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Office Location / Region</label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                      disabled={!isEditingProfile || saveLoading}
                      placeholder="City, State, Country"
                    />
                  </div>

                  <div className="settings-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Admin Bio / Responsibilities</label>
                    <textarea
                      rows={3}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      disabled={!isEditingProfile || saveLoading}
                      placeholder="Summary of administrative responsibilities"
                    />
                  </div>
                </div>

                {isEditingProfile && (
                  <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={saveLoading}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={saveLoading}>
                      {saveLoading ? "Saving Changes..." : "Save Profile Details"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* =========================================================================
              SECTION 2: ACCOUNT & SECURITY
             ========================================================================= */}
          {activeSection === "security" && (
            <>
              {/* Change Password Card */}
              <div className="settings-card fade-in">
                <div className="settings-card-header">
                  <div className="settings-card-title-group">
                    <h2>
                      <span>🔒</span> Password & Authentication
                    </h2>
                    <p>Update your password and manage administrative access credentials.</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword}>
                  <div className="settings-form-grid single-col" style={{ maxWidth: 580 }}>
                    <div className="settings-field">
                      <label>Current Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                          }
                          placeholder="Enter current password"
                          required
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword({ ...showPassword, current: !showPassword.current })
                          }
                          style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "var(--admin-muted)",
                          }}
                        >
                          {showPassword.current ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>

                    <div className="settings-field">
                      <label>New Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="At least 8 characters (Uppercase, lowercase, number, symbol)"
                          required
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                          style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "var(--admin-muted)",
                          }}
                        >
                          {showPassword.new ? "🙈" : "👁️"}
                        </button>
                      </div>
                      <span className="settings-field-hint">
                        Must contain at least 8 characters including uppercase, lowercase, numbers, and symbols.
                      </span>
                    </div>

                    <div className="settings-field">
                      <label>Confirm New Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          }
                          placeholder="Re-enter new password"
                          required
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword({ ...showPassword, confirm: !showPassword.confirm })
                          }
                          style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "var(--admin-muted)",
                          }}
                        >
                          {showPassword.confirm ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button type="submit" className="btn-primary" disabled={saveLoading}>
                      {saveLoading ? "Updating Password..." : "Change Password"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sessions & Security Controls */}
              <div className="settings-card fade-in">
                <div className="settings-card-header">
                  <div className="settings-card-title-group">
                    <h2>
                      <span>🛡️</span> Active Session & Authentication State
                    </h2>
                    <p>Details regarding current authenticated session, token validity, and sign-out actions.</p>
                  </div>
                </div>

                <div className="settings-param-grid" style={{ marginBottom: 24 }}>
                  <div className="settings-param-card">
                    <span className="settings-param-title">Current Authentication Token</span>
                    <span className="settings-param-value" style={{ fontSize: 16, color: "var(--admin-green)" }}>
                      Active (Bearer JWT)
                    </span>
                    <p className="settings-param-desc">Cryptographically signed with 7-day administrative expiry.</p>
                  </div>

                  <div className="settings-param-card">
                    <span className="settings-param-title">Authorization Role</span>
                    <span className="settings-param-value" style={{ fontSize: 16, color: "var(--admin-blue)" }}>
                      Role: "admin"
                    </span>
                    <p className="settings-param-desc">Full governance clearance across verification, escrow, and fraud.</p>
                  </div>

                  <div className="settings-param-card">
                    <span className="settings-param-title">Host Connection</span>
                    <span className="settings-param-value" style={{ fontSize: 16 }}>
                      localhost:5000
                    </span>
                    <p className="settings-param-desc">Express REST API connected via CORS-protected gateway.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setShowLogoutModal(true)}
                  >
                    🚪 Log Out Current Session
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      showFeedback(
                        "info",
                        "All sessions use stateless JWT tokens. Logging out from this browser will invalidate your current session."
                      )
                    }
                  >
                    🔒 Invalidate All Sessions
                  </button>
                </div>
              </div>

              {/* Logout Confirmation Modal */}
              {showLogoutModal && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal-container" style={{ maxWidth: 480 }}>
                    <div className="admin-modal-header">
                      <h3 style={{ margin: 0, fontSize: 17, color: "var(--admin-text-dark)" }}>
                        Confirm Administrator Sign-Out
                      </h3>
                      <button
                        className="admin-modal-close"
                        onClick={() => setShowLogoutModal(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="admin-modal-body">
                      <p style={{ margin: 0, fontSize: 14, color: "var(--admin-muted)", lineHeight: 1.5 }}>
                        Are you sure you want to sign out of the WorkLink Admin Dashboard? You will need to enter your administrative credentials to log back in.
                      </p>
                    </div>
                    <div className="admin-modal-footer">
                      <button className="btn-secondary" onClick={() => setShowLogoutModal(false)}>
                        Cancel
                      </button>
                      <button className="btn-danger" onClick={handleConfirmLogout}>
                        Yes, Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* =========================================================================
              SECTION 3: NOTIFICATION PREFERENCES
             ========================================================================= */}
          {activeSection === "notifications" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>🔔</span> Admin Notification Preferences
                  </h2>
                  <p>
                    Configure which platform events and automated governance signals notify your account.
                  </p>
                </div>
                {notifSaveSuccess && (
                  <span className="panel-tag green" style={{ padding: "6px 12px", fontSize: 12 }}>
                    ✓ Saved to Server
                  </span>
                )}
              </div>

              <div className="settings-toggle-list">
                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>🛡️</span> Identity & KYC Verification Alerts
                    </div>
                    <p className="settings-toggle-desc">
                      Notify when a worker or employer uploads documents requiring manual or automated AI verification review.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.applicationUpdates)}
                      onChange={() => handleToggleNotif("applicationUpdates")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>

                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>🚨</span> Fraud & Trust Safety Alerts
                    </div>
                    <p className="settings-toggle-desc">
                      Receive instant warnings on high-risk activity, identity mismatches, or suspicious transaction spikes.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.trustScore)}
                      onChange={() => handleToggleNotif("trustScore")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>

                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>💼</span> Job Postings & Milestone Completions
                    </div>
                    <p className="settings-toggle-desc">
                      Receive updates when new gigs are posted or marked complete and confirmed by employers.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.newJobs)}
                      onChange={() => handleToggleNotif("newJobs")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>

                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>📄</span> Worker Applications & Hiring Events
                    </div>
                    <p className="settings-toggle-desc">
                      Alerts when candidates apply to listings, get hired, or escrow deposits are locked.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.jobStatus)}
                      onChange={() => handleToggleNotif("jobStatus")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>

                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>💳</span> Escrow Payments & Settlements
                    </div>
                    <p className="settings-toggle-desc">
                      Notifications for 50% advance deposits, 50% milestone settlements, and platform commission captures.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.payments)}
                      onChange={() => handleToggleNotif("payments")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>

                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>⚖️</span> Milestone Disputes & Grievances
                    </div>
                    <p className="settings-toggle-desc">
                      High-priority notifications when an employer or worker raises a dispute requiring mediation.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.messages)}
                      onChange={() => handleToggleNotif("messages")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>

                <div className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <div className="settings-toggle-title">
                      <span>⚙️</span> System & Infrastructure Health
                    </div>
                    <p className="settings-toggle-desc">
                      Automated hourly health checks, database latency, and OCR microservice connection status.
                    </p>
                  </div>
                  <label className="saas-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.system)}
                      onChange={() => handleToggleNotif("system")}
                    />
                    <span className="saas-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-callout" style={{ marginTop: 24 }}>
                <span>ℹ️</span>
                <div>
                  Notification preferences are linked to your authenticated administrator account in MongoDB and applied in real time to the{" "}
                  <strong style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setActivePage("Notifications")}>
                    Admin Notifications
                  </strong>{" "}
                  stream.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 4: PLATFORM SETTINGS
             ========================================================================= */}
          {activeSection === "platform" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>🌐</span> Platform Governance & Environment Settings
                  </h2>
                  <p>Read-only verified configuration parameters loaded from the production backend environment.</p>
                </div>
                <span className="panel-tag green">System Active</span>
              </div>

              <div className="settings-param-grid" style={{ marginBottom: 24 }}>
                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Platform Name</span>
                    <span className="panel-tag blue">Core</span>
                  </div>
                  <span className="settings-param-value" style={{ fontSize: 17 }}>
                    WorkLink AI Platform
                  </span>
                  <p className="settings-param-desc">Decentralized blue-collar gig & verification engine.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">System Status</span>
                    <span className="panel-tag green">Operational</span>
                  </div>
                  <span className="settings-param-value" style={{ fontSize: 17, color: "var(--admin-green)" }}>
                    100% Online
                  </span>
                  <p className="settings-param-desc">All verification routes, OCR modules, and database listeners healthy.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Worker Onboarding</span>
                    <span className="panel-tag blue">Enforced</span>
                  </div>
                  <span className="settings-param-value" style={{ fontSize: 17 }}>
                    KYC Required
                  </span>
                  <p className="settings-param-desc">Aadhaar OCR, PAN validation, and face match check mandatory.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Employer Onboarding</span>
                    <span className="panel-tag blue">Open</span>
                  </div>
                  <span className="settings-param-value" style={{ fontSize: 17 }}>
                    Business Verified
                  </span>
                  <p className="settings-param-desc">Registration open with business document verification.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Maintenance Mode</span>
                    <span className="panel-tag gray">Disabled</span>
                  </div>
                  <span className="settings-param-value" style={{ fontSize: 17, color: "var(--admin-muted)" }}>
                    Inactive (Normal)
                  </span>
                  <p className="settings-param-desc">Platform is running live with zero downtime restrictions.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Database Storage</span>
                    <span className="panel-tag green">Atlas</span>
                  </div>
                  <span className="settings-param-value" style={{ fontSize: 17 }}>
                    MongoDB Replica Set
                  </span>
                  <p className="settings-param-desc">Cloud-hosted database with TLS encryption and automatic failover.</p>
                </div>
              </div>

              <div className="settings-callout warning">
                <span>🔒</span>
                <div>
                  <strong>Environment-Controlled Configuration:</strong> Core platform parameters (database URIs, JWT signing secrets, OCR paths) are securely defined in backend environment configurations (<code>.env</code>) and cannot be modified dynamically through this console to prevent unauthorized privilege escalation.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 5: TRUST & SAFETY SETTINGS
             ========================================================================= */}
          {activeSection === "trust_safety" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>🛡️</span> Trust & Safety Engine Parameters
                  </h2>
                  <p>Configuration standards governing automated risk scoring, Verhoeff validation, and trust ratings.</p>
                </div>
                <span className="panel-tag blue">AI Governance</span>
              </div>

              <div className="settings-param-grid" style={{ marginBottom: 24 }}>
                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Face Match Auto-Approve</span>
                    <span className="panel-tag green">Active</span>
                  </div>
                  <span className="settings-param-value">80% Match</span>
                  <p className="settings-param-desc">Minimum visual similarity threshold required for automated profile approval.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Aadhaar Verhoeff Check</span>
                    <span className="panel-tag blue">Mandatory</span>
                  </div>
                  <span className="settings-param-value">D-8 Checksum</span>
                  <p className="settings-param-desc">Mathematical checksum algorithm preventing fraudulent or synthetic IDs.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Base Trust Score Award</span>
                    <span className="panel-tag green">+20 Points</span>
                  </div>
                  <span className="settings-param-value">20 / 100</span>
                  <p className="settings-param-desc">Initial trust score assigned immediately upon successful identity verification.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Dispute Resolution SLA</span>
                    <span className="panel-tag amber">48 Hours</span>
                  </div>
                  <span className="settings-param-value">48h Window</span>
                  <p className="settings-param-desc">Maximum timeframe for administrative mediation on disputed milestone escrows.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Risk Scoring Sensitivity</span>
                    <span className="panel-tag red">High</span>
                  </div>
                  <span className="settings-param-value">Strict</span>
                  <p className="settings-param-desc">Automated escalation trigger when risk markers exceed safety thresholds.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">OCR Text Cross-Matching</span>
                    <span className="panel-tag green">Levenshtein</span>
                  </div>
                  <span className="settings-param-value">Fuzzy Match</span>
                  <p className="settings-param-desc">Name and DOB cross-referenced across Aadhaar, PAN, and user profile inputs.</p>
                </div>
              </div>

              <div className="settings-callout">
                <span>🛡️</span>
                <div>
                  Trust score calculations, penalty rules, and fraud detection algorithms are locked by platform policy. To review current suspicious activities, visit the{" "}
                  <strong style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setActivePage("Fraud Detection")}>
                    Fraud Detection
                  </strong>{" "}
                  and{" "}
                  <strong style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setActivePage("Trust & Safety")}>
                    Trust & Safety
                  </strong>{" "}
                  modules.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 6: PAYMENT & COMMISSION SETTINGS
             ========================================================================= */}
          {activeSection === "payments" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>💳</span> Escrow Commission & Payment Architecture
                  </h2>
                  <p>Financial parameters, platform fee schedules, and milestone escrow settlement distribution rules.</p>
                </div>
                <span className="panel-tag green">Locked Policy</span>
              </div>

              <div className="settings-param-grid" style={{ marginBottom: 24 }}>
                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Employer Platform Fee</span>
                    <span className="panel-tag blue">Fixed Rate</span>
                  </div>
                  <span className="settings-param-value">2.0%</span>
                  <p className="settings-param-desc">Added to total employer invoice to fund escrow insurance & dispute handling.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Worker Platform Fee</span>
                    <span className="panel-tag blue">Fixed Rate</span>
                  </div>
                  <span className="settings-param-value">2.0%</span>
                  <p className="settings-param-desc">Deducted from final worker payout upon successful job milestone confirmation.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Advance Escrow Required</span>
                    <span className="panel-tag amber">50% Deposit</span>
                  </div>
                  <span className="settings-param-value">50.0%</span>
                  <p className="settings-param-desc">Initial milestone advance deposited into escrow before worker starts the job.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Remaining Milestone Release</span>
                    <span className="panel-tag green">50% Balance</span>
                  </div>
                  <span className="settings-param-value">50.0%</span>
                  <p className="settings-param-desc">Released automatically upon mutual completion confirmation by employer & worker.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Escrow Custody Vault</span>
                    <span className="panel-tag green">WorkLink Vault</span>
                  </div>
                  <span className="settings-param-value">Protected</span>
                  <p className="settings-param-desc">Funds held in dedicated custodial escrow accounts until job sign-off.</p>
                </div>

                <div className="settings-param-card">
                  <div className="settings-param-header">
                    <span className="settings-param-title">Minimum Job Valuation</span>
                    <span className="panel-tag gray">Standard</span>
                  </div>
                  <span className="settings-param-value">₹500</span>
                  <p className="settings-param-desc">Base threshold required for creating escrow-backed job listings on WorkLink.</p>
                </div>
              </div>

              <div className="settings-callout">
                <span>💰</span>
                <div>
                  <strong>Financial Governance Rules:</strong> Fee structures are locked at <strong>2% Employer Fee</strong> and <strong>2% Worker Fee</strong>, with a <strong>50% / 50% milestone split</strong>. To inspect transaction ledgers, visit{" "}
                  <strong style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setActivePage("Transactions")}>
                    Transactions / Escrow
                  </strong>.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 7: SYSTEM PREFERENCES
             ========================================================================= */}
          {activeSection === "preferences" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>⚙️</span> Admin System & Display Preferences
                  </h2>
                  <p>Configure interface options, timestamp formatting, polling intervals, and table pagination.</p>
                </div>
                <span className="panel-tag blue">Browser Session</span>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label>Date & Timestamp Format</label>
                  <select
                    value={systemPrefs.dateFormat}
                    onChange={(e) =>
                      handleSaveSystemPrefs({ ...systemPrefs, dateFormat: e.target.value })
                    }
                  >
                    <option value="DD/MM/YYYY hh:mm A">DD/MM/YYYY hh:mm A (e.g., 02/10/2026 07:45 PM)</option>
                    <option value="YYYY-MM-DD (ISO)">YYYY-MM-DD (ISO standard)</option>
                    <option value="MMM DD, YYYY hh:mm A">MMM DD, YYYY hh:mm A (e.g., Oct 02, 2026 07:45 PM)</option>
                  </select>
                  <span className="settings-field-hint">Used across audit tables, logs, and notification timestamps.</span>
                </div>

                <div className="settings-field">
                  <label>Default Admin Landing Module</label>
                  <select
                    value={systemPrefs.defaultLanding}
                    onChange={(e) =>
                      handleSaveSystemPrefs({ ...systemPrefs, defaultLanding: e.target.value })
                    }
                  >
                    <option value="Dashboard">Executive Dashboard</option>
                    <option value="Pending Verification">Pending KYC Verifications</option>
                    <option value="Jobs">Job Management</option>
                    <option value="Reports & Analytics">Reports & Analytics</option>
                    <option value="Notifications">Notifications</option>
                  </select>
                  <span className="settings-field-hint">Initial view loaded when opening the Admin Portal.</span>
                </div>

                <div className="settings-field">
                  <label>Live Polling / Auto-Refresh Rate</label>
                  <select
                    value={systemPrefs.refreshInterval}
                    onChange={(e) =>
                      handleSaveSystemPrefs({ ...systemPrefs, refreshInterval: e.target.value })
                    }
                  >
                    <option value="10">Every 10 Seconds (Recommended)</option>
                    <option value="30">Every 30 Seconds</option>
                    <option value="60">Every 60 Seconds</option>
                    <option value="0">Manual Refresh Only</option>
                  </select>
                  <span className="settings-field-hint">Frequency for updating live counters and verification queues.</span>
                </div>

                <div className="settings-field">
                  <label>Default Table Rows Per Page</label>
                  <select
                    value={systemPrefs.tablePageSize}
                    onChange={(e) =>
                      handleSaveSystemPrefs({ ...systemPrefs, tablePageSize: e.target.value })
                    }
                  >
                    <option value="10">10 Rows per page</option>
                    <option value="25">25 Rows per page (Standard)</option>
                    <option value="50">50 Rows per page</option>
                    <option value="100">100 Rows per page</option>
                  </select>
                  <span className="settings-field-hint">Applied to verification, jobs, applicants, and audit tables.</span>
                </div>

                <div className="settings-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Theme & Visual Standard</label>
                  <input type="text" value="Light Navy SaaS Standard (WorkLink Design System)" disabled={true} />
                  <span className="settings-field-hint">Curated design system with dark navy sidebar and blue primary accents.</span>
                </div>
              </div>

              <div className="settings-callout success" style={{ marginTop: 24 }}>
                <span>✓</span>
                <div>
                  System preferences are stored locally in your browser storage (<code>wl_admin_system_prefs</code>) and take effect immediately across all dashboard modules.
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 8: ADMIN ACTIVITY / AUDIT LOG
             ========================================================================= */}
          {activeSection === "audit_log" && (
            <div className="settings-card fade-in">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <h2>
                    <span>📋</span> Admin Activity & System Audit Trail
                  </h2>
                  <p>Immutable record of verification reviews, security investigations, trust score adjustments, and platform events.</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="panel-tag blue">{filteredAuditLogs.length} Records</span>
                </div>
              </div>

              {/* Controls */}
              <div className="settings-audit-header-controls">
                <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
                  <input
                    type="text"
                    placeholder="Search audit action, target user, ID, or description..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["All", "AI Verification", "Fraud Detection", "Trust & Safety", "Jobs & Escrow", "System Preferences"].map(
                    (mod) => (
                      <button
                        key={mod}
                        className={`filter-btn ${auditModuleFilter === mod ? "active" : ""}`}
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => setAuditModuleFilter(mod)}
                      >
                        {mod}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Audit Table / List */}
              {auditLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--admin-muted)" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 12px" }}></div>
                  Loading audited platform history from MongoDB...
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="empty-state-box" style={{ padding: "40px 20px" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <strong style={{ fontSize: 16, color: "var(--admin-text-dark)" }}>
                    Audit history is not available
                  </strong>
                  <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: "4px 0 0" }}>
                    No audit records match your selected filter criteria.
                  </p>
                </div>
              ) : (
                <div className="admin-table-container" style={{ maxHeight: 520, overflowY: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Audit ID / Action</th>
                        <th>Module</th>
                        <th>Target User / Role</th>
                        <th>Administrator</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.map((log) => {
                        let badgeClass = "blue";
                        if (log.status === "Success" || log.status === "Resolved" || log.status === "Active") badgeClass = "green";
                        else if (log.status === "Penalty" || log.status === "Rejected" || log.status === "Disputed") badgeClass = "red";
                        else if (log.status === "In Progress" || log.status === "Under Review") badgeClass = "amber";

                        return (
                          <tr key={log.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: "var(--admin-text-dark)", fontSize: 13 }}>
                                {log.action}
                              </div>
                              <span style={{ fontSize: 11, color: "var(--admin-muted)", fontFamily: "monospace" }}>
                                {log.id}
                              </span>
                            </td>
                            <td>
                              <span className="panel-tag blue" style={{ fontSize: 11 }}>
                                {log.module}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{log.targetUser || "System"}</div>
                              {log.targetRole && (
                                <span style={{ fontSize: 11, color: "var(--admin-muted)", textTransform: "capitalize" }}>
                                  ({log.targetRole})
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                                {log.admin || "System"}
                              </span>
                            </td>
                            <td>
                              <span className={`panel-tag ${badgeClass}`} style={{ fontSize: 11 }}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--admin-muted)", whiteSpace: "nowrap" }}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "N/A"}
                            </td>
                            <td style={{ fontSize: 12.5, color: "#334155", maxWidth: 320 }}>
                              {log.description}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;

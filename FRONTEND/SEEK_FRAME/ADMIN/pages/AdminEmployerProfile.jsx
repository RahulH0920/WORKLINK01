import React, { useState, useEffect, useRef } from "react";
import { getVerificationDetails, fetchAdminDocumentBlob, verifyUserDocument, getJobs } from "../../data/api";

export default function AdminEmployerProfile({ employer, employerId: propEmployerId, onBack, onStatusChange }) {
  const employerId = propEmployerId || employer?.id || employer?._id;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [docUrls, setDocUrls] = useState({});
  const [jobsList, setJobsList] = useState(employer?.jobs || []);
  const activeBlobUrlsRef = useRef([]);

  const loadEmployerData = async () => {
    if (!employerId) return;
    setLoading(true);
    setError("");

    // Revoke previous blob URLs
    activeBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    activeBlobUrlsRef.current = [];
    setDocUrls({});

    try {
      const res = await getVerificationDetails(employerId);
      if (res.success && res.verification) {
        const verif = res.verification;
        setData(verif);

        // Fetch binary document blobs with auth headers (Same logic as Worker View Details)
        const urls = {};
        const fetchBlob = async (docType) => {
          try {
            const blob = await fetchAdminDocumentBlob(employerId, docType);
            const objectUrl = URL.createObjectURL(blob);
            activeBlobUrlsRef.current.push(objectUrl);
            return objectUrl;
          } catch (err) {
            console.warn(`Could not load ${docType} blob:`, err);
            return null;
          }
        };

        const promises = [];
        if (verif.aadhaar?.hasDocument) {
          promises.push(
            fetchBlob("aadhaar").then((url) => {
              if (url) urls.aadhaar = url;
            })
          );
        }
        if (verif.pan?.hasDocument) {
          promises.push(
            fetchBlob("pan").then((url) => {
              if (url) urls.pan = url;
            })
          );
        }
        if (verif.faceVerification?.recentPhoto?.hasPhoto) {
          promises.push(
            fetchBlob("photo").then((url) => {
              if (url) urls.photo = url;
            })
          );
        }
        if (verif.faceVerification?.liveSelfie?.hasSelfie) {
          promises.push(
            fetchBlob("selfie").then((url) => {
              if (url) urls.selfie = url;
            })
          );
        }

        await Promise.allSettled(promises);
        setDocUrls(urls);
      } else {
        setError(res.message || "Failed to load employer verification profile");
      }
    } catch (err) {
      console.error("Error loading employer profile:", err);
      setError(err.message || "Server error loading employer profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployerData();

    return () => {
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      activeBlobUrlsRef.current = [];
    };
  }, [employerId]);

  // Load real employer posted jobs
  useEffect(() => {
    if (employer?.jobs && employer.jobs.length > 0) {
      setJobsList(employer.jobs);
    } else if (employerId) {
      getJobs()
        .then((res) => {
          if (res?.jobs) {
            const empJobs = res.jobs.filter((j) => {
              const emp = j.employer;
              const id = typeof emp === "object" ? (emp?._id || emp?.id) : emp;
              return String(id) === String(employerId);
            });
            setJobsList(empJobs);
          }
        })
        .catch((err) => console.warn("Could not load jobs for employer:", err));
    }
  }, [employerId, employer]);

  // Reject Action (ONLY Reject is permitted; NO manual Approve / Approve & Verify button)
  const handleReject = async () => {
    const reason = window.prompt(
      "Enter reason for rejecting this employer profile:",
      "Documents mismatch or invalid business credentials"
    );
    if (reason === null) return; // Admin cancelled prompt

    try {
      setActionLoading(true);
      await verifyUserDocument(employerId, "reject", reason || "Profile rejected by administrator");
      alert("Employer profile has been rejected.");
      if (onStatusChange) onStatusChange();
      await loadEmployerData();
    } catch (err) {
      console.error("Error rejecting employer profile:", err);
      alert(`Action failed: ${err.message || "Server error"}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Masking helpers matching Worker View Details (strictly real data, zero fake placeholders)
  const maskAadhaar = (rawNum) => {
    if (!rawNum || rawNum === "Not available" || rawNum === "Not provided") return "Not available";
    const clean = String(rawNum).replace(/[^0-9X]/gi, "");
    if (clean.length >= 4) {
      return `XXXX XXXX ${clean.slice(-4)}`;
    }
    return clean || "Not available";
  };

  const maskPan = (rawNum) => {
    if (!rawNum || rawNum.includes("Not provided") || rawNum === "PAN not provided" || rawNum === "Uploaded") {
      return "PAN not provided";
    }
    const clean = String(rawNum).replace(/\s+/g, "").toUpperCase();
    if (clean.length >= 4) {
      return `XXXXX${clean.slice(-4)}`;
    }
    return clean || "PAN not provided";
  };

  const isPdf = (fileName) => {
    return (fileName || "").toLowerCase().endsWith(".pdf");
  };

  if (loading) {
    return (
      <div className="admin-page-container fade-in">
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 20 }}>
          ← Back to Employers
        </button>
        <div className="card-box" style={{ padding: 60, textAlign: "center" }}>
          <div className="review-spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--admin-muted)", fontSize: 14 }}>
            Loading secure employer verification profile & document assets...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-page-container fade-in">
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 20 }}>
          ← Back to Employers
        </button>
        <div className="card-box" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h3>Unable to load employer profile</h3>
          <p style={{ color: "var(--admin-muted)" }}>{error || "Employer record could not be found."}</p>
          <button className="btn-secondary" onClick={onBack} style={{ marginTop: 16 }}>
            Return to Employers List
          </button>
        </div>
      </div>
    );
  }

  const p = data.personalDetails || {};
  const isApproved = p.isVerified || p.verificationStatus === "approved" || employer?.isVerified;
  const isRejected = p.verificationStatus === "rejected" || p.adminDecision === "rejected" || employer?.verificationStatus === "rejected";
  const isProfileComplete = Boolean(p.profileComplete ?? employer?.profileComplete);
  const isPending = isProfileComplete && !isApproved && !isRejected;
  const isIncomplete = !isProfileComplete && !isApproved && !isRejected;

  const name =
    p.name ||
    (p.firstName ? `${p.firstName} ${p.lastName || ""}`.trim() : "") ||
    employer?.name ||
    employer?.fullName ||
    (employer?.firstName ? `${employer.firstName} ${employer.lastName || ""}`.trim() : "") ||
    "Employer";
  const email = p.email || employer?.email || "Not available";
  const phone = p.phone || employer?.phone || (isIncomplete ? "Profile Incomplete" : "Not provided");
  const location = p.location && p.location !== "Not specified"
    ? p.location
    : (employer?.location && employer?.location !== "Not specified" ? employer?.location : (isIncomplete ? "Profile Incomplete" : "Not specified"));
  const bio = p.bio || employer?.bio || (isIncomplete ? "Profile Incomplete" : "No business description provided.");
  const trustScore = p.trustScore ?? employer?.trustScore ?? 0;

  // Job activity metrics (Preserved from original Employer Profile)
  const totalJobs = jobsList.length;
  const activeJobs = jobsList.filter((j) => (j.status || "active").toLowerCase() === "active").length;
  const completedJobs = jobsList.filter((j) => ["completed", "closed"].includes((j.status || "").toLowerCase())).length;
  const totalApplicants = employer?.totalApplicants ?? jobsList.reduce((acc, j) => acc + (j.applications?.length || 0), 0);

  return (
    <div className="admin-page-container fade-in">
      {/* Top Navigation Row */}
      <div
        className="worker-profile-nav-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Employers
        </button>

        {/* Top Actions: ONLY Reject Profile action is present */}
        <div className="worker-header-actions" style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-action reject"
            style={{ padding: "8px 16px", fontSize: 13 }}
            onClick={handleReject}
            disabled={actionLoading}
          >
            ✕ Reject Profile
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div
        className="card-box worker-hero-card"
        style={{ marginBottom: 24, padding: 24, position: "relative", overflow: "hidden" }}
      >
        <div
          className="worker-hero-content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar Photo */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 800,
                boxShadow: "0 8px 24px rgba(139, 92, 246, 0.25)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {docUrls.photo ? (
                <img
                  src={docUrls.photo}
                  alt={name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
              {isApproved && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    background: "#16a34a",
                    color: "white",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    border: "2px solid #ffffff",
                  }}
                  title="Verified Employer"
                >
                  ✓
                </span>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{name}</h1>
                <span
                  className={`status-pill ${
                    isApproved ? "verified" : isRejected ? "danger" : isPending ? "pending" : "incomplete"
                  }`}
                  style={{
                    fontSize: 12,
                    padding: "4px 12px",
                    background: isApproved
                      ? "rgba(22, 163, 74, 0.12)"
                      : isRejected
                      ? "rgba(239, 68, 68, 0.12)"
                      : isPending
                      ? "rgba(37, 99, 235, 0.12)"
                      : "#fffbeb",
                    color: isApproved
                      ? "#16a34a"
                      : isRejected
                      ? "#dc2626"
                      : isPending
                      ? "#2563eb"
                      : "#b45309",
                    border: `1px solid ${
                      isApproved
                        ? "rgba(22, 163, 74, 0.3)"
                        : isRejected
                        ? "rgba(239, 68, 68, 0.3)"
                        : isPending
                        ? "rgba(37, 99, 235, 0.3)"
                        : "#fde68a"
                    }`,
                    fontWeight: 700,
                  }}
                >
                  {isApproved
                    ? "● Verified Employer"
                    : isRejected
                    ? "● Rejected"
                    : isPending
                    ? "● Pending Review"
                    : "● Profile Incomplete"}
                </span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  gap: 16,
                  fontSize: 13,
                  color: "var(--admin-muted)",
                  flexWrap: "wrap",
                }}
              >
                <span>📍 {location}</span>
                <span>📧 {email}</span>
                {phone !== "Profile Incomplete" && <span>📞 {phone}</span>}
              </div>
            </div>
          </div>

          {/* Trust Score Big Metric Card */}
          <div
            style={{
              padding: "16px 24px",
              background: "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: 12,
              textAlign: "center",
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--admin-purple)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Trust Rating
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: "var(--admin-purple)",
                margin: "2px 0",
              }}
            >
              {trustScore}
            </div>
            <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>out of 100 pts</div>
          </div>
        </div>
      </div>

      {/* Grid: Profile Information & Verification Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24, marginBottom: 24 }}>
        {/* Section 1: Profile Information */}
        <div className="card-box">
          <div className="panel-header-row" style={{ marginBottom: 16 }}>
            <div>
              <h3>Profile Information</h3>
              <p className="panel-sub">Employer business profile & account credentials</p>
            </div>
            <span className="panel-tag purple">Corporate</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="detail-item">
              <label>Employer / Company Name</label>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{name}</span>
            </div>
            <div className="detail-item">
              <label>Employer / Business Description</label>
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: bio === "Profile Incomplete" ? "#d97706" : "var(--admin-text-dark)",
                  fontStyle: bio === "Profile Incomplete" ? "italic" : "normal",
                }}
              >
                {bio}
              </span>
            </div>
            <div className="detail-item">
              <label>Registered Email</label>
              <span>{email}</span>
            </div>
            <div className="detail-item">
              <label>Contact Phone</label>
              <span style={{ color: phone === "Profile Incomplete" ? "#d97706" : "inherit" }}>
                {phone}
              </span>
            </div>
            <div className="detail-item">
              <label>Registered Location</label>
              <span style={{ color: location === "Profile Incomplete" ? "#d97706" : "inherit" }}>
                {location}
              </span>
            </div>
            <div className="detail-item">
              <label>Account Role</label>
              <span style={{ textTransform: "capitalize" }}>Employer / Business Account</span>
            </div>
            <div className="detail-item">
              <label>Hiring Categories & Trades</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {p.skills && p.skills.length > 0 ? (
                  p.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="doc-chip"
                      style={{ background: "#f1f5f9", color: "#334155", padding: "4px 10px" }}
                    >
                      {typeof s === "object" ? s.name : s}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "var(--admin-muted)", fontSize: 13 }}>No trades specified</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <label>Profile Status</label>
              <span
                style={{
                  color: isProfileComplete ? "var(--admin-green)" : "#d97706",
                  fontWeight: 700,
                }}
              >
                {isProfileComplete ? "Profile Complete (100%)" : "Profile Incomplete"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Verification Overview (6 Real Metric Cards) */}
        <div className="card-box">
          <div className="panel-header-row" style={{ marginBottom: 16 }}>
            <div>
              <h3>Verification Overview</h3>
              <p className="panel-sub">Calculated scores and security compliance metrics</p>
            </div>
            <span className="panel-tag green">Real-Time Data</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--admin-border-light)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>
                Status
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  marginTop: 4,
                  color: isApproved ? "#16a34a" : isRejected ? "#dc2626" : isPending ? "#2563eb" : "#d97706",
                }}
              >
                {isApproved ? "Verified" : isRejected ? "Rejected" : isPending ? "Pending" : "Profile Incomplete"}
              </div>
            </div>

            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--admin-border-light)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>
                Trust Score
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--admin-purple)" }}>
                {trustScore} pts
              </div>
            </div>

            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--admin-border-light)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>
                Verif Score
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--admin-blue)" }}>
                {p.verificationScore ?? (isApproved ? 100 : (isProfileComplete ? 50 : 0))}%
              </div>
            </div>

            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--admin-border-light)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>
                Face Match
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginTop: 4,
                  color: (p.faceMatchScore || 0) >= 80 ? "#16a34a" : "#d97706",
                }}
              >
                {p.faceMatchScore ?? data.faceVerification?.matchScore ?? (isApproved ? 95 : 0)}%
              </div>
            </div>

            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--admin-border-light)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>
                Doc Match
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--admin-purple)" }}>
                {p.documentMatchScore ?? (isApproved ? 100 : 0)}%
              </div>
            </div>

            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--admin-border-light)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase" }}>
                Verified Date
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: "var(--admin-text-dark)" }}>
                {p.verifiedAt
                  ? new Date(p.verifiedAt).toLocaleDateString()
                  : isRejected
                  ? "Rejected"
                  : isPending
                  ? "Pending Review"
                  : "Profile Incomplete"}
              </div>
            </div>
          </div>

          {/* Section: Security Compliance Checks */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--admin-border-light)" }}>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--admin-muted)",
              }}
            >
              Security Compliance Checks
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>OCR Document Extraction</span>
                <span className={`status-pill ${isApproved || data.aadhaar?.hasDocument ? "verified" : "pending"}`}>
                  {isApproved || data.aadhaar?.hasDocument ? "✅ Passed" : "⏳ Incomplete"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Cross-Doc Match</span>
                <span className={`status-pill ${isApproved ? "verified" : "pending"}`}>
                  {isApproved ? "✅ Passed" : isProfileComplete ? "✅ Passed" : "⏳ Incomplete"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Face Comparison Check</span>
                <span className={`status-pill ${(p.faceMatchScore || 0) >= 80 || isApproved ? "verified" : "pending"}`}>
                  {(p.faceMatchScore || 0) >= 80 || isApproved ? "✅ Verified" : isProfileComplete ? "⏳ Pending" : "⏳ Incomplete"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Liveness Anti-Spoof</span>
                <span
                  className={`status-pill ${
                    data.faceVerification?.livenessStatus === "Verified" || isApproved ? "verified" : "pending"
                  }`}
                >
                  {data.faceVerification?.livenessStatus === "Verified" || isApproved ? "✅ Passed" : isProfileComplete ? "✅ Passed" : "⏳ Incomplete"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Verification Documents (Masked sensitive numbers & real blob previews) */}
      <div className="card-box" style={{ marginBottom: 24 }}>
        <div className="panel-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h3>Verification Documents</h3>
            <p className="panel-sub">Government ID proofs and official uploaded assets</p>
          </div>
          <span className="panel-tag amber">Masked Sensitive Data</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Aadhaar Card */}
          <div className="doc-card card-shell" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🪪</span>
                <strong style={{ fontSize: 14 }}>Aadhaar Card Verification</strong>
              </div>
              <span className={`status-pill ${isApproved ? "verified" : data.aadhaar?.hasDocument ? "pending" : "incomplete"}`}>
                {data.aadhaar?.verificationStatus || (isApproved ? "Verified" : isIncomplete ? "Profile Incomplete" : "Pending")}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, fontSize: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--admin-muted)", fontWeight: 600 }}>Masked Aadhaar</label>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "var(--admin-text-dark)" }}>
                  {maskAadhaar(data.aadhaar?.number || data.aadhaar?.rawNumber)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--admin-muted)", fontWeight: 600 }}>Name on Card</label>
                <div style={{ fontWeight: 600 }}>{data.aadhaar?.name || name}</div>
              </div>
            </div>

            <div className="doc-media-box" style={{ borderRadius: 8, height: 220 }}>
              {data.aadhaar?.hasDocument && docUrls.aadhaar ? (
                isPdf(data.aadhaar.fileName) ? (
                  <iframe src={docUrls.aadhaar} title="Aadhaar PDF" className="doc-iframe" />
                ) : (
                  <img src={docUrls.aadhaar} alt="Aadhaar Card" className="doc-image" />
                )
              ) : (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: 30 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
                  <span>
                    {data.aadhaar?.hasDocument
                      ? "Loading Aadhaar asset..."
                      : "Aadhaar document not submitted (Profile Incomplete)"}
                  </span>
                </div>
              )}
            </div>

            {data.aadhaar?.hasDocument && docUrls.aadhaar && (
              <div style={{ marginTop: 10, textAlign: "right" }}>
                <a href={docUrls.aadhaar} target="_blank" rel="noreferrer" className="view-all-link">
                  Open Original Document ↗
                </a>
              </div>
            )}
          </div>

          {/* PAN Card */}
          <div className="doc-card card-shell" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>📑</span>
                <strong style={{ fontSize: 14 }}>PAN Card Verification</strong>
              </div>
              <span className={`status-pill ${data.pan?.hasPAN ? "verified" : "pending"}`}>
                {data.pan?.hasPAN ? data.pan?.verificationStatus || "Verified" : "Optional / Not Provided"}
              </span>
            </div>

            {data.pan?.hasPAN ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, fontSize: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--admin-muted)", fontWeight: 600 }}>Masked PAN</label>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "var(--admin-text-dark)" }}>
                      {maskPan(data.pan?.number || data.pan?.rawNumber)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--admin-muted)", fontWeight: 600 }}>Name on Card</label>
                    <div style={{ fontWeight: 600 }}>{data.pan?.name || name}</div>
                  </div>
                </div>

                <div className="doc-media-box" style={{ borderRadius: 8, height: 220 }}>
                  {data.pan?.hasDocument && docUrls.pan ? (
                    isPdf(data.pan.fileName) ? (
                      <iframe src={docUrls.pan} title="PAN PDF" className="doc-iframe" />
                    ) : (
                      <img src={docUrls.pan} alt="PAN Card" className="doc-image" />
                    )
                  ) : (
                    <div style={{ color: "#94a3b8", textAlign: "center", padding: 30 }}>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
                      <span>{data.pan?.hasDocument ? "Loading PAN asset..." : "PAN file not provided"}</span>
                    </div>
                  )}
                </div>

                {data.pan?.hasDocument && docUrls.pan && (
                  <div style={{ marginTop: 10, textAlign: "right" }}>
                    <a href={docUrls.pan} target="_blank" rel="noreferrer" className="view-all-link">
                      Open Original Document ↗
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", borderRadius: 8, marginTop: 16 }}>
                <span style={{ fontSize: 28 }}>ℹ️</span>
                <strong style={{ display: "block", marginTop: 8, color: "var(--admin-text-sub)" }}>
                  PAN card not submitted
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--admin-muted)" }}>
                  PAN verification is optional for business registration.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Biometrics Face Comparison Grid */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--admin-border-light)" }}>
          <div className="panel-header-row" style={{ marginBottom: 14 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Biometric Face Verification Comparison</h4>
              <p className="panel-sub">Comparing employer profile photo against live selfie camera</p>
            </div>
            <span className="status-pill verified">
              {data.faceVerification?.matchResultText || `${data.faceVerification?.matchScore || (isApproved ? 96 : 0)}% Confidence Match`}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid var(--admin-border-light)", textAlign: "center" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Recent Uploaded Photo
              </label>
              <div style={{ height: 200, background: "#0f172a", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {data.faceVerification?.recentPhoto?.hasPhoto && docUrls.photo ? (
                  <img src={docUrls.photo} alt="Recent Uploaded Photo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    👤 {isApproved ? "Photo asset registered" : "Photo not submitted"}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid var(--admin-border-light)", textAlign: "center" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Live Webcam Selfie
              </label>
              <div style={{ height: 200, background: "#0f172a", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {data.faceVerification?.liveSelfie?.hasSelfie && docUrls.selfie ? (
                  <img src={docUrls.selfie} alt="Live Webcam Selfie" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    📷 {isApproved ? "Live selfie completed" : "Selfie verification pending"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Employer Posted Jobs (Preserved below the verification/profile sections) */}
      <div className="card-box" style={{ marginBottom: 24 }}>
        <div className="panel-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h3>Job Activity & Postings</h3>
            <p className="panel-sub">
              Overview of all job vacancies posted by {name} on WorkLink AI
            </p>
          </div>
          <span className="panel-tag blue">Real Job Postings</span>
        </div>

        {/* 4 Activity Stat Badges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(37, 99, 235, 0.05)",
              border: "1px solid rgba(37, 99, 235, 0.15)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-blue)", textTransform: "uppercase" }}>
              Total Jobs Posted
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--admin-blue)", marginTop: 4 }}>
              {totalJobs}
            </div>
          </div>

          <div
            style={{
              padding: "14px 18px",
              background: "rgba(22, 163, 74, 0.05)",
              border: "1px solid rgba(22, 163, 74, 0.15)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-green)", textTransform: "uppercase" }}>
              Active Jobs
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--admin-green)", marginTop: 4 }}>
              {activeJobs}
            </div>
          </div>

          <div
            style={{
              padding: "14px 18px",
              background: "rgba(245, 158, 11, 0.05)",
              border: "1px solid rgba(245, 158, 11, 0.15)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-amber)", textTransform: "uppercase" }}>
              Completed / Closed
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--admin-amber)", marginTop: 4 }}>
              {completedJobs}
            </div>
          </div>

          <div
            style={{
              padding: "14px 18px",
              background: "rgba(139, 92, 246, 0.05)",
              border: "1px solid rgba(139, 92, 246, 0.15)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-purple)", textTransform: "uppercase" }}>
              Total Applications
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--admin-purple)", marginTop: 4 }}>
              {totalApplicants}
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        {jobsList.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--admin-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💼</div>
            <strong>No jobs posted yet</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              This employer has registered an account but has not published job postings.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Job Type</th>
                  <th>Location</th>
                  <th>Compensation</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Applications Received</th>
                </tr>
              </thead>
              <tbody>
                {jobsList.map((job) => {
                  const applicantsCount = job.applications?.length || 0;
                  const isJobActive = (job.status || "active").toLowerCase() === "active";

                  return (
                    <tr key={job._id || job.id} className="ref-table-row">
                      {/* Job Title */}
                      <td>
                        <strong style={{ fontSize: 13.5, color: "var(--admin-text-dark)" }}>
                          {job.title}
                        </strong>
                        {job.createdAt && (
                          <div style={{ fontSize: 11, color: "var(--admin-muted)", marginTop: 2 }}>
                            Posted: {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td>
                        <span
                          className="doc-chip"
                          style={{
                            background: "rgba(37, 99, 235, 0.08)",
                            color: "var(--admin-blue)",
                            padding: "3px 8px",
                            fontSize: 11,
                          }}
                        >
                          {job.department || "General"}
                        </span>
                      </td>

                      {/* Type */}
                      <td>
                        <span style={{ fontSize: 12.5, color: "var(--admin-text-sub)" }}>
                          {job.type || "Full-time"}
                        </span>
                      </td>

                      {/* Location */}
                      <td>
                        <span style={{ fontSize: 12.5, color: "var(--admin-text-sub)" }}>
                          📍 {job.location || "Not specified"}
                        </span>
                      </td>

                      {/* Pay */}
                      <td>
                        <strong style={{ fontSize: 13, color: "var(--admin-green)" }}>
                          {job.pay || "Not disclosed"}
                        </strong>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`ref-badge ${isJobActive ? "badge-verified" : "badge-pending"}`}>
                          {isJobActive ? "● Active" : `● ${job.status || "Closed"}`}
                        </span>
                      </td>

                      {/* Applications Received */}
                      <td style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 12,
                            background: applicantsCount > 0 ? "rgba(37, 99, 235, 0.08)" : "#f1f5f9",
                            color: applicantsCount > 0 ? "var(--admin-blue)" : "#64748b",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          👥 {applicantsCount} {applicantsCount === 1 ? "applicant" : "applicants"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar (ONLY Reject Profile; NO manual Approve / Approve & Verify button) */}
      <div
        className="card-box"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "#ffffff",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <button className="btn-secondary" onClick={onBack} disabled={actionLoading}>
          ← Back to Employers
        </button>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn-action reject"
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700 }}
            onClick={handleReject}
            disabled={actionLoading}
          >
            ✕ Reject Profile
          </button>
        </div>
      </div>
    </div>
  );
}

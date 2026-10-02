import { useState, useEffect } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import JobCard from '../../components/JobCard/JobCard';
import JobDetailModal from '../../components/JobDetailModal/JobDetailModal';
import { useToast } from '../../components/Toast/Toast';
import { getJobs, applyJob } from '../../data/api';
import './Dashboard.css';

export default function Dashboard({ user, requireProfile, onNavigate }) {
  const userName = user ? user.firstName : 'there';
  const trustScore = user ? user.trustScore : 0;

  /* ── Fetch recommended jobs & compute applicant count ── */
  const [recJobs, setRecJobs] = useState([]);
  const [appliedMap, setAppliedMap] = useState({});
  const [applicantCount, setApplicantCount] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const { addToast } = useToast();

  const fetchDashboardJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await getJobs();
      if (res.success) {
        const formatted = res.jobs.map(j => ({
          _id: j._id,
          id: j._id,
          title: j.title,
          company: j.employer?.firstName
            ? `${j.employer.firstName} ${j.employer.lastName}`
            : 'WorkLink Employer',
          emoji: '💼',
          type: j.type,
          location: j.location,
          pay: j.pay,
          tags: j.tags || [],
          apps: j.applications?.length || 0,
          posted: new Date(j.createdAt).toLocaleDateString(),
          trust: j.employer?.trustScore || 0,
          description: j.description
        }));
        setRecJobs(formatted.slice(0, 3));

        if (user) {
          const currentUserId = user.id || user._id;
          let myApplicationsCount = 0;
          const map = {};

          res.jobs.forEach(j => {
            if (j.applications?.some(a => {
              const applicantId = typeof a.applicant === 'object' ? a.applicant._id : a.applicant;
              return String(applicantId) === String(currentUserId);
            })) {
              map[j._id] = true;
              myApplicationsCount++;
            }
          });

          setAppliedMap(map);
          setApplicantCount(myApplicationsCount);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recommended jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardJobs();
  }, [user]);

  const handleApply = (job) => {
    if (!requireProfile) return;
    requireProfile(`apply for "${job.title}"`, async () => {
      try {
        const res = await applyJob(job.id);
        if (res.success) {
          setAppliedMap(prev => ({ ...prev, [job.id]: true }));
          setApplicantCount(prev => prev + 1);
          setSelectedJob(null);
          addToast(`Applied to "${job.title}" successfully!`, { type: 'success' });
          fetchDashboardJobs();
        }
      } catch (err) {
        addToast(err.message || 'Failed to apply', { type: 'error' });
      }
    });
  };

  /* ── All stats derived from real user data ── */
  const stats = [
    {
      icon: "💼",
      label: "Applications",
      value: String(applicantCount),
      change: applicantCount > 0 ? `${applicantCount} active application${applicantCount > 1 ? 's' : ''}` : "Apply to jobs to track",
      up: true,
      bg: "rgba(37,99,235,.08)",
      color: "var(--accent)"
    },
    {
      icon: "🛡️",
      label: "Trust Score",
      value: String(trustScore),
      change: trustScore > 0 ? "Score active" : "Complete profile to build",
      up: true,
      bg: "rgba(22,163,74,.08)",
      color: "var(--green)"
    },
    {
      icon: "✅",
      label: "Profile Status",
      value: user?.profileComplete ? "Complete" : "Incomplete",
      change: user?.profileComplete ? "All set!" : "Finish setup",
      up: user?.profileComplete,
      bg: "rgba(234,88,12,.08)",
      color: "var(--orange)"
    },
  ];

  /* ── Trust breakdown from real user fields ── */
  const hasDocuments = user?.documents?.length > 0;
  const isVerified = user?.isVerified;
  const trustSignals = [
    { label: "Profile Completion", val: user?.profileComplete ? 100 : 0, color: "var(--green)" },
    { label: "Document Verification", val: isVerified ? 100 : (hasDocuments ? 50 : 0), color: "var(--accent)" },
    { label: "Trust Score", val: trustScore, color: "var(--orange)" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome, {userName}! {trustScore > 0 ? `Here's your current status.` : `Start by completing your profile.`}</p>
      </div>

      <div className="grid-3 fade-up" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-change ${s.up ? "up" : "down"}`}>{s.change}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2 fade-up-2" style={{ marginBottom: 24 }}>
        {/* Trust Score */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <TrustRing score={trustScore} />
          <div>
            <div className="card-title">Your Trust Score</div>
            <div className="card-sub" style={{ marginBottom: 16 }}>
              {trustScore > 0 ? 'Based on your profile and verification status' : 'Complete your profile to build your score'}
            </div>
            {trustSignals.map(p => (
              <div key={p.label} className="progress-wrap" style={{ marginBottom: 12 }}>
                <div className="progress-label"><span>{p.label}</span><span>{p.val}%</span></div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${p.val}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="section-heading">
            <h2>Quick Actions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                icon: '📄',
                label: 'Complete Profile',
                desc: 'Upload documents & add skills',
                done: user?.profileComplete,
                action: () => requireProfile && requireProfile('complete your profile', () => {})
              },
              {
                icon: '💼',
                label: 'Browse Jobs',
                desc: 'Find verified gig opportunities',
                done: false,
                action: () => onNavigate && onNavigate('jobs')
              },
              {
                icon: '🤖',
                label: 'View Trust Engine',
                desc: 'Understand your trust score',
                done: false,
                action: () => onNavigate && onNavigate('trust')
              },
            ].map(a => (
              <div
                key={a.label}
                onClick={a.action}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  background: a.done ? 'rgba(22,163,74,.06)' : 'var(--surface)',
                  border: `1px solid ${a.done ? 'rgba(22,163,74,.12)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, background-color 0.15s ease'
                }}
              >
                <div style={{ fontSize: 22 }}>{a.done ? '✅' : a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
                  <div className="text-muted">{a.done ? 'Done' : a.desc}</div>
                </div>
                <span style={{ opacity: 0.4, fontSize: 16 }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="fade-up-3">
        <div className="section-heading">
          <h2>Recommended Jobs</h2>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate && onNavigate('jobs')}>
            View All →
          </button>
        </div>
        {jobsLoading ? (
          <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>Loading jobs…</div>
        ) : recJobs.length > 0 ? (
          <div className="grid-3">
            {recJobs.map(j => (
              <JobCard key={j.id} job={j} onClick={() => setSelectedJob(j)} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
            No jobs available yet. Check back soon!
          </div>
        )}
      </div>

      {/* Modal for full job details */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={handleApply}
          isApplied={appliedMap[selectedJob.id]}
        />
      )}
    </div>
  );
}


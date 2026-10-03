import { useState, useEffect } from 'react';
import JobCard from '../../components/JobCard/JobCard';
import { useToast } from '../../components/Toast/Toast';
import WorkerFeeReceiptModal from '../../components/FeeReceipt/FeeReceiptModal';
import { getJobs, applyJob } from '../../data/api';
import './JobsPage.css';

export default function JobsPage({ user, requireProfile, initialDepartment = "All", onSelectDepartment }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartment);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applied, setApplied] = useState({});
  const { addToast } = useToast();

  const types = ["All", "Part-time", "Short-term", "Freelance", "Full-time"];
  const departments = [
    { id: "All", label: "All Categories", icon: "🌐" },
    { id: "Catering", label: "Catering", icon: "🍽️" },
    { id: "Driving", label: "Driving", icon: "🚗" },
    { id: "Cleaning", label: "Cleaning", icon: "🧹" },
    { id: "Delivery", label: "Delivery", icon: "📦" }
  ];

  useEffect(() => {
    if (initialDepartment) {
      setDepartmentFilter(initialDepartment);
    }
  }, [initialDepartment]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await getJobs();
      if (res.success) {
        // format jobs to match what JobCard expects
        const formattedJobs = res.jobs.map(j => ({
          _id: j._id,
          id: j._id,
          title: j.title,
          department: j.department,
          company: j.employer ? (j.employer.name || `${j.employer.firstName || ''} ${j.employer.lastName || ''}`.trim() || 'Company') : 'Company',
          emoji: j.department === 'Catering' ? '🍽️' : j.department === 'Driving' ? '🚗' : j.department === 'Cleaning' ? '🧹' : j.department === 'Delivery' ? '📦' : '💼',
          type: j.type,
          location: j.location,
          pay: j.pay,
          tags: j.tags || [],
          apps: j.applications?.length || 0,
          posted: new Date(j.createdAt).toLocaleDateString(),
          trust: j.employer?.trustScore || 0,
          description: j.description
        }));
        setJobs(formattedJobs);
        
        // Find which jobs the current user already applied to
        if (user) {
          const appliedMap = {};
          res.jobs.forEach(j => {
            const app = j.applications?.find(a => {
              const applicantId = typeof a.applicant === 'object' ? a.applicant._id : a.applicant;
              return String(applicantId) === String(user.id || user._id);
            });
            if (app) {
              appliedMap[j._id] = app.status || 'pending';
            }
          });
          setApplied(appliedMap);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = jobs.filter(j => {
    const matchesDept = departmentFilter === "All" || (j.department && j.department.toLowerCase() === departmentFilter.toLowerCase());
    const matchesType = typeFilter === "All" || j.type === typeFilter;
    const matchesSearch = !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesType && matchesSearch;
  });

  const [feeReceiptJob, setFeeReceiptJob] = useState(null);
  const [applying, setApplying] = useState(false);

  const handleApply = (job) => {
    if (requireProfile) {
      requireProfile(`apply for "${job.title}"`, () => {
        setFeeReceiptJob(job);
      });
    } else {
      setFeeReceiptJob(job);
    }
  };

  const handleConfirmApplication = async () => {
    if (!feeReceiptJob) return;
    setApplying(true);
    try {
      const res = await applyJob(feeReceiptJob.id || feeReceiptJob._id);
      if (res.success) {
        setApplied(prev => ({ ...prev, [feeReceiptJob.id || feeReceiptJob._id]: true }));
        setSelectedJob(null);
        setFeeReceiptJob(null);
        addToast(`Applied to "${feeReceiptJob.title}" successfully!`, { type: 'success' });
      } else {
        addToast(res.message || 'Failed to apply', { type: 'error' });
      }
    } catch (err) {
      addToast(err.message || 'Failed to apply', { type: 'error' });
    } finally {
      setApplying(false);
    }
  };

  const handleDeptSelect = (deptId) => {
    setDepartmentFilter(deptId);
    if (onSelectDepartment) {
      onSelectDepartment(deptId);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse Jobs</h1>
        <p>Discover verified part-time and short-term opportunities.</p>
      </div>

      <div className="card fade-up" style={{ marginBottom: 20 }}>
        {/* Department Filter Chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--line)' }}>
          {departments.map(d => {
            const active = departmentFilter === d.id;
            return (
              <button
                key={d.id}
                className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`}
                style={{
                  whiteSpace: 'nowrap',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  background: active ? 'var(--ink)' : 'var(--white)',
                }}
                onClick={() => handleDeptSelect(d.id)}
              >
                <span style={{ marginRight: 6 }}>{d.icon}</span>
                {d.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar & Type Filter Chips */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 240 }}>
            <span className="search-icon">🔍</span>
            <input className="input search-input" style={{ marginBottom: 0 }} placeholder="Search jobs or companies…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap8" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Type:</span>
            {types.map(t => (
              <button key={t} className={`btn btn-sm ${typeFilter === t ? "btn-primary" : "btn-outline"}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setTypeFilter(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Finding the best jobs for you…</div>
        </div>
      ) : (
        <>
          {departmentFilter !== "All" && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 500 }}>
                Showing <strong style={{ color: 'var(--accent)' }}>{departmentFilter}</strong> jobs ({filtered.length} found)
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDeptSelect("All")}>
                Clear filter
              </button>
            </div>
          )}

          <div className="grid-3 fade-up-2">
            {filtered.map(j => {
              const appStatus = applied[j.id];
              let btnText = '📝 Apply Now';
              let btnClass = 'btn-primary';
              let btnStyle = { justifyContent: 'center' };

              if (appStatus === 'accepted') {
                btnText = '🎉 Application Accepted!';
                btnClass = 'btn-primary';
                btnStyle = { justifyContent: 'center', background: '#16a34a', borderColor: '#16a34a', color: '#ffffff' };
              } else if (appStatus === 'rejected') {
                btnText = '❌ Application Rejected';
                btnClass = 'btn-outline';
                btnStyle = { justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5' };
              } else if (appStatus) {
                btnText = '✓ Applied';
                btnClass = 'btn-outline';
              }

              return (
                <div key={j.id}>
                  <JobCard job={j} onClick={() => setSelectedJob(j)} />
                  <button
                    className={`btn full-width mt8 ${btnClass}`}
                    style={btnStyle}
                    onClick={() => handleApply(j)}
                    disabled={Boolean(appStatus)}
                  >
                    {btnText}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {!loading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          No jobs found for department "{departmentFilter}".
        </div>
      )}

      {/* ── Dynamic 2% Platform Fee Receipt Modal ── */}
      <WorkerFeeReceiptModal
        job={feeReceiptJob}
        isOpen={Boolean(feeReceiptJob)}
        onClose={() => setFeeReceiptJob(null)}
        onConfirmApply={handleConfirmApplication}
        applying={applying}
      />
    </div>
  );
}

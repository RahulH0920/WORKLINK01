import { useState, useEffect } from 'react';
import JobCard from '../../components/JobCard/JobCard';
import { getJobs, applyJob } from '../../data/api';
import './JobsPage.css';

export default function JobsPage({ user, requireProfile }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);
  const [applied, setApplied] = useState({});
  const types = ["All", "Part-time", "Short-term", "Freelance", "Full-time"];

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
          company: `${j.employer.firstName} ${j.employer.lastName}`,
          emoji: "💼", // default emoji
          type: j.type,
          location: j.location,
          pay: j.pay,
          tags: j.tags || [],
          apps: j.applications?.length || 0,
          posted: new Date(j.createdAt).toLocaleDateString(),
          trust: j.employer.trustScore || 0,
          description: j.description
        }));
        setJobs(formattedJobs);
        
        // Find which jobs the current user already applied to
        if (user) {
          const appliedMap = {};
          res.jobs.forEach(j => {
            if (j.applications?.some(a => a.applicant === user.id || a.applicant._id === user.id)) {
              appliedMap[j._id] = true;
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

  const filtered = jobs.filter(j =>
    (filter === "All" || j.type === filter) &&
    (j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()))
  );

  const handleApply = (job) => {
    requireProfile(`apply for "${job.title}"`, async () => {
      try {
        const res = await applyJob(job.id);
        if (res.success) {
          setApplied(prev => ({ ...prev, [job.id]: true }));
          setSelectedJob(null);
          alert('Successfully applied!');
        }
      } catch (err) {
        alert(err.message || 'Failed to apply');
      }
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse Jobs</h1>
        <p>Discover verified part-time and short-term opportunities.</p>
      </div>
      <div className="card fade-up" style={{ marginBottom: 20, display: "flex", gap: 16, alignItems: "center" }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input className="input search-input" style={{ marginBottom: 0 }} placeholder="Search jobs or companies…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap8" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          {types.map(t => (
            <button key={t} className={`btn btn-sm ${filter === t ? "btn-primary" : "btn-outline"}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <p>Loading jobs...</p>
      ) : (
        <div className="grid-3 fade-up-2">
          {filtered.map(j => (
            <div key={j.id}>
              <JobCard job={j} onClick={() => setSelectedJob(j)} />
              <button
                className={`btn full-width mt8 ${applied[j.id] ? 'btn-outline' : 'btn-primary'}`}
                style={{ justifyContent: 'center' }}
                onClick={() => handleApply(j)}
                disabled={applied[j.id]}
              >
                {applied[j.id] ? '✓ Applied' : '📝 Apply Now'}
              </button>
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>No jobs match your search.</div>}
    </div>
  );
}

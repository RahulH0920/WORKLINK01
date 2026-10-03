import StatusPill from '../StatusPill/StatusPill';
import { DEPARTMENT_MAP } from '../../data/constants';
import './JobCard.css';

export default function JobCard({ job, onClick }) {
  const dept = job.department ? DEPARTMENT_MAP[job.department] : null;

  return (
    <div className="job-card" onClick={onClick}>
      <div className="job-card-header">
        <div className="job-company">
          <div className="company-logo" style={{ background: "var(--surface)", fontSize: 20 }}>{job.emoji}</div>
          <div>
            <div className="job-title">{job.title}</div>
            <div className="job-co">{job.company}</div>
          </div>
        </div>
        <div className="job-card-status-wrap">
          {dept && (
            <span className={`job-dept-chip job-dept-${job.department.toLowerCase()}`}>
              <span className="job-dept-icon">{dept.icon}</span>
              <span className="job-dept-text">{dept.label}</span>
            </span>
          )}
          <StatusPill s="active" />
        </div>
      </div>
      <div className="text-muted" style={{ fontSize: 13, display: "flex", gap: 12 }}>
        <span>📍 {job.location}</span>
        <span>🕒 {job.type}</span>
      </div>
      <div className="job-tags">
        {job.tags.map((t, i) => <span key={t} className={`tag ${["teal", "indigo", "amber"][i % 3]}`}>{t}</span>)}
      </div>
      <div className="job-footer">
        <div>
          <div className="salary">{job.pay} <span className="salary-period">{job.type === "Part-time" ? "/ hr" : ""}</span></div>
          <div className="text-muted">{job.apps} applicants · {job.posted}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Employer Trust</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal)", fontSize: 16 }}>{job.trust}</div>
        </div>
      </div>
    </div>
  );
}

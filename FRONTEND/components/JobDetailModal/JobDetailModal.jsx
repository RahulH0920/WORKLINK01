import { useEffect } from 'react';
import StatusPill from '../StatusPill/StatusPill';
import './JobDetailModal.css';

export default function JobDetailModal({ job, onClose, onApply, isApplied }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  return (
    <div className="job-modal-overlay" onClick={onClose}>
      <div className="job-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="job-modal-header">
          <button className="job-modal-close" onClick={onClose} title="Close">✕</button>
          <div className="job-modal-hero">
            <div className="job-modal-icon">{job.emoji || '💼'}</div>
            <div>
              <h2 className="job-modal-title">{job.title}</h2>
              <div className="job-modal-company">
                <span>{job.company}</span>
                {job.trust > 0 && (
                  <span className="job-modal-trust-pill">
                    🛡️ Trust {job.trust}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="job-modal-body">
          {/* Key specs */}
          <div className="job-modal-specs">
            <div className="job-spec-item">
              <span className="job-spec-label">Location</span>
              <span className="job-spec-val">📍 {job.location || 'Remote'}</span>
            </div>
            <div className="job-spec-item">
              <span className="job-spec-label">Job Type</span>
              <span className="job-spec-val">🕒 {job.type}</span>
            </div>
            <div className="job-spec-item">
              <span className="job-spec-label">Pay / Rate</span>
              <span className="job-spec-val" style={{ color: 'var(--green-d)' }}>💰 {job.pay}</span>
            </div>
            <div className="job-spec-item">
              <span className="job-spec-label">Applicants</span>
              <span className="job-spec-val">👥 {job.apps || 0}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="job-modal-section-title">Job Description</div>
            <div className="job-modal-desc">
              {job.description || 'No description provided for this listing.'}
            </div>
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div>
              <div className="job-modal-section-title">Required Skills & Tags</div>
              <div className="job-modal-tags">
                {job.tags.map((tag, idx) => (
                  <span key={tag} className={`tag ${['teal', 'indigo', 'amber'][idx % 3]}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="job-modal-footer">
          <div className="text-muted" style={{ fontSize: 13 }}>
            Posted on {job.posted || 'Recently'}
          </div>
          <div className="flex gap12">
            <button className="btn btn-outline" onClick={onClose}>Close</button>
            <button
              className={`btn ${isApplied ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => {
                if (!isApplied && onApply) {
                  onApply(job);
                }
              }}
              disabled={isApplied}
            >
              {isApplied ? '✓ Applied' : '📝 Apply Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

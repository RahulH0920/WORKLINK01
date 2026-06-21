import { useState } from 'react';
import { createJob } from '../../data/api';
import { useToast } from '../../components/Toast/Toast';
import './PostJob.css';

const JOB_TYPES = ['Part-time', 'Short-term', 'Freelance', 'Full-time'];

const POPULAR_TAGS = [
  'React', 'Node.js', 'Python', 'JavaScript', 'Design',
  'Data Entry', 'Writing', 'Marketing', 'Delivery', 'Cleaning',
  'Photography', 'Tutoring', 'Accounting', 'Sales', 'Customer Support',
];

export default function PostJob({ user, onNavigate }) {
  const [form, setForm] = useState({
    title: '', type: 'Part-time', location: '', pay: '', description: '', tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { addToast } = useToast();

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addTag = (tag) => {
    if (!tag.trim() || form.tags.length >= 5) return;
    if (form.tags.some(t => t.toLowerCase() === tag.trim().toLowerCase())) return;
    set('tags', [...form.tags, tag.trim()]);
    setTagInput('');
  };

  const removeTag = (i) => set('tags', form.tags.filter((_, idx) => idx !== i));

  const isValid = form.title.trim() && form.location.trim() && form.pay.trim() && form.description.trim().length >= 20;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');
    try {
      await createJob(form);
      setSuccess(true);
      addToast(`"${form.title}" posted successfully!`, { type: 'success' });
    } catch (err) {
      setError(err.message || 'Failed to post job');
      addToast(err.message || 'Failed to post job', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="page">
        <div className="postjob-success card fade-up">
          <div className="postjob-success-icon">🎉</div>
          <h2>Job Posted Successfully!</h2>
          <p className="text-muted">Your listing "{form.title}" is now live. Verified workers can start applying immediately.</p>
          <div className="flex gap12" style={{ marginTop: 24, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('applicants')}>View Applicants →</button>
            <button className="btn btn-outline" onClick={() => { setSuccess(false); setForm({ title: '', type: 'Part-time', location: '', pay: '', description: '', tags: [] }); }}>Post Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Post a New Job</h1>
        <p>Create a listing to find skilled, verified workers.</p>
      </div>

      <form onSubmit={handleSubmit} className="postjob-form fade-up">
        <div className="grid-2">
          {/* Left — Form */}
          <div className="card">
            {error && (
              <div className="postjob-error">⚠️ {error}</div>
            )}

            <div className="input-group">
              <label className="input-label">Job Title *</label>
              <input className="input" placeholder="e.g. React Developer for E-commerce App" value={form.title} onChange={e => set('title', e.target.value)} maxLength={80} />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label className="input-label">Job Type *</label>
                <select className="select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Location *</label>
                <input className="input" placeholder="e.g. Bengaluru, Remote" value={form.location} onChange={e => set('location', e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Pay / Budget *</label>
              <input className="input" placeholder="e.g. ₹500/hr, ₹15,000 fixed" value={form.pay} onChange={e => set('pay', e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Description *</label>
              <textarea className="textarea" placeholder="Describe the role, responsibilities, and requirements…" value={form.description} onChange={e => set('description', e.target.value)} rows={5} maxLength={1000} />
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{form.description.length}/1000</div>
            </div>

            <div className="input-group">
              <label className="input-label">Skills / Tags</label>
              <div className="postjob-tags-input">
                {form.tags.map((t, i) => (
                  <span key={t} className="tag teal postjob-tag">{t} <button type="button" onClick={() => removeTag(i)}>✕</button></span>
                ))}
                {form.tags.length < 5 && (
                  <input className="postjob-tag-input" placeholder="Add a tag…" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); }}} />
                )}
              </div>
              <div className="postjob-quick-tags">
                {POPULAR_TAGS.filter(t => !form.tags.includes(t)).slice(0, 6).map(t => (
                  <button key={t} type="button" className="postjob-quick-tag" onClick={() => addTag(t)} disabled={form.tags.length >= 5}>+ {t}</button>
                ))}
              </div>
            </div>

            <button type="submit" className={`btn btn-primary full-width ${submitting ? 'loading' : ''}`} disabled={!isValid || submitting} style={{ marginTop: 8, justifyContent: 'center', padding: '12px 24px' }}>
              {submitting ? 'Publishing…' : '🚀 Publish Job Listing'}
            </button>
          </div>

          {/* Right — Live Preview */}
          <div>
            <div className="card postjob-preview">
              <div className="card-title" style={{ marginBottom: 16 }}>📋 Live Preview</div>
              <div className="postjob-preview-card">
                <div className="job-card" style={{ boxShadow: 'none', padding: 0 }}>
                  <div className="job-card-header">
                    <div className="job-company">
                      <div className="company-logo" style={{ background: 'var(--surface)', fontSize: 20 }}>💼</div>
                      <div>
                        <div className="job-title">{form.title || 'Job Title'}</div>
                        <div className="job-co">{user ? `${user.firstName} ${user.lastName}` : 'Your Company'}</div>
                      </div>
                    </div>
                    <span className="pill pill-green">Active</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 13, display: 'flex', gap: 12, margin: '12px 0' }}>
                    <span>📍 {form.location || 'Location'}</span>
                    <span>🕒 {form.type}</span>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="job-tags">
                      {form.tags.map((t, i) => <span key={t} className={`tag ${['teal', 'indigo', 'amber'][i % 3]}`}>{t}</span>)}
                    </div>
                  )}
                  <div className="job-footer" style={{ marginTop: 16 }}>
                    <div>
                      <div className="salary">{form.pay || '—'}</div>
                      <div className="text-muted">0 applicants · Just now</div>
                    </div>
                  </div>
                </div>

                {form.description && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Description</div>
                    <p className="text-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{form.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

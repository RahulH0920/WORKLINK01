import './ProfileNudge.css';

function getProfileCompletion(user) {
  if (!user) return { percent: 0, missing: ['bio', 'location', 'skills', 'documents'] };

  const checks = [
    { key: 'bio', done: !!user.bio && user.bio.trim().length >= 20 },
    { key: 'location', done: !!user.location && user.location.trim().length >= 2 },
    { key: 'skills', done: user.skills?.length >= 2 },
    { key: 'documents', done: !!user.documentsUploaded },
  ];

  const completed = checks.filter(c => c.done).length;
  const percent = Math.round((completed / checks.length) * 100);
  const missing = checks.filter(c => !c.done).map(c => c.key);

  return { percent, missing, completed, total: checks.length };
}

export default function ProfileNudge({ user, onCompleteClick }) {
  if (!user || user.profileComplete) return null;

  const { percent } = getProfileCompletion(user);

  return (
    <div className="profile-nudge fade-up">
      <div className="nudge-content">
        <div className="nudge-icon">🌱</div>
        <div className="nudge-text">
          <span className="nudge-title">Your profile is {percent}% complete</span>
          <span className="nudge-desc">Complete it to unlock job applications, messaging, and more.</span>
        </div>
      </div>
      <div className="nudge-right">
        <div className="nudge-bar">
          <div className="nudge-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <button className="btn btn-primary btn-sm nudge-btn" onClick={onCompleteClick}>
          Complete Profile →
        </button>
      </div>
    </div>
  );
}

export { getProfileCompletion };

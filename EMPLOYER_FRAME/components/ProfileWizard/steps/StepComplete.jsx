import { useEffect, useRef } from 'react';

export default function StepComplete({ data, user }) {
  const canvasRef = useRef(null);
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const initials = user ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` : 'U';
  const skillCount = data.skills?.length || 0;
  const docCount = Object.keys(data.documents || {}).length;

  // Confetti effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#00C9A7', '#5B6CF8', '#FFB547', '#FF6B6B', '#E0E5EC'];
    const particles = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 4,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.15,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008,
      });
    }

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach(p => {
        if (p.opacity <= 0) return;
        alive = true;

        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= p.decay;
        p.vx *= 0.99;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (alive) animId = requestAnimationFrame(animate);
    };

    // Delay start for dramatic effect
    const timer = setTimeout(() => animate(), 200);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="wizard-step-content wizard-complete-step">
      <canvas ref={canvasRef} className="wizard-confetti-canvas" />

      <div className="wizard-complete-emoji">🎉</div>
      <h2 className="wizard-step-title">You're all set!</h2>
      <p className="wizard-step-desc">Your profile is complete and ready for employers to discover.</p>

      {/* Preview card */}
      <div className="wizard-preview-card">
        <div className="wizard-preview-header">
          <div className="wizard-preview-avatar">{initials}</div>
          <div className="wizard-preview-info">
            <div className="wizard-preview-name">{displayName}</div>
            <div className="wizard-preview-location">📍 {data.location || 'Not set'}</div>
          </div>
          <div className="wizard-preview-trust">
            <div className="wizard-preview-trust-label">Trust</div>
            <div className="wizard-preview-trust-score">{user?.trustScore || 0}</div>
          </div>
        </div>

        <p className="wizard-preview-bio">{data.bio}</p>

        <div className="wizard-preview-skills">
          {(data.skills || []).map((s, i) => (
            <span key={i} className="wizard-preview-skill-tag">{s.name}</span>
          ))}
        </div>

        <div className="wizard-preview-docs">
          <span className="wizard-preview-doc-badge">🏢 License</span>
          <span className="wizard-preview-doc-badge">📜 Registration</span>
          <span className="wizard-preview-doc-badge">💳 Tax ID</span>
          <span className="wizard-preview-doc-badge">📸 Photo</span>
        </div>
      </div>

      <div className="wizard-complete-stats">
        <div className="wizard-complete-stat">
          <div className="wizard-complete-stat-value">{skillCount}</div>
          <div className="wizard-complete-stat-label">Skills</div>
        </div>
        <div className="wizard-complete-stat-divider" />
        <div className="wizard-complete-stat">
          <div className="wizard-complete-stat-value">{docCount}</div>
          <div className="wizard-complete-stat-label">Documents</div>
        </div>
        <div className="wizard-complete-stat-divider" />
        <div className="wizard-complete-stat">
          <div className="wizard-complete-stat-value" style={{ color: 'var(--teal)' }}>✓</div>
          <div className="wizard-complete-stat-label">Verified</div>
        </div>
      </div>
    </div>
  );
}

StepComplete.isValid = () => true;

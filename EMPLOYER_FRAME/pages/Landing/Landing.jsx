import { useState, useEffect, useRef } from 'react';
import { getPlatformStats } from '../../data/api';
import './Landing.css';

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0 || target === null || target === undefined) {
      setCount(0);
      return;
    }

    let start = 0;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);

      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return count;
}

function AnimatedStat({ value, suffix = '', label }) {
  const count = useCountUp(value, 1400);

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="hero-stat-num">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="hero-stat-lbl">{label}</div>
    </div>
  );
}

export default function Landing({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPlatformStats()
      .then((data) => {
        setStats(data);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load stats:', err);
        // Fallback to zeros
        setStats({
          totalSeekers: 0,
          totalEmployers: 0,
          totalUsers: 0,
          verifiedUsers: 0,
          completionRate: 0,
        });
        setLoaded(true);
      });
  }, []);

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo" style={{ padding: 0, border: "none" }}>
          <div className="logo-mark">W</div>
          <span className="logo-text" style={{ color: "#fff" }}>WorkLink</span>
        </div>
        <div className="flex gap12">
          <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,.7)" }} onClick={() => onNavigate("login")}>Sign In</button>
          <button className="btn btn-primary" onClick={() => onNavigate("register")}>Get Started</button>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="hero-tag fade-up">✦ Verified Gig Platform</div>
        <h1 className="hero-title fade-up-2">
          Find <span>verified gigs</span><br />build trust, grow fast.
        </h1>
        <p className="hero-sub fade-up-3">
          WorkLink connects skilled freelancers with employers for part-time and short-term jobs—backed by document verification and AI trust scoring.
        </p>
        <div className="hero-cta fade-up-4">
          <button className="btn btn-primary" style={{ padding: "13px 28px", fontSize: 15 }} onClick={() => onNavigate("register")}>Start as Job Seeker →</button>
          <button className="btn btn-outline" style={{ padding: "13px 28px", fontSize: 15, borderColor: "rgba(255,255,255,.2)", color: "#fff" }} onClick={() => onNavigate("register")}>Post a Job</button>
        </div>

        {/* ── Live Platform Stats ── */}
        <div className={`hero-stats fade-up ${loaded ? 'stats-loaded' : ''}`}>
          <AnimatedStat
            value={stats?.totalSeekers || 0}
            label="Job Seekers"
          />
          <AnimatedStat
            value={stats?.totalEmployers || 0}
            label="Employers"
          />
          <AnimatedStat
            value={stats?.verifiedUsers || 0}
            label="Verified Profiles"
          />
          <AnimatedStat
            value={stats?.totalUsers || 0}
            label="Total Users"
          />
        </div>
      </div>

      <div className="landing-cards">
        {[
          { icon: "🛡️", title: "Verified Identity", body: "Every user is verified via government documents before they can apply or post jobs—zero fake profiles." },
          { icon: "🤖", title: "Trust Score AI", body: "Dynamic trust scores computed from ratings, job completion rate, and response time reward the most reliable users." },
          { icon: "⚡", title: "Instant Matching", body: "Smart filters surface the best fit jobs or candidates in seconds, powered by skill and location signals." },
        ].map(c => (
          <div key={c.title} className="landing-card">
            <div className="landing-card-icon">{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

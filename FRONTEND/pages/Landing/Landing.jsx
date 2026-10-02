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

/* ── Intersection Observer hook for scroll animations ── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}

const HOW_IT_WORKS = [
  { step: '01', icon: '📝', title: 'Create Your Profile', desc: 'Sign up and verify your identity with government-issued documents. Your profile is secured with AI-backed trust scoring.' },
  { step: '02', icon: '🔍', title: 'Find or Post Jobs', desc: 'Job seekers browse curated gigs filtered by location, skill, and type. Employers post jobs in seconds with smart tag matching.' },
  { step: '03', icon: '🤝', title: 'Connect & Work', desc: 'Apply with one click, chat with employers in-app, and complete gigs. Every completed job builds your trust score.' },
  { step: '04', icon: '⭐', title: 'Grow Your Reputation', desc: 'Earn reviews, climb the trust ladder, and unlock priority listings. Top-rated users get 3× more job matches.' },
];



export default function Landing({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [howRef, howInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

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
      {/* ── Animated gradient orbs ── */}
      <div className="landing-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="logo" style={{ padding: 0, border: "none" }}>
          <div className="logo-mark">W</div>
          <span className="logo-text" style={{ color: "var(--ink)" }}>WorkLink</span>
        </div>
        <div className="flex gap12">
          <button className="btn btn-ghost" onClick={() => onNavigate("login")}>Sign In</button>
          <button className="btn btn-primary" onClick={() => onNavigate("register")}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="landing-hero">
        <div className="hero-tag fade-up">Verified Gig Platform</div>
        <h1 className="hero-title fade-up-2">
          Find <span>verified gigs</span><br />build trust, grow fast.
        </h1>
        <p className="hero-sub fade-up-3">
          WorkLink connects skilled freelancers with employers for part-time and short-term jobs—backed by document verification and AI trust scoring.
        </p>
        <div className="hero-cta fade-up-4">
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate("login")}>LOGIN →</button>
        </div>

        {/* ── Live Platform Stats ── */}
        <div className={`hero-stats fade-up ${loaded ? 'stats-loaded' : ''}`}>
          <AnimatedStat value={stats?.totalSeekers || 0} label="Job Seekers" />
          <AnimatedStat value={stats?.totalEmployers || 0} label="Employers" />
          <AnimatedStat value={stats?.verifiedUsers || 0} label="Verified Profiles" />
          <AnimatedStat value={stats?.totalUsers || 0} label="Total Users" />
        </div>
      </div>

      {/* ── Feature Cards ── */}
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

      {/* ── How it Works ── */}
      <section className={`landing-section how-it-works ${howInView ? 'in-view' : ''}`} ref={howRef}>
        <div className="section-label">How It Works</div>
        <h2 className="section-title">Get started in 4 simple steps</h2>
        <p className="section-desc">From sign-up to your first payday — the whole journey takes minutes, not days.</p>

        <div className="how-grid">
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} className="how-card" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="how-step-num">{item.step}</div>
              <div className="how-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && <div className="how-connector" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>



      {/* ── CTA Banner ── */}
      <section className={`landing-section cta-section ${ctaInView ? 'in-view' : ''}`} ref={ctaRef}>
        <div className="cta-banner">
          <h2>Ready to join the verified gig economy?</h2>
          <p>Sign up for free and start building your trust score today. No hidden fees, no fake profiles.</p>
          <div className="hero-cta" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => onNavigate("register")}>Create Free Account →</button>
            <button className="btn btn-outline-light btn-lg" onClick={() => onNavigate("login")}>Sign In</button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo" style={{ padding: 0, border: "none" }}>
              <div className="logo-mark">W</div>
              <span className="logo-text" style={{ color: "var(--ink)" }}>WorkLink</span>
            </div>
            <p className="footer-tagline">The verified gig platform that puts trust first.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Platform</h4>
              <span>Browse Jobs</span>
              <span>Post a Job</span>
              <span>Trust Engine</span>
              <span>Verification</span>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <span>About Us</span>
              <span>Careers</span>
              <span>Blog</span>
              <span>Contact</span>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <span onClick={() => onNavigate('terms')}>Terms of Service</span>
              <span onClick={() => onNavigate('privacy')}>Privacy Policy</span>
              <span onClick={() => onNavigate('cookies')}>Cookie Policy</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 WorkLink. All rights reserved.</span>
          <span className="footer-made">Made with 💚 in India</span>
        </div>
      </footer>
    </div>
  );
}

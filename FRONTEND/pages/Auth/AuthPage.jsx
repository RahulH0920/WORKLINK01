import { useState, useEffect, useRef } from 'react';
import './AuthPage.css';
import { registerUser, loginUser } from '../../data/api';
import { useToast } from '../../components/Toast/Toast';

/* ── helpers ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d[\d\s\-]{8,14}$/;

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', cls: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 1, label: 'Weak', cls: 'weak' };
  if (s <= 3) return { score: 2, label: 'Fair', cls: 'fair' };
  if (s === 4) return { score: 3, label: 'Strong', cls: 'strong' };
  return { score: 4, label: 'Very strong', cls: 'very-strong' };
}

const PASSWORD_RULES = [
  { test: pw => pw.length >= 8, label: 'At least 8 characters' },
  { test: pw => /[A-Z]/.test(pw), label: 'One uppercase letter' },
  { test: pw => /[a-z]/.test(pw), label: 'One lowercase letter' },
  { test: pw => /\d/.test(pw), label: 'One number' },
  { test: pw => /[^A-Za-z0-9]/.test(pw), label: 'One special character' },
];

/* ── Component ── */
export default function AuthPage({ mode, onNavigate, onRoleSelect, role: parentRole, onUserSet }) {
  const isLogin = mode === 'login';
  const { addToast } = useToast();

  /* form state */
  const [role, setRole] = useState(parentRole || 'seeker');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* UI state */
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [animDir, setAnimDir] = useState('in');   // 'in' | 'switch'
  const formRef = useRef(null);

  /* reset on mode switch */
  useEffect(() => {
    setErrors({});
    setTouched({});
    setServerError('');
    setAnimDir('switch');
    const t = setTimeout(() => setAnimDir('in'), 50);
    return () => clearTimeout(t);
  }, [mode]);

  /* role propagation */
  const handleRoleChange = (r) => {
    setRole(r);
    if (onRoleSelect) onRoleSelect(r);
  };

  /* ── validation ── */
  const validate = () => {
    const e = {};

    if (!isLogin) {
      if (!firstName.trim()) e.firstName = 'First name is required';
      else if (firstName.trim().length < 2) e.firstName = 'Must be at least 2 characters';

      if (!lastName.trim()) e.lastName = 'Last name is required';
      else if (lastName.trim().length < 2) e.lastName = 'Must be at least 2 characters';
    }

    if (!email.trim()) e.email = 'Email is required';
    else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address';

    if (!password) e.password = 'Password is required';
    else if (!isLogin && password.length < 8) e.password = 'Minimum 8 characters required';
    else if (!isLogin && getPasswordStrength(password).score < 2) e.password = 'Password is too weak';

    if (!isLogin) {
      if (!confirmPw) e.confirmPw = 'Please confirm your password';
      else if (confirmPw !== password) e.confirmPw = 'Passwords do not match';

      if (!phone.trim()) e.phone = 'Phone number is required';
      else if (!PHONE_RE.test(phone.replace(/\s/g, ''))) e.phone = 'Enter a valid phone number';

      if (!agreeTerms) e.agreeTerms = 'You must accept the terms';
    }

    return e;
  };

  const handleBlur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    const all = validate();
    setErrors(prev => {
      const next = { ...prev };
      if (all[field]) next[field] = all[field];
      else delete next[field];
      return next;
    });
  };

  const fieldError = (field) => touched[field] && errors[field];

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const allTouched = {};
    ['firstName', 'lastName', 'email', 'password', 'confirmPw', 'phone', 'agreeTerms'].forEach(f => allTouched[f] = true);
    setTouched(allTouched);

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      /* shake the form */
      formRef.current?.classList.add('shake');
      setTimeout(() => formRef.current?.classList.remove('shake'), 500);
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const data = await loginUser({ email, password });
        if (onRoleSelect) onRoleSelect(data.user.role);
        if (onUserSet) onUserSet(data.user);
        addToast(`Welcome back, ${data.user.firstName}!`, { type: 'success' });
        onNavigate(data.user.role === 'admin' ? 'admin' : 'dashboard');
      } else {
        const data = await registerUser({ firstName, lastName, email, phone, password, role });
        if (onRoleSelect) onRoleSelect(data.user.role);
        if (onUserSet) onUserSet(data.user);
        addToast(`Welcome to WorkLink, ${data.user.firstName}!`, { type: 'success' });
        onNavigate('dashboard');
      }
    } catch (err) {
      /* map server field errors back to form */
      if (err.data?.errors) {
        const fieldErrs = {};
        err.data.errors.forEach(e => { if (e.field) fieldErrs[e.field] = e.message; });
        setErrors(prev => ({ ...prev, ...fieldErrs }));
      }
      setServerError(err.message || 'Something went wrong. Please try again.');
      formRef.current?.classList.add('shake');
      setTimeout(() => formRef.current?.classList.remove('shake'), 500);
    } finally {
      setSubmitting(false);
    }
  };

  const pwStrength = getPasswordStrength(password);

  return (
    <div className="auth-page">
      {/* Animated background blobs */}
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>

      <div className={`auth-box ${animDir}`} ref={formRef}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">W</div>
          <span className="auth-logo-text">WorkLink</span>
        </div>

        <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-sub">
          {isLogin ? 'Sign in to continue to your dashboard' : 'Join the verified gig economy — it takes 30 seconds'}
        </p>

        {/* Role selector */}
        <div className="role-selector">
          {[{ id: 'seeker', icon: '👤', label: 'Job Seeker' }, { id: 'employer', icon: '🏢', label: 'Employer' }].map(r => (
            <button
              key={r.id}
              type="button"
              className={`role-card ${role === r.id ? 'selected' : ''}`}
              onClick={() => handleRoleChange(r.id)}
              id={`role-${r.id}`}
            >
              <div className="role-icon">{r.icon}</div>
              <div className="role-name">{r.label}</div>
              {role === r.id && <div className="role-check">✓</div>}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {/* Server error banner */}
          {serverError && (
            <div className="server-error-banner">
              <span className="server-error-icon">⚠</span>
              {serverError}
            </div>
          )}
          {/* Names (register only) */}
          {!isLogin && (
            <div className="input-row">
              <div className={`input-group ${fieldError('firstName') ? 'has-error' : ''}`}>
                <label className="input-label" htmlFor="auth-firstName">First Name</label>
                <input
                  id="auth-firstName"
                  className="input"
                  placeholder="Aanya"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                />
                {fieldError('firstName') && <span className="field-error">{errors.firstName}</span>}
              </div>
              <div className={`input-group ${fieldError('lastName') ? 'has-error' : ''}`}>
                <label className="input-label" htmlFor="auth-lastName">Last Name</label>
                <input
                  id="auth-lastName"
                  className="input"
                  placeholder="Sharma"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                />
                {fieldError('lastName') && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>
          )}

          {/* Email */}
          <div className={`input-group ${fieldError('email') ? 'has-error' : ''}`}>
            <label className="input-label" htmlFor="auth-email">Email Address</label>
            <div className="input-icon-wrap">
              <span className="input-icon-left">✉</span>
              <input
                id="auth-email"
                className="input input-has-icon"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
              />
            </div>
            {fieldError('email') && <span className="field-error">{errors.email}</span>}
          </div>

          {/* Phone (register only) */}
          {!isLogin && (
            <div className={`input-group ${fieldError('phone') ? 'has-error' : ''}`}>
              <label className="input-label" htmlFor="auth-phone">Phone Number</label>
              <div className="input-icon-wrap">
                <span className="input-icon-left">📱</span>
                <input
                  id="auth-phone"
                  className="input input-has-icon"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onBlur={() => handleBlur('phone')}
                />
              </div>
              {fieldError('phone') && <span className="field-error">{errors.phone}</span>}
            </div>
          )}

          {/* Password */}
          <div className={`input-group ${fieldError('password') ? 'has-error' : ''}`}>
            <label className="input-label" htmlFor="auth-password">Password</label>
            <div className="input-icon-wrap">
              <span className="input-icon-left">🔒</span>
              <input
                id="auth-password"
                className="input input-has-icon"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
            {fieldError('password') && <span className="field-error">{errors.password}</span>}

            {/* Password strength (register only) */}
            {!isLogin && password.length > 0 && (
              <div className="pw-strength-section">
                <div className="pw-strength-bar">
                  <div className={`pw-strength-fill ${pwStrength.cls}`} style={{ width: `${pwStrength.score * 25}%` }} />
                </div>
                <span className={`pw-strength-label ${pwStrength.cls}`}>{pwStrength.label}</span>

                <ul className="pw-rules">
                  {PASSWORD_RULES.map(r => (
                    <li key={r.label} className={r.test(password) ? 'pass' : 'fail'}>
                      <span className="rule-icon">{r.test(password) ? '✓' : '○'}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password (register only) */}
          {!isLogin && (
            <div className={`input-group ${fieldError('confirmPw') ? 'has-error' : ''}`}>
              <label className="input-label" htmlFor="auth-confirmPw">Confirm Password</label>
              <div className="input-icon-wrap">
                <span className="input-icon-left">🔒</span>
                <input
                  id="auth-confirmPw"
                  className="input input-has-icon"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  onBlur={() => handleBlur('confirmPw')}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowConfirmPw(!showConfirmPw)} aria-label="Toggle confirm password">
                  {showConfirmPw ? '🙈' : '👁'}
                </button>
              </div>
              {fieldError('confirmPw') && <span className="field-error">{errors.confirmPw}</span>}
            </div>
          )}

          {/* Terms / Remember me */}
          {isLogin ? (
            <div className="auth-options">
              <label className="auth-check" htmlFor="auth-remember">
                <input type="checkbox" id="auth-remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span className="checkmark" />
                Remember me
              </label>
              <span className="auth-forgot">Forgot password?</span>
            </div>
          ) : (
            <div className={`auth-terms ${fieldError('agreeTerms') ? 'has-error' : ''}`}>
              <label className="auth-check" htmlFor="auth-terms">
                <input type="checkbox" id="auth-terms" checked={agreeTerms} onChange={e => { setAgreeTerms(e.target.checked); handleBlur('agreeTerms'); }} />
                <span className="checkmark" />
                I agree to the <span className="link">Terms of Service</span> and <span className="link">Privacy Policy</span>
              </label>
              {fieldError('agreeTerms') && <span className="field-error">{errors.agreeTerms}</span>}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className={`btn btn-primary full-width auth-submit ${submitting ? 'loading' : ''}`}
            disabled={submitting}
            id="auth-submit-btn"
          >
            {submitting ? (
              <span className="spinner" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* Social buttons */}
        <div className="social-row">
          <button type="button" className="social-btn" id="social-google">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.7 13 17.9 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16.3z"/><path fill="#34A853" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8-6.2z"/><path fill="#FBBC05" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.1-5.5c-2.1 1.4-4.8 2.3-8.2 2.3-6.1 0-11.3-3.5-13.3-9l-8 6.2C6.6 42.6 14.6 48 24 48z"/></svg>
            Google
          </button>
          <button type="button" className="social-btn" id="social-github">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.43 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.57 21.8 24 17.31 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </button>
        </div>

        {/* Switch link */}
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="link" onClick={() => onNavigate(isLogin ? 'register' : 'login')}>
            {isLogin ? 'Sign up free' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
}

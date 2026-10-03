import React, { useState, useMemo } from 'react';
import { createJob } from '../../data/api';
import { useToast } from '../../components/Toast/Toast';
import { DEPARTMENTS } from '../../data/constants';
import { calculateEmployerFee, formatINR } from '../../components/FeeReceipt/FeeReceiptModal';
import './PostJob.css';

const JOB_CATEGORIES = [
  'Delivery',
  'Construction',
  'Cleaning',
  'Agriculture',
  'Warehouse',
  'Hospitality',
  'Other',
];

const JOB_TYPES = [
  { id: 'Part-time', label: 'Part-time', sub: 'Flexible shifts' },
  { id: 'Full-time', label: 'Full-time', sub: 'Standard work week' },
  { id: 'Temporary', label: 'Temporary', sub: 'Short project / seasonal' },
  { id: 'Contract', label: 'Contract', sub: 'Specific task deliverables' },
];

const PAYMENT_TYPES = [
  { id: 'Per Day', label: 'Per Day', unit: '/day' },
  { id: 'Per Hour', label: 'Per Hour', unit: '/hr' },
  { id: 'Per Task', label: 'Per Task', unit: '/task' },
  { id: 'Fixed Amount', label: 'Fixed Amount', unit: ' fixed' },
];

const PRESET_SKILLS = [
  'Communication',
  'Physical Work',
  'Team Work',
  'Driving',
  'Customer Service',
  'Heavy Lifting',
  'Inventory Prep',
  'Food Safety',
  'Time Management',
];

const STEPS = [
  { number: 1, title: 'Basic Information' },
  { number: 2, title: 'Work Details' },
  { number: 3, title: 'Payment' },
  { number: 4, title: 'Requirements' },
  { number: 5, title: 'Review' },
];

export default function PostJob({ user, onNavigate }) {
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [feeAgreed, setFeeAgreed] = useState(false);

  // Form State - Initially empty required fields (Step 1, 2, 3)
  const [form, setForm] = useState({
    title: '',
    category: 'Delivery',
    department: 'Delivery',
    description: '',
    skills: [],
    type: 'Part-time',
    location: '',
    workersRequired: 1,
    startDate: '',
    endDate: '',
    workingHours: '',
    paymentType: 'Per Day',
    paymentAmount: '',
    experience: 'No experience required / Fresher',
    verifications: {
      identity: true,
      face: true,
      document: true,
    },
    additionalRequirements: '',
  });

  const [customSkill, setCustomSkill] = useState('');

  const updateField = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (error) setError('');
  };

  // Toggle skill selection
  const toggleSkill = (skill) => {
    if (form.skills.includes(skill)) {
      setForm(prev => ({
        ...prev,
        skills: prev.skills.filter(s => s !== skill),
      }));
    } else {
      if (form.skills.length >= 8) {
        addToast('Maximum 8 skills can be selected', { type: 'info' });
        return;
      }
      setForm(prev => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));
    }
  };

  // Add custom skill
  const handleAddCustomSkill = (e) => {
    e.preventDefault();
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) {
      setCustomSkill('');
      return;
    }
    if (form.skills.length >= 8) {
      addToast('Maximum 8 skills allowed', { type: 'info' });
      return;
    }
    setForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setCustomSkill('');
  };

  // Category change auto-aligns Department
  const handleCategoryChange = (cat) => {
    updateField('category', cat);
    if (cat === 'Delivery' || cat === 'Warehouse') updateField('department', 'Delivery');
    else if (cat === 'Hospitality') updateField('department', 'Catering');
    else if (cat === 'Cleaning' || cat === 'Construction') updateField('department', 'Cleaning');
    else if (cat === 'Agriculture') updateField('department', 'Driving');
  };

  // Formatted Pay string for display and backend
  const formattedPay = useMemo(() => {
    const amt = form.paymentAmount ? form.paymentAmount.toString().replace(/[^0-9.]/g, '') : '';
    if (!amt) return '';
    const num = Number(amt).toLocaleString('en-IN');
    const foundType = PAYMENT_TYPES.find(p => p.id === form.paymentType);
    const unit = foundType ? foundType.unit : '/day';
    return `₹${num}${unit}`;
  }, [form.paymentAmount, form.paymentType]);

  // Step Validation
  const validateStep = (step) => {
    setError('');
    if (step === 1) {
      if (!form.title.trim()) {
        const msg = 'Please enter a job title';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (!form.description.trim() || form.description.trim().length < 20) {
        const msg = 'Job description must be at least 20 characters long';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (form.skills.length === 0) {
        const msg = 'Please select or add at least 1 required skill';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
    } else if (step === 2) {
      if (!form.location.trim()) {
        const msg = 'Please specify the work location';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (form.workersRequired < 1) {
        const msg = 'Number of workers required must be at least 1';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (!form.startDate) {
        const msg = 'Please select a start date';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (!form.endDate) {
        const msg = 'Please select an end date';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        const msg = 'End date cannot be before start date';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
      if (!form.workingHours || !form.workingHours.trim()) {
        const msg = 'Please specify the working hours';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
    } else if (step === 3) {
      if (!form.paymentAmount || Number(form.paymentAmount) <= 0) {
        const msg = 'Please enter a valid payment amount';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
    } else if (step === 5) {
      if (!feeAgreed) {
        const msg = 'Please accept the Terms & Conditions before posting the job.';
        setError(msg);
        addToast(msg, { type: 'error' });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      } else {
        handleSubmitJob();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Save Draft to LocalStorage
  const handleSaveDraft = () => {
    try {
      localStorage.setItem('wl_job_draft', JSON.stringify(form));
      addToast('Draft saved successfully to your device!', { type: 'success' });
    } catch {
      addToast('Unable to save draft.', { type: 'error' });
    }
  };

  // Submit Job to Backend API
  const handleSubmitJob = async () => {
    // Map temporary/contract to backend enum
    const typeMapping = {
      'Part-time': 'Part-time',
      'Full-time': 'Full-time',
      'Temporary': 'Short-term',
      'Contract': 'Freelance',
    };

    const deptValid = ['Catering', 'Driving', 'Cleaning', 'Delivery'].includes(form.department)
      ? form.department
      : 'Delivery';

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title: form.title.trim(),
        department: deptValid,
        type: typeMapping[form.type] || 'Part-time',
        location: form.location.trim(),
        pay: formattedPay,
        description: form.description.trim(),
        tags: form.skills,
        category: form.category,
        workersRequired: form.workersRequired,
        startDate: form.startDate,
        endDate: form.endDate,
        workingHours: form.workingHours,
        experience: form.experience,
      };

      const res = await createJob(payload);

      if (res.success) {
        addToast(`"${form.title}" posted successfully!`, { type: 'success' });
        localStorage.removeItem('wl_job_draft');
        if (onNavigate) {
          onNavigate('dashboard');
        }
      } else {
        throw new Error(res.message || 'Failed to post job');
      }
    } catch (err) {
      console.error('Job creation error:', err);
      const msg = err.message || 'Failed to publish job. Please check all fields.';
      setError(msg);
      addToast(msg, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="postjob-page-root fade-in">
      {/* ── 1. Main Page Header ── */}
      <div className="postjob-hero-header">
        <div className="postjob-hero-text">
          <div className="postjob-brand-badge">
            <span>🛡️ WorkLink — Secure Hiring. Trusted Workforce.</span>
          </div>
          <h1 className="postjob-main-title">Post a New Job</h1>
          <p className="postjob-subtitle">
            Create a job and find the right worker for your requirements.
          </p>
        </div>

        <div className="postjob-header-right">
          <span className="postjob-escrow-pill">
            <span className="escrow-dot" />
            100% Escrow Protected
          </span>
        </div>
      </div>

      {/* ── 2. Progress Indicator (1 Basic → 2 Work Details → 3 Payment → 4 Requirements → 5 Review) ── */}
      <div className="postjob-stepper-wrap">
        <div className="postjob-stepper">
          {STEPS.map((step) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div
                key={step.number}
                className={`stepper-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => {
                  if (isCompleted || validateStep(currentStep)) {
                    setCurrentStep(step.number);
                  }
                }}
              >
                <div className="stepper-circle">
                  {isCompleted ? '✓' : step.number}
                </div>
                <div className="stepper-content">
                  <span className="stepper-number-text">Step {step.number}</span>
                  <span className="stepper-title-text">{step.title}</span>
                </div>
                {step.number < STEPS.length && <div className="stepper-connector" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Error Banner if any ── */}
      {error && (
        <div className="postjob-alert-banner">
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>{error}</span>
          <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Main Two-Column Layout (Form on Left, Live Preview Card on Right) ── */}
      <div className="postjob-content-layout">
        {/* Left Column: Multi-Step Cards */}
        <div className="postjob-form-column">
          {/* ══════════ STEP 1: BASIC JOB INFORMATION ══════════ */}
          {currentStep === 1 && (
            <div className="postjob-card card-slide-in">
              <div className="card-section-heading">
                <span className="section-step-tag">Step 1</span>
                <div>
                  <h2 className="card-section-title">Basic Job Information</h2>
                  <p className="card-section-sub">Define the role, marketplace category, and foundational requirements.</p>
                </div>
              </div>

              {/* Job Title */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Job Title <span className="req">*</span>
                </label>
                <div className="pj-input-wrap">
                  <input
                    type="text"
                    className="pj-input"
                    placeholder="e.g. Delivery Worker"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    maxLength={80}
                  />
                  <span className="pj-input-icon">💼</span>
                </div>
                <span className="pj-hint">Use a clear, industry-recognized title to attract skilled workers quickly.</span>
              </div>

              {/* Job Category & Department Grid */}
              <div className="pj-row-2">
                {/* Category Dropdown */}
                <div className="pj-form-group">
                  <label className="pj-label">
                    Job Category <span className="req">*</span>
                  </label>
                  <div className="pj-select-wrap">
                    <select
                      className="pj-select"
                      value={form.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      {JOB_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <span className="pj-select-arrow">▼</span>
                  </div>
                </div>

                {/* Department Dropdown */}
                <div className="pj-form-group">
                  <label className="pj-label">
                    Department <span className="req">*</span>
                  </label>
                  <div className="pj-select-wrap">
                    <select
                      className="pj-select"
                      value={form.department}
                      onChange={(e) => updateField('department', e.target.value)}
                    >
                      <option value="" disabled>Select Department</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                    <span className="pj-select-arrow">▼</span>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="pj-form-group">
                <div className="pj-label-row">
                  <label className="pj-label">
                    Job Description <span className="req">*</span>
                  </label>
                  <span className="char-count">{form.description.length} / 1000</span>
                </div>
                <textarea
                  className="pj-textarea"
                  rows={5}
                  placeholder="Describe the job responsibilities, expectations and requirements..."
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  maxLength={1000}
                />
                <span className="pj-hint">Minimum 20 characters. Detail daily duties, timings, and physical expectations.</span>
              </div>

              {/* Required Skills Chips */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Required Skills <span className="req">*</span>
                </label>
                <div className="skills-chips-cloud">
                  {PRESET_SKILLS.map((skill) => {
                    const isSelected = form.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        className={`skill-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSkill(skill)}
                      >
                        {isSelected && <span className="chip-check">✓</span>}
                        {skill}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Skill */}
                <div className="add-custom-skill-row">
                  <input
                    type="text"
                    className="custom-skill-input"
                    placeholder="+ Add custom skill (e.g. Forklift, Welding)..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSkill(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-skill-action-btn"
                    onClick={handleAddCustomSkill}
                  >
                    + Add Skill
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ STEP 2: WORK DETAILS SECTION ══════════ */}
          {currentStep === 2 && (
            <div className="postjob-card card-slide-in">
              <div className="card-section-heading">
                <span className="section-step-tag">Step 2</span>
                <div>
                  <h2 className="card-section-title">Work Details & Schedule</h2>
                  <p className="card-section-sub">Specify employment type, operational shift, workers needed, and location.</p>
                </div>
              </div>

              {/* Job Type Selector */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Job Type <span className="req">*</span>
                </label>
                <div className="job-types-grid">
                  {JOB_TYPES.map((type) => {
                    const isSelected = form.type === type.id;
                    return (
                      <div
                        key={type.id}
                        className={`job-type-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => updateField('type', type.id)}
                      >
                        <div className="jt-radio">
                          <span className={`radio-dot ${isSelected ? 'active' : ''}`} />
                        </div>
                        <div className="jt-info">
                          <strong className="jt-title">{type.label}</strong>
                          <span className="jt-sub">{type.sub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Work Location */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Work Location <span className="req">*</span>
                </label>
                <div className="pj-input-wrap">
                  <input
                    type="text"
                    className="pj-input"
                    placeholder="e.g. Bengaluru, Electronic City Phase 1"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                  />
                  <span className="pj-input-icon">📍</span>
                </div>
              </div>

              {/* Number of Workers Required */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Number of Workers Required <span className="req">*</span>
                </label>
                <div className="workers-counter-wrap">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => updateField('workersRequired', Math.max(1, form.workersRequired - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="counter-input"
                    value={form.workersRequired}
                    onChange={(e) => updateField('workersRequired', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => updateField('workersRequired', form.workersRequired + 1)}
                  >
                    +
                  </button>
                  <span className="counter-label">Workers</span>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="pj-row-2">
                <div className="pj-form-group">
                  <label className="pj-label">
                    Start Date <span className="req">*</span>
                  </label>
                  <div className="pj-input-wrap">
                    <input
                      type="date"
                      className="pj-input date-picker"
                      value={form.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                    />
                    <span className="pj-input-icon">📅</span>
                  </div>
                </div>

                <div className="pj-form-group">
                  <label className="pj-label">
                    End Date <span className="req">*</span>
                  </label>
                  <div className="pj-input-wrap">
                    <input
                      type="date"
                      className="pj-input date-picker"
                      value={form.endDate}
                      onChange={(e) => updateField('endDate', e.target.value)}
                    />
                    <span className="pj-input-icon">📅</span>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Working Hours <span className="req">*</span>
                </label>
                <div className="pj-input-wrap">
                  <input
                    type="text"
                    className="pj-input"
                    placeholder="e.g. 9:00 AM - 5:00 PM (8 hrs/day)"
                    value={form.workingHours}
                    onChange={(e) => updateField('workingHours', e.target.value)}
                  />
                  <span className="pj-input-icon">⏰</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ STEP 3: PAYMENT SECTION ══════════ */}
          {currentStep === 3 && (
            <div className="postjob-card card-slide-in payment-highlight-card">
              <div className="card-section-heading">
                <span className="section-step-tag payment-tag">Step 3</span>
                <div>
                  <h2 className="card-section-title">Compensation & Escrow</h2>
                  <p className="card-section-sub">Define the payout model and estimated total for verified workers.</p>
                </div>
              </div>

              {/* Payment Type Grid */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Payment Type <span className="req">*</span>
                </label>
                <div className="payment-type-pills">
                  {PAYMENT_TYPES.map((pt) => {
                    const isSelected = form.paymentType === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        className={`payment-pill-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => updateField('paymentType', pt.id)}
                      >
                        <span className="pill-check">{isSelected ? '●' : '○'}</span>
                        {pt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Amount */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Payment Amount <span className="req">*</span>
                </label>
                <div className="pj-amount-input-wrap">
                  <span className="currency-prefix">₹</span>
                  <input
                    type="text"
                    className="pj-amount-input"
                    placeholder="1000"
                    value={form.paymentAmount}
                    onChange={(e) => updateField('paymentAmount', e.target.value)}
                  />
                  <span className="amount-unit">
                    {PAYMENT_TYPES.find(p => p.id === form.paymentType)?.unit || '/day'}
                  </span>
                </div>
              </div>

              {/* Step 12B: Dynamic 2% Platform Fee Breakdown in Step 3 */}
              {(() => {
                const { jobAmount, platformFee, employerTotal } = calculateEmployerFee(form.paymentAmount);
                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: 14,
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span>⚡</span> WorkLink 2% Platform Fee Breakdown
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Job Amount:</span>
                      <strong style={{ color: '#0f172a' }}>{formatINR(jobAmount)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>WorkLink Platform Fee (2%):</span>
                      <strong style={{ color: '#2563eb' }}>+ {formatINR(platformFee)}</strong>
                    </div>
                    <div style={{ height: 1, background: '#e2e8f0', margin: '2px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                      <span style={{ color: '#0f172a', fontWeight: 800 }}>Total Amount:</span>
                      <strong style={{ color: '#2563eb', fontSize: 16, fontWeight: 900 }}>{formatINR(employerTotal)}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Information Message */}
              <div className="escrow-info-notice">
                <div className="info-icon">ℹ️</div>
                <div className="info-text">
                  <strong>WorkLink Secure Escrow Protection:</strong>
                  <p>
                    Payment information will be used for the WorkLink transaction process. Funds are safely held in escrow and released directly to workers upon your verified shift completion sign-off.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ STEP 4: REQUIREMENTS & VERIFICATION ══════════ */}
          {currentStep === 4 && (
            <div className="postjob-card card-slide-in">
              <div className="card-section-heading">
                <span className="section-step-tag">Step 4</span>
                <div>
                  <h2 className="card-section-title">Requirements & Worker Verification</h2>
                  <p className="card-section-sub">Configure background verification gates and mandatory qualifications.</p>
                </div>
              </div>

              {/* Minimum Experience */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Minimum Experience <span className="req">*</span>
                </label>
                <div className="pj-select-wrap">
                  <select
                    className="pj-select"
                    value={form.experience}
                    onChange={(e) => updateField('experience', e.target.value)}
                  >
                    <option value="No experience required / Fresher">No experience required (Fresher welcome)</option>
                    <option value="6 Months - 1 Year">6 Months - 1 Year</option>
                    <option value="1 - 3 Years">1 - 3 Years</option>
                    <option value="3+ Years">3+ Years Experienced</option>
                  </select>
                  <span className="pj-select-arrow">▼</span>
                </div>
              </div>

              {/* Verification Gates (Connects to existing WorkLink checks) */}
              <div className="pj-form-group">
                <label className="pj-label">
                  Mandatory Verification Checks
                </label>
                <p className="pj-hint" style={{ marginBottom: 12 }}>
                  Only job seekers with verified status matching these gates will be allowed to submit applications.
                </p>

                <div className="verif-checkboxes-list">
                  <label className="verif-check-card">
                    <input
                      type="checkbox"
                      checked={form.verifications.identity}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        verifications: { ...prev.verifications, identity: e.target.checked }
                      }))}
                    />
                    <div className="verif-check-info">
                      <strong className="verif-title">☑ Identity Verification</strong>
                      <span className="verif-desc">Aadhaar card OCR document validity and name matching check.</span>
                    </div>
                  </label>

                  <label className="verif-check-card">
                    <input
                      type="checkbox"
                      checked={form.verifications.face}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        verifications: { ...prev.verifications, face: e.target.checked }
                      }))}
                    />
                    <div className="verif-check-info">
                      <strong className="verif-title">☑ Face Verification</strong>
                      <span className="verif-desc">Biometric facial match score between live webcam selfie and photo ID.</span>
                    </div>
                  </label>

                  <label className="verif-check-card">
                    <input
                      type="checkbox"
                      checked={form.verifications.document}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        verifications: { ...prev.verifications, document: e.target.checked }
                      }))}
                    />
                    <div className="verif-check-info">
                      <strong className="verif-title">☑ Document Verification</strong>
                      <span className="verif-desc">Anti-spoofing liveness confirmation and genuine government ID proofs.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Additional Requirements */}
              <div className="pj-form-group">
                <label className="pj-label">Additional Requirements</label>
                <textarea
                  className="pj-textarea"
                  rows={3}
                  placeholder="e.g. Must carry own safety footwear, valid driving license, or 2-wheeler..."
                  value={form.additionalRequirements}
                  onChange={(e) => updateField('additionalRequirements', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ══════════ STEP 5: REVIEW & PUBLISH ══════════ */}
          {currentStep === 5 && (
            <div className="postjob-card card-slide-in">
              <div className="card-section-heading">
                <span className="section-step-tag success-tag">Step 5</span>
                <div>
                  <h2 className="card-section-title">Review & Confirm Listing</h2>
                  <p className="card-section-sub">Please review your job details before publishing live to the marketplace.</p>
                </div>
              </div>

              <div className="review-summary-container">
                <div className="review-hero-box">
                  <div className="rh-title-row">
                    <div>
                      <h3 className="rh-title">{form.title || 'Untitled Job'}</h3>
                      <div className="rh-meta">
                        <span>🏷️ {form.category} · {form.department}</span>
                        <span>⏱️ {form.type}</span>
                        <span>📍 {form.location || 'Location not specified'}</span>
                      </div>
                    </div>
                    <div className="rh-pay-badge">
                      {formattedPay || 'Pay not specified'}
                    </div>
                  </div>
                </div>

                <div className="review-grid-details">
                  <div className="rg-item">
                    <span className="rg-label">Workers Required:</span>
                    <strong className="rg-val">{form.workersRequired} Person{form.workersRequired > 1 ? 's' : ''}</strong>
                  </div>
                  <div className="rg-item">
                    <span className="rg-label">Schedule Duration:</span>
                    <strong className="rg-val">{form.startDate || '—'} to {form.endDate || '—'}</strong>
                  </div>
                  <div className="rg-item">
                    <span className="rg-label">Daily Timings:</span>
                    <strong className="rg-val">{form.workingHours || '—'}</strong>
                  </div>
                  <div className="rg-item">
                    <span className="rg-label">Experience Gate:</span>
                    <strong className="rg-val">{form.experience}</strong>
                  </div>
                </div>

                <div className="review-skills-box">
                  <span className="rg-label">Required Skills:</span>
                  <div className="preview-skills-pills" style={{ marginTop: 6 }}>
                    {form.skills && form.skills.length > 0 ? (
                      form.skills.map(s => (
                        <span key={s} className="preview-skill-pill">{s}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No skills added</span>
                    )}
                  </div>
                </div>

                <div className="review-desc-box">
                  <span className="rg-label">Job Description:</span>
                  <p className="rg-desc-text">{form.description || 'No description provided.'}</p>
                </div>

                <div className="review-verif-box">
                  <span className="rg-label">Active Verification Filters:</span>
                  <div className="review-verif-tags">
                    {form.verifications.identity && <span className="rv-tag">✓ Aadhaar Verified</span>}
                    {form.verifications.face && <span className="rv-tag">✓ Face Biometric Match</span>}
                    {form.verifications.document && <span className="rv-tag">✓ Genuine ID Check</span>}
                  </div>
                </div>

                {/* ── STEP 12B: WORKLINK PLATFORM FEE (2%) CONFIRMATION RECEIPT ── */}
                {(() => {
                  const { jobAmount, platformFee, employerTotal } = calculateEmployerFee(form.paymentAmount);
                  return (
                    <div className="wl-employer-fee-receipt-card" style={{ marginTop: 20 }}>
                      <h3 className="wl-employer-fee-title">
                        <span>⚡</span> WorkLink Platform Fee (2%) Confirmation Receipt
                      </h3>
                      <div className="wl-fee-receipt-box">
                        <div className="wl-fee-receipt-row">
                          <span className="wl-fee-receipt-label">Job Amount:</span>
                          <span className="wl-fee-receipt-val">{formatINR(jobAmount)}</span>
                        </div>
                        <div className="wl-fee-receipt-row fee-row">
                          <span className="wl-fee-receipt-label">WorkLink Platform Fee (2%):</span>
                          <span className="wl-fee-receipt-val">+ {formatINR(platformFee)}</span>
                        </div>
                        <div className="wl-fee-receipt-divider" />
                        <div className="wl-fee-receipt-row total-row">
                          <span className="wl-fee-receipt-label" style={{ fontWeight: 800, color: '#0f172a' }}>
                            Total Amount:
                          </span>
                          <span className="wl-fee-receipt-val">
                            {formatINR(employerTotal)}
                          </span>
                        </div>
                      </div>

                      <label className="wl-fee-agreement-box">
                        <input
                          type="checkbox"
                          checked={feeAgreed}
                          onChange={(e) => setFeeAgreed(e.target.checked)}
                        />
                        <span className="wl-fee-agreement-text">
                          I accept the Terms & Conditions and agree to the 2% WorkLink platform fee.
                        </span>
                      </label>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── 9. BOTTOM ACTION BAR ── */}
          <div className="postjob-bottom-action-bar">
            {currentStep > 1 && (
              <button
                type="button"
                className="action-btn back"
                onClick={handleBack}
                disabled={submitting}
              >
                ← Back
              </button>
            )}

            <button
              type="button"
              className="action-btn draft"
              onClick={handleSaveDraft}
              disabled={submitting}
            >
              💾 Save as Draft
            </button>

            <button
              type="button"
              className="action-btn preview-btn"
              onClick={() => setShowPreviewModal(true)}
            >
              👁️ Preview
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              className={`action-btn next-primary ${submitting ? 'loading' : ''}`}
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting
                ? 'Publishing Listing...'
                : currentStep === 5
                ? '🚀 Publish Job Listing'
                : 'Next →'}
            </button>
          </div>
        </div>

        {/* ── 8. JOB PREVIEW SIDEBAR/CARD (DESKTOP) ── */}
        <div className="postjob-preview-column">
          <div className="preview-sticky-card">
            <div className="preview-header">
              <span className="preview-badge">● Live Marketplace Preview</span>
              <span className="preview-tip">Updates in real-time</span>
            </div>

            <div className="preview-job-card">
              {/* Job Title */}
              <h3 className="pjc-title">{form.title || 'Delivery Worker'}</h3>

              {/* Location */}
              <div className="pjc-meta-item">
                <span className="pjc-icon">📍</span>
                <span className="pjc-text">{form.location || 'Bengaluru'}</span>
              </div>

              {/* Pay */}
              <div className="pjc-meta-item">
                <span className="pjc-icon">💰</span>
                <strong className="pjc-pay">{formattedPay}</strong>
              </div>

              {/* Workers Required */}
              <div className="pjc-meta-item">
                <span className="pjc-icon">👥</span>
                <span className="pjc-text">{form.workersRequired || 2} Workers Required</span>
              </div>

              {/* Skills */}
              <div className="pjc-section-label">Skills:</div>
              <div className="preview-skills-pills">
                {form.skills && form.skills.length > 0 ? (
                  form.skills.map((s, idx) => (
                    <span key={idx} className="preview-skill-pill">
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No skills added</span>
                )}
              </div>

              {/* Job Type */}
              <div className="pjc-type-row">
                <span className="pjc-section-label">Job Type:</span>
                <span className="pjc-type-tag">{form.type || 'Part-time'}</span>
              </div>

              {/* Employer Brand & Trust Footer */}
              <div className="pjc-card-footer">
                <div className="pjc-company-info">
                  <div className="pjc-avatar">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div>
                    <strong className="pjc-company-name">
                      {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'WorkLink Verified Employer'}
                    </strong>
                    <div className="pjc-trust-badge">🛡️ 95 Trust Score</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="preview-job-action-btn"
                  onClick={() => setShowPreviewModal(true)}
                >
                  Preview Job
                </button>
              </div>
            </div>

            {/* Escrow Guarantee Callout */}
            <div className="preview-guarantee-note">
              <span className="pg-icon">🔒</span>
              <p>
                <strong>Escrow Protected:</strong> Direct deposit locked until job sign-off.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Job Modal (Full-Screen Seeker View) ── */}
      {showPreviewModal && (
        <div className="preview-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>👁️ Candidate View Preview</h3>
              <button className="preview-close-btn" onClick={() => setShowPreviewModal(false)}>✕</button>
            </div>

            <div className="preview-modal-body">
              <div className="pm-hero">
                <div className="pm-avatar-large">💼</div>
                <div>
                  <h2 className="pm-title">{form.title || 'Delivery Worker'}</h2>
                  <div className="pm-meta-row">
                    <span>📍 {form.location || 'Bengaluru'}</span>
                    <span>⏱️ {form.type}</span>
                    <span>🏷️ {form.category}</span>
                  </div>
                </div>
                <div className="pm-pay-badge">{formattedPay}</div>
              </div>

              <div className="pm-section">
                <h4>Required Skills</h4>
                <div className="preview-skills-pills">
                  {form.skills.map(s => (
                    <span key={s} className="preview-skill-pill">{s}</span>
                  ))}
                </div>
              </div>

              <div className="pm-section">
                <h4>Job Description</h4>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155' }}>
                  {form.description || 'No description provided yet.'}
                </p>
              </div>

              <div className="pm-section">
                <h4>Shift & Timings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div><strong>Schedule:</strong> {form.startDate} to {form.endDate}</div>
                  <div><strong>Hours:</strong> {form.workingHours}</div>
                  <div><strong>Workers Needed:</strong> {form.workersRequired}</div>
                  <div><strong>Min Experience:</strong> {form.experience}</div>
                </div>
              </div>

              <div className="pm-mock-apply">
                <button type="button" className="mock-apply-btn" disabled>
                  Apply Now (Worker View)
                </button>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Candidates must meet identity and biometric verification criteria to apply.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

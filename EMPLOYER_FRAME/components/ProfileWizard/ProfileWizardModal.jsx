import { useState } from 'react';
import StepAbout from './steps/StepAbout';
import StepSkills from './steps/StepSkills';
import StepDocuments from './steps/StepDocuments';
import StepComplete from './steps/StepComplete';
import { updateBio, updateSkills, completeProfile } from '../../data/api';
import './ProfileWizardModal.css';

const STEPS = [
  { key: 'about', label: 'About You', Component: StepAbout, validate: StepAbout.isValid },
  { key: 'skills', label: 'Skills', Component: StepSkills, validate: StepSkills.isValid },
  { key: 'documents', label: 'Documents', Component: StepDocuments, validate: StepDocuments.isValid },
  { key: 'complete', label: 'Done', Component: StepComplete, validate: StepComplete.isValid },
];

export default function ProfileWizardModal({ user, actionName, onComplete, onUserUpdate, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('next');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [wizardData, setWizardData] = useState({
    bio: user?.bio || '',
    location: user?.location || '',
    skills: user?.skills?.map(s => ({ name: s.name, level: s.level })) || [],
    documents: {},
  });

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isReviewStep = currentStep === STEPS.length - 1;
  const canAdvance = step.validate(wizardData);

  const handleNext = async () => {
    if (!canAdvance) return;
    setError('');

    // On the documents step (step 2 → step 3), save everything to backend
    if (currentStep === 2) {
      setSaving(true);
      try {
        // Save bio & location
        await updateBio(wizardData.bio, wizardData.location);

        // Save skills
        await updateSkills(wizardData.skills);

        // Upload documents and mark profile complete
        const formData = new FormData();
        const docs = wizardData.documents;
        if (docs.aadhaar?.file) formData.append('aadhaar', docs.aadhaar.file);
        if (docs.pan?.file) formData.append('pan', docs.pan.file);
        if (docs.photo?.file) formData.append('photo', docs.photo.file);

        const result = await completeProfile(formData);
        if (onUserUpdate) onUserUpdate(result.user);

        // Move to completion step
        setDirection('next');
        setCurrentStep(3);
      } catch (err) {
        console.error('Profile completion error:', err);
        setError(err.message || 'Failed to save profile. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (isLastStep) {
      // Finish
      onComplete(user);
      return;
    }

    setDirection('next');
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    setDirection('prev');
    setCurrentStep((prev) => prev - 1);
    setError('');
  };

  const handleDataChange = (newData) => {
    setWizardData(newData);
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="wizard-overlay">
      <div className="wizard-backdrop" />

      <div className="wizard-modal">
        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-header-top">
            <div className="wizard-logo">
              <div className="wizard-logo-mark">W</div>
              <span className="wizard-logo-text">WorkLink</span>
            </div>
            {actionName && (
              <div className="wizard-action-context">
                <span className="wizard-action-label">🔒 To {actionName}</span>
              </div>
            )}
            {currentStep < STEPS.length - 1 && onClose && (
              <button className="wizard-close-btn" onClick={onClose} title="Cancel">
                ✕
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="wizard-progress">
            <div className="wizard-progress-bar">
              <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="wizard-steps-nav">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className={`wizard-step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
                >
                  <div className="wizard-dot">
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className="wizard-dot-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="wizard-body">
          <div className={`wizard-step-wrapper wizard-slide-${direction}`} key={currentStep}>
            <step.Component
              data={wizardData}
              onChange={handleDataChange}
              user={user}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="wizard-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Footer */}
        <div className="wizard-footer">
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <button className="wizard-btn wizard-btn-back" onClick={handleBack} disabled={saving}>
              ← Back
            </button>
          )}
          <div className="wizard-footer-spacer" />
          <button
            className={`wizard-btn wizard-btn-next ${isLastStep ? 'wizard-btn-finish' : ''}`}
            onClick={handleNext}
            disabled={!canAdvance || saving}
          >
            {saving ? (
              <>
                <span className="wizard-spinner" />
                Saving…
              </>
            ) : isLastStep ? (
              <>Let's Go! 🚀</>
            ) : (
              <>Continue →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

export default function StepAbout({ data, onChange }) {
  const [bio, setBio] = useState(data.bio || '');
  const [location, setLocation] = useState(data.location || '');

  const handleBioChange = (val) => {
    setBio(val);
    onChange({ ...data, bio: val });
  };

  const handleLocationChange = (val) => {
    setLocation(val);
    onChange({ ...data, location: val });
  };

  const isValid = bio.trim().length >= 20 && location.trim().length >= 2;

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-icon">👤</div>
      <h2 className="wizard-step-title">Tell us about yourself</h2>
      <p className="wizard-step-desc">A good bio helps employers understand your strengths and find you faster.</p>

      <div className="wizard-field">
        <label className="wizard-label">
          About Me <span className="wizard-required">*</span>
        </label>
        <textarea
          className="wizard-textarea"
          value={bio}
          onChange={(e) => handleBioChange(e.target.value)}
          placeholder="I'm a passionate developer with 2+ years of experience in React and Node.js. I specialize in building responsive web apps…"
          maxLength={500}
          rows={5}
        />
        <div className="wizard-field-footer">
          <span className={`wizard-char-count ${bio.length > 450 ? 'warn' : ''}`}>
            {bio.length}/500
          </span>
          {bio.trim().length > 0 && bio.trim().length < 20 && (
            <span className="wizard-hint">Minimum 20 characters</span>
          )}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Location <span className="wizard-required">*</span>
        </label>
        <div className="wizard-input-icon-wrap">
          <span className="wizard-input-icon">📍</span>
          <input
            className="wizard-input has-icon"
            value={location}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder="e.g. Bengaluru, India"
            maxLength={100}
          />
        </div>
      </div>

      <div className="wizard-tip">
        <span className="wizard-tip-icon">💡</span>
        <span>Profiles with a detailed bio get <strong>3x more views</strong> from employers.</span>
      </div>
    </div>
  );
}

StepAbout.isValid = (data) => {
  return data.bio?.trim().length >= 20 && data.location?.trim().length >= 2;
};

import { useState } from 'react';

const WORKER_SKILLS = [
  'React', 'Node.js', 'Python', 'JavaScript', 'Figma',
  'MongoDB', 'SQL', 'TypeScript', 'Java', 'HTML/CSS',
  'Docker', 'AWS', 'Photoshop', 'Data Analysis', 'SEO',
];

const EMPLOYER_CATEGORIES = [
  'Catering', 'Delivery', 'Driving', 'Cleaning', 'Logistics',
  'Hospitality', 'Construction', 'Security', 'Maintenance', 'Retail',
];

export default function StepSkills({ data, onChange, user }) {
  const isEmployer = user?.role === 'employer';
  const [skills, setSkills] = useState(data.skills || []);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(50);

  const updateSkills = (updated) => {
    setSkills(updated);
    onChange({ ...data, skills: updated });
  };

  const addSkill = (name, level = 50) => {
    if (!name.trim() || skills.length >= 10) return;
    if (skills.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) return;
    updateSkills([...skills, { name: name.trim(), level }]);
    setNewSkillName('');
    setNewSkillLevel(50);
  };

  const removeSkill = (index) => {
    updateSkills(skills.filter((_, i) => i !== index));
  };

  const changeLevel = (index, level) => {
    const updated = [...skills];
    updated[index].level = parseInt(level);
    updateSkills(updated);
  };

  const suggestionsPool = isEmployer ? EMPLOYER_CATEGORIES : WORKER_SKILLS;
  const availableSuggestions = suggestionsPool.filter(
    s => !skills.some(sk => sk.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-icon">🎯</div>
      <h2 className="wizard-step-title">{isEmployer ? 'Hiring Categories & Trades' : 'Showcase your skills'}</h2>
      <p className="wizard-step-desc">
        {isEmployer
          ? 'Add at least 2 roles or trades your business frequently hires for.'
          : 'Add at least 2 skills so employers can match you with the right jobs.'}
      </p>

      {/* Popular skill chips */}
      {availableSuggestions.length > 0 && (
        <div className="wizard-chips-section">
          <span className="wizard-chips-label">Quick add:</span>
          <div className="wizard-chips">
            {availableSuggestions.slice(0, 8).map(s => (
              <button
                key={s}
                className="wizard-chip"
                onClick={() => addSkill(s)}
                disabled={skills.length >= 10}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current skills */}
      {skills.length > 0 && (
        <div className="wizard-skills-list">
          {skills.map((s, i) => (
            <div key={i} className="wizard-skill-row">
              <span className="wizard-skill-name">{s.name}</span>
              <input
                type="range"
                min="10"
                max="100"
                value={s.level}
                onChange={(e) => changeLevel(i, e.target.value)}
                className="wizard-slider"
              />
              <span className="wizard-skill-level">{s.level}%</span>
              <button className="wizard-skill-remove" onClick={() => removeSkill(i)} title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Manual add */}
      {skills.length < 10 && (
        <div className="wizard-add-skill">
          <input
            className="wizard-input"
            placeholder="Or type a custom skill…"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill(newSkillName, newSkillLevel)}
            maxLength={30}
          />
          <button
            className="wizard-add-btn"
            onClick={() => addSkill(newSkillName, newSkillLevel)}
            disabled={!newSkillName.trim()}
          >
            Add
          </button>
        </div>
      )}

      <p className="wizard-counter">
        {skills.length}/10 {isEmployer ? 'categories' : 'skills'} added
        {skills.length < 2 && <span className="wizard-hint"> · Add {2 - skills.length} more to continue</span>}
      </p>
    </div>
  );
}

StepSkills.isValid = (data) => {
  return data.skills?.length >= 2;
};

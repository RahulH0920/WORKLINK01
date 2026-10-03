import React from 'react';
import './TermsModal.css';

export const WORKLINK_TERMS = [
  {
    id: 1,
    title: 'Platform Commission & Payment',
    desc: 'A 2% platform service commission may apply to WorkLink payments.',
    icon: '💳',
  },
  {
    id: 2,
    title: 'Genuine Information',
    desc: 'Users must provide genuine personal information and valid documents.',
    icon: '📋',
  },
  {
    id: 3,
    title: 'Responsible Usage',
    desc: 'Users must not misuse the platform, create fake jobs/applications, or manipulate verification or payments.',
    icon: '🤝',
  },
  {
    id: 4,
    title: 'Suspicious Activities',
    desc: 'WorkLink may restrict accounts and take appropriate legal action against fraudulent or suspicious activities.',
    icon: '🛡️',
  },
];

export default function TermsModal({ isOpen, onClose, accepted, onToggleAccept, onAcceptAndClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="terms-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="terms-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="terms-modal-header">
          <div className="terms-modal-header-info">
            <div className="terms-modal-badge">
              <span className="terms-badge-icon">⚖️</span>
              <span>WorkLink Policy</span>
            </div>
            <h2 className="terms-modal-title" id="terms-modal-title">
              WorkLink Terms & Conditions
            </h2>
            <p className="terms-modal-subtitle">
              Please review the following platform terms before final profile submission.
            </p>
          </div>
          <button
            type="button"
            className="terms-modal-close-btn"
            onClick={onClose}
            aria-label="Close Terms modal"
            id="terms-modal-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Body with 4 terms */}
        <div className="terms-modal-body">
          <div className="terms-intro-card">
            <span className="terms-intro-icon">🛡️</span>
            <div className="terms-intro-text">
              <strong>WorkLink Platform Terms:</strong> All registered workers and employers must review and agree to our core terms to ensure a secure, transparent, and fair environment.
            </div>
          </div>

          <div className="terms-cards-list">
            {WORKLINK_TERMS.map((term) => (
              <div key={term.id} className="term-item-card" id={`term-card-${term.id}`}>
                <div className="term-item-header">
                  <div className="term-number-badge">{term.id}</div>
                  <div className="term-icon-wrap">{term.icon}</div>
                  <h3 className="term-title">
                    {term.id}. {term.title}
                  </h3>
                </div>
                <div className="term-body-text">
                  "{term.desc}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="terms-modal-footer">
          <label className="terms-modal-checkbox-row" htmlFor="modal-terms-checkbox">
            <input
              type="checkbox"
              id="modal-terms-checkbox"
              className="terms-checkbox-input"
              checked={accepted}
              onChange={(e) => onToggleAccept(e.target.checked)}
            />
            <span className="terms-checkbox-text">
              I have read and agree to the WorkLink Terms & Conditions.
            </span>
          </label>

          <div className="terms-modal-footer-actions">
            <button
              type="button"
              className="terms-btn-secondary"
              onClick={onClose}
              id="terms-modal-dismiss-btn"
            >
              Close
            </button>
            <button
              type="button"
              className="terms-btn-primary"
              onClick={() => {
                if (onAcceptAndClose) {
                  onAcceptAndClose();
                } else {
                  onToggleAccept(true);
                  onClose();
                }
              }}
              id="terms-modal-accept-btn"
            >
              ✓ Agree & Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

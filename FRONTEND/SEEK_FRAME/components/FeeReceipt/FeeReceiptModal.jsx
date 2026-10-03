import React, { useState } from 'react';
import './FeeReceiptModal.css';

/**
 * Parses numeric currency amount from string or number.
 * e.g., "₹850/day" -> 850, "₹10,000" -> 10000, 500 -> 500
 */
export function parseJobAmount(payStrOrNum) {
  if (typeof payStrOrNum === 'number') return isNaN(payStrOrNum) ? 0 : payStrOrNum;
  if (!payStrOrNum) return 0;
  const cleaned = String(payStrOrNum).replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Formats a number to Indian currency format with INR symbol.
 * e.g., 10000 -> "₹10,000", 98.5 -> "₹98.50"
 */
export function formatINR(val) {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  const isWhole = num % 1 === 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculates Worker Dynamic 2% Platform Fee & Net Earning.
 * workerFee = jobAmount × 2%
 * workerNet = jobAmount - workerFee
 */
export function calculateWorkerFee(payInput) {
  const jobAmount = parseJobAmount(payInput);
  const workerFee = +(jobAmount * 0.02).toFixed(2);
  const workerNet = +(jobAmount - workerFee).toFixed(2);
  return {
    jobAmount,
    workerFee,
    workerNet,
  };
}

/**
 * Calculates Employer Dynamic 2% Platform Fee & Total Amount.
 * platformFee = jobAmount × 2%
 * employerTotal = jobAmount + platformFee
 */
export function calculateEmployerFee(payInput) {
  const jobAmount = parseJobAmount(payInput);
  const platformFee = +(jobAmount * 0.02).toFixed(2);
  const employerTotal = +(jobAmount + platformFee).toFixed(2);
  return {
    jobAmount,
    platformFee,
    employerTotal,
  };
}

/**
 * 12A: Worker-Side Fee Receipt Confirmation Modal Before Applying
 */
export default function WorkerFeeReceiptModal({
  job,
  isOpen,
  onClose,
  onConfirmApply,
  applying = false,
}) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen || !job) return null;

  const { jobAmount, workerFee, workerNet } = calculateWorkerFee(job.pay);
  const employerName =
    typeof job.employer === 'object' && job.employer?.name
      ? job.employer.name
      : typeof job.employer === 'string'
      ? job.employer
      : 'WorkLink Verified Employer';

  const handleConfirm = () => {
    if (!agreed || applying) return;
    onConfirmApply();
  };

  return (
    <div className="wl-fee-modal-overlay" onClick={() => !applying && onClose()}>
      <div className="wl-fee-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wl-fee-modal-header">
          <div>
            <span className="wl-fee-badge-tag">⚡ WorkLink Platform Fee (2%)</span>
            <h2 className="wl-fee-modal-title">Confirm Application & Fee Receipt</h2>
            <p className="wl-fee-modal-sub">
              Review your payout breakdown before submitting your application.
            </p>
          </div>
          <button
            type="button"
            className="wl-fee-close-btn"
            onClick={() => !applying && onClose()}
            disabled={applying}
          >
            ✕
          </button>
        </div>

        {/* Receipt Box */}
        <div className="wl-fee-receipt-box">
          <div className="wl-fee-receipt-job-info">
            <div>
              <h3 className="wl-fee-job-title">{job.title || 'Untitled Job'}</h3>
              <p className="wl-fee-job-dept">
                {job.department || 'General'} • 📍 {job.location || 'Location not set'}
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
              <span>Employer</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{employerName}</div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="wl-fee-receipt-row">
            <span className="wl-fee-receipt-label">Job Amount:</span>
            <span className="wl-fee-receipt-val">{formatINR(jobAmount)}</span>
          </div>

          <div className="wl-fee-receipt-row fee-row">
            <span className="wl-fee-receipt-label">WorkLink Platform Fee (2%):</span>
            <span className="wl-fee-receipt-val">- {formatINR(workerFee)}</span>
          </div>

          <div className="wl-fee-receipt-divider" />

          <div className="wl-fee-receipt-row net-row">
            <span className="wl-fee-receipt-label">Your Net Earning:</span>
            <span className="wl-fee-receipt-val">{formatINR(workerNet)}</span>
          </div>
        </div>

        {/* Checkbox Acceptance */}
        <label className="wl-fee-agreement-box">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={applying}
          />
          <span className="wl-fee-agreement-text">
            I have read and agree to the 2% WorkLink platform fee.
          </span>
        </label>

        {/* Actions */}
        <div className="wl-fee-modal-actions">
          <button
            type="button"
            className="wl-fee-btn-secondary"
            onClick={onClose}
            disabled={applying}
          >
            Cancel
          </button>
          <button
            type="button"
            className="wl-fee-btn-primary"
            onClick={handleConfirm}
            disabled={!agreed || applying}
          >
            {applying ? 'Submitting Application…' : 'Apply Now →'}
          </button>
        </div>
      </div>
    </div>
  );
}

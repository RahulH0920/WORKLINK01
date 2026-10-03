import React, { useState } from 'react';
import { parseJobAmount, formatINR } from './FeeReceiptModal';
import { printReceipt, downloadReceiptPDF } from '../../utils/receiptPrinter';
import './EmployerAdvanceModal.css';

/**
 * Calculates Employer 50% Advance Payment breakdown dynamically.
 * platformFee = jobAmount × 2%
 * employerTotal = jobAmount + platformFee
 * advanceAmount = employerTotal × 50%
 * remainingAmount = employerTotal - advanceAmount
 */
export function calculateEmployerAdvance(payInput) {
  const jobAmount = parseJobAmount(payInput);
  const platformFee = +(jobAmount * 0.02).toFixed(2);
  const employerTotal = +(jobAmount + platformFee).toFixed(2);
  const advanceAmount = +(employerTotal * 0.5).toFixed(2);
  const remainingAmount = +(employerTotal - advanceAmount).toFixed(2);

  return {
    jobAmount,
    platformFee,
    employerTotal,
    advanceAmount,
    remainingAmount,
  };
}

/**
 * Generates a unique WorkLink transaction reference ID.
 */
export function generateTransactionId() {
  const prefix = 'WL-TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${randomPart}`;
}

/**
 * 12C + 12D: Employer 50% Advance Payment Modal & Transaction Receipt
 */
export default function EmployerAdvanceModal({
  isOpen,
  applicant,
  job,
  employerUser,
  onClose,
  onConfirmAdvancePayment,
  processing = false,
}) {
  const [agreed, setAgreed] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  if (!isOpen || !applicant || !job) return null;

  // Extract real candidate information
  const person = applicant.applicant || applicant;
  const workerName = typeof person === 'object'
    ? (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Worker Candidate')
    : 'Worker Candidate';

  const employerName = employerUser?.name
    ? employerUser.name
    : typeof job.employer === 'object' && job.employer?.name
    ? job.employer.name
    : 'WorkLink Employer';

  const {
    jobAmount,
    platformFee,
    employerTotal,
    advanceAmount,
    remainingAmount,
  } = calculateEmployerAdvance(job.pay);

  // Handle Pay Advance & Hire
  const handlePayAdvance = async () => {
    if (!agreed || processing) return;

    const txnId = generateTransactionId();
    const txnRecord = {
      transactionId: txnId,
      jobId: job._id || job.id,
      jobTitle: job.title || 'Untitled Position',
      employerName,
      workerName,
      jobAmount,
      platformFee,
      employerTotal,
      advancePaid: advanceAmount,
      remainingAmount,
      paymentStatus: 'Advance Paid',
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };

    try {
      // Execute hiring flow
      await onConfirmAdvancePayment(txnRecord);
      // Show receipt
      setReceiptData(txnRecord);
    } catch (err) {
      console.error('Advance payment failed:', err);
    }
  };

  // Print Receipt handler
  const handlePrint = () => {
    if (!receiptData) return;
    printReceipt(receiptData, 'employer_advance');
  };

  // Download Receipt handler
  const handleDownload = () => {
    if (!receiptData) return;
    downloadReceiptPDF(receiptData, 'employer_advance');
  };

  return (
    <div className="wl-advance-modal-overlay" onClick={() => !processing && !receiptData && onClose()}>
      {/* ── STEP 12D: ADVANCE TRANSACTION RECEIPT ── */}
      {receiptData ? (
        <div className="wl-receipt-card-container" onClick={(e) => e.stopPropagation()}>
          {/* Receipt Brand Header */}
          <div className="wl-receipt-brand-row">
            <div className="wl-receipt-brand-logo">
              <div className="wl-receipt-logo-icon">W</div>
              <span className="wl-receipt-brand-name">WorkLink AI</span>
            </div>
            <div className="wl-receipt-title-badge">
              <h2 className="wl-receipt-doc-title">Advance Payment Receipt</h2>
              <span className="wl-receipt-status-pill">✓ Advance Paid</span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="wl-receipt-meta-grid">
            <div className="wl-receipt-meta-item">
              <span className="wl-receipt-meta-label">Transaction ID</span>
              <span className="wl-receipt-meta-val txn-id">{receiptData.transactionId}</span>
            </div>
            <div className="wl-receipt-meta-item">
              <span className="wl-receipt-meta-label">Date & Time</span>
              <span className="wl-receipt-meta-val">{receiptData.timestamp}</span>
            </div>
            <div className="wl-receipt-meta-item">
              <span className="wl-receipt-meta-label">Job Title / ID</span>
              <span className="wl-receipt-meta-val">{receiptData.jobTitle}</span>
            </div>
            <div className="wl-receipt-meta-item">
              <span className="wl-receipt-meta-label">Employer Name</span>
              <span className="wl-receipt-meta-val">{receiptData.employerName}</span>
            </div>
            <div className="wl-receipt-meta-item">
              <span className="wl-receipt-meta-label">Hired Worker</span>
              <span className="wl-receipt-meta-val">{receiptData.workerName}</span>
            </div>
            <div className="wl-receipt-meta-item">
              <span className="wl-receipt-meta-label">Payment Mode</span>
              <span className="wl-receipt-meta-val">🛡️ Escrow Advance (50%)</span>
            </div>
          </div>

          {/* Amount Breakdown Table */}
          <table className="wl-receipt-table">
            <tbody>
              <tr>
                <td>Job Base Amount</td>
                <td className="val-col">{formatINR(receiptData.jobAmount)}</td>
              </tr>
              <tr>
                <td>Employer Platform Fee (2%)</td>
                <td className="val-col">+ {formatINR(receiptData.platformFee)}</td>
              </tr>
              <tr>
                <td><strong>Total Employer Commitment</strong></td>
                <td className="val-col"><strong>{formatINR(receiptData.employerTotal)}</strong></td>
              </tr>
              <tr className="highlight-paid">
                <td>50% Advance Paid (Held in Escrow)</td>
                <td className="val-col">{formatINR(receiptData.advancePaid)}</td>
              </tr>
              <tr>
                <td>Remaining Payout (Upon Completion)</td>
                <td className="val-col">{formatINR(receiptData.remainingAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Receipt Action Buttons */}
          <div className="wl-receipt-action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="wl-fee-btn-secondary"
              onClick={handleDownload}
            >
              📥 Download Receipt
            </button>
            <button
              type="button"
              className="wl-fee-btn-secondary"
              onClick={handlePrint}
            >
              🖨️ Print Receipt
            </button>
            <button
              type="button"
              className="wl-fee-btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* ── STEP 12C: EMPLOYER 50% ADVANCE PAYMENT CONFIRMATION SCREEN ── */
        <div className="wl-advance-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="wl-advance-header">
            <div>
              <span className="wl-advance-title-badge">🛡️ 50% Escrow Advance Payment</span>
              <h2 className="wl-advance-title">Confirm Hiring & Pay 50% Advance</h2>
              <p className="wl-advance-sub">
                Secure the worker for this position by depositing the 50% advance into WorkLink escrow.
              </p>
            </div>
            <button
              type="button"
              className="wl-fee-close-btn"
              onClick={onClose}
              disabled={processing}
            >
              ✕
            </button>
          </div>

          {/* Candidate & Job Summary */}
          <div className="wl-advance-candidate-strip">
            <div className="wl-candidate-name-group">
              <span className="wl-candidate-name">👤 {workerName}</span>
              <span className="wl-candidate-job">Position: <strong>{job.title}</strong></span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
              <span>Base Pay</span>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{formatINR(jobAmount)}</div>
            </div>
          </div>

          {/* Dynamic Calculation Breakdown */}
          <div className="wl-advance-calc-box">
            <div className="wl-calc-row">
              <span className="wl-calc-label">Job Amount:</span>
              <span className="wl-calc-val">{formatINR(jobAmount)}</span>
            </div>

            <div className="wl-calc-row fee-row">
              <span className="wl-calc-label">WorkLink Platform Fee (2%):</span>
              <span className="wl-calc-val">+ {formatINR(platformFee)}</span>
            </div>

            <div className="wl-calc-row total-row">
              <span className="wl-calc-label">Total Employer Amount:</span>
              <span className="wl-calc-val">{formatINR(employerTotal)}</span>
            </div>

            {/* 50% Advance Highlight */}
            <div className="wl-advance-highlight-section">
              <div className="wl-advance-highlight-row">
                <span className="wl-advance-highlight-label">50% Advance Required:</span>
                <span className="wl-advance-highlight-val">{formatINR(advanceAmount)}</span>
              </div>
              <div className="wl-remaining-row">
                <span>Remaining After Advance (Due at shift sign-off):</span>
                <strong>{formatINR(remainingAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Checkbox Agreement */}
          <label className="wl-advance-agree-box">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={processing}
            />
            <span className="wl-advance-agree-text">
              I understand and agree to the advance payment requirement.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="wl-advance-modal-actions">
            <button
              type="button"
              className="wl-fee-btn-secondary"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="wl-advance-btn-pay"
              onClick={handlePayAdvance}
              disabled={!agreed || processing}
            >
              {processing ? 'Processing Advance Deposit…' : `Pay Advance (${formatINR(advanceAmount)}) & Hire →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

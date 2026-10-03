import React, { useState } from 'react';
import { parseJobAmount, formatINR } from './FeeReceiptModal';
import { calculateEmployerAdvance } from './EmployerAdvanceModal';
import { printReceipt, downloadReceiptPDF } from '../../utils/receiptPrinter';
import './EmployerAdvanceModal.css';

/**
 * 12F + 12G: Employer Remaining Payment Modal & Final Payment Receipt
 */
export default function EmployerRemainingModal({
  isOpen,
  applicant,
  job,
  employerUser,
  onClose,
  onConfirmRemainingPayment,
  processing = false,
  initialReceipt = null,
}) {
  const [agreed, setAgreed] = useState(false);
  const [receiptData, setReceiptData] = useState(initialReceipt);

  if (!isOpen || !job) return null;

  // Extract real candidate information
  const person = applicant?.applicant || applicant || job?.hiredWorker;
  const workerName = typeof person === 'object'
    ? (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Hired Worker')
    : 'Hired Worker';

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

  const txnId = job.transactionId || initialReceipt?.transactionId || `WL-TXN-${job._id?.toString().slice(-8).toUpperCase()}`;

  const handlePayRemaining = async () => {
    if (processing) return;

    try {
      const result = await onConfirmRemainingPayment();
      const now = new Date();
      const finalReceipt = {
        transactionId: result?.transaction?.transactionId || txnId,
        jobId: job._id || job.id,
        jobTitle: job.title || 'Job Position',
        workerName,
        employerName,
        jobAmount,
        platformFee,
        employerTotal,
        advancePaid: advanceAmount,
        remainingPaid: remainingAmount,
        totalPaid: employerTotal,
        paymentStatus: 'Completed',
        date: now.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        time: now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setReceiptData(finalReceipt);
    } catch (err) {
      console.error('Remaining payment failed:', err);
    }
  };

  const handlePrint = () => {
    if (!receiptData) return;
    printReceipt(receiptData, 'employer_final');
  };

  const handleDownload = () => {
    if (!receiptData) return;
    downloadReceiptPDF(receiptData, 'employer_final');
  };

  return (
    <div className="wl-advance-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="wl-advance-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* ── STAGE 2: FINAL RECEIPT VIEW ── */}
        {receiptData ? (
          <div className="wl-advance-receipt-view">
            
            <div className="wl-receipt-success-badge">
              <div className="wl-receipt-icon-circle">✓</div>
              <div className="wl-receipt-title-wrap">
                <h3 className="wl-receipt-headline">WorkLink Payment Receipt</h3>
                <p className="wl-receipt-subheadline">
                  Final settlement complete • Remaining 50% successfully paid
                </p>
              </div>
            </div>

            <div className="wl-receipt-paper-card">
              
              <div className="wl-receipt-meta-grid">
                <div className="wl-receipt-meta-cell">
                  <span className="wl-meta-label">TRANSACTION ID</span>
                  <span className="wl-meta-val code-val">{receiptData.transactionId}</span>
                </div>
                <div className="wl-receipt-meta-cell">
                  <span className="wl-meta-label">STATUS</span>
                  <span className="wl-meta-val pill-green-tag">✓ {receiptData.paymentStatus}</span>
                </div>
                <div className="wl-receipt-meta-cell">
                  <span className="wl-meta-label">JOB TITLE</span>
                  <span className="wl-meta-val bold-val">{receiptData.jobTitle}</span>
                </div>
                <div className="wl-receipt-meta-cell">
                  <span className="wl-meta-label">HIRED WORKER</span>
                  <span className="wl-meta-val">{receiptData.workerName}</span>
                </div>
                <div className="wl-receipt-meta-cell">
                  <span className="wl-meta-label">DATE</span>
                  <span className="wl-meta-val">{receiptData.date}</span>
                </div>
                <div className="wl-receipt-meta-cell">
                  <span className="wl-meta-label">TIME</span>
                  <span className="wl-meta-val">{receiptData.time}</span>
                </div>
              </div>

              <div className="wl-receipt-divider" />

              <div className="wl-receipt-table">
                <div className="wl-receipt-row">
                  <span className="wl-row-label">Job Amount</span>
                  <span className="wl-row-val">{formatINR(receiptData.jobAmount)}</span>
                </div>
                <div className="wl-receipt-row">
                  <span className="wl-row-label">Platform Fee (2%)</span>
                  <span className="wl-row-val">{formatINR(receiptData.platformFee)}</span>
                </div>
                <div className="wl-receipt-row highlight-subtotal">
                  <span className="wl-row-label">Employer Total</span>
                  <span className="wl-row-val">{formatINR(receiptData.employerTotal)}</span>
                </div>
                <div className="wl-receipt-row text-muted">
                  <span className="wl-row-label">Advance Paid (50%)</span>
                  <span className="wl-row-val green-text">✓ {formatINR(receiptData.advancePaid)}</span>
                </div>
                <div className="wl-receipt-row text-muted">
                  <span className="wl-row-label">Remaining Paid (50%)</span>
                  <span className="wl-row-val green-text">✓ {formatINR(receiptData.remainingPaid)}</span>
                </div>
                <div className="wl-receipt-row total-row">
                  <span className="wl-row-label">Total Paid</span>
                  <span className="wl-row-val total-amt">{formatINR(receiptData.totalPaid)}</span>
                </div>
              </div>

              <div className="wl-receipt-watermark-row">
                <span>🛡️ 100% WorkLink Escrow Settled & Verified</span>
              </div>
            </div>

            <div className="wl-receipt-actions">
              <button className="btn btn-outline" onClick={handlePrint}>
                🖨️ Print Receipt
              </button>
              <button className="btn btn-outline" onClick={handleDownload}>
                📥 Download PDF / TXT
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>

          </div>
        ) : (
          /* ── STAGE 1: REMAINING PAYMENT CONFIRMATION ── */
          <>
            <div className="wl-advance-header">
              <div>
                <span className="wl-advance-title-badge">STEP 12F • FINAL SETTLEMENT</span>
                <h2 className="wl-advance-title">Remaining Payment (50%)</h2>
                <p className="wl-advance-sub">
                  Job completion has been confirmed. Release the remaining payment to finalize worker settlement.
                </p>
              </div>
              <button className="wl-advance-close-btn" onClick={onClose} aria-label="Close modal">
                ✕
              </button>
            </div>

            <div className="wl-advance-candidate-strip">
              <div className="wl-candidate-name-group">
                <span className="wl-candidate-name">👤 {workerName}</span>
                <span className="wl-candidate-job">💼 {job.title}</span>
              </div>
              <span className="wl-advance-step-tag" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                ✓ Work Completed
              </span>
            </div>

            <div className="wl-advance-calc-card">
              <h4 className="wl-calc-heading">Payment & Settlement Breakdown</h4>
              
              <div className="wl-calc-row">
                <span className="wl-calc-label">Job Amount</span>
                <span className="wl-calc-val">{formatINR(jobAmount)}</span>
              </div>

              <div className="wl-calc-row">
                <span className="wl-calc-label">Employer Platform Fee (2%)</span>
                <span className="wl-calc-val">{formatINR(platformFee)}</span>
              </div>

              <div className="wl-calc-row subtotal-row">
                <span className="wl-calc-label">Employer Total</span>
                <span className="wl-calc-val">{formatINR(employerTotal)}</span>
              </div>

              <div className="wl-calc-row" style={{ color: '#059669' }}>
                <span className="wl-calc-label">Advance Paid</span>
                <span className="wl-calc-val">✓ {formatINR(advanceAmount)}</span>
              </div>

              <div className="wl-calc-row due-now-row">
                <div className="wl-due-label-group">
                  <span className="wl-due-title">Remaining Amount</span>
                  <span className="wl-due-subtitle">Due now to settle worker payout</span>
                </div>
                <span className="wl-due-amount">{formatINR(remainingAmount)}</span>
              </div>
            </div>

            <div className="wl-advance-policy-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="wl-policy-icon">🛡️</div>
              <div className="wl-policy-text">
                Releasing the remaining payment automatically settles the worker's net earnings and generates the final tamper-proof receipts for both parties.
              </div>
            </div>

            <div className="wl-advance-modal-footer">
              <button className="btn btn-outline" onClick={onClose} disabled={processing}>
                Cancel
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={handlePayRemaining}
                disabled={processing}
              >
                {processing ? 'Processing Settlement…' : `Pay Remaining ${formatINR(remainingAmount)}`}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

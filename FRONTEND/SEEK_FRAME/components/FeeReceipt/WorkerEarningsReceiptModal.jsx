import React from 'react';
import { parseJobAmount, formatINR } from './FeeReceiptModal';
import { printReceipt, downloadReceiptPDF } from '../../utils/receiptPrinter';
import './EmployerAdvanceModal.css';

/**
 * 12G: Worker Final Earnings Receipt Modal
 * Displays strictly worker-side financial breakdown (NO employer fees shown).
 */
export default function WorkerEarningsReceiptModal({
  isOpen,
  receipt,
  job,
  onClose,
}) {
  if (!isOpen) return null;

  const jobAmount = receipt?.jobAmount !== undefined ? receipt.jobAmount : parseJobAmount(job?.pay);
  const workerFee = receipt?.workerFee !== undefined ? receipt.workerFee : +(jobAmount * 0.02).toFixed(2);
  const netEarning = receipt?.netEarning !== undefined ? receipt.netEarning : +(jobAmount - workerFee).toFixed(2);
  const transactionId = receipt?.transactionId || job?.transactionId || `WL-TXN-${job?._id?.toString().slice(-8).toUpperCase()}`;
  const jobTitle = receipt?.jobTitle || job?.title || 'Completed Job';
  const employerName = receipt?.employerName || (typeof job?.employer === 'object' ? job?.employer?.name : 'Employer');
  const settlementStatus = receipt?.settlementStatus || 'Settled';
  const date = receipt?.date || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const time = receipt?.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const receiptObj = {
    transactionId,
    jobId: receipt?.jobId || job?._id || job?.id,
    jobTitle,
    employerName,
    workerName: 'You',
    date,
    time,
    paymentStatus: settlementStatus,
    jobAmount,
    workerFee,
    workerNetEarning: netEarning,
  };

  const handlePrint = () => {
    printReceipt(receiptObj, 'worker_earnings');
  };

  const handleDownload = () => {
    downloadReceiptPDF(receiptObj, 'worker_earnings');
  };

  return (
    <div className="wl-advance-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="wl-advance-modal-card" onClick={(e) => e.stopPropagation()}>
        
        <div className="wl-advance-receipt-view">
          
          <div className="wl-receipt-success-badge" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
            <div className="wl-receipt-icon-circle" style={{ background: '#059669' }}>✓</div>
            <div className="wl-receipt-title-wrap">
              <h3 className="wl-receipt-headline" style={{ color: '#065f46' }}>WorkLink Earnings Receipt</h3>
              <p className="wl-receipt-subheadline" style={{ color: '#047857' }}>
                Payment settled successfully • Net payout disbursed to your account
              </p>
            </div>
          </div>

          <div className="wl-receipt-paper-card">
            
            <div className="wl-receipt-meta-grid">
              <div className="wl-receipt-meta-cell">
                <span className="wl-meta-label">TRANSACTION ID</span>
                <span className="wl-meta-val code-val">{transactionId}</span>
              </div>
              <div className="wl-receipt-meta-cell">
                <span className="wl-meta-label">STATUS</span>
                <span className="wl-meta-val pill-green-tag">✓ {settlementStatus}</span>
              </div>
              <div className="wl-receipt-meta-cell">
                <span className="wl-meta-label">JOB TITLE</span>
                <span className="wl-meta-val bold-val">{jobTitle}</span>
              </div>
              <div className="wl-receipt-meta-cell">
                <span className="wl-meta-label">EMPLOYER</span>
                <span className="wl-meta-val">{employerName}</span>
              </div>
              <div className="wl-receipt-meta-cell">
                <span className="wl-meta-label">DATE</span>
                <span className="wl-meta-val">{date}</span>
              </div>
              <div className="wl-receipt-meta-cell">
                <span className="wl-meta-label">TIME</span>
                <span className="wl-meta-val">{time}</span>
              </div>
            </div>

            <div className="wl-receipt-divider" />

            <div className="wl-receipt-table">
              <div className="wl-receipt-row">
                <span className="wl-row-label">Job Amount</span>
                <span className="wl-row-val">{formatINR(jobAmount)}</span>
              </div>
              <div className="wl-receipt-row text-muted">
                <span className="wl-row-label">WorkLink Fee (2%)</span>
                <span className="wl-row-val" style={{ color: '#dc2626' }}>-{formatINR(workerFee)}</span>
              </div>
              <div className="wl-receipt-row total-row" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="wl-row-label" style={{ color: '#166534', fontWeight: 800 }}>Your Net Earning</span>
                  <span style={{ fontSize: 11, color: '#15803d' }}>Disbursed upon job completion</span>
                </div>
                <span className="wl-row-val total-amt" style={{ color: '#15803d' }}>{formatINR(netEarning)}</span>
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

      </div>
    </div>
  );
}

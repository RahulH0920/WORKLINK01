import React, { useState, useEffect } from 'react';
import { getEmployerPayments } from '../../data/api';
import EmployerRemainingModal from '../../components/FeeReceipt/EmployerRemainingModal';
import { formatINR } from '../../components/FeeReceipt/FeeReceiptModal';
import './EmployerTransactionsView.css';

export default function EmployerTransactionsView({ onClose, isModal = false, employerUser = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalPaid: 0,
    advancePayments: 0,
    remainingPayments: 0,
    pendingPayments: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployerPayments();
      if (res.success) {
        setSummary(res.summary || {
          totalPaid: 0,
          advancePayments: 0,
          remainingPayments: 0,
          pendingPayments: 0,
        });
        setTransactions(res.transactions || []);
      } else {
        setError(res.message || 'Failed to load employer payment history');
      }
    } catch (err) {
      console.error('Fetch employer payments error:', err);
      setError(err.message || 'Error connecting to payment server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = transactions.filter(tx => {
    const matchesFilter = filter === 'all' ||
      (filter === 'completed' && tx.paymentStatus?.toLowerCase().includes('completed')) ||
      (filter === 'advance' && tx.paymentStatus?.toLowerCase().includes('advance')) ||
      (filter === 'pending' && tx.paymentStatus?.toLowerCase().includes('pending')) ||
      (filter === 'disputed' && tx.paymentStatus?.toLowerCase().includes('disputed'));

    const query = search.toLowerCase();
    const matchesSearch = !query || 
      (tx.workerName && tx.workerName.toLowerCase().includes(query)) || 
      (tx.jobTitle && tx.jobTitle.toLowerCase().includes(query)) ||
      (tx.transactionId && tx.transactionId.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  const openReceipt = (tx) => {
    const receiptObj = {
      transactionId: tx.transactionId,
      jobId: tx.jobId,
      jobTitle: tx.jobTitle,
      workerName: tx.workerName,
      employerName: employerUser?.name || 'WorkLink Employer',
      jobAmount: tx.jobAmount,
      platformFee: tx.employerFee,
      employerTotal: tx.employerTotal,
      advancePaid: tx.advancePaid,
      remainingPaid: tx.remainingPaid,
      totalPaid: tx.totalPaid,
      paymentStatus: tx.paymentStatus,
      date: tx.date,
      time: tx.time || '12:00 PM',
    };
    setSelectedReceipt(receiptObj);
  };

  const content = (
    <div className="tx-view-container">
      {/* Header */}
      <div className="tx-header-row">
        <div>
          <div className="tx-badge-top">💼 Step 12I • Employer Payment History</div>
          <h2 className="tx-main-title">💳 Employer Payments & Escrow Ledger</h2>
          <p className="tx-sub-title">
            Track all wage disbursements, 50% advance escrows, platform fees, and completed worker settlements.
          </p>
        </div>
        <div className="tx-header-actions">
          <button className="tx-refresh-btn" onClick={fetchPayments} title="Refresh Ledger" disabled={loading}>
            🔄 {loading ? 'Updating...' : 'Refresh'}
          </button>
          {isModal && (
            <button className="tx-close-btn" onClick={onClose} aria-label="Close">✕</button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="tx-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchPayments} className="tx-retry-btn">Retry</button>
        </div>
      )}

      {/* 4 Summary Cards as per Step 12I */}
      <div className="tx-summary-grid-4">
        <div className="tx-stat-box green-border">
          <div className="tx-stat-icon-wrap green-icon">💰</div>
          <div className="tx-stat-content">
            <span className="tx-stat-label">Total Paid</span>
            <div className="tx-stat-amount green">
              {loading ? '...' : formatINR(summary.totalPaid)}
            </div>
            <span className="tx-stat-sub">Advance + Remaining payments</span>
          </div>
        </div>

        <div className="tx-stat-box blue-border">
          <div className="tx-stat-icon-wrap blue-icon">🛡️</div>
          <div className="tx-stat-content">
            <span className="tx-stat-label">Advance Payments (50%)</span>
            <div className="tx-stat-amount blue">
              {loading ? '...' : formatINR(summary.advancePayments)}
            </div>
            <span className="tx-stat-sub">Secured in escrow at hiring</span>
          </div>
        </div>

        <div className="tx-stat-box teal-border">
          <div className="tx-stat-icon-wrap teal-icon">✅</div>
          <div className="tx-stat-content">
            <span className="tx-stat-label">Remaining Payments</span>
            <div className="tx-stat-amount teal">
              {loading ? '...' : formatINR(summary.remainingPayments)}
            </div>
            <span className="tx-stat-sub">Disbursed on job completion</span>
          </div>
        </div>

        <div className="tx-stat-box amber-border">
          <div className="tx-stat-icon-wrap amber-icon">⏳</div>
          <div className="tx-stat-content">
            <span className="tx-stat-label">Pending Payments</span>
            <div className="tx-stat-amount amber">
              {loading ? '...' : formatINR(summary.pendingPayments)}
            </div>
            <span className="tx-stat-sub">Due upon job verification</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="tx-controls-row">
        <div className="tx-search-wrap">
          <span className="tx-search-icon">🔍</span>
          <input
            type="text"
            className="tx-search-input"
            placeholder="Search by worker name, job title, or Transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="tx-clear-search" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="tx-filter-pills">
          <button
            className={`tx-filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({transactions.length})
          </button>
          <button
            className={`tx-filter-pill ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button
            className={`tx-filter-pill ${filter === 'advance' ? 'active' : ''}`}
            onClick={() => setFilter('advance')}
          >
            Advance Paid
          </button>
          <button
            className={`tx-filter-pill ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`tx-filter-pill ${filter === 'disputed' ? 'active' : ''}`}
            onClick={() => setFilter('disputed')}
          >
            Disputed
          </button>
        </div>
      </div>

      {/* Employer Payment History Table */}
      <div className="tx-table-wrapper">
        <table className="tx-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Job Title</th>
              <th>Hired Worker</th>
              <th>Job Amount</th>
              <th>Employer Fee (2%)</th>
              <th>Total Paid</th>
              <th>Payment Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="tx-empty-cell">
                  <div className="tx-empty-state">
                    <span className="tx-spinner" />
                    <h4>Loading Payment History...</h4>
                    <p>Fetching real escrow and transaction records from MongoDB.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="tx-empty-cell">
                  <div className="tx-empty-state">
                    <span style={{ fontSize: 36 }}>💳</span>
                    <h4>No Payment Records Found</h4>
                    <p>
                      {search || filter !== 'all'
                        ? 'No transactions match your search filter criteria.'
                        : 'No hired candidates or payment disbursements yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(tx => {
                const isCompleted = tx.paymentStatus === 'Completed';
                const isDisputed = tx.paymentStatus === 'Disputed';
                const isAdvance = tx.paymentStatus?.includes('Advance');

                return (
                  <tr key={tx.transactionId || tx.jobId} className="tx-row">
                    <td>
                      <span className="tx-id-badge">{tx.transactionId}</span>
                    </td>
                    <td>
                      <div className="tx-job-cell">
                        <strong className="tx-job-title">{tx.jobTitle}</strong>
                        {tx.jobId && <span className="tx-job-id">ID: {String(tx.jobId).slice(-6)}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="tx-worker-cell">
                        <div
                          className="tx-worker-avatar"
                          style={{
                            background: isCompleted ? '#10b981' : isDisputed ? '#ef4444' : '#2563eb',
                          }}
                        >
                          {(tx.workerName || 'W').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="tx-worker-name">{tx.workerName}</strong>
                          <div className="tx-worker-meta">Verified Candidate</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tx-amt-sub">{formatINR(tx.jobAmount)}</span>
                    </td>
                    <td>
                      <span className="tx-fee-tag">+{formatINR(tx.employerFee)}</span>
                    </td>
                    <td>
                      <strong className="tx-amount green">{formatINR(tx.totalPaid)}</strong>
                    </td>
                    <td>
                      <span
                        className={`tx-status-pill ${
                          isCompleted
                            ? 'completed'
                            : isDisputed
                            ? 'disputed'
                            : isAdvance
                            ? 'advance'
                            : 'pending'
                        }`}
                      >
                        {isCompleted && '✓ '}
                        {isAdvance && '🛡️ '}
                        {isDisputed && '⚠️ '}
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="tx-date-cell">
                        <span className="tx-date">{tx.date}</span>
                        {tx.time && <span className="tx-time">{tx.time}</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="tx-receipt-btn"
                        onClick={() => openReceipt(tx)}
                        title="View Official WorkLink Payment Receipt"
                      >
                        📄 View Receipt
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Step 12G/12I Employer Payment Receipt Modal */}
      {selectedReceipt && (
        <EmployerRemainingModal
          key={selectedReceipt.transactionId}
          isOpen={true}
          job={{
            _id: selectedReceipt.jobId,
            title: selectedReceipt.jobTitle,
            pay: selectedReceipt.jobAmount,
            transactionId: selectedReceipt.transactionId,
          }}
          applicant={{
            name: selectedReceipt.workerName,
          }}
          employerUser={employerUser}
          initialReceipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onConfirmRemainingPayment={() => {}}
        />
      )}
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="tx-modal-backdrop" onClick={onClose}>
      <div className="tx-modal-card" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { getWorkerEarnings } from '../data/api';
import { formatINR } from '../components/FeeReceipt/FeeReceiptModal';
import WorkerEarningsReceiptModal from '../components/FeeReceipt/WorkerEarningsReceiptModal';
import './WorkerEarnings.css';

export default function WorkerEarnings({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    completedJobs: 0,
    pendingEarnings: 0,
    workLinkFees: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchEarningsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkerEarnings();
      if (res?.success) {
        setSummary(res.summary || {
          totalEarnings: 0,
          completedJobs: 0,
          pendingEarnings: 0,
          workLinkFees: 0,
        });
        setTransactions(Array.isArray(res.transactions) ? res.transactions : []);
      } else {
        setError(res?.message || 'Failed to load earnings data');
      }
    } catch (err) {
      console.error('Fetch worker earnings error:', err);
      setError(err.message || 'Error loading earnings records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesStatus =
      statusFilter === 'all' ||
      tx.status?.toLowerCase() === statusFilter.toLowerCase();
    
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      tx.jobTitle?.toLowerCase().includes(query) ||
      tx.employerName?.toLowerCase().includes(query) ||
      tx.transactionId?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="wrk-earnings-container">
      
      {/* ── Page Header ── */}
      <div className="wrk-earnings-header">
        <div>
          <h1 className="wrk-earnings-title">💳 My Earnings & Payouts</h1>
          <p className="wrk-earnings-subtitle">
            Track your net earnings, settled payouts, and WorkLink service fees.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={fetchEarningsData}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          🔄 Refresh Ledger
        </button>
      </div>

      {/* ── Summary Cards Grid ── */}
      <div className="wrk-earnings-summary-grid">
        
        {/* 1. Total Earnings */}
        <div className="wrk-stat-card card-green">
          <div className="wrk-stat-top">
            <span className="wrk-stat-label">Total Net Earnings</span>
            <span className="wrk-stat-icon">💰</span>
          </div>
          <div className="wrk-stat-value green-text">
            {loading ? '…' : formatINR(summary.totalEarnings)}
          </div>
          <span className="wrk-stat-sub">100% settled and credited payouts</span>
        </div>

        {/* 2. Completed Jobs */}
        <div className="wrk-stat-card card-blue">
          <div className="wrk-stat-top">
            <span className="wrk-stat-label">Completed Jobs</span>
            <span className="wrk-stat-icon">✅</span>
          </div>
          <div className="wrk-stat-value blue-text">
            {loading ? '…' : summary.completedJobs}
          </div>
          <span className="wrk-stat-sub">Verified & confirmed work assignments</span>
        </div>

        {/* 3. Pending Earnings */}
        <div className="wrk-stat-card card-amber">
          <div className="wrk-stat-top">
            <span className="wrk-stat-label">Pending Earnings</span>
            <span className="wrk-stat-icon">⏳</span>
          </div>
          <div className="wrk-stat-value amber-text">
            {loading ? '…' : formatINR(summary.pendingEarnings)}
          </div>
          <span className="wrk-stat-sub">In progress or awaiting employer confirmation</span>
        </div>

        {/* 4. WorkLink Fees */}
        <div className="wrk-stat-card card-slate">
          <div className="wrk-stat-top">
            <span className="wrk-stat-label">WorkLink Platform Fees (2%)</span>
            <span className="wrk-stat-icon">🛡️</span>
          </div>
          <div className="wrk-stat-value slate-text">
            {loading ? '…' : formatINR(summary.workLinkFees)}
          </div>
          <span className="wrk-stat-sub">Guaranteed escrow & trust platform charge</span>
        </div>

      </div>

      {/* ── Transaction History Section ── */}
      <div className="wrk-table-card">
        
        <div className="wrk-table-header-row">
          <div>
            <h2 className="wrk-table-title">Transaction History</h2>
            <p className="wrk-table-subtitle">
              Detailed breakdown of your individual job earnings and settlements.
            </p>
          </div>

          <div className="wrk-table-controls">
            <div className="wrk-search-box">
              <span className="wrk-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by job, employer, or transaction ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="wrk-search-input"
              />
            </div>

            <div className="wrk-filter-pills">
              {['all', 'settled', 'pending', 'disputed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`wrk-filter-pill ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="wrk-loading-box">
            <div className="wrk-spinner" />
            <p>Loading your earnings ledger…</p>
          </div>
        ) : error ? (
          <div className="wrk-error-box">
            <span>⚠️</span>
            <p>{error}</p>
            <button className="btn btn-sm btn-outline" onClick={fetchEarningsData}>
              Try Again
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="wrk-empty-box">
            <div className="wrk-empty-icon">💳</div>
            <div className="wrk-empty-title">No Transactions Found</div>
            <p className="wrk-empty-text">
              {search || statusFilter !== 'all'
                ? 'No records match your selected search filter.'
                : 'Your earnings and payout receipts for completed work will appear here.'}
            </p>
          </div>
        ) : (
          <div className="wrk-table-responsive">
            <table className="wrk-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Job Title</th>
                  <th>Employer</th>
                  <th>Job Amount</th>
                  <th>WorkLink Fee (2%)</th>
                  <th>Net Earning</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const isSettled = tx.status === 'Settled' || tx.status === 'Completed';
                  const isDisputed = tx.status === 'Disputed';

                  return (
                    <tr key={tx.transactionId || tx.jobId} className="wrk-table-row">
                      <td>
                        <span className="wrk-id-badge">{tx.transactionId}</span>
                      </td>
                      <td>
                        <div className="wrk-job-title-group">
                          <strong className="wrk-job-name">{tx.jobTitle}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="wrk-employer-name">
                          👤 {tx.employerName}
                        </div>
                      </td>
                      <td>
                        <span className="wrk-job-amount">{formatINR(tx.jobAmount)}</span>
                      </td>
                      <td>
                        <span className="wrk-fee-amount">-{formatINR(tx.workLinkFee)}</span>
                      </td>
                      <td>
                        <strong className="wrk-net-earning">{formatINR(tx.netEarning)}</strong>
                      </td>
                      <td>
                        <span
                          className={`wrk-status-pill ${
                            isSettled
                              ? 'status-settled'
                              : isDisputed
                              ? 'status-disputed'
                              : 'status-pending'
                          }`}
                        >
                          {isSettled ? '✓ Settled' : isDisputed ? '⚠️ Disputed' : '⏳ Pending'}
                        </span>
                      </td>
                      <td>
                        <span className="wrk-date-label">{tx.date}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="wrk-receipt-btn"
                          onClick={() => setSelectedReceipt(tx)}
                        >
                          📄 View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── STEP 12G WORKER EARNINGS RECEIPT MODAL ── */}
      <WorkerEarningsReceiptModal
        isOpen={Boolean(selectedReceipt)}
        receipt={selectedReceipt}
        job={selectedReceipt ? { _id: selectedReceipt.jobId, title: selectedReceipt.jobTitle, pay: String(selectedReceipt.jobAmount) } : null}
        onClose={() => setSelectedReceipt(null)}
      />

    </div>
  );
}

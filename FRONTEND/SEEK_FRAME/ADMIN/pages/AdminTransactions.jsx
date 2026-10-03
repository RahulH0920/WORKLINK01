import React, { useState, useEffect } from "react";
import { getAdminTransactions } from "../../data/api";
import { printReceipt, downloadReceiptPDF } from "../../utils/receiptPrinter";

const AdminTransactions = ({ setActivePage, initialTxnId = null, initialJobId = null }) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search and Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'Completed', 'Pending', 'Disputed', 'Failed'
  const [stageFilter, setStageFilter] = useState("all"); // 'all', 'Advance Paid', 'Waiting for Completion', 'Remaining Payment', 'Settled'
  const [dateFilter, setDateFilter] = useState("all"); // 'all', 'today', '7d', '30d'
  
  // Modal / Selected Transaction
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminTransactions();
      if (res.success) {
        const txns = res.transactions || [];
        setTransactions(txns);
        setSummary(res.summary || null);

        if (initialTxnId) {
          const found = txns.find((t) => t.transactionId === initialTxnId || t._id === initialTxnId);
          if (found) setSelectedTxn(found);
        } else if (initialJobId) {
          const found = txns.find((t) => (t.jobId?._id || t.jobId) === initialJobId || t._id === initialJobId);
          if (found) setSelectedTxn(found);
        }
      } else {
        setError(res.message || "Failed to retrieve transaction records");
      }
    } catch (err) {
      console.error("Failed to load admin transactions:", err);
      setError("Unable to connect to transaction database. Please verify server status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [initialTxnId, initialJobId]);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    // Search query matching Transaction ID, Job Title, Employer Name, Worker Name
    const q = search.trim().toLowerCase();
    const txnId = (t.transactionId || "").toLowerCase();
    const jobTitle = (t.jobTitle || "").toLowerCase();
    const empName = (t.employer?.name || "").toLowerCase();
    const empEmail = (t.employer?.email || "").toLowerCase();
    const wrkName = (t.worker?.name || "").toLowerCase();
    const wrkEmail = (t.worker?.email || "").toLowerCase();

    const matchesSearch =
      !q ||
      txnId.includes(q) ||
      jobTitle.includes(q) ||
      empName.includes(q) ||
      empEmail.includes(q) ||
      wrkName.includes(q) ||
      wrkEmail.includes(q);

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter !== "all") {
      if ((t.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // Payment Stage filter
    if (stageFilter !== "all") {
      if ((t.paymentStage || "").toLowerCase() !== stageFilter.toLowerCase()) {
        return false;
      }
    }

    // Date filter
    if (dateFilter !== "all" && t.createdAt) {
      const txnDate = new Date(t.createdAt);
      const now = new Date();
      if (dateFilter === "today") {
        const isToday =
          txnDate.getDate() === now.getDate() &&
          txnDate.getMonth() === now.getMonth() &&
          txnDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (dateFilter === "7d") {
        const diffDays = (now - txnDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === "30d") {
        const diffDays = (now - txnDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }

    return true;
  });

  // Calculate Real Dynamic Summaries
  const totalTxnCount = summary?.totalTransactions ?? transactions.length;
  const totalMoneyProcessed = summary?.totalMoneyProcessed ??
    transactions.reduce((acc, t) => acc + (t.advancePaid || 0) + (t.remainingPaid || 0), 0);
  const totalAdvancePaid = summary?.totalAdvancePayments ??
    transactions.reduce((acc, t) => acc + (t.advancePaid || 0), 0);
  const totalRemainingPaid = summary?.totalRemainingPayments ??
    transactions.reduce((acc, t) => acc + (t.remainingPaid || 0), 0);
  const workLinkRevenue = summary?.workLinkRevenue ??
    transactions.reduce((acc, t) => acc + (t.employerFee || 0) + (t.workerFee || 0), 0);

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not available";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Not available";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Not available";
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })} at ${d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return "Not available";
    }
  };

  const getStageClass = (stage) => {
    switch (stage) {
      case "Advance Paid":
        return "advance-paid";
      case "Waiting for Completion":
        return "waiting-completion";
      case "Remaining Payment":
        return "remaining-payment";
      case "Settled":
        return "settled";
      case "Disputed":
        return "disputed";
      default:
        return "pending";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "verified";
      case "Disputed":
      case "Failed":
        return "danger";
      case "Pending":
      default:
        return "pending";
    }
  };

  return (
    <div className="admin-page-container fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>Transactions</h1>
            <span className="txn-readonly-badge">
              🔒 Read-Only Audit Ledger
            </span>
          </div>
          <p>
            Monitor and manage all WorkLink payment activity.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={fetchTransactions} title="Refresh transaction records">
            🔄 Refresh
          </button>
          <button className="btn-secondary" onClick={() => setActivePage("Dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--admin-red)",
            padding: "14px 20px",
            borderRadius: 10,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            style={{
              background: "transparent",
              border: "1px solid var(--admin-red)",
              color: "var(--admin-red)",
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={fetchTransactions}
          >
            Retry
          </button>
        </div>
      )}

      {/* TASK 2: 5 Summary Cards */}
      <div className="overview-5-cards-grid">
        {/* Card 1: Total Transactions */}
        <div className="ref-stat-card card-theme-blue">
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-blue">🧾</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Transactions</span>
            <div className="stat-card-value">
              {loading ? "..." : totalTxnCount.toLocaleString()}
            </div>
            <div className="stat-card-subtext positive">▲ Active MongoDB records</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-blue">→</span>
          </div>
        </div>

        {/* Card 2: Total Money Processed */}
        <div className="ref-stat-card card-theme-purple">
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-purple">💳</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Total Money Processed</span>
            <div className="stat-card-value" style={{ fontSize: 22 }}>
              {loading ? "..." : formatCurrency(totalMoneyProcessed)}
            </div>
            <div className="stat-card-subtext positive">▲ Advance + Remaining</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-purple">→</span>
          </div>
        </div>

        {/* Card 3: Advance Payments */}
        <div className="ref-stat-card card-theme-amber">
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-amber">⏳</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Advance Payments</span>
            <div className="stat-card-value" style={{ fontSize: 22 }}>
              {loading ? "..." : formatCurrency(totalAdvancePaid)}
            </div>
            <div className="stat-card-subtext warning">• 50% Initial Escrow</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-amber">→</span>
          </div>
        </div>

        {/* Card 4: Remaining Payments */}
        <div className="ref-stat-card card-theme-green">
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-green">✅</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">Remaining Payments</span>
            <div className="stat-card-value" style={{ fontSize: 22 }}>
              {loading ? "..." : formatCurrency(totalRemainingPaid)}
            </div>
            <div className="stat-card-subtext positive">▲ 50% Disbursed</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-green">→</span>
          </div>
        </div>

        {/* Card 5: WorkLink Revenue */}
        <div className="ref-stat-card card-theme-teal">
          <div className="card-bg-shape" />
          <div className="stat-card-header">
            <div className="icon-box box-teal">💰</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">WorkLink Revenue</span>
            <div className="stat-card-value" style={{ fontSize: 22, color: "var(--admin-teal)" }}>
              {loading ? "..." : formatCurrency(workLinkRevenue)}
            </div>
            <div className="stat-card-subtext positive">▲ Employer + Worker Fee (4%)</div>
          </div>
          <div className="stat-card-action">
            <span className="circle-arrow arrow-teal">→</span>
          </div>
        </div>
      </div>

      {/* TASK 4: Search & Filter Bar */}
      <div className="card-box" style={{ marginBottom: 24, padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          {/* Search Box */}
          <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 280 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by Transaction ID, job title, employer, or worker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Date filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Date:</span>
            <div className="filter-chips" style={{ display: "flex", gap: 6 }}>
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
              ].map((d) => (
                <button
                  key={d.id}
                  className={`filter-chip ${dateFilter === d.id ? "active" : ""}`}
                  onClick={() => setDateFilter(d.id)}
                  style={{ padding: "4px 10px", fontSize: 11.5 }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status & Stage filters */}
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--admin-border-light)",
          }}
        >
          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Status:</span>
            <div className="filter-chips" style={{ display: "flex", gap: 6 }}>
              {["all", "Completed", "Pending", "Disputed"].map((st) => (
                <button
                  key={st}
                  className={`filter-chip ${statusFilter === st ? "active" : ""}`}
                  onClick={() => setStatusFilter(st)}
                  style={{ padding: "4px 12px", fontSize: 11.5 }}
                >
                  {st === "all" ? "All Statuses" : st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 20, background: "var(--admin-border)" }} />

          {/* Payment Stage Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-muted)" }}>Stage:</span>
            <div className="filter-chips" style={{ display: "flex", gap: 6 }}>
              {[
                { id: "all", label: "All Stages" },
                { id: "Advance Paid", label: "Advance Paid" },
                { id: "Waiting for Completion", label: "Waiting Completion" },
                { id: "Remaining Payment", label: "Remaining Due" },
                { id: "Settled", label: "Settled" },
              ].map((sg) => (
                <button
                  key={sg.id}
                  className={`filter-chip ${stageFilter === sg.id ? "active" : ""}`}
                  onClick={() => setStageFilter(sg.id)}
                  style={{ padding: "4px 12px", fontSize: 11.5 }}
                >
                  {sg.label}
                </button>
              ))}
            </div>
          </div>

          {(search || statusFilter !== "all" || stageFilter !== "all" || dateFilter !== "all") && (
            <button
              className="btn-secondary"
              style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11.5 }}
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setStageFilter("all");
                setDateFilter("all");
              }}
            >
              ✕ Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* TASK 3: Transactions List Table */}
      <div className="card-box">
        <div className="panel-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h3>Official Transactions Ledger</h3>
            <p className="panel-sub">
              Showing {filteredTransactions.length} of {transactions.length} total database records
            </p>
          </div>
          <span className="panel-tag blue">MongoDB Synchronized</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)" }}>
            <div className="review-spinner" style={{ margin: "0 auto 12px" }} />
            Loading real transaction database...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
            <strong>No transactions match your search or filter criteria</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              {transactions.length === 0
                ? "No transaction records exist yet in the database. When an employer hires a worker, the transaction ledger will record it automatically."
                : "Try adjusting your search query or removing active filters."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Job</th>
                  <th>Employer</th>
                  <th>Worker</th>
                  <th style={{ textAlign: "right" }}>Job Amount</th>
                  <th style={{ textAlign: "right" }}>Employer Fee</th>
                  <th style={{ textAlign: "right" }}>Worker Fee</th>
                  <th style={{ textAlign: "right" }}>Platform Revenue</th>
                  <th>Payment Stage</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.transactionId || t._id}
                    className="ref-table-row"
                    onClick={() => setSelectedTxn(t)}
                  >
                    <td>
                      <strong style={{ fontFamily: "monospace", color: "var(--admin-blue)", fontSize: 12 }}>
                        {t.transactionId || "Not available"}
                      </strong>
                    </td>

                    <td>
                      <strong className="user-name" style={{ fontSize: 13 }}>
                        {t.jobTitle || "Service Gig"}
                      </strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>
                        {t.jobDepartment ? `🏷️ ${t.jobDepartment}` : ""}
                      </div>
                    </td>

                    <td>
                      <strong style={{ fontSize: 12.5 }}>{t.employer?.name || "Not available"}</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>
                        {t.employer?.email || ""}
                      </div>
                    </td>

                    <td>
                      <strong style={{ fontSize: 12.5 }}>{t.worker?.name || "Not available"}</strong>
                      <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>
                        {t.worker?.email || ""}
                      </div>
                    </td>

                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {formatCurrency(t.jobAmount)}
                    </td>

                    <td style={{ textAlign: "right", color: "var(--admin-text-sub)" }}>
                      +{formatCurrency(t.employerFee)}
                    </td>

                    <td style={{ textAlign: "right", color: "var(--admin-text-sub)" }}>
                      -{formatCurrency(t.workerFee)}
                    </td>

                    <td style={{ textAlign: "right", fontWeight: 800, color: "var(--admin-teal)" }}>
                      {formatCurrency(t.platformRevenue)}
                    </td>

                    <td>
                      <span className={`txn-stage-pill ${getStageClass(t.paymentStage)}`}>
                        {t.paymentStage || "Pending"}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${getStatusClass(t.status)}`}>
                        {t.status || "Pending"}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: 11.5, color: "var(--admin-muted)" }}>
                        {formatDate(t.createdAt)}
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-action review"
                        style={{ padding: "5px 12px", fontSize: 11.5 }}
                        onClick={() => setSelectedTxn(t)}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TASK 5: Transaction Details Modal */}
      {selectedTxn && (
        <div className="txn-modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="txn-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="txn-modal-header">
              <div>
                <h2>
                  <span>🧾 Transaction Record</span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 14,
                      background: "rgba(255,255,255,0.15)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {selectedTxn.transactionId}
                  </span>
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.8 }}>
                  Recorded on {formatDateTime(selectedTxn.createdAt)}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.12)",
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                  onClick={() => setShowReceiptModal(true)}
                  title="View full official printable receipt"
                >
                  📄 View Receipt
                </button>
                <button
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.12)",
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                  onClick={() => printReceipt(selectedTxn, "admin_full")}
                  title="Print official receipt"
                >
                  🖨️ Print
                </button>
                <button
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.12)",
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                  onClick={() => downloadReceiptPDF(selectedTxn, "admin_full")}
                  title="Download receipt PDF"
                >
                  📥 PDF
                </button>
                <span className={`status-pill ${getStatusClass(selectedTxn.status)}`}>
                  {selectedTxn.status}
                </span>
                <button
                  className="txn-modal-close-btn"
                  onClick={() => setSelectedTxn(null)}
                  title="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="txn-modal-body">
              {/* If Disputed: Display prominent dispute banner */}
              {selectedTxn.status === "Disputed" || selectedTxn.completionStatus === "disputed" ? (
                <div className="txn-dispute-banner">
                  <div className="txn-dispute-icon">⚠️</div>
                  <div className="txn-dispute-content">
                    <h4>Transaction Under Dispute</h4>
                    <p>
                      <strong>Reason:</strong> {selectedTxn.disputeReason || "Dispute raised regarding job completion."}
                    </p>
                    <div className="txn-dispute-meta">
                      Raised by: {selectedTxn.disputedByName || "Employer"} •{" "}
                      {formatDateTime(selectedTxn.disputedAt || selectedTxn.updatedAt)}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 1. TRANSACTION INFORMATION */}
              <div className="txn-section-card">
                <div className="txn-section-title">
                  <span>ℹ️</span> Transaction Information
                </div>
                <div className="txn-grid-3">
                  <div className="detail-item">
                    <label>Transaction ID</label>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--admin-blue)" }}>
                      {selectedTxn.transactionId || "Not available"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Job ID</label>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {selectedTxn.jobId || "Not available"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Job Title</label>
                    <strong style={{ fontSize: 13.5 }}>{selectedTxn.jobTitle || "Not available"}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Created Date & Time</label>
                    <span>{formatDateTime(selectedTxn.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Current Status</label>
                    <span className={`status-pill ${getStatusClass(selectedTxn.status)}`} style={{ alignSelf: "flex-start" }}>
                      {selectedTxn.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Payment Stage</label>
                    <span className={`txn-stage-pill ${getStageClass(selectedTxn.paymentStage)}`} style={{ alignSelf: "flex-start" }}>
                      {selectedTxn.paymentStage}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. PARTIES */}
              <div className="txn-section-card">
                <div className="txn-section-title">
                  <span>👥</span> Parties Involved
                </div>
                <div className="txn-grid-2">
                  {/* Employer */}
                  <div className="txn-party-card">
                    <div className="txn-party-header">
                      <div className="txn-party-avatar employer">🏢</div>
                      <div>
                        <strong style={{ display: "block", fontSize: 13.5 }}>
                          {selectedTxn.employer?.name || "Not available"}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>Employer</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                      <div>
                        <strong style={{ color: "var(--admin-muted)" }}>Email: </strong>
                        {selectedTxn.employer?.email || "Not available"}
                      </div>
                      <div>
                        <strong style={{ color: "var(--admin-muted)" }}>Phone: </strong>
                        {selectedTxn.employer?.phone || "Not available"}
                      </div>
                      <div>
                        <strong style={{ color: "var(--admin-muted)" }}>Location: </strong>
                        {selectedTxn.employer?.location || "Not available"}
                      </div>
                    </div>
                  </div>

                  {/* Worker */}
                  <div className="txn-party-card">
                    <div className="txn-party-header">
                      <div className="txn-party-avatar worker">👤</div>
                      <div>
                        <strong style={{ display: "block", fontSize: 13.5 }}>
                          {selectedTxn.worker?.name || "Not available"}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>Worker</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                      <div>
                        <strong style={{ color: "var(--admin-muted)" }}>Email: </strong>
                        {selectedTxn.worker?.email || "Not available"}
                      </div>
                      <div>
                        <strong style={{ color: "var(--admin-muted)" }}>Phone: </strong>
                        {selectedTxn.worker?.phone || "Not available"}
                      </div>
                      <div>
                        <strong style={{ color: "var(--admin-muted)" }}>Location: </strong>
                        {selectedTxn.worker?.location || "Not available"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. JOB PAYMENT & 4. WORKER SETTLEMENT & 5. WORKLINK REVENUE (Dual-Sided Complete View) */}
              <div className="txn-grid-2">
                {/* Employer Side */}
                <div className="txn-section-card">
                  <div className="txn-section-title">
                    <span>💳</span> Employer Job Payment
                  </div>
                  <div>
                    <div className="txn-financial-row">
                      <span>Job Amount (Agreed Pay)</span>
                      <strong>{formatCurrency(selectedTxn.jobAmount)}</strong>
                    </div>
                    <div className="txn-financial-row">
                      <span>Employer Platform Fee (2%)</span>
                      <span style={{ color: "var(--admin-blue)", fontWeight: 600 }}>
                        +{formatCurrency(selectedTxn.employerFee)}
                      </span>
                    </div>
                    <div className="txn-financial-row highlight">
                      <span>Employer Total Payable</span>
                      <span>{formatCurrency(selectedTxn.employerTotal)}</span>
                    </div>
                    <div className="txn-financial-row" style={{ marginTop: 8 }}>
                      <span>Advance Paid (50%)</span>
                      <span style={{ color: "var(--admin-green)", fontWeight: 700 }}>
                        {formatCurrency(selectedTxn.advancePaid)}
                      </span>
                    </div>
                    <div className="txn-financial-row">
                      <span>Remaining Paid (50%)</span>
                      <span style={{ fontWeight: 700 }}>
                        {selectedTxn.remainingPaid > 0 ? (
                          <span style={{ color: "var(--admin-green)" }}>
                            {formatCurrency(selectedTxn.remainingPaid)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--admin-amber)" }}>Pending Completion</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Worker Side & Platform Revenue */}
                <div className="txn-section-card">
                  <div className="txn-section-title">
                    <span>💵</span> Worker Settlement & Platform
                  </div>
                  <div>
                    <div className="txn-financial-row">
                      <span>Job Gross Value</span>
                      <strong>{formatCurrency(selectedTxn.jobAmount)}</strong>
                    </div>
                    <div className="txn-financial-row">
                      <span>Worker Platform Fee (2%)</span>
                      <span style={{ color: "var(--admin-red)", fontWeight: 600 }}>
                        -{formatCurrency(selectedTxn.workerFee)}
                      </span>
                    </div>
                    <div className="txn-financial-row success-highlight">
                      <span>Worker Net Earning</span>
                      <span>{formatCurrency(selectedTxn.workerNetEarning)}</span>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        background: "rgba(13, 148, 136, 0.08)",
                        border: "1px solid rgba(13, 148, 136, 0.2)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ color: "var(--admin-teal)", fontSize: 13 }}>
                            WorkLink Platform Revenue
                          </strong>
                          <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>
                            Employer Fee ({formatCurrency(selectedTxn.employerFee)}) + Worker Fee ({formatCurrency(selectedTxn.workerFee)})
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--admin-teal)" }}>
                          {formatCurrency(selectedTxn.platformRevenue)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. PAYMENT TIMELINE */}
              <div className="txn-section-card">
                <div className="txn-section-title">
                  <span>⏱️</span> Payment Timeline
                </div>

                {selectedTxn.timeline && selectedTxn.timeline.length > 0 ? (
                  <div className="txn-timeline-container">
                    {selectedTxn.timeline.map((step, idx) => {
                      const isCompleted = step.status === "completed";
                      const isDisputed = step.status === "disputed";
                      const isPending = !isCompleted && !isDisputed;

                      return (
                        <div
                          key={idx}
                          className={`txn-timeline-step ${isCompleted ? "completed" : isDisputed ? "disputed" : "pending"}`}
                        >
                          <div
                            className={`txn-timeline-dot ${isCompleted ? "completed" : isDisputed ? "disputed" : "pending"}`}
                          />
                          <div className="txn-timeline-info">
                            <strong style={{ color: isCompleted ? "var(--admin-text-dark)" : isDisputed ? "#991b1b" : "var(--admin-text-sub)" }}>
                              {step.title}
                            </strong>

                            {/* Real event timestamp when completed; pending state when incomplete */}
                            {isCompleted && step.date ? (
                              <span style={{ color: "var(--admin-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <span>🕒</span> {formatDateTime(step.date)}
                              </span>
                            ) : isDisputed && step.date ? (
                              <span style={{ color: "var(--admin-red)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <span>⚠️</span> {formatDateTime(step.date)}
                              </span>
                            ) : (
                              <span style={{ color: "var(--admin-red)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <span>⏳</span> Pending
                              </span>
                            )}

                            {step.amount ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: isCompleted ? "var(--admin-green)" : "var(--admin-red)",
                                  fontWeight: 700,
                                  marginTop: 3,
                                }}
                              >
                                Amount: {formatCurrency(step.amount)}
                              </div>
                            ) : null}

                            {step.reason ? (
                              <div style={{ fontSize: 12, color: "var(--admin-red)", marginTop: 2 }}>
                                Reason: {step.reason}
                              </div>
                            ) : null}
                          </div>

                          <span
                            className={`txn-timeline-badge ${isCompleted ? "completed" : isDisputed ? "disputed" : "pending"}`}
                          >
                            {isCompleted ? "✓ Completed" : isDisputed ? "⚠️ Issue" : "✕ Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--admin-muted)", padding: "10px 0" }}>
                    Timeline details not available for this record.
                  </div>
                )}
              </div>

              {/* Payment Details & Receipt Actions */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(13,148,136,0.06) 100%)",
                  border: "1.5px solid rgba(37,99,235,0.2)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🧾</span>
                    <strong style={{ fontSize: 14, color: "var(--admin-text-main)" }}>Official Payment & Settlement Receipt</strong>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--admin-muted)" }}>
                    Generate, preview, print, or download the tamper-proof dual-sided transaction audit receipt.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ padding: "7px 14px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => setShowReceiptModal(true)}
                  >
                    📄 View Receipt
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "7px 14px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => printReceipt(selectedTxn, "admin_full")}
                  >
                    🖨️ Print
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "7px 14px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => downloadReceiptPDF(selectedTxn, "admin_full")}
                  >
                    📥 PDF
                  </button>
                </div>
              </div>

              {/* Security notice */}
              <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--admin-muted)", padding: "4px 0" }}>
                🔒 Official WorkLink AI Administrator Transaction View • Read-Only Security Guard Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN OFFICIAL RECEIPT PREVIEW MODAL ── */}
      {showReceiptModal && selectedTxn && (
        <div
          className="txn-modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setShowReceiptModal(false)}
        >
          <div
            className="txn-modal-container"
            style={{ maxWidth: 720, padding: 0, overflow: "hidden", background: "#f8fafc" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🧾</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#ffffff" }}>Official Payment Receipt</h3>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    WorkLink AI Dual-Sided Audit Ledger • {selectedTxn.transactionId}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    background: "rgba(255,255,255,0.12)",
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                  onClick={() => printReceipt(selectedTxn, "admin_full")}
                >
                  🖨️ Print Receipt
                </button>
                <button
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    background: "rgba(255,255,255,0.12)",
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                  onClick={() => downloadReceiptPDF(selectedTxn, "admin_full")}
                >
                  📥 Download PDF
                </button>
                <button
                  className="txn-modal-close-btn"
                  style={{ color: "#ffffff" }}
                  onClick={() => setShowReceiptModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content / Receipt Document */}
            <div style={{ padding: "24px", maxHeight: "80vh", overflowY: "auto" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: 14,
                  padding: "24px 28px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  color: "#0f172a",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                {/* Brand Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "2px solid #0f172a",
                    paddingBottom: 16,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          background: "#2563eb",
                          color: "#ffffff",
                          borderRadius: 7,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: 16,
                        }}
                      >
                        W
                      </div>
                      <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em" }}>
                        WorkLink AI
                      </span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                      Smart Escrow & Verified Workforce Platform
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                      WorkLink AI — Full Audit Receipt
                    </h4>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        padding: "2px 8px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: 20,
                        fontSize: 10.5,
                        fontWeight: 800,
                      }}
                    >
                      🛡️ ADMIN COMPLETE AUDIT
                    </span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "10px 18px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 18,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      TRANSACTION ID
                    </span>
                    <strong style={{ fontFamily: "monospace", color: "#2563eb" }}>
                      {selectedTxn.transactionId}
                    </strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      RECORDED DATE & TIME
                    </span>
                    <strong>{formatDateTime(selectedTxn.createdAt)}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      JOB TITLE / ID
                    </span>
                    <strong>{selectedTxn.jobTitle} (#{String(selectedTxn.jobId || "").slice(-6)})</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      PAYMENT STATUS / STAGE
                    </span>
                    <strong style={{ color: "#16a34a" }}>
                      {selectedTxn.status} ({selectedTxn.paymentStage})
                    </strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      EMPLOYER
                    </span>
                    <strong>{selectedTxn.employer?.name || "Not available"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      HIRED WORKER
                    </span>
                    <strong>{selectedTxn.worker?.name || "Not available"}</strong>
                  </div>
                </div>

                {/* Financial Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 18 }}>
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>Description</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, textTransform: "uppercase" }}>Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                      <td colSpan="2" style={{ padding: "6px 12px", color: "#1e293b", borderBottom: "1px solid #e2e8f0", fontSize: 11, textTransform: "uppercase" }}>
                        EMPLOYER PAYMENT SIDE
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>Job Base Amount</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(selectedTxn.jobAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>Employer Platform Fee (2%)</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#2563eb", borderBottom: "1px solid #f1f5f9" }}>+{formatCurrency(selectedTxn.employerFee)}</td>
                    </tr>
                    <tr style={{ fontWeight: 800 }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>Total Employer Payout Committed</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(selectedTxn.employerTotal)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>Advance Paid (50%)</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#16a34a", borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(selectedTxn.advancePaid)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Remaining Paid (50%)</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#16a34a", borderBottom: "1px solid #e2e8f0" }}>{formatCurrency(selectedTxn.remainingPaid)}</td>
                    </tr>

                    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                      <td colSpan="2" style={{ padding: "6px 12px", color: "#1e293b", borderBottom: "1px solid #e2e8f0", fontSize: 11, textTransform: "uppercase" }}>
                        WORKER SETTLEMENT SIDE
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>Job Gross Value</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(selectedTxn.jobAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>Worker Platform Fee (2%)</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#dc2626", borderBottom: "1px solid #f1f5f9" }}>-{formatCurrency(selectedTxn.workerFee)}</td>
                    </tr>
                    <tr style={{ background: "#f0fdf4", fontWeight: 800 }}>
                      <td style={{ padding: "8px 12px", color: "#166534", borderBottom: "1px solid #bbf7d0" }}>Worker Net Earnings Disbursed</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#166534", borderBottom: "1px solid #bbf7d0" }}>{formatCurrency(selectedTxn.workerNetEarning)}</td>
                    </tr>

                    <tr style={{ background: "#eff6ff", fontWeight: 900 }}>
                      <td style={{ padding: "10px 12px", color: "#1e40af", borderTop: "2px solid #2563eb" }}>WORKLINK PLATFORM REVENUE (Employer Fee + Worker Fee)</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#1e40af", borderTop: "2px solid #2563eb", fontSize: 15 }}>{formatCurrency(selectedTxn.platformRevenue)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer seal */}
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#64748b" }}>
                  <span>🛡️ WorkLink AI Escrow Certified • Cryptographically Logged</span>
                  <span style={{ fontFamily: "monospace" }}>AUTH-REF: {selectedTxn.transactionId}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 24px", background: "#f1f5f9", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowReceiptModal(false)}>
                Close
              </button>
              <button className="btn-secondary" onClick={() => printReceipt(selectedTxn, "admin_full")}>
                🖨️ Print Receipt
              </button>
              <button className="btn-primary" onClick={() => downloadReceiptPDF(selectedTxn, "admin_full")}>
                📥 Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;

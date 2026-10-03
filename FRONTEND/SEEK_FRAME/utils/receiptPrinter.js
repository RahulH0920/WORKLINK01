/**
 * WorkLink AI — Universal Receipt Print & PDF Engine
 * Solves the blank-page print/download bug across all receipt modals.
 */

import { formatINR } from '../components/FeeReceipt/FeeReceiptModal';

/**
 * Builds standard, pristine printable HTML for all WorkLink receipt types.
 *
 * Types:
 * - 'employer_advance': Shows 50% advance escrow, employer fee (2%), employer total. (NO worker fee)
 * - 'employer_final': Shows remaining 50%, total paid, employer fee (2%). (NO worker fee)
 * - 'worker_earnings': Shows job gross, worker fee (2%), worker net payout. (NO employer fee)
 * - 'admin_full': Shows complete dual-sided breakdown + platform revenue.
 */
export function buildReceiptHTML(receipt, type = 'employer_advance') {
  const transactionId = receipt.transactionId || receipt._id || 'WL-TXN-OFFICIAL';
  const jobId = receipt.jobId || 'N/A';
  const jobTitle = receipt.jobTitle || 'Service Position';
  const employerName = receipt.employerName || receipt.employer?.name || 'WorkLink Employer';
  const workerName = receipt.workerName || receipt.worker?.name || 'WorkLink Worker';
  const date = receipt.date || receipt.timestamp || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const time = receipt.time || (receipt.timestamp && !receipt.date ? '' : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const dateTimeStr = time ? `${date} at ${time}` : date;

  const jobAmount = Number(receipt.jobAmount || 0);
  const employerFee = Number(receipt.employerFee || receipt.platformFee || +(jobAmount * 0.02).toFixed(2));
  const employerTotal = Number(receipt.employerTotal || +(jobAmount + employerFee).toFixed(2));
  const advancePaid = Number(receipt.advancePaid || +(employerTotal * 0.5).toFixed(2));
  const remainingPaid = Number(receipt.remainingPaid !== undefined ? receipt.remainingPaid : +(employerTotal - advancePaid).toFixed(2));
  const workerFee = Number(receipt.workerFee || +(jobAmount * 0.02).toFixed(2));
  const workerNet = Number(receipt.workerNetEarning || receipt.netEarning || +(jobAmount - workerFee).toFixed(2));
  const platformRevenue = Number(receipt.platformRevenue || +(employerFee + workerFee).toFixed(2));

  let docTitle = 'Official Payment Receipt';
  let badgeText = '✓ VERIFIED TRANSACTION';
  let badgeColor = '#16a34a';

  if (type === 'employer_advance') {
    docTitle = 'Advance Payment Receipt (50% Escrow)';
    badgeText = '✓ ADVANCE PAID • IN ESCROW';
    badgeColor = '#b45309';
  } else if (type === 'employer_final') {
    docTitle = 'Final Payment Receipt (Settlement)';
    badgeText = '✓ COMPLETED & SETTLED';
    badgeColor = '#16a34a';
  } else if (type === 'worker_earnings') {
    docTitle = 'Worker Earnings & Settlement Receipt';
    badgeText = '✓ SETTLED & CREDITED';
    badgeColor = '#16a34a';
  } else if (type === 'admin_full') {
    docTitle = 'WorkLink AI — Full Audit Transaction Receipt';
    badgeText = '🛡️ ADMIN COMPLETE AUDIT';
    badgeColor = '#2563eb';
  }

  // Financial Table Content based on visibility rules
  let tableRows = '';

  if (type === 'employer_advance') {
    // Employer Advance: NO worker fee shown
    tableRows = `
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Job Agreed Base Pay</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatINR(jobAmount)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Employer Platform Fee (2%)</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #2563eb; border-bottom: 1px solid #f1f5f9;">+ ${formatINR(employerFee)}</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: 800;">
        <td style="padding: 12px; color: #0f172a; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Total Employer Payable</td>
        <td style="padding: 12px; text-align: right; color: #0f172a; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">${formatINR(employerTotal)}</td>
      </tr>
      <tr style="background: #fef3c7; font-weight: 800;">
        <td style="padding: 12px; color: #92400e; border-bottom: 1px solid #fde68a;">50% Advance Paid (Held in Escrow)</td>
        <td style="padding: 12px; text-align: right; color: #b45309; border-bottom: 1px solid #fde68a; font-size: 16px;">${formatINR(advancePaid)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">Remaining Balance (Due Upon Shift Sign-off)</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #64748b; font-size: 13px;">${formatINR(remainingPaid)}</td>
      </tr>
    `;
  } else if (type === 'employer_final') {
    // Employer Final: NO worker fee shown
    tableRows = `
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Job Agreed Base Pay</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatINR(jobAmount)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Employer Platform Fee (2%)</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #2563eb; border-bottom: 1px solid #f1f5f9;">+ ${formatINR(employerFee)}</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: 800;">
        <td style="padding: 12px; color: #0f172a; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Total Employer Amount</td>
        <td style="padding: 12px; text-align: right; color: #0f172a; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">${formatINR(employerTotal)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Initial 50% Advance Paid (Escrow)</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #16a34a; border-bottom: 1px solid #f1f5f9;">${formatINR(advancePaid)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Final 50% Remaining Paid</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #16a34a; border-bottom: 1px solid #f1f5f9;">${formatINR(remainingPaid)}</td>
      </tr>
      <tr style="background: #ecfdf5; font-weight: 900;">
        <td style="padding: 14px 12px; color: #065f46; border-top: 2px solid #059669; border-bottom: 2px solid #059669; font-size: 15px;">TOTAL AMOUNT PAID</td>
        <td style="padding: 14px 12px; text-align: right; color: #059669; border-top: 2px solid #059669; border-bottom: 2px solid #059669; font-size: 18px;">${formatINR(employerTotal)}</td>
      </tr>
    `;
  } else if (type === 'worker_earnings') {
    // Worker Earnings: NO employer fee shown
    tableRows = `
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Job Gross Amount</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatINR(jobAmount)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">WorkLink Platform Fee (2%)</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #dc2626; border-bottom: 1px solid #f1f5f9;">- ${formatINR(workerFee)}</td>
      </tr>
      <tr style="background: #ecfdf5; font-weight: 900;">
        <td style="padding: 14px 12px; color: #065f46; border-top: 2px solid #059669; border-bottom: 2px solid #059669; font-size: 15px;">NET EARNING RECEIVED</td>
        <td style="padding: 14px 12px; text-align: right; color: #059669; border-top: 2px solid #059669; border-bottom: 2px solid #059669; font-size: 18px;">${formatINR(workerNet)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 10px 12px; text-align: center; color: #166534; font-size: 12px; background: #f0fdf4;">
          ✓ Disbursed and 100% settled directly to worker account.
        </td>
      </tr>
    `;
  } else {
    // Admin Complete Dual-Sided Audit View
    tableRows = `
      <tr style="background: #f8fafc; font-weight: 700;">
        <td colspan="2" style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px;">EMPLOYER PAYMENT SIDE</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Job Agreed Pay</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatINR(jobAmount)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Employer Platform Fee (2%)</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #2563eb; border-bottom: 1px solid #f1f5f9;">+ ${formatINR(employerFee)}</td>
      </tr>
      <tr style="font-weight: 800;">
        <td style="padding: 8px 12px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Employer Total Committed</td>
        <td style="padding: 8px 12px; text-align: right; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatINR(employerTotal)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Advance Paid (50%)</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #16a34a; border-bottom: 1px solid #f1f5f9;">${formatINR(advancePaid)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #475569; border-bottom: 1px solid #e2e8f0;">Remaining Paid (50%)</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #16a34a; border-bottom: 1px solid #e2e8f0;">${formatINR(remainingPaid)}</td>
      </tr>

      <tr style="background: #f8fafc; font-weight: 700;">
        <td colspan="2" style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px;">WORKER SETTLEMENT SIDE</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Job Gross Value</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formatINR(jobAmount)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">Worker Platform Fee (2%)</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #dc2626; border-bottom: 1px solid #f1f5f9;">- ${formatINR(workerFee)}</td>
      </tr>
      <tr style="background: #f0fdf4; font-weight: 800;">
        <td style="padding: 8px 12px; color: #166534; border-bottom: 1px solid #bbf7d0;">Worker Net Earning</td>
        <td style="padding: 8px 12px; text-align: right; color: #166534; border-bottom: 1px solid #bbf7d0;">${formatINR(workerNet)}</td>
      </tr>

      <tr style="background: #eff6ff; font-weight: 900;">
        <td style="padding: 12px; color: #1e40af; border-top: 2px solid #2563eb; border-bottom: 2px solid #2563eb;">WORKLINK PLATFORM REVENUE (Employer Fee + Worker Fee)</td>
        <td style="padding: 12px; text-align: right; color: #1e40af; border-top: 2px solid #2563eb; border-bottom: 2px solid #2563eb; font-size: 16px;">${formatINR(platformRevenue)}</td>
      </tr>
    `;
  }

  return `
    <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      
      <!-- Brand Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; background: #2563eb; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">W</div>
            <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #0f172a;">WorkLink AI</span>
          </div>
          <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Smart Escrow & Verified Workforce Platform</p>
        </div>

        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${docTitle}</h2>
          <span style="display: inline-block; margin-top: 4px; padding: 3px 10px; background: #f1f5f9; color: ${badgeColor}; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.03em;">${badgeText}</span>
        </div>
      </div>

      <!-- Transaction Meta Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 12.5px;">
        <div>
          <span style="display: block; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">TRANSACTION ID</span>
          <strong style="font-family: monospace; font-size: 13px; color: #2563eb;">${transactionId}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">DATE & TIME</span>
          <strong style="color: #0f172a;">${dateTimeStr}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">JOB TITLE / ID</span>
          <strong style="color: #0f172a;">${jobTitle} <span style="font-weight: 400; font-size: 11px; color: #64748b;">(#${String(jobId).slice(-6)})</span></strong>
        </div>
        <div>
          <span style="display: block; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">EMPLOYER</span>
          <strong style="color: #0f172a;">${employerName}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">HIRED WORKER</span>
          <strong style="color: #0f172a;">${workerName}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">PAYMENT STATUS</span>
          <strong style="color: #16a34a;">${receipt.paymentStatus || 'Completed & Verified'}</strong>
        </div>
      </div>

      <!-- Financial Breakdown Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-top-left-radius: 8px;">Description</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-top-right-radius: 8px;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Verification Seal & Watermark -->
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">🛡️</span>
          <span><strong>WorkLink AI Escrow Certified</strong> • Cryptographically Recorded</span>
        </div>
        <div style="text-align: right; font-family: monospace; color: #94a3b8;">
          AUTH-REF: ${transactionId}
        </div>
      </div>

    </div>
  `;
}

/**
 * Universal print handler that guarantees ZERO blank pages by printing an isolated iframe.
 */
export function printReceipt(receiptData, type = 'employer_advance') {
  if (!receiptData) return;

  const htmlContent = buildReceiptHTML(receiptData, type);

  // Remove any old print iframe if present
  const oldIframe = document.getElementById('wl-print-frame');
  if (oldIframe) {
    oldIframe.parentNode.removeChild(oldIframe);
  }

  // Create isolated invisible iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'wl-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>WorkLink_Receipt_${receiptData.transactionId || 'Official'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            visibility: visible !important;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0;
            padding: 20px;
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  // Trigger print after iframe renders
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print iframe error:', e);
      window.print();
    }
  }, 250);
}

/**
 * Universal PDF / Receipt Download handler.
 * Triggers native high-resolution print/PDF dialog + downloads self-contained official HTML receipt file.
 */
export function downloadReceiptPDF(receiptData, type = 'employer_advance') {
  if (!receiptData) return;

  const htmlContent = buildReceiptHTML(receiptData, type);
  const transactionId = receiptData.transactionId || 'WL-TXN-OFFICIAL';

  // 1. Trigger the native print dialog for 1-click "Save as PDF"
  printReceipt(receiptData, type);

  // 2. Also generate and download standalone self-contained receipt document
  const fullDocument = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WorkLink Receipt - ${transactionId}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      background: #f8fafc;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `.trim();

  try {
    const blob = new Blob([fullDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkLink_Receipt_${transactionId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to trigger file download:', err);
  }
}

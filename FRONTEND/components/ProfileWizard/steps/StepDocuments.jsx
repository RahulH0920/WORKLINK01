import { useState, useRef } from 'react';
import { sendAadhaarOTP, verifyAadhaarOTP, verifyPAN } from '../../../data/api';

/* ─── Document Definitions ─── */
const REQUIRED_DOCS = [
  {
    key: 'aadhaar',
    name: 'Aadhaar Card',
    icon: '🪪',
    description: 'Government-issued identity proof',
    accept: '.pdf,.jpg,.jpeg,.png',
    hasNumber: true,
    numberPlaceholder: 'XXXX XXXX XXXX',
    numberMaxLength: 14, // 12 digits + 2 spaces
  },
  {
    key: 'pan',
    name: 'PAN Card',
    icon: '💳',
    description: 'Required for tax verification',
    accept: '.pdf,.jpg,.jpeg,.png',
    hasNumber: true,
    numberPlaceholder: 'ABCDE1234F',
    numberMaxLength: 10,
  },
  {
    key: 'photo',
    name: 'Your Photo',
    icon: '📸',
    description: 'Clear face photo for Aadhaar identity verification',
    accept: '.jpg,.jpeg,.png',
    hasNumber: false,
  },
];

/* ─── Auto-format Aadhaar with spaces ─── */
function formatAadhaarInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

export default function StepDocuments({ data, onChange }) {
  const [documents, setDocuments] = useState(data.documents || {});
  const [numbers, setNumbers] = useState(data.docNumbers || { aadhaar: '', pan: '' });
  
  // verifyStatus stores { valid, message, method, refId, otpSent } for each doc
  const [verifyStatus, setVerifyStatus] = useState(data.verifyStatus || {}); 
  
  const [verifying, setVerifying] = useState({});
  const [otpInputs, setOtpInputs] = useState({});
  const fileRefs = useRef({});

  /* ── File handling ── */
  const handleFileSelect = (key, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB');
      return;
    }

    const updated = {
      ...documents,
      [key]: {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploadedAt: new Date().toISOString(),
      },
    };
    setDocuments(updated);
    onChange({ ...data, documents: updated });
  };

  const handleRemoveDoc = (key) => {
    const updated = { ...documents };
    delete updated[key];
    setDocuments(updated);
    onChange({ ...data, documents: updated });
    if (fileRefs.current[key]) fileRefs.current[key].value = '';
  };

  const handleDrop = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(key, file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /* ── Number input + verification ── */
  const handleNumberChange = (key, rawValue) => {
    let value = rawValue;
    if (key === 'aadhaar') {
      value = formatAadhaarInput(rawValue);
    } else if (key === 'pan') {
      value = rawValue.toUpperCase().slice(0, 10);
    }

    const updatedNumbers = { ...numbers, [key]: value };
    setNumbers(updatedNumbers);

    // Clear previous verification when number changes
    if (verifyStatus[key]) {
      const updatedStatus = { ...verifyStatus };
      delete updatedStatus[key];
      setVerifyStatus(updatedStatus);
      onChange({ ...data, docNumbers: updatedNumbers, verifyStatus: updatedStatus });
    } else {
      onChange({ ...data, docNumbers: updatedNumbers });
    }
  };

  const handleSendAadhaarOTP = async () => {
    const num = numbers.aadhaar;
    if (!num) return;

    setVerifying((prev) => ({ ...prev, aadhaar: true }));

    try {
      const result = await sendAadhaarOTP(num);
      
      /* ── LOCAL MODE: Verhoeff passed → verified immediately, no OTP ── */
      if (result.verified && result.localMode) {
        const updatedStatus = {
          ...verifyStatus,
          aadhaar: {
            valid: true,
            otpSent: false,
            message: result.message || 'Aadhaar verified (Verhoeff checksum)',
            method: result.method,
          },
        };
        setVerifyStatus(updatedStatus);
        onChange({ ...data, docNumbers: numbers, verifyStatus: updatedStatus });
        return;
      }

      /* ── API MODE: OTP sent → wait for user to enter it ── */
      const updatedStatus = {
        ...verifyStatus,
        aadhaar: {
          valid: false,
          otpSent: true,
          refId: result.ref_id,
          message: result.message || 'OTP Sent!',
          method: result.method,
        },
      };
      setVerifyStatus(updatedStatus);
      onChange({ ...data, docNumbers: numbers, verifyStatus: updatedStatus });
    } catch (err) {
      const updatedStatus = {
        ...verifyStatus,
        aadhaar: { valid: false, message: err.message || 'Verification failed' },
      };
      setVerifyStatus(updatedStatus);
      onChange({ ...data, docNumbers: numbers, verifyStatus: updatedStatus });
    } finally {
      setVerifying((prev) => ({ ...prev, aadhaar: false }));
    }
  };

  const handleVerifyAadhaarOTP = async () => {
    const otp = otpInputs.aadhaar;
    const refId = verifyStatus.aadhaar?.refId;
    if (!otp || !refId) return;

    setVerifying((prev) => ({ ...prev, aadhaar: true }));

    try {
      const result = await verifyAadhaarOTP(refId, otp);
      
      const updatedStatus = {
        ...verifyStatus,
        aadhaar: {
          valid: true,
          otpSent: false,
          message: result.message || 'Aadhaar Verified!',
          method: result.method,
          data: result.data // contains name, photo etc
        },
      };
      setVerifyStatus(updatedStatus);
      onChange({ ...data, verifyStatus: updatedStatus });
    } catch (err) {
      const updatedStatus = {
        ...verifyStatus,
        aadhaar: { 
          valid: false, 
          otpSent: true, 
          refId: refId,
          message: err.message || 'Invalid OTP' 
        },
      };
      setVerifyStatus(updatedStatus);
      onChange({ ...data, verifyStatus: updatedStatus });
    } finally {
      setVerifying((prev) => ({ ...prev, aadhaar: false }));
    }
  };

  const handleVerifyPAN = async () => {
    const num = numbers.pan;
    if (!num) return;

    setVerifying((prev) => ({ ...prev, pan: true }));

    try {
      const result = await verifyPAN(num);
      
      const updatedStatus = {
        ...verifyStatus,
        pan: {
          valid: result.valid,
          message: result.message,
          method: result.method,
          entityType: result.entityType,
        },
      };
      setVerifyStatus(updatedStatus);
      onChange({ ...data, docNumbers: numbers, verifyStatus: updatedStatus });
    } catch (err) {
      const updatedStatus = {
        ...verifyStatus,
        pan: { valid: false, message: err.message || 'Verification failed' },
      };
      setVerifyStatus(updatedStatus);
      onChange({ ...data, docNumbers: numbers, verifyStatus: updatedStatus });
    } finally {
      setVerifying((prev) => ({ ...prev, pan: false }));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ── Validation: all docs uploaded + all numbers verified ── */
  const allUploaded = REQUIRED_DOCS.every((doc) => documents[doc.key]);
  const allVerified = REQUIRED_DOCS.filter((d) => d.hasNumber).every(
    (doc) => verifyStatus[doc.key]?.valid
  );
  const allDone = allUploaded && allVerified;

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-icon">🛡️</div>
      <h2 className="wizard-step-title">Verify your identity</h2>
      <p className="wizard-step-desc">
        Enter your document numbers for instant real verification, and upload proof documents.
      </p>

      <div className="wizard-docs-grid">
        {REQUIRED_DOCS.map((doc) => {
          const uploaded = documents[doc.key];
          const status = verifyStatus[doc.key];
          const isVerifying = verifying[doc.key];
          const currentNumber = numbers[doc.key] || '';

          return (
            <div key={doc.key} className="wizard-verify-section">
              {/* ── Number Input (for Aadhaar/PAN) ── */}
              {doc.hasNumber && (
                <div className="wizard-number-input-group">
                  <label className="wizard-label">
                    {doc.icon} {doc.name} Number <span className="wizard-required">*</span>
                  </label>
                  
                  {/* Primary Input Row */}
                  <div className="wizard-verify-row">
                    <input
                      type="text"
                      className={`wizard-input wizard-number-input ${
                        status?.valid ? 'valid' : (status && !status.otpSent ? 'invalid' : '')
                      }`}
                      placeholder={doc.numberPlaceholder}
                      value={currentNumber}
                      onChange={(e) => handleNumberChange(doc.key, e.target.value)}
                      maxLength={doc.numberMaxLength}
                      disabled={status?.valid || status?.otpSent}
                      style={doc.key === 'pan' ? { textTransform: 'uppercase' } : undefined}
                    />
                    
                    {status?.valid ? (
                      <div className="wizard-verify-badge verified">
                        <span className="verify-badge-icon">✓</span> Verified
                      </div>
                    ) : (
                      doc.key === 'aadhaar' ? (
                        // Aadhaar Verify Button (local mode: Verhoeff, API mode: sends OTP)
                        <button
                          className="wizard-verify-btn"
                          onClick={handleSendAadhaarOTP}
                          disabled={
                            isVerifying || 
                            status?.otpSent ||
                            currentNumber.replace(/\s/g, '').length !== 12
                          }
                        >
                          {isVerifying && !status?.otpSent ? (
                            <><span className="wizard-mini-spinner" /> Verifying…</>
                          ) : status?.otpSent ? (
                            <>OTP Sent</>
                          ) : (
                            <>🔍 Verify</>
                          )}
                        </button>
                      ) : (
                        // PAN Direct Verify Button
                        <button
                          className="wizard-verify-btn"
                          onClick={handleVerifyPAN}
                          disabled={
                            isVerifying ||
                            currentNumber.length !== 10
                          }
                        >
                          {isVerifying ? (
                            <><span className="wizard-mini-spinner" /> Checking…</>
                          ) : (
                            <>🔍 Verify</>
                          )}
                        </button>
                      )
                    )}
                  </div>

                  {/* OTP Input Row (Aadhaar Only) */}
                  {doc.key === 'aadhaar' && status?.otpSent && !status?.valid && (
                    <div className="wizard-verify-row" style={{ marginTop: '10px' }}>
                      <input
                        type="text"
                        className="wizard-input wizard-number-input"
                        placeholder="Enter 6-digit OTP"
                        value={otpInputs.aadhaar || ''}
                        onChange={(e) => setOtpInputs({ ...otpInputs, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        maxLength={6}
                      />
                      <button
                        className="wizard-verify-btn"
                        onClick={handleVerifyAadhaarOTP}
                        disabled={isVerifying || (otpInputs.aadhaar || '').length !== 6}
                      >
                        {isVerifying ? (
                          <><span className="wizard-mini-spinner" /> Verifying…</>
                        ) : (
                          <>✅ Verify OTP</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Verification result message */}
                  {status && (
                    <div className={`wizard-verify-result ${status.valid || status.otpSent ? 'success' : 'error'}`}>
                      <span>{status.valid || status.otpSent ? '✅' : '❌'}</span>
                      <span>{status.message}</span>
                      {status.method && (
                        <span className="wizard-verify-method">
                          via {status.method.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Edit button when already verified or OTP sent */}
                  {(status?.valid || status?.otpSent) && (
                    <button
                      className="wizard-verify-edit"
                      onClick={() => {
                        const updatedStatus = { ...verifyStatus };
                        delete updatedStatus[doc.key];
                        setVerifyStatus(updatedStatus);
                        onChange({ ...data, verifyStatus: updatedStatus });
                      }}
                    >
                      ✏️ Edit number
                    </button>
                  )}
                </div>
              )}

              {/* ── File Upload Card ── */}
              <div
                className={`wizard-doc-card ${uploaded ? 'uploaded' : ''}`}
                onDrop={(e) => handleDrop(doc.key, e)}
                onDragOver={handleDragOver}
              >
                <input
                  ref={(el) => (fileRefs.current[doc.key] = el)}
                  type="file"
                  accept={doc.accept}
                  onChange={(e) => handleFileSelect(doc.key, e.target.files[0])}
                  style={{ display: 'none' }}
                  id={`doc-${doc.key}`}
                />

                {uploaded ? (
                  <div className="wizard-doc-uploaded">
                    <div className="wizard-doc-check">✓</div>
                    <div className="wizard-doc-info">
                      <div className="wizard-doc-name">
                        {doc.hasNumber ? `${doc.name} Image` : doc.name}
                      </div>
                      <div className="wizard-doc-file-name">{uploaded.name}</div>
                      <div className="wizard-doc-file-size">{formatFileSize(uploaded.size)}</div>
                    </div>
                    <button
                      className="wizard-doc-remove"
                      onClick={() => handleRemoveDoc(doc.key)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label htmlFor={`doc-${doc.key}`} className="wizard-doc-upload">
                    <div className="wizard-doc-icon">{doc.icon}</div>
                    <div className="wizard-doc-name">
                      {doc.hasNumber ? `Upload ${doc.name} Image` : doc.name}
                    </div>
                    <div className="wizard-doc-desc">{doc.description}</div>
                    <div className="wizard-doc-action">
                      <span className="wizard-doc-browse">Browse</span> or drag & drop
                    </div>
                    <div className="wizard-doc-formats">
                      {doc.key === 'photo' ? 'JPG, PNG · Max 5MB' : 'PDF, JPG, PNG · Max 5MB'}
                    </div>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Status messages ── */}
      {!allDone && (
        <div className="wizard-tip wizard-tip-warn">
          <span className="wizard-tip-icon">⚠️</span>
          <span>
            {!allVerified && !allUploaded
              ? 'Verify your document numbers and upload all files to proceed.'
              : !allVerified
              ? 'Verify your Aadhaar & PAN numbers to proceed.'
              : 'Upload all document files to proceed.'}
            {' '}Verified users get <strong>+15 trust points</strong>.
          </span>
        </div>
      )}

      {allDone && (
        <div className="wizard-tip wizard-tip-success">
          <span className="wizard-tip-icon">✅</span>
          <span>All documents verified and uploaded! Your profile will be reviewed within 24 hours.</span>
        </div>
      )}
    </div>
  );
}

StepDocuments.isValid = (data) => {
  const docs = data.documents || {};
  const verifyStatus = data.verifyStatus || {};

  // All 3 files must be uploaded
  const allUploaded = REQUIRED_DOCS.every((doc) => docs[doc.key]);
  // Aadhaar and PAN numbers must be verified
  const allVerified = REQUIRED_DOCS.filter((d) => d.hasNumber).every(
    (doc) => verifyStatus[doc.key]?.valid
  );

  return allUploaded && allVerified;
};

export { REQUIRED_DOCS };

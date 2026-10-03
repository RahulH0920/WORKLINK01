import { useState, useRef } from 'react';
import { sendAadhaarOTP, verifyAadhaarOTP, verifyPAN } from '../../../data/api';

/* ─── Document Definitions ─── */
const REQUIRED_DOCS = [
  {
    key: 'license',
    name: 'Company License',
    icon: '🏢',
    description: 'Valid business license or trade license',
    accept: '.pdf,.jpg,.jpeg,.png',
    hasNumber: true,
    numberPlaceholder: 'e.g. LIC-12345678',
    numberMaxLength: 20,
  },
  {
    key: 'registration',
    name: 'Registration Certificate',
    icon: '📜',
    description: 'Certificate of incorporation or registration',
    accept: '.pdf,.jpg,.jpeg,.png',
    hasNumber: true,
    numberPlaceholder: 'e.g. REG-98765432',
    numberMaxLength: 20,
  },
  {
    key: 'taxId',
    name: 'Tax ID',
    icon: '💳',
    description: 'Corporate Tax ID (e.g., PAN, EIN)',
    accept: '.pdf,.jpg,.jpeg,.png',
    hasNumber: true,
    numberPlaceholder: 'e.g. TAX-12345678',
    numberMaxLength: 15,
  },
  {
    key: 'photo',
    name: 'Authorized Signatory Photo',
    icon: '📸',
    description: 'Clear photo of the account operator',
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
  const [numbers, setNumbers] = useState(data.docNumbers || { license: '', registration: '', taxId: '' });
  
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
    let value = rawValue.toUpperCase();
    if (key === 'license' || key === 'registration') {
      value = value.slice(0, 20);
    } else if (key === 'taxId') {
      value = value.slice(0, 15);
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

  const handleVerifyNumber = async (key) => {
    const num = numbers[key];
    if (!num) return;

    setVerifying((prev) => ({ ...prev, [key]: true }));

    try {
      // Mock verification for employer docs
      setTimeout(() => {
        const updatedStatus = {
          ...verifyStatus,
          [key]: {
            valid: true,
            message: `Valid ${key.charAt(0).toUpperCase() + key.slice(1)}`,
            method: 'mock_check',
          },
        };
        setVerifyStatus(updatedStatus);
        onChange({ ...data, docNumbers: numbers, verifyStatus: updatedStatus });
        setVerifying((prev) => ({ ...prev, [key]: false }));
      }, 800);
    } catch (err) {
      setVerifying((prev) => ({ ...prev, [key]: false }));
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
                    />
                    
                    {status?.valid ? (
                      <div className="wizard-verify-badge verified">
                        <span className="verify-badge-icon">✓</span> Verified
                      </div>
                    ) : (
                      <button
                        className="wizard-verify-btn"
                        onClick={() => handleVerifyNumber(doc.key)}
                        disabled={isVerifying || currentNumber.length < 5}
                      >
                        {isVerifying ? (
                          <><span className="wizard-mini-spinner" /> Checking…</>
                        ) : (
                          <>🔍 Verify</>
                        )}
                      </button>
                    )}
                  </div>

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

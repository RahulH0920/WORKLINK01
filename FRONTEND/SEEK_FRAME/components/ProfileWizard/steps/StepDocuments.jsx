import React, { useState, useEffect } from 'react';
import { runDocumentOCR, fetchAadhaarDetails } from '../../../data/api';

function StepDocuments({ data, onChange, user }) {
  const documents = data?.documents || {};
  const defaultName = user ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : '';
  const holderName = documents.holderName !== undefined ? documents.holderName : defaultName;
  const aadhaarNumber = documents.aadhaarNumber || '';
  const panNumber = documents.panNumber || '';

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrError, setOcrError] = useState('');

  const handleFieldChange = (field, value) => {
    onChange({
      ...data,
      documents: {
        ...documents,
        [field]: value,
      },
    });
  };

  const handleAadhaarNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    const updatedDocs = {
      ...documents,
      aadhaarNumber: raw,
    };

    // If user changed number and it no longer matches verified record, invalidate verification
    if (documents.aadhaarRecord && documents.aadhaarRecord.docNumber && documents.aadhaarRecord.docNumber !== raw) {
      updatedDocs.aadhaarVerified = false;
      updatedDocs.aadhaarRecord = null;
    }

    onChange({
      ...data,
      documents: updatedDocs,
    });
    setOcrError('');
  };

  const handlePanNumberChange = (e) => {
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    handleFieldChange('panNumber', raw);
  };

  // Perform OCR and Reference Dataset Fetch on Aadhaar file upload
  const processAadhaarFile = async (file, currentAadhaarNum) => {
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');
    setOcrStatus('🔍 Reading Aadhaar card with OCR...');

    try {
      const formData = new FormData();
      formData.append('aadhaar', file);

      // Step 1: Run OCR on uploaded document
      const ocrRes = await runDocumentOCR(formData);
      const extractedAadhaar = ocrRes?.ocr?.aadhaar?.docNumber || '';
      const extractedHolderName = ocrRes?.ocr?.aadhaar?.holderName || '';
      const ocrDob = ocrRes?.ocr?.aadhaar?.dob || '';
      const ocrGender = ocrRes?.ocr?.aadhaar?.gender || '';

      // Determine target Aadhaar number (prefer OCR extracted, fallback to entered)
      const targetAadhaar = extractedAadhaar || currentAadhaarNum;

      if (!targetAadhaar) {
        setOcrError('Could not detect a 12-digit Aadhaar number from the uploaded document. Please enter your 12-digit Aadhaar number or upload a clearer document.');
        onChange({
          ...data,
          documents: {
            ...documents,
            aadhaar: { file, fileName: file.name },
            aadhaarVerified: false,
            aadhaarRecord: null,
          },
        });
        setOcrLoading(false);
        setOcrStatus('');
        return;
      }

      // Check if entered Aadhaar mismatches OCR-extracted number
      if (currentAadhaarNum && extractedAadhaar && currentAadhaarNum !== extractedAadhaar) {
        setOcrError(`Aadhaar number detected on document (${extractedAadhaar.slice(0, 4)}...${extractedAadhaar.slice(-4)}) does not match the entered number.`);
        onChange({
          ...data,
          documents: {
            ...documents,
            aadhaar: { file, fileName: file.name },
            aadhaarNumber: extractedAadhaar, // update to OCR extracted
            aadhaarVerified: false,
            aadhaarRecord: null,
          },
        });
        setOcrLoading(false);
        setOcrStatus('');
        return;
      }

      // Step 2: Automatically Search & Fetch from WorkLink MongoDB Reference Dataset
      setOcrStatus('⚡ Searching WorkLink Reference Dataset...');
      const fetchRes = await fetchAadhaarDetails(targetAadhaar);

      if (fetchRes.success && fetchRes.found && fetchRes.record) {
        // Dataset record found & verified
        const fetchedName = fetchRes.record.holderName || extractedHolderName || holderName;
        onChange({
          ...data,
          documents: {
            ...documents,
            aadhaar: { file, fileName: file.name },
            aadhaarNumber: targetAadhaar,
            holderName: fetchedName,
            aadhaarVerified: true,
            aadhaarRecord: fetchRes.record,
            ocrDetails: {
              dob: ocrDob,
              gender: ocrGender,
              extractedHolderName,
            },
          },
        });
        setOcrStatus('');
      } else if (fetchRes.success && !fetchRes.found) {
        // Aadhaar format is valid, but record not in reference dataset (Case 3)
        onChange({
          ...data,
          documents: {
            ...documents,
            aadhaar: { file, fileName: file.name },
            aadhaarNumber: targetAadhaar,
            aadhaarVerified: false,
            aadhaarRecord: null,
          },
        });
        setOcrError('Aadhaar verified via checksum, but matching record was not found in the WorkLink reference dataset.');
        setOcrStatus('');
      } else {
        setOcrError(fetchRes.message || 'Aadhaar verification failed.');
        onChange({
          ...data,
          documents: {
            ...documents,
            aadhaar: { file, fileName: file.name },
            aadhaarVerified: false,
            aadhaarRecord: null,
          },
        });
        setOcrStatus('');
      }
    } catch (err) {
      console.error('OCR & Dataset fetch error:', err);
      setOcrError(err.message || 'Failed to process Aadhaar document.');
      onChange({
        ...data,
        documents: {
          ...documents,
          aadhaar: { file, fileName: file.name },
          aadhaarVerified: false,
          aadhaarRecord: null,
        },
      });
      setOcrStatus('');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileChange = (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'aadhaar') {
      processAadhaarFile(file, aadhaarNumber);
    } else {
      onChange({
        ...data,
        documents: {
          ...documents,
          [type]: {
            file,
            fileName: file.name,
          },
        },
      });
    }
  };

  const removeFile = (type) => {
    const updatedDocuments = { ...documents };
    delete updatedDocuments[type];

    if (type === 'aadhaar') {
      updatedDocuments.aadhaarVerified = false;
      updatedDocuments.aadhaarRecord = null;
      updatedDocuments.ocrDetails = null;
      setOcrError('');
      setOcrStatus('');
    }

    onChange({
      ...data,
      documents: updatedDocuments,
    });
  };

  // Format Aadhaar for display: XXXX XXXX XXXX
  const formatAadhaar = (val) => {
    return val.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const isAadhaarNumValid = aadhaarNumber.length === 12;
  const isPanNumValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber);
  const isAadhaarVerified = Boolean(documents.aadhaarVerified && documents.aadhaarRecord);

  return (
    <div className="profile-step documents-step">
      <div className="step-heading">
        <h2 className="wizard-step-title">Verify Your Identity</h2>
        <p className="wizard-step-desc">
          Enter your document numbers and upload your Aadhaar, recent photo, and optional PAN card. Details are matched against the WorkLink reference dataset.
        </p>
      </div>

      {/* ── Document Details Inputs ── */}
      <div className="wizard-verify-section" style={{ marginBottom: 24, padding: 18, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--ink)' }}>
          📋 Document Details for Automated Verification
        </div>

        {/* Holder Name */}
        <div className="wizard-field" style={{ marginBottom: 14 }}>
          <label className="wizard-label">
            Full Name on ID <span className="wizard-required">*</span>
          </label>
          <input
            className="wizard-input"
            type="text"
            placeholder="e.g. Rahul R Hulikatti"
            value={holderName}
            onChange={(e) => handleFieldChange('holderName', e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
            {isAadhaarVerified
              ? '✓ Name retrieved directly from verified WorkLink reference record.'
              : 'Must reasonably match the name on your Aadhaar card.'}
          </span>
        </div>

        {/* Aadhaar Number */}
        <div className="wizard-field" style={{ marginBottom: 14 }}>
          <label className="wizard-label">
            Aadhaar Number (12 Digits) <span className="wizard-required">*</span>
          </label>
          <input
            className={`wizard-input ${aadhaarNumber ? (isAadhaarNumValid ? 'valid' : 'invalid') : ''}`}
            type="text"
            placeholder="1234 5678 9012"
            value={formatAadhaar(aadhaarNumber)}
            onChange={handleAadhaarNumberChange}
            maxLength={14}
            style={{ fontFamily: 'monospace', letterSpacing: 1.5 }}
          />
          {aadhaarNumber && !isAadhaarNumValid && (
            <span style={{ fontSize: 11, color: 'var(--coral)', marginTop: 4, display: 'block' }}>
              Must be exactly 12 digits ({12 - aadhaarNumber.length} remaining)
            </span>
          )}
        </div>

        {/* PAN Number */}
        <div className="wizard-field" style={{ marginBottom: 4 }}>
          <label className="wizard-label">
            PAN Number (10 Characters) <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
          </label>
          <input
            className={`wizard-input ${panNumber ? (isPanNumValid ? 'valid' : 'invalid') : ''}`}
            type="text"
            placeholder="ABCDE1234F (Optional)"
            value={panNumber}
            onChange={handlePanNumberChange}
            maxLength={10}
            style={{ fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase' }}
          />
          {panNumber && !isPanNumValid && (
            <span style={{ fontSize: 11, color: 'var(--coral)', marginTop: 4, display: 'block' }}>
              Format: 5 letters, 4 digits, 1 letter (e.g., BSPPH1628K)
            </span>
          )}
        </div>
      </div>

      {/* ── Document Upload Cards ── */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--ink)' }}>
        📁 Upload Supporting Files
      </div>

      <div className="document-list">
        {/* Aadhaar File */}
        <div className={`document-item ${isAadhaarVerified ? 'verified-doc' : ''}`}>
          <label htmlFor="aadhaar">
            <strong>🪪 Aadhaar Card Copy</strong>
            <span>Upload scan or photo of Aadhaar (.pdf, .jpg, .png) for automatic OCR verification</span>
          </label>

          <input
            id="aadhaar"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => handleFileChange('aadhaar', e)}
            disabled={ocrLoading}
          />

          {ocrLoading && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(91, 108, 248, 0.08)', border: '1px solid rgba(91, 108, 248, 0.2)', color: 'var(--indigo)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="wizard-mini-spinner" />
              <span>{ocrStatus || 'Processing Aadhaar with OCR & Reference Dataset...'}</span>
            </div>
          )}

          {ocrError && !ocrLoading && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255, 107, 107, 0.08)', border: '1px solid rgba(255, 107, 107, 0.25)', color: 'var(--coral)', fontSize: 12 }}>
              <span>⚠️ {ocrError}</span>
            </div>
          )}

          {documents.aadhaar?.fileName && !ocrLoading && (
            <div className="selected-file">
              <span>✓ {documents.aadhaar.fileName}</span>
              <button type="button" onClick={() => removeFile('aadhaar')}>
                Remove
              </button>
            </div>
          )}

          {/* ── Verified Aadhaar Details Card (From MongoDB Reference Dataset) ── */}
          {isAadhaarVerified && documents.aadhaarRecord && (
            <div
              style={{
                marginTop: 14,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(0, 201, 167, 0.08), rgba(91, 108, 248, 0.05))',
                border: '1.5px solid var(--teal)',
                animation: 'fadeUp 0.3s ease both',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal-d)', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>✓</span> Aadhaar Verified
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Verified Aadhaar Details (WorkLink Reference Dataset)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px 12px', background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0, 201, 167, 0.2)' }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Name</span>
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{documents.aadhaarRecord.holderName}</strong>
                </div>

                <div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Aadhaar</span>
                  <strong style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'monospace' }}>
                    {documents.aadhaarRecord.maskedAadhaar || `XXXX XXXX ${(documents.aadhaarNumber || '').slice(-4)}`}
                  </strong>
                </div>

                {documents.ocrDetails?.dob && (
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Date of Birth</span>
                    <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{documents.ocrDetails.dob}</strong>
                  </div>
                )}

                {documents.ocrDetails?.gender && (
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Gender</span>
                    <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{documents.ocrDetails.gender}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PAN File */}
        <div className="document-item">
          <label htmlFor="pan">
            <strong>💳 PAN Card Copy <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--muted)' }}>(Optional)</span></strong>
            <span>Upload scan or photo of PAN (.pdf, .jpg, .png) — Optional</span>
          </label>

          <input
            id="pan"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => handleFileChange('pan', e)}
          />

          {documents.pan?.fileName && (
            <div className="selected-file">
              <span>✓ {documents.pan.fileName}</span>
              <button type="button" onClick={() => removeFile('pan')}>
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Photo */}
        <div className="document-item">
          <label htmlFor="photo">
            <strong>📸 Recent Photo / Selfie</strong>
            <span>Upload a clear passport or selfie photo (.jpg, .png)</span>
          </label>

          <input
            id="photo"
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(e) => handleFileChange('photo', e)}
          />

          {documents.photo?.fileName && (
            <div className="selected-file">
              <span>✓ {documents.photo.fileName}</span>
              <button type="button" onClick={() => removeFile('photo')}>
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

StepDocuments.isValid = (data) => {
  const documents = data?.documents || {};
  const hasAadhaarFile = Boolean(documents.aadhaar?.file);
  const hasPhotoFile = Boolean(documents.photo?.file);
  const isAadhaarNumValid = (documents.aadhaarNumber || '').replace(/\D/g, '').length === 12;
  const isAadhaarVerified = Boolean(documents.aadhaarVerified && documents.aadhaarRecord);
  const panNum = (documents.panNumber || '').trim().toUpperCase();
  const isPanValid = !panNum || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNum);

  return hasAadhaarFile && hasPhotoFile && isAadhaarNumValid && isAadhaarVerified && isPanValid;
};

export default StepDocuments;

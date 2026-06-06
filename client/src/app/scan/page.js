'use client';

import { useState, useRef, useCallback } from 'react';
import { scanReceipt, createExpense } from '@/lib/api';
import { formatCurrency, toInputDate } from '@/lib/utils';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const [showOcr, setShowOcr] = useState(false);

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(selectedFile.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setFile(selectedFile);
    setScanResult(null);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleScan = async () => {
    if (!file) return;

    try {
      setScanning(true);
      const result = await scanReceipt(file);
      setScanResult(result.data);
      if (result.data && result.data.note) {
        toast(result.data.note, {
          icon: '⚠️',
          duration: 6000,
        });
      } else {
        toast.success('Bill scanned successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setScanResult((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!scanResult) return;

    try {
      setSaving(true);
      await createExpense({
        amount: parseFloat(scanResult.amount),
        date: scanResult.date,
        category: scanResult.category,
        vendor: scanResult.vendor,
        description: scanResult.description,
        location: scanResult.location || '',
        receiptUrl: scanResult.receiptUrl,
        receiptPublicId: scanResult.receiptPublicId,
        entryMethod: 'ai_scan',
      });
      toast.success('Expense saved successfully!');
      router.push('/history');
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setScanResult(null);
    setScanning(false);
    setShowOcr(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Determine preview source
  const displayImage = scanResult?.receiptUrl || preview;

  return (
    <div className="has-sticky-actions">
      <div className="page-header">
        <h2>📸 AI Bill Scanner</h2>
        <p>Upload a bill, receipt, or invoice and let AI extract details automatically</p>
      </div>

      <div className="scan-result">
        {/* Left Column: Upload Area / Document Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: 0, marginBottom: '16px', borderBottom: 'none' }}>
              <div>
                <div className="card-title">Receipt Document</div>
                <div className="card-subtitle">Upload or drop receipt below</div>
              </div>
            </div>

            <div
              className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onClick={() => !scanning && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={(e) => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />

              {scanning ? (
                <div className="scan-overlay" style={{ width: '100%' }}>
                  <div className="scan-line" />
                  <span className="upload-icon">🔍</span>
                  <p className="upload-text">Scanning with AI...</p>
                  <p className="upload-subtext">Extracting expense details</p>
                  {preview && <img src={preview} alt="Scanning" className="upload-preview" style={{ opacity: 0.6 }} />}
                </div>
              ) : displayImage ? (
                <>
                  <span className="upload-icon">✅</span>
                  <p className="upload-text" style={{ fontSize: '13px', wordBreak: 'break-all', padding: '0 8px' }}>
                    {file?.name || 'receipt.jpg'}
                  </p>
                  <p className="upload-subtext" style={{ marginBottom: '12px' }}>
                    {file ? `${(file.size / 1024).toFixed(0)} KB • ` : ''}Click to change file
                  </p>
                  <img src={displayImage} alt="Receipt Preview" className="upload-preview" />
                </>
              ) : (
                <>
                  <span className="upload-icon">📷</span>
                  <p className="upload-text">Drop your bill here or click to upload</p>
                  <p className="upload-subtext">
                    Supports JPEG, PNG, WebP, PDF — Max 10MB
                  </p>
                </>
              )}
            </div>

            {file && !scanning && !scanResult && (
              <div className="flex gap-md" style={{ marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={handleScan} style={{ width: '100%' }}>
                  🔍 Scan with AI
                </button>
                <button className="btn btn-ghost" onClick={reset}>
                  ✕ Clear
                </button>
              </div>
            )}

            {file && !scanning && scanResult && (
              <div style={{ marginTop: '16px' }}>
                <button className="btn btn-secondary" onClick={reset} style={{ width: '100%' }}>
                  ✕ Scan Another Document
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Extracted Information Form */}
        <div className="card">
          {!scanResult ? (
            <div className="empty-state" style={{ padding: '80px 20px' }}>
              <div className="empty-state-icon">✨</div>
              <h3>Waiting for Document</h3>
              <p>Upload a distributor receipt or supplier invoice on the left to extract details.</p>
            </div>
          ) : (
            <div>
              <div className="card-header" style={{ padding: 0, marginBottom: '20px', borderBottom: 'none' }}>
                <div>
                  <div className="card-title">Extracted Metadata</div>
                  <div className="card-subtitle">Verify and correct information below</div>
                </div>
              </div>

              {scanResult.note && (
                <div style={{
                  background: 'var(--warning-bg)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  color: 'var(--warning)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span>{scanResult.note}</span>
                </div>
              )}

              {/* Confidence Score */}
              {scanResult.confidence !== undefined && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px'
                }}>
                  <span className="text-muted">OCR Scanning Confidence:</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: scanResult.confidence >= 70 ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {scanResult.confidence}% 
                    {scanResult.confidence >= 70 ? '🟢 High' : '🔴 Low'}
                  </span>
                </div>
              )}

              {/* Low Confidence Warning */}
              {scanResult.confidence !== undefined && scanResult.confidence < 70 && (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}>
                  ⚠️ **Low Scanning Confidence**: Some details might be missing or incorrect due to image quality. We have exposed the raw scanned text below so you can cross-check it.
                </div>
              )}

              {/* Collapsible raw scanned text */}
              {((scanResult.confidence !== undefined && scanResult.confidence < 70) || showOcr) && scanResult.ocrText && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                    <span>Raw Scanned Text</span>
                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm" 
                      style={{ height: 'auto', padding: '2px 8px', fontSize: '11px', marginLeft: 'auto' }}
                      onClick={() => setShowOcr(false)}
                    >
                      Hide Text
                    </button>
                  </label>
                  <textarea
                    className="form-textarea"
                    value={scanResult.ocrText}
                    readOnly
                    rows={5}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border-glass)',
                      cursor: 'default'
                    }}
                  />
                </div>
              )}

              {scanResult.confidence >= 70 && scanResult.ocrText && !showOcr && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  style={{ marginBottom: '16px', fontSize: '11px', display: 'block', padding: '4px 8px' }}
                  onClick={() => setShowOcr(true)}
                >
                  📄 Show Raw Scanned Text
                </button>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={scanResult.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={toInputDate(scanResult.date)}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={scanResult.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input
                  type="text"
                  className="form-input"
                  value={scanResult.vendor}
                  onChange={(e) => handleFieldChange('vendor', e.target.value)}
                  placeholder="Vendor name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={scanResult.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="e.g. City or Area"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={scanResult.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="What was this expense for?"
                  rows={2}
                />
              </div>

              <div className="modal-footer sticky-mobile-actions" style={{ borderTop: 'none', padding: '16px 0 0 0', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={reset}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !scanResult.amount || !scanResult.description}
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner" /> Saving...
                    </>
                  ) : (
                    '💾 Save Expense'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

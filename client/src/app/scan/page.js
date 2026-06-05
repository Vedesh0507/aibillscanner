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
      toast.success('Bill scanned successfully!');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="page-header">
        <h2>📸 AI Bill Scanner</h2>
        <p>Upload a bill, receipt, or invoice and let AI extract the details</p>
      </div>

      {/* Upload Zone */}
      {!scanResult && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => !scanning && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />

            {scanning ? (
              <div className="scan-overlay">
                <div className="scan-line" />
                <span className="upload-icon">🔍</span>
                <p className="upload-text">Scanning with AI...</p>
                <p className="upload-subtext">Extracting expense details from your bill</p>
                {preview && <img src={preview} alt="Scanning" className="upload-preview" style={{ opacity: 0.6 }} />}
              </div>
            ) : file ? (
              <>
                <span className="upload-icon">✅</span>
                <p className="upload-text">{file.name}</p>
                <p className="upload-subtext">
                  {(file.size / 1024).toFixed(0)} KB • Click to change
                </p>
                {preview && <img src={preview} alt="Preview" className="upload-preview" />}
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

          {file && !scanning && (
            <div
              className="flex gap-md"
              style={{ marginTop: '20px', justifyContent: 'center' }}
            >
              <button className="btn btn-primary btn-lg" onClick={handleScan}>
                🔍 Scan with AI
              </button>
              <button className="btn btn-ghost" onClick={reset}>
                ✕ Clear
              </button>
            </div>
          )}

          {scanning && (
            <div className="flex-center gap-sm" style={{ marginTop: '20px' }}>
              <div className="loading-spinner"></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>
                AI is analyzing your bill...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">✨ Extracted Information</div>
              <div className="card-subtitle">
                Review and edit before saving
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              ← Scan Another
            </button>
          </div>

          <div className="scan-result">
            {/* Receipt Preview */}
            {scanResult.receiptUrl && (
              <div className="scan-receipt-preview">
                <img src={scanResult.receiptUrl} alt="Receipt" />
                <span className="scan-badge">✓ AI Scanned</span>
              </div>
            )}

            {/* Editable Form */}
            <div>
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
                <label className="form-label">Vendor / Shop Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={scanResult.vendor}
                  onChange={(e) => handleFieldChange('vendor', e.target.value)}
                  placeholder="Shop or vendor name"
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

              <div className="form-group">
                <label className="form-label">Location (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={scanResult.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="City or area"
                />
              </div>

              <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn btn-ghost" onClick={reset}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-lg"
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
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createExpense } from '@/lib/api';
import { CATEGORIES } from '@/lib/constants';
import { toInputDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AddExpensePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    date: toInputDate(new Date()),
    category: '',
    vendor: '',
    description: '',
    location: '',
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || !form.category || !form.description) {
      toast.error('Please fill in amount, category, and description');
      return;
    }

    try {
      setSaving(true);
      await createExpense({
        ...form,
        amount: parseFloat(form.amount),
        entryMethod: 'manual',
      });
      toast.success('Expense added successfully! ✅');
      router.push('/history');
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const quickAdd = (amount, category, description) => {
    setForm({
      amount: amount.toString(),
      date: toInputDate(new Date()),
      category,
      vendor: '',
      description,
      location: '',
    });
  };

  return (
    <div className="has-sticky-actions">
      <div className="page-header">
        <h2>➕ Add Expense</h2>
        <p>Manually record an expense when no bill is available</p>
      </div>

      {/* Quick Add Presets */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title mb-sm">⚡ Quick Add</div>
        <div className="card-subtitle mb-md">Common expenses — tap to pre-fill</div>
        <div className="quick-add-grid">
          <button
            className="btn btn-secondary btn-sm quick-add-btn"
            onClick={() => quickAdd(50, 'Parking Charges', 'Parking at hospital')}
          >
            🅿️ Parking ₹50
          </button>
          <button
            className="btn btn-secondary btn-sm quick-add-btn"
            onClick={() => quickAdd(200, 'Food & Meals', 'Lunch during field visit')}
          >
            🍽️ Lunch ₹200
          </button>
          <button
            className="btn btn-secondary btn-sm quick-add-btn"
            onClick={() => quickAdd(100, 'Food & Meals', 'Tea and snacks')}
          >
            ☕ Tea ₹100
          </button>
          <button
            className="btn btn-secondary btn-sm quick-add-btn"
            onClick={() => quickAdd(500, 'Petrol/Fuel', 'Petrol refill')}
          >
            ⛽ Petrol ₹500
          </button>
          <button
            className="btn btn-secondary btn-sm quick-add-btn"
            onClick={() => quickAdd(30, 'Bus Travel', 'Bus ticket')}
          >
            🚌 Bus ₹30
          </button>
          <button
            className="btn btn-secondary btn-sm quick-add-btn"
            onClick={() => quickAdd(150, 'Miscellaneous', 'Auto/cab ride')}
          >
            🛺 Auto ₹150
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="card">
        <div className="card-title mb-lg">Expense Details</div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                className="form-input"
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                style={{ fontSize: '20px', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="form-group">
            <label className="form-label">Category *</label>
            <div className="category-grid">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.value}
                  className={`category-card ${form.category === cat.value ? 'selected' : ''}`}
                  style={{
                    '--cat-color': cat.color,
                    borderColor:
                      form.category === cat.value ? cat.color : undefined,
                    background:
                      form.category === cat.value
                        ? `${cat.color}12`
                        : undefined,
                  }}
                  onClick={() => updateField('category', cat.value)}
                >
                  <span className="category-card-icon">{cat.icon}</span>
                  <span className="category-card-label">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Purpose *</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="What was this expense for? e.g., Lunch during hospital visit"
              rows={2}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vendor / Shop Name</label>
              <input
                type="text"
                className="form-input"
                value={form.vendor}
                onChange={(e) => updateField('vendor', e.target.value)}
                placeholder="e.g., Hotel Saravana Bhavan"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-input"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g., Chennai"
              />
              <span className="form-help">Optional — city or area</span>
            </div>
          </div>

          <div className="sticky-mobile-actions flex gap-md" style={{ marginTop: '24px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={saving || !form.amount || !form.category || !form.description}
            >
              {saving ? (
                <>
                  <div className="loading-spinner" /> Saving...
                </>
              ) : (
                '💾 Save Expense'
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setForm({
                  amount: '',
                  date: toInputDate(new Date()),
                  category: '',
                  vendor: '',
                  description: '',
                  location: '',
                })
              }
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

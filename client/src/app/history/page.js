'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExpenses, deleteExpense, updateExpense } from '@/lib/api';
import { formatCurrency, formatDate, toInputDate } from '@/lib/utils';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadExpenses = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const res = await getExpenses({
          page,
          limit: 15,
          search: search || undefined,
          category: filterCategory || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setExpenses(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        toast.error('Failed to load expenses');
      } finally {
        setLoading(false);
      }
    },
    [search, filterCategory, startDate, endDate]
  );

  useEffect(() => {
    const timer = setTimeout(() => loadExpenses(1), 300);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteExpense(deleteModal._id);
      toast.success('Expense deleted');
      setDeleteModal(null);
      loadExpenses(pagination.page);
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const openEdit = (exp) => {
    setEditForm({
      amount: exp.amount,
      date: toInputDate(exp.date),
      category: exp.category,
      vendor: exp.vendor || '',
      description: exp.description,
      location: exp.location || '',
    });
    setEditModal(exp);
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    try {
      setSaving(true);
      await updateExpense(editModal._id, {
        ...editForm,
        amount: parseFloat(editForm.amount),
      });
      toast.success('Expense updated');
      setEditModal(null);
      loadExpenses(pagination.page);
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  function getCategoryBadgeClass(category) {
    const map = {
      'Food & Meals': 'food', 'Petrol/Fuel': 'fuel', 'Train Travel': 'train',
      'Bus Travel': 'bus', 'Hotel/Accommodation': 'hotel', 'Parking Charges': 'parking',
      'Medical Supply Delivery': 'medical', Miscellaneous: 'misc',
    };
    return map[category] || 'misc';
  }

  return (
    <div>
      <div className="page-header">
        <h2>📋 Expense History</h2>
        <p>Search, filter, and manage all your expenses</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by description, vendor, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
            title="Start date"
          />
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
            title="End date"
          />
        </div>
        <div className="filter-chips">
          <button
            className={`filter-chip ${!filterCategory ? 'active' : ''}`}
            onClick={() => setFilterCategory('')}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`filter-chip ${filterCategory === cat.value ? 'active' : ''}`}
              onClick={() =>
                setFilterCategory(filterCategory === cat.value ? '' : cat.value)
              }
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expense Table */}
      <div className="card">
        {loading ? (
          <div className="loading-page" style={{ minHeight: '200px' }}>
            <div className="loading-spinner lg"></div>
          </div>
        ) : expenses.length > 0 ? (
          <>
            <div
              className="flex-between mb-md"
              style={{ fontSize: '13px', color: 'var(--text-muted)' }}
            >
              <span>
                Showing {expenses.length} of {pagination.total} expenses
              </span>
            </div>
            <div className="table-container">
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th>Receipt</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp._id}>
                      <td className="date-cell">{formatDate(exp.date, 'short')}</td>
                      <td>
                        <div>{exp.description}</div>
                        {exp.location && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            📍 {exp.location}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`category-badge ${getCategoryBadgeClass(exp.category)}`}
                        >
                          {CATEGORY_MAP[exp.category]?.icon} {exp.category}
                        </span>
                      </td>
                      <td className="text-muted">{exp.vendor || '—'}</td>
                      <td>
                        {exp.receiptUrl ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setLightbox(exp.receiptUrl)}
                            title="View receipt"
                          >
                            🧾 View
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {exp.entryMethod === 'ai_scan' ? '📸' : '✏️'}{' '}
                            {exp.entryMethod === 'ai_scan' ? 'Scanned' : 'Manual'}
                          </span>
                        )}
                      </td>
                      <td className="amount-cell" style={{ textAlign: 'right' }}>
                        {formatCurrency(exp.amount)}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(exp)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteModal(exp)}
                            title="Delete"
                            style={{ color: 'var(--danger)' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => loadExpenses(pagination.page - 1)}
                >
                  ←
                </button>
                {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-btn ${
                        pagination.page === pageNum ? 'active' : ''
                      }`}
                      onClick={() => loadExpenses(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadExpenses(pagination.page + 1)}
                >
                  →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No expenses found</h3>
            <p>
              {search || filterCategory || startDate
                ? 'Try adjusting your filters'
                : 'Start by scanning a bill or adding an expense'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Expense</div>
              <button className="modal-close" onClick={() => setEditModal(null)}>
                ✕
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, category: e.target.value }))
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.vendor}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, vendor: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? (
                  <>
                    <div className="loading-spinner" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <div className="modal-header">
              <div className="modal-title">Delete Expense</div>
              <button className="modal-close" onClick={() => setDeleteModal(null)}>
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Are you sure you want to delete this expense?
            </p>
            <div
              className="card"
              style={{
                margin: '16px 0',
                background: 'var(--bg-glass)',
                padding: '16px',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                {deleteModal.description}
              </div>
              <div className="text-muted" style={{ fontSize: '13px' }}>
                {formatDate(deleteModal.date)} • {formatCurrency(deleteModal.amount)}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Receipt" className="lightbox-image" />
        </div>
      )}
    </div>
  );
}

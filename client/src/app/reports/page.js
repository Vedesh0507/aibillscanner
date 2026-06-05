'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  getCategoryStats,
  getTrendStats,
  downloadExcel,
  downloadCSV,
} from '@/lib/api';
import { formatCurrency, getDateRange } from '@/lib/utils';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        <p className="value">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  const dateRange =
    period === 'custom'
      ? { startDate: customStart, endDate: customEnd }
      : getDateRange(period);

  useEffect(() => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    loadData();
  }, [period, customStart, customEnd]);

  async function loadData() {
    try {
      setLoading(true);
      const groupBy = period === 'year' ? 'month' : 'day';
      const [catRes, trendRes] = await Promise.all([
        getCategoryStats(dateRange),
        getTrendStats({ ...dateRange, groupBy }),
      ]);
      setCategoryData(catRes.data || []);
      setTrendData(trendRes.data || []);
    } catch (err) {
      console.error('Report load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalExpenses = categoryData.reduce((sum, d) => sum + d.total, 0);
  const totalCount = categoryData.reduce((sum, d) => sum + d.count, 0);
  const avgDaily =
    trendData.length > 0 ? totalExpenses / trendData.length : 0;
  const topCategory =
    categoryData.length > 0 ? categoryData[0] : null;

  const handleDownload = async (type) => {
    try {
      setDownloading(type);
      if (type === 'excel') {
        await downloadExcel(dateRange);
      } else {
        await downloadCSV(dateRange);
      }
      toast.success(`${type === 'excel' ? 'Excel' : 'CSV'} report downloaded!`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading('');
    }
  };

  const pieColors = categoryData.map(
    (d) => CATEGORY_MAP[d.category]?.color || '#6b7280'
  );

  const PERIODS = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2>📈 Reports & Analytics</h2>
            <p>Analyze spending patterns and download reports</p>
          </div>
          <div className="btn-group">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleDownload('excel')}
              disabled={!!downloading}
            >
              {downloading === 'excel' ? (
                <><div className="loading-spinner" /> Preparing...</>
              ) : (
                '📊 Download Excel'
              )}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('csv')}
              disabled={!!downloading}
            >
              {downloading === 'csv' ? (
                <><div className="loading-spinner" /> Preparing...</>
              ) : (
                '📄 Download CSV'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="filter-bar" style={{ marginBottom: period === 'custom' ? '12px' : 0 }}>
          <div className="filter-chips">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                className={`filter-chip ${period === p.value ? 'active' : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {period === 'custom' && (
          <div className="flex gap-md" style={{ alignItems: 'center' }}>
            <input
              type="date"
              className="form-input"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ width: 'auto' }}
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              className="form-input"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-page">
          <div className="loading-spinner lg"></div>
          <p>Loading reports...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card today">
              <div className="stat-card-icon">💰</div>
              <div className="stat-card-label">Total Expenses</div>
              <div className="stat-card-value">{formatCurrency(totalExpenses)}</div>
              <div className="stat-card-sub">{totalCount} expenses</div>
            </div>
            <div className="stat-card week">
              <div className="stat-card-icon">📊</div>
              <div className="stat-card-label">Average Daily</div>
              <div className="stat-card-value">{formatCurrency(avgDaily)}</div>
              <div className="stat-card-sub">per day</div>
            </div>
            <div className="stat-card month">
              <div className="stat-card-icon">🏆</div>
              <div className="stat-card-label">Top Category</div>
              <div
                className="stat-card-value"
                style={{ fontSize: '18px' }}
              >
                {topCategory
                  ? `${CATEGORY_MAP[topCategory.category]?.icon || ''} ${topCategory.category}`
                  : '—'}
              </div>
              <div className="stat-card-sub">
                {topCategory ? formatCurrency(topCategory.total) : ''}
              </div>
            </div>
          </div>

          <div className="charts-grid">
            {/* Category Bar Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Spending by Category</div>
                  <div className="card-subtitle">Breakdown for selected period</div>
                </div>
              </div>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11 }}
                      width={150}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                      {categoryData.map((entry, i) => (
                        <Cell
                          key={entry.category}
                          fill={CATEGORY_MAP[entry.category]?.color || '#6b7280'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <p className="text-muted">No data for this period</p>
                </div>
              )}
            </div>

            {/* Pie Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Distribution</div>
                  <div className="card-subtitle">Percentage by category</div>
                </div>
              </div>
              {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.category} fill={pieColors[index]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          background: '#111631',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div>
                    {categoryData.map((d) => {
                      const pct = totalExpenses > 0
                        ? ((d.total / totalExpenses) * 100).toFixed(1)
                        : 0;
                      return (
                        <div
                          key={d.category}
                          className="flex-between"
                          style={{ padding: '5px 0', fontSize: '12px' }}
                        >
                          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                            <span
                              style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: CATEGORY_MAP[d.category]?.color || '#6b7280',
                                display: 'inline-block', flexShrink: 0,
                              }}
                            />
                            <span className="text-muted">
                              {CATEGORY_MAP[d.category]?.icon} {d.category}
                            </span>
                          </div>
                          <span style={{ fontWeight: 500 }}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <p className="text-muted">No data</p>
                </div>
              )}
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Spending Trend</div>
                <div className="card-subtitle">
                  {period === 'year' ? 'Monthly' : 'Daily'} spending over the selected period
                </div>
              </div>
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p className="text-muted">No trend data for this period</p>
              </div>
            )}
          </div>

          {/* Category Details Table */}
          {categoryData.length > 0 && (
            <div className="card mt-lg">
              <div className="card-header">
                <div className="card-title">Category Details</div>
              </div>
              <div className="table-container">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'center' }}>Count</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Average</th>
                      <th style={{ textAlign: 'right' }}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((d) => (
                      <tr key={d.category}>
                        <td>
                          <span
                            className={`category-badge ${
                              {
                                'Food & Meals': 'food',
                                'Petrol/Fuel': 'fuel',
                                'Train Travel': 'train',
                                'Bus Travel': 'bus',
                                'Hotel/Accommodation': 'hotel',
                                'Parking Charges': 'parking',
                                'Medical Supply Delivery': 'medical',
                                Miscellaneous: 'misc',
                              }[d.category] || 'misc'
                            }`}
                          >
                            {CATEGORY_MAP[d.category]?.icon} {d.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{d.count}</td>
                        <td className="amount-cell" style={{ textAlign: 'right' }}>
                          {formatCurrency(d.total)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {formatCurrency(d.avgAmount)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {totalExpenses > 0
                            ? ((d.total / totalExpenses) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Total</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{totalCount}</td>
                      <td
                        className="amount-cell"
                        style={{ textAlign: 'right', fontSize: '15px' }}
                      >
                        {formatCurrency(totalExpenses)}
                      </td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

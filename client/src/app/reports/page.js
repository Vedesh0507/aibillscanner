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
        <p className="value" style={{ color: '#2563EB', margin: 0 }}>{formatCurrency(payload[0].value)}</p>
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
            <p>Export expenditure analytics and track category distributions</p>
          </div>
          <div className="btn-group">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('excel')}
              disabled={!!downloading}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              {downloading === 'excel' ? (
                <><div className="loading-spinner" style={{ marginRight: '6px' }} /> Generating...</>
              ) : (
                '📊 Download Excel'
              )}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('csv')}
              disabled={!!downloading}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              {downloading === 'csv' ? (
                <><div className="loading-spinner" style={{ marginRight: '6px' }} /> Generating...</>
              ) : (
                '📄 Download CSV'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Period Selector Card */}
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
          <div className="flex gap-md" style={{ alignItems: 'center', marginTop: '10px' }}>
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
          {/* Summary Cards Grid */}
          <div className="stats-grid reports-summary-grid">
            <div className="stat-card today">
              <div className="stat-card-top">
                <span className="stat-card-label">Total Expenses</span>
                <div className="stat-card-icon">💰</div>
              </div>
              <div className="stat-card-value">{formatCurrency(totalExpenses)}</div>
              <div className="stat-card-sub">
                <span className="text-muted">{totalCount} total claims</span>
              </div>
            </div>
            
            <div className="stat-card week">
              <div className="stat-card-top">
                <span className="stat-card-label">Average Daily Spend</span>
                <div className="stat-card-icon">📊</div>
              </div>
              <div className="stat-card-value">{formatCurrency(avgDaily)}</div>
              <div className="stat-card-sub">
                <span className="text-muted">Across period</span>
              </div>
            </div>

            <div className="stat-card month">
              <div className="stat-card-top">
                <span className="stat-card-label">Top Category</span>
                <div className="stat-card-icon">🏆</div>
              </div>
              <div className="stat-card-value" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
                {topCategory
                  ? `${CATEGORY_MAP[topCategory.category]?.icon || ''} ${topCategory.category}`
                  : '—'}
              </div>
              <div className="stat-card-sub">
                <span className="text-muted">{topCategory ? formatCurrency(topCategory.total) : 'No data'}</span>
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginTop: '24px' }}>
            {/* Category Bar Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Spending by Category</div>
                  <div className="card-subtitle">Claimed amounts per category</div>
                </div>
              </div>
              {categoryData.length > 0 ? (
                <div className="chart-container-wrapper">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ left: 15, right: 10, top: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fontSize: 10, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                        width={130}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                        {categoryData.map((entry) => (
                          <Cell
                            key={entry.category}
                            fill={CATEGORY_MAP[entry.category]?.color || '#64748B'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <p className="text-muted">No data available for selected period</p>
                </div>
              )}
            </div>

            {/* Pie Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Category Distribution</div>
                  <div className="card-subtitle">Percentage share</div>
                </div>
              </div>
              {categoryData.length > 0 ? (
                <>
                  <div className="chart-container-wrapper">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={entry.category} fill={pieColors[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                          }}
                          itemStyle={{ color: '#0F172A', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '12px' }}>
                    {categoryData.map((d) => {
                      const pct = totalExpenses > 0
                        ? ((d.total / totalExpenses) * 100).toFixed(1)
                        : 0;
                      return (
                        <div
                          key={d.category}
                          className="flex-between"
                          style={{ padding: '4px 0', fontSize: '11px' }}
                        >
                          <div className="flex gap-sm" style={{ alignItems: 'center', overflow: 'hidden' }}>
                            <span
                              style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: CATEGORY_MAP[d.category]?.color || '#6b7280',
                                display: 'inline-block', flexShrink: 0,
                              }}
                            />
                            <span className="text-muted" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {CATEGORY_MAP[d.category]?.icon} {d.category}
                            </span>
                          </div>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <p className="text-muted">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Spending Trend</div>
                <div className="card-subtitle">
                  {period === 'year' ? 'Monthly' : 'Daily'} spending trend
                </div>
              </div>
            </div>
            {trendData.length > 0 ? (
              <div className="chart-container-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ fill: '#2563EB', r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#1D4ED8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p className="text-muted">No trend data available for selected period</p>
              </div>
            )}
          </div>

          {/* Category Details Table */}
          {categoryData.length > 0 && (
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <div className="card-title">Category Audit Breakdown</div>
              </div>
              <div className="table-container">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'center' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Total Claimed</th>
                      <th style={{ textAlign: 'right' }}>Average Size</th>
                      <th style={{ textAlign: 'right' }}>Percentage Share</th>
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
                      <td style={{ fontWeight: 700 }}>Total Period Expenditures</td>
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

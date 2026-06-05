'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getSummaryStats, getCategoryStats, getTrendStats, getExpenses } from '@/lib/api';
import { formatCurrency, formatDate, getDateRange } from '@/lib/utils';
import { CATEGORY_MAP } from '@/lib/constants';
import Link from 'next/link';

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

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState('month');

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadTrend();
  }, [trendPeriod]);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [summaryRes, catRes, recentRes] = await Promise.all([
        getSummaryStats(),
        getCategoryStats(getDateRange('month')),
        getExpenses({ limit: 8, sortBy: 'date', sortOrder: 'desc' }),
      ]);
      setStats(summaryRes.data);
      setCategoryData(catRes.data || []);
      setRecentExpenses(recentRes.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrend() {
    try {
      const range = getDateRange(trendPeriod);
      const groupBy = trendPeriod === 'year' ? 'month' : 'day';
      const res = await getTrendStats({ ...range, groupBy });
      setTrendData(res.data || []);
    } catch (err) {
      console.error('Trend load error:', err);
    }
  }

  function getCategoryBadgeClass(category) {
    const map = {
      'Food & Meals': 'food',
      'Petrol/Fuel': 'fuel',
      'Train Travel': 'train',
      'Bus Travel': 'bus',
      'Hotel/Accommodation': 'hotel',
      'Parking Charges': 'parking',
      'Medical Supply Delivery': 'medical',
      Miscellaneous: 'misc',
    };
    return map[category] || 'misc';
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner lg"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Spending",
      value: stats?.today?.total || 0,
      count: stats?.today?.count || 0,
      icon: '📅',
      period: 'today',
    },
    {
      label: 'This Week',
      value: stats?.week?.total || 0,
      count: stats?.week?.count || 0,
      icon: '📆',
      period: 'week',
    },
    {
      label: 'This Month',
      value: stats?.month?.total || 0,
      count: stats?.month?.count || 0,
      icon: '📊',
      period: 'month',
    },
    {
      label: 'This Year',
      value: stats?.year?.total || 0,
      count: stats?.year?.count || 0,
      icon: '📈',
      period: 'year',
    },
  ];

  const pieColors = categoryData.map(
    (d) => CATEGORY_MAP[d.category]?.color || '#6b7280'
  );

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your expense activity</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((stat) => (
          <div key={stat.period} className={`stat-card ${stat.period}`}>
            <div className="stat-card-icon">{stat.icon}</div>
            <div className="stat-card-label">{stat.label}</div>
            <div className="stat-card-value">{formatCurrency(stat.value)}</div>
            <div className="stat-card-sub">
              <span>{stat.count} expense{stat.count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Spending Trend</div>
              <div className="card-subtitle">
                {trendPeriod === 'year' ? 'Monthly' : 'Daily'} breakdown
              </div>
            </div>
            <div className="btn-group">
              {['week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  className={`btn btn-ghost btn-sm ${trendPeriod === p ? 'active' : ''}`}
                  onClick={() => setTrendPeriod(p)}
                  style={
                    trendPeriod === p
                      ? {
                          background: 'rgba(99,102,241,0.12)',
                          color: 'var(--accent-primary-light)',
                        }
                      : {}
                  }
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="text-muted">No trend data available yet</p>
            </div>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">By Category</div>
              <div className="card-subtitle">This month</div>
            </div>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    labelLine={false}
                    label={renderCustomLabel}
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
              <div style={{ marginTop: '12px' }}>
                {categoryData.slice(0, 5).map((d) => (
                  <div
                    key={d.category}
                    className="flex-between"
                    style={{ padding: '6px 0', fontSize: '12px' }}
                  >
                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: CATEGORY_MAP[d.category]?.color || '#6b7280',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span className="text-muted">{CATEGORY_MAP[d.category]?.icon} {d.category}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(d.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="text-muted">No category data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Expenses</div>
            <div className="card-subtitle">{stats?.totalExpenses || 0} total expenses</div>
          </div>
          <Link href="/history" className="btn btn-ghost btn-sm">
            View All →
          </Link>
        </div>
        {recentExpenses.length > 0 ? (
          <div className="table-container">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((exp) => (
                  <tr key={exp._id}>
                    <td className="date-cell">{formatDate(exp.date, 'short')}</td>
                    <td>{exp.description}</td>
                    <td>
                      <span className={`category-badge ${getCategoryBadgeClass(exp.category)}`}>
                        {CATEGORY_MAP[exp.category]?.icon} {exp.category}
                      </span>
                    </td>
                    <td className="text-muted">{exp.vendor || '—'}</td>
                    <td className="amount-cell" style={{ textAlign: 'right' }}>
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <h3>No expenses yet</h3>
            <p>Start by scanning a bill or adding an expense manually</p>
            <div className="btn-group" style={{ justifyContent: 'center' }}>
              <Link href="/scan" className="btn btn-primary">
                📸 Scan Bill
              </Link>
              <Link href="/add" className="btn btn-secondary">
                ➕ Add Manually
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

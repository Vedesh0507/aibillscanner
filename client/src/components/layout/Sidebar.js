'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';

const NAV_ICONS = {
  dashboard: '📊',
  scan: '📸',
  add: '➕',
  history: '📋',
  reports: '📈',
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">💼</div>
            <div className="sidebar-logo-text">
              <h1>ExpenseTrack</h1>
              <span>Medical Sales Agent</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{NAV_ICONS[item.icon]}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-glass)' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              AI Powered by
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              ✨ Google Gemini
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{NAV_ICONS[item.icon]}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

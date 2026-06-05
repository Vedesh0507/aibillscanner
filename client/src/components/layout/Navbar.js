'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/history?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="navbar">
      {/* Mobile Branding */}
      <div className="navbar-brand-mobile">
        💼 ExpenseTrack
      </div>

      {/* Search Bar */}
      <div className="navbar-search">
        <span className="navbar-search-icon">🔍</span>
        <input
          type="text"
          className="navbar-search-input"
          placeholder="Search expenses, vendors... (Press Enter)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      {/* Actions & Profile */}
      <div className="navbar-actions">
        {/* Quick Add Button */}
        <Link href="/add" className="btn btn-secondary btn-sm">
          ➕ Quick Add
        </Link>

        {/* AI Scan Button */}
        <Link href="/scan" className="btn btn-primary btn-sm">
          📸 AI Scan
        </Link>

        <div className="navbar-divider" />

        {/* Notifications Icon */}
        <button className="navbar-notification-btn" title="System Notifications">
          🔔
          <span className="navbar-notification-badge" />
        </button>

        <div className="navbar-divider" style={{ display: 'none' }} />

        {/* User Profile */}
        <div className="navbar-profile">
          <div className="navbar-avatar">MS</div>
          <div className="navbar-profile-info">
            <span className="navbar-profile-name">Max Sterling</span>
            <span className="navbar-profile-role">Medical Distributor</span>
          </div>
        </div>
      </div>
    </header>
  );
}

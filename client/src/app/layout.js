import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'ExpenseTrack — Medical Sales Agent Expense Manager',
  description:
    'AI-powered expense management system for medical sales agents. Scan bills, track expenses, and generate reports.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              fontSize: '14px',
            },
          }}
        />
        <div className="app-layout">
          <Sidebar />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
            <Navbar />
            <main className="main-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

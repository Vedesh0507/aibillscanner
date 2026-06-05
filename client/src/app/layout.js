import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
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
              background: '#111631',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
          }}
        />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}

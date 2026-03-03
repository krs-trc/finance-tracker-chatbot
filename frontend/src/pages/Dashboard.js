// src/pages/Dashboard.js
// Main dashboard: two-column layout with sidebar widgets (left) and chatbot (right)
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SidebarWidgets from '../components/SidebarWidgets';
import Chatbot from '../components/Chatbot';
import api from '../utils/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Fetch the user's total balance for the saving goals widget
  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get('/transactions/summary');
      setTotalBalance(res.data.summary.total_balance);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Called by Chatbot when a transaction is successfully logged
  const handleTransactionLogged = () => {
    fetchBalance();
  };

  return (
    <div className="dashboard">
      {/* ── Top Nav ───────────────────────────────────────────── */}
      <header className="dashboard-nav">
        <div className="nav-brand">
          <span className="nav-logo">💳</span>
          <span className="nav-title">FinTrack</span>
        </div>

        <div className="nav-center">
          <div className="nav-balance">
            <span className="nav-balance-label">Total Balance</span>
            <span className={`nav-balance-value ${parseFloat(totalBalance) < 0 ? 'negative' : ''}`}>
              {loadingBalance ? '—' : `${parseFloat(totalBalance) >= 0 ? '+' : ''}$${Math.abs(parseFloat(totalBalance)).toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="nav-right">
          <div className="nav-user">
            <div className="nav-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <span className="nav-name">{user?.name}</span>
          </div>
          <button className="nav-logout" onClick={logout} title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main Two-Column Layout ────────────────────────────── */}
      <main className="dashboard-main">
        {/* Left sidebar: widgets */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">My Finance</h3>
            <span className="sidebar-subtitle">Track your goals</span>
          </div>
          <SidebarWidgets totalBalance={totalBalance} />
        </aside>

        {/* Right: chatbot */}
        <section className="dashboard-chat">
          <Chatbot onTransactionLogged={handleTransactionLogged} />
        </section>
      </main>
    </div>
  );
}

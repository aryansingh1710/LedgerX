import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accountsAPI, adminAPI } from '../../services/api';
import { Spinner, formatCurrency, formatDate, txTypeBadge, statusBadge } from '../common/UI';

const Dashboard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await accountsAPI.getAll();
        setAccounts(data.accounts || []);

        if (user?.role === 'admin') {
          const { data: stats } = await adminAPI.getDashboard();
          setAdminStats(stats.stats);
        }
      } catch (e) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <Spinner size="lg" message="Loading dashboard…" />;

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.firstName} ✦</h1>
          <p>Here's your financial overview</p>
        </div>
        <Link to="/accounts" className="btn btn-primary">
          + New Account
        </Link>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent': 'var(--color-primary)' }}>
          <span className="stat-icon">◈</span>
          <div className="stat-value">{accounts.length}</div>
          <div className="stat-label">Active Accounts</div>
        </div>
        <div className="stat-card" style={{ '--accent': 'var(--color-success)' }}>
          <span className="stat-icon">$</span>
          <div className="stat-value">{formatCurrency(totalBalance)}</div>
          <div className="stat-label">Total Balance</div>
        </div>
        {user?.role === 'admin' && adminStats && (
          <>
            <div className="stat-card" style={{ '--accent': 'var(--color-warning)' }}>
              <span className="stat-icon">◎</span>
              <div className="stat-value">{adminStats.totalUsers}</div>
              <div className="stat-label">Customers</div>
            </div>
            <div className="stat-card" style={{ '--accent': 'var(--color-danger)' }}>
              <span className="stat-icon">⇌</span>
              <div className="stat-value">{adminStats.totalTransactions}</div>
              <div className="stat-label">Total Transactions</div>
            </div>
          </>
        )}
      </div>

      {/* Account cards */}
      <div style={{ marginBottom: 28 }}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontSize: '1.125rem' }}>Your Accounts</h2>
          <Link to="/accounts" className="btn btn-ghost btn-sm">View all →</Link>
        </div>
        {accounts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ marginBottom: 16 }}>No accounts yet. Open your first account.</p>
            <Link to="/accounts" className="btn btn-primary">Open Account</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {accounts.slice(0, 4).map((acct) => (
              <AccountCard key={acct._id} account={acct} />
            ))}
          </div>
        )}
      </div>

      {/* Admin: recent transactions */}
      {user?.role === 'admin' && adminStats?.recentTransactions?.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: 16 }}>Recent Activity</h2>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {adminStats.recentTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="font-mono text-xs">{tx.referenceNumber}</td>
                    <td>{txTypeBadge(tx.type)}</td>
                    <td className="text-success">{formatCurrency(tx.amount)}</td>
                    <td>{statusBadge(tx.status)}</td>
                    <td className="text-muted text-sm">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const AccountCard = ({ account }) => (
  <Link to={`/transactions?account=${account._id}`} style={{ textDecoration: 'none' }}>
    <div className="account-card">
      <div className="account-card-top">
        <div className="account-type-badge">{account.accountType}</div>
        <span style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem' }}>
          {account.currency}
        </span>
      </div>
      <div className="account-balance">{formatCurrency(account.balance)}</div>
      <div className="account-number font-mono">
        {account.accountNumber}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 4 }}>
        {account.description || '—'}
      </div>
    </div>
  </Link>
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default Dashboard;

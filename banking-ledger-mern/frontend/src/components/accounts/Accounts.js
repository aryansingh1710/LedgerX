import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { accountsAPI } from '../../services/api';
import { Spinner, Alert, EmptyState, Modal, formatCurrency } from '../common/UI';

const ACCOUNT_TYPES = ['checking', 'savings', 'business'];

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating]  = useState(false);
  const [form, setForm] = useState({ accountType: 'checking', description: '', currency: 'USD' });

  const loadAccounts = useCallback(async () => {
    try {
      const { data } = await accountsAPI.getAll();
      setAccounts(data.accounts || []);
    } catch {
      setError('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await accountsAPI.create(form);
      setAccounts((p) => [data.account, ...p]);
      setSuccess('Account created successfully!');
      setShowModal(false);
      setForm({ accountType: 'checking', description: '', currency: 'USD' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Spinner size="lg" message="Loading accounts…" />;

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Accounts</h1>
          <p>{accounts.length} account{accounts.length !== 1 ? 's' : ''} · Total {formatCurrency(totalBalance)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Open Account
        </button>
      </div>

      <Alert message={error}   type="error"   onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {accounts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="◈"
            title="No accounts yet"
            message="Open your first account to start banking."
            action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>Open Account</button>}
          />
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map((acct) => (
            <AccountRow key={acct._id} account={acct} />
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Open New Account">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select
              className="form-select"
              value={form.accountType}
              onChange={(e) => setForm((p) => ({ ...p, accountType: e.target.value }))}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            >
              {['USD', 'EUR', 'GBP', 'INR'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Emergency fund, Travel savings…"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={200}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-full" disabled={creating}>
              {creating ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Open Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TYPE_COLORS = {
  checking: 'var(--color-primary)',
  savings:  'var(--color-success)',
  business: 'var(--color-warning)',
};

const AccountRow = ({ account }) => (
  <div className="account-row-card">
    <div className="account-row-left">
      <div className="account-type-dot" style={{ background: TYPE_COLORS[account.accountType] || 'var(--color-primary)' }} />
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{account.accountNumber}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{account.accountType}</span>
          {account.description && <span style={{ marginLeft: 8 }}>{account.description}</span>}
        </div>
      </div>
    </div>
    <div className="account-row-right">
      <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: account.balance >= 0 ? 'var(--color-text)' : 'var(--color-danger)' }}>
        {formatCurrency(account.balance, account.currency)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Link to={`/transactions?account=${account._id}`} className="btn btn-ghost btn-sm">
          History
        </Link>
        <Link to={`/transfer?from=${account._id}`} className="btn btn-outline btn-sm">
          Transfer
        </Link>
      </div>
    </div>
  </div>
);

export default Accounts;

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { transactionsAPI, accountsAPI } from '../../services/api';
import { Alert, formatCurrency } from '../common/UI';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const Transfer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(null);

  const [form, setForm] = useState({
    type: 'deposit',            // deposit | withdraw | transfer
    fromAccount: searchParams.get('from') || '',
    toAccount: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    accountsAPI.getAll().then(({ data }) => {
      setAccounts(data.accounts || []);
      if (!form.fromAccount && data.accounts?.length > 0) {
        setForm((p) => ({ ...p, fromAccount: data.accounts[0]._id }));
      }
    }).catch(() => setError('Failed to load accounts.'))
      .finally(() => setLoading(false));
  }, []);

  const fromAcct = accounts.find((a) => a._id === form.fromAccount);
  const toAcct   = accounts.find((a) => a._id === form.toAccount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSub(true);

    try {
      let data;
      if (form.type === 'deposit') {
        ({ data } = await transactionsAPI.deposit(form.fromAccount, {
          amount: parseFloat(form.amount), description: form.description,
        }));
      } else if (form.type === 'withdraw') {
        ({ data } = await transactionsAPI.withdraw(form.fromAccount, {
          amount: parseFloat(form.amount), description: form.description,
        }));
      } else {
        ({ data } = await transactionsAPI.transfer(form.fromAccount, {
          toAccountId: form.toAccount,
          amount: parseFloat(form.amount),
          description: form.description,
        }));
      }
      setSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction failed.');
    } finally {
      setSub(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;

  if (success) {
    return <SuccessScreen result={success} type={form.type} onReset={() => { setSuccess(null); setForm((p) => ({ ...p, amount: '', description: '' })); }} onHistory={() => navigate(`/transactions?account=${form.fromAccount}`)} />;
  }

  const txLabels = { deposit: 'Deposit', withdraw: 'Withdraw', transfer: 'Transfer' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Move Money</h1>
          <p>Deposit, withdraw, or transfer between accounts</p>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Type selector */}
        <div className="card card-sm mb-4">
          <div style={{ display: 'flex', gap: 8 }}>
            {['deposit', 'withdraw', 'transfer'].map((t) => (
              <button
                key={t}
                type="button"
                className={`btn ${form.type === t ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, textTransform: 'capitalize' }}
                onClick={() => setForm((p) => ({ ...p, type: t }))}
              >{txLabels[t]}</button>
            ))}
          </div>
        </div>

        <div className="card">
          <Alert message={error} type="error" onClose={() => setError('')} />

          <form onSubmit={handleSubmit}>
            {/* From account */}
            <div className="form-group">
              <label className="form-label">
                {form.type === 'deposit' ? 'To Account' : 'From Account'}
              </label>
              <select
                className="form-select"
                value={form.fromAccount}
                onChange={(e) => setForm((p) => ({ ...p, fromAccount: e.target.value }))}
                required
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.accountNumber} — {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
              {fromAcct && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-muted text-xs">Available: </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--color-success)' }}>
                    {formatCurrency(fromAcct.balance)}
                  </span>
                </div>
              )}
            </div>

            {/* To account (transfer only) */}
            {form.type === 'transfer' && (
              <div className="form-group">
                <label className="form-label">To Account</label>
                <select
                  className="form-select"
                  value={form.toAccount}
                  onChange={(e) => setForm((p) => ({ ...p, toAccount: e.target.value }))}
                  required
                >
                  <option value="">Select destination…</option>
                  {accounts
                    .filter((a) => a._id !== form.fromAccount)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.accountNumber} — {a.accountType}
                      </option>
                    ))}
                </select>
                {toAcct && (
                  <div className="text-xs text-muted mt-1">
                    Current balance: {formatCurrency(toAcct.balance)}
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>$</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: 28 }}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setForm((p) => ({ ...p, amount: amt.toString() }))}
                  >${amt}</button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="What's this for?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Summary */}
            {form.amount && parseFloat(form.amount) > 0 && (
              <div style={{ padding: '14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Transaction</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{form.type}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted">Amount</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{formatCurrency(parseFloat(form.amount))}</span>
                </div>
                {form.type !== 'deposit' && fromAcct && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted">Balance after</span>
                    <span className={fromAcct.balance - parseFloat(form.amount) < 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(fromAcct.balance - parseFloat(form.amount))}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-full btn-lg ${form.type === 'withdraw' ? 'btn-danger' : form.type === 'deposit' ? 'btn-success' : 'btn-primary'}`}
              disabled={submitting || !form.amount}
            >
              {submitting ? <span className="spinner" style={{ width: 18, height: 18 }} /> : `Confirm ${txLabels[form.type]}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const SuccessScreen = ({ result, type, onReset, onHistory }) => {
  const icons = { deposit: '↓', withdraw: '↑', transfer: '→' };
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 72, height: 72, background: 'var(--color-success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem', color: 'var(--color-success)' }}>
        {icons[type]}
      </div>
      <h2 style={{ marginBottom: 8 }}>Transaction Complete</h2>
      <p style={{ marginBottom: 4 }}>Ref: <span className="font-mono text-sm">{result.referenceNumber}</span></p>
      <p className="text-muted text-sm" style={{ marginBottom: 28 }}>
        {formatCurrency(result.transaction?.amount)} {type} processed successfully.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={onReset}>New Transaction</button>
        <button className="btn btn-primary" onClick={onHistory}>View History</button>
      </div>
    </div>
  );
};

export default Transfer;

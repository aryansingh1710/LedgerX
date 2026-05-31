import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { transactionsAPI, accountsAPI } from '../../services/api';
import {
  Spinner, Alert, EmptyState, Pagination,
  formatCurrency, formatDate, txTypeBadge, statusBadge, Modal
} from '../common/UI';

const Transactions = () => {
  const [searchParams] = useSearchParams();
  const preselectedAccount = searchParams.get('account');

  const [accounts, setAccounts]         = useState([]);
  const [selectedAccount, setSelected]  = useState(preselectedAccount || '');
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [loadingAccounts, setLA]        = useState(true);
  const [error, setError]               = useState('');
  const [detailTx, setDetailTx]         = useState(null);
  const [detailLoading, setDL]          = useState(false);

  // Filters
  const [filters, setFilters] = useState({ page: 1, limit: 10, type: '', status: '', search: '', startDate: '', endDate: '' });

  useEffect(() => {
    accountsAPI.getAll().then(({ data }) => {
      setAccounts(data.accounts || []);
      if (!preselectedAccount && data.accounts?.length > 0) {
        setSelected(data.accounts[0]._id);
      }
    }).catch(() => setError('Failed to load accounts'))
      .finally(() => setLA(false));
  }, [preselectedAccount]);

  const loadTransactions = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });
      const { data } = await transactionsAPI.getHistory(selectedAccount, params);
      setTransactions(data.transactions || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, filters]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));

  const openDetail = async (txId) => {
    setDL(true);
    try {
      const { data } = await transactionsAPI.getDetail(txId);
      setDetailTx(data);
    } catch { setError('Failed to load transaction details.'); }
    finally { setDL(false); }
  };

  const selectedAcctObj = accounts.find((a) => a._id === selectedAccount);

  if (loadingAccounts) return <Spinner size="lg" message="Loading…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>Full history with ledger entries</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/transfer" className="btn btn-outline">Transfer Funds</Link>
        </div>
      </div>

      <Alert message={error} type="error" onClose={() => setError('')} />

      {/* Account selector */}
      {accounts.length > 0 && (
        <div className="card card-sm mb-4" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Account</label>
            <select
              className="form-select"
              value={selectedAccount}
              onChange={(e) => { setSelected(e.target.value); setFilters((p) => ({ ...p, page: 1 })); }}
            >
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.accountNumber} ({a.accountType}) — {formatCurrency(a.balance)}
                </option>
              ))}
            </select>
          </div>

          {selectedAcctObj && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current Balance</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-success)' }}>
                {formatCurrency(selectedAcctObj.balance)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card card-sm mb-4">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Search</label>
            <input
              className="form-input"
              placeholder="Reference # or description…"
              value={filters.search}
              onChange={(e) => handleFilter('search', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Type</label>
            <select className="form-select" value={filters.type} onChange={(e) => handleFilter('type', e.target.value)}>
              <option value="">All</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={filters.status} onChange={(e) => handleFilter('status', e.target.value)}>
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={filters.startDate}
              onChange={(e) => handleFilter('startDate', e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={filters.endDate}
              onChange={(e) => handleFilter('endDate', e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() =>
            setFilters({ page: 1, limit: 10, type: '', status: '', search: '', startDate: '', endDate: '' })
          }>Reset</button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner message="Loading transactions…" />
      ) : transactions.length === 0 ? (
        <div className="card">
          <EmptyState icon="⇌" title="No transactions" message="Transactions will appear here once you deposit or transfer funds." />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Balance After</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="font-mono text-xs">{tx.referenceNumber}</td>
                    <td>{txTypeBadge(tx.type)}</td>
                    <td>
                      <span className={tx.type === 'withdrawal' || (tx.type === 'transfer' && tx.account._id === selectedAccount)
                        ? 'text-danger' : 'text-success'}>
                        {tx.type === 'withdrawal' || (tx.type === 'transfer' && tx.account._id === selectedAccount) ? '−' : '+'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{tx.description || '—'}</td>
                    <td className="font-mono text-sm">{formatCurrency(tx.balanceAfter)}</td>
                    <td>{statusBadge(tx.status)}</td>
                    <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetail(tx._id)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination pagination={pagination} onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))} />
        </>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detailTx} onClose={() => setDetailTx(null)} title="Transaction Details">
        {detailLoading ? <Spinner /> : detailTx && <TransactionDetail detail={detailTx} />}
      </Modal>
    </div>
  );
};

const TransactionDetail = ({ detail }) => {
  const { transaction: tx, ledgerEntries, integrity } = detail;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <InfoItem label="Reference" value={tx.referenceNumber} mono />
        <InfoItem label="Type" value={txTypeBadge(tx.type)} />
        <InfoItem label="Amount" value={formatCurrency(tx.amount)} />
        <InfoItem label="Status" value={statusBadge(tx.status)} />
        <InfoItem label="Balance Before" value={formatCurrency(tx.balanceBefore)} />
        <InfoItem label="Balance After" value={formatCurrency(tx.balanceAfter)} />
        <InfoItem label="Date" value={formatDate(tx.createdAt)} />
        <InfoItem label="Initiated By" value={`${tx.initiatedBy?.firstName} ${tx.initiatedBy?.lastName}`} />
      </div>

      {tx.description && <InfoItem label="Description" value={tx.description} />}

      <hr className="divider" />

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.875rem' }}>Ledger Entries ({ledgerEntries?.length})</h4>
          <span className={`badge ${integrity?.valid ? 'badge-success' : 'badge-danger'}`}>
            {integrity?.valid ? '✓ Balanced' : '✗ Unbalanced'}
          </span>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>#</th><th>Type</th><th>Amount</th><th>Running Balance</th></tr>
          </thead>
          <tbody>
            {ledgerEntries?.map((e) => (
              <tr key={e._id}>
                <td className="text-muted text-xs">{e.sequence}</td>
                <td><span className={`badge ${e.entryType === 'debit' ? 'badge-success' : 'badge-danger'}`}>{e.entryType}</span></td>
                <td>{formatCurrency(e.amount)}</td>
                <td className="font-mono text-sm">{formatCurrency(e.runningBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 3 }}>{label}</div>
    <div className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</div>
  </div>
);

export default Transactions;

import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { Spinner, Alert, Pagination, EmptyState, formatDate } from '../common/UI';

const SEVERITY_COLORS = {
  info:     'badge-primary',
  warning:  'badge-warning',
  critical: 'badge-danger',
};

const AuditLogs = () => {
  const [logs, setLogs]       = useState([]);
  const [pagination, setPag]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState({ action: '', severity: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.action)   params.action   = filters.action;
      if (filters.severity) params.severity = filters.severity;
      const { data } = await adminAPI.getAuditLogs(params);
      setLogs(data.logs || []);
      setPag(data.pagination);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => { setFilters((p) => ({ ...p, [key]: val })); setPage(1); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Full audit trail of all system events</p>
        </div>
      </div>

      <Alert message={error} type="error" onClose={() => setError('')} />

      {/* Filters */}
      <div className="card card-sm mb-4">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 220 }} value={filters.action}
            onChange={(e) => setFilter('action', e.target.value)}>
            <option value="">All actions</option>
            <option value="USER_REGISTER">User Register</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="ACCOUNT_CREATED">Account Created</option>
            <option value="TRANSACTION_DEPOSIT">Deposit</option>
            <option value="TRANSACTION_WITHDRAWAL">Withdrawal</option>
            <option value="TRANSACTION_TRANSFER">Transfer</option>
            <option value="TRANSACTION_FAILED">Transaction Failed</option>
            <option value="ADMIN_ACTION">Admin Action</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filters.severity}
            onChange={(e) => setFilter('severity', e.target.value)}>
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <button className="btn btn-ghost btn-sm"
            onClick={() => { setFilters({ action: '', severity: '' }); setPage(1); }}>
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner message="Loading audit logs…" />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState icon="⊞" title="No logs found" message="Audit events will appear here as actions occur." />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Severity</th>
                  <th>User</th>
                  <th>Description</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${SEVERITY_COLORS[log.severity] || 'badge-neutral'}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {log.user.firstName} {log.user.lastName}
                          </div>
                          <div className="text-xs text-muted">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted text-sm">System</span>
                      )}
                    </td>
                    <td className="text-muted text-sm" style={{ maxWidth: 280 }}>
                      <span title={log.description}>
                        {log.description?.length > 60
                          ? log.description.slice(0, 60) + '…'
                          : log.description || '—'}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-muted">{log.ipAddress || '—'}</td>
                    <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AuditLogs;

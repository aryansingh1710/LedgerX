import React from 'react';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export const Spinner = ({ size = '', message = '' }) => (
  <div className="loading-center">
    <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />
    {message && <span>{message}</span>}
  </div>
);

// ─── Alert Banner ─────────────────────────────────────────────────────────────
export const Alert = ({ type = 'error', message, onClose }) => {
  if (!message) return null;
  const icons = { error: '✕', success: '✓', warning: '⚠' };
  return (
    <div className={`alert alert-${type}`} style={{ marginBottom: 16 }}>
      <span>{icons[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}
        >×</button>
      )}
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { currentPage, totalPages } = pagination;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={!pagination.hasPrevPage}
        onClick={() => onPageChange(currentPage - 1)}
      >‹</button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={i} style={{ color: 'var(--color-text-faint)', padding: '0 4px' }}>…</span>
        ) : (
          <button
            key={page}
            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >{page}</button>
        )
      )}

      <button
        className="pagination-btn"
        disabled={!pagination.hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
      >›</button>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '◎', title, message, action }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

// ─── Modal ─────────────────────────────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Format helpers ───────────────────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const txTypeBadge = (type) => {
  const map = {
    deposit:    { cls: 'badge-success', label: 'Deposit'    },
    withdrawal: { cls: 'badge-danger',  label: 'Withdrawal' },
    transfer:   { cls: 'badge-primary', label: 'Transfer'   },
  };
  const { cls, label } = map[type] || { cls: 'badge-neutral', label: type };
  return <span className={`badge ${cls}`}>{label}</span>;
};

export const statusBadge = (status) => {
  const map = {
    completed: 'badge-success',
    pending:   'badge-warning',
    failed:    'badge-danger',
    reversed:  'badge-neutral',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

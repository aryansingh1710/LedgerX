import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { Spinner, Alert, Pagination, EmptyState, formatDate } from '../common/UI';

const AdminUsers = () => {
  const [users, setUsers]         = useState([]);
  const [pagination, setPag]      = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [search, setSearch]       = useState('');
  const [roleFilter, setRole]     = useState('');
  const [page, setPage]           = useState(1);
  const [toggling, setToggling]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page, limit: 15, search, role: roleFilter });
      setUsers(data.users || []);
      setPag(data.pagination);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (userId) => {
    setToggling(userId);
    try {
      const { data } = await adminAPI.toggleUserStatus(userId);
      setUsers((p) => p.map((u) => (u._id === userId ? data.user : u)));
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Manage customer accounts</p>
        </div>
      </div>

      <Alert message={error}   type="error"   onClose={() => setError('')}   />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {/* Filters */}
      <div className="card card-sm mb-4">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Search name or email…"
            value={search}
            style={{ flex: 1, minWidth: 200 }}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-select" style={{ width: 160 }} value={roleFilter}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner message="Loading users…" />
      ) : users.length === 0 ? (
        <div className="card">
          <EmptyState icon="◎" title="No users found" message="Try adjusting your search filters." />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32,
                          background: 'var(--color-surface-3)',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        {user.firstName} {user.lastName}
                      </div>
                    </td>
                    <td className="text-muted text-sm">{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-muted text-sm">
                      {user.lastLogin ? formatDate(user.lastLogin) : '—'}
                    </td>
                    <td className="text-muted text-sm">{formatDate(user.createdAt)}</td>
                    <td>
                      {user.role !== 'admin' && (
                        <button
                          className={`btn btn-sm ${user.isActive ? 'btn-ghost' : 'btn-outline'}`}
                          onClick={() => toggleStatus(user._id)}
                          disabled={toggling === user._id}
                          style={{ color: user.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
                        >
                          {toggling === user._id
                            ? <span className="spinner" style={{ width: 14, height: 14 }} />
                            : user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
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

export default AdminUsers;

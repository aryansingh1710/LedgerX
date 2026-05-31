import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../common/UI';
import './Auth.css';

const Login = () => {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    clearError();
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(form);
    setSubmitting(false);
    if (result.success) navigate('/dashboard');
  };

  // Quick-fill for demo
  const fillDemo = (role) => {
    clearError();
    if (role === 'admin') setForm({ email: 'admin@bank.com', password: 'Admin@12345' });
    else setForm({ email: 'alice@example.com', password: 'Alice@12345' });
  };

  if (isLoading && !submitting) return null;

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-logo-large">⬡</div>
          <h1 className="auth-headline">LedgerX</h1>
          <p className="auth-subheadline">
            Double-entry banking with<br />real-time balance precision.
          </p>
          <div className="auth-features">
            {['Atomic transactions', 'Double-entry ledger', 'Role-based access', 'Full audit trail'].map((f) => (
              <div key={f} className="auth-feature-item">
                <span className="auth-feature-icon">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-container">
          <h2>Welcome back</h2>
          <p className="auth-form-sub">Sign in to your account</p>

          {/* Demo credentials */}
          <div className="demo-creds">
            <span className="text-xs text-muted">Demo:</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('admin')}>Admin</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('customer')}>Customer</button>
          </div>

          <Alert message={error} type="error" onClose={clearError} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass((p) => !p)}
                  tabIndex={-1}
                >{showPass ? '○' : '●'}</button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={submitting}
            >
              {submitting ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Sign In'}
            </button>
          </form>

          <div className="divider" />
          <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

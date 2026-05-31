import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../common/UI';
import './Auth.css';

const Register = () => {
  const { register, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    clearError();
    setFormError('');
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const result = await register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
    });
    setSubmitting(false);
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-logo-large">⬡</div>
          <h1 className="auth-headline">LedgerX</h1>
          <p className="auth-subheadline">Open your account today.<br />Start banking smarter.</p>
          <div className="auth-features">
            {['Free to open', 'Secure JWT auth', 'Instant transfers', 'Transaction history'].map((f) => (
              <div key={f} className="auth-feature-item">
                <span className="auth-feature-icon">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-container">
          <h2>Create account</h2>
          <p className="auth-form-sub">Join LedgerX Banking today</p>

          <Alert message={error || formError} type="error" onClose={() => { clearError(); setFormError(''); }} />

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input type="text" name="firstName" className="form-input"
                  placeholder="Alice" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input type="text" name="lastName" className="form-input"
                  placeholder="Johnson" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-input"
                placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-input"
                placeholder="Min. 8 chars, upper + lower + number" value={form.password} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" name="confirmPassword" className="form-input"
                placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting}>
              {submitting ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Create Account'}
            </button>
          </form>

          <div className="divider" />
          <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

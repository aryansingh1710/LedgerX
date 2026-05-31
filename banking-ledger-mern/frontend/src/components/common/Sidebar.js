import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard',     icon: '⬡',  label: 'Dashboard'    },
  { to: '/accounts',      icon: '◈',  label: 'Accounts'     },
  { to: '/transactions',  icon: '⇌',  label: 'Transactions' },
  { to: '/transfer',      icon: '→',  label: 'Transfer'     },
];

const ADMIN_ITEMS = [
  { to: '/admin/users',  icon: '◎', label: 'Users'      },
  { to: '/admin/audit',  icon: '⊞', label: 'Audit Logs' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <span>⬡</span>
        </div>
        <div className="logo-text">
          <span className="logo-name">LedgerX</span>
          <span className="logo-tagline">Banking System</span>
        </div>
      </div>

      {/* User badge */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.firstName} {user?.lastName}</span>
          <span className={`user-role ${user?.role}`}>{user?.role}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Main Menu</span>
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <span className="nav-section-label" style={{ marginTop: 16 }}>Admin</span>
            {ADMIN_ITEMS.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <span className="nav-icon">⊗</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

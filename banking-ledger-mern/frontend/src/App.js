import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute, AdminRoute, AppLayout } from './components/common/PrivateRoute';

// Auth pages
import Login    from './components/auth/Login';
import Register from './components/auth/Register';

// App pages
import Dashboard   from './components/dashboard/Dashboard';
import Accounts    from './components/accounts/Accounts';
import Transactions from './components/transactions/Transactions';
import Transfer    from './components/transactions/Transfer';

// Admin pages
import AdminUsers from './components/dashboard/AdminUsers';
import AuditLogs  from './components/dashboard/AuditLogs';

// Import shared styles
import './components/accounts/Accounts.css';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes inside app shell */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/accounts"     element={<Accounts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transfer"     element={<Transfer />} />

            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/audit" element={<AuditLogs />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;

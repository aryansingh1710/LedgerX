import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { Spinner } from './UI';

// Requires authenticated user
export const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner size="lg" message="Authenticating…" />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Requires admin role
export const AdminRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Spinner size="lg" message="Authenticating…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

// App shell layout with sidebar
export const AppLayout = () => (
  <div className="app-layout">
    <Sidebar />
    <main className="main-content">
      <Outlet />
    </main>
  </div>
);
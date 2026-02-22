import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component wraps routes that require authentication.
 * - If user is authenticated, renders the child routes (Outlet)
 * - If not authenticated, redirects to /login
 * - Shows loading spinner while checking auth state
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#f5f7fa',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render child routes if authenticated
  return <Outlet />;
}

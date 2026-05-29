import { Spinner } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleDashboard = {
  admin: '/admin/dashboard',
  student: '/dashboard',
};

export default function ProtectedRoute({ children, requiredRole }) {
  const { token, user, isLoading } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" />
      </main>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    const redirect = roleDashboard[user?.role] ?? '/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
}

import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, isAllowed = true }) {
  return isAllowed ? children : <Navigate to="/login" replace />;
}


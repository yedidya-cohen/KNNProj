import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import CoursesManagement from './pages/CoursesManagement';
import GradesPage from './pages/GradesPage';
import HistoricalDataPage from './pages/HistoricalDataPage';
import LoginPage from './pages/LoginPage';
import PredictionHistoryPage from './pages/PredictionHistoryPage';
import PredictionPage from './pages/PredictionPage';
import RecommendationsPage from './pages/RecommendationsPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import { useAuth } from './context/AuthContext';

const roleDashboard = {
  admin: '/admin/dashboard',
  student: '/dashboard',
};

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={roleDashboard[user?.role] ?? '/login'} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>}
        />
        <Route
          path="/grades"
          element={<ProtectedRoute requiredRole="student"><GradesPage /></ProtectedRoute>}
        />
        <Route
          path="/predict"
          element={<ProtectedRoute requiredRole="student"><PredictionPage /></ProtectedRoute>}
        />
        <Route
          path="/recommendations"
          element={<ProtectedRoute requiredRole="student"><RecommendationsPage /></ProtectedRoute>}
        />
        <Route
          path="/predictions/history"
          element={<ProtectedRoute requiredRole="student"><PredictionHistoryPage /></ProtectedRoute>}
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/courses"
          element={<ProtectedRoute requiredRole="admin"><CoursesManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/historical-data"
          element={<ProtectedRoute requiredRole="admin"><HistoricalDataPage /></ProtectedRoute>}
        />

        <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

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
          element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>}
        />
        <Route
          path="/grades"
          element={<ProtectedRoute><GradesPage /></ProtectedRoute>}
        />
        <Route
          path="/predict"
          element={<ProtectedRoute><PredictionPage /></ProtectedRoute>}
        />
        <Route
          path="/recommendations"
          element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>}
        />
        <Route
          path="/predictions/history"
          element={<ProtectedRoute><PredictionHistoryPage /></ProtectedRoute>}
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

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

// Public pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import NotFound from './pages/NotFound';
import CertificateVerify from './pages/CertificateVerify';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import Courses from './pages/admin/Courses';
import CourseDetail from './pages/admin/CourseDetail';
import Tests from './pages/admin/Tests';
import TestBuilder from './pages/admin/TestBuilder';
import Certificates from './pages/admin/Certificates';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import StudentCourses from './pages/student/Courses';
import CourseView from './pages/student/CourseView';
import StudentTests from './pages/student/Tests';
import TakeTest from './pages/student/TakeTest';
import TestResult from './pages/student/TestResult';
import StudentCertificates from './pages/student/Certificates';
import StudentProfile from './pages/student/Profile';

const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      <p className="text-slate-400 text-sm mt-1">Coming soon</p>
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          <Route path="/verify/:id" element={<CertificateVerify />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:id" element={<CourseDetail />} />
            <Route path="tests" element={<Tests />} />
            <Route path="tests/:id" element={<TestBuilder />} />
            <Route path="tests/:id/results" element={<Placeholder title="Test Results" />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="courses" element={<StudentCourses />} />
            <Route path="courses/:id" element={<CourseView />} />
            <Route path="tests" element={<StudentTests />} />
            <Route path="tests/:testId" element={<TakeTest />} />
            <Route path="tests/result/:attemptId" element={<TestResult />} />
            <Route path="certificates" element={<StudentCertificates />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

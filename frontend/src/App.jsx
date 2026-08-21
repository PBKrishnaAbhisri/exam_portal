import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth pages
import Login from './pages/Login';
import StudentSignup from './pages/StudentSignup';
import AdminSignup from './pages/AdminSignup';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ExamList from './pages/admin/ExamList';
import CreateExam from './pages/admin/CreateExam';
import ExamDetail from './pages/admin/ExamDetail';
import ExamAnalytics from './pages/admin/ExamAnalytics';
import LiveMonitor from './pages/admin/LiveMonitor';
import ManualReview from './pages/admin/ManualReview';
import ExamBank from './pages/admin/ExamBank';
import StudentsList from './pages/admin/StudentsList';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentResults from './pages/student/StudentResults';
import ExamResult from './pages/student/ExamResult';
import ExamInstructions from './pages/student/ExamInstructions';
import ExamEnvironment from './pages/student/ExamEnvironment';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup/student" element={<StudentSignup />} />
          <Route path="/signup/admin" element={<AdminSignup />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/exams" element={<ExamList />} />
            <Route path="/admin/exams/create" element={<CreateExam />} />
            <Route path="/admin/exams/:id" element={<ExamDetail />} />
            <Route path="/admin/analytics/:examId" element={<ExamAnalytics />} />
            <Route path="/admin/live" element={<LiveMonitor />} />
            <Route path="/admin/review" element={<ManualReview />} />
            <Route path="/admin/exam-bank" element={<ExamBank />} />
            <Route path="/admin/students" element={<StudentsList />} />
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/results" element={<StudentResults />} />
            <Route path="/student/result/:examId" element={<ExamResult />} />
            <Route path="/student/exam/:examId/instructions" element={<ExamInstructions />} />
            <Route path="/student/exam/:examId/take" element={<ExamEnvironment />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

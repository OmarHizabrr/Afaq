import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import LoginPage from './pages/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import GovernoratesPage from './pages/admin/GovernoratesPage';
import RegionsPage from './pages/admin/RegionsPage';
import VillagesPage from './pages/admin/VillagesPage';
import SchoolsPage from './pages/admin/SchoolsPage';
import UsersPage from './pages/admin/UsersPage';
import StudentManagementPage from './pages/admin/StudentManagementPage';
import CurriculumPage from './pages/admin/CurriculumPage';
import SettingsPage from './pages/common/SettingsPage';
import NotificationsPage from './pages/common/NotificationsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage';
import TeacherDailyLogPage from './pages/teacher/TeacherDailyLogPage';
import TeacherWeeklyReportPage from './pages/teacher/TeacherWeeklyReportPage';
import SupervisorLayout from './layouts/SupervisorLayout';
import SupervisorDashboardPage from './pages/supervisor/SupervisorDashboardPage';
import SupervisorVisitPage from './pages/supervisor/SupervisorVisitPage';
import SupervisorHistoryPage from './pages/supervisor/SupervisorHistoryPage';
import StudentLayout from './layouts/StudentLayout';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentResultsPage from './pages/student/StudentResultsPage';
import SchoolDetailsPage from './pages/admin/SchoolDetailsPage';
import RegionDetailsPage from './pages/admin/RegionDetailsPage';
import UserDetailsPage from './pages/admin/UserDetailsPage';
import ReportDetailsPage from './pages/admin/ReportDetailsPage';
import GovernorateDetailsPage from './pages/admin/GovernorateDetailsPage';
import VillageDetailsPage from './pages/admin/VillageDetailsPage';
import AuthService from './services/authService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitor auth state
    const unsubscribe = AuthService.Api.onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="welcome-container" style={{ background: 'var(--bg-color)', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" style={{ width: '48px', height: '48px' }}></div>
      </main>
    );
  }

  // Role-based Route Wrappers
  const AdminRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (user.role === 'supervisor_local' || user.role === 'supervisor_arab') return <Navigate to="/supervisor" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
    return children;
  };

  const SupervisorRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'supervisor_local' && user.role !== 'supervisor_arab' && user.role !== 'admin') return <Navigate to="/" replace />;
    return children;
  };

  const TeacherRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'teacher' && user.role !== 'admin') return <Navigate to="/" replace />;
    return children;
  };

  const StudentRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'student' && user.role !== 'admin') return <Navigate to="/" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            user 
              ? <Navigate to={user.role === 'teacher' ? '/teacher' : user.role === 'student' ? '/student' : (user.role === 'supervisor_local' || user.role === 'supervisor_arab') ? '/supervisor' : '/'} replace /> 
              : <LoginPage />
          } 
        />
        
        {/* Admin / Supervisor Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <AdminRoute>
              <AdminLayout user={user} />
            </AdminRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="governorates" element={<GovernoratesPage />} />
          <Route path="regions" element={<RegionsPage />} />
          <Route path="villages" element={<VillagesPage />} />
          <Route path="schools" element={<SchoolsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="students-management" element={<StudentManagementPage />} />
          <Route path="curriculum" element={<CurriculumPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="reports/:id" element={<ReportDetailsPage />} />
          <Route path="schools/:id" element={<SchoolDetailsPage />} />
          <Route path="regions/:id" element={<RegionDetailsPage />} />
          <Route path="users/:id" element={<UserDetailsPage />} />
          <Route path="governorates/:id" element={<GovernorateDetailsPage />} />
          <Route path="villages/:id" element={<VillageDetailsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage user={user} />} />
        </Route>

        {/* Supervisor Portal Routes */}
        <Route 
          path="/supervisor" 
          element={
            <SupervisorRoute>
              <SupervisorLayout user={user} />
            </SupervisorRoute>
          }
        >
          <Route index element={<SupervisorDashboardPage user={user} />} />
          <Route path="visit" element={<SupervisorVisitPage user={user} />} />
          <Route path="history" element={<SupervisorHistoryPage user={user} />} />
          <Route path="reports/:id" element={<ReportDetailsPage />} />
          <Route path="schools/:id" element={<SchoolDetailsPage />} />
          <Route path="users/:id" element={<UserDetailsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage user={user} />} />
        </Route>

        {/* Teacher Portal Routes */}
        <Route 
          path="/teacher" 
          element={
            <TeacherRoute>
              <TeacherLayout user={user} />
            </TeacherRoute>
          }
        >
          <Route index element={<TeacherDashboardPage user={user} />} />
          <Route path="students" element={<TeacherStudentsPage user={user} />} />
          <Route path="students/:id" element={<UserDetailsPage />} />
          <Route path="daily-log" element={<TeacherDailyLogPage user={user} />} />
          <Route path="weekly-report" element={<TeacherWeeklyReportPage user={user} />} />
          <Route path="reports/:id" element={<ReportDetailsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage user={user} />} />
        </Route>

        {/* Student Portal Routes */}
        <Route 
          path="/student" 
          element={
            <StudentRoute>
              <StudentLayout user={user} />
            </StudentRoute>
          }
        >
          <Route index element={<StudentDashboardPage user={user} />} />
          <Route path="results" element={<StudentResultsPage user={user} />} />
          <Route path="profile" element={<UserDetailsPage selfUser={user} />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage user={user} />} />
        </Route>

        <Route path="*" element={
          <Navigate to={
            user?.role === 'teacher' ? '/teacher' : 
            user?.role === 'student' ? '/student' :
            (user?.role === 'supervisor_local' || user?.role === 'supervisor_arab') ? '/supervisor' : '/'
          } replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

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
import CurriculumPage from './pages/admin/CurriculumPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage';
import TeacherDailyLogPage from './pages/teacher/TeacherDailyLogPage';
import TeacherWeeklyReportPage from './pages/teacher/TeacherWeeklyReportPage';
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
    // Default to admin layout for admin, supervisor_arab, supervisor_local, and unassigned
    return children;
  };

  const TeacherRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'teacher') return <Navigate to="/" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to={user.role === 'teacher' ? '/teacher' : '/'} replace /> : <LoginPage />} 
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
          <Route path="curriculum" element={<CurriculumPage />} />
          <Route path="settings" element={<div>الإعدادات هنا</div>} />
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
          <Route index element={<TeacherDashboardPage />} />
          <Route path="students" element={<TeacherStudentsPage user={user} />} />
          <Route path="daily-log" element={<TeacherDailyLogPage user={user} />} />
          <Route path="weekly-report" element={<TeacherWeeklyReportPage user={user} />} />
        </Route>

        <Route path="*" element={<Navigate to={user?.role === 'teacher' ? '/teacher' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

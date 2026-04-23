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
import CurriculumPrintPage from './pages/print/CurriculumPrintPage';
import SettingsPage from './pages/common/SettingsPage';
import NotificationsPage from './pages/common/NotificationsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import SchoolDetailsPage from './pages/admin/SchoolDetailsPage';
import RegionDetailsPage from './pages/admin/RegionDetailsPage';
import UserDetailsPage from './pages/admin/UserDetailsPage';
import ReportDetailsPage from './pages/admin/ReportDetailsPage';
import GovernorateDetailsPage from './pages/admin/GovernorateDetailsPage';
import VillageDetailsPage from './pages/admin/VillageDetailsPage';
import AuthService from './services/authService';
import { NotificationsBadgeProvider } from './context/NotificationsBadgeContext';
import PermissionsProvider from './context/PermissionsProvider';
import SiteContentProvider from './context/SiteContentProvider';
import PageGuard from './routes/PageGuard';
import AdminUserTypesPage from './pages/admin/AdminUserTypesPage';
import AdminBrandingPage from './pages/admin/AdminBrandingPage';
import AdminSiteCopyPage from './pages/admin/AdminSiteCopyPage';
import { PERMISSION_PAGE_IDS } from './config/permissionRegistry';
import NoPermissionsPage from './pages/common/NoPermissionsPage';
import usePermissions from './context/usePermissions';

const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const HomePageResolver = () => {
  const { ready, hasPermissionProfile, canAccessPage } = usePermissions();
  if (!ready) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!hasPermissionProfile || !canAccessPage(PERMISSION_PAGE_IDS.dashboard)) {
    return <NoPermissionsPage />;
  }
  return <DashboardPage />;
};

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

  return (
    <SiteContentProvider>
    <PermissionsProvider user={user}>
    <BrowserRouter>
      <NotificationsBadgeProvider user={user}>
      <Routes>
        <Route 
          path="/login" 
          element={
            user 
              ? <Navigate to="/" replace /> 
              : <LoginPage />
          } 
        />
        
        {/* Admin / Supervisor Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute user={user}>
              <AdminLayout user={user} />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePageResolver />} />
          <Route path="governorates" element={<PageGuard pageId={PERMISSION_PAGE_IDS.governorates}><GovernoratesPage /></PageGuard>} />
          <Route path="regions" element={<PageGuard pageId={PERMISSION_PAGE_IDS.regions}><RegionsPage /></PageGuard>} />
          <Route path="villages" element={<PageGuard pageId={PERMISSION_PAGE_IDS.villages}><VillagesPage /></PageGuard>} />
          <Route path="schools" element={<PageGuard pageId={PERMISSION_PAGE_IDS.schools}><SchoolsPage /></PageGuard>} />
          <Route path="users" element={<PageGuard pageId={PERMISSION_PAGE_IDS.users}><UsersPage /></PageGuard>} />
          <Route path="students-management" element={<PageGuard pageId={PERMISSION_PAGE_IDS.students_management}><StudentManagementPage /></PageGuard>} />
          <Route path="curriculum" element={<PageGuard pageId={PERMISSION_PAGE_IDS.curriculum}><CurriculumPage /></PageGuard>} />
          <Route path="reports" element={<PageGuard pageId={PERMISSION_PAGE_IDS.reports}><AdminReportsPage /></PageGuard>} />
          <Route path="reports/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.reports}><ReportDetailsPage viewerUser={user} /></PageGuard>} />
          <Route path="schools/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.schools}><SchoolDetailsPage /></PageGuard>} />
          <Route path="regions/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.regions}><RegionDetailsPage /></PageGuard>} />
          <Route path="users/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.users}><UserDetailsPage viewerUser={user} /></PageGuard>} />
          <Route path="governorates/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.governorates}><GovernorateDetailsPage /></PageGuard>} />
          <Route path="villages/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.villages}><VillageDetailsPage /></PageGuard>} />
          <Route path="settings" element={<PageGuard pageId={PERMISSION_PAGE_IDS.settings}><SettingsPage /></PageGuard>} />
          <Route path="notifications" element={<PageGuard pageId={PERMISSION_PAGE_IDS.notifications}><NotificationsPage user={user} /></PageGuard>} />
          <Route path="admin/user-types" element={<PageGuard pageId={PERMISSION_PAGE_IDS.admin_user_types}><AdminUserTypesPage user={user} /></PageGuard>} />
          <Route path="admin/branding" element={<PageGuard pageId={PERMISSION_PAGE_IDS.admin_branding}><AdminBrandingPage user={user} /></PageGuard>} />
          <Route path="admin/site-copy" element={<PageGuard pageId={PERMISSION_PAGE_IDS.admin_site_copy}><AdminSiteCopyPage user={user} /></PageGuard>} />
        </Route>

        <Route path="/supervisor/*" element={<Navigate to="/" replace />} />
        <Route path="/teacher/*" element={<Navigate to="/" replace />} />
        <Route path="/student/*" element={<Navigate to="/" replace />} />

        <Route
          path="/print/curriculum/:subjectId"
          element={
            <ProtectedRoute user={user}>
              <CurriculumPrintPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={
          <Navigate to={user ? '/' : '/login'} replace />
        } />
      </Routes>
      </NotificationsBadgeProvider>
    </BrowserRouter>
    </PermissionsProvider>
    </SiteContentProvider>
  );
}

export default App;

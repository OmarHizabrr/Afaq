import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import LoginPage from './pages/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import AuthService from './services/authService';
import { NotificationsBadgeProvider } from './context/NotificationsBadgeContext';
import PermissionsProvider from './context/PermissionsProvider';
import SiteContentProvider from './context/SiteContentProvider';
import I18nDirectionSync from './components/I18nDirectionSync';
import PageGuard from './routes/PageGuard';
import DailyPrepGuard from './routes/DailyPrepGuard';
import RolePortalGuard from './routes/RolePortalGuard';
import { PERMISSION_PAGE_IDS } from './config/permissionRegistry';
import NoPermissionsPage from './pages/common/NoPermissionsPage';
import usePermissions from './context/usePermissions';

const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const GovernoratesPage = lazy(() => import('./pages/admin/GovernoratesPage'));
const RegionsPage = lazy(() => import('./pages/admin/RegionsPage'));
const VillagesPage = lazy(() => import('./pages/admin/VillagesPage'));
const SchoolsPage = lazy(() => import('./pages/admin/SchoolsPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const StudentManagementPage = lazy(() => import('./pages/admin/StudentManagementPage'));
const StudentDetailsPage = lazy(() => import('./pages/admin/StudentDetailsPage'));
const CurriculumPage = lazy(() => import('./pages/admin/CurriculumPage'));
const CurriculumPrintPage = lazy(() => import('./pages/print/CurriculumPrintPage'));
const SettingsPage = lazy(() => import('./pages/common/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/common/NotificationsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const SchoolDetailsPage = lazy(() => import('./pages/admin/SchoolDetailsPage'));
const SchoolReportPage = lazy(() => import('./pages/admin/SchoolReportPage'));
const SchoolComprehensiveReportPage = lazy(() => import('./pages/admin/SchoolComprehensiveReportPage'));
const TeacherDailyLogPage = lazy(() => import('./pages/teacher/TeacherDailyLogPage'));
const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage'));
const TeacherStudentsPage = lazy(() => import('./pages/teacher/TeacherStudentsPage'));
const TeacherStudentDetailPage = lazy(() => import('./pages/teacher/TeacherStudentDetailPage'));
const TeacherWeeklyReportPage = lazy(() => import('./pages/teacher/TeacherWeeklyReportPage'));
const TeacherLayout = lazy(() => import('./layouts/TeacherLayout'));
const StudentLayout = lazy(() => import('./layouts/StudentLayout'));
const SupervisorLayout = lazy(() => import('./layouts/SupervisorLayout'));
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage'));
const StudentResultsPage = lazy(() => import('./pages/student/StudentResultsPage'));
const StudentProfilePage = lazy(() => import('./pages/student/StudentProfilePage'));
const SupervisorDashboardPage = lazy(() => import('./pages/supervisor/SupervisorDashboardPage'));
const SupervisorVisitPage = lazy(() => import('./pages/supervisor/SupervisorVisitPage'));
const SupervisorHistoryPage = lazy(() => import('./pages/supervisor/SupervisorHistoryPage'));
const RegionDetailsPage = lazy(() => import('./pages/admin/RegionDetailsPage'));
const UserDetailsPage = lazy(() => import('./pages/admin/UserDetailsPage'));
const ReportDetailsPage = lazy(() => import('./pages/admin/ReportDetailsPage'));
const GovernorateDetailsPage = lazy(() => import('./pages/admin/GovernorateDetailsPage'));
const VillageDetailsPage = lazy(() => import('./pages/admin/VillageDetailsPage'));
const AdminUserTypesPage = lazy(() => import('./pages/admin/AdminUserTypesPage'));
const AdminBrandingPage = lazy(() => import('./pages/admin/AdminBrandingPage'));
const AdminSiteCopyPage = lazy(() => import('./pages/admin/AdminSiteCopyPage'));
const ExplorationsPage = lazy(() => import('./pages/admin/ExplorationsPage'));
const ExplorationTypesPage = lazy(() => import('./pages/admin/ExplorationTypesPage'));

const RouteFallback = () => (
  <div className="route-loading">
    <div className="loading-spinner" />
  </div>
);

const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const HomePageResolver = () => {
  const { ready, hasPermissionProfile, canAccessPage, actorUser } = usePermissions();
  if (!ready) {
    return <RouteFallback />;
  }
  if (canAccessPage(PERMISSION_PAGE_IDS.dashboard)) {
    return <DashboardPage />;
  }
  const role = actorUser?.role || '';
  if (role === 'student') {
    return <Navigate to="/student" replace />;
  }
  if (role === 'supervisor_arab' || role === 'supervisor_local') {
    return <Navigate to="/supervisor" replace />;
  }
  if (role === 'teacher' || canAccessPage(PERMISSION_PAGE_IDS.daily_preparation)) {
    return <Navigate to="/teacher" replace />;
  }
  if (canAccessPage(PERMISSION_PAGE_IDS.reports)) {
    return <Navigate to="/reports" replace />;
  }
  if (!hasPermissionProfile) {
    return <NoPermissionsPage />;
  }
  return <NoPermissionsPage />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.Api.onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <SiteContentProvider>
        <I18nDirectionSync>
          <main className="welcome-container app-boot">
            <div className="loading-spinner loading-spinner--lg"></div>
          </main>
        </I18nDirectionSync>
      </SiteContentProvider>
    );
  }

  return (
    <SiteContentProvider>
    <I18nDirectionSync>
    <PermissionsProvider user={user}>
    <BrowserRouter>
      <NotificationsBadgeProvider user={user}>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route 
          path="/login" 
          element={
            user 
              ? <Navigate to="/" replace /> 
              : <LoginPage />
          } 
        />
        
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
          <Route path="explorations" element={<PageGuard pageId={PERMISSION_PAGE_IDS.explorations}><ExplorationsPage /></PageGuard>} />
          <Route path="users" element={<PageGuard pageId={PERMISSION_PAGE_IDS.users}><UsersPage /></PageGuard>} />
          <Route path="students-management" element={<PageGuard pageId={PERMISSION_PAGE_IDS.students_management}><StudentManagementPage /></PageGuard>} />
          <Route path="curriculum" element={<PageGuard pageId={PERMISSION_PAGE_IDS.curriculum}><CurriculumPage /></PageGuard>} />
          <Route path="reports" element={<PageGuard pageId={PERMISSION_PAGE_IDS.reports}><AdminReportsPage /></PageGuard>} />
          <Route path="reports/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.reports}><ReportDetailsPage viewerUser={user} /></PageGuard>} />
          <Route path="daily-preparation" element={<DailyPrepGuard><TeacherDailyLogPage user={user} /></DailyPrepGuard>} />
          <Route path="schools/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.schools}><SchoolDetailsPage /></PageGuard>} />
          <Route path="schools/:id/report" element={<PageGuard pageId={PERMISSION_PAGE_IDS.schools}><SchoolReportPage /></PageGuard>} />
          <Route path="schools/:id/report/:reportId" element={<PageGuard pageId={PERMISSION_PAGE_IDS.schools}><SchoolReportPage /></PageGuard>} />
          <Route path="schools/:id/comprehensive-report" element={<PageGuard pageId={PERMISSION_PAGE_IDS.schools}><SchoolComprehensiveReportPage /></PageGuard>} />
          <Route path="regions/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.regions}><RegionDetailsPage /></PageGuard>} />
          <Route path="users/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.users}><UserDetailsPage viewerUser={user} /></PageGuard>} />
          <Route path="students/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.students_management}><StudentDetailsPage /></PageGuard>} />
          <Route path="governorates/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.governorates}><GovernorateDetailsPage /></PageGuard>} />
          <Route path="villages/:id" element={<PageGuard pageId={PERMISSION_PAGE_IDS.villages}><VillageDetailsPage /></PageGuard>} />
          <Route path="settings" element={<PageGuard pageId={PERMISSION_PAGE_IDS.settings}><SettingsPage /></PageGuard>} />
          <Route path="notifications" element={<PageGuard pageId={PERMISSION_PAGE_IDS.notifications}><NotificationsPage user={user} /></PageGuard>} />
          <Route path="admin/user-types" element={<PageGuard pageId={PERMISSION_PAGE_IDS.admin_user_types}><AdminUserTypesPage user={user} /></PageGuard>} />
          <Route path="admin/branding" element={<PageGuard pageId={PERMISSION_PAGE_IDS.admin_branding}><AdminBrandingPage user={user} /></PageGuard>} />
          <Route path="admin/site-copy" element={<PageGuard pageId={PERMISSION_PAGE_IDS.admin_site_copy}><AdminSiteCopyPage user={user} /></PageGuard>} />
          <Route path="admin/exploration-types" element={<PageGuard pageId={PERMISSION_PAGE_IDS.exploration_types}><ExplorationTypesPage /></PageGuard>} />
        </Route>

        <Route
          path="/teacher"
          element={
            <ProtectedRoute user={user}>
              <RolePortalGuard portal="teacher">
                <TeacherLayout user={user} />
              </RolePortalGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboardPage user={user} />} />
          <Route path="students" element={<TeacherStudentsPage user={user} />} />
          <Route path="students/:id" element={<TeacherStudentDetailPage user={user} />} />
          <Route path="daily-log" element={<TeacherDailyLogPage user={user} />} />
          <Route path="weekly-report" element={<TeacherWeeklyReportPage user={user} />} />
          <Route
            path="notifications"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.notifications}>
                <NotificationsPage user={user} />
              </PageGuard>
            }
          />
          <Route
            path="settings"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.settings}>
                <SettingsPage />
              </PageGuard>
            }
          />
          <Route
            path="reports/:id"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.reports}>
                <ReportDetailsPage viewerUser={user} />
              </PageGuard>
            }
          />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute user={user}>
              <RolePortalGuard portal="student">
                <StudentLayout user={user} />
              </RolePortalGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboardPage user={user} />} />
          <Route path="results" element={<StudentResultsPage user={user} />} />
          <Route path="profile" element={<StudentProfilePage user={user} />} />
          <Route
            path="notifications"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.notifications}>
                <NotificationsPage user={user} />
              </PageGuard>
            }
          />
          <Route
            path="settings"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.settings}>
                <SettingsPage />
              </PageGuard>
            }
          />
        </Route>

        <Route
          path="/supervisor"
          element={
            <ProtectedRoute user={user}>
              <RolePortalGuard portal="supervisor">
                <SupervisorLayout user={user} />
              </RolePortalGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<SupervisorDashboardPage user={user} />} />
          <Route path="visit" element={<SupervisorVisitPage user={user} />} />
          <Route path="history" element={<SupervisorHistoryPage user={user} />} />
          <Route
            path="notifications"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.notifications}>
                <NotificationsPage user={user} />
              </PageGuard>
            }
          />
          <Route
            path="settings"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.settings}>
                <SettingsPage />
              </PageGuard>
            }
          />
          <Route
            path="reports/:id"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.reports}>
                <ReportDetailsPage viewerUser={user} />
              </PageGuard>
            }
          />
          <Route
            path="users/:id"
            element={
              <PageGuard pageId={PERMISSION_PAGE_IDS.users}>
                <UserDetailsPage viewerUser={user} />
              </PageGuard>
            }
          />
        </Route>

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
      </Suspense>
      </NotificationsBadgeProvider>
    </BrowserRouter>
    </PermissionsProvider>
    </I18nDirectionSync>
    </SiteContentProvider>
  );
}

export default App;

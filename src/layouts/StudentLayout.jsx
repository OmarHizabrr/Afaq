import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  User,
  LogOut,
  Bell,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import AuthService from '../services/authService';
import UserMenuDropdown from '../components/UserMenuDropdown';
import BottomTabBar from '../components/BottomTabBar';
import InstallAppBanner from '../components/InstallAppBanner';
import PushNotificationBanner from '../components/PushNotificationBanner';
import ScrollToTop from '../components/ScrollToTop';
import { getPortalMobileTabs } from '../utils/mobileNavTabs';
import useMediaQuery, { MOBILE_QUERY } from '../hooks/useMediaQuery';
import LanguageMenuButton from '../components/LanguageMenuButton';
import useAppTranslation from '../hooks/useAppTranslation';


function getStudentMenuItems(t) {
  return [
    { icon: Home, label: t('config.appNavItems.الرئيسية', 'الرئيسية'), shortName: t('config.appNavItems.الرئيسية', 'الرئيسية'), path: '/student', end: true },
    { icon: Award, label: t('layouts.StudentLayout.نتائجي', 'نتائجي'), shortName: t('layouts.StudentLayout.نتائجي', 'نتائجي'), path: '/student/results' },
    { icon: Bell, label: t('config.appNavItems.الإشعارات', 'الإشعارات'), shortName: t('config.appNavItems.الإشعارات', 'الإشعارات'), path: '/student/notifications' },
    { icon: User, label: t('layouts.StudentLayout.ملفي', 'ملفي'), shortName: t('layouts.StudentLayout.ملفي', 'ملفي'), path: '/student/profile' },
    { icon: Settings, label: t('config.appNavItems.الإعدادات', 'الإعدادات'), shortName: t('config.appNavItems.الإعدادات', 'الإعدادات'), path: '/student/settings' },
  ];
}

const StudentLayout = ({ user }) => {
  const { t } = useAppTranslation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('afaq-sidebar-collapsed') === 'true'
  );
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && (localStorage.getItem('afaq-theme') || 'light') === 'dark'
  );
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  }, [isDarkMode]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, isSidebarOpen]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem('afaq-theme', nextDark ? 'dark' : 'light');
    if (nextDark) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  };

  const toggleSidebarCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('afaq-sidebar-collapsed', newState);
  };

  const handleLogout = async () => {
    try {
      await AuthService.Api.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = useMemo(() => getStudentMenuItems(t), [t]);
  const mobileTabs = useMemo(() => getPortalMobileTabs(menuItems, 'student'), [menuItems]);

  const closeSidebar = () => {
    if (window.innerWidth <= 1024) setSidebarOpen(false);
  };

  const openSidebar = () => setSidebarOpen(true);

  return (
    <div
      className={`admin-layout ${isSidebarOpen ? 'mobile-open' : ''} ${isMobile ? 'admin-layout--mobile-nav' : ''}`}
    >
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header sidebar-header--student">
          {!isCollapsed && (
            <div className="sidebar-header__profile">
              <div className="sidebar-student-avatar">
                <img
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Student')}&background=1a73e8&color=fff`}
                  alt=""
                  className="sidebar-student-avatar__img"
                />
              </div>
              <h3 className="sidebar-brand-title sidebar-brand-title--student">{user?.displayName?.split(/\s+/)[0] || t('components.MessengerPanel.طالب', 'طالب')}</h3>
            </div>
          )}

          <button
            className="desktop-collapse-btn"
            onClick={toggleSidebarCollapse}
            title={isCollapsed ? t('layouts.AdminLayout.توسيع_القائمة', 'توسيع القائمة') : t('layouts.AdminLayout.طي_القائمة', 'طي القائمة')}
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav sidebar-nav--spaced">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-link nav-link--danger" onClick={handleLogout}>
            <LogOut size={20} />
            <span>{t('layouts.AdminLayout.تسجيل_الخروج', 'تسجيل الخروج')}</span>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar__lead">
            {isMobile ? (
              <div className="topbar__brand">
                <span className="topbar__brand-title">
                  {t('context.siteContentContext.آفاق', 'آفاق')} <span className="student-topbar-title__accent">{t('layouts.StudentLayout.التعليمية', 'التعليمية')}</span>
                </span>
              </div>
            ) : (
              <h2 className="student-topbar-title">
                {t('context.siteContentContext.آفاق', 'آفاق')} <span className="student-topbar-title__accent">{t('layouts.StudentLayout.التعليمية', 'التعليمية')}</span>
              </h2>
            )}
          </div>

          <div className="topbar__actions topbar__actions--tight">
            <LanguageMenuButton />
            <button type="button" className="icon-btn" onClick={toggleTheme} title={isDarkMode ? t('layouts.AdminLayout.الوضع_النهاري', 'الوضع النهاري') : t('layouts.AdminLayout.الوضع_الليلي', 'الوضع الليلي')}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <UserMenuDropdown user={user} tagline={t('layouts.StudentLayout.طالب_نشط', 'طالب نشط')} />
          </div>
        </header>

        <main className="page-content">
          <ScrollToTop />
          <Outlet />
        </main>

        <InstallAppBanner />
        <PushNotificationBanner user={user} />
        {isMobile ? <BottomTabBar tabs={mobileTabs} onMoreClick={openSidebar} /> : null}
      </div>
    </div>
  );
};

export default StudentLayout;

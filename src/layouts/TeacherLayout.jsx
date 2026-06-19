import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  FileText,
  LogOut,
  Bell,
  Settings,
  Sun,
  Moon,
  X,
  ChevronRight,
  ChevronLeft,
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


function getTeacherNavItems(t) {
  return [
    { name: t('config.appNavItems.الرئيسية', 'الرئيسية'), shortName: t('config.appNavItems.الرئيسية', 'الرئيسية'), icon: Home, path: '/teacher', end: true },
    { name: t('layouts.TeacherLayout.طلابي', 'طلابي'), shortName: t('layouts.TeacherLayout.طلابي', 'طلابي'), icon: Users, path: '/teacher/students' },
    { name: t('layouts.TeacherLayout.التحضير_اليومي', 'التحضير اليومي'), shortName: t('config.appNavItems.التحضير', 'التحضير'), icon: Calendar, path: '/teacher/daily-log' },
    { name: t('layouts.TeacherLayout.التقرير_الأسبوعي', 'التقرير الأسبوعي'), shortName: t('layouts.TeacherLayout.الأسبوعي', 'الأسبوعي'), icon: FileText, path: '/teacher/weekly-report' },
    { name: t('config.appNavItems.الإشعارات', 'الإشعارات'), shortName: t('config.appNavItems.الإشعارات', 'الإشعارات'), icon: Bell, path: '/teacher/notifications' },
    { name: t('config.appNavItems.الإعدادات', 'الإعدادات'), shortName: t('config.appNavItems.الإعدادات', 'الإعدادات'), icon: Settings, path: '/teacher/settings' },
  ];
}

const TeacherLayout = ({ user }) => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && (localStorage.getItem('afaq-theme') || 'light') === 'dark'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('afaq-sidebar-collapsed') === 'true'
  );
  const isMobile = useMediaQuery(MOBILE_QUERY);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  }, [isDarkMode]);

  useEffect(() => {
    if (!isMobile) setIsSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, isSidebarOpen]);

  const toggleSidebarCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('afaq-sidebar-collapsed', newState);
  };

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    localStorage.setItem('afaq-theme', newIsDark ? 'dark' : 'light');

    if (newIsDark) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  };

  const handleLogout = async () => {
    await AuthService.Api.signOut();
    navigate('/');
  };

  const navItems = useMemo(() => getTeacherNavItems(t), [t]);
  const mobileTabs = useMemo(() => getPortalMobileTabs(navItems, 'teacher'), [navItems]);

  const closeSidebar = () => {
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const openSidebar = () => setIsSidebarOpen(true);

  return (
    <div
      className={`admin-layout ${isSidebarOpen ? 'mobile-open' : ''} ${isMobile ? 'admin-layout--mobile-nav' : ''}`}
    >
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden />
      )}

      <aside className={`sidebar sidebar--teacher ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div>
            <h2 className="logo-text logo-text--teacher">{t('layouts.TeacherLayout.بوابة_المعلم', 'بوابة المعلم')}</h2>
            <p className="sidebar-header__subtitle">{t('layouts.TeacherLayout.آفاق_القرآنية', 'آفاق القرآنية')}</p>
          </div>

          <button
            className="desktop-collapse-btn"
            onClick={toggleSidebarCollapse}
            title={isCollapsed ? t('layouts.AdminLayout.توسيع_القائمة', 'توسيع القائمة') : t('layouts.AdminLayout.طي_القائمة', 'طي القائمة')}
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-link" onClick={handleLogout} title={t('layouts.AdminLayout.تسجيل_الخروج', 'تسجيل الخروج')}>
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
                <span className="topbar__brand-title">{t('layouts.TeacherLayout.بوابة_المعلم', 'بوابة المعلم')}</span>
              </div>
            ) : null}
          </div>

          <div className="topbar__actions">
            <LanguageMenuButton />
            <button className="icon-btn" onClick={toggleTheme} title={isDarkMode ? t('layouts.AdminLayout.الوضع_النهاري', 'الوضع النهاري') : t('layouts.AdminLayout.الوضع_الليلي', 'الوضع الليلي')}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <UserMenuDropdown
              user={user}
              accentTone="success"
              tagline={t('layouts.TeacherLayout.بوابة_المعلم', 'بوابة المعلم')}
            />
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

export default TeacherLayout;

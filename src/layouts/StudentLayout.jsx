import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  User, 
  LogOut, 
  Menu, 
  Bell,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import AuthService from '../services/authService';
import UserMenuDropdown from '../components/UserMenuDropdown';
import PwaInstallBanner from '../components/PwaInstallBanner';

const StudentLayout = ({ user }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('afaq-sidebar-collapsed') === 'true'
  );
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && (localStorage.getItem('afaq-theme') || 'light') === 'dark'
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  }, [isDarkMode]);

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

  const menuItems = [
    { icon: Home, label: 'الرئيسية', path: '/student' },
    { icon: Award, label: 'نتائجي واختباراتي', path: '/student/results' },
    { icon: Bell, label: 'الإشعارات والتنبيهات', path: '/student/notifications' },
    { icon: User, label: 'ملفي الشخصي', path: '/student/profile' },
    { icon: Settings, label: 'الإعدادات', path: '/student/settings' },
  ];

  const closeSidebar = () => {
    if (window.innerWidth <= 1024) setSidebarOpen(false);
  };

  return (
    <div className={`admin-layout ${isSidebarOpen ? 'mobile-open' : ''}`} dir="rtl">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ padding: '1rem 12px 1.25rem', textAlign: 'center', flexWrap: 'wrap' }}>
          {!isCollapsed && (
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-muted)', 
                margin: '0 auto 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--md-primary)',
                overflow: 'hidden'
              }}>
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Student')}&background=1a73e8&color=fff`} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <h3 className="sidebar-brand-title" style={{ fontSize: '1rem' }}>{user?.displayName?.split(/\s+/)[0] || 'طالب'}</h3>
            </div>
          )}

          <button 
             className="desktop-collapse-btn" 
             onClick={toggleSidebarCollapse}
             title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
           >
             {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
           </button>
        </div>

        <nav className="sidebar-nav" style={{ padding: '1.5rem 1rem', gap: '8px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="nav-link" onClick={handleLogout} style={{ color: 'var(--danger-color)', cursor: 'pointer' }}>
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>آفاق <span style={{ color: 'var(--accent-color)' }}>التعليمية</span></h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="button" className="icon-btn" onClick={toggleTheme} title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <UserMenuDropdown user={user} tagline="طالب نشط" />
          </div>
        </header>

        <PwaInstallBanner />

        {/* Dynamic Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;

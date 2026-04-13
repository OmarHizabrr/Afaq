import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
  Menu,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import AuthService from '../services/authService';
import UserMenuDropdown from '../components/UserMenuDropdown';

const TeacherLayout = ({ user }) => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && (localStorage.getItem('afaq-theme') || 'light') === 'dark'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('afaq-sidebar-collapsed') === 'true'
  );

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  }, [isDarkMode]);

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

  const navItems = [
    { name: 'الرئيسية', icon: Home, path: '/teacher' },
    { name: 'طلابي', icon: Users, path: '/teacher/students' },
    { name: 'التحضير اليومي', icon: Calendar, path: '/teacher/daily-log' },
    { name: 'التقرير الأسبوعي', icon: FileText, path: '/teacher/weekly-report' },
    { name: 'الإشعارات', icon: Bell, path: '/teacher/notifications' },
    { name: 'الإعدادات', icon: Settings, path: '/teacher/settings' },
  ];

  const closeSidebar = () => {
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  return (
    <div className={`admin-layout ${isSidebarOpen ? 'mobile-open' : ''}`} dir="rtl">
      {isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 4, background: 'rgba(0,0,0,0.5)' }} 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Colored explicitly for Teacher distinction */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{ borderRight: '4px solid var(--success-color)' }}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="logo-text" style={{ fontSize: '1.8rem', margin: 0, color: 'var(--success-color)', animation: 'none', transform: 'none', opacity: 1 }}>بوابة المعلم</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>آفاق القرآنية</p>
          </div>
          
          <button 
             className="desktop-collapse-btn" 
             onClick={toggleSidebarCollapse}
             title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
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
              end={item.path === '/teacher'} // strictly match main path so 'active' class is clean
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="nav-link" onClick={handleLogout} title="تسجيل الخروج">
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="icon-btn" onClick={toggleTheme} title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <UserMenuDropdown
              user={user}
              accentColor="var(--success-color)"
              tagline="بوابة المعلم"
            />
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;

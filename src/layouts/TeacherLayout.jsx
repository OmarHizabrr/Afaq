import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import AuthService from '../services/authService';

const TeacherLayout = ({ user }) => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('afaq-theme') || 'dark';
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    
    if (isDark) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');
  }, []);

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
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ borderRight: '4px solid var(--success-color)' }}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="logo-text" style={{ fontSize: '1.8rem', margin: 0, color: 'var(--success-color)' }}>بوابة المعلم</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>آفاق القرآنية</p>
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
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

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="nav-link" onClick={handleLogout}>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.displayName || 'المعلم'}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--success-color)' }}>بوابة المعلم</p>
              </div>
              <img 
                src={user?.photoURL || 'https://ui-avatars.com/api/?name=Teacher&background=10b981&color=fff'} 
                alt="Profile" 
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--success-color)' }}
              />
            </div>
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

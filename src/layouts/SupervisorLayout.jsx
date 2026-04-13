import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  MapPin, 
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

const SupervisorLayout = ({ user }) => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && (localStorage.getItem('afaq-theme') || 'light') === 'dark'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize theme and sidebar state
  useEffect(() => {
    const savedTheme = localStorage.getItem('afaq-theme') || 'light';
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    
    if (isDark) document.documentElement.classList.remove('light-mode');
    else document.documentElement.classList.add('light-mode');

    // Sidebar state
    const savedSidebar = localStorage.getItem('afaq-sidebar-collapsed') === 'true';
    setIsCollapsed(savedSidebar);
  }, []);

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
    { name: 'الرئيسية (الإحصائيات)', icon: Home, path: '/supervisor' },
    { name: 'تسجيل زيارة ميدانية', icon: MapPin, path: '/supervisor/visit' },
    { name: 'سجل الزيارات', icon: FileText, path: '/supervisor/history' },
    { name: 'الإشعارات', icon: Bell, path: '/supervisor/notifications' },
    { name: 'الإعدادات', icon: Settings, path: '/supervisor/settings' },
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

      {/* Sidebar - Colored explicitly for Supervisor distinction (Blue) */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{ borderInlineStart: '3px solid var(--md-primary)' }}>
        <div className="sidebar-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="sidebar-brand-title" style={{ fontSize: '1.15rem', lineHeight: 1.35 }}>بوابة المشرف الميداني</h2>
            <p className="sidebar-brand-sub">آفاق القرآنية</p>
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
              end={item.path === '/supervisor'} 
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
            
            <div className="user-chip">
              <div className="user-chip__meta">
                <p className="user-chip__name">{user?.displayName || 'المشرف'}</p>
                <p className="user-chip__role" style={{ color: 'var(--md-primary)' }}>{user?.role === 'supervisor_arab' ? 'مشرف عام' : 'مشرف منطقة'}</p>
              </div>
              <img 
                className="user-chip__avatar"
                src={user?.photoURL || 'https://ui-avatars.com/api/?name=Sup&background=1a73e8&color=fff'} 
                alt="" 
                style={{ borderColor: 'var(--md-primary)' }}
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

export default SupervisorLayout;

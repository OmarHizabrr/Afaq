import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  MapPin, 
  Home, 
  School, 
  Users, 
  Settings, 
  BookOpen,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  GraduationCap
} from 'lucide-react';
import AuthService from '../services/authService';
import UserMenuDropdown from '../components/UserMenuDropdown';

const AdminLayout = ({ user }) => {
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
    
    if (newIsDark) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  };

  const handleLogout = async () => {
    await AuthService.Api.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'الرئيسية', icon: LayoutDashboard, path: '/' },
    { name: 'المحافظات', icon: Map, path: '/governorates' },
    { name: 'المناطق', icon: MapPin, path: '/regions' },
    { name: 'القرى', icon: Home, path: '/villages' },
    { name: 'المدارس', icon: School, path: '/schools' },
    {name: 'المنَاهِج', icon: BookOpen, path: '/curriculum' },
    {name: 'التقارير', icon: ClipboardList, path: '/reports' },
    {name: 'المستخدمين', icon: Users, path: '/users' },
    {name: 'إدارة الطلاب', icon: GraduationCap, path: '/students-management' },
    {name: 'الإشعارات', icon: Bell, path: '/notifications' },
    {name: 'الإعدادات', icon: Settings, path: '/settings' },
  ];

  const closeSidebar = () => {
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  return (
    <div className={`admin-layout ${isSidebarOpen ? 'mobile-open' : ''}`} dir="rtl">
      {/* Background Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 4, background: 'rgba(0,0,0,0.5)' }} 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="logo-text" style={{ fontSize: '2rem', margin: 0, animation: 'none', transform: 'none', opacity: 1 }}>آفاق</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>لوحة تحكم الإدارة</p>
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

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            {/* Page title could go here */}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="icon-btn" onClick={toggleTheme} title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <UserMenuDropdown user={user} tagline={user?.email || ''} />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

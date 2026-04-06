import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  Award
} from 'lucide-react';
import AuthService from '../services/authService';

const StudentLayout = ({ user }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
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

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
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
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-glow)', 
            margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--accent-color)',
            overflow: 'hidden'
          }}>
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user?.displayName}</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>بوابة الطالب الذكية</p>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/student/notifications" style={{ position: 'relative', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <Bell size={22} />
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: '16px', height: '16px', background: 'var(--danger-color)', borderRadius: '50%', fontSize: '0.6rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--panel-color)' }}>3</span>
            </Link>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{user?.displayName}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>طالب نشط</p>
              </div>
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`} 
                alt="Profile" 
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--accent-color)' }}
              />
            </div>
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

export default StudentLayout;

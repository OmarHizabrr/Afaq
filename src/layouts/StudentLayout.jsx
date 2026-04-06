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
    { icon: User, label: 'ملفي الشخصي', path: '/student/profile' },
  ];

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'block' }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: '280px',
        background: 'var(--panel-color)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        right: isSidebarOpen ? 0 : '-280px',
        transition: 'right 0.3s ease',
        zIndex: 1001,
        boxShadow: 'var(--shadow)'
      }} className="desktop-sidebar">
        <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-glow)', 
            margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--accent-color)'
          }}>
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user?.displayName}</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>بوابة الطالب الذكية</p>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  marginBottom: '8px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              color: 'var(--danger-color)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, marginRight: '280px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="main-content">
        {/* Top Header */}
        <header style={{
          height: '70px',
          background: 'var(--panel-color)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 99
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-toggle" onClick={toggleSidebar} style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)' }}>
              <Menu size={24} />
            </button>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>آفاق <span style={{ color: 'var(--accent-color)' }}>التعليمية</span></h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ position: 'relative', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: -2, right: -2, width: '8px', height: '8px', background: 'var(--danger-color)', borderRadius: '50%' }}></span>
            </button>
            <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{user?.displayName}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                   <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)' }}></span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>طالب نشط</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </div>
      </main>

      {/* Global CSS for Mobile Responsiveness */}
      <style>{`
        @media (max-width: 1024px) {
          .desktop-sidebar { right: -280px !important; }
          .main-content { margin-right: 0 !important; }
          .mobile-menu-toggle { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default StudentLayout;

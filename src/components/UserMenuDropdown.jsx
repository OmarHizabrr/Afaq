import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import AuthService from '../services/authService';
import { useNotificationBadge } from '../context/NotificationsBadgeContext';

function resolvePaths(user) {
  const uid = user?.uid || user?.id;
  const profilePath =
    uid && user?.role === 'student' ? `/students/${uid}` : uid ? `/users/${uid}` : '/settings';
  return {
    notifications: '/notifications',
    settings: '/settings',
    profile: profilePath,
  };
}

const UserMenuDropdown = ({ user, accentColor, tagline }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const paths = resolvePaths(user);
  const { unreadCount, requestBrowserPermission } = useNotificationBadge();

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await AuthService.Api.signOut();
    navigate('/login');
  };

  return (
    <div className="user-menu-dropdown" ref={wrapRef}>
      <button
        type="button"
        className="user-menu-dropdown__trigger user-chip"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="user-chip__meta">
          <p className="user-chip__name">{user?.displayName || 'حسابي'}</p>
          <p className="user-chip__role">{tagline || user?.email || ''}</p>
        </div>
        <img
          className="user-chip__avatar"
          src={
            user?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=1a73e8&color=fff`
          }
          alt=""
          style={{ borderColor: accentColor || 'var(--border-color)' }}
        />
        <ChevronDown size={18} className={`user-menu-dropdown__chev ${open ? 'user-menu-dropdown__chev--open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu-dropdown__panel" role="menu">
          <Link
            role="menuitem"
            to={paths.profile}
            className="user-menu-dropdown__item"
            onClick={() => setOpen(false)}
          >
            <User size={18} />
            <span>الملف الشخصي</span>
          </Link>
          <Link
            role="menuitem"
            to={paths.notifications}
            className="user-menu-dropdown__item"
            onClick={() => setOpen(false)}
          >
            <span className="user-menu-dropdown__icon-wrap">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="user-menu-dropdown__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </span>
            <span>الإشعارات والمحادثات</span>
          </Link>
          <Link
            role="menuitem"
            to={paths.settings}
            className="user-menu-dropdown__item"
            onClick={() => setOpen(false)}
          >
            <Settings size={18} />
            <span>الإعدادات</span>
          </Link>
          {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
            <button
              type="button"
              role="menuitem"
              className="user-menu-dropdown__item user-menu-dropdown__item--muted"
              onClick={() => requestBrowserPermission()}
            >
              <Volume2 size={18} />
              <span>تفعيل تنبيهات المتصفح</span>
            </button>
          )}
          <div className="user-menu-dropdown__sep" />
          <button type="button" role="menuitem" className="user-menu-dropdown__item user-menu-dropdown__item--danger" onClick={handleLogout}>
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenuDropdown;

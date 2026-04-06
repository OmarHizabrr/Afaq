import React, { useState, useEffect } from 'react';
import { Settings, Save, User, Moon, Sun, Monitor } from 'lucide-react';
import AuthService from '../../services/authService';

const SettingsPage = () => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Load current UI state
    const currentTheme = localStorage.getItem('afaq-theme') || 'dark';
    setTheme(currentTheme);
    
    // Load current User
    const currentUser = AuthService.Api.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('afaq-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    
    // Fake profile save for now (we could update DisplayName in Firebase auth)
    setTimeout(() => {
      setSuccess('تم تحديث إعدادات الملف الشخصي بنجاح!');
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
        <Settings size={28} color="var(--accent-color)" />
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>إعدادات النظام والملف الشخصي</h1>
      </div>

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> {success}
        </div>
      )}

      {/* Theme Settings */}
      <div style={{ background: 'var(--panel-color)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', boxShadow: 'var(--shadow)' }}>
        <h2 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={20} color="var(--text-secondary)" /> المظهر المفضل
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => handleThemeChange('dark')}
            style={{ flex: 1, padding: '1.5rem', background: theme === 'dark' ? 'var(--accent-glow)' : 'var(--bg-color)', border: `1px solid ${theme === 'dark' ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', transition: 'all 0.2s' }}
          >
            <Moon size={32} color={theme === 'dark' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
            <span style={{ fontWeight: 600 }}>الوضع الليلي (الأساسي)</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange('light')}
            style={{ flex: 1, padding: '1.5rem', background: theme === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-color)', border: `1px solid ${theme === 'light' ? '#f59e0b' : 'var(--border-color)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', transition: 'all 0.2s' }}
          >
            <Sun size={32} color={theme === 'light' ? '#f59e0b' : 'var(--text-secondary)'} />
            <span style={{ fontWeight: 600 }}>الوضع النهاري</span>
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <form onSubmit={handleSaveProfile} style={{ background: 'var(--panel-color)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
        <h2 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--text-secondary)" /> الحساب الشخصي
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الاسم الكامل</label>
            <input 
              type="text" 
              defaultValue={user?.displayName || ''}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>البريد الإلكتروني (للقراءة فقط)</label>
            <input 
              type="text" 
              readOnly
              value={user?.email || ''}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-secondary)', opacity: 0.7 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--accent-color)', color: '#fff', padding: '12px 32px' }}>
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;

import React, { useState, useEffect } from 'react';
import { Settings, Save, User, Moon, Sun, Monitor, Phone, KeyRound } from 'lucide-react';
import AuthService from '../../services/authService';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const SettingsPage = () => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load current UI state
    const currentTheme = localStorage.getItem('afaq-theme') || 'light';
    setTheme(currentTheme);
    
    // Listen to Firebase Auth state
    AuthService.Api.onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch full profile from Firestore
        const api = FirestoreApi.Api;
        const userData = await api.getData(api.getUserDoc(firebaseUser.uid));
        
        setUser(userData || firebaseUser);
        setDisplayName(userData?.displayName || firebaseUser.displayName || '');
        setPhoneNumber(userData?.phoneNumber || '');
        setPassword(userData?.password || '');
      }
    });
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
    if (!user || (!displayName.trim() && !phoneNumber.trim())) return;

    try {
      setLoading(true);
      setSuccess('');
      setError('');
      
      const api = FirestoreApi.Api;
      await api.updateData({
        docRef: api.getUserDoc(user.uid || user.id),
        data: {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          password: password.trim()
        }
      });

      setSuccess('تم تحديث إعدادات الملف الشخصي بنجاح!');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ الملف الشخصي.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <PageHeader icon={Settings} title="إعدادات النظام والملف الشخصي" />

      {success && (
        <div className="app-alert app-alert--success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> {success}
        </div>
      )}
      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Theme Settings */}
      <div className="surface-card surface-card--lg" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={20} color="var(--text-secondary)" /> المظهر المفضل
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => handleThemeChange('dark')}
            style={{ flex: 1, padding: '1.5rem', background: theme === 'dark' ? 'var(--accent-glow)' : 'var(--bg-color)', border: `1px solid ${theme === 'dark' ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', transition: 'all 0.2s' }}
          >
            <Moon size={32} color={theme === 'dark' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
            <span style={{ fontWeight: 600 }}>الوضع الليلي</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange('light')}
            style={{ flex: 1, padding: '1.5rem', background: theme === 'light' ? 'var(--accent-glow)' : 'var(--bg-color)', border: `1px solid ${theme === 'light' ? 'var(--md-primary)' : 'var(--border-color)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', transition: 'all 0.2s' }}
          >
            <Sun size={32} color={theme === 'light' ? 'var(--md-primary)' : 'var(--text-secondary)'} />
            <span style={{ fontWeight: 600 }}>الوضع النهاري (افتراضي)</span>
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <form onSubmit={handleSaveProfile} className="surface-card surface-card--lg" style={{ padding: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--text-secondary)" /> الحساب الشخصي
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الاسم الكامل (للعرض داخل المنصة)</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اكتب اسمك الكامل"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <Phone size={16} /> رقم هاتف التواصل (والدخول المخصص)
            </label>
            <input 
              type="tel" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="مثال: 77XXXXXXX"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <KeyRound size={16} /> كلمة المرور (للدخول المخصص)
            </label>
            <input 
              type="text" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="اختر كلمة مرور للدخول بها مع رقم الهاتف لاحقاً"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>البريد الإلكتروني الأساسي</label>
            <input 
              type="text" 
              readOnly
              value={user?.email || ''}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-secondary)', opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>مستوى الصلاحية الممنوح (للقراءة فقط)</label>
            <input 
              type="text" 
              readOnly
              value={user?.role || 'unassigned'}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 'bold', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} className="google-btn google-btn--filled google-btn--toolbar" style={{ padding: '12px 32px' }}>
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;

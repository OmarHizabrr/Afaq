import React, { useState, useEffect } from 'react';
import { Settings, Save, User, Moon, Sun, Monitor, Phone, KeyRound, Eye, EyeOff } from 'lucide-react';
import AuthService from '../../services/authService';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const SettingsPage = () => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
    <div className="settings-page">
      <PageHeader icon={Settings} title="إعدادات النظام والملف الشخصي" />

      {success && (
        <div className="app-alert app-alert--success settings-alert settings-alert--success">
          <Save size={18} /> {success}
        </div>
      )}
      {error && <div className="app-alert app-alert--error settings-alert">{error}</div>}

      {/* Theme Settings */}
      <div className="surface-card surface-card--lg settings-theme-card">
        <h2 className="settings-theme-card__title">
          <Monitor size={20} color="var(--text-secondary)" /> المظهر المفضل
        </h2>
        
        <div className="settings-theme-card__options">
          <button 
            onClick={() => handleThemeChange('dark')}
            className={`settings-theme-option ${theme === 'dark' ? 'settings-theme-option--active' : ''}`}
          >
            <Moon size={32} color={theme === 'dark' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
            <span className="settings-theme-option__label">الوضع الليلي</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange('light')}
            className={`settings-theme-option ${theme === 'light' ? 'settings-theme-option--active' : ''}`}
          >
            <Sun size={32} color={theme === 'light' ? 'var(--md-primary)' : 'var(--text-secondary)'} />
            <span className="settings-theme-option__label">الوضع النهاري (افتراضي)</span>
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <form onSubmit={handleSaveProfile} className="surface-card surface-card--lg settings-profile-form">
        <h2 className="settings-profile-form__title">
          <User size={20} color="var(--text-secondary)" /> الحساب الشخصي
        </h2>

        <div className="settings-profile-form__fields">
          <div className="app-field app-field--grow">
            <label className="app-label">الاسم الكامل (للعرض داخل المنصة)</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اكتب اسمك الكامل"
              className="app-input"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label settings-profile-form__label-with-icon">
               <Phone size={16} /> رقم هاتف التواصل (والدخول المخصص)
            </label>
            <input 
              type="tel" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="مثال: 77XXXXXXX"
              className="app-input"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label settings-profile-form__label-with-icon">
               <KeyRound size={16} /> كلمة المرور (للدخول المخصص)
            </label>
            <div className="md-field settings-profile-form__password-field">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اختر كلمة مرور للدخول بها مع رقم الهاتف لاحقاً"
              />
              <button
                type="button"
                className="icon-btn settings-profile-form__password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">البريد الإلكتروني الأساسي</label>
            <input 
              type="text" 
              readOnly
              value={user?.email || ''}
              className="app-input settings-profile-form__readonly"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">نوع الصلاحيات الممنوح (للقراءة فقط)</label>
            <input 
              type="text" 
              readOnly
              value={user?.permissionProfileId || 'لا يوجد نوع صلاحيات مخصص'}
              className="app-input settings-profile-form__permission-readonly"
            />
          </div>
        </div>

        <div className="settings-profile-form__actions">
          <button type="submit" disabled={loading} className="google-btn google-btn--filled google-btn--toolbar settings-profile-form__save-btn">
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;

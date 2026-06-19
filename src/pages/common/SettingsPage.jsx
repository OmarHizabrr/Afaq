import React, { useState, useEffect } from 'react';
import { Settings, Save, User, Moon, Sun, Monitor, Phone, KeyRound, Eye, EyeOff } from 'lucide-react';
import AuthService from '../../services/authService';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import InstallAppSection from '../../components/InstallAppSection';
import PushNotificationSection from '../../components/PushNotificationSection';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import useAppTranslation from '../../hooks/useAppTranslation';

const SettingsPage = () => {
  const { t } = useAppTranslation();
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

      setSuccess(t('pages.SettingsPage.تم_تحديث_إعدادات_الملف_الشخصي_بنجاح', 'تم تحديث إعدادات الملف الشخصي بنجاح!'));
    } catch (err) {
      console.error(err);
      setError(t('pages.SettingsPage.حدث_خطأ_أثناء_حفظ_الملف_الشخصي', 'حدث خطأ أثناء حفظ الملف الشخصي.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page settings-page--has-mobile-save">
      <PageHeader icon={Settings} title={t('pages.SettingsPage.إعدادات_النظام_والملف_الشخصي', 'إعدادات النظام والملف الشخصي')} />

      {success && (
        <div className="app-alert app-alert--success settings-alert settings-alert--success">
          <Save size={18} /> {success}
        </div>
      )}
      {error && <div className="app-alert app-alert--error settings-alert">{error}</div>}

      <InstallAppSection />
      <PushNotificationSection user={user} />
      <LanguageSwitcher />

      {/* Theme Settings */}
      <div className="surface-card surface-card--lg settings-theme-card">
        <h2 className="settings-theme-card__title">
          <Monitor size={20} color="var(--text-secondary)" /> {t('pages.SettingsPage.المظهر_المفضل', 'المظهر المفضل')}
        </h2>
        
        <div className="settings-theme-card__options">
          <button 
            onClick={() => handleThemeChange('dark')}
            className={`settings-theme-option ${theme === 'dark' ? 'settings-theme-option--active' : ''}`}
          >
            <Moon size={32} color={theme === 'dark' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
            <span className="settings-theme-option__label">{t('layouts.AdminLayout.الوضع_الليلي', 'الوضع الليلي')}</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange('light')}
            className={`settings-theme-option ${theme === 'light' ? 'settings-theme-option--active' : ''}`}
          >
            <Sun size={32} color={theme === 'light' ? 'var(--md-primary)' : 'var(--text-secondary)'} />
            <span className="settings-theme-option__label">{t('pages.SettingsPage.الوضع_النهاري_افتراضي', 'الوضع النهاري (افتراضي)')}</span>
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <form onSubmit={handleSaveProfile} className="surface-card surface-card--lg settings-profile-form">
        <h2 className="settings-profile-form__title">
          <User size={20} color="var(--text-secondary)" /> {t('pages.SettingsPage.الحساب_الشخصي', 'الحساب الشخصي')}
        </h2>

        <div className="settings-profile-form__fields">
          <div className="app-field app-field--grow">
            <label className="app-label">{t('pages.SettingsPage.الاسم_الكامل_للعرض_داخل_المنصة', 'الاسم الكامل (للعرض داخل المنصة)')}</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('pages.SettingsPage.اكتب_اسمك_الكامل', 'اكتب اسمك الكامل')}
              className="app-input"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label settings-profile-form__label-with-icon">
               <Phone size={16} /> {t('pages.SettingsPage.رقم_هاتف_التواصل_والدخول_المخصص', 'رقم هاتف التواصل (والدخول المخصص)')}
            </label>
            <input 
              type="tel" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('pages.SettingsPage.مثال_77XXXXXXX', 'مثال: 77XXXXXXX')}
              className="app-input"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label settings-profile-form__label-with-icon">
               <KeyRound size={16} /> {t('pages.SettingsPage.كلمة_المرور_للدخول_المخصص', 'كلمة المرور (للدخول المخصص)')}
            </label>
            <div className="md-field settings-profile-form__password-field">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('pages.SettingsPage.اختر_كلمة_مرور_للدخول_بها_مع_رقم_الهاتف_لاحقاً', 'اختر كلمة مرور للدخول بها مع رقم الهاتف لاحقاً')}
              />
              <button
                type="button"
                className="icon-btn settings-profile-form__password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? t('pages.StudentManagementPage.إخفاء_كلمة_المرور', 'إخفاء كلمة المرور') : t('pages.StudentManagementPage.إظهار_كلمة_المرور', 'إظهار كلمة المرور')}
                aria-label={showPassword ? t('pages.StudentManagementPage.إخفاء_كلمة_المرور', 'إخفاء كلمة المرور') : t('pages.StudentManagementPage.إظهار_كلمة_المرور', 'إظهار كلمة المرور')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">{t('pages.SettingsPage.البريد_الإلكتروني_الأساسي', 'البريد الإلكتروني الأساسي')}</label>
            <input 
              type="text" 
              readOnly
              value={user?.email || ''}
              className="app-input settings-profile-form__readonly"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">{t('pages.SettingsPage.نوع_الصلاحيات_الممنوح_للقراءة_فقط', 'نوع الصلاحيات الممنوح (للقراءة فقط)')}</label>
            <input 
              type="text" 
              readOnly
              value={user?.permissionProfileId || t('pages.SettingsPage.لا_يوجد_نوع_صلاحيات_مخصص', 'لا يوجد نوع صلاحيات مخصص')}
              className="app-input settings-profile-form__permission-readonly"
            />
          </div>
        </div>

        <div className="settings-profile-form__actions settings-profile-form__actions--desktop">
          <BusyButton
            type="submit"
            busy={loading}
            className="google-btn google-btn--filled google-btn--toolbar settings-profile-form__save-btn settings-profile-form__save-btn--desktop"
          >
            {t('pages.SchoolReportPage.حفظ_التعديلات', 'حفظ التعديلات')}
          </BusyButton>
        </div>
      </form>

      <div className="admin-settings-mobile-save-bar">
        <BusyButton
          type="button"
          busy={loading}
          className="google-btn google-btn--filled admin-settings-mobile-save-bar__btn"
          onClick={(e) => {
            const form = e.currentTarget.closest('.settings-page')?.querySelector('.settings-profile-form');
            form?.requestSubmit();
          }}
        >
          {t('pages.SchoolReportPage.حفظ_التعديلات', 'حفظ التعديلات')}
        </BusyButton>
      </div>
    </div>
  );
};

export default SettingsPage;

import React, { useState, useEffect } from 'react';
import AuthService, { ACCOUNT_BLOCKED_SESSION_KEY, ACCOUNT_BLOCKED_MESSAGE } from '../services/authService';
import { Phone, Lock, LogIn, Eye, EyeOff, Download, Share } from 'lucide-react';
import BusyButton from '../components/BusyButton';
import useInstallPrompt from '../hooks/useInstallPrompt';
import LanguageMenuButton from '../components/LanguageMenuButton';
import useAppTranslation from '../hooks/useAppTranslation';


const GoogleIcon = () => (
  <svg className="google-icon" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

const LoginPage = () => {
  const { t } = useAppTranslation();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [error, setError] = useState(null);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { canPrompt, iosHint, hasNativePrompt, promptInstall, installed } = useInstallPrompt();

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem(ACCOUNT_BLOCKED_SESSION_KEY);
      if (msg) {
        setError(msg);
        sessionStorage.removeItem(ACCOUNT_BLOCKED_SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      await AuthService.Api.signInWithGoogle();
    } catch (err) {
      if (err?.message === 'ACCOUNT_DISABLED') {
        setError(ACCOUNT_BLOCKED_MESSAGE);
      } else {
        setError(t('pages.LoginPage.فشل_تسجيل_الدخول_يرجى_المحاولة_مرة_أخرى', 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.'));
      }
      console.error(err);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setError(t('pages.LoginPage.يرجى_إدخال_رقم_الهاتف_وكلمة_المرور', 'يرجى إدخال رقم الهاتف وكلمة المرور'));
      return;
    }
    
    try {
      setLoadingCustom(true);
      setError(null);
      await AuthService.Api.signInWithPhone(phone, password);
    } catch (err) {
      if (err?.message === 'ACCOUNT_DISABLED') {
        setError(ACCOUNT_BLOCKED_MESSAGE);
      } else {
        setError(t('pages.LoginPage.رقم_الهاتف_أو_كلمة_المرور_غير_صحيحة', 'رقم الهاتف أو كلمة المرور غير صحيحة'));
      }
    } finally {
      setLoadingCustom(false);
    }
  };

  return (
    <main className="welcome-container">
      <LanguageMenuButton className="login-language-menu" />
      <div className="glow-orb"></div>
      
      <div className="login-card">
        <header className="login-card__header">
          <h1 className="logo-text">{t('context.siteContentContext.آفاق', 'آفاق')}</h1>
          <p className="tagline">{t('pages.LoginPage.منصة_تعليمية_نفس_وضوح_وتجربة_أدوات_Google', 'منصة تعليمية — نفس وضوح وتجربة أدوات Google')}</p>
        </header>

        <section className="entry-dialog login-entry-dialog">
          {error && (
            <div className="app-alert app-alert--error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="login-form">
            <label className="login-form__label">{t('pages.SchoolReportPage.رقم_الهاتف', 'رقم الهاتف')}</label>
            <div className="login-form__field-wrap">
              <div className="md-field login-form__field">
                <Phone size={20} color="var(--text-secondary)" aria-hidden />
                <input 
                  type="tel" 
                  placeholder={t('pages.SchoolReportPage.رقم_الهاتف', 'رقم الهاتف')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                />
              </div>
            </div>
            
            <label className="login-form__label">{t('pages.LoginPage.كلمة_المرور', 'كلمة المرور')}</label>
            <div className="login-form__field-wrap">
              <div className="md-field login-form__field">
                <Lock size={20} color="var(--text-secondary)" aria-hidden />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder={t('pages.LoginPage.كلمة_المرور_المخصصة', 'كلمة المرور المخصصة')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="icon-btn login-form__password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? t('pages.StudentManagementPage.إخفاء_كلمة_المرور', 'إخفاء كلمة المرور') : t('pages.StudentManagementPage.إظهار_كلمة_المرور', 'إظهار كلمة المرور')}
                  aria-label={showPassword ? t('pages.StudentManagementPage.إخفاء_كلمة_المرور', 'إخفاء كلمة المرور') : t('pages.StudentManagementPage.إظهار_كلمة_المرور', 'إظهار كلمة المرور')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <BusyButton type="submit" className="google-btn google-btn--filled" busy={loadingCustom}>
              <span className="btn-inner">
                <LogIn size={20} />
                {t('pages.LoginPage.تسجيل_الدخول', 'تسجيل الدخول')}
              </span>
            </BusyButton>
          </form>

          <div className="md-divider-label">
            <hr />
            <span>{t('pages.LoginPage.أو_المتابعة_بحساب_Google', 'أو المتابعة بحساب Google')}</span>
            <hr />
          </div>

          <BusyButton type="button" className="google-btn" onClick={handleGoogleLogin} busy={loadingGoogle}>
            <span className="btn-inner">
              <GoogleIcon />
              <span>{t('pages.LoginPage.المتابعة_باستخدام_Google', 'المتابعة باستخدام Google')}</span>
            </span>
          </BusyButton>

          <p className="app-alert app-alert--info login-form__hint">
            {t('pages.LoginPage.يتم_تفعيل_الصلاحيات_فقط_بعد_تحديد_نوع_الصلاحيات_من_المدير', 'يتم تفعيل الصلاحيات فقط بعد تحديد نوع الصلاحيات من المدير.')}
          </p>

          {canPrompt && !installed ? (
            <div className="login-install-hint">
              {hasNativePrompt ? (
                <button type="button" className="login-install-hint__btn" onClick={promptInstall}>
                  <Download size={16} />
                  {t('pages.LoginPage.ثبّت_تطبيق_آفاق_على_جهازك', 'ثبّت تطبيق آفاق على جهازك')}
                </button>
              ) : iosHint ? (
                <p className="login-install-hint__text">
                  <Share size={14} aria-hidden />
                  {t('pages.LoginPage.للتثبيت_شارك_إضافة_إلى_الشاشة_الرئيسية', 'للتثبيت: شارك ← «إضافة إلى الشاشة الرئيسية»')}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <p className="login-card__legal">
          {t('pages.LoginPage.بالدخول_أنت_توافق_على_شروط_الاستخدام_وسياسة_الخصوصية_لمؤسسة_آفاق', 'بالدخول، أنت توافق على شروط الاستخدام وسياسة الخصوصية لمؤسسة آفاق.')}
        </p>
      </div>

      <footer className="login-page-footer">
        {t('pages.LoginPage.منصة_آفاق_التعليمية', 'منصة آفاق التعليمية')}
      </footer>
    </main>
  );
};

export default LoginPage;

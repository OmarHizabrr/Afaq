import React, { useState } from 'react';
import AuthService from '../services/authService';
import { Phone, Lock, LogIn } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="google-icon" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

const LoginPage = () => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [error, setError] = useState(null);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      await AuthService.Api.signInWithGoogle();
    } catch (err) {
      setError("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
      console.error(err);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }
    
    try {
      setLoadingCustom(true);
      setError(null);
      await AuthService.Api.signInWithPhone(phone, password);
    } catch (err) {
      setError('رقم الهاتف أو كلمة المرور غير صحيحة');
    } finally {
      setLoadingCustom(false);
    }
  };

  return (
    <main className="welcome-container" dir="rtl">
      <div className="glow-orb"></div>
      
      <div className="login-card">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="logo-text" style={{ fontSize: '3.5rem' }}>آفاق</h1>
          <p className="tagline" style={{ fontSize: '1.2rem', margin: 0 }}>نظام الإدارة المتكامل</p>
        </header>

        <section style={{ width: '100%' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', width: '100%', border: '1px solid var(--danger-color)', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCustomLogin} style={{ width: '100%', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0 12px' }}>
                <Phone size={20} color="var(--text-secondary)" />
                <input 
                  type="tel" 
                  placeholder="رقم الهاتف للإدارة والميدان"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '14px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0 12px' }}>
                <Lock size={20} color="var(--text-secondary)" />
                <input 
                  type="password" 
                  placeholder="كلمة المرور المخصصة"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '14px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="google-btn" 
              disabled={loadingCustom}
              style={{ marginTop: 0, background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none' }}
            >
              {loadingCustom ? <div className="loading-spinner"></div> : <><LogIn size={20} /> تسجيل الدخول</>}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '1.5rem 0', color: 'var(--text-secondary)' }}>
            <hr style={{ flex: 1, borderColor: 'var(--border-color)' }} />
            <span style={{ padding: '0 10px', fontSize: '0.85rem' }}>أو تسجيل الدخول عبر جوجل</span>
            <hr style={{ flex: 1, borderColor: 'var(--border-color)' }} />
          </div>

          <button 
            className="google-btn" 
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            style={{ marginTop: '0' }}
          >
            {loadingGoogle ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <GoogleIcon />
                <span>المتابعة باستخدام Google</span>
              </>
            )}
          </button>
        </section>

        <p style={{ marginTop: '2rem', color: '#6b7280', fontSize: '0.8rem', textAlign: 'center' }}>
          بالدخول إلى المنصة، أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بمؤسسة آفاق
        </p>
      </div>

      <footer style={{ position: 'absolute', bottom: '2rem', color: '#4b5563', fontSize: '0.8rem' }}>
        Afaq Platform Authentication Module
      </footer>
    </main>
  );
};

export default LoginPage;

import React, { useState, useEffect } from 'react';
import './index.css';
import LoginPage from './pages/LoginPage';
import AuthService from './services/authService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // مراقبة حالة تسجيل الدخول
    const unsubscribe = AuthService.Api.onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await AuthService.Api.signOut();
  };

  if (loading) {
    return (
      <main className="welcome-container">
        <div className="loading-spinner" style={{ width: '48px', height: '48px' }}></div>
      </main>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <main className="welcome-container" dir="rtl">
      <div className="glow-orb"></div>
      
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
          {user.photoURL && (
            <img src={user.photoURL} alt="User" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--accent-color)' }} />
          )}
          <h1 className="logo-text" style={{ fontSize: '3rem' }}>أهلاً بك، {user.displayName}</h1>
        </div>
        <p className="tagline">الأساس التقني للمنصة جاهز - تم التحقق من هويتك</p>
      </header>

      <section className="status-badge" style={{ cursor: 'pointer' }} onClick={handleLogout}>
        <span className="status-dot"></span>
        <p>تسجيل الخروج</p>
      </section>

      <footer style={{ position: 'absolute', bottom: '2rem', color: '#4b5563', fontSize: '0.8rem' }}>
        Afaq platform v0.1 | Logged in as: {user.email}
      </footer>
    </main>
  );
}

export default App;

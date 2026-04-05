import React from 'react';
import './index.css';

function App() {
  return (
    <main className="welcome-container" dir="rtl">
      <div className="glow-orb"></div>
      
      <header>
        <h1 className="logo-text">آفاق</h1>
        <p className="tagline">المنصة المتكاملة للمستقبل</p>
      </header>

      <section className="status-badge">
        <span className="status-dot"></span>
        <p>الأساس التقني مكتمل - بانتظار التفاصيل</p>
      </section>

      <footer style={{ position: 'absolute', bottom: '2rem', color: '#4b5563', fontSize: '0.8rem' }}>
        Afaq Platform Foundation © 2026
      </footer>
    </main>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import LoginPage from './pages/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import AuthService from './services/authService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitor auth state
    const unsubscribe = AuthService.Api.onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="welcome-container" style={{ background: 'var(--bg-color)', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" style={{ width: '48px', height: '48px' }}></div>
      </main>
    );
  }

  // Placeholder to handle basic Protected Routes
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    // Future: Role Check (e.g. if user.role !== 'admin' return <Unauthorized />)
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        
        {/* Admin Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AdminLayout user={user} />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="governorates" element={<div>إدارة المحافظات هنا</div>} />
          <Route path="regions" element={<div>إدارة المناطق هنا</div>} />
          <Route path="villages" element={<div>إدارة القرى هنا</div>} />
          <Route path="schools" element={<div>إدارة المدارس هنا</div>} />
          <Route path="users" element={<div>إدارة الكوادر هنا</div>} />
          <Route path="settings" element={<div>الإعدادات هنا</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

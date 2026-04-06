import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Calendar, Trash2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const NotificationsPage = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock notifications for demonstration (In a real app, fetch from Firestore)
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications([
        {
          id: '1',
          title: 'ترحيب حار بطلاب آفاق الجدد! 🌟',
          body: 'أهلاً بك في منصة آفاق التعليمية. نوصيك بإكمال ملفك الشخصي وإضافة رقم الهاتف لضمان تواصل أفضل.',
          type: 'info',
          date: '2026-04-06',
          isRead: false
        },
        {
          id: '2',
          title: 'تحديث هائل في نظام التقارير الميدانية 📊',
          body: 'تم تحسين نظام التقارير ليشمل معايير جودة جديدة للمدارس والمدرسين. يرجى الاطلاع على الدليل الجديد.',
          type: 'success',
          date: '2026-04-05',
          isRead: true
        },
        {
          id: '3',
          title: 'تنبيه: اختبار نهاية الفصل الأول ⏳',
          body: 'بدءاً من الأسبوع القادم، ستبدأ لجان التقييم بزيارة المدارس لإجراء الاختبارات الدورية.',
          type: 'warning',
          date: '2026-04-04',
          isRead: false
        }
      ]);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={20} color="#f59e0b" />;
      case 'success': return <CheckCircle size={20} color="var(--success-color)" />;
      default: return <Info size={20} color="#3b82f6" />;
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-glow)', borderRadius: '12px', color: 'var(--accent-color)' }}>
             <Bell size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>مركز الإشعارات والتنبيهات</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>ابقَ على اطلاع بأحدث الأنشطة والمواعيد الهامة</p>
          </div>
        </div>
        
        {notifications.some(n => !n.isRead) && (
            <button 
                onClick={markAllRead}
                style={{ background: 'none', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.target.style.background = 'var(--panel-color)'}
                onMouseOut={(e) => e.target.style.background = 'none'}
            >
                تحديد كروي الكل كقروء
            </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--panel-color)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
             <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
             <p style={{ color: 'var(--text-secondary)' }}>لا توجد إشعارات جديدة بانتظارك.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} style={{ 
              background: n.isRead ? 'var(--panel-color)' : 'var(--bg-color)', 
              padding: '1.5rem', 
              borderRadius: '20px', 
              border: `1px solid ${n.isRead ? 'var(--border-color)' : 'var(--accent-color)'}`,
              boxShadow: n.isRead ? 'none' : '0 10px 25px -5px rgba(59, 130, 246, 0.1)',
              display: 'flex',
              gap: '1.5rem',
              position: 'relative',
              transition: 'transform 0.2s'
            }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '14px', 
                background: n.isRead ? 'var(--bg-color)' : 'var(--panel-color)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {getIcon(n.type)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: n.isRead ? 'var(--text-primary)' : 'var(--accent-color)' }}>
                    {n.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {n.date}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    {n.body}
                </p>
              </div>

              {!n.isRead && (
                 <div style={{ position: 'absolute', top: '1rem', left: '-5px', width: '10px', height: '10px', background: 'var(--accent-color)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-color)' }}></div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', background: 'var(--panel-color)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
         <h4 style={{ margin: 0, marginBottom: '1rem' }}>هل لديك استفسار؟</h4>
         <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>يمكنك دائماً التواصل مع الإدارة المركزية عبر قنوات الدعم الفني.</p>
         <button className="google-btn" style={{ margin: 0, width: 'auto', padding: '10px 24px', background: 'var(--accent-color)', color: '#fff' }}>تحدث مع الدعم</button>
      </div>
    </div>
  );
};

export default NotificationsPage;

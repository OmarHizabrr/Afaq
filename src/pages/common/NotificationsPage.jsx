import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

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
      default: return <Info size={20} color="var(--md-primary)" />;
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <PageHeader
        icon={Bell}
        iconBox
        title="مركز الإشعارات والتنبيهات"
        subtitle="ابقَ على اطلاع بأحدث الأنشطة والمواعيد المهمة"
      >
        {notifications.some(n => !n.isRead) && (
          <button type="button" onClick={markAllRead} className="btn-md btn-md--outline">
            تعليم الكل كمقروء
          </button>
        )}
      </PageHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <div className="surface-card surface-card--lg" style={{ textAlign: 'center', padding: '5rem' }}>
             <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
             <p style={{ color: 'var(--text-secondary)' }}>لا توجد إشعارات جديدة بانتظارك.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-card ${n.isRead ? 'notif-card--read' : 'notif-card--unread'}`}
            >
              <div className="notif-card__icon" aria-hidden>
                {getIcon(n.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: n.isRead ? 'var(--text-primary)' : 'var(--md-primary)' }}>
                    {n.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <Calendar size={14} /> {n.date}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    {n.body}
                </p>
              </div>

              {!n.isRead && <div className="notif-card__unread-dot" aria-hidden />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

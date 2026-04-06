import React from 'react';
import { MapPin, CheckCircle, FileText, Activity } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div style={{
    background: 'var(--panel-color)',
    padding: '1.5rem',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: 'var(--shadow)'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      borderRadius: '12px',
      background: `${color}20`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon size={32} />
    </div>
    <div>
      <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</p>
    </div>
  </div>
);

const SupervisorDashboardPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#3b82f6' }}>لوحة المشرف الميداني</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>إحصائيات زياراتك ونشاطاتك في المنطقة</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard title="المدارس المسندة لك" value="-" icon={MapPin} color="#3b82f6" />
        <StatCard title="الزيارات المنجزة (هذا الشهر)" value="-" icon={CheckCircle} color="var(--success-color)" />
        <StatCard title="الطلاب المختبرين" value="-" icon={Activity} color="#f59e0b" />
        <StatCard title="إجمالي الزيارات" value="-" icon={FileText} color="#8b5cf6" />
      </div>

      <div style={{
        background: 'var(--panel-color)',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)'
      }}>
        سيتم إدراج الرسوم البيانية لتقييمات المدارس هنا
      </div>
    </div>
  );
};

export default SupervisorDashboardPage;

import React from 'react';
import { Users, Map, School, FileText } from 'lucide-react';

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
      background: `${color}20`, // 20% opacity using hex
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

const DashboardPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>لوحة التحكم الرئيسية</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>نظرة عامة على الإحصائيات الحيوية للمنصة</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard title="المشرفين" value="12" icon={Users} color="#10b981" />
        <StatCard title="المناطق" value="8" icon={Map} color="#3b82f6" />
        <StatCard title="المدارس" value="45" icon={School} color="#f59e0b" />
        <StatCard title="المدرسين" value="120" icon={FileText} color="#8b5cf6" />
      </div>

      {/* Future Sections (e.g., Recent Reports, Activity) could go here */}
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
        سيتم إدراج الرسوم البيانية وسجل النشاطات الحديثة هنا
      </div>
    </div>
  );
};

export default DashboardPage;

import React, { useState, useEffect } from 'react';
import { Users, Map, School, FileText, UserCheck } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
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
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        {loading ? '...' : value}
      </p>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState({
    supervisors: 0,
    villages: 0,
    regions: 0,
    schools: 0,
    teachers: 0,
    students: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const api = FirestoreApi.Api;
        
        const [usersDocs, regionsDocs, villagesDocs, schoolsDocs, studentsDocs] = await Promise.all([
          api.getDocuments(api.getCollection('users')),
          api.getCollectionGroupDocuments('regions'),
          api.getCollectionGroupDocuments('villages'),
          api.getCollectionGroupDocuments('schools'),
          api.getDocuments(api.getCollection('students'))
        ]);

        const users = usersDocs.map(d => d.data());
        
        setStats({
          villages: villagesDocs.length,
          supervisors: users.filter(u => u.role?.startsWith('supervisor')).length,
          teachers: users.filter(u => u.role === 'teacher').length,
          regions: regionsDocs.length,
          schools: schoolsDocs.length,
          students: studentsDocs.length
        });
      } catch (err) {
        console.error("Dashboard stats error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard title="المشرفين" value={stats.supervisors} icon={Users} color="#10b981" loading={loading} />
        <StatCard title="القرى" value={stats.villages} icon={Home} color="#ec4899" loading={loading} />
        <StatCard title="المناطق" value={stats.regions} icon={Map} color="#3b82f6" loading={loading} />
        <StatCard title="المدارس" value={stats.schools} icon={School} color="#f59e0b" loading={loading} />
        <StatCard title="المدرسين" value={stats.teachers} icon={FileText} color="#8b5cf6" loading={loading} />
        <StatCard title="إجمالي الطلاب" value={stats.students} icon={UserCheck} color="var(--success-color)" loading={loading} />
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

import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, FileText, Activity, Layers, School } from 'lucide-react';
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
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{loading ? '...' : value}</p>
    </div>
  </div>
);

const SupervisorDashboardPage = ({ user }) => {
  const [stats, setStats] = useState({
    regionsCount: 0,
    visitsCount: 0,
    visitsThisMonth: 0,
    totalSchools: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupervisorStats = async () => {
      if (!user?.uid) return;
      try {
        const api = FirestoreApi.Api;
        
        // 1. Fetch assigned regions from bilateral path Myschool (userId/Myschool/regionId)
        const refMyRegions = api.getSubCollection('Myschool', user.uid, 'Myschool');
        const assignedRegionsDocs = await api.getDocuments(refMyRegions);
        const assignedRegionIds = assignedRegionsDocs.map(d => d.data().regionId).filter(id => !!id);
        
        // 2. Fetch total visits by this supervisor
        const refVisits = api.getSubCollection('reports', user.uid, 'reports');
        const visitDocs = await api.getDocuments(refVisits);
        
        // Count this month
        const now = new Date();
        const thisMonth = visitDocs.filter(d => {
           const logDate = new Date(d.data().visitDate || d.data().timestamp);
           return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        });

        // 3. Count schools in assigned regions (using collectionGroup for schools)
        const allSchools = await api.getCollectionGroupDocuments('schools');
        // This is a simplified filter - in a real scenario we'd match village -> region
        const relevantSchools = allSchools.length; // Placeholder for exact hierarchy filter

        setStats({
          regionsCount: assignedRegionIds.length,
          visitsCount: visitDocs.length,
          visitsThisMonth: thisMonth.length,
          totalSchools: relevantSchools
        });

      } catch (err) {
        console.error('Error fetching supervisor stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorStats();
  }, [user]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#3b82f6' }}>لوحة المشرف الميداني</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>إحصائيات زياراتك ونشاطاتك في المناطق التابعة لك</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard title="المناطق المسندة" value={stats.regionsCount} icon={Layers} color="#3b82f6" loading={loading} />
        <StatCard title="الزيارات (هذا الشهر)" value={stats.visitsThisMonth} icon={CheckCircle} color="var(--success-color)" loading={loading} />
        <StatCard title="إجمالي الزيارات الميدانية" value={stats.visitsCount} icon={FileText} color="#f59e0b" loading={loading} />
        <StatCard title="المدارس النشطة" value={stats.totalSchools} icon={School} color="#8b5cf6" loading={loading} />
      </div>

      <div style={{
        background: 'var(--panel-color)',
        padding: '2.5rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        boxShadow: 'var(--shadow)'
      }}>
        <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>نظام المتابعة الميداني</h3>
        <p style={{ maxWidth: '500px', margin: 0 }}>
            أنت مشرف حالي على <strong>{stats.regionsCount}</strong> مناطق تعليمية. 
            يمكنك رفع تقارير الزيارات اليومية من خلال "إضافة زيارة جديدة".
        </p>
      </div>
    </div>
  );
};

export default SupervisorDashboardPage;

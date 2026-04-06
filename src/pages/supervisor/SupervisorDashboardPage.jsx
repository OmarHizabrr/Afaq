import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle, FileText, Activity, Layers, School, Eye } from 'lucide-react';
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
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    regionsCount: 0,
    visitsCount: 0,
    visitsThisMonth: 0,
    totalSchools: 0
  });
  const [recentVisits, setRecentVisits] = useState([]);
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

        // 4. Sort and take recent 5 visits
        const sortedVisits = visitDocs.map(d => ({id: d.id, ...d.data()}))
          .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);
        setRecentVisits(sortedVisits);

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="#3b82f6" /> آخر الزيارات الميدانية المرفوعة
                </h3>
                <button onClick={() => navigate('/supervisor/history')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.85rem', cursor: 'pointer' }}>عرض السجل الكامل</button>
            </div>
            {recentVisits.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>لا توجد زيارات مسجلة حديثاً.</p>
            ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                    {recentVisits.map(visit => (
                        <div key={visit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>مدرسة: {visit.schoolName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>بواسطة: {visit.supervisorName} | بتاريخ {visit.timestamp?.split('T')[0]}</div>
                            </div>
                            <button onClick={() => navigate(`/supervisor/reports/${visit.id}`)} className="icon-btn">
                                <Eye size={18} color="var(--accent-color)" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboardPage;

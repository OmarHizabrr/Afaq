import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, FileText, Activity, MapPin, School, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div className="surface-card" style={{
    padding: '1.5rem',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
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

const TeacherDashboardPage = ({ user }) => {
  const navigate = useNavigate();
  const actorId = user?.uid || user?.id;
  const [stats, setStats] = useState({
    studentsCount: 0,
    dailyLogsCount: 0,
    weeklyReportsCount: 0,
    schoolName: 'جاري التحميل...'
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      try {
        const api = FirestoreApi.Api;
        if (!actorId) {
          setStats(prev => ({ ...prev, schoolName: 'حساب غير معروف' }));
          setLoading(false);
          return;
        }

        const assignedSchoolIds = await api.listUserSchoolIdsFromMirrors(user);
        const activeSchoolId = assignedSchoolIds[0] || user.schoolId || '';

        // 2. Fetch Students count for the active school
        if (activeSchoolId) {
          const refStu = api.getSchoolStudentsCollection(activeSchoolId);
          const docsStu = await api.getDocuments(refStu);
          
          // 3. Find School Name
          const allSchools = await api.getCollectionGroupDocuments('schools');
          const mySchool = allSchools.find(s => s.id === activeSchoolId);

          setStats(prev => ({
            ...prev,
            studentsCount: docsStu.length,
            schoolName: mySchool ? mySchool.data().name : 'مدرسة غير معروفة'
          }));
        }

        // 4. Fetch Daily Logs for this teacher
        const refLogs = api.getTeacherDailyLogsCollection(actorId);
        const docsLogs = await api.getDocuments(refLogs);
        
        // 5. Fetch Weekly Reports for this teacher
        const refReports = api.getTeacherReportsCollection(actorId);
        const docsReports = await api.getDocuments(refReports);

        setStats(prev => ({
          ...prev,
          dailyLogsCount: docsLogs.length,
          weeklyReportsCount: docsReports.length
        }));

        // 6. Sort and take recent 5 logs
        const sortedLogs = docsLogs.map(d => ({id: d.id, ...d.data()}))
          .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);
        setRecentLogs(sortedLogs);

      } catch (err) {
        console.error('Error fetching teacher stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
  }, [actorId, user]);

  return (
    <div>
      <PageHeader
        title={<span style={{ color: 'var(--success-color)' }}>لوحة شرف المعلم</span>}
        subtitle="نظرة عامة على نشاطاتك في مدرستك الحالية"
      >
        <div className="surface-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <School size={18} color="var(--success-color)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stats.schoolName}</span>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard title="إجمالي الدارسين (الأعضاء)" value={stats.studentsCount} icon={Users} color="var(--success-color)" loading={loading} />
        <StatCard title="التحضير اليومي المرفوع" value={stats.dailyLogsCount} icon={Calendar} color="#3b82f6" loading={loading} />
        <StatCard title="التقارير الأسبوعية" value={stats.weeklyReportsCount} icon={FileText} color="#f59e0b" loading={loading} />
        <StatCard title="نسبة الإنجاز" value={stats.dailyLogsCount > 0 ? "نشط" : "بانتظار التحضير"} icon={Activity} color="#8b5cf6" loading={loading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="surface-card surface-card--lg" style={{ padding: '1.5rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="var(--success-color)" /> آخر النشاطات (التحضير اليومي)
                </h3>
                <button onClick={() => navigate('/teacher/daily-log')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.85rem', cursor: 'pointer' }}>عرض الكل</button>
            </div>
            {recentLogs.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>لا توجد سجلات حديثة.</p>
            ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                    {recentLogs.map(log => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>تحضير يوم: {log.date}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.records?.length || 0} طالباً مسجلاً</div>
                            </div>
                            <button onClick={() => navigate(`/teacher/reports/${log.id}`)} className="icon-btn">
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

export default TeacherDashboardPage;

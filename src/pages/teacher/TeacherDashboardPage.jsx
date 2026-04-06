import React, { useState, useEffect } from 'react';
import { Users, Calendar, FileText, Activity, MapPin, School } from 'lucide-react';
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

const TeacherDashboardPage = ({ user }) => {
  const [stats, setStats] = useState({
    studentsCount: 0,
    dailyLogsCount: 0,
    weeklyReportsCount: 0,
    schoolName: 'جاري التحميل...'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!user?.schoolId) {
        setStats(prev => ({ ...prev, schoolName: 'غير معين لمدرسة حالياً' }));
        setLoading(false);
        return;
      }

      try {
        const api = FirestoreApi.Api;
        
        // 1. Fetch Assigned Schools from the new bilateral path
        const refMySchools = api.getSubCollection('Myschool', user.id, 'Myschool');
        const assignedSchoolsDocs = await api.getDocuments(refMySchools);
        const assignedSchoolIds = assignedSchoolsDocs.map(d => d.data().schoolId).filter(id => !!id);
        
        // If teacher has schools, pick the first one as active or use the one from user.schoolId if still set
        const activeSchoolId = assignedSchoolIds.length > 0 ? assignedSchoolIds[0] : (user.schoolId || '');

        // 2. Fetch Students count for the active school
        if (activeSchoolId) {
          const refStu = api.getSubCollection('students', activeSchoolId, 'students');
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
        const refLogs = api.getSubCollection('teacher_daily_logs', user.id, 'teacher_daily_logs');
        const docsLogs = await api.getDocuments(refLogs);
        
        // 5. Fetch Weekly Reports for this teacher
        const refReports = api.getSubCollection('teacher_reports', user.id, 'teacher_reports');
        const docsReports = await api.getDocuments(refReports);

        setStats(prev => ({
          ...prev,
          dailyLogsCount: docsLogs.length,
          weeklyReportsCount: docsReports.length
        }));

      } catch (err) {
        console.error('Error fetching teacher stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
  }, [user]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--success-color)' }}>لوحة شرف المعلم</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>نظرة عامة على نشاطاتك في مدرستك الحالية</p>
        </div>
        <div style={{ background: 'var(--panel-color)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <School size={18} color="var(--success-color)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stats.schoolName}</span>
        </div>
      </div>

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
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>مرحباً بك مجدداً في حلقتك</h3>
        <p style={{ maxWidth: '500px', margin: 0 }}>
            أنت الآن تدير <strong>{stats.studentsCount}</strong> دارسين في <strong>{stats.schoolName}</strong>. 
            استخدم القائمة الجانبية لتسجيل الحضور اليومي أو رفع تقارير الإنجاز الأسبوعية.
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;

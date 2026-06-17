import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, FileText, Activity, School, ChevronRight, Bell } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import PortalQuickActions from '../../components/PortalQuickActions';

const StatCard = ({ title, value, icon: Icon, tone, loading }) => (
  <div className="surface-card portal-stat-card">
    <div className={`portal-stat-card__icon stat-tone--${tone}`}>
      <Icon size={32} />
    </div>
    <div>
      <h3 className="portal-stat-card__title">{title}</h3>
      <p className="portal-stat-card__value">{loading ? '...' : value}</p>
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

        if (activeSchoolId) {
          const refStu = api.getSchoolStudentsCollection(activeSchoolId);
          const docsStu = await api.getDocuments(refStu);

          const allSchools = await api.getCollectionGroupDocuments('schools');
          const mySchool = allSchools.find(s => s.id === activeSchoolId);

          setStats(prev => ({
            ...prev,
            studentsCount: docsStu.length,
            schoolName: mySchool ? mySchool.data().name : 'مدرسة غير معروفة'
          }));
        }

        const refLogs = api.getTeacherDailyLogsCollection(actorId);
        const docsLogs = await api.getDocuments(refLogs);

        const refReports = api.getTeacherReportsCollection(actorId);
        const docsReports = await api.getDocuments(refReports);

        setStats(prev => ({
          ...prev,
          dailyLogsCount: docsLogs.length,
          weeklyReportsCount: docsReports.length
        }));

        const sortedLogs = docsLogs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
    <div className="portal-page teacher-dashboard-page">
      <PageHeader
        title={<span className="page-header-accent--success">لوحة شرف المعلم</span>}
        subtitle="نظرة عامة على نشاطاتك في مدرستك الحالية"
      />

      <div className="portal-school-chip-wrap">
        <div className="surface-card portal-school-chip">
          <School size={18} color="var(--success-color)" />
          <span className="portal-school-chip__label">{stats.schoolName}</span>
        </div>
      </div>

      <PortalQuickActions
        actions={[
          { path: '/teacher/daily-log', label: 'التحضير اليومي', icon: Calendar, tone: 'success' },
          { path: '/teacher/students', label: 'طلابي', icon: Users },
          { path: '/teacher/weekly-report', label: 'التقرير الأسبوعي', icon: FileText },
          { path: '/teacher/notifications', label: 'الإشعارات', icon: Bell },
        ]}
      />

      <div className="portal-stats-grid">
        <StatCard title="إجمالي الدارسين (الأعضاء)" value={stats.studentsCount} icon={Users} tone="success" loading={loading} />
        <StatCard title="التحضير اليومي المرفوع" value={stats.dailyLogsCount} icon={Calendar} tone="blue" loading={loading} />
        <StatCard title="التقارير الأسبوعية" value={stats.weeklyReportsCount} icon={FileText} tone="amber" loading={loading} />
        <StatCard title="نسبة الإنجاز" value={stats.dailyLogsCount > 0 ? 'نشط' : 'بانتظار التحضير'} icon={Activity} tone="purple" loading={loading} />
      </div>

      <div className="portal-section-grid">
        <div className="surface-card surface-card--lg portal-recent-card">
          <div className="portal-recent-card__head">
            <h3 className="portal-recent-card__title">
              <Activity size={18} color="var(--success-color)" /> آخر النشاطات (التحضير اليومي)
            </h3>
            <button type="button" onClick={() => navigate('/teacher/daily-log')} className="portal-link-btn">عرض الكل</button>
          </div>
          {recentLogs.length === 0 ? (
            <p className="portal-recent-empty">لا توجد سجلات حديثة.</p>
          ) : (
            <div className="portal-recent-list">
              {recentLogs.map(log => (
                <button
                  key={log.id}
                  type="button"
                  className="portal-recent-item"
                  onClick={() => navigate(`/teacher/reports/${log.id}`)}
                >
                  <div>
                    <div className="portal-recent-item__title">تحضير يوم: {log.date}</div>
                    <div className="portal-recent-item__meta">{log.records?.length || 0} طالباً مسجلاً</div>
                  </div>
                  <ChevronRight size={18} className="portal-recent-item__chevron" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, FileText, Activity, School, ChevronRight, Bell } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import PortalFeaturedAction from '../../components/PortalFeaturedAction';
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
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const actorId = user?.uid || user?.id;
  const [stats, setStats] = useState({
    studentsCount: 0,
    dailyLogsCount: 0,
    weeklyReportsCount: 0,
    schoolName: t('pages.TeacherDashboardPage.جاري_التحميل', 'جاري التحميل...')
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      try {
        const api = FirestoreApi.Api;
        if (!actorId) {
          setStats(prev => ({ ...prev, schoolName: t('pages.TeacherDashboardPage.حساب_غير_معروف', 'حساب غير معروف') }));
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
            schoolName: mySchool ? mySchool.data().name : t('pages.TeacherDashboardPage.مدرسة_غير_معروفة', 'مدرسة غير معروفة')
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
        subtitle={t('pages.TeacherDashboardPage.نظرة_عامة_على_نشاطاتك_في_مدرستك_الحالية', 'نظرة عامة على نشاطاتك في مدرستك الحالية')}
      />

      <div className="portal-school-chip-wrap">
        <div className="surface-card portal-school-chip">
          <School size={18} color="var(--success-color)" />
          <span className="portal-school-chip__label">{stats.schoolName}</span>
        </div>
      </div>

      <div className="portal-featured-actions-row">
        <PortalFeaturedAction
          to="/teacher/daily-log"
          icon={Calendar}
          title={t('layouts.TeacherLayout.التحضير_اليومي', 'التحضير اليومي')}
          subtitle={t('pages.TeacherDashboardPage.سجّل_حضور_وغياب_طلابك_اليوم', 'سجّل حضور وغياب طلابك اليوم')}
          badge={t('pages.SupervisorDashboardPage.وصول_سريع', 'وصول سريع')}
          tone="success"
        />
        <PortalFeaturedAction
          to="/teacher/weekly-report"
          icon={FileText}
          title={t('pages.AdminReportsPage.تقرير_المدرسة', 'تقرير المدرسة')}
          subtitle={t('pages.TeacherDashboardPage.ارفع_تقريرك_الأسبوعي_للمدرسة', 'ارفع تقريرك الأسبوعي للمدرسة')}
          badge={t('pages.SupervisorDashboardPage.وصول_سريع', 'وصول سريع')}
          tone="primary"
        />
      </div>

      <PortalQuickActions
        actions={[
          { path: '/teacher/daily-log', label: t('layouts.TeacherLayout.التحضير_اليومي', 'التحضير اليومي'), icon: Calendar, tone: 'success' },
          { path: '/teacher/students', label: t('layouts.TeacherLayout.طلابي', 'طلابي'), icon: Users },
          { path: '/teacher/weekly-report', label: t('layouts.TeacherLayout.التقرير_الأسبوعي', 'التقرير الأسبوعي'), icon: FileText },
          { path: '/teacher/notifications', label: t('config.appNavItems.الإشعارات', 'الإشعارات'), icon: Bell },
        ]}
      />

      <div className="portal-stats-grid">
        <StatCard title={t('pages.TeacherDashboardPage.إجمالي_الدارسين_الأعضاء', 'إجمالي الدارسين (الأعضاء)')} value={stats.studentsCount} icon={Users} tone="success" loading={loading} />
        <StatCard title={t('pages.TeacherDashboardPage.التحضير_اليومي_المرفوع', 'التحضير اليومي المرفوع')} value={stats.dailyLogsCount} icon={Calendar} tone="blue" loading={loading} />
        <StatCard title={t('pages.AdminReportsPage.التقارير_الأسبوعية', 'التقارير الأسبوعية')} value={stats.weeklyReportsCount} icon={FileText} tone="amber" loading={loading} />
        <StatCard title={t('pages.TeacherDashboardPage.نسبة_الإنجاز', 'نسبة الإنجاز')} value={stats.dailyLogsCount > 0 ? t('pages.TeacherDashboardPage.نشط', 'نشط') : t('pages.TeacherDashboardPage.بانتظار_التحضير', 'بانتظار التحضير')} icon={Activity} tone="purple" loading={loading} />
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

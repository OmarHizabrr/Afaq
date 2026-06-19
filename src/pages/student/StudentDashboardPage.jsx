import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  BookOpen,
  TrendingUp,
  CheckCircle,
  FileText,
  Activity,
  Lightbulb,
  Rocket,
  Bell,
  User,
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import PortalQuickActions from '../../components/PortalQuickActions';
import StudentResultCard from '../../components/StudentResultCard';
import useAppTranslation from '../../hooks/useAppTranslation';

const StatCard = ({ title, value, icon, tone, subtext }) => {
  const { t } = useAppTranslation();
  const IconComponent = icon;
  return (
    <div className="surface-card surface-card--lg portal-stat-card portal-stat-card--lg">
      <div className={`portal-stat-card__icon stat-tone--${tone}`}>
        <IconComponent size={30} />
      </div>
      <div>
        <p className="portal-stat-card__title">{title}</p>
        <h3 className="portal-stat-card__value">{value}</h3>
        {subtext && <p className="portal-stat-card__sub">{subtext}</p>}
      </div>
    </div>
  );
};

const StudentDashboardPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
  const [stats, setStats] = useState({
    attendancePercent: 0,
    averageGrade: 0,
    schoolName: t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد'),
    completedTests: 0,
    recentResults: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!actorId) return;
      try {
        const api = FirestoreApi.Api;

        const schoolIds = await api.listUserSchoolIdsFromMirrors(user);
        if (schoolIds.length > 0) {
          const allSchools = await api.getCollectionGroupDocuments('schools');
          const names = allSchools
            .filter((s) => schoolIds.includes(s.id))
            .map((s) => s.data()?.name)
            .filter(Boolean);
          setStats((prev) => ({ ...prev, schoolName: names.length > 0 ? names.join(t('components.ExplorationDataModal.،', '، ')) : t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد') }));
        }

        const visitDocs = await api.getCollectionGroupDocuments('reports');
        const myResults = [];
        let totalAttend = 0;
        let presentCount = 0;

        visitDocs.forEach(d => {
            const data = d.data();
            const record = data.studentsTracking?.find(s => s.studentId === actorId);
            if (record) {
                totalAttend++;
                if (record.isPresent) presentCount++;
                if (record.isTested) {
                    myResults.push({
                        date: data.timestamp?.split('T')[0],
                        subject: data.subjectName,
                        school: data.schoolName,
                        note: record.note
                    });
                }
            }
        });

        setStats(prev => ({
            ...prev,
            attendancePercent: totalAttend > 0 ? Math.round((presentCount / totalAttend) * 100) : 0,
            completedTests: myResults.length,
            recentResults: myResults.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
        }));

      } catch (err) {
        console.error('Error fetching student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [actorId, user]);

  if (loading) return <div className="loading-spinner page-loading-lg" />;

  return (
    <div className="portal-page student-dashboard-page">
      <PageHeader
        variant="hero"
        title={
          <>
            مرحباً يا{' '}
            <span className="page-header-accent--primary">{user?.displayName?.split(/\s+/)[0] || t('components.MessengerPanel.طالب', 'طالب')}</span>
          </>
        }
        subtitle={
          <>
            ملخص أدائك في مدرسة <strong className="page-header-accent--text">{stats.schoolName}</strong>
          </>
        }
      />

      <PortalQuickActions
        actions={[
          { path: '/student/results', label: t('layouts.StudentLayout.نتائجي', 'نتائجي'), icon: Award, tone: 'primary' },
          { path: '/student/profile', label: t('layouts.StudentLayout.ملفي', 'ملفي'), icon: User },
          { path: '/student/notifications', label: t('config.appNavItems.الإشعارات', 'الإشعارات'), icon: Bell },
          { path: '/student/settings', label: t('config.appNavItems.الإعدادات', 'الإعدادات'), icon: FileText },
        ]}
      />

      <div className="portal-stats-grid portal-stats-grid--student">
        <StatCard title={t('pages.StudentDashboardPage.نسبة_الحضور', 'نسبة الحضور')} value={`${stats.attendancePercent}%`} icon={Calendar} tone="success" subtext={t('pages.StudentDashboardPage.انضباط_ممتاز', 'انضباط ممتاز')} />
        <StatCard title={t('pages.StudentDashboardPage.الاختبارات_المنجزة', 'الاختبارات المنجزة')} value={stats.completedTests} icon={Award} tone="amber" subtext={t('pages.StudentDashboardPage.بانتظار_التفوق', 'بانتظار التفوق')} />
        <StatCard title={t('pages.StudentDashboardPage.سجل_المتابعة', 'سجل المتابعة')} value={stats.recentResults.length} icon={FileText} tone="blue" subtext={t('pages.StudentDashboardPage.تقييمات_حديثة', 'تقييمات حديثة')} />
        <StatCard title={t('pages.StudentDashboardPage.الحالة_الأكاديمية', 'الحالة الأكاديمية')} value={t('pages.StudentDashboardPage.منتظم', 'منتظم')} icon={TrendingUp} tone="purple" subtext={t('pages.StudentDashboardPage.آفاق_2026', 'آفاق 2026')} />
      </div>

      <div className="student-dashboard-layout">
        <div className="surface-card surface-card--lg student-results-card">
          <div className="student-results-card__head">
            <Activity size={24} color="var(--accent-color)" />
            <h2 className="student-results-card__title">أحدث تقييمات المشرفين</h2>
          </div>

          {stats.recentResults.length === 0 ? (
            <div className="student-results-empty">
              لا توجد تقييمات مسجلة لك حتى الآن.
            </div>
          ) : (
            <>
              <div className="student-results-list student-dashboard-results-desktop-only">
                {stats.recentResults.map((res, i) => (
                  <div key={i} className="student-result-item">
                    <div className="student-result-item__lead">
                      <div className="student-result-item__icon">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h4 className="student-result-item__subject">{res.subject}</h4>
                        <p className="student-result-item__meta">{res.date} • {res.school}</p>
                      </div>
                    </div>
                    <span className="student-result-item__badge">
                      {res.note || t('pages.StudentDashboardPage.تم_الاختبار_بنجاح', 'تم الاختبار بنجاح')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="student-dashboard-results-mobile-only">
                {stats.recentResults.map((res, i) => (
                  <StudentResultCard
                    key={i}
                    row={{
                      schoolName: res.school,
                      subjectName: res.subject,
                      date: res.date,
                      isPresent: true,
                      isTested: true,
                      note: res.note,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="student-sidebar-stack">
          <div className="student-tip-card">
            <h3 className="student-tip-card__title"><Lightbulb size={18} /> نصيحة اليوم</h3>
            <p className="student-tip-card__body">الاستمرار في الحضور اليومي والمراجعة المستمرة هو سر التفوق في حلقات آفاق التعليمية.</p>
            <div className="student-tip-card__footer">
              <span className="btn-inner btn-inner--sm"><Rocket size={14} /> شعارنا: نتفكر في الآفاق</span>
            </div>
          </div>

          <div className="surface-card surface-card--lg student-plan-card">
            <h3 className="student-plan-card__title">الخطة الحالية</h3>
            <div className="student-plan-card__list">
              <div className="student-plan-card__item">
                <CheckCircle size={16} color="var(--success-color)" /> مراجعة الجزء الثلاثون
              </div>
              <div className="student-plan-card__item">
                <CheckCircle size={16} color="var(--border-color)" /> اختبار القاعدة النورانية
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPage;

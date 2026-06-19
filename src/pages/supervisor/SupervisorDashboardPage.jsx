import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Activity, Layers, School, ChevronRight, MapPin, Bell, Settings } from 'lucide-react';
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

const SupervisorDashboardPage = ({ user }) => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const actorId = user?.uid || user?.id;
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
      if (!actorId) return;
      try {
        const api = FirestoreApi.Api;

        const assignedRegionIds = await api.listUserRegionIdsFromMirrors(user);
        const assignedRegionSet = new Set(assignedRegionIds);

        const refVisits = api.getSupervisorReportsCollection(actorId);
        const visitDocs = await api.getDocuments(refVisits);

        const now = new Date();
        const thisMonth = visitDocs.filter(d => {
           const logDate = new Date(d.data().visitDate || d.data().timestamp);
           return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        });

        const [allSchools, villageDocs] = await Promise.all([
          api.getCollectionGroupDocuments('schools'),
          api.getCollectionGroupDocuments('villages'),
        ]);
        const villageToRegion = Object.fromEntries(
          villageDocs.map((d) => [d.id, d.data()?.regionId || ''])
        );
        let relevantSchools = allSchools.length;
        if (user.role !== 'admin' && user.role !== 'system_admin' && user.role !== 'supervisor_arab') {
          relevantSchools = allSchools.filter((d) => {
            const data = d.data() || {};
            const vid = data.villageId || d.ref.parent.parent?.id || '';
            const rid = data.regionId || villageToRegion[vid] || '';
            return assignedRegionSet.has(rid);
          }).length;
        }

        setStats({
          regionsCount: assignedRegionIds.length,
          visitsCount: visitDocs.length,
          visitsThisMonth: thisMonth.length,
          totalSchools: relevantSchools
        });

        const sortedVisits = visitDocs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);
        setRecentVisits(sortedVisits);

      } catch (err) {
        console.error('Error fetching supervisor stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorStats();
  }, [actorId, user]);

  return (
    <div className="portal-page supervisor-dashboard-page">
      <PageHeader
        title={<span className="page-header-accent--primary">لوحة المشرف الميداني</span>}
        subtitle={t('pages.SupervisorDashboardPage.إحصائيات_زياراتك_ونشاطاتك_في_المناطق_التابعة_لك', 'إحصائيات زياراتك ونشاطاتك في المناطق التابعة لك')}
      />

      <PortalFeaturedAction
        to="/supervisor/visit"
        icon={MapPin}
        title={t('pages.SupervisorDashboardPage.زيارة_ميدانية_جديدة', 'زيارة ميدانية جديدة')}
        subtitle={t('pages.SupervisorDashboardPage.سجّل_زيارتك_وارفع_تقريرك_الميداني_بسرعة', 'سجّل زيارتك وارفع تقريرك الميداني بسرعة')}
        badge={t('pages.SupervisorDashboardPage.وصول_سريع', 'وصول سريع')}
        tone="primary"
        secondaryAction={{ path: '/supervisor/history', label: t('pages.SupervisorDashboardPage.عرض_سجل_الزيارات_السابقة', 'عرض سجل الزيارات السابقة'), icon: FileText }}
      />

      <PortalQuickActions
        actions={[
          { path: '/supervisor/visit', label: t('layouts.SupervisorLayout.تسجيل_زيارة', 'تسجيل زيارة'), icon: MapPin, tone: 'primary' },
          { path: '/supervisor/history', label: t('layouts.SupervisorLayout.سجل_الزيارات', 'سجل الزيارات'), icon: FileText },
          { path: '/supervisor/notifications', label: t('config.appNavItems.الإشعارات', 'الإشعارات'), icon: Bell },
          { path: '/supervisor/settings', label: t('config.appNavItems.الإعدادات', 'الإعدادات'), icon: Settings },
        ]}
      />

      <div className="portal-stats-grid">
        <StatCard title={t('pages.SupervisorDashboardPage.المناطق_المسندة', 'المناطق المسندة')} value={stats.regionsCount} icon={Layers} tone="blue" loading={loading} />
        <StatCard title={t('pages.SupervisorDashboardPage.الزيارات_هذا_الشهر', 'الزيارات (هذا الشهر)')} value={stats.visitsThisMonth} icon={CheckCircle} tone="success" loading={loading} />
        <StatCard title={t('pages.SupervisorDashboardPage.إجمالي_الزيارات_الميدانية', 'إجمالي الزيارات الميدانية')} value={stats.visitsCount} icon={FileText} tone="amber" loading={loading} />
        <StatCard title={t('pages.SupervisorDashboardPage.المدارس_النشطة', 'المدارس النشطة')} value={stats.totalSchools} icon={School} tone="purple" loading={loading} />
      </div>

      <div className="portal-section-grid">
        <div className="surface-card surface-card--lg portal-recent-card">
          <div className="portal-recent-card__head">
            <h3 className="portal-recent-card__title">
              <Activity size={18} color="#3b82f6" /> آخر الزيارات الميدانية المرفوعة
            </h3>
            <button type="button" onClick={() => navigate('/supervisor/history')} className="portal-link-btn">عرض السجل الكامل</button>
          </div>
          {recentVisits.length === 0 ? (
            <p className="portal-recent-empty">لا توجد زيارات مسجلة حديثاً.</p>
          ) : (
            <div className="portal-recent-list">
              {recentVisits.map(visit => (
                <button
                  key={visit.id}
                  type="button"
                  className="portal-recent-item"
                  onClick={() => navigate(`/supervisor/reports/${visit.id}`)}
                >
                  <div>
                    <div className="portal-recent-item__title">مدرسة: {visit.schoolName}</div>
                    <div className="portal-recent-item__meta">بواسطة: {visit.supervisorName} | بتاريخ {visit.timestamp?.split('T')[0]}</div>
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

export default SupervisorDashboardPage;

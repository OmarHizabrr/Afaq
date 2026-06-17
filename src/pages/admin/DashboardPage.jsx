import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Map, School, FileText, UserCheck, Home, Activity, Eye, CalendarDays, HeartHandshake } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterRegionsByScope,
  filterSchoolsByScope,
  filterVillagesByScope,
  loadPeerUserIdsForGroups,
  reportMatchesScope,
} from '../../utils/permissionDataScope';
import { normalizeMuslimCategory, MUSLIM_CATEGORY_BORN } from '../../services/villageStudentEnrollment';
import {
  activityBadgeLabel,
  isSchoolSupervisionReport,
  schoolReportViewPath,
} from '../../utils/reportLabels';

const StatCard = ({ title, value, icon, tone, loading, onClick, hint }) => {
  const IconComponent = icon;
  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'div';
  return (
  <Tag
    type={interactive ? 'button' : undefined}
    className={`surface-card surface-card--lg dashboard-stat-card${interactive ? ' dashboard-stat-card--clickable' : ''}`}
    onClick={onClick}
    title={hint}
  >
    <div className={`dashboard-stat-card__icon-wrap stat-tone--${tone}`}>
      <IconComponent size={34} />
    </div>
    <div className="dashboard-stat-card__body">
      <p className="dashboard-stat-card__label">{title}</p>
      <h3 className="dashboard-stat-card__value">
        {loading ? '...' : value}
      </h3>
    </div>
  </Tag>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const {
    can,
    canAccessPage,
    ready,
    pageDataScope,
    membershipGroupIds,
    membershipMirrorGroupIds,
    membershipLoading,
    actorUser,
  } = perm;
  const [stats, setStats] = useState({
    supervisors: 0,
    villages: 0,
    regions: 0,
    schools: 0,
    teachers: 0,
    students: 0,
    newConverts: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.dashboard);
      const actorId = actorUser?.uid || actorUser?.id || '';

      const [usersDocs, regionsDocs, villagesDocs, schoolsDocs, studentsDocs, newMuslimsDocs] = await Promise.all([
        api.getDocuments(api.getUsersCollection()),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getCollectionGroupDocuments('schools'),
        api.getCollectionGroupDocuments('students'),
        api.getDocuments(api.getNewMuslimsCollection()),
      ]);

      const usersWithId = usersDocs.map((d) => ({ id: d.id, ...d.data() }));
      const users = usersWithId.map((u) => u);

      let regionsRows = regionsDocs.map((d) => ({ id: d.id, ...d.data() }));
      let villagesRows = villagesDocs.map((d) => ({ id: d.id, ...d.data() }));
      let schoolsRows = schoolsDocs.map((d) => {
        const data = d.data() || {};
        const pathVillageId = d.ref.parent.parent?.id || '';
        return { id: d.id, ...data, pathVillageId: pathVillageId || data.villageId || '' };
      });

      if (scope === DATA_SCOPE_MEMBERSHIP) {
        schoolsRows = filterSchoolsByScope(schoolsRows, membershipGroupIds, scope);
        regionsRows = filterRegionsByScope(regionsRows, membershipGroupIds, scope);
        villagesRows = filterVillagesByScope(
          villagesRows,
          membershipGroupIds,
          schoolsRows,
          scope,
          membershipMirrorGroupIds
        );
      }

      const scopedSchoolIds = new Set(schoolsRows.map((s) => s.id));
      const studentsScoped =
        scope === DATA_SCOPE_MEMBERSHIP
          ? studentsDocs.filter((d) => scopedSchoolIds.has(d.ref.parent.parent?.id || ''))
          : studentsDocs;

      let supervisorsN = users.filter((u) => u.role?.startsWith('supervisor')).length;
      let teachersN = users.filter((u) => u.role === 'teacher').length;
      if (scope === DATA_SCOPE_MEMBERSHIP && membershipGroupIds.size > 0) {
        const peerIds = await loadPeerUserIdsForGroups(api, membershipGroupIds);
        supervisorsN = users.filter(
          (u) => u.role?.startsWith('supervisor') && (peerIds.has(u.id) || u.id === actorId)
        ).length;
        teachersN = users.filter((u) => u.role === 'teacher' && (peerIds.has(u.id) || u.id === actorId)).length;
      }

      const scopedVillageIds = new Set(villagesRows.map((v) => v.id));
      const convertsScoped = newMuslimsDocs.filter((d) => {
        const data = d.data() || {};
        if (normalizeMuslimCategory(data.muslimCategory) === MUSLIM_CATEGORY_BORN) return false;
        if (scope === DATA_SCOPE_MEMBERSHIP) return scopedVillageIds.has(data.villageId || '');
        return true;
      });

      setStats({
        villages: villagesRows.length,
        supervisors: supervisorsN,
        teachers: teachersN,
        regions: regionsRows.length,
        schools: schoolsRows.length,
        students: studentsScoped.length,
        newConverts: convertsScoped.length,
      });

      const [visitDocs, logsDocs] = await Promise.all([
        api.getCollectionGroupDocuments('reports'),
        api.getCollectionGroupDocuments('teacher_daily_logs'),
      ]);

      const activities = [
        ...visitDocs
          .filter((d) => !isSchoolSupervisionReport(d.data() || {}))
          .map((d) => {
            const data = d.data() || {};
            return {
              id: d.id,
              type: 'visit',
              _ownerId: d.ref.parent.parent?.id || '',
              ...data,
            };
          }),
        ...visitDocs
          .filter((d) => isSchoolSupervisionReport(d.data() || {}))
          .map((d) => {
            const data = d.data() || {};
            return {
              id: d.id,
              type: 'school',
              _ownerId: d.ref.parent.parent?.id || '',
              ...data,
            };
          }),
        ...logsDocs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            type: 'daily',
            _ownerId: d.ref.parent.parent?.id || '',
            ...data,
          };
        }),
      ];

      const scopedActs =
        scope === DATA_SCOPE_MEMBERSHIP && membershipGroupIds.size > 0
          ? activities.filter((act) => {
              const enriched =
                act.type === 'visit' || act.type === 'school'
                  ? {
                      ...act,
                      supervisorId: act.supervisorId || act._ownerId,
                    }
                  : {
                      ...act,
                      teacherId: act.teacherId || act._ownerId,
                    };
              return reportMatchesScope(enriched, membershipGroupIds, actorId, scope);
            })
          : activities;

      scopedActs.sort(
        (a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
      );
      setRecentActivity(scopedActs.slice(0, 6));
    } catch (err) {
      console.error('Dashboard stats error', err);
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds, membershipMirrorGroupIds, actorUser]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.dashboard) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    setLoading(true);
    fetchStats();
  }, [ready, membershipLoading, fetchStats, pageDataScope]);

  const statNav = (pageId, path, hint) =>
    canAccessPage(pageId) ? { onClick: () => navigate(path), hint } : {};

  const canViewActivity = (act) => {
    if (act.type === 'school') {
      return can(PERMISSION_PAGE_IDS.schools, 'school_view') || can(PERMISSION_PAGE_IDS.reports, 'report_view');
    }
    if (act.type === 'daily') {
      return can(PERMISSION_PAGE_IDS.reports, 'report_view') || can(PERMISSION_PAGE_IDS.daily_preparation, 'daily_prep_view');
    }
    return can(PERMISSION_PAGE_IDS.reports, 'report_view');
  };

  const activityPath = (act) => {
    if (act.type === 'school') return schoolReportViewPath({ ...act, ownerId: act._ownerId });
    return `/reports/${act.id}`;
  };

  return (
    <div className="dashboard-page">
      <PageHeader title="لوحة التحكم الرئيسية" subtitle="نظرة عامة على الإحصائيات الحيوية للمنصة" />

      {ready && pageDataScope(PERMISSION_PAGE_IDS.dashboard) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info dashboard-page-alert">
          عرض محدود: الإحصائيات والنشاط الظاهران مرتبطان بمجموعاتك فقط.
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-stats-grid">
        <StatCard title="المشرفين" value={stats.supervisors} icon={Users} tone="emerald" loading={loading} {...statNav(PERMISSION_PAGE_IDS.users, '/users', 'عرض المستخدمين')} />
        <StatCard title="القرى" value={stats.villages} icon={Home} tone="pink" loading={loading} {...statNav(PERMISSION_PAGE_IDS.villages, '/villages', 'عرض القرى')} />
        <StatCard title="المناطق" value={stats.regions} icon={Map} tone="blue" loading={loading} {...statNav(PERMISSION_PAGE_IDS.regions, '/regions', 'عرض المناطق')} />
        <StatCard title="المدارس" value={stats.schools} icon={School} tone="amber" loading={loading} {...statNav(PERMISSION_PAGE_IDS.schools, '/schools', 'عرض المدارس')} />
        <StatCard title="المدرسين" value={stats.teachers} icon={FileText} tone="purple" loading={loading} {...statNav(PERMISSION_PAGE_IDS.users, '/users', 'عرض المستخدمين')} />
        <StatCard title="إجمالي الطلاب" value={stats.students} icon={UserCheck} tone="success" loading={loading} {...statNav(PERMISSION_PAGE_IDS.students_management, '/students-management', 'إدارة الطلاب')} />
        <StatCard title="المهتدون الجدد" value={stats.newConverts} icon={HeartHandshake} tone="pink" loading={loading} {...statNav(PERMISSION_PAGE_IDS.villages, '/villages', 'عرض سجل المهتدين في القرى')} />
      </div>

      {/* Recent Activity Section */}
      <div className="surface-card surface-card--lg dashboard-activity-card">
        <div className="dashboard-activity-card__head">
            <Activity size={24} color="var(--accent-color)" />
            <h2 className="dashboard-activity-card__title">أحدث النشاطات الميدانية</h2>
            {canAccessPage(PERMISSION_PAGE_IDS.reports) && (
              <button type="button" className="google-btn dashboard-activity-card__all" onClick={() => navigate('/reports')}>
                عرض كل التقارير
              </button>
            )}
        </div>

        {loading ? (
            <div className="loading-spinner page-loading" />
        ) : recentActivity.length === 0 ? (
            <p className="dashboard-activity-empty">لا توجد نشاطات مسجلة مؤخراً.</p>
        ) : (
            <div className="dashboard-activity-grid">
                {recentActivity.map((act) => {
                  const badgeLabel = activityBadgeLabel(act.type, act);
                  const badgeTone = act.type === 'school' ? 'school' : act.type === 'visit' ? 'visit' : 'daily';
                  const viewPath = activityPath(act);
                  const clickable = canViewActivity(act) && viewPath;
                  const openActivity = () => {
                    if (clickable) navigate(viewPath);
                  };
                  return (
                    <div
                      key={`${act.type}-${act.id}`}
                      className={`dashboard-activity-item${clickable ? ' dashboard-activity-item--clickable' : ''}`}
                      role={clickable ? 'button' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={openActivity}
                      onKeyDown={(e) => {
                        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          openActivity();
                        }
                      }}
                    >
                        <div className={`dashboard-activity-item__badge activity-badge--${badgeTone}`}>
                            {badgeLabel}
                        </div>
                        <h4 className="dashboard-activity-item__school">{act.schoolName || 'مدرسة غير محددة'}</h4>
                        <p className="dashboard-activity-item__author">
                           بواسطة: {act.supervisorName || act.teacherName || 'عضو غير معروف'}
                        </p>
                        {act.type === 'daily' && act.lessonName && (
                          <p className="dashboard-activity-item__extra">{act.lessonName}</p>
                        )}
                        <div className="dashboard-activity-item__footer">
                           <p className="dashboard-activity-item__date">
                              <CalendarDays size={14} /> {act.date || act.periodLabel || act.timestamp?.split('T')[0]}
                           </p>
                           {clickable && (
                             <span className="dashboard-activity-item__view" title="عرض التفاصيل">
                                <Eye size={16} color="var(--accent-color)" />
                             </span>
                           )}
                        </div>
                    </div>
                  );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

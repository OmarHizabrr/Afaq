import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Map, School, FileText, UserCheck, Home, Activity, Eye, CalendarDays } from 'lucide-react';
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

const StatCard = ({ title, value, icon, color, loading }) => {
  const IconComponent = icon;
  return (
  <div className="surface-card surface-card--lg dashboard-stat-card">
    <div
      className="dashboard-stat-card__icon-wrap"
      style={{ background: `linear-gradient(135deg, ${color}20, ${color}40)`, color, boxShadow: `0 8px 16px -4px ${color}30` }}
    >
      <IconComponent size={34} />
    </div>
    <div className="dashboard-stat-card__body">
      <p className="dashboard-stat-card__label">{title}</p>
      <h3 className="dashboard-stat-card__value">
        {loading ? '...' : value}
      </h3>
    </div>
  </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = perm;
  const [stats, setStats] = useState({
    supervisors: 0,
    villages: 0,
    regions: 0,
    schools: 0,
    teachers: 0,
    students: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.dashboard);
      const actorId = actorUser?.uid || actorUser?.id || '';

      const [usersDocs, regionsDocs, villagesDocs, schoolsDocs, studentsDocs] = await Promise.all([
        api.getDocuments(api.getUsersCollection()),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getCollectionGroupDocuments('schools'),
        api.getCollectionGroupDocuments('students'),
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
        villagesRows = filterVillagesByScope(villagesRows, membershipGroupIds, schoolsRows, scope);
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

      setStats({
        villages: villagesRows.length,
        supervisors: supervisorsN,
        teachers: teachersN,
        regions: regionsRows.length,
        schools: schoolsRows.length,
        students: studentsScoped.length,
      });

      const [visitDocs, logsDocs] = await Promise.all([
        api.getCollectionGroupDocuments('reports'),
        api.getCollectionGroupDocuments('teacher_daily_logs'),
      ]);

      const activities = [
        ...visitDocs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            type: 'visit',
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
                act.type === 'visit'
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
  }, [pageDataScope, membershipGroupIds, actorUser]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.dashboard) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    setLoading(true);
    fetchStats();
  }, [ready, membershipLoading, fetchStats, pageDataScope]);

  return (
    <div>
      <PageHeader title="لوحة التحكم الرئيسية" subtitle="نظرة عامة على الإحصائيات الحيوية للمنصة" />

      {ready && pageDataScope(PERMISSION_PAGE_IDS.dashboard) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info" style={{ marginBottom: '1rem' }}>
          عرض محدود: الإحصائيات والنشاط الظاهران مرتبطان بمجموعاتك فقط.
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-stats-grid">
        <StatCard title="المشرفين" value={stats.supervisors} icon={Users} color="#10b981" loading={loading} />
        <StatCard title="القرى" value={stats.villages} icon={Home} color="#ec4899" loading={loading} />
        <StatCard title="المناطق" value={stats.regions} icon={Map} color="#3b82f6" loading={loading} />
        <StatCard title="المدارس" value={stats.schools} icon={School} color="#f59e0b" loading={loading} />
        <StatCard title="المدرسين" value={stats.teachers} icon={FileText} color="#8b5cf6" loading={loading} />
        <StatCard title="إجمالي الطلاب" value={stats.students} icon={UserCheck} color="var(--success-color)" loading={loading} />
      </div>

      {/* Recent Activity Section */}
      <div className="surface-card surface-card--lg dashboard-activity-card">
        <div className="dashboard-activity-card__head">
            <Activity size={24} color="var(--accent-color)" />
            <h2 className="dashboard-activity-card__title">أحدث النشاطات الميدانية</h2>
        </div>

        {loading ? (
            <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
        ) : recentActivity.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد نشاطات مسجلة مؤخراً.</p>
        ) : (
            <div className="dashboard-activity-grid">
                {recentActivity.map((act) => (
                    <div key={act.id} className="dashboard-activity-item">
                        <div
                          className="dashboard-activity-item__badge"
                          style={{
                            background: act.type === 'visit' ? '#3b82f620' : 'var(--success-color)20',
                            color: act.type === 'visit' ? '#3b82f6' : 'var(--success-color)',
                          }}
                        >
                            {act.type === 'visit' ? 'زيارة ميدانية' : 'تحضير يومي'}
                        </div>
                        <h4 className="dashboard-activity-item__school">{act.schoolName || 'مدرسة غير محددة'}</h4>
                        <p className="dashboard-activity-item__author">
                           بواسطة: {act.supervisorName || act.teacherName || 'عضو غير معروف'}
                        </p>
                        <div className="dashboard-activity-item__footer">
                           <p className="dashboard-activity-item__date">
                              <CalendarDays size={14} /> {act.date || act.timestamp?.split('T')[0]}
                           </p>
                           {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                             <button onClick={() => navigate(`/reports/${act.id}`)} className="icon-btn" title="عرض التفاصيل">
                                <Eye size={16} color="var(--accent-color)" />
                             </button>
                           )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

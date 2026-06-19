import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { School, Users, ChevronRight, UserPlus, Info, Search, X, Check, Trash2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';

const ROLE_LABELS = {
    system_admin: t('pages.RegionDetailsPage.مدير_نظام_وصول_كامل', 'مدير نظام (وصول كامل)'),
    admin: t('pages.RegionDetailsPage.مدير_النظام', 'مدير النظام'),
    supervisor_arab: t('pages.RegionDetailsPage.مشرف_عام_عربي', 'مشرف عام (عربي)'),
    supervisor_local: t('pages.RegionDetailsPage.مشرف_منطقة_محلي', 'مشرف منطقة (محلي)'),
    teacher: t('pages.RegionDetailsPage.معلم_مدرسة', 'معلم مدرسة'),
    student: t('pages.RegionDetailsPage.طالب_دارس', 'طالب / دارس'),
    unassigned: t('pages.RegionDetailsPage.صلاحية_معلقة', 'صلاحية معلقة')
};
const ASSIGN_ROLE_FILTER_ORDER = [
    'teacher',
    'supervisor_local',
    'supervisor_arab',
    'student',
    'admin',
    'system_admin',
    'unassigned',
    'all',
];

const RegionDetailsPage = () => {
  const { t } = useAppTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [region, setRegion] = useState(null);
    const [schools, setSchools] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignRoleFilter, setAssignRoleFilter] = useState('all');
    const [assigning, setAssigning] = useState(false);
    const [assignMsg, setAssignMsg] = useState('');
    const [error, setError] = useState('');
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();

    const fetchRegionDetails = useCallback(async () => {
        if (!id) return;
        try {
            const api = FirestoreApi.Api;

            const allRegions = await api.getCollectionGroupDocuments('regions');
            const regDoc = allRegions.find(r => r.id === id);
            if (!regDoc) return;
            setRegion({ id: regDoc.id, ...regDoc.data() });

            const allSchools = await api.getCollectionGroupDocuments('schools');
            const regSchools = allSchools.filter(s => s.data().regionId === id).map(s => ({ id: s.id, ...s.data() }));
            setSchools(regSchools);

            const [usersDocs, memberDocs] = await Promise.all([
                api.getDocuments(api.getUsersCollection()),
                api.getDocuments(api.getGroupMembersCollection(id))
            ]);

            const users = usersDocs.map(u => ({ id: u.id, ...u.data() }));
            setAllUsers(users);

            const memberUserIds = new Set(
                memberDocs.map(d => {
                    const data = d.data();
                    return data.userId || d.id;
                })
            );

            const regionMembers = users.filter((u) => memberUserIds.has(u.id));
            setSupervisors(regionMembers);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRegionDetails();
    }, [fetchRegionDetails]);

    useEffect(() => {
        if (!assignMsg) return;
        const t = setTimeout(() => setAssignMsg(''), 3500);
        return () => clearTimeout(t);
    }, [assignMsg]);

    useEffect(() => {
        if (!error) return;
        const t = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(t);
    }, [error]);

    const handleAssignSupervisor = async (userToAssign) => {
        if (!userToAssign || assigning || !id) return;
        setAssigning(true);
        setAssignMsg('');
        setError('');
        try {
            const api = FirestoreApi.Api;

            await api.clearUserMembershipMirrors(userToAssign.id);

            const newRole = userToAssign.role === 'supervisor_arab' ? 'supervisor_arab' : 'supervisor_local';

            await api.updateData({
                docRef: api.getUserDoc(userToAssign.id),
                data: { role: newRole, schoolId: '' }
            });

            const regionLink1 = api.getGroupMemberDoc(id, userToAssign.id);
            const regionLink2 = api.getUserMembershipMirrorDoc(userToAssign.id, id);

            await Promise.all([
                api.setData({
                    docRef: regionLink1,
                    data: { userId: userToAssign.id, role: newRole, assignedAt: new Date().toISOString() }
                }),
                api.setData({
                    docRef: regionLink2,
                    data: { regionId: id, role: newRole, assignedAt: new Date().toISOString() }
                })
            ]);

            await api.setData({
                docRef: api.getSupervisorAssignmentDoc(userToAssign.id),
                data: {
                    userId: userToAssign.id,
                    role: newRole,
                    regionId: id,
                    schoolIds: []
                }
            });

            await fetchRegionDetails();
            setAssignMsg(`تم تعيين ${userToAssign.displayName || 'المستخدم'} بنجاح. يمكنك تعيين مشرفين آخرين.`);
        } catch (err) {
            console.error(err);
            setError(t('pages.RegionDetailsPage.حدث_خطأ_أثناء_التعيين', 'حدث خطأ أثناء التعيين.'));
        } finally {
            setAssigning(false);
        }
    };

    const removeSupervisorFromRegion = async (sup) => {
        if (!sup?.id || !id || assigning) return;
        const label = sup.displayName || sup.id;
        if (!window.confirm(`إزالة «${label}» من أعضاء هذه المنطقة؟\n\nيُحذف ربط العضوية والمرآة، ويُحدَّث تعيين المشرف عند الحاجة.`)) {
            return;
        }
        setAssigning(true);
        setError('');
        setAssignMsg('');
        try {
            const api = FirestoreApi.Api;
            const memberId = sup.id;
            await api.deleteData(api.getGroupMemberDoc(id, memberId));
            await api.deleteData(api.getUserMembershipMirrorDoc(memberId, id));

            const profile = (await api.getData(api.getUserDoc(memberId))) || {};
            const remaining = await api.listUserRegionIdsFromMirrors({ uid: memberId, id: memberId, ...profile });

            if (remaining.length > 0) {
                await api.setData({
                    docRef: api.getSupervisorAssignmentDoc(memberId),
                    data: {
                        userId: memberId,
                        role: profile.role,
                        regionId: remaining[0],
                        schoolIds: [],
                    },
                    merge: true,
                });
            } else {
                try {
                    await api.deleteData(api.getSupervisorAssignmentDoc(memberId));
                } catch {
                    /* غير موجود */
                }
                if (profile.role === 'supervisor_local') {
                    await api.updateData({
                        docRef: api.getUserDoc(memberId),
                        data: { role: 'unassigned', schoolId: '' },
                        merge: true,
                    });
                }
            }

            await fetchRegionDetails();
            setAssignMsg(`تمت إزالة «${label}» من المنطقة.`);
        } catch (err) {
            console.error(err);
            setError(t('pages.RegionDetailsPage.تعذر_إزالة_المشرف_من_المنطقة', 'تعذر إزالة المشرف من المنطقة.'));
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="loading-spinner page-loading-lg" />;
    if (!region) return <div className="empty-state empty-state--centered">المنطقة غير موجودة</div>;

    const regionScope = pageDataScope(PERMISSION_PAGE_IDS.regions);
    if (
      ready &&
      !membershipLoading &&
      regionScope === DATA_SCOPE_MEMBERSHIP &&
      id &&
      !membershipGroupIds.has(id)
    ) {
      return <Navigate to="/regions" replace />;
    }

    const supervisorIds = new Set(supervisors.map(s => s.id));

    const filteredUsers = allUsers.filter(u => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !q ||
            u.displayName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q);
        const role = u.role || 'unassigned';
        const matchesRole = assignRoleFilter === 'all' || role === assignRoleFilter;
        if (supervisorIds.has(u.id)) return false;
        return matchesSearch && matchesRole;
    });
    const assignRoleCounts = ASSIGN_ROLE_FILTER_ORDER.reduce((acc, rid) => {
        const q = searchTerm.trim().toLowerCase();
        const base = allUsers.filter((u) => {
            const matchesSearch =
                !q ||
                u.displayName?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q);
            return !supervisorIds.has(u.id) && matchesSearch;
        });
        if (rid === 'all') {
            acc.all = base.length;
            return acc;
        }
        acc[rid] = base.filter((u) => (u.role || 'unassigned') === rid).length;
        return acc;
    }, {});

    return (
        <div className="region-details-page portal-page">
            <PageHeader
              topRow={
                <div className="region-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/regions')}>
                    <ChevronRight size={20} aria-hidden /> إدارة المناطق
                  </button>
                  <ChevronRight size={16} className="page-nav-separator" aria-hidden />
                </div>
              }
              title={<>منطقة: <span className="page-header-accent">{region.name}</span></>}
            />

            <div className="region-details-grid">
                <div className="surface-card surface-card--lg region-details-panel">
                    <div className="region-details-panel__head">
                        <h2 className="region-details-panel__title">
                           <School size={18} color="var(--accent-color)" /> المدارس في هذه المنطقة
                        </h2>
                    </div>
                    {schools.length === 0 ? <p className="region-details-panel__empty">لا توجد مدارس مضافة لهذه المنطقة.</p> : (
                        <div className="region-details-list">
                           {schools.map(sch => (
                              can(PERMISSION_PAGE_IDS.regions, 'region_school_view') ? (
                                <button
                                  key={sch.id}
                                  type="button"
                                  className="region-details-item"
                                  onClick={() => navigate(`/schools/${sch.id}`)}
                                >
                                  <h4 className="region-details-item__name">{sch.name}</h4>
                                  <ChevronRight size={18} className="geo-details-item__chevron" aria-hidden />
                                </button>
                              ) : (
                                <div key={sch.id} className="region-details-item">
                                  <h4 className="region-details-item__name">{sch.name}</h4>
                                </div>
                              )
                           ))}
                        </div>
                    )}
                </div>

                <div className="surface-card surface-card--lg region-details-panel">
                    <div className="region-details-panel__head">
                        <h2 className="region-details-panel__title">
                           <Users size={18} color="var(--success-color)" /> أعضاء المنطقة
                        </h2>
                        {can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_assign') && (
                          <button type="button" className="icon-btn" title={t('pages.RegionDetailsPage.تعيين_مشرف', 'تعيين مشرف')} onClick={() => { setIsModalOpen(true); setAssignMsg(''); setSearchTerm(''); setAssignRoleFilter('all'); }}><UserPlus size={18} /></button>
                        )}
                    </div>
                    {supervisors.length === 0 ? <p className="region-details-panel__empty">لا يوجد أعضاء مسجّلون لهذه المنطقة حالياً.</p> : (
                        <div className="region-details-list">
                           {supervisors.map(sup => (
                              <div key={sup.id} className="region-details-item">
                                 <div className="region-details-item__member">
                                    <img src={sup.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(sup.displayName || '')}`} alt="" className="member-avatar-sm" />
                                    <h4 className="region-details-item__name">{sup.displayName}</h4>
                                 </div>
                                 <div className="region-details-item__actions">
                                 {can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_view_profile') && (
                                   <button type="button" onClick={() => navigate(`/users/${sup.id}`)} className="icon-btn" title={t('pages.RegionDetailsPage.عرض_الملف', 'عرض الملف')}><Info size={16}/></button>
                                 )}
                                 {can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_assign') && (
                                   <BusyButton type="button" onClick={() => removeSupervisorFromRegion(sup)} className="icon-btn" title={t('pages.RegionDetailsPage.إزالة_من_المنطقة', 'إزالة من المنطقة')} busy={assigning}>
                                     <Trash2 size={16} color="var(--danger-color)" />
                                   </BusyButton>
                                 )}
                                 </div>
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_assign') && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="region-assign-title" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-card modal-card--sm" onClick={e => e.stopPropagation()}>
                        <div className="region-assign-modal__head">
                            <h3 id="region-assign-title" className="region-assign-modal__title">{t('config.permissionRegistry.تعيين_مشرف_للمنطقة', 'تعيين مشرف للمنطقة')}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="icon-btn" aria-label={t('components.InstallAppBanner.إغلاق', 'إغلاق')}><X size={20}/></button>
                        </div>
                        <p className="region-assign-modal__lead">
                          المنطقة هي مجموعة (group): يُسجَّل العضو في <code>members/{'{'}معرف_المنطقة{'}'}/members/{'{'}userId{'}'}</code> مع المرآة{' '}
                          <code>Mygroup/{'{'}userId{'}'}/Mygroup/{'{'}معرف_المنطقة{'}'}</code>. يظهر هنا جميع المستخدمين بما فيهم مدير النظام، باستثناء من عُيِّن مسبقاً لهذه المنطقة — يمكنك تعيين أكثر من مشرف دون إغلاق النافذة.
                        </p>
                        {assignMsg && (
                          <div className="app-alert app-alert--success app-alert--dismissible geo-page-alert">
                            <span>{assignMsg}</span>
                            <button
                              type="button"
                              className="icon-btn app-alert__dismiss"
                              title={t('components.InstallAppBanner.إغلاق', 'إغلاق')}
                              onClick={() => setAssignMsg('')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        {error && (
                          <div className="app-alert app-alert--error app-alert--dismissible geo-page-alert">
                            <span>{error}</span>
                            <button
                              type="button"
                              className="icon-btn app-alert__dismiss"
                              title={t('components.InstallAppBanner.إغلاق', 'إغلاق')}
                              onClick={() => setError('')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        <div className="md-field region-assign-modal__search">
                            <Search size={18} color="var(--text-secondary)" aria-hidden />
                            <input
                              type="search"
                              placeholder={t('pages.RegionDetailsPage.بحث_بالاسم_أو_البريد', 'بحث بالاسم أو البريد...')}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="role-filter-bar region-assign-modal__filters">
                          {ASSIGN_ROLE_FILTER_ORDER.map((rid) => (
                            <button
                              key={rid}
                              type="button"
                              className={`role-filter-btn ${assignRoleFilter === rid ? 'role-filter-btn--active' : ''}`}
                              onClick={() => setAssignRoleFilter(rid)}
                            >
                              {(rid === 'all' ? t('pages.RegionDetailsPage.الكل', 'الكل') : ROLE_LABELS[rid] || rid)} ({assignRoleCounts[rid] || 0})
                            </button>
                          ))}
                        </div>

                        <div className="modal-scroll-box region-assign-scroll">
                            {filteredUsers.length === 0 ? (
                              <p className="region-assign-empty">لا يوجد مستخدمون يطابقون البحث أو الجميع معيّنون لهذه المنطقة.</p>
                            ) : (
                              filteredUsers.map(u => (
                                <div key={u.id} className="region-assign-user-row">
                                    <div className="region-assign-user-row__info">
                                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || '')}`} alt="" className="member-avatar-sm" />
                                        <div className="region-assign-user-row__body">
                                            <div className="region-assign-user-row__name">{u.displayName || u.email}</div>
                                            <div className="region-assign-user-row__role">{ROLE_LABELS[u.role] || u.role || '—'}</div>
                                        </div>
                                    </div>
                                    <BusyButton
                                      type="button"
                                      onClick={() => handleAssignSupervisor(u)}
                                      busy={assigning}
                                      className="google-btn google-btn--filled region-assign-user-row__btn"
                                    >
                                      <span className="btn-inner btn-inner--sm">
                                        <Check size={14} aria-hidden /> تعيين
                                      </span>
                                    </BusyButton>
                                </div>
                              ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegionDetailsPage;

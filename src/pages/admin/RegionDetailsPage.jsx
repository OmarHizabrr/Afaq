import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { MapPin, School, Users, ChevronRight, UserPlus, Info, Search, X, Check, Trash2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';

const ROLE_LABELS = {
    system_admin: 'مدير نظام (وصول كامل)',
    admin: 'مدير النظام',
    supervisor_arab: 'مشرف عام (عربي)',
    supervisor_local: 'مشرف منطقة (محلي)',
    teacher: 'معلم مدرسة',
    student: 'طالب / دارس',
    unassigned: 'صلاحية معلقة'
};

const RegionDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [region, setRegion] = useState(null);
    const [schools, setSchools] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
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
            setError('حدث خطأ أثناء التعيين.');
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
            setError('تعذر إزالة المشرف من المنطقة.');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!region) return <div style={{ padding: '2rem', textAlign: 'center' }}>المنطقة غير موجودة</div>;

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
        if (supervisorIds.has(u.id)) return false;
        return matchesSearch;
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader
              topRow={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="page-nav-back" onClick={() => navigate('/regions')}>
                    <ChevronRight size={20} aria-hidden /> إدارة المناطق
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>منطقة: <span style={{ color: 'var(--md-primary)' }}>{region.name}</span></>}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div className="surface-card surface-card--lg" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <School size={18} color="var(--accent-color)" /> المدارس في هذه المنطقة
                        </h2>
                    </div>
                    {schools.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا توجد مدارس مضافة لهذه المنطقة.</p> : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                           {schools.map(sch => (
                              <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <h4 style={{ margin: 0 }}>{sch.name}</h4>
                                 {can(PERMISSION_PAGE_IDS.regions, 'region_school_view') && (
                                   <button type="button" onClick={() => navigate(`/schools/${sch.id}`)} className="icon-btn"><Info size={16}/></button>
                                 )}
                              </div>
                           ))}
                        </div>
                    )}
                </div>

                <div className="surface-card surface-card--lg" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <Users size={18} color="var(--success-color)" /> أعضاء المنطقة
                        </h2>
                        {can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_assign') && (
                          <button type="button" className="icon-btn" title="تعيين مشرف" onClick={() => { setIsModalOpen(true); setAssignMsg(''); setSearchTerm(''); }}><UserPlus size={18} /></button>
                        )}
                    </div>
                    {supervisors.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا يوجد أعضاء مسجّلون لهذه المنطقة حالياً.</p> : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                           {supervisors.map(sup => (
                              <div key={sup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={sup.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(sup.displayName || '')}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    <h4 style={{ margin: 0 }}>{sup.displayName}</h4>
                                 </div>
                                 <div style={{ display: 'flex', gap: 6 }}>
                                 {can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_view_profile') && (
                                   <button type="button" onClick={() => navigate(`/users/${sup.id}`)} className="icon-btn" title="عرض الملف"><Info size={16}/></button>
                                 )}
                                 {can(PERMISSION_PAGE_IDS.regions, 'region_supervisor_assign') && (
                                   <BusyButton type="button" onClick={() => removeSupervisorFromRegion(sup)} className="icon-btn" title="إزالة من المنطقة" busy={assigning}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 id="region-assign-title" style={{ margin: 0 }}>تعيين مشرف للمنطقة</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="icon-btn" aria-label="إغلاق"><X size={20}/></button>
                        </div>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          المنطقة هي مجموعة (group): يُسجَّل العضو في <code style={{ fontSize: '0.75rem' }}>members/{'{'}معرف_المنطقة{'}'}/members/{'{'}userId{'}'}</code> مع المرآة{' '}
                          <code style={{ fontSize: '0.75rem' }}>Mygroup/{'{'}userId{'}'}/Mygroup/{'{'}معرف_المنطقة{'}'}</code>. يظهر هنا جميع المستخدمين بما فيهم مدير النظام، باستثناء من عُيِّن مسبقاً لهذه المنطقة — يمكنك تعيين أكثر من مشرف دون إغلاق النافذة.
                        </p>
                        {assignMsg && (
                          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--success-color)' }}>{assignMsg}</p>
                        )}
                        {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

                        <div className="md-field" style={{ borderRadius: '12px', marginBottom: '1rem' }}>
                            <Search size={18} color="var(--text-secondary)" aria-hidden />
                            <input
                              type="search"
                              placeholder="بحث بالاسم أو البريد..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="modal-scroll-box" style={{ maxHeight: 'min(50vh, 380px)', marginBottom: 0 }}>
                            {filteredUsers.length === 0 ? (
                              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', margin: 0 }}>لا يوجد مستخدمون يطابقون البحث أو الجميع معيّنون لهذه المنطقة.</p>
                            ) : (
                              filteredUsers.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--panel-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || '')}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.displayName || u.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{ROLE_LABELS[u.role] || u.role || '—'}</div>
                                        </div>
                                    </div>
                                    <BusyButton
                                      type="button"
                                      onClick={() => handleAssignSupervisor(u)}
                                      busy={assigning}
                                      className="google-btn google-btn--filled"
                                      style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.8rem', width: 'auto', flexShrink: 0, gap: '6px' }}
                                    >
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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

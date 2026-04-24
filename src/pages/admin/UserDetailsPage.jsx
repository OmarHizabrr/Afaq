import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Calendar, BookOpen, ChevronRight, Activity, TrendingUp, Info, Ban, Trash2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, loadPeerUserIdsForGroups } from '../../utils/permissionDataScope';

const UserDetailsPage = ({ selfUser = null, viewerUser = null }) => {
    const { id: routeUserId } = useParams();
    const navigate = useNavigate();
    const targetId = routeUserId || selfUser?.uid || selfUser?.id || '';
    const [profile, setProfile] = useState(null);
    const [activity, setActivity] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminWorking, setAdminWorking] = useState(false);
    const [adminError, setAdminError] = useState('');
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = usePermissions();

    const viewerId = viewerUser?.uid || viewerUser?.id || '';
    const canAdminManage =
      viewerUser?.role === 'admin' && !selfUser && Boolean(targetId) && Boolean(viewerId) && viewerId !== targetId;

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!targetId) return;
            try {
                const api = FirestoreApi.Api;
                const userDoc = await api.getData(api.getUserDoc(targetId));
                if (!userDoc) return;
                if (userDoc.role === 'student' && routeUserId && !selfUser) {
                    navigate(`/students/${targetId}`, { replace: true });
                    return;
                }
                setProfile({ id: targetId, ...userDoc });
                const mirrorDocs = await api.getDocuments(api.getUserMembershipMirrorCollection(targetId));
                setMemberships(
                  mirrorDocs.map((doc) => {
                    const data = doc.data() || {};
                    return {
                      id: doc.id,
                      schoolId: data.schoolId || '',
                      regionId: data.regionId || '',
                      role: data.role || '',
                      joinedAt: data.joinedAt || data.assignedAt || '',
                    };
                  })
                );

                // Fetch dynamic activity based on role
                if (userDoc.role === 'student') {
                    // Fetch results/attendance from reports (Collection Group)
                    const allReports = await api.getCollectionGroupDocuments('reports');
                    const studentData = [];
                    allReports.forEach(rep => {
                        const data = rep.data();
                        const record = data.studentsTracking?.find(s => s.studentId === targetId);
                        if (record) {
                            studentData.push({
                                id: rep.id,
                                date: data.timestamp?.split('T')[0],
                                subject: data.subjectName,
                                school: data.schoolName,
                                ...record
                            });
                        }
                    });
                    setActivity(studentData.sort((a,b) => new Date(b.date) - new Date(a.date)));
                } else if (userDoc.role === 'teacher') {
                    const logs = await api.getDocuments(api.getUserDailyLogsCollection(targetId));
                    setActivity(logs.map(l => ({ id: l.id, ...l.data() })).sort((a,b) => new Date(b.date) - new Date(a.date)));
                } else if (userDoc.role?.includes('supervisor')) {
                    // Fetch visit history (reports created by him)
                    const allReports = await api.getCollectionGroupDocuments('reports');
                    const supReports = allReports
                        .filter(r => r.data().supervisorId === targetId)
                        .map(r => ({ id: r.id, ...r.data() }))
                        .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setActivity(supReports);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [targetId, routeUserId, selfUser, navigate]);

    useEffect(() => {
        if (!profile || loading) return;
        const actorId = actorUser?.uid || actorUser?.id || '';
        if (!actorId || profile.id === actorId) return;
        if (!ready || membershipLoading) return;
        const scope = pageDataScope(PERMISSION_PAGE_IDS.users);
        if (scope !== DATA_SCOPE_MEMBERSHIP || membershipGroupIds.size === 0) return;
        let cancelled = false;
        (async () => {
            const api = FirestoreApi.Api;
            const peerIds = await loadPeerUserIdsForGroups(api, membershipGroupIds);
            if (cancelled) return;
            if (profile.id !== actorId && !peerIds.has(profile.id)) {
                navigate('/users', { replace: true });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [
        profile,
        loading,
        ready,
        membershipLoading,
        pageDataScope,
        membershipGroupIds,
        actorUser,
        navigate,
    ]);

    const handleToggleAccountDisabled = async () => {
        if (!canAdminManage || !targetId) return;
        setAdminError('');
        try {
            setAdminWorking(true);
            const api = FirestoreApi.Api;
            const next = !profile.accountDisabled;
            await api.updateData({
                docRef: api.getUserDoc(targetId),
                data: { accountDisabled: next },
                userData: viewerUser
            });
            setProfile((p) => ({ ...p, accountDisabled: next }));
        } catch (err) {
            console.error(err);
            setAdminError('تعذر تحديث حالة التعطيل. تحقق من صلاحيات Firestore.');
        } finally {
            setAdminWorking(false);
        }
    };

    const handleAdminDeleteUser = async () => {
        if (!canAdminManage || !targetId) return;
        const ok = window.confirm(
            `حذف المستخدم «${profile.displayName || targetId}» نهائياً من قاعدة البيانات؟ سيتم إزالة عضويات المجموعات وإسناد المشرف إن وُجد.`
        );
        if (!ok) return;
        if (!window.confirm('تأكيد نهائي: لا يمكن التراجع عن هذا الإجراء.')) return;
        setAdminError('');
        try {
            setAdminWorking(true);
            const api = FirestoreApi.Api;
            await api.clearUserMembershipMirrors(targetId);
            try {
                await api.deleteData(api.getSupervisorAssignmentDoc(targetId));
            } catch {
                /* غير موجود */
            }
            await api.deleteData(api.getUserDoc(targetId));
            navigate('/users');
        } catch (err) {
            console.error(err);
            setAdminError('تعذر حذف المستخدم.');
            setAdminWorking(false);
        }
    };

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!profile) return <div className="empty-state user-details-empty">المستخدم غير موجود</div>;

    const ROLE_LABELS = {
        admin: 'مدير النظام',
        supervisor_arab: 'مشرف عام (عربي)',
        supervisor_local: 'مشرف منطقة (محلي)',
        teacher: 'معلم مدرسة',
        student: 'طالب / دارس',
        unassigned: 'صلاحية معلقه'
    };

    return (
        <div className="user-details-page">
            <PageHeader
              topRow={
                <div className="user-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate(-1)}>
                    <ChevronRight size={20} aria-hidden /> رجوع
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>عرض ملف: <span style={{ color: 'var(--md-primary)' }}>{profile.displayName}</span></>}
            />

            <div className="user-details-layout">
                {/* Profile Card */}
                <div className="user-details-profile-col">
                    <div className="surface-card surface-card--lg user-details-profile-card">
                        <img 
                          src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&size=128`} 
                          alt="Profile" 
                          className="user-details-profile-card__avatar"
                        />
                        <h2 className="user-details-profile-card__name">{profile.displayName}</h2>
                        <span className="user-details-profile-card__role">
                            {ROLE_LABELS[profile.role] || profile.role}
                        </span>
                        {profile.accountDisabled && (
                            <div className="user-details-profile-card__disabled">
                                الحساب معطّل — لا يمكنه تسجيل الدخول
                            </div>
                        )}

                        {canAdminManage && (
                            <div className="surface-card user-details-admin-card">
                                <h3 className="user-details-admin-card__title">
                                    <Shield size={18} /> تحكم المدير
                                </h3>
                                {adminError && (
                                    <div className="app-alert app-alert--error user-details-admin-card__alert" role="alert">
                                        {adminError}
                                    </div>
                                )}
                                <div className="user-details-admin-card__actions">
                                    {can(PERMISSION_PAGE_IDS.users, 'user_admin_disable') && (
                                      <button
                                          type="button"
                                          className={`google-btn user-details-admin-card__btn ${profile.accountDisabled ? 'user-details-admin-card__btn--enable' : 'user-details-admin-card__btn--disable'}`}
                                          disabled={adminWorking}
                                          onClick={handleToggleAccountDisabled}
                                      >
                                          <Ban size={18} style={{ marginLeft: 8 }} aria-hidden />
                                          {profile.accountDisabled ? 'تفعيل الحساب والسماح بالدخول' : 'تعطيل الحساب ومنع فتح الموقع'}
                                      </button>
                                    )}
                                    {can(PERMISSION_PAGE_IDS.users, 'user_admin_delete') && (
                                      <button
                                          type="button"
                                          className="google-btn user-details-admin-card__btn user-details-admin-card__btn--delete"
                                          disabled={adminWorking}
                                          onClick={handleAdminDeleteUser}
                                      >
                                          <Trash2 size={18} style={{ marginLeft: 8 }} aria-hidden />
                                          حذف المستخدم نهائياً من النظام
                                      </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="user-details-profile-card__meta">
                            <div className="user-details-profile-card__meta-row">
                                <Mail size={16} /> {profile.email}
                            </div>
                            <div className="user-details-profile-card__meta-row">
                                <Phone size={16} /> {profile.phoneNumber || 'لا يوجد رقم'}
                            </div>
                            <div className="user-details-profile-card__meta-row">
                                <Shield size={16} /> المعرف: {profile.id.substring(0, 8)}...
                            </div>
                        </div>
                    </div>
                    <div className="surface-card user-details-memberships-card">
                        <h3 className="user-details-memberships-card__title">
                          <BookOpen size={16} /> الارتباطات (Memberships)
                        </h3>
                        {memberships.length === 0 ? (
                          <p className="user-details-memberships-card__empty">لا توجد ارتباطات مجموعات حالياً.</p>
                        ) : (
                          <div className="user-details-memberships-list">
                            {memberships.map((m) => (
                              <div key={m.id} className="user-details-memberships-item">
                                <div className="user-details-memberships-item__line">
                                  {m.schoolId ? `مدرسة: ${m.schoolId}` : m.regionId ? `منطقة: ${m.regionId}` : `مجموعة: ${m.id}`}
                                </div>
                                {m.role && <div className="user-details-memberships-item__sub">الدور: {m.role}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                </div>

                {/* Role-Specific Activity */}
                <div className="surface-card surface-card--lg user-details-activity-card">
                    <div className="user-details-activity-card__head">
                        <Activity size={24} color="var(--accent-color)" />
                        <h2 className="user-details-activity-card__title">السجل والنشاطات</h2>
                    </div>

                    {activity.length === 0 ? (
                        <div className="empty-state user-details-activity-card__empty">
                           لا يوجد سجلات نشطة لهذا الحساب حالياً.
                        </div>
                    ) : (
                        <div className="user-details-activity-list">
                           {profile.role === 'student' && activity.map(item => (
                              <div key={item.id} className="activity-list-item activity-list-item--split">
                                 <div>
                                    <h4 style={{ margin: 0 }}>{item.subject}</h4>
                                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.date} • {item.school}</p>
                                 </div>
                                 <div className="user-details-activity-list__status-wrap">
                                    <span className={`user-details-activity-list__status-chip ${item.isPresent ? 'user-details-activity-list__status-chip--present' : 'user-details-activity-list__status-chip--absent'}`}>
                                       {item.isPresent ? 'حاضر' : 'غائب'}
                                    </span>
                                    {item.isTested && <TrendingUp size={16} color="var(--success-color)" />}
                                 </div>
                              </div>
                           ))}

                           {profile.role === 'teacher' && activity.map(item => (
                              <div key={item.id} className="activity-list-item">
                                 <div className="user-details-activity-list__teacher-row">
                                    <div className="user-details-activity-list__teacher-date">
                                       <Calendar size={14} color="var(--accent-color)" />
                                       <span style={{ fontWeight: 600 }}>{item.date}</span>
                                    </div>
                                    <span className="user-details-activity-list__teacher-subject">{item.subject}</span>
                                 </div>
                                 <p className="user-details-activity-list__teacher-lesson"><BookOpen size={14} /> {item.lessonTitle}</p>
                              </div>
                           ))}

                           {profile.role?.includes('supervisor') && activity.map(item => (
                              <div key={item.id} className="activity-list-item activity-list-item--split">
                                 <div>
                                    <h4 style={{ margin: 0 }}>زيارة: {item.schoolName}</h4>
                                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.timestamp?.split('T')[0]} • {item.subjectName}</p>
                                 </div>
                                 <button onClick={() => navigate(`/reports/${item.id}`)} className="icon-btn"><Info size={18}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDetailsPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Calendar, BookOpen, ChevronRight, Activity, TrendingUp, Info, Ban, Trash2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const UserDetailsPage = ({ selfUser = null, viewerUser = null }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const targetId = id || selfUser?.uid || selfUser?.id || '';
    const [profile, setProfile] = useState(null);
    const [activity, setActivity] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminWorking, setAdminWorking] = useState(false);
    const [adminError, setAdminError] = useState('');
    const { can } = usePermissions();

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
    }, [targetId, id]);

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
    if (!profile) return <div className="empty-state" style={{ margin: '2rem auto', maxWidth: '480px' }}>المستخدم غير موجود</div>;

    const ROLE_LABELS = {
        admin: 'مدير النظام',
        supervisor_arab: 'مشرف عام (عربي)',
        supervisor_local: 'مشرف منطقة (محلي)',
        teacher: 'معلم مدرسة',
        student: 'طالب / دارس',
        unassigned: 'صلاحية معلقه'
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <PageHeader
              topRow={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="page-nav-back" onClick={() => navigate(-1)}>
                    <ChevronRight size={20} aria-hidden /> رجوع
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>عرض ملف: <span style={{ color: 'var(--md-primary)' }}>{profile.displayName}</span></>}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Profile Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="surface-card surface-card--lg" style={{ padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                        <img 
                          src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&size=128`} 
                          alt="Profile" 
                          style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--accent-glow)', marginBottom: '1.5rem' }}
                        />
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{profile.displayName}</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 700, background: 'var(--accent-glow)', padding: '4px 12px', borderRadius: '20px', marginTop: '10px', display: 'inline-block' }}>
                            {ROLE_LABELS[profile.role] || profile.role}
                        </span>
                        {profile.accountDisabled && (
                            <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.12)', padding: '6px 12px', borderRadius: '12px', display: 'inline-block' }}>
                                الحساب معطّل — لا يمكنه تسجيل الدخول
                            </div>
                        )}

                        {canAdminManage && (
                            <div className="surface-card" style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                                <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--md-primary)' }}>
                                    <Shield size={18} /> تحكم المدير
                                </h3>
                                {adminError && (
                                    <div className="app-alert app-alert--error" style={{ marginBottom: '10px', fontSize: '0.85rem' }} role="alert">
                                        {adminError}
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {can(PERMISSION_PAGE_IDS.users, 'user_admin_disable') && (
                                      <button
                                          type="button"
                                          className="google-btn"
                                          disabled={adminWorking}
                                          onClick={handleToggleAccountDisabled}
                                          style={{
                                              width: '100%',
                                              justifyContent: 'center',
                                              background: profile.accountDisabled ? 'var(--success-color)' : 'rgba(245, 158, 11, 0.15)',
                                              color: profile.accountDisabled ? '#fff' : 'var(--text-primary)',
                                              border: '1px solid var(--border-color)'
                                          }}
                                      >
                                          <Ban size={18} style={{ marginLeft: 8 }} aria-hidden />
                                          {profile.accountDisabled ? 'تفعيل الحساب والسماح بالدخول' : 'تعطيل الحساب ومنع فتح الموقع'}
                                      </button>
                                    )}
                                    {can(PERMISSION_PAGE_IDS.users, 'user_admin_delete') && (
                                      <button
                                          type="button"
                                          className="google-btn"
                                          disabled={adminWorking}
                                          onClick={handleAdminDeleteUser}
                                          style={{
                                              width: '100%',
                                              justifyContent: 'center',
                                              background: 'rgba(239, 68, 68, 0.12)',
                                              color: 'var(--danger-color)',
                                              border: '1px solid var(--danger-color)'
                                          }}
                                      >
                                          <Trash2 size={18} style={{ marginLeft: 8 }} aria-hidden />
                                          حذف المستخدم نهائياً من النظام
                                      </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Mail size={16} /> {profile.email}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Phone size={16} /> {profile.phoneNumber || 'لا يوجد رقم'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <Shield size={16} /> المعرف: {profile.id.substring(0, 8)}...
                            </div>
                        </div>
                    </div>
                    <div className="surface-card" style={{ padding: '1rem 1.1rem', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <BookOpen size={16} /> الارتباطات (Memberships)
                        </h3>
                        {memberships.length === 0 ? (
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لا توجد ارتباطات مجموعات حالياً.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {memberships.map((m) => (
                              <div key={m.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px', background: 'var(--bg-color)', textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem' }}>
                                  {m.schoolId ? `مدرسة: ${m.schoolId}` : m.regionId ? `منطقة: ${m.regionId}` : `مجموعة: ${m.id}`}
                                </div>
                                {m.role && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>الدور: {m.role}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                </div>

                {/* Role-Specific Activity */}
                <div className="surface-card surface-card--lg" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Activity size={24} color="var(--accent-color)" />
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>السجل والنشاطات</h2>
                    </div>

                    {activity.length === 0 ? (
                        <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
                           لا يوجد سجلات نشطة لهذا الحساب حالياً.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                           {profile.role === 'student' && activity.map(item => (
                              <div key={item.id} className="activity-list-item activity-list-item--split">
                                 <div>
                                    <h4 style={{ margin: 0 }}>{item.subject}</h4>
                                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.date} • {item.school}</p>
                                 </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', background: item.isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: item.isPresent ? 'var(--success-color)' : 'var(--danger-color)', padding: '4px 10px', borderRadius: '12px' }}>
                                       {item.isPresent ? 'حاضر' : 'غائب'}
                                    </span>
                                    {item.isTested && <TrendingUp size={16} color="var(--success-color)" />}
                                 </div>
                              </div>
                           ))}

                           {profile.role === 'teacher' && activity.map(item => (
                              <div key={item.id} className="activity-list-item">
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                       <Calendar size={14} color="var(--accent-color)" />
                                       <span style={{ fontWeight: 600 }}>{item.date}</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.subject}</span>
                                 </div>
                                 <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📖 {item.lessonTitle}</p>
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

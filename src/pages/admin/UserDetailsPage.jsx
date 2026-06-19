import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Calendar, BookOpen, ChevronRight, Activity, TrendingUp, Info, Ban, Trash2, Edit2, Save, X } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, loadPeerUserIdsForGroups } from '../../utils/permissionDataScope';
import BusyButton from '../../components/BusyButton';
import StudentResultCard from '../../components/StudentResultCard';
import useAppTranslation from '../../hooks/useAppTranslation';

const UserDetailsPage = ({ selfUser = null, viewerUser = null }) => {
  const { t } = useAppTranslation();
    const { id: routeUserId } = useParams();
    const navigate = useNavigate();
    const targetId = routeUserId || selfUser?.uid || selfUser?.id || '';
    const [profile, setProfile] = useState(null);
    const [activity, setActivity] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminWorking, setAdminWorking] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');
    const [editForm, setEditForm] = useState({
      displayName: '',
      email: '',
      phoneNumber: '',
      photoURL: '',
      gender: '',
      birthDate: '',
      address: '',
      country: '',
      notes: '',
    });
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = usePermissions();

    const viewerId = viewerUser?.uid || viewerUser?.id || '';
    const canAdminManage =
      (viewerUser?.role === 'admin' || viewerUser?.role === 'system_admin') &&
      !selfUser &&
      Boolean(targetId) &&
      Boolean(viewerId) &&
      viewerId !== targetId;
    const canEditUserProfile = canAdminManage || (Boolean(selfUser) && targetId === (selfUser?.uid || selfUser?.id || ''));

    useEffect(() => {
        if (!editSuccess) return;
        const t = setTimeout(() => setEditSuccess(''), 3500);
        return () => clearTimeout(t);
    }, [editSuccess]);

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
            setAdminError(t('pages.UserDetailsPage.تعذر_تحديث_حالة_التعطيل_تحقق_من_صلاحيات_Firestore', 'تعذر تحديث حالة التعطيل. تحقق من صلاحيات Firestore.'));
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
        if (!window.confirm(t('pages.UserDetailsPage.تأكيد_نهائي_لا_يمكن_التراجع_عن_هذا_الإجراء', 'تأكيد نهائي: لا يمكن التراجع عن هذا الإجراء.'))) return;
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
            setAdminError(t('pages.UserDetailsPage.تعذر_حذف_المستخدم', 'تعذر حذف المستخدم.'));
            setAdminWorking(false);
        }
    };

    const openEditUserModal = () => {
        if (!profile) return;
        setEditForm({
          displayName: profile.displayName || '',
          email: profile.email || '',
          phoneNumber: profile.phoneNumber || '',
          photoURL: profile.photoURL || '',
          gender: profile.gender || '',
          birthDate: profile.birthDate || '',
          address: profile.address || '',
          country: profile.country || '',
          notes: profile.notes || '',
        });
        setEditError('');
        setEditSuccess('');
        setIsEditModalOpen(true);
    };

    const handleSaveUserProfile = async () => {
        if (!canEditUserProfile || !targetId || !profile) return;
        try {
            setEditBusy(true);
            setEditError('');
            const api = FirestoreApi.Api;
            const nextEmail = (editForm.email || '').trim().toLowerCase();
            if (nextEmail) {
                const usersDocs = await api.getDocuments(api.getUsersCollection());
                const exists = usersDocs.some((u) => {
                    if (u.id === targetId) return false;
                    return String(u.data()?.email || '').trim().toLowerCase() === nextEmail;
                });
                if (exists) {
                    setEditError(t('pages.UserDetailsPage.هذا_البريد_الإلكتروني_مستخدم_مسبقاً', 'هذا البريد الإلكتروني مستخدم مسبقاً.'));
                    setEditBusy(false);
                    return;
                }
            }
            const patch = {
              displayName: (editForm.displayName || '').trim() || profile.displayName || '',
              email: nextEmail,
              phoneNumber: (editForm.phoneNumber || '').trim(),
              photoURL: (editForm.photoURL || '').trim(),
              gender: (editForm.gender || '').trim(),
              birthDate: (editForm.birthDate || '').trim(),
              address: (editForm.address || '').trim(),
              country: (editForm.country || '').trim(),
              notes: (editForm.notes || '').trim(),
            };
            await api.updateData({
                docRef: api.getUserDoc(targetId),
                data: patch,
                userData: viewerUser || undefined,
            });
            setProfile((p) => ({ ...p, ...patch }));
            setEditSuccess(t('pages.UserDetailsPage.تم_تحديث_بيانات_المستخدم_بنجاح', 'تم تحديث بيانات المستخدم بنجاح.'));
            setIsEditModalOpen(false);
        } catch (err) {
            console.error(err);
            setEditError(t('pages.UserDetailsPage.تعذر_حفظ_البيانات_تحقق_من_الصلاحيات', 'تعذر حفظ البيانات. تحقق من الصلاحيات.'));
        } finally {
            setEditBusy(false);
        }
    };

    if (loading) return <div className="loading-spinner page-loading-lg" />;
    if (!profile) return <div className="empty-state user-details-empty">{t('pages.UserDetailsPage.المستخدم_غير_موجود', 'المستخدم غير موجود')}</div>;

    const ROLE_LABELS = {
        system_admin: t('pages.RegionDetailsPage.مدير_نظام_وصول_كامل', 'مدير نظام (وصول كامل)'),
        admin: t('pages.RegionDetailsPage.مدير_النظام', 'مدير النظام'),
        supervisor_arab: t('pages.RegionDetailsPage.مشرف_عام_عربي', 'مشرف عام (عربي)'),
        supervisor_local: t('pages.RegionDetailsPage.مشرف_منطقة_محلي', 'مشرف منطقة (محلي)'),
        teacher: t('pages.RegionDetailsPage.معلم_مدرسة', 'معلم مدرسة'),
        student: t('pages.RegionDetailsPage.طالب_دارس', 'طالب / دارس'),
        unassigned: t('pages.UserDetailsPage.صلاحية_معلقه', 'صلاحية معلقه')
    };

    return (
      <>
        <div className="user-details-page portal-page">
            <PageHeader
              topRow={
                <div className="user-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate(-1)}>
                    <ChevronRight size={20} aria-hidden /> رجوع
                  </button>
                  <ChevronRight size={16} className="page-nav-separator" aria-hidden />
                </div>
              }
              title={<>{t('pages.UserDetailsPage.عرض_ملف', 'عرض ملف:')} <span className="page-header-accent">{profile.displayName}</span></>}
            >
              {canEditUserProfile && (
                <button type="button" className="google-btn google-btn--toolbar" onClick={openEditUserModal}>
                  <Edit2 size={18} />
                  <span className="portal-toolbar__long">{t('pages.UserDetailsPage.تعديل_بيانات_المستخدم', 'تعديل بيانات المستخدم')}</span>
                  <span className="portal-toolbar__short">{t('components.ExplorationListCard.تعديل', 'تعديل')}</span>
                </button>
              )}
            </PageHeader>

            {editSuccess && (
              <div className="app-alert app-alert--success app-alert--dismissible user-details-page-alert">
                <span>{editSuccess}</span>
                <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setEditSuccess('')}>
                  <X size={14} />
                </button>
              </div>
            )}

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
                                      <BusyButton
                                          type="button"
                                          className={`google-btn user-details-admin-card__btn ${profile.accountDisabled ? 'user-details-admin-card__btn--enable' : 'user-details-admin-card__btn--disable'}`}
                                          busy={adminWorking}
                                          onClick={handleToggleAccountDisabled}
                                      >
                                          <span className="btn-inner">
                                            <Ban size={18} aria-hidden />
                                            {profile.accountDisabled ? t('pages.UserDetailsPage.تفعيل_الحساب_والسماح_بالدخول', 'تفعيل الحساب والسماح بالدخول') : t('pages.UserDetailsPage.تعطيل_الحساب_ومنع_فتح_الموقع', 'تعطيل الحساب ومنع فتح الموقع')}
                                          </span>
                                      </BusyButton>
                                    )}
                                    {can(PERMISSION_PAGE_IDS.users, 'user_admin_delete') && (
                                      <BusyButton
                                          type="button"
                                          className="google-btn user-details-admin-card__btn user-details-admin-card__btn--delete"
                                          busy={adminWorking}
                                          onClick={handleAdminDeleteUser}
                                      >
                                          <span className="btn-inner">
                                            <Trash2 size={18} aria-hidden />
                                            حذف المستخدم نهائياً من النظام
                                          </span>
                                      </BusyButton>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="user-details-profile-card__meta">
                            <div className="user-details-profile-card__meta-row">
                                <Mail size={16} /> {profile.email}
                            </div>
                            <div className="user-details-profile-card__meta-row">
                                <Phone size={16} /> {profile.phoneNumber || t('pages.StudentDetailsPage.لا_يوجد_رقم', 'لا يوجد رقم')}
                            </div>
                            <div className="user-details-profile-card__meta-row">
                                <Shield size={16} /> المعرف: {profile.id.substring(0, 8)}...
                            </div>
                            {profile.country && (
                              <div className="user-details-profile-card__meta-row">
                                <Info size={16} /> الدولة: {profile.country}
                              </div>
                            )}
                            {profile.gender && (
                              <div className="user-details-profile-card__meta-row">
                                <User size={16} /> الجنس: {profile.gender}
                              </div>
                            )}
                            {profile.birthDate && (
                              <div className="user-details-profile-card__meta-row">
                                <Calendar size={16} /> تاريخ الميلاد: {profile.birthDate}
                              </div>
                            )}
                            {profile.address && (
                              <div className="user-details-profile-card__meta-row">
                                <Info size={16} /> العنوان: {profile.address}
                              </div>
                            )}
                        </div>
                        {profile.notes && (
                          <div className="user-details-notes">
                            <div className="user-details-notes__head">
                              <Info size={15} aria-hidden /> ملاحظات
                            </div>
                            <p className="user-details-notes__text">{profile.notes}</p>
                          </div>
                        )}
                    </div>
                    <div className="surface-card user-details-memberships-card">
                        <h3 className="user-details-memberships-card__title">
                          <BookOpen size={16} /> الارتباطات (Memberships)
                        </h3>
                        {memberships.length === 0 ? (
                          <p className="user-details-memberships-card__empty">{t('pages.UserDetailsPage.لا_توجد_ارتباطات_مجموعات_حالياً', 'لا توجد ارتباطات مجموعات حالياً.')}</p>
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
                        <h2 className="user-details-activity-card__title">{t('pages.UserDetailsPage.السجل_والنشاطات', 'السجل والنشاطات')}</h2>
                    </div>

                    {activity.length === 0 ? (
                        <div className="empty-state user-details-activity-card__empty">
                           لا يوجد سجلات نشطة لهذا الحساب حالياً.
                        </div>
                    ) : (
                        <div className="user-details-activity-list">
                           {profile.role === 'student' && (
                             <>
                               <div className="user-details-activity-desktop-only">
                                 {activity.map((item) => (
                                   <div key={item.id} className="activity-list-item activity-list-item--split">
                                     <div>
                                       <h4 className="activity-list-item__title">{item.subject}</h4>
                                       <p className="activity-list-item__meta">{item.date} • {item.school}</p>
                                     </div>
                                     <div className="user-details-activity-list__status-wrap">
                                       <span className={`user-details-activity-list__status-chip ${item.isPresent ? 'user-details-activity-list__status-chip--present' : 'user-details-activity-list__status-chip--absent'}`}>
                                         {item.isPresent ? 'حاضر' : 'غائب'}
                                       </span>
                                       {item.isTested && <TrendingUp size={16} color="var(--success-color)" />}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                               <div className="user-details-activity-mobile-only">
                                 {activity.map((item) => (
                                   <StudentResultCard
                                     key={item.id}
                                     row={{
                                       schoolName: item.school,
                                       subjectName: item.subject,
                                       date: item.date,
                                       isPresent: item.isPresent,
                                       isTested: item.isTested,
                                       note: item.note,
                                     }}
                                   />
                                 ))}
                               </div>
                             </>
                           )}

                           {profile.role === 'teacher' && activity.map(item => (
                              <div key={item.id} className="activity-list-item">
                                 <div className="user-details-activity-list__teacher-row">
                                    <div className="user-details-activity-list__teacher-date">
                                       <Calendar size={14} color="var(--accent-color)" />
                                       <span>{item.date}</span>
                                    </div>
                                    <span className="user-details-activity-list__teacher-subject">{item.subject}</span>
                                 </div>
                                 <p className="user-details-activity-list__teacher-lesson"><BookOpen size={14} /> {item.lessonTitle}</p>
                              </div>
                           ))}

                           {profile.role?.includes('supervisor') && activity.map(item => (
                              <div key={item.id} className="activity-list-item activity-list-item--split">
                                 <div>
                                    <h4 className="activity-list-item__title">زيارة: {item.schoolName}</h4>
                                    <p className="activity-list-item__meta">{item.timestamp?.split('T')[0]} • {item.subjectName}</p>
                                 </div>
                                 <button onClick={() => navigate(`/reports/${item.id}`)} className="icon-btn"><Info size={18}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {isEditModalOpen && canEditUserProfile && (
          <div className="modal-overlay" onClick={() => !editBusy && setIsEditModalOpen(false)}>
            <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
              <div className="users-modal__head">
                <h2 className="users-modal__title">{t('pages.UserDetailsPage.تعديل_بيانات_المستخدم', 'تعديل بيانات المستخدم')}</h2>
                <button type="button" className="icon-btn" onClick={() => setIsEditModalOpen(false)} disabled={editBusy}>
                  <X size={20} />
                </button>
              </div>

              {editError && (
                <div className="app-alert app-alert--error users-alert">{editError}</div>
              )}

              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.الاسم_الكامل_اختياري', 'الاسم الكامل (اختياري)')}</label>
                <input
                  className="app-input"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder={t('pages.UserDetailsPage.اسم_المستخدم', 'اسم المستخدم')}
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.StudentManagementPage.البريد_الإلكتروني_اختياري', 'البريد الإلكتروني (اختياري)')}</label>
                <input
                  className="app-input"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="example@email.com"
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.رقم_الهاتف_اختياري', 'رقم الهاتف (اختياري)')}</label>
                <input
                  className="app-input"
                  inputMode="numeric"
                  maxLength={15}
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '') }))}
                  placeholder="07xxxxxxxx"
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.رابط_الصورة_اختياري', 'رابط الصورة (اختياري)')}</label>
                <input
                  className="app-input"
                  value={editForm.photoURL}
                  onChange={(e) => setEditForm((p) => ({ ...p, photoURL: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.الجنس_اختياري', 'الجنس (اختياري)')}</label>
                <select
                  className="app-input"
                  value={editForm.gender}
                  onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option value="">{t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد')}</option>
                  <option value={t('pages.UserDetailsPage.ذكر', 'ذكر')}>{t('pages.UserDetailsPage.ذكر', 'ذكر')}</option>
                  <option value={t('pages.UserDetailsPage.أنثى', 'أنثى')}>{t('pages.UserDetailsPage.أنثى', 'أنثى')}</option>
                </select>
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.تاريخ_الميلاد_اختياري', 'تاريخ الميلاد (اختياري)')}</label>
                <input
                  className="app-input"
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, birthDate: e.target.value }))}
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.الدولة_اختياري', 'الدولة (اختياري)')}</label>
                <input
                  className="app-input"
                  value={editForm.country}
                  onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder={t('pages.UserDetailsPage.مثال_MALAWI', 'مثال: MALAWI')}
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.العنوان_اختياري', 'العنوان (اختياري)')}</label>
                <input
                  className="app-input"
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder={t('pages.UserDetailsPage.العنوان_أو_المنطقة', 'العنوان أو المنطقة')}
                />
              </div>
              <div className="users-modal__field">
                <label className="app-label">{t('pages.UserDetailsPage.ملاحظات_اختياري', 'ملاحظات (اختياري)')}</label>
                <textarea
                  className="app-input users-modal__textarea"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t('pages.UserDetailsPage.أي_ملاحظات_إضافية', 'أي ملاحظات إضافية')}
                />
              </div>

              <div className="users-modal__actions">
                <button type="button" className="google-btn users-modal__action-btn" onClick={() => setIsEditModalOpen(false)} disabled={editBusy}>
                  {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
                </button>
                <BusyButton type="button" busy={editBusy} className="google-btn google-btn--filled users-modal__save-btn" onClick={handleSaveUserProfile}>
                  <span className="btn-inner btn-inner--sm">
                    <Save size={14} aria-hidden /> {t('pages.SchoolReportPage.حفظ_التعديلات', 'حفظ التعديلات')}
                  </span>
                </BusyButton>
              </div>
            </div>
          </div>
        )}
      </>
    );
};

export default UserDetailsPage;

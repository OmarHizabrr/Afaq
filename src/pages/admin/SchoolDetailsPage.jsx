import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { School, Users, FileText, ChevronRight, UserPlus, Info, Search, X, Check } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const schoolLevelSubtitle = (sl) =>
  sl === 'adults' ? 'نوع الحلقة: كبار' : sl === 'children' ? 'نوع الحلقة: صغار' : 'نوع الحلقة: غير محدد';

const USER_ROLE_LABELS = {
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام',
  supervisor_local: 'مشرف منطقة',
  teacher: 'معلم',
  student: 'طالب',
  unassigned: 'غير معيّن',
};

const userRoleLabel = (role) => USER_ROLE_LABELS[role] || role || 'مستخدم';

const SchoolDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [school, setSchool] = useState(null);
    const [staff, setStaff] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const { can } = usePermissions();

    const fetchSchoolDetails = useCallback(async () => {
        if (!id) return;
        try {
            const api = FirestoreApi.Api;
            
            // 1. Fetch School
            const allSchools = await api.getCollectionGroupDocuments('schools');
            const schDoc = allSchools.find(s => s.id === id);
            if (!schDoc) {
                console.error('School not found');
                return;
            }
            setSchool({ id: schDoc.id, ...schDoc.data() });

            // 2. Fetch Members (Teachers / Students)
            const membersRef = api.getGroupMembersCollection(id);
            const membersDocs = await api.getDocuments(membersRef);
            const memberData = membersDocs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Populate full user profiles
            const usersDocs = await api.getDocuments(api.getUsersCollection());
            const users = usersDocs.map(u => ({ id: u.id, ...u.data() }));
            setAllUsers(users);

            const userMap = {};
            users.forEach(u => userMap[u.id] = u);

            const detailedStaff = [];
            const detailedStudents = [];

            memberData.forEach(m => {
                const profile = userMap[m.userId];
                if (profile) {
                    if (profile.role === 'student' || m.type === 'student') detailedStudents.push(profile);
                    else detailedStaff.push(profile);
                }
            });

            setStaff(detailedStaff);
            setStudents(detailedStudents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSchoolDetails();
    }, [fetchSchoolDetails]);

    const assignUserToSchool = async (api, userToAssign) => {
      if (!userToAssign) return;
      const userRef = api.getUserDoc(userToAssign.id);
      await api.updateData({
        docRef: userRef,
        data: {
          schoolId: id,
          regionId: school.regionId || null
        }
      });

      const memberRef = api.getGroupMemberDoc(id, userToAssign.id);
      await api.setData({
        docRef: memberRef,
        data: {
          userId: userToAssign.id,
          type: userToAssign.role,
          timestamp: new Date().toISOString()
        },
        Overwrite: true
      });

      const mirrorRef = api.getUserMembershipMirrorDoc(userToAssign.id, id);
      await api.setData({
        docRef: mirrorRef,
        data: { schoolId: id, joinedAt: new Date().toISOString() }
      });

      if (userToAssign.role === 'student') {
        const legacyRef = api.getSchoolStudentDoc(id, userToAssign.id);
        await api.setData({
          docRef: legacyRef,
          data: {
            studentName: userToAssign.displayName,
            age: userToAssign.age || 0,
            schoolId: id
          },
          Overwrite: true
        });
      }
    };

    const handleAssignUser = async (userToAssign) => {
      if (!userToAssign || assigning) return;
      setAssigning(true);
      setAssignError('');
      try {
        const api = FirestoreApi.Api;
        await assignUserToSchool(api, userToAssign);
        setSelectedIds([]);
        setIsModalOpen(false);
        fetchSchoolDetails();
      } catch (err) {
        console.error(err);
        setAssignError('حدث خطأ أثناء التعيين.');
      } finally {
        setAssigning(false);
      }
    };

    const handleAssignSelected = async () => {
      if (selectedIds.length === 0 || assigning) return;
      setAssigning(true);
      setAssignError('');
      try {
        const api = FirestoreApi.Api;
        const selectedUsers = filteredUsers.filter((u) => selectedIds.includes(u.id));
        for (const u of selectedUsers) {
          await assignUserToSchool(api, u);
        }
        setSelectedIds([]);
        setIsModalOpen(false);
        fetchSchoolDetails();
      } catch (err) {
        console.error(err);
        setAssignError('حدث خطأ أثناء التعيين الجماعي.');
      } finally {
        setAssigning(false);
      }
    };

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!school) return <div className="empty-state">المدرسة غير موجودة</div>;

    const filteredUsers = allUsers.filter((u) => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !q ||
            u.displayName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q);
        const alreadyMember = staff.find((s) => s.id === u.id) || students.find((s) => s.id === u.id);
        return matchesSearch && !alreadyMember;
    });

    const renderStatCard = (label, value, IconComponent, color) => (
      <div className="surface-card school-details-stat-card">
          <div className="school-details-stat-card__icon" style={{ background: `${color}15`, color }}>
              <IconComponent size={24} />
          </div>
          <div>
              <p className="school-details-stat-card__label">{label}</p>
              <h3 className="school-details-stat-card__value">{value}</h3>
          </div>
      </div>
    );

    return (
        <div className="school-details-page">
            <PageHeader
              topRow={
                <div className="school-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/schools')}>
                    <ChevronRight size={20} aria-hidden /> إدارة المدارس
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>مدرسة: <span style={{ color: 'var(--md-primary)' }}>{school.name}</span></>}
              subtitle={schoolLevelSubtitle(school.schoolLevel)}
            />

            <div className="school-details-stats-row">
                {renderStatCard('إجمالي الطلاب', students.length, Users, '#f59e0b')}
                {renderStatCard('الكادر التعليمي', staff.length, School, 'var(--success-color)')}
                {renderStatCard('التقارير الميدانية', '...', FileText, 'var(--accent-color)')}
            </div>

            <div className="school-details-grid">
                {/* Teachers Section */}
                <div className="surface-card surface-card--lg school-details-panel">
                    <div className="school-details-panel__head">
                        <h2 className="school-details-panel__title">
                           <School size={18} color="var(--success-color)" /> طاقم التدريس والكادر
                        </h2>
                        <div className="school-details-panel__actions">
                            <div className="school-details-panel__search-wrap">
                                <Search size={14} className="school-details-panel__search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="بحث في الكادر..." 
                                    value={staffSearch}
                                    onChange={(e) => setStaffSearch(e.target.value)}
                                    className="school-details-panel__search-input"
                                />
                            </div>
                            {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                              <button className="icon-btn" title="إضافة عضو للمدرسة" onClick={() => { setIsModalOpen(true); setSelectedIds([]); }}><UserPlus size={18} /></button>
                            )}
                        </div>
                    </div>
                    {staff.filter(t => t.displayName?.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 ? <p className="school-details-panel__empty">لا يوجد نتائج للبحث.</p> : (
                        <div className="school-details-members-list">
                           {staff.filter(t => t.displayName?.toLowerCase().includes(staffSearch.toLowerCase())).map(t => (
                              <div key={t.id} className="school-details-member-item">
                                 <img src={t.photoURL || `https://ui-avatars.com/api/?name=${t.displayName}`} className="school-details-member-item__avatar" />
                                 <div className="school-details-member-item__body">
                                    <h4 className="school-details-member-item__name">{t.displayName}</h4>
                                    <p className="school-details-member-item__sub">{t.email}</p>
                                 </div>
                                 {can(PERMISSION_PAGE_IDS.schools, 'school_member_view_profile') && (
                                   <button onClick={() => navigate(`/users/${t.id}`)} className="icon-btn"><Info size={16}/></button>
                                 )}
                              </div>
                           ))}
                        </div>
                    )}
                </div>

                {/* Students Section */}
                <div className="surface-card surface-card--lg school-details-panel">
                    <div className="school-details-panel__head">
                        <h2 className="school-details-panel__title">
                           <Users size={18} color="#f59e0b" /> قائمة الطلاب المسجلين
                        </h2>
                        <div className="school-details-panel__actions">
                            <div className="school-details-panel__search-wrap">
                                <Search size={14} className="school-details-panel__search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="بحث في الطلاب..." 
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="school-details-panel__search-input"
                                />
                            </div>
                            {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                              <button className="icon-btn" title="إضافة عضو للمدرسة" onClick={() => { setIsModalOpen(true); setSelectedIds([]); }}><UserPlus size={18} /></button>
                            )}
                        </div>
                    </div>
                    {students.filter(s => s.displayName?.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 ? <p className="school-details-panel__empty">لا يوجد نتائج للبحث.</p> : (
                        <div className="school-details-members-list">
                           {students.filter(s => s.displayName?.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                              <div key={s.id} className="school-details-member-item">
                                 <img src={s.photoURL || `https://ui-avatars.com/api/?name=${s.displayName}`} className="school-details-member-item__avatar" />
                                 <div className="school-details-member-item__body">
                                    <h4 className="school-details-member-item__name">{s.displayName}</h4>
                                    <p className="school-details-member-item__sub">{s.phoneNumber || 'لا يوجد هاتف'}</p>
                                 </div>
                                 {can(PERMISSION_PAGE_IDS.schools, 'school_member_view_profile') && (
                                   <button onClick={() => navigate(`/users/${s.id}`)} className="icon-btn"><Info size={16}/></button>
                                 )}
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Assign Modal */}
            {isModalOpen && can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="surface-card surface-card--lg school-details-assign-modal" onClick={e => e.stopPropagation()}>
                        <div className="school-details-assign-modal__head">
                            <h3 style={{ margin: 0 }}>تعيين عضو للمدرسة</h3>
                            <button onClick={() => setIsModalOpen(false)} className="icon-btn"><X size={20}/></button>
                        </div>

                        <div className="school-details-assign-modal__search-wrap">
                            <Search size={18} className="school-details-assign-modal__search-icon" />
                            <input 
                              type="text" 
                              placeholder="بحث عن مستخدم (الاسم أو البريد)..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="app-input school-details-assign-modal__search-input"
                            />
                        </div>
                        {assignError && <div className="app-alert app-alert--error school-details-assign-modal__alert">{assignError}</div>}
                        {selectedIds.length > 0 && (
                          <div className="app-alert app-alert--info school-details-assign-modal__alert">
                            تم تحديد {selectedIds.length} عضو. يمكنك التعيين الجماعي الآن.
                          </div>
                        )}
                        <div className="school-details-assign-modal__toolbar">
                          <button
                            type="button"
                            className="google-btn google-btn--filled"
                            style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                            disabled={assigning || selectedIds.length === 0}
                            onClick={handleAssignSelected}
                          >
                            تعيين المحددين
                          </button>
                          <button
                            type="button"
                            className="google-btn"
                            style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                          >
                            إلغاء التحديد
                          </button>
                        </div>

                        <div className="school-details-assign-modal__list">
                            {filteredUsers.length === 0 ? <p className="school-details-assign-modal__empty">لا يوجد مستخدمين متاحين للتعيين.</p> : filteredUsers.map(u => (
                                <div key={u.id} className="school-details-assign-modal__item">
                                    <div className="school-details-assign-modal__item-main">
                                        <input
                                          type="checkbox"
                                          checked={selectedIds.includes(u.id)}
                                          onChange={(e) => {
                                            setSelectedIds((prev) =>
                                              e.target.checked ? [...prev, u.id] : prev.filter((idVal) => idVal !== u.id)
                                            );
                                          }}
                                        />
                                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="school-details-assign-modal__item-avatar" />
                                        <div>
                                            <div className="school-details-assign-modal__item-name">{u.displayName}</div>
                                            <div className="school-details-assign-modal__item-sub">
                                              {userRoleLabel(u.role)} {u.schoolId && u.schoolId !== id ? '(مرتبط بمدرسة أخرى)' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                      onClick={() => handleAssignUser(u)}
                                      disabled={assigning}
                                      className="google-btn google-btn--filled school-details-assign-modal__assign-btn"
                                    >
                                        <Check size={14} /> تعيين
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolDetailsPage;

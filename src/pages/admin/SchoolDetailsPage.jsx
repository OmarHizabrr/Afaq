import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { School, Users, FileText, ChevronRight, UserPlus, Info, Search, X, Check, Trash2, Plus, Printer, Edit2, RotateCcw, BarChart3 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
import { buildSchoolReportBodyHtml } from '../../utils/schoolReportHtml';
import { normalizeSchoolReportForDisplay } from '../../utils/schoolReportStars';
import { schoolReportSummaryLine } from '../../utils/reportLabels';
import { loadSchoolReportExport } from '../../utils/loadSchoolReportExport';
import LazyReportPrintPreviewModal from '../../components/LazyReportPrintPreviewModal';
import useAppTranslation from '../../hooks/useAppTranslation';

const getSchoolLevelSubtitle = (sl, t) =>
  sl === 'adults'
    ? t('pages.SchoolDetailsPage.نوع_الحلقة_كبار', 'نوع الحلقة: كبار')
    : sl === 'children'
      ? t('pages.SchoolDetailsPage.نوع_الحلقة_صغار', 'نوع الحلقة: صغار')
      : t('pages.SchoolDetailsPage.نوع_الحلقة_غير_محدد', 'نوع الحلقة: غير محدد');

const getUserRoleLabels = (t) => ({
  system_admin: t('pages.RegionDetailsPage.مدير_نظام_وصول_كامل', 'مدير نظام (وصول كامل)'),
  admin: t('pages.RegionDetailsPage.مدير_النظام', 'مدير النظام'),
  supervisor_arab: t('components.MessengerPanel.مشرف_عام', 'مشرف عام'),
  supervisor_local: t('components.MessengerPanel.مشرف_منطقة', 'مشرف منطقة'),
  teacher: t('components.MessengerPanel.معلم', 'معلم'),
  student: t('components.MessengerPanel.طالب', 'طالب'),
  unassigned: t('pages.SchoolDetailsPage.غير_معيّن', 'غير معيّن'),
});
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

const userRoleLabel = (role, userRoleLabels, t) =>
  userRoleLabels[role] || role || t('pages.SchoolDetailsPage.مستخدم', 'مستخدم');

const SchoolDetailsPage = () => {
  const { t } = useAppTranslation();
  const userRoleLabels = getUserRoleLabels(t);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
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
    const [assignRoleFilter, setAssignRoleFilter] = useState('all');
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();
    const [reportWorkingId, setReportWorkingId] = useState('');
    const [reportQuery, setReportQuery] = useState('');
    const [reportDateFrom, setReportDateFrom] = useState('');
    const [reportDateTo, setReportDateTo] = useState('');
    const [reportError, setReportError] = useState('');
    const [reportSuccess, setReportSuccess] = useState('');
    const [schoolReports, setSchoolReports] = useState([]);
    const [printPreviewRep, setPrintPreviewRep] = useState(null);
    const [printPdfExporting, setPrintPdfExporting] = useState(false);

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
            const schoolData = { id: schDoc.id, ...schDoc.data() };
            setSchool(schoolData);

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
                const memberUserId = m.userId || m.id;
                const profile = userMap[memberUserId];
                if (profile) {
                    if (profile.role === 'student' || m.type === 'student') detailedStudents.push(profile);
                    else detailedStaff.push(profile);
                }
            });

            setStaff(detailedStaff);
            setStudents(detailedStudents);

            // 4. Fetch school reports
            const allReports = await api.getCollectionGroupDocuments('reports');
            const reportRows = allReports
              .filter((r) => (r.data()?.schoolId || '') === id && r.data()?.reportType === 'school_supervision')
              .map((r) => ({
                id: r.id,
                ownerId: r.ref.parent.parent?.id || '',
                ...r.data(),
              }))
              .sort((a, b) => {
                const ad = new Date(a.timestamp || a.date || 0).getTime();
                const bd = new Date(b.timestamp || b.date || 0).getTime();
                return bd - ad;
              });
            setSchoolReports(reportRows);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSchoolDetails();
    }, [fetchSchoolDetails]);

    useEffect(() => {
      if (!reportSuccess) return;
      const t = setTimeout(() => setReportSuccess(''), 3500);
      return () => clearTimeout(t);
    }, [reportSuccess]);

    useEffect(() => {
      if (!reportError) return;
      const t = setTimeout(() => setReportError(''), 5000);
      return () => clearTimeout(t);
    }, [reportError]);

    useEffect(() => {
      if (!assignError) return;
      const t = setTimeout(() => setAssignError(''), 5000);
      return () => clearTimeout(t);
    }, [assignError]);

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
        setAssignError(t('pages.RegionDetailsPage.حدث_خطأ_أثناء_التعيين', 'حدث خطأ أثناء التعيين.'));
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
        setAssignError(t('pages.SchoolDetailsPage.حدث_خطأ_أثناء_التعيين_الجماعي', 'حدث خطأ أثناء التعيين الجماعي.'));
      } finally {
        setAssigning(false);
      }
    };

    const removeMemberFromSchool = async (memberUser) => {
      if (!id || !memberUser?.id || assigning) return;
      const label = memberUser.displayName || memberUser.id;
      if (
        !window.confirm(
          `إزالة «${label}» من هذه المدرسة؟\n\nيُحذف ربط العضوية (members + مرآة Mygroup) وسجل الطالب في المدرسة إن وُجد، ويُحدَّث الملف عند الحاجة.`
        )
      ) {
        return;
      }
      setAssigning(true);
      setAssignError('');
      try {
        const api = FirestoreApi.Api;
        const memberId = memberUser.id;
        const profile = (await api.getData(api.getUserDoc(memberId))) || {};

        await api.deleteData(api.getGroupMemberDoc(id, memberId));
        await api.deleteData(api.getUserMembershipMirrorDoc(memberId, id));
        try {
          await api.deleteData(api.getSchoolStudentDoc(id, memberId));
        } catch {
          /* لا يوجد سجل في students/{schoolId}/students */
        }

        const uForList = { uid: memberId, id: memberId, ...profile };
        if ((uForList.schoolId || '') === id) uForList.schoolId = '';
        const nextSchools = await api.listUserSchoolIdsFromMirrors(uForList);
        const nextPrimary = nextSchools[0] || '';

        const patch = {};
        if ((profile.schoolId || '') === id) patch.schoolId = nextPrimary || '';
        if ((profile.primarySchoolId || '') === id) {
          patch.primarySchoolId = nextPrimary || '';
          if (nextPrimary) {
            const allSch = await api.getCollectionGroupDocuments('schools');
            const sch = allSch.find((s) => s.id === nextPrimary);
            const d = sch?.data() || {};
            patch.villageId = d.villageId || sch?.ref?.parent?.parent?.id || '';
          } else {
            patch.villageId = '';
          }
        }
        if (Object.keys(patch).length > 0) {
          await api.updateData({
            docRef: api.getUserDoc(memberId),
            data: patch,
            merge: true,
          });
        }

        await fetchSchoolDetails();
      } catch (err) {
        console.error(err);
        setAssignError(t('pages.SchoolDetailsPage.تعذر_إزالة_العضو_من_المدرسة', 'تعذر إزالة العضو من المدرسة.'));
      } finally {
        setAssigning(false);
      }
    };

    useEffect(() => {
      if (!school?.id) return;
      if (loading) return;
      const qp = new URLSearchParams(location.search || '');
      const shouldCompose = qp.get('composeReport') === '1';
      if (!shouldCompose) return;
      if (!can(PERMISSION_PAGE_IDS.schools, 'school_report_create')) return;
      navigate(`/schools/${id}/report`, { replace: true });
    }, [location.search, school, loading, can, navigate, id]);

    const handleDeleteSchoolReport = async (reportItem) => {
      if (!reportItem?.id || !reportItem?.ownerId || reportWorkingId) return;
      if (!window.confirm(`حذف التقرير «${reportItem.reportTitle || reportItem.id}» نهائياً؟`)) return;
      setReportWorkingId(reportItem.id);
      setReportError('');
      setReportSuccess('');
      try {
        const api = FirestoreApi.Api;
        await api.deleteData(api.getSupervisorReportDoc(reportItem.ownerId, reportItem.id));
        setReportSuccess(t('pages.SchoolDetailsPage.تم_حذف_التقرير_بنجاح', 'تم حذف التقرير بنجاح.'));
        await fetchSchoolDetails();
      } catch (err) {
        console.error(err);
        setReportError(t('pages.ReportDetailsPage.تعذر_حذف_التقرير', 'تعذر حذف التقرير.'));
      } finally {
        setReportWorkingId('');
      }
    };

    const handlePrintSchoolReport = (rep) => {
      setPrintPreviewRep(
        normalizeSchoolReportForDisplay({
          ...rep,
          schoolName: rep.schoolName || school?.name,
        })
      );
    };

    if (loading) return <div className="loading-spinner page-loading-lg" />;
    if (!school) return <div className="empty-state">المدرسة غير موجودة</div>;

    const schoolScope = pageDataScope(PERMISSION_PAGE_IDS.schools);
    if (
      ready &&
      !membershipLoading &&
      schoolScope === DATA_SCOPE_MEMBERSHIP &&
      id &&
      !membershipGroupIds.has(id)
    ) {
      return <Navigate to="/schools" replace />;
    }

    const filteredUsers = allUsers.filter((u) => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !q ||
            u.displayName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q);
        const alreadyMember = staff.find((s) => s.id === u.id) || students.find((s) => s.id === u.id);
        const role = u.role || 'unassigned';
        const matchesRole = assignRoleFilter === 'all' || role === assignRoleFilter;
        return matchesSearch && matchesRole && !alreadyMember;
    });
    const assignRoleCounts = ASSIGN_ROLE_FILTER_ORDER.reduce((acc, rid) => {
      if (rid === 'all') {
        const q = searchTerm.trim().toLowerCase();
        acc.all = allUsers.filter((u) => {
          const alreadyMember = staff.find((s) => s.id === u.id) || students.find((s) => s.id === u.id);
          const matchesSearch =
            !q ||
            u.displayName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q);
          return !alreadyMember && matchesSearch;
        }).length;
        return acc;
      }
      const q = searchTerm.trim().toLowerCase();
      acc[rid] = allUsers.filter((u) => {
        const alreadyMember = staff.find((s) => s.id === u.id) || students.find((s) => s.id === u.id);
        const role = u.role || 'unassigned';
        const matchesSearch =
          !q ||
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q);
        return !alreadyMember && role === rid && matchesSearch;
      }).length;
      return acc;
    }, {});

    const renderStatCard = (label, value, IconComponent, tone) => (
      <div className="surface-card school-details-stat-card">
          <div className={`school-details-stat-card__icon stat-tone--${tone}`}>
              <IconComponent size={24} />
          </div>
          <div>
              <p className="school-details-stat-card__label">{label}</p>
              <h3 className="school-details-stat-card__value">{value}</h3>
          </div>
      </div>
    );
    const filteredReports = schoolReports.filter((rep) => {
      const q = reportQuery.trim().toLowerCase();
      const title = String(rep.reportTitle || '').toLowerCase();
      const sup = String(rep.supervisorName || '').toLowerCase();
      const date = String(rep.date || rep.timestamp?.split('T')[0] || '');
      const matchesQuery = !q || title.includes(q) || sup.includes(q) || date.includes(q);
      const dayTs = new Date(date || rep.timestamp || 0).getTime();
      const fromTs = reportDateFrom ? new Date(reportDateFrom).getTime() : null;
      const toTs = reportDateTo ? new Date(reportDateTo).getTime() : null;
      const matchesFrom = fromTs == null || dayTs >= fromTs;
      const matchesTo = toTs == null || dayTs <= toTs + 86399999;
      return matchesQuery && matchesFrom && matchesTo;
    });

    return (
        <div className="school-details-page portal-page">
            <PageHeader
              topRow={
                <div className="school-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/schools')}>
                    <ChevronRight size={20} aria-hidden /> إدارة المدارس
                  </button>
                  <ChevronRight size={16} className="page-nav-separator" aria-hidden />
                </div>
              }
              title={<>مدرسة: <span className="page-header-accent">{school.name}</span></>}
              subtitle={getSchoolLevelSubtitle(school.schoolLevel, t)}
            >
              {can(PERMISSION_PAGE_IDS.schools, 'school_report_create') && (
                <>
                  <button type="button" className="google-btn google-btn--toolbar" onClick={() => navigate(`/schools/${id}/report`)}>
                    <Plus size={16} />
                    <span className="school-details-toolbar__long">إضافة تقرير</span>
                    <span className="school-details-toolbar__short">تقرير</span>
                  </button>
                  <button type="button" className="google-btn google-btn--toolbar" onClick={() => navigate(`/schools/${id}/comprehensive-report`)}>
                    <BarChart3 size={16} />
                    <span className="school-details-toolbar__long">تقرير شامل</span>
                    <span className="school-details-toolbar__short">شامل</span>
                  </button>
                </>
              )}
            </PageHeader>
            {reportError && (
              <div className="app-alert app-alert--error app-alert--dismissible school-details-page-alert">
                <span>{reportError}</span>
                <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setReportError('')}>
                  <X size={14} />
                </button>
              </div>
            )}
            {reportSuccess && (
              <div className="app-alert app-alert--success app-alert--dismissible school-details-page-alert">
                <span>{reportSuccess}</span>
                <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setReportSuccess('')}>
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="school-details-stats-row">
                {renderStatCard(t('pages.DashboardPage.إجمالي_الطلاب', 'إجمالي الطلاب'), students.length, Users, 'amber')}
                {renderStatCard(t('pages.SchoolDetailsPage.الكادر_التعليمي', 'الكادر التعليمي'), staff.length, School, 'success')}
                {renderStatCard(t('pages.SchoolDetailsPage.التقارير_الميدانية', 'التقارير الميدانية'), schoolReports.length, FileText, 'accent')}
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
                                    placeholder={t('pages.SchoolDetailsPage.بحث_في_الكادر', 'بحث في الكادر...')} 
                                    value={staffSearch}
                                    onChange={(e) => setStaffSearch(e.target.value)}
                                    className="school-details-panel__search-input"
                                />
                            </div>
                            {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                              <button className="icon-btn" title={t('pages.SchoolDetailsPage.إضافة_عضو_للمدرسة', 'إضافة عضو للمدرسة')} onClick={() => { setIsModalOpen(true); setSelectedIds([]); setAssignRoleFilter('all'); }}><UserPlus size={18} /></button>
                            )}
                        </div>
                    </div>
                    {assignError && (
                      <div className="app-alert app-alert--error app-alert--dismissible school-details-page-alert">
                        <span>{assignError}</span>
                        <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setAssignError('')}>
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {staff.filter(t => t.displayName?.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 ? <p className="school-details-panel__empty">لا يوجد نتائج للبحث.</p> : (
                        <div className="school-details-members-list">
                           {staff.filter(t => t.displayName?.toLowerCase().includes(staffSearch.toLowerCase())).map(t => (
                              <div key={t.id} className="school-details-member-item">
                                 <img src={t.photoURL || `https://ui-avatars.com/api/?name=${t.displayName}`} className="school-details-member-item__avatar" />
                                 <div className="school-details-member-item__body">
                                    <h4 className="school-details-member-item__name">{t.displayName}</h4>
                                    <p className="school-details-member-item__sub">{t.email}</p>
                                 </div>
                                 <div className="school-details-member-item__actions">
                                 {can(PERMISSION_PAGE_IDS.schools, 'school_member_view_profile') && (
                                   <button type="button" onClick={() => navigate(`/users/${t.id}`)} className="icon-btn" title="عرض الملف"><Info size={16}/></button>
                                 )}
                                 {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                                  <BusyButton type="button" onClick={() => removeMemberFromSchool(t)} className="icon-btn" title="إزالة من المدرسة" busy={assigning}>
                                     <Trash2 size={16} color="var(--danger-color)" />
                                  </BusyButton>
                                 )}
                                 </div>
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
                                    placeholder={t('pages.SchoolDetailsPage.بحث_في_الطلاب', 'بحث في الطلاب...')} 
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="school-details-panel__search-input"
                                />
                            </div>
                            {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                              <button className="icon-btn" title={t('pages.SchoolDetailsPage.إضافة_عضو_للمدرسة', 'إضافة عضو للمدرسة')} onClick={() => { setIsModalOpen(true); setSelectedIds([]); setAssignRoleFilter('all'); }}><UserPlus size={18} /></button>
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
                                 <div className="school-details-member-item__actions">
                                 {can(PERMISSION_PAGE_IDS.schools, 'school_member_view_profile') && (
                                   <button type="button" onClick={() => navigate(`/students/${s.id}`)} className="icon-btn" title="عرض ملف الطالب"><Info size={16}/></button>
                                 )}
                                 {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                                  <BusyButton type="button" onClick={() => removeMemberFromSchool(s)} className="icon-btn" title="إزالة من المدرسة" busy={assigning}>
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

            <div className="surface-card surface-card--lg school-details-panel school-details-panel--reports">
              <div className="school-details-panel__head">
                <h2 className="school-details-panel__title">
                  <FileText size={18} color="var(--accent-color)" /> تقارير المدرسة
                </h2>
              </div>
              <div className="school-details-report-filters">
                <input
                  className="app-input"
                  placeholder={t('pages.SchoolDetailsPage.بحث_بالعنوان_المشرف_التاريخ', 'بحث بالعنوان/المشرف/التاريخ...')}
                  value={reportQuery}
                  onChange={(e) => setReportQuery(e.target.value)}
                />
                <input className="app-input" type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} />
                <input className="app-input" type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} />
                <button
                  type="button"
                  className="google-btn school-details-report-filters__clear"
                  onClick={() => {
                    setReportQuery('');
                    setReportDateFrom('');
                    setReportDateTo('');
                  }}
                >
                  <span className="btn-inner btn-inner--sm">
                    <RotateCcw size={14} aria-hidden /> مسح
                  </span>
                </button>
              </div>
              {filteredReports.length === 0 ? (
                <p className="school-details-panel__empty">
                  {schoolReports.length === 0
                    ? t('pages.SchoolDetailsPage.لا_توجد_تقارير_محفوظة_لهذه_المدرسة_حتى_الآن', 'لا توجد تقارير محفوظة لهذه المدرسة حتى الآن.')
                    : t('pages.SchoolDetailsPage.لا_توجد_نتائج_مطابقة_للفلاتر_الحالية', 'لا توجد نتائج مطابقة للفلاتر الحالية.')}
                </p>
              ) : (
                <div className="school-details-members-list">
                  {filteredReports.map((rep) => (
                    <div key={rep.id} className="school-details-member-item">
                      <div className="school-details-member-item__body">
                        <h4 className="school-details-member-item__name">{rep.reportTitle || 'تقرير إشراف مدرسة'}</h4>
                        <p className="school-details-member-item__sub">
                          {rep.date || rep.timestamp?.split('T')[0] || '-'} • المشرف: {rep.supervisorName || t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد')} • {schoolReportSummaryLine(rep)}
                        </p>
                      </div>
                      <div className="school-details-member-item__actions">
                        {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                          <button type="button" className="icon-btn" title="عرض التقرير" onClick={() => navigate(`/schools/${id}/report/${rep.id}?ownerId=${rep.ownerId || rep.supervisorId || ''}&view=1`)}>
                            <Info size={16} />
                          </button>
                        )}
                        {can(PERMISSION_PAGE_IDS.reports, 'report_edit') && (
                          <button type="button" className="icon-btn" title="تعديل التقرير" onClick={() => navigate(`/schools/${id}/report/${rep.id}?ownerId=${rep.ownerId || rep.supervisorId || ''}`)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                          <button type="button" className="icon-btn" title="معاينة وطباعة التقرير" onClick={() => handlePrintSchoolReport(rep)}>
                            <Printer size={16} />
                          </button>
                        )}
                        {can(PERMISSION_PAGE_IDS.reports, 'report_delete') && (
                          <BusyButton
                            type="button"
                            className="icon-btn"
                            title="حذف التقرير"
                            busy={reportWorkingId === rep.id}
                            onClick={() => handleDeleteSchoolReport(rep)}
                          >
                            <Trash2 size={16} color="var(--danger-color)" />
                          </BusyButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Assign Modal */}
            {isModalOpen && can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="surface-card surface-card--lg school-details-assign-modal" onClick={e => e.stopPropagation()}>
                        <div className="school-details-assign-modal__head">
                            <h3 className="school-details-assign-modal__title">تعيين عضو للمدرسة</h3>
                            <button onClick={() => setIsModalOpen(false)} className="icon-btn"><X size={20}/></button>
                        </div>

                        <div className="school-details-assign-modal__search-wrap">
                            <Search size={18} className="school-details-assign-modal__search-icon" />
                            <input 
                              type="text" 
                              placeholder={t('pages.SchoolDetailsPage.بحث_عن_مستخدم_الاسم_أو_البريد', 'بحث عن مستخدم (الاسم أو البريد)...')} 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="app-input school-details-assign-modal__search-input"
                            />
                        </div>
                        <div className="role-filter-bar school-details-assign-modal__filters">
                          {ASSIGN_ROLE_FILTER_ORDER.map((rid) => (
                            <button
                              key={rid}
                              type="button"
                              className={`role-filter-btn ${assignRoleFilter === rid ? 'role-filter-btn--active' : ''}`}
                              onClick={() => setAssignRoleFilter(rid)}
                            >
                              {(rid === 'all' ? t('pages.RegionDetailsPage.الكل', 'الكل') : userRoleLabel(rid, userRoleLabels, t))} ({assignRoleCounts[rid] || 0})
                            </button>
                          ))}
                        </div>
                        {assignError && <div className="app-alert app-alert--error school-details-assign-modal__alert">{assignError}</div>}
                        {selectedIds.length > 0 && (
                          <div className="app-alert app-alert--info school-details-assign-modal__alert">
                            تم تحديد {selectedIds.length} عضو. يمكنك التعيين الجماعي الآن.
                          </div>
                        )}
                        <div className="school-details-assign-modal__toolbar">
                          <BusyButton
                            type="button"
                            className="google-btn google-btn--filled school-details-assign-modal__toolbar-btn"
                            disabled={selectedIds.length === 0}
                            busy={assigning}
                            onClick={handleAssignSelected}
                          >
                            <span className="btn-inner btn-inner--sm">
                              <Check size={14} aria-hidden /> تعيين المحددين
                            </span>
                          </BusyButton>
                          <button
                            type="button"
                            className="google-btn school-details-assign-modal__toolbar-btn"
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                          >
                            <span className="btn-inner btn-inner--sm">
                              <X size={14} aria-hidden /> إلغاء التحديد
                            </span>
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
                                              {userRoleLabel(u.role, userRoleLabels, t)} {u.schoolId && u.schoolId !== id ? t('pages.SchoolDetailsPage.مرتبط_بمدرسة_أخرى', '(مرتبط بمدرسة أخرى)') : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <BusyButton
                                      type="button"
                                      onClick={() => handleAssignUser(u)}
                                      busy={assigning}
                                      className="google-btn google-btn--filled school-details-assign-modal__assign-btn"
                                    >
                                      <span className="btn-inner btn-inner--sm">
                                        <Check size={14} aria-hidden /> تعيين
                                      </span>
                                    </BusyButton>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <LazyReportPrintPreviewModal
              open={Boolean(printPreviewRep)}
              onClose={() => setPrintPreviewRep(null)}
              title={t('pages.SchoolDetailsPage.معاينة_تقرير_المدرسة', 'معاينة تقرير المدرسة')}
              bodyHtml={printPreviewRep ? buildSchoolReportBodyHtml(printPreviewRep, t) : ''}
              pdfExporting={printPdfExporting}
              onDownloadPdf={async () => {
                if (!printPreviewRep) return;
                setPrintPdfExporting(true);
                try {
                  const { exportSchoolReportPdf } = await loadSchoolReportExport();
                  await exportSchoolReportPdf(printPreviewRep);
                } finally {
                  setPrintPdfExporting(false);
                }
              }}
              onDownloadExcel={async () => {
                if (!printPreviewRep) return;
                const { exportSchoolReportExcel } = await loadSchoolReportExport();
                exportSchoolReportExcel(printPreviewRep);
              }}
            />
        </div>
    );
};

export default SchoolDetailsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { School, Users, FileText, ChevronRight, UserPlus, Info, Search, X, Check, Trash2, Plus, Printer, Edit2, RotateCcw, Save, Square, CheckSquare } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';

const schoolLevelSubtitle = (sl) =>
  sl === 'adults' ? 'نوع الحلقة: كبار' : sl === 'children' ? 'نوع الحلقة: صغار' : 'نوع الحلقة: غير محدد';

const USER_ROLE_LABELS = {
  system_admin: 'مدير نظام (وصول كامل)',
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام',
  supervisor_local: 'مشرف منطقة',
  teacher: 'معلم',
  student: 'طالب',
  unassigned: 'غير معيّن',
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

const userRoleLabel = (role) => USER_ROLE_LABELS[role] || role || 'مستخدم';
const DAY_OPTIONS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const QUALITY_OPTIONS = ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف'];

const formatDateInput = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTimeInput = (d = new Date()) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const safeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const ReportField = ({ label, children }) => (
  <label className="report-field">
    <span className="report-field__label">{label}</span>
    {children}
  </label>
);

const SchoolDetailsPage = () => {
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
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = usePermissions();
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportSaving, setReportSaving] = useState(false);
    const [reportError, setReportError] = useState('');
    const [reportSuccess, setReportSuccess] = useState('');
    const [schoolReports, setSchoolReports] = useState([]);
    const [curriculumList, setCurriculumList] = useState([]);
    const [reportWorkingId, setReportWorkingId] = useState('');
    const [reportQuery, setReportQuery] = useState('');
    const [reportDateFrom, setReportDateFrom] = useState('');
    const [reportDateTo, setReportDateTo] = useState('');
    const [editingReportMeta, setEditingReportMeta] = useState(null);
    const [geoDefaults, setGeoDefaults] = useState({
      villageName: '',
      regionName: '',
      governorateName: '',
      country: '',
    });
    const [reportForm, setReportForm] = useState({
      reportTitle: 'تقرير إشراف على المدارس',
      teacherIds: [],
      teacherPhoneMap: {},
      village: '',
      groupName: '',
      day: DAY_OPTIONS[new Date().getDay()],
      date: formatDateInput(),
      governorate: '',
      country: '',
      arrivalTime: formatTimeInput(),
      departureTime: '',
      totalStudents: 0,
      presentCount: 0,
      absenceReview: '',
      studentLevel: 'جيد',
      curriculumProgress: 'جيد',
      quran: '',
      aqeedah: '',
      fiqh: '',
      hadith: '',
      seerah: '',
      noorAlBayan: '',
      schoolEvaluation: 'جيد',
      teacherEvaluation: 'جيد',
      marketDone: '',
      mealsCount: '',
      supervisorName: '',
      projectsOfficerName: '',
      notes: '',
      absentStudentIds: [],
      starAwards: [],
      curriculumBySubjectId: {},
    });

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

            const allVillages = await api.getCollectionGroupDocuments('villages');
            const allRegions = await api.getCollectionGroupDocuments('regions');
            const allGovernorates = await api.getDocuments(api.getGovernoratesCollection());
            const villageDoc = allVillages.find((v) => v.id === schoolData.villageId);
            const resolvedRegionId = schoolData.regionId || villageDoc?.data()?.regionId || '';
            const regionDoc = allRegions.find((r) => r.id === resolvedRegionId);
            const govId = regionDoc?.data()?.govId || '';
            const govDoc = allGovernorates.find((g) => g.id === govId);
            setGeoDefaults({
              villageName: villageDoc?.data()?.villageName || schoolData.villageName || '',
              regionName: regionDoc?.data()?.name || '',
              governorateName: govDoc?.data()?.name || schoolData.governorate || '',
              country: govDoc?.data()?.country || schoolData.country || '',
            });

            // 2. Fetch Members (Teachers / Students)
            const membersRef = api.getGroupMembersCollection(id);
            const membersDocs = await api.getDocuments(membersRef);
            const memberData = membersDocs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Populate full user profiles
            const usersDocs = await api.getDocuments(api.getUsersCollection());
            const users = usersDocs.map(u => ({ id: u.id, ...u.data() }));
            setAllUsers(users);
            const curriculumDocs = await api.getDocuments(api.getCurriculumCollection());
            setCurriculumList(curriculumDocs.map((d) => ({ id: d.id, ...d.data() })));

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
              .filter((r) => (r.data()?.schoolId || '') === id)
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
        setAssignError('تعذر إزالة العضو من المدرسة.');
      } finally {
        setAssigning(false);
      }
    };

    const openReportModal = useCallback(() => {
      const now = new Date();
      const teacherRows = staff.filter((u) => u.role === 'teacher');
      const defaultTeacherIds = teacherRows[0]?.id ? [teacherRows[0].id] : [];
      const teacherPhoneMap = teacherRows.reduce((acc, t) => {
        acc[t.id] = t.phoneNumber || '';
        return acc;
      }, {});
      const defaultStars = students.slice(0, 5).map((s, idx) => ({
        studentId: s.id,
        name: s.displayName || '',
        stars: Math.max(1, 5 - idx),
      }));
      const curriculumBySubjectId = {};
      curriculumList.forEach((subj) => {
        curriculumBySubjectId[subj.id] = '';
      });
      setReportForm({
        reportTitle: 'تقرير إشراف على المدارس',
        teacherIds: defaultTeacherIds,
        teacherPhoneMap,
        village: geoDefaults.villageName || school.villageName || school.village || '',
        groupName: school.name || '',
        day: DAY_OPTIONS[now.getDay()],
        date: formatDateInput(now),
        governorate: geoDefaults.governorateName || school.governorate || '',
        country: geoDefaults.country || school.country || '',
        arrivalTime: formatTimeInput(now),
        departureTime: '',
        totalStudents: students.length,
        presentCount: students.length,
        absenceReview: '',
        studentLevel: 'جيد',
        curriculumProgress: 'جيد',
        quran: '',
        aqeedah: '',
        fiqh: '',
        hadith: '',
        seerah: '',
        noorAlBayan: '',
        schoolEvaluation: 'جيد',
        teacherEvaluation: 'جيد',
        marketDone: '',
        mealsCount: '',
        supervisorName: actorUser?.displayName || '',
        projectsOfficerName: '',
        notes: '',
        absentStudentIds: [],
        starAwards: defaultStars,
        curriculumBySubjectId,
      });
      setReportError('');
      setReportSuccess('');
      setEditingReportMeta(null);
      setIsReportModalOpen(true);
    }, [staff, students, school, actorUser, geoDefaults, curriculumList]);

    useEffect(() => {
      if (!school?.id) return;
      if (loading) return;
      const qp = new URLSearchParams(location.search || '');
      const shouldCompose = qp.get('composeReport') === '1';
      if (!shouldCompose) return;
      if (!can(PERMISSION_PAGE_IDS.schools, 'school_report_create')) return;
      openReportModal();
      navigate(`/schools/${id}`, { replace: true });
    }, [location.search, school, loading, can, navigate, id, openReportModal]);

    const openEditReportModal = (rep) => {
      const teacherPhoneMap = {};
      const teacherIds = [];
      (rep.teachers || []).forEach((t) => {
        if (t.teacherId) teacherIds.push(t.teacherId);
        if (t.teacherId) teacherPhoneMap[t.teacherId] = t.phone || '';
      });
      const curriculumBySubjectId = {};
      if (Array.isArray(rep.curriculumItems) && rep.curriculumItems.length > 0) {
        rep.curriculumItems.forEach((it) => {
          if (it.subjectId) curriculumBySubjectId[it.subjectId] = it.content || '';
        });
      } else {
        curriculumList.forEach((subj) => {
          const nm = String(subj.name || '').trim();
          const legacy = rep.lessonCoverage || {};
          curriculumBySubjectId[subj.id] = legacy[nm] || '';
        });
      }
      setReportForm({
        reportTitle: rep.reportTitle || 'تقرير إشراف على المدارس',
        teacherIds,
        teacherPhoneMap,
        village: rep.villageName || '',
        groupName: rep.groupName || rep.schoolName || '',
        day: rep.dayName || DAY_OPTIONS[new Date().getDay()],
        date: rep.date || formatDateInput(),
        governorate: rep.governorate || '',
        country: rep.country || '',
        arrivalTime: rep.arrivalTime || '',
        departureTime: rep.departureTime || '',
        totalStudents: rep.totalStudents ?? students.length,
        presentCount: rep.presentCount ?? Math.max(Number(rep.totalStudents ?? students.length) - Number((rep.absentStudents || []).length), 0),
        absenceReview: rep.absenceReview || '',
        studentLevel: rep.studentLevel || 'جيد',
        curriculumProgress: rep.curriculumProgress || 'جيد',
        quran: rep.lessonCoverage?.quran || '',
        aqeedah: rep.lessonCoverage?.aqeedah || '',
        fiqh: rep.lessonCoverage?.fiqh || '',
        hadith: rep.lessonCoverage?.hadith || '',
        seerah: rep.lessonCoverage?.seerah || '',
        noorAlBayan: rep.lessonCoverage?.noorAlBayan || '',
        schoolEvaluation: rep.schoolEvaluation || 'جيد',
        teacherEvaluation: rep.teacherEvaluation || 'جيد',
        marketDone: rep.marketDone || '',
        mealsCount: rep.mealsCount ?? '',
        supervisorName: rep.supervisorName || actorUser?.displayName || '',
        projectsOfficerName: rep.projectsOfficerName || '',
        notes: rep.notes || '',
        absentStudentIds: (rep.absentStudents || []).map((s) => s.studentId).filter(Boolean),
        starAwards: rep.starAwards || [],
        curriculumBySubjectId,
      });
      setEditingReportMeta({ id: rep.id, ownerId: rep.ownerId });
      setReportError('');
      setReportSuccess('');
      setIsReportModalOpen(true);
    };

    const updateReportAbsences = useCallback((nextAbsentIds) => {
      setReportForm((p) => {
        const total = Number(p.totalStudents || 0);
        return {
          ...p,
          absentStudentIds: nextAbsentIds,
          presentCount: Math.max(total - nextAbsentIds.length, 0),
        };
      });
    }, []);

    const toggleAllAbsentStudents = useCallback(() => {
      const allIds = students.map((s) => s.id);
      const allSelected = allIds.length > 0 && reportForm.absentStudentIds.length === allIds.length;
      updateReportAbsences(allSelected ? [] : allIds);
    }, [students, reportForm.absentStudentIds.length, updateReportAbsences]);

    const toggleTeacherSelection = (teacherId) => {
      setReportForm((prev) => {
        const exists = prev.teacherIds.includes(teacherId);
        const nextTeacherIds = exists
          ? prev.teacherIds.filter((idVal) => idVal !== teacherId)
          : [...prev.teacherIds, teacherId];
        return { ...prev, teacherIds: nextTeacherIds };
      });
    };

    const handleSaveSchoolReport = async () => {
      if (reportSaving) return;
      if (!reportForm.teacherIds.length) {
        setReportError('يرجى اختيار معلم واحد على الأقل.');
        return;
      }
      setReportSaving(true);
      setReportError('');
      setReportSuccess('');
      try {
        const api = FirestoreApi.Api;
        const actorId = actorUser?.uid || actorUser?.id || 'school-admin';
        const reportId = editingReportMeta?.id || api.getNewId('reports');
        const ownerId = editingReportMeta?.ownerId || actorId;
        const selectedTeachers = staff.filter((t) => reportForm.teacherIds.includes(t.id));
        const teachersPayload = selectedTeachers.map((t) => ({
          teacherId: t.id,
          teacherName: t.displayName || '',
          phone: reportForm.teacherPhoneMap[t.id] || t.phoneNumber || '',
        }));
        const absentStudents = students
          .filter((s) => reportForm.absentStudentIds.includes(s.id))
          .map((s) => ({ studentId: s.id, studentName: s.displayName || '' }));
        const curriculumItems = curriculumList.map((subj) => ({
          subjectId: subj.id,
          subjectName: subj.name || subj.id,
          content: reportForm.curriculumBySubjectId?.[subj.id] || '',
        }));
        const legacyLessonCoverage = {};
        curriculumItems.forEach((it) => {
          legacyLessonCoverage[it.subjectName] = it.content;
        });

        const payload = {
          reportType: 'school_supervision',
          reportTitle: reportForm.reportTitle,
          supervisorId: actorId,
          supervisorName: reportForm.supervisorName || actorUser?.displayName || '',
          schoolId: id,
          schoolName: school.name || '',
          regionId: school.regionId || '',
          villageId: school.villageId || '',
          villageName: reportForm.village || '',
          groupName: reportForm.groupName || '',
          dayName: reportForm.day,
          date: reportForm.date,
          governorate: reportForm.governorate || '',
          country: reportForm.country || '',
          arrivalTime: reportForm.arrivalTime || '',
          departureTime: reportForm.departureTime || '',
          totalStudents: Number(reportForm.totalStudents || 0),
          presentCount: Number(reportForm.presentCount || 0),
          absentCount: Math.max(
            0,
            Number(reportForm.totalStudents || 0) - Number(reportForm.presentCount || 0)
          ),
          absenceReview: reportForm.absenceReview || '',
          absentStudents,
          studentLevel: reportForm.studentLevel || '',
          curriculumProgress: reportForm.curriculumProgress || '',
          lessonCoverage: legacyLessonCoverage,
          curriculumItems,
          schoolEvaluation: reportForm.schoolEvaluation || '',
          teacherEvaluation: reportForm.teacherEvaluation || '',
          marketDone: reportForm.marketDone || '',
          mealsCount: Number(reportForm.mealsCount || 0),
          teachers: teachersPayload,
          starAwards: reportForm.starAwards,
          projectsOfficerName: reportForm.projectsOfficerName || '',
          notes: reportForm.notes || '',
          timestamp: new Date().toISOString(),
        };

        await api.setData({
          docRef: api.getSupervisorReportDoc(ownerId, reportId),
          data: payload,
          userData: actorUser || {},
        });

        setReportSuccess(editingReportMeta ? 'تم تحديث التقرير بنجاح.' : 'تم حفظ تقرير المدرسة بنجاح.');
        setIsReportModalOpen(false);
        setEditingReportMeta(null);
        await fetchSchoolDetails();
      } catch (err) {
        console.error(err);
        setReportError('تعذر حفظ التقرير حالياً.');
      } finally {
        setReportSaving(false);
      }
    };

    const handleDeleteSchoolReport = async (reportItem) => {
      if (!reportItem?.id || !reportItem?.ownerId || reportWorkingId) return;
      if (!window.confirm(`حذف التقرير «${reportItem.reportTitle || reportItem.id}» نهائياً؟`)) return;
      setReportWorkingId(reportItem.id);
      setReportError('');
      setReportSuccess('');
      try {
        const api = FirestoreApi.Api;
        await api.deleteData(api.getSupervisorReportDoc(reportItem.ownerId, reportItem.id));
        setReportSuccess('تم حذف التقرير بنجاح.');
        await fetchSchoolDetails();
      } catch (err) {
        console.error(err);
        setReportError('تعذر حذف التقرير.');
      } finally {
        setReportWorkingId('');
      }
    };

    const handlePrintSchoolReport = (rep) => {
      const teachers = Array.isArray(rep.teachers) ? rep.teachers : [];
      const absentStudents = Array.isArray(rep.absentStudents) ? rep.absentStudents : [];
      const starAwards = Array.isArray(rep.starAwards) ? rep.starAwards : [];
      const lessons = rep.lessonCoverage || {};
      const curriculumItems = Array.isArray(rep.curriculumItems)
        ? rep.curriculumItems
        : Object.entries(lessons).map(([subjectName, content], idx) => ({
            subjectId: String(idx),
            subjectName,
            content,
          }));

      const teachersHtml =
        teachers.length > 0
          ? teachers
              .map(
                (t, idx) =>
                  `<tr><td>${idx + 1}</td><td>${safeHtml(t.teacherName || '-')}</td><td>${safeHtml(
                    t.phone || '-'
                  )}</td></tr>`
              )
              .join('')
          : '<tr><td colspan="3">لا يوجد معلمون محددون</td></tr>';

      const absentHtml =
        absentStudents.length > 0
          ? absentStudents
              .map((s, idx) => `<tr><td>${idx + 1}</td><td>${safeHtml(s.studentName || '-')}</td></tr>`)
              .join('')
          : '<tr><td colspan="2">لا يوجد غياب محدد</td></tr>';

      const starsHtml =
        starAwards.length > 0
          ? starAwards
              .map(
                (s, idx) =>
                  `<tr><td>${idx + 1}</td><td>${safeHtml(s.name || '-')}</td><td>${safeHtml(
                    s.stars || '-'
                  )}</td></tr>`
              )
              .join('')
          : '<tr><td colspan="3">لا توجد بيانات نجوم</td></tr>';

      const curriculumRowsHtml =
        curriculumItems.length > 0
          ? curriculumItems
              .map(
                (it) =>
                  `<tr><th>${safeHtml(it.subjectName || '-')}</th><td>${safeHtml(it.content || '-')}</td></tr>`
              )
              .join('')
          : '<tr><td colspan="2">لا توجد مواد مضافة</td></tr>';

      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${safeHtml(rep.reportTitle || 'تقرير إشراف مدرسة')}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; color: #111827; }
    h1, h2, h3 { margin: 0 0 10px; }
    .title { text-align: center; margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; margin-bottom: 16px; }
    .item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; }
    .label { font-size: 12px; color: #6b7280; margin-bottom: 3px; }
    .value { font-size: 14px; font-weight: 600; }
    .section { margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: right; vertical-align: top; }
    th { background: #f3f4f6; }
    .notes { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; min-height: 64px; white-space: pre-wrap; }
    @media print { body { margin: 10mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="title">
    <h1>${safeHtml(rep.reportTitle || 'تقرير إشراف على المدارس')}</h1>
    <div>${safeHtml(rep.schoolName || school?.name || '-')}</div>
  </div>
  <div class="grid">
    <div class="item"><div class="label">المدرسة</div><div class="value">${safeHtml(rep.schoolName || '-')}</div></div>
    <div class="item"><div class="label">القرية</div><div class="value">${safeHtml(rep.villageName || '-')}</div></div>
    <div class="item"><div class="label">اليوم</div><div class="value">${safeHtml(rep.dayName || '-')}</div></div>
    <div class="item"><div class="label">التاريخ</div><div class="value">${safeHtml(rep.date || rep.timestamp?.split('T')[0] || '-')}</div></div>
    <div class="item"><div class="label">المحافظة</div><div class="value">${safeHtml(rep.governorate || '-')}</div></div>
    <div class="item"><div class="label">الدولة</div><div class="value">${safeHtml(rep.country || '-')}</div></div>
    <div class="item"><div class="label">وقت الحضور</div><div class="value">${safeHtml(rep.arrivalTime || '-')}</div></div>
    <div class="item"><div class="label">وقت المغادرة</div><div class="value">${safeHtml(rep.departureTime || '-')}</div></div>
    <div class="item"><div class="label">عدد الطلاب المسجلين</div><div class="value">${safeHtml(rep.totalStudents ?? '-')}</div></div>
    <div class="item"><div class="label">عدد الحضور</div><div class="value">${safeHtml(rep.presentCount ?? '-')}</div></div>
    <div class="item"><div class="label">مراجعة الغياب</div><div class="value">${safeHtml(rep.absenceReview || '-')}</div></div>
    <div class="item"><div class="label">المشرف</div><div class="value">${safeHtml(rep.supervisorName || '-')}</div></div>
    <div class="item"><div class="label">مسؤول المشاريع</div><div class="value">${safeHtml(rep.projectsOfficerName || '-')}</div></div>
    <div class="item"><div class="label">تعمل السوق</div><div class="value">${safeHtml(rep.marketDone || '-')}</div></div>
    <div class="item"><div class="label">عدد الوجبات</div><div class="value">${safeHtml(rep.mealsCount ?? '-')}</div></div>
    <div class="item"><div class="label">مستوى الطلاب</div><div class="value">${safeHtml(rep.studentLevel || '-')}</div></div>
    <div class="item"><div class="label">نسبة السير على المنهج</div><div class="value">${safeHtml(rep.curriculumProgress || '-')}</div></div>
    <div class="item"><div class="label">تقييم المدرسة</div><div class="value">${safeHtml(rep.schoolEvaluation || '-')}</div></div>
    <div class="item"><div class="label">تقييم المدرس</div><div class="value">${safeHtml(rep.teacherEvaluation || '-')}</div></div>
  </div>

  <div class="section">
    <h3>المعلمون</h3>
    <table>
      <thead><tr><th>#</th><th>اسم المعلم</th><th>رقم الهاتف</th></tr></thead>
      <tbody>${teachersHtml}</tbody>
    </table>
  </div>

  <div class="section">
    <h3>المقررات والمتابعة العلمية</h3>
    <table>
      <tbody>
        ${curriculumRowsHtml}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>الطلاب الغائبون</h3>
    <table>
      <thead><tr><th>#</th><th>اسم الطالب</th></tr></thead>
      <tbody>${absentHtml}</tbody>
    </table>
  </div>

  <div class="section">
    <h3>النجوم للطلاب المجتهدين</h3>
    <table>
      <thead><tr><th>#</th><th>الطالب</th><th>عدد النجوم</th></tr></thead>
      <tbody>${starsHtml}</tbody>
    </table>
  </div>

  <div class="section">
    <h3>ملاحظات</h3>
    <div class="notes">${safeHtml(rep.notes || '-')}</div>
  </div>

  <script>
    window.onload = () => {
      window.print();
      setTimeout(() => window.close(), 200);
    };
  </script>
</body>
</html>`;

      const w = window.open('', '_blank', 'width=1000,height=700');
      if (!w) {
        setReportError('تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    };

    const buildDraftPrintableReport = () => {
      const selectedTeachers = staff.filter((t) => reportForm.teacherIds.includes(t.id));
      const curriculumItems = curriculumList.map((subj) => ({
        subjectId: subj.id,
        subjectName: subj.name || subj.id,
        content: reportForm.curriculumBySubjectId?.[subj.id] || '',
      }));
      return {
        reportTitle: reportForm.reportTitle || 'تقرير إشراف على المدارس',
        schoolName: school?.name || '',
        villageName: reportForm.village,
        dayName: reportForm.day,
        date: reportForm.date,
        governorate: reportForm.governorate,
        country: reportForm.country,
        arrivalTime: reportForm.arrivalTime,
        departureTime: reportForm.departureTime,
        totalStudents: Number(reportForm.totalStudents || 0),
        presentCount: Number(reportForm.presentCount || 0),
        absenceReview: reportForm.absenceReview,
        supervisorName: reportForm.supervisorName,
        projectsOfficerName: reportForm.projectsOfficerName,
        marketDone: reportForm.marketDone,
        mealsCount: Number(reportForm.mealsCount || 0),
        studentLevel: reportForm.studentLevel,
        curriculumProgress: reportForm.curriculumProgress,
        schoolEvaluation: reportForm.schoolEvaluation,
        teacherEvaluation: reportForm.teacherEvaluation,
        lessonCoverage: {},
        curriculumItems,
        teachers: selectedTeachers.map((t) => ({
          teacherId: t.id,
          teacherName: t.displayName || '',
          phone: reportForm.teacherPhoneMap[t.id] || t.phoneNumber || '',
        })),
        absentStudents: students
          .filter((s) => reportForm.absentStudentIds.includes(s.id))
          .map((s) => ({ studentId: s.id, studentName: s.displayName || '' })),
        starAwards: reportForm.starAwards || [],
        notes: reportForm.notes,
      };
    };

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
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
            >
              {can(PERMISSION_PAGE_IDS.schools, 'school_report_create') && (
                <button type="button" className="google-btn google-btn--toolbar" onClick={openReportModal}>
                  <Plus size={16} />
                  <span>إضافة تقرير</span>
                </button>
              )}
            </PageHeader>
            {reportError && (
              <div
                className="app-alert app-alert--error"
                style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
              >
                <span>{reportError}</span>
                <button
                  type="button"
                  className="icon-btn"
                  title="إغلاق"
                  onClick={() => setReportError('')}
                  style={{ width: 28, height: 28 }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {reportSuccess && (
              <div
                className="app-alert app-alert--success"
                style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
              >
                <span>{reportSuccess}</span>
                <button
                  type="button"
                  className="icon-btn"
                  title="إغلاق"
                  onClick={() => setReportSuccess('')}
                  style={{ width: 28, height: 28 }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="school-details-stats-row">
                {renderStatCard('إجمالي الطلاب', students.length, Users, '#f59e0b')}
                {renderStatCard('الكادر التعليمي', staff.length, School, 'var(--success-color)')}
                {renderStatCard('التقارير الميدانية', schoolReports.length, FileText, 'var(--accent-color)')}
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
                              <button className="icon-btn" title="إضافة عضو للمدرسة" onClick={() => { setIsModalOpen(true); setSelectedIds([]); setAssignRoleFilter('all'); }}><UserPlus size={18} /></button>
                            )}
                        </div>
                    </div>
                    {assignError && (
                      <div
                        className="app-alert app-alert--error school-details-panel__empty"
                        style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                      >
                        <span>{assignError}</span>
                        <button
                          type="button"
                          className="icon-btn"
                          title="إغلاق"
                          onClick={() => setAssignError('')}
                          style={{ width: 28, height: 28 }}
                        >
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
                                 <div style={{ display: 'flex', gap: 6 }}>
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
                                    placeholder="بحث في الطلاب..." 
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="school-details-panel__search-input"
                                />
                            </div>
                            {can(PERMISSION_PAGE_IDS.schools, 'school_member_assign') && (
                              <button className="icon-btn" title="إضافة عضو للمدرسة" onClick={() => { setIsModalOpen(true); setSelectedIds([]); setAssignRoleFilter('all'); }}><UserPlus size={18} /></button>
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
                                 <div style={{ display: 'flex', gap: 6 }}>
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

            <div className="surface-card surface-card--lg school-details-panel" style={{ marginTop: '1rem' }}>
              <div className="school-details-panel__head">
                <h2 className="school-details-panel__title">
                  <FileText size={18} color="var(--accent-color)" /> تقارير المدرسة
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  className="app-input"
                  placeholder="بحث بالعنوان/المشرف/التاريخ..."
                  value={reportQuery}
                  onChange={(e) => setReportQuery(e.target.value)}
                />
                <input className="app-input" type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} />
                <input className="app-input" type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} />
                <button
                  type="button"
                  className="google-btn"
                  onClick={() => {
                    setReportQuery('');
                    setReportDateFrom('');
                    setReportDateTo('');
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={14} /> مسح
                  </span>
                </button>
              </div>
              {filteredReports.length === 0 ? (
                <p className="school-details-panel__empty">
                  {schoolReports.length === 0
                    ? 'لا توجد تقارير محفوظة لهذه المدرسة حتى الآن.'
                    : 'لا توجد نتائج مطابقة للفلاتر الحالية.'}
                </p>
              ) : (
                <div className="school-details-members-list">
                  {filteredReports.map((rep) => (
                    <div key={rep.id} className="school-details-member-item">
                      <div className="school-details-member-item__body">
                        <h4 className="school-details-member-item__name">{rep.reportTitle || 'تقرير إشراف مدرسة'}</h4>
                        <p className="school-details-member-item__sub">
                          {rep.date || rep.timestamp?.split('T')[0] || '-'} • المشرف: {rep.supervisorName || 'غير محدد'} • الحضور: {rep.presentCount ?? '-'} / {rep.totalStudents ?? '-'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                          <button type="button" className="icon-btn" title="فتح التقرير" onClick={() => navigate(`/reports/${rep.id}`)}>
                            <Info size={16} />
                          </button>
                        )}
                        {can(PERMISSION_PAGE_IDS.reports, 'report_edit') && (
                          <button type="button" className="icon-btn" title="تعديل التقرير" onClick={() => openEditReportModal(rep)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {can(PERMISSION_PAGE_IDS.reports, 'report_view') && (
                          <button type="button" className="icon-btn" title="طباعة التقرير" onClick={() => handlePrintSchoolReport(rep)}>
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
                        <div className="role-filter-bar" style={{ marginBottom: '0.75rem' }}>
                          {ASSIGN_ROLE_FILTER_ORDER.map((rid) => (
                            <button
                              key={rid}
                              type="button"
                              className={`role-filter-btn ${assignRoleFilter === rid ? 'role-filter-btn--active' : ''}`}
                              onClick={() => setAssignRoleFilter(rid)}
                            >
                              {(rid === 'all' ? 'الكل' : userRoleLabel(rid))} ({assignRoleCounts[rid] || 0})
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
                            className="google-btn google-btn--filled"
                            style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                            disabled={selectedIds.length === 0}
                            busy={assigning}
                            onClick={handleAssignSelected}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <Check size={14} /> تعيين المحددين
                            </span>
                          </BusyButton>
                          <button
                            type="button"
                            className="google-btn"
                            style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <X size={14} /> إلغاء التحديد
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
                                              {userRoleLabel(u.role)} {u.schoolId && u.schoolId !== id ? '(مرتبط بمدرسة أخرى)' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <BusyButton
                                      type="button"
                                      onClick={() => handleAssignUser(u)}
                                      busy={assigning}
                                      className="google-btn google-btn--filled school-details-assign-modal__assign-btn"
                                    >
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <Check size={14} aria-hidden /> تعيين
                                      </span>
                                    </BusyButton>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {isReportModalOpen && (
              <div className="modal-overlay" onClick={() => setIsReportModalOpen(false)}>
                <div className="surface-card surface-card--lg school-details-assign-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="school-details-assign-modal__head">
                    <h3 style={{ margin: 0 }}>{editingReportMeta ? 'تعديل تقرير إشراف المدرسة' : 'إضافة تقرير إشراف للمدرسة'}</h3>
                    <button type="button" onClick={() => setIsReportModalOpen(false)} className="icon-btn">
                      <X size={20} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '68vh', overflowY: 'auto', paddingInlineEnd: '0.25rem' }}>
                    <div className="report-field-grid report-field-grid--2">
                      <ReportField label="عنوان التقرير">
                        <input className="app-input" value={reportForm.reportTitle} onChange={(e) => setReportForm((p) => ({ ...p, reportTitle: e.target.value }))} placeholder="عنوان التقرير" />
                      </ReportField>
                      <ReportField label="اسم المدرسة/الجروب">
                        <input className="app-input" value={reportForm.groupName} onChange={(e) => setReportForm((p) => ({ ...p, groupName: e.target.value }))} placeholder="اسم المدرسة/الجروب" />
                      </ReportField>
                    </div>
                    <div className="app-alert app-alert--info" style={{ margin: 0 }}>
                      اختيار المعلمين (يمكن اختيار أكثر من معلم) + تعديل أرقام الهاتف.
                    </div>
                    {staff.filter((s) => s.role === 'teacher').map((t) => (
                      <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <input type="checkbox" checked={reportForm.teacherIds.includes(t.id)} onChange={() => toggleTeacherSelection(t.id)} />
                          <span>{t.displayName}</span>
                        </label>
                        <input className="app-input" type="tel" inputMode="numeric" value={reportForm.teacherPhoneMap[t.id] || ''} onChange={(e) => setReportForm((p) => ({ ...p, teacherPhoneMap: { ...p.teacherPhoneMap, [t.id]: e.target.value } }))} placeholder="رقم هاتف المعلم" />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t.phoneNumber ? `المسجل: ${t.phoneNumber}` : 'لا يوجد رقم مسجل'}</span>
                      </div>
                    ))}
                    <div className="app-alert app-alert--info" style={{ margin: 0 }}>
                      الحقول الجغرافية تُجلب تلقائيا من: المدرسة ← القرية ← المنطقة ← المحافظة.
                    </div>
                    <div className="report-field-grid report-field-grid--2">
                      <ReportField label="القرية"><input className="app-input" value={reportForm.village} readOnly placeholder="القرية" /></ReportField>
                      <ReportField label="المنطقة"><input className="app-input" value={geoDefaults.regionName} readOnly placeholder="المنطقة" /></ReportField>
                      <ReportField label="المحافظة"><input className="app-input" value={reportForm.governorate} readOnly placeholder="المحافظة" /></ReportField>
                      <ReportField label="الدولة"><input className="app-input" value={reportForm.country} readOnly placeholder="الدولة" /></ReportField>
                      <ReportField label="اليوم">
                        <AppSelect searchable value={reportForm.day} onChange={(e) => setReportForm((p) => ({ ...p, day: e.target.value }))}>
                          {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </AppSelect>
                      </ReportField>
                      <ReportField label="التاريخ"><input className="app-input" type="date" value={reportForm.date} onChange={(e) => setReportForm((p) => ({ ...p, date: e.target.value }))} /></ReportField>
                      <ReportField label="وقت الحضور"><input className="app-input" type="time" value={reportForm.arrivalTime} onChange={(e) => setReportForm((p) => ({ ...p, arrivalTime: e.target.value }))} /></ReportField>
                      <ReportField label="وقت المغادرة"><input className="app-input" type="time" value={reportForm.departureTime} onChange={(e) => setReportForm((p) => ({ ...p, departureTime: e.target.value }))} /></ReportField>
                      <ReportField label="عدد الطلاب المسجلين">
                        <input
                          className="app-input"
                          type="number"
                          min="0"
                          value={reportForm.totalStudents}
                          onChange={(e) =>
                            setReportForm((p) => {
                              const total = Math.max(Number(e.target.value || 0), 0);
                              return {
                                ...p,
                                totalStudents: total,
                                presentCount: Math.max(total - p.absentStudentIds.length, 0),
                              };
                            })
                          }
                          placeholder="عدد الطلاب المسجلين"
                        />
                      </ReportField>
                      <ReportField label="عدد الحضور (تلقائي)">
                        <input className="app-input" type="number" min="0" value={reportForm.presentCount} readOnly placeholder="عدد الحضور" />
                      </ReportField>
                    </div>
                    <input className="app-input" value={reportForm.absenceReview} onChange={(e) => setReportForm((p) => ({ ...p, absenceReview: e.target.value }))} placeholder="مراجعة الغياب" />
                    <div className="app-alert app-alert--info" style={{ margin: 0 }}>تعليم الغائبين من طلاب المدرسة الموجودة في النظام:</div>
                    <button
                      type="button"
                      className={`icon-btn ${students.length > 0 && reportForm.absentStudentIds.length === students.length ? 'icon-btn--active' : ''}`}
                      title={students.length > 0 && reportForm.absentStudentIds.length === students.length ? 'إلغاء تحديد الكل' : 'تحديد الكل كغائب'}
                      onClick={toggleAllAbsentStudents}
                      style={{ width: 'fit-content', minWidth: 42, paddingInline: 12, gap: 8 }}
                    >
                      {students.length > 0 && reportForm.absentStudentIds.length === students.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span style={{ fontSize: '0.85rem' }}>
                        {students.length > 0 && reportForm.absentStudentIds.length === students.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                      </span>
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0.5rem' }}>
                      {students.map((s) => (
                        <label key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={reportForm.absentStudentIds.includes(s.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...new Set([...reportForm.absentStudentIds, s.id])]
                                : reportForm.absentStudentIds.filter((idVal) => idVal !== s.id);
                              updateReportAbsences(next);
                            }}
                          />
                          <span>{s.displayName}</span>
                        </label>
                      ))}
                    </div>
                    <div className="report-field-grid report-field-grid--2">
                      <ReportField label="مستوى الطلاب">
                        <AppSelect searchable value={reportForm.studentLevel} onChange={(e) => setReportForm((p) => ({ ...p, studentLevel: e.target.value }))}>
                          {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                        </AppSelect>
                      </ReportField>
                      <ReportField label="السير على المنهج">
                        <AppSelect searchable value={reportForm.curriculumProgress} onChange={(e) => setReportForm((p) => ({ ...p, curriculumProgress: e.target.value }))}>
                          {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                        </AppSelect>
                      </ReportField>
                      <ReportField label="تقييم المدرسة">
                        <AppSelect searchable value={reportForm.schoolEvaluation} onChange={(e) => setReportForm((p) => ({ ...p, schoolEvaluation: e.target.value }))}>
                          {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                        </AppSelect>
                      </ReportField>
                      <ReportField label="تقييم المدرس">
                        <AppSelect searchable value={reportForm.teacherEvaluation} onChange={(e) => setReportForm((p) => ({ ...p, teacherEvaluation: e.target.value }))}>
                          {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                        </AppSelect>
                      </ReportField>
                      <ReportField label="تعمل السوق؟">
                        <AppSelect searchable value={reportForm.marketDone} onChange={(e) => setReportForm((p) => ({ ...p, marketDone: e.target.value }))}>
                          <option value="">غير محدد</option>
                          <option value="نعم">نعم</option>
                          <option value="لا">لا</option>
                        </AppSelect>
                      </ReportField>
                      <ReportField label="عدد الوجبات"><input className="app-input" type="number" min="0" value={reportForm.mealsCount} onChange={(e) => setReportForm((p) => ({ ...p, mealsCount: e.target.value }))} placeholder="عدد الوجبات" /></ReportField>
                      <ReportField label="المشرف"><input className="app-input" value={reportForm.supervisorName} onChange={(e) => setReportForm((p) => ({ ...p, supervisorName: e.target.value }))} placeholder="المشرف" /></ReportField>
                      <ReportField label="مسؤول المشاريع"><input className="app-input" value={reportForm.projectsOfficerName} onChange={(e) => setReportForm((p) => ({ ...p, projectsOfficerName: e.target.value }))} placeholder="مسؤول المشاريع" /></ReportField>
                    </div>
                    <div className="app-alert app-alert--info" style={{ margin: 0 }}>
                      مواد التقرير (من المناهج `curriculum`):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {curriculumList.map((subj) => (
                        <input
                          key={subj.id}
                          className="app-input"
                          value={reportForm.curriculumBySubjectId?.[subj.id] || ''}
                          onChange={(e) =>
                            setReportForm((p) => ({
                              ...p,
                              curriculumBySubjectId: {
                                ...(p.curriculumBySubjectId || {}),
                                [subj.id]: e.target.value,
                              },
                            }))
                          }
                          placeholder={`${subj.name || subj.id}`}
                        />
                      ))}
                    </div>
                    <textarea className="app-input" style={{ minHeight: '80px' }} value={reportForm.notes} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} placeholder="ملاحظات إضافية" />
                  </div>
                  <div className="school-details-assign-modal__toolbar" style={{ marginTop: '0.75rem' }}>
                    <button type="button" className="google-btn" style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }} onClick={() => setIsReportModalOpen(false)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <X size={14} /> إلغاء
                      </span>
                    </button>
                    <button
                      type="button"
                      className="google-btn"
                      style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                      onClick={() => handlePrintSchoolReport(buildDraftPrintableReport())}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Printer size={14} aria-hidden /> معاينة/طباعة قبل الحفظ
                      </span>
                    </button>
                    <BusyButton
                      type="button"
                      className="google-btn google-btn--filled"
                      style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                      busy={reportSaving}
                      onClick={handleSaveSchoolReport}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Save size={14} /> {editingReportMeta ? 'حفظ التعديلات' : 'حفظ التقرير'}
                      </span>
                    </BusyButton>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
};

export default SchoolDetailsPage;

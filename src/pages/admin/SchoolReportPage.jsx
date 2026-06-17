import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Save,
  MapPin,
  Navigation,
  Image as ImageIcon,
  Video,
  X,
  FileDown,
  FileSpreadsheet,
  Eye,
  Clock,
  Printer,
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import BusyButton from '../../components/BusyButton';
import AppSelect from '../../components/AppSelect';
import YesNoRadio from '../../components/YesNoRadio';
import CurriculumLessonPicker from '../../components/CurriculumLessonPicker';
import MapLocationOpen from '../../components/MapLocationOpen';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
import { uploadMedia } from '../../services/storageApi';
import {
  entriesToLegacyItems,
  parseLegacyToEntries,
  summarizeCurriculumProgress,
} from '../../utils/curriculumProgress';
import { loadSchoolReportExport } from '../../utils/loadSchoolReportExport';
import { openGoogleMaps } from '../../utils/maps';
import LazyReportPrintPreviewModal from '../../components/LazyReportPrintPreviewModal';
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';
import { buildSchoolReportBodyHtml } from '../../utils/schoolReportHtml';
import EvalSelectWithOther from '../../components/EvalSelectWithOther';
import StarRatingInput from '../../components/StarRatingInput';
import ReportTextList from '../../components/ReportTextList';
import VillageReportFields from '../../components/VillageReportFields';
import {
  emptyVillageReportFields,
  normalizeStringList,
  villageReportFromStored,
  villageReportToPayload,
} from '../../utils/villageReportFields';
import {
  EVAL_QUALITY_OPTIONS,
  EVAL_YES_NO_OPTIONS,
  SCHOOL_EVAL_FIELDS,
  SCHOOL_REPORT_PERIOD_OPTIONS,
  DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE,
  parseEvalFromStored,
  resolveEvalValue,
} from '../../utils/reportEvalOptions';
import { clampVisitRatingSave } from '../../utils/visitRating';
import {
  mergeStarAwardsForStudents,
  teacherRatingsFromReport,
  primaryTeacherRating,
  teacherEvaluationLabelFromRatings,
  studentLevelSummaryFromStars,
} from '../../utils/schoolReportStars';

const DAY_OPTIONS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const emptyEvalOthers = () => ({
  curriculumProgressOther: '',
  schoolEvaluationOther: '',
  marketDoneOther: '',
});

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

const ReportField = ({ label, children, span = 1 }) => (
  <label className={`report-field ${span === 2 ? 'report-field--span2' : ''}`}>
    <span className="report-field__label">{label}</span>
    {children}
  </label>
);

const SchoolReportPage = () => {
  const { id: schoolId, reportId } = useParams();
  const [searchParams] = useSearchParams();
  const ownerIdParam = searchParams.get('ownerId') || '';
  const navigate = useNavigate();
  const isEditing = Boolean(reportId);
  const viewMode = searchParams.get('view') === '1';

  const [school, setSchool] = useState(null);
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [visitReports, setVisitReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [geoDefaults, setGeoDefaults] = useState({ villageName: '', regionName: '', governorateName: '', country: '' });
  const [editingMeta, setEditingMeta] = useState(null);

  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = usePermissions();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const [form, setForm] = useState({
    reportTitle: DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE,
    reportPeriod: 'monthly',
    teacherIds: [],
    teacherPhoneMap: {},
    teacherRatings: {},
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
    curriculumProgress: 'جيد',
    schoolEvaluation: 'جيد',
    marketDone: '',
    mealsCount: '',
    supervisorName: '',
    projectsOfficerName: '',
    notes: '',
    absentStudentIds: [],
    starAwards: [],
    curriculumEntries: [],
    gpsLocation: null,
    mediaUrls: [],
    mediaFiles: [],
    outstandingStudents: [],
    ...emptyVillageReportFields(),
    ...emptyEvalOthers(),
  });

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const allSchools = await api.getCollectionGroupDocuments('schools');
      const schDoc = allSchools.find((s) => s.id === schoolId);
      if (!schDoc) return;
      const schoolData = { id: schDoc.id, ...schDoc.data() };
      setSchool(schoolData);

      const [allVillages, allRegions, allGovernorates, usersDocs, curriculumDocs, membersDocs, allReports] =
        await Promise.all([
          api.getCollectionGroupDocuments('villages'),
          api.getCollectionGroupDocuments('regions'),
          api.getDocuments(api.getGovernoratesCollection()),
          api.getDocuments(api.getUsersCollection()),
          api.getDocuments(api.getCurriculumCollection()),
          api.getDocuments(api.getGroupMembersCollection(schoolId)),
          api.getCollectionGroupDocuments('reports'),
        ]);

      const villageDoc = allVillages.find((v) => v.id === schoolData.villageId);
      const resolvedRegionId = schoolData.regionId || villageDoc?.data()?.regionId || '';
      const regionDoc = allRegions.find((r) => r.id === resolvedRegionId);
      const govId = regionDoc?.data()?.govId || '';
      const govDoc = allGovernorates.find((g) => g.id === govId);
      const geo = {
        villageName: villageDoc?.data()?.villageName || schoolData.villageName || '',
        regionName: regionDoc?.data()?.name || '',
        governorateName: govDoc?.data()?.name || schoolData.governorate || '',
        country: govDoc?.data()?.country || schoolData.country || '',
      };
      setGeoDefaults(geo);

      const users = usersDocs.map((u) => ({ id: u.id, ...u.data() }));
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      const curriculum = curriculumDocs.map((d) => ({ id: d.id, ...d.data() }));
      setCurriculumList(curriculum);

      const memberData = membersDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const detailedStaff = [];
      const detailedStudents = [];
      memberData.forEach((m) => {
        const profile = userMap[m.userId || m.id];
        if (!profile) return;
        if (profile.role === 'student' || m.type === 'student') detailedStudents.push(profile);
        else detailedStaff.push(profile);
      });
      setStaff(detailedStaff);
      setStudents(detailedStudents);

      const schoolReportRows = allReports
        .filter((r) => (r.data()?.schoolId || '') === schoolId)
        .map((r) => ({ id: r.id, ownerId: r.ref.parent.parent?.id || '', ...r.data() }));

      const visits = schoolReportRows
        .filter((r) => r.reportType !== 'school_supervision')
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setVisitReports(visits);

      if (isEditing && reportId) {
        const rep =
          schoolReportRows.find((r) => r.id === reportId) ||
          (ownerIdParam
            ? { id: reportId, ...(await api.getData(api.getSupervisorReportDoc(ownerIdParam, reportId))) }
            : null);
        if (rep) {
          const teacherIds = (rep.teachers || []).map((t) => t.teacherId).filter(Boolean);
          const teacherPhoneMap = {};
          (rep.teachers || []).forEach((t) => {
            if (t.teacherId) teacherPhoneMap[t.teacherId] = t.phone || '';
          });
          setEditingMeta({ id: rep.id, ownerId: rep.ownerId || ownerIdParam });
          const cp = rep.curriculumProgressChoice != null
            ? { value: rep.curriculumProgressChoice, other: rep.curriculumProgressOther || '' }
            : parseEvalFromStored(rep.curriculumProgress, EVAL_QUALITY_OPTIONS);
          const se = rep.schoolEvaluationChoice != null
            ? { value: rep.schoolEvaluationChoice, other: rep.schoolEvaluationOther || '' }
            : parseEvalFromStored(rep.schoolEvaluation, EVAL_QUALITY_OPTIONS);
          const md = rep.marketDoneChoice != null
            ? { value: rep.marketDoneChoice, other: rep.marketDoneOther || '' }
            : parseEvalFromStored(rep.marketDone, EVAL_YES_NO_OPTIONS);
          const teacherRatings = teacherRatingsFromReport(rep, teacherIds);
          setForm({
            reportTitle: rep.reportTitle || DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE,
            reportPeriod: rep.reportPeriod || 'monthly',
            teacherIds,
            teacherPhoneMap,
            teacherRatings,
            village: rep.villageName || geo.villageName,
            groupName: rep.groupName || rep.schoolName || schoolData.name,
            day: rep.dayName || DAY_OPTIONS[new Date().getDay()],
            date: rep.date || formatDateInput(),
            governorate: rep.governorate || geo.governorateName,
            country: rep.country || geo.country,
            arrivalTime: rep.arrivalTime || formatTimeInput(),
            departureTime: rep.departureTime || '',
            totalStudents: rep.totalStudents ?? detailedStudents.length,
            presentCount:
              rep.presentCount ??
              Math.max(Number(rep.totalStudents ?? detailedStudents.length) - (rep.absentStudents || []).length, 0),
            absenceReview: rep.absenceReview || '',
            curriculumProgress: cp.value || 'جيد',
            curriculumProgressOther: cp.other,
            schoolEvaluation: se.value || 'جيد',
            schoolEvaluationOther: se.other,
            marketDone: md.value,
            marketDoneOther: md.other,
            mealsCount: rep.mealsCount ?? '',
            supervisorName: rep.supervisorName || actorUser?.displayName || '',
            projectsOfficerName: rep.projectsOfficerName || '',
            notes: rep.notes || '',
            absentStudentIds: (rep.absentStudents || []).map((s) => s.studentId).filter(Boolean),
            starAwards: mergeStarAwardsForStudents(detailedStudents, rep.starAwards || []),
            curriculumEntries: parseLegacyToEntries(rep, curriculum),
            gpsLocation: rep.gpsLocation || null,
            mediaUrls: rep.mediaUrls || [],
            mediaFiles: [],
            outstandingStudents: normalizeStringList(rep.outstandingStudents),
            ...villageReportFromStored(rep),
            notes: rep.notes || rep.villageNotes || '',
          });
        }
      } else {
        const now = new Date();
        const teachers = detailedStaff.filter((u) => u.role === 'teacher');
        const teacherPhoneMap = teachers.reduce((acc, t) => {
          acc[t.id] = t.phoneNumber || '';
          return acc;
        }, {});
        const initialTeacherIds = teachers[0]?.id ? [teachers[0].id] : [];
        const teacherRatings = initialTeacherIds.length
          ? { [initialTeacherIds[0]]: 3 }
          : {};
        setForm({
          reportTitle: DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE,
          reportPeriod: 'monthly',
          teacherIds: initialTeacherIds,
          teacherPhoneMap,
          teacherRatings,
          village: geo.villageName,
          groupName: schoolData.name || '',
          day: DAY_OPTIONS[now.getDay()],
          date: formatDateInput(now),
          governorate: geo.governorateName,
          country: geo.country,
          arrivalTime: formatTimeInput(now),
          departureTime: '',
          totalStudents: detailedStudents.length,
          presentCount: detailedStudents.length,
          absenceReview: '',
          curriculumProgress: 'جيد',
          schoolEvaluation: 'جيد',
          marketDone: '',
          mealsCount: '',
          supervisorName: actorUser?.displayName || '',
          projectsOfficerName: '',
          notes: '',
          absentStudentIds: [],
          starAwards: mergeStarAwardsForStudents(detailedStudents, []),
          curriculumEntries: [],
          gpsLocation: null,
          mediaUrls: [],
          mediaFiles: [],
          outstandingStudents: [],
          ...emptyVillageReportFields(),
          ...emptyEvalOthers(),
        });
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setForm((p) => ({ ...p, gpsLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } })),
            () => {}
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل بيانات التقرير.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, reportId, isEditing, ownerIdParam, actorUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const progressSummary = useMemo(
    () => summarizeCurriculumProgress(form.curriculumEntries, form.date ? new Date(form.date) : new Date()),
    [form.curriculumEntries, form.date]
  );

  const updateAbsences = (nextAbsentIds) => {
    setForm((p) => ({
      ...p,
      absentStudentIds: nextAbsentIds,
      presentCount: Math.max(Number(p.totalStudents || 0) - nextAbsentIds.length, 0),
    }));
  };

  const toggleTeacher = (teacherId) => {
    setForm((p) => {
      const isSelected = p.teacherIds.includes(teacherId);
      const teacherIds = isSelected
        ? p.teacherIds.filter((id) => id !== teacherId)
        : [...p.teacherIds, teacherId];
      const teacherRatings = { ...p.teacherRatings };
      if (!isSelected && !teacherRatings[teacherId]) {
        teacherRatings[teacherId] = 3;
      }
      if (isSelected) {
        delete teacherRatings[teacherId];
      }
      return { ...p, teacherIds, teacherRatings };
    });
  };

  const setTeacherRating = (teacherId, stars) => {
    setForm((p) => ({
      ...p,
      teacherRatings: { ...p.teacherRatings, [teacherId]: stars },
    }));
  };

  const setStudentStars = (studentId, stars) => {
    setForm((p) => ({
      ...p,
      starAwards: p.starAwards.map((row) =>
        row.studentId === studentId ? { ...row, stars } : row
      ),
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({ ...p, gpsLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
        setLocating(false);
      },
      () => {
        setError('يرجى تفعيل GPS ومنح صلاحية الموقع.');
        setLocating(false);
      }
    );
  };

  const handleMediaPick = (e) => {
    if (e.target.files) {
      setForm((p) => ({ ...p, mediaFiles: [...p.mediaFiles, ...Array.from(e.target.files)] }));
    }
  };

  const removePendingFile = (idx) => {
    setForm((p) => ({ ...p, mediaFiles: p.mediaFiles.filter((_, i) => i !== idx) }));
  };

  const removeSavedMedia = (idx) => {
    setForm((p) => ({ ...p, mediaUrls: p.mediaUrls.filter((_, i) => i !== idx) }));
  };

  const buildPayload = async () => {
    const api = FirestoreApi.Api;
    const actorId = actorUser?.uid || actorUser?.id || 'school-admin';
    const id = editingMeta?.id || api.getNewId('reports');
    const ownerId = editingMeta?.ownerId || actorId;

    let mediaUrls = [...(form.mediaUrls || [])];
    if (form.mediaFiles.length > 0) {
      setUploading(true);
      for (const file of form.mediaFiles) {
        const url = await uploadMedia(file, `school_reports/${schoolId}`);
        if (url) mediaUrls.push({ url, name: file.name, type: file.type });
      }
      setUploading(false);
    }

    const selectedTeachers = staff.filter((t) => form.teacherIds.includes(t.id));
    const curriculumItems = entriesToLegacyItems(form.curriculumEntries);
    const legacyLessonCoverage = {};
    curriculumItems.forEach((it) => {
      legacyLessonCoverage[it.subjectName] = it.content;
    });

    return {
      docRef: api.getSupervisorReportDoc(ownerId, id),
      ownerId,
      id,
      payload: {
        reportType: 'school_supervision',
        reportTitle: form.reportTitle,
        reportPeriod: form.reportPeriod || 'monthly',
        supervisorId: actorId,
        supervisorName: form.supervisorName || actorUser?.displayName || '',
        schoolId,
        schoolName: school?.name || '',
        regionId: school?.regionId || '',
        villageId: school?.villageId || '',
        villageName: form.village,
        groupName: form.groupName,
        dayName: form.day,
        date: form.date,
        governorate: form.governorate,
        country: form.country,
        arrivalTime: form.arrivalTime,
        departureTime: form.departureTime,
        totalStudents: Number(form.totalStudents || 0),
        presentCount: Number(form.presentCount || 0),
        absentCount: Math.max(0, Number(form.totalStudents || 0) - Number(form.presentCount || 0)),
        absenceReview: form.absenceReview || '',
        absentStudents: students
          .filter((s) => form.absentStudentIds.includes(s.id))
          .map((s) => ({ studentId: s.id, studentName: s.displayName || '' })),
        studentLevel: studentLevelSummaryFromStars(form.starAwards),
        curriculumProgress: resolveEvalValue(form.curriculumProgress, form.curriculumProgressOther),
        lessonCoverage: legacyLessonCoverage,
        curriculumItems,
        curriculumEntries: form.curriculumEntries,
        curriculumProgressSummary: progressSummary,
        schoolEvaluation: resolveEvalValue(form.schoolEvaluation, form.schoolEvaluationOther),
        teacherEvaluation: teacherEvaluationLabelFromRatings(form.teacherRatings, form.teacherIds),
        teacherRating: primaryTeacherRating(form.teacherRatings, form.teacherIds) || null,
        teacherRatings: form.teacherRatings,
        marketDone: resolveEvalValue(form.marketDone, form.marketDoneOther),
        curriculumProgressChoice: form.curriculumProgress,
        curriculumProgressOther: form.curriculumProgressOther,
        schoolEvaluationChoice: form.schoolEvaluation,
        schoolEvaluationOther: form.schoolEvaluationOther,
        marketDoneChoice: form.marketDone,
        marketDoneOther: form.marketDoneOther,
        mealsCount: Number(form.mealsCount || 0),
        teachers: selectedTeachers.map((t) => ({
          teacherId: t.id,
          teacherName: t.displayName || '',
          phone: form.teacherPhoneMap[t.id] || t.phoneNumber || '',
          stars: clampVisitRatingSave(form.teacherRatings[t.id] || 0) || null,
        })),
        starAwards: form.starAwards.filter((row) => Number(row.stars) > 0),
        outstandingStudents: normalizeStringList(form.outstandingStudents),
        ...villageReportToPayload(form),
        villageNotes: '',
        projectsOfficerName: form.projectsOfficerName,
        notes: form.notes,
        gpsLocation: form.gpsLocation,
        mediaUrls,
        timestamp: new Date().toISOString(),
      },
    };
  };

  const handleSave = async () => {
    if (saving || uploading) return;
    if (!form.teacherIds.length) {
      setError('يرجى اختيار معلم واحد على الأقل.');
      return;
    }
    const unratedTeacher = form.teacherIds.find((id) => !form.teacherRatings[id] || Number(form.teacherRatings[id]) < 1);
    if (unratedTeacher) {
      setError('يرجى تقييم كل معلم محدد بالنجوم (من 1 إلى 5).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const { docRef, payload } = await buildPayload();
      await api.setData({ docRef, data: payload, userData: actorUser || {} });
      setSuccess(isEditing ? 'تم تحديث التقرير بنجاح.' : 'تم حفظ تقرير المدرسة بنجاح.');
      setTimeout(() => navigate(`/schools/${schoolId}`), 1200);
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ التقرير.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const buildExportable = () => ({
    reportTitle: form.reportTitle,
    reportPeriod: form.reportPeriod,
    schoolName: school?.name,
    villageName: form.village,
    dayName: form.day,
    date: form.date,
    governorate: form.governorate,
    country: form.country,
    arrivalTime: form.arrivalTime,
    departureTime: form.departureTime,
    totalStudents: form.totalStudents,
    presentCount: form.presentCount,
    absenceReview: form.absenceReview,
    supervisorName: form.supervisorName,
    projectsOfficerName: form.projectsOfficerName,
    marketDone: resolveEvalValue(form.marketDone, form.marketDoneOther),
    mealsCount: form.mealsCount,
    studentLevel: studentLevelSummaryFromStars(form.starAwards),
    curriculumProgress: resolveEvalValue(form.curriculumProgress, form.curriculumProgressOther),
    schoolEvaluation: resolveEvalValue(form.schoolEvaluation, form.schoolEvaluationOther),
    teacherEvaluation: teacherEvaluationLabelFromRatings(form.teacherRatings, form.teacherIds),
    teacherRating: primaryTeacherRating(form.teacherRatings, form.teacherIds) || null,
    notes: form.notes,
    curriculumItems: entriesToLegacyItems(form.curriculumEntries),
    curriculumProgressSummary: progressSummary,
    teachers: staff
      .filter((t) => form.teacherIds.includes(t.id))
      .map((t) => ({
        teacherName: t.displayName,
        phone: form.teacherPhoneMap[t.id] || t.phoneNumber,
        stars: form.teacherRatings[t.id] || 0,
      })),
    starAwards: form.starAwards.filter((row) => Number(row.stars) > 0),
    outstandingStudents: normalizeStringList(form.outstandingStudents),
    ...villageReportToPayload(form),
    absentStudents: students
      .filter((s) => form.absentStudentIds.includes(s.id))
      .map((s) => ({ studentName: s.displayName })),
  });

  if (loading) return <div className="loading-spinner page-loading-lg" />;
  if (!school) return <div className="empty-state">المدرسة غير موجودة</div>;

  const schoolScope = pageDataScope(PERMISSION_PAGE_IDS.schools);
  const canCreate = can(PERMISSION_PAGE_IDS.schools, 'school_report_create');
  const canViewReport = can(PERMISSION_PAGE_IDS.reports, 'report_view');
  const readOnly = viewMode || (isEditing && !canCreate);

  if (ready && !membershipLoading && schoolScope === DATA_SCOPE_MEMBERSHIP && schoolId && !membershipGroupIds.has(schoolId)) {
    return <Navigate to="/schools" replace />;
  }
  if (ready && !isEditing && !canCreate) {
    return <Navigate to={`/schools/${schoolId}`} replace />;
  }
  if (ready && isEditing && !canCreate && !canViewReport) {
    return <Navigate to={`/schools/${schoolId}`} replace />;
  }

  const teachers = staff.filter((s) => s.role === 'teacher');
  const editQuery = ownerIdParam ? `?ownerId=${ownerIdParam}` : '';

  return (
    <div className={`school-report-page portal-page${isMobile && !readOnly ? ' school-report-page--has-mobile-save' : ''}${readOnly ? ' school-report-page--readonly' : ''}`}>
      <PageHeader
        topRow={
          <button type="button" className="page-nav-back" onClick={() => navigate(`/schools/${schoolId}`)}>
            <ChevronRight size={20} aria-hidden /> العودة لتفاصيل المدرسة
          </button>
        }
        title={
          readOnly
            ? 'عرض التقرير الشهري عن المدرسة'
            : isEditing
              ? 'تعديل التقرير الشهري عن المدرسة'
              : 'إضافة التقرير الشهري عن المدرسة'
        }
        subtitle={school.name}
      >
        <div className="school-report-page__toolbar">
          {readOnly && canCreate && isEditing && (
            <button
              type="button"
              className="google-btn google-btn--filled google-btn--toolbar"
              onClick={() => navigate(`/schools/${schoolId}/report/${reportId}${editQuery}`)}
            >
              تعديل التقرير
            </button>
          )}
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => setPreviewOpen(true)}>
            <Printer size={16} />
            <span className="portal-toolbar__long">معاينة</span>
            <span className="portal-toolbar__short">معاينة</span>
          </button>
          <BusyButton
            type="button"
            className="google-btn google-btn--toolbar"
            busy={pdfExporting}
            onClick={async () => {
              setPdfExporting(true);
              try {
                const { exportSchoolReportPdf } = await loadSchoolReportExport();
                await exportSchoolReportPdf(buildExportable());
              } finally {
                setPdfExporting(false);
              }
            }}
          >
            <FileDown size={16} /> PDF
          </BusyButton>
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={async () => {
              const { exportSchoolReportExcel } = await loadSchoolReportExport();
              exportSchoolReportExcel(buildExportable());
            }}
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          {!readOnly && (
          <BusyButton
            type="button"
            className="google-btn google-btn--filled google-btn--toolbar school-report-toolbar__save--desktop"
            busy={saving || uploading}
            onClick={handleSave}
          >
            <Save size={16} />
            <span className="portal-toolbar__long">{isEditing ? 'حفظ التعديلات' : 'حفظ التقرير'}</span>
            <span className="portal-toolbar__short">حفظ</span>
          </BusyButton>
          )}
        </div>
      </PageHeader>

      {error && <div className="app-alert app-alert--error">{error}</div>}
      {success && <div className="app-alert app-alert--success">{success}</div>}
      {readOnly && (
        <div className="app-alert app-alert--info school-report-view-banner">
          وضع العرض فقط — يمكنك معاينة التقرير أو تصديره. {canCreate && isEditing ? 'اضغط «تعديل التقرير» للتعديل.' : ''}
        </div>
      )}

      <div className="school-report-page__layout">
        <div className="school-report-page__main">
          {/* القسم 1: معلومات أساسية */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title">معلومات التقرير</h3>
            <div className="report-field-grid report-field-grid--2">
              <ReportField label="عنوان التقرير">
                <input className="app-input" value={form.reportTitle} onChange={(e) => setForm((p) => ({ ...p, reportTitle: e.target.value }))} />
              </ReportField>
              <ReportField label="نوع التقرير">
                <AppSelect
                  value={form.reportPeriod}
                  onChange={(e) => {
                    const reportPeriod = e.target.value;
                    setForm((p) => ({
                      ...p,
                      reportPeriod,
                      reportTitle:
                        reportPeriod === 'monthly' && (!p.reportTitle || p.reportTitle === DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE)
                          ? DEFAULT_SCHOOL_MONTHLY_REPORT_TITLE
                          : p.reportTitle,
                    }));
                  }}
                >
                  {SCHOOL_REPORT_PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </AppSelect>
              </ReportField>
              <ReportField label="اسم المدرسة/الجروب">
                <input className="app-input" value={form.groupName} onChange={(e) => setForm((p) => ({ ...p, groupName: e.target.value }))} />
              </ReportField>
              <ReportField label="اليوم">
                <AppSelect searchable value={form.day} onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))}>
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </AppSelect>
              </ReportField>
              <ReportField label="التاريخ">
                <input className="app-input" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </ReportField>
              <ReportField label="وقت الحضور">
                <input className="app-input" type="time" value={form.arrivalTime} onChange={(e) => setForm((p) => ({ ...p, arrivalTime: e.target.value }))} />
              </ReportField>
              <ReportField label="وقت المغادرة">
                <input className="app-input" type="time" value={form.departureTime} onChange={(e) => setForm((p) => ({ ...p, departureTime: e.target.value }))} />
              </ReportField>
            </div>
          </section>

          {/* القسم 2: الموقع */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title"><MapPin size={18} /> الموقع الجغرافي</h3>
            <div className="report-field-grid report-field-grid--2">
              <ReportField label="القرية"><input className="app-input" value={form.village} readOnly /></ReportField>
              <ReportField label="المنطقة"><input className="app-input" value={geoDefaults.regionName} readOnly /></ReportField>
              <ReportField label="المحافظة"><input className="app-input" value={form.governorate} readOnly /></ReportField>
              <ReportField label="الدولة"><input className="app-input" value={form.country} readOnly /></ReportField>
            </div>
            <div className="school-report-location">
              <BusyButton type="button" className="google-btn" busy={locating} onClick={handleGetLocation}>
                <Navigation size={16} /> تحديد الموقع الحالي
              </BusyButton>
              {form.gpsLocation && (
                <div className="school-report-location__coords">
                  <span>{form.gpsLocation.lat.toFixed(5)}, {form.gpsLocation.lng.toFixed(5)}</span>
                  <button type="button" className="google-btn" onClick={() => openGoogleMaps(form.gpsLocation.lat, form.gpsLocation.lng)}>
                    فتح الخريطة
                  </button>
                  <MapLocationOpen gps={form.gpsLocation} />
                </div>
              )}
            </div>
          </section>

          {/* القسم 3: المعلمون */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title">المعلمون وتقييمهم بالنجوم</h3>
            {teachers.length === 0 ? (
              <p className="school-report-section__empty">لا يوجد معلمون مسجلون في هذه المدرسة.</p>
            ) : (
              <div className="school-report-teachers">
                {teachers.map((t) => {
                  const selected = form.teacherIds.includes(t.id);
                  return (
                  <div key={t.id} className={`school-report-teacher-row ${selected ? 'school-report-teacher-row--selected' : ''}`}>
                    <label className="school-report-teacher-row__check">
                      <input type="checkbox" checked={selected} disabled={readOnly} onChange={() => toggleTeacher(t.id)} />
                      <span>{t.displayName}</span>
                    </label>
                    <input
                      className="app-input"
                      placeholder="رقم الهاتف"
                      value={form.teacherPhoneMap[t.id] || ''}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          teacherPhoneMap: { ...p.teacherPhoneMap, [t.id]: e.target.value },
                        }))
                      }
                    />
                    {selected ? (
                      <StarRatingInput
                        compact
                        readOnly={readOnly}
                        label="تقييم المعلم"
                        value={form.teacherRatings[t.id] || 0}
                        onChange={(stars) => setTeacherRating(t.id, stars)}
                      />
                    ) : (
                      <span className="school-report-teacher-row__hint">حدّد المعلم لتقييمه</span>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* تقييم الطلاب بالنجوم */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title">تقييم الطلاب بالنجوم</h3>
            {!readOnly && (
              <p className="school-report-section__sub">قيّم كل طالب من 1 إلى 5 نجوم (اختياري — يُحفظ من حصل على نجمة واحدة فأكثر).</p>
            )}
            {form.starAwards.length === 0 ? (
              <p className="school-report-section__empty">لا يوجد طلاب مسجلون في هذه المدرسة.</p>
            ) : (
              <div className="school-report-student-stars">
                {form.starAwards.map((row) => (
                  <div key={row.studentId} className="school-report-student-stars__row">
                    <span className="school-report-student-stars__name">{row.name}</span>
                    <StarRatingInput
                      compact
                      readOnly={readOnly}
                      value={row.stars}
                      onChange={(stars) => setStudentStars(row.studentId, stars)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* الطلاب المتفوقون */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title">الطلاب المتفوقون</h3>
            {!readOnly && (
              <p className="school-report-section__sub">أضف أسماء الطلاب المتفوقين — يمكنك الكتابة أو الاختيار من قائمة الطلاب.</p>
            )}
            <ReportTextList
              readOnly={readOnly}
              items={form.outstandingStudents}
              onChange={(outstandingStudents) => setForm((p) => ({ ...p, outstandingStudents }))}
              placeholder="اسم الطالب المتفوق..."
              addLabel="إضافة طالب"
              emptyHint="لم تُضف أسماء بعد."
              suggestions={readOnly ? [] : students.map((s) => s.displayName).filter(Boolean)}
            />
          </section>

          {/* القرية والنشاطات */}
          <section className="surface-card school-report-section">
            <VillageReportFields
              readOnly={readOnly}
              showTitle
              showAdditionalNotes={false}
              sectionTitle="القرية والنشاطات"
              villageName={form.village}
              value={{
                teacherVillageActivities: form.teacherVillageActivities,
                institutionVillageActivities: form.institutionVillageActivities,
                fridaySermons: form.fridaySermons,
                newConvertsCount: form.newConvertsCount,
                hasInstitutionProjects: form.hasInstitutionProjects,
                institutionProjectsStatus: form.institutionProjectsStatus,
              }}
              onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
            />
            <ReportField label="ملاحظات إضافية" span={2}>
              <textarea
                className="app-input app-textarea"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="أي ملاحظات إضافية..."
                readOnly={readOnly}
                disabled={readOnly}
              />
            </ReportField>
          </section>

          {/* الحضور والغياب */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title">الحضور والغياب</h3>
            <div className="report-field-grid report-field-grid--2">
              <ReportField label="عدد الطلاب المسجلين">
                <input
                  className="app-input"
                  type="number"
                  min="0"
                  value={form.totalStudents}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => {
                    const total = Math.max(Number(e.target.value || 0), 0);
                    setForm((p) => ({ ...p, totalStudents: total, presentCount: Math.max(total - p.absentStudentIds.length, 0) }));
                  }}
                />
              </ReportField>
              <ReportField label="عدد الحضور (تلقائي)">
                <input className="app-input" type="number" value={form.presentCount} readOnly />
              </ReportField>
            </div>
            {!readOnly && (
              <YesNoRadio
                label="مراجعة الغياب"
                name="absenceReview"
                value={form.absenceReview}
                onChange={(val) => setForm((p) => ({ ...p, absenceReview: val }))}
              />
            )}
            {readOnly && form.absenceReview && (
              <p className="school-report-section__sub">مراجعة الغياب: {form.absenceReview}</p>
            )}
            <div className="school-report-absent-grid">
              {students.map((s) => (
                <label key={s.id} className="school-report-absent-item">
                  <input
                    type="checkbox"
                    checked={form.absentStudentIds.includes(s.id)}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...new Set([...form.absentStudentIds, s.id])]
                        : form.absentStudentIds.filter((id) => id !== s.id);
                      updateAbsences(next);
                    }}
                  />
                  <span>{s.displayName}</span>
                </label>
              ))}
            </div>
          </section>

          {/* المنهج */}
          <section className="surface-card school-report-section">
            <CurriculumLessonPicker
              curriculumList={curriculumList}
              entries={form.curriculumEntries}
              onChange={(entries) => setForm((p) => ({ ...p, curriculumEntries: entries }))}
              reportDate={form.date}
            />
          </section>

          {/* القسم 7: التقييمات */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title">التقييمات والملاحظات</h3>
            <div className="report-field-grid report-field-grid--2">
              {SCHOOL_EVAL_FIELDS.map(({ key, label }) => (
                <ReportField key={key} label={label}>
                  <EvalSelectWithOther
                    value={form[key]}
                    otherValue={form[`${key}Other`]}
                    onChange={(val) => setForm((p) => ({ ...p, [key]: val }))}
                    onOtherChange={(val) => setForm((p) => ({ ...p, [`${key}Other`]: val }))}
                    options={EVAL_QUALITY_OPTIONS}
                  />
                </ReportField>
              ))}
              <ReportField label="تعمل السوق؟">
                <EvalSelectWithOther
                  value={form.marketDone}
                  otherValue={form.marketDoneOther}
                  onChange={(val) => setForm((p) => ({ ...p, marketDone: val }))}
                  onOtherChange={(val) => setForm((p) => ({ ...p, marketDoneOther: val }))}
                  options={EVAL_YES_NO_OPTIONS}
                  placeholder="اكتب وصفاً عن السوق..."
                />
              </ReportField>
              <ReportField label="عدد الوجبات">
                <input className="app-input" type="number" min="0" value={form.mealsCount} onChange={(e) => setForm((p) => ({ ...p, mealsCount: e.target.value }))} />
              </ReportField>
              <ReportField label="المشرف">
                <input className="app-input" value={form.supervisorName} onChange={(e) => setForm((p) => ({ ...p, supervisorName: e.target.value }))} />
              </ReportField>
              <ReportField label="مسؤول المشاريع">
                <input className="app-input" value={form.projectsOfficerName} onChange={(e) => setForm((p) => ({ ...p, projectsOfficerName: e.target.value }))} />
              </ReportField>
            </div>
          </section>

          {/* القسم 8: الوسائط */}
          <section className="surface-card school-report-section">
            <h3 className="school-report-section__title"><ImageIcon size={18} /> صور وفيديوهات</h3>
            <div className="school-report-media">
              <label className="google-btn school-report-media__pick">
                <ImageIcon size={16} /> إرفاق صور/فيديو
                <input type="file" accept="image/*,video/*" multiple hidden onChange={handleMediaPick} />
              </label>
              {form.mediaFiles.map((f, i) => (
                <div key={`pending-${i}`} className="school-report-media__item">
                  {f.type?.startsWith('video') ? <Video size={16} /> : <ImageIcon size={16} />}
                  <span>{f.name}</span>
                  <button type="button" className="icon-btn" onClick={() => removePendingFile(i)}><X size={14} /></button>
                </div>
              ))}
              {form.mediaUrls.map((m, i) => (
                <div key={`saved-${i}`} className="school-report-media__item school-report-media__item--saved">
                  {m.type?.startsWith('video') ? <Video size={16} /> : <ImageIcon size={16} />}
                  <a href={m.url} target="_blank" rel="noreferrer">{m.name || 'مرفق'}</a>
                  <button type="button" className="icon-btn" onClick={() => removeSavedMedia(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* الشريط الجانبي: سجل الزيارات */}
        <aside className="school-report-page__aside">
          <div className="surface-card school-report-visits">
            <h3 className="school-report-visits__title"><Eye size={18} /> سجل الزيارات والتقارير السابقة</h3>
            <p className="school-report-visits__sub">بيانات الزيارات الميدانية المسجلة لهذه المدرسة</p>
            {visitReports.length === 0 ? (
              <p className="school-report-visits__empty">لا توجد زيارات مسجلة بعد.</p>
            ) : (
              <div className="school-report-visits__list">
                {visitReports.slice(0, 12).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="school-report-visits__item school-report-visits__item--clickable"
                    onClick={() => navigate(`/reports/${v.id}`)}
                  >
                    <div className="school-report-visits__item-head">
                      <Clock size={14} />
                      <span>{v.timestamp?.split('T')[0] || v.date}</span>
                    </div>
                    <p className="school-report-visits__item-title">{v.subjectName || v.reportTitle || 'زيارة ميدانية'}</p>
                    <p className="school-report-visits__item-meta">
                      {v.supervisorName} {v.week ? `• أسبوع ${v.week}` : ''}
                    </p>
                    {v.generalNotes && <p className="school-report-visits__item-notes">{v.generalNotes}</p>}
                    {v.mediaUrls?.length > 0 && (
                      <div className="school-report-visits__media">
                        {v.mediaUrls.slice(0, 3).map((m, i) => (
                          <a key={i} href={m.url} target="_blank" rel="noreferrer" className="school-report-visits__thumb">
                            {m.type?.startsWith('video') ? <Video size={12} /> : <ImageIcon size={12} />}
                          </a>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="google-btn google-btn--filled school-report-visits__comprehensive-btn"
              onClick={() => navigate(`/schools/${schoolId}/comprehensive-report`)}
            >
              عرض التقرير الشامل
            </button>
          </div>
        </aside>
      </div>

      <LazyReportPrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="معاينة تقرير المدرسة"
        bodyHtml={buildSchoolReportBodyHtml(buildExportable())}
        pdfExporting={pdfExporting}
        onDownloadPdf={async () => {
          setPdfExporting(true);
          try {
            const { exportSchoolReportPdf } = await loadSchoolReportExport();
            await exportSchoolReportPdf(buildExportable());
          } finally {
            setPdfExporting(false);
          }
        }}
        onDownloadExcel={async () => {
          const { exportSchoolReportExcel } = await loadSchoolReportExport();
          exportSchoolReportExcel(buildExportable());
        }}
      />

      {isMobile && !readOnly ? (
        <div className="school-report-mobile-save-bar">
          <BusyButton
            type="button"
            className="google-btn google-btn--filled school-report-mobile-save-bar__btn"
            busy={saving || uploading}
            onClick={handleSave}
          >
            <Save size={18} />
            {isEditing ? 'حفظ التعديلات' : 'حفظ التقرير'}
          </BusyButton>
        </div>
      ) : null}
    </div>
  );
};

export default SchoolReportPage;

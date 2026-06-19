import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  FileText,
  User,
  School,
  Calendar,
  Star,
  Info,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  Save,
  X,
  Printer,
  FileDown,
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import MapLocationOpen from '../../components/MapLocationOpen';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, reportMatchesScope } from '../../utils/permissionDataScope';
import BusyButton from '../../components/BusyButton';
import { clampVisitRatingSave, formatVisitRatingLabel, toStarDisplayValue } from '../../utils/visitRating';
import { prepPeriodLabel, formatDailyLogSubjects } from '../../utils/reportLabels';
import {
  attendanceStatusLabel,
  isAttendancePresent,
  normalizeAttendanceStatus,
} from '../../utils/attendanceStatus';
import { enrichDailyPrepReport } from '../../utils/enrichDailyPrepReport';
import AttendanceStatusIcon from '../../components/AttendanceStatusIcon';
import ReportDailyRecordCard from '../../components/ReportDailyRecordCard';
import DailyPrepEditor from '../../components/DailyPrepEditor';
import VisitReportEditor from '../../components/VisitReportEditor';
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';
import {
  buildDailyPrepSavePayload,
  formatDateInput,
  loadAllSchoolOptions,
  loadCurriculumList,
  mergeStudentRecords,
} from '../../utils/dailyPrepForm';
import { parseLegacyToEntries } from '../../utils/curriculumProgress';
import VillageReportDisplay from '../../components/VillageReportDisplay';
import { villageReportHasContent } from '../../utils/villageReportFields';
import {
  buildVisitSavePayload,
  loadVisitEditOptions,
  resolveVisitEditIds,
} from '../../utils/visitReportForm';
import LazyReportPrintPreviewModal from '../../components/LazyReportPrintPreviewModal';
import {
  buildReportDetailsBodyHtml,
  reportDetailsPreviewTitle,
} from '../../utils/reportDetailsHtml';
import { exportReportDetailsPdf } from '../../utils/reportDetailsExport';
import useAppTranslation from '../../hooks/useAppTranslation';

function resolveReportDocRef(api, type, ownerId, reportId) {
  if (!ownerId || !reportId) return null;
  if (type === 'visit') return api.getSupervisorReportDoc(ownerId, reportId);
  if (type === 'daily') return api.getTeacherDailyLogDoc(ownerId, reportId);
  if (type === 'weekly') return api.getTeacherReportDoc(ownerId, reportId);
  return null;
}

const getTypeLabels = (t) => ({
  visit: t('pages.ReportDetailsPage.زيارة_ميدانية', 'زيارة ميدانية'),
  daily: t('pages.ReportDetailsPage.تحضير_يومي', 'تحضير يومي'),
  weekly: t('pages.ReportDetailsPage.تقرير_أسبوعي', 'تقرير أسبوعي'),
});

const ReportDetailsPage = ({ viewerUser = null }) => {
  const { t } = useAppTranslation();
  const typeLabels = getTypeLabels(t);
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = usePermissions();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const [visitEdit, setVisitEdit] = useState(null);
  const [dailyEdit, setDailyEdit] = useState(null);
  const [weeklyEdit, setWeeklyEdit] = useState({ reportDataJson: '{}' });
  const [editSchoolOptions, setEditSchoolOptions] = useState([]);
  const [editCurriculumList, setEditCurriculumList] = useState([]);
  const [editVisitOptions, setEditVisitOptions] = useState({ schools: [], villages: [], curriculum: [] });
  const [editBootLoading, setEditBootLoading] = useState(false);
  const [visitEditBootLoading, setVisitEditBootLoading] = useState(false);
  const [editStudentsLoading, setEditStudentsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const editSchoolInitRef = useRef(null);

  const isAdmin = viewerUser?.role === 'admin' || viewerUser?.role === 'system_admin';
  const canEditReport = can(PERMISSION_PAGE_IDS.reports, 'report_edit');
  const canDeleteReport = can(PERMISSION_PAGE_IDS.reports, 'report_delete');

  const loadReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setAdminError('');
    try {
      const api = FirestoreApi.Api;
      const allVisits = await api.getCollectionGroupDocuments('reports');
      const visit = allVisits.find((r) => r.id === id);
      if (visit) {
        const data = visit.data() || {};
        const ownerId = visit.ref.parent.parent?.id || '';
        if (data.reportType === 'school_supervision' && data.schoolId) {
          navigate(`/schools/${data.schoolId}/report/${id}?ownerId=${ownerId}&view=1`, { replace: true });
          return;
        }
        setReport({ id, ...data, type: 'visit', _ownerId: ownerId });
        return;
      }
      const allDaily = await api.getCollectionGroupDocuments('teacher_daily_logs');
      const daily = allDaily.find((r) => r.id === id);
      if (daily) {
        const ownerId = daily.ref.parent.parent.id;
        const raw = { id, ...daily.data(), type: 'daily', _ownerId: ownerId };
        const enriched = await enrichDailyPrepReport(api, raw, ownerId);
        setReport(enriched);
        return;
      }
      const allWeekly = await api.getCollectionGroupDocuments('teacher_reports');
      const weekly = allWeekly.find((r) => r.id === id);
      if (weekly) {
        const ownerId = weekly.ref.parent.parent.id;
        setReport({ id, ...weekly.data(), type: 'weekly', _ownerId: ownerId });
        return;
      }
      setReport(null);
    } catch (err) {
      console.error(err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const beginEdit = () => {
    if (!report) return;
    setAdminError('');
    if (report.type === 'visit') {
      setVisitEdit(null);
    } else if (report.type === 'daily') {
      editSchoolInitRef.current = null;
      setDailyEdit(null);
    } else if (report.type === 'weekly') {
      setWeeklyEdit({
        submissionDate:
          (report.submissionDate && String(report.submissionDate).split('T')[0]) ||
          report.date ||
          '',
        week: report.week || '',
        reportDataJson: JSON.stringify(report.reportData || {}, null, 2)
      });
    }
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setAdminError('');
    setDailyEdit(null);
    setVisitEdit(null);
    editSchoolInitRef.current = null;
  };

  useEffect(() => {
    if (!editMode || report?.type !== 'visit') return undefined;

    let cancelled = false;
    (async () => {
      setVisitEditBootLoading(true);
      setAdminError('');
      try {
        const api = FirestoreApi.Api;
        const options = await loadVisitEditOptions(api);
        if (cancelled) return;

        const ids = resolveVisitEditIds(report, options);
        setEditVisitOptions(options);
        setVisitEdit({
          ...ids,
          generalNotes: report.generalNotes || '',
          teacherRating: toStarDisplayValue(report.teacherRating),
          villageRating: toStarDisplayValue(report.villageRating),
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setAdminError(t('pages.ReportDetailsPage.تعذر_تحميل_بيانات_تعديل_الزيارة', 'تعذر تحميل بيانات تعديل الزيارة.'));
      } finally {
        if (!cancelled) setVisitEditBootLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editMode, report]);

  useEffect(() => {
    if (!editMode || report?.type !== 'daily') return undefined;

    let cancelled = false;
    (async () => {
      setEditBootLoading(true);
      setAdminError('');
      try {
        const api = FirestoreApi.Api;
        const [schoolOpts, curList] = await Promise.all([
          loadAllSchoolOptions(api),
          loadCurriculumList(api),
        ]);
        if (cancelled) return;

        const entries = parseLegacyToEntries(report, curList);
        let schoolId = report.schoolId || '';
        if (!schoolId && report.schoolName) {
          const match = schoolOpts.find((s) => s.name === report.schoolName);
          schoolId = match?.id || '';
        }
        if (!schoolId && schoolOpts.length) schoolId = schoolOpts[0].id;

        const records = (report.records || []).map((r) => ({
          ...r,
          attendanceStatus: normalizeAttendanceStatus(r),
          note: r.note || '',
          memorization: r.memorization || '',
          review: r.review || '',
        }));

        setEditSchoolOptions(schoolOpts);
        setEditCurriculumList(curList);
        setDailyEdit({
          schoolId,
          prepPeriod: report.prepPeriod || 'weekly',
          prepDate: report.periodEnd || report.date || formatDateInput(),
          curriculumEntries: entries,
          prepNotes: report.prepNotes || '',
          records,
        });
        editSchoolInitRef.current = schoolId;
      } catch (err) {
        console.error(err);
        if (!cancelled) setAdminError(t('pages.ReportDetailsPage.تعذر_تحميل_بيانات_التعديل', 'تعذر تحميل بيانات التعديل.'));
      } finally {
        if (!cancelled) setEditBootLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editMode, report]);

  const reloadEditStudents = useCallback(async (schoolId, existingRecords) => {
    if (!schoolId) return;
    setEditStudentsLoading(true);
    try {
      const api = FirestoreApi.Api;
      const docsStu = await api.getDocuments(api.getSchoolStudentsCollection(schoolId));
      const stData = docsStu.map((d) => ({ id: d.id, ...d.data() }));
      setDailyEdit((prev) =>
        prev
          ? {
              ...prev,
              records: mergeStudentRecords(existingRecords ?? prev.records, stData),
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setAdminError(t('pages.ReportDetailsPage.تعذر_جلب_طلاب_المدرسة', 'تعذر جلب طلاب المدرسة.'));
    } finally {
      setEditStudentsLoading(false);
    }
  }, []);

  const handleEditSchoolChange = useCallback(
    (schoolId) => {
      if (editSchoolInitRef.current === null) {
        editSchoolInitRef.current = schoolId;
        return;
      }
      if (editSchoolInitRef.current === schoolId) return;
      editSchoolInitRef.current = schoolId;
      reloadEditStudents(schoolId);
    },
    [reloadEditStudents]
  );

  const handleAdminSave = async () => {
    if (!isAdmin || !report?._ownerId) return;
    const api = FirestoreApi.Api;
    const docRef = resolveReportDocRef(api, report.type, report._ownerId, report.id);
    if (!docRef) {
      setAdminError(t('pages.ReportDetailsPage.تعذر_تحديد_مسار_المستند', 'تعذر تحديد مسار المستند.'));
      return;
    }
    setSaving(true);
    setAdminError('');
    try {
      let data = {};
      if (report.type === 'visit') {
        if (!visitEdit) {
          setAdminError(t('pages.ReportDetailsPage.بيانات_تعديل_الزيارة_غير_جاهزة_بعد', 'بيانات تعديل الزيارة غير جاهزة بعد.'));
          setSaving(false);
          return;
        }
        if (!visitEdit.schoolId) {
          setAdminError(t('pages.ReportDetailsPage.يرجى_اختيار_المدرسة_من_القائمة', 'يرجى اختيار المدرسة من القائمة.'));
          setSaving(false);
          return;
        }
        if (!visitEdit.villageId) {
          setAdminError(t('pages.ReportDetailsPage.يرجى_اختيار_القرية_من_القائمة', 'يرجى اختيار القرية من القائمة.'));
          setSaving(false);
          return;
        }
        if (!visitEdit.subjectId) {
          setAdminError(t('pages.ReportDetailsPage.يرجى_اختيار_المادة_من_القائمة', 'يرجى اختيار المادة من القائمة.'));
          setSaving(false);
          return;
        }
        if (!visitEdit.week) {
          setAdminError(t('pages.ReportDetailsPage.يرجى_اختيار_الدرس_الأسبوع_من_القائمة', 'يرجى اختيار الدرس/الأسبوع من القائمة.'));
          setSaving(false);
          return;
        }
        data = {
          ...buildVisitSavePayload(visitEdit, editVisitOptions),
          teacherRating: clampVisitRatingSave(visitEdit.teacherRating),
          villageRating: clampVisitRatingSave(visitEdit.villageRating),
        };
      } else if (report.type === 'daily') {
        if (!dailyEdit) {
          setAdminError(t('pages.ReportDetailsPage.بيانات_التعديل_غير_جاهزة_بعد', 'بيانات التعديل غير جاهزة بعد.'));
          setSaving(false);
          return;
        }
        const hasCurriculum = dailyEdit.curriculumEntries?.some(
          (e) => (e.selectedWeeks || []).length > 0
        );
        if (!hasCurriculum) {
          setAdminError(t('pages.ReportDetailsPage.اختر_مادة_واحدة_أو_أكثر_من_المناهج_وحدّد_الأسبوع_الدرس_لكل_م', 'اختر مادة واحدة أو أكثر من المناهج وحدّد الأسبوع/الدرس لكل مادة'));
          setSaving(false);
          return;
        }
        if (!dailyEdit.schoolId) {
          setAdminError(t('pages.ReportDetailsPage.يرجى_اختيار_المدرسة', 'يرجى اختيار المدرسة'));
          setSaving(false);
          return;
        }
        const school = editSchoolOptions.find((s) => s.id === dailyEdit.schoolId);
        data = buildDailyPrepSavePayload({
          schoolId: dailyEdit.schoolId,
          schoolName: school?.name || report.schoolName || '',
          teacherId: report.teacherId || report._ownerId || '',
          teacherName: report.teacherName || '',
          prepPeriod: dailyEdit.prepPeriod,
          prepDate: dailyEdit.prepDate,
          curriculumEntries: dailyEdit.curriculumEntries,
          records: dailyEdit.records,
          prepNotes: dailyEdit.prepNotes,
          timestamp: report.timestamp,
        });
      } else if (report.type === 'weekly') {
        let reportData = {};
        try {
          reportData = weeklyEdit.reportDataJson.trim()
            ? JSON.parse(weeklyEdit.reportDataJson)
            : {};
        } catch {
          setAdminError(t('pages.ReportDetailsPage.تنسيق_JSON_لبيانات_التقرير_غير_صالح', 'تنسيق JSON لبيانات التقرير غير صالح.'));
          setSaving(false);
          return;
        }
        data = {
          submissionDate: weeklyEdit.submissionDate || null,
          week: weeklyEdit.week,
          reportData
        };
      }
      await api.updateData({ docRef, data, userData: viewerUser });
      setReport((r) => ({ ...r, ...data }));
      setEditMode(false);
      setDailyEdit(null);
      setVisitEdit(null);
      editSchoolInitRef.current = null;
    } catch (err) {
      console.error(err);
      setAdminError(t('pages.ReportDetailsPage.فشل_الحفظ_تحقق_من_قواعد_Firestore', 'فشل الحفظ. تحقق من قواعد Firestore.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!isAdmin || !report?._ownerId) return;
    const docRef = resolveReportDocRef(
      FirestoreApi.Api,
      report.type,
      report._ownerId,
      report.id
    );
    if (!docRef) return;
    if (
      !window.confirm(t('pages.ReportDetailsPage.حذف_هذا_التقرير_نهائياً؟_لا_يمكن_التراجع_عن_العملية', 'حذف هذا التقرير نهائياً؟ لا يمكن التراجع عن العملية.'))
    ) {
      return;
    }
    setSaving(true);
    setAdminError('');
    try {
      await FirestoreApi.Api.deleteData(docRef);
      if (isAdmin) navigate('/reports');
      else navigate(-1);
    } catch (err) {
      console.error(err);
      setAdminError(t('pages.ReportDetailsPage.تعذر_حذف_التقرير', 'تعذر حذف التقرير.'));
    } finally {
      setSaving(false);
    }
  };

  const renderWeeklyStatus = (val) => {
    if (val === true || val === 'isActive') {
      return <CheckCircle size={16} color="var(--success-color)" />;
    }
    return <XCircle size={16} color="var(--danger-color)" />;
  };

  if (loading) {
    return <div className="loading-spinner page-loading-lg" />;
  }
  if (!report) {
    return (
      <div className="empty-state report-details-empty">
        التقرير غير موجود
      </div>
    );
  }

  const reportScope = pageDataScope(PERMISSION_PAGE_IDS.reports);
  const actorId = actorUser?.uid || actorUser?.id || '';
  const reportForScope = {
    ...report,
    teacherId: report.teacherId || (report.type !== 'visit' ? report._ownerId : ''),
    supervisorId: report.supervisorId || (report.type === 'visit' ? report._ownerId : report.supervisorId),
  };
  if (
    ready &&
    !membershipLoading &&
    reportScope === DATA_SCOPE_MEMBERSHIP &&
    !reportMatchesScope(reportForScope, membershipGroupIds, actorId, reportScope)
  ) {
    return <Navigate to="/reports" replace />;
  }

  const dateDisplay =
    report.type === 'daily' && report.periodLabel
      ? report.periodLabel
      : report.timestamp?.split('T')[0] ||
        report.date ||
        (report.submissionDate && String(report.submissionDate).split('T')[0]) ||
        '—';

  const typeLabel =
    report.type === 'daily'
      ? `تحضير ${prepPeriodLabel(report.prepPeriod)}`
      : typeLabels[report.type] || report.type;

  const reportBodyHtml = buildReportDetailsBodyHtml(report, t);
  const previewTitle = reportDetailsPreviewTitle(report, t);

  return (
    <div className={`report-details-page portal-page${isMobile && editMode ? ' report-details-page--has-mobile-save' : ''}`}>
      <PageHeader
        topRow={
          <div className="report-details-page__top-row">
            <button type="button" className="page-nav-back" onClick={() => navigate(-1)}>
              <ChevronRight size={20} aria-hidden /> رجوع
            </button>
            <ChevronRight size={16} className="page-nav-separator" aria-hidden />
          </div>
        }
        title={
          <>
            تفاصيل التقرير:{' '}
            <span className="page-header-accent">{id.substring(0, 8)}</span>
          </>
        }
      >
        {!editMode && reportBodyHtml ? (
          <div className="school-report-page__toolbar">
            <button
              type="button"
              className="google-btn google-btn--toolbar"
              onClick={() => setPreviewOpen(true)}
            >
              <Printer size={16} aria-hidden />
              <span className="portal-toolbar__long">{t('pages.ReportDetailsPage.معاينة', 'معاينة')}</span>
              <span className="portal-toolbar__short">{t('pages.ReportDetailsPage.معاينة', 'معاينة')}</span>
            </button>
            <BusyButton
              type="button"
              className="google-btn google-btn--toolbar"
              busy={pdfExporting}
              onClick={async () => {
                setPdfExporting(true);
                try {
                  await exportReportDetailsPdf(report);
                } finally {
                  setPdfExporting(false);
                }
              }}
            >
              <FileDown size={16} aria-hidden /> PDF
            </BusyButton>
          </div>
        ) : null}
      </PageHeader>

      {isAdmin && (canEditReport || canDeleteReport) && !(isMobile && editMode) && (
        <div className="surface-card report-admin-toolbar">
          <span className="report-admin-toolbar__label">
            صلاحيات المدير: تعديل أو حذف هذا السجل
          </span>
          <div className="report-admin-toolbar__actions">
            {!editMode ? (
              <>
                {canEditReport && (
                  <BusyButton type="button" className="google-btn google-btn--toolbar" busy={saving} onClick={beginEdit}>
                    <span className="btn-inner btn-inner--sm">
                      <Pencil size={18} aria-hidden />
                      {t('components.ExplorationListCard.تعديل', 'تعديل')}
                    </span>
                  </BusyButton>
                )}
                {canDeleteReport && (
                  <BusyButton
                    type="button"
                    className="google-btn google-btn--toolbar report-admin-toolbar__danger-btn"
                    busy={saving}
                    onClick={handleAdminDelete}
                  >
                    <span className="btn-inner btn-inner--sm">
                      <Trash2 size={18} aria-hidden />
                      {t('components.ExplorationListCard.حذف', 'حذف')}
                    </span>
                  </BusyButton>
                )}
              </>
            ) : (
              <>
                <BusyButton
                  type="button"
                  className="google-btn google-btn--toolbar google-btn--filled"
                  busy={saving}
                  onClick={handleAdminSave}
                >
                  <span className="btn-inner btn-inner--sm">
                    <Save size={18} aria-hidden />
                    {t('components.MessengerPanel.حفظ', 'حفظ')}
                  </span>
                </BusyButton>
                <BusyButton type="button" className="google-btn google-btn--toolbar" busy={saving} onClick={cancelEdit}>
                  <span className="btn-inner btn-inner--sm">
                    <X size={18} aria-hidden />
                    {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
                  </span>
                </BusyButton>
              </>
            )}
          </div>
        </div>
      )}

      {adminError && (
        <div className="app-alert app-alert--error report-details-alert" role="alert">
          {adminError}
        </div>
      )}

      <div className="surface-card surface-card--lg report-details-card">
        {!editMode && (
          <div className="report-details-summary-grid">
            <div className="report-summary-field">
              <p className="report-summary-field__label">
                المشرف / المعلم
              </p>
              <div className="report-summary-field__row">
                <User size={18} color="var(--accent-color)" aria-hidden />
                <strong className="report-summary-field__value">
                  {report.supervisorName || report.teacherName || t('components.ExplorationDynamicFieldBlock.غير_محدد', 'غير محدد')}
                </strong>
              </div>
            </div>
            <div className="report-summary-field">
              <p className="report-summary-field__label">{t('components.DailyPrepEditor.المدرسة', 'المدرسة')}</p>
              <div className="report-summary-field__row">
                <School size={18} color="var(--accent-color)" aria-hidden />
                <strong className="report-summary-field__value">{report.schoolName || '—'}</strong>
              </div>
            </div>
            {report.type === 'visit' && report.villageName && (
              <div className="report-summary-field">
                <p className="report-summary-field__label">{t('pages.SchoolReportPage.القرية', 'القرية')}</p>
                <div className="report-summary-field__row">
                  <School size={18} color="var(--md-primary)" aria-hidden />
                  <strong className="report-summary-field__value">{report.villageName}</strong>
                </div>
              </div>
            )}
            <div className="report-summary-field">
              <p className="report-summary-field__label">
                التاريخ والوقت
              </p>
              <div className="report-summary-field__row">
                <Calendar size={18} color="var(--accent-color)" aria-hidden />
                <strong className="report-summary-field__value">{dateDisplay}</strong>
              </div>
            </div>
            <div className="report-summary-field">
              <p className="report-summary-field__label">
                {t('pages.SchoolReportPage.نوع_التقرير', 'نوع التقرير')}
              </p>
              <div className="report-summary-field__row report-summary-field__row--accent">
                <Info size={18} aria-hidden />
                <strong className="report-summary-field__value">{typeLabel}</strong>
              </div>
            </div>
          </div>
        )}

        {editMode && isAdmin && report.type === 'visit' && (
          <div className="report-visit-edit">
            <h3 className="report-daily-edit__title">{t('pages.ReportDetailsPage.تعديل_الزيارة_الميدانية', 'تعديل الزيارة الميدانية')}</h3>
            {visitEditBootLoading || !visitEdit ? (
              <div className="loading-spinner report-edit-loading" />
            ) : (
              <VisitReportEditor
                schoolOptions={editVisitOptions.schools}
                villageOptions={editVisitOptions.villages}
                curriculumList={editVisitOptions.curriculum}
                value={visitEdit}
                onChange={setVisitEdit}
              />
            )}
          </div>
        )}

        {editMode && isAdmin && report.type === 'daily' && (
          <div className="report-daily-edit">
            <h3 className="report-daily-edit__title">{t('pages.ReportDetailsPage.تعديل_سجل_التحضير', 'تعديل سجل التحضير')}</h3>
            {editBootLoading || !dailyEdit ? (
              <div className="loading-spinner report-edit-loading" />
            ) : (
              <DailyPrepEditor
                schoolOptions={editSchoolOptions}
                broadSchoolPick
                curriculumList={editCurriculumList}
                value={dailyEdit}
                onChange={setDailyEdit}
                teacherName={report.teacherName || ''}
                studentsLoading={editStudentsLoading}
                onSchoolChange={handleEditSchoolChange}
              />
            )}
          </div>
        )}

        {editMode && isAdmin && report.type === 'weekly' && (
          <div className="report-edit-form">
            <label className="app-field app-field--grow">
              <span className="app-label">{t('utils.reportDetailsHtml.تاريخ_الإرسال', 'تاريخ الإرسال')}</span>
              <input
                type="date"
                value={weeklyEdit.submissionDate}
                onChange={(e) => setWeeklyEdit((s) => ({ ...s, submissionDate: e.target.value }))}
                className="app-input"
              />
            </label>
            <label className="app-field app-field--grow">
              <span className="app-label">{t('pages.ReportDetailsPage.الأسبوع_الوصف', 'الأسبوع / الوصف')}</span>
              <input
                type="text"
                value={weeklyEdit.week}
                onChange={(e) => setWeeklyEdit((s) => ({ ...s, week: e.target.value }))}
                className="app-input"
              />
            </label>
            <label className="app-field app-field--grow">
              <span className="app-label">
                بيانات التقرير (JSON — مفاتيح الأنشطة)
              </span>
              <textarea
                value={weeklyEdit.reportDataJson}
                onChange={(e) => setWeeklyEdit((s) => ({ ...s, reportDataJson: e.target.value }))}
                rows={12}
                dir="ltr"
                className="app-textarea report-json-input"
              />
            </label>
          </div>
        )}

        {report.type === 'visit' && !editMode && (
          <>
            <div className="report-visit-scores">
              <div className="stat-tile report-visit-score-card">
                <Star size={24} className="report-visit-score-card__icon report-visit-score-card__icon--warning" aria-hidden />
                <p className="report-visit-score-card__label">{t('pages.SchoolReportPage.تقييم_المعلم', 'تقييم المعلم')}</p>
                <h2 className="report-visit-score-card__value report-visit-score-card__value--warning">
                  {formatVisitRatingLabel(report.teacherRating)}
                </h2>
              </div>
              <div className="stat-tile report-visit-score-card">
                <Star size={24} className="report-visit-score-card__icon report-visit-score-card__icon--success" aria-hidden />
                <p className="report-visit-score-card__label">
                  تقييم القرية / الموقع
                </p>
                <h2 className="report-visit-score-card__value report-visit-score-card__value--success">
                  {formatVisitRatingLabel(report.villageRating)}
                </h2>
              </div>
            </div>

            <div className="report-visit-notes-block">
              <h3 className="report-section-title">
                <FileText size={20} color="var(--accent-color)" aria-hidden /> ملاحظات وتوجيهات عن الزيارة المدرسية
              </h3>
              <div className="report-notes-box">
                {report.generalNotes || t('pages.ReportDetailsPage.لا_توجد_ملاحظات_عامة_مسجلة_لهذه_الزيارة', 'لا توجد ملاحظات عامة مسجلة لهذه الزيارة.')}
              </div>
            </div>

            {villageReportHasContent(report) && (
              <VillageReportDisplay report={report} villageName={report.villageName} />
            )}

            {report.studentsTracking && (
              <div>
                <h3 className="report-section-title">{t('pages.ReportDetailsPage.تتبع_أداء_الطلاب_أثناء_الزيارة', 'تتبع أداء الطلاب أثناء الزيارة')}</h3>
                <div className="report-visit-students-grid">
                  {report.studentsTracking.map((st, i) => (
                    <div
                      key={i}
                      className="activity-list-item activity-list-item--split report-visit-student-card"
                    >
                      <div>
                        <h4 className="activity-list-item__title">{st.name || t('pages.ReportDetailsPage.طالب_مجهول', 'طالب مجهول')}</h4>
                        <p className="activity-list-item__meta">
                          {st.note || t('pages.ReportDetailsPage.لا_توجد_ملاحظات', 'لا توجد ملاحظات')}
                        </p>
                      </div>
                      <div className="report-visit-student-card__stats">
                        {st.isPresent ? (
                          <span className="report-status-chip report-status-chip--present"><CheckCircle2 size={14} aria-hidden /> {t('components.SupervisorVisitStudentCard.حاضر', 'حاضر')}</span>
                        ) : (
                          <span className="report-status-chip report-status-chip--absent"><XCircle size={14} aria-hidden /> {t('pages.StudentDetailsPage.غائب', 'غائب')}</span>
                        )}
                        <div className="report-points-badge">
                          {st.points || 0} نقطة
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {report.type === 'daily' && !editMode && (
          <div>
            <h3 className="report-section-title report-section-title--tight">
              سجل التحضير ({prepPeriodLabel(report.prepPeriod)})
            </h3>
            {(formatDailyLogSubjects(report) || report.periodStart) && (
              <p className="report-section-lead">
                {formatDailyLogSubjects(report) && (
                  <>{t('pages.ReportDetailsPage.المواد', 'المواد:')} <strong>{formatDailyLogSubjects(report)}</strong></>
                )}
                {report.periodStart && report.periodEnd && report.periodStart !== report.periodEnd && (
                  <> {t('pages.ReportDetailsPage.الفترة', '• الفترة:')} <strong>{report.periodStart} — {report.periodEnd}</strong></>
                )}
              </p>
            )}
            {report.attendanceSummary && (
              <p className="report-section-lead report-section-lead--sm">
                ملخص الحضور: <strong>{report.attendanceSummary}</strong>
              </p>
            )}
            {report.prepNotes && (
              <div className="app-alert app-alert--info report-daily-prep-alert">
                <strong>{t('pages.ReportDetailsPage.ملاحظات_التحضير', 'ملاحظات التحضير:')}</strong> {report.prepNotes}
              </div>
            )}
            {Array.isArray(report.curriculumProgressSummary) && report.curriculumProgressSummary.length > 0 && (
              <div className="curriculum-picker__summary report-curriculum-summary">
                {report.curriculumProgressSummary.map((p) => (
                  <span key={p.subjectId} className="curriculum-picker__badge curriculum-picker__badge--track">
                    {p.subjectName}: {p.label}
                  </span>
                ))}
              </div>
            )}
            <div className="surface-card report-daily-records-desktop">
              <div className="md-table-scroll">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th>{t('components.DailyPrepEditor.اسم_الطالب', 'اسم الطالب')}</th>
                      <th>{t('utils.schoolReportExport.الحالة', 'الحالة')}</th>
                      <th>{t('pages.ReportDetailsPage.الحفظ', 'الحفظ')}</th>
                      <th>{t('pages.ReportDetailsPage.المراجعة', 'المراجعة')}</th>
                      <th>{t('components.DailyPrepStudentCard.ملاحظة', 'ملاحظة')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.records?.map((r) => {
                      const present = isAttendancePresent(r);
                      const label = attendanceStatusLabel(r);
                      return (
                      <tr key={r.studentId} className={!present ? 'md-table__row--absent' : ''}>
                        <td className="report-daily-table__name">{r.name}</td>
                        <td>
                          <span
                            className={`daily-prep-status-badge daily-prep-status-badge--${r.attendanceStatus || (present ? 'present' : 'absent')}`}
                          >
                            <AttendanceStatusIcon
                              status={r.attendanceStatus || (present ? 'present' : 'absent')}
                              size={16}
                              className="daily-prep-status-badge__icon"
                            />
                            {label}
                          </span>
                        </td>
                        <td>{r.memorization || '—'}</td>
                        <td>{r.review || '—'}</td>
                        <td>{r.note || '—'}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="report-daily-records-mobile">
              {report.records?.map((r) => (
                <ReportDailyRecordCard key={r.studentId} record={r} />
              ))}
            </div>
          </div>
        )}

        {report.type === 'weekly' && !editMode && (
          <div>
            <h3 className="report-section-title">{t('pages.ReportDetailsPage.أنشطة_الأسبوع', 'أنشطة الأسبوع')}</h3>
            {report.reportData &&
              Object.entries(report.reportData).map(([key, val]) => (
                <div key={key} className="report-weekly-activity-card">
                  <div className="report-weekly-activity-card__head">
                    <strong>{key}</strong>
                    {renderWeeklyStatus(val?.isActive)}
                  </div>
                  <p className="report-weekly-activity-card__body">
                    {val?.details || t('pages.ReportDetailsPage.لا_توجد_ملاحظات_إضافية', 'لا توجد ملاحظات إضافية')}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      <MapLocationOpen
        gpsLocation={report.gpsLocation}
        label={t('pages.ReportDetailsPage.الموقع_الجغرافي_للزيارة', 'الموقع الجغرافي للزيارة')}
        subtitle={t('pages.ReportDetailsPage.لم_يتم_تسجيل_إحداثيات_GPS_لهذا_التقرير', 'لم يتم تسجيل إحداثيات GPS لهذا التقرير')}
      />

      {isMobile && editMode && isAdmin && (canEditReport || canDeleteReport) ? (
        <div className="report-details-mobile-save-bar">
          <BusyButton type="button" className="google-btn report-details-mobile-save-bar__btn" busy={saving} onClick={cancelEdit}>
            <X size={18} aria-hidden />
            {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
          </BusyButton>
          <BusyButton
            type="button"
            className="google-btn google-btn--filled report-details-mobile-save-bar__btn"
            busy={saving}
            onClick={handleAdminSave}
          >
            <Save size={18} aria-hidden />
            {t('components.MessengerPanel.حفظ', 'حفظ')}
          </BusyButton>
        </div>
      ) : null}

      <LazyReportPrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewTitle}
        bodyHtml={reportBodyHtml}
        pdfExporting={pdfExporting}
        onDownloadPdf={async () => {
          setPdfExporting(true);
          try {
            await exportReportDetailsPdf(report);
          } finally {
            setPdfExporting(false);
          }
        }}
      />
    </div>
  );
};

export default ReportDetailsPage;

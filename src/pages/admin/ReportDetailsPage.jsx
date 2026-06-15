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
  X
} from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import MapLocationOpen from '../../components/MapLocationOpen';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, reportMatchesScope } from '../../utils/permissionDataScope';
import StarRatingInput from '../../components/StarRatingInput';
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
import DailyPrepEditor from '../../components/DailyPrepEditor';
import {
  buildDailyPrepSavePayload,
  formatDateInput,
  loadAllSchoolOptions,
  loadCurriculumList,
  mergeStudentRecords,
} from '../../utils/dailyPrepForm';
import { parseLegacyToEntries } from '../../utils/curriculumProgress';

function resolveReportDocRef(api, type, ownerId, reportId) {
  if (!ownerId || !reportId) return null;
  if (type === 'visit') return api.getSupervisorReportDoc(ownerId, reportId);
  if (type === 'daily') return api.getTeacherDailyLogDoc(ownerId, reportId);
  if (type === 'weekly') return api.getTeacherReportDoc(ownerId, reportId);
  return null;
}

const TYPE_LABELS = {
  visit: 'زيارة ميدانية',
  daily: 'تحضير يومي',
  weekly: 'تقرير أسبوعي'
};

const ReportDetailsPage = ({ viewerUser = null }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = usePermissions();

  const [visitEdit, setVisitEdit] = useState({});
  const [dailyEdit, setDailyEdit] = useState(null);
  const [weeklyEdit, setWeeklyEdit] = useState({ reportDataJson: '{}' });
  const [editSchoolOptions, setEditSchoolOptions] = useState([]);
  const [editCurriculumList, setEditCurriculumList] = useState([]);
  const [editBootLoading, setEditBootLoading] = useState(false);
  const [editStudentsLoading, setEditStudentsLoading] = useState(false);
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
          navigate(`/schools/${data.schoolId}/report/${id}?ownerId=${ownerId}`, { replace: true });
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
      setVisitEdit({
        schoolName: report.schoolName || '',
        subjectName: report.subjectName || '',
        generalNotes: report.generalNotes || '',
        teacherRating: toStarDisplayValue(report.teacherRating),
        villageRating: toStarDisplayValue(report.villageRating),
      });
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
    editSchoolInitRef.current = null;
  };

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
        if (!cancelled) setAdminError('تعذر تحميل بيانات التعديل.');
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
      setAdminError('تعذر جلب طلاب المدرسة.');
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
      setAdminError('تعذر تحديد مسار المستند.');
      return;
    }
    setSaving(true);
    setAdminError('');
    try {
      let data = {};
      if (report.type === 'visit') {
        data = {
          schoolName: visitEdit.schoolName,
          subjectName: visitEdit.subjectName,
          generalNotes: visitEdit.generalNotes,
          teacherRating: clampVisitRatingSave(visitEdit.teacherRating),
          villageRating: clampVisitRatingSave(visitEdit.villageRating),
        };
      } else if (report.type === 'daily') {
        if (!dailyEdit) {
          setAdminError('بيانات التعديل غير جاهزة بعد.');
          setSaving(false);
          return;
        }
        const hasCurriculum = dailyEdit.curriculumEntries?.some(
          (e) => (e.selectedWeeks || []).length > 0
        );
        if (!hasCurriculum) {
          setAdminError('اختر مادة واحدة أو أكثر من المناهج وحدّد الأسبوع/الدرس لكل مادة');
          setSaving(false);
          return;
        }
        if (!dailyEdit.schoolId) {
          setAdminError('يرجى اختيار المدرسة');
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
          setAdminError('تنسيق JSON لبيانات التقرير غير صالح.');
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
      editSchoolInitRef.current = null;
    } catch (err) {
      console.error(err);
      setAdminError('فشل الحفظ. تحقق من قواعد Firestore.');
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
      !window.confirm('حذف هذا التقرير نهائياً؟ لا يمكن التراجع عن العملية.')
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
      setAdminError('تعذر حذف التقرير.');
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
    return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
  }
  if (!report) {
    return (
      <div className="empty-state" style={{ margin: '2rem auto', maxWidth: '480px' }}>
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
      : TYPE_LABELS[report.type] || report.type;

  return (
    <div className="report-details-page">
      <PageHeader
        topRow={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="page-nav-back" onClick={() => navigate(-1)}>
              <ChevronRight size={20} aria-hidden /> رجوع
            </button>
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
          </div>
        }
        title={
          <>
            تفاصيل التقرير:{' '}
            <span style={{ color: 'var(--md-primary)' }}>{id.substring(0, 8)}</span>
          </>
        }
      />

      {isAdmin && (canEditReport || canDeleteReport) && (
        <div className="surface-card report-admin-toolbar">
          <span className="report-admin-toolbar__label">
            صلاحيات المدير: تعديل أو حذف هذا السجل
          </span>
          <div className="report-admin-toolbar__actions">
            {!editMode ? (
              <>
                {canEditReport && (
                  <BusyButton type="button" className="google-btn google-btn--toolbar" busy={saving} onClick={beginEdit}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Pencil size={18} style={{ marginLeft: 6 }} aria-hidden />
                      تعديل
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Trash2 size={18} style={{ marginLeft: 6 }} aria-hidden />
                      حذف
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Save size={18} style={{ marginLeft: 6 }} aria-hidden />
                    حفظ
                  </span>
                </BusyButton>
                <BusyButton type="button" className="google-btn google-btn--toolbar" busy={saving} onClick={cancelEdit}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <X size={18} style={{ marginLeft: 6 }} aria-hidden />
                    إلغاء
                  </span>
                </BusyButton>
              </>
            )}
          </div>
        </div>
      )}

      {adminError && (
        <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }} role="alert">
          {adminError}
        </div>
      )}

      <div className="surface-card surface-card--lg report-details-card">
        {!editMode && (
          <div className="report-details-summary-grid">
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                المشرف / المعلم
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <User size={18} color="var(--accent-color)" />
                <strong style={{ fontSize: '1.1rem' }}>
                  {report.supervisorName || report.teacherName || 'غير محدد'}
                </strong>
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المدرسة</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <School size={18} color="var(--accent-color)" />
                <strong style={{ fontSize: '1.1rem' }}>{report.schoolName || '—'}</strong>
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                التاريخ والوقت
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <Calendar size={18} color="var(--accent-color)" />
                <strong style={{ fontSize: '1.1rem' }}>{dateDisplay}</strong>
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                نوع التقرير
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  color: 'var(--accent-color)'
                }}
              >
                <Info size={18} />
                <strong style={{ fontSize: '1.1rem' }}>{typeLabel}</strong>
              </div>
            </div>
          </div>
        )}

        {editMode && isAdmin && report.type === 'visit' && (
          <div className="report-edit-form">
            <label className="app-field app-field--grow">
              <span className="app-label">اسم المدرسة</span>
              <input
                type="text"
                value={visitEdit.schoolName}
                onChange={(e) => setVisitEdit((s) => ({ ...s, schoolName: e.target.value }))}
                className="app-input"
              />
            </label>
            <label className="app-field app-field--grow">
              <span className="app-label">المادة</span>
              <input
                type="text"
                value={visitEdit.subjectName}
                onChange={(e) => setVisitEdit((s) => ({ ...s, subjectName: e.target.value }))}
                className="app-input"
              />
            </label>
            <div className="report-edit-form__two-cols" style={{ alignItems: 'flex-start' }}>
              <div className="app-field app-field--grow">
                <StarRatingInput
                  label="تقييم المعلم (من 5 نجوم)"
                  value={visitEdit.teacherRating}
                  onChange={(n) => setVisitEdit((s) => ({ ...s, teacherRating: n }))}
                />
              </div>
              <div className="app-field app-field--grow">
                <StarRatingInput
                  label="تقييم القرية (من 5 نجوم)"
                  value={visitEdit.villageRating}
                  onChange={(n) => setVisitEdit((s) => ({ ...s, villageRating: n }))}
                />
              </div>
            </div>
            <label className="app-field app-field--grow">
              <span className="app-label">ملاحظات المشرف</span>
              <textarea
                value={visitEdit.generalNotes}
                onChange={(e) => setVisitEdit((s) => ({ ...s, generalNotes: e.target.value }))}
                rows={5}
                className="app-textarea"
              />
            </label>
          </div>
        )}

        {editMode && isAdmin && report.type === 'daily' && (
          <div className="report-daily-edit">
            <h3 className="report-daily-edit__title">تعديل سجل التحضير</h3>
            {editBootLoading || !dailyEdit ? (
              <div className="loading-spinner" style={{ margin: '2rem auto' }} />
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
              <span className="app-label">تاريخ الإرسال</span>
              <input
                type="date"
                value={weeklyEdit.submissionDate}
                onChange={(e) => setWeeklyEdit((s) => ({ ...s, submissionDate: e.target.value }))}
                className="app-input"
              />
            </label>
            <label className="app-field app-field--grow">
              <span className="app-label">الأسبوع / الوصف</span>
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2.5rem'
              }}
            >
              <div className="stat-tile">
                <Star size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>تقييم المعلم</p>
                <h2 style={{ margin: '8px 0 0', fontSize: '2rem', color: '#f59e0b' }}>
                  {formatVisitRatingLabel(report.teacherRating)}
                </h2>
              </div>
              <div className="stat-tile">
                <Star size={24} color="var(--success-color)" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  تقييم القرية / الموقع
                </p>
                <h2 style={{ margin: '8px 0 0', fontSize: '2rem', color: 'var(--success-color)' }}>
                  {formatVisitRatingLabel(report.villageRating)}
                </h2>
              </div>
            </div>

            <div style={{ marginBottom: '2.5rem' }}>
              <h3
                style={{
                  fontSize: '1.2rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileText size={20} color="var(--accent-color)" /> ملاحظات وتوصيات المشرف
              </h3>
              <div
                style={{
                  background: 'var(--bg-color)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)'
                }}
              >
                {report.generalNotes || 'لا توجد ملاحظات عامة مسجلة لهذه الزيارة.'}
              </div>
            </div>

            {report.studentsTracking && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>تتبع أداء الطلاب أثناء الزيارة</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {report.studentsTracking.map((st, i) => (
                    <div
                      key={i}
                      className="activity-list-item activity-list-item--split"
                      style={{ padding: '1.25rem' }}
                    >
                      <div>
                        <h4 style={{ margin: 0 }}>{st.name || 'طالب مجهول'}</h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {st.note || 'لا توجد ملاحظات'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        {st.isPresent ? (
                          <span style={{ color: 'var(--success-color)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} /> حاضر</span>
                        ) : (
                          <span style={{ color: 'var(--danger-color)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><XCircle size={14} /> غائب</span>
                        )}
                        <div
                          style={{
                            padding: '4px 12px',
                            background: 'var(--accent-glow)',
                            color: 'var(--accent-color)',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 700
                          }}
                        >
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
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              سجل التحضير ({prepPeriodLabel(report.prepPeriod)})
            </h3>
            {(formatDailyLogSubjects(report) || report.periodStart) && (
              <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {formatDailyLogSubjects(report) && (
                  <>المواد: <strong>{formatDailyLogSubjects(report)}</strong></>
                )}
                {report.periodStart && report.periodEnd && report.periodStart !== report.periodEnd && (
                  <> • الفترة: <strong>{report.periodStart} — {report.periodEnd}</strong></>
                )}
              </p>
            )}
            {report.attendanceSummary && (
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                ملخص الحضور: <strong>{report.attendanceSummary}</strong>
              </p>
            )}
            {report.prepNotes && (
              <div className="app-alert app-alert--info" style={{ marginBottom: '1rem' }}>
                <strong>ملاحظات التحضير:</strong> {report.prepNotes}
              </div>
            )}
            {Array.isArray(report.curriculumProgressSummary) && report.curriculumProgressSummary.length > 0 && (
              <div className="curriculum-picker__summary" style={{ marginBottom: '1rem' }}>
                {report.curriculumProgressSummary.map((p) => (
                  <span key={p.subjectId} className="curriculum-picker__badge curriculum-picker__badge--track">
                    {p.subjectName}: {p.label}
                  </span>
                ))}
              </div>
            )}
            <div className="surface-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div className="md-table-scroll">
                <table className="md-table" style={{ minWidth: 'unset' }}>
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>الحالة</th>
                      <th>الحفظ</th>
                      <th>المراجعة</th>
                      <th>ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.records?.map((r) => {
                      const present = isAttendancePresent(r);
                      const label = attendanceStatusLabel(r);
                      return (
                      <tr key={r.studentId} className={!present ? 'md-table__row--absent' : ''}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
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
          </div>
        )}

        {report.type === 'weekly' && !editMode && (
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>أنشطة الأسبوع</h3>
            {report.reportData &&
              Object.entries(report.reportData).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-color)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <strong>{key}</strong>
                    {renderWeeklyStatus(val?.isActive)}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {val?.details || 'لا توجد ملاحظات إضافية'}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      <MapLocationOpen
        gpsLocation={report.gpsLocation}
        label="الموقع الجغرافي للزيارة"
        subtitle="لم يتم تسجيل إحداثيات GPS لهذا التقرير"
      />
    </div>
  );
};

export default ReportDetailsPage;


import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, Users, School, BookOpen, CalendarDays, CalendarRange, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import CurriculumLessonPicker from '../../components/CurriculumLessonPicker';
import AttendanceStatusIcon from '../../components/AttendanceStatusIcon';
import DailyPrepStudentCard from '../../components/DailyPrepStudentCard';
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
import { skipsMembershipDataScopeLoading } from '../../utils/systemRoles';
import { canPickAnySchoolForPrep, resolveDailyPrepSchoolOptions } from '../../utils/dailyPrepSchools';
import {
  getAttendanceStatuses,
  applyAttendanceStatus,
  attendanceSummaryText,
  countByAttendanceStatus,
  defaultAttendanceRecord,
  isAttendancePresent,
} from '../../utils/attendanceStatus';
import {
  entriesToLegacyItems,
  summarizeCurriculumProgress,
} from '../../utils/curriculumProgress';
import {
  getPrepPeriodOptions,
  periodSaveLabel,
  getPeriodRange,
} from '../../utils/dailyPrepForm';
import useAppTranslation from '../../hooks/useAppTranslation';

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : '');

const TeacherDailyLogPage = ({ user }) => {
  const { t } = useAppTranslation();
  const prepPeriodOptions = useMemo(() => getPrepPeriodOptions(t), [t]);
  const attendanceStatuses = useMemo(() => getAttendanceStatuses(t), [t]);
  const savePeriodLabel = (period) => periodSaveLabel(period, t);
  const actorId = user?.uid || user?.id;
  const perm = usePermissions();
  const { ready, pageDataScope, membershipLoading, actorUser } = perm;
  const actor = actorUser || user;
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const broadSchoolPick = useMemo(
    () => canPickAnySchoolForPrep(actor, pageDataScope),
    [actor, pageDataScope]
  );

  const pickSchool = (sid) => {
    setActiveSchoolId(sid);
    const key = teacherSchoolStorageKey(actorId);
    if (key && sid) localStorage.setItem(key, sid);
    setCurriculumEntries([]);
    setSuccess('');
  };
  const [curriculumList, setCurriculumList] = useState([]);
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [students, setStudents] = useState([]);
  const [trackingData, setTrackingData] = useState([]);
  const [curriculumEntries, setCurriculumEntries] = useState([]);

  const [bootLoading, setBootLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSchoolId, setActiveSchoolId] = useState('');

  const [prepPeriod, setPrepPeriod] = useState('weekly');
  const [prepDate, setPrepDate] = useState(formatDateInput());
  const [prepNotes, setPrepNotes] = useState('');
  const [setupOpen, setSetupOpen] = useState(true);

  const activeSchool = useMemo(
    () => schoolOptions.find((o) => o.id === activeSchoolId),
    [schoolOptions, activeSchoolId]
  );

  const periodRange = useMemo(
    () => getPeriodRange(prepPeriod, prepDate ? new Date(prepDate) : new Date()),
    [prepPeriod, prepDate]
  );

  const statusCounts = useMemo(() => countByAttendanceStatus(trackingData), [trackingData]);
  const presentCount = (statusCounts.present || 0) + (statusCounts.late || 0);

  useEffect(() => {
    if (!isMobile) {
      setSetupOpen(true);
      return;
    }
    if (activeSchoolId && students.length > 0 && !studentsLoading) {
      setSetupOpen(false);
    } else {
      setSetupOpen(true);
    }
  }, [isMobile, activeSchoolId, students.length, studentsLoading]);

  useEffect(() => {
    if (!ready) return;
    const prepScope = pageDataScope(PERMISSION_PAGE_IDS.daily_preparation);
    const needsMembership =
      !skipsMembershipDataScopeLoading(actor) &&
      prepScope === DATA_SCOPE_MEMBERSHIP;
    if (needsMembership && membershipLoading) return;

    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const [options, docsCur] = await Promise.all([
          resolveDailyPrepSchoolOptions(api, actor, { pageDataScope }),
          api.getDocuments(api.getCurriculumCollection()),
        ]);
        if (cancelled) return;

        if (!options.length) {
          if (broadSchoolPick) {
            setError(t('pages.TeacherDailyLogPage.لا_توجد_مدارس_مسجلة_في_النظام_حالياً', 'لا توجد مدارس مسجلة في النظام حالياً.'));
          } else {
            setError(
              t('pages.TeacherDailyLogPage.الحساب_غير_مرتبط_بمدرسة_اطلب_من_الإدارة_تعيينك_في_مدرسة_من_ص', 'الحساب غير مرتبط بمدرسة. اطلب من الإدارة تعيينك في مدرسة من صفحة تفاصيل المدرسة.')
            );
          }
          setSchoolOptions([]);
          setActiveSchoolId('');
          setCurriculumList(docsCur.map((d) => ({ id: d.id, ...d.data() })));
          return;
        }

        setSchoolOptions(options);
        setCurriculumList(docsCur.map((d) => ({ id: d.id, ...d.data() })));
        const key = teacherSchoolStorageKey(actorId);
        let sid = (key && localStorage.getItem(key)) || '';
        if (!sid || !options.some((o) => o.id === sid)) sid = options[0].id;
        setActiveSchoolId(sid);
      } catch (err) {
        console.error(err);
        setError(t('pages.TeacherDailyLogPage.حدث_خطأ_أثناء_الاتصال_بقاعدة_البيانات', 'حدث خطأ أثناء الاتصال بقاعدة البيانات'));
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    actor,
    actorId,
    pageDataScope,
    membershipLoading,
    broadSchoolPick,
  ]);

  useEffect(() => {
    if (!activeSchoolId) {
      setStudents([]);
      setTrackingData([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const refStu = api.getSchoolStudentsCollection(activeSchoolId);
        const docsStu = await api.getDocuments(refStu);
        if (cancelled) return;
        const stData = docsStu.map((d) => ({ id: d.id, ...d.data() }));
        setStudents(stData);
        setTrackingData(
          stData.map((s) =>
            defaultAttendanceRecord({
              studentId: s.id,
              name: s.displayName || s.studentName || s.name || t('components.MessengerPanel.طالب', 'طالب'),
            })
          )
        );
      } catch (err) {
        console.error(err);
        setError(t('pages.TeacherDailyLogPage.حدث_خطأ_أثناء_جلب_طلاب_المدرسة', 'حدث خطأ أثناء جلب طلاب المدرسة'));
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSchoolId]);

  const handleActiveSchoolChange = (e) => {
    pickSchool(e.target.value);
  };

  const handleTrackingChange = (studentId, field, value) => {
    setTrackingData((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, [field]: value } : item))
    );
  };

  const handleStatusChange = (studentId, status) => {
    setTrackingData((prev) =>
      prev.map((item) => (item.studentId === studentId ? applyAttendanceStatus(item, status) : item))
    );
  };

  const markAllPresent = () => {
    setTrackingData((prev) => prev.map((item) => applyAttendanceStatus(item, 'present')));
  };

  const markAllAbsent = () => {
    setTrackingData((prev) => prev.map((item) => applyAttendanceStatus(item, 'absent')));
  };

  const handleSaveLog = async () => {
    if (!activeSchoolId) {
      setError(t('pages.TeacherDailyLogPage.يرجى_اختيار_المدرسة_أولاً', 'يرجى اختيار المدرسة أولاً'));
      return;
    }
    const hasCurriculum = curriculumEntries.some((e) => (e.selectedWeeks || []).length > 0);
    if (!hasCurriculum) {
      setError(t('pages.ReportDetailsPage.اختر_مادة_واحدة_أو_أكثر_من_المناهج_وحدّد_الأسبوع_الدرس_لكل_م', 'اختر مادة واحدة أو أكثر من المناهج وحدّد الأسبوع/الدرس لكل مادة'));
      return;
    }
    if (!trackingData.length) {
      setError(t('pages.TeacherDailyLogPage.لا_يوجد_طلاب_مسجلون_في_هذه_المدرسة', 'لا يوجد طلاب مسجلون في هذه المدرسة'));
      return;
    }
    if (!actorId) {
      setError(t('pages.TeacherDailyLogPage.تعذر_تحديد_معرف_المعلم_للحفظ', 'تعذر تحديد معرف المعلم للحفظ.'));
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const api = FirestoreApi.Api;
      const logId = api.getNewId('teacher_daily_logs');
      const logRef = api.getTeacherDailyLogDoc(actorId, logId);

      const totalPresent = trackingData.filter((s) => isAttendancePresent(s)).length;
      const progressSummary = summarizeCurriculumProgress(curriculumEntries, prepDate);
      const primary = progressSummary[0] || {};
      const allLessons = curriculumEntries.flatMap((e) =>
        (e.lessons || []).map((l) => `${e.subjectName}: أسبوع ${l.week}${l.lesson ? ` (${l.lesson})` : ''}`)
      );

      const logPayload = {
        teacherId: actorId,
        schoolId: activeSchoolId,
        schoolName: activeSchool?.name || '',
        date: periodRange.end,
        periodStart: periodRange.start,
        periodEnd: periodRange.end,
        periodLabel: periodRange.label,
        prepPeriod,
        curriculumEntries,
        curriculumProgressSummary: progressSummary,
        curriculumItems: entriesToLegacyItems(curriculumEntries),
        subjectId: primary.subjectId || curriculumEntries[0]?.subjectId || '',
        subjectName: curriculumEntries.map((e) => e.subjectName).join(t('components.ExplorationDataModal.،', '، ')),
        week: primary.reportedWeek || curriculumEntries[0]?.selectedWeeks?.[0] || '',
        lessonName: allLessons.join(' | '),
        totalStudents: trackingData.length,
        totalPresent,
        totalAbsent: trackingData.length - totalPresent,
        attendanceSummary: attendanceSummaryText(trackingData),
        prepNotes: prepNotes.trim(),
        records: trackingData.map((r) => ({
          ...r,
          attendanceStatus: r.attendanceStatus || (r.isPresent ? 'present' : 'absent'),
          isPresent: isAttendancePresent(r),
        })),
        timestamp: new Date().toISOString(),
      };

      await api.setData({ docRef: logRef, data: logPayload });

      setSuccess(`تم حفظ التحضير ${periodSaveLabel(prepPeriod)} بنجاح لمدرسة «${activeSchool?.name || ''}»`);
      setTrackingData((prev) => prev.map((item) => ({ ...item, memorization: '', review: '' })));
    } catch (err) {
      console.error(err);
      setError(t('pages.TeacherDailyLogPage.حدث_خطأ_أثناء_حفظ_التحضير', 'حدث خطأ أثناء حفظ التحضير'));
    } finally {
      setSaving(false);
    }
  };

  if (bootLoading) return <div className="loading-spinner page-loading-md" />;

  return (
    <div className={`portal-page daily-prep-page${isMobile && students.length > 0 ? ' daily-prep-page--has-mobile-save' : ''}`}>
      <PageHeader
        icon={Calendar}
        iconColor="var(--success-color)"
        title={t('config.appNavItems.التحضير', 'التحضير')}
        subtitle={
          broadSchoolPick
            ? t('pages.TeacherDailyLogPage.صلاحية_شاملة_اختر_أي_مدرسة_ثم_سجّل_التحضير', 'صلاحية شاملة — اختر أي مدرسة ثم سجّل التحضير')
            : t('pages.TeacherDailyLogPage.المدارس_المعيّنة_لك_فقط_اختر_المدرسة_والفترة_والمواد', 'المدارس المعيّنة لك فقط — اختر المدرسة والفترة والمواد')
        }
      />

      {error && <div className="app-alert app-alert--error daily-prep-page__alert">{error}</div>}
      {success && <div className="app-alert app-alert--success daily-prep-page__alert">{success}</div>}

      {/* إعداد: مدرسة + فترة */}
      <section className="surface-card daily-prep-setup">
        <div className="daily-prep-setup__toolbar">
          <h3 className="daily-prep-section__title daily-prep-section__title--flush">
            <School size={18} /> إعداد التحضير
          </h3>
          {isMobile && activeSchoolId && (
            <button
              type="button"
              className="daily-prep-setup__toggle"
              onClick={() => setSetupOpen((open) => !open)}
              aria-expanded={setupOpen}
            >
              {setupOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              <span>{setupOpen ? t('pages.TeacherDailyLogPage.طي_الإعداد', 'طي الإعداد') : t('pages.TeacherDailyLogPage.عرض_الإعداد', 'عرض الإعداد')}</span>
            </button>
          )}
        </div>

        {isMobile && !setupOpen && activeSchoolId ? (
          <div className="daily-prep-setup__collapsed-summary">
            <strong>{activeSchool?.name}</strong>
            <span> • تحضير {periodSaveLabel(prepPeriod)}</span>
            <span> • {periodRange.label}</span>
            {!studentsLoading && trackingData.length > 0 && (
              <span className="daily-prep-setup__collapsed-summary-present">
                {attendanceSummaryText(trackingData)}
              </span>
            )}
          </div>
        ) : (
        <>
        <div className="daily-prep-setup__school">
          <label className="app-label" htmlFor="daily-prep-school">
            {broadSchoolPick ? t('components.DailyPrepEditor.اختر_المدرسة', 'اختر المدرسة') : t('components.DailyPrepEditor.المدرسة', 'المدرسة')}
          </label>
          {schoolOptions.length === 0 ? (
            <p className="daily-prep-setup__hint">
              {broadSchoolPick ? t('pages.TeacherDailyLogPage.لا_توجد_مدارس_مسجلة_في_النظام', 'لا توجد مدارس مسجلة في النظام.') : t('pages.TeacherDailyLogPage.لا_توجد_مدارس_معيّنة_لحسابك_اطلب_من_الإدارة_تعيينك_في_مدرسة', 'لا توجد مدارس معيّنة لحسابك. اطلب من الإدارة تعيينك في مدرسة.')}
            </p>
          ) : broadSchoolPick || schoolOptions.length > 5 ? (
            <AppSelect
              id="daily-prep-school"
              searchable
              value={activeSchoolId}
              onChange={handleActiveSchoolChange}
            >
              {schoolOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  🏫 {o.name}
                </option>
              ))}
            </AppSelect>
          ) : (
            <div className="daily-prep-school-grid" role="listbox" aria-label={t('components.DailyPrepEditor.اختيار_المدرسة', 'اختيار المدرسة')}>
              {schoolOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={activeSchoolId === o.id}
                  className={`daily-prep-school-card${activeSchoolId === o.id ? ' daily-prep-school-card--active' : ''}`}
                  onClick={() => pickSchool(o.id)}
                >
                  <School size={22} className="daily-prep-school-card__icon" />
                  <span>{o.name}</span>
                </button>
              ))}
            </div>
          )}
          {broadSchoolPick && schoolOptions.length > 0 && (
            <p className="daily-prep-setup__hint daily-prep-setup__hint--info">
              نطاق بيانات «الكل» لصفحة التحضير — تظهر جميع المدارس.
            </p>
          )}
          {!broadSchoolPick && schoolOptions.length > 0 && (
            <p className="daily-prep-setup__hint">
              تظهر المدارس التي عُيّنت لك فقط عبر عضوية المدرسة.
            </p>
          )}
        </div>

        <div className="daily-prep-setup__period">
          <span className="app-label">{t('components.DailyPrepEditor.نوع_الفترة', 'نوع الفترة')}</span>
          <div className="prep-period-chips" role="group" aria-label={t('components.DailyPrepEditor.نوع_فترة_التحضير', 'نوع فترة التحضير')}>
            {PREP_PERIOD_OPTIONS.map((o) => {
              const Icon = o.Icon;
              return (
              <button
                key={o.value}
                type="button"
                className={`prep-period-chip${prepPeriod === o.value ? ' prep-period-chip--active' : ''}`}
                onClick={() => setPrepPeriod(o.value)}
                title={o.hint}
              >
                <Icon size={16} className="prep-period-chip__icon" />
                {o.label}
              </button>
              );
            })}
          </div>
        </div>

        <div className="daily-prep-setup__dates">
          <div>
            <label className="app-label">
              {prepPeriod === 'daily' ? t('pages.TeacherDailyLogPage.تاريخ_اليوم', 'تاريخ اليوم') : prepPeriod === 'weekly' ? t('pages.TeacherDailyLogPage.مرجع_الأسبوع', 'مرجع الأسبوع') : t('pages.TeacherDailyLogPage.مرجع_الشهر', 'مرجع الشهر')}
            </label>
            <input
              type="date"
              className="app-input"
              value={prepDate}
              onChange={(e) => setPrepDate(e.target.value)}
            />
          </div>
          <div>
            <label className="app-label">{t('components.DailyPrepEditor.الفترة_المحسوبة', 'الفترة المحسوبة')}</label>
            <input className="app-input prep-period-card__range" value={periodRange.label} readOnly />
          </div>
        </div>

        {activeSchoolId && (
          <div className="daily-prep-summary-bar">
            <span>
              <strong>{activeSchool?.name}</strong>
              {' • '}
              تحضير {periodSaveLabel(prepPeriod)}
              {' • '}
              {periodRange.label}
            </span>
            {!studentsLoading && trackingData.length > 0 && (
              <span className="daily-prep-summary-bar__present">
                {attendanceSummaryText(trackingData)}
              </span>
            )}
          </div>
        )}
        </>
        )}
      </section>

      {/* المناهج — متعدد */}
      {activeSchoolId && (
        <section className="surface-card daily-prep-curriculum">
          <h3 className="daily-prep-section__title">
            <BookOpen size={18} />
            {prepPeriod === 'weekly' ? t('pages.TeacherDailyLogPage.مواد_الأسبوع_من_المناهج', 'مواد الأسبوع من المناهج') : prepPeriod === 'monthly' ? t('pages.TeacherDailyLogPage.مواد_الشهر', 'مواد الشهر') : t('pages.TeacherDailyLogPage.مواد_اليوم', 'مواد اليوم')}
          </h3>
          <CurriculumLessonPicker
            curriculumList={curriculumList}
            entries={curriculumEntries}
            onChange={setCurriculumEntries}
            reportDate={prepDate}
          />
        </section>
      )}

      {/* الحضور */}
      {!activeSchoolId ? (
        <div className="empty-state">{t('pages.TeacherDailyLogPage.اختر_مدرسة_لبدء_تسجيل_التحضير', 'اختر مدرسة لبدء تسجيل التحضير.')}</div>
      ) : studentsLoading ? (
        <div className="loading-spinner page-loading" />
      ) : students.length === 0 ? (
        <div className="empty-state">
          لا يوجد طلاب في هذه المدرسة حالياً. يرجى إضافتهم من إدارة الطلاب.
        </div>
      ) : (
        <section className="surface-card daily-prep-attendance">
          <div className="daily-prep-attendance__head">
            <h3 className="daily-prep-section__title daily-prep-section__title--flush">
              <Users size={18} /> سجل الحضور ({trackingData.length} طالب)
            </h3>
            <span className="daily-prep-attendance__count">
              حاضر/متأخر: {presentCount} / {trackingData.length}
            </span>
            <div className="teacher-daily-bulk daily-prep-attendance__bulk">
              <button
                type="button"
                className="google-btn google-btn--filled google-btn--success"
                onClick={markAllPresent}
              >
                <Users size={16} /> تحضير الجميع
              </button>
              <button type="button" className="google-btn" onClick={markAllAbsent}>
                الكل غائب
              </button>
            </div>
          </div>

          <div className="md-table-scroll daily-prep-desktop-only">
            <table className="md-table daily-prep-table">
              <thead>
                <tr>
                  <th>{t('components.DailyPrepEditor.حالة_الحضور', 'حالة الحضور')}</th>
                  <th>{t('components.DailyPrepEditor.اسم_الطالب', 'اسم الطالب')}</th>
                  <th>{t('components.DailyPrepStudentCard.مقدار_الحفظ', 'مقدار الحفظ')}</th>
                  <th>{t('components.DailyPrepStudentCard.مقدار_المراجعة', 'مقدار المراجعة')}</th>
                  <th>{t('components.DailyPrepStudentCard.ملاحظة', 'ملاحظة')}</th>
                </tr>
              </thead>
              <tbody>
                {trackingData.map((record) => {
                  const present = isAttendancePresent(record);
                  const status = record.attendanceStatus || (present ? 'present' : 'absent');
                  return (
                  <tr
                    key={record.studentId}
                    className={`daily-prep-table__row daily-prep-table__row--${status}${present ? '' : ' md-table__row--absent'}`}
                  >
                    <td className="daily-prep-table__status-cell">
                      <div className="daily-prep-status-cell">
                        <AttendanceStatusIcon status={status} size={20} />
                        <AppSelect
                          value={status}
                          onChange={(e) => handleStatusChange(record.studentId, e.target.value)}
                          className={`daily-prep-status-select daily-prep-status-select--${status}`}
                          aria-label={`حالة ${record.name}`}
                        >
                          {ATTENDANCE_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </AppSelect>
                      </div>
                    </td>
                    <td className={`daily-prep-table__name${present ? '' : ' daily-prep-table__name--absent'}`}>
                      {record.name}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="app-input daily-prep-table__input daily-prep-table__input--mem"
                        placeholder={present ? t('components.DailyPrepEditor.مثال_صفحة_10', 'مثال: صفحة 10') : '—'}
                        value={record.memorization}
                        onChange={(e) => handleTrackingChange(record.studentId, 'memorization', e.target.value)}
                        disabled={!present}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="app-input daily-prep-table__input daily-prep-table__input--rev"
                        placeholder={present ? t('components.DailyPrepEditor.مثال_جزء_عم', 'مثال: جزء عم') : '—'}
                        value={record.review}
                        onChange={(e) => handleTrackingChange(record.studentId, 'review', e.target.value)}
                        disabled={!present}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="app-input daily-prep-table__input"
                        placeholder={t('components.DailyPrepEditor.ملاحظة_على_الطالب', 'ملاحظة على الطالب...')}
                        value={record.note || ''}
                        onChange={(e) => handleTrackingChange(record.studentId, 'note', e.target.value)}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="daily-prep-mobile-only">
            {trackingData.map((record) => (
              <DailyPrepStudentCard
                key={record.studentId}
                record={record}
                onStatusChange={handleStatusChange}
                onTrackingChange={handleTrackingChange}
              />
            ))}
          </div>

          <div className="daily-prep-session-notes">
            <label className="app-label daily-prep-session-notes__label" htmlFor="prep-session-notes">
              <StickyNote size={16} /> ملاحظات عامة على التحضير
            </label>
            <textarea
              id="prep-session-notes"
              className="app-input daily-prep-session-notes__input"
              rows={3}
              placeholder={t('components.DailyPrepEditor.اكتب_أي_ملاحظات_تريد_إرفاقها_مع_هذا_التحضير', 'اكتب أي ملاحظات تريد إرفاقها مع هذا التحضير...')}
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value)}
            />
          </div>

          <div className="daily-prep-attendance__footer daily-prep-desktop-only">
            <BusyButton
              type="button"
              className="google-btn google-btn--filled daily-prep-save-btn"
              onClick={handleSaveLog}
              busy={saving}
            >
              <Save size={18} />
              حفظ التحضير {periodSaveLabel(prepPeriod)}
            </BusyButton>
          </div>
        </section>
      )}

      {isMobile && activeSchoolId && students.length > 0 && (
        <div className="daily-prep-mobile-save-bar">
          <span className="daily-prep-mobile-save-bar__summary">
            {presentCount}/{trackingData.length} حاضر
            {curriculumEntries.some((e) => (e.selectedWeeks || []).length > 0)
              ? ` • ${curriculumEntries.length} مادة`
              : t('pages.TeacherDailyLogPage.اختر_المنهج', ' • اختر المنهج')}
          </span>
          <BusyButton
            type="button"
            className="google-btn google-btn--filled daily-prep-save-btn daily-prep-mobile-save-bar__btn"
            onClick={handleSaveLog}
            busy={saving}
          >
            <Save size={18} />
            حفظ {periodSaveLabel(prepPeriod)}
          </BusyButton>
        </div>
      )}
    </div>
  );
};

export default TeacherDailyLogPage;

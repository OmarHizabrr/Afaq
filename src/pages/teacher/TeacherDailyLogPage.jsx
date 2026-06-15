import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, CheckCircle, XCircle, Users, School, BookOpen } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import CurriculumLessonPicker from '../../components/CurriculumLessonPicker';
import { entriesToLegacyItems, summarizeCurriculumProgress } from '../../utils/curriculumProgress';

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : '');

const formatDateInput = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPeriodRange = (period, referenceDate = new Date()) => {
  const d = new Date(referenceDate);
  if (period === 'daily') {
    const date = formatDateInput(d);
    return { start: date, end: date, label: date };
  }
  if (period === 'weekly') {
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = formatDateInput(start);
    const endStr = formatDateInput(end);
    return { start: startStr, end: endStr, label: `${startStr} — ${endStr}` };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startStr = formatDateInput(start);
  const endStr = formatDateInput(end);
  return { start: startStr, end: endStr, label: `${startStr} — ${endStr}` };
};

const PREP_PERIOD_OPTIONS = [
  { value: 'weekly', label: 'أسبوعي', hint: 'الافتراضي — تسجيل أسبوع كامل' },
  { value: 'daily', label: 'يومي', hint: 'تحضير يوم واحد' },
  { value: 'monthly', label: 'شهري', hint: 'ملخص الشهر' },
];

const periodSaveLabel = (period) => {
  if (period === 'weekly') return 'الأسبوعي';
  if (period === 'monthly') return 'الشهري';
  return 'اليومي';
};

const TeacherDailyLogPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
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

  const activeSchool = useMemo(
    () => schoolOptions.find((o) => o.id === activeSchoolId),
    [schoolOptions, activeSchoolId]
  );

  const periodRange = useMemo(
    () => getPeriodRange(prepPeriod, prepDate ? new Date(prepDate) : new Date()),
    [prepPeriod, prepDate]
  );

  const presentCount = trackingData.filter((s) => s.isPresent).length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const ids = await api.listUserSchoolIdsFromMirrors(user);
        if (cancelled) return;
        if (!ids.length) {
          setError('الحساب غير مرتبط بمدرسة. اطلب من الإدارة تعيينك في مدرسة من صفحة تفاصيل المدرسة.');
          setSchoolOptions([]);
          setActiveSchoolId('');
          return;
        }
        const [allSchools, docsCur] = await Promise.all([
          api.getCollectionGroupDocuments('schools'),
          api.getDocuments(api.getCurriculumCollection()),
        ]);
        if (cancelled) return;
        const options = ids.map((id) => {
          const doc = allSchools.find((s) => s.id === id);
          const name = (doc?.data()?.name || '').trim() || id;
          return { id, name };
        });
        setSchoolOptions(options);
        setCurriculumList(docsCur.map((d) => ({ id: d.id, ...d.data() })));
        const key = teacherSchoolStorageKey(actorId);
        let sid = (key && localStorage.getItem(key)) || '';
        if (!sid || !ids.includes(sid)) sid = ids[0];
        setActiveSchoolId(sid);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء الاتصال بقاعدة البيانات');
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, actorId]);

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
          stData.map((s) => ({
            studentId: s.id,
            name: s.displayName || s.studentName || s.name || 'طالب',
            isPresent: true,
            memorization: '',
            review: '',
          }))
        );
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب طلاب المدرسة');
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSchoolId]);

  const handleActiveSchoolChange = (e) => {
    const sid = e.target.value;
    setActiveSchoolId(sid);
    const key = teacherSchoolStorageKey(actorId);
    if (key && sid) localStorage.setItem(key, sid);
    setCurriculumEntries([]);
    setSuccess('');
  };

  const handleTrackingChange = (studentId, field, value) => {
    setTrackingData((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, [field]: value } : item))
    );
  };

  const markAllPresent = () => {
    setTrackingData((prev) => prev.map((item) => ({ ...item, isPresent: true })));
  };

  const markAllAbsent = () => {
    setTrackingData((prev) =>
      prev.map((item) => ({
        ...item,
        isPresent: false,
        memorization: '',
        review: '',
      }))
    );
  };

  const handleSaveLog = async () => {
    if (!activeSchoolId) {
      setError('يرجى اختيار المدرسة أولاً');
      return;
    }
    const hasCurriculum = curriculumEntries.some((e) => (e.selectedWeeks || []).length > 0);
    if (!hasCurriculum) {
      setError('اختر مادة واحدة أو أكثر من المناهج وحدّد الأسبوع/الدرس لكل مادة');
      return;
    }
    if (!trackingData.length) {
      setError('لا يوجد طلاب مسجلون في هذه المدرسة');
      return;
    }
    if (!actorId) {
      setError('تعذر تحديد معرف المعلم للحفظ.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const api = FirestoreApi.Api;
      const logId = api.getNewId('teacher_daily_logs');
      const logRef = api.getTeacherDailyLogDoc(actorId, logId);

      const totalPresent = trackingData.filter((s) => s.isPresent).length;
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
        subjectName: curriculumEntries.map((e) => e.subjectName).join('، '),
        week: primary.reportedWeek || curriculumEntries[0]?.selectedWeeks?.[0] || '',
        lessonName: allLessons.join(' | '),
        totalStudents: trackingData.length,
        totalPresent,
        totalAbsent: trackingData.length - totalPresent,
        records: trackingData,
        timestamp: new Date().toISOString(),
      };

      await api.setData({ docRef: logRef, data: logPayload });

      setSuccess(`تم حفظ التحضير ${periodSaveLabel(prepPeriod)} بنجاح لمدرسة «${activeSchool?.name || ''}»`);
      setTrackingData((prev) => prev.map((item) => ({ ...item, memorization: '', review: '' })));
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ التحضير');
    } finally {
      setSaving(false);
    }
  };

  if (bootLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }} />;

  return (
    <div className="daily-prep-page">
      <PageHeader
        icon={Calendar}
        iconColor="var(--success-color)"
        title="التحضير"
        subtitle="اختر المدرسة والفترة والمواد — ثم سجّل حضور الطلاب"
      />

      {error && <div className="app-alert app-alert--error daily-prep-page__alert">{error}</div>}
      {success && <div className="app-alert app-alert--success daily-prep-page__alert">{success}</div>}

      {/* إعداد: مدرسة + فترة */}
      <section className="surface-card daily-prep-setup">
        <h3 className="daily-prep-section__title">
          <School size={18} /> إعداد التحضير
        </h3>

        <div className="daily-prep-setup__school">
          <label className="app-label" htmlFor="daily-prep-school">
            المدرسة
          </label>
          {schoolOptions.length === 0 ? (
            <p className="daily-prep-setup__hint">لا توجد مدارس مرتبطة بحسابك.</p>
          ) : (
            <AppSelect
              id="daily-prep-school"
              value={activeSchoolId}
              onChange={handleActiveSchoolChange}
              disabled={schoolOptions.length === 1 && false}
            >
              {schoolOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </AppSelect>
          )}
        </div>

        <div className="daily-prep-setup__period">
          <span className="app-label">نوع الفترة</span>
          <div className="prep-period-chips" role="group" aria-label="نوع فترة التحضير">
            {PREP_PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`prep-period-chip${prepPeriod === o.value ? ' prep-period-chip--active' : ''}`}
                onClick={() => setPrepPeriod(o.value)}
                title={o.hint}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="daily-prep-setup__dates">
          <div>
            <label className="app-label">
              {prepPeriod === 'daily' ? 'تاريخ اليوم' : prepPeriod === 'weekly' ? 'مرجع الأسبوع' : 'مرجع الشهر'}
            </label>
            <input
              type="date"
              className="app-input"
              value={prepDate}
              onChange={(e) => setPrepDate(e.target.value)}
            />
          </div>
          <div>
            <label className="app-label">الفترة المحسوبة</label>
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
                الحاضرون: {presentCount} / {trackingData.length}
              </span>
            )}
          </div>
        )}
      </section>

      {/* المناهج — متعدد */}
      {activeSchoolId && (
        <section className="surface-card daily-prep-curriculum">
          <h3 className="daily-prep-section__title">
            <BookOpen size={18} />
            {prepPeriod === 'weekly' ? 'مواد الأسبوع من المناهج' : prepPeriod === 'monthly' ? 'مواد الشهر' : 'مواد اليوم'}
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
        <div className="empty-state">اختر مدرسة لبدء تسجيل التحضير.</div>
      ) : studentsLoading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }} />
      ) : students.length === 0 ? (
        <div className="empty-state">
          لا يوجد طلاب في هذه المدرسة حالياً. يرجى إضافتهم من إدارة الطلاب.
        </div>
      ) : (
        <section className="surface-card daily-prep-attendance">
          <div className="daily-prep-attendance__head">
            <h3 className="daily-prep-section__title" style={{ margin: 0 }}>
              <Users size={18} /> سجل الحضور ({trackingData.length} طالب)
            </h3>
            <span className="daily-prep-attendance__count">
              الحاضرون: {presentCount} / {trackingData.length}
            </span>
            <div className="teacher-daily-bulk daily-prep-attendance__bulk">
              <button
                type="button"
                className="google-btn google-btn--filled"
                style={{ background: 'var(--success-color)', color: '#fff' }}
                onClick={markAllPresent}
              >
                <Users size={16} /> تحضير الجميع
              </button>
              <button type="button" className="google-btn" onClick={markAllAbsent}>
                الكل غائب
              </button>
            </div>
          </div>

          <div className="md-table-scroll">
            <table className="md-table daily-prep-table">
              <thead>
                <tr>
                  <th>الحالة</th>
                  <th>اسم الطالب</th>
                  <th>مقدار الحفظ</th>
                  <th>مقدار المراجعة</th>
                </tr>
              </thead>
              <tbody>
                {trackingData.map((record) => (
                  <tr key={record.studentId} className={record.isPresent ? '' : 'md-table__row--absent'}>
                    <td className="daily-prep-table__status">
                      <button
                        type="button"
                        onClick={() => handleTrackingChange(record.studentId, 'isPresent', !record.isPresent)}
                        className="daily-prep-table__toggle"
                        title={record.isPresent ? 'تسجيل غياب' : 'تسجيل حضور'}
                      >
                        {record.isPresent ? (
                          <CheckCircle size={24} color="var(--success-color)" />
                        ) : (
                          <XCircle size={24} color="var(--danger-color)" />
                        )}
                      </button>
                    </td>
                    <td className={`daily-prep-table__name${record.isPresent ? '' : ' daily-prep-table__name--absent'}`}>
                      {record.name}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="app-input daily-prep-table__input daily-prep-table__input--mem"
                        placeholder={record.isPresent ? 'مثال: صفحة 10' : 'غائب'}
                        value={record.memorization}
                        onChange={(e) => handleTrackingChange(record.studentId, 'memorization', e.target.value)}
                        disabled={!record.isPresent}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="app-input daily-prep-table__input daily-prep-table__input--rev"
                        placeholder={record.isPresent ? 'مثال: جزء عم' : 'غائب'}
                        value={record.review}
                        onChange={(e) => handleTrackingChange(record.studentId, 'review', e.target.value)}
                        disabled={!record.isPresent}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="daily-prep-attendance__footer">
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
    </div>
  );
};

export default TeacherDailyLogPage;

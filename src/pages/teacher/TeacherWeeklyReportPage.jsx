import React, { useState, useEffect } from 'react';
import { FileText, Save } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : '');

const ReportItem = ({ title, fieldPath, state, onChange }) => {
  const isActive = state[fieldPath]?.isActive || false;

  return (
    <div className="surface-card teacher-weekly-item">
      <div className={`teacher-weekly-item__head${isActive ? ' teacher-weekly-item__head--open' : ''}`}>
        <h3 className="teacher-weekly-item__title">{title}</h3>
        <label className="app-switch">
          <input
            type="checkbox"
            className="app-switch__input"
            checked={isActive}
            onChange={(e) => onChange(fieldPath, 'isActive', e.target.checked)}
          />
          <span className={`app-switch__track${isActive ? ' app-switch__track--on' : ''}`}>
            <span className="app-switch__thumb" />
          </span>
        </label>
      </div>

      {isActive && (
        <div className="teacher-weekly-item__body">
          <textarea
            className="app-input teacher-weekly-item__textarea"
            placeholder="اكتب التفاصيل والملاحظات هنا..."
            value={state[fieldPath]?.details || ''}
            onChange={(e) => onChange(fieldPath, 'details', e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

const TeacherWeeklyReportPage = ({ user }) => {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const actorId = user?.uid || user?.id;
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [activeSchoolId, setActiveSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initialReportState = {
    fridaySermon: { isActive: false, details: '' },
    dawah: { isActive: false, details: '' },
    adultEducation: { isActive: false, details: '' },
    mosqueLesson: { isActive: false, details: '' },
    marriageContract: { isActive: false, details: '' },
    others: { isActive: false, details: '' },
  };

  const [reportState, setReportState] = useState(initialReportState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = FirestoreApi.Api;
        const ids = await api.listUserSchoolIdsFromMirrors(user);
        if (cancelled || !ids.length) {
          if (!cancelled && !ids.length) setSchoolOptions([]);
          return;
        }
        const allSchools = await api.getCollectionGroupDocuments('schools');
        if (cancelled) return;
        const options = ids.map((id) => {
          const doc = allSchools.find((s) => s.id === id);
          const name = (doc?.data()?.name || '').trim() || id;
          return { id, name };
        });
        setSchoolOptions(options);
        const key = teacherSchoolStorageKey(actorId);
        let sid = (key && localStorage.getItem(key)) || '';
        if (!sid || !ids.includes(sid)) sid = ids[0];
        setActiveSchoolId(sid);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, actorId]);

  const handleStateChange = (field, key, value) => {
    setReportState((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  const handleSaveReport = async () => {
    if (!actorId) {
      setError('تعذر تحديد معرف المعلم للحفظ.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const api = FirestoreApi.Api;
      const schoolId = activeSchoolId || (await api.resolveUserSchoolId(user));
      if (!schoolId) {
        setError('حسابك غير مرتبط بأي مدرسة. يرجى مراجعة الإدارة.');
        setLoading(false);
        return;
      }

      const reportId = api.getNewId('teacher_reports');
      const docRef = api.getTeacherReportDoc(actorId, reportId);
      const today = new Date().toISOString();

      await api.setData({
        docRef,
        data: {
          teacherId: actorId,
          schoolId,
          submissionDate: today,
          reportData: reportState,
        },
      });

      setSuccess('تم حفظ رفع التقرير الأسبوعي بنجاح! جزاك الله خيراً.');
      setReportState(initialReportState);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ التقرير الأسبوعي');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`portal-page teacher-weekly-page${isMobile ? ' teacher-weekly-page--mobile-save' : ''}`}>
      <PageHeader
        icon={FileText}
        iconColor="var(--success-color)"
        title="التقرير الأسبوعي للأعمال"
        subtitle="توثيق النشاطات الدعوية والمجتمعية"
      />

      {error && <div className="app-alert app-alert--error teacher-weekly-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success teacher-weekly-alert">{success}</div>}

      {schoolOptions.length > 1 && activeSchoolId && (
        <div className="surface-card teacher-weekly-school-card">
          <label className="app-label">المدرسة المرتبطة بالتقرير</label>
          <AppSelect
            className="app-select"
            value={activeSchoolId}
            onChange={(e) => {
              const sid = e.target.value;
              setActiveSchoolId(sid);
              const key = teacherSchoolStorageKey(actorId);
              if (key && sid) localStorage.setItem(key, sid);
            }}
          >
            {schoolOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </AppSelect>
        </div>
      )}

      <div className="teacher-weekly-list">
      <ReportItem title="خطبة الجمعة" fieldPath="fridaySermon" state={reportState} onChange={handleStateChange} />
      <ReportItem title="دعوة غير المسلمين" fieldPath="dawah" state={reportState} onChange={handleStateChange} />
      <ReportItem title="تعليم الكبار" fieldPath="adultEducation" state={reportState} onChange={handleStateChange} />
      <ReportItem title="دروس أسبوعية في المسجد" fieldPath="mosqueLesson" state={reportState} onChange={handleStateChange} />
      <ReportItem title="عقود الزواج" fieldPath="marriageContract" state={reportState} onChange={handleStateChange} />
      <ReportItem title="أعمال وأنشطة أخرى" fieldPath="others" state={reportState} onChange={handleStateChange} />
      </div>

      {!isMobile && (
        <div className="teacher-weekly-save">
          <BusyButton
            type="button"
            className="google-btn teacher-weekly-save__btn"
            onClick={handleSaveReport}
            busy={loading}
          >
            <span className="teacher-weekly-save__btn-inner">
              <Save size={20} aria-hidden />
              رفع التقرير النهائي
            </span>
          </BusyButton>
        </div>
      )}

      {isMobile && (
        <div className="teacher-weekly-mobile-save-bar">
          <BusyButton
            type="button"
            className="google-btn google-btn--filled teacher-weekly-save__btn teacher-weekly-mobile-save-bar__btn"
            onClick={handleSaveReport}
            busy={loading}
          >
            <span className="teacher-weekly-save__btn-inner">
              <Save size={18} aria-hidden />
              رفع التقرير
            </span>
          </BusyButton>
        </div>
      )}
    </div>
  );
};

export default TeacherWeeklyReportPage;

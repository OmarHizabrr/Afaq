import React, { useState } from 'react';
import { FileText, Save } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const ReportItem = ({ title, fieldPath, state, onChange }) => {
  return (
    <div className="surface-card" style={{
      padding: '1.5rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: state[fieldPath]?.isActive ? '1rem' : '0' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{title}</h3>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ position: 'relative', width: '50px', height: '26px', background: state[fieldPath]?.isActive ? 'var(--success-color)' : 'var(--border-color)', borderRadius: '13px', transition: 'all 0.3s' }}>
            <div style={{ position: 'absolute', top: '3px', [state[fieldPath]?.isActive ? 'left' : 'right']: '3px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s' }}></div>
          </div>
          <input 
            type="checkbox" 
            checked={state[fieldPath]?.isActive || false}
            onChange={(e) => onChange(fieldPath, 'isActive', e.target.checked)}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {state[fieldPath]?.isActive && (
        <div>
          <textarea 
            placeholder="اكتب التفاصيل والملاحظات هنا..."
            value={state[fieldPath]?.details || ''}
            onChange={(e) => onChange(fieldPath, 'details', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              minHeight: '80px',
              resize: 'vertical',
              fontSize: '0.95rem'
            }}
          />
        </div>
      )}
    </div>
  );
};

const TeacherWeeklyReportPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initialReportState = {
    fridaySermon: { isActive: false, details: '' },
    dawah: { isActive: false, details: '' },
    adultEducation: { isActive: false, details: '' },
    mosqueLesson: { isActive: false, details: '' },
    marriageContract: { isActive: false, details: '' },
    others: { isActive: false, details: '' }
  };

  const [reportState, setReportState] = useState(initialReportState);

  const handleStateChange = (field, key, value) => {
    setReportState(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
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
      const schoolId = await api.resolveUserSchoolId(user);
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
          reportData: reportState
        }
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
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <PageHeader
        icon={FileText}
        iconColor="var(--success-color)"
        title="التقرير الأسبوعي للأعمال"
        subtitle="توثيق النشاطات الدعوية والمجتمعية"
      />

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{success}</div>}

      <ReportItem title="خطبة الجمعة" fieldPath="fridaySermon" state={reportState} onChange={handleStateChange} />
      <ReportItem title="دعوة غير المسلمين" fieldPath="dawah" state={reportState} onChange={handleStateChange} />
      <ReportItem title="تعليم الكبار" fieldPath="adultEducation" state={reportState} onChange={handleStateChange} />
      <ReportItem title="دروس أسبوعية في المسجد" fieldPath="mosqueLesson" state={reportState} onChange={handleStateChange} />
      <ReportItem title="عقود الزواج" fieldPath="marriageContract" state={reportState} onChange={handleStateChange} />
      <ReportItem title="أعمال وأنشطة أخرى" fieldPath="others" state={reportState} onChange={handleStateChange} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button 
          className="google-btn" 
          onClick={handleSaveReport} 
          disabled={loading}
          style={{ width: '100%', maxWidth: '300px', background: 'var(--success-color)', color: '#fff', padding: '16px' }}
        >
          {loading ? 'جاري الرفع...' : <><Save size={20} style={{ marginLeft: '8px' }}/> رفع التقرير النهائي</>}
        </button>
      </div>

    </div>
  );
};

export default TeacherWeeklyReportPage;

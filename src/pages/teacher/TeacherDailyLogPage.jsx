import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, XCircle, Users } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : '');

const TeacherDailyLogPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
  const [students, setStudents] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]); // List of subjects
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSchoolId, setActiveSchoolId] = useState('');

  // Form selections
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  
  // Daily Tracking State array
  // Format: [{ studentId, name, isPresent: true, memorization: '', review: '' }]
  const [trackingData, setTrackingData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const ids = await api.listUserSchoolIdsFromMirrors(user);
        if (cancelled) return;
        if (!ids.length) {
          setError('تعذر جلب البيانات. الحساب غير مرتبط بمدرسة (تحقق من الإسناد في المدرسة أو مرآة Mygroup).');
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, actorId]);

  useEffect(() => {
    if (!activeSchoolId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
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
            name: s.studentName,
            isPresent: true,
            memorization: '',
            review: '',
          }))
        );
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب طلاب المدرسة');
      } finally {
        if (!cancelled) setLoading(false);
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
    setSelectedSubjectId('');
    setSelectedWeek('');
    setSuccess('');
  };

  const handleTrackingChange = (studentId, field, value) => {
    setTrackingData(prev => prev.map(item => 
      item.studentId === studentId ? { ...item, [field]: value } : item
    ));
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

  const getSelectedSubject = () => {
    return curriculumList.find(c => c.id === selectedSubjectId);
  };

  const selectedSubjectData = getSelectedSubject();
  const availableWeeks = selectedSubjectData?.weeks || [];

  const handleSaveLog = async () => {
    if (!selectedSubjectId || !selectedWeek) {
      setError('يرجى اختيار المادة وتحديد الدرس/الأسبوع أولاً');
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
      
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Compute Totals
      const totalPresent = trackingData.filter(s => s.isPresent).length;
      const totalAbsent = trackingData.length - totalPresent;

      const schoolId = activeSchoolId || (await api.resolveUserSchoolId(user));
      if (!schoolId) {
        setError('لا توجد مدرسة نشطة مرتبطة بحسابك.');
        setSaving(false);
        return;
      }

      const logPayload = {
        teacherId: actorId,
        schoolId,
        date: today,
        subjectId: selectedSubjectId,
        subjectName: selectedSubjectData.name,
        week: selectedWeek, // The week number 1..50
        lessonName: availableWeeks.find(w => w.week.toString() === selectedWeek.toString())?.lesson || '',
        totalStudents: trackingData.length,
        totalPresent,
        totalAbsent,
        records: trackingData
      };

      await api.setData({
        docRef: logRef,
        data: logPayload
      });

      setSuccess('تم حفظ التحضير اليومي بنجاح!');
      
      // Optionally reset but keep students present since teachers might just review them
      // We will clear the memorization/review inputs though
      setTrackingData(prev => prev.map(item => ({ ...item, memorization: '', review: '' })));
      setSelectedWeek('');

    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ التحضير');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  if (loading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <PageHeader
        icon={Calendar}
        iconColor="var(--success-color)"
        title="التحضير اليومي"
        subtitle="تسجيل الحضور والغياب والإنجاز اليومي"
      />

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{success}</div>}

      {schoolOptions.length > 1 && activeSchoolId && (
        <div className="surface-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            المدرسة التي تُسجّل التحضير لها
          </label>
          <AppSelect value={activeSchoolId} onChange={handleActiveSchoolChange} style={inputStyle}>
            {schoolOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </AppSelect>
        </div>
      )}

      {/* Curriculum Selection Card */}
      <div className="surface-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>خط سير الحلقة لليوم</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المادة</label>
            <AppSelect value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedWeek(''); }} style={inputStyle}>
              <option value="">-- اختر المادة --</option>
              {curriculumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </AppSelect>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الدرس المدرج بالخطة للاختيار</label>
            <AppSelect value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} style={inputStyle} disabled={!selectedSubjectId}>
              <option value="">-- اختر الدرس (الأسبوع) --</option>
              {availableWeeks.map(w => (
                <option key={w.week} value={w.week}>أسبوع {w.week}: {w.lesson || 'لم يحدد درس'}</option>
              ))}
            </AppSelect>
          </div>
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div className="empty-state">
          لا يوجد طلاب في مدرستك حالياً. يرجى إضافتهم من شاشة &quot;طلابي&quot;.
        </div>
      ) : (
        <div className="surface-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="md-table-panel__head" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل الطلاب ({trackingData.length})</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
              الحاضرون: {trackingData.filter(s => s.isPresent).length} / {trackingData.length}
            </span>
            <div className="teacher-daily-bulk" style={{ marginInlineStart: 'auto' }}>
              <button
                type="button"
                className="google-btn google-btn--filled"
                style={{ background: 'var(--success-color)', color: '#fff' }}
                onClick={markAllPresent}
                title="تسجيل كل الطلاب حاضرين"
              >
                <Users size={16} style={{ marginLeft: 6 }} />
                تحضير الجميع
              </button>
              <button
                type="button"
                className="google-btn"
                onClick={markAllAbsent}
                title="تسجيل كل الطلاب غياباً ومسح حقول الحفظ والمراجعة"
              >
                الكل غائب
              </button>
            </div>
          </div>

          <div className="md-table-scroll">
            <table className="md-table">
              <thead>
                <tr>
                  <th>تعديل الحالة</th>
                  <th>اسم الطالب</th>
                  <th>مقدار الحفظ الجديد</th>
                  <th>مقدار المراجعة</th>
                </tr>
              </thead>
              <tbody>
                {trackingData.map((record) => (
                  <tr key={record.studentId} className={record.isPresent ? '' : 'md-table__row--absent'}>
                    <td style={{ padding: '12px 16px', width: '80px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleTrackingChange(record.studentId, 'isPresent', !record.isPresent)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title={record.isPresent ? 'غائب اليوم' : 'حاضر اليوم'}
                      >
                        {record.isPresent ? <CheckCircle size={24} color="var(--success-color)" /> : <XCircle size={24} color="var(--danger-color)" />}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: record.isPresent ? 'inherit' : 'var(--text-secondary)', textDecoration: record.isPresent ? 'none' : 'line-through' }}>
                      {record.name}
                    </td>
                    <td style={{ padding: '8px 16px', width: '30%' }}>
                      <input 
                        type="text" 
                        placeholder={record.isPresent ? "مثال: صفحة 10" : "غائب"}
                        value={record.memorization}
                        onChange={(e) => handleTrackingChange(record.studentId, 'memorization', e.target.value)}
                        disabled={!record.isPresent}
                        style={{ ...inputStyle, opacity: record.isPresent ? 1 : 0.5, borderColor: 'var(--success-color)' }}
                      />
                    </td>
                    <td style={{ padding: '8px 16px', width: '30%' }}>
                      <input 
                        type="text" 
                        placeholder={record.isPresent ? "مثال: جزء عم" : "غائب"}
                        value={record.review}
                        onChange={(e) => handleTrackingChange(record.studentId, 'review', e.target.value)}
                        disabled={!record.isPresent}
                        style={{ ...inputStyle, opacity: record.isPresent ? 1 : 0.5, borderColor: 'var(--md-primary)' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="md-table-panel__footer">
             <BusyButton
                type="button"
                className="google-btn"
                onClick={handleSaveLog}
                busy={saving}
                style={{ marginTop: 0, width: 'auto', background: 'var(--success-color)', color: '#fff', padding: '12px 32px' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Save size={18} style={{ marginLeft: 8 }} />
                  حفظ التحضير اليومي
                </span>
              </BusyButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDailyLogPage;

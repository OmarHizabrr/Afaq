import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, XCircle } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const TeacherDailyLogPage = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]); // List of subjects
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form selections
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  
  // Daily Tracking State array
  // Format: [{ studentId, name, isPresent: true, memorization: '', review: '' }]
  const [trackingData, setTrackingData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.schoolId) {
        setError('تعذر جلب البيانات. الحساب غير مرتبط بمدرسة.');
        setLoading(false);
        return;
      }

      try {
        const api = FirestoreApi.Api;
        
        // Fetch Students for this school subcollection
        const refStu = api.getSubCollection('students', user.schoolId, 'students');
        const docsStu = await api.getDocuments(refStu);
        const stData = docsStu.map(d => ({ id: d.id, ...d.data() }));
        
        // Fetch Curriculum
        const refCur = api.getCollection('curriculum');
        const docsCur = await api.getDocuments(refCur);
        const curData = docsCur.map(d => ({ id: d.id, ...d.data() }));

        setStudents(stData);
        setCurriculumList(curData);

        // Initialize tracking data assuming everyone is preset
        setTrackingData(stData.map(s => ({
          studentId: s.id,
          name: s.studentName,
          isPresent: true,
          memorization: '',
          review: ''
        })));

      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء الاتصال بقاعدة البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleTrackingChange = (studentId, field, value) => {
    setTrackingData(prev => prev.map(item => 
      item.studentId === studentId ? { ...item, [field]: value } : item
    ));
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

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const api = FirestoreApi.Api;
      const logId = api.getNewId('teacher_daily_logs');
      const logRef = api.getSubDocument('teacher_daily_logs', user.id, 'teacher_daily_logs', logId);
      
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Compute Totals
      const totalPresent = trackingData.filter(s => s.isPresent).length;
      const totalAbsent = trackingData.length - totalPresent;

      const logPayload = {
        teacherId: user.id,
        schoolId: user.schoolId,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={28} color="var(--success-color)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>التحضير اليومي</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>تسجيل الحضور والغياب والإنجاز اليومي</p>
          </div>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{success}</div>}

      {/* Curriculum Selection Card */}
      <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', boxShadow: 'var(--shadow)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>خط سير الحلقة لليوم</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>المادة</label>
            <select value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedWeek(''); }} style={inputStyle}>
              <option value="">-- اختر المادة --</option>
              {curriculumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الدرس المدرج بالخطة للاختيار</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} style={inputStyle} disabled={!selectedSubjectId}>
              <option value="">-- اختر الدرس (الأسبوع) --</option>
              {availableWeeks.map(w => (
                <option key={w.week} value={w.week}>أسبوع {w.week}: {w.lesson || 'لم يحدد درس'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--panel-color)', borderRadius: '12px' }}>
          لا يوجد طلاب في مدرستك حالياً. يرجى إضافتهم من شاشة "طلابي".
        </div>
      ) : (
        <div style={{ background: 'var(--panel-color)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل الطلاب ({trackingData.length})</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
              الحاضرين: {trackingData.filter(s => s.isPresent).length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'var(--panel-color)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>تعديل الحالة</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>اسم الطالب</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>مقدار الحفظ الجديد</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>مقدار المراجعة</th>
                </tr>
              </thead>
              <tbody>
                {trackingData.map((record, idx) => (
                  <tr key={record.studentId} style={{ 
                    borderBottom: idx !== trackingData.length - 1 ? '1px solid var(--border-color)' : 'none', 
                    background: record.isPresent ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                    transition: 'all 0.2s' 
                  }}>
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
                        style={{ ...inputStyle, opacity: record.isPresent ? 1 : 0.5, borderColor: '#3b82f6' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--panel-color)' }}>
             <button 
                className="google-btn" 
                onClick={handleSaveLog} 
                disabled={saving}
                style={{ marginTop: 0, width: 'auto', background: 'var(--success-color)', color: '#fff', padding: '12px 32px' }}
              >
                {saving ? 'جاري الحفظ...' : <><Save size={18} style={{ marginLeft: '8px' }}/> حفظ التحضير اليومي</>}
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDailyLogPage;

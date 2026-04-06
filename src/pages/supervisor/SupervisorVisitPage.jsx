import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Save, CheckCircle, XCircle, Star, Image as ImageIcon, Video, Camera } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import { uploadMedia } from '../../services/storageApi';

const SupervisorVisitPage = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Scoped Data
  const [assignedSchools, setAssignedSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);

  // Form State
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [teacherRating, setTeacherRating] = useState(10);
  const [villageRating, setVillageRating] = useState(10);
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Array of students tracking { id, name, isPresent, isTested, note }
  const [trackingData, setTrackingData] = useState([]);

  // Media
  const [mediaFiles, setMediaFiles] = useState([]);
  const [gpsLocation, setGpsLocation] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const api = FirestoreApi.Api;
        
        let schoolIdsAllowed = [];
        let regionIdAllowed = null;

        // 1. Get Assignment
        if (user.role === 'supervisor_local') {
          const assignment = await api.getData(api.getDocument('supervisor_assignments', user.id));
          if (!assignment) {
            setError('لا يوجد لك نطاق إشرافي محدد. راجع الإدارة.');
            setLoading(false);
            return;
          }
          regionIdAllowed = assignment.regionId;
          schoolIdsAllowed = assignment.schoolIds || [];
        }

        // 2. Fetch Schools and Filter
        const [schDocs, curDocs] = await Promise.all([
          api.getDocuments(api.getCollection('schools')),
          api.getDocuments(api.getCollection('curriculum'))
        ]);

        let schoolsData = schDocs.map(d => ({ id: d.id, ...d.data() }));
        
        if (user.role === 'supervisor_local') {
          if (schoolIdsAllowed.length > 0) {
            // Limited to specific schools
            schoolsData = schoolsData.filter(s => schoolIdsAllowed.includes(s.id));
          } else if (regionIdAllowed) {
            // Whole region (but schools don't explicitly have region, we might need villages)
            // For now, if schoolIds allowed is empty, we assume they have to use schoolIds or we fetch all villages for that region.
            // *NOTE*: In `SchoolsPage`, schools have `villageId`. We'd need to map villageId -> regionId.
            // As a fallback for this demo, if schoolIds is empty and it's a local supervisor, we just show all or implement village filtering.
          }
        }

        setAssignedSchools(schoolsData);
        setCurriculumList(curDocs.map(d => ({ id: d.id, ...d.data() })));
        
        // Try getting GPS early
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => console.warn('GPS Error', err)
          );
        }

      } catch (err) {
        console.error(err);
        setError('تعذر تحميل البيانات الأولية.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  // When school changes, fetch its students
  useEffect(() => {
    if (!selectedSchoolId) {
      setStudents([]);
      setTrackingData([]);
      return;
    }

    const fetchStudentsForSchool = async () => {
      setLoading(true);
      try {
        const api = FirestoreApi.Api;
        const ref = api.getCollection('students');
        // Simple client side filter for now
        const docs = await api.getDocuments(ref);
        const data = docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.schoolId === selectedSchoolId);
        
        setStudents(data);
        setTrackingData(data.map(s => ({
          studentId: s.id,
          name: s.studentName,
          isPresent: true,
          isTested: false,
          note: ''
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsForSchool();
  }, [selectedSchoolId]);


  const handleTrackingChange = (studentId, field, value) => {
    setTrackingData(prev => prev.map(item => 
      item.studentId === studentId ? { ...item, [field]: value } : item
    ));
  };

  const getSelectedSubject = () => curriculumList.find(c => c.id === selectedSubjectId);
  const availableWeeks = getSelectedSubject()?.weeks || [];

  const handleMediaPick = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setMediaFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          alert('تم التقاط الموقع بنجاح!');
        },
        err => alert('يرجى تفعيل الـ GPS وإعطاء الصلاحية للمتصفح.')
      );
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedSchoolId || !selectedSubjectId || !selectedWeek) {
      setError('يرجى ملء البيانات الأساسية (المدرسة، المادة، والدرس).');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Upload Media First
      const mediaUrls = [];
      for (const file of mediaFiles) {
        const url = await uploadMedia(file, `supervisor_reports/${user.id}`);
        if (url) mediaUrls.push({ url, name: file.name, type: file.type });
      }

      const api = FirestoreApi.Api;
      const reportId = api.getNewId('reports');
      const selectedSchoolName = assignedSchools.find(s => s.id === selectedSchoolId)?.name;
      const selectedSubjectName = getSelectedSubject()?.name;

      const payload = {
        supervisorId: user.id,
        supervisorName: user.displayName,
        schoolId: selectedSchoolId,
        schoolName: selectedSchoolName,
        subjectId: selectedSubjectId,
        subjectName: selectedSubjectName,
        week: selectedWeek,
        timestamp: new Date().toISOString(),
        gpsLocation,
        teacherRating,
        villageRating,
        generalNotes,
        mediaUrls,
        studentsTracking: trackingData,
        attendanceStats: {
          total: trackingData.length,
          present: trackingData.filter(s => s.isPresent).length,
          absent: trackingData.filter(s => !s.isPresent).length,
        },
        testingStats: {
          testedCount: trackingData.filter(s => s.isTested).length
        }
      };

      await api.setData({
        docRef: api.getDocument('reports', reportId),
        data: payload
      });

      setSuccess('تم رفع تقرير الزيارة الميدانية بنجاح!');
      // Reset
      setSelectedSchoolId('');
      setSelectedSubjectId('');
      setSelectedWeek('');
      setMediaFiles([]);
      setGeneralNotes('');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء رفع التقرير.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' };

  if (loading && assignedSchools.length === 0) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MapPin size={28} color="#3b82f6" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>تسجيل زيارة ميدانية</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>توثيق تفصيلي لأداء المدارس بإرفاق الـ GPS</p>
          </div>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{success}</div>}

      {/* Basic Info */}
      <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المدرسة المُزارة</label>
            <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} style={inputStyle}>
              <option value="">-- اختر المدرسة --</option>
              {assignedSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المادة</label>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} style={inputStyle}>
              <option value="">-- اختر المادة --</option>
              {curriculumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الدرس المدرج بالخطة</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} style={inputStyle} disabled={!selectedSubjectId}>
              <option value="">-- اختر الدرس --</option>
              {availableWeeks.map(w => <option key={w.week} value={w.week}>أسبوع {w.week}: {w.lesson || '-'}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedSchoolId && (
        <>
          {/* Students Cross-Check */}
          <div style={{ background: 'var(--panel-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل الطلاب والتقييم الفردي</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-color)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>تعديل الحالة</th>
                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>اسم الطالب</th>
                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>اختبار الطالب</th>
                    <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>ملاحظة التقييم (اختياري)</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingData.map((record, idx) => (
                    <tr key={record.studentId} style={{ 
                      borderBottom: idx !== trackingData.length - 1 ? '1px solid var(--border-color)' : 'none', 
                      background: record.isPresent ? (record.isTested ? 'var(--accent-glow)' : 'transparent') : 'rgba(239, 68, 68, 0.05)',
                    }}>
                      <td style={{ padding: '12px 16px', width: '80px', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleTrackingChange(record.studentId, 'isPresent', !record.isPresent)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                          title={record.isPresent ? 'تعديل لغائب' : 'حاضر'}
                        >
                          {record.isPresent ? <CheckCircle size={24} color="var(--success-color)" /> : <XCircle size={24} color="var(--danger-color)" />}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: record.isPresent ? 'inherit' : 'var(--text-secondary)', textDecoration: record.isPresent ? 'none' : 'line-through' }}>
                        {record.name}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                         <button 
                          onClick={() => handleTrackingChange(record.studentId, 'isTested', !record.isTested)}
                          disabled={!record.isPresent}
                          style={{ 
                            background: record.isTested ? '#3b82f6' : 'var(--bg-color)', 
                            border: `1px solid ${record.isTested ? '#3b82f6' : 'var(--border-color)'}`, 
                            color: record.isTested ? '#fff' : 'var(--text-secondary)',
                            padding: '4px 12px', borderRadius: '20px', cursor: record.isPresent ? 'pointer' : 'not-allowed',
                            fontSize: '0.8rem', fontWeight: 600, opacity: record.isPresent ? 1 : 0.4
                          }}
                        >
                          {record.isTested ? 'اختُبر' : 'اختبار'}
                        </button>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <input 
                          type="text" 
                          placeholder="ملاحظات قراءته..."
                          value={record.note}
                          onChange={(e) => handleTrackingChange(record.studentId, 'note', e.target.value)}
                          disabled={!record.isPresent || !record.isTested}
                          style={{ ...inputStyle, padding: '8px', opacity: (record.isPresent && record.isTested) ? 1 : 0.3 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluations & Media */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', alignItems: 'start' }}>
            <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={20} color="#f59e0b" /> التقييم العام
              </h3>
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>تقييم المدرس (من 10)</label>
              <input type="number" min="1" max="10" value={teacherRating} onChange={(e) => setTeacherRating(e.target.value)} style={{...inputStyle, marginBottom: '1rem'}} />

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>التقييم العام للقرية (من 10)</label>
              <input type="number" min="1" max="10" value={villageRating} onChange={(e) => setVillageRating(e.target.value)} style={{...inputStyle, marginBottom: '1rem'}} />

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>الملاحظات والتوجيهات</label>
              <textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} placeholder="اكتب رأيك العام عن الزيارة..." style={{...inputStyle, minHeight: '100px'}} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={20} color={gpsLocation ? 'var(--success-color)' : 'var(--danger-color)'} /> 
                  نطاق الزيارة (GPS)
                </h3>
                {gpsLocation ? (
                  <p style={{ color: 'var(--success-color)', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    ✔ تم تحديد الموقع ({gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)})
                  </p>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لم يتم جلب موقع الجوال بعد.</p>
                    <button onClick={handleGetLocation} className="icon-btn" style={{ background: '#3b82f6', color: '#fff', width: 'auto', padding: '8px 16px', borderRadius: '8px' }}>
                      التقاط الـ GPS الآن
                    </button>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={20} color="#8b5cf6" /> التوثيق البصري
                </h3>
                <label style={{ display: 'inline-block', background: 'var(--bg-color)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                  <input type="file" multiple accept="image/*,video/*" onChange={handleMediaPick} style={{ display: 'none' }} />
                  <Camera size={24} color="var(--text-secondary)" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>اضغط لالتقاط أو اختيار صور وفيديو</p>
                </label>
                {mediaFiles.length > 0 && (
                  <ul style={{ marginTop: '1rem', paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {mediaFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <button 
            className="google-btn" 
            onClick={handleSubmitReport} 
            disabled={saving || !gpsLocation}
            style={{ width: '100%', justifyContent: 'center', background: gpsLocation ? '#3b82f6' : 'var(--border-color)', color: '#fff', padding: '16px', fontSize: '1.1rem' }}
          >
            {saving ? 'جاري رفع التقرير وتوثيق الـ GPS...' : !gpsLocation ? 'يرجى التقاط الموقع أولاً لرفع التقرير' : 'حفظ التقرير الميداني بشكل نهائي'}
          </button>
        </>
      )}
    </div>
  );
};

export default SupervisorVisitPage;

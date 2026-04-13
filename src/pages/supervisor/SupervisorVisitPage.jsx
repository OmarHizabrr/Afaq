import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Save, CheckCircle, XCircle, Star, Image as ImageIcon, Video, Camera } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import { uploadMedia } from '../../services/storageApi';
import PageHeader from '../../components/PageHeader';

const SupervisorVisitPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
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
        if (!actorId) {
          setError('تعذر تحديد معرف المستخدم الحالي.');
          setLoading(false);
          return;
        }
        
        // 1. Get Bilateral Assignments (Regions)
        const assignedRegionsDocs = await api.getDocuments(api.getUserMembershipMirrorCollection(actorId));
        const assignedRegionIds = assignedRegionsDocs.map(d => d.data().regionId).filter(id => !!id);

        if (assignedRegionIds.length === 0 && user.role !== 'admin' && user.role !== 'supervisor_arab') {
          setError('لا توجد لك مناطق إشرافية مسندة حالياً. راجع الإدارة.');
          setLoading(false);
          return;
        }

        // 2. Fetch Schools and Curriculum
        const [schDocs, curDocs] = await Promise.all([
          api.getCollectionGroupDocuments('schools'),
          api.getDocuments(api.getCollection('curriculum'))
        ]);

        let schoolsData = schDocs.map(d => ({ id: d.id, ...d.data() }));
        
        // Final Filter: Only show schools that belong to the supervisor's assigned regions
        // Note: For simplicity, if regionId is not on school, we show all for now or implement village-region mapping.
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
  }, [actorId, user?.role]);

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
        // Fetch from hierarchical subcollection: students/{schoolId}/students
        const ref = api.getSubCollection('students', selectedSchoolId, 'students');
        const docs = await api.getDocuments(ref);
        const data = docs.map(d => ({ id: d.id, ...d.data() }));
        
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
        const url = await uploadMedia(file, `supervisor_reports/${actorId}`);
        if (url) mediaUrls.push({ url, name: file.name, type: file.type });
      }

      const api = FirestoreApi.Api;
      const reportId = api.getNewId('reports');
      const selectedSchoolName = assignedSchools.find(s => s.id === selectedSchoolId)?.name;
      const selectedSubjectName = getSelectedSubject()?.name;

      const payload = {
        supervisorId: actorId,
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

      const visitRef = api.getSubDocument('reports', actorId, 'reports', reportId);
      
      await api.setData({
        docRef: visitRef,
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
      <PageHeader
        icon={MapPin}
        iconColor="var(--md-primary)"
        title="تسجيل زيارة ميدانية"
        subtitle="توثيق تفصيلي لأداء المدارس مع الموقع الجغرافي"
      />

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{success}</div>}

      {/* Basic Info */}
      <div className="surface-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
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
          <div className="surface-card" style={{ borderRadius: '12px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div className="md-table-panel__head">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>سجل الطلاب والتقييم الفردي</h3>
            </div>
            <div className="md-table-scroll">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>تعديل الحالة</th>
                    <th>اسم الطالب</th>
                    <th style={{ textAlign: 'center' }}>اختبار الطالب</th>
                    <th>ملاحظة التقييم (اختياري)</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingData.map((record) => (
                    <tr
                      key={record.studentId}
                      className={
                        !record.isPresent ? 'md-table__row--absent' : record.isTested ? 'md-table__row--tested' : ''
                      }
                    >
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
                            background: record.isTested ? 'var(--md-primary)' : 'var(--bg-color)', 
                            border: `1px solid ${record.isTested ? 'var(--md-primary)' : 'var(--border-color)'}`, 
                            color: record.isTested ? 'var(--md-on-primary)' : 'var(--text-secondary)',
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
            <div className="surface-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
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
              <div className="surface-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
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
                    <button type="button" onClick={handleGetLocation} className="icon-btn" style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)', width: 'auto', padding: '8px 16px', borderRadius: '8px' }}>
                      التقاط الـ GPS الآن
                    </button>
                  </div>
                )}
              </div>

              <div className="surface-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
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
            style={{ width: '100%', justifyContent: 'center', background: gpsLocation ? 'var(--md-primary)' : 'var(--border-color)', color: gpsLocation ? 'var(--md-on-primary)' : 'var(--text-secondary)', padding: '16px', fontSize: '1.1rem' }}
          >
            {saving ? 'جاري رفع التقرير وتوثيق الـ GPS...' : !gpsLocation ? 'يرجى التقاط الموقع أولاً لرفع التقرير' : 'حفظ التقرير الميداني بشكل نهائي'}
          </button>
        </>
      )}
    </div>
  );
};

export default SupervisorVisitPage;

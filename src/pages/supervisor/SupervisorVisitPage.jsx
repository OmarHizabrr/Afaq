import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, CheckCircle2, XCircle, Star, Image as ImageIcon, Camera } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import { openGoogleMaps } from '../../utils/maps';
import { uploadMedia } from '../../services/storageApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import StarRatingInput from '../../components/StarRatingInput';
import BusyButton from '../../components/BusyButton';
import SupervisorVisitStudentCard from '../../components/SupervisorVisitStudentCard';
import { clampVisitRatingSave } from '../../utils/visitRating';
import useAppTranslation from '../../hooks/useAppTranslation';

const SupervisorVisitPage = ({ user }) => {
  const { t } = useAppTranslation();
  const actorId = user?.uid || user?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Scoped Data
  const [assignedSchools, setAssignedSchools] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);

  // Form State
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [teacherRating, setTeacherRating] = useState(5);
  const [villageRating, setVillageRating] = useState(5);
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
          setError(t('pages.SupervisorVisitPage.تعذر_تحديد_معرف_المستخدم_الحالي', 'تعذر تحديد معرف المستخدم الحالي.'));
          setLoading(false);
          return;
        }
        
        const assignedRegionIds = await api.listUserRegionIdsFromMirrors(user);
        const assignedRegionSet = new Set(assignedRegionIds);

        if (assignedRegionSet.size === 0 && user.role !== 'admin' && user.role !== 'system_admin' && user.role !== 'supervisor_arab') {
          setError(t('pages.SupervisorVisitPage.لا_توجد_لك_مناطق_إشرافية_مسندة_حالياً_راجع_الإدارة', 'لا توجد لك مناطق إشرافية مسندة حالياً. راجع الإدارة.'));
          setLoading(false);
          return;
        }

        const [schDocs, curDocs, villageDocs] = await Promise.all([
          api.getCollectionGroupDocuments('schools'),
          api.getDocuments(api.getCurriculumCollection()),
          api.getCollectionGroupDocuments('villages'),
        ]);

        const villageToRegion = Object.fromEntries(
          villageDocs.map((d) => [d.id, d.data()?.regionId || ''])
        );

        const villageNameById = Object.fromEntries(
          villageDocs.map((d) => [d.id, d.data()?.villageName || ''])
        );

        let schoolsData = schDocs.map((d) => {
          const data = d.data() || {};
          const vid = data.villageId || d.ref.parent.parent?.id || '';
          const regionIdResolved = data.regionId || villageToRegion[vid] || '';
          return {
            id: d.id,
            ...data,
            regionIdResolved,
            villageId: vid,
            villageName: villageNameById[vid] || data.villageName || '',
          };
        });

        if (user.role !== 'admin' && user.role !== 'system_admin' && user.role !== 'supervisor_arab') {
          schoolsData = schoolsData.filter((s) => assignedRegionSet.has(s.regionIdResolved));
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
        setError(t('pages.SupervisorVisitPage.تعذر_تحميل_البيانات_الأولية', 'تعذر تحميل البيانات الأولية.'));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [actorId, user]);

  // When school changes, fetch its students
  useEffect(() => {
    if (!selectedSchoolId) {
      setTrackingData([]);
      return;
    }

    const fetchStudentsForSchool = async () => {
      setLoading(true);
      try {
        const api = FirestoreApi.Api;
        // Fetch from hierarchical subcollection: students/{schoolId}/students
        const ref = api.getSchoolStudentsCollection(selectedSchoolId);
        const docs = await api.getDocuments(ref);
        const data = docs.map(d => ({ id: d.id, ...d.data() }));
        
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
  const selectedSchool = assignedSchools.find((s) => s.id === selectedSchoolId) || null;

  const handleMediaPick = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setMediaFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSuccess(t('pages.SupervisorVisitPage.تم_التقاط_الموقع_الجغرافي_بنجاح', 'تم التقاط الموقع الجغرافي بنجاح.'));
          setError('');
          setLocating(false);
        },
        () => {
          setError(t('pages.SupervisorVisitPage.يرجى_تفعيل_GPS_ومنح_صلاحية_الموقع_للمتصفح', 'يرجى تفعيل GPS ومنح صلاحية الموقع للمتصفح.'));
          setSuccess('');
          setLocating(false);
        }
      );
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedSchoolId || !selectedSubjectId || !selectedWeek) {
      setError(t('pages.SupervisorVisitPage.يرجى_ملء_البيانات_الأساسية_المدرسة،_المادة،_والدرس', 'يرجى ملء البيانات الأساسية (المدرسة، المادة، والدرس).'));
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
      const selectedSchoolName = selectedSchool?.name;
      const selectedSubjectName = getSelectedSubject()?.name;

      const payload = {
        reportType: 'supervisor_visit',
        supervisorId: actorId,
        supervisorName: user.displayName,
        schoolId: selectedSchoolId,
        schoolName: selectedSchoolName,
        villageId: selectedSchool?.villageId || '',
        villageName: selectedSchool?.villageName || '',
        subjectId: selectedSubjectId,
        subjectName: selectedSubjectName,
        week: selectedWeek,
        timestamp: new Date().toISOString(),
        gpsLocation,
        teacherRating: clampVisitRatingSave(teacherRating),
        villageRating: clampVisitRatingSave(villageRating),
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

      const visitRef = api.getSupervisorReportDoc(actorId, reportId);
      
      await api.setData({
        docRef: visitRef,
        data: payload
      });

      setSuccess(t('pages.SupervisorVisitPage.تم_رفع_تقرير_الزيارة_الميدانية_بنجاح', 'تم رفع تقرير الزيارة الميدانية بنجاح!'));
      // Reset
      setSelectedSchoolId('');
      setSelectedSubjectId('');
      setSelectedWeek('');
      setMediaFiles([]);
      setGeneralNotes('');
      setTeacherRating(5);
      setVillageRating(5);
    } catch (err) {
      console.error(err);
      setError(t('pages.SupervisorVisitPage.حدث_خطأ_أثناء_رفع_التقرير', 'حدث خطأ أثناء رفع التقرير.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && assignedSchools.length === 0) return <div className="loading-spinner page-loading-md" />;

  return (
    <div className="portal-page portal-page--narrow supervisor-visit-page">
      <PageHeader
        icon={MapPin}
        iconColor="var(--md-primary)"
        title={t('pages.SupervisorVisitPage.تسجيل_زيارة_ميدانية', 'تسجيل زيارة ميدانية')}
        subtitle={t('pages.SupervisorVisitPage.توثيق_تفصيلي_لأداء_المدارس_مع_الموقع_الجغرافي', 'توثيق تفصيلي لأداء المدارس مع الموقع الجغرافي')}
      />

      {error && <div className="app-alert app-alert--error portal-page-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success portal-page-alert">{success}</div>}

      <div className="surface-card visit-setup-card">
        <div className="visit-setup-grid">
          <div className="app-field">
            <label className="app-label">{t('pages.SupervisorVisitPage.المدرسة_المُزارة', 'المدرسة المُزارة')}</label>
            <AppSelect value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="app-select">
              <option value="">{t('pages.SupervisorVisitPage.اختر_المدرسة', '-- اختر المدرسة --')}</option>
              {assignedSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </AppSelect>
          </div>
          <div className="app-field">
            <label className="app-label">{t('utils.reportDetailsHtml.المادة', 'المادة')}</label>
            <AppSelect value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="app-select">
              <option value="">{t('pages.SupervisorVisitPage.اختر_المادة', '-- اختر المادة --')}</option>
              {curriculumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </AppSelect>
          </div>
          <div className="app-field">
            <label className="app-label">{t('pages.SupervisorVisitPage.الدرس_المدرج_بالخطة', 'الدرس المدرج بالخطة')}</label>
            <AppSelect value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="app-select" disabled={!selectedSubjectId}>
              <option value="">{t('pages.SupervisorVisitPage.اختر_الدرس', '-- اختر الدرس --')}</option>
              {availableWeeks.map(w => <option key={w.week} value={w.week}>أسبوع {w.week}: {w.lesson || '-'}</option>)}
            </AppSelect>
          </div>
        </div>
      </div>

      {selectedSchoolId && (
        <>
          {/* Students Cross-Check */}
          <div className="surface-card visit-students-card">
            <div className="md-table-panel__head visit-students-card__head">
              <h3 className="visit-students-card__title">{t('pages.SupervisorVisitPage.سجل_الطلاب_والتقييم_الفردي', 'سجل الطلاب والتقييم الفردي')}</h3>
              <div className="visit-students-card__bulk">
                <button
                  type="button"
                  className="google-btn google-btn--inline"
                  onClick={() =>
                    setTrackingData((prev) => prev.map((r) => ({ ...r, isPresent: true })))
                  }
                >
                  الكل حاضر
                </button>
                <button
                  type="button"
                  className="google-btn google-btn--inline"
                  onClick={() =>
                    setTrackingData((prev) =>
                      prev.map((r) => ({ ...r, isPresent: false, isTested: false, note: '' }))
                    )
                  }
                >
                  الكل غائب
                </button>
              </div>
            </div>
            <div className="visit-students-desktop-only">
              <div className="md-table-scroll">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th>{t('pages.SupervisorVisitPage.تعديل_الحالة', 'تعديل الحالة')}</th>
                      <th>{t('components.DailyPrepEditor.اسم_الطالب', 'اسم الطالب')}</th>
                      <th className="visit-table__col-center">{t('pages.SupervisorVisitPage.اختبار_الطالب', 'اختبار الطالب')}</th>
                      <th>{t('pages.SupervisorVisitPage.ملاحظة_التقييم_اختياري', 'ملاحظة التقييم (اختياري)')}</th>
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
                        <td className="visit-table__toggle-cell">
                          <button
                            type="button"
                            onClick={() => handleTrackingChange(record.studentId, 'isPresent', !record.isPresent)}
                            className="visit-table__toggle-btn"
                            title={record.isPresent ? t('components.SupervisorVisitStudentCard.تعديل_لغائب', 'تعديل لغائب') : t('components.SupervisorVisitStudentCard.حاضر', 'حاضر')}
                          >
                            {record.isPresent ? <CheckCircle size={24} color="var(--success-color)" /> : <XCircle size={24} color="var(--danger-color)" />}
                          </button>
                        </td>
                        <td className={`visit-table__name-cell${record.isPresent ? '' : ' visit-table__name-cell--absent'}`}>
                          {record.name}
                        </td>
                        <td className="visit-table__test-cell">
                          <button
                            type="button"
                            onClick={() => handleTrackingChange(record.studentId, 'isTested', !record.isTested)}
                            disabled={!record.isPresent}
                            className={`visit-test-chip${record.isTested ? ' visit-test-chip--active' : ''}${!record.isPresent ? ' visit-test-chip--disabled' : ''}`}
                          >
                            {record.isTested ? t('components.SupervisorVisitStudentCard.اختُبر', 'اختُبر') : t('components.SupervisorVisitStudentCard.اختبار', 'اختبار')}
                          </button>
                        </td>
                        <td className="visit-table__note-cell">
                          <input
                            type="text"
                            placeholder={t('components.SupervisorVisitStudentCard.ملاحظات_قراءته', 'ملاحظات قراءته...')}
                            value={record.note}
                            onChange={(e) => handleTrackingChange(record.studentId, 'note', e.target.value)}
                            disabled={!record.isPresent || !record.isTested}
                            className={`app-input visit-note-input${record.isPresent && record.isTested ? '' : ' visit-note-input--disabled'}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="visit-students-mobile-only">
              {trackingData.map((record) => (
                <SupervisorVisitStudentCard
                  key={record.studentId}
                  record={record}
                  onTrackingChange={handleTrackingChange}
                />
              ))}
            </div>
          </div>

          {selectedSchool?.villageName && (
            <p className="visit-village-hint">
              القرية: <strong>{selectedSchool.villageName}</strong>
            </p>
          )}

          {/* Evaluations & Media */}
          <div className="visit-eval-grid">
            <div className="surface-card visit-panel-card">
              <h3 className="visit-panel-card__title">
                <Star size={20} color="#f59e0b" /> التقييم العام
              </h3>

              <StarRatingInput
                label={t('pages.SupervisorVisitPage.تقييم_المدرّس_من_5_نجوم', 'تقييم المدرّس (من 5 نجوم)')}
                value={teacherRating}
                onChange={setTeacherRating}
                className="visit-panel-card__field"
              />

              <StarRatingInput
                label={t('pages.SupervisorVisitPage.التقييم_العام_للقرية_من_5_نجوم', 'التقييم العام للقرية (من 5 نجوم)')}
                value={villageRating}
                onChange={setVillageRating}
                className="visit-panel-card__field"
              />

              <label className="app-label">{t('pages.SupervisorVisitPage.الملاحظات_والتوجيهات', 'الملاحظات والتوجيهات')}</label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder={t('pages.SupervisorVisitPage.اكتب_رأيك_العام_عن_الزيارة', 'اكتب رأيك العام عن الزيارة...')}
                className="app-input app-textarea visit-textarea"
              />
            </div>

            <div className="visit-side-stack">
              <div className="surface-card visit-panel-card">
                <h3 className="visit-panel-card__title">
                  <Navigation size={20} color={gpsLocation ? 'var(--success-color)' : 'var(--danger-color)'} /> 
                  نطاق الزيارة (GPS)
                </h3>
                {gpsLocation ? (
                  <button
                    type="button"
                    onClick={() => openGoogleMaps(gpsLocation.lat, gpsLocation.lng)}
                    className="map-location-open map-location-open--clickable map-location-open--compact"
                    title={t('components.MapLocationOpen.فتح_في_خرائط_Google', 'فتح في خرائط Google')}
                  >
                    <span className="visit-gps-success">
                      <CheckCircle2 size={14} /> تم تحديد الموقع ({gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)})
                    </span>
                    <span className="map-location-open__hint visit-gps-hint">
                      اضغط للعرض على الخريطة
                    </span>
                  </button>
                ) : (
                  <div>
                    <p className="visit-gps-empty">{t('pages.SupervisorVisitPage.لم_يتم_جلب_موقع_الجوال_بعد', 'لم يتم جلب موقع الجوال بعد.')}</p>
                    <BusyButton type="button" onClick={handleGetLocation} busy={locating} className="icon-btn visit-gps-capture-btn">
                      التقاط الـ GPS الآن
                    </BusyButton>
                  </div>
                )}
              </div>

              <div className="surface-card visit-panel-card">
                <h3 className="visit-panel-card__title">
                  <ImageIcon size={20} color="#8b5cf6" /> التوثيق البصري
                </h3>
                <label className="visit-media-drop">
                  <input type="file" multiple accept="image/*,video/*" onChange={handleMediaPick} className="visit-media-drop__input" />
                  <Camera size={24} color="var(--text-secondary)" className="visit-media-drop__icon" />
                  <p className="visit-media-drop__text">{t('pages.SupervisorVisitPage.اضغط_لالتقاط_أو_اختيار_صور_وفيديو', 'اضغط لالتقاط أو اختيار صور وفيديو')}</p>
                </label>
                {mediaFiles.length > 0 && (
                  <ul className="visit-media-list">
                    {mediaFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <BusyButton
            type="button"
            className={`google-btn visit-submit-btn ${gpsLocation ? 'visit-submit-btn--ready' : 'visit-submit-btn--blocked'}`}
            onClick={handleSubmitReport}
            busy={saving}
            disabled={!gpsLocation}
          >
            {gpsLocation ? t('pages.SupervisorVisitPage.حفظ_التقرير_الميداني_بشكل_نهائي', 'حفظ التقرير الميداني بشكل نهائي') : t('pages.SupervisorVisitPage.يرجى_التقاط_الموقع_أولاً_لرفع_التقرير', 'يرجى التقاط الموقع أولاً لرفع التقرير')}
          </BusyButton>
        </>
      )}
    </div>
  );
};

export default SupervisorVisitPage;

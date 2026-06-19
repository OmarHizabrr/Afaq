import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ChevronRight, User, Phone, Mail, School, MapPin, Activity, Save, TrendingUp } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import StudentResultCard from '../../components/StudentResultCard';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, studentRowMatchesScope } from '../../utils/permissionDataScope';
import BusyButton from '../../components/BusyButton';
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';

const StudentDetailsPage = () => {
  const { t } = useAppTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const canEdit = can(PERMISSION_PAGE_IDS.students_management, 'student_management_edit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activity, setActivity] = useState([]);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const api = FirestoreApi.Api;
        const userDoc = await api.getData(api.getUserDoc(id));
        if (!userDoc || userDoc.role !== 'student') {
          setStudent(null);
          return;
        }
        setStudent({ id, ...userDoc });
        setEditName(userDoc.displayName || '');
        setEditPhone(userDoc.phoneNumber || '');
        setEditEmail(userDoc.email || '');

        const [mirrorDocs, schoolDocs, regionDocs, reportDocs] = await Promise.all([
          api.getDocuments(api.getUserMembershipMirrorCollection(id)),
          api.getCollectionGroupDocuments('schools'),
          api.getCollectionGroupDocuments('regions'),
          api.getCollectionGroupDocuments('reports'),
        ]);

        const schoolMap = Object.fromEntries(schoolDocs.map((d) => [d.id, d.data()?.name || d.id]));
        const regionMap = Object.fromEntries(regionDocs.map((d) => [d.id, d.data()?.name || d.id]));

        setMemberships(
          mirrorDocs.map((doc) => {
            const m = doc.data() || {};
            return {
              id: doc.id,
              schoolId: m.schoolId || '',
              schoolName: m.schoolId ? schoolMap[m.schoolId] || m.schoolId : '',
              regionId: m.regionId || '',
              regionName: m.regionId ? regionMap[m.regionId] || m.regionId : '',
              villageId: m.villageId || '',
            };
          })
        );

        const studentActivity = reportDocs
          .map((d) => {
            const data = d.data() || {};
            const record = Array.isArray(data.studentsTracking)
              ? data.studentsTracking.find((s) => s.studentId === id)
              : null;
            if (!record) return null;
            return {
              id: d.id,
              date: data.timestamp?.split('T')[0] || '',
              subjectName: data.subjectName || t('pages.StudentDetailsPage.مادة_غير_محددة', 'مادة غير محددة'),
              schoolName: data.schoolName || t('pages.StudentDetailsPage.بدون_مدرسة', 'بدون مدرسة'),
              isPresent: !!record.isPresent,
              isTested: !!record.isTested,
              note: record.note || '',
            };
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setActivity(studentActivity);
      } catch (err) {
        console.error(err);
        setError(t('pages.StudentDetailsPage.تعذر_تحميل_ملف_الطالب', 'تعذر تحميل ملف الطالب.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!id || !editName.trim()) return;
    try {
      setSaving(true);
      setError('');
      const api = FirestoreApi.Api;
      await api.updateData({
        docRef: api.getUserDoc(id),
        data: {
          displayName: editName.trim(),
          phoneNumber: editPhone.trim(),
          email: editEmail.trim(),
        },
      });
      setStudent((prev) => ({ ...prev, displayName: editName.trim(), phoneNumber: editPhone.trim(), email: editEmail.trim() }));
    } catch (err) {
      console.error(err);
      setError(t('pages.StudentDetailsPage.تعذر_حفظ_بيانات_الطالب', 'تعذر حفظ بيانات الطالب.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner page-loading-md" />;
  if (!student) return <div className="empty-state">ملف الطالب غير موجود.</div>;

  const stScope = pageDataScope(PERMISSION_PAGE_IDS.students_management);
  const scopeRow = { ...student, memberships };
  if (
    ready &&
    !membershipLoading &&
    stScope === DATA_SCOPE_MEMBERSHIP &&
    !studentRowMatchesScope(scopeRow, membershipGroupIds, stScope)
  ) {
    return <Navigate to="/students-management" replace />;
  }

  return (
    <div className={`student-details-page portal-page${isMobile && canEdit ? ' student-details-page--has-mobile-save' : ''}`}>
      <PageHeader
        topRow={(
          <div className="user-details-page__top-row student-details-page__top-row">
            <button type="button" className="page-nav-back" onClick={() => navigate('/students-management')}>
              <ChevronRight size={20} aria-hidden /> الطلاب
            </button>
          </div>
        )}
        title={<>ملف الطالب: <span className="page-header-accent">{student.displayName || t('components.StudentManagementStudentCard.بدون_اسم', 'بدون اسم')}</span></>}
        subtitle={t('pages.StudentDetailsPage.كل_بيانات_الطالب_وارتباطاته_بالمدارس_والمناطق', 'كل بيانات الطالب وارتباطاته بالمدارس والمناطق')}
      />

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <div className="user-details-layout">
        <div className="user-details-profile-col">
          <div className="surface-card surface-card--lg user-details-profile-card">
            <img
              src={student.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.displayName || '')}&size=128`}
              alt=""
              className="user-details-profile-card__avatar"
            />
            <h2 className="user-details-profile-card__name">{student.displayName || t('components.StudentManagementStudentCard.بدون_اسم', 'بدون اسم')}</h2>
            <span className="user-details-profile-card__role">{t('components.MessengerPanel.طالب', 'طالب')}</span>

            {canEdit && (
              <div className="user-details-profile-card__edit-form">
                <div className="app-field app-field--grow">
                  <label className="app-label">{t('pages.VillageDetailsPage.الاسم', 'الاسم')}</label>
                  <input className="app-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="app-field app-field--grow">
                  <label className="app-label">{t('utils.schoolReportExport.الهاتف', 'الهاتف')}</label>
                  <input className="app-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="app-field app-field--grow">
                  <label className="app-label">البريد</label>
                  <input className="app-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                {!isMobile && (
                  <BusyButton type="button" className="google-btn google-btn--filled" onClick={handleSave} busy={saving}>
                    <span className="btn-inner">
                      <Save size={16} aria-hidden />
                      حفظ التعديلات
                    </span>
                  </BusyButton>
                )}
              </div>
            )}

            <div className="user-details-profile-card__meta">
              <div className="user-details-profile-card__meta-row"><User size={16} /> {student.displayName || t('components.StudentManagementStudentCard.بدون_اسم', 'بدون اسم')}</div>
              <div className="user-details-profile-card__meta-row"><Phone size={16} /> {student.phoneNumber || t('pages.StudentDetailsPage.لا_يوجد_رقم', 'لا يوجد رقم')}</div>
              <div className="user-details-profile-card__meta-row"><Mail size={16} /> {student.email || t('pages.StudentDetailsPage.لا_يوجد_بريد', 'لا يوجد بريد')}</div>
            </div>
          </div>
        </div>

        <div className="surface-card surface-card--lg user-details-activity-card">
          <div className="user-details-activity-card__head">
            <School size={22} color="var(--accent-color)" />
            <h2 className="user-details-activity-card__title">الارتباطات</h2>
          </div>
          {memberships.length === 0 ? (
            <p className="empty-state">لا توجد ارتباطات حالياً.</p>
          ) : (
            <div className="user-details-memberships-list">
              {memberships.map((m) => (
                <div key={m.id} className="user-details-memberships-item">
                  <div className="user-details-memberships-item__line">
                    {m.schoolName ? `مدرسة: ${m.schoolName}` : m.regionName ? `منطقة: ${m.regionName}` : `مجموعة: ${m.id}`}
                  </div>
                  {m.villageId && <div className="user-details-memberships-item__sub"><MapPin size={14} /> قرية: {m.villageId}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="user-details-activity-card__head user-details-activity-card__head--spaced">
            <Activity size={22} color="var(--accent-color)" />
            <h2 className="user-details-activity-card__title">سجل الطالب</h2>
          </div>
          {activity.length === 0 ? (
            <p className="empty-state user-details-activity-card__empty">لا يوجد نشاط مسجل.</p>
          ) : (
            <div className="user-details-activity-list">
              <div className="user-details-activity-desktop-only">
                {activity.map((item) => (
                  <div key={item.id} className="activity-list-item activity-list-item--split">
                    <div>
                      <h4 className="activity-list-item__title">{item.subjectName}</h4>
                      <p className="activity-list-item__meta">{item.date || 'بدون تاريخ'} • {item.schoolName}</p>
                    </div>
                    <div className="user-details-activity-list__status-wrap">
                      <span className={`user-details-activity-list__status-chip ${item.isPresent ? 'user-details-activity-list__status-chip--present' : 'user-details-activity-list__status-chip--absent'}`}>
                        {item.isPresent ? 'حاضر' : 'غائب'}
                      </span>
                      {item.isTested && <TrendingUp size={16} color="var(--success-color)" />}
                      <button type="button" className="icon-btn" onClick={() => navigate(`/reports/${item.id}`)} aria-label="عرض التقرير">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="user-details-activity-mobile-only">
                {activity.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="student-details-activity-link"
                    onClick={() => navigate(`/reports/${item.id}`)}
                  >
                    <StudentResultCard
                      row={{
                        schoolName: item.schoolName,
                        subjectName: item.subjectName,
                        date: item.date,
                        isPresent: item.isPresent,
                        isTested: item.isTested,
                        note: item.note,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && canEdit && (
        <div className="student-details-mobile-save-bar">
          <BusyButton
            type="button"
            className="google-btn google-btn--filled student-details-mobile-save-bar__btn"
            onClick={handleSave}
            busy={saving}
          >
            <span className="btn-inner">
              <Save size={16} aria-hidden />
              حفظ التعديلات
            </span>
          </BusyButton>
        </div>
      )}
    </div>
  );
};

export default StudentDetailsPage;

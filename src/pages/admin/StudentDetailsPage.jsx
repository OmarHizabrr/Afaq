import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ChevronRight, User, Phone, Mail, School, MapPin, Activity, Save } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP, studentRowMatchesScope } from '../../utils/permissionDataScope';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();
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
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (r) => Array.isArray(r.studentsTracking) && r.studentsTracking.some((s) => s.studentId === id)
          )
          .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setActivity(studentActivity);
      } catch (err) {
        console.error(err);
        setError('تعذر تحميل ملف الطالب.');
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
      setError('تعذر حفظ بيانات الطالب.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
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
    <div>
      <PageHeader
        topRow={(
          <div className="user-details-page__top-row">
            <button type="button" className="page-nav-back" onClick={() => navigate('/students-management')}>
              <ChevronRight size={20} aria-hidden /> الطلاب
            </button>
          </div>
        )}
        title={<>ملف الطالب: <span style={{ color: 'var(--md-primary)' }}>{student.displayName || 'بدون اسم'}</span></>}
        subtitle="كل بيانات الطالب وارتباطاته بالمدارس والمناطق"
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
            <h2 className="user-details-profile-card__name">{student.displayName || 'بدون اسم'}</h2>
            <span className="user-details-profile-card__role">طالب</span>

            {can(PERMISSION_PAGE_IDS.students_management, 'student_management_edit') && (
              <div style={{ width: '100%', marginTop: 12 }}>
                <div className="app-field app-field--grow">
                  <label className="app-label">الاسم</label>
                  <input className="app-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="app-field app-field--grow">
                  <label className="app-label">الهاتف</label>
                  <input className="app-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="app-field app-field--grow">
                  <label className="app-label">البريد</label>
                  <input className="app-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <button type="button" className="google-btn google-btn--filled" onClick={handleSave} disabled={saving}>
                  <Save size={16} /> {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            )}

            <div className="user-details-profile-card__meta">
              <div className="user-details-profile-card__meta-row"><User size={16} /> {student.displayName || 'بدون اسم'}</div>
              <div className="user-details-profile-card__meta-row"><Phone size={16} /> {student.phoneNumber || 'لا يوجد رقم'}</div>
              <div className="user-details-profile-card__meta-row"><Mail size={16} /> {student.email || 'لا يوجد بريد'}</div>
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

          <div className="user-details-activity-card__head" style={{ marginTop: 16 }}>
            <Activity size={22} color="var(--accent-color)" />
            <h2 className="user-details-activity-card__title">سجل الطالب</h2>
          </div>
          {activity.length === 0 ? (
            <p className="empty-state">لا يوجد نشاط مسجل.</p>
          ) : (
            <div className="user-details-activity-list">
              {activity.map((r) => (
                <div key={r.id} className="activity-list-item activity-list-item--split">
                  <div>
                    <h4 style={{ margin: 0 }}>{r.subjectName || 'مادة غير محددة'}</h4>
                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {(r.timestamp || '').split('T')[0] || 'بدون تاريخ'} • {r.schoolName || 'بدون مدرسة'}
                    </p>
                  </div>
                  <button className="icon-btn" onClick={() => navigate(`/reports/${r.id}`)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsPage;

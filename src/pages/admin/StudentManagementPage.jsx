import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Search, Activity, Eye, Plus, Edit2 } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import FormModal from '../../components/FormModal';

const StudentManagementPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [schoolsCatalog, setSchoolsCatalog] = useState([]);
  const [query, setQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSchoolId, setFormSchoolId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStudentsData = async () => {
    setLoading(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const [userDocs, schoolDocs, regionDocs, reportDocs] = await Promise.all([
        api.getDocuments(api.getUsersCollection()),
        api.getCollectionGroupDocuments('schools'),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('reports'),
      ]);

      const schoolsMap = Object.fromEntries(schoolDocs.map((d) => [d.id, d.data()?.name || d.id]));
      setSchoolsCatalog(
        schoolDocs.map((d) => ({ id: d.id, name: d.data()?.name || d.id, villageId: d.data()?.villageId || '' }))
      );
      const regionsMap = Object.fromEntries(regionDocs.map((d) => [d.id, d.data()?.name || d.id]));
      const reports = reportDocs.map((d) => d.data() || {});

      const studentUsers = userDocs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === 'student');

      const rows = [];
      for (const student of studentUsers) {
        const mirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(student.id));
        const memberships = mirrors.map((m) => {
          const data = m.data() || {};
          return {
            schoolId: data.schoolId || '',
            schoolName: data.schoolId ? schoolsMap[data.schoolId] || data.schoolId : '',
            regionId: data.regionId || '',
            regionName: data.regionId ? regionsMap[data.regionId] || data.regionId : '',
          };
        });

        const studentActivity = reports.filter((r) =>
          Array.isArray(r.studentsTracking) && r.studentsTracking.some((s) => s.studentId === student.id)
        );
        const latest = studentActivity
          .map((r) => r.timestamp || '')
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || '';

        rows.push({
          ...student,
          memberships,
          membershipText: memberships
            .map((m) => (m.schoolName ? `مدرسة: ${m.schoolName}` : m.regionName ? `منطقة: ${m.regionName}` : ''))
            .filter(Boolean)
            .join('، '),
          activityCount: studentActivity.length,
          lastActivity: latest,
        });
      }

      setStudents(rows);
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل بيانات إدارة الطلاب.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormSchoolId('');
    setEditingStudent(null);
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setFormName(student.displayName || '');
    setFormEmail(student.email || '');
    setFormPhone(student.phoneNumber || '');
    setFormPassword(student.password || '');
    setFormSchoolId(student.primarySchoolId || student.memberships.find((m) => m.schoolId)?.schoolId || '');
    setIsAddOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!formName.trim()) {
      setError('اسم الطالب مطلوب.');
      return;
    }
    if (!editingStudent && (!formPhone.trim() || !formPassword.trim())) {
      setError('عند إضافة طالب جديد يجب إدخال رقم الهاتف وكلمة المرور.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const api = FirestoreApi.Api;
      const studentId = editingStudent?.id || api.getNewId('users');
      const selectedSchool = schoolsCatalog.find((s) => s.id === formSchoolId);
      await api.setData({
        docRef: api.getUserDoc(studentId),
        data: {
          uid: studentId,
          displayName: formName.trim(),
          email: formEmail.trim(),
          phoneNumber: formPhone.trim(),
          password: formPassword.trim(),
          role: 'student',
          permissionProfileId: null,
          accountDisabled: false,
          primarySchoolId: formSchoolId || '',
          villageId: selectedSchool?.villageId || '',
        },
        merge: true,
      });

      if (formSchoolId) {
        const studentData = {
          studentName: formName.trim(),
          age: 0,
          schoolId: formSchoolId,
          villageId: selectedSchool?.villageId || '',
          teacherId: '',
        };
        await api.setData({ docRef: api.getSchoolStudentDoc(formSchoolId, studentId), data: studentData, merge: true });
        await api.setData({
          docRef: api.getGroupMemberDoc(formSchoolId, studentId),
          data: { ...studentData, id: studentId, type: 'student' },
          merge: true,
        });
        await api.setData({
          docRef: api.getUserMembershipMirrorDoc(studentId, formSchoolId),
          data: { schoolId: formSchoolId, villageId: selectedSchool?.villageId || '', studentName: formName.trim() },
          merge: true,
        });
      }

      setIsAddOpen(false);
      resetForm();
      await fetchStudentsData();
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ بيانات الطالب.');
    } finally {
      setSaving(false);
    }
  };

  const schoolOptions = useMemo(() => {
    const setVals = new Set();
    students.forEach((s) => s.memberships.forEach((m) => m.schoolName && setVals.add(m.schoolName)));
    return Array.from(setVals).sort();
  }, [students]);

  const regionOptions = useMemo(() => {
    const setVals = new Set();
    students.forEach((s) => s.memberships.forEach((m) => m.regionName && setVals.add(m.regionName)));
    return Array.from(setVals).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchQuery =
        !q ||
        s.displayName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.membershipText?.toLowerCase().includes(q);
      const matchSchool = !schoolFilter || s.memberships.some((m) => m.schoolName === schoolFilter);
      const matchRegion = !regionFilter || s.memberships.some((m) => m.regionName === regionFilter);
      return matchQuery && matchSchool && matchRegion;
    });
  }, [students, query, schoolFilter, regionFilter]);

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title="الطلاب"
        subtitle="عرض الارتباطات والتحركات لكل طالب بنمط عضويات المجموعات"
      >
        {can(PERMISSION_PAGE_IDS.students_management, 'student_management_add') && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
          >
            <Plus size={16} /> إضافة طالب
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error student-management-alert">{error}</div>}

      <div className="surface-card student-management-filters">
        <div className="app-form-row">
          <div className="student-management-filters__search-wrap">
            <Search size={16} className="student-management-filters__search-icon" />
            <input
              type="text"
              className="app-input student-management-filters__search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو الارتباط..."
            />
          </div>
          <AppSelect className="student-management-filters__select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
            <option value="">كل المدارس</option>
            {schoolOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </AppSelect>
          <AppSelect className="student-management-filters__select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">كل المناطق</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </AppSelect>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">لا يوجد طلاب مطابقون للفلاتر الحالية.</div>
      ) : (
        <div className="surface-card student-management-table-wrap">
          <div className="md-table-scroll">
            <table className="md-table student-management-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الارتباطات</th>
                  <th>عدد التحركات</th>
                  <th>آخر حركة</th>
                  <th style={{ textAlign: 'center' }}>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="student-management-student-cell">
                        <img
                          src={s.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.displayName || '')}`}
                          alt=""
                          className="student-management-student-cell__avatar"
                        />
                        <div>
                          <div className="student-management-student-cell__name">{s.displayName || 'بدون اسم'}</div>
                          <div className="student-management-student-cell__email">{s.email || 'بدون بريد'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="student-management-cell-muted">
                      {s.membershipText || 'غير مرتبط بأي مجموعة'}
                    </td>
                    <td>
                      <span className="student-management-activity-chip">
                        <Activity size={14} /> {s.activityCount}
                      </span>
                    </td>
                    <td className="student-management-cell-muted">
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('ar-EG') : 'لا يوجد'}
                    </td>
                    <td className="student-management-cell-center">
                      {can(PERMISSION_PAGE_IDS.students_management, 'student_management_view_profile') && (
                        <button className="icon-btn" onClick={() => navigate(`/students/${s.id}`)} title="عرض ملف الطالب">
                          <Eye size={17} color="var(--accent-color)" />
                        </button>
                      )}
                      {can(PERMISSION_PAGE_IDS.students_management, 'student_management_edit') && (
                        <button className="icon-btn" onClick={() => openEdit(s)} title="تعديل بيانات الطالب">
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormModal
        open={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        size="md"
        title={editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
      >
        <div className="app-form-grid">
          <div className="app-field app-field--grow">
            <label className="app-label">الاسم</label>
            <input className="app-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">البريد</label>
            <input className="app-input" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">رقم الهاتف</label>
            <input className="app-input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">كلمة المرور</label>
            <input className="app-input" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">المدرسة</label>
            <AppSelect value={formSchoolId} onChange={(e) => setFormSchoolId(e.target.value)}>
              <option value="">بدون مدرسة حالياً</option>
              {schoolsCatalog.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </AppSelect>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="google-btn" onClick={() => setIsAddOpen(false)}>إلغاء</button>
            <button type="button" className="google-btn google-btn--filled" onClick={handleSaveStudent} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default StudentManagementPage;

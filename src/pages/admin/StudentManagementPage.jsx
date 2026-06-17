import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Search, Activity, Eye, EyeOff, Plus, Edit2, Lock, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS, EXPLORATION_BRIDGE_ACTION_IDS } from '../../config/permissionRegistry';
import FormModal from '../../components/FormModal';
import BusyButton from '../../components/BusyButton';
import ExplorationFormSection from '../../components/ExplorationFormSection';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import StudentManagementStudentCard from '../../components/StudentManagementStudentCard';
import { useExplorationForm } from '../../hooks/useExplorationForm';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterRegionsByScope,
  filterSchoolsByScope,
  reportMatchesScope,
  studentRowMatchesScope,
} from '../../utils/permissionDataScope';

const StudentManagementPage = () => {
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser, explorationBridgeAllowed } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [schoolsCatalog, setSchoolsCatalog] = useState([]);
  /** @type {{ id: string, name: string }[]} */
  const [regionsCatalog, setRegionsCatalog] = useState([]);
  const [query, setQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formPhotoURL, setFormPhotoURL] = useState('');
  const [formAccountDisabled, setFormAccountDisabled] = useState(false);
  /** @type {string[]} */
  const [formSchoolIds, setFormSchoolIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.students_management);

  const sortedSchoolsCatalog = useMemo(
    () => [...schoolsCatalog].sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [schoolsCatalog]
  );

  const fetchStudentsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const api = FirestoreApi.Api;
      const [userDocs, schoolDocs, regionDocs, villageDocs, reportDocs] = await Promise.all([
        api.getDocuments(api.getUsersCollection()),
        api.getCollectionGroupDocuments('schools'),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('villages'),
        api.getCollectionGroupDocuments('reports'),
      ]);

      const scope = pageDataScope(PERMISSION_PAGE_IDS.students_management);
      const actorId = actorUser?.uid || actorUser?.id || '';

      const regionsMap = Object.fromEntries(regionDocs.map((d) => [d.id, d.data()?.name || d.id]));
      let regionsSorted = regionDocs
        .map((d) => ({ id: d.id, name: d.data()?.name || d.id }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        regionsSorted = filterRegionsByScope(regionsSorted, membershipGroupIds, scope);
      }
      setRegionsCatalog(regionsSorted);

      const villageToRegion = Object.fromEntries(
        villageDocs.map((d) => {
          const data = d.data() || {};
          return [d.id, data.regionId || ''];
        })
      );

      /** @type {Record<string, { name: string, villageId: string, regionId: string, regionName: string }>} */
      const schoolById = {};
      schoolDocs.forEach((d) => {
        const data = d.data() || {};
        const vid = data.villageId || '';
        const rid = villageToRegion[vid] || '';
        schoolById[d.id] = {
          name: (data.name || '').trim() || d.id,
          villageId: vid,
          regionId: rid,
          regionName: rid ? regionsMap[rid] || rid : '',
        };
      });

      const schoolsMap = Object.fromEntries(Object.entries(schoolById).map(([id, s]) => [id, s.name]));

      let schoolsRows = schoolDocs.map((d) => {
        const data = d.data() || {};
        const pathVillageId = d.ref.parent.parent?.id || '';
        return {
          id: d.id,
          ...data,
          pathVillageId: pathVillageId || data.villageId || '',
        };
      });
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        schoolsRows = filterSchoolsByScope(schoolsRows, membershipGroupIds, scope);
      }

      setSchoolsCatalog(
        schoolsRows.map((row) => ({
          id: row.id,
          name: schoolById[row.id]?.name || row.id,
          villageId: row.villageId || row.pathVillageId || '',
          regionId: schoolById[row.id]?.regionId || '',
        }))
      );

      const reports = reportDocs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          ...data,
          supervisorId: data.supervisorId || d.ref.parent.parent?.id || '',
        };
      });
      const scopedReports =
        scope === DATA_SCOPE_MEMBERSHIP
          ? reports.filter((r) => reportMatchesScope(r, membershipGroupIds, actorId, scope))
          : reports;

      const studentUsers = userDocs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === 'student');

      const rows = [];
      for (const student of studentUsers) {
        const mirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(student.id));
        const memberships = mirrors.map((m) => {
          const data = m.data() || {};
          const sid = data.schoolId || '';
          const fromSchool = sid ? schoolById[sid] : null;
          const regionId = data.regionId || fromSchool?.regionId || '';
          const regionName =
            (data.regionId ? regionsMap[data.regionId] : '') || fromSchool?.regionName || '';
          const schoolName = sid ? fromSchool?.name || schoolsMap[sid] || sid : '';
          return {
            schoolId: sid,
            schoolName,
            regionId,
            regionName,
            villageId: data.villageId || fromSchool?.villageId || '',
          };
        });

        const regionNamesSet = new Set(memberships.map((m) => m.regionName).filter(Boolean));
        const primarySid = student.primarySchoolId || '';
        if (primarySid && schoolById[primarySid]?.regionName) {
          regionNamesSet.add(schoolById[primarySid].regionName);
        }
        const regionNames = Array.from(regionNamesSet);

        const studentActivity = scopedReports.filter((r) =>
          Array.isArray(r.studentsTracking) && r.studentsTracking.some((s) => s.studentId === student.id)
        );
        const latest = studentActivity
          .map((r) => r.timestamp || '')
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || '';

        rows.push({
          ...student,
          memberships,
          regionNames,
          membershipText: memberships
            .map((m) => {
              const parts = [];
              if (m.schoolName) parts.push(`مدرسة: ${m.schoolName}`);
              if (m.regionName) parts.push(`منطقة: ${m.regionName}`);
              return parts.length ? parts.join(' — ') : '';
            })
            .filter(Boolean)
            .join('، '),
          activityCount: studentActivity.length,
          lastActivity: latest,
        });
      }

      const filteredRows =
        scope === DATA_SCOPE_MEMBERSHIP
          ? rows.filter((row) => studentRowMatchesScope(row, membershipGroupIds, scope))
          : rows;
      setStudents(filteredRows);
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل بيانات إدارة الطلاب.');
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds, actorUser]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.students_management) === DATA_SCOPE_MEMBERSHIP && membershipLoading)
      return;
    fetchStudentsData();
  }, [ready, membershipLoading, fetchStudentsData, pageDataScope]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormPhotoURL('');
    setFormAccountDisabled(false);
    setFormSchoolIds([]);
    setEditingStudent(null);
  };

  const toggleFormSchool = (schoolId) => {
    setFormSchoolIds((prev) => {
      if (prev.includes(schoolId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== schoolId);
      }
      return [...prev, schoolId];
    });
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setFormName(student.displayName || '');
    setFormEmail(student.email || '');
    setFormPhone(student.phoneNumber || '');
    setFormPassword('');
    setShowFormPassword(false);
    setFormPhotoURL(student.photoURL || '');
    setFormAccountDisabled(Boolean(student.accountDisabled));
    const fromMirrors = student.memberships.map((m) => m.schoolId).filter(Boolean);
    const ids = fromMirrors.length ? fromMirrors : student.primarySchoolId ? [student.primarySchoolId] : [];
    setFormSchoolIds(ids.length ? [...new Set(ids)] : []);
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
      const nextSchoolIds = [...new Set(formSchoolIds.filter(Boolean))];
      const prevSchoolIds = editingStudent
        ? editingStudent.memberships.map((m) => m.schoolId).filter(Boolean)
        : [];
      const primarySchoolId = nextSchoolIds[0] || '';
      const villageFromSchool = schoolsCatalog.find((s) => s.id === primarySchoolId)?.villageId || '';

      const emailNorm = formEmail.trim().toLowerCase();
      const userData = {
        uid: studentId,
        displayName: formName.trim(),
        email: emailNorm,
        phoneNumber: formPhone.trim(),
        role: 'student',
        permissionProfileId: null,
        photoURL: formPhotoURL.trim(),
        accountDisabled: formAccountDisabled,
        primarySchoolId,
        villageId: villageFromSchool,
      };
      if (!editingStudent) {
        userData.password = formPassword.trim();
        userData.fcmTokens = [];
      } else if (formPassword.trim()) {
        userData.password = formPassword.trim();
      }

      await api.setData({
        docRef: api.getUserDoc(studentId),
        data: userData,
        merge: true,
      });

      if (editingStudent) {
        const toRemove = prevSchoolIds.filter((sid) => !nextSchoolIds.includes(sid));
        for (const schoolId of toRemove) {
          try {
            await api.deleteData(api.getSchoolStudentDoc(schoolId, studentId));
            await api.deleteData(api.getGroupMemberDoc(schoolId, studentId));
            await api.deleteData(api.getUserMembershipMirrorDoc(studentId, schoolId));
          } catch (err) {
            console.error(err);
          }
        }
      }

      for (const schoolId of nextSchoolIds) {
        const selectedSchool = schoolsCatalog.find((s) => s.id === schoolId);
        const studentData = {
          studentName: formName.trim(),
          age: 0,
          schoolId,
          villageId: selectedSchool?.villageId || '',
          teacherId: '',
        };
        await api.setData({ docRef: api.getSchoolStudentDoc(schoolId, studentId), data: studentData, merge: true });
        await api.setData({
          docRef: api.getGroupMemberDoc(schoolId, studentId),
          data: { ...studentData, id: studentId, type: 'student' },
          merge: true,
        });
        await api.setData({
          docRef: api.getUserMembershipMirrorDoc(studentId, schoolId),
          data: {
            schoolId,
            villageId: selectedSchool?.villageId || '',
            studentName: formName.trim(),
          },
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

  const handleExplorationSaveStudent = async () => {
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join('، ')}`);
      return;
    }
    const displayName = expForm.deriveDisplayName('');
    if (!displayName) {
      setError('لا يمكن استخراج اسم الطالب من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".');
      return;
    }
    const phone = expForm.getValueByType('tel').trim();
    if (!phone) {
      setError('يحتاج النموذج إلى حقل من نوع «رقم هاتف» لإنشاء حساب الطالب.');
      return;
    }
    const password = expForm.getValueByType('password').trim();
    if (!password) {
      setError('يحتاج النموذج إلى حقل من نوع «كلمة مرور» لإنشاء حساب الطالب.');
      return;
    }
    const emailNorm = expForm.getValueByType('email').trim().toLowerCase();
    const photoURL = expForm.getValueByType('url').trim();
    try {
      setExpSaving(true);
      setError('');
      const api = FirestoreApi.Api;
      const studentId = api.getNewId('users');
      await api.setData({
        docRef: api.getUserDoc(studentId),
        data: {
          uid: studentId,
          displayName,
          email: emailNorm,
          phoneNumber: phone,
          role: 'student',
          permissionProfileId: null,
          photoURL,
          accountDisabled: false,
          fcmTokens: [],
          primarySchoolId: '',
          villageId: '',
          password,
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        merge: true,
        userData: actorUser || {},
      });
      setIsExploringAdding(false);
      expForm.reset();
      await fetchStudentsData();
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ الطالب من نموذج الاستكشاف.');
    } finally {
      setExpSaving(false);
    }
  };

  const schoolOptions = useMemo(() => {
    const setVals = new Set();
    students.forEach((s) => s.memberships.forEach((m) => m.schoolName && setVals.add(m.schoolName)));
    return Array.from(setVals).sort();
  }, [students]);

  const regionOptions = useMemo(
    () => regionsCatalog.map((r) => r.name),
    [regionsCatalog]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchQuery =
        !q ||
        s.displayName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.membershipText?.toLowerCase().includes(q);
      const matchSchool = !schoolFilter || s.memberships.some((m) => m.schoolName === schoolFilter);
      const matchRegion =
        !regionFilter ||
        (Array.isArray(s.regionNames) && s.regionNames.includes(regionFilter)) ||
        s.memberships.some((m) => m.regionName === regionFilter);
      return matchQuery && matchSchool && matchRegion;
    });
  }, [students, query, schoolFilter, regionFilter]);

  return (
    <div className="portal-page">
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
              const sorted = [...schoolsCatalog].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
              if (sorted.length) setFormSchoolIds([sorted[0].id]);
            }}
          >
            <Plus size={16} />
            <span className="portal-toolbar__long">إضافة طالب</span>
            <span className="portal-toolbar__short">إضافة</span>
          </button>
        )}
        {can(PERMISSION_PAGE_IDS.students_management, 'student_management_add') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => setIsExploringAdding(true)}
          >
            <Compass size={16} />
            <span className="portal-toolbar__long">إضافة من الاستكشاف</span>
            <span className="portal-toolbar__short">استكشاف</span>
          </button>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.students_management) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info student-management-alert">
          عرض محدود: الطلاب والمدارس والمناطق الظاهرة مرتبطة بمجموعاتك فقط.
        </div>
      )}
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
          <AppSelect searchable className="student-management-filters__select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
            <option value="">كل المدارس</option>
            {schoolOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </AppSelect>
          <AppSelect searchable className="student-management-filters__select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">كل المناطق</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </AppSelect>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner page-loading"></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">لا يوجد طلاب مطابقون للفلاتر الحالية.</div>
      ) : (
        <>
        <div className="surface-card student-management-table-wrap student-management-desktop-only">
          <div className="md-table-scroll">
            <table className="md-table student-management-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الارتباطات</th>
                  <th>عدد التحركات</th>
                  <th>آخر حركة</th>
                  <th className="student-management-table__col-center">تفاصيل</th>
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
                          <div className="student-management-student-cell__exploration">
                            {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                              <ExplorationBadge record={s} onClick={() => setViewingExplorationOf(s)} />
                            )}
                          </div>
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

        <div className="student-management-mobile-only">
          {filtered.map((s) => (
            <StudentManagementStudentCard
              key={s.id}
              student={s}
              canView={can(PERMISSION_PAGE_IDS.students_management, 'student_management_view_profile')}
              canEdit={can(PERMISSION_PAGE_IDS.students_management, 'student_management_edit')}
              explorationBridgeAllowed={explorationBridgeAllowed}
              onView={(sid) => navigate(`/students/${sid}`)}
              onEdit={openEdit}
              onExplorationView={setViewingExplorationOf}
            />
          ))}
        </div>
        </>
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
            <label className="app-label">الاسم الكامل</label>
            <input className="app-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">البريد الإلكتروني (اختياري)</label>
            <input
              className="app-input"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">رقم الهاتف {!editingStudent && '(إجباري)'}</label>
            <input
              className="app-input"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={15}
              placeholder="07xxxxxxxx"
            />
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">
              كلمة المرور {!editingStudent ? '(إجباري)' : '(اتركها فارغة للإبقاء على الحالية)'}
            </label>
            <div className="md-field settings-profile-form__password-field">
              <Lock size={18} color="var(--text-secondary)" aria-hidden />
              <input
                className="app-input"
                type={showFormPassword ? 'text' : 'password'}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                autoComplete={editingStudent ? 'new-password' : 'new-password'}
                placeholder={editingStudent ? '—' : 'كلمة مرور الطالب'}
              />
              <button
                type="button"
                className="icon-btn settings-profile-form__password-toggle"
                onClick={() => setShowFormPassword((v) => !v)}
                title={showFormPassword ? 'إخفاء' : 'إظهار'}
                aria-label={showFormPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showFormPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">رابط صورة شخصية (اختياري)</label>
            <input
              className="app-input"
              type="url"
              value={formPhotoURL}
              onChange={(e) => setFormPhotoURL(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="app-field app-field--grow app-field--checkbox-row">
            <label className="app-checkbox-label">
              <input
                type="checkbox"
                checked={formAccountDisabled}
                onChange={(e) => setFormAccountDisabled(e.target.checked)}
              />
              <span>حساب معطّل (لا يستطيع تسجيل الدخول)</span>
            </label>
          </div>
          <div className="app-field app-field--grow">
            <label className="app-label">المدارس (قائمة الطلاب المسجلين — يمكن أكثر من مدرسة)</label>
            <p className="app-form-hint">
              الافتراضي عند التعديل: مدارس الارتباط الحالية. يجب إبقاء مدرسة واحدة على الأقل إن وُجدت مدارس محددة.
            </p>
            <div className="villages-school-checks">
              {sortedSchoolsCatalog.map((s) => (
                <label key={s.id} className="villages-school-checks__item">
                  <input
                    type="checkbox"
                    checked={formSchoolIds.includes(s.id)}
                    onChange={() => toggleFormSchool(s.id)}
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-footer-actions modal-footer-actions--spaced">
            <button type="button" className="google-btn" onClick={() => { setIsAddOpen(false); resetForm(); }}>إلغاء</button>
            <BusyButton type="button" className="google-btn google-btn--filled" onClick={handleSaveStudent} busy={saving}>
              حفظ
            </BusyButton>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        onClose={() => setIsExploringAdding(false)}
        size="lg"
        title="إضافة طالب من نموذج الاستكشاف"
      >
        <div className="app-form-grid">
          <div className="app-alert app-alert--info">
            يحتاج النموذج إلى حقول من نوع: نص (للاسم)، هاتف، كلمة مرور — مع إمكانية إضافة بريد إلكتروني ورابط
            للصورة اختيارياً. ربط الطالب بالمدرسة يتم من صفحة المدرسة لاحقاً.
          </div>
          <ExplorationFormSection
              controller={expForm}
              actorUser={actorUser}
              storageUserId={storageUserId}
              heading="حقول نموذج الاستكشاف"
              currentPageId={PERMISSION_PAGE_IDS.students_management}
          />
          <div className="modal-footer-actions modal-footer-actions--spaced">
            <button type="button" className="google-btn" onClick={() => setIsExploringAdding(false)}>إلغاء</button>
            <BusyButton type="button" className="google-btn google-btn--filled" onClick={handleExplorationSaveStudent} busy={expSaving}>
              حفظ
            </BusyButton>
          </div>
        </div>
      </FormModal>

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={viewingExplorationOf ? `بيانات النموذج — ${viewingExplorationOf.displayName || ''}` : 'بيانات النموذج'}
        record={viewingExplorationOf}
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={
          can(PERMISSION_PAGE_IDS.students_management, 'student_management_edit') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)
        }
        fallbackName={viewingExplorationOf?.displayName}
        onSave={async ({ fieldValues, derivedName, selectedType, controller }) => {
          const target = viewingExplorationOf;
          if (!target) return;
          const api = FirestoreApi.Api;
          const data = {
            explorationTypeId: selectedType?.id || target.explorationTypeId || '',
            explorationTypeName: selectedType?.name || target.explorationTypeName || '',
            explorationFieldValues: fieldValues,
          };
          const newDisplay = derivedName || target.displayName || '';
          if (newDisplay) data.displayName = newDisplay;
          const newPhone = controller.getValueByType('tel').trim();
          if (newPhone) data.phoneNumber = newPhone;
          const newEmail = controller.getValueByType('email').trim().toLowerCase();
          if (newEmail) data.email = newEmail;
          const newPhoto = controller.getValueByType('url').trim();
          if (newPhoto) data.photoURL = newPhoto;
          await api.updateData({
            docRef: api.getUserDoc(target.id),
            data,
            userData: actorUser || {},
          });
          await fetchStudentsData();
        }}
      />
    </div>
  );
};

export default StudentManagementPage;

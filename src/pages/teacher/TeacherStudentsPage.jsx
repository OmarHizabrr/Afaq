import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, Plus, Edit2, Trash2, UserPlus, Eye, Compass } from "lucide-react";
import FirestoreApi from "../../services/firestoreApi";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import FormModal from "../../components/FormModal";
import AppSelect from "../../components/AppSelect";
import BusyButton from "../../components/BusyButton";
import ExplorationFormSection from "../../components/ExplorationFormSection";
import ExplorationBadge from "../../components/ExplorationBadge";
import ExplorationDataModal from "../../components/ExplorationDataModal";
import TeacherStudentCard from "../../components/TeacherStudentCard";
import { useExplorationForm } from "../../hooks/useExplorationForm";
import usePermissions from "../../context/usePermissions";
import { EXPLORATION_BRIDGE_ACTION_IDS } from "../../config/permissionRegistry";
import useAppTranslation from '../../hooks/useAppTranslation';

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : "");

const TeacherStudentsPage = ({ user }) => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { explorationBridgeAllowed } = usePermissions();
  const actorId = user?.uid || user?.id;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [activeSchoolId, setActiveSchoolId] = useState("");
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [schoolReady, setSchoolReady] = useState(false);
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);
  const expForm = useExplorationForm(isExploringAdding, user, null, 'teacher_students');

  const reloadStudents = useCallback(async () => {
    if (!activeSchoolId) return;
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const ref = api.getSchoolStudentsCollection(activeSchoolId);
      const docs = await api.getDocuments(ref);
      setStudents(docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setError("");
    } catch (err) {
      console.error(err);
      setError(t('pages.TeacherStudentsPage.حدث_خطأ_أثناء_جلب_الدارسين', 'حدث خطأ أثناء جلب الدارسين'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = FirestoreApi.Api;
        const ids = await api.listUserSchoolIdsFromMirrors(user);
        if (cancelled) return;
        if (!ids.length) {
          setSchoolOptions([]);
          setActiveSchoolId("");
          setError(t('pages.TeacherStudentsPage.حسابك_غير_مرتبط_بأي_مدرسة_يرجى_مراجعة_الإدارة', 'حسابك غير مرتبط بأي مدرسة. يرجى مراجعة الإدارة.'));
          setStudents([]);
          setSchoolReady(true);
          return;
        }
        const allSchools = await api.getCollectionGroupDocuments("schools");
        if (cancelled) return;
        const options = ids.map((id) => {
          const doc = allSchools.find((s) => s.id === id);
          const name = (doc?.data()?.name || "").trim() || id;
          return { id, name };
        });
        setSchoolOptions(options);
        const key = teacherSchoolStorageKey(actorId);
        let sid = (key && localStorage.getItem(key)) || "";
        if (!sid || !ids.includes(sid)) sid = ids[0];
        setActiveSchoolId(sid);
        setError("");
      } catch (err) {
        console.error(err);
        setError(t('pages.TeacherStudentsPage.حدث_خطأ_أثناء_تحميل_بيانات_المدرسة', 'حدث خطأ أثناء تحميل بيانات المدرسة'));
      } finally {
        if (!cancelled) setSchoolReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, actorId]);

  useEffect(() => {
    if (!activeSchoolId || !schoolReady) return;
    reloadStudents();
  }, [activeSchoolId, schoolReady, reloadStudents]);

  const handleActiveSchoolChange = (e) => {
    const sid = e.target.value;
    setActiveSchoolId(sid);
    const key = teacherSchoolStorageKey(actorId);
    if (key && sid) localStorage.setItem(key, sid);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !activeSchoolId || !actorId) return;

    try {
      setLoading(true);
      const api = FirestoreApi.Api;

      const studentData = {
        studentName: studentName.trim(),
        age: parseInt(studentAge) || 0,
        schoolId: activeSchoolId,
        teacherId: actorId,
      };

      if (isEditing) {
        const docRef = api.getSchoolStudentDoc(activeSchoolId, isEditing.id);
        await api.updateData({ docRef, data: studentData });

        const link1 = api.getGroupMemberDoc(activeSchoolId, isEditing.id);
        const link2 = api.getUserMembershipMirrorDoc(
          isEditing.id,
          activeSchoolId,
        );
        await Promise.all([
          api.setData({
            docRef: link1,
            data: { ...studentData, type: "student" },
            Overwrite: false,
          }),
          api.setData({
            docRef: link2,
            data: {
              schoolId: activeSchoolId,
              studentName: studentData.studentName,
            },
            Overwrite: false,
          }),
        ]);
      } else {
        const docId = api.getNewId("students");
        const docRef = api.getSchoolStudentDoc(activeSchoolId, docId);

        const link1 = api.getGroupMemberDoc(activeSchoolId, docId);
        const link2 = api.getUserMembershipMirrorDoc(docId, activeSchoolId);

        await Promise.all([
          api.setData({ docRef, data: studentData }),
          api.setData({
            docRef: link1,
            data: { ...studentData, id: docId, type: "student" },
          }),
          api.setData({
            docRef: link2,
            data: {
              schoolId: activeSchoolId,
              studentName: studentData.studentName,
            },
          }),
        ]);
      }

      setStudentName("");
      setStudentAge("");
      setIsAdding(false);
      setIsEditing(null);
      setSuccess(
        isEditing ? t('pages.TeacherStudentsPage.تم_تحديث_بيانات_الدارس_بنجاح', 'تم تحديث بيانات الدارس بنجاح.') : t('pages.TeacherStudentsPage.تمت_إضافة_الدارس_بنجاح', 'تمت إضافة الدارس بنجاح.'),
      );
      setError("");
      reloadStudents();
    } catch (err) {
      console.error(err);
      setError(t('pages.SchoolsPage.حدث_خطأ_أثناء_الحفظ', 'حدث خطأ أثناء الحفظ'));
      setLoading(false);
    }
  };

  const handleExplorationAdd = async (e) => {
    e.preventDefault();
    if (!activeSchoolId || !actorId || expSaving) return;
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join(t('components.ExplorationDataModal.،', '، '))}`);
      return;
    }
    const studentName = expForm.deriveDisplayName('');
    if (!studentName) {
      setError(t('pages.TeacherStudentsPage.لا_يمكن_استخراج_اسم_الدارس_من_حقول_النموذج_أضف_حقلاً_نصياً_ي', 'لا يمكن استخراج اسم الدارس من حقول النموذج. أضف حقلاً نصياً يحوي اسم.'));
      return;
    }
    const ageRaw = expForm.getValueByType('number');
    const age = parseInt(ageRaw, 10) || 0;

    try {
      setExpSaving(true);
      const api = FirestoreApi.Api;
      const docId = api.getNewId("students");
      const studentData = {
        studentName,
        age,
        schoolId: activeSchoolId,
        teacherId: actorId,
        explorationTypeId: expForm.selectedType?.id || "",
        explorationTypeName: expForm.selectedType?.name || "",
        explorationFieldValues: expForm.sanitize(),
      };

      await Promise.all([
        api.setData({ docRef: api.getSchoolStudentDoc(activeSchoolId, docId), data: studentData, userData: user || {} }),
        api.setData({
          docRef: api.getGroupMemberDoc(activeSchoolId, docId),
          data: { ...studentData, id: docId, type: "student" },
          userData: user || {},
        }),
        api.setData({
          docRef: api.getUserMembershipMirrorDoc(docId, activeSchoolId),
          data: { schoolId: activeSchoolId, studentName: studentData.studentName },
          userData: user || {},
        }),
      ]);

      setIsExploringAdding(false);
      expForm.reset();
      setSuccess(t('pages.TeacherStudentsPage.تمت_إضافة_الدارس_من_نموذج_الاستكشاف_بنجاح', 'تمت إضافة الدارس من نموذج الاستكشاف بنجاح.'));
      setError("");
      reloadStudents();
    } catch (err) {
      console.error(err);
      setError(t('pages.SchoolsPage.حدث_خطأ_أثناء_الحفظ', 'حدث خطأ أثناء الحفظ'));
    } finally {
      setExpSaving(false);
    }
  };

  const handleEditClick = (student) => {
    setIsEditing(student);
    setIsAdding(true);
    setStudentName(student.studentName);
    setStudentAge(student.age || "");
  };

  useEffect(() => {
    const editStudent = location.state?.editStudent;
    if (!editStudent || !schoolReady) return;
    setIsEditing(editStudent);
    setIsAdding(true);
    setStudentName(editStudent.studentName || '');
    setStudentAge(editStudent.age || '');
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state?.editStudent, schoolReady, location.pathname, navigate]);

  const handleDelete = async (id) => {
    if (!activeSchoolId) return;
    try {
      const api = FirestoreApi.Api;

      // Bilateral Deletion
      const docRef = api.getSchoolStudentDoc(activeSchoolId, id);
      const link1 = api.getGroupMemberDoc(activeSchoolId, id);
      const link2 = api.getUserMembershipMirrorDoc(id, activeSchoolId);

      await Promise.all([
        api.deleteData(docRef),
        api.deleteData(link1),
        api.deleteData(link2),
      ]);

      setSuccess(t('pages.TeacherStudentsPage.تم_حذف_الدارس_بنجاح', 'تم حذف الدارس بنجاح.'));
      setError("");
      reloadStudents();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.لا_يمكن_الحذف_في_الوقت_الحالي', 'لا يمكن الحذف في الوقت الحالي.'));
    }
  };

  if (!schoolReady) {
    return (
      <div className="loading-spinner page-loading-lg"></div>
    );
  }

  if (!activeSchoolId) {
    return (
      <div className="surface-card portal-alert-card">
        <h2 className="portal-alert-card__title">{t('pages.TeacherStudentsPage.تنبيه_إداري', 'تنبيه إداري')}</h2>
        <p className="portal-alert-card__text">
          حساب المعلم الخاص بك غير مرتبط بأي مدرسة في النظام (لا في الملف ولا في
          مرآة Mygroup).
        </p>
        <p className="portal-alert-card__text">
          يرجى التواصل مع مدير النظام أو مشرف المنطقة لتعيين مدرسة لك.
        </p>
      </div>
    );
  }

  return (
    <div className="teacher-students-page portal-page">
      <PageHeader
        icon={Users}
        iconColor="var(--success-color)"
        title={t('pages.TeacherStudentsPage.إدارة_الحلقات_والدارسين', 'إدارة الحلقات والدارسين')}
        subtitle={t('pages.TeacherStudentsPage.قائمة_الدارسين_المسجلين_لديك', 'قائمة الدارسين المسجلين لديك')}
      >
        <>
          <button
            type="button"
            className="google-btn google-btn--filled google-btn--toolbar google-btn--success"
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
              setStudentName("");
              setStudentAge("");
            }}
          >
            <UserPlus size={18} />
            <span className="portal-toolbar__long">{t('pages.TeacherStudentsPage.إضافة_دارس_جديد', 'إضافة دارس جديد')}</span>
            <span className="portal-toolbar__short">{t('components.ReportTextList.إضافة', 'إضافة')}</span>
          </button>
          {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
            <button
              type="button"
              className="google-btn google-btn--toolbar"
              onClick={() => setIsExploringAdding(true)}
            >
              <Compass size={18} />
              <span className="portal-toolbar__long">{t('pages.CurriculumPage.إضافة_من_الاستكشاف', 'إضافة من الاستكشاف')}</span>
              <span className="portal-toolbar__short">{t('utils.explorationTargetPages.استكشاف', 'استكشاف')}</span>
            </button>
          )}
        </>
      </PageHeader>

      {error && (
        <div className="app-alert app-alert--error portal-page-alert">
          {error}
        </div>
      )}
      {success && (
        <div className="app-alert app-alert--success portal-page-alert">
          {success}
        </div>
      )}

      {schoolOptions.length > 1 && activeSchoolId && (
        <div className="surface-card portal-filter-card teacher-students-page__filter">
          <label className="app-label">{t('components.DailyPrepEditor.المدرسة', 'المدرسة')}</label>
          <AppSelect
            className="app-select"
            value={activeSchoolId}
            onChange={handleActiveSchoolChange}
          >
            {schoolOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </AppSelect>
        </div>
      )}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding}
        title={isEditing ? t('pages.TeacherStudentsPage.تعديل_بيانات_الدارس', 'تعديل بيانات الدارس') : t('pages.TeacherStudentsPage.إضافة_دارس_جديد', 'إضافة دارس جديد')}
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd}>
          <label className="app-label">{t('pages.TeacherStudentsPage.اسم_الدارس', 'اسم الدارس')}</label>
          <input
            type="text"
            placeholder={t('pages.TeacherStudentsPage.اسم_الدارس_الرباعي', 'اسم الدارس الرباعي')}
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
            className="app-input portal-form-field--spaced"
          />
          <label className="app-label">{t('pages.TeacherStudentsPage.السن', 'السن')}</label>
          <input
            type="number"
            placeholder={t('pages.TeacherStudentsPage.السن', 'السن')}
            value={studentAge}
            onChange={(e) => setStudentAge(e.target.value)}
            className="app-input portal-form-field--spaced-lg"
          />
          <div className="portal-form-footer portal-form-footer--modal">
            <button
              type="button"
              className="google-btn google-btn--inline"
              onClick={() => setIsAdding(false)}
            >
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton
              type="submit"
              busy={loading}
              className="google-btn google-btn--filled google-btn--inline google-btn--success"
            >
              {isEditing ? t('pages.GovernoratesPage.تحديث', 'تحديث') : t('components.MessengerPanel.حفظ', 'حفظ')}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        title={t('pages.TeacherStudentsPage.إضافة_دارس_من_نموذج_الاستكشاف', 'إضافة دارس من نموذج الاستكشاف')}
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd}>
          <ExplorationFormSection
            controller={expForm}
            actorUser={user}
            storageUserId={actorId}
            heading={t('components.ExplorationDataModal.حقول_نموذج_الاستكشاف', 'حقول نموذج الاستكشاف')}
            currentPageId="teacher_students"
          />
          <div className="portal-form-footer portal-form-footer--modal">
            <button type="button" className="google-btn google-btn--inline" onClick={() => setIsExploringAdding(false)}>
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton
              type="submit"
              busy={expSaving}
              className="google-btn google-btn--filled google-btn--inline google-btn--success"
            >
              {t('components.MessengerPanel.حفظ', 'حفظ')}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* List */}
      {loading && !isAdding ? (
        <div className="loading-spinner page-loading"></div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          لم تقم بإضافة أي دارس حتى الآن. ابدأ بإضافة طلاب حلقتك.
        </div>
      ) : (
        <>
          <div className="surface-card portal-table-wrap teacher-students-desktop-only">
            <div className="md-table-scroll">
              <table className="md-table portal-table">
                <thead>
                  <tr>
                    <th>{t('pages.VillageDetailsPage.الاسم', 'الاسم')}</th>
                    <th className="portal-table__col-narrow">{t('pages.TeacherStudentsPage.السن', 'السن')}</th>
                    <th className="portal-table__col-actions">{t('pages.TeacherStudentsPage.إجراءات', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="portal-table__name-cell">
                        <div className="teacher-student-avatar">
                          {student.studentName.charAt(0)}
                        </div>
                        <span>{student.studentName}</span>
                        {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                          <ExplorationBadge
                            record={student}
                            onClick={() => setViewingExplorationOf(student)}
                          />
                        )}
                      </td>
                      <td className="portal-table__cell-pad">{student.age || "-"}</td>
                      <td className="portal-table__cell-actions">
                        <button
                          className="icon-btn"
                          onClick={() =>
                            navigate(`/teacher/students/${student.id}`)
                          }
                          title={t('components.RecipientUserCard.عرض_الملف_الشخصي', 'عرض الملف الشخصي')}
                        >
                          <Eye size={18} color="var(--accent-color)" />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleEditClick(student)}
                          title={t('components.ExplorationListCard.تعديل', 'تعديل')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() =>
                            setPendingDelete({
                              id: student.id,
                              name: student.studentName,
                            })
                          }
                          title={t('components.ExplorationListCard.حذف', 'حذف')}
                        >
                          <Trash2 size={18} color="var(--danger-color)" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="teacher-students-mobile-only">
            {students.map((student) => (
              <TeacherStudentCard
                key={student.id}
                student={student}
                showExplorationBadge={explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view)}
                onView={(id) => navigate(`/teacher/students/${id}`)}
                onEdit={handleEditClick}
                onDelete={(s) => setPendingDelete({ id: s.id, name: s.studentName })}
                onExplorationView={setViewingExplorationOf}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('pages.TeacherStudentDetailPage.تأكيد_حذف_الدارس', 'تأكيد حذف الدارس')}
        message={`سيتم حذف الدارس "${pendingDelete?.name || ""}" من السجل.`}
        confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id);
        }}
      />

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={viewingExplorationOf ? `بيانات النموذج — ${viewingExplorationOf.studentName || ''}` : t('pages.CurriculumPage.بيانات_النموذج', 'بيانات النموذج')}
        record={viewingExplorationOf}
        actorUser={user}
        storageUserId={actorId}
        canEdit={explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)}
        fallbackName={viewingExplorationOf?.studentName}
        onSave={async ({ fieldValues, derivedName, selectedType, controller }) => {
          const target = viewingExplorationOf;
          if (!target || !activeSchoolId) return;
          const api = FirestoreApi.Api;
          const studentName = derivedName || target.studentName || '';
          const ageRaw = controller.getValueByType('number');
          const data = {
            studentName,
            age: ageRaw === '' ? (target.age || 0) : (parseInt(ageRaw, 10) || 0),
            schoolId: activeSchoolId,
            teacherId: actorId,
            explorationTypeId: selectedType?.id || target.explorationTypeId || '',
            explorationTypeName: selectedType?.name || target.explorationTypeName || '',
            explorationFieldValues: fieldValues,
          };
          await Promise.all([
            api.updateData({
              docRef: api.getSchoolStudentDoc(activeSchoolId, target.id),
              data,
              userData: user || {},
            }),
            api.setData({
              docRef: api.getGroupMemberDoc(activeSchoolId, target.id),
              data: { ...data, id: target.id, type: 'student' },
              userData: user || {},
            }),
            api.setData({
              docRef: api.getUserMembershipMirrorDoc(target.id, activeSchoolId),
              data: { schoolId: activeSchoolId, studentName },
              userData: user || {},
            }),
          ]);
          setSuccess(t('pages.TeacherStudentsPage.تم_تحديث_بيانات_نموذج_الدارس', 'تم تحديث بيانات نموذج الدارس.'));
          setError('');
          reloadStudents();
        }}
      />
    </div>
  );
};

export default TeacherStudentsPage;

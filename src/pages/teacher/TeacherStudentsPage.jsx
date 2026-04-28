import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Edit2, Trash2, UserPlus, Eye } from "lucide-react";
import FirestoreApi from "../../services/firestoreApi";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import FormModal from "../../components/FormModal";
import AppSelect from "../../components/AppSelect";
import BusyButton from "../../components/BusyButton";

const teacherSchoolStorageKey = (uid) => (uid ? `afaq_teacher_school_${uid}` : "");

const TeacherStudentsPage = ({ user }) => {
  const navigate = useNavigate();
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
      setError("حدث خطأ أثناء جلب الدارسين");
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
          setError("حسابك غير مرتبط بأي مدرسة. يرجى مراجعة الإدارة.");
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
        setError("حدث خطأ أثناء تحميل بيانات المدرسة");
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
        isEditing ? "تم تحديث بيانات الدارس بنجاح." : "تمت إضافة الدارس بنجاح.",
      );
      setError("");
      reloadStudents();
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء الحفظ");
      setLoading(false);
    }
  };
  const handleEditClick = (student) => {
    setIsEditing(student);
    setIsAdding(true);
    setStudentName(student.studentName);
    setStudentAge(student.age || "");
  };

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

      setSuccess("تم حذف الدارس بنجاح.");
      setError("");
      reloadStudents();
    } catch (err) {
      console.error(err);
      setError("لا يمكن الحذف في الوقت الحالي.");
    }
  };

  if (!schoolReady) {
    return (
      <div className="loading-spinner" style={{ margin: "4rem auto" }}></div>
    );
  }

  if (!activeSchoolId) {
    return (
      <div
        className="surface-card"
        style={{ padding: "2rem", textAlign: "center", borderRadius: "12px" }}
      >
        <h2 style={{ color: "var(--danger-color)" }}>تنبيه إداري</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          حساب المعلم الخاص بك غير مرتبط بأي مدرسة في النظام (لا في الملف ولا في
          مرآة Mygroup).
        </p>
        <p style={{ color: "var(--text-secondary)" }}>
          يرجى التواصل مع مدير النظام أو مشرف المنطقة لتعيين مدرسة لك.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        iconColor="var(--success-color)"
        title="إدارة الحلقات والدارسين"
        subtitle="قائمة الدارسين المسجلين لديك"
      >
        <button
          type="button"
          className="google-btn google-btn--filled google-btn--toolbar"
          style={{ background: "var(--success-color)", color: "#fff" }}
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
            setStudentName("");
            setStudentAge("");
          }}
        >
          <UserPlus size={18} />
          <span>إضافة دارس جديد</span>
        </button>
      </PageHeader>

      {error && (
        <div
          className="app-alert app-alert--error"
          style={{ marginBottom: "1rem" }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="app-alert app-alert--success"
          style={{ marginBottom: "1rem" }}
        >
          {success}
        </div>
      )}

      {schoolOptions.length > 1 && activeSchoolId && (
        <div className="surface-card" style={{ padding: "1rem 1.25rem", marginBottom: "1rem" }}>
          <label className="app-label">المدرسة</label>
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
        title={isEditing ? "تعديل بيانات الدارس" : "إضافة دارس جديد"}
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd}>
          <label className="app-label">اسم الدارس</label>
          <input
            type="text"
            placeholder="اسم الدارس الرباعي"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
            className="app-input"
            style={{ marginBottom: "0.75rem" }}
          />
          <label className="app-label">السن</label>
          <input
            type="number"
            placeholder="السن"
            value={studentAge}
            onChange={(e) => setStudentAge(e.target.value)}
            className="app-input"
            style={{ marginBottom: "1rem" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              className="google-btn"
              style={{ width: "auto", marginTop: 0 }}
              onClick={() => setIsAdding(false)}
            >
              إلغاء
            </button>
            <BusyButton
              type="submit"
              busy={loading}
              className="google-btn google-btn--filled"
              style={{
                width: "auto",
                marginTop: 0,
                background: "var(--success-color)",
                color: "#fff",
              }}
            >
              {isEditing ? "تحديث" : "حفظ"}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: "2rem auto" }}></div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          لم تقم بإضافة أي دارس حتى الآن. ابدأ بإضافة طلاب حلقتك.
        </div>
      ) : (
        <div
          className="surface-card"
          style={{ borderRadius: "12px", overflow: "hidden" }}
        >
          <div className="md-table-scroll">
            <table className="md-table" style={{ minWidth: "unset" }}>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th style={{ width: "100px" }}>السن</th>
                  <th style={{ width: "120px", textAlign: "center" }}>
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td
                      style={{
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "var(--success-color)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {student.studentName.charAt(0)}
                      </div>
                      {student.studentName}
                    </td>
                    <td style={{ padding: "16px" }}>{student.age || "-"}</td>
                    <td
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="icon-btn"
                        onClick={() =>
                          navigate(`/teacher/students/${student.id}`)
                        }
                        title="عرض الملف الشخصي"
                        style={{ display: "inline-flex" }}
                      >
                        <Eye size={18} color="var(--accent-color)" />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => handleEditClick(student)}
                        title="تعديل"
                        style={{ display: "inline-flex" }}
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
                        title="حذف"
                        style={{ display: "inline-flex" }}
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
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد حذف الدارس"
        message={`سيتم حذف الدارس "${pendingDelete?.name || ""}" من السجل.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id);
        }}
      />
    </div>
  );
};

export default TeacherStudentsPage;

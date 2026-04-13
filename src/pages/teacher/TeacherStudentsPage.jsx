import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, UserPlus, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';

const TeacherStudentsPage = ({ user }) => {
  const navigate = useNavigate();
  const actorId = user?.uid || user?.id;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [activeSchoolId, setActiveSchoolId] = useState('');
  const [schoolReady, setSchoolReady] = useState(false);

  const loadSchoolAndStudents = async () => {
    setLoading(true);
    setSchoolReady(false);
    try {
      const api = FirestoreApi.Api;
      const sid = await api.resolveUserSchoolId(user);
      setActiveSchoolId(sid);
      setSchoolReady(true);
      if (!sid) {
        setError('حسابك غير مرتبط بأي مدرسة. يرجى مراجعة الإدارة.');
        setStudents([]);
        return;
      }
      setError('');
      const ref = api.getSubCollection('students', sid, 'students');
      const docs = await api.getDocuments(ref);
      setStudents(docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب الدارسين');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchoolAndStudents();
  }, [user]);

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
        teacherId: actorId
      };

      if (isEditing) {
        const docRef = api.getSubDocument('students', activeSchoolId, 'students', isEditing.id);
        await api.updateData({ docRef, data: studentData });
        
        const link1 = api.getGroupMemberDoc(activeSchoolId, isEditing.id);
        const link2 = api.getUserMembershipMirrorDoc(isEditing.id, activeSchoolId);
        await Promise.all([
          api.setData({ docRef: link1, data: { ...studentData, type: 'student' }, Overwrite: false }),
          api.setData({ docRef: link2, data: { schoolId: activeSchoolId, studentName: studentData.studentName }, Overwrite: false })
        ]);
      } else {
        const docId = api.getNewId('students');
        const docRef = api.getSubDocument('students', activeSchoolId, 'students', docId);
        
        const link1 = api.getGroupMemberDoc(activeSchoolId, docId);
        const link2 = api.getUserMembershipMirrorDoc(docId, activeSchoolId);
        
        await Promise.all([
          api.setData({ docRef, data: studentData }),
          api.setData({ docRef: link1, data: { ...studentData, id: docId, type: 'student' } }),
          api.setData({ docRef: link2, data: { schoolId: activeSchoolId, studentName: studentData.studentName } })
        ]);
      }

      setStudentName('');
      setStudentAge('');
      setIsAdding(false);
      setIsEditing(null);
      setSuccess(isEditing ? 'تم تحديث بيانات الدارس بنجاح.' : 'تمت إضافة الدارس بنجاح.');
      setError('');
      loadSchoolAndStudents();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الحفظ');
      setLoading(false);
    }
  };
  const handleEditClick = (student) => {
    setIsEditing(student);
    setIsAdding(true);
    setStudentName(student.studentName);
    setStudentAge(student.age || '');
  };

  const handleDelete = async (id, name) => {
    if (!activeSchoolId) return;
    try {
      const api = FirestoreApi.Api;
      
      // Bilateral Deletion
      const docRef = api.getSubDocument('students', activeSchoolId, 'students', id);
      const link1 = api.getGroupMemberDoc(activeSchoolId, id);
      const link2 = api.getUserMembershipMirrorDoc(id, activeSchoolId);
      
      await Promise.all([
        api.deleteData(docRef),
        api.deleteData(link1),
        api.deleteData(link2)
      ]);
      
      setSuccess('تم حذف الدارس بنجاح.');
      setError('');
      loadSchoolAndStudents();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  if (!schoolReady) {
    return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
  }

  if (!activeSchoolId) {
    return (
      <div className="surface-card" style={{ padding: '2rem', textAlign: 'center', borderRadius: '12px' }}>
        <h2 style={{ color: 'var(--danger-color)' }}>تنبيه إداري</h2>
        <p style={{ color: 'var(--text-secondary)' }}>حساب المعلم الخاص بك غير مرتبط بأي مدرسة في النظام (لا في الملف ولا في مرآة Mygroup).</p>
        <p style={{ color: 'var(--text-secondary)' }}>يرجى التواصل مع مدير النظام أو مشرف المنطقة لتعيين مدرسة لك.</p>
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
        <button type="button" className="google-btn google-btn--filled google-btn--toolbar" style={{ background: 'var(--success-color)', color: '#fff' }} onClick={() => setIsAdding(!isAdding)}>
          <UserPlus size={18} />
          <span>إضافة دارس جديد</span>
        </button>
      </PageHeader>

      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="app-alert app-alert--success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="surface-card" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input 
            type="text" 
            placeholder="اسم الدارس الرباعي"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
            className="app-input"
            style={{ flex: 2, minWidth: '200px' }}
          />
          <input 
            type="number" 
            placeholder="السن"
            value={studentAge}
            onChange={(e) => setStudentAge(e.target.value)}
            className="app-input"
            style={{ flex: 1, minWidth: '100px' }}
          />
          <button type="submit" className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--success-color)', color: '#fff' }}>
            حفظ
          </button>
          <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '12px' }}>
            إلغاء
          </button>
        </form>
      )}

      {/* List */}
      {loading && !isAdding ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          لم تقم بإضافة أي دارس حتى الآن. ابدأ بإضافة طلاب حلقتك.
        </div>
      ) : (
        <div className="surface-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="md-table-scroll">
          <table className="md-table" style={{ minWidth: 'unset' }}>
            <thead>
              <tr>
                <th>الاسم</th>
                <th style={{ width: '100px' }}>السن</th>
                <th style={{ width: '120px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {student.studentName.charAt(0)}
                    </div>
                    {student.studentName}
                  </td>
                  <td style={{ padding: '16px' }}>{student.age || '-'}</td>
                  <td style={{ padding: '16px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button className="icon-btn" onClick={() => navigate(`/teacher/students/${student.id}`)} title="عرض الملف الشخصي" style={{ display: 'inline-flex' }}>
                      <Eye size={18} color="var(--accent-color)" />
                    </button>
                    <button className="icon-btn" onClick={() => handleEditClick(student)} title="تعديل" style={{ display: 'inline-flex' }}>
                      <Edit2 size={18} />
                    </button>
                    <button className="icon-btn" onClick={() => setPendingDelete({ id: student.id, name: student.studentName })} title="حذف" style={{ display: 'inline-flex' }}>
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
        message={`سيتم حذف الدارس "${pendingDelete?.name || ''}" من السجل.`}
        confirmLabel="حذف نهائي"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id, item.name);
        }}
      />
    </div>
  );
};

export default TeacherStudentsPage;

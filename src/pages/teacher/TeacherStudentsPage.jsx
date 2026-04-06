import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const TeacherStudentsPage = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');

  const fetchStudents = async () => {
    if (!user?.schoolId) {
      setError('حسابك غير مرتبط بأي مدرسة. يرجى مراجعة الإدارة.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      
      // Fetch students from the specific school subcollection
      const ref = api.getSubCollection('students', user.schoolId, 'students');
      const docs = await api.getDocuments(ref);
      const data = docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);

    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب الدارسين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !user?.schoolId) return;

    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      const docId = api.getNewId('students');
      const docRef = api.getSubDocument('students', user.schoolId, 'students', docId);
      
      await api.setData({
        docRef,
        data: {
          studentName: studentName.trim(),
          age: parseInt(studentAge) || 0,
          schoolId: user.schoolId,
          teacherId: user.id
        }
      });

      setStudentName('');
      setStudentAge('');
      setIsAdding(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء إضافة الدارس');
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف الدارس "${name}"؟`)) return;
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getSubDocument('students', user.schoolId, 'students', id);
      await api.deleteData(docRef);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert('لا يمكن الحذف في الوقت الحالي');
    }
  };

  if (!user?.schoolId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--panel-color)', borderRadius: '12px' }}>
        <h2 style={{ color: 'var(--danger-color)' }}>تنبيه إداري</h2>
        <p style={{ color: 'var(--text-secondary)' }}>حساب المعلم الخاص بك غير مرتبط بأي مدرسة في النظام.</p>
        <p style={{ color: 'var(--text-secondary)' }}>يرجى التواصل مع مدير النظام أو مشرف المنطقة لتعيين مدرسة لك.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="var(--success-color)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>إدارة الحلقات والدارسين</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>قائمة الدارسين المسجلين لديك</p>
          </div>
        </div>
        <button 
          className="google-btn" 
          onClick={() => setIsAdding(!isAdding)}
          style={{ width: 'auto', marginTop: 0, padding: '10px 16px', background: 'var(--success-color)', color: '#fff' }}
        >
          <UserPlus size={18} />
          <span>إضافة دارس جديد</span>
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} style={{
          background: 'var(--panel-color)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: `1px solid var(--border-color)`,
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: 'var(--shadow)'
        }}>
          <input 
            type="text" 
            placeholder="اسم الدارس الرباعي"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
            style={{
              flex: 2,
              minWidth: '200px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
          <input 
            type="number" 
            placeholder="السن"
            value={studentAge}
            onChange={(e) => setStudentAge(e.target.value)}
            style={{
              flex: 1,
              minWidth: '100px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
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
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          لم تقم بإضافة أي دارس حتى الآن. ابدأ بإضافة طلاب حلقتك.
        </div>
      ) : (
        <div style={{ background: 'var(--panel-color)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>الاسم</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', width: '100px' }}>السن</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', width: '100px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={student.id} style={{ borderBottom: idx !== students.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'all 0.2s' }}>
                  <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {student.studentName.charAt(0)}
                    </div>
                    {student.studentName}
                  </td>
                  <td style={{ padding: '16px' }}>{student.age || '-'}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button className="icon-btn" onClick={() => handleDelete(student.id, student.studentName)} title="حذف" style={{ display: 'inline-flex' }}>
                      <Trash2 size={18} color="var(--danger-color)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherStudentsPage;

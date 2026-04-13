import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, School, Edit2, X, Eye, Info } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const ROLE_LABELS = {
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام (عربي)',
  supervisor_local: 'مشرف منطقة (محلي)',
  teacher: 'معلم مدرسة',
  student: 'طالب / دارس',
  unassigned: 'صلاحية معلقة'
};

const ROLE_COLORS = {
  admin: 'var(--danger-color)',
  supervisor_arab: 'var(--accent-color)',
  supervisor_local: '#3b82f6',
  teacher: 'var(--success-color)',
  student: '#f59e0b',
  unassigned: 'var(--text-secondary)'
};

const KEEP_SUPERVISOR = '__keep_supervisor__';

const UsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [schools, setSchools] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  const [selectedRole, setSelectedRole] = useState('unassigned');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;

      const [userDocs, regDocs, schDocs] = await Promise.all([
        api.getDocuments(api.getCollection('users')),
        api.getCollectionGroupDocuments('regions'),
        api.getCollectionGroupDocuments('schools')
      ]);

      setUsers(userDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRegions(regDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSchools(schDocs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = async (user) => {
    setEditingUser(user);
    setError('');
    setSelectedSchoolId(user.schoolId || '');
    setSelectedRegionId('');

    if (user.role?.includes('supervisor')) {
      setSelectedRole(KEEP_SUPERVISOR);
      const api = FirestoreApi.Api;
      const assignmentDoc = await api.getData(api.getDocument('supervisor_assignments', user.id));
      if (assignmentDoc?.regionId) {
        setSelectedRegionId(assignmentDoc.regionId);
      }
    } else {
      setSelectedRole(user.role || 'unassigned');
    }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    if (selectedRole === KEEP_SUPERVISOR) {
      setEditingUser(null);
      setError('');
      return;
    }

    if (selectedRole === 'teacher' && !selectedSchoolId) {
      setError('يجب اختيار مدرسة للمعلم');
      return;
    }
    if (selectedRole === 'student' && !selectedSchoolId) {
      setError('يجب اختيار مدرسة للطالب');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;

      await api.clearUserMembershipMirrors(editingUser.id);

      const becomesSupervisor =
        selectedRole === 'supervisor_local' || selectedRole === 'supervisor_arab';
      if (!becomesSupervisor) {
        try {
          await api.deleteData(api.getDocument('supervisor_assignments', editingUser.id));
        } catch {
          /* المستند غير موجود */
        }
      }

      const userDataPatch = {
        role: selectedRole,
        schoolId: selectedRole === 'teacher' || selectedRole === 'student' ? selectedSchoolId : ''
      };

      await api.updateData({
        docRef: api.getDocument('users', editingUser.id),
        data: userDataPatch
      });

      if (selectedRole === 'teacher' || selectedRole === 'student') {
        const groupId = selectedSchoolId;
        if (groupId) {
          const link1 = api.getGroupMemberDoc(groupId, editingUser.id);
          const link2 = api.getUserMembershipMirrorDoc(editingUser.id, groupId);

          await Promise.all([
            api.setData({
              docRef: link1,
              data: {
                userId: editingUser.id,
                role: selectedRole,
                joinedAt: new Date().toISOString(),
                type: selectedRole === 'student' ? 'student' : 'staff'
              }
            }),
            api.setData({
              docRef: link2,
              data: { schoolId: groupId, joinedAt: new Date().toISOString() }
            })
          ]);
        }
      }

      setEditingUser(null);
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء المزامنة الثنائية');
    } finally {
      setLoading(false);
    }
  };

  const regionNameForSupervisor =
    selectedRegionId && regions.find(r => r.id === selectedRegionId)?.name;

  return (
    <div>
      <PageHeader icon={Shield} title="إدارة المستخدمين والصلاحيات" />

      {error && (
        <div
          style={{
            color: 'var(--danger-color)',
            marginBottom: '1rem',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px'
          }}
        >
          {error}
        </div>
      )}

      {loading && !editingUser ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {users.map(user => (
            <div
              key={user.id}
              className="surface-card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <img
                src={user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || '')}
                alt=""
                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user.displayName || 'بدون اسم'}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {user.email}
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: `${ROLE_COLORS[user.role || 'unassigned']}20`,
                    color: ROLE_COLORS[user.role || 'unassigned']
                  }}
                >
                  {ROLE_LABELS[user.role || 'unassigned']}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => navigate(`/users/${user.id}`)}
                  title="عرض الملف الشخصي"
                  style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                >
                  <Eye size={18} color="var(--accent-color)" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => openEditModal(user)}
                  title="تعديل الصلاحيات"
                  style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card modal-card--sm" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>تعديل صلاحيات ({editingUser.displayName})</h2>
              <button type="button" className="icon-btn" onClick={() => setEditingUser(null)}>
                <X size={20} />
              </button>
            </div>

            {editingUser.role?.includes('supervisor') && (
              <div
                className="surface-card"
                style={{
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  border: '1px solid var(--md-primary)',
                  background: 'var(--accent-muted)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6
                }}
              >
                <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} color="var(--md-primary)" />
                  <span>
                    <strong>المشرفون مرتبطون بالمنطقة عبر أعضائها:</strong> الترقية لتصبح مشرفاً على منطقة تتم من{' '}
                    <strong>صفحة تفاصيل المنطقة</strong> (قائمة المناطق)، وليس من هنا. الربط الثنائي في Firestore:
                    <code style={{ display: 'block', marginTop: '8px', fontSize: '0.8rem', direction: 'ltr', textAlign: 'left' }}>
                      members/{'{'}groupId{'}'}/members/{'{'}userId{'}'} ↔ Mygroup/{'{'}userId{'}'}/Mygroup/{'{'}groupId{'}'}
                    </code>
                  </span>
                </p>
                {regionNameForSupervisor && (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    المنطقة المسندة حالياً: <strong>{regionNameForSupervisor}</strong>
                  </p>
                )}
                <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
                  لإلغاء صلاحية الإشراف اختر دوراً آخر أدناه واحفظ.
                </p>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                الرتبة / الصلاحية
              </label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)'
                }}
              >
                {editingUser.role?.includes('supervisor') && (
                  <option value={KEEP_SUPERVISOR}>— الإبقاء كمشرف (بدون تغيير من هنا) —</option>
                )}
                <option value="unassigned">-- غير معين (معلق) --</option>
                <option value="student">طالب / دارس</option>
                <option value="teacher">معلم</option>
                <option value="admin">مدير النظام</option>
              </select>
            </div>

            {(selectedRole === 'student' || selectedRole === 'teacher') && (
              <div
                style={{
                  background: 'var(--bg-color)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--accent-glow)'
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontWeight: 600,
                    color: 'var(--success-color)'
                  }}
                >
                  <School size={18} /> تعيين مدرسة {selectedRole === 'student' ? 'الطالب' : 'المعلم'}
                </label>
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">-- اختر المدرسة --</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="google-btn"
                onClick={handleSaveRole}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', background: 'var(--accent-color)', color: '#fff' }}
              >
                {loading ? 'الرجاء الانتظار...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

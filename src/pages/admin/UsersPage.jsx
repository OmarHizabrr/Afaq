import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Edit2, X, Eye, Info } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { subscribePermissionProfiles } from '../../services/permissionProfilesService';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

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
  const [permissionProfiles, setPermissionProfiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  const [selectedRole, setSelectedRole] = useState('unassigned');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedPermissionProfileId, setSelectedPermissionProfileId] = useState('');
  const { can } = usePermissions();

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;

      const [userDocs, regDocs] = await Promise.all([
        api.getDocuments(api.getUsersCollection()),
        api.getCollectionGroupDocuments('regions')
      ]);

      setUsers(userDocs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRegions(regDocs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  useEffect(() => {
    const unsub = subscribePermissionProfiles(setPermissionProfiles, () => {});
    return () => unsub();
  }, []);

  const openEditModal = async (user) => {
    setEditingUser(user);
    setError('');
    setSelectedRegionId('');

    if (user.role?.includes('supervisor')) {
      setSelectedRole(KEEP_SUPERVISOR);
      const api = FirestoreApi.Api;
      const assignmentDoc = await api.getData(api.getSupervisorAssignmentDoc(user.id));
      if (assignmentDoc?.regionId) {
        setSelectedRegionId(assignmentDoc.regionId);
      }
    } else {
      setSelectedRole(user.role || 'unassigned');
    }
    setSelectedPermissionProfileId(user.permissionProfileId || '');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    if (selectedRole === KEEP_SUPERVISOR) {
      setEditingUser(null);
      setError('');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;

      const becomesSupervisor =
        selectedRole === 'supervisor_local' || selectedRole === 'supervisor_arab';
      if (!becomesSupervisor) {
        try {
          await api.deleteData(api.getSupervisorAssignmentDoc(editingUser.id));
        } catch {
          /* المستند غير موجود */
        }
      }

      const userDataPatch = {
        role: selectedRole,
        permissionProfileId: selectedPermissionProfileId || null,
      };

      await api.updateData({
        docRef: api.getUserDoc(editingUser.id),
        data: userDataPatch
      });

      setEditingUser(null);
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحديث الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const regionNameForSupervisor =
    selectedRegionId && regions.find(r => r.id === selectedRegionId)?.name;

  return (
    <div>
      <PageHeader icon={Shield} title="إدارة المستخدمين والصلاحيات" subtitle="تعديل الرتبة فقط. الربط بالمجموعات يتم من داخل صفحة المجموعة." />

      {error && <div className="app-alert app-alert--error users-alert">{error}</div>}

      {loading && !editingUser ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : (
        <div className="users-grid">
          {users.map(user => (
            <div key={user.id} className="surface-card users-card">
              <img
                src={user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || '')}
                alt=""
                className="users-card__avatar"
              />
              <div className="users-card__body">
                <h3 className="users-card__name">{user.displayName || 'بدون اسم'}</h3>
                <p className="users-card__email">
                  {user.email}
                </p>
                <div className="users-card__chips">
                  <div className="users-card__role-chip" style={{ background: `${ROLE_COLORS[user.role || 'unassigned']}20`, color: ROLE_COLORS[user.role || 'unassigned'] }}>
                    {ROLE_LABELS[user.role || 'unassigned']}
                  </div>
                  {user.accountDisabled && (
                    <span className="users-card__disabled-chip">
                      معطّل
                    </span>
                  )}
                </div>
              </div>
              <div className="users-card__actions">
                {can(PERMISSION_PAGE_IDS.users, 'user_view_profile') && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => navigate(`/users/${user.id}`)}
                    title="عرض الملف الشخصي"
                  >
                    <Eye size={18} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.users, 'user_edit_role') && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openEditModal(user)}
                    title="تعديل الصلاحيات"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card modal-card--sm" onClick={e => e.stopPropagation()}>
            <div className="users-modal__head">
              <h2 className="users-modal__title">تعديل صلاحيات ({editingUser.displayName})</h2>
              <button type="button" className="icon-btn" onClick={() => setEditingUser(null)}>
                <X size={20} />
              </button>
            </div>

            {editingUser.role?.includes('supervisor') && (
              <div className="surface-card users-modal__supervisor-note">
                <p className="users-modal__supervisor-note-text">
                  <Info size={18} className="users-modal__supervisor-note-icon" color="var(--md-primary)" />
                  <span>
                    <strong>المشرفون مرتبطون بالمنطقة عبر أعضائها:</strong> الترقية لتصبح مشرفاً على منطقة تتم من{' '}
                    <strong>صفحة تفاصيل المنطقة</strong> (قائمة المناطق)، وليس من هنا. الربط الثنائي في Firestore:
                    <code className="users-modal__supervisor-note-code">
                      members/{'{'}groupId{'}'}/members/{'{'}userId{'}'} ↔ Mygroup/{'{'}userId{'}'}/Mygroup/{'{'}groupId{'}'}
                    </code>
                  </span>
                </p>
                {regionNameForSupervisor && (
                  <p className="users-modal__supervisor-note-sub">
                    المنطقة المسندة حالياً: <strong>{regionNameForSupervisor}</strong>
                  </p>
                )}
                <p className="users-modal__supervisor-note-sub users-modal__supervisor-note-sub--mt">
                  لإلغاء صلاحية الإشراف اختر دوراً آخر أدناه واحفظ.
                </p>
              </div>
            )}

            <div className="users-modal__field">
              <label className="app-label">
                الرتبة / الصلاحية
              </label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="app-select"
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

            <div className="users-modal__field">
              <label className="app-label">
                نوع الصلاحيات
              </label>
              <select
                value={selectedPermissionProfileId}
                onChange={e => setSelectedPermissionProfileId(e.target.value)}
                className="app-select"
                disabled={!can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')}
              >
                <option value="">وصول كامل (بدون نوع مخصص)</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </select>
            </div>

            {(selectedRole === 'student' || selectedRole === 'teacher') && (
              <div className="app-alert app-alert--info users-modal__helper-alert">
                ربط {selectedRole === 'student' ? 'الطالب' : 'المعلم'} بالمدرسة يتم من داخل صفحة المدرسة نفسها (نمط أعضاء المجموعة).
              </div>
            )}

            <div className="users-modal__actions">
              <button
                type="button"
                className="google-btn google-btn--filled users-modal__save-btn"
                onClick={handleSaveRole}
                disabled={loading || !can(PERMISSION_PAGE_IDS.users, 'user_edit_role')}
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

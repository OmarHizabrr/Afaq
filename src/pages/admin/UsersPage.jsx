import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Edit2, X, Eye } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { subscribePermissionProfiles } from '../../services/permissionProfilesService';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const UsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [permissionProfiles, setPermissionProfiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  const [selectedPermissionProfileId, setSelectedPermissionProfileId] = useState('');
  const { can } = usePermissions();

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;

      const userDocs = await api.getDocuments(api.getUsersCollection());
      setUsers(userDocs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    setSelectedPermissionProfileId(user.permissionProfileId || '');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);
      const api = FirestoreApi.Api;

      const userDataPatch = {
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
                  <div className="users-card__role-chip">
                    {user.permissionProfileId ? 'نوع صلاحيات مخصص' : 'بدون نوع صلاحيات'}
                  </div>
                  {user.permissionProfileId && (
                    <div className="users-card__profile-chip">{user.permissionProfileId}</div>
                  )}
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
                {(can(PERMISSION_PAGE_IDS.users, 'user_edit_role') ||
                  can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')) && (
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
              <h2 className="users-modal__title">تحديد نوع الصلاحيات ({editingUser.displayName})</h2>
              <button type="button" className="icon-btn" onClick={() => setEditingUser(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="users-modal__field">
              <label className="app-label">
                نوع الصلاحيات
              </label>
              <AppSelect
                value={selectedPermissionProfileId}
                onChange={e => setSelectedPermissionProfileId(e.target.value)}
                className="app-select"
                disabled={!can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')}
              >
                <option value="">وصول كامل (بدون نوع مخصص)</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </AppSelect>
            </div>
            <div className="app-alert app-alert--info users-modal__helper-alert">
              إذا تُرك الحقل فارغاً فلن يرى المستخدم أي صفحات، وسيظهر له تنبيه طلب الصلاحيات بعد تسجيل الدخول.
            </div>

            <div className="users-modal__actions">
              <button
                type="button"
                className="google-btn google-btn--filled users-modal__save-btn"
                onClick={handleSaveRole}
                disabled={
                  loading ||
                  (!can(PERMISSION_PAGE_IDS.users, 'user_edit_role') &&
                    !can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile'))
                }
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

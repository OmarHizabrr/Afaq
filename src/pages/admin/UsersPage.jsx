import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Edit2, X, Eye, UserPlus, Lock, EyeOff } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import usePermissions from '../../context/usePermissions';
import { subscribePermissionProfiles } from '../../services/permissionProfilesService';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterUsersByScope,
  loadPeerUserIdsForGroups,
} from '../../utils/permissionDataScope';
import { SYSTEM_ADMIN_ROLE } from '../../utils/systemRoles';

const USER_ROLE_LABELS = {
  [SYSTEM_ADMIN_ROLE]: 'مدير نظام (وصول كامل)',
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام',
  supervisor_local: 'مشرف منطقة',
  teacher: 'معلم',
  student: 'طالب',
  unassigned: 'غير معيّن',
};

const UsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [permissionProfiles, setPermissionProfiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [error, setError] = useState('');

  const [selectedPermissionProfileId, setSelectedPermissionProfileId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserPermissionProfileId, setNewUserPermissionProfileId] = useState('');
  const [newUserRole, setNewUserRole] = useState('unassigned');
  const [selectedRole, setSelectedRole] = useState('unassigned');
  const [modalBusy, setModalBusy] = useState(false);
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser } = perm;

  const canAssignSystemAdmin =
    actorUser?.role === SYSTEM_ADMIN_ROLE || actorUser?.role === 'admin';

  const fetchData = useCallback(async (opts = {}) => {
    const quiet = Boolean(opts.quiet);
    if (!quiet) setLoading(true);
    try {
      const api = FirestoreApi.Api;

      const userDocs = await api.getDocuments(api.getUsersCollection());
      let usersList = userDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const scope = pageDataScope(PERMISSION_PAGE_IDS.users);
      if (scope === DATA_SCOPE_MEMBERSHIP && membershipGroupIds.size > 0) {
        const peerIds = await loadPeerUserIdsForGroups(api, membershipGroupIds);
        const actorId = actorUser?.uid || actorUser?.id || '';
        usersList = filterUsersByScope(usersList, peerIds, actorId, scope);
      }
      setUsers(usersList);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds, actorUser]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.users) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchData();
  }, [ready, membershipLoading, fetchData, pageDataScope]);

  useEffect(() => {
    const unsub = subscribePermissionProfiles(setPermissionProfiles, () => {});
    return () => unsub();
  }, []);

  const openEditModal = async (user) => {
    setEditingUser(user);
    setError('');
    setSelectedPermissionProfileId(user.permissionProfileId || '');
    setSelectedRole(user.role || 'unassigned');
  };

  const resetAddUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserPassword('');
    setShowNewUserPassword(false);
    setNewUserPermissionProfileId('');
    setNewUserRole('unassigned');
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserPhone.trim() || !newUserPassword.trim()) {
      setError('يرجى إدخال الاسم ورقم الهاتف وكلمة المرور للمستخدم.');
      return;
    }
    const emailNormalized = newUserEmail.trim().toLowerCase();
    const emailExists = emailNormalized
      ? users.some((u) => (u.email || '').toLowerCase() === emailNormalized)
      : false;
    if (emailNormalized && emailExists) {
      setError('هذا البريد الإلكتروني مستخدم مسبقاً.');
      return;
    }

    try {
      setModalBusy(true);
      setError('');
      const api = FirestoreApi.Api;
      const userId = api.getNewId('users');
      const role =
        newUserRole === SYSTEM_ADMIN_ROLE && canAssignSystemAdmin ? SYSTEM_ADMIN_ROLE : newUserRole || 'unassigned';
      const permissionProfileId =
        role === SYSTEM_ADMIN_ROLE ? null : newUserPermissionProfileId || null;
      await api.setData({
        docRef: api.getUserDoc(userId),
        data: {
          displayName: newUserName.trim(),
          email: emailNormalized || '',
          phoneNumber: newUserPhone.trim(),
          password: newUserPassword.trim(),
          permissionProfileId,
          role,
          accountDisabled: false,
          photoURL: '',
        },
      });
      setIsAddUserOpen(false);
      resetAddUserForm();
      await fetchData({ quiet: true });
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء إضافة المستخدم الجديد.');
    } finally {
      setModalBusy(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    try {
      setModalBusy(true);
      const api = FirestoreApi.Api;

      const roleEditable = can(PERMISSION_PAGE_IDS.users, 'user_edit_role');
      const profileEditable = can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile');
      const userDataPatch = {};

      let nextRole = editingUser.role;
      if (roleEditable) {
        nextRole =
          selectedRole === SYSTEM_ADMIN_ROLE && !canAssignSystemAdmin ? editingUser.role : selectedRole;
        userDataPatch.role = nextRole;
      }
      if (profileEditable) {
        userDataPatch.permissionProfileId =
          nextRole === SYSTEM_ADMIN_ROLE ? null : selectedPermissionProfileId || null;
      }

      await api.updateData({
        docRef: api.getUserDoc(editingUser.id),
        data: userDataPatch,
      });

      setEditingUser(null);
      setError('');
      await fetchData({ quiet: true });
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحديث الصلاحية');
    } finally {
      setModalBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="إدارة المستخدمين والصلاحيات"
        subtitle="عرض جميع الحسابات بما فيها الطلاب ومدير النظام. تعديل نوع الصلاحيات من هنا؛ الربط بالمدارس والمناطق من صفحات تلك المجموعات."
      >
        {ready && pageDataScope(PERMISSION_PAGE_IDS.users) === DATA_SCOPE_MEMBERSHIP && (
          <div className="app-alert app-alert--info users-alert" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
            عرض محدود: تظهر حسابات الأعضاء في مجموعاتك معك فقط (بالإضافة إلى حسابك).
          </div>
        )}
        {(can(PERMISSION_PAGE_IDS.users, 'user_edit_role') || can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')) && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            style={{ width: 'auto' }}
            onClick={() => {
              setIsAddUserOpen(true);
              setError('');
            }}
          >
            <UserPlus size={18} />
            <span>إضافة مستخدم</span>
          </button>
        )}
      </PageHeader>

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
                  <div className="users-card__role-chip" title="الدور في النظام">
                    {USER_ROLE_LABELS[user.role] || user.role || '—'}
                  </div>
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

            {can(PERMISSION_PAGE_IDS.users, 'user_edit_role') && (
              <div className="users-modal__field">
                <label className="app-label">الدور في النظام</label>
                <AppSelect
                  value={selectedRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedRole(v);
                    if (v === SYSTEM_ADMIN_ROLE) setSelectedPermissionProfileId('');
                  }}
                  className="app-select"
                >
                  <option value="unassigned">{USER_ROLE_LABELS.unassigned}</option>
                  <option value="student">{USER_ROLE_LABELS.student}</option>
                  <option value="teacher">{USER_ROLE_LABELS.teacher}</option>
                  <option value="supervisor_local">{USER_ROLE_LABELS.supervisor_local}</option>
                  <option value="supervisor_arab">{USER_ROLE_LABELS.supervisor_arab}</option>
                  <option value="admin">{USER_ROLE_LABELS.admin}</option>
                  {canAssignSystemAdmin && (
                    <option value={SYSTEM_ADMIN_ROLE}>{USER_ROLE_LABELS[SYSTEM_ADMIN_ROLE]}</option>
                  )}
                </AppSelect>
              </div>
            )}
            <div className="users-modal__field">
              <label className="app-label">
                نوع الصلاحيات
              </label>
              <AppSelect
                value={selectedPermissionProfileId}
                onChange={e => setSelectedPermissionProfileId(e.target.value)}
                className="app-select"
                disabled={
                  !can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile') ||
                  selectedRole === SYSTEM_ADMIN_ROLE
                }
              >
                <option value="">بدون نوع صلاحيات (يُحدَّد حسب الدور أعلاه)</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </AppSelect>
            </div>
            <div className="app-alert app-alert--info users-modal__helper-alert">
              {selectedRole === SYSTEM_ADMIN_ROLE
                ? 'مدير النظام (وصول كامل) يرى كل الصفحات وكل الإجراءات دون ربط بنوع صلاحيات.'
                : 'إذا تُرك نوع الصلاحيات فارغاً وليس المستخدم مدير نظام، فلن تُعرض له الصفحات حتى يُعيَّن له نوع صلاحيات.'}
            </div>

            <div className="users-modal__actions">
              <BusyButton
                type="button"
                busy={modalBusy}
                className="google-btn google-btn--filled users-modal__save-btn"
                onClick={handleSaveRole}
                disabled={
                  !can(PERMISSION_PAGE_IDS.users, 'user_edit_role') &&
                  !can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')
                }
              >
                حفظ التغييرات
              </BusyButton>
            </div>
          </div>
        </div>
      )}

      {isAddUserOpen && (
        <div className="modal-overlay" onClick={() => setIsAddUserOpen(false)}>
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal__head">
              <h2 className="users-modal__title">إضافة مستخدم جديد</h2>
              <button type="button" className="icon-btn" onClick={() => setIsAddUserOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="users-modal__field">
              <label className="app-label">اسم المستخدم</label>
              <input
                className="app-input"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>

            <div className="users-modal__field">
              <label className="app-label">البريد الإلكتروني (اختياري)</label>
              <input
                className="app-input"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="users-modal__field">
              <label className="app-label">رقم الهاتف (إجباري)</label>
              <input
                className="app-input"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={15}
                placeholder="07xxxxxxxx"
              />
            </div>

            <div className="users-modal__field">
              <label className="app-label">كلمة المرور (إجباري)</label>
              <div className="md-field settings-profile-form__password-field">
                <Lock size={18} color="var(--text-secondary)" aria-hidden />
                <input
                  className="app-input"
                  type={showNewUserPassword ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="ادخل كلمة مرور المستخدم"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="icon-btn settings-profile-form__password-toggle"
                  onClick={() => setShowNewUserPassword((v) => !v)}
                  title={showNewUserPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  aria-label={showNewUserPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="users-modal__field">
              <label className="app-label">الدور في النظام</label>
              <AppSelect
                value={newUserRole}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewUserRole(v);
                  if (v === SYSTEM_ADMIN_ROLE) setNewUserPermissionProfileId('');
                }}
                className="app-select"
              >
                <option value="unassigned">{USER_ROLE_LABELS.unassigned}</option>
                <option value="student">{USER_ROLE_LABELS.student}</option>
                <option value="teacher">{USER_ROLE_LABELS.teacher}</option>
                <option value="supervisor_local">{USER_ROLE_LABELS.supervisor_local}</option>
                <option value="supervisor_arab">{USER_ROLE_LABELS.supervisor_arab}</option>
                <option value="admin">{USER_ROLE_LABELS.admin}</option>
                {canAssignSystemAdmin && (
                  <option value={SYSTEM_ADMIN_ROLE}>{USER_ROLE_LABELS[SYSTEM_ADMIN_ROLE]}</option>
                )}
              </AppSelect>
            </div>
            <div className="users-modal__field">
              <label className="app-label">نوع الصلاحيات</label>
              <AppSelect
                value={newUserPermissionProfileId}
                onChange={(e) => setNewUserPermissionProfileId(e.target.value)}
                className="app-select"
                disabled={newUserRole === SYSTEM_ADMIN_ROLE}
              >
                <option value="">بدون نوع صلاحيات (تظهر له صفحة طلب الصلاحيات إن لم يكن مدير نظام)</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </AppSelect>
            </div>

            <div className="users-modal__actions">
              <button
                type="button"
                className="google-btn"
                style={{ width: 'auto' }}
                onClick={() => {
                  setIsAddUserOpen(false);
                  resetAddUserForm();
                }}
              >
                إلغاء
              </button>
              <BusyButton
                type="button"
                busy={modalBusy}
                className="google-btn google-btn--filled users-modal__save-btn"
                onClick={handleCreateUser}
              >
                إنشاء المستخدم
              </BusyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

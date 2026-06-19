import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Edit2, X, Eye, UserPlus, Lock, EyeOff, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import ExplorationFormSection from '../../components/ExplorationFormSection';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import { useExplorationForm } from '../../hooks/useExplorationForm';
import usePermissions from '../../context/usePermissions';
import { subscribePermissionProfiles } from '../../services/permissionProfilesService';
import { PERMISSION_PAGE_IDS, EXPLORATION_BRIDGE_ACTION_IDS } from '../../config/permissionRegistry';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterUsersByScope,
  loadPeerUserIdsForGroups,
} from '../../utils/permissionDataScope';
import { SYSTEM_ADMIN_ROLE, getSystemRoleLabels } from '../../utils/systemRoles';
import useAppTranslation from '../../hooks/useAppTranslation';

const USERS_ROLE_FILTER_ORDER = [
  'teacher',
  'supervisor_local',
  'supervisor_arab',
  'student',
  'admin',
  SYSTEM_ADMIN_ROLE,
  'unassigned',
  'all',
];

const UsersPage = () => {
  const { t } = useAppTranslation();
  const roleLabels = useMemo(() => getSystemRoleLabels(t), [t]);
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
  const [usersRoleFilter, setUsersRoleFilter] = useState('teacher');
  const [modalBusy, setModalBusy] = useState(false);
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser, explorationBridgeAllowed } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.users);

  const canAssignSystemAdmin =
    actorUser?.role === SYSTEM_ADMIN_ROLE || actorUser?.role === 'admin';
  const roleFilterOptions = useMemo(
    () =>
      USERS_ROLE_FILTER_ORDER.map((id) => ({
        id,
        label: id === 'all' ? t('pages.RegionDetailsPage.الكل', 'الكل') : roleLabels[id] || id,
      })),
    [t, roleLabels],
  );
  const usersRoleCounts = useMemo(() => {
    const counts = { all: users.length };
    users.forEach((u) => {
      const rid = u.role || 'unassigned';
      counts[rid] = (counts[rid] || 0) + 1;
    });
    return counts;
  }, [users]);
  const visibleUsers = useMemo(() => {
    if (usersRoleFilter === 'all') return users;
    return users.filter((u) => (u.role || 'unassigned') === usersRoleFilter);
  }, [users, usersRoleFilter]);

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
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_جلب_البيانات', 'حدث خطأ أثناء جلب البيانات'));
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
      setError(t('pages.UsersPage.يرجى_إدخال_الاسم_ورقم_الهاتف_وكلمة_المرور_للمستخدم', 'يرجى إدخال الاسم ورقم الهاتف وكلمة المرور للمستخدم.'));
      return;
    }
    const emailNormalized = newUserEmail.trim().toLowerCase();
    const emailExists = emailNormalized
      ? users.some((u) => (u.email || '').toLowerCase() === emailNormalized)
      : false;
    if (emailNormalized && emailExists) {
      setError(t('pages.UserDetailsPage.هذا_البريد_الإلكتروني_مستخدم_مسبقاً', 'هذا البريد الإلكتروني مستخدم مسبقاً.'));
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
          fcmTokens: [],
        },
      });
      setIsAddUserOpen(false);
      resetAddUserForm();
      await fetchData({ quiet: true });
    } catch (err) {
      console.error(err);
      setError(t('pages.UsersPage.حدث_خطأ_أثناء_إضافة_المستخدم_الجديد', 'حدث خطأ أثناء إضافة المستخدم الجديد.'));
    } finally {
      setModalBusy(false);
    }
  };

  const handleExplorationCreateUser = async () => {
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`${t('components.ExplorationDataModal.الحقول_التالية_مطلوبة_أو_غير_صالحة', 'الحقول التالية مطلوبة أو غير صالحة:')} ${missing.join(t('components.ExplorationDataModal.،', '، '))}`);
      return;
    }
    const displayName = expForm.deriveDisplayName('');
    if (!displayName) {
      setError(t('pages.UsersPage.لا_يمكن_استخراج_اسم_المستخدم_من_حقول_النموذج_أضف_حقلاً_نصياً', 'لا يمكن استخراج اسم المستخدم من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".'));
      return;
    }
    const phone = expForm.getValueByType('tel').trim();
    if (!phone) {
      setError(t('pages.UsersPage.يحتاج_النموذج_إلى_حقل_من_نوع_رقم_هاتف_لرقم_المستخدم', 'يحتاج النموذج إلى حقل من نوع «رقم هاتف» لرقم المستخدم.'));
      return;
    }
    const password = expForm.getValueByType('password').trim();
    if (!password) {
      setError(t('pages.UsersPage.يحتاج_النموذج_إلى_حقل_من_نوع_كلمة_مرور_لإنشاء_حساب_المستخدم', 'يحتاج النموذج إلى حقل من نوع «كلمة مرور» لإنشاء حساب المستخدم.'));
      return;
    }
    const emailNormalized = expForm.getValueByType('email').trim().toLowerCase();
    const emailExists = emailNormalized
      ? users.some((u) => (u.email || '').toLowerCase() === emailNormalized)
      : false;
    if (emailNormalized && emailExists) {
      setError(t('pages.UserDetailsPage.هذا_البريد_الإلكتروني_مستخدم_مسبقاً', 'هذا البريد الإلكتروني مستخدم مسبقاً.'));
      return;
    }
    const permissionProfileId = expForm.getValueBySource('permission_profiles') || null;

    try {
      setExpSaving(true);
      setError('');
      const api = FirestoreApi.Api;
      const userId = api.getNewId('users');
      await api.setData({
        docRef: api.getUserDoc(userId),
        data: {
          displayName,
          email: emailNormalized || '',
          phoneNumber: phone,
          password,
          permissionProfileId,
          role: 'unassigned',
          accountDisabled: false,
          photoURL: '',
          fcmTokens: [],
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        userData: actorUser || {},
      });
      setIsExploringAdding(false);
      expForm.reset();
      await fetchData({ quiet: true });
    } catch (err) {
      console.error(err);
      setError(t('pages.UsersPage.حدث_خطأ_أثناء_إضافة_المستخدم_من_الاستكشاف', 'حدث خطأ أثناء إضافة المستخدم من الاستكشاف.'));
    } finally {
      setExpSaving(false);
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
      setError(t('pages.UsersPage.حدث_خطأ_أثناء_تحديث_الصلاحية', 'حدث خطأ أثناء تحديث الصلاحية'));
    } finally {
      setModalBusy(false);
    }
  };

  return (
    <div className="users-page portal-page">
      <PageHeader
        icon={Shield}
        title={t('pages.UsersPage.إدارة_المستخدمين_والصلاحيات', 'إدارة المستخدمين والصلاحيات')}
        subtitle={t('pages.UsersPage.عرض_جميع_الحسابات_بما_فيها_الطلاب_ومدير_النظام_تعديل_نوع_الص', 'عرض جميع الحسابات بما فيها الطلاب ومدير النظام. تعديل نوع الصلاحيات من هنا؛ الربط بالمدارس والمناطق من صفحات تلك المجموعات.')}
      >
        {(can(PERMISSION_PAGE_IDS.users, 'user_edit_role') || can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')) && (
          <>
            <button
              type="button"
              className="google-btn google-btn--toolbar"
              onClick={() => {
                setIsAddUserOpen(true);
                setError('');
              }}
            >
              <UserPlus size={18} />
              <span className="portal-toolbar__long">{t('pages.UsersPage.إضافة_مستخدم', 'إضافة مستخدم')}</span>
              <span className="portal-toolbar__short">{t('components.ReportTextList.إضافة', 'إضافة')}</span>
            </button>
            {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
              <button
                type="button"
                className="google-btn google-btn--toolbar"
                onClick={() => {
                  setIsExploringAdding(true);
                  setError('');
                }}
              >
                <Compass size={18} />
                <span className="portal-toolbar__long">{t('pages.CurriculumPage.إضافة_من_الاستكشاف', 'إضافة من الاستكشاف')}</span>
                <span className="portal-toolbar__short">{t('utils.explorationTargetPages.استكشاف', 'استكشاف')}</span>
              </button>
            )}
          </>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.users) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info users-alert">
          {t('pages.UsersPage.عرض_محدود_المستخدمين', 'عرض محدود: تظهر حسابات الأعضاء في مجموعاتك معك فقط (بالإضافة إلى حسابك).')}
        </div>
      )}

      {error && <div className="app-alert app-alert--error users-alert">{error}</div>}
      <div className="role-filter-bar users-role-filter-bar">
        {roleFilterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`role-filter-btn ${usersRoleFilter === opt.id ? 'role-filter-btn--active' : ''}`}
            onClick={() => setUsersRoleFilter(opt.id)}
          >
            {opt.label} ({usersRoleCounts[opt.id] || 0})
          </button>
        ))}
      </div>

      {loading && !editingUser ? (
        <div className="loading-spinner page-loading"></div>
      ) : (
        <div className="users-grid">
          {visibleUsers.map(user => (
            <div key={user.id} className="surface-card users-card">
              <img
                src={user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || '')}
                alt=""
                className="users-card__avatar"
              />
              <div className="users-card__body">
                <h3 className="users-card__name">{user.displayName || t('components.StudentManagementStudentCard.بدون_اسم', 'بدون اسم')}</h3>
                <p className="users-card__email">
                  {user.email}
                </p>
                <div className="users-card__chips">
                  <div className="users-card__role-chip" title={t('pages.UsersPage.الدور_في_النظام', 'الدور في النظام')}>
                    {roleLabels[user.role] || user.role || '—'}
                  </div>
                  <div className="users-card__role-chip">
                    {user.permissionProfileId ? t('pages.UsersPage.نوع_صلاحيات_مخصص', 'نوع صلاحيات مخصص') : t('pages.UsersPage.بدون_نوع_صلاحيات', 'بدون نوع صلاحيات')}
                  </div>
                  {user.permissionProfileId && (
                    <div className="users-card__profile-chip">{user.permissionProfileId}</div>
                  )}
                  {user.accountDisabled && (
                    <span className="users-card__disabled-chip">
                      معطّل
                    </span>
                  )}
                  {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                    <ExplorationBadge record={user} onClick={() => setViewingExplorationOf(user)} />
                  )}
                </div>
              </div>
              <div className="users-card__actions">
                {can(PERMISSION_PAGE_IDS.users, 'user_view_profile') && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => navigate(`/users/${user.id}`)}
                    title={t('components.RecipientUserCard.عرض_الملف_الشخصي', 'عرض الملف الشخصي')}
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
                    title={t('pages.UsersPage.تعديل_الصلاحيات', 'تعديل الصلاحيات')}
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
                <label className="app-label">{t('pages.UsersPage.الدور_في_النظام', 'الدور في النظام')}</label>
                <AppSelect searchable
                  value={selectedRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedRole(v);
                    if (v === SYSTEM_ADMIN_ROLE) setSelectedPermissionProfileId('');
                  }}
                  className="app-select"
                >
                  <option value="unassigned">{roleLabels.unassigned}</option>
                  <option value="student">{roleLabels.student}</option>
                  <option value="teacher">{roleLabels.teacher}</option>
                  <option value="supervisor_local">{roleLabels.supervisor_local}</option>
                  <option value="supervisor_arab">{roleLabels.supervisor_arab}</option>
                  <option value="admin">{roleLabels.admin}</option>
                  {canAssignSystemAdmin && (
                    <option value={SYSTEM_ADMIN_ROLE}>{roleLabels[SYSTEM_ADMIN_ROLE]}</option>
                  )}
                </AppSelect>
              </div>
            )}
            <div className="users-modal__field">
              <label className="app-label">
                {t('pages.UsersPage.نوع_الصلاحيات', 'نوع الصلاحيات')}
              </label>
              <AppSelect searchable
                value={selectedPermissionProfileId}
                onChange={e => setSelectedPermissionProfileId(e.target.value)}
                className="app-select"
                disabled={
                  !can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile') ||
                  selectedRole === SYSTEM_ADMIN_ROLE
                }
              >
                <option value="">{t('pages.UsersPage.بدون_نوع_صلاحيات_يُحدَّد_حسب_الدور_أعلاه', 'بدون نوع صلاحيات (يُحدَّد حسب الدور أعلاه)')}</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </AppSelect>
            </div>
            <div className="app-alert app-alert--info users-modal__helper-alert">
              {selectedRole === SYSTEM_ADMIN_ROLE
                ? t('pages.UsersPage.مدير_النظام_وصول_كامل_يرى_كل_الصفحات_وكل_الإجراءات_دون_ربط_ب', 'مدير النظام (وصول كامل) يرى كل الصفحات وكل الإجراءات دون ربط بنوع صلاحيات.')
                : t('pages.UsersPage.إذا_تُرك_نوع_الصلاحيات_فارغاً_وليس_المستخدم_مدير_نظام،_فلن_ت', 'إذا تُرك نوع الصلاحيات فارغاً وليس المستخدم مدير نظام، فلن تُعرض له الصفحات حتى يُعيَّن له نوع صلاحيات.')}
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

      {isExploringAdding && (
        <div className="modal-overlay" onClick={() => setIsExploringAdding(false)}>
          <div className="modal-card modal-card--lg" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal__head">
              <h2 className="users-modal__title">{t('pages.UsersPage.إضافة_مستخدم_من_نموذج_الاستكشاف', 'إضافة مستخدم من نموذج الاستكشاف')}</h2>
              <button type="button" className="icon-btn" onClick={() => setIsExploringAdding(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="app-alert app-alert--info geo-page-alert geo-page-alert--tight">
              يحتاج النموذج إلى حقول من نوع: نص (للاسم)، هاتف، كلمة مرور. ويمكن إضافة بريد إلكتروني وحقل مصدره
              «ملفات الصلاحيات» اختيارياً.
            </div>
            <ExplorationFormSection
              controller={expForm}
              actorUser={actorUser}
              storageUserId={storageUserId}
              heading={t('components.ExplorationDataModal.حقول_نموذج_الاستكشاف', 'حقول نموذج الاستكشاف')}
              currentPageId={PERMISSION_PAGE_IDS.users}
            />
            <div className="users-modal__actions">
              <BusyButton
                type="button"
                busy={expSaving}
                className="google-btn google-btn--filled users-modal__save-btn"
                onClick={handleExplorationCreateUser}
              >
                حفظ المستخدم
              </BusyButton>
            </div>
          </div>
        </div>
      )}

      {isAddUserOpen && (
        <div className="modal-overlay" onClick={() => setIsAddUserOpen(false)}>
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal__head">
              <h2 className="users-modal__title">{t('pages.UsersPage.إضافة_مستخدم_جديد', 'إضافة مستخدم جديد')}</h2>
              <button type="button" className="icon-btn" onClick={() => setIsAddUserOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="users-modal__field">
              <label className="app-label">{t('pages.UserDetailsPage.اسم_المستخدم', 'اسم المستخدم')}</label>
              <input
                className="app-input"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder={t('pages.UsersPage.الاسم_الكامل', 'الاسم الكامل')}
              />
            </div>

            <div className="users-modal__field">
              <label className="app-label">{t('pages.StudentManagementPage.البريد_الإلكتروني_اختياري', 'البريد الإلكتروني (اختياري)')}</label>
              <input
                className="app-input"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="users-modal__field">
              <label className="app-label">{t('pages.UsersPage.رقم_الهاتف_إجباري', 'رقم الهاتف (إجباري)')}</label>
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
              <label className="app-label">{t('pages.UsersPage.كلمة_المرور_إجباري', 'كلمة المرور (إجباري)')}</label>
              <div className="md-field settings-profile-form__password-field">
                <Lock size={18} color="var(--text-secondary)" aria-hidden />
                <input
                  className="app-input"
                  type={showNewUserPassword ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder={t('pages.UsersPage.ادخل_كلمة_مرور_المستخدم', 'ادخل كلمة مرور المستخدم')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="icon-btn settings-profile-form__password-toggle"
                  onClick={() => setShowNewUserPassword((v) => !v)}
                  title={showNewUserPassword ? t('pages.StudentManagementPage.إخفاء_كلمة_المرور', 'إخفاء كلمة المرور') : t('pages.StudentManagementPage.إظهار_كلمة_المرور', 'إظهار كلمة المرور')}
                  aria-label={showNewUserPassword ? t('pages.StudentManagementPage.إخفاء_كلمة_المرور', 'إخفاء كلمة المرور') : t('pages.StudentManagementPage.إظهار_كلمة_المرور', 'إظهار كلمة المرور')}
                >
                  {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="users-modal__field">
              <label className="app-label">{t('pages.UsersPage.الدور_في_النظام', 'الدور في النظام')}</label>
              <AppSelect searchable
                value={newUserRole}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewUserRole(v);
                  if (v === SYSTEM_ADMIN_ROLE) setNewUserPermissionProfileId('');
                }}
                className="app-select"
              >
                <option value="unassigned">{roleLabels.unassigned}</option>
                <option value="student">{roleLabels.student}</option>
                <option value="teacher">{roleLabels.teacher}</option>
                <option value="supervisor_local">{roleLabels.supervisor_local}</option>
                <option value="supervisor_arab">{roleLabels.supervisor_arab}</option>
                <option value="admin">{roleLabels.admin}</option>
                {canAssignSystemAdmin && (
                  <option value={SYSTEM_ADMIN_ROLE}>{roleLabels[SYSTEM_ADMIN_ROLE]}</option>
                )}
              </AppSelect>
            </div>
            <div className="users-modal__field">
              <label className="app-label">{t('pages.UsersPage.نوع_الصلاحيات', 'نوع الصلاحيات')}</label>
              <AppSelect searchable
                value={newUserPermissionProfileId}
                onChange={(e) => setNewUserPermissionProfileId(e.target.value)}
                className="app-select"
                disabled={newUserRole === SYSTEM_ADMIN_ROLE}
              >
                <option value="">{t('pages.UsersPage.بدون_نوع_صلاحيات_تظهر_له_صفحة_طلب_الصلاحيات_إن_لم_يكن_', 'بدون نوع صلاحيات (تظهر له صفحة طلب الصلاحيات إن لم يكن مدير نظام)')}</option>
                {permissionProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </AppSelect>
            </div>

            <div className="users-modal__actions">
              <button
                type="button"
                className="google-btn users-modal__action-btn"
                onClick={() => {
                  setIsAddUserOpen(false);
                  resetAddUserForm();
                }}
              >
                {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
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

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={
          viewingExplorationOf
            ? `${t('pages.CurriculumPage.بيانات_النموذج', 'بيانات النموذج')} — ${viewingExplorationOf.displayName || ''}`
            : t('pages.CurriculumPage.بيانات_النموذج', 'بيانات النموذج')
        }
        record={viewingExplorationOf}
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={
          (can(PERMISSION_PAGE_IDS.users, 'user_edit_role') ||
            can(PERMISSION_PAGE_IDS.users, 'user_edit_permission_profile')) &&
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
          const newPermissionProfile = controller.getValueBySource('permission_profiles');
          if (newPermissionProfile) data.permissionProfileId = newPermissionProfile;
          await api.updateData({
            docRef: api.getUserDoc(target.id),
            data,
            userData: actorUser || {},
          });
          await fetchData({ quiet: true });
        }}
      />
    </div>
  );
};

export default UsersPage;

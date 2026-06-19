import translate from '../i18n/translate';

/** دور مدير النظام: وصول كامل دون `permissionProfileId` ودون قيود نطاق البيانات أو إجراءات الصفحات. */
export const SYSTEM_ADMIN_ROLE = 'system_admin';

const ROLE_LABEL_DEFS = [
  {
    id: SYSTEM_ADMIN_ROLE,
    labelKey: 'pages.RegionDetailsPage.مدير_نظام_وصول_كامل',
    labelFallback: 'مدير نظام (وصول كامل)',
  },
  { id: 'admin', labelKey: 'pages.RegionDetailsPage.مدير_النظام', labelFallback: 'مدير النظام' },
  { id: 'supervisor_arab', labelKey: 'components.MessengerPanel.مشرف_عام', labelFallback: 'مشرف عام' },
  { id: 'supervisor_local', labelKey: 'components.MessengerPanel.مشرف_منطقة', labelFallback: 'مشرف منطقة' },
  { id: 'teacher', labelKey: 'components.MessengerPanel.معلم', labelFallback: 'معلم' },
  { id: 'student', labelKey: 'components.MessengerPanel.طالب', labelFallback: 'طالب' },
  { id: 'unassigned', labelKey: 'pages.SchoolDetailsPage.غير_معيّن', labelFallback: 'غير معيّن' },
];

export function getSystemRoleLabels(t = translate) {
  return Object.fromEntries(
    ROLE_LABEL_DEFS.map(({ id, labelKey, labelFallback }) => [id, t(labelKey, labelFallback)])
  );
}

export function getSystemRoleLabel(role, t = translate) {
  if (!role) return '';
  return getSystemRoleLabels(t)[role] || role;
}

export function isSystemAdmin(user) {
  return user?.role === SYSTEM_ADMIN_ROLE;
}

/** يُستثنى من تحميل عضوية Mygroup لنطاق البيانات (مثل دور admin الحالي). */
export function skipsMembershipDataScopeLoading(user) {
  return user?.role === 'admin' || isSystemAdmin(user);
}

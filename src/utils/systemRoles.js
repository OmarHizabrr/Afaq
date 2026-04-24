/** دور مدير النظام: وصول كامل دون `permissionProfileId` ودون قيود نطاق البيانات أو إجراءات الصفحات. */
export const SYSTEM_ADMIN_ROLE = 'system_admin';

export function isSystemAdmin(user) {
  return user?.role === SYSTEM_ADMIN_ROLE;
}

/** يُستثنى من تحميل عضوية Mygroup لنطاق البيانات (مثل دور admin الحالي). */
export function skipsMembershipDataScopeLoading(user) {
  return user?.role === 'admin' || isSystemAdmin(user);
}

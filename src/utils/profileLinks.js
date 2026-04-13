/**
 * مسار صفحة تفاصيل مستخدم حسب بوابة التطبيق الحالية.
 * يعيد null إذا لا يوجد مسار مناسب (مثل طالب يعرض أدمن خارج النطاق).
 */
export function getUserProfilePath(pathname, targetUserId) {
  if (!targetUserId || typeof pathname !== 'string') return null;
  if (pathname.startsWith('/teacher')) return `/teacher/students/${targetUserId}`;
  if (pathname.startsWith('/supervisor')) return `/supervisor/users/${targetUserId}`;
  if (pathname.startsWith('/student')) return null;
  return `/users/${targetUserId}`;
}

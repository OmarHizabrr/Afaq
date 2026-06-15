import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry';
import { DATA_SCOPE_ALL } from './permissionDataScope';
import { isSystemAdmin } from './systemRoles';

/**
 * يظهر كل المدارس فقط لمدير النظام أو من عُيّن له في نوع الصلاحيات
 * نطاق بيانات «الكل» لصفحة التحضير.
 */
export function canPickAnySchoolForPrep(user, pageDataScope) {
  if (isSystemAdmin(user)) return true;
  return pageDataScope(PERMISSION_PAGE_IDS.daily_preparation) === DATA_SCOPE_ALL;
}

/** المدارس المعيّنة فقط (مرآة Mygroup) ما لم تكن صلاحية شاملة */
export async function resolveDailyPrepSchoolOptions(api, user, { pageDataScope }) {
  const allSchoolDocs = await api.getCollectionGroupDocuments('schools');
  const allRows = allSchoolDocs
    .map((s) => ({
      id: s.id,
      name: (s.data()?.name || '').trim() || s.id,
      villageId: s.data()?.villageId || s.ref.parent.parent?.id || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  if (canPickAnySchoolForPrep(user, pageDataScope)) {
    return allRows;
  }

  const mirrorIds = await api.listUserSchoolIdsFromMirrors(user);
  if (!mirrorIds.length) return [];

  return mirrorIds
    .map((id) => {
      const row = allRows.find((s) => s.id === id);
      return { id, name: row?.name || id };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

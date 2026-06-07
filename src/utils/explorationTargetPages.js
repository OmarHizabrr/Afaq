import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry';

/** صفحات يمكن أن يظهر فيها نموذج «إضافة من الاستكشاف» أو قائمة أنواع الاستكشاف */
export const EXPLORATION_TARGET_PAGES = [
  { id: PERMISSION_PAGE_IDS.explorations, label: 'قسم الاستكشاف', group: 'استكشاف' },
  { id: PERMISSION_PAGE_IDS.governorates, label: 'المحافظات', group: 'جغرافيا' },
  { id: PERMISSION_PAGE_IDS.regions, label: 'المناطق', group: 'جغرافيا' },
  { id: PERMISSION_PAGE_IDS.villages, label: 'القرى', group: 'جغرافيا' },
  { id: PERMISSION_PAGE_IDS.schools, label: 'المدارس', group: 'جغرافيا' },
  { id: PERMISSION_PAGE_IDS.curriculum, label: 'المناهج', group: 'تعليم' },
  { id: PERMISSION_PAGE_IDS.students_management, label: 'إدارة الطلاب', group: 'تعليم' },
  { id: 'teacher_students', label: 'دارسون المعلّم', group: 'تعليم' },
  { id: PERMISSION_PAGE_IDS.users, label: 'المستخدمون', group: 'إدارة' },
];

const TARGET_PAGE_ID_SET = new Set(EXPLORATION_TARGET_PAGES.map((p) => p.id));
const TARGET_PAGE_LABEL_MAP = new Map(EXPLORATION_TARGET_PAGES.map((p) => [p.id, p.label]));

/** @param {unknown} raw */
export function normalizeAllowedPageIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => String(x ?? '').trim()).filter((id) => TARGET_PAGE_ID_SET.has(id)))];
}

/**
 * فارغ = جميع الصفحات (سلوك ما قبل التخصيص).
 * @param {{ allowedPageIds?: string[] } | null | undefined} type
 * @param {string | null | undefined} pageId
 */
export function isExplorationTypeVisibleOnPage(type, pageId) {
  if (!pageId) return true;
  const allowed = normalizeAllowedPageIds(type?.allowedPageIds);
  if (allowed.length === 0) return true;
  return allowed.includes(pageId);
}

/**
 * @param {Array<{ id: string, allowedPageIds?: string[] }>} types
 * @param {string | null | undefined} pageId
 * @param {{ alwaysIncludeIds?: string[] }} [opts]
 */
export function filterExplorationTypesForPage(types, pageId, opts = {}) {
  const list = Array.isArray(types) ? types : [];
  const always = new Set((opts.alwaysIncludeIds || []).map(String).filter(Boolean));
  if (!pageId) return list;
  return list.filter((t) => always.has(t.id) || isExplorationTypeVisibleOnPage(t, pageId));
}

/** نص مختصر لعرضه على بطاقة نوع الاستكشاف */
export function formatAllowedPagesSummary(type) {
  const allowed = normalizeAllowedPageIds(type?.allowedPageIds);
  if (allowed.length === 0) return 'جميع الصفحات';
  if (allowed.length <= 2) {
    return allowed.map((id) => TARGET_PAGE_LABEL_MAP.get(id) || id).join('، ');
  }
  const first = allowed.slice(0, 2).map((id) => TARGET_PAGE_LABEL_MAP.get(id) || id);
  return `${first.join('، ')} +${allowed.length - 2}`;
}

export function getTargetPageLabel(pageId) {
  return TARGET_PAGE_LABEL_MAP.get(pageId) || pageId;
}

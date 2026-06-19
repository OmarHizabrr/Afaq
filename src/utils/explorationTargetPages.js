import translate from '../i18n/translate';
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry';

const TARGET_PAGE_DEFS = [
  {
    id: PERMISSION_PAGE_IDS.explorations,
    labelKey: 'pages.ExplorationsPage.قسم_الاستكشاف',
    labelFallback: 'قسم الاستكشاف',
    groupKey: 'utils.explorationTargetPages.استكشاف',
    groupFallback: 'استكشاف',
  },
  {
    id: PERMISSION_PAGE_IDS.governorates,
    labelKey: 'config.appNavItems.المحافظات',
    labelFallback: 'المحافظات',
    groupKey: 'utils.explorationTargetPages.جغرافيا',
    groupFallback: 'جغرافيا',
  },
  {
    id: PERMISSION_PAGE_IDS.regions,
    labelKey: 'config.appNavItems.المناطق',
    labelFallback: 'المناطق',
    groupKey: 'utils.explorationTargetPages.جغرافيا',
    groupFallback: 'جغرافيا',
  },
  {
    id: PERMISSION_PAGE_IDS.villages,
    labelKey: 'config.appNavItems.القرى',
    labelFallback: 'القرى',
    groupKey: 'utils.explorationTargetPages.جغرافيا',
    groupFallback: 'جغرافيا',
  },
  {
    id: PERMISSION_PAGE_IDS.schools,
    labelKey: 'config.appNavItems.المدارس',
    labelFallback: 'المدارس',
    groupKey: 'utils.explorationTargetPages.جغرافيا',
    groupFallback: 'جغرافيا',
  },
  {
    id: PERMISSION_PAGE_IDS.curriculum,
    labelKey: 'config.appNavItems.المناهج',
    labelFallback: 'المناهج',
    groupKey: 'utils.explorationTargetPages.تعليم',
    groupFallback: 'تعليم',
  },
  {
    id: PERMISSION_PAGE_IDS.students_management,
    labelKey: 'config.appNavItems.إدارة_الطلاب',
    labelFallback: 'إدارة الطلاب',
    groupKey: 'utils.explorationTargetPages.تعليم',
    groupFallback: 'تعليم',
  },
  {
    id: 'teacher_students',
    labelKey: 'utils.explorationTargetPages.دارسون_المعلّم',
    labelFallback: 'دارسون المعلّم',
    groupKey: 'utils.explorationTargetPages.تعليم',
    groupFallback: 'تعليم',
  },
  {
    id: PERMISSION_PAGE_IDS.users,
    labelKey: 'config.appNavItems.المستخدمين',
    labelFallback: 'المستخدمون',
    groupKey: 'utils.explorationTargetPages.إدارة',
    groupFallback: 'إدارة',
  },
];

export function getExplorationTargetPages(t = translate) {
  return TARGET_PAGE_DEFS.map(({ id, labelKey, labelFallback, groupKey, groupFallback }) => ({
    id,
    label: t(labelKey, labelFallback),
    group: t(groupKey, groupFallback),
  }));
}

/** @deprecated prefer getExplorationTargetPages(t) */
export const EXPLORATION_TARGET_PAGES = getExplorationTargetPages();

const TARGET_PAGE_ID_SET = new Set(TARGET_PAGE_DEFS.map((p) => p.id));

function labelMap(t = translate) {
  return new Map(getExplorationTargetPages(t).map((p) => [p.id, p.label]));
}

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
export function formatAllowedPagesSummary(type, t = translate) {
  const allowed = normalizeAllowedPageIds(type?.allowedPageIds);
  const labels = labelMap(t);
  if (allowed.length === 0) return t('utils.explorationTargetPages.جميع_الصفحات', 'جميع الصفحات');
  if (allowed.length <= 2) {
    return allowed.map((id) => labels.get(id) || id).join('، ');
  }
  const first = allowed.slice(0, 2).map((id) => labels.get(id) || id);
  return t(
    'utils.explorationTargetPages.first_join_،_allowed_length_2',
    `${first.join('، ')} +${allowed.length - 2}`
  );
}

export function getTargetPageLabel(pageId, t = translate) {
  return labelMap(t).get(pageId) || pageId;
}

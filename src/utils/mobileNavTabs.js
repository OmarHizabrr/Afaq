import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry';

const MAX_TABS = 4;

const TAB_PRIORITIES_BY_ROLE = {
  teacher: [
    PERMISSION_PAGE_IDS.daily_preparation,
    PERMISSION_PAGE_IDS.reports,
    PERMISSION_PAGE_IDS.notifications,
    PERMISSION_PAGE_IDS.settings,
    PERMISSION_PAGE_IDS.schools,
    PERMISSION_PAGE_IDS.dashboard,
  ],
  supervisor_arab: [
    PERMISSION_PAGE_IDS.dashboard,
    PERMISSION_PAGE_IDS.schools,
    PERMISSION_PAGE_IDS.reports,
    PERMISSION_PAGE_IDS.explorations,
    PERMISSION_PAGE_IDS.notifications,
    PERMISSION_PAGE_IDS.regions,
  ],
  supervisor_local: [
    PERMISSION_PAGE_IDS.dashboard,
    PERMISSION_PAGE_IDS.schools,
    PERMISSION_PAGE_IDS.reports,
    PERMISSION_PAGE_IDS.explorations,
    PERMISSION_PAGE_IDS.notifications,
    PERMISSION_PAGE_IDS.regions,
  ],
};

const DEFAULT_PRIORITIES = [
  PERMISSION_PAGE_IDS.dashboard,
  PERMISSION_PAGE_IDS.schools,
  PERMISSION_PAGE_IDS.reports,
  PERMISSION_PAGE_IDS.notifications,
  PERMISSION_PAGE_IDS.daily_preparation,
  PERMISSION_PAGE_IDS.explorations,
];

const OVERFLOW_PAGE_IDS = new Set([
  PERMISSION_PAGE_IDS.settings,
  PERMISSION_PAGE_IDS.admin_user_types,
  PERMISSION_PAGE_IDS.admin_branding,
  PERMISSION_PAGE_IDS.admin_site_copy,
  PERMISSION_PAGE_IDS.exploration_types,
]);

export function isNavPathActive(path, pathname, { end = false } = {}) {
  if (path === '/') return pathname === '/';
  if (end) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

const PORTAL_TAB_PATH_PRIORITIES = {
  teacher: [
    '/teacher/daily-log',
    '/teacher/students',
    '/teacher',
    '/teacher/notifications',
  ],
  supervisor: [
    '/supervisor',
    '/supervisor/visit',
    '/supervisor/history',
    '/supervisor/notifications',
  ],
  student: [
    '/student',
    '/student/results',
    '/student/notifications',
    '/student/profile',
  ],
};

export function normalizePortalNavItem(item) {
  return {
    ...item,
    name: item.name || item.label,
    shortName: item.shortName || item.name || item.label,
  };
}

export function getPortalMobileTabs(navItems, role) {
  const normalized = navItems.map(normalizePortalNavItem);
  const priorities = PORTAL_TAB_PATH_PRIORITIES[role];
  if (!priorities) return normalized.slice(0, MAX_TABS);

  const byPath = new Map(normalized.map((item) => [item.path, item]));
  const tabs = [];
  const usedPaths = new Set();

  for (const path of priorities) {
    if (tabs.length >= MAX_TABS) break;
    const item = byPath.get(path);
    if (item && !usedPaths.has(item.path)) {
      tabs.push(item);
      usedPaths.add(item.path);
    }
  }

  if (tabs.length < MAX_TABS) {
    for (const item of normalized) {
      if (tabs.length >= MAX_TABS) break;
      if (!usedPaths.has(item.path)) {
        tabs.push(item);
        usedPaths.add(item.path);
      }
    }
  }

  return tabs;
}

export function getMobileNavTabs(visibleNavItems, user) {
  const priorities = TAB_PRIORITIES_BY_ROLE[user?.role] || DEFAULT_PRIORITIES;
  const byPageId = new Map(visibleNavItems.map((item) => [item.pageId, item]));
  const tabs = [];
  const usedPaths = new Set();

  for (const pageId of priorities) {
    if (tabs.length >= MAX_TABS) break;
    const item = byPageId.get(pageId);
    if (item && !usedPaths.has(item.path)) {
      tabs.push(item);
      usedPaths.add(item.path);
    }
  }

  if (tabs.length < MAX_TABS) {
    for (const item of visibleNavItems) {
      if (tabs.length >= MAX_TABS) break;
      if (!usedPaths.has(item.path) && !OVERFLOW_PAGE_IDS.has(item.pageId)) {
        tabs.push(item);
        usedPaths.add(item.path);
      }
    }
  }

  return tabs;
}

export function isMoreTabActive(tabPaths, pathname) {
  return !tabPaths.some((path) => isNavPathActive(path, pathname));
}

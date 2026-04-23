export const PERMISSION_PAGE_IDS = {
  dashboard: 'dashboard',
  governorates: 'governorates',
  regions: 'regions',
  villages: 'villages',
  schools: 'schools',
  curriculum: 'curriculum',
  reports: 'reports',
  users: 'users',
  students_management: 'students_management',
  notifications: 'notifications',
  settings: 'settings',
  admin_user_types: 'admin_user_types',
  admin_branding: 'admin_branding',
  admin_site_copy: 'admin_site_copy',
};

export const PERMISSION_PAGES = [
  {
    id: PERMISSION_PAGE_IDS.dashboard,
    path: '/',
    label: 'الرئيسية',
    actions: [],
  },
  { id: PERMISSION_PAGE_IDS.governorates, path: '/governorates', label: 'المحافظات', actions: [] },
  { id: PERMISSION_PAGE_IDS.regions, path: '/regions', label: 'المناطق', actions: [] },
  { id: PERMISSION_PAGE_IDS.villages, path: '/villages', label: 'القرى', actions: [] },
  { id: PERMISSION_PAGE_IDS.schools, path: '/schools', label: 'المدارس', actions: [] },
  { id: PERMISSION_PAGE_IDS.curriculum, path: '/curriculum', label: 'المناهج', actions: [] },
  { id: PERMISSION_PAGE_IDS.reports, path: '/reports', label: 'التقارير', actions: [] },
  {
    id: PERMISSION_PAGE_IDS.users,
    path: '/users',
    label: 'المستخدمون',
    actions: [
      { id: 'user_view_profile', label: 'عرض ملف المستخدم' },
      { id: 'user_edit_role', label: 'تعديل رتبة المستخدم' },
      { id: 'user_edit_permission_profile', label: 'تعديل نوع الصلاحيات' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.students_management,
    path: '/students-management',
    label: 'إدارة الطلاب',
    actions: [],
  },
  { id: PERMISSION_PAGE_IDS.notifications, path: '/notifications', label: 'الإشعارات', actions: [] },
  { id: PERMISSION_PAGE_IDS.settings, path: '/settings', label: 'الإعدادات', actions: [] },
  {
    id: PERMISSION_PAGE_IDS.admin_user_types,
    path: '/admin/user-types',
    label: 'أنواع المستخدمين والصلاحيات',
    actions: [],
  },
  {
    id: PERMISSION_PAGE_IDS.admin_branding,
    path: '/admin/branding',
    label: 'هوية الموقع',
    actions: [],
  },
  {
    id: PERMISSION_PAGE_IDS.admin_site_copy,
    path: '/admin/site-copy',
    label: 'النصوص الثابتة',
    actions: [],
  },
];

const mapByPath = new Map(PERMISSION_PAGES.map((p) => [p.path, p.id]));

export function getPermissionPageIdFromPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  return mapByPath.get(pathname) || null;
}


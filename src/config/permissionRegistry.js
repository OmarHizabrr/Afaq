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
  {
    id: PERMISSION_PAGE_IDS.governorates,
    path: '/governorates',
    label: 'المحافظات',
    actions: [
      { id: 'governorate_add', label: 'إضافة محافظة' },
      { id: 'governorate_edit', label: 'تعديل محافظة' },
      { id: 'governorate_delete', label: 'حذف محافظة' },
      { id: 'governorate_view', label: 'عرض التفاصيل' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.regions,
    path: '/regions',
    label: 'المناطق',
    actions: [
      { id: 'region_add', label: 'إضافة منطقة' },
      { id: 'region_edit', label: 'تعديل منطقة' },
      { id: 'region_delete', label: 'حذف منطقة' },
      { id: 'region_view', label: 'عرض التفاصيل' },
      { id: 'region_school_view', label: 'تفاصيل المدرسة من صفحة المنطقة' },
      { id: 'region_supervisor_assign', label: 'تعيين مشرف للمنطقة' },
      { id: 'region_supervisor_view_profile', label: 'عرض ملف المشرف من صفحة المنطقة' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.villages,
    path: '/villages',
    label: 'القرى',
    actions: [
      { id: 'village_add', label: 'إضافة قرية' },
      { id: 'village_edit', label: 'تعديل قرية' },
      { id: 'village_delete', label: 'حذف قرية' },
      { id: 'village_view', label: 'عرض التفاصيل' },
      { id: 'village_new_muslim_add', label: 'إضافة مهتدي' },
      { id: 'village_new_muslim_edit', label: 'تعديل مهتدي' },
      { id: 'village_new_muslim_delete', label: 'حذف مهتدي' },
      { id: 'village_school_view', label: 'تفاصيل المدرسة من صفحة القرية' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.schools,
    path: '/schools',
    label: 'المدارس',
    actions: [
      { id: 'school_add', label: 'إضافة مدرسة' },
      { id: 'school_edit', label: 'تعديل مدرسة' },
      { id: 'school_delete', label: 'حذف مدرسة' },
      { id: 'school_view', label: 'عرض التفاصيل' },
      { id: 'school_member_assign', label: 'إضافة/تعيين أعضاء المدرسة' },
      { id: 'school_member_view_profile', label: 'عرض ملفات أعضاء المدرسة' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.curriculum,
    path: '/curriculum',
    label: 'المناهج',
    actions: [
      { id: 'curriculum_add_subject', label: 'إضافة مادة' },
      { id: 'curriculum_save_subject', label: 'حفظ/تعديل المنهج' },
      { id: 'curriculum_delete_subject', label: 'حذف مادة' },
      { id: 'curriculum_print_subject', label: 'طباعة المادة' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.reports,
    path: '/reports',
    label: 'التقارير',
    actions: [
      { id: 'report_view', label: 'عرض تقرير' },
      { id: 'report_delete', label: 'حذف تقرير' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.users,
    path: '/users',
    label: 'المستخدمون',
    actions: [
      { id: 'user_view_profile', label: 'عرض ملف المستخدم' },
      { id: 'user_edit_role', label: 'تعديل رتبة المستخدم' },
      { id: 'user_edit_permission_profile', label: 'تعديل نوع الصلاحيات' },
      { id: 'user_admin_disable', label: 'تعطيل/تفعيل الحساب' },
      { id: 'user_admin_delete', label: 'حذف المستخدم' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.students_management,
    path: '/students-management',
    label: 'إدارة الطلاب',
    actions: [{ id: 'student_management_view_profile', label: 'عرض ملف الطالب' }],
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


import {
  LayoutDashboard,
  Map,
  MapPin,
  Home,
  School,
  Users,
  Settings,
  BookOpen,
  Bell,
  ClipboardList,
  GraduationCap,
  Shield,
  Palette,
  FileText,
  Compass,
  Tags,
  CalendarDays,
} from 'lucide-react';
import { PERMISSION_PAGE_IDS } from './permissionRegistry';

export function getAppNavItems(t) {
  return [
    { name: t('layout.nav_dashboard', t('config.appNavItems.الرئيسية', 'الرئيسية')), shortName: t('config.appNavItems.الرئيسية', 'الرئيسية'), icon: LayoutDashboard, path: '/', pageId: PERMISSION_PAGE_IDS.dashboard },
    { name: t('config.appNavItems.المحافظات', 'المحافظات'), shortName: t('config.appNavItems.المحافظات', 'المحافظات'), icon: Map, path: '/governorates', pageId: PERMISSION_PAGE_IDS.governorates },
    { name: t('config.appNavItems.المناطق', 'المناطق'), shortName: t('config.appNavItems.المناطق', 'المناطق'), icon: MapPin, path: '/regions', pageId: PERMISSION_PAGE_IDS.regions },
    { name: t('config.appNavItems.القرى', 'القرى'), shortName: t('config.appNavItems.القرى', 'القرى'), icon: Home, path: '/villages', pageId: PERMISSION_PAGE_IDS.villages },
    { name: t('config.appNavItems.المدارس', 'المدارس'), shortName: t('config.appNavItems.المدارس', 'المدارس'), icon: School, path: '/schools', pageId: PERMISSION_PAGE_IDS.schools },
    { name: t('config.appNavItems.الاستكشاف', 'الاستكشاف'), shortName: t('config.appNavItems.الاستكشاف', 'الاستكشاف'), icon: Compass, path: '/explorations', pageId: PERMISSION_PAGE_IDS.explorations },
    { name: t('config.appNavItems.المنَاهِج', 'المنَاهِج'), shortName: t('config.appNavItems.المناهج', 'المناهج'), icon: BookOpen, path: '/curriculum', pageId: PERMISSION_PAGE_IDS.curriculum },
    { name: t('config.appNavItems.التقارير', 'التقارير'), shortName: t('config.appNavItems.التقارير', 'التقارير'), icon: ClipboardList, path: '/reports', pageId: PERMISSION_PAGE_IDS.reports },
    { name: t('config.appNavItems.التحضير', 'التحضير'), shortName: t('config.appNavItems.التحضير', 'التحضير'), icon: CalendarDays, path: '/daily-preparation', pageId: PERMISSION_PAGE_IDS.daily_preparation },
    { name: t('layout.nav_users', t('config.appNavItems.المستخدمين', 'المستخدمين')), shortName: t('config.appNavItems.المستخدمين', 'المستخدمين'), icon: Users, path: '/users', pageId: PERMISSION_PAGE_IDS.users },
    { name: t('config.appNavItems.إدارة_الطلاب', 'إدارة الطلاب'), shortName: t('config.appNavItems.الطلاب', 'الطلاب'), icon: GraduationCap, path: '/students-management', pageId: PERMISSION_PAGE_IDS.students_management },
    { name: t('layout.nav_notifications', t('config.appNavItems.الإشعارات', 'الإشعارات')), shortName: t('config.appNavItems.الإشعارات', 'الإشعارات'), icon: Bell, path: '/notifications', pageId: PERMISSION_PAGE_IDS.notifications },
    { name: t('layout.nav_settings', t('config.appNavItems.الإعدادات', 'الإعدادات')), shortName: t('config.appNavItems.الإعدادات', 'الإعدادات'), icon: Settings, path: '/settings', pageId: PERMISSION_PAGE_IDS.settings },
    { name: t('config.appNavItems.أنواع_المستخدمين', 'أنواع المستخدمين'), shortName: t('config.appNavItems.الأنواع', 'الأنواع'), icon: Shield, path: '/admin/user-types', pageId: PERMISSION_PAGE_IDS.admin_user_types },
    { name: t('config.appNavItems.هوية_الموقع', 'هوية الموقع'), shortName: t('config.appNavItems.الهوية', 'الهوية'), icon: Palette, path: '/admin/branding', pageId: PERMISSION_PAGE_IDS.admin_branding },
    { name: t('config.appNavItems.النصوص_الثابتة', 'النصوص الثابتة'), shortName: t('config.appNavItems.النصوص', 'النصوص'), icon: FileText, path: '/admin/site-copy', pageId: PERMISSION_PAGE_IDS.admin_site_copy },
    { name: t('config.appNavItems.أنواع_الاستكشاف', 'أنواع الاستكشاف'), shortName: t('config.appNavItems.الأنواع', 'الأنواع'), icon: Tags, path: '/admin/exploration-types', pageId: PERMISSION_PAGE_IDS.exploration_types },
  ];
}

export function filterVisibleNavItems(navItems, { canAccessPage, user }) {
  return navItems.filter((item) => {
    if (!item.pageId) return true;
    if (item.pageId === PERMISSION_PAGE_IDS.daily_preparation) {
      return (
        canAccessPage(PERMISSION_PAGE_IDS.daily_preparation) ||
        canAccessPage(PERMISSION_PAGE_IDS.reports) ||
        user?.role === 'teacher'
      );
    }
    return canAccessPage(item.pageId);
  });
}

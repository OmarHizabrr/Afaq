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

export function getAppNavItems(str) {
  return [
    { name: str('layout.nav_dashboard', 'الرئيسية'), shortName: 'الرئيسية', icon: LayoutDashboard, path: '/', pageId: PERMISSION_PAGE_IDS.dashboard },
    { name: 'المحافظات', shortName: 'المحافظات', icon: Map, path: '/governorates', pageId: PERMISSION_PAGE_IDS.governorates },
    { name: 'المناطق', shortName: 'المناطق', icon: MapPin, path: '/regions', pageId: PERMISSION_PAGE_IDS.regions },
    { name: 'القرى', shortName: 'القرى', icon: Home, path: '/villages', pageId: PERMISSION_PAGE_IDS.villages },
    { name: 'المدارس', shortName: 'المدارس', icon: School, path: '/schools', pageId: PERMISSION_PAGE_IDS.schools },
    { name: 'الاستكشاف', shortName: 'الاستكشاف', icon: Compass, path: '/explorations', pageId: PERMISSION_PAGE_IDS.explorations },
    { name: 'المنَاهِج', shortName: 'المناهج', icon: BookOpen, path: '/curriculum', pageId: PERMISSION_PAGE_IDS.curriculum },
    { name: 'التقارير', shortName: 'التقارير', icon: ClipboardList, path: '/reports', pageId: PERMISSION_PAGE_IDS.reports },
    { name: 'التحضير', shortName: 'التحضير', icon: CalendarDays, path: '/daily-preparation', pageId: PERMISSION_PAGE_IDS.daily_preparation },
    { name: str('layout.nav_users', 'المستخدمين'), shortName: 'المستخدمين', icon: Users, path: '/users', pageId: PERMISSION_PAGE_IDS.users },
    { name: 'إدارة الطلاب', shortName: 'الطلاب', icon: GraduationCap, path: '/students-management', pageId: PERMISSION_PAGE_IDS.students_management },
    { name: str('layout.nav_notifications', 'الإشعارات'), shortName: 'الإشعارات', icon: Bell, path: '/notifications', pageId: PERMISSION_PAGE_IDS.notifications },
    { name: str('layout.nav_settings', 'الإعدادات'), shortName: 'الإعدادات', icon: Settings, path: '/settings', pageId: PERMISSION_PAGE_IDS.settings },
    { name: 'أنواع المستخدمين', shortName: 'الأنواع', icon: Shield, path: '/admin/user-types', pageId: PERMISSION_PAGE_IDS.admin_user_types },
    { name: 'هوية الموقع', shortName: 'الهوية', icon: Palette, path: '/admin/branding', pageId: PERMISSION_PAGE_IDS.admin_branding },
    { name: 'النصوص الثابتة', shortName: 'النصوص', icon: FileText, path: '/admin/site-copy', pageId: PERMISSION_PAGE_IDS.admin_site_copy },
    { name: 'أنواع الاستكشاف', shortName: 'الأنواع', icon: Tags, path: '/admin/exploration-types', pageId: PERMISSION_PAGE_IDS.exploration_types },
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

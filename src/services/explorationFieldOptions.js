import translate from '../i18n/translate';
import { FIELD_TYPES_WITH_OPTIONS, normalizeOptionSourceId } from '../utils/explorationDynamicFields';

const OPTION_SOURCE_DEFS = [
  { id: 'manual', labelKey: 'services.explorationFieldOptions.يدوي_سطر_لكل_خيار', labelFallback: 'يدوي — سطر لكل خيار' },
  { id: 'governorates', labelKey: 'services.explorationFieldOptions.محافظات', labelFallback: 'محافظات' },
  {
    id: 'regions',
    labelKey: 'services.explorationFieldOptions.مناطق_اختياري_ربط_بحقل_محافظة',
    labelFallback: 'مناطق — اختياري: ربط بحقل محافظة',
  },
  {
    id: 'villages',
    labelKey: 'services.explorationFieldOptions.قرى_اختياري_ربط_بحقل_منطقة',
    labelFallback: 'قرى — اختياري: ربط بحقل منطقة',
  },
  {
    id: 'schools',
    labelKey: 'services.explorationFieldOptions.مدارس_اختياري_ربط_بحقل_قرية_أو_منطقة',
    labelFallback: 'مدارس — اختياري: ربط بحقل قرية أو منطقة',
  },
  {
    id: 'students',
    labelKey: 'services.explorationFieldOptions.طلاب_المدرسة_سجل_المدرسة_اختياري_ربط_بحقل_مدرسة',
    labelFallback: 'طلاب المدرسة (سجل المدرسة) — اختياري: ربط بحقل مدرسة',
  },
  { id: 'curriculum', labelKey: 'services.explorationFieldOptions.مواد_المنهج', labelFallback: 'مواد المنهج' },
  { id: 'exploration_types', labelKey: 'services.explorationFieldOptions.أنواع_الاستكشاف', labelFallback: 'أنواع الاستكشاف' },
  {
    id: 'new_muslims',
    labelKey: 'services.explorationFieldOptions.مهتدون_ومسلمون_قدامى_اختياري_ربط_بحقل_قرية',
    labelFallback: 'مهتدون ومسلمون قدامى — اختياري: ربط بحقل قرية',
  },
  { id: 'permission_profiles', labelKey: 'services.explorationFieldOptions.ملفات_الصلاحيات', labelFallback: 'ملفات الصلاحيات' },
  { id: 'users', labelKey: 'services.explorationFieldOptions.مستخدمون_حسب_الدور', labelFallback: 'مستخدمون (حسب الدور)' },
];

export function getExplorationOptionSources(t = translate) {
  return OPTION_SOURCE_DEFS.map(({ id, labelKey, labelFallback }) => ({
    id,
    label: t(labelKey, labelFallback),
  }));
}

/** @deprecated prefer getExplorationOptionSources(t) */
export const EXPLORATION_OPTION_SOURCES = getExplorationOptionSources();

/** مصادر تظهر لها قائمة «يعتمد على حقل» في محرر النوع */
export const EXPLORATION_OPTION_SOURCE_SUPPORTS_DEPENDS = new Set([
  'regions',
  'villages',
  'schools',
  'students',
  'new_muslims',
]);

const USER_ROLE_FILTER_DEFS = [
  { id: 'all', labelKey: 'services.explorationFieldOptions.جميع_المستخدمين', labelFallback: 'جميع المستخدمين' },
  { id: 'teacher', labelKey: 'services.explorationFieldOptions.معلمون', labelFallback: 'معلمون' },
  { id: 'student', labelKey: 'services.explorationFieldOptions.طلاب', labelFallback: 'طلاب' },
  { id: 'admin', labelKey: 'services.explorationFieldOptions.مدراء', labelFallback: 'مدراء' },
  { id: 'system_admin', labelKey: 'services.explorationFieldOptions.مدراء_نظام', labelFallback: 'مدراء نظام' },
  {
    id: 'supervisor',
    labelKey: 'services.explorationFieldOptions.مشرفون_أي_نوع_مشرف',
    labelFallback: 'مشرفون (أي نوع مشرف)',
  },
];

export function getExplorationUserRoleFilters(t = translate) {
  return USER_ROLE_FILTER_DEFS.map(({ id, labelKey, labelFallback }) => ({
    id,
    label: t(labelKey, labelFallback),
  }));
}

/** @deprecated prefer getExplorationUserRoleFilters(t) */
export const EXPLORATION_USER_ROLE_FILTERS = getExplorationUserRoleFilters();

/**
 * جلب بيانات المنصة (محافظات، مناطق، قرى، مدارس، طلاب المدرسة، منهج، أنواع استكشاف، مهتدون، صلاحيات، مستخدمون)
 * لدمج خيارات القوائم ديناميكياً.
 */
export async function loadExplorationOptionCaches(api) {
  const [
    govDocs,
    regionDocs,
    villageDocs,
    userDocs,
    schoolDocs,
    studentDocs,
    curriculumDocs,
    explorationTypeDocs,
    newMuslimDocs,
    permissionProfileDocs,
  ] = await Promise.all([
    api.getDocuments(api.getGovernoratesCollection()),
    api.getCollectionGroupDocuments('regions'),
    api.getCollectionGroupDocuments('villages'),
    api.getDocuments(api.getUsersCollection()),
    api.getCollectionGroupDocuments('schools'),
    api.getCollectionGroupDocuments('students'),
    api.getDocuments(api.getCurriculumCollection()),
    api.getDocuments(api.getExplorationTypesCollection()),
    api.getDocuments(api.getNewMuslimsCollection()),
    api.getDocuments(api.getPermissionProfilesCollection()),
  ]);

  return {
    governorates: govDocs.map((d) => ({ id: d.id, ...d.data() })),
    regions: regionDocs.map((d) => ({ id: d.id, ...d.data() })),
    villages: villageDocs.map((d) => ({ id: d.id, ...d.data() })),
    users: userDocs.map((d) => ({ id: d.id, ...d.data() })),
    schools: schoolDocs.map((d) => {
      const data = d.data() || {};
      const pathVillageId = d.ref.parent.parent?.id || '';
      return {
        id: d.id,
        ...data,
        pathVillageId: pathVillageId || data.villageId || '',
      };
    }),
    students: studentDocs.map((d) => {
      const data = d.data() || {};
      const pathSchoolId = d.ref.parent.parent?.id || '';
      return {
        id: d.id,
        ...data,
        pathSchoolId: pathSchoolId || data.schoolId || '',
      };
    }),
    curriculum: curriculumDocs.map((d) => ({ id: d.id, ...d.data() })),
    explorationTypes: explorationTypeDocs.map((d) => ({ id: d.id, ...d.data() })),
    newMuslims: newMuslimDocs.map((d) => ({ id: d.id, ...d.data() })),
    permissionProfiles: permissionProfileDocs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

function userMatchesRoleFilter(u, filter) {
  const role = String(u?.role || '');
  if (!filter || filter === 'all') return true;
  if (filter === 'teacher') return role === 'teacher';
  if (filter === 'student') return role === 'student';
  if (filter === 'admin') return role === 'admin';
  if (filter === 'system_admin') return role === 'system_admin';
  if (filter === 'supervisor') return role.includes('supervisor');
  return true;
}

/**
 * يحوّل حقل قائمة إلى أزواج { value, label } للعرض.
 * @param {object} field — حقل مخطط يحتوي optionSource و dependsOnFieldId و userRoleFilter
 * @param {Record<string, unknown>} fieldValues — قيم النموذج الحالية (للفلترة التسلسلية)
 * @param {Awaited<ReturnType<typeof loadExplorationOptionCaches>> | null} caches
 * @param {{ uid?: string, id?: string, displayName?: string, email?: string } | null} actorUser
 */
export function resolveFieldOptionPairs(field, fieldValues, caches, actorUser) {
  if (!FIELD_TYPES_WITH_OPTIONS.has(field?.fieldType)) return null;

  const src = normalizeOptionSourceId(field?.optionSource);
  const parentVal = field?.dependsOnFieldId ? String(fieldValues?.[field.dependsOnFieldId] ?? '').trim() : '';

  if (src === 'manual') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return opts.map((o) => ({ value: String(o), label: String(o) }));
  }

  if (!caches) return [];

  if (src === 'governorates') {
    return caches.governorates.map((g) => ({
      value: g.id,
      label: String(g.name ?? g.id),
    }));
  }

  if (src === 'regions') {
    let rows = caches.regions;
    if (parentVal) rows = rows.filter((r) => String(r.govId || '') === parentVal);
    return rows.map((r) => ({
      value: r.id,
      label: String(r.name ?? r.id),
    }));
  }

  if (src === 'villages') {
    let rows = caches.villages;
    if (parentVal) rows = rows.filter((v) => String(v.regionId || '') === parentVal);
    return rows.map((v) => ({
      value: v.id,
      label: String(v.villageName ?? v.name ?? v.id),
    }));
  }

  if (src === 'schools') {
    let rows = caches.schools || [];
    if (parentVal) {
      rows = rows.filter((s) => {
        const vid = String(s.villageId || s.pathVillageId || '');
        const rid = String(s.regionId || '');
        return vid === parentVal || rid === parentVal;
      });
    }
    return rows.map((s) => ({
      value: s.id,
      label: String(s.name ?? s.id),
    }));
  }

  if (src === 'students') {
    let rows = caches.students || [];
    if (parentVal) {
      rows = rows.filter((s) => String(s.schoolId || s.pathSchoolId || '') === parentVal);
    }
    return rows.map((s) => ({
      value: s.id,
      label: String(s.name ?? s.displayName ?? s.fullName ?? s.id),
    }));
  }

  if (src === 'curriculum') {
    const rows = caches.curriculum || [];
    return rows.map((c) => ({
      value: c.id,
      label: String(c.name ?? c.title ?? c.id),
    }));
  }

  if (src === 'exploration_types') {
    const rows = caches.explorationTypes || [];
    return rows.map((t) => ({
      value: t.id,
      label: String(t.name ?? t.id),
    }));
  }

  if (src === 'new_muslims') {
    let rows = caches.newMuslims || [];
    if (parentVal) rows = rows.filter((m) => String(m.villageId || '') === parentVal);
    return rows.map((m) => ({
      value: m.id,
      label: String(m.name ?? m.id),
    }));
  }

  if (src === 'permission_profiles') {
    const rows = caches.permissionProfiles || [];
    return rows.map((p) => ({
      value: p.id,
      label: String(p.name ?? p.id),
    }));
  }

  if (src === 'users') {
    const filter = field.userRoleFilter || 'all';
    const rows = caches.users.filter((u) => userMatchesRoleFilter(u, filter));
    return rows.map((u) => ({
      value: u.id,
      label: String(u.displayName || u.email || u.id),
    }));
  }

  return [];
}

/**
 * دمج المخطط مع أزواج الخيارات المحلولة لكل حقل قائمة.
 */
export function buildFieldsWithResolvedOptions(schemaFields, fieldValues, caches, actorUser) {
  if (!Array.isArray(schemaFields)) return [];
  return schemaFields.map((f) => {
    const pairs = resolveFieldOptionPairs(f, fieldValues || {}, caches, actorUser);
    if (pairs == null) return { ...f, optionPairs: undefined };
    return { ...f, optionPairs: pairs };
  });
}

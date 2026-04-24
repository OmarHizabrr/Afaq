import { isSystemAdmin } from './systemRoles';

/**
 * نطاق عرض البيانات المرتبط بأنواع الصلاحيات:
 * - `all`: كل السجلات (السلوك السابق).
 * - `membership`: فقط ما يرتبط بمجموعات المستخدم (Mygroup/* معرف المجموعة = مدرسة أو منطقة أو قرية).
 */

export const DATA_SCOPE_ALL = 'all';
export const DATA_SCOPE_MEMBERSHIP = 'membership';

export function normalizeDataScope(value) {
  return value === DATA_SCOPE_MEMBERSHIP ? DATA_SCOPE_MEMBERSHIP : DATA_SCOPE_ALL;
}

export function resolvePageDataScope(user, pages, pageId) {
  if (!pageId) return DATA_SCOPE_ALL;
  if (user?.role === 'admin' || isSystemAdmin(user)) return DATA_SCOPE_ALL;
  const cfg = pages?.[pageId];
  if (!cfg || typeof cfg !== 'object') return DATA_SCOPE_ALL;
  return normalizeDataScope(cfg.dataScope);
}

/** معرفات المجموعات من مرآة عضوية المستخدم (معرّف المستند = معرّف المجموعة). */
export async function loadMembershipGroupIdsFromMirrors(api, userId) {
  if (!userId) return new Set();
  const docs = await api.getDocuments(api.getUserMembershipMirrorCollection(userId));
  return new Set(docs.map((d) => d.id).filter(Boolean));
}

/**
 * يوسّع معرفات المرآة: لكل مدرسة يضيف منطقة الأم وقرية الأم؛
 * لكل قرية في المرآة يضيف منطقة الأم — دون تغيير قائمة المرآة الأصلية (تُستخدم لتصفية القرى).
 */
export async function expandMembershipGroupIdsForDataScope(api, mirrorGroupIds) {
  const expanded = new Set(mirrorGroupIds);
  if (!mirrorGroupIds || mirrorGroupIds.size === 0) return expanded;

  const [schoolDocs, villageDocs, regionDocs] = await Promise.all([
    api.getCollectionGroupDocuments('schools'),
    api.getCollectionGroupDocuments('villages'),
    api.getCollectionGroupDocuments('regions'),
  ]);

  const regionIdSet = new Set(regionDocs.map((d) => d.id));
  const villageIdSet = new Set(villageDocs.map((d) => d.id));
  const villageToRegion = {};
  villageDocs.forEach((d) => {
    const data = d.data() || {};
    villageToRegion[d.id] = data.regionId || '';
  });

  const schoolIdToRegionId = new Map();
  const schoolIdToVillageId = new Map();
  schoolDocs.forEach((d) => {
    const data = d.data() || {};
    const vid = data.villageId || d.ref.parent.parent?.id || '';
    const rid = villageToRegion[vid] || data.regionId || '';
    if (rid) schoolIdToRegionId.set(d.id, rid);
    if (vid) schoolIdToVillageId.set(d.id, vid);
  });

  for (const gid of mirrorGroupIds) {
    if (villageIdSet.has(gid)) {
      const rid = villageToRegion[gid] || '';
      if (rid) expanded.add(rid);
      continue;
    }
    if (regionIdSet.has(gid)) continue;
    const rid = schoolIdToRegionId.get(gid);
    if (rid) expanded.add(rid);
    const vid = schoolIdToVillageId.get(gid);
    if (vid) expanded.add(vid);
  }

  return expanded;
}

/**
 * قرى ضمن النطاق: مدارس مُصفّاة، أو قرية/منطقة وردت في مرآة العضوية (وليس فقط منطقة مُشتقة من مدرسة)،
 * حتى لا تُعرض كل قرى المنطقة لمعلّم عضو في مدرسة واحدة.
 */
export function filterVillagesByScope(villages, groupIds, scopedSchools, scope, mirrorGroupIds = null) {
  if (scope !== DATA_SCOPE_MEMBERSHIP || !groupIds?.size) return villages;
  const villageIdsFromSchools = new Set(
    scopedSchools.map((s) => s.villageId || s.pathVillageId).filter(Boolean)
  );
  const mirror = mirrorGroupIds;
  return villages.filter((v) => {
    if (groupIds.has(v.id)) return true;
    if (villageIdsFromSchools.has(v.id)) return true;
    if (mirror && mirror.size > 0 && mirror.has(v.regionId)) return true;
    return false;
  });
}

/** مستخدمون يظهرون كأعضاء في إحدى مجموعات المعرّفات (مدرسة/منطقة/قرية). */
export async function loadPeerUserIdsForGroups(api, groupIds) {
  const ids = new Set();
  if (!groupIds || groupIds.size === 0) return ids;
  await Promise.all(
    [...groupIds].map(async (gid) => {
      const docs = await api.getDocuments(api.getGroupMembersCollection(gid));
      docs.forEach((d) => {
        const uid = d.data()?.userId || d.id;
        if (uid) ids.add(uid);
      });
    })
  );
  return ids;
}

export function filterSchoolsByScope(schools, groupIds, scope) {
  if (scope !== DATA_SCOPE_MEMBERSHIP || !groupIds?.size) return schools;
  return schools.filter((s) => groupIds.has(s.id));
}

export function filterRegionsByScope(regions, groupIds, scope) {
  if (scope !== DATA_SCOPE_MEMBERSHIP || !groupIds?.size) return regions;
  return regions.filter((r) => groupIds.has(r.id));
}

export function filterGovernoratesByScope(governorates, scopedRegions, scope) {
  if (scope !== DATA_SCOPE_MEMBERSHIP) return governorates;
  const govIds = new Set(scopedRegions.map((r) => r.govId).filter(Boolean));
  if (govIds.size === 0) return [];
  return governorates.filter((g) => govIds.has(g.id));
}

export function filterUsersByScope(users, peerUserIds, actorId, scope) {
  if (scope !== DATA_SCOPE_MEMBERSHIP || !peerUserIds?.size) return users;
  return users.filter((u) => u.id === actorId || peerUserIds.has(u.id));
}

export function studentRowMatchesScope(row, groupIds, scope) {
  if (scope !== DATA_SCOPE_MEMBERSHIP || !groupIds?.size) return true;
  const primary = row.primarySchoolId || '';
  if (primary && groupIds.has(primary)) return true;
  const mems = row.memberships || [];
  return mems.some(
    (m) =>
      (m.schoolId && groupIds.has(m.schoolId)) ||
      (m.villageId && groupIds.has(m.villageId)) ||
      (m.regionId && groupIds.has(m.regionId))
  );
}

export function reportMatchesScope(rpt, groupIds, actorId, scope) {
  if (scope !== DATA_SCOPE_MEMBERSHIP || !groupIds?.size) return true;
  if (rpt.supervisorId === actorId || rpt.teacherId === actorId) return true;
  const sid = rpt.schoolId || '';
  if (sid && groupIds.has(sid)) return true;
  return false;
}

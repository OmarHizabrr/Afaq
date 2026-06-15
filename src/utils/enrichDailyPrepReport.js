import { attendanceSummaryText } from './attendanceStatus';

/** استكمال بيانات تقرير التحضير الناقصة للعرض في التقارير */
export async function enrichDailyPrepReport(api, report, ownerId = '') {
  if (!report) return report;
  const enriched = { ...report };

  if (enriched.schoolId && !enriched.schoolName) {
    const schools = await api.getCollectionGroupDocuments('schools');
    const sch = schools.find((s) => s.id === enriched.schoolId);
    enriched.schoolName = (sch?.data()?.name || '').trim() || enriched.schoolId;
  }

  const teacherUid = enriched.teacherId || ownerId;
  if (!enriched.teacherName && teacherUid) {
    try {
      const userDoc = await api.getData(api.getUserDoc(teacherUid));
      enriched.teacherName = userDoc?.displayName || userDoc?.name || '';
    } catch {
      enriched.teacherName = enriched.teacherName || '';
    }
  }

  if (!enriched.attendanceSummary && Array.isArray(enriched.records) && enriched.records.length > 0) {
    enriched.attendanceSummary = attendanceSummaryText(enriched.records);
  }

  return enriched;
}

export async function enrichDailyPrepReportsBatch(api, reports) {
  if (!reports?.length) return reports;

  const [schools, users] = await Promise.all([
    api.getCollectionGroupDocuments('schools'),
    api.getDocuments(api.getUsersCollection()),
  ]);

  const schoolMap = Object.fromEntries(
    schools.map((s) => [s.id, (s.data()?.name || '').trim() || s.id])
  );
  const userMap = Object.fromEntries(
    users.map((u) => [u.id, u.data()?.displayName || u.data()?.name || ''])
  );

  return reports.map((r) => ({
    ...r,
    schoolName: r.schoolName || schoolMap[r.schoolId] || '',
    teacherName: r.teacherName || userMap[r.teacherId || r._ownerId] || '',
    attendanceSummary:
      r.attendanceSummary ||
      (Array.isArray(r.records) && r.records.length ? attendanceSummaryText(r.records) : ''),
  }));
}

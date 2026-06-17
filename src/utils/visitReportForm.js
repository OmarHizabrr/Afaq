export async function loadVisitEditOptions(api) {
  const [schoolDocs, villageDocs, curriculumDocs] = await Promise.all([
    api.getCollectionGroupDocuments('schools'),
    api.getCollectionGroupDocuments('villages'),
    api.getDocuments(api.getCurriculumCollection()),
  ]);

  const villages = villageDocs
    .map((d) => ({
      id: d.id,
      name: (d.data()?.villageName || '').trim() || d.id,
      regionId: d.data()?.regionId || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const villageNameById = Object.fromEntries(villages.map((v) => [v.id, v.name]));

  const schools = schoolDocs
    .map((d) => {
      const data = d.data() || {};
      const villageId = data.villageId || d.ref.parent?.parent?.id || '';
      return {
        id: d.id,
        name: (data.name || '').trim() || d.id,
        villageId,
        villageName: villageNameById[villageId] || data.villageName || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const curriculum = curriculumDocs.map((d) => ({ id: d.id, ...d.data() }));

  return { schools, villages, curriculum };
}

export function resolveVisitEditIds(report, { schools = [], curriculum = [] } = {}) {
  let schoolId = report.schoolId || '';
  if (!schoolId && report.schoolName) {
    schoolId = schools.find((s) => s.name === report.schoolName)?.id || '';
  }

  const school = schools.find((s) => s.id === schoolId);
  let villageId = report.villageId || school?.villageId || '';

  let subjectId = report.subjectId || '';
  if (!subjectId && report.subjectName) {
    subjectId = curriculum.find((c) => c.name === report.subjectName)?.id || '';
  }

  const week = report.week != null && report.week !== '' ? String(report.week) : '';

  return { schoolId, villageId, subjectId, week };
}

export function buildVisitSavePayload(visitEdit, { schools = [], villages = [], curriculum = [] } = {}) {
  const school = schools.find((s) => s.id === visitEdit.schoolId);
  const village = villages.find((v) => v.id === visitEdit.villageId);
  const subject = curriculum.find((c) => c.id === visitEdit.subjectId);

  return {
    schoolId: visitEdit.schoolId || '',
    schoolName: school?.name || visitEdit.schoolName || '',
    villageId: visitEdit.villageId || school?.villageId || '',
    villageName: village?.name || school?.villageName || visitEdit.villageName || '',
    subjectId: visitEdit.subjectId || '',
    subjectName: subject?.name || visitEdit.subjectName || '',
    week: visitEdit.week || '',
    generalNotes: visitEdit.generalNotes || '',
    teacherRating: visitEdit.teacherRating,
    villageRating: visitEdit.villageRating,
  };
}

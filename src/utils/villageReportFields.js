export const emptyVillageReportFields = () => ({
  teacherVillageActivities: [],
  institutionVillageActivities: [],
  fridaySermons: [],
  newConvertsCount: '',
  hasInstitutionProjects: '',
  institutionProjectsStatus: '',
  villageNotes: '',
});

export const normalizeStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
};

export const villageReportFromStored = (data = {}) => ({
  teacherVillageActivities: normalizeStringList(data.teacherVillageActivities),
  institutionVillageActivities: normalizeStringList(data.institutionVillageActivities),
  fridaySermons: normalizeStringList(data.fridaySermons),
  newConvertsCount: data.newConvertsCount ?? '',
  hasInstitutionProjects: data.hasInstitutionProjects || '',
  institutionProjectsStatus: data.institutionProjectsStatus || '',
  villageNotes: data.villageNotes || '',
});

export const villageReportToPayload = (fields = {}) => ({
  teacherVillageActivities: normalizeStringList(fields.teacherVillageActivities),
  institutionVillageActivities: normalizeStringList(fields.institutionVillageActivities),
  fridaySermons: normalizeStringList(fields.fridaySermons),
  newConvertsCount: Number(fields.newConvertsCount || 0),
  hasInstitutionProjects: fields.hasInstitutionProjects || '',
  institutionProjectsStatus:
    fields.hasInstitutionProjects === 'نعم' ? fields.institutionProjectsStatus || '' : '',
  villageNotes: fields.villageNotes || '',
});

export const villageReportHasContent = (data = {}) => {
  const v = villageReportFromStored(data);
  return (
    v.teacherVillageActivities.length > 0 ||
    v.institutionVillageActivities.length > 0 ||
    v.fridaySermons.length > 0 ||
    Number(v.newConvertsCount) > 0 ||
    v.hasInstitutionProjects ||
    v.villageNotes ||
    data.notes
  );
};

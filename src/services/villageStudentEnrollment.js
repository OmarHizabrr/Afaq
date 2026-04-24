import FirestoreApi from './firestoreApi';

/** مهتد جديد (يُحسب مع المهتدين) */
export const MUSLIM_CATEGORY_CONVERT = 'convert';
/** مسلم قديم (يُحسب مع المسلمين القدامى) */
export const MUSLIM_CATEGORY_BORN = 'born';

export function normalizeMuslimCategory(raw) {
  return raw === MUSLIM_CATEGORY_BORN ? MUSLIM_CATEGORY_BORN : MUSLIM_CATEGORY_CONVERT;
}

export function villageMuslimCounterFields(items) {
  const list = (items || []).map((m) => ({
    type: m.type || 'رجل',
    muslimCategory: normalizeMuslimCategory(m.muslimCategory),
  }));
  const converts = list.filter((m) => m.muslimCategory !== MUSLIM_CATEGORY_BORN);
  const born = list.filter((m) => m.muslimCategory === MUSLIM_CATEGORY_BORN);
  return {
    newMuslimsMen: converts.filter((m) => m.type === 'رجل').length,
    newMuslimsWomen: converts.filter((m) => m.type === 'امرأة').length,
    newMuslimsChildren: converts.filter((m) => m.type === 'طفل').length,
    existingMuslimsMen: born.filter((m) => m.type === 'رجل').length,
    existingMuslimsWomen: born.filter((m) => m.type === 'امرأة').length,
    existingMuslimsChildren: born.filter((m) => m.type === 'طفل').length,
  };
}

export async function findFirstSchoolIdInVillage(api, villageId) {
  const docs = await api.getCollectionGroupDocuments('schools');
  const list = docs
    .filter((d) => (d.data()?.villageId || '') === villageId)
    .map((d) => ({ id: d.id, name: (d.data()?.name || '').trim() }));
  list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return list[0]?.id || null;
}

/**
 * يربط الشخص كطالب في أول مدرسة بالقرية، وينشئ مستخدم role=student بنفس المعرف.
 */
export async function enrollVillagePersonAsStudent(api, {
  personId,
  villageId,
  displayName,
  listingType,
  muslimCategory,
  teacherId = '',
}) {
  const schoolId = await findFirstSchoolIdInVillage(api, villageId);
  if (!schoolId) {
    const e = new Error('NO_SCHOOL_IN_VILLAGE');
    e.code = 'NO_SCHOOL_IN_VILLAGE';
    throw e;
  }

  const cat = normalizeMuslimCategory(muslimCategory);
  const studentData = {
    studentName: displayName,
    age: 0,
    schoolId,
    villageId,
    teacherId,
    muslimListingType: listingType || 'رجل',
    muslimCategory: cat,
  };

  await api.setData({ docRef: api.getSchoolStudentDoc(schoolId, personId), data: studentData });
  await api.setData({
    docRef: api.getGroupMemberDoc(schoolId, personId),
    data: { ...studentData, id: personId, type: 'student' },
  });
  await api.setData({
    docRef: api.getUserMembershipMirrorDoc(personId, schoolId),
    data: { schoolId, villageId, studentName: displayName },
  });
  await api.setData({
    docRef: api.getUserDoc(personId),
    data: {
      uid: personId,
      displayName,
      role: 'student',
      email: '',
      photoURL: '',
      phoneNumber: '',
      password: '',
      permissionProfileId: null,
      accountDisabled: false,
      villageId,
      primarySchoolId: schoolId,
    },
    merge: true,
  });

  return { schoolId };
}

export async function syncStudentDisplayNameAcrossStores(api, studentId, newName) {
  const userRef = api.getUserDoc(studentId);
  await api.updateData({ docRef: userRef, data: { displayName: newName } });

  const mirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(studentId));
  for (const d of mirrors) {
    const data = d.data() || {};
    const groupId = d.id;
    if (data.schoolId) {
      await api.updateData({
        docRef: api.getSchoolStudentDoc(data.schoolId, studentId),
        data: { studentName: newName },
      });
    }
    await api.updateData({
      docRef: api.getUserMembershipMirrorDoc(studentId, groupId),
      data: { studentName: newName },
    });
  }

  const nmRef = api.getNewMuslimDoc(studentId);
  const nm = await api.getData(nmRef);
  if (nm) {
    await api.updateData({ docRef: nmRef, data: { name: newName } });
  }
}

/** مزامنة نوع السجل (رجل/…) والفئة (مهتد/مسلم قديم) مع وثيقة الطالب وعضو المجموعة */
export async function syncVillageListingPersonStudentFields(api, personId, { listingType, muslimCategory }) {
  const mirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(personId));
  const schoolMirror = mirrors.find((d) => (d.data() || {}).schoolId);
  if (!schoolMirror) return;
  const schoolId = schoolMirror.data().schoolId;
  const cat = normalizeMuslimCategory(muslimCategory);
  const lt = listingType || 'رجل';
  const patch = { muslimListingType: lt, muslimCategory: cat };
  await api.updateData({ docRef: api.getSchoolStudentDoc(schoolId, personId), data: patch });
  await api.updateData({ docRef: api.getGroupMemberDoc(schoolId, personId), data: patch });
}

/** حذف سجل القرية (مهتد/مسلم قديم) إن وُجد، مع مستخدم الطالب وعضوياته ووثيقة الطالب في المدرسة */
export async function deleteVillageListedPersonFully(api, personId) {
  const nmRef = api.getNewMuslimDoc(personId);
  const nm = await api.getData(nmRef);
  if (nm) {
    await api.deleteData(nmRef);
  }

  const mirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(personId));
  for (const docSnap of mirrors) {
    const data = docSnap.data() || {};
    const groupId = docSnap.id;
    if (data.schoolId) {
      await api.deleteData(api.getSchoolStudentDoc(data.schoolId, personId));
      await api.deleteData(api.getGroupMemberDoc(data.schoolId, personId));
    } else if (data.regionId) {
      await api.deleteData(api.getGroupMemberDoc(data.regionId, personId));
    }
    await api.deleteData(api.getUserMembershipMirrorDoc(personId, groupId));
  }

  try {
    await api.deleteData(api.getUserDoc(personId));
  } catch {
    /* قد لا يوجد */
  }
}

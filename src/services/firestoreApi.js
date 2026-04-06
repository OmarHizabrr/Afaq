import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  getCountFromServer,
  collectionGroup
} from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

/**
 * FirestoreApi - JavaScript Service
 * - جميع عمليات الكتابة تمر عبر setData/updateData حصراً.
 * - لا توجد try/catch داخل الدوال (الأخطاء تذهب للمستدعي).
 * - التعليقات باللغة العربية.
 */
class FirestoreApi {
  static get Api() {
    return new FirestoreApi();
  }

  // ==============================
  // دوال مرجعية بسيطة
  // ==============================

  /** الحصول على ID جديد */
  getNewId(collectionName) {
    return doc(collection(db, collectionName)).id;
  }

  /** إرجاع مرجع لمجموعة */
  getCollection(collectionName) {
    return collection(db, collectionName);
  }

  /** إرجاع مرجع لمستند */
  getDocument(collectionName, documentId) {
    return doc(db, collectionName, documentId);
  }

  /** إرجاع مرجع لمجموعة فرعية */
  getSubCollection(collectionName, documentId, subCollectionName) {
    return collection(db, collectionName, documentId, subCollectionName);
  }

  /** إرجاع مرجع لمستند داخل مجموعة فرعية */
  getSubDocument(collectionName, documentId, subCollectionName, subDocumentId) {
    return doc(db, collectionName, documentId, subCollectionName, subDocumentId);
  }

  // ==============================
  // دوال CRUD الأساسية
  // ==============================

  /** إنشاء أو تعيين بيانات مستند - النقطة المركزية للكتابة */
  async setData({ docRef, data, merge = true, userData = {} }) {
    const newData = {
      ...data,
      createdByName: userData.displayName || '',
      createdByImageUrl: userData.photoURL || '',
      createdBy: userData.uid || '',
      createTimes: serverTimestamp(),
      updatedTimes: serverTimestamp(),
    };

    await setDoc(docRef, newData, { merge });
  }

  /** تحديث بيانات مستند - النقطة المركزية للتحديث */
  async updateData({ docRef, data, userData = {} }) {
    const updatedData = { ...data };

    // التحقق من الحقول الأساسية وإضافتها إذا كانت ناقصة
    if (!updatedData.updateByName) {
      updatedData.updateByName = userData.displayName || '';
    }
    if (!updatedData.updateByImageUrl) {
      updatedData.updateByImageUrl = userData.photoURL || '';
    }
    
    updatedData.updatedTimes = serverTimestamp();

    await updateDoc(docRef, updatedData);
  }

  /** جلب بيانات مستند */
  async getData(docRef) {
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  /** حذف مستند */
  async deleteData(docRef) {
    await deleteDoc(docRef);
  }

  // ==============================
  // دوال التعامل مع المجموعات (Queries)
  // ==============================

  /** جلب مستندات من مجموعة مع فلترة */
  async getDocuments(colRef, { whereField, isEqualTo, limitCount } = {}) {
    let q = colRef;
    if (whereField) {
      q = query(q, where(whereField, "==", isEqualTo));
    }
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs;
  }

  /** تدفق مباشر (Stream/Snapshots) للمجموعة */
  collectionStream(colRef, { whereField, isEqualTo, limitCount, orderField, descending = false } = {}) {
    let q = colRef;
    if (whereField) {
      q = query(q, where(whereField, "==", isEqualTo));
    }
    if (orderField) {
      q = query(q, orderBy(orderField, descending ? "desc" : "asc"));
    }
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    return onSnapshot(q, (snapshot) => snapshot);
  }

  /** جلب جميع المستندات في مجموعة عبر جميع المسارات (Collection Group) */
  async getCollectionGroupDocuments(collectionName) {
    const q = query(collectionGroup(db, collectionName));
    const snapshot = await getDocs(q);
    return snapshot.docs;
  }

  // ==============================
  // دوال إحصائية (Count)
  // ==============================

  /** جلب عدد المستندات في مجموعة بشكل سريع */
  async getCollectionCount(collectionPath) {
    const colRef = collection(db, collectionPath);
    const snapshot = await getCountFromServer(colRef);
    return snapshot.data().count;
  }

  /** جلب عدد المستندات في مجموعة فرعية */
  async getSubCollectionCount(parentCol, parentId, subCol) {
    const colRef = collection(db, parentCol, parentId, subCol);
    const snapshot = await getCountFromServer(colRef);
    return snapshot.data().count;
  }

  /** جلب عدد جميع المستندات في Collection Group */
  async getAllCount(collectionName) {
    const q = query(collectionGroup(db, collectionName));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  }
}

export default FirestoreApi;

import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import FirestoreApi from "./firestoreApi";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../firebase";

/**
 * AuthService - Handles Google Authentication and Profile Persistence
 */
class AuthService {
  static get Api() {
    return new AuthService();
  }

  /** تسجيل الدخول عبر جوجل */
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // حفظ/تحديث الملف الشخصي في Firestore
      await this.syncUserToFirestore(user);

      return user;
    } catch (error) {
      console.error("خطأ في تسجيل الدخول:", error);
      throw error;
    }
  }

  /** مزامنة بيانات المستخدم مع Firestore */
  async syncUserToFirestore(user) {
    const api = FirestoreApi.Api;
    const docRef = api.getDocument("users", user.uid);

    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
      role: "unassigned", // يتم تحديد الصلاحيات لاحقاً كما طلب المستخدم
    };

    // نستخدم setData مع merge لحفظ البيانات
    await api.setData({ 
      docRef, 
      data: userData, 
      userData: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL } 
    });
  }

  /** تسجيل الخروج */
  async signOut() {
    localStorage.removeItem('afaq_custom_auth_uid');
    await firebaseSignOut(auth);
  }

  /** تسجيل الدخول برقم الهاتف وكلمة المرور (دخول يدوي مفصول عن حساب جوجل) */
  async signInWithPhone(phoneNumber, password) {
    try {
      // البحث في مجموعة users عن رقم الهاتف وكلمة المرور المشفرة/النصية
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber), where("password", "==", password));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة.");
      }

      const userDoc = querySnapshot.docs[0];
      const customUser = { uid: userDoc.id, ...userDoc.data() };
      
      // حفظ الجلسة محلياً 
      localStorage.setItem('afaq_custom_auth_uid', customUser.uid);
      
      // إعادة تحميل الصفحة لتطبيق الجلسة المخصصة (أبسط حل لربط حالة React)
      window.location.href = '/';
      return customUser;

    } catch (error) {
      console.error("خطأ في تسجيل الدخول برقم الهاتف:", error);
      throw error;
    }
  }

  /** مراقب حالة تسجيل الدخول (يدمج بين مصادقة جوجل والمصادقة المخصصة) */
  onAuthChange(callback) {
    const customAuthUid = localStorage.getItem('afaq_custom_auth_uid');

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // حالة: مسجل دخول بحساب جوجل الرسمي
        callback(firebaseUser);
      } else {
        // حالة: غير مسجل بجوجل... لنفحص الجلسة المخصصة
        if (customAuthUid) {
          // جلب بيانات المستخدم المخصص من Firestore
          try {
            const api = FirestoreApi.Api;
            const docRef = api.getDocument("users", customAuthUid);
            const userData = await api.getData(docRef);
            if (userData) {
              // إرسال كائن مستخدم وهمي يحمل الـ uid واسمه ليتعامل معه التطبيق كأنه حقيقي
              callback({ uid: customAuthUid, id: customAuthUid, ...userData });
            } else {
              localStorage.removeItem('afaq_custom_auth_uid');
              callback(null);
            }
          } catch (e) {
            callback(null);
          }
        } else {
          // غير مسجل دخولك نهائياً
          callback(null);
        }
      }
    });
  }
}

export default AuthService;

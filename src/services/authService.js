import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import FirestoreApi from "./firestoreApi";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../firebase";

/** رسالة تُعرض في صفحة الدخول بعد إخراج حساب معطّل */
export const ACCOUNT_BLOCKED_SESSION_KEY = "afaq_account_blocked";
export const ACCOUNT_BLOCKED_MESSAGE =
  "تم تعطيل هذا الحساب ولا يمكنه استخدام المنصة. تواصل مع الإدارة.";

function setBlockedSessionMessage() {
  try {
    sessionStorage.setItem(ACCOUNT_BLOCKED_SESSION_KEY, ACCOUNT_BLOCKED_MESSAGE);
  } catch {
    /* ignore */
  }
}

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
    const docRef = api.getUserDoc(user.uid);
    
    // Check if user already exists to preserve their role
    const existingDoc = await api.getData(docRef);

    if (existingDoc?.accountDisabled === true) {
      setBlockedSessionMessage();
      await firebaseSignOut(auth);
      throw new Error("ACCOUNT_DISABLED");
    }
    
    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
    };

    // أي مستخدم Google جديد يعتبر طالباً افتراضياً
    if (!existingDoc || !existingDoc.role) {
      userData.role = "student";
    }

    // Merge data - specifically don't overwrite role if it exists
    await api.setData({ 
      docRef, 
      data: userData, 
      merge: true
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
      const data = userDoc.data();
      if (data?.accountDisabled === true) {
        setBlockedSessionMessage();
        const e = new Error("ACCOUNT_DISABLED");
        throw e;
      }
      const customUser = { uid: userDoc.id, ...data };
      
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
        // Fetch full Firestore profile for Google users too
        try {
          const api = FirestoreApi.Api;
          const docRef = api.getUserDoc(firebaseUser.uid);
          const userData = await api.getData(docRef);
          
          if (userData) {
            if (userData.accountDisabled === true) {
              setBlockedSessionMessage();
              await firebaseSignOut(auth);
              callback(null);
              return;
            }
            callback({ ...firebaseUser, ...userData, uid: firebaseUser.uid, id: firebaseUser.uid });
          } else {
            callback({ ...firebaseUser, uid: firebaseUser.uid, id: firebaseUser.uid });
          }
        } catch (e) {
          callback(firebaseUser);
        }
      } else {
        // حالة: غير مسجل بجوجل... لنفحص الجلسة المخصصة
        if (customAuthUid) {
          // جلب بيانات المستخدم المخصص من Firestore
          try {
            const api = FirestoreApi.Api;
            const docRef = api.getUserDoc(customAuthUid);
            const userData = await api.getData(docRef);
            if (userData) {
              if (userData.accountDisabled === true) {
                setBlockedSessionMessage();
                localStorage.removeItem('afaq_custom_auth_uid');
                callback(null);
                return;
              }
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

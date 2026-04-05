import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import FirestoreApi from "./firestoreApi";

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
    await firebaseSignOut(auth);
  }

  /** مراقب حالة تسجيل الدخول */
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export default AuthService;

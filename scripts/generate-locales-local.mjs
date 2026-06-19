/**
 * يولّد en.json و sn.json من ar.json بترجمة محلية (بدون API).
 */
import fs from 'fs';

const ar = JSON.parse(fs.readFileSync('assets/lang/ar.json', 'utf8'));

const EN_PHRASES = [
  ['تسجيل الدخول', 'Sign in'],
  ['تسجيل الخروج', 'Sign out'],
  ['الإعدادات', 'Settings'],
  ['الإشعارات', 'Notifications'],
  ['الرئيسية', 'Home'],
  ['المحافظات', 'Governorates'],
  ['المحافظة', 'Governorate'],
  ['المناطق', 'Regions'],
  ['المنطقة', 'Region'],
  ['القرى', 'Villages'],
  ['القرية', 'Village'],
  ['المدارس', 'Schools'],
  ['المدرسة', 'School'],
  ['المستخدمين', 'Users'],
  ['المستخدمون', 'Users'],
  ['المستخدم', 'User'],
  ['الطلاب', 'Students'],
  ['الطالب', 'Student'],
  ['التقارير', 'Reports'],
  ['التقرير', 'Report'],
  ['التحضير', 'Daily preparation'],
  ['المناهج', 'Curriculum'],
  ['المادة', 'Subject'],
  ['الاستكشاف', 'Explorations'],
  ['نموذج الاستكشاف', 'Exploration form'],
  ['حقول نموذج الاستكشاف', 'Exploration form fields'],
  ['معلم', 'Teacher'],
  ['طالب', 'Student'],
  ['مدير', 'Admin'],
  ['مشرف عام', 'General supervisor'],
  ['مشرف منطقة', 'Regional supervisor'],
  ['مشرف', 'Supervisor'],
  ['جاري التحميل…', 'Loading…'],
  ['جاري التحميل...', 'Loading...'],
  ['جاري الإرسال…', 'Sending…'],
  ['جاري التفعيل…', 'Activating…'],
  ['جاري الرفع…', 'Uploading…'],
  ['غير محدد', 'Not specified'],
  ['غير محددة', 'Not specified'],
  ['أخرى', 'Other'],
  ['ممتاز', 'Excellent'],
  ['جيد جدا', 'Very good'],
  ['جيد', 'Good'],
  ['متوسط', 'Average'],
  ['مقبول', 'Acceptable'],
  ['ضعيف', 'Weak'],
  ['تأكيد', 'Confirm'],
  ['إلغاء', 'Cancel'],
  ['حفظ', 'Save'],
  ['حذف', 'Delete'],
  ['تعديل', 'Edit'],
  ['إضافة', 'Add'],
  ['بحث', 'Search'],
  ['نعم', 'Yes'],
  ['لا', 'No'],
  ['حاضر', 'Present'],
  ['غائب', 'Absent'],
  ['متأخر', 'Late'],
  ['مستأذن', 'Excused'],
  ['مريض', 'Sick'],
  ['مسافر', 'Traveling'],
  ['عرض التفاصيل', 'View details'],
  ['عرض الملف', 'View profile'],
  ['حفظ التعديلات', 'Save changes'],
  ['لغة الواجهة', 'Interface language'],
  ['اللغة', 'Language'],
  ['الاسم', 'Name'],
  ['الاسم الكامل', 'Full name'],
  ['البريد الإلكتروني', 'Email'],
  ['رقم الهاتف', 'Phone number'],
  ['كلمة المرور', 'Password'],
  ['التاريخ', 'Date'],
  ['اليوم', 'Day'],
  ['ملاحظات', 'Notes'],
  ['ملاحظات إضافية', 'Additional notes'],
  ['إغلاق', 'Close'],
  ['طباعة', 'Print'],
  ['تصدير', 'Export'],
  ['معاينة', 'Preview'],
  ['تحديث', 'Update'],
  ['تفعيل', 'Activate'],
  ['تعطيل', 'Deactivate'],
  ['نشط', 'Active'],
  ['معطل', 'Disabled'],
  ['الكل', 'All'],
  ['لا يوجد', 'None'],
  ['بدون اسم', 'No name'],
  ['بدون بريد', 'No email'],
  ['حذف نهائي', 'Delete permanently'],
  ['تأكيد الإجراء', 'Confirm action'],
  ['جاري الحفظ…', 'Saving…'],
  ['تم الحفظ', 'Saved'],
  ['حدث خطأ', 'An error occurred'],
  ['—', '—'],
].sort((a, b) => b[0].length - a[0].length);

const SN_PHRASES = [
  ['تأكيد', 'Simbisa'],
  ['إلغاء', 'Kanzura'],
  ['حفظ', 'Sevha'],
  ['حذف', 'Delete'],
  ['تعديل', 'Gadzirisa'],
  ['إضافة', 'Wedzera'],
  ['بحث', 'Tsvaga'],
  ['نعم', 'Hongu'],
  ['لا', 'Kwete'],
  ['حاضر', 'Aripo'],
  ['غائب', 'Asipo'],
  ['تسجيل الدخول', 'Pinda'],
  ['تسجيل الخروج', 'Buda'],
  ['الإعدادات', 'Zvirongwa'],
  ['الإشعارات', 'Zviziviso'],
  ['الرئيسية', 'Kumba'],
  ['المحافظات', 'Mapurovhinzi'],
  ['المناطق', 'Nzvimbo'],
  ['القرى', 'Misha'],
  ['المدارس', 'Zvikoro'],
  ['الطلاب', 'Vadzidzi'],
  ['التقارير', 'Mishumo'],
  ['التحضير', 'Kugadzirira'],
  ['المناهج', 'Zvirongwa zvedzidzo'],
  ['الاستكشاف', 'Kuongorora'],
  ['معلم', 'Mudzidzisi'],
  ['طالب', 'Mudzidzi'],
  ['مدير', 'Mutungamiri'],
  ['غير محدد', 'Hazvisi zvakajeka'],
  ['—', '—'],
  ['أخرى', 'Zvimwe'],
].sort((a, b) => b[0].length - a[0].length);

function applyPhrases(text, phrases) {
  let out = text;
  for (const [ar, en] of phrases) {
    out = out.split(ar).join(en);
  }
  return out;
}

function translateEn(text) {
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  if (text.includes('${')) {
    // translate static parts around placeholders
    return text.replace(/[\u0600-\u06FF][\u0600-\u06FF\s،.:؛؟!()\-—]*/g, (chunk) => {
      const t = applyPhrases(chunk.trim(), EN_PHRASES);
      return t === chunk.trim() && /[\u0600-\u06FF]/.test(chunk) ? chunk : t;
    });
  }
  const translated = applyPhrases(text, EN_PHRASES);
  if (/[\u0600-\u06FF]/.test(translated)) {
    // fallback: keep readable English hint prefix for review
    return `[AR] ${text}`;
  }
  return translated;
}

function translateSn(text) {
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  const translated = applyPhrases(text, SN_PHRASES);
  if (/[\u0600-\u06FF]/.test(translated)) return `[AR] ${text}`;
  return translated;
}

function walk(obj, fn) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === 'string' ? fn(v) : walk(v, fn);
  }
  return out;
}

const en = walk(ar, translateEn);
const sn = walk(ar, translateSn);

fs.writeFileSync('assets/lang/en.json', JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync('assets/lang/sn.json', JSON.stringify(sn, null, 2), 'utf8');

function countAr(obj) {
  let n = 0;
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') {
      if (v.startsWith('[AR]') || /[\u0600-\u06FF]/.test(v)) n++;
    } else n += countAr(v);
  }
  return n;
}

console.log('Generated locales. EN needs review:', countAr(en), 'SN needs review:', countAr(sn));

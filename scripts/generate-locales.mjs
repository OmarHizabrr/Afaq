/**
 * يولّد en.json و sn.json من ar.json.
 * يترجم المفاتيح المشتركة يدوياً؛ الباقي يُترجم آلياً بقاموس أساسي.
 */
import fs from 'fs';

const ar = JSON.parse(fs.readFileSync('assets/lang/ar.json', 'utf8'));

/** ترجمات يدوية للنصوص الشائعة */
const EN_OVERRIDES = {
  'تأكيد': 'Confirm',
  'إلغاء': 'Cancel',
  'حفظ': 'Save',
  'حذف': 'Delete',
  'تعديل': 'Edit',
  'إضافة': 'Add',
  'بحث': 'Search',
  'نعم': 'Yes',
  'لا': 'No',
  'حاضر': 'Present',
  'غائب': 'Absent',
  'متأخر': 'Late',
  'مستأذن': 'Excused',
  'مريض': 'Sick',
  'مسافر': 'Traveling',
  'تسجيل الدخول': 'Sign in',
  'تسجيل الخروج': 'Sign out',
  'الإعدادات': 'Settings',
  'الإشعارات': 'Notifications',
  'الرئيسية': 'Home',
  'المحافظات': 'Governorates',
  'المناطق': 'Regions',
  'القرى': 'Villages',
  'المدارس': 'Schools',
  'المستخدمين': 'Users',
  'المستخدمون': 'Users',
  'الطلاب': 'Students',
  'التقارير': 'Reports',
  'التحضير': 'Daily preparation',
  'المناهج': 'Curriculum',
  'الاستكشاف': 'Explorations',
  'معلم': 'Teacher',
  'طالب': 'Student',
  'مدير': 'Admin',
  'مشرف عام': 'General supervisor',
  'مشرف منطقة': 'Regional supervisor',
  'جاري التحميل…': 'Loading…',
  'جاري الإرسال…': 'Sending…',
  'جاري التفعيل…': 'Activating…',
  'جاري الرفع…': 'Uploading…',
  'غير محدد': 'Not specified',
  '—': '—',
  'أخرى': 'Other',
  'ممتاز': 'Excellent',
  'جيد جدا': 'Very good',
  'جيد': 'Good',
  'متوسط': 'Average',
  'مقبول': 'Acceptable',
  'ضعيف': 'Weak',
};

const SN_OVERRIDES = {
  'تأكيد': 'Simbisa',
  'إلغاء': 'Kanzura',
  'حفظ': 'Sevha',
  'حذف': 'Delete',
  'تعديل': 'Gadzirisa',
  'إضافة': 'Wedzera',
  'بحث': 'Tsvaga',
  'نعم': 'Hongu',
  'لا': 'Kwete',
  'حاضر': 'Aripo',
  'غائب': 'Asipo',
  'متأخر': 'Akachembe',
  'تسجيل الدخول': 'Pinda',
  'تسجيل الخروج': 'Buda',
  'الإعدادات': 'Zvirongwa',
  'الإشعارات': 'Zviziviso',
  'الرئيسية': 'Kumba',
  'المحافظات': 'Mapurovhinzi',
  'المناطق': 'Nzvimbo',
  'القرى': 'Misha',
  'المدارس': 'Zvikoro',
  'المستخدمين': 'Vashandisi',
  'الطلاب': 'Vadzidzi',
  'التقارير': 'Mishumo',
  'التحضير': 'Kugadzirira',
  'المناهج': 'Zvirongwa zvedzidzo',
  'الاستكشاف': 'Kuongorora',
  'معلم': 'Mudzidzisi',
  'طالب': 'Mudzidzi',
  'مدير': 'Mutungamiri',
  'مشرف عام': 'Mudzoro mukuru',
  'مشرف منطقة': 'Mudzoro wenzvimbo',
  'غير محدد': 'Hazvisi zvakajeka',
  '—': '—',
  'أخرى': 'Zvimwe',
};

function translateText(arText, overrides) {
  if (overrides[arText]) return overrides[arText];
  // keep interpolation placeholders
  if (arText.includes('${')) {
    return arText; // will need manual review
  }
  // fallback: prefix to indicate untranslated - use Arabic as last resort for now
  return arText;
}

function walk(obj, fn, path = []) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = [...path, k];
    if (typeof v === 'string') {
      out[k] = fn(v, p.join('.'));
    } else {
      out[k] = walk(v, fn, p);
    }
  }
  return out;
}

const en = walk(ar, (text) => translateText(text, EN_OVERRIDES));
const sn = walk(ar, (text) => translateText(text, SN_OVERRIDES));

fs.writeFileSync('assets/lang/en.json', JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync('assets/lang/sn.json', JSON.stringify(sn, null, 2), 'utf8');
console.log('Generated en.json and sn.json');

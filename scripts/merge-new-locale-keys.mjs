/**
 * يدمج مفاتيح ar.json الجديدة في en.json و sn.json مع ترجمة أساسية.
 */
import fs from 'fs';

const ar = JSON.parse(fs.readFileSync('assets/lang/ar.json', 'utf8'));
let en = JSON.parse(fs.readFileSync('assets/lang/en.json', 'utf8'));
let sn = JSON.parse(fs.readFileSync('assets/lang/sn.json', 'utf8'));

const EN_MAP = {
  'تأكيد الإجراء': 'Confirm action',
  'ابحث...': 'Search...',
  'لا توجد نتائج': 'No results',
  'التطبيق مثبّت': 'App installed',
  'تستخدم آفاق كتطبيق مستقل على جهازك — وصول سريع من الشاشة الرئيسية أو سطح المكتب.':
    'You are using Afaq as a standalone app on your device — quick access from the home screen or desktop.',
  'تثبيت التطبيق': 'Install app',
  'ثبّت آفاق على هاتفك أو حاسوبك للوصول السريع دون فتح المتصفح في كل مرة.':
    'Install Afaq on your phone or computer for quick access without opening the browser each time.',
  'على iPhone / iPad:': 'On iPhone / iPad:',
  'اضغط زر المشاركة': 'Tap the Share button',
  'اختر «إضافة إلى الشاشة الرئيسية»': 'Choose "Add to Home Screen"',
  'اضغط «إضافة»': 'Tap "Add"',
  'تثبيت التطبيق الآن': 'Install app now',
  'افتح الموقع من Chrome أو Edge على سطح المكتب أو أندرويد ليظهر خيار التثبيت.':
    'Open the site in Chrome or Edge on desktop or Android to see the install option.',
  'اكتب النص هنا...': 'Type text here...',
  'لم تُضف عناصر بعد. اضغط «إضافة» لإضافة عنصر جديد.':
    'No items added yet. Click "Add" to add a new item.',
  'حذف': 'Delete',
  '— اختر —': '— Select —',
  'اكتب التقييم أو الملاحظة...': 'Enter rating or note...',
  'المزيد': 'More',
  'حاضر': 'Present',
  'غائب': 'Absent',
  'السن': 'Age',
  'الملف': 'Profile',
};

const SN_MAP = {
  'تأكيد الإجراء': 'Simbisa chiito',
  'ابحث...': 'Tsvaga...',
  'لا توجد نتائج': 'Hapana mhinduro',
  'التطبيق مثبّت': 'App yaiswa',
  'تثبيت التطبيق': 'Isa app',
  'تثبيت التطبيق الآن': 'Isa app izvozvi',
  'إضافة': 'Wedzera',
  'حذف': 'Delete',
  'المزيد': 'Zvimwe',
  'حاضر': 'Aripo',
  'غائب': 'Asipo',
  'السن': 'Zera',
  'الملف': 'Profile',
  '— اختر —': '— Sarudza —',
};

function mergeTree(arNode, enNode, snNode) {
  for (const [k, v] of Object.entries(arNode)) {
    if (typeof v === 'string') {
      if (!enNode[k] || enNode[k] === v || /[\u0600-\u06FF]/.test(enNode[k])) {
        enNode[k] = EN_MAP[v] || enNode[k] || v;
      }
      if (!snNode[k] || snNode[k] === v || /[\u0600-\u06FF]/.test(snNode[k])) {
        snNode[k] = SN_MAP[v] || snNode[k] || v;
      }
    } else {
      if (!enNode[k]) enNode[k] = {};
      if (!snNode[k]) snNode[k] = {};
      mergeTree(v, enNode[k], snNode[k]);
    }
  }
}

mergeTree(ar, en, sn);
fs.writeFileSync('assets/lang/en.json', JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync('assets/lang/sn.json', JSON.stringify(sn, null, 2), 'utf8');
console.log('Merged locale files');

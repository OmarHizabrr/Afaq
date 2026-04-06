# هيكل قاعدة بيانات منصة آفاق المحدث (Afaq Foundation Database Structure)

هذا المستند يعكس الهيكلية الشاملة والمحدثة بناءً على نظام المجموعات الفرعية المتشعبة (Hierarchical Sub-collections) لضمان عزل البيانات وتنظيمها جغرافياً.

## 🧭 القواعد الأساسية
1. **النمط**: `Collection/ParentID/Collection/ChildID`.
2. **الوصول**: يتم جلب القوائم الشاملة عبر `collectionGroup`.
3. **الارتباط**: كل عنصر مرتبط تقنياً بوالده المباشر عبر المسار، ومعنوياً عبر حقل ID الوالد داخل المستند.

---

## 🏗 هيكل الكيانات (Collections)

### 🌍 1. البنية الجغرافية (Geographical Structure)

- **المحافظات**: `governorates/{govId}/`
- **المناطق**: `regions/{govId}/regions/{regionId}/`
- **القرى**: `villages/{regionId}/villages/{villageId}/`
  - تحتوي على بيانات السكان (`populationCount`, `muslimsCount`, إلخ).
- **المدارس**: `schools/{villageId}/schools/{schoolId}/`
  - تحتوي على `donorName`.

### 👤 2. المستخدمين والصلاحيات (Users & Permissions)

- **المستخدمين**: `users/{userId}/` (مجموعة مسطحة لسهولة المصادقة).
  - `role`: (`admin`, `supervisor_arab`, `supervisor_local`, `teacher`, `unassigned`).
- **تعيينات المشرفين**: `supervisor_assignments/{userId}/`
  - تحدد المنطقة (`regionId`) والمدارس المسموح بها.

### 👨‍🏫 3. العمل التربوي والميداني (Field Work)

- **الطلاب**: `students/{studentId}/` (مرتبط بـ `schoolId`).
- **المناهج**: `curriculum/{curriculumId}/` (توزيع 50 أسبوع).
- **تحضير المعلمين (يومي)**: `teacher_daily_logs/{logId}/`
- **تقارير المعلمين (أسبوعي)**: `teacher_reports/{reportId}/`
- **زيارات المشرفين**: `reports/{visitId}/`
  - تشمل تقييم المدرس والقرية وموقع GPS والمرفقات.

---

## 🛠 ملاحظات برمجية
- جلب جميع المناطق/القرى/المدارس في لوحة التحكم يتم عبر دالة `api.getCollectionGroupDocuments`.
- حذف أي عنصر يتطلب معرفة ID الوالد لإعادة تركيب المسار كاملاً.

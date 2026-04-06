# هيكل قاعدة بيانات منصة آفاق المتكامل (Afaq Foundation - High Scale Architecture)

تم اعتماد نظام "المجموعات الفرعية المتشعبة" (Hierarchical Partitioning) لجميع كيانات النظام لضمان أعلى مستويات الأداء والعزل المنطقي للبيانات الميدانية.

---

## 🌍 1. البنية الجغرافية (Geographical Structure)

| الكيان | المسار البرمجي (Firestore Path) | والده المباشر |
| :--- | :--- | :--- |
| **المحافظات** | `governorates/{govId}/` | - |
| **المناطق** | `regions/{govId}/regions/{regionId}/` | المحافظة |
| **القرى** | `villages/{regionId}/villages/{villageId}/` | المنطقة |
| **المدارس** | `schools/{villageId}/schools/{schoolId}/` | القرية |

---

## 🎓 2. العمل التعليمي (Educational Entities)

| الكيان | المسار البرمجي (Firestore Path) | والده المباشر |
| :--- | :--- | :--- |
| **الطلاب** | `students/{schoolId}/students/{studentId}/` | المدرسة |
| **المناهج** | `curriculum/{curriculumId}/` | - (مرتبطة بالأسابيع) |

---

## 📝 3. النشاط الميداني والتقارير (Reports & Logs)

| الكيان | المسار البرمجي (Firestore Path) | والده المباشر |
| :--- | :--- | :--- |
| **التحضير اليومي** | `teacher_daily_logs/{teacherId}/teacher_daily_logs/{logId}/` | المعلم |
| **التقارير الأسبوعية** | `teacher_reports/{teacherId}/teacher_reports/{reportId}/` | المعلم |
| **زيارات المشرفين** | `reports/{supervisorId}/reports/{visitId}/` | المشرف |

---

## 👤 4. الحسابات والصلاحيات (Auth & Users)

- **المستخدمين**: `users/{userId}/` (مجموعة مسطحة).
  - `role`: (`admin`, `supervisor_arab`, `supervisor_local`, `teacher`, `unassigned`).
- **تعيينات المشرفين**: `supervisor_assignments/{userId}/`
- **التوثيق**: `storage/media/...` (صور الفيديو والـ GPS مرتبطة بمعرّف التقرير).

---

## ⚙️ ملاحظات تقنية للمطورين
1. **الجلب الشامل (Global Fetching)**: جميع صفحات الإدارة تستخدم `collectionGroup` (مثل `collectionGroup("students")`) للحصول على البيانات من جميع المسارات المتشعبة دفعة واحدة.
2. **الحذف الفردي**: يتطلب حذف أي سجل معرفة `ParentID` الخاص به لإعادة بناء المسار كاملاً `getSubDocument`.
3. **الأداء**: هذا الهيكل يمنع عنق الزجاجة (Bottleneck) في الاستعلامات الكبيرة ويسمح بنمو النظام جغرافياً دون تأثر سرعة المصادقة أو العمليات الفردية.

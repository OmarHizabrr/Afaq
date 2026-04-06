# هيكل قاعدة بيانات منصة آفاق المحدث (Afaq Foundation Database Structure)

هذا المستند يعكس الهيكلية الشاملة والمحدثة بناءً على التحليل المفصل للمشروع (فصل المجموعات الفرعية).

## 🧭 القواعد الأساسية
1. **النمط**: `collection/{docId}/data`.
2. **البيانات الوصفية التلقائية**: (منشئ الطلب، الطوابع الزمنية).
3. **لا للتداخل المفرط (No Deep Nesting)**.

---

## 🏗 هيكل الكيانات (Collections)

### 👤 1. المستخدمين (Users)
`users/{userId}/`
- `role`: (`admin`, `supervisor_arab`, `supervisor_local`, `teacher`)
- بيانات الحساب والتواصل.

### 🌍 2. الموقع والقرى (Locations)
- **المحافظات**: `governorates/{govId}/`
- **المناطق**: `regions/{govId}/regions/{regionId}/` (مسار متشعب)
- **القرى**: `villages/{villageId}/` (يحتوي `regionId`, `govId`)
  - `villageName`, `groupName`, `ltiName`
  - `populationCount`, `muslimsCount`, `nonMuslimsCount`
  - `newMuslimsMen`, `newMuslimsWomen`, `newMuslimsChildren`
- **المسلمين الجدد**: `new_muslims/{muslimId}/` (مرتبط بـ `villageId`) لحفظ (الاسم، النوع).

### 🏫 3. المدارس والطلاب (Schools & Students)
- **المدارس**: `schools/{schoolId}/` (تحتوي `villageId`, `donorName` (للمشرف العربي/المدير)).
- **الطلاب**: `students/{studentId}/` (تحتوي `schoolId`)
  - `studentName`, `age`

### 👨‍🏫 4. المعلم والمنهج (Teachers & Curriculum)
- **المعلمين**: `teachers/{teacherId}/` (تحتوي `schoolId`).
- **المنهج الدراسي**: `curriculum/{curriculumId}/` (التوزيع السنوي - 50 أسبوع، أسماء الدروس لكل مادة).
- **تقارير المعلمين (الأسبوعية)**: `teacher_reports/{reportId}/` (تحتوي `teacherId`).
  - أنشطة: (خطبة الجمعة، دعوة غير المسلمين، تعليم الكبار، دروس المسجد، عقود الزواج).
  - التقدم في المنهج، الحضور والانصراف.

### 🔗 5. الإشراف والتقارير الميدانية (Supervisors & Reports)
- **التعيينات (المناطق والصلاحيات)**: `supervisor_assignments/{assignmentId}/`
  - يحدد القرى/المدارس التي يشرف عليها المشرف المحلي (المشرف العربي مفتوح له الكل).
- **التقارير اليومية للمشرف (الزيارات)**: `reports/{reportId}/`
  - التوقيت (الحضور، الانصراف)، التاريخ.
  - الطلاب (الحضور التلقائي عن طريق استبعاد الغائبين).
  - الدرس المشروح، تقييم الطلاب المختبرين/المتفوقين.
  - التقييم (من 1 إلى 10 للمدرس والقرية).
  - الملاحظات وموقع GPS.
- **سجل الغياب (غياب الطلاب للزيارة)**: `attendance/{reportId}/attendance/{studentId}/`
- **المرفقات للزيارة**: `attachments/{reportId}/attachments/{attachmentId}/` (صور/فيديو).

---

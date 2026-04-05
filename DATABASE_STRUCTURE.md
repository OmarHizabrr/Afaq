# هيكل قاعدة بيانات منصة آفاق (Afaq Foundation Database Structure)

هذا المستند يحدد القواعد والهيكلية المتبعة في قاعدة بيانات Firestore للمنصة.

## 🧭 القواعد الأساسية
1. **فصل المجموعات الفرعية (Flat Structure)**: يتم تحويل المجموعات الفرعية المتداخلة إلى مجموعات مستقلة مرتبطة بـ IDs.
2. **الارتباط**: يتم الربط بين الوثائق باستخدام الحقول (مثل `govId`, `schoolId`) بدلاً من التداخل (Nesting).
3. **نمط المسار**: `collection/{docId}/data`.
4. **البيانات الوصفية التلقائية**: كل عملية كتابة يجب أن تشمل:
   - `createdBy`, `createdByName`, `createdByImageUrl`
   - `createTimes` (Server Timestamp)
   - `updatedTimes` (Server Timestamp)

---

## 🏗 الهيكل الكامل للمجموعات (Collections)

### 👤 1. المستخدمين (Users)
`users/{userId}/`
- بيانات الحساب، الدور الوظيفي، والمعلومات الشخصية.

### 🌍 2. الهيكل الجغرافي (Locations)
- **المحافظات**: `governorates/{govId}/`
- **المناطق**: `regions/{regionId}/` (تحتوي على `govId`)
- **القرى**: `villages/{villageId}/` (تحتوي على `regionId`)

### 🏫 3. المدارس (Schools)
`schools/{schoolId}/`
- تحتوي على `villageId`.

### 👨‍🏫 4. المدرسين (Teachers)
`teachers/{teacherId}/`
- تحتوي على `schoolId`.

### 👨‍🎓 5. الطلاب (Students)
`students/{studentId}/`
- تحتوي على `schoolId`.

### 🔗 6. تكليفات المشرفين (Supervisor Assignments)
`supervisor_assignments/{assignmentId}/`
- تربط المشرف بالمواقع والمدارس المسوؤل عنها.
```json
{
  "userId": "xxx",
  "govId": "xxx",
  "regionId": "xxx",
  "villageId": "xxx",
  "schoolIds": [],
  "teacherIds": []
}
```

### 📊 7. التقارير (Reports)
`reports/{reportId}/`
- التقرير الرئيسي للزيارة الميدانية.
- يشمل: `supervisorId`, `schoolId`, `teacherId`, `attendanceCount`, `notes`, `rating`, `gps`, وكاش لأسماء الجهات (`schoolName`, etc).

### 📎 8. المرفقات (Attachments) - *نمط الربط المستقل*
`attachments/{reportId}/attachments/{attachmentId}/`
- مرتبطة بـ `reportId`.

### 📅 9. الحضور (Attendance)
`attendance/{reportId}/attendance/{studentId}/`
- سجل حضور الطلاب المرتبط بتقرير معين.

### 📚 10. المنهج (Curriculum)
`curriculum/{curriculumId}/`

### 📆 11. تقارير المدرس (Teacher Reports)
`teacher_reports/{teacherId}/reports/{reportId}/`

---

## 🔐 قواعد الأمان (Security Rules)
- تعتمد على حقل `supervisorId` و `userId` للتحقق من الصلاحيات.
- يمنع الوصول للمرفقات إلا للمصرح لهم.

# خطة الانتقال إلى App Check Strict

## الوضع الحالي
- معظم الدوال تعمل مع `enforceAppCheck: false` وتعتمد على `verifyAppCheck` في وضع WARN.
- تم الآن تفعيل حالياً الدوال التالية بوضع صارم (enforceAppCheck: true):
  - `generateFileNumber`
  - `createFileMovement`
- وضع البيئة المقترح للبدء بالتدريج:
  - المرحلة 1: `APP_CHECK_MODE=warn` (قائم حالياً)
  - المرحلة 2: تفعيل enforceAppCheck جزئياً لبعض الدوال الحرجة (تم)
  - المرحلة 3: رفع `APP_CHECK_MODE=strict` على بيئة staging + قياس معدل الفشل
  - المرحلة 4: تعميم enforceAppCheck على جميع الدوال الإنتاجية

## المعايير قبل التعميم
1. الواجهة الأمامية دمجت App Check (Web / PWA) وتم التحقق من الحصول على token.
2. معدل الفشل بسبب غياب App Check < 1% خلال 48 ساعة مراقبة.
3. لا توجد استثناءات حرجة في السجلات (`missing_app_check`).
4. تم تحديث الوثائق الداخلية ودليل نشر.

## كيفية التفعيل الكامل
1. ضبط متغير البيئة في وظائف Firebase:
```
firebase functions:config:set app.env.APP_CHECK_MODE=strict
```
(أو استخدام واجهة Google Cloud إن تم استخدام Secret Manager)
2. تعديل كل onCall:
```js
exports.someFunction = onCall({ enforceAppCheck: true }, async (req) => { /* ... */ });
```
3. إزالة منطق warn (اختياري لاحقاً) من `verifyAppCheck` أو تركه احتياطياً للقياس.

## مراقبة ما بعد التفعيل
- إنشاء Log-based Metric: `security_missing_app_check`
- تنبيه (Alert) إذا تجاوز count > 5 في 5 دقائق.
- مراجعة قناة التنبيه يومياً خلال أول أسبوع.

## خطة fallback
- في حال ارتفاع الأخطاء (>5%) يمكن مؤقتاً:
  1. إعادة المتغير إلى `warn`.
  2. أو تعطيل enforceAppCheck مؤقتاً عن الدوال الأكثر استخداماً.

## خطوات مستقبلية
- إضافة دعم App Check أيضاً في واجهة REST (إن وُجدت مستقبلاً).
- توثيق طريقة اختبار محلية مع Emulator App Check (عند توفر الدعم الرسمي الكامل).

---
تم إعداد هذه الوثيقة بتاريخ 2025-08-18 كجزء من تحسين الأمان.

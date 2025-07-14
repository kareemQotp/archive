#!/bin/bash

# Firebase Deployment Script
# نشر تحديثات نظام الإشعارات

echo "🚀 بدء نشر تحديثات Firebase..."

# تحديد المجلد الحالي
cd "$(dirname "$0")/.."

# 1. نشر قواعد Firestore والفهارس
echo "📋 نشر قواعد وفهارس Firestore..."
firebase deploy --only firestore:rules,firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ تم نشر قواعد وفهارس Firestore بنجاح"
else
    echo "❌ فشل في نشر قواعد Firestore"
    exit 1
fi

# 2. نشر Cloud Functions
echo "⚡ نشر Cloud Functions..."
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo "✅ تم نشر Cloud Functions بنجاح"
else
    echo "❌ فشل في نشر Cloud Functions"
fi

# 3. نشر الاستضافة
echo "🌐 نشر ملفات الاستضافة..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ تم نشر الاستضافة بنجاح"
else
    echo "❌ فشل في نشر الاستضافة"
fi

echo ""
echo "🎉 تم الانتهاء من عملية النشر!"
echo ""
echo "📝 ملاحظات مهمة:"
echo "- تحقق من وحدة تحكم Firebase للتأكد من إنشاء الفهارس"
echo "- قد تستغرق الفهارس بضع دقائق للبناء"
echo "- اختبر نظام الإشعارات بعد اكتمال الفهارس"
echo ""
echo "🔗 روابط مفيدة:"
echo "- Firebase Console: https://console.firebase.google.com/project/tech-arc-9af9c"
echo "- اختبار سريع: https://tech-arc-9af9c.web.app/notification-quick-test.html"

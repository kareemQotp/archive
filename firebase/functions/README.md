# Archive System Cloud Functions
# وظائف نظام الأرشيف السحابية

Firebase Cloud Functions for the Archive Document Management System.

## Quick Start - البداية السريعة

### Prerequisites - المتطلبات المسبقة
- Node.js 18+
- Firebase CLI
- Firebase project setup

### Installation - التثبيت
```bash
cd firebase/functions
npm install
```

### Development - التطوير
```bash
# Start emulators
firebase emulators:start --only functions,firestore

# Deploy functions
firebase deploy --only functions
```

## Structure - الهيكل

```
functions/
├── src/
│   ├── auth/          # Authentication functions
│   ├── firestore/     # Database functions  
│   ├── storage/       # File storage functions
│   ├── utils/         # Utility functions
│   └── index.js       # Main entry point
├── package.json
├── tsconfig.json
└── .eslintrc.js
```

## Key Functions - الوظائف الرئيسية

### Authentication - المصادقة
- `createUserWithRole` - إنشاء مستخدم مع دور
- `updateUserRole` - تحديث دور المستخدم
- `deleteUserAccount` - حذف حساب المستخدم

### Document Management - إدارة المستندات
- `processDocumentUpload` - معالجة رفع المستندات
- `generateFileNumber` - إنشاء رقم ملف فريد
- `createFileMovement` - تسجيل حركة الملف

### Storage - التخزين
- `processFileUpload` - معالجة رفع الملفات
- `generateThumbnail` - إنشاء صور مصغرة
- `getDownloadUrl` - روابط تحميل آمنة

### Utilities - المرافق
- `sendNotification` - إرسال الإشعارات
- `generateSystemReport` - تقارير النظام
- `cleanupOldData` - تنظيف البيانات

## Security - الأمان

- Role-based access control (admin, archive_officer, documentation)
- Authentication required for all functions
- Input validation and sanitization
- Comprehensive audit logging

## Monitoring - المراقبة

- Function performance tracking
- Error logging and alerting
- Health check endpoints
- Usage analytics

## Support - الدعم

For detailed documentation, see [Cloud Functions Guide](../docs/cloud-functions-guide.md)

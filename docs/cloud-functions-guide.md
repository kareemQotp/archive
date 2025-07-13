# Firebase Cloud Functions Guide
# دليل وظائف Firebase السحابية

## Overview - نظرة عامة

هذا النظام يحتوي على مجموعة شاملة من Cloud Functions لإدارة نظام الأرشيف، مقسمة إلى 4 وحدات رئيسية:

### 1. Authentication Functions - وظائف المصادقة
- إدارة المستخدمين والأدوار
- التحقق من الدعوات
- معالجة أحداث إنشاء وحذف المستخدمين

### 2. Firestore Functions - وظائف قاعدة البيانات
- معالجة رفع المستندات
- إنشاء أرقام الملفات التلقائية
- تتبع حركات الملفات
- معالجة أحداث إنشاء وتحديث المستندات

### 3. Storage Functions - وظائف التخزين
- معالجة رفع الملفات
- إنشاء الصور المصغرة
- مسح المستندات (OCR)
- إدارة روابط التحميل

### 4. Utility Functions - وظائف المساعدة
- إرسال الإشعارات
- إنشاء التقارير
- النسخ الاحتياطي
- تنظيف البيانات المجدولة

## Deployment - النشر

### Local Development - التطوير المحلي
```bash
# Install dependencies
cd firebase/functions
npm install

# Start emulators
firebase emulators:start --only functions,firestore,auth

# Test functions
firebase functions:shell
```

### Production Deployment - النشر للإنتاج
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createUserWithRole

# View logs
firebase functions:log
```

## Function Categories - فئات الوظائف

### Authentication Functions
#### createUserWithRole
- **Purpose**: إنشاء مستخدم جديد مع دور محدد
- **Parameters**: `email`, `password`, `userData`, `role`
- **Usage**: تسجيل المستخدمين الجدد

#### updateUserRole
- **Purpose**: تحديث دور المستخدم
- **Parameters**: `userId`, `newRole`
- **Permission**: Admin only

#### deleteUserAccount
- **Purpose**: حذف حساب المستخدم
- **Parameters**: `userId`
- **Permission**: Admin only

#### validateInvitation
- **Purpose**: التحقق من صحة الدعوة
- **Parameters**: `invitationCode`

### Document Management Functions
#### processDocumentUpload
- **Purpose**: معالجة رفع المستندات
- **Parameters**: `documentData`
- **Returns**: Document ID and file number

#### generateFileNumber
- **Purpose**: إنشاء رقم ملف فريد
- **Format**: YYYY-MM-XXXX (Year-Month-Sequential)

#### createFileMovement
- **Purpose**: تسجيل حركة الملف
- **Parameters**: `fileNumber`, `fromLocation`, `toLocation`, `reason`

### Storage Functions
#### processFileUpload
- **Purpose**: معالجة رفع الملفات مع التحقق من النوع
- **Supported Types**: PDF, DOC, DOCX, XLS, XLSX, Images

#### generateThumbnail
- **Purpose**: إنشاء صور مصغرة للصور
- **Trigger**: Automatic on image upload
- **Size**: 200x200 pixels

#### getDownloadUrl
- **Purpose**: إنشاء رابط تحميل آمن
- **Duration**: 1 hour validity
- **Tracking**: Downloads are logged

### Utility Functions
#### sendNotification
- **Purpose**: إرسال إشعارات للمستخدمين
- **Types**: info, warning, error
- **Channels**: In-app, Push notifications (FCM)

#### generateSystemReport
- **Purpose**: إنشاء تقارير النظام
- **Types**: daily, weekly, monthly
- **Access**: Admin only

#### cleanupOldData
- **Purpose**: تنظيف البيانات القديمة
- **Schedule**: Daily at 2 AM
- **Target**: Old activity logs (90+ days), read notifications (30+ days)

## Security Model - نموذج الأمان

### Role-Based Access Control
- **admin**: Full access to all functions
- **archive_officer**: Document and file management
- **documentation**: Read-only access with limited write

### Authentication Checks
- All functions require authentication
- Role verification for sensitive operations
- Permission checks before data access

### Audit Trail
- All operations are logged in activity_logs
- Security events are tracked
- User actions are recorded with timestamps

## Error Handling - معالجة الأخطاء

### Error Types
- `unauthenticated`: User not logged in
- `permission-denied`: Insufficient permissions
- `invalid-argument`: Missing or invalid parameters
- `not-found`: Resource not found
- `internal`: Server error

### Logging
- All errors are logged with context
- Performance metrics are tracked
- Security incidents are flagged

## Monitoring and Maintenance - المراقبة والصيانة

### Health Checks
```javascript
// Test system health
const result = await healthCheck();
```

### Performance Monitoring
- Function execution times
- Error rates
- Resource usage

### Scheduled Maintenance
- Daily cleanup at 2 AM
- Weekly reports generation
- Monthly backup verification

## Best Practices - أفضل الممارسات

### Function Design
- Single responsibility principle
- Proper error handling
- Input validation
- Security checks

### Performance
- Minimize cold starts
- Efficient database queries
- Proper indexing
- Resource optimization

### Security
- Validate all inputs
- Check permissions
- Log security events
- Use secure defaults

## Testing - الاختبار

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

## Troubleshooting - استكشاف الأخطاء

### Common Issues
1. **Permission Denied**: Check user role and authentication
2. **Function Timeout**: Optimize queries and reduce processing time
3. **Cold Starts**: Use function warming strategies
4. **Memory Issues**: Monitor and optimize memory usage

### Debug Commands
```bash
# View function logs
firebase functions:log --only functionName

# Test locally
firebase emulators:start --only functions

# Check function status
firebase functions:list
```

## API Reference - مرجع API

### Function URLs
- Production: `https://us-central1-{project-id}.cloudfunctions.net/{functionName}`
- Emulator: `http://localhost:5001/{project-id}/us-central1/{functionName}`

### Authentication
```javascript
// Include ID token in request headers
headers: {
  'Authorization': 'Bearer ' + idToken
}
```

### Response Format
```javascript
{
  success: true|false,
  data: {...},        // On success
  error: "message",   // On error
  timestamp: "ISO string"
}
```

## Migration Notes - ملاحظات الهجرة

### From Flask Backend
- User management → Firebase Auth + Custom Claims
- File upload → Firebase Storage + Cloud Functions
- Database operations → Firestore + Cloud Functions
- Scheduled tasks → Cloud Scheduler + Cloud Functions

### Data Migration
- User data structure preserved
- Document metadata enhanced
- Activity logs format standardized
- File paths updated for Storage

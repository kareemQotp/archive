-- Migration Script for Archive System
-- سكريبت الترحيل لنظام الأرشيف
-- Version: 1.0
-- Date: 2025-07-14

-- ================================
-- إنشاء الأقسام الافتراضية
-- Create Default Departments
-- ================================

INSERT INTO "departments" (department_id, name_ar, name_en, description, color, is_active, created_at) VALUES
('legal', 'الشؤون القانونية', 'Legal Affairs', 'قسم الشؤون القانونية والامتثال', '#dc3545', true, NOW()),
('governance', 'الحوكمة', 'Governance', 'قسم الحوكمة والامتثال المؤسسي', '#28a745', true, NOW()),
('collection', 'التحصيل', 'Collection', 'قسم التحصيل واسترداد الديون', '#ffc107', true, NOW()),
('securitization', 'التوريق', 'Securitization', 'قسم التوريق والأوراق المالية', '#17a2b8', true, NOW()),
('archive', 'الأرشيف العام', 'General Archive', 'قسم الأرشيف العام وإدارة الوثائق', '#6f42c1', true, NOW()),
('admin', 'الإدارة', 'Administration', 'القسم الإداري والتقني', '#fd7e14', true, NOW())
ON CONFLICT (department_id) DO NOTHING;

-- ================================
-- إنشاء إعدادات النظام الافتراضية
-- Create Default System Configuration
-- ================================

INSERT INTO "system_config" (config_id, key, value, description, category, is_active, updated_by_id, updated_at) VALUES
('max_file_size', 'MAX_FILE_SIZE', '10485760', 'الحد الأقصى لحجم الملف بالبايت (10MB)', 'FILE_MANAGEMENT', true, 'system', NOW()),
('allowed_file_types', 'ALLOWED_FILE_TYPES', 'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,webp', 'أنواع الملفات المسموحة', 'FILE_MANAGEMENT', true, 'system', NOW()),
('session_timeout', 'SESSION_TIMEOUT', '28800', 'انتهاء الجلسة بالثواني (8 ساعات)', 'SECURITY', true, 'system', NOW()),
('auto_backup', 'AUTO_BACKUP', 'true', 'النسخ الاحتياطي التلقائي', 'BACKUP', true, 'system', NOW()),
('notification_retention_days', 'NOTIFICATION_RETENTION_DAYS', '30', 'مدة الاحتفاظ بالإشعارات بالأيام', 'NOTIFICATIONS', true, 'system', NOW()),
('qr_code_enabled', 'QR_CODE_ENABLED', 'true', 'تفعيل رموز QR للملفات', 'FILE_MANAGEMENT', true, 'system', NOW()),
('barcode_enabled', 'BARCODE_ENABLED', 'true', 'تفعيل الباركود للملفات', 'FILE_MANAGEMENT', true, 'system', NOW()),
('file_versioning', 'FILE_VERSIONING', 'true', 'تفعيل نظام إصدارات الملفات', 'FILE_MANAGEMENT', true, 'system', NOW()),
('audit_log_retention_days', 'AUDIT_LOG_RETENTION_DAYS', '365', 'مدة الاحتفاظ بسجل المراجعة بالأيام', 'SECURITY', true, 'system', NOW()),
('max_login_attempts', 'MAX_LOGIN_ATTEMPTS', '5', 'العدد الأقصى لمحاولات تسجيل الدخول', 'SECURITY', true, 'system', NOW()),
('lockout_duration_minutes', 'LOCKOUT_DURATION_MINUTES', '15', 'مدة القفل بالدقائق بعد تجاوز المحاولات', 'SECURITY', true, 'system', NOW()),
('email_notifications', 'EMAIL_NOTIFICATIONS', 'true', 'تفعيل الإشعارات عبر البريد الإلكتروني', 'NOTIFICATIONS', true, 'system', NOW()),
('sms_notifications', 'SMS_NOTIFICATIONS', 'false', 'تفعيل الإشعارات عبر الرسائل النصية', 'NOTIFICATIONS', true, 'system', NOW()),
('system_maintenance_mode', 'SYSTEM_MAINTENANCE_MODE', 'false', 'وضع صيانة النظام', 'GENERAL', true, 'system', NOW()),
('default_file_category', 'DEFAULT_FILE_CATEGORY', 'ADMINISTRATIVE', 'فئة الملف الافتراضية', 'FILE_MANAGEMENT', true, 'system', NOW()),
('default_file_priority', 'DEFAULT_FILE_PRIORITY', 'NORMAL', 'أولوية الملف الافتراضية', 'FILE_MANAGEMENT', true, 'system', NOW()),
('auto_archive_days', 'AUTO_ARCHIVE_DAYS', '365', 'الأرشفة التلقائية للملفات بعد عدد الأيام', 'FILE_MANAGEMENT', true, 'system', NOW()),
('backup_frequency_hours', 'BACKUP_FREQUENCY_HOURS', '24', 'تكرار النسخ الاحتياطي بالساعات', 'BACKUP', true, 'system', NOW()),
('performance_monitoring', 'PERFORMANCE_MONITORING', 'true', 'تفعيل مراقبة الأداء', 'PERFORMANCE', true, 'system', NOW()),
('api_rate_limit_per_minute', 'API_RATE_LIMIT_PER_MINUTE', '100', 'حد معدل استخدام API في الدقيقة', 'PERFORMANCE', true, 'system', NOW())
ON CONFLICT (config_id) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ================================
-- إنشاء الفهارس للأداء
-- Create Performance Indexes
-- ================================

-- فهارس للجداول الأساسية
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- فهارس للملفات
CREATE INDEX IF NOT EXISTS idx_file_documents_department_id ON file_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_file_documents_uploaded_by_id ON file_documents(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_file_documents_category ON file_documents(category);
CREATE INDEX IF NOT EXISTS idx_file_documents_status ON file_documents(status);
CREATE INDEX IF NOT EXISTS idx_file_documents_priority ON file_documents(priority);
CREATE INDEX IF NOT EXISTS idx_file_documents_created_at ON file_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_file_documents_qr_code ON file_documents(qr_code);
CREATE INDEX IF NOT EXISTS idx_file_documents_barcode ON file_documents(barcode);
CREATE INDEX IF NOT EXISTS idx_file_documents_title ON file_documents USING GIN(to_tsvector('arabic', title));
CREATE INDEX IF NOT EXISTS idx_file_documents_description ON file_documents USING GIN(to_tsvector('arabic', description));

-- فهارس لسجل الأنشطة
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);

-- فهارس للإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_archived ON notifications(is_archived);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- فهارس لإعدادات النظام
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_is_active ON system_config(is_active);

-- ================================
-- إنشاء Views للاستعلامات المتكررة
-- Create Views for Common Queries
-- ================================

-- عرض للملفات النشطة مع تفاصيل الأقسام والمستخدمين
CREATE OR REPLACE VIEW active_files_view AS
SELECT 
    fd.file_id,
    fd.file_name,
    fd.original_name,
    fd.title,
    fd.description,
    fd.category,
    fd.priority,
    fd.qr_code,
    fd.barcode,
    fd.file_size,
    fd.created_at,
    fd.updated_at,
    d.name_ar as department_name_ar,
    d.name_en as department_name_en,
    d.color as department_color,
    u.display_name as uploaded_by_name,
    u.email as uploaded_by_email
FROM file_documents fd
JOIN departments d ON fd.department_id = d.department_id
JOIN users u ON fd.uploaded_by_id = u.user_id
WHERE fd.status = 'ACTIVE' AND d.is_active = true;

-- عرض للإحصائيات العامة
CREATE OR REPLACE VIEW system_stats_view AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM file_documents WHERE status = 'ACTIVE') as active_files,
    (SELECT COUNT(*) FROM departments WHERE is_active = true) as active_departments,
    (SELECT COUNT(*) FROM activity_logs WHERE timestamp >= CURRENT_DATE) as today_activities,
    (SELECT COUNT(*) FROM notifications WHERE is_read = false) as unread_notifications;

-- عرض للإشعارات غير المقروءة
CREATE OR REPLACE VIEW unread_notifications_view AS
SELECT 
    n.notification_id,
    n.title,
    n.message,
    n.type,
    n.category,
    n.created_at,
    n.action_url,
    n.action_label,
    u.display_name as user_name,
    u.email as user_email
FROM notifications n
JOIN users u ON n.user_id = u.user_id
WHERE n.is_read = false AND n.is_archived = false
ORDER BY n.created_at DESC;

-- ================================
-- إنشاء Functions مفيدة
-- Create Useful Functions
-- ================================

-- دالة لإنشاء QR Code فريد
CREATE OR REPLACE FUNCTION generate_unique_qr_code()
RETURNS TEXT AS $$
DECLARE
    qr_code TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- إنشاء رمز QR عشوائي
        qr_code := 'QR' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- التحقق من عدم وجوده
        SELECT COUNT(*) INTO exists_count
        FROM file_documents
        WHERE qr_code = qr_code;
        
        -- إذا لم يكن موجوداً، أرجع الرمز
        IF exists_count = 0 THEN
            RETURN qr_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء Barcode فريد
CREATE OR REPLACE FUNCTION generate_unique_barcode()
RETURNS TEXT AS $$
DECLARE
    barcode TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- إنشاء باركود عشوائي
        barcode := 'BC' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 8, '0');
        
        -- التحقق من عدم وجوده
        SELECT COUNT(*) INTO exists_count
        FROM file_documents
        WHERE barcode = barcode;
        
        -- إذا لم يكن موجوداً، أرجع الرمز
        IF exists_count = 0 THEN
            RETURN barcode;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- دالة لتنظيف الإشعارات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE expires_at < NOW()
    AND expires_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- دالة لتنظيف سجل الأنشطة القديم
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs
    WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- إنشاء Triggers للتحديث التلقائي
-- Create Triggers for Auto Updates
-- ================================

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق trigger على الجداول المناسبة
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_documents_updated_at
    BEFORE UPDATE ON file_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- إنشاء أذونات قاعدة البيانات
-- Create Database Permissions
-- ================================

-- إنشاء roles للمستخدمين المختلفين
-- CREATE ROLE archive_admin;
-- CREATE ROLE archive_user;
-- CREATE ROLE archive_readonly;

-- منح الأذونات المناسبة
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO archive_admin;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO archive_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO archive_readonly;

-- ================================
-- إكمال Migration
-- Migration Complete
-- ================================

-- إدراج log entry للـ migration
INSERT INTO activity_logs (log_id, user_id, action, entity_type, details, severity, timestamp) VALUES
(
    'migration_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'system',
    'SYSTEM_CONFIG',
    'SYSTEM',
    'Database migration completed successfully - Archive System v1.0',
    'INFO',
    NOW()
);

-- رسالة إكمال
SELECT 'Archive System Database Migration Completed Successfully!' as status;

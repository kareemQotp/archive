// تكوين أدوار المستخدمين - نظام شامل لإدارة الصلاحيات
const USER_ROLES = {
    'super_admin': {
        name: 'مدير عام للنظام',
        nameEn: 'Super Administrator',
        permissions: [
            'view_all_documents',
            'upload_documents',
            'edit_documents',
            'delete_documents',
            'manage_users',
            'manage_admins',
            'manage_page_permissions',
            'manage_system_settings',
            'view_reports',
            'audit_logs',
            'export_data',
            'backup_system',
            'system_maintenance',
            'track_file_movements',
            'transfer_files',
            'receive_files'
        ],
        features: [
            'dashboard',
            'upload',
            'search',
            'scanner',
            'profile',
            'users',
            'admins',
            'page-permissions',
            'reports',
            'settings',
            'audit',
            'backup',
            'file-tracking',
            'movement-history'
        ],
        description: 'صلاحيات النظام الحساسة وإدارة المدراء والصلاحيات العامة',
        color: '#b91c1c',
        icon: 'fas fa-user-shield',
        priority: 1
    },
    'admin': {
        name: 'مدير تشغيل',
        nameEn: 'Operations Administrator',
        permissions: [
            'view_all_documents',
            'upload_documents',
            'edit_documents',
            'delete_documents',
            'view_reports',
            'audit_logs',
            'view_logs',
            'export_data',
            'track_file_movements',
            'transfer_files',
            'receive_files',
            'view_movement_history'
        ],
        features: [
            'dashboard',
            'upload',
            'search',
            'scanner',
            'profile',
            'reports',
            'audit',
            'file-tracking',
            'movement-history'
        ],
        description: 'إدارة التشغيل والتقارير وحركة الملفات دون صلاحيات النظام الحساسة',
        color: '#dc3545',
        icon: 'fas fa-user-cog',
        priority: 2
    },
    
    'department_admin': {
        name: 'مدير إدارة',
        nameEn: 'Department Admin',
        permissions: [
            'manage_department_users',
            'approve_users',
            'view_department_reports',
            'view_department_documents',
            'upload_department_documents',
            'edit_department_documents',
            'search_documents'
        ],
        features: [
            'dashboard',
            'search',
            'upload',
            'profile',
            'users',
            'reports'
        ],
        description: 'إدارة مستخدمي وبيانات الإدارة ضمن departmentId فقط',
        color: '#2563eb',
        icon: 'fas fa-users-cog',
        priority: 3
    },

    'supervisor': {
        name: 'مشرف',
        nameEn: 'Supervisor',
        permissions: [
            'view_department_documents',
            'search_documents',
            'review_department_activity',
            'view_department_reports'
        ],
        features: [
            'dashboard',
            'search',
            'profile',
            'reports'
        ],
        description: 'متابعة ملفات وتقارير الإدارة دون إدارة مستخدمين أو صلاحيات نظام',
        color: '#0f766e',
        icon: 'fas fa-user-check',
        priority: 4
    },
    
    'archive_officer': {
        name: 'موظف أرشيف',
        nameEn: 'Archive Officer',
        permissions: [
            'view_archive_documents',
            'upload_documents',
            'edit_documents',
            'organize_documents',
            'categorize_documents',
            'scanner_access',
            'archive_maintenance',
            'document_indexing',
            'metadata_management',
            'transfer_files',
            'receive_files',
            'track_file_movements'
        ],
        features: [
            'dashboard',
            'upload',
            'search',
            'scanner',
            'profile',
            'organize',
            'categorize',
            'indexing',
            'metadata',
            'file-tracking'
        ],
        description: 'إدارة وتنظيم الأرشيف وفهرسة الوثائق وإدارة البيانات الوصفية',
        color: '#17a2b8',
        icon: 'fas fa-archive',
        priority: 5
    },
    
    'employee': {
        name: 'موظف',
        nameEn: 'Employee',
        permissions: [
            'view_department_documents',
            'upload_department_documents',
            'search_documents'
        ],
        features: [
            'dashboard',
            'search',
            'upload',
            'profile'
        ],
        description: 'صلاحيات تشغيلية محدودة داخل الإدارة',
        color: '#28a745',
        icon: 'fas fa-user',
        priority: 6
    },
    
    'viewer': {
        name: 'مستعرض',
        nameEn: 'Viewer',
        permissions: [
            'view_department_documents',
            'search_documents'
        ],
        features: [
            'dashboard',
            'search',
            'profile'
        ],
        description: 'قراءة وبحث فقط دون رفع أو حذف أو تحويل',
        color: '#6c757d',
        icon: 'fas fa-eye',
        priority: 7
    }
};

// دالة للحصول على معلومات الدور
function getRoleInfo(roleKey) {
    const normalizedRole = window.AuthConstants && typeof window.AuthConstants.normalizeRole === 'function'
        ? window.AuthConstants.normalizeRole(roleKey)
        : roleKey;
    return USER_ROLES[normalizedRole] || null;
}

// دالة للتحقق من الصلاحية
function hasPermission(userRole, permission) {
    const roleInfo = getRoleInfo(userRole);
    return roleInfo ? roleInfo.permissions.includes(permission) : false;
}

// دالة للتحقق من الميزة
function hasFeature(userRole, feature) {
    const roleInfo = getRoleInfo(userRole);
    return roleInfo ? roleInfo.features.includes(feature) : false;
}

// دالة للحصول على جميع الأدوار مرتبة حسب الأولوية
function getAllRoles() {
    return Object.keys(USER_ROLES)
        .map(key => ({
            key: key,
            ...USER_ROLES[key]
        }))
        .sort((a, b) => (a.priority || 999) - (b.priority || 999));
}

// دالة للحصول على الأدوار حسب الصلاحية
function getRolesByPermission(permission) {
    return Object.keys(USER_ROLES)
        .filter(roleKey => hasPermission(roleKey, permission))
        .map(key => ({
            key: key,
            ...USER_ROLES[key]
        }));
}

// دالة للحصول على الأدوار حسب الميزة
function getRolesByFeature(feature) {
    return Object.keys(USER_ROLES)
        .filter(roleKey => hasFeature(roleKey, feature))
        .map(key => ({
            key: key,
            ...USER_ROLES[key]
        }));
}

// دالة للحصول على جميع الصلاحيات
function getAllPermissions() {
    const permissions = new Set();
    Object.values(USER_ROLES).forEach(role => {
        role.permissions.forEach(permission => permissions.add(permission));
    });
    return Array.from(permissions).sort();
}

// دالة للحصول على جميع الميزات
function getAllFeatures() {
    const features = new Set();
    Object.values(USER_ROLES).forEach(role => {
        role.features.forEach(feature => features.add(feature));
    });
    return Array.from(features).sort();
}

// دالة للتحقق من صحة الدور
function isValidRole(roleKey) {
    return !!getRoleInfo(roleKey);
}

// دالة لمقارنة أولوية الأدوار
function compareRolePriority(roleA, roleB) {
    const priorityA = getRoleInfo(roleA)?.priority || 999;
    const priorityB = getRoleInfo(roleB)?.priority || 999;
    return priorityA - priorityB;
}

// دالة للحصول على لون الدور
function getRoleColor(roleKey) {
    const roleInfo = getRoleInfo(roleKey);
    return roleInfo ? roleInfo.color : '#6c757d';
}

// دالة للحصول على أيقونة الدور
function getRoleIcon(roleKey) {
    const roleInfo = getRoleInfo(roleKey);
    return roleInfo ? roleInfo.icon : 'fas fa-user';
}

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        USER_ROLES,
        getRoleInfo,
        hasPermission,
        hasFeature,
        getAllRoles,
        getRolesByPermission,
        getRolesByFeature,
        getAllPermissions,
        getAllFeatures,
        isValidRole,
        compareRolePriority,
        getRoleColor,
        getRoleIcon
    };
}

// جعلها متاحة عالمياً في المتصفح
if (typeof window !== 'undefined') {
    window.USER_ROLES = USER_ROLES;
    window.getRoleInfo = getRoleInfo;
    window.hasPermission = hasPermission;
    window.hasFeature = hasFeature;
    window.getAllRoles = getAllRoles;
    window.getRolesByPermission = getRolesByPermission;
    window.getRolesByFeature = getRolesByFeature;
    window.getAllPermissions = getAllPermissions;
    window.getAllFeatures = getAllFeatures;
    window.isValidRole = isValidRole;
    window.compareRolePriority = compareRolePriority;
    window.getRoleColor = getRoleColor;
    window.getRoleIcon = getRoleIcon;
}

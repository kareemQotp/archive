// تكوين أدوار المستخدمين - نظام شامل لإدارة الصلاحيات
const USER_ROLES = {
    'admin': {
        name: 'مدير النظام',
        nameEn: 'System Administrator',
        permissions: [
            'view_all_documents',
            'upload_documents',
            'edit_documents',
            'delete_documents',
            'manage_users',
            'view_reports',
            'manage_system_settings',
            'audit_logs',
            'view_logs',
            'export_data',
            'backup_system',
            'system_maintenance',
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
            'users',
            'reports',
            'settings',
            'audit',
            'backup',
            'file-tracking',
            'movement-history'
        ],
        description: 'صلاحيات كاملة لإدارة النظام والمستخدمين والتحكم في جميع العمليات',
        color: '#dc3545',
        icon: 'fas fa-user-shield',
        priority: 1
    },
    
    'legal': {
        name: 'الشؤون القانونية',
        nameEn: 'Legal Affairs',
        permissions: [
            'view_legal_documents',
            'upload_legal_documents',
            'edit_legal_documents',
            'search_documents',
            'view_legal_reports',
            'contract_management',
            'legal_compliance',
            'litigation_documents'
        ],
        features: [
            'dashboard',
            'search',
            'upload',
            'profile',
            'legal-docs',
            'legal-reports',
            'contracts',
            'compliance'
        ],
        description: 'إدارة الوثائق والعقود القانونية والامتثال للوائح والتقاضي',
        color: '#007bff',
        icon: 'fas fa-balance-scale',
        priority: 2
    },
    
    'archive-officer': {
        name: 'ضابط الأرشيف',
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
        priority: 3
    },
    
    'governance': {
        name: 'الحوكمة والامتثال',
        nameEn: 'Governance & Compliance',
        permissions: [
            'view_governance_documents',
            'audit_access',
            'view_all_reports',
            'compliance_check',
            'risk_assessment',
            'policy_management',
            'internal_audit',
            'regulatory_compliance'
        ],
        features: [
            'dashboard',
            'search',
            'profile',
            'reports',
            'audit',
            'compliance',
            'risk-assessment',
            'policies'
        ],
        description: 'مراجعة وتدقيق العمليات والامتثال للوائح وإدارة المخاطر',
        color: '#28a745',
        icon: 'fas fa-shield-alt',
        priority: 4
    },
    
    'collection': {
        name: 'إدارة التحصيل',
        nameEn: 'Collection Management',
        permissions: [
            'view_collection_documents',
            'search_collection_documents',
            'view_debtor_files',
            'collection_reports',
            'payment_tracking',
            'debt_management',
            'collection_strategies'
        ],
        features: [
            'dashboard',
            'search',
            'profile',
            'collection-docs',
            'debtor-management',
            'payment-tracking',
            'collection-reports'
        ],
        description: 'إدارة وثائق التحصيل وملفات المدينين ومتابعة المدفوعات',
        color: '#fd7e14',
        icon: 'fas fa-hand-holding-usd',
        priority: 5
    },
    
    'securitization': {
        name: 'إدارة التوريق',
        nameEn: 'Securitization Management',
        permissions: [
            'view_securitization_documents',
            'search_securitization_documents',
            'securitization_analysis',
            'portfolio_management',
            'asset_valuation',
            'rating_management',
            'investor_relations'
        ],
        features: [
            'dashboard',
            'search',
            'profile',
            'securitization-docs',
            'portfolio-analysis',
            'asset-valuation',
            'ratings',
            'investor-portal'
        ],
        description: 'إدارة وثائق التوريق والمحافظ المالية وتقييم الأصول',
        color: '#6f42c1',
        icon: 'fas fa-chart-line',
        priority: 6
    }
};

// دالة للحصول على معلومات الدور
function getRoleInfo(roleKey) {
    return USER_ROLES[roleKey] || null;
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
    return USER_ROLES.hasOwnProperty(roleKey);
}

// دالة لمقارنة أولوية الأدوار
function compareRolePriority(roleA, roleB) {
    const priorityA = USER_ROLES[roleA]?.priority || 999;
    const priorityB = USER_ROLES[roleB]?.priority || 999;
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

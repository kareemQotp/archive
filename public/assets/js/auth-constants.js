/**
 * ثوابت ودوال المصادقة المركزية
 * Central Authentication Constants & Utilities
 * 
 * هذا الملف يمثل المصدر الوحيد (Single Source of Truth)
 * للوظائف المشتركة مثل توحيد الأدوار (Role Normalization).
 */

var AuthConstants = (typeof window !== 'undefined' && window.AuthConstants) || {
    CANONICAL_ROLES: [
        'super_admin',
        'admin',
        'department_admin',
        'supervisor',
        'archive_officer',
        'employee',
        'viewer'
    ],

    ROLE_DISPLAY_NAMES: {
        super_admin: 'مدير عام للنظام',
        admin: 'مدير النظام',
        department_admin: 'مدير إدارة',
        supervisor: 'مشرف',
        archive_officer: 'موظف أرشيف',
        employee: 'موظف',
        viewer: 'مستعرض',
    },

    DEPARTMENT_ROLE_ALIASES: {
        legal: 'legal',
        legal_officer: 'legal',
        'legal-officer': 'legal',
        collection: 'collection',
        collection_officer: 'collection',
        'collection-officer': 'collection',
        governance: 'governance',
        securitization: 'securitization',
        securitization_user: 'securitization',
        'securitization-user': 'securitization',
        bank: 'bank',
        bank_user: 'bank'
    },

    /**
     * توحيد وتنسيق أسماء الأدوار القادمة من قاعدة البيانات أو النظام
     * لتتوافق مع المفاتيح المستخدمة في roles.js وباقي أجزاء النظام
     * 
     * @param {string} role - اسم الدور المراد توحيده
     * @returns {string} - اسم الدور الموحد
     */
    normalizeRole: function(role) {
        if (!role) return 'viewer';
        
        const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_');
        
        // خريطة الأسماء المستعارة (Aliases) للأدوار
        const roleAliases = {
            'system_admin': 'super_admin',
            'super_admin': 'super_admin',
            'admin': 'admin',
            'dept_admin': 'department_admin',
            'department-admin': 'department_admin',
            'department_admin': 'department_admin',
            'manager': 'department_admin',
            'department_head': 'supervisor',
            'supervisor': 'supervisor',
            'employee': 'employee',
            'user': 'viewer',
            'viewer': 'viewer',
            'archive-officer': 'archive_officer',
            'archive_officer': 'archive_officer',
            'legal': 'employee',
            'legal_officer': 'employee',
            'legal-officer': 'employee',
            'collection': 'employee',
            'collection_officer': 'employee',
            'collection-officer': 'employee',
            'governance': 'employee',
            'bank_user': 'employee',
            'bank': 'employee',
            'securitization_user': 'employee',
            'securitization-user': 'employee',
            'securitization': 'employee'
        };

        return roleAliases[normalized] || normalized;
    },

    /**
     * إرجاع مفاتيح الدور التي يجب اعتبارها متكافئة أثناء قراءة
     * مخططات صلاحيات قديمة أو حديثة. المفتاح الأول هو الدور الموحد.
     */
    getRolePermissionKeys: function(role) {
        const normalizedRole = this.normalizeRole(role);
        const keys = new Set([normalizedRole]);

        if (normalizedRole === 'super_admin') {
            keys.add('system_admin');
            keys.add('admin');
        }

        if (normalizedRole === 'department_admin') {
            keys.add('dept_admin');
            keys.add('department-admin');
            keys.add('manager');
        }

        if (normalizedRole === 'supervisor') {
            keys.add('department_head');
        }

        if (normalizedRole === 'archive_officer') {
            keys.add('archive-officer');
            keys.add('employee');
            keys.add('user');
        }

        if (normalizedRole === 'employee') {
            keys.add('user');
        }

        return Array.from(keys);
    },

    normalizeDepartment: function(department) {
        if (!department) return '';
        const normalized = String(department).trim().toLowerCase().replace(/\s+/g, '_');
        const aliases = {
            admin: 'admin',
            general: 'admin',
            'عام': 'admin',
            archive: 'archive',
            'ارشيف': 'archive',
            'الأرشيف': 'archive',
            legal: 'legal',
            legal_officer: 'legal',
            'قانونية': 'legal',
            'الشؤون_القانونية': 'legal',
            collection: 'collection',
            collection_officer: 'collection',
            'التحصيل': 'collection',
            governance: 'governance',
            'الحوكمة': 'governance',
            securitization: 'securitization',
            securitization_user: 'securitization',
            'التوريق': 'securitization',
            bank: 'bank',
            bank_user: 'bank'
        };
        return aliases[normalized] || normalized;
    },

    departmentFromLegacyRole: function(role) {
        if (!role) return '';
        const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_');
        return this.DEPARTMENT_ROLE_ALIASES[normalized] || '';
    },

    isKnownRole: function(role) {
        return this.CANONICAL_ROLES.includes(this.normalizeRole(role));
    },

    getRoleDisplayName: function(role) {
        return this.ROLE_DISPLAY_NAMES[this.normalizeRole(role)] || 'مستخدم';
    }
};

// إتاحة الكائن عالمياً للاستخدام في جميع أنحاء النظام
if (typeof window !== 'undefined') {
    window.AuthConstants = AuthConstants;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthConstants;
}

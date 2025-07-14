// User Roles Configuration
import { CONSTANTS } from './constants.js';

export const USER_ROLES = {
    [CONSTANTS.ROLES.ADMIN]: {
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
    
    [CONSTANTS.ROLES.LEGAL]: {
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
    
    [CONSTANTS.ROLES.ARCHIVE_OFFICER]: {
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
    
    [CONSTANTS.ROLES.GOVERNANCE]: {
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
    
    [CONSTANTS.ROLES.COLLECTION]: {
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
    
    [CONSTANTS.ROLES.SECURITIZATION]: {
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

// Utility functions for role management
export class RoleManager {
    static getRoleInfo(roleKey) {
        return USER_ROLES[roleKey] || null;
    }

    static hasPermission(userRole, permission) {
        const roleInfo = this.getRoleInfo(userRole);
        return roleInfo ? roleInfo.permissions.includes(permission) : false;
    }

    static hasFeature(userRole, feature) {
        const roleInfo = this.getRoleInfo(userRole);
        return roleInfo ? roleInfo.features.includes(feature) : false;
    }

    static getAllRoles() {
        return Object.keys(USER_ROLES)
            .map(key => ({
                key: key,
                ...USER_ROLES[key]
            }))
            .sort((a, b) => (a.priority || 999) - (b.priority || 999));
    }

    static getRolesByPermission(permission) {
        return Object.keys(USER_ROLES)
            .filter(roleKey => this.hasPermission(roleKey, permission))
            .map(key => ({
                key: key,
                ...USER_ROLES[key]
            }));
    }

    static isValidRole(roleKey) {
        return USER_ROLES.hasOwnProperty(roleKey);
    }

    static getRoleColor(roleKey) {
        const roleInfo = this.getRoleInfo(roleKey);
        return roleInfo ? roleInfo.color : '#6c757d';
    }

    static getRoleIcon(roleKey) {
        const roleInfo = this.getRoleInfo(roleKey);
        return roleInfo ? roleInfo.icon : 'fas fa-user';
    }
}

export default RoleManager;
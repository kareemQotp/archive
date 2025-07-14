// App Constants
export const CONSTANTS = {
    // File Settings
    FILES: {
        MAX_SIZE: 16 * 1024 * 1024, // 16MB
        ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'],
        UPLOAD_CHUNK_SIZE: 1024 * 1024 // 1MB chunks
    },
    
    // User Roles
    ROLES: {
        ADMIN: 'admin',
        LEGAL: 'legal',
        ARCHIVE_OFFICER: 'archive-officer',
        GOVERNANCE: 'governance',
        COLLECTION: 'collection',
        SECURITIZATION: 'securitization'
    },
    
    // UI Settings
    UI: {
        ITEMS_PER_PAGE: 12,
        AUTO_SAVE_INTERVAL: 30000,
        NOTIFICATION_DURATION: 5000,
        DEBOUNCE_DELAY: 300
    },
    
    // Security Settings
    SECURITY: {
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
    },
    
    // API Endpoints
    API: {
        BASE_URL: '/api',
        DOCUMENTS: '/api/documents',
        USERS: '/api/users',
        AUTH: '/api/auth'
    },
    
    // Firestore Collections
    COLLECTIONS: {
        USERS: 'users',
        DOCUMENTS: 'documents',
        MOVEMENTS: 'file_movements',
        NOTIFICATIONS: 'notifications',
        AUDIT_LOGS: 'audit_logs'
    }
};
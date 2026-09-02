/**
 * Central system constants / ثوابت النظام المركزية
 * اجعل كل أسماء المجموعات والحقول والمعاملات القابلة للتغيير هنا لتسهيل الصيانة.
 */

export const COLLECTIONS = {
  USERS: "users",
  DOCUMENTS: "documents",
  FILE_MOVEMENTS: "file_movements",
  NOTIFICATIONS: "notifications",
  ACTIVITY_LOGS: "activity_logs",
  REPORTS: "reports",
  SYSTEM_BACKUPS: "system_backups",
  DAILY_STATS: "daily_statistics",
  SYSTEM_SETTINGS: "system_settings",
  NOTIFICATION_SETTINGS: "notification_settings",
  RATE_LIMITS: "rate_limits",
  INVITATIONS: "invitations",
  COUNTERS: "counters"
} as const;

export const ACTIVITY = {
  CATEGORY: {
    SYSTEM: "system",
    SECURITY: "security",
    NOTIFICATIONS: "notifications",
    FILES: "files"
  }
} as const;

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  DEPARTMENT_ADMIN: "department_admin",
  SUPERVISOR: "supervisor",
  ARCHIVE_OFFICER: "archive_officer",
  EMPLOYEE: "employee",
  VIEWER: "viewer"
} as const;

// Default rate limits per callable (per minute)
export const RATE_LIMITS: Record<string, number> = {
  sendNotification: 60,
  markNotificationRead: 120,
  getUserNotifications: 120,
  updateFcmToken: 30,
  refreshUserClaims: 30,
  receiveFileMovement: 60,
  restoreDeletedDocument: 20,
  generateSystemReport: 5
};

export const BACKUP = {
  DEFAULT_RETENTION_DAYS: 30
};

export const CLEANUP = {
  ACTIVITY_LOG_RETENTION_DAYS: 90,
  READ_NOTIFICATION_RETENTION_DAYS: 30
};

// Helper to resolve a rate limit for a function with fallback
export function getRateLimit(fnName: string, fallback: number): number {
  return RATE_LIMITS[fnName] || fallback;
}

/**
 * NOTE: أضف هنا أي ثوابت مستقبلية (أحداث، مفاتيح إعدادات، أسماء حقول قياسية...)
 */

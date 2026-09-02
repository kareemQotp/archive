// Common helper utilities for Cloud Functions
// أدوات مساعدة مشتركة لوظائف السحابة

const {HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const {serverTS} = require("./serverTimestamp");
const {COLLECTIONS, ACTIVITY} = require("../config/constants");

/**
 * Build unified response object
 * إنشاء استجابة موحدة
 */
function buildResponse(success, data = null, error = null) {
  return {
    success,
    data: data || undefined,
    error: error ? {code: error.code || "internal", message: error.message || String(error)} : undefined,
    ts: new Date().toISOString()
  };
}

/**
 * Ensure request is authenticated
 * التحقق من المصادقة
 */
function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  return request.auth.uid;
}

/**
 * Get user role from users collection (cached simple map optional)
 * جلب دور المستخدم
 */
async function getUserRole(uid) {
  const snap = await admin.firestore().collection(COLLECTIONS.USERS).doc(uid).get();
  return snap.exists ? (snap.data().role || "viewer") : "viewer";
}

/**
 * Normalize role to canonical runtime values while supporting legacy aliases
 */
function normalizeRole(role) {
  if (!role) return "viewer";
  const normalized = String(role).trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = {
    "admin": "admin",
    "system_admin": "super_admin",
    "super_admin": "super_admin",
    "dept_admin": "department_admin",
    "department_admin": "department_admin",
    "department-admin": "department_admin",
    "manager": "department_admin",
    "department_head": "supervisor",
    "supervisor": "supervisor",
    "employee": "employee",
    "archive_officer": "archive_officer",
    "archive-officer": "archive_officer",
    "user": "viewer",
    "viewer": "viewer",
    "legal": "employee",
    "legal_officer": "employee",
    "legal-officer": "employee",
    "collection": "employee",
    "collection_officer": "employee",
    "collection-officer": "employee",
    "governance": "employee",
    "securitization": "employee",
    "securitization_user": "employee",
    "securitization-user": "employee",
    "bank": "employee",
    "bank_user": "employee"
  };
  return aliases[normalized] || normalized;
}

/**
 * Normalize department names to stable ids while supporting Arabic/legacy aliases
 */
function normalizeDepartment(department) {
  if (!department) return "";
  const normalized = String(department).trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = {
    "archive": "archive",
    "ارشيف": "archive",
    "الأرشيف": "archive",
    "legal": "legal",
    "قانونية": "legal",
    "الشؤون_القانونية": "legal",
    "collection": "collection",
    "التحصيل": "collection",
    "governance": "governance",
    "الحوكمة": "governance",
    "securitization": "securitization",
    "التوريق": "securitization",
    "bank": "bank",
    "admin": "admin",
    "general": "admin",
    "عام": "admin"
  };
  return aliases[normalized] || normalized;
}

function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

function isSuperAdminRole(role) {
  return normalizeRole(role) === "super_admin";
}

function isSystemOperatorRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "super_admin" || normalized === "admin";
}

function isDepartmentAdminRole(role) {
  return normalizeRole(role) === "department_admin";
}

function isSupervisorRole(role) {
  return normalizeRole(role) === "supervisor";
}

function isArchiveOfficerRole(role) {
  return normalizeRole(role) === "archive_officer";
}

function getUserDepartment(data = {}) {
  return normalizeDepartment(data.departmentId || data.department || "");
}

function sameDepartment(a = {}, b = {}) {
  const left = getUserDepartment(a);
  const right = getUserDepartment(b);
  return !!left && !!right && left === right;
}

function canManageTargetUser(caller = {}, target = {}) {
  const callerRole = normalizeRole(caller.role);
  const targetRole = normalizeRole(target.role);

  if (callerRole === "super_admin") return true;
  if (callerRole !== "department_admin") return false;
  if (!["supervisor", "employee", "viewer"].includes(targetRole)) return false;
  return sameDepartment(caller, target);
}

/**
 * Check if role is one of allowed
 */
function assertRole(role, allowed) {
  const normalizedRole = normalizeRole(role);
  const normalizedAllowed = allowed.map(normalizeRole);
  if (!normalizedAllowed.includes(normalizedRole)) {
    throw new HttpsError("permission-denied", "Insufficient role");
  }
}

/**
 * Soft / configurable App Check verification
 * التحقق المرن من App Check
 * Modes (env APP_CHECK_MODE):
 *   off   => لا يتم الفحص إطلاقاً
 *   warn  => يسجل حدثاً أمنياً إذا غاب App Check لكنه لا يمنع التنفيذ (الافتراضي)
 *   strict => يمنع التنفيذ إذا غاب App Check
 */
async function verifyAppCheck(request, functionName = "unknown") {
  const mode = (process.env.APP_CHECK_MODE || "warn").toLowerCase();
  if (mode === "off") return; // no checking
  const hasAppCheck = !!request.app; // CallableRequest.app موجودة عند تمرير توكن صالح حتى لو enforceAppCheck=false
  if (hasAppCheck) return; // all good

  // Missing App Check token
  if (mode === "strict") {
    throw new HttpsError("failed-precondition", "App Check token required");
  }

  // warn mode: log + write lightweight security log document (best effort, non-blocking)
  try {
    logger.warn(`Missing App Check token (mode=warn) in function ${functionName}`);
    // Fire-and-forget style: لا نرغب في إطالة زمن الاستجابة أو الفشل لو حدث خطأ
    admin.firestore().collection(COLLECTIONS.ACTIVITY_LOGS).add({
      category: ACTIVITY.CATEGORY.SECURITY,
      action: "missing_app_check",
      function: functionName,
      mode: "warn",
      timestamp: serverTS(),
      priority: "high"
    }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

module.exports = {
  buildResponse,
  requireAuth,
  getUserRole,
  normalizeRole,
  normalizeDepartment,
  isAdminRole,
  isSuperAdminRole,
  isSystemOperatorRole,
  isDepartmentAdminRole,
  isSupervisorRole,
  isArchiveOfficerRole,
  getUserDepartment,
  sameDepartment,
  canManageTargetUser,
  assertRole,
  checkRateLimit,
  verifyAppCheck
};

/**
 * Rate limiting per user per function per minute
 * تحديد معدل الاستدعاء لكل مستخدم لكل دالة في الدقيقة
 */
async function checkRateLimit(uid, functionName, limitPerMinute = 30) {
  if (!uid) return; // للحالات غير المصادق عليها – يمكن توسيعها لاحقاً
  const db = admin.firestore();
  const now = new Date();
  // Test bypass: يسمح بتجاوز منطق المعاملات في بيئة الاختبار لتسهيل الاختبار الوحدوي
  if (process.env.TEST_BYPASS_TRANSACTIONS === "1") {
    return; // لا يزيد العدّاد فعلياً
  }
  // مفتاح الدقيقة: YYYYMMDDHHmm
  const key = `${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const docId = `${uid}__${functionName}__${key}`;
  const ref = db.collection(COLLECTIONS.RATE_LIMITS).doc(docId);
  let currentCount = 0;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        tx.set(ref, {count: 1, uid, functionName, key, createdAt: serverTS()});
        currentCount = 1;
      } else {
        currentCount = (snap.data().count || 0) + 1;
        if (currentCount > limitPerMinute) {
          throw new HttpsError("resource-exhausted", `Rate limit exceeded for ${functionName}`);
        }
        tx.update(ref, {count: currentCount, updatedAt: serverTS()});
      }
    });
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "Rate limit transaction failed");
  }
}

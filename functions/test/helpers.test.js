const admin = require('firebase-admin');
jest.mock('firebase-admin', () => {
  const firestoreData = new Map();
  const doc = (id) => ({
    id,
    get: jest.fn(async () => ({ exists: false })),
    set: jest.fn(async (data) => { firestoreData.set(id, data); }),
    update: jest.fn(async (data) => {
      const existing = firestoreData.get(id) || {}; firestoreData.set(id, { ...existing, ...data });
    })
  });
  const collection = jest.fn(() => ({ doc }));
  const runTransaction = async (fn) => {
    const tx = { get: (ref) => ref.get(), set: (ref, data) => ref.set(data), update: (ref, data) => ref.update(data) };
    return fn(tx);
  };
  return {
    firestore: () => ({ collection, runTransaction, FieldValue: { serverTimestamp: () => new Date() } })
  };
});

const {
  buildResponse,
  normalizeRole,
  normalizeDepartment,
  isAdminRole,
  isSuperAdminRole,
  isSystemOperatorRole,
  isArchiveOfficerRole,
  canManageTargetUser
} = require('../src/utils/helpers');

describe('buildResponse', () => {
  test('returns success with data', () => {
    const res = buildResponse(true, { a: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ a: 1 });
    expect(res.error).toBeUndefined();
    expect(res.ts).toBeDefined();
  });

  test('returns error when provided', () => {
    const res = buildResponse(false, null, { code: 'x', message: 'err' });
    expect(res.success).toBe(false);
    expect(res.error).toEqual({ code: 'x', message: 'err' });
  });
});

describe('RBAC v1 helpers', () => {
  test('normalizes legacy roles without collapsing super admin into admin', () => {
    expect(normalizeRole('system_admin')).toBe('super_admin');
    expect(normalizeRole('super_admin')).toBe('super_admin');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('dept_admin')).toBe('department_admin');
    expect(normalizeRole('manager')).toBe('department_admin');
    expect(normalizeRole('archive-officer')).toBe('archive_officer');
    expect(normalizeRole('legal')).toBe('employee');
    expect(normalizeRole('user')).toBe('viewer');
  });

  test('separates admin and super admin checks', () => {
    expect(isSuperAdminRole('system_admin')).toBe(true);
    expect(isSuperAdminRole('admin')).toBe(false);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(false);
    expect(isSystemOperatorRole('super_admin')).toBe(true);
    expect(isSystemOperatorRole('admin')).toBe(true);
    expect(isArchiveOfficerRole('archive_officer')).toBe(true);
    expect(isAdminRole('archive_officer')).toBe(false);
  });

  test('department admin only manages lower roles in the same department', () => {
    const caller = {role: 'department_admin', departmentId: 'legal'};

    expect(canManageTargetUser(caller, {role: 'employee', departmentId: 'legal'})).toBe(true);
    expect(canManageTargetUser(caller, {role: 'supervisor', departmentId: 'legal'})).toBe(true);
    expect(canManageTargetUser(caller, {role: 'viewer', departmentId: 'legal'})).toBe(true);
    expect(canManageTargetUser(caller, {role: 'employee', departmentId: 'collection'})).toBe(false);
    expect(canManageTargetUser(caller, {role: 'department_admin', departmentId: 'legal'})).toBe(false);
    expect(canManageTargetUser(caller, {role: 'admin', departmentId: 'legal'})).toBe(false);
  });

  test('archive officer is operational and cannot manage users', () => {
    const caller = {role: 'archive_officer', departmentId: 'archive'};

    expect(isArchiveOfficerRole(caller.role)).toBe(true);
    expect(isAdminRole(caller.role)).toBe(false);
    expect(isSuperAdminRole(caller.role)).toBe(false);
    expect(isSystemOperatorRole(caller.role)).toBe(false);
    expect(canManageTargetUser(caller, {role: 'employee', departmentId: 'archive'})).toBe(false);
  });

  test('normalizes department aliases', () => {
    expect(normalizeDepartment('الشؤون القانونية')).toBe('legal');
    expect(normalizeDepartment('التوريق')).toBe('securitization');
    expect(normalizeDepartment('عام')).toBe('admin');
  });
});

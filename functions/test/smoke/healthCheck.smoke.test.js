// Minimal smoke test for healthCheck to include in fast pipeline
jest.mock('firebase-functions', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

jest.mock('firebase-admin', () => ({
  firestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ ok: true }) }) }), add: async () => ({ id: 'log1' }) }) }),
  storage: () => ({ bucket: () => ({ getFiles: async () => [[]] }) })
}));

const utils = require('../../src/utils');

describe('SMOKE: healthCheck', () => {
  test('returns success true and connectivity fields', async () => {
    const res = await utils._rawHealthCheck({ auth: null, data: {} });
    if(!res.success){ // debug output
      // eslint-disable-next-line no-console
      console.log('Smoke healthCheck failure payload:', res);
    }
    expect(res).toHaveProperty('success', true);
    expect(res.data).toMatchObject({ database: 'connected', storage: 'connected', functions: 'operational' });
  });
});

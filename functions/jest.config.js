module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/test'],
  testMatch: ['**/*.spec.js', '**/*.test.js'],
  moduleFileExtensions: ['ts','js','json'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  verbose: false,
  collectCoverage: false
};

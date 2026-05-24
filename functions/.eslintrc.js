module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  plugins: [
    // pseudo plugin namespace for our local custom rules under eslint-rules/
    "local-firestore"
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": ["error", {"code": 120}],
    "object-curly-spacing": ["error", "never"],
    "comma-dangle": ["error", "never"],
    "no-unused-vars": ["error", {"argsIgnorePattern": "^_"}],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    // Enforce using constants & serverTS helper
    "local-firestore/no-raw-firestore": "error"
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};

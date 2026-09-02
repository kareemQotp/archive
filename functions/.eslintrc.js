module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "script"
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
    "linebreak-style": "off",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": "off",
    "object-curly-spacing": ["error", "never"],
    "comma-dangle": ["error", "never"],
    "no-unused-vars": ["error", {"argsIgnorePattern": "^_", "varsIgnorePattern": "^_"}],
    "no-empty": ["error", {"allowEmptyCatch": true}],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    // Enforce using constants & serverTS helper
    "local-firestore/no-raw-firestore": "error"
  },
  overrides: [
    {
      files: ["**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module"
      },
      plugins: [
        "@typescript-eslint",
        "local-firestore"
      ]
    },
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

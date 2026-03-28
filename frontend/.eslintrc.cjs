module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist/', 'coverage/', 'node_modules/', '**/*.ts', '**/*.tsx'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
};

module.exports = {
  root: true,
  ignorePatterns: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/.husky/**'],
  overrides: [
    {
      files: ['backend/**/*.ts', 'packages/shared/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      env: {
        node: true,
        es2021: true,
      },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
    {
      files: ['backend/scripts/**/*.js'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      env: {
        node: true,
        es2021: true,
      },
      extends: ['eslint:recommended'],
    },
    {
      files: ['backend/src/**/*.test.ts', 'backend/src/**/__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      env: {
        browser: true,
        node: true,
        es2021: true,
      },
      plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      files: [
        'frontend/src/**/*.test.ts',
        'frontend/src/**/*.test.tsx',
        'frontend/src/**/__tests__/**/*.ts',
        'frontend/src/**/__tests__/**/*.tsx',
        'frontend/src/test/**/*.ts',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};

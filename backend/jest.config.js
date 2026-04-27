const coreCoverageFrom = [
  'src/constants/product-categories.ts',
  'src/mappers/shared.mapper.ts',
  'src/middlewares/validation.middleware.ts',
  'src/services/auth.service.ts',
  'src/services/product-category.service.ts',
  'src/services/product-command.service.ts',
  'src/services/product-query.service.ts',
  'src/services/product.mapper.ts',
  'src/services/product.service.ts',
  'src/utils/auth-cookie.util.ts',
  'src/utils/password.util.ts',
  'src/utils/refresh-token.util.ts',
  'src/validation/request-schemas.ts',
];

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/scripts/jest.global-setup.js',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: coreCoverageFrom,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary', 'lcov', 'html', 'cobertura'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};

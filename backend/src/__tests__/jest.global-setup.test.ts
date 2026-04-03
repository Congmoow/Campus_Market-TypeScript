const { isIntegrationTestRun } = require('../../scripts/jest.global-setup.js');

describe('jest integration database preparation', () => {
  it('prepares the database when running the full backend test suite', () => {
    expect(isIntegrationTestRun([])).toBe(true);
  });

  it('prepares the database for explicit integration test targets', () => {
    expect(isIntegrationTestRun(['--runInBand', 'src/__tests__/product.integration.test.ts'])).toBe(
      true,
    );
  });

  it('skips database preparation for non-integration test targets', () => {
    expect(
      isIntegrationTestRun(['--runInBand', 'src/services/__tests__/product.service.test.ts']),
    ).toBe(false);
  });
});

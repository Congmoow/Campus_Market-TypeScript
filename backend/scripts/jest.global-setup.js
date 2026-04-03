const { execSync } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

function isIntegrationTestRun(argv = process.argv.slice(2)) {
  const positionalArgs = argv.filter((arg) => arg && !arg.startsWith('-'));

  if (process.env.SKIP_TEST_DB_PREPARE === '1') {
    return false;
  }

  if (process.env.FORCE_TEST_DB_PREPARE === '1') {
    return true;
  }

  if (positionalArgs.length === 0) {
    return true;
  }

  return positionalArgs.some((arg) => arg.includes('.integration.test.'));
}

module.exports = async function globalSetup() {
  if (!isIntegrationTestRun()) {
    return;
  }

  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to prepare the integration test database');
  }

  const projectRoot = path.resolve(__dirname, '..');
  execSync('npm run test:prepare-db', {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
  });
};

module.exports.isIntegrationTestRun = isIntegrationTestRun;

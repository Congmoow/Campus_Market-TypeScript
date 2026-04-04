import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedDefaultProductCategories } from '../prisma/seed-default-product-categories';

type MigrationRow = {
  migration_name: string;
  finished: boolean;
  rolled_back: boolean;
};

type CountRow = {
  count: bigint | number;
};

type DatabaseState = {
  existingTables: string[];
  missingCoreTables: string[];
  migrations: MigrationRow[];
  categoryCount: number;
};

const prismaSchemaPath = path.join(process.cwd(), 'backend', 'prisma', 'schema.prisma');
const baselineSqlPath = path.join(
  process.cwd(),
  'backend',
  'prisma',
  'bootstrap-current-schema.sql',
);
const prismaExecutable = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const allowDbPushFallback = (process.env.PRISMA_ALLOW_DB_PUSH_FALLBACK ?? 'true') === 'true';

const coreTables = [
  'user',
  'user_profile',
  'product',
  'product_image',
  'category',
  'orders',
  'chat_session',
  'chat_message',
  'favorite',
  'refresh_session',
] as const;

const legacyBaselineMigrations = [
  'add_name_and_student_id',
  'add_order_no',
  'add_refresh_session',
  'add_user_profile_unique_user_id',
  'rename_username_to_student_id',
  'unify_order_status',
] as const;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ['error'],
  });
}

function log(message: string): void {
  process.stdout.write(`[docker-db-init] ${message}\n`);
}

function runPrisma(args: string[], label: string): void {
  log(`${label}: prisma ${args.join(' ')}`);

  const result = spawnSync(prismaExecutable, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

async function getDatabaseState(prisma: PrismaClient): Promise<DatabaseState> {
  const tableList = coreTables.map((table) => `'${table}'`).join(', ');
  const existingTablesRows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name::text AS table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (${tableList})`,
  );

  const existingTables = existingTablesRows.map((row) => row.table_name);
  const missingCoreTables = coreTables.filter((table) => !existingTables.includes(table));

  const migrationsTableRows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name::text AS table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = '_prisma_migrations'`,
  );

  let migrations: MigrationRow[] = [];
  if (migrationsTableRows.length > 0) {
    migrations = await prisma.$queryRawUnsafe<MigrationRow[]>(
      `SELECT migration_name::text AS migration_name,
              finished_at IS NOT NULL AS finished,
              rolled_back_at IS NOT NULL AS rolled_back
       FROM "_prisma_migrations"
       ORDER BY started_at`,
    );
  }

  let categoryCount = 0;
  if (existingTables.includes('category')) {
    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*)::bigint AS count FROM "category"`,
    );
    categoryCount = Number(countRows[0]?.count ?? 0);
  }

  return {
    existingTables,
    missingCoreTables,
    migrations,
    categoryCount,
  };
}

function isEmptyDatabase(state: DatabaseState): boolean {
  return state.existingTables.length === 0 && state.migrations.length === 0;
}

function isLegacyBootstrapMetadataDrift(state: DatabaseState): boolean {
  if (state.existingTables.length !== coreTables.length) {
    return false;
  }

  const unfinishedMigrations = state.migrations.filter(
    (migration) => !migration.finished && !migration.rolled_back,
  );

  return (
    unfinishedMigrations.length > 0 &&
    unfinishedMigrations.every((migration) =>
      legacyBaselineMigrations.includes(
        migration.migration_name as (typeof legacyBaselineMigrations)[number],
      ),
    )
  );
}

async function seedDefaultData(prisma: PrismaClient): Promise<void> {
  const beforeState = await getDatabaseState(prisma);
  await seedDefaultProductCategories(prisma);
  const afterState = await getDatabaseState(prisma);
  const inserted = afterState.categoryCount - beforeState.categoryCount;

  log(
    inserted > 0
      ? `seeded ${inserted} default product categories`
      : `default product categories already present (${afterState.categoryCount})`,
  );
}

function resolveLegacyBaseline(migrations: MigrationRow[]): void {
  const finishedMigrations = new Set(
    migrations
      .filter((migration) => migration.finished)
      .map((migration) => migration.migration_name),
  );

  for (const migration of migrations) {
    if (!migration.finished && !migration.rolled_back) {
      runPrisma(
        [
          'migrate',
          'resolve',
          '--rolled-back',
          migration.migration_name,
          '--schema',
          prismaSchemaPath,
        ],
        `mark ${migration.migration_name} rolled back`,
      );
    }
  }

  for (const migrationName of legacyBaselineMigrations) {
    if (finishedMigrations.has(migrationName)) {
      continue;
    }

    runPrisma(
      ['migrate', 'resolve', '--applied', migrationName, '--schema', prismaSchemaPath],
      `mark ${migrationName} applied`,
    );
  }
}

async function bootstrapEmptyDatabase(prisma: PrismaClient): Promise<void> {
  log('empty database detected; applying baseline schema bootstrap');
  runPrisma(
    ['db', 'execute', '--file', baselineSqlPath, '--schema', prismaSchemaPath],
    'bootstrap schema',
  );

  const stateAfterBootstrap = await getDatabaseState(prisma);
  resolveLegacyBaseline(stateAfterBootstrap.migrations);
}

async function main(): Promise<void> {
  const prisma = createPrismaClient();

  try {
    const initialState = await getDatabaseState(prisma);

    log(
      `initial state: tables=${initialState.existingTables.length}/${coreTables.length}, migrations=${initialState.migrations.length}, categories=${initialState.categoryCount}`,
    );

    if (isEmptyDatabase(initialState)) {
      await bootstrapEmptyDatabase(prisma);
    } else if (
      initialState.migrations.length === 0 &&
      initialState.existingTables.length > 0 &&
      initialState.existingTables.length < coreTables.length
    ) {
      throw new Error(
        `database is partially initialized without migration metadata; missing tables: ${initialState.missingCoreTables.join(', ')}`,
      );
    } else if (isLegacyBootstrapMetadataDrift(initialState)) {
      log('legacy prisma migration metadata drift detected; normalizing migration history');
      resolveLegacyBaseline(initialState.migrations);
    }

    try {
      runPrisma(['migrate', 'deploy', '--schema', prismaSchemaPath], 'apply prisma migrations');
    } catch (error) {
      if (!allowDbPushFallback) {
        throw error;
      }

      log(
        'prisma migrate deploy failed unexpectedly; running narrow emergency fallback: prisma db push --skip-generate',
      );
      runPrisma(
        ['db', 'push', '--skip-generate', '--schema', prismaSchemaPath],
        'emergency db push fallback',
      );
    }

    const finalState = await getDatabaseState(prisma);
    const unfinishedMigrations = finalState.migrations.filter(
      (migration) => !migration.finished && !migration.rolled_back,
    );

    if (unfinishedMigrations.length > 0) {
      throw new Error(
        `unfinished prisma migrations remain after initialization: ${unfinishedMigrations
          .map((migration) => migration.migration_name)
          .join(', ')}`,
      );
    }

    await seedDefaultData(prisma);

    const postSeedState = await getDatabaseState(prisma);
    log(
      `ready: tables=${postSeedState.existingTables.length}/${coreTables.length}, migrations=${postSeedState.migrations.length}, categories=${postSeedState.categoryCount}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[docker-db-init] failed:', error);
  process.exit(1);
});

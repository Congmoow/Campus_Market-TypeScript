import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

function toIsoTime(timestamp) {
  return new Date(timestamp).toISOString();
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    };
  }

  return {
    name: 'Error',
    message: String(error),
    stack: '',
  };
}

function normalizeCheckResult(name, startedAtMs, finishedAtMs, payload) {
  const durationMs = Math.max(0, finishedAtMs - startedAtMs);

  return {
    name,
    status: payload.status,
    detail: payload.detail ?? '',
    businessId: payload.businessId ?? null,
    businessIds: payload.businessIds ?? null,
    error: serializeError(payload.error),
    startedAt: toIsoTime(startedAtMs),
    finishedAt: toIsoTime(finishedAtMs),
    durationMs,
  };
}

function buildAcceptanceReport({
  checks,
  startedAtMs,
  finishedAtMs,
  frontendBaseUrl,
  backendBaseUrl,
  gitMetadata,
  envSnapshot,
  error,
}) {
  const passed = checks.filter((check) => check.status === 'passed').length;
  const failed = checks.filter((check) => check.status === 'failed').length;
  const status = error || failed > 0 ? 'failed' : 'passed';

  return {
    status,
    startedAt: toIsoTime(startedAtMs),
    finishedAt: toIsoTime(finishedAtMs),
    durationMs: Math.max(0, finishedAtMs - startedAtMs),
    git: {
      branch: gitMetadata?.branch ?? null,
      commit: gitMetadata?.commit ?? null,
    },
    env: {
      nodeVersion: envSnapshot?.nodeVersion ?? process.version,
      nodeEnv: envSnapshot?.nodeEnv ?? process.env.NODE_ENV ?? null,
      ci: envSnapshot?.ci ?? process.env.CI ?? null,
      platform: envSnapshot?.platform ?? process.platform,
    },
    baseUrls: {
      frontend: frontendBaseUrl,
      backend: backendBaseUrl,
    },
    totals: {
      total: checks.length,
      passed,
      failed,
    },
    checks,
    error: serializeError(error),
  };
}

function renderBusinessIds(check) {
  if (check.businessId) {
    return `业务 ID：${check.businessId}`;
  }

  if (check.businessIds && Object.keys(check.businessIds).length > 0) {
    return `业务 ID：${Object.entries(check.businessIds)
      .map(([key, value]) => `${key}=${value}`)
      .join('，')}`;
  }

  return '业务 ID：无';
}

function renderAcceptanceSummaryMarkdown(report) {
  const lines = [
    '# Docker 验收摘要',
    '',
    `验收结果：${report.status === 'passed' ? '通过' : '失败'}`,
    `分支：${report.git.branch ?? 'unknown'}`,
    `提交：${report.git.commit ?? 'unknown'}`,
    `环境：node=${report.env.nodeVersion}，NODE_ENV=${report.env.nodeEnv ?? 'unknown'}，CI=${report.env.ci ?? 'unknown'}，platform=${report.env.platform}`,
    `前端：\`${report.baseUrls.frontend}\``,
    `后端：\`${report.baseUrls.backend}\``,
    `开始时间：${report.startedAt}`,
    `结束时间：${report.finishedAt}`,
    `总耗时：${report.durationMs}ms`,
    `总检查数：${report.totals.total}`,
    `通过：${report.totals.passed}`,
    `失败：${report.totals.failed}`,
    '',
    '## 检查详情',
    '',
  ];

  for (const check of report.checks) {
    lines.push(`- [${check.status === 'passed' ? 'PASS' : 'FAIL'}] ${check.name}`);
    lines.push(`  - 详情：${check.detail || '无'}`);
    lines.push(`  - ${renderBusinessIds(check)}`);
    lines.push(`  - 耗时：${check.durationMs}ms`);
    if (check.error?.message) {
      lines.push(`  - 错误：${check.error.message}`);
    }
  }

  if (report.error?.message) {
    lines.push('');
    lines.push('## 失败摘要');
    lines.push('');
    lines.push(`- 错误：${report.error.message}`);
  }

  lines.push('');
  return `${lines.join('\n')}`;
}

async function writeAcceptanceArtifacts(report, outputDir) {
  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, 'acceptance-report.json');
  const summaryPath = path.join(outputDir, 'acceptance-summary.md');

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(summaryPath, renderAcceptanceSummaryMarkdown(report), 'utf8');

  return {
    jsonPath,
    summaryPath,
  };
}

export function getGitMetadata({ cwd = process.cwd(), spawnSyncImpl = spawnSync } = {}) {
  const gitArgs = ['rev-parse', '--short=12', 'HEAD'];
  const branchArgs = ['rev-parse', '--abbrev-ref', 'HEAD'];

  const commitResult = spawnSyncImpl('git', gitArgs, {
    cwd,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  const branchResult = spawnSyncImpl('git', branchArgs, {
    cwd,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  return {
    commit: commitResult.status === 0 ? commitResult.stdout.trim() || null : null,
    branch: branchResult.status === 0 ? branchResult.stdout.trim() || null : null,
  };
}

export function createAcceptanceReporter({
  repoRoot = process.cwd(),
  frontendBaseUrl,
  backendBaseUrl,
  gitMetadata = getGitMetadata({ cwd: repoRoot }),
  envSnapshot = {},
  now = () => Date.now(),
} = {}) {
  const checks = [];
  const startedAtMs = now();
  const outputDir = path.join(repoRoot, 'reports');

  return {
    async runCheck(name, action) {
      const checkStartedAtMs = now();

      try {
        const result = await action();
        const checkFinishedAtMs = now();
        const payload =
          result && typeof result === 'object' && !Array.isArray(result)
            ? result
            : { value: result };

        checks.push(
          normalizeCheckResult(name, checkStartedAtMs, checkFinishedAtMs, {
            ...payload,
            status: 'passed',
          }),
        );

        return payload.value;
      } catch (error) {
        const checkFinishedAtMs = now();
        checks.push(
          normalizeCheckResult(name, checkStartedAtMs, checkFinishedAtMs, {
            status: 'failed',
            error,
          }),
        );
        throw error;
      }
    },
    async finalize({ error = null } = {}) {
      const finishedAtMs = now();
      const report = buildAcceptanceReport({
        checks,
        startedAtMs,
        finishedAtMs,
        frontendBaseUrl,
        backendBaseUrl,
        gitMetadata,
        envSnapshot,
        error,
      });

      await writeAcceptanceArtifacts(report, outputDir);
      return report;
    },
  };
}

export { buildAcceptanceReport, renderAcceptanceSummaryMarkdown, writeAcceptanceArtifacts };

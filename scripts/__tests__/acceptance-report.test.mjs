import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';

import { createAcceptanceReporter } from '../acceptance-report.mjs';

function createNowSequence(values) {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

test('成功报告会输出 JSON 和 Markdown 摘要', async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'acceptance-report-success-'));
  const now = createNowSequence([1000, 1040, 1100]);

  try {
    const reporter = createAcceptanceReporter({
      repoRoot,
      frontendBaseUrl: 'http://frontend.test',
      backendBaseUrl: 'http://backend.test',
      gitMetadata: {
        branch: 'main',
        commit: 'abc123def456',
      },
      envSnapshot: {
        nodeEnv: 'test',
        ci: '1',
      },
      now,
    });

    const result = await reporter.runCheck('首页可用', async () => ({
      value: 200,
      detail: 'HTTP 200',
      businessIds: {
        page: 'home',
      },
    }));

    assert.equal(result, 200);

    const report = await reporter.finalize();

    assert.equal(report.status, 'passed');
    assert.deepEqual(report.git, {
      branch: 'main',
      commit: 'abc123def456',
    });
    assert.deepEqual(report.baseUrls, {
      frontend: 'http://frontend.test',
      backend: 'http://backend.test',
    });
    assert.deepEqual(report.totals, {
      total: 1,
      passed: 1,
      failed: 0,
    });
    assert.equal(report.durationMs, 100);
    assert.equal(report.checks[0].status, 'passed');
    assert.equal(report.checks[0].durationMs, 60);
    assert.deepEqual(report.checks[0].businessIds, {
      page: 'home',
    });

    const jsonPath = path.join(repoRoot, 'reports', 'acceptance-report.json');
    const markdownPath = path.join(repoRoot, 'reports', 'acceptance-summary.md');
    const jsonReport = JSON.parse(await readFile(jsonPath, 'utf8'));
    const markdownSummary = await readFile(markdownPath, 'utf8');

    assert.equal(jsonReport.status, 'passed');
    assert.match(markdownSummary, /验收结果：通过/);
    assert.match(markdownSummary, /前端：`http:\/\/frontend\.test`/);
    assert.match(markdownSummary, /后端：`http:\/\/backend\.test`/);
    assert.match(markdownSummary, /首页可用/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('失败检查也会写出失败报告和错误详情', async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'acceptance-report-failure-'));
  const now = createNowSequence([2000, 2055, 2100]);

  try {
    const reporter = createAcceptanceReporter({
      repoRoot,
      frontendBaseUrl: 'http://frontend.test',
      backendBaseUrl: 'http://backend.test',
      gitMetadata: {
        branch: 'feature/docker-report',
        commit: 'deadbeef',
      },
      envSnapshot: {
        nodeEnv: 'test',
        ci: '0',
      },
      now,
    });

    await assert.rejects(
      reporter.runCheck('健康检查', async () => {
        throw new Error('backend health failed');
      }),
      /backend health failed/,
    );

    const report = await reporter.finalize({
      error: new Error('acceptance failed'),
    });

    assert.equal(report.status, 'failed');
    assert.deepEqual(report.totals, {
      total: 1,
      passed: 0,
      failed: 1,
    });
    assert.equal(report.error.message, 'acceptance failed');
    assert.equal(report.checks[0].status, 'failed');
    assert.equal(report.checks[0].error.message, 'backend health failed');
    assert.equal(report.checks[0].durationMs, 45);

    const jsonPath = path.join(repoRoot, 'reports', 'acceptance-report.json');
    const markdownPath = path.join(repoRoot, 'reports', 'acceptance-summary.md');
    const jsonReport = JSON.parse(await readFile(jsonPath, 'utf8'));
    const markdownSummary = await readFile(markdownPath, 'utf8');

    assert.equal(jsonReport.status, 'failed');
    assert.equal(jsonReport.checks[0].error.message, 'backend health failed');
    assert.match(markdownSummary, /验收结果：失败/);
    assert.match(markdownSummary, /健康检查/);
    assert.match(markdownSummary, /backend health failed/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

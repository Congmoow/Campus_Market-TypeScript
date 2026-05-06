# Campus Market

校园二手交易平台，使用 TypeScript monorepo 组织前端、后端和共享契约层。

## 技术栈

- 前端：React 18、Vite、TypeScript、Tailwind CSS、Vitest
- 后端：Node.js、Express、TypeScript、Prisma、PostgreSQL、Jest
- 共享层：`packages/shared`
- 校验：Zod
- 工程化：ESLint、Prettier、Husky、lint-staged、GitHub Actions

## 目录结构

```text
Campus_Market-TypeScript/
├─ backend/
├─ frontend/
├─ packages/
│  └─ shared/
├─ .github/workflows/
└─ package.json
```

## 环境要求

- Node.js 20 及以上
- npm 10 及以上
- PostgreSQL 13 及以上

## 安装依赖

```bash
npm install
```

## 环境变量

先复制示例文件：

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

至少需要确认以下变量：

- `backend/.env`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `FRONTEND_URL`
- `frontend/.env`
  - `VITE_API_URL`，如果本地使用 Vite 代理，可保持默认

## 数据库初始化

```bash
cd backend
npm run prisma:deploy
npm run prisma:generate
```

如果你在本地继续调整 Prisma schema，再执行：

```bash
cd backend
npm run prisma:migrate
```

## 本地开发

在仓库根目录同时启动前后端：

```bash
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`
- 健康检查：`http://localhost:3000/health`

## 根目录统一质量命令

工程化检查统一在根目录执行，不需要再分别进入子目录。

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker 部署

本仓库已补充一套面向本地一键启动和生产部署参考的 Docker 方案，新增文件如下：

- 根目录：`docker-compose.yml`、`.dockerignore`、`.env.docker.example`
- 后端：`backend/Dockerfile`、`backend/docker-entrypoint.sh`
- 前端：`frontend/Dockerfile`、`frontend/nginx/default.conf`

方案说明：

- `postgres`
  - 使用官方 `postgres:16-alpine`
  - 带健康检查
  - 使用命名卷持久化数据库数据
- `backend`
  - 使用多阶段构建
  - 兼容 npm workspaces monorepo
  - 构建时先编译 `packages/shared`，再生成 Prisma Client，最后编译 backend
  - 容器启动前自动执行 `prisma migrate deploy`
  - `uploads` 使用独立命名卷，避免镜像重建后丢失上传文件
- `frontend`
  - 使用多阶段构建
  - 生产环境输出为静态资源，由 nginx 提供服务
  - nginx 统一将 `/api` 和 `/uploads` 反向代理到 backend
  - 对外暴露端口为 `80`，不再在 Docker 生产方案中直接运行 Vite dev server

### 首次启动

1. 复制 Docker 环境变量模板到根目录 `.env`

```powershell
Copy-Item .env.docker.example .env
```

2. 按实际环境修改 `.env`，至少确认以下变量：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `VITE_API_URL`

说明：

- 本方案默认推荐 `VITE_API_URL=/api`
- 生产环境必须替换示例中的数据库密码和 `JWT_SECRET`
- `DATABASE_URL` 中的数据库主机在 compose 网络内应保持为 `postgres`

3. 构建并启动所有服务

```bash
docker compose up --build -d
```

### 查看日志

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### 停止服务

```bash
docker compose down
```

如果还需要连同数据库卷一起删除：

```bash
docker compose down -v
```

### 数据库迁移

后端容器启动时会自动执行一次：

```bash
prisma migrate deploy
```

如果当前仓库的历史迁移无法在全新空库上完整重放，容器会在 `migrate deploy` 失败后自动回退到：

```bash
prisma db push --skip-generate
```

这样可以保证本地 Docker 首次启动可用；生产环境如果你需要严格迁移历史，建议后续补齐正式的初始化 migration 链。

如果你需要手动再次执行迁移：

```bash
docker compose exec backend npm exec --workspace campus-market-backend prisma migrate deploy --schema backend/prisma/schema.prisma
```

### Docker 初始化说明

- 空的 Docker PostgreSQL 数据库会先通过 `backend/prisma/bootstrap-current-schema.sql` 完成基线初始化。
- 基线初始化之后，backend 会先把当前遗留 Prisma migration 集标记为已应用，再重新执行一次 `prisma migrate deploy`。
- 默认商品分类会在 backend 启动时自动补种，且该种子脚本是幂等的。
- `prisma db push --skip-generate` 的应急兜底仍然保留，但只应作为最后手段，并由 `PRISMA_ALLOW_DB_PUSH_FALLBACK` 控制。
- 本地 Docker 以纯 HTTP 运行时应保持 `AUTH_COOKIE_SECURE=false`；生产 HTTPS 环境需要改回 `true`。

当前边界：

- 历史 Prisma migration 目录本身仍不是一条可以从空库完整重放的链路，因此空数据库启动仍依赖基线 SQL 文件和 migration 元数据归一化处理。
- 如果后续修改 Prisma schema，需要同时更新 `backend/prisma/bootstrap-current-schema.sql` 以及 `backend/src/scripts/docker-db-init.ts` 中的遗留 migration 兼容逻辑。

### 访问地址

- 前端：`http://localhost`
- 后端：`http://localhost:3000`
- 后端健康检查：`http://localhost:3000/health`
- PostgreSQL：`localhost:5432`

### 生产环境注意事项

- 必须替换 `.env` 中所有示例密码和密钥，尤其是 `POSTGRES_PASSWORD` 与 `JWT_SECRET`
- `FRONTEND_URL` 需要改成你的真实站点域名，例如 `https://market.example.com`
- 如无明确需要，不建议在公网直接暴露 `5432`
- 上传文件当前落在 backend 容器挂载卷中；生产环境建议将该卷映射到宿主机目录、云盘或对象存储
- 如果前端部署在域名或反向代理之后，优先保持 `VITE_API_URL=/api`，继续使用同源反向代理
- 如需 TLS，请在 nginx 外层再接入云负载均衡或上层反向代理

### 常见问题

- 端口冲突
  - 如果本机已经占用 `80`、`3000` 或 `5432`，请先释放端口，或修改 `docker-compose.yml` 的宿主机端口映射
- Prisma 连接失败
  - 确认 `.env` 中 `DATABASE_URL` 的主机名是 `postgres`，不要写成 `localhost`
  - 使用 `docker compose logs -f postgres` 和 `docker compose logs -f backend` 检查数据库是否已健康
- 前端 API 地址配置错误
  - Docker 生产方案默认通过 nginx 代理 `/api`，推荐保持 `VITE_API_URL=/api`
  - 如果你改成外部 API 地址，需要在前端重新构建镜像后再启动
- 上传文件丢失
  - 请确认没有执行 `docker compose down -v`
  - 生产环境建议将上传卷映射到明确的持久化存储位置

说明：

- `npm run lint`
  - 运行 backend、frontend、shared 的 ESLint
- `npm run typecheck`
  - 运行 backend、frontend、shared 的 TypeScript 类型检查
- `npm test`
  - 运行 backend Jest 与 frontend Vitest
- `npm run build`
  - 先构建 shared，再构建 backend 和 frontend

补充命令：

```bash
npm run format
npm run format:check
```

## Workspace 常用命令

### backend

```bash
cd backend
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

### frontend

```bash
cd frontend
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

### shared

```bash
cd packages/shared
npm run lint
npm run typecheck
npm run build
```

## 提交前检查

仓库已配置 `husky + lint-staged`。

- 安装依赖后，`prepare` 会自动安装 Git hooks
- `pre-commit` 只对暂存文件执行轻量检查
  - `prettier --write`
  - `eslint --fix`

这一步不会替代完整 CI，它的目标是尽早拦截格式问题和基础静态错误。

## CI

GitHub Actions 工作流位于：

- `.github/workflows/ci.yml`

触发条件：

- `push`
- `pull_request`

CI 会在 Ubuntu 环境中执行以下步骤：

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

## 自动化测试实训验收说明

本节用于说明当前仓库的自动化测试验收口径、触发方式、报告位置和人工配置边界。结论先行：当前仓库的自动化测试体系分为三层，分别是代码级单元/组件测试、服务端集成/契约测试、客户侧 Docker API 回归测试；三层已通过根目录脚本串联，并补充了 GitHub Actions 与 Gitee Go 仓库内流水线配置。Gitee 仓库创建、代码同步、保护分支和合并门禁仍需要在网页端手动配置。

### 一、三层测试体系

1. 代码级单元/组件测试
   - 后端使用 Jest，主要覆盖 `backend/src/services/__tests__`、`backend/src/controllers/__tests__`、`backend/src/middlewares/__tests__`、`backend/src/config/__tests__` 等目录。
   - 前端使用 Vitest + Testing Library，主要覆盖 `frontend/src/components/__tests__`、`frontend/src/pages/__tests__`、`frontend/src/lib/__tests__`、`frontend/src/api/__tests__` 等目录。
   - 目标是尽早发现纯函数、服务逻辑、组件渲染和交互回归。

2. 服务端集成/契约测试
   - 后端使用 Jest 执行集成与接口契约校验，重点覆盖 `backend/src/__tests__/*.integration.test.ts` 以及路由层测试 `backend/src/routes/__tests__/*.test.ts`。
   - 这层依赖可用的 PostgreSQL 测试库，并在执行前通过 `npm --workspace campus-market-backend run test:prepare-db` 将 schema 推到测试库。
   - 目标是验证接口状态码、响应结构、鉴权、数据库读写和共享契约没有断裂。

3. 客户侧 Docker API 回归测试
   - 入口脚本是 `scripts/docker-acceptance.mjs`，根目录命令为 `npm run test:acceptance` 或 `npm run docker:acceptance`。
   - 这层会通过 Docker Compose 拉起 `postgres + backend + frontend`，再从客户侧访问 `http://localhost` 和 `http://localhost:3000`，验证 `/api` 代理、鉴权、上传、商品、订单、容器重启后的数据持久化等关键链路。
   - 目标是验证“容器化交付结果能否被实际客户端调用”，不是浏览器 UI 像素级测试。

### 二、本地验收命令

建议在仓库根目录按下面顺序执行：

```bash
npm ci
npm run lint
npm run typecheck
npm --workspace campus-market-backend run test:prepare-db
npm run test:code
npm run build
docker compose --env-file .env.docker.example up --build -d
npm run test:acceptance
docker compose --env-file .env.docker.example down -v --remove-orphans
```

按层执行时可使用以下命令：

```bash
# 代码级单元/组件
npm run test:coverage:backend
npm run test:coverage:frontend

# 服务端集成/契约
npm --workspace campus-market-backend run test:prepare-db
npm --workspace campus-market-backend run test:ci

# 客户侧 Docker API 回归
npm run test:acceptance
```

说明：

- `npm run test:code` 会依次调用 `test:acceptance-report`、`test:coverage:backend` 和 `test:coverage:frontend`。
- `npm run test:acceptance-report` 会校验 Docker 验收报告 helper 的成功/失败路径，防止报告字段回归。
- `npm --workspace campus-market-backend run test:ci` 同时包含后端覆盖率和 JUnit reporter，适合本地出报告和 CI 归档。
- `npm --workspace campus-market-frontend run test:ci` 会使用 Vitest 生成前端覆盖率和 JUnit XML。
- `npm run test:acceptance` 会生成结构化验收报告：`reports/acceptance-report.json` 和 `reports/acceptance-summary.md`。
- 代码级覆盖率门禁采用核心文件集口径：后端覆盖认证、商品、校验、映射等核心模块；前端覆盖入口、商品卡片、分类和用户展示工具等关键模块。门禁阈值为语句/行/函数不低于 80%，分支不低于 70%。

### 三、报告路径与验收产物

1. 后端 Jest
   - 覆盖率目录：`backend/coverage/`
   - HTML 报告入口：`backend/coverage/index.html`
   - LCOV 文件：`backend/coverage/lcov.info`
   - Cobertura XML：`backend/coverage/cobertura-coverage.xml`
   - JUnit XML：CI 中归档到 `reports/backend/junit.xml`

2. 前端 Vitest
   - 覆盖率目录：`frontend/coverage/`
   - 常用入口：`frontend/coverage/index.html`、`frontend/coverage/lcov.info`
   - Cobertura XML：`frontend/coverage/cobertura-coverage.xml`
   - JUnit XML：`frontend/reports/frontend-junit.xml`

3. Docker API 回归
   - 结构化 JSON：`reports/acceptance-report.json`
   - Markdown 摘要：`reports/acceptance-summary.md`
   - CI 原始日志：`reports/acceptance/acceptance.log`
   - Docker 诊断日志：`reports/docker-compose.log`、`reports/docker/compose.log`、`reports/docker/postgres.log`、`reports/docker/backend.log`、`reports/docker/frontend.log`

### 四、CI / Gitee Go 触发说明

当前已落地的代码仓内 CI 是 GitHub Actions：

- 配置文件：`.github/workflows/ci.yml`
- 已实现触发条件：`push` 到 `main`、`push` 到 `codex/**`、以及 `pull_request`
- 已实现执行内容：
  - `code-level-tests`：`npm ci`、`npm run lint`、`npm run typecheck`、`npm run test:code`、`npm run build`
  - `customer-regression`：依赖 `code-level-tests` 成功后运行 Docker Compose 整栈回归，并上传 acceptance 与 Docker 日志制品

仓库内已补充 Gitee Go 流水线配置：

- `.workflow/quality-gate.yml`：执行代码级质量门禁
- `.workflow/docker-regression.yml`：先执行代码级质量门禁，再执行 Docker 客户侧回归，保证客户侧回归建立在代码级测试成功之后

两条 Gitee Go 流水线都会把 `./reports` 目录上传到制品库 `campus-market-test-reports`，因此需要先在 Gitee Go 网页端创建同名制品库，或把 YAML 中的 `artifactRepository` 改成课程仓库已有的制品库 ID。

Gitee Go YAML 触发器主要支持 `push` 事件，仓库内配置已覆盖 `main` 与 `master`。流水线文件提交后，还需要在 Gitee 网页端启用流水线，并按课程要求确认以下事项：

- `push` 到 `main`
- 如课程答辩或联调分支不是 `main/master`，需要在 `.workflow/*.yml` 追加对应分支的 `push` 触发规则
- Pull Request / 合并请求创建、更新时的合并门禁需要在 Gitee 保护分支和流水线状态检查中配置，仓内 YAML 不自动创建该网页端规则

如果 Gitee Go 需要完整执行三层测试，建议流水线顺序与本地验收命令保持一致，并额外归档以下产物：

- `reports/backend/**`
- `reports/frontend/**`
- `reports/acceptance/**`
- `reports/docker/**`
- `reports/docker-compose.log`
- `reports/acceptance-report.json`
- `reports/acceptance-summary.md`

### 五、Gitee 仓库创建、同步与网页端人工配置

以下事项当前都不是仓库内自动完成项，需要仓库管理员手动配置：

1. Gitee 仓库创建
   - 在 Gitee 网页端新建空仓库。
   - 首次创建时不要额外初始化 README、`.gitignore` 或许可证，避免和现有仓库历史冲突。

2. Gitee 远端同步
   - 本地添加远端：`git remote add gitee <你的 Gitee 仓库地址>`
   - 首次推送主分支：`git push gitee main`
   - 如需同步标签：`git push gitee --tags`
   - 后续由维护人按分支手动推送或在外部平台配置镜像同步；当前仓库没有内建自动镜像脚本

3. 保护分支与合并门禁
   - 需要在 Gitee 网页端手动开启 `main` 保护分支
   - 需要手动限制直接推送，要求通过 Pull Request 合并
   - 需要手动把 Gitee Go 流水线结果设置为合并前置条件
   - 如课程组有要求，还需要手动配置最少评审人数、指定评审人或禁止带失败状态合并

### 六、Docker runner 前提与已知边界

运行 `npm run test:acceptance` 或在 Gitee Go 执行 Docker 回归前，需要满足以下前提：

- runner 已安装 Docker Engine，且 `docker compose` 子命令可用
- runner 允许启动容器、执行 `docker compose exec`、重启容器
- runner 使用 Node.js 20 及以上，以支持脚本中使用的 `fetch`、`File`、`FormData`、`AbortSignal.timeout`
- 运行机上的 `80`、`3000`、`5432` 端口未被其他服务占用
- runner 可读取仓库根目录的 `.env.docker.example`
- 若在 Gitee Go 上执行，优先使用自托管 Docker runner；没有 Docker daemon 的共享 runner 通常无法通过该层测试

当前已知边界：

- Docker API 回归覆盖的是 HTTP API 交付链路，不覆盖浏览器端视觉回归、DOM 交互细节或性能指标
- 脚本依赖固定本地端口和默认 compose 工程名，不适合在同一台机器上并行跑多份相同流水线
- 脚本会在测试库里创建测试账号、商品、订单和上传文件；如果不执行 `docker compose down -v`，这些数据会保留在测试卷中
- 本地 Docker 验收依赖 `AUTH_COOKIE_SECURE=false` 的 HTTP 场景，不等价于生产 HTTPS 配置
- 历史 Prisma migration 仍不是“从空库完整重放”的纯净链路，空库启动仍依赖 `backend/prisma/bootstrap-current-schema.sql` 和容器初始化脚本兜底
- 当前 Docker 回归没有内建 XML/HTML 报告，仅能依赖退出码和日志作为验收证据

## 工程规范

仓库已补齐以下基础规范文件：

- `.editorconfig`
  - `utf-8`
  - `lf`
  - 2 空格缩进
  - 自动补末尾换行
- `.prettierrc.json`
  - 统一格式规则
- `.prettierignore`
  - 忽略构建产物和上传目录
- `.gitattributes`
  - 文本文件统一 `LF`

这些配置的目标是减少 BOM、乱码、换行漂移和格式不一致问题。

## 后台管理说明

- 后台页入口：`/admin`
- 对应接口前缀：`/api/admin`
- 页面和接口都要求当前用户角色为 `ADMIN`
- 当前仓库没有单独提供管理员初始化脚本，如需访问后台，请先在数据库里将目标用户角色改为 `ADMIN`

## 当前已知边界

- `backend/src/services/order.service.ts` 中保留少量防御式兜底校验，这是有意保留的服务层保护
- `backend/src/services/admin.service.ts#getAllOrders` 的 `keyword` 行为仍维持历史空实现，本阶段没有把它扩展成新的搜索功能
- 前端构建包体仍偏大，后续可以继续做路由级拆分和资源收敛

## 推荐验证流程

提交前建议至少执行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

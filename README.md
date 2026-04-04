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

### Docker Initialization Notes

- Empty Docker PostgreSQL databases are now bootstrapped with `backend/prisma/bootstrap-current-schema.sql`.
- After that bootstrap, backend marks the current legacy Prisma migration set as applied, then runs `prisma migrate deploy` again.
- Default product categories are seeded automatically during backend startup, and the seed is idempotent.
- The emergency fallback `prisma db push --skip-generate` is still available, but only as a last resort and is controlled by `PRISMA_ALLOW_DB_PUSH_FALLBACK`.
- Local Docker over plain HTTP should keep `AUTH_COOKIE_SECURE=false`; production HTTPS should change it back to `true`.

Current boundaries:

- The historical Prisma migration directories are still not a complete from-empty replay chain by themselves, so empty-database startup relies on the baseline bootstrap file plus migration metadata normalization.
- If you change the Prisma schema in the future, update both `backend/prisma/bootstrap-current-schema.sql` and the legacy migration handling in `backend/src/scripts/docker-db-init.ts`.

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

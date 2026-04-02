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

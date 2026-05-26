# Campus Market — 后端

> 基于 Node.js + Express + TypeScript + Prisma ORM + PostgreSQL 的校园二手交易平台 REST API 服务。

**语言 / Language：** 简体中文 | [English](./README.md)

返回根目录：[README-zh-CN.md](../README-zh-CN.md)

---

## 目录

- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [环境变量](#环境变量)
- [数据库](#数据库)
- [开发命令](#开发命令)
- [API 接口概览](#api-接口概览)
- [测试](#测试)
- [Docker](#docker)
- [已知边界](#已知边界)

---

## 技术栈

| 类别     | 技术                                             |
| -------- | ------------------------------------------------ |
| 运行时   | Node.js 20+                                      |
| 框架     | Express 4                                        |
| 语言     | TypeScript 5                                     |
| ORM      | Prisma 6（`@prisma/adapter-pg`）                 |
| 数据库   | PostgreSQL 13+                                   |
| 认证     | JWT（`jsonwebtoken`）、Cookie                    |
| 密码     | bcrypt                                           |
| 文件上传 | Multer                                           |
| 校验     | Zod（共享契约层）                                |
| 跨域     | cors                                             |
| 配置     | dotenv                                           |
| 测试     | Jest 29、Supertest、ts-jest                      |
| 共享层   | `@campus-market/shared`（Zod Schema + DTO 类型） |

---

## 目录结构

```text
backend/
├─ src/
│  ├─ __tests__/         # 集成测试（*.integration.test.ts）
│  ├─ app.ts             # Express 应用配置（中间件、路由注册）
│  ├─ server.ts          # HTTP 服务器入口
│  ├─ config/            # 配置加载（数据库、环境变量）
│  ├─ constants/         # 常量定义
│  ├─ controllers/       # 路由控制器（请求/响应层）
│  ├─ mappers/           # 数据映射（DB 实体 → DTO）
│  ├─ middlewares/       # 中间件（认证、错误处理、上传等）
│  ├─ prisma/            # Prisma 客户端实例
│  ├─ routes/            # 路由定义（含路由层测试）
│  ├─ scripts/           # 运维脚本（Docker DB 初始化等）
│  ├─ services/          # 业务逻辑层
│  ├─ types/             # TypeScript 类型扩展
│  ├─ utils/             # 工具函数
│  └─ validation/        # 请求参数校验
├─ prisma/
│  ├─ schema.prisma      # 数据库 Schema 定义
│  ├─ migrations/        # Prisma 迁移历史
│  ├─ seed.ts            # 数据种子脚本
│  └─ bootstrap-current-schema.sql  # Docker 空库基线 SQL
├─ scripts/              # Shell 脚本（docker-entrypoint 等）
├─ Dockerfile            # 多阶段构建镜像
├─ docker-entrypoint.sh  # 容器启动脚本（迁移 + 种子 + 启动）
├─ jest.config.js        # Jest 配置
├─ tsconfig.json         # TypeScript 配置
└─ package.json
```

---

## 环境变量

复制示例文件：

```bash
cp .env.example .env
```

| 变量                            | 必填 | 说明                                                                        |
| ------------------------------- | ---- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                  | ✅   | PostgreSQL 连接串，如 `postgresql://user:pass@localhost:5432/campus_market` |
| `JWT_SECRET`                    | ✅   | JWT 签名密钥，生产环境使用随机长字符串                                      |
| `FRONTEND_URL`                  | ✅   | 前端来源地址（CORS 白名单），如 `http://localhost:5173`                     |
| `PORT`                          | 否   | 监听端口，默认 `3000`                                                       |
| `NODE_ENV`                      | 否   | `development` / `production` / `test`                                       |
| `AUTH_COOKIE_SECURE`            | 否   | `true`（HTTPS）/ `false`（HTTP），默认 `false`                              |
| `PRISMA_ALLOW_DB_PUSH_FALLBACK` | 否   | Docker 启动时是否允许 `prisma db push` 兜底，默认 `false`                   |

---

## 数据库

### 初始化（本地开发）

```bash
# 应用所有迁移并生成 Prisma Client
npm run prisma:deploy
npm run prisma:generate

# 修改 Schema 后创建新迁移
npm run prisma:migrate

# 强制推送 Schema（跳过迁移，用于测试环境）
npm run test:prepare-db
```

### Prisma Studio（可视化管理）

```bash
npm run prisma:studio
```

### 数据种子

```bash
npm run prisma:seed
```

种子脚本补充默认商品分类，可幂等执行。

---

## 开发命令

在 `backend/` 目录下（或在根目录通过 `--workspace` 执行）：

```bash
# 启动开发服务器（ts-node-dev 热重载）
npm run dev

# TypeScript 类型检查
npm run typecheck

# ESLint 静态分析
npm run lint

# 编译 TypeScript
npm run build

# 启动编译后的服务（生产）
npm start
```

本地开发地址：`http://localhost:3000`  
健康检查：`http://localhost:3000/health`

---

## API 接口概览

所有接口以 `/api` 为前缀。

| 前缀              | 模块     | 说明                                          |
| ----------------- | -------- | --------------------------------------------- |
| `/api/auth`       | 认证     | 注册、登录、登出、当前用户                    |
| `/api/products`   | 商品     | 列表、详情、发布、编辑、删除                  |
| `/api/orders`     | 订单     | 创建、列表、详情、状态更新                    |
| `/api/users`      | 用户     | 个人信息、头像上传                            |
| `/api/categories` | 分类     | 分类列表                                      |
| `/api/uploads`    | 文件     | 商品图片上传                                  |
| `/api/admin`      | 后台     | 用户管理、商品管理、订单管理（需 ADMIN 角色） |
| `/health`         | 健康检查 | 服务存活探针                                  |

---

## 测试

### 运行测试

```bash
# 单次执行
npm test

# 监听模式
npm run test:watch

# 带覆盖率
npm run test:coverage

# CI 模式（覆盖率报告 + JUnit XML）
npm run test:ci

# 准备测试数据库（仅推送 Schema，不创建迁移）
npm run test:prepare-db
```

### 测试范围

| 目录                                  | 覆盖内容                        |
| ------------------------------------- | ------------------------------- |
| `src/services/__tests__/`             | 业务逻辑单元测试                |
| `src/controllers/__tests__/`          | 控制器行为                      |
| `src/middlewares/__tests__/`          | 中间件逻辑                      |
| `src/config/__tests__/`               | 配置加载                        |
| `src/routes/__tests__/`               | 路由层（含请求/响应校验）       |
| `src/__tests__/*.integration.test.ts` | 集成测试（依赖真实 PostgreSQL） |

### 覆盖率门禁

- 语句/行/函数：≥ 80%
- 分支：≥ 70%
- 范围：认证、商品、校验、映射等核心模块

### 报告产物

| 产物          | 路径                                      |
| ------------- | ----------------------------------------- |
| 覆盖率 HTML   | `backend/coverage/index.html`             |
| LCOV          | `backend/coverage/lcov.info`              |
| Cobertura XML | `backend/coverage/cobertura-coverage.xml` |
| JUnit XML     | `backend/reports/junit.xml`               |

---

## Docker

### 镜像构建说明

后端 Dockerfile 使用多阶段构建：

1. **deps 阶段**：安装全量依赖（含 devDependencies）
2. **builder 阶段**：编译 `@campus-market/shared`、生成 Prisma Client、编译 TypeScript
3. **runner 阶段**：仅安装生产依赖，复制编译产物和 Prisma Schema，运行最终镜像

### 启动流程（`docker-entrypoint.sh`）

1. 等待 PostgreSQL 健康
2. 尝试执行 `bootstrap-current-schema.sql`（空库基线建表）
3. 归一化历史 Prisma migration 元数据
4. 执行 `prisma migrate deploy`
5. 如前几步失败且 `PRISMA_ALLOW_DB_PUSH_FALLBACK=true`，回退到 `prisma db push`
6. 执行商品分类种子脚本
7. 启动 `node dist/server.js`

### 通过根目录 compose 运行

```bash
docker compose up --build -d
docker compose logs -f backend
```

### 手动执行迁移

```bash
docker compose exec backend npm exec --workspace campus-market-backend prisma migrate deploy --schema backend/prisma/schema.prisma
```

---

## 已知边界

- `order.service.ts` 中保留了有意为之的防御式兜底校验，属服务层保护设计
- `admin.service.ts#getAllOrders` 的 `keyword` 字段保持历史空实现，未扩展为搜索功能
- 历史 Prisma migration 目录非"从空库完整重放"链路；空库启动依赖 `bootstrap-current-schema.sql` 兜底
- 如修改 Prisma Schema，需同步更新 `prisma/bootstrap-current-schema.sql` 和 `src/scripts/docker-db-init.ts` 中的 migration 兼容逻辑
- 集成测试依赖可用的 PostgreSQL 测试库，CI 或本地执行前需先运行 `test:prepare-db`

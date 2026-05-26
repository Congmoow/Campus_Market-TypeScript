# Campus Market

<p align="center">
  <strong>基于 TypeScript Monorepo 的校园二手交易平台</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions"/>
</p>

**语言：** [English](./README.md) | 简体中文

---

## 目录

- [项目简介](#项目简介)
- [项目亮点](#项目亮点)
- [功能模块](#功能模块)
- [项目截图](#项目截图)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [测试与质量保障](#测试与质量保障)
- [CI/CD](#cicd)
- [数据库设计](#数据库设计)
- [后续规划](#后续规划)
- [简历描述参考](#简历描述参考)
- [License](#license)

---

## 项目简介

Campus Market 是一个面向高校学生的校园二手商品交易平台。学生可以在平台上发布闲置物品、浏览商品列表、通过分类和关键词筛选商品、完成交易并管理订单，买卖双方还可以通过站内消息沟通交易细节。

**这不是一个纯页面展示项目**，而是一个包含以下能力的完整全栈工程：

- **前后端分离**：React SPA + Express REST API，通过 Axios 和 JWT 通信
- **共享契约层**：`packages/shared` 维护前后端共用的 Zod Schema 和 TypeScript 类型，接口变更在编译期即可感知
- **数据库驱动**：Prisma ORM + PostgreSQL，具备完整的数据模型、索引设计和迁移链路
- **多层测试**：Jest（后端单元/集成）+ Vitest（前端组件/逻辑）+ Docker API 端到端回归
- **容器化部署**：Docker Compose 编排前端（nginx）、后端（Node.js）和数据库（PostgreSQL），一条命令本地拉起全栈

---

## 项目亮点

- **TypeScript Monorepo**：npm workspaces 统一管理 `frontend` / `backend` / `packages/shared` 三个子包，根目录统一执行 lint、typecheck、test、build
- **共享类型与 Zod 校验**：`@campus-market/shared` 同时提供 TypeScript DTO 类型和 Zod 校验 Schema，前端表单验证与后端请求校验复用同一套定义
- **双 Token 认证**：JWT 访问令牌存于内存（防 XSS），刷新令牌存于 `httpOnly` Cookie（防 JavaScript 读取），支持无感 Token 刷新和 Token 轮转
- **商品全流程**：商品发布（含多图上传）、分类筛选、关键词搜索、浏览量统计、状态管理
- **订单状态机**：买家下单 → 卖家确认/拒绝 → 完成交易，价格快照保证历史数据准确
- **站内消息**：买卖双方围绕商品建立独立会话，支持消息已读/撤回标记
- **收藏夹**：用户可收藏/取消收藏商品，幂等切换
- **后台管理**：ADMIN 角色专属面板，覆盖用户、商品、订单的列表查看和管理操作
- **分层架构**：Router → Controller → Service → Prisma，各层职责清晰，Service 层可独立测试
- **工程化**：ESLint + Prettier + Husky + lint-staged（pre-commit 自动格式化与静态检查）
- **Docker 多阶段构建**：frontend 由 nginx 提供静态资源并反向代理 `/api`，backend 多阶段构建仅保留生产依赖
- **GitHub Actions**：代码质量门禁（lint → typecheck → test → build）+ Docker 整栈回归，自动上传测试制品

---

## 功能模块

| 模块        | 功能说明                                                                | 状态      |
| ----------- | ----------------------------------------------------------------------- | --------- |
| 用户认证    | 注册、登录、登出、JWT + 刷新令牌、Cookie 管理                           | ✅ 已实现 |
| 用户资料    | 头像上传、昵称/院系/年级/简介编辑                                       | ✅ 已实现 |
| 商品发布    | 商品创建、多图上传、分类选择、价格设置                                  | ✅ 已实现 |
| 商品管理    | 编辑、下架/重新上架、删除                                               | ✅ 已实现 |
| 商品浏览    | 列表分页、分类筛选、价格区间、关键词搜索、商品详情                      | ✅ 已实现 |
| 收藏夹      | 收藏/取消收藏、收藏列表                                                 | ✅ 已实现 |
| 订单管理    | 创建订单、订单列表、状态流转（待付款→已完成/已取消）、价格快照          | ✅ 已实现 |
| 站内消息    | 买卖双方围绕商品建立会话、发送消息、消息已读/撤回                       | ✅ 已实现 |
| 文件上传    | 商品图片/头像上传、静态资源访问                                         | ✅ 已实现 |
| 后台管理    | 用户列表与管理、商品列表与管理、订单列表查看                            | ✅ 已实现 |
| 自动化测试  | 后端单元/集成测试（Jest）、前端组件/逻辑测试（Vitest）、Docker API 回归 | ✅ 已实现 |
| Docker 部署 | 前端、后端、数据库一键 Compose 启动，nginx 反向代理                     | ✅ 已实现 |

---

## 项目截图

### 首页

![首页](docs/images/HomePage.png)

### 商品列表

![商品列表](docs/images/ProductList.png)

### 发布商品

![发布商品](docs/images/PublishPage.png)

### 后台管理

![后台管理](docs/images/BackgroundManagement.png)

---

## 技术栈

| 分类     | 技术                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| 前端     | React 18、Vite 5、TypeScript 5、Tailwind CSS 3、React Router v6、Axios、Framer Motion |
| 后端     | Node.js 20、Express 4、TypeScript 5                                                   |
| 数据库   | PostgreSQL 16、Prisma 6（`@prisma/adapter-pg`）                                       |
| 认证     | JWT（`jsonwebtoken`）、bcrypt、httpOnly Cookie                                        |
| 共享契约 | `packages/shared`、Zod 3                                                              |
| 测试     | Jest 29、Supertest、Vitest 1、@testing-library/react                                  |
| 工程化   | ESLint 8、Prettier 3、Husky 9、lint-staged 15                                         |
| 容器化   | Docker、Docker Compose、nginx                                                         |
| CI/CD    | GitHub Actions                                                                        |

---

## 系统架构

```
                              ┌─────────────────────────────────────────────┐
                              │           packages/shared                    │
                              │     Zod Schema  ·  TypeScript DTO 类型        │
                              └───────────────┬─────────────────┬───────────┘
                                              │                 │
                         ┌────────────────────┘                 └─────────────────────┐
                         ▼                                                             ▼
  ┌──────────┐    ┌──────────────────────────┐   HTTP /api/*   ┌─────────────────────────────┐
  │          │    │        frontend/          │ ─────────────► │         backend/             │
  │  用户浏览器 │───►│  React 18 · Vite · TS     │                │  Express · TypeScript · JWT  │
  │          │    │  Tailwind CSS · Router v6  │ ◄─────────────│  Multer · Zod · bcrypt       │
  └──────────┘    └──────────────────────────┘   JSON 响应     └──────────┬──────────────────┘
                              │                                             │
                      nginx /uploads                               ┌────────▼────────┐
                      静态文件代理                                │   Prisma ORM    │
                                                                   └────────┬────────┘
                                                                            │
                                                                   ┌────────▼────────┐
                                                                   │   PostgreSQL    │
                                                                   └─────────────────┘

  ╔══════════════════════════════════════════════════════════════════════════════════╗
  ║  DevOps                                                                          ║
  ║                                                                                  ║
  ║  Docker Compose ──► nginx (:80) + Node.js (:3000) + PostgreSQL (:5432)           ║
  ║                                                                                  ║
  ║  GitHub Actions  ──► lint → typecheck → test → build                            ║
  ║                            └──► Docker API 回归测试 (docker-acceptance.mjs)         ║
  ╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 目录结构

```text
Campus_Market-TypeScript/
├─ frontend/              # React + Vite SPA（含 Tailwind、Vitest、Dockerfile）
├─ backend/               # Express REST API（含 Prisma、Jest、Dockerfile）
├─ packages/
│  └─ shared/             # 前后端共享 Zod Schema 与 TypeScript DTO 类型
├─ scripts/               # 辅助脚本（Docker 验收、CI 脚本等）
├─ .github/workflows/     # GitHub Actions CI 配置
├─ .workflow/             # Gitee Go 流水线配置
├─ docker-compose.yml     # Docker Compose 编排配置
├─ .env.docker.example    # Docker 环境变量模板
└─ package.json           # npm workspaces 根配置
```

子模块架构详情：

- [frontend/ARCHITECTURE.md](./frontend/ARCHITECTURE.md)
- [backend/ARCHITECTURE.md](./backend/ARCHITECTURE.md)

---

## 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- PostgreSQL 13+（或直接使用 Docker 方案，无需本地安装）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

`backend/.env` 必填项：

| 变量           | 说明                                         |
| -------------- | -------------------------------------------- |
| `DATABASE_URL` | PostgreSQL 连接串                            |
| `JWT_SECRET`   | JWT 签名密钥                                 |
| `FRONTEND_URL` | 前端来源（CORS），如 `http://localhost:5173` |

### 3. 初始化数据库

```bash
npm --workspace campus-market-backend run prisma:deploy
npm --workspace campus-market-backend run prisma:generate
```

### 4. 启动开发服务器

```bash
npm run dev
```

前后端并行启动（由 `concurrently` 驱动）：

| 服务     | 地址                         |
| -------- | ---------------------------- |
| 前端     | http://localhost:5173        |
| 后端     | http://localhost:3000        |
| 健康检查 | http://localhost:3000/health |

---

## Docker 部署

一条命令拉起前端（nginx）、后端（Node.js）和数据库（PostgreSQL）：

```bash
# 1. 复制环境变量模板
cp .env.docker.example .env

# 2. 按实际情况修改 .env（至少替换密码和 JWT_SECRET）

# 3. 构建并启动
docker compose up --build -d
```

| 服务       | 地址                  |
| ---------- | --------------------- |
| 前端       | http://localhost      |
| 后端 API   | http://localhost:3000 |
| PostgreSQL | localhost:5432        |

```bash
docker compose logs -f        # 查看日志
docker compose down           # 停止服务
docker compose down -v        # 停止并清除数据卷
```

> 详细配置说明、初始化机制、生产注意事项见 [docs/deployment.md](./docs/deployment.md)。

---

## 测试与质量保障

| 类型              | 工具                       | 说明                                                   |
| ----------------- | -------------------------- | ------------------------------------------------------ |
| 代码规范          | ESLint + Prettier          | 统一代码风格，支持 TypeScript + React                  |
| 提交检查          | Husky + lint-staged        | pre-commit 自动格式化与 ESLint 修复（仅暂存文件）      |
| 类型检查          | TypeScript 5               | 前后端及共享层全链路类型校验                           |
| 后端单元/集成测试 | Jest 29 + Supertest        | 覆盖 services、controllers、middlewares、routes        |
| 前端组件/逻辑测试 | Vitest 1 + Testing Library | 覆盖组件渲染、工具函数、API 请求                       |
| Docker API 回归   | Node.js fetch              | 拉起完整 Compose 环境，从客户侧验证接口链路            |
| CI                | GitHub Actions             | 自动执行 lint → typecheck → test → build + Docker 回归 |

```bash
npm run lint             # ESLint 全工作区
npm run typecheck        # TypeScript 全工作区
npm test                 # Jest（后端）+ Vitest（前端）
npm run build            # 构建 shared → backend → frontend
npm run test:acceptance  # Docker API 端到端回归
```

覆盖率门禁：语句/行/函数 ≥ 80%，分支 ≥ 70%（核心业务模块）。

> 完整测试验收说明见 [docs/testing-acceptance.md](./docs/testing-acceptance.md)。

---

## CI/CD

**GitHub Actions** 配置位于 `.github/workflows/ci.yml`。

| 触发条件             | 说明                      |
| -------------------- | ------------------------- |
| `push` 到 `main`     | 代码合入主干时自动运行    |
| `push` 到 `codex/**` | AI 辅助开发分支同步检查   |
| `pull_request`       | PR 合并前必须通过所有检查 |

| Job                   | 执行内容                                                                |
| --------------------- | ----------------------------------------------------------------------- |
| `code-level-tests`    | lint → typecheck → test（单元/组件/集成）→ build，上传覆盖率制品        |
| `customer-regression` | 依赖前者通过，启动 Docker Compose 整栈，运行 API 回归测试，上传验收报告 |

---

## 数据库设计

基于 `backend/prisma/schema.prisma`，核心数据模型如下：

| 实体             | 说明                                                     |
| ---------------- | -------------------------------------------------------- |
| `User`           | 用户账号（学号、手机号、密码哈希、角色、启用状态）       |
| `UserProfile`    | 用户资料（头像、昵称、院系、年级、信用分、简介）         |
| `Product`        | 商品（标题、描述、价格、原价、分类、状态、浏览量）       |
| `ProductImage`   | 商品图片（支持多图，含排序）                             |
| `Category`       | 商品分类                                                 |
| `Order`          | 订单（买家/卖家/商品关联、价格快照、线下交易地点和时间） |
| `ChatSession`    | 消息会话（买家+卖家+商品三元组唯一）                     |
| `ChatMessage`    | 消息记录（内容、类型、已读/撤回标记）                    |
| `Favorite`       | 收藏关系（用户×商品唯一约束）                            |
| `RefreshSession` | 刷新令牌会话（哈希存储、支持 Token 轮转与吊销）          |

---

## 后续规划

- 移动端响应式适配优化（当前以桌面端为主）
- 商品推荐算法与搜索结果排序优化
- 后台统计看板（交易量、活跃用户等可视化）
- 完善后台权限控制与操作日志
- 增加 Playwright E2E 浏览器端测试
- 补充带托管数据库和持久化对象存储的全栈生产部署方案

---

## 简历描述参考

> 以下描述适合直接用于简历项目经历栏，可根据实际情况微调。

基于 TypeScript Monorepo 构建校园二手交易平台，采用 React 18、Vite、Tailwind CSS、Express、Prisma 和 PostgreSQL 实现用户认证、商品发布与浏览、分类检索、订单管理、站内消息、收藏夹和后台管理等功能。通过 `packages/shared` 维护前后端共享 Zod Schema 与 TypeScript DTO，降低接口联调成本；设计双 Token 认证机制（JWT 内存存储 + httpOnly 刷新 Cookie），支持无感 Token 刷新；使用 Jest、Vitest 和 Docker API 回归测试构建三层测试体系，并通过 GitHub Actions 自动化 lint、typecheck、test、build 全流程质量检查，支持 Docker Compose 一键部署。

---

## License

Copyright (c) 2026 **WangZhongWu**

本项目仅供**个人学习与作品集展示**使用。
完整许可条款见 [LICENSE](./LICENSE) 文件。

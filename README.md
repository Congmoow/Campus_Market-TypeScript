# Campus Market

校园二手交易平台，采用 TypeScript Monorepo 架构实现商品发布、收藏、聊天、下单和后台管理等完整业务流程。

## 项目概览

- 前端：React 18、Vite、TypeScript、Tailwind CSS
- 后端：Node.js、Express、TypeScript、Prisma、PostgreSQL
- 鉴权：JWT + bcrypt
- 测试：Vitest、Jest、React Testing Library、Supertest
- 运行方式：根目录统一调度，也支持前后端独立启动

## 主要功能

- 用户注册、登录、个人资料维护
- 商品发布、编辑、上下架、浏览和搜索
- 收藏夹与收藏状态检查
- 基于商品的聊天会话、消息发送、已读与撤回
- 订单创建、发货、完成、取消与订单详情
- 管理后台数据统计、用户管理、商品管理、订单管理、分类管理

## 当前仓库说明

- README 现在作为项目的主要说明入口
- 早期拆散的过程性和重复性 Markdown 已移除，避免出现多套互相冲突的文档
- 数据库迁移已在仓库中整理为可跟踪状态，初始化数据库时请优先使用 Prisma migration 命令

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18, React Router DOM 6, Vite 5, Tailwind CSS 3, Axios |
| 后端 | Node.js, Express 4, Prisma 5, PostgreSQL, Multer, Zod |
| 认证与安全 | JWT, bcrypt, 基于 `FRONTEND_URL` 的 CORS 白名单 |
| 测试 | Vitest, Jest, React Testing Library, Supertest |

## 目录结构

```text
Campus_Market-TypeScript/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  ├─ scripts/
│  └─ src/
│     ├─ config/
│     ├─ controllers/
│     ├─ middlewares/
│     ├─ routes/
│     ├─ services/
│     ├─ types/
│     └─ utils/
├─ frontend/
│  ├─ public/
│  └─ src/
│     ├─ api/
│     ├─ assets/
│     ├─ components/
│     ├─ hooks/
│     ├─ lib/
│     └─ pages/
└─ package.json
```

## 环境要求

| 工具 | 要求 |
| --- | --- |
| Node.js | 18 或更高 |
| npm | 9 或更高 |
| PostgreSQL | 13 或更高 |

## 快速启动

### 1. 克隆并安装依赖

```bash
git clone <your-repo-url>
cd Campus_Market-TypeScript
npm install
```

### 2. 配置环境变量

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

macOS / Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

至少需要确认下面两个值：

- `backend/.env` 中的 `DATABASE_URL`
- `backend/.env` 中的 `JWT_SECRET`

默认前端通过 Vite 代理访问后端，本地通常不需要修改 `frontend/.env`。

### 3. 初始化数据库

先创建数据库，例如 `campus_market`，再执行：

```bash
cd backend
npm run prisma:deploy
npm run prisma:generate
cd ..
```

如果你正在本地继续演进 schema，而不是单纯消费已提交迁移，再使用：

```bash
cd backend
npm run prisma:migrate
```

### 4. 启动开发环境

根目录同时启动前后端：

```bash
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`
- 健康检查：`http://localhost:3000/health`

## 常用脚本

### 根目录

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动前后端 |
| `npm run build` | 构建前后端 |
| `npm test` | 运行前后端测试 |

### 后端

| 命令 | 说明 |
| --- | --- |
| `cd backend && npm run dev` | 启动后端开发服务 |
| `cd backend && npm run build` | 编译后端 |
| `cd backend && npm start` | 运行编译后的后端 |
| `cd backend && npm run prisma:deploy` | 应用已提交迁移 |
| `cd backend && npm run prisma:generate` | 重新生成 Prisma Client |
| `cd backend && npm run prisma:studio` | 打开 Prisma Studio |
| `cd backend && npm test` | 运行 Jest 测试 |

### 前端

| 命令 | 说明 |
| --- | --- |
| `cd frontend && npm run dev` | 启动前端开发服务 |
| `cd frontend && npm run build` | 构建前端 |
| `cd frontend && npm run lint` | 运行 ESLint |
| `cd frontend && npm test` | 运行 Vitest |

## 环境变量

### 后端关键变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 后端端口，默认 `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `JWT_SECRET` | JWT 签名密钥，生产环境必须改为强随机值 |
| `JWT_EXPIRATION` | Token 过期时间 |
| `FRONTEND_URL` | 允许的前端来源，支持逗号分隔多个地址 |
| `UPLOAD_DIR` | 上传目录 |
| `MAX_FILE_SIZE` | 上传文件大小限制 |

### 前端关键变量

| 变量 | 说明 |
| --- | --- |
| `VITE_API_URL` | 生产环境 API 地址 |
| `VITE_APP_NAME` | 前端应用名称 |
| `VITE_APP_VERSION` | 前端应用版本 |

## API 模块概览

| 模块 | 主要路由前缀 | 说明 |
| --- | --- | --- |
| 认证 | `/api/auth` | 注册、登录、当前用户、重置密码 |
| 商品 | `/api/products` | 列表、详情、发布、编辑、状态流转、浏览量 |
| 用户 | `/api/users` | 用户资料、个人资料更新、用户商品 |
| 订单 | `/api/orders` | 下单、我的订单、详情、发货、完成、取消 |
| 聊天 | `/api/chat` | 发起聊天、会话、消息、已读、撤回 |
| 收藏 | `/api/favorites` | 列表、检查、添加、取消 |
| 上传 | `/api/upload` | 头像、商品图片、聊天图片 |
| 管理端 | `/api/admin` | 统计、用户、商品、订单、分类管理 |

统一响应格式：

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};
```

## 管理员说明

- 新注册用户默认角色为 `USER`
- `/admin` 页面和 `/api/admin/*` 接口要求用户角色为 `ADMIN`
- 当前仓库没有提供单独的管理员初始化脚本；如需访问管理后台，请在数据库中将目标用户的 `user.role` 更新为 `ADMIN`

## 开发说明

- 前后端共享类型定义位于 `backend/src/types/shared.ts`
- 后端采用 `routes -> controllers -> services -> prisma` 分层
- 订单状态以 `PENDING / SHIPPED / COMPLETED / CANCELLED` 为准
- 聊天接口当前实际入口是 `POST /api/chat/start`，不是旧文档里出现过的其它写法
- 收藏接口当前以 `/:productId` 作为增删入口，并提供 `/check/:productId` 查询状态

## 测试与验证

常用验证命令：

```bash
npm test
cd frontend && npm run lint
cd backend && npm run build
cd frontend && npm run build
```

如果只改了数据库结构，至少再执行一次：

```bash
cd backend
npm run prisma:deploy
npm run prisma:generate
```

## 已知事项

- 前端构建体积仍然偏大，后续可以继续做路由级拆包
- `backend/prisma/migrations/` 下除了 Prisma 标准迁移目录，还保留了若干历史 SQL 文件，用于补充历史演进记录
- 本仓库当前没有 Docker 部署文件，也没有独立的 `QUICK_START.md`

## 适合继续完善的方向

- 增加 CI 工作流
- 提供管理员初始化或种子脚本
- 补充接口契约文档生成方案
- 继续压缩前端首包并减少构建警告

本项目目前更适合作为课程项目、练习项目或二次改造的基础工程。

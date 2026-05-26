# Campus Market — 前端

> 基于 React 18 + Vite + TypeScript + Tailwind CSS 的校园二手交易平台前端 SPA。

**语言 / Language：** 简体中文 | [English](./README.md)

返回根目录：[README-zh-CN.md](../README-zh-CN.md)

---

## 目录

- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [环境变量](#环境变量)
- [开发命令](#开发命令)
- [测试](#测试)
- [构建与部署](#构建与部署)
- [页面与功能概览](#页面与功能概览)
- [Docker](#docker)

---

## 技术栈

| 类别   | 技术                                                        |
| ------ | ----------------------------------------------------------- |
| 框架   | React 18、React Router v6                                   |
| 构建   | Vite 5、TypeScript 5                                        |
| 样式   | Tailwind CSS 3、tailwind-merge、clsx                        |
| HTTP   | Axios                                                       |
| 动画   | Framer Motion、Lottie React                                 |
| 图表   | Recharts                                                    |
| 图标   | Lucide React、Icon Park React                               |
| 表情   | emoji-mart                                                  |
| 滑块   | rc-slider                                                   |
| 测试   | Vitest、@testing-library/react、@testing-library/user-event |
| 共享层 | `@campus-market/shared`（Zod Schema + DTO 类型）            |

---

## 目录结构

```text
frontend/
├─ src/
│  ├─ api/               # Axios 请求封装
│  ├─ assets/            # 静态资源（图片、动画）
│  ├─ components/        # 可复用 UI 组件
│  ├─ hooks/             # 自定义 React Hooks
│  ├─ lib/               # 工具函数与辅助逻辑
│  ├─ pages/             # 路由页面组件
│  ├─ test/              # 测试辅助（setup 等）
│  ├─ App.tsx            # 路由根组件
│  ├─ main.tsx           # 应用入口
│  └─ index.css          # 全局样式
├─ public/               # 公共静态文件
├─ nginx/
│  └─ default.conf       # Docker 生产环境 nginx 配置
├─ Dockerfile            # 多阶段构建镜像
├─ vite.config.ts        # Vite 配置（含本地代理）
├─ vitest.config.ts      # Vitest 测试配置
├─ tailwind.config.js    # Tailwind 主题配置
├─ tsconfig.json         # TypeScript 配置
└─ package.json
```

---

## 环境变量

复制示例文件：

```bash
cp .env.example .env
```

| 变量           | 必填 | 默认值 | 说明                                                            |
| -------------- | ---- | ------ | --------------------------------------------------------------- |
| `VITE_API_URL` | 否   | （空） | 后端 API 地址；本地通过 Vite 代理访问 `/api` 时可留空或保持默认 |

> **注意：** 以 `VITE_` 开头的变量才会被 Vite 注入到客户端代码。不要在 `.env` 中存放任何服务端密钥。

---

## 开发命令

在 `frontend/` 目录下（或在根目录通过 `--workspace` 执行）：

```bash
# 启动开发服务器（含热更新，自动代理 /api 到 localhost:3000）
npm run dev

# TypeScript 类型检查
npm run typecheck

# ESLint 静态分析
npm run lint

# 预览生产构建结果
npm run preview
```

也可在根目录统一执行：

```bash
npm --workspace campus-market-frontend run dev
```

本地开发地址：`http://localhost:5173`

---

## 测试

### 运行测试

```bash
# 单次执行
npm test

# 监听模式（文件变动自动重跑）
npm run test:watch

# 带覆盖率
npm run test:coverage

# CI 模式（生成覆盖率报告 + JUnit XML）
npm run test:ci
```

### 测试范围

| 目录                        | 覆盖内容           |
| --------------------------- | ------------------ |
| `src/components/__tests__/` | UI 组件渲染与交互  |
| `src/pages/__tests__/`      | 页面级集成行为     |
| `src/lib/__tests__/`        | 工具函数与辅助逻辑 |
| `src/api/__tests__/`        | API 请求函数       |

### 覆盖率门禁

- 语句/行/函数：≥ 80%
- 分支：≥ 70%
- 范围：入口、商品卡片、分类组件、用户展示工具等核心模块

### 报告产物

| 产物          | 路径                                       |
| ------------- | ------------------------------------------ |
| 覆盖率 HTML   | `frontend/coverage/index.html`             |
| LCOV          | `frontend/coverage/lcov.info`              |
| Cobertura XML | `frontend/coverage/cobertura-coverage.xml` |
| JUnit XML     | `frontend/reports/frontend-junit.xml`      |

---

## 构建与部署

### 生产构建

```bash
npm run build
```

构建产物输出至 `frontend/dist/`，为纯静态资源，可部署到任何静态托管服务。

> 构建前会自动触发 `@campus-market/shared` 的编译（`prebuild` 钩子）。

### 本地预览构建结果

```bash
npm run preview
```

---

## 页面与功能概览

| 路由           | 说明                             |
| -------------- | -------------------------------- |
| `/`            | 首页（商品列表、分类筛选、搜索） |
| `/login`       | 用户登录                         |
| `/register`    | 用户注册                         |
| `/product/:id` | 商品详情                         |
| `/publish`     | 发布商品（需登录）               |
| `/orders`      | 我的订单                         |
| `/profile`     | 个人中心                         |
| `/admin`       | 后台管理（需 ADMIN 角色）        |

---

## Docker

前端生产镜像使用多阶段构建：

1. **构建阶段**：Node.js 环境下执行 `npm run build`，输出静态资源
2. **服务阶段**：nginx 提供静态文件服务，并反向代理 `/api` 和 `/uploads` 到后端

nginx 配置位于 `nginx/default.conf`，对外暴露端口 `80`。

Docker 构建（通常通过根目录 compose 执行）：

```bash
docker compose up --build -d
```

> 前端访问地址：`http://localhost`

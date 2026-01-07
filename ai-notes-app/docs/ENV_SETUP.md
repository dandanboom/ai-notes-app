# 环境变量配置指南

## 概述

本文档描述运行 AI Notes App 所需的所有环境变量。

## 必需的环境变量

### 1. Supabase 配置

从以下位置获取：https://supabase.com/dashboard/project/_/settings/api

```bash
# 公共 URL（浏览器端使用）
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# 匿名密钥（公共密钥，可以安全地暴露给客户端）
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 数据库配置 (Prisma)

从以下位置获取：https://supabase.com/dashboard/project/_/settings/database

点击 "Connection string" 标签页，选择 "URI" 格式

```bash
# 连接池连接（用于应用查询）- 端口 6543
# 格式：postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 直连（用于数据库迁移）- 端口 5432
# 格式：postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### 3. AI 配置 (Google Gemini)

```bash
GOOGLE_API_KEY=your-google-api-key
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-3-flash-preview
```

## 设置步骤

### 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 使用 GitHub 登录或创建新账户
4. 点击 "New Project"
5. 填写项目信息：
   - **Name**: `ai-notes-app`（或你喜欢的名称）
   - **Database Password**: 创建一个强密码（请记住它！）
   - **Region**: 选择离你最近的区域
6. 点击 "Create new project"，等待项目创建完成（约 2 分钟）

### 步骤 2：获取 API 密钥

1. 在 Supabase 仪表板中，点击左侧的 ⚙️ **Settings**
2. 点击 **API** 标签
3. 复制以下信息：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** 密钥 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 步骤 3：获取数据库连接字符串

1. 在 Settings 中，点击 **Database** 标签
2. 向下滚动到 **Connection string** 部分
3. 选择 **URI** 格式
4. 复制连接字符串：
   - **Session mode (port 5432)** → `DIRECT_URL`
   - **Transaction mode (port 6543)** → `DATABASE_URL`
5. **重要**：将 `[YOUR-PASSWORD]` 替换为你在步骤 1 中创建的数据库密码

### 步骤 4：创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
touch .env.local
```

添加所有环境变量：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Prisma Database
DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:5432/postgres"

# AI (Google Gemini)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-3-flash-preview
```

### 步骤 5：运行数据库迁移

```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init
```

### 步骤 6：启动开发服务器

```bash
npm run dev
```

## Vercel 部署

部署到 Vercel 时，需要在以下位置添加环境变量：
- Project Settings > Environment Variables

确保为所有环境（Production、Preview、Development）添加这些变量。

### 必需的环境变量

| 变量名 | 描述 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `DATABASE_URL` | 数据库连接池 URL |
| `DIRECT_URL` | 数据库直连 URL |
| `GOOGLE_API_KEY` | Google Gemini API 密钥 |
| `GOOGLE_BASE_URL` | Gemini API 基础 URL |
| `GEMINI_MODEL` | 使用的 Gemini 模型名称 |

## 常见问题

### Q: 迁移失败，提示连接被拒绝

确保：
1. `DIRECT_URL` 使用的是端口 5432（不是 6543）
2. 数据库密码正确
3. Supabase 项目状态正常

### Q: 应用无法连接数据库

确保：
1. `DATABASE_URL` 包含 `?pgbouncer=true` 参数
2. 环境变量已正确加载（重启开发服务器）

### Q: 用户认证不工作

确保：
1. `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确
2. 在 Supabase 仪表板中启用了 Email 认证


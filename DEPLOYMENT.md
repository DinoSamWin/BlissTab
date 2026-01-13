# StartlyTab 部署指南

本指南将帮助你部署 StartlyTab 到生产环境，并配置域名和用户数据存储。

## 📋 前置要求

1. **GitHub 账号** - 用于代码托管
2. **Vercel 账号** - 用于部署（免费）
3. **Supabase 账号** - 用于数据库（免费）
4. **Google Cloud Console 账号** - 用于 OAuth（免费）
5. **域名** - www.startlytab.com（需要购买）

---

## 🚀 部署步骤

### 第一步：准备代码仓库

1. 确保代码已提交到 GitHub：
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 第二步：设置 Supabase 数据库

1. 访问 [Supabase](https://supabase.com) 并注册账号
2. 创建新项目：
   - Project Name: `startlytab`
   - Database Password: （保存好密码）
   - Region: 选择离用户最近的区域
3. 等待项目创建完成（约 2 分钟）
4. 在 Supabase Dashboard 中：
   - 进入 **SQL Editor**
   - 复制 `supabase-schema.sql` 文件内容
   - 粘贴并执行 SQL
5. 获取 Supabase 凭证：
   - 进入 **Settings** > **API**
   - 复制 **Project URL**（`VITE_SUPABASE_URL`）
   - 复制 **anon/public key**（`VITE_SUPABASE_ANON_KEY`）

### 第三步：配置 Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 创建新项目或选择现有项目
3. 启用 Google+ API：
   - 进入 **APIs & Services** > **Library**
   - 搜索 "Google+ API" 并启用
4. 创建 OAuth 2.0 凭证：
   - 进入 **APIs & Services** > **Credentials**
   - 点击 **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Name: `StartlyTab`
   - Authorized JavaScript origins:
     - `http://localhost:3000`（开发环境）
     - `https://www.startlytab.com`（生产环境）
     - `https://startlytab.vercel.app`（Vercel 预览）
   - Authorized redirect URIs:
     - `http://localhost:3000`
     - `https://www.startlytab.com`
     - `https://startlytab.vercel.app`
   - 点击 **Create**
   - 复制 **Client ID**（`VITE_GOOGLE_CLIENT_ID`）

### 第四步：安装 Supabase 客户端库

```bash
npm install @supabase/supabase-js
```

### 第五步：更新 Supabase 服务

更新 `services/supabaseService.ts` 文件，添加真实的 Supabase 客户端初始化：

```typescript
import { createClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not configured. Falling back to localStorage.');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (e) {
    console.error('Failed to initialize Supabase:', e);
    return null;
  }
}

// ... 其余代码保持不变
```

### 第六步：部署到 Vercel

1. 访问 [Vercel](https://vercel.com) 并登录（使用 GitHub 账号）
2. 点击 **Add New Project**
3. 导入你的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加环境变量：
   - `VITE_GOOGLE_CLIENT_ID` = （你的 Google Client ID）
   - `VITE_SUPABASE_URL` = （你的 Supabase URL）
   - `VITE_SUPABASE_ANON_KEY` = （你的 Supabase Anon Key）
   - `VITE_GEMINI_API_KEY` = （你的 Gemini API Key，如果使用 AI 功能）
6. 点击 **Deploy**
7. 等待部署完成（约 2-3 分钟）

### 第七步：配置自定义域名

1. 在 Vercel Dashboard 中：
   - 进入你的项目
   - 点击 **Settings** > **Domains**
   - 输入 `www.startlytab.com`
   - 点击 **Add**
2. 配置 DNS（在你的域名注册商处）：
   - 添加 CNAME 记录：
     - Type: `CNAME`
     - Name: `www`
     - Value: `cname.vercel-dns.com`
   - 或者添加 A 记录（如果 Vercel 提供 IP）：
     - Type: `A`
     - Name: `@`
     - Value: （Vercel 提供的 IP）
3. 等待 DNS 传播（通常 5-30 分钟）
4. Vercel 会自动配置 SSL 证书

### 第八步：更新 Google OAuth 配置

1. 返回 Google Cloud Console
2. 编辑 OAuth 2.0 凭证
3. 添加生产域名到 **Authorized JavaScript origins**：
   - `https://www.startlytab.com`
4. 保存更改

---

## 🔧 环境变量说明

### 开发环境（`.env.local`）

创建 `.env.local` 文件（不要提交到 Git）：

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 生产环境（Vercel）

在 Vercel Dashboard 的 **Settings** > **Environment Variables** 中配置。

---

## 📊 数据库结构

### user_data 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| user_id | TEXT | 用户 ID（Google OAuth sub）|
| email | TEXT | 用户邮箱 |
| data | JSONB | 用户数据（links, requests, language, theme）|
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

---

## 🔒 安全注意事项

1. **Row Level Security (RLS)**：已启用，用户只能访问自己的数据
2. **环境变量**：敏感信息存储在环境变量中，不会暴露在前端代码
3. **HTTPS**：Vercel 自动提供 SSL 证书
4. **CORS**：Supabase 已配置允许的域名

---

## 🐛 故障排除

### 问题：部署后无法登录

**解决方案**：
1. 检查 Google OAuth 配置中的授权域名是否正确
2. 检查环境变量是否正确设置
3. 查看浏览器控制台错误信息

### 问题：数据无法同步

**解决方案**：
1. 检查 Supabase 项目是否正常运行
2. 检查 RLS 策略是否正确配置
3. 查看 Supabase Dashboard 的 Logs

### 问题：域名无法访问

**解决方案**：
1. 检查 DNS 配置是否正确
2. 等待 DNS 传播完成（最多 48 小时）
3. 检查 Vercel 域名配置状态

---

## 📈 后续优化

1. **性能优化**：
   - 启用 Vercel Edge Functions
   - 配置 CDN 缓存策略
   - 优化图片加载

2. **监控和分析**：
   - 集成 Vercel Analytics
   - 添加错误追踪（Sentry）
   - 用户行为分析

3. **扩展功能**：
   - 添加用户设置同步
   - 实现数据备份功能
   - 添加多设备同步通知

---

## 📞 支持

如有问题，请查看：
- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Google OAuth 文档](https://developers.google.com/identity/protocols/oauth2)

---

**部署完成后，你的网站将在 https://www.startlytab.com 上线！** 🎉


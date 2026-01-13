# Google OAuth 错误修复指南

## 错误信息
- "The OAuth client was not found"
- "错误 401: invalid_client"

## 可能的原因和解决方案

### 1. 检查 Google Cloud Console 配置

访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 并检查：

#### ✅ 授权 JavaScript 来源 (Authorized JavaScript origins)

必须添加以下域名：

**开发环境：**
- `http://localhost:3000`
- `http://localhost:5173` (Vite 默认端口)

**生产环境：**
- `https://www.startlytab.com`
- `https://startlytab.vercel.app` (你的 Vercel 域名)
- `https://your-project-name.vercel.app` (如果不同)

#### ✅ 授权重定向 URI (Authorized redirect URIs)

必须添加：

**开发环境：**
- `http://localhost:3000`
- `http://localhost:5173`

**生产环境：**
- `https://www.startlytab.com`
- `https://startlytab.vercel.app`

### 2. 验证 Client ID 格式

你的 Client ID 应该是：
```
65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com
```

格式：`数字-字符串.apps.googleusercontent.com`

### 3. 检查环境变量

#### 本地开发环境

确认 `.env.local` 文件存在且包含：
```env
VITE_GOOGLE_CLIENT_ID=65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com
```

**重要：**
- 修改 `.env.local` 后，必须**重启开发服务器**
- 运行 `npm run dev` 重新启动

#### Vercel 生产环境

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目
3. 点击 **Settings** → **Environment Variables**
4. 确认 `VITE_GOOGLE_CLIENT_ID` 已设置
5. **重新部署**项目（重要！）

### 4. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签：

应该看到：
```
[Auth] Client ID loaded: Yes
[Auth] Client ID value: 65772780936-6opn1jo...
[Auth] Is placeholder: false
```

如果看到 "No" 或 "Not set"，说明环境变量没有正确加载。

### 5. 常见问题排查

#### 问题 A: 环境变量未加载

**解决方案：**
1. 确认 `.env.local` 文件在项目根目录
2. 确认文件名是 `.env.local`（不是 `.env`）
3. 重启开发服务器：停止当前服务器，运行 `npm run dev`

#### 问题 B: 域名未授权

**解决方案：**
1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 点击你的 OAuth 2.0 Client ID
3. 在 "Authorized JavaScript origins" 中添加当前域名
4. 在 "Authorized redirect URIs" 中添加当前域名
5. 点击 "Save"
6. 等待几分钟让更改生效

#### 问题 C: Vercel 环境变量未生效

**解决方案：**
1. 在 Vercel Dashboard 中确认环境变量已添加
2. 进入 **Deployments** 页面
3. 找到最新部署，点击右侧 "..." 菜单
4. 选择 **Redeploy**
5. 等待部署完成

### 6. 测试步骤

1. **本地测试：**
   ```bash
   npm run dev
   ```
   访问 `http://localhost:3000` 或 `http://localhost:5173`
   打开浏览器控制台，检查是否有错误

2. **生产环境测试：**
   - 访问你的 Vercel 域名
   - 打开浏览器控制台
   - 尝试登录

### 7. 调试代码

如果问题仍然存在，在浏览器控制台运行：

```javascript
// 检查环境变量
console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);

// 检查 Google SDK
console.log('Google SDK:', window.google?.accounts?.id);
```

## 快速检查清单

- [ ] Google Cloud Console 中已添加授权域名
- [ ] Google Cloud Console 中已添加重定向 URI
- [ ] `.env.local` 文件存在且包含正确的 Client ID
- [ ] 开发服务器已重启
- [ ] Vercel 环境变量已设置
- [ ] Vercel 项目已重新部署
- [ ] 浏览器控制台没有错误信息

## 需要帮助？

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整错误信息
2. 你当前访问的域名（localhost 还是 Vercel 域名）
3. Google Cloud Console 中 OAuth 客户端的截图


# Google OAuth 错误快速修复指南

## 🔴 错误信息
- "The OAuth client was not found"
- "错误 401: invalid_client"

## ✅ 立即修复步骤

### 步骤 1: 检查 Google Cloud Console 配置

1. **访问 Google Cloud Console**
   - 打开：https://console.cloud.google.com/apis/credentials
   - 确保登录的是正确的 Google 账号

2. **找到你的 OAuth 客户端**
   - 在 "OAuth 2.0 Client IDs" 列表中，找到：
     ```
     65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u
     ```
   - 点击这个 Client ID 进入编辑页面

3. **添加授权 JavaScript 来源**
   
   在 "Authorized JavaScript origins" 部分，确保添加了：
   
   **本地开发环境：**
   ```
   http://localhost:3000
   http://localhost:5173
   ```
   
   **生产环境：**
   ```
   https://startlytab.vercel.app
   https://www.startlytab.com
   ```

4. **添加授权重定向 URI**
   
   在 "Authorized redirect URIs" 部分，确保添加了：
   
   **本地开发环境：**
   ```
   http://localhost:3000
   http://localhost:5173
   ```
   
   **生产环境：**
   ```
   https://startlytab.vercel.app
   https://www.startlytab.com
   ```

5. **保存更改**
   - 点击页面底部的 "SAVE" 按钮
   - ⚠️ **重要**：等待 1-2 分钟让更改生效

---

### 步骤 2: 验证本地环境变量

1. **检查 `.env.local` 文件**
   
   在项目根目录确认文件存在且包含：
   ```env
   VITE_GOOGLE_CLIENT_ID=65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com
   ```

2. **重启开发服务器**
   
   ⚠️ **重要**：修改 `.env.local` 后必须重启服务器
   
   ```bash
   # 停止当前服务器（Ctrl+C）
   # 然后重新启动
   npm run dev
   ```

---

### 步骤 3: 检查浏览器控制台

1. 打开浏览器开发者工具（F12 或 Cmd+Option+I）
2. 切换到 "Console" 标签
3. 刷新页面
4. 查看日志，应该看到：
   ```
   [Auth] ===== Google OAuth Configuration =====
   [Auth] Client ID loaded: Yes
   [Auth] Client ID value: 65772780936-6opn1jo...
   [Auth] Full Client ID: 65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com
   [Auth] Is placeholder: false
   [Auth] Current origin: http://localhost:3000
   ```

如果看到 "Client ID loaded: No" 或 "NOT SET"，说明环境变量没有正确加载。

---

### 步骤 4: 测试登录

1. 确保 Google Cloud Console 配置已保存并等待 1-2 分钟
2. 刷新页面 `http://localhost:3000`
3. 点击 Google 登录按钮
4. 应该能正常跳转到 Google 登录页面

---

## 🔍 常见问题排查

### 问题 1: 环境变量未加载

**症状：** 控制台显示 "Client ID loaded: No"

**解决方案：**
1. 确认 `.env.local` 文件在项目根目录（不是子目录）
2. 确认文件名是 `.env.local`（不是 `.env` 或其他）
3. 确认文件内容格式正确（没有多余的空格或引号）
4. **重启开发服务器**

### 问题 2: 域名未授权

**症状：** 点击登录后显示 "invalid_client" 错误

**解决方案：**
1. 访问 Google Cloud Console
2. 检查 "Authorized JavaScript origins" 是否包含当前域名
3. 检查 "Authorized redirect URIs" 是否包含当前域名
4. 保存后等待 1-2 分钟

### 问题 3: Client ID 格式错误

**症状：** 控制台显示错误的 Client ID

**解决方案：**
1. 确认 Client ID 格式：`数字-字符串.apps.googleusercontent.com`
2. 不要包含多余的空格或换行
3. 不要用引号包裹

---

## 📋 快速检查清单

在尝试登录前，确认：

- [ ] Google Cloud Console 中已添加 `http://localhost:3000` 到 "Authorized JavaScript origins"
- [ ] Google Cloud Console 中已添加 `http://localhost:3000` 到 "Authorized redirect URIs"
- [ ] Google Cloud Console 配置已保存
- [ ] 等待了 1-2 分钟让配置生效
- [ ] `.env.local` 文件存在且包含正确的 Client ID
- [ ] 开发服务器已重启（修改 `.env.local` 后）
- [ ] 浏览器控制台显示 "Client ID loaded: Yes"

---

## 🆘 仍然无法解决？

如果以上步骤都无法解决问题，请提供：

1. **浏览器控制台的完整日志**（截图或复制文本）
2. **当前访问的域名**（localhost:3000 还是其他端口）
3. **Google Cloud Console 的配置截图**（OAuth 客户端设置页面）

---

## 📝 重要提示

1. **每次修改 `.env.local` 后必须重启开发服务器**
2. **Google Cloud Console 配置更改需要 1-2 分钟生效**
3. **确保添加的域名与当前访问的域名完全一致**（包括协议 http/https 和端口号）


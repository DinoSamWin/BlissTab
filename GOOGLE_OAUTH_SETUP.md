# Google OAuth 配置操作步骤

## 📋 你需要手动完成的步骤（我无法直接访问 Google Cloud Console）

### 步骤 1: 访问 Google Cloud Console

1. 打开浏览器，访问：https://console.cloud.google.com/apis/credentials
2. 确保你登录的是正确的 Google 账号
3. 选择正确的项目（如果创建了多个项目）

### 步骤 2: 找到你的 OAuth 客户端

1. 在 "OAuth 2.0 Client IDs" 列表中，找到 Client ID：
   ```
   65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u
   ```
2. 点击这个 Client ID 进入编辑页面

### 步骤 3: 配置授权域名

在 "Authorized JavaScript origins" 部分，点击 "ADD URI"，依次添加：

**开发环境：**
```
http://localhost:3000
http://localhost:5173
```

**生产环境（根据你的实际域名添加）：**
```
https://your-project-name.vercel.app
https://www.startlytab.com
```

### 步骤 4: 配置重定向 URI

在 "Authorized redirect URIs" 部分，点击 "ADD URI"，添加相同的域名：

**开发环境：**
```
http://localhost:3000
http://localhost:5173
```

**生产环境：**
```
https://your-project-name.vercel.app
https://www.startlytab.com
```

### 步骤 5: 保存更改

1. 点击页面底部的 "SAVE" 按钮
2. 等待 1-2 分钟让更改生效

---

## ✅ 我可以帮你完成的部分

### 1. 验证本地环境变量

我已经检查了你的 `.env.local` 文件，配置正确：
- ✅ VITE_GOOGLE_CLIENT_ID 已设置
- ✅ VITE_SUPABASE_URL 已设置
- ✅ VITE_SUPABASE_ANON_KEY 已设置

### 2. 添加调试日志

我已经在代码中添加了调试日志，你可以在浏览器控制台看到：
- Client ID 是否加载
- Client ID 的值（部分显示）
- 是否是占位符

### 3. 检查代码配置

代码配置看起来是正确的。

---

## 🔍 测试步骤

完成 Google Cloud Console 配置后：

1. **重启开发服务器**（如果正在运行）：
   ```bash
   # 停止当前服务器（按 Ctrl+C）
   # 然后重新启动
   npm run dev
   ```

2. **打开浏览器开发者工具**：
   - 按 `F12` 或 `Cmd+Option+I` (Mac)
   - 切换到 "Console" 标签

3. **刷新页面**，查看控制台输出：
   - 应该看到 `[Auth] Client ID loaded: Yes`
   - 应该看到 `[Auth] Is placeholder: false`

4. **尝试登录**：
   - 点击 Google 登录按钮
   - 查看是否有错误信息

---

## 🚨 常见问题

### 问题 1: 仍然显示 "OAuth client was not found"

**可能原因：**
- 域名未添加到授权列表
- 等待时间不够（需要 1-2 分钟）

**解决方案：**
1. 再次检查 Google Cloud Console 中的授权域名
2. 确保添加的是完整的 URL（包括 `http://` 或 `https://`）
3. 清除浏览器缓存并重试

### 问题 2: 环境变量未加载

**检查方法：**
- 打开浏览器控制台
- 查看是否有 `[Auth] Client ID loaded: No`

**解决方案：**
1. 确认 `.env.local` 文件在项目根目录
2. 确认文件内容正确
3. 重启开发服务器

### 问题 3: 本地可以，但 Vercel 不行

**解决方案：**
1. 在 Vercel Dashboard 中确认环境变量已添加
2. 重新部署项目
3. 确认 Vercel 域名已添加到 Google Cloud Console

---

## 📝 配置检查清单

完成以下所有项目：

- [ ] Google Cloud Console 中已添加 `http://localhost:3000`
- [ ] Google Cloud Console 中已添加 `http://localhost:5173`
- [ ] Google Cloud Console 中已添加你的 Vercel 域名
- [ ] 所有域名都已保存
- [ ] 等待了 1-2 分钟
- [ ] 重启了开发服务器
- [ ] 浏览器控制台显示 Client ID 已加载
- [ ] 尝试登录测试

---

## 💡 提示

如果你不确定你的 Vercel 域名是什么：
1. 访问 https://vercel.com/dashboard
2. 点击你的项目
3. 在项目页面可以看到你的域名（通常是 `your-project-name.vercel.app`）

完成 Google Cloud Console 配置后告诉我，我可以帮你测试！


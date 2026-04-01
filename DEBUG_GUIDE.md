# StartlyTab 调试指南

## 🔍 如何检查配置状态

### 方法 1: 使用浏览器控制台（最准确）

1. **访问主页**：
   ```
   https://startlytab.vercel.app
   ```

2. **打开浏览器开发者工具**：
   - 按 `F12` 或 `Cmd+Option+I` (Mac)
   - 或右键页面 → "检查" / "Inspect"

3. **切换到 Console 标签**

4. **刷新页面**（`Cmd+R` 或 `Ctrl+R`）

5. **查看日志**，应该看到：

```
[Auth] ===== Google OAuth Configuration =====
[Auth] Client ID loaded: Yes
[Auth] Client ID value: 65772780936-6opn1jo...
[Auth] Full Client ID: 65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com
[Auth] Current origin: https://startlytab.vercel.app
[Auth] Environment: production
[Auth] All env vars: {hasClientId: true, hasSupabaseUrl: true, hasSupabaseKey: true}
[Auth] ======================================
[App] Initializing Google Auth...
[Auth] Google SDK loaded, initializing...
[Auth] Google SDK initialized successfully
```

### 方法 2: 诊断页面（辅助工具）

访问：`https://startlytab.vercel.app/debug.html`

**注意**：诊断页面是静态 HTML，无法直接访问 Vite 的环境变量。它主要用于检查：
- 当前域名
- Google SDK 是否加载
- 基本环境信息

**实际的环境变量值需要在主页的控制台查看。**

---

## 📊 日志解读

### ✅ 正常状态

如果看到以下日志，说明配置正确：

```
[Auth] Client ID loaded: Yes
[Auth] Is placeholder: false
[Auth] Google SDK initialized successfully
```

### ❌ 问题状态

#### 问题 1: Client ID 未加载

```
[Auth] Client ID loaded: No
[Auth] Client ID value: Not set
```

**原因**：环境变量未正确加载

**解决**：
1. 检查 Vercel 环境变量是否设置
2. 确认环境变量选择了 "Production" 和 "Preview"
3. 重新部署项目

#### 问题 2: Google SDK 初始化失败

```
[GSI_LOGGER]: The given client ID is not found.
```

**原因**：域名未在 Google Cloud Console 中授权

**解决**：
1. 访问 Google Cloud Console
2. 确认 `https://startlytab.vercel.app` 已添加到授权列表
3. 保存并等待 1-2 分钟

#### 问题 3: 按钮渲染失败

```
[GSI_LOGGER]: Failed to render button before calling initialize().
```

**原因**：Google SDK 未加载完成就尝试渲染按钮

**解决**：代码已自动处理，会重试。如果持续出现，检查网络连接。

---

## 🧪 快速测试

### 测试 1: 环境变量检查

在浏览器控制台运行：

```javascript
// 检查环境变量（在主页运行）
console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

### 测试 2: Google SDK 检查

```javascript
// 检查 Google SDK
console.log('Google SDK:', window.google?.accounts?.id);
```

### 测试 3: 当前域名检查

```javascript
// 检查当前域名
console.log('Current origin:', window.location.origin);
console.log('Should be in Google Console:', window.location.origin);
```

---

## 🐛 常见问题

### Q: 诊断页面一直显示 "Checking..."

**A**: 诊断页面是静态 HTML，无法直接访问 Vite 的环境变量。请使用主页的控制台查看实际配置。

### Q: 控制台没有 `[Auth]` 日志

**A**: 
1. 确认页面已完全加载
2. 刷新页面（硬刷新：`Cmd+Shift+R`）
3. 检查是否有 JavaScript 错误阻止了代码执行

### Q: 看到 "Client ID loaded: No"

**A**: 
1. 检查 Vercel 环境变量
2. 确认已重新部署
3. 清除浏览器缓存后重试

---

## 📝 需要帮助时提供的信息

如果遇到问题，请提供：

1. **控制台日志**：复制所有 `[Auth]` 开头的日志
2. **错误信息**：任何红色错误信息
3. **当前域名**：`window.location.origin` 的值
4. **环境变量状态**：`import.meta.env.VITE_GOOGLE_CLIENT_ID` 的值

这些信息可以帮助快速定位问题！


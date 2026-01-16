# 跨标签页登录状态同步

## 🎯 功能说明

当用户在 Chrome 浏览器中打开多个标签页时，如果在一个标签页登录，其他标签页会自动检测到登录状态变化并同步更新，无需手动刷新。

## 🔧 技术实现

### 1. Storage 事件监听

使用浏览器的 `storage` 事件来监听其他标签页对 `localStorage` 的修改：

```typescript
window.addEventListener('storage', handleStorageChange);
```

**重要说明：**
- `storage` 事件**只在其他标签页**修改 localStorage 时触发
- 当前标签页的修改**不会触发** storage 事件
- 这是浏览器的标准行为，确保跨标签页通信

### 2. 监听的关键

监听 `focus_tab_user` 键的变化，这是存储用户登录信息的键：

```typescript
if (e.key === 'focus_tab_user') {
  // 检测到用户登录/登出
}
```

### 3. 状态同步流程

当检测到用户登录状态变化时：

1. **解析新用户数据**
   ```typescript
   const newUser = JSON.parse(e.newValue);
   ```

2. **比较用户 ID**
   - 如果用户 ID 发生变化，说明登录状态改变
   - 避免不必要的更新

3. **执行同步操作**
   - **登录**：调用 `handleUserLogin()` 获取用户数据和云端数据
   - **登出**：清除用户状态

4. **显示提示**
   - 登录：显示 "Logged in from another tab"
   - 登出：显示 "Logged out from another tab"

## 📋 代码位置

### App.tsx

- **`handleUserLogin`** (第 121-178 行)
  - 提取的登录处理函数
  - 获取用户订阅、会员、设置信息
  - 从云端获取数据并合并

- **Storage 事件监听** (第 907-961 行)
  - 监听 `focus_tab_user` 变化
  - 自动同步登录状态

### authService.ts

- **`initGoogleAuth`** (第 27 行)
  - 登录成功后调用 `localStorage.setItem('focus_tab_user', ...)`
  - 这会触发其他标签页的 `storage` 事件

## 🧪 测试步骤

### 测试场景 1: 跨标签页登录同步

1. 打开两个标签页，都访问 `http://localhost:3000`
2. 两个标签页都应该显示未登录状态
3. 在**第一个标签页**点击 Google 登录
4. 登录成功后，观察**第二个标签页**：
   - ✅ 应该自动显示已登录状态
   - ✅ 应该显示 "Logged in from another tab" 提示
   - ✅ 应该加载用户的 Gateways 和 Intentions

### 测试场景 2: 跨标签页登出同步

1. 两个标签页都已登录
2. 在**第一个标签页**点击登出
3. 观察**第二个标签页**：
   - ✅ 应该自动显示未登录状态
   - ✅ 应该显示 "Logged out from another tab" 提示
   - ✅ 应该隐藏用户的 Gateways 和 Intentions

### 测试场景 3: 控制台日志

打开浏览器控制台，应该看到：

```
[App] Detected user login/logout in another tab, syncing...
[App] User state changed: { from: 'logged out', to: 'logged in' }
[App] User logged in in another tab, updating state...
[App] User authenticated: user@example.com
[App] Cloud data fetched: { links: 5, requests: 3 }
```

## ⚠️ 注意事项

### 1. 浏览器兼容性

- ✅ Chrome/Edge: 完全支持
- ✅ Firefox: 完全支持
- ⚠️ Safari: 支持，但需要注意 ITP (Intelligent Tracking Prevention) 可能影响

### 2. 性能考虑

- Storage 事件只在用户状态**实际改变**时触发
- 通过比较用户 ID 避免不必要的更新
- 异步操作不会阻塞 UI

### 3. 数据一致性

- 登录时从云端获取最新数据（source of truth）
- 确保所有标签页显示相同的数据
- 避免数据冲突

## 🔍 调试

如果跨标签页同步不工作：

1. **检查控制台日志**
   - 应该看到 `[App] Detected user login/logout in another tab`
   - 如果没有，检查 `storage` 事件是否被正确监听

2. **检查 localStorage**
   ```javascript
   // 在控制台运行
   localStorage.getItem('focus_tab_user')
   ```
   - 应该包含用户数据（JSON 字符串）

3. **检查事件触发**
   - 确保 `authService.ts` 在登录时调用了 `localStorage.setItem`
   - 当前标签页的修改不会触发 `storage` 事件（这是正常的）

4. **检查依赖项**
   - `handleUserLogin` 必须在 `saveState` 之后定义
   - `useEffect` 的依赖项必须包含 `handleUserLogin`

## 📝 相关文件

- `App.tsx` - 主应用组件，包含跨标签页同步逻辑
- `services/authService.ts` - 认证服务，处理登录/登出
- `services/syncService.ts` - 数据同步服务
- `services/supabaseService.ts` - Supabase 数据操作


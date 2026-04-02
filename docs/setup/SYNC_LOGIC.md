# StartlyTab 数据同步逻辑说明

## 📊 同步的数据内容

用户登录后，以下数据会被保存和同步：

1. **Gateways (Quick Links)** - 用户添加的快速链接
   - URL
   - 标题
   - 图标
   - 颜色

2. **Intentions (Messages)** - 用户自定义的消息提示
   - 提示文本
   - 激活状态

3. **语言偏好 (Language)** - 用户选择的语言
   - 当前值：`English` 等

4. **主题偏好 (Theme)** - 用户的主题设置
   - `light` 或 `dark`

## 🔄 同步流程

### 1. 用户登录时

```
用户点击登录
  ↓
Google OAuth 验证
  ↓
获取用户信息 (user.id, user.email)
  ↓
从 Supabase 获取云端数据
  ↓
合并云端数据与本地数据
  ↓
显示合并后的数据
```

### 2. 数据变更时

```
用户修改数据 (添加/删除 Gateway, 修改 Intentions, 切换主题等)
  ↓
调用 saveState()
  ↓
保存到 localStorage (立即)
  ↓
同步到 Supabase (异步)
  ↓
显示同步状态
```

### 3. 跨设备同步

```
设备 A: 用户添加 Gateway
  ↓
保存到 Supabase
  ↓
设备 B: 用户登录/刷新
  ↓
从 Supabase 获取最新数据
  ↓
显示最新数据
```

## 🔧 技术实现

### 数据存储结构

**Supabase `user_data` 表：**
```json
{
  "user_id": "google-user-id",
  "email": "user@example.com",
  "data": {
    "links": [
      {
        "id": "gateway-123",
        "url": "https://example.com",
        "title": "Example",
        "icon": "https://...",
        "color": "#6366f1"
      }
    ],
    "requests": [
      {
        "id": "request-456",
        "prompt": "Tips for focus",
        "active": true
      }
    ],
    "language": "English",
    "theme": "light",
    "version": "1.0.0"
  },
  "updated_at": "2024-01-13T12:00:00Z"
}
```

### 同步函数

**`syncToCloud(state)`** - 保存到云端
- 检查用户是否登录
- 尝试保存到 Supabase
- 失败时降级到 localStorage

**`fetchFromCloud(userId)`** - 从云端获取
- 尝试从 Supabase 获取
- 失败时从 localStorage 获取
- 返回 `null` 如果用户是首次使用

### 数据合并策略

1. **首次登录**：使用本地数据，同步到云端
2. **已有云端数据**：合并云端和本地数据
   - 云端数据优先（更新的数据）
   - 保留本地数据作为降级

## ✅ 测试检查清单

- [ ] 用户登录后，Gateways 正确加载
- [ ] 用户登录后，Intentions 正确加载
- [ ] 用户登录后，语言偏好正确加载
- [ ] 用户登录后，主题偏好正确加载
- [ ] 添加 Gateway 后，数据同步到云端
- [ ] 删除 Gateway 后，数据同步到云端
- [ ] 添加 Intention 后，数据同步到云端
- [ ] 修改语言后，数据同步到云端
- [ ] 切换主题后，数据同步到云端
- [ ] 在不同设备登录，数据正确同步

## 🐛 故障排除

### 问题：数据未同步

**检查：**
1. 浏览器控制台是否有错误
2. Supabase 连接是否正常
3. 用户是否已登录

**解决：**
- 检查网络连接
- 检查 Supabase 配置
- 查看浏览器控制台日志

### 问题：数据冲突

**场景：** 设备 A 和设备 B 同时修改数据

**解决：**
- 当前策略：最后写入的数据会覆盖之前的数据
- 未来可以添加时间戳比较，保留最新数据

### 问题：同步慢

**原因：**
- 网络延迟
- Supabase 响应慢

**解决：**
- 使用乐观更新（UI 立即更新）
- 后台异步同步
- 显示同步状态指示器

## 📝 注意事项

1. **数据隐私**：所有数据存储在 Supabase，受 RLS 保护
2. **离线支持**：使用 localStorage 作为降级方案
3. **数据版本**：使用 `version` 字段管理数据结构变更
4. **错误处理**：所有同步操作都有错误处理和降级方案


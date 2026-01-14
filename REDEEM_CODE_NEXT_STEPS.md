# 兑换码功能 - 后续步骤指南

## ✅ 已完成

1. **数据库迁移** - `supabase-schema.sql` 已更新并执行
2. **兑换码标签** - 已添加到 Studio 弹窗的标签导航中

## 📋 接下来需要做的步骤

### 1. 生成兑换码

运行代码生成脚本：

```bash
node scripts/generate-redeem-codes.js
```

这会生成 `scripts/redeem-codes.sql` 文件，包含 1000 个唯一的兑换码。

### 2. 插入兑换码到数据库

1. 打开 Supabase SQL Editor
2. 打开生成的 `scripts/redeem-codes.sql` 文件
3. 复制所有 SQL 内容
4. 粘贴到 Supabase SQL Editor
5. 点击 "Run" 执行

### 3. 验证兑换码功能

1. **打开 Studio 弹窗**
   - 点击右上角的 "Studio" 按钮
   - 应该能看到 "Redeem Code" 标签（在 Language 和 Account 之间）

2. **测试兑换流程**
   - 确保已登录
   - 点击 "Redeem Code" 标签
   - 打开 "Enable Redeem Code" 开关（如果默认关闭）
   - 输入一个生成的兑换码（格式：`ST-XXXX-XXXX-XXXX`）
   - 点击 "Redeem" 按钮
   - 应该看到成功消息，并且会员状态更新

3. **验证会员权益**
   - 兑换成功后，应该可以：
     - 添加超过 5 个 Gateways
     - 添加超过 1 个 Intention
     - 无限生成 Perspectives

### 4. 检查数据库

在 Supabase 中查询验证：

```sql
-- 查看所有兑换码状态
SELECT code, status, redeemed_at, redeemed_by_user_id, campaign 
FROM redeem_codes 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看已兑换的代码
SELECT code, redeemed_at, redeemed_by_email, campaign 
FROM redeem_codes 
WHERE redeemed_at IS NOT NULL;

-- 查看用户会员状态
SELECT user_id, is_subscribed, member_via_redeem, membership_since 
FROM user_membership;
```

## 🔍 故障排查

### 如果看不到 "Redeem Code" 标签

1. **检查代码是否已保存**
   - 确认 `components/Settings.tsx` 文件已保存
   - 标签数组应该包含 `'redeem'`

2. **刷新页面**
   - 硬刷新浏览器（Cmd+Shift+R 或 Ctrl+Shift+R）
   - 清除缓存

3. **检查控制台错误**
   - 打开浏览器开发者工具
   - 查看 Console 是否有错误

### 如果兑换失败

1. **检查网络连接**
   - 确认 Supabase 配置正确
   - 检查环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`

2. **检查数据库表**
   - 确认 `redeem_codes` 表存在
   - 确认 `user_membership` 表存在
   - 确认 `user_settings` 表存在

3. **检查 RLS 策略**
   - 确认所有表的 RLS 策略已创建
   - 确认用户有权限访问自己的数据

## 📊 管理兑换码

### 查看兑换统计

```sql
-- 总兑换码数量
SELECT COUNT(*) as total_codes FROM redeem_codes;

-- 已兑换数量
SELECT COUNT(*) as redeemed_count 
FROM redeem_codes 
WHERE redeemed_at IS NOT NULL;

-- 可用兑换码数量
SELECT COUNT(*) as available_codes 
FROM redeem_codes 
WHERE status = 'enabled' AND redeemed_at IS NULL;
```

### 禁用某个兑换码

```sql
UPDATE redeem_codes 
SET status = 'disabled' 
WHERE code = 'ST-XXXX-XXXX-XXXX';
```

### 查看特定用户的兑换记录

```sql
SELECT 
  rc.code,
  rc.redeemed_at,
  rc.campaign,
  um.membership_since
FROM redeem_codes rc
JOIN user_membership um ON um.redeem_code_id = rc.id
WHERE um.user_id = 'your-user-id';
```

## 🎯 功能特性

- ✅ 兑换码格式：`ST-XXXX-XXXX-XXXX`
- ✅ 自动大写输入
- ✅ 实时验证和错误提示
- ✅ 会员状态立即生效
- ✅ 状态持久化（刷新后保持）
- ✅ 兑换码可禁用
- ✅ 用户可切换兑换功能开关

## 📝 注意事项

1. **兑换码是永久会员** - 一旦兑换，会员状态不会过期
2. **每个兑换码只能使用一次** - 防止重复兑换
3. **兑换操作是原子的** - 确保数据一致性
4. **RLS 策略保护** - 用户只能访问自己的数据

## 🚀 下一步优化（可选）

- [ ] 添加兑换码过期时间功能
- [ ] 添加批量禁用/启用兑换码功能
- [ ] 添加兑换码使用统计面板
- [ ] 添加兑换码生成管理界面
- [ ] 添加兑换码使用限制（如每个用户只能兑换一次）


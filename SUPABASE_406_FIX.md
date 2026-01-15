# Supabase 406 错误修复指南

## 🔴 问题

运行 RLS 修复 SQL 后，仍然出现 406 错误：
```
GET https://sudmwgwwlsdkpoxrnsji.supabase.co/rest/v1/user_settings?select=re... 406 (Not Acceptable)
```

## 🔍 原因分析

406 错误通常表示：
1. **RLS 策略仍然阻止查询** - 可能有多个策略冲突
2. **Accept 头不匹配** - Supabase API 期望特定的 Accept 头
3. **策略未完全替换** - 旧的策略可能仍然存在

从 SQL 查询结果看，`user_settings` 表可能还有旧的策略未完全替换。

## ✅ 解决方案

### 方法 1: 运行完整修复脚本（推荐）

1. **打开 Supabase SQL Editor**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目
   - 进入 **SQL Editor**

2. **运行 `supabase-rls-fix-complete.sql`**
   - 这个脚本会：
     - 删除所有现有策略（包括可能冲突的）
     - 为每个表创建单一的 `FOR ALL` 策略
     - 使用 `USING (true) WITH CHECK (true)` 允许所有操作

3. **验证修复**
   - 运行脚本末尾的验证查询
   - 每个表应该只有 **一个策略**，`cmd='ALL'`，`qual='true'`

### 方法 2: 手动检查并修复

如果方法 1 不起作用，手动检查：

1. **查看当前策略**
   ```sql
   SELECT tablename, policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE tablename = 'user_settings'
   ORDER BY policyname;
   ```

2. **删除所有策略**
   ```sql
   DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
   DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
   DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
   DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_settings;
   ```

3. **创建单一策略**
   ```sql
   CREATE POLICY "Allow all operations for user_settings"
     ON user_settings
     FOR ALL
     USING (true)
     WITH CHECK (true);
   ```

## 🔧 其他可能的问题

### 问题 1: 表不存在

如果表不存在，先运行 `supabase-schema.sql` 创建表。

### 问题 2: RLS 未启用

确认 RLS 已启用：
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_subscriptions', 'user_membership', 'user_settings', 'user_data');
```

如果 `rowsecurity = false`，启用它：
```sql
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
```

### 问题 3: 缓存问题

1. **清除浏览器缓存**
   - 硬刷新页面（Cmd+Shift+R 或 Ctrl+Shift+R）
   - 或清除浏览器缓存

2. **等待几秒钟**
   - Supabase 策略更改可能需要几秒钟生效

## ✅ 验证修复

修复后，刷新应用页面，控制台应该：
- ✅ 不再有 406 错误
- ✅ `user_settings` 查询成功
- ✅ `user_membership` 查询成功
- ✅ `user_subscriptions` 查询成功

## 📋 预期结果

运行完整修复脚本后，每个表应该只有 **一个策略**：

- `user_subscriptions`: 1 个策略，`cmd='ALL'`
- `user_membership`: 1 个策略，`cmd='ALL'`
- `user_settings`: 1 个策略，`cmd='ALL'`
- `user_data`: 1 个策略，`cmd='ALL'`

所有策略的 `qual` 和 `with_check` 都应该是 `true`。


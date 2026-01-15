# SQL 脚本运行说明

## 📋 重要提示

### ✅ 应该运行的文件

**只运行 `.sql` 文件，不要运行 `.md` 文件！**

- ✅ `supabase-rls-final-fix.sql` - **运行这个**
- ❌ `SUPABASE_406_FIX.md` - **不要运行这个**（这是说明文档）

### 🔄 关于重复运行

**所有 SQL 脚本都是幂等的，可以安全地重复运行：**

1. **不会覆盖数据** - 脚本只修改 RLS 策略，不修改用户数据
2. **不会产生冲突** - 使用 `DROP POLICY IF EXISTS` 和 `CREATE POLICY`，重复运行会先删除再创建
3. **可以多次运行** - 如果第一次运行有问题，可以再次运行

### 📝 运行步骤

1. **打开 Supabase SQL Editor**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目
   - 进入 **SQL Editor**

2. **复制 SQL 文件内容**
   - 打开项目中的 `supabase-rls-final-fix.sql` 文件
   - **不要复制 `.md` 文件的内容**
   - 复制整个 SQL 文件内容

3. **粘贴并运行**
   - 粘贴到 SQL Editor
   - 点击 **Run** 按钮（或按 Cmd+Enter / Ctrl+Enter）

4. **查看结果**
   - 脚本末尾有验证查询
   - 查看结果，确认每个表只有 1 个策略

## 🎯 推荐运行顺序

如果你还没有运行过任何 SQL 脚本，按以下顺序：

1. **第一次运行**：`supabase-schema.sql`（如果表还没创建）
2. **修复 RLS**：`supabase-rls-final-fix.sql`（最新的完整修复脚本）

如果你已经运行过之前的脚本，直接运行最新的 `supabase-rls-final-fix.sql` 即可。

## ⚠️ 常见错误

### 错误 1: 语法错误 "syntax error at or near #"

**原因**：复制了 Markdown 文件（`.md`）而不是 SQL 文件（`.sql`）

**解决**：
- 确保打开的是 `.sql` 文件
- Markdown 文件使用 `#` 作为标题，SQL 使用 `--` 作为注释

### 错误 2: 表不存在

**原因**：表还没有创建

**解决**：先运行 `supabase-schema.sql` 创建表

### 错误 3: 策略已存在

**原因**：策略名称冲突

**解决**：不用担心，脚本使用 `DROP POLICY IF EXISTS`，会自动处理

## ✅ 验证修复成功

运行脚本后，查看验证查询的结果：

- 每个表应该只有 **1 个策略**
- 策略的 `cmd` 应该是 `ALL`
- `qual` 和 `with_check` 都应该是 `true ✓`

## 📁 文件说明

- `supabase-schema.sql` - 创建表和初始 RLS 策略
- `supabase-rls-fix.sql` - 第一次修复脚本（已过时）
- `supabase-rls-fix-complete.sql` - 完整修复脚本（已过时）
- `supabase-rls-final-fix.sql` - **最新的完整修复脚本（推荐使用）**
- `SUPABASE_406_FIX.md` - 说明文档（不要运行）
- `SUPABASE_ERRORS_FIX.md` - 说明文档（不要运行）


# 开发与发布工作流规范

## 📋 目录
1. [代码规范](#代码规范)
2. [Git 工作流](#git-工作流)
3. [发布流程](#发布流程)
4. [AI 协作规范](#ai-协作规范)

---

## 🎨 代码规范

### TypeScript/React 规范

#### 1. 命名规范
- **组件名**: PascalCase (如 `TextSandEffect`, `GatewayEditModal`)
- **函数名**: camelCase (如 `fetchRandomSnippet`, `handleUserLogin`)
- **常量**: UPPER_SNAKE_CASE (如 `DEFAULT_LANGUAGE`, `MAX_RETRIES`)
- **文件名**: 
  - 组件文件: PascalCase (如 `App.tsx`, `TextSandEffect.tsx`)
  - 工具函数: camelCase (如 `supabaseService.ts`, `historyManager.ts`)

#### 2. 文件组织
```
/
├── components/          # React 组件
├── services/           # API 和外部服务
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
├── constants/          # 常量定义
└── App.tsx            # 主应用组件
```

#### 3. 导入顺序
```typescript
// 1. React 相关
import { useState, useEffect } from 'react';

// 2. 第三方库
import { supabase } from './services/supabase';

// 3. 本地组件
import TextSandEffect from './components/TextSandEffect';

// 4. 类型
import type { User, AppState } from './types';

// 5. 样式和资源
import './App.css';
```

#### 4. 组件规范
```typescript
// ✅ 好的做法
interface ComponentProps {
  title: string;
  onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({ title, onClose }) => {
  // 1. Hooks
  const [state, setState] = useState<string>('');
  
  // 2. Refs
  const ref = useRef<HTMLDivElement>(null);
  
  // 3. 计算值
  const derivedValue = useMemo(() => state.toUpperCase(), [state]);
  
  // 4. 副作用
  useEffect(() => {
    // ...
  }, []);
  
  // 5. 事件处理函数
  const handleClick = () => {
    // ...
  };
  
  // 6. 渲染
  return <div>{title}</div>;
};
```

#### 5. 注释规范
```typescript
// ✅ 对复杂逻辑添加注释
// 防止在 React StrictMode 下重复调用
if (!didInitialSnippetFetchRef.current) {
  didInitialSnippetFetchRef.current = true;
  fetchRandomSnippet();
}

// ✅ 对关键决策添加注释
// 使用 invisible 而不是 opacity-0，确保 DOM 结构保留用于 Canvas 渲染
className={`${isSandDissolving ? 'invisible' : ''}`}

// ❌ 避免无意义的注释
// Set state to true
setState(true);
```

---

## 🔄 Git 工作流

### 分支策略

#### 主分支
- `main`: 生产环境分支，**始终保持可部署状态**
- 只有经过完整测试的代码才能合并到 `main`

#### 开发分支
- `feature/<feature-name>`: 新功能开发
- `fix/<bug-name>`: Bug 修复
- `experiment/<name>`: 实验性功能（如粒子特效）

### 分支命名示例
```bash
feature/sand-dissolve-effect
fix/perspective-loading-issue
experiment/handwriting-animation
```

### Commit Message 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构（不改变功能）
- `style`: 样式调整（UI/CSS）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具配置
- `docs`: 文档更新

#### 示例
```bash
# 好的 commit message
feat(perspective): add sand dissolve animation effect
fix(auth): resolve login state sync across tabs
refactor(components): extract TextSandEffect to separate component
style(hero): adjust perspective text spacing
perf(canvas): optimize particle rendering performance
chore: trigger Vercel redeployment

# 不好的 commit message
update code
fix bug
changes
```

---

## 🚀 发布流程

### ⚠️ 核心原则
**任何推送到 `main` 分支的操作都必须经过用户明确确认！**

### 标准发布流程

#### 第 1 步: 功能开发（在功能分支）
```bash
# 创建功能分支
git checkout -b feature/new-feature

# 开发 + 本地测试
# （AI 在这个阶段可以自由修改代码）
```

#### 第 2 步: 本地测试确认
```
用户操作：
1. 在本地环境测试功能
2. 确认所有功能正常工作
3. 检查控制台无错误
```

#### 第 3 步: 提交到功能分支
```bash
# AI 可以执行（仅提交到功能分支）
git add .
git commit -m "feat: add new feature"
```

#### 第 4 步: 用户确认发布
```
🔴 AI 必须询问用户：
"功能开发完成，本地测试通过。是否要合并到 main 分支并推送到线上？"

✅ 只有在用户明确回复"可以"、"确认"、"推送"等肯定答复后，才能执行下一步
```

#### 第 5 步: 合并并推送
```bash
# ✅ 用户确认后，AI 才能执行
git checkout main
git merge feature/new-feature
git push origin main
```

### 🛑 AI 禁止执行的操作（除非用户明确要求）

```bash
# ❌ 禁止直接推送到 main
git push origin main
git push -f origin main

# ❌ 禁止直接在 main 分支提交
git checkout main
git commit -m "..."
git push

# ❌ 禁止合并到 main
git merge feature/xxx  # 当前在 main 分支
```

### ✅ AI 可以自由执行的操作

```bash
# ✅ 在功能分支上的所有操作
git checkout -b feature/xxx
git add .
git commit -m "..."
git push origin feature/xxx  # 推送到功能分支

# ✅ 查看操作
git status
git log
git diff

# ✅ 本地回滚（如果用户不满意）
git reset --hard HEAD~1
```

---

## 🤖 AI 协作规范

### ⚠️ 开始工作前的分支确认流程（必须执行）

**在开始任何代码修改之前，AI 必须执行以下步骤：**

#### 1. 查看现有分支
```bash
git branch -a
```

#### 2. 向用户确认分支策略
```
AI 必须询问：
「当前存在以下分支：
- main
- feature/xxx
- fix/yyy

本次任务是：[简要描述用户需求]

请确认：
1. 是在现有分支 [分支名] 上继续开发？
2. 还是需要创建新分支？如果创建新分支，建议命名为：[建议的分支名]

请告诉我您的选择。」
```

#### 3. 等待用户明确指示
- ✅ 用户回复"在 feature/xxx 上继续" → 切换到该分支
- ✅ 用户回复"创建新分支 fix/zzz" → 创建并切换到新分支
- ❌ **禁止**在未确认的情况下自行决定使用哪个分支

#### 4. 执行分支操作
```bash
# 场景 A: 使用现有分支
git checkout feature/xxx

# 场景 B: 创建新分支
git checkout -b fix/new-branch
```

### 标准工作流程

#### 1. 接收需求
```
用户: "我想添加一个粒子消失特效"

AI 应该:
1. 确认需求细节
2. 说明实现方案
3. 询问是否开始实现
```

#### 2. 开发阶段
```bash
# AI 自动执行
git checkout -b experiment/particle-effect

# 修改代码...
git add .
git commit -m "feat: implement particle dissolve effect"
```

```
AI 通知用户:
"已在 experiment/particle-effect 分支实现了粒子特效。
请在本地测试：npm run dev
如果效果满意，我可以帮你合并到主分支。"
```

#### 3. 用户测试
```
用户在本地测试...

场景 A - 满意:
用户: "效果不错，可以上线"
→ AI 执行合并和推送流程

场景 B - 需要调整:
用户: "文字位置不对，帮我修复"
→ AI 继续在功能分支修改

场景 C - 不满意:
用户: "我不想要这个特效了，恢复原样"
→ AI 执行: git checkout main (切换回主分支，功能分支保留)
```

#### 4. 确认发布（关键步骤）
```
AI 必须明确询问:
"✅ 功能已开发完成并通过测试。

当前分支: experiment/particle-effect
目标分支: main
影响范围: 线上生产环境

是否确认合并到 main 分支并推送到 GitHub（将触发 Vercel 自动部署）？

请回复 '确认' 或 '推送' 来继续，回复 '取消' 来中止。"
```

#### 5. 执行发布
```bash
# ✅ 仅在用户明确确认后执行
git checkout main
git merge experiment/particle-effect
git push origin main
```

```
AI 通知用户:
"✅ 已推送到 GitHub，Vercel 正在部署...
预计 1-3 分钟后生效。
部署完成后请强制刷新浏览器（Cmd+Shift+R）。"
```

### 紧急回滚流程

如果发布后发现问题：

```bash
# 1. 立即回滚
git revert HEAD  # 或 git reset --hard <previous-commit>
git push -f origin main

# 2. 触发重新部署
git commit --allow-empty -m "chore: trigger redeployment"
git push origin main

# 3. 通知用户
```

---

## 📝 检查清单

### 发布前检查清单

- [ ] 代码已在功能分支开发完成
- [ ] 本地开发环境测试通过
- [ ] 控制台无错误或警告
- [ ] 代码已提交到功能分支
- [ ] 用户已测试并满意
- [ ] **用户已明确确认可以推送**
- [ ] 准备好回滚方案（记录当前 commit hash）

### 推送后检查清单

- [ ] GitHub 显示最新 commit
- [ ] Vercel 部署成功（查看 Dashboard）
- [ ] 线上环境功能正常
- [ ] 告知用户清除浏览器缓存

---

## 🔧 常用命令速查

### 创建功能分支
```bash
git checkout -b feature/feature-name
```

### 查看当前分支
```bash
git branch
git status
```

### 提交代码
```bash
git add .
git commit -m "feat: add new feature"
```

### 推送功能分支
```bash
git push origin feature/feature-name
```

### 合并到主分支（需要用户确认）
```bash
git checkout main
git merge feature/feature-name
git push origin main
```

### 回滚（紧急）
```bash
# 回滚到指定版本
git reset --hard <commit-hash>
git push -f origin main

# 触发重新部署
git commit --allow-empty -m "chore: trigger redeployment"
git push origin main
```

### 查看历史
```bash
git log --oneline -10
```

---

## 📞 沟通模板

### AI 请求确认发布
```
✅ 开发完成总结：
- 分支: feature/xxx
- 修改内容: [简要说明]
- 测试状态: [已测试/待测试]
- 影响范围: [仅前端/包含后端/配置变更]

⚠️ 此操作将推送到 main 分支并触发 Vercel 自动部署到生产环境。

是否确认推送？（请回复"确认"或"推送"）
```

### 用户确认发布的有效回复
- "确认"
- "推送"
- "可以推送"
- "上线"
- "发布"
- "好的，推送吧"

### 用户取消发布的回复
- "取消"
- "不推送"
- "等等"
- "先不要"
- "我再看看"

---

## 🎯 总结

### 核心原则
1. **功能分支开发**: 所有新功能都在独立分支开发
2. **本地充分测试**: 推送前必须在本地测试通过
3. **明确确认**: 推送到 main 前必须得到用户明确确认
4. **清晰沟通**: AI 要清楚说明每步操作的影响
5. **可回滚**: 记录每次发布的 commit，方便紧急回滚

### 责任划分
- **AI 负责**: 代码实现、分支管理、发布执行
- **用户负责**: 需求确认、功能测试、发布决策
- **共同遵守**: 不经确认不推送 main 分支

---

*最后更新: 2026-01-24*


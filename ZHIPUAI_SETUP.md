# 智谱AI配置指南

已成功将系统从 Gemini 切换为智谱AI（ZhipuAI）。按照以下步骤配置即可使用。

## 📋 配置步骤

### 1. 获取智谱AI API Key

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入控制台，创建 API Key
4. 复制 API Key（格式类似：`xxx.xxx.xxx`）

### 2. 配置环境变量

在项目根目录的 `.env.local` 文件中添加或更新：

```env
# 智谱AI配置（推荐）
ZHIPUAI_API_KEY=你的-智谱AI-API-Key
ZHIPUAI_API_BASE=https://open.bigmodel.cn/api/paas/v4
ZHIPUAI_MODEL=glm-4-flash

# 或者使用 VITE_ 前缀（两种方式都支持）
# VITE_ZHIPUAI_API_KEY=你的-API-Key
# VITE_ZHIPUAI_MODEL=glm-4-flash
```

**示例**：
```env
ZHIPUAI_API_KEY=abc123.def456.ghi789
ZHIPUAI_MODEL=glm-4-flash
```

### 3. 选择模型

智谱AI提供的模型选项：

- **`glm-4-flash`** ⭐ 推荐：快速版，响应速度快，适合实时生成
- **`glm-4`**：标准版，性能更强，但响应稍慢
- **`glm-3-turbo`**：较旧版本，成本更低

在 `.env.local` 中设置 `ZHIPUAI_MODEL` 来选择模型。

### 4. 重启开发服务器

环境变量只在服务器启动时加载，需要重启：

```bash
# 停止当前服务器 (Ctrl+C)
npm run dev
```

## ✅ 验证配置

1. 打开浏览器访问 `http://localhost:3000`
2. 点击 **"New Perspective"** 按钮
3. 打开浏览器开发者工具（F12）查看 Console
4. 如果看到 `[ZhipuAI]` 开头的日志，说明已切换到智谱AI
5. 如果生成新内容（而不是 fallback 文本），说明配置成功

## 🔄 切换回 Gemini（如果需要）

如果你想切换回 Gemini，只需在 `.env.local` 中：

```env
# 使用 Gemini
GEMINI_API_KEY=你的-Gemini-API-Key

# 注释掉或删除智谱AI配置
# ZHIPUAI_API_KEY=...
```

系统会优先使用智谱AI（如果配置了），否则使用 Gemini。

## 📝 当前配置状态

- ✅ 代码已更新为智谱AI实现
- ✅ 支持 OpenAI 兼容的 API 格式
- ✅ 保持原有的规则和逻辑不变
- ✅ 向后兼容 Gemini（如果配置了 Gemini Key）

## 🆘 故障排查

### 问题 1：仍然显示 fallback 文本

**可能原因**：
- API Key 未正确配置
- 环境变量文件位置错误
- 需要重启开发服务器

**解决方法**：
1. 检查 `.env.local` 文件是否存在且包含 `ZHIPUAI_API_KEY`
2. 确认文件在项目根目录
3. 停止开发服务器（Ctrl+C），然后重新运行 `npm run dev`
4. 检查 Console 是否有错误信息

### 问题 2：API Key 无效错误

**可能原因**：
- API Key 格式错误
- API Key 已被撤销
- 未启用智谱AI服务

**解决方法**：
1. 在 [智谱AI开放平台](https://open.bigmodel.cn/) 重新生成 API Key
2. 确保账户有足够的余额或配额
3. 检查 API Key 是否有使用限制

### 问题 3：模型不存在错误

**可能原因**：
- 模型名称错误
- 该模型不可用

**解决方法**：
1. 检查模型名称是否正确（如 `glm-4-flash`）
2. 尝试使用其他模型（如 `glm-4` 或 `glm-3-turbo`）
3. 查看 [智谱AI文档](https://open.bigmodel.cn/) 确认可用模型列表

## 📚 相关链接

- [智谱AI开放平台](https://open.bigmodel.cn/)
- [智谱AI API 文档](https://open.bigmodel.cn/dev/api)
- [项目部署指南](./DEPLOYMENT.md)

## 🔐 安全提示

1. **永远不要**将 `.env.local` 提交到 Git
2. **永远不要**在代码中硬编码 API Key
3. **定期轮换**API Key（如果怀疑泄露）
4. **注意配额限制**，避免超出使用量

---

配置完成后，系统将使用智谱AI根据规范生成 Perspective 内容。


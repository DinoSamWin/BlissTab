# 环境变量配置指南

## 📋 必需的环境变量

你的 `.env.local` 文件必须包含以下所有变量：

```env
# Gemini API Key (保留作为备用)
GEMINI_API_KEY=AIzaSyD6txz6Rkkn9WwcFcgbTa8HEmmcKKnEgTU

# 智谱AI配置
ZHIPUAI_API_KEY=37b2962d5f434b7ca84c7f99b087eef2.1APCkqUHf672VrOH
ZHIPUAI_MODEL=glm-4-flash
ZHIPUAI_API_BASE=https://open.bigmodel.cn/api/paas/v4

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com

# Supabase Configuration
VITE_SUPABASE_URL=https://sudmwgwwlsdkpoxrnsji.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NmAqx6bPjCKyu1BAAjhMVA_v2_JKJS2
```

## ⚠️ 重要提示

1. **所有以 `VITE_` 开头的变量**才会被 Vite 暴露给前端代码
2. **修改 `.env.local` 后必须重启开发服务器**
3. 文件必须位于项目根目录（与 `package.json` 同级）

## 🔄 重启开发服务器

```bash
# 1. 停止当前服务器（Ctrl+C）
# 2. 重新启动
npm run dev
```

## ✅ 验证配置

重启后，打开浏览器控制台，应该看到：

```
[Auth] Client ID loaded: Yes
[Auth] Full Client ID: 65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u.apps.googleusercontent.com
[Auth] Is placeholder: false
```

如果仍然显示 "NOT SET"，请检查：
- 文件名是否正确（`.env.local`）
- 文件是否在项目根目录
- 是否已重启开发服务器


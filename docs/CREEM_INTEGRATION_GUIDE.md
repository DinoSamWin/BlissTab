# Creem 支付集成指南

本指南将指导您如何部署 Creem 支付所需的后端函数。

## 前置条件
1.  **Supabase 项目**: 您需要有一个正在运行的 Supabase 项目。
2.  **Supabase CLI**: 已安装并登录 (`brew install supabase/tap/supabase`, `supabase login`)。
3.  **Creem 账户**: 从 Creem 仪表板获取您的 API Key 和 Signing Secret。

## 1. 设置环境变量 (Secrets)

你需要将 Creem 的密钥添加为 Supabase 的 Secrets，这样 Edge Functions 才能在运行时读取它们。

### 方法 A：使用 Supabase 仪表板（推荐，图形界面）
1.  登录 [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/functions)。
2.  进入你的项目。
3.  点击左侧菜单底部的 **Settings** (设置图标)。
4.  在设置菜单中选择 **Edge Functions** (或者是 **API** -> **Edge Function Secrets**，取决于版本)。
5.  找到 **"Management"** 或 **"Secrets"** 部分，点击 **"Add new secret"**。
6.  依次添加以下密钥（Name 全部大写）：
    *   **Name**: `CREEM_API_KEY`
        *   **Value**: (填入你在 Creem 后台获取的 Secret Key)
    *   **Name**: `CREEM_SIGNING_SECRET`
        *   **Value**: (填入你在 Creem Webhooks 页面获取的 Signing Secret)
    *   *(可选 - 推荐)* 我们看到您有三个商品，建议分别设置对应的 Product ID:
        *   **Name**: `CREEM_PRODUCT_ID_PRO_MONTHLY`
            *   **Value**: (填入 "Startly Pro (Mothly)" 的 ID)
        *   **Name**: `CREEM_PRODUCT_ID_PRO_YEARLY`
            *   **Value**: (填入 "Startly Pro (Yearly)" 的 ID)
        *   **Name**: `CREEM_PRODUCT_ID_LIFETIME`
            *   **Value**: (填入 "Startly Pro (Lifetime)" 的 ID)

    *   **如何获取产品 ID**:
        1.  进入 [Creem Dashboard](https://creem.io/dashboard) -> **Products**。
        2.  点击列表中的对应商品（如 "Startly Pro (Yearly)"）。
        3.  在详情页复制类似于 `price_...` 或 `prod_...` 的 ID。

### 方法 B：使用 Supabase CLI（命令行）
如果你已经在本地登录了 Supabase CLI，可以直接运行以下命令：

```bash
supabase secrets set CREEM_API_KEY=sk_live_...
supabase secrets set CREEM_SIGNING_SECRET=whsec_...
# 替换为真实的 ID
supabase secrets set CREEM_PRODUCT_ID_PRO_MONTHLY=price_monthly_id
supabase secrets set CREEM_PRODUCT_ID_PRO_YEARLY=price_yearly_id
supabase secrets set CREEM_PRODUCT_ID_LIFETIME=price_lifetime_id
```

## 2. 部署函数
将 `docs/backend/supabase/functions` 目录下的文件复制到您的项目的 `supabase/functions` 目录中（如果不存在请创建）。

```bash
# 在项目根目录下执行
mkdir -p supabase/functions
cp -r docs/backend/supabase/functions/* supabase/functions/
```

然后部署：

```bash
supabase functions deploy creem-checkout
supabase functions deploy creem-webhook
```

## 3. 配置 Creem Webhook (对应截图配置)

在 Creem 后台的 **Create Webhook** 页面，请按照以下信息填写：

1.  **Webhook Name* (名称)**:
    *   你可以填写任意名称，例如：`FocusTab Supabase`

2.  **Webhook URL* (地址)**:
    *   填写你的 Supabase Edge Function 地址：
    *   `https://<你的项目ID>.supabase.co/functions/v1/creem-webhook`
    *   **注意**: 请将 `<你的项目ID>` 替换为你 Supabase 项目的 Reference ID（就是你浏览器地址栏 `dashboard/project/` 后面那一串字符）。

3.  **Event Types* (事件类型)**:
    *   请确保勾选以下关键事件（这些是我们的代码 `creem-webhook/index.ts` 中处理的事件）：
    *   ✅ `checkout.completed` (对应支付成功)
    *   ✅ `subscription.active` (对应订阅创建/激活)
    *   ✅ `subscription.paid` (对应续费成功)
    *   ✅ `subscription.canceled` (对应取消)
    *   ✅ `subscription.expired` (对应过期)
    *   *(截图中的其他选项可以保持默认或全选，多选不会报错，只是我们暂不处理)*

## 4. 前端配置
确保您的前端 `.env` 文件中包含函数 URL（通常客户端会自动推断，但在本地开发或某些环境下可能需要显式设置）。

```env
VITE_SUPABASE_FUNCTIONS_URL=https://<your-project-ref>.supabase.co/functions/v1
```

## 模拟模式 (Mock Mode)
前端 `creemService.ts` 目前配置为**模拟模式**。如果检测到无法连接后端，或在没有函数 URL 的 `DEV` 环境中运行，它将模拟支付流程。这允许您在不立即部署后端的情况下测试 UI 流程。

# Vercel 自定义域名配置指南

## 🎯 目标

将 Vercel 部署的网站配置为使用自定义域名：
- `www.startlytab.com`（带 www）
- `startlytab.com`（不带 www）

## 📋 前置条件

1. ✅ 已拥有 `startlytab.com` 域名
2. ✅ 域名在域名注册商处（如 GoDaddy、Namecheap、Cloudflare 等）
3. ✅ 可以访问域名注册商的 DNS 管理面板

---

## 步骤 1: 在 Vercel 中添加自定义域名

### 1.1 登录 Vercel Dashboard

1. 访问：https://vercel.com/dashboard
2. 登录你的账号

### 1.2 进入项目设置

1. 在项目列表中，找到并点击 **StartlyTab** 项目（或你的项目名称）
2. 点击项目顶部的 **Settings** 标签
3. 在左侧菜单中，点击 **Domains**

### 1.3 添加域名

1. 在 "Domains" 页面，你会看到一个输入框
2. **先添加 `www.startlytab.com`**：
   - 在输入框中输入：`www.startlytab.com`
   - 点击 **Add** 按钮
   - Vercel 会显示需要配置的 DNS 记录

3. **再添加 `startlytab.com`**（不带 www）：
   - 在输入框中输入：`startlytab.com`
   - 点击 **Add** 按钮
   - Vercel 会显示需要配置的 DNS 记录

---

## 步骤 2: 配置 DNS 记录

Vercel 会显示需要添加的 DNS 记录。通常有两种方式：

### 方式 A: 使用 CNAME 记录（推荐）

**对于 `www.startlytab.com`：**
- **类型**：`CNAME`
- **名称**：`www`
- **值**：`cname.vercel-dns.com.`（注意末尾的点）
- **TTL**：自动或 3600

**对于 `startlytab.com`（根域名）：**
- **类型**：`A`
- **名称**：`@` 或留空（取决于你的 DNS 提供商）
- **值**：`76.76.21.21`（Vercel 提供的 IP，可能会变化，请使用 Vercel 显示的）
- **TTL**：自动或 3600

**或者使用 ANAME/ALIAS 记录（如果支持）：**
- **类型**：`ANAME` 或 `ALIAS`
- **名称**：`@` 或留空
- **值**：`cname.vercel-dns.com.`

### 方式 B: 使用 Vercel 的 Nameservers（最简单）

如果你的域名注册商支持，可以：

1. 在 Vercel 的 Domains 页面，找到 **Nameservers** 选项
2. 将 Vercel 提供的 Nameservers 复制
3. 在域名注册商处，将域名的 Nameservers 更改为 Vercel 提供的
4. 这样 Vercel 会自动管理所有 DNS 记录

---

## 步骤 3: 在域名注册商处配置 DNS

### 3.1 找到你的域名注册商

常见的域名注册商：
- **GoDaddy**: https://www.godaddy.com
- **Namecheap**: https://www.namecheap.com
- **Cloudflare**: https://www.cloudflare.com
- **Google Domains**: https://domains.google
- **其他注册商**

### 3.2 登录并进入 DNS 管理

1. 登录你的域名注册商账号
2. 找到 **DNS 管理** 或 **域名管理** 页面
3. 选择 `startlytab.com` 域名

### 3.3 添加 DNS 记录

根据 Vercel 显示的记录，添加以下记录：

#### 记录 1: www 子域名（CNAME）

```
类型: CNAME
名称: www
值: cname.vercel-dns.com.
TTL: 3600（或自动）
```

#### 记录 2: 根域名（A 记录或 ANAME）

**选项 A - 使用 A 记录：**
```
类型: A
名称: @（或留空，取决于提供商）
值: 76.76.21.21（使用 Vercel 显示的 IP）
TTL: 3600（或自动）
```

**选项 B - 使用 ANAME/ALIAS（如果支持）：**
```
类型: ANAME 或 ALIAS
名称: @（或留空）
值: cname.vercel-dns.com.
TTL: 3600（或自动）
```

### 3.4 保存更改

1. 点击 **保存** 或 **添加记录**
2. 等待 DNS 传播（通常需要几分钟到几小时）

---

## 步骤 4: 验证 DNS 配置

### 4.1 在 Vercel 中验证

1. 回到 Vercel Dashboard → 项目 → Settings → Domains
2. 查看域名状态：
   - ✅ **Valid Configuration** - DNS 配置正确
   - ⏳ **Pending** - 等待 DNS 传播
   - ❌ **Invalid Configuration** - DNS 配置有误

### 4.2 使用命令行验证

在终端中运行：

```bash
# 检查 www 子域名
dig www.startlytab.com

# 检查根域名
dig startlytab.com

# 或者使用 nslookup
nslookup www.startlytab.com
nslookup startlytab.com
```

### 4.3 检查 DNS 传播状态

访问：https://www.whatsmydns.net/
- 输入 `www.startlytab.com` 和 `startlytab.com`
- 查看全球 DNS 传播状态

---

## 步骤 5: 等待 DNS 生效

### 时间线

- **最快**：5-15 分钟
- **通常**：1-2 小时
- **最长**：最多 48 小时（罕见）

### 检查状态

1. 在 Vercel Dashboard 中查看域名状态
2. 当状态变为 **Valid Configuration** 时，域名已配置成功

---

## 步骤 6: 更新 Google Cloud Console 配置

域名配置完成后，需要更新 Google OAuth 配置：

### 6.1 访问 Google Cloud Console

1. 访问：https://console.cloud.google.com/apis/credentials
2. 找到你的 OAuth 客户端：`65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u`
3. 点击进入编辑页面

### 6.2 更新授权域名

在 **Authorized JavaScript origins** 中，确保添加了：
```
https://www.startlytab.com
https://startlytab.com
```

### 6.3 更新重定向 URI

在 **Authorized redirect URIs** 中，确保添加了：
```
https://www.startlytab.com
https://startlytab.com
```

### 6.4 保存更改

1. 点击 **SAVE** 按钮
2. 等待 1-2 分钟让更改生效

---

## 步骤 7: 测试域名

### 7.1 测试网站访问

1. 在浏览器中访问：`https://www.startlytab.com`
2. 应该看到你的网站正常加载
3. 访问：`https://startlytab.com`
4. 应该自动重定向到 `www.startlytab.com`（或反之，取决于 Vercel 配置）

### 7.2 测试 Google 登录

1. 在配置好的域名上测试 Google 登录
2. 应该能正常工作

---

## 🔧 常见问题排查

### 问题 1: DNS 记录添加后仍然显示 "Invalid Configuration"

**解决方案：**
1. 确认 DNS 记录值完全正确（包括末尾的点）
2. 等待更长时间（DNS 传播可能需要时间）
3. 清除浏览器缓存并刷新 Vercel Dashboard

### 问题 2: 网站无法访问

**解决方案：**
1. 检查 DNS 记录是否正确添加
2. 使用 `dig` 或 `nslookup` 验证 DNS 解析
3. 确认 Vercel 项目已部署成功

### 问题 3: 只有 www 或只有根域名工作

**解决方案：**
1. 确保两个域名都已添加到 Vercel
2. 确保两个域名的 DNS 记录都已正确配置
3. Vercel 会自动处理重定向

### 问题 4: SSL 证书问题

**解决方案：**
1. Vercel 会自动为自定义域名配置 SSL 证书
2. 等待几分钟让 SSL 证书生效
3. 如果超过 24 小时仍未生效，联系 Vercel 支持

---

## 📋 配置检查清单

完成配置后，确认：

- [ ] `www.startlytab.com` 已添加到 Vercel
- [ ] `startlytab.com` 已添加到 Vercel
- [ ] DNS 记录已正确配置
- [ ] DNS 记录已保存
- [ ] Vercel 显示 "Valid Configuration"
- [ ] 网站可以通过新域名访问
- [ ] Google Cloud Console 已更新授权域名
- [ ] Google Cloud Console 已更新重定向 URI
- [ ] Google 登录在新域名上正常工作

---

## 🆘 需要帮助？

如果遇到问题：

1. **Vercel 文档**：https://vercel.com/docs/concepts/projects/domains
2. **Vercel 支持**：在 Vercel Dashboard 中点击 "Help" → "Contact Support"
3. **DNS 检查工具**：https://www.whatsmydns.net/

---

## 📝 重要提示

1. **DNS 传播需要时间**：不要期望立即生效，通常需要 1-2 小时
2. **保持旧域名**：在 DNS 完全传播之前，`startlytab.vercel.app` 仍然可以访问
3. **SSL 证书**：Vercel 会自动配置 SSL，通常需要几分钟
4. **Google OAuth**：域名配置完成后，记得更新 Google Cloud Console


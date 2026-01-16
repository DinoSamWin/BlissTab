# 域名配置快速检查清单

## 🎯 目标域名
- ✅ `www.startlytab.com`
- ✅ `startlytab.com`

---

## ✅ 步骤 1: Vercel 域名配置（5 分钟）

### 1.1 访问 Vercel Dashboard
- [ ] 打开：https://vercel.com/dashboard
- [ ] 登录你的账号
- [ ] 找到 **StartlyTab** 项目（或你的项目名称）

### 1.2 添加域名
- [ ] 点击项目 → **Settings** → **Domains**
- [ ] 输入 `www.startlytab.com` → 点击 **Add**
- [ ] 输入 `startlytab.com` → 点击 **Add**
- [ ] **复制 Vercel 显示的 DNS 配置信息**（重要！）

### 1.3 记录 DNS 配置
Vercel 会显示类似这样的配置：

**www.startlytab.com:**
```
类型: CNAME
名称: www
值: cname.vercel-dns.com.
```

**startlytab.com:**
```
类型: A
名称: @
值: 76.76.21.21
```
（注意：实际 IP 地址可能不同，请使用 Vercel 显示的）

---

## ✅ 步骤 2: DNS 配置（10-15 分钟）

### 2.1 找到你的域名注册商
你的域名 `startlytab.com` 是在哪个注册商购买的？
- [ ] GoDaddy
- [ ] Namecheap
- [ ] Cloudflare
- [ ] Google Domains
- [ ] 其他：_________

### 2.2 登录域名注册商
- [ ] 登录你的域名注册商账号
- [ ] 找到 **DNS 管理** 或 **域名管理** 页面
- [ ] 选择 `startlytab.com` 域名

### 2.3 添加 DNS 记录

#### 记录 1: www 子域名
- [ ] 点击 **添加记录** 或 **Add Record**
- [ ] 类型：选择 **CNAME**
- [ ] 名称/主机：输入 `www`
- [ ] 值/目标：输入 `cname.vercel-dns.com.`（注意末尾的点）
- [ ] TTL：选择 **自动** 或 **3600**
- [ ] 点击 **保存** 或 **Save**

#### 记录 2: 根域名
- [ ] 点击 **添加记录** 或 **Add Record**
- [ ] 类型：选择 **A**
- [ ] 名称/主机：输入 `@` 或留空（取决于你的注册商）
- [ ] 值/目标：输入 Vercel 显示的 IP 地址（例如：`76.76.21.21`）
- [ ] TTL：选择 **自动** 或 **3600**
- [ ] 点击 **保存** 或 **Save**

### 2.4 验证 DNS 记录
- [ ] 确认两条记录都已保存
- [ ] 记录显示为 **Active** 或 **Enabled**

---

## ✅ 步骤 3: 等待 DNS 传播（5 分钟 - 2 小时）

### 3.1 检查 DNS 状态
- [ ] 在 Vercel Dashboard → Domains 页面查看状态
- [ ] 状态应该从 **Pending** 变为 **Valid Configuration**
- [ ] 如果超过 2 小时仍显示 **Invalid**，检查 DNS 记录是否正确

### 3.2 使用工具验证
- [ ] 访问：https://www.whatsmydns.net/
- [ ] 输入 `www.startlytab.com` 和 `startlytab.com`
- [ ] 查看全球 DNS 传播状态

---

## ✅ 步骤 4: 更新 Google OAuth 配置（5 分钟）

### 4.1 访问 Google Cloud Console
- [ ] 打开：https://console.cloud.google.com/apis/credentials
- [ ] 找到 OAuth 客户端：`65772780936-6opn1jon0nthab7erht3i6pqgk3o0q1u`
- [ ] 点击进入编辑页面

### 4.2 更新授权域名
- [ ] 在 **Authorized JavaScript origins** 部分
- [ ] 点击 **ADD URI**
- [ ] 添加：`https://www.startlytab.com`
- [ ] 点击 **ADD URI**  again
- [ ] 添加：`https://startlytab.com`

### 4.3 更新重定向 URI
- [ ] 在 **Authorized redirect URIs** 部分
- [ ] 点击 **ADD URI**
- [ ] 添加：`https://www.startlytab.com`
- [ ] 点击 **ADD URI**  again
- [ ] 添加：`https://startlytab.com`

### 4.4 保存更改
- [ ] 滚动到页面底部
- [ ] 点击 **SAVE** 按钮
- [ ] 等待 1-2 分钟让更改生效

---

## ✅ 步骤 5: 测试（5 分钟）

### 5.1 测试网站访问
- [ ] 在浏览器中访问：`https://www.startlytab.com`
- [ ] 网站应该正常加载
- [ ] 访问：`https://startlytab.com`
- [ ] 应该自动重定向到 `www.startlytab.com`（或反之）

### 5.2 测试 Google 登录
- [ ] 在 `https://www.startlytab.com` 点击 Google 登录
- [ ] 登录流程应该正常工作
- [ ] 登录后应该能看到用户数据

### 5.3 测试 SSL 证书
- [ ] 确认浏览器地址栏显示 🔒 锁图标
- [ ] 确认 URL 是 `https://`（不是 `http://`）

---

## 🔧 常见问题

### 问题 1: DNS 记录添加后仍然显示 "Invalid Configuration"
**解决方案：**
1. 确认 DNS 记录值完全正确（包括末尾的点）
2. 等待更长时间（DNS 传播可能需要时间）
3. 清除浏览器缓存并刷新 Vercel Dashboard

### 问题 2: 网站无法访问
**解决方案：**
1. 检查 DNS 记录是否正确添加
2. 使用命令行验证：
   ```bash
   dig www.startlytab.com
   dig startlytab.com
   ```
3. 确认 Vercel 项目已部署成功

### 问题 3: Google 登录失败
**解决方案：**
1. 确认 Google Cloud Console 中已添加新域名
2. 等待 1-2 分钟让 Google 配置生效
3. 清除浏览器缓存和 cookies
4. 重新尝试登录

---

## 📞 需要帮助？

如果遇到问题：
1. 检查 Vercel Dashboard 中的域名状态
2. 查看浏览器控制台的错误信息
3. 使用 DNS 检查工具验证配置
4. 参考详细文档：`VERCEL_CUSTOM_DOMAIN_SETUP.md`

---

## ✅ 完成检查

完成所有步骤后，确认：
- [ ] `www.startlytab.com` 可以访问
- [ ] `startlytab.com` 可以访问
- [ ] SSL 证书已自动配置（🔒 锁图标）
- [ ] Google 登录正常工作
- [ ] 网站功能正常

**恭喜！域名配置完成！** 🎉


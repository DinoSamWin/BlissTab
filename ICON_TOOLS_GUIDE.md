# 图标生成工具推荐

以下是几个好用的在线图标生成工具，可以帮你生成各种尺寸的图标：

## 🌟 推荐工具

### 1. **RealFaviconGenerator** (最推荐)
- 网址：https://realfavicongenerator.net/
- 特点：
  - 免费，功能强大
  - 支持上传图片自动生成所有尺寸
  - 可以预览在不同设备上的效果
  - 自动生成所有需要的格式和尺寸
- 使用方法：
  1. 上传你的图标图片（建议1024x1024或更大）
  2. 调整设置（可选）
  3. 点击"Generate your Favicons and HTML code"
  4. 下载生成的图标包
  5. 解压后找到PNG文件，重命名并放到 `public/icons/` 目录

### 2. **Favicon.io**
- 网址：https://favicon.io/
- 特点：
  - 简单易用
  - 支持从图片生成
  - 可以生成多种格式
- 使用方法：
  1. 选择 "Image to Favicon"
  2. 上传你的图片
  3. 下载生成的图标
  4. 解压并重命名文件

### 3. **IconKitchen** (Google)
- 网址：https://icon.kitchen/
- 特点：
  - Google官方工具
  - 支持Android和Web图标生成
  - 可以自定义背景和前景

### 4. **Favicon Generator**
- 网址：https://www.favicon-generator.org/
- 特点：
  - 简单直接
  - 支持多种格式

## 📐 需要生成的尺寸

你的项目需要以下尺寸的图标（PNG格式）：

```
icon-1024x1024.png  (最大尺寸，用于App Store等)
icon-512x512.png    (高分辨率显示)
icon-256x256.png    (标准桌面图标)
icon-128x128.png    (中等桌面图标)
icon-64x64.png      (小桌面图标，首页左上角使用)
icon-32x32.png      (浏览器标签页图标)
icon-16x16.png      (小尺寸浏览器标签页图标)
```

## 📝 替换步骤

1. **生成图标**
   - 使用上述任一工具上传你的图标图片
   - 生成并下载所有尺寸的图标

2. **重命名文件**
   - 将下载的文件重命名为上述格式（icon-尺寸x尺寸.png）

3. **替换文件**
   - 将所有图标文件复制到 `public/icons/` 目录
   - 替换现有的图标文件

4. **验证**
   - 运行 `npm run dev` 启动开发服务器
   - 检查浏览器标签页图标是否更新
   - 检查首页左上角的图标是否更新
   - 如果没看到变化，清除浏览器缓存（Cmd+Shift+R 或 Ctrl+Shift+R）

## 💡 提示

- **源图片要求**：
  - 建议使用 1024x1024 或更大的正方形图片
  - PNG格式，支持透明背景
  - 图片质量要高，避免小尺寸时模糊

- **如果工具只生成了部分尺寸**：
  - 可以使用项目中的 `scripts/process-icon.html` 工具
  - 在浏览器中打开该文件，上传你的图片
  - 点击"Download All Sizes"下载所有尺寸

## 🔧 使用项目自带工具（备选方案）

如果在线工具不方便，你也可以使用项目自带的工具：

```bash
# 在浏览器中打开
open scripts/process-icon.html

# 然后：
# 1. 上传你的图标图片
# 2. 点击"Download All Sizes"
# 3. 将下载的文件放到 public/icons/ 目录
```

## 📍 文件位置

所有图标文件应该放在：
```
public/icons/
  ├── icon-1024x1024.png
  ├── icon-512x512.png
  ├── icon-256x256.png
  ├── icon-128x128.png
  ├── icon-64x64.png
  ├── icon-32x32.png
  └── icon-16x16.png
```

## ✅ 检查清单

- [ ] 已使用工具生成所有尺寸的图标
- [ ] 文件已重命名为正确格式
- [ ] 文件已复制到 `public/icons/` 目录
- [ ] 已清除浏览器缓存
- [ ] 标签页图标已更新
- [ ] 首页左上角图标已更新


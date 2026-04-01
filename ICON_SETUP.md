# StartlyTab Icon Setup Guide

## 📸 Using Your Provided Icon Image

### Step 1: Process Your Icon

1. Open `scripts/process-icon.html` in your browser:
   ```bash
   open scripts/process-icon.html
   ```

2. Upload your icon image (PNG, JPG, or SVG)
   - Recommended: Square image, 1024x1024px or larger
   - The tool will automatically resize it to all standard sizes

3. Click "Download All Sizes" to get all icon files

4. Save all downloaded icons to `public/icons/` directory:
   ```
   public/icons/
     icon-1024x1024.png
     icon-512x512.png
     icon-256x256.png
     icon-128x128.png
     icon-64x64.png
     icon-32x32.png
     icon-16x16.png
   ```

### Step 2: Update HTML Files

After placing icons in `public/icons/`, update `index.html` to reference them:

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-512x512.png">

<!-- Android Chrome -->
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-256x256.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png">
```

### Step 3: Verify

1. Start your dev server: `npm run dev`
2. Check browser tab - you should see your icon
3. Check `public/icons/` directory - all sizes should be present

## 🎨 Icon Requirements

- **Format**: PNG (with transparency if needed)
- **Shape**: Square (1:1 aspect ratio)
- **Minimum Size**: 1024x1024px recommended
- **Background**: Transparent or solid color
- **Style**: Should match StartlyTab's calm, minimal aesthetic

## 📱 Icon Sizes Explained

- **1024x1024**: App Store / Play Store listing
- **512x512**: High-resolution displays, PWA manifest
- **256x256**: Standard desktop icons
- **128x128**: Medium desktop icons
- **64x64**: Small desktop icons
- **32x32**: Browser tab favicon (standard)
- **16x16**: Browser tab favicon (small displays)

## 🔧 Troubleshooting

**Icons not showing?**
- Check file paths in `index.html`
- Ensure files are in `public/icons/` directory
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)

**Icons look blurry?**
- Use high-resolution source image (1024px+)
- Ensure source image is square
- Check that image rendering is set to high quality

**Need different sizes?**
- Edit `scripts/process-icon.html` to add custom sizes
- Modify the `sizes` array in the JavaScript


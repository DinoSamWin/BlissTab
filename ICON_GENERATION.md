# StartlyTab Icon Generation Guide

## 🎨 Icon Design

The StartlyTab icon features a **soft sunrise aesthetic** designed for calm, minimal daily use. It expresses warmth and tranquility without decorative elements.

### Visual Elements
- **Rounded square container** (~30% corner radius)
- **Soft sunrise** with diffused golden orb
- **Atmospheric mist** layers
- **Subtle landscape** curves at bottom
- **Warm color palette**: golden yellows, soft peaches, gentle blues

## 🚀 Quick Start

### Option 1: Browser-Based Generator (Recommended)

1. Open `scripts/generate-icon-html.html` in your browser
2. Click "Generate All Sizes" to create icons in all standard sizes
3. Click "Download" on each preview to save the PNG files
4. Save icons to `public/icons/` directory

### Option 2: Node.js Script (Requires canvas package)

```bash
# Install canvas package
npm install canvas

# Run generator
node scripts/generate-icon.js
```

## 📐 Standard Icon Sizes

Icons are generated in the following sizes:
- **1024x1024** - App Store / Play Store
- **512x512** - High-res displays
- **256x256** - Standard desktop
- **128x128** - Medium desktop
- **64x64** - Small desktop
- **32x32** - Taskbar / Dock
- **16x16** - Browser tab / Favicon

## 📁 File Structure

```
public/
  icons/
    icon-1024x1024.png
    icon-512x512.png
    icon-256x256.png
    icon-128x128.png
    icon-64x64.png
    icon-32x32.png
    icon-16x16.png
```

## 🎯 Usage in App

### Favicon (index.html)

```html
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-512x512.png">
```

### Web App Manifest

```json
{
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🎨 Design Principles

1. **Soft & Calm** - No harsh edges or high contrast
2. **Minimal** - No text, symbols, or UI metaphors
3. **Scalable** - Recognizable at all sizes
4. **Timeless** - Avoids trends or tech aesthetics
5. **Premium** - High-quality gradients and smooth transitions

## 🔧 Customization

To adjust the icon design, edit `scripts/generate-icon-html.html`:

- **Sun position**: Modify `sunY` (currently `size * 0.35`)
- **Sun size**: Modify `sunRadius` (currently `size * 0.15`)
- **Colors**: Adjust gradient color stops
- **Corner radius**: Modify `cornerRadius` (currently `size * 0.3`)
- **Landscape layers**: Edit `hillLayers` array

## 📝 Notes

- Icons use **transparent backgrounds** for flexibility
- All gradients are **long and smooth** to avoid banding
- The design prioritizes **optical balance** over mathematical precision
- Small sizes (16px, 32px) focus on **silhouette and light balance**


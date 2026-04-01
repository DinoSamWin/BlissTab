/**
 * StartlyTab Icon Generator
 * Generates a high-resolution app icon with soft sunrise aesthetic
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate icon at specified size
 */
function generateIcon(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Corner radius: ~30% of canvas size
  const cornerRadius = size * 0.3;
  const centerX = size / 2;
  const centerY = size / 2;

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);

  // Create rounded square path
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();

  // Clip to rounded square
  ctx.clip();

  // Background gradient - soft warm sky
  const bgGradient = ctx.createLinearGradient(0, 0, 0, size);
  bgGradient.addColorStop(0, 'rgba(255, 245, 235, 1)'); // Soft warm white at top
  bgGradient.addColorStop(0.3, 'rgba(255, 235, 215, 0.9)'); // Light peach
  bgGradient.addColorStop(0.6, 'rgba(240, 230, 250, 0.7)'); // Very gentle lavender
  bgGradient.addColorStop(1, 'rgba(235, 240, 250, 0.8)'); // Soft blue-white at bottom
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, size, size);

  // Sun position - optically centered, slightly above center
  const sunY = size * 0.35;
  const sunRadius = size * 0.15;
  const sunGlowRadius = size * 0.35;

  // Sun glow - outer soft light
  const sunGlowGradient = ctx.createRadialGradient(
    centerX, sunY,
    0,
    centerX, sunY,
    sunGlowRadius
  );
  sunGlowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.4)'); // Soft golden
  sunGlowGradient.addColorStop(0.3, 'rgba(255, 180, 120, 0.25)'); // Warm peach
  sunGlowGradient.addColorStop(0.6, 'rgba(255, 200, 150, 0.15)'); // Light coral
  sunGlowGradient.addColorStop(1, 'rgba(255, 240, 220, 0)'); // Fade to transparent
  
  ctx.fillStyle = sunGlowGradient;
  ctx.beginPath();
  ctx.arc(centerX, sunY, sunGlowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Sun core - soft golden orb
  const sunCoreGradient = ctx.createRadialGradient(
    centerX, sunY,
    0,
    centerX, sunY,
    sunRadius
  );
  sunCoreGradient.addColorStop(0, 'rgba(255, 220, 140, 1)'); // Bright warm center
  sunCoreGradient.addColorStop(0.5, 'rgba(255, 200, 120, 0.9)'); // Soft golden
  sunCoreGradient.addColorStop(0.8, 'rgba(255, 180, 110, 0.7)'); // Muted peach
  sunCoreGradient.addColorStop(1, 'rgba(255, 200, 130, 0.3)'); // Fade to transparent edge
  
  ctx.fillStyle = sunCoreGradient;
  ctx.beginPath();
  ctx.arc(centerX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle mist/cloud layer below sun
  const mistY = sunY + sunRadius * 0.8;
  const mistGradient = ctx.createLinearGradient(0, mistY - size * 0.05, 0, mistY + size * 0.1);
  mistGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  mistGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
  mistGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
  mistGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = mistGradient;
  ctx.fillRect(0, mistY - size * 0.05, size, size * 0.15);

  // Subtle layered hills/landscape at bottom
  const hillLayers = [
    { y: size * 0.75, height: size * 0.15, opacity: 0.15, color: 'rgba(200, 180, 160, 1)' }, // Light beige
    { y: size * 0.82, height: size * 0.12, opacity: 0.2, color: 'rgba(180, 160, 200, 1)' }, // Muted purple
    { y: size * 0.88, height: size * 0.1, opacity: 0.25, color: 'rgba(160, 180, 220, 1)' }, // Soft blue
  ];

  hillLayers.forEach((hill, index) => {
    ctx.save();
    ctx.globalAlpha = hill.opacity;
    
    // Create wavy hill shape
    ctx.beginPath();
    ctx.moveTo(0, hill.y);
    
    const wavePoints = 8;
    for (let i = 0; i <= wavePoints; i++) {
      const x = (size / wavePoints) * i;
      const baseY = hill.y;
      const wave = Math.sin((i / wavePoints) * Math.PI * 2 + index * 0.5) * (size * 0.02);
      const y = baseY + wave;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(size, hill.y + hill.height);
    ctx.lineTo(0, hill.y + hill.height);
    ctx.closePath();
    
    const hillGradient = ctx.createLinearGradient(0, hill.y, 0, hill.y + hill.height);
    hillGradient.addColorStop(0, hill.color);
    hillGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = hillGradient;
    ctx.fill();
    ctx.restore();
  });

  // Soft inner glow on edges
  const edgeGlowGradient = ctx.createRadialGradient(
    centerX, centerY,
    0,
    centerX, centerY,
    size * 0.7
  );
  edgeGlowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  edgeGlowGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
  edgeGlowGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
  
  ctx.fillStyle = edgeGlowGradient;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

/**
 * Generate icons in multiple sizes
 */
function generateAllIcons() {
  const sizes = [1024, 512, 256, 128, 64, 32, 16];
  const outputDir = path.join(__dirname, '../public/icons');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  sizes.forEach(size => {
    const canvas = generateIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Generated ${filename}`);
  });

  console.log('\n✓ All icons generated successfully!');
}

// Run if executed directly
if (require.main === module) {
  // Note: This script requires a browser-like environment or canvas library
  // For Node.js, you'll need to install 'canvas' package: npm install canvas
  console.log('Icon generator ready. Run in browser environment or install canvas package.');
}

module.exports = { generateIcon, generateAllIcons };


#!/usr/bin/env python3
"""
Generate sunrise/sunset icon based on description
Creates a rounded square icon with sunrise aesthetic matching the provided description
"""

import sys
from pathlib import Path
import math

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Error: PIL (Pillow) is not installed.")
    print("Please install it with: pip3 install Pillow")
    sys.exit(1)

# Icon sizes to generate
ICON_SIZES = [1024, 512, 256, 128, 64, 32, 16]

def generate_sunrise_icon(size):
    """Generate a sunrise/sunset icon at the specified size based on description."""
    
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Corner radius: ~30% of canvas size (rounded square)
    corner_radius = size * 0.3
    
    # Create mask for rounded square
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, size, size), radius=corner_radius, fill=255)
    
    # Center point
    center_x = size / 2
    center_y = size / 2
    
    # Sun position - large semi-circle, base at horizon
    # Sun occupies roughly top two-thirds of width, extending from just above center
    sun_radius = size * 0.35  # Large sun
    horizon_y = size * 0.55  # Horizon line (slightly above center)
    sun_center_y = horizon_y  # Sun's base is at horizon
    sun_top = sun_center_y - sun_radius  # Top of sun
    
    # Create gradient background
    # Sky: warm oranges -> pinks -> purples -> pale blues (top to bottom)
    # Foreground: mirrors sky colors
    
    pixels = img.load()
    
    for y in range(size):
        for x in range(size):
            # Only draw inside rounded square
            if mask.getpixel((x, y)) == 0:
                continue
            
            if y < horizon_y:
                # Sky gradient (top to horizon)
                ratio = y / horizon_y
                
                if ratio < 0.2:
                    # Top: very pale blue/white
                    r, g, b = 250, 252, 255
                elif ratio < 0.4:
                    # Light purple
                    r, g, b = int(240 - (ratio - 0.2) * 50), int(230 - (ratio - 0.2) * 30), int(250 - (ratio - 0.2) * 20)
                elif ratio < 0.6:
                    # Soft pink
                    r, g, b = int(255 - (ratio - 0.4) * 30), int(220 - (ratio - 0.4) * 40), int(240 - (ratio - 0.4) * 20)
                elif ratio < 0.8:
                    # Light orange
                    r, g, b = int(255 - (ratio - 0.6) * 20), int(200 - (ratio - 0.6) * 30), int(180 - (ratio - 0.6) * 40)
                else:
                    # Warm orange near horizon
                    r, g, b = int(255 - (ratio - 0.8) * 10), int(180 - (ratio - 0.8) * 20), int(120 - (ratio - 0.8) * 30)
            else:
                # Foreground gradient (horizon to bottom) - mirrors sky
                ratio = (y - horizon_y) / (size - horizon_y)
                
                if ratio < 0.2:
                    # Light orange-pink near horizon
                    r, g, b = int(255 - ratio * 30), int(200 - ratio * 20), int(220 - ratio * 10)
                elif ratio < 0.5:
                    # Soft lavender
                    r, g, b = int(240 - ratio * 20), int(220 - ratio * 10), int(250 - ratio * 5)
                else:
                    # Pale blue at bottom
                    r, g, b = int(245 + ratio * 10), int(250 + ratio * 5), 255
            
            pixels[x, y] = (r, g, b, 255)
    
    # Draw the sun (large orange semi-circle)
    sun_overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sun_draw = ImageDraw.Draw(sun_overlay)
    
    # Sun bounding box (semi-circle)
    sun_left = center_x - sun_radius
    sun_right = center_x + sun_radius
    sun_top_y = sun_center_y - sun_radius
    sun_bottom_y = sun_center_y
    
    # Draw sun as filled arc (semi-circle)
    # Create a full circle first, then clip to bottom half
    sun_full_bbox = (sun_left, sun_top_y, sun_right, sun_center_y + sun_radius)
    sun_draw.ellipse(sun_full_bbox, fill=(255, 140, 50, 255))  # Bright orange
    
    # Clip to semi-circle (top half only)
    sun_mask = Image.new('L', (size, size), 0)
    sun_mask_draw = ImageDraw.Draw(sun_mask)
    # Draw a rectangle covering bottom half to mask it
    sun_mask_draw.rectangle((0, sun_center_y, size, size), fill=255)
    sun_overlay.putalpha(Image.composite(
        Image.new('L', (size, size), 0),
        sun_overlay.split()[3],
        sun_mask
    ))
    
    # Add brilliant white glow at the center of sun's base (horizon)
    glow_radius = sun_radius * 0.25
    glow_bbox = (center_x - glow_radius, sun_center_y - glow_radius * 1.5,
                 center_x + glow_radius, sun_center_y)
    sun_draw.ellipse(glow_bbox, fill=(255, 255, 255, 255))  # Brilliant white
    
    # Add radiating light rays from the white glow
    num_rays = 16
    ray_length = sun_radius * 0.7
    for i in range(num_rays):
        angle = (i / num_rays) * 2 * math.pi
        # Rays extend upward into the orange sun
        end_x = center_x + math.cos(angle) * ray_length
        end_y = sun_center_y - glow_radius + math.sin(angle) * ray_length * 0.5
        
        # Draw thin ray
        ray_width = max(1, int(size / 300))
        sun_draw.line([(center_x, sun_center_y - glow_radius), (end_x, end_y)],
                     fill=(255, 255, 255, 180), width=ray_width)
    
    # Add subtle white specks/lens flare in the orange area (right side)
    for i in range(3):
        speck_x = center_x + sun_radius * 0.3 + i * (sun_radius * 0.2)
        speck_y = sun_center_y - sun_radius * 0.4 + i * (sun_radius * 0.1)
        speck_size = max(1, int(size / 150))
        sun_draw.ellipse((speck_x - speck_size, speck_y - speck_size,
                         speck_x + speck_size, speck_y + speck_size),
                        fill=(255, 255, 255, 120))
    
    # Composite sun onto image
    img = Image.alpha_composite(img, sun_overlay)
    
    # Draw subtle horizon line (gentle upward curve)
    horizon_overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    horizon_draw = ImageDraw.Draw(horizon_overlay)
    
    for x in range(size):
        # Subtle upward curve (hill/earth curvature)
        curve = math.sin((x / size) * math.pi) * (size * 0.015)
        y = int(horizon_y + curve)
        if 0 <= y < size:
            horizon_draw.point((x, y), fill=(255, 200, 150, 100))
    
    img = Image.alpha_composite(img, horizon_overlay)
    
    # Apply rounded square mask
    img.putalpha(mask)
    
    return img

def generate_all_icons(output_dir):
    """Generate all icon sizes."""
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating sunrise icons in: {output_dir}")
    
    for size in ICON_SIZES:
        icon = generate_sunrise_icon(size)
        output_file = output_path / f"icon-{size}x{size}.png"
        icon.save(output_file, 'PNG', optimize=True)
        print(f"✓ Generated: {output_file.name}")
    
    print(f"\n✓ Successfully generated all icons!")

def main():
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "public/icons"
    generate_all_icons(output_dir)

if __name__ == "__main__":
    main()

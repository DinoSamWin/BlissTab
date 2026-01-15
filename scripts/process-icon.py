#!/usr/bin/env python3
"""
Icon Processor for StartlyTab
Processes a source image and generates all required icon sizes.
"""

import sys
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: PIL (Pillow) is not installed.")
    print("Please install it with: pip3 install Pillow")
    sys.exit(1)

# Icon sizes to generate
ICON_SIZES = [1024, 512, 256, 128, 64, 32, 16]

def process_icon(source_path, output_dir):
    """Process source image and generate all icon sizes."""
    
    # Validate source file
    if not os.path.exists(source_path):
        print(f"Error: Source file not found: {source_path}")
        return False
    
    # Create output directory if it doesn't exist
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    try:
        # Open and validate image
        img = Image.open(source_path)
        print(f"✓ Loaded image: {img.size[0]}x{img.size[1]} ({img.format})")
        
        # Convert to RGBA if needed (for transparency support)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Generate all sizes
        for size in ICON_SIZES:
            # Resize with high-quality resampling
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save to output directory
            output_file = output_path / f"icon-{size}x{size}.png"
            resized.save(output_file, 'PNG', optimize=True)
            print(f"✓ Generated: {output_file.name}")
        
        print(f"\n✓ Successfully generated all icons in: {output_dir}")
        return True
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 process-icon.py <source-image> [output-dir]")
        print("\nExample:")
        print("  python3 process-icon.py icon.png public/icons/")
        print("\nIf output-dir is not specified, icons will be saved to 'public/icons/'")
        sys.exit(1)
    
    source_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "public/icons"
    
    success = process_icon(source_path, output_dir)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()


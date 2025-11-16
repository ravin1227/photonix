#!/bin/bash

# Icon generator script for Photonix app
# This script generates all required icon sizes from a single source image

SOURCE_ICON="android/app/src/main/res/LoDi-Camera_lens_merging_with_letter_P__encased_in_rounded_square._Modern_flat_design__for_app_icon.-2025-11-16-21_19_34-hs5hdod2jnop0mooenalwa-removebg-preview.png"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Error: Source icon not found: $SOURCE_ICON"
    exit 1
fi

echo "📱 Generating app icons from: $SOURCE_ICON"
echo ""

echo "🔷 Generating Android icons..."

# Android icons: density name, size
generate_android_icon() {
    local density=$1
    local size=$2
    local output_dir="android/app/src/main/res/mipmap-${density}"
    
    mkdir -p "$output_dir"
    
    # Generate square icon
    sips -z "$size" "$size" "$SOURCE_ICON" --out "$output_dir/ic_launcher.png" > /dev/null 2>&1
    
    # Generate round icon
    sips -z "$size" "$size" "$SOURCE_ICON" --out "$output_dir/ic_launcher_round.png" > /dev/null 2>&1
    
    echo "  ✅ Generated ${density} icons (${size}x${size}px)"
}

generate_android_icon "mdpi" "48"
generate_android_icon "hdpi" "72"
generate_android_icon "xhdpi" "96"
generate_android_icon "xxhdpi" "144"
generate_android_icon "xxxhdpi" "192"

echo ""
echo "🍎 Generating iOS icons..."

ios_dir="ios/PhotonixMobile/Images.xcassets/AppIcon.appiconset"
mkdir -p "$ios_dir"

# iOS icons: filename, size
generate_ios_icon() {
    local filename=$1
    local size=$2
    local output_file="$ios_dir/${filename}.png"
    
    sips -z "$size" "$size" "$SOURCE_ICON" --out "$output_file" > /dev/null 2>&1
    echo "  ✅ Generated ${filename}.png (${size}x${size}px)"
}

generate_ios_icon "icon-20-2x" "40"
generate_ios_icon "icon-20-3x" "60"
generate_ios_icon "icon-29-2x" "58"
generate_ios_icon "icon-29-3x" "87"
generate_ios_icon "icon-40-2x" "80"
generate_ios_icon "icon-40-3x" "120"
generate_ios_icon "icon-60-2x" "120"
generate_ios_icon "icon-60-3x" "180"
generate_ios_icon "icon-1024" "1024"

# Update iOS Contents.json
cat > "$ios_dir/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "icon-20-2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-20-3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-29-2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-29-3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-40-2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-40-3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-60-2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-60-3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

echo ""
echo "✨ All icons generated successfully!"
echo ""
echo "📱 Android icons: android/app/src/main/res/mipmap-*/"
echo "🍎 iOS icons: ios/PhotonixMobile/Images.xcassets/AppIcon.appiconset/"
echo ""
echo "✅ You can now build your app!"

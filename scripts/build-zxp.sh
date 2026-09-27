#!/bin/bash

# Pro Caption AE ZXP Builder
# This script builds a signed ZXP installer for distribution

set -e

echo "🔨 Building Pro Caption AE ZXP Installer..."
echo ""

# Check if ZXP_PASSWORD is set
if [ -z "$ZXP_PASSWORD" ]; then
    echo "❌ Error: ZXP_PASSWORD environment variable not set"
    echo ""
    echo "To build the ZXP, you need your certificate password:"
    echo "  export ZXP_PASSWORD='your-certificate-password'"
    echo "  ./scripts/build-zxp.sh"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the ZXP build
echo "🏗️  Building ZXP package..."
npm run zxp

# Check if build was successful
if [ -f "dist/zxp/com.procaptionae.panel/com.procaptionae.panel.zxp" ]; then
    ZXP_FILE="dist/zxp/com.procaptionae.panel/com.procaptionae.panel.zxp"
    ZXP_SIZE=$(du -h "$ZXP_FILE" | cut -f1)
    
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📦 ZXP File created:"
    echo "   $ZXP_FILE"
    echo "   Size: $ZXP_SIZE"
    echo ""
    echo "📖 Installation Guide:"
    echo "   1. Download from: https://github.com/64r3al/Pro-Caption-AE/releases"
    echo "   2. Drag the .zxp into After Effects window"
    echo "   3. Restart After Effects"
    echo "   4. Go to Window → Extensions → Pro Caption AE"
    echo ""
else
    echo "❌ Build failed - ZXP file not created"
    exit 1
fi

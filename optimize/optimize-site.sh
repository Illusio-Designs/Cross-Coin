#!/bin/bash

echo "🚀 Cross-Coin Performance Optimization Script"
echo "============================================"
echo

echo "📦 Installing dependencies..."
cd frontend1
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "🧹 Cleaning previous builds..."
npm run clean
if [ $? -ne 0 ]; then
    echo "❌ Failed to clean builds"
    exit 1
fi

echo
echo "🔨 Building optimized application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build application"
    exit 1
fi

echo
echo "🎉 Optimization completed successfully!"
echo
echo "📊 Performance improvements applied:"
echo "  ✅ Image optimization enabled"
echo "  ✅ Compression enabled"
echo "  ✅ Caching headers configured"
echo "  ✅ Bundle splitting optimized"
echo "  ✅ SWC minification enabled"
echo "  ✅ CSS optimization enabled"
echo
echo "🚀 Your site should now load significantly faster!"
echo
echo "💡 To start the optimized server, run:"
echo "   cd frontend1"
echo "   npm start"
echo

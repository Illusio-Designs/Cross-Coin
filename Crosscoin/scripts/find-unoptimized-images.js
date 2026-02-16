const fs = require('fs');
const path = require('path');

/**
 * Script to find all unoptimized images in the codebase
 * Run: node scripts/find-unoptimized-images.js
 */

const srcDir = path.join(__dirname, '../src');
const results = {
  imgTags: [],
  safeImageComponents: [],
  missingDimensions: [],
  totalFiles: 0
};

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        searchFiles(filePath);
      }
    } else if (file.match(/\.(jsx|js|tsx|ts)$/)) {
      results.totalFiles++;
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(srcDir, filePath);
      
      // Find <img> tags
      const imgMatches = content.match(/<img[^>]*>/g);
      if (imgMatches) {
        imgMatches.forEach(match => {
          const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
          results.imgTags.push({
            file: relativePath,
            line: lineNumber,
            code: match.substring(0, 80) + '...'
          });
        });
      }
      
      // Find SafeImage components
      const safeImageMatches = content.match(/<SafeImage[^>]*>/g);
      if (safeImageMatches) {
        safeImageMatches.forEach(match => {
          const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
          results.safeImageComponents.push({
            file: relativePath,
            line: lineNumber,
            code: match.substring(0, 80) + '...'
          });
        });
      }
      
      // Find Next Image without dimensions
      const imageMatches = content.match(/<Image[^>]*>/g);
      if (imageMatches) {
        imageMatches.forEach(match => {
          if (!match.includes('width=') || !match.includes('height=')) {
            const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
            results.missingDimensions.push({
              file: relativePath,
              line: lineNumber,
              code: match.substring(0, 80) + '...'
            });
          }
        });
      }
    }
  });
}

console.log('🔍 Scanning for unoptimized images...\n');
searchFiles(srcDir);

console.log('📊 RESULTS\n');
console.log(`Total files scanned: ${results.totalFiles}\n`);

if (results.imgTags.length > 0) {
  console.log(`❌ Found ${results.imgTags.length} <img> tags (should use Next.js <Image>):`);
  results.imgTags.forEach(item => {
    console.log(`   ${item.file}:${item.line}`);
    console.log(`   ${item.code}\n`);
  });
}

if (results.safeImageComponents.length > 0) {
  console.log(`⚠️  Found ${results.safeImageComponents.length} <SafeImage> components (consider replacing):`);
  results.safeImageComponents.forEach(item => {
    console.log(`   ${item.file}:${item.line}`);
    console.log(`   ${item.code}\n`);
  });
}

if (results.missingDimensions.length > 0) {
  console.log(`⚠️  Found ${results.missingDimensions.length} <Image> tags missing width/height:`);
  results.missingDimensions.forEach(item => {
    console.log(`   ${item.file}:${item.line}`);
    console.log(`   ${item.code}\n`);
  });
}

if (results.imgTags.length === 0 && results.safeImageComponents.length === 0 && results.missingDimensions.length === 0) {
  console.log('✅ All images are optimized!');
} else {
  console.log('\n📝 RECOMMENDATIONS:');
  console.log('1. Replace <img> tags with Next.js <Image> component');
  console.log('2. Add width and height props to all <Image> components');
  console.log('3. Use priority={true} for above-the-fold images');
  console.log('4. Use loading="lazy" for below-the-fold images (default)');
  console.log('\nSee PERFORMANCE_OPTIMIZATION_GUIDE.md for details.');
}

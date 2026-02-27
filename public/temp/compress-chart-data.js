const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Directory containing chart data files
const chartDataDir = './chart-data';

// Compress all JSON files regardless of size
const MIN_SIZE_TO_COMPRESS = 0; // No minimum size - compress everything

async function compressFile(filePath) {
  return new Promise((resolve, reject) => {
    const gzPath = `${filePath}.gz`;
    
    // Delete old .gz file first to ensure fresh compression
    if (fs.existsSync(gzPath)) {
      try {
        fs.unlinkSync(gzPath);
      } catch (err) {
        console.log(`   ⚠️  Could not delete old .gz file: ${err.message}`);
      }
    }
    
    const readStream = fs.createReadStream(filePath);
    const writeStream = fs.createWriteStream(gzPath);
    const gzip = zlib.createGzip({ level: 9 }); // Maximum compression

    readStream
      .pipe(gzip)
      .pipe(writeStream)
      .on('finish', () => {
        // Get file sizes for comparison
        const originalSize = fs.statSync(filePath).size;
        const compressedSize = fs.statSync(gzPath).size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        resolve({
          file: path.basename(filePath),
          originalSize: (originalSize / (1024 * 1024)).toFixed(2) + 'MB',
          compressedSize: (compressedSize / (1024 * 1024)).toFixed(2) + 'MB',
          compressionRatio: compressionRatio + '%'
        });
      })
      .on('error', reject);
  });
}

async function compressAllFiles() {
  try {
    console.log('🗜️  Starting compression of all chart data files...\n');
    
    if (!fs.existsSync(chartDataDir)) {
      console.log('❌ Chart data directory not found');
      return;
    }
    
    const files = fs.readdirSync(chartDataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(chartDataDir, file),
        size: fs.statSync(path.join(chartDataDir, file)).size
      }))
      .filter(file => file.size >= MIN_SIZE_TO_COMPRESS)
      .sort((a, b) => b.size - a.size); // Sort by size (largest first)

    if (files.length === 0) {
      console.log('✅ No JSON files found to compress');
      return;
    }

    console.log(`📊 Found ${files.length} files to compress:\n`);
    
    const results = [];
    
    for (const file of files) {
      console.log(`🗜️  Compressing ${file.name}...`);
      try {
        const result = await compressFile(file.path);
        results.push(result);
        console.log(`   ✅ ${result.originalSize} → ${result.compressedSize} (${result.compressionRatio} reduction)`);
      } catch (error) {
        console.log(`   ❌ Failed to compress ${file.name}:`, error.message);
      }
    }

    // Summary
    if (results.length > 0) {
      console.log('\n📈 Compression Summary:');
      console.log('='.repeat(50));
      
      let totalOriginal = 0;
      let totalCompressed = 0;
      
      results.forEach(result => {
        const original = parseFloat(result.originalSize);
        const compressed = parseFloat(result.compressedSize);
        totalOriginal += original;
        totalCompressed += compressed;
        
        console.log(`📄 ${result.file.padEnd(25)} ${result.compressionRatio.padStart(6)} saved`);
      });
      
      const overallRatio = ((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1);
      console.log('='.repeat(50));
      console.log(`🎯 TOTAL: ${totalOriginal.toFixed(2)}MB → ${totalCompressed.toFixed(2)}MB (${overallRatio}% reduction)`);
    }
    
  } catch (error) {
    console.error('❌ Error during compression:', error);
    process.exit(1);
  }
}

// Run the compression
compressAllFiles().then(() => {
  console.log('\n✅ Compression complete!');
}).catch((error) => {
  console.error('❌ Compression failed:', error);
  process.exit(1);
}); 
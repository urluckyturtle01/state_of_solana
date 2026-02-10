const fs = require('fs');
const path = require('path');

// Create OG images directory structure for charts
async function createOGImagesStructure() {
  const ogImagesDir = path.join(process.cwd(), 'public', 'og-images', 'charts');
  
  console.log('📁 Creating OG images directory structure...');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(ogImagesDir)) {
    fs.mkdirSync(ogImagesDir, { recursive: true });
    console.log(`✅ Created directory: ${ogImagesDir}`);
  } else {
    console.log(`📁 Directory already exists: ${ogImagesDir}`);
  }
  
  // Create a default OG image placeholder if it doesn't exist
  const defaultImagePath = path.join(ogImagesDir, 'default-chart.png');
  
  if (!fs.existsSync(defaultImagePath)) {
    // Create a placeholder text file that can be replaced with actual images later
    const placeholderContent = `# Chart OG Image Placeholder

This directory should contain Open Graph images for chart social sharing.

## Image Requirements:
- Dimensions: 1200x630 pixels
- Format: PNG or JPG
- File size: Under 8MB (ideally under 1MB)

## Naming Convention:
- default-chart.png (fallback image)
- chart-{chartId}.png (specific chart images)

## Generate Images:
You can generate chart-specific OG images using tools like:
- Puppeteer (automated screenshots)
- Canvas API (programmatic generation)
- Design tools (Figma, Canva, etc.)

## Example chart image names:
- chart-1749809832495-hqam9lh.png
- chart-1748406595056-cvvtmpt.png
`;
    
    fs.writeFileSync(path.join(ogImagesDir, 'README.md'), placeholderContent);
    console.log('📝 Created README.md with instructions for OG images');
  }
  
  console.log('🎉 OG images structure setup completed!');
  
  return {
    directory: ogImagesDir,
    defaultImageUrl: '/og-images/charts/default-chart.png'
  };
}

// Run the setup
if (require.main === module) {
  createOGImagesStructure()
    .then(result => {
      console.log('📊 OG images setup completed successfully!');
      console.log(`🖼️  Default image URL: ${result.defaultImageUrl}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to create OG images structure:', error);
      process.exit(1);
    });
}

module.exports = { createOGImagesStructure }; 
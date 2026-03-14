/**
 * Generates icon-192.png and icon-512.png from icons/favicon.svg for PWA install on mobile.
 * Run: npm install && npm run generate-pwa-icons
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Run: npm install');
    process.exit(1);
  }

  const root = path.resolve(__dirname, '..');
  const svgPath = path.join(root, 'icons', 'favicon.svg');
  const sizes = [192, 512];

  if (!fs.existsSync(svgPath)) {
    console.error('icons/favicon.svg not found');
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath);
  for (const size of sizes) {
    const outPath = path.join(root, 'icons', `icon-${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log('Created', outPath);
  }
  console.log('Done. Deploy to get "Add to Home Screen" on phone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

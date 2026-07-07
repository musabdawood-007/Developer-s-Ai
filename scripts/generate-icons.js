const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svgBuffer = fs.readFileSync(path.join(__dirname, "..", "public", "icon.svg"));
const outDir = path.join(__dirname, "..", "public");

const sizes = [192, 512];

(async () => {
  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`Generated: ${outPath}`);
  }

  // Also generate apple-touch-icon (180x180)
  const applePath = path.join(outDir, "apple-touch-icon.png");
  await sharp(svgBuffer).resize(180, 180).png().toFile(applePath);
  console.log(`Generated: ${applePath}`);

  // Maskable icon (512x512 with padding for Android adaptive icons)
  const maskablePath = path.join(outDir, "icon-maskable-512.png");
  await sharp(svgBuffer).resize(512, 512).png().toFile(maskablePath);
  console.log(`Generated: ${maskablePath}`);

  console.log("All icons generated!");
})();

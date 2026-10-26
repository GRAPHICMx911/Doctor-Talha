const fs = require('fs');
const path = require('path');

console.log('[Build]: Preparing production distribution for Netlify...');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const indexHtmlPath = path.join(rootDir, 'Index.html');

// 1. Clean or create dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Recursive copy helper
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItem => {
      copyRecursive(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 3. Copy public assets (admin portal, api-bridge.js, icons, etc.)
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, distDir);
  console.log('[Build]: Copied public assets to dist/');
}

// 4. Process Index.html
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Inject api-bridge if not already present
  if (!html.includes('api-bridge.js')) {
    const bridgeTag = `
  <!-- Node.js + Express Live Bridge for Netlify -->
  <script src="/js/api-bridge.js"></script>
</body>`;
    html = html.replace('</body>', bridgeTag);
  }

  // Write both lowercase index.html (standard for Linux/Netlify) and Index.html
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(distDir, 'Index.html'), html, 'utf8');
  console.log('[Build]: Successfully built dist/index.html and dist/Index.html');
} else {
  console.error('[Build Error]: Source Index.html not found in project root!');
  process.exit(1);
}

// 5. Generate Netlify _redirects file
const redirectsContent = `
# Netlify Clean URL & API Routing
/api/*       /.netlify/functions/api/:splat   200
/admin       /admin/index.html                200
/admin/*     /admin/index.html                200
`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent.trim(), 'utf8');
console.log('[Build]: Generated dist/_redirects for Netlify routing.');

console.log('[Build]: Netlify build completed successfully.');

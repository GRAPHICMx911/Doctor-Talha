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

// 3. Copy public assets (vendor, images, admin portal, api-bridge.js, icons, etc.)
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, distDir);
  console.log('[Build]: Copied public assets to dist/');
}

// 4. Process Index.html
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // A. Add favicon & local self-hosted FontAwesome + fallback CDNs to ensure icons & logo ALWAYS show
  const enhancedHeadLinks = `
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <!-- Local Self-Hosted FontAwesome (Guaranteed offline/local/Netlify rendering) -->
  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
  <!-- CDN Fallbacks with CORS & Referrer headers -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" crossorigin="anonymous">
`;

  if (!html.includes('/vendor/fontawesome/css/all.min.css')) {
    html = html.replace('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">', enhancedHeadLinks);
  }

  // B. Replace heavy ~823KB base64 hero image with fast cached /images/hero-clinic.jpg (loads in 50ms instead of blocking)
  const base64ImgRegex = /<img\s+src="data:image\/jpeg;base64,[^"]+"\s+alt="Modern Consultation Room"\s+class="([^"]+)">/i;
  if (base64ImgRegex.test(html)) {
    const replacementImg = `<img src="/images/hero-clinic.jpg" alt="Modern Consultation Room" class="w-full h-80 object-cover" loading="eager" onerror="this.onerror=null; this.src='/images/logo.svg';">`;
    html = html.replace(base64ImgRegex, replacementImg);
    console.log('[Build]: Replaced heavy inline base64 with optimized /images/hero-clinic.jpg asset');
  }

  // C. Enhance Brand Logo with SVG fallback so it displays 100% reliably even if webfonts are slow
  const logoOld = `<div class="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition">
        <i class="fa-solid fa-user-doctor text-xl"></i>
      </div>`;
  const logoEnhanced = `<div class="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition overflow-hidden">
        <img src="/images/logo.svg" alt="Dr. Talha Logo" class="w-7 h-7" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <i class="fa-solid fa-user-doctor text-xl" style="display:none;"></i>
      </div>`;
  html = html.replace(logoOld, logoEnhanced);

  // D. Enhance hero profile avatar
  const avatarOld = `<div class="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          TP
        </div>`;
  const avatarEnhanced = `<div class="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm overflow-hidden">
          <img src="/images/doctor-avatar.svg" alt="Dr. Talha" class="w-full h-full object-cover" onerror="this.outerHTML='<span class=\\'font-bold text-lg\\'>TP</span>';">
        </div>`;
  html = html.replace(avatarOld, avatarEnhanced);

  // E. Inject api-bridge if not already present
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

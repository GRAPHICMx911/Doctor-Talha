import shutil
import os
import re

print("1. Copying assets to root...")
os.makedirs('images', exist_ok=True)
os.makedirs('vendor', exist_ok=True)

# Copy images
for item in os.listdir('public/images'):
    s = os.path.join('public/images', item)
    d = os.path.join('images', item)
    shutil.copyfile(s, d)
print("Copied images to root/images")

# Copy vendor
if os.path.exists('vendor/fontawesome'):
    shutil.rmtree('vendor/fontawesome')
shutil.copytree('public/vendor/fontawesome', 'vendor/fontawesome')
print("Copied vendor/fontawesome to root/vendor/fontawesome")

# Copy favicon
shutil.copyfile('public/favicon.svg', 'favicon.svg')
print("Copied favicon.svg to root")

# 2. Update Index.html
print("2. Updating Index.html with asset paths and fallbacks...")
with open('Index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# A. Head links for FontAwesome & Favicon
font_head_old = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">'
font_head_new = """<!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <!-- Local FontAwesome (Guaranteed offline / local / Netlify rendering) -->
  <link rel="stylesheet" href="vendor/fontawesome/css/all.min.css">
  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
  <!-- CDN Fallbacks with CORS & Referrer policy -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" crossorigin="anonymous">"""

if font_head_old in html:
    html = html.replace(font_head_old, font_head_new)
    print("Replaced FontAwesome link with self-hosted + fallback CDNs")

# B. Hero Image
base64_regex = r'<img\s+src="data:image\/jpeg;base64,[^"]+"\s+alt="Modern Consultation Room"\s+class="([^"]+)">'
hero_replacement = r'<img src="images/hero-clinic.jpg" alt="Modern Consultation Room" class="\1" onerror="this.onerror=null; this.src=\'images/logo.svg\';">'
if re.search(base64_regex, html):
    html = re.sub(base64_regex, hero_replacement, html)
    print("Replaced base64 hero image with images/hero-clinic.jpg")

# C. Brand Logo
logo_old = """<div class="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition">
          <i class="fa-solid fa-user-doctor text-xl"></i>
        </div>"""
logo_new = """<div class="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition overflow-hidden">
          <img src="images/logo.svg" alt="Dr. Talha Logo" class="w-7 h-7" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <i class="fa-solid fa-user-doctor text-xl" style="display:none;"></i>
        </div>"""
if logo_old in html:
    html = html.replace(logo_old, logo_new)
    print("Enhanced brand logo with SVG emblem")

# D. Hero Badge Avatar
avatar_old = """<div class="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            TP
          </div>"""
avatar_new = """<div class="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm overflow-hidden">
            <img src="images/doctor-avatar.svg" alt="Dr. Talha" class="w-full h-full object-cover" onerror="this.outerHTML='<span class=\\'font-bold text-lg\\'>TP</span>';">
          </div>"""
if avatar_old in html:
    html = html.replace(avatar_old, avatar_new)
    print("Enhanced doctor avatar in hero badge")

with open('Index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated Index.html saved successfully.")

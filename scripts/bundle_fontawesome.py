import os
import urllib.request
import re

vendor_dir = 'public/vendor/fontawesome'
css_dir = os.path.join(vendor_dir, 'css')
webfonts_dir = os.path.join(vendor_dir, 'webfonts')

os.makedirs(css_dir, exist_ok=True)
os.makedirs(webfonts_dir, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0'}

print("Downloading FontAwesome CSS...")
css_url = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css'
req = urllib.request.Request(css_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    css_content = resp.read().decode('utf-8')

# Save all.min.css
with open(os.path.join(css_dir, 'all.min.css'), 'w', encoding='utf-8') as f:
    f.write(css_content)
print(f"Saved all.min.css ({len(css_content)} bytes)")

# Webfonts needed
font_files = [
    'fa-solid-900.woff2',
    'fa-solid-900.ttf',
    'fa-brands-400.woff2',
    'fa-brands-400.ttf',
    'fa-regular-400.woff2',
    'fa-regular-400.ttf'
]

base_font_url = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/webfonts/'

for font in font_files:
    try:
        url = base_font_url + font
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        with open(os.path.join(webfonts_dir, font), 'wb') as f:
            f.write(data)
        print(f"Downloaded webfont: {font} ({len(data)} bytes)")
    except Exception as e:
        print(f"Font download error for {font}: {e}")

print("FontAwesome self-hosting setup complete!")

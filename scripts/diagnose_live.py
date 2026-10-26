import urllib.request
import re

url = 'https://drmtalha.netlify.app/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

scripts = re.findall(r'<script[^>]+src=["\'](.*?)["\']', html)
print("External scripts:")
for s in scripts:
    print(" ", s)

links = re.findall(r'<link[^>]+href=["\'](.*?)["\']', html)
print("\nExternal links:")
for l in links:
    print(" ", l)

# Check if image data is complete
img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html)
if img_match:
    src = img_match.group(1)
    print("\nImage src type:", src[:30], "Total length:", len(src))

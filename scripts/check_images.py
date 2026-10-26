import re

with open('Index.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

imgs = re.findall(r'<img[^>]+>', html, re.IGNORECASE)
print(f"Total <img> tags: {len(imgs)}")
for img in imgs:
    src_match = re.search(r'src=["\'](.*?)["\']', img, re.IGNORECASE)
    src = src_match.group(1) if src_match else "no src"
    alt_match = re.search(r'alt=["\'](.*?)["\']', img, re.IGNORECASE)
    alt = alt_match.group(1) if alt_match else "no alt"
    print(f"  - img src: {src[:100]} | alt: {alt}")

links = re.findall(r'<link[^>]+>', html, re.IGNORECASE)
print(f"\nTotal <link> tags: {len(links)}")
for link in links:
    print(f"  - link: {link}")

svgs = re.findall(r'<svg[^>]*>', html, re.IGNORECASE)
print(f"\nTotal <svg> tags: {len(svgs)}")

icons = set(re.findall(r'fa-[a-z0-9\-]+', html))
print(f"\nTotal unique FontAwesome icons: {len(icons)}")
print("Sample icons:", list(icons)[:15])

# Check for local file paths vs https URLs
local_imgs = [i for i in imgs if not ('http://' in i or 'https://' in i or 'data:' in i)]
print(f"\nLocal image references count: {len(local_imgs)}")
for li in local_imgs:
    print("  Local img:", li)

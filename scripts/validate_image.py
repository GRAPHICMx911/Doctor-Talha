import re
import base64

with open('Index.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

match = re.search(r'src="(data:image/jpeg;base64,([^"]+))"', html)
if match:
    b64_data = match.group(2)
    print("Base64 string length:", len(b64_data))
    try:
        decoded = base64.b64decode(b64_data)
        print("Decoded bytes length:", len(decoded))
        print("Header bytes (hex):", decoded[:8].hex())
        if decoded[:3] == b'\xff\xd8\xff':
            print("Valid JPEG header detected!")
            with open('public/hero-doctor.jpg', 'wb') as img_f:
                img_f.write(decoded)
            print("Successfully extracted hero image to public/hero-doctor.jpg")
        else:
            print("NOT a valid JPEG header!")
    except Exception as e:
        print("Decode error:", e)
else:
    print("No base64 image found!")

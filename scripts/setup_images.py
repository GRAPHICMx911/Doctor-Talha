import os
import shutil

images_dir = 'public/images'
os.makedirs(images_dir, exist_ok=True)

# 1. Copy extracted hero-doctor.jpg to public/images/hero-clinic.jpg
src_hero = 'public/hero-doctor.jpg'
dest_hero = os.path.join(images_dir, 'hero-clinic.jpg')
if os.path.exists(src_hero):
    shutil.copyfile(src_hero, dest_hero)
    print(f"Copied {src_hero} -> {dest_hero}")

# 2. Generate a professional Medical Doctor Logo SVG
logo_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="24" fill="#0d9488"/>
  <!-- Doctor Stethoscope & Cross Emblem -->
  <path d="M50 22 C42 22 36 28 36 36 C36 44 42 50 50 50 C58 50 64 44 64 36 C64 28 58 22 50 22 Z" fill="#ffffff"/>
  <path d="M28 78 C28 64 38 56 50 56 C62 56 72 64 72 78 Z" fill="#ffffff" opacity="0.9"/>
  <!-- Medical Cross Badge -->
  <circle cx="72" cy="72" r="16" fill="#14b8a6" stroke="#ffffff" stroke-width="3"/>
  <rect x="69" y="62" width="6" height="20" rx="2" fill="#ffffff"/>
  <rect x="62" y="69" width="20" height="6" rx="2" fill="#ffffff"/>
</svg>"""

with open(os.path.join(images_dir, 'logo.svg'), 'w', encoding='utf-8') as f:
    f.write(logo_svg)
print("Created public/images/logo.svg")

with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(logo_svg)
print("Created public/favicon.svg")

# 3. Doctor Avatar
doctor_avatar_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <circle cx="60" cy="60" r="60" fill="#0f766e"/>
  <circle cx="60" cy="45" r="22" fill="#f8fafc"/>
  <path d="M24 104 C26 80 42 70 60 70 C78 70 94 80 96 104 Z" fill="#f8fafc"/>
  <!-- Stethoscope around neck -->
  <path d="M48 64 C48 76 72 76 72 64" stroke="#0d9488" stroke-width="4" stroke-linecap="round"/>
  <circle cx="60" cy="80" r="5" fill="#14b8a6"/>
</svg>"""

with open(os.path.join(images_dir, 'doctor-avatar.svg'), 'w', encoding='utf-8') as f:
    f.write(doctor_avatar_svg)
print("Created public/images/doctor-avatar.svg")

"""
Kompres foto produk: PNG -> WebP (maks lebar 1400px), lalu update referensi di HTML/JS/CSS.
Jalankan dari folder root website:   python optimize-images.py
Butuh: pip install pillow
File asli TIDAK dihapus (hapus manual setelah dicek).
"""
import os, re, sys
from PIL import Image, PngImagePlugin

# Beberapa PNG punya metadata (teks) yang sangat besar; batas bawaan Pillow terlalu kecil
PngImagePlugin.MAX_TEXT_CHUNK = 500 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = None

ROOT = os.getcwd()
MAX_W = 1400
QUALITY = 80
SKIP_DIRS = {'.git', 'node_modules'}

converted = 0
saved = 0
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in SKIP_DIRS]
    for f in fn:
        name, ext = os.path.splitext(f)
        if ext.lower() not in ('.png', '.jpg', '.jpeg'):
            continue
        if 'logo' in name.lower() or 'favicon' in name.lower():
            continue
        src = os.path.join(dp, f)
        if os.path.abspath(dp) == ROOT:   # gambar di root (logo dll) dilewati
            continue
        dst = os.path.join(dp, name + '.webp')
        try:
            im = Image.open(src)
            if im.width > MAX_W:
                im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
            im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
            im.save(dst, 'WEBP', quality=QUALITY, method=6)
        except Exception as e:
            print('GAGAL (dilewati):', os.path.relpath(src, ROOT), '-', e)
            continue
        converted += 1
        saved += os.path.getsize(src) - os.path.getsize(dst)
        if converted % 50 == 0:
            print(converted, 'gambar selesai...')
print(f'{converted} gambar dikonversi, hemat sekitar {saved/1024/1024:.1f} MB')

# update referensi
ref = re.compile(r'([\w\-./ ]+?)\.(png|jpe?g)(?=["\')\s?#])', re.I)
def fix(m):
    base = m.group(1)
    if 'logo' in base.lower() or 'favicon' in base.lower():
        return m.group(0)
    if os.path.exists(os.path.join(ROOT, base + '.webp')):
        return base + '.webp'
    return m.group(0)

for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in SKIP_DIRS]
    for f in fn:
        if not f.lower().endswith(('.html', '.js', '.css')):
            continue
        p = os.path.join(dp, f)
        t = open(p, encoding='utf-8', newline='').read()
        t2 = ref.sub(fix, t)
        # path foto yang dirangkai lewat JavaScript (category.html)
        t2 = t2.replace("'foto') + '1.png'", "'foto') + '1.webp'").replace("+ n + '.png'", "+ n + '.webp'")
        t2 = t2.replace("n + '.png'", "n + '.webp'")
        if t2 != t:
            open(p, 'w', encoding='utf-8', newline='').write(t2)
            print('updated', os.path.relpath(p, ROOT))

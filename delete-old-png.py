import os

ROOT = os.getcwd()
SKIP_DIRS = {'.git', 'node_modules'}
count = 0
freed = 0
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in SKIP_DIRS]
    if os.path.abspath(dp) == ROOT:
        continue
    for f in fn:
        name, ext = os.path.splitext(f)
        if ext.lower() not in ('.png', '.jpg', '.jpeg'):
            continue
        if 'logo' in name.lower() or 'favicon' in name.lower():
            continue
        if os.path.exists(os.path.join(dp, name + '.webp')):
            p = os.path.join(dp, f)
            freed += os.path.getsize(p)
            os.remove(p)
            count += 1
print(f'{count} file lama dihapus, lega {freed/1024/1024:.0f} MB')
# Exports every icon size from fresh renders of enso.py into public/icons/.
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
OUT = HERE.parent.parent / 'public' / 'icons'

def render(scale: float) -> Image.Image:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'master.png'
        subprocess.run([sys.executable, '-I', str(HERE / 'enso.py'), str(path), str(scale)], check=True)
        return Image.open(path).convert('RGB')

full = render(1.0)
safe = render(0.86)   # maskable: keep the stroke inside Android's 80% safe circle
small = render(1.12)  # favicon: bolder ring for tiny sizes

for size, name, img in [
    (180, 'apple-touch-icon.png', full),
    (192, 'icon-192.png', full),
    (512, 'icon-512.png', full),
    (512, 'icon-maskable-512.png', safe),
    (64, 'favicon-64.png', small),
]:
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
    print('wrote', name)

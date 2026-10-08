# Renders the Zenfullness app icon (brush ensō on the design's paper/sage/sand background).
# Usage: python3 scripts/icons/enso.py <out.png> [ring-scale]   (needs Pillow)
# Then: python3 scripts/icons/export.py  to write every size into public/icons/.
import sys, math, random
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]; k = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
S = 2048
BG=(0xF3,0xF1,0xEA); SAGE=(0xB9,0xD3,0xC2); SAND=(0xE8,0xD9,0xB8); INK=(0x2C,0x4E,0x3E)
rnd = random.Random(21)

bg = Image.new('RGB', (S, S), BG)
d = ImageDraw.Draw(bg)
d.ellipse([S*.40, -S*.30, S*1.25, S*.55], fill=SAGE)
d.ellipse([-S*.35, S*.55, S*.45, S*1.30], fill=SAND)
bg = bg.filter(ImageFilter.GaussianBlur(S*.14))
grain = Image.effect_noise((S, S), 20).convert('L').filter(ImageFilter.GaussianBlur(1.0))
bg = Image.blend(bg, Image.merge('RGB', (grain, grain, grain)), 0.03)

mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
cx, cy = S*.5, S*.5
R = S*.29*k
start, sweep = math.radians(125), math.radians(325)
W = S*.085*k
B = 120
steps = 2600

def pressure(t):
    rise = min(1, t/0.035) ** 0.5
    body = 1 - 0.55 * t ** 1.8          # gradual thinning
    tail = 1 - max(0, (t - 0.86) / 0.14) ** 1.4 * 0.9
    return rise * body * tail

for b in range(B):
    off = b/(B-1) - .5
    ink = .9 + .1*rnd.random()
    # dryness: outer bristles run dry earlier; each bristle has its own streaky pattern
    dry_at = 0.55 + 0.3*rnd.random() - abs(off)*0.45
    wob = rnd.random()*6.28
    walk = 0.0
    for i in range(steps):
        t = i/steps
        p = pressure(t)
        width = W*p
        a = start + sweep*t
        r = R*(1 + .02*math.sin(a*1.7+.4) + .008*math.sin(a*4.3+wob*.2))
        rr = r + off*width + math.sin(t*12+wob)*W*.012
        x = cx + rr*math.cos(a); y = cy + rr*math.sin(a)
        if t > dry_at:
            walk += rnd.uniform(-.08, .08) + 0.02
            if walk > 0.10 + (1 - (t - dry_at)) * 0.12:
                if walk > 0.55: walk = 0.0
                continue
        size = max(1.5, width / B * 3.2)
        md.ellipse([x-size, y-size, x+size, y+size], fill=int(255*ink))
mask = mask.filter(ImageFilter.GaussianBlur(2.2))
img = Image.composite(Image.new('RGB', (S, S), INK), bg, mask)
img.save(out)

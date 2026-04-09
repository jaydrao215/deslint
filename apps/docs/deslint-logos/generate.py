import cairosvg, os

OUT = "/home/claude/deslint-logos"

# ── MASTER SVG BUILDER ──────────────────────────────────────────────────────
# All geometry defined as fractions of icon_size so it scales perfectly.
# icon_size = S
# corner radius = S*0.208  (~20% = Apple-style)
# safe inset = S*0.14
# line h = S*0.052
# line y positions: top=S*0.27, mid=S*0.39, bot=S*0.51
# line widths: top=S*0.33, mid=S*0.46, bot=S*0.25
# dot cx = S*0.745, cy = bot_center, r = S*0.073
# check stroke-width = S*0.019

def icon_svg(S, bg="#534AB7", green="#1D9E75", with_check=True):
    rx = round(S * 0.208, 2)
    # inner card
    ix = round(S * 0.14, 2)
    iy = round(S * 0.135, 2)
    iw = round(S - ix*2, 2)
    ih = round(S - iy*2 + S*0.01, 2)
    irx = round(S * 0.094, 2)
    # lines
    lh = round(S * 0.052, 2)
    lrx = round(lh/2, 2)
    lx = round(S * 0.229, 2)
    y1 = round(S * 0.27, 2)
    y2 = round(S * 0.395, 2)
    y3 = round(S * 0.52, 2)
    w1 = round(S * 0.333, 2)
    w2 = round(S * 0.458, 2)
    w3 = round(S * 0.25, 2)
    # dot
    dcx = round(S * 0.75, 2)
    dcy = round(y3 + lh/2, 2)
    dr  = round(S * 0.073, 2)
    # check
    csw = round(S * 0.019, 2)
    # check coords relative to dot center
    ck_x1 = round(dcx - dr*0.45, 2)
    ck_y1 = round(dcy, 2)
    ck_x2 = round(dcx - dr*0.05, 2)
    ck_y2 = round(dcy + dr*0.5, 2)
    ck_x3 = round(dcx + dr*0.52, 2)
    ck_y3 = round(dcy - dr*0.55, 2)

    check = f'<path d="M{ck_x1} {ck_y1} L{ck_x2} {ck_y2} L{ck_x3} {ck_y3}" fill="none" stroke="white" stroke-width="{csw}" stroke-linecap="round" stroke-linejoin="round"/>' if with_check else ""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
  <rect width="{S}" height="{S}" rx="{rx}" fill="{bg}"/>
  <rect x="{ix}" y="{iy}" width="{iw}" height="{ih}" rx="{irx}" fill="white" opacity="0.07"/>
  <rect x="{lx}" y="{y1}" width="{w1}" height="{lh}" rx="{lrx}" fill="white" opacity="0.50"/>
  <rect x="{lx}" y="{y2}" width="{w2}" height="{lh}" rx="{lrx}" fill="white" opacity="0.85"/>
  <rect x="{lx}" y="{y3}" width="{w3}" height="{lh}" rx="{lrx}" fill="{green}"/>
  <circle cx="{dcx}" cy="{dcy}" r="{dr}" fill="{green}"/>
  {check}
</svg>"""

def lockup_svg(variant="light"):
    # horizontal lockup: icon 52px + wordmark
    # total canvas 320×52
    W, H = 320, 60
    S = 52
    bg_rect = "" if variant=="light" else f'<rect width="{W}" height="{H}" fill="#18181b"/>'
    text_fill = "white" if variant=="dark" else "#1a1a1a"
    tag_fill = "#71717a" if variant=="dark" else "#9ca3af"

    rx = round(S * 0.208, 2)
    ix = round(S * 0.14, 2)
    iy = round(S * 0.135, 2)
    iw = round(S - ix*2, 2)
    ih = round(S - iy*2 + S*0.01, 2)
    irx = round(S * 0.094, 2)
    lh = round(S * 0.052, 2)
    lrx = round(lh/2, 2)
    lx = round(S * 0.229, 2)
    y1 = round(S * 0.27, 2)
    y2 = round(S * 0.395, 2)
    y3 = round(S * 0.52, 2)
    w1 = round(S * 0.333, 2)
    w2 = round(S * 0.458, 2)
    w3 = round(S * 0.25, 2)
    dcx = round(S * 0.75, 2)
    dcy = round(y3 + lh/2, 2)
    dr  = round(S * 0.073, 2)
    csw = round(S * 0.019, 2)
    ck_x1 = round(dcx - dr*0.45, 2)
    ck_y1 = round(dcy, 2)
    ck_x2 = round(dcx - dr*0.05, 2)
    ck_y2 = round(dcy + dr*0.5, 2)
    ck_x3 = round(dcx + dr*0.52, 2)
    ck_y3 = round(dcy - dr*0.55, 2)

    # vertical center offset for icon in 60px tall canvas
    oy = 4  # top padding so icon is centered in 60px

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  {bg_rect}
  <g transform="translate(0,{oy})">
    <rect width="{S}" height="{S}" rx="{rx}" fill="#534AB7"/>
    <rect x="{ix}" y="{iy}" width="{iw}" height="{ih}" rx="{irx}" fill="white" opacity="0.07"/>
    <rect x="{lx}" y="{y1}" width="{w1}" height="{lh}" rx="{lrx}" fill="white" opacity="0.50"/>
    <rect x="{lx}" y="{y2}" width="{w2}" height="{lh}" rx="{lrx}" fill="white" opacity="0.85"/>
    <rect x="{lx}" y="{y3}" width="{w3}" height="{lh}" rx="{lrx}" fill="#1D9E75"/>
    <circle cx="{dcx}" cy="{dcy}" r="{dr}" fill="#1D9E75"/>
    <path d="M{ck_x1} {ck_y1} L{ck_x2} {ck_y2} L{ck_x3} {ck_y3}" fill="none" stroke="white" stroke-width="{csw}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="66" y="37" font-family="system-ui,-apple-system,sans-serif" font-size="30" font-weight="500" letter-spacing="-0.8" fill="{text_fill}">Deslint</text>
  <text x="67" y="53" font-family="system-ui,-apple-system,sans-serif" font-size="9.5" font-weight="400" letter-spacing="2.2" fill="{tag_fill}">DESIGN QUALITY GATE</text>
</svg>"""

def mono_icon_svg(S):
    """Monochrome (single-color) version for monochrome contexts"""
    rx = round(S * 0.208, 2)
    lh = round(S * 0.052, 2)
    lrx = round(lh/2, 2)
    lx = round(S * 0.229, 2)
    y1 = round(S * 0.27, 2)
    y2 = round(S * 0.395, 2)
    y3 = round(S * 0.52, 2)
    w1 = round(S * 0.333, 2)
    w2 = round(S * 0.458, 2)
    w3 = round(S * 0.25, 2)
    dcx = round(S * 0.75, 2)
    dcy = round(y3 + lh/2, 2)
    dr  = round(S * 0.073, 2)
    csw = round(S * 0.019, 2)
    ck_x1 = round(dcx - dr*0.45, 2)
    ck_y1 = round(dcy, 2)
    ck_x2 = round(dcx - dr*0.05, 2)
    ck_y2 = round(dcy + dr*0.5, 2)
    ck_x3 = round(dcx + dr*0.52, 2)
    ck_y3 = round(dcy - dr*0.55, 2)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
  <rect width="{S}" height="{S}" rx="{rx}" fill="white"/>
  <rect x="{lx}" y="{y1}" width="{w1}" height="{lh}" rx="{lrx}" fill="#534AB7" opacity="0.40"/>
  <rect x="{lx}" y="{y2}" width="{w2}" height="{lh}" rx="{lrx}" fill="#534AB7" opacity="0.70"/>
  <rect x="{lx}" y="{y3}" width="{w3}" height="{lh}" rx="{lrx}" fill="#534AB7"/>
  <circle cx="{dcx}" cy="{dcy}" r="{dr}" fill="#534AB7"/>
  <path d="M{ck_x1} {ck_y1} L{ck_x2} {ck_y2} L{ck_x3} {ck_y3}" fill="none" stroke="white" stroke-width="{csw}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""

# ── GENERATE ALL SVG FILES ──────────────────────────────────────────────────
files = {}

# Icon — colour, all standard sizes
for size in [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024]:
    svg = icon_svg(size)
    path = f"{OUT}/icon-{size}.svg"
    with open(path, "w") as f: f.write(svg)
    files[f"icon-{size}"] = (path, svg)

# Icon — monochrome
for size in [16, 32, 512]:
    svg = mono_icon_svg(size)
    path = f"{OUT}/icon-mono-{size}.svg"
    with open(path, "w") as f: f.write(svg)

# Lockups
for v in ["light", "dark"]:
    svg = lockup_svg(v)
    path = f"{OUT}/lockup-{v}.svg"
    with open(path, "w") as f: f.write(svg)

# ── GENERATE PNG FROM SVG ───────────────────────────────────────────────────
png_sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024]
for size in png_sizes:
    svg = icon_svg(size)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"{OUT}/icon-{size}.png",
                     output_width=size, output_height=size)
    print(f"  ✓ icon-{size}.png")

# Lockup PNGs at 2×
for v in ["light", "dark"]:
    svg = lockup_svg(v)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"{OUT}/lockup-{v}.png",
                     output_width=640, output_height=120)
    print(f"  ✓ lockup-{v}.png")

# Apple touch icon (180×180 PNG from 180 SVG)
svg = icon_svg(180)
cairosvg.svg2png(bytestring=svg.encode(), write_to=f"{OUT}/apple-touch-icon.png",
                 output_width=180, output_height=180)
print("  ✓ apple-touch-icon.png")

# OG / social card icon (512 on transparent — just the mark)
cairosvg.svg2png(bytestring=icon_svg(512).encode(), write_to=f"{OUT}/og-icon-512.png",
                 output_width=512, output_height=512)
print("  ✓ og-icon-512.png")

print("\nAll files generated.")

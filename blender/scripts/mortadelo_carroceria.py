# Mortadelo: trasera, cubierta, guardabarros, sillín y portabultos. Requiere helpers.py + vespino.py.
import numpy as np
from mathutils import Vector
PI, PII, CR, AS, AC = (MAT(n) for n in ("pintura", "pintura_interior", "cromo", "asiento", "acero"))
VESPINO_FONT = r"C:\Windows\Fonts\segoesc.ttf"

def interp(xs, pts):
    px = np.array([p[0] for p in pts]); py = np.array([p[1] for p in pts]); o = np.argsort(px)
    return np.interp(xs, px[o], py[o])
def arch_py(x, c=(189, 405), r=143):
    d = r*r - (x - c[0])**2
    return c[1] - math.sqrt(d) if d > 0 else c[1]

# ---- trasera: secciones a lo largo de X entre el borde superior calcado y el arco de la rueda
top_pts = [(347,226),(300,227),(200,229),(115,231),(106,236),(100,262),(92,276),(72,300),(56,333),(46,365),(41,382)]
xs = list(np.linspace(347, 42, 34)); tops = interp(xs, top_pts); rings = []
for x, tp in zip(xs, tops):
    bp = min(arch_py(x), 345) if x < 345 else 345
    if x < 106: bp = max(bp, tp + 6)
    hw = 0.10 if x > 110 else 0.10 - (110 - x)/62*0.035
    zt = P(x, tp)[1]; zb = P(x, bp)[1]
    rings.append(superellipse(P(x, 0)[0], 0, (zt+zb)/2, hw, (zt-zb)/2, n=20, e=0.42, axis='X'))
bm = bmesh.new(); loft(bm, rings)
put("trasera", bm, "carroceria", [PI], subsurf=1); apply_mods("trasera")
# puertas laterales embutidas (rectángulo redondeado, 3 mm de relieve) y su tornillo
bm = bmesh.new()
for s in (-1, 1):
    c = P3(306, 290, s*0.1005)
    ring = superellipse(c.x, 0, c.z, 0.06, 0.095, n=24, e=0.3, axis='Y')
    path = [Vector((p[0], c.y - s*0.002, p[2])) for p in ring]
    loft(bm, [path, [Vector((p.x, c.y + s*0.002, p.z)) for p in path]])
    bolt(bm, P3(306, 250, s*0.103), (0, s, 0), r=0.004, mi=1)
merge_into("trasera", bm)
set_origin("trasera", P3(345, 345))

# ---- cubierta: caja bajo la U, subdividida y luego con el emblema "Vespino" cromado en ambos lados
xs = list(np.linspace(344, 538, 16)); rings = []
for x in xs:
    t = (x - 344)/194; hw = 0.095*(1 if t < 0.85 else 1 - (t - 0.85)/0.15*0.25)
    ztop = P(0, 338)[1]; zb = P(0, 416 if t < 0.9 else 416 - (t - 0.9)*10*12)[1]
    rings.append(superellipse(P(x, 0)[0], 0, (ztop+zb)/2, hw, (ztop-zb)/2, n=20, e=0.3, axis='X'))
bm = bmesh.new(); loft(bm, rings)
put("cubierta", bm, "carroceria", [PI, CR], subsurf=1); apply_mods("cubierta")
add_text("cubierta", "Vespino", P3(445, 372, -0.0955), (math.pi/2, 0, 0), 0.034, VESPINO_FONT)
add_text("cubierta", "Vespino", P3(445, 372, 0.0955), (math.pi/2, 0, math.pi), 0.034, VESPINO_FONT)
set_origin("cubierta", P3(440, 416))

# ---- guardabarros: perfil en U con labio, barrido sobre el arco de la rueda
def fender(c_px, r_px, a0, a1, width, depth, n=48, tip=0.0):
    cx, cz = P(*c_px); rr = r_px*S
    prof = [(-1.0,1.0),(-0.98,0.55),(-0.85,0.2),(-0.55,0.03),(0,0),(0.55,0.03),(0.85,0.2),(0.98,0.55),(1.0,1.0)]
    rings = []
    for i in range(n):
        u = i/(n-1); a = math.radians(a0 + (a1 - a0)*u); d = Vector((math.cos(a), 0, math.sin(a)))
        w = width*(1 + tip*max(0, u - 0.8)/0.2)
        outer = [Vector((cx, 0, cz)) + d*(rr - depth*q) + Vector((0, p*w/2, 0)) for p, q in prof]
        inner = [Vector((cx, 0, cz)) + d*(rr - depth*q - 0.004) + Vector((0, p*(w/2 - 0.004), 0)) for p, q in reversed(prof)]
        rings.append(outer + inner)
    bm = bmesh.new(); loft(bm, rings); return bm
bm = fender((709, 409), 146, 212, 60, 0.108, 0.034, tip=0.12)
for s in (-1, 1):
    tube(bm, P3(600, 455, s*0.05), P3(700, 409, s*0.06), 0.004, seg=10, mi=1)     # tirante
    bolt(bm, P3(640, 300, s*0.054), (0, s, 0), mi=1)
put("guardabarros-d", bm, "carroceria", [PI, CR], subsurf=1); set_origin("guardabarros-d", FRONT_AXLE)
bm = fender((189, 405), 141, 174, 16, 0.125, 0.02)
put("guardabarros-t", bm, "carroceria", [PII], subsurf=1); set_origin("guardabarros-t", P3(189, 405))

# ---- sillín: silla de muelles, con costura perimetral, base, dos muelles traseros y tija
bm = bmesh.new(); secs = []; N = 16; K = 24
for i in range(N):
    t = i/(N-1); x = -0.44 + t*0.275
    hw = 0.125 if t < 0.35 else 0.125 - (t - 0.35)/0.65*0.083
    if t < 0.08: hw *= (0.85 + 0.15*t/0.08)
    # en la foto el sillín va de py 150 a py 195 (tapa + faldón): 0,098 m de alto en la parte trasera
    zt = 0.852 - 0.008*math.sin(t*math.pi) - (0.012 if t > 0.85 else 0); h = 0.085 if t < 0.6 else 0.085 - (t - 0.6)*0.1
    secs.append(superellipse(x, 0, zt - h/2, hw, h/2, n=K, e=0.3, axis='X'))
loft(bm, secs)
seam = [Vector((r[K//2][0], r[K//2][1], r[K//2][2])) for r in secs]   # lado derecho a media altura
for s in (-1, 1):
    path_tube(bm, [Vector((p.x, s*abs(p.y)*1.005, p.z)) for p in seam], 0.0015, seg=6, mi=1)
for s in (-1, 1):   # muelles bajo el faldón (en la foto quedan tapados)
    base = Vector((-0.38, s*0.07, 0.766))
    path_tube(bm, [base + Vector((0.008*math.cos(a), 0.008*math.sin(a), -a*0.0008)) for a in np.linspace(0, 2*math.pi*5, 75)], 0.0022, seg=6, mi=2)
box(bm, Vector((-0.31, 0, 0.765)), (0.2, 0.14, 0.006), mi=2)
tube(bm, P3(326, 198), P3(305, 232), 0.014, seg=16, mi=2)
put("sillin", bm, "carroceria", [AS, AS, AC]); set_origin("sillin", P3(305, 232))

# ---- portabultos: marco de pletina plana con dos ranuras longitudinales y patas
z = P(0, 229)[1]; x0, x1 = P(122, 0)[0], P(262, 0)[0]; w = 0.08
bm = bmesh.new()
def bar(p0, p1, wid=0.014, th=0.004):
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0); c = (p0 + p1)/2; L = d.length
    q = d.normalized().to_track_quat('X', 'Z').to_matrix()
    v = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for vv in v: vv.co = c + q @ Vector((vv.co.x*L, vv.co.y*wid, vv.co.z*th))
for y in (-w, w, -0.03, 0.03): bar((x0, y, z), (x1, y, z))
for x in (x0, x1, (x0+x1)/2): bar((x, -w, z), (x, w, z))
for y in (-w, w):
    bar((x1, y, z), (x1 + 0.03, y, z - 0.035)); bar((x0 + 0.02, y, z), (x0 + 0.04, y, z - 0.03))
put("portabultos", bm, "carroceria", [PI], bevel=0.0015, seg=1); set_origin("portabultos", (x1, 0, z))

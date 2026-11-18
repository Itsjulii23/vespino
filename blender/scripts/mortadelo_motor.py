# Mortadelo: motor, transmisión, escape, pedales, caballete y amortiguador. Requiere helpers.py + vespino.py.
# Cotas en px de perfil.jpg (lado derecho, -Y, es el visible): cigüeñal (347,409), polea trasera (205,405).
from mathutils import Vector
CA, AL, AC, CR, GO, PI, PO = (MAT(n) for n in ("carter", "aluminio", "acero", "cromo", "goma", "pintura", "porcelana"))
CRANK = P3(347, 409); DRIVEN = P3(205, 405); REAR_AXLE = P3(189, 405)
Y = Vector((0, 1, 0))

def disc(bm, c, r, y0, y1, seg=32, mi=0):
    tube(bm, c + Y*y0, c + Y*y1, r, seg=seg, mi=mi)

def gear(bm, c, r, teeth, y0, y1, mi=0):
    disc(bm, c, r, y0, y1, seg=teeth*2, mi=mi); t = (2*math.pi*r/teeth)*0.45
    for k in range(teeth):
        a = 2*math.pi*k/teeth; d = Vector((math.cos(a), 0, math.sin(a)))
        q = d.to_track_quat('Z', 'Y').to_matrix(); v = bmesh.ops.create_cube(bm, size=1.0)['verts']
        for vv in v: vv.co = c + d*(r + 0.002) + Y*((y0 + y1)/2) + q @ Vector((vv.co.x*t, vv.co.y*(y1 - y0), vv.co.z*0.004))
        for f in {f for vv in v for f in vv.link_faces}: f.material_index = mi

def vpulley(bm, c, r, y0, y1, mi=0):
    m = (y0 + y1)/2
    tube(bm, c + Y*y0, c + Y*m, r, r*0.55, seg=40, mi=mi); tube(bm, c + Y*m, c + Y*y1, r*0.55, r, seg=40, mi=mi)
    disc(bm, c, r*0.3, y0 - 0.006, y1 + 0.006, seg=16, mi=mi)

def stadium(c1, c2, r, n=20):
    pts = []
    for k in range(n + 1):
        a = -math.pi/2 + math.pi*k/n; pts.append((c2[0] + r*math.cos(a), c2[1] + r*math.sin(a)))
    for k in range(n + 1):
        a = math.pi/2 + math.pi*k/n; pts.append((c1[0] + r*math.cos(a), c1[1] + r*math.sin(a)))
    return pts

# ---------------------------------------------------------------- motor
cd = Vector((math.cos(math.radians(12)), 0, math.sin(math.radians(12))))   # eje del cilindro, hacia delante
# cárter: cuerpo redondo alrededor del cigüeñal, brazo hasta el eje trasero (lado derecho) y orejeta de anclaje
bm = bmesh.new()
disc(bm, CRANK, 0.078, -0.062, 0.052, seg=40)
for y in (-0.062, 0.052): tube(bm, CRANK + Y*(y - 0.002), CRANK + Y*(y + 0.002), 0.081, seg=40)   # junta de las dos mitades
rings = []
for i in range(9):
    t = i/8; c = CRANK.lerp(REAR_AXLE, t); hh = 0.06 - 0.025*t
    rings.append(superellipse(c.x, -0.074, c.z, 0.013, hh, n=16, e=0.4, axis='X'))
loft(bm, rings)
path_tube(bm, [CRANK + cd*0.05 + Vector((0, 0, 0.05)), P3(372, 345)], 0.022, seg=20)            # orejeta al bastidor
disc(bm, P3(372, 345), 0.016, -0.04, 0.04, seg=20, mi=1)                                         # bulón del pivote
for k in range(10):
    a = 2*math.pi*k/10; bolt(bm, CRANK + Vector((0.07*math.cos(a), -0.064, 0.07*math.sin(a))), (0, -1, 0), r=0.0035, mi=1)
put("carter", bm, "motor", [CA, AC], subsurf=0); set_origin("carter", CRANK)

# cilindro con aletas cuadradas
bm = bmesh.new(); c0 = CRANK + cd*0.045
tube(bm, c0, c0 + cd*0.075, 0.026, seg=24)
for k in range(8):
    p = c0 + cd*(0.012 + 0.0085*k); q = cd.to_track_quat('Z', 'Y').to_matrix()
    v = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for vv in v: vv.co = p + q @ Vector((vv.co.x*0.098, vv.co.y*0.092, vv.co.z*0.0028))
tube(bm, CRANK + cd*0.075 + Vector((0, 0, -0.026)), CRANK + cd*0.075 + Vector((0, -0.01, -0.05)), 0.011, seg=16)   # lumbrera de escape
put("cilindro", bm, "motor", [AL]); set_origin("cilindro", CRANK)

# culata: tapa con aletas radiales y bujía inclinada
bm = bmesh.new(); h0 = c0 + cd*0.075
tube(bm, h0, h0 + cd*0.03, 0.044, 0.036, seg=32)
qh = cd.to_track_quat('Z', 'Y').to_matrix()
for k in range(5):
    v = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for vv in v: vv.co = h0 + cd*0.016 + qh @ Vector((vv.co.x*0.1, (-0.02 + 0.01*k) + vv.co.y*0.0028, vv.co.z*0.03))
for k in range(4): bolt(bm, h0 + cd*0.031 + qh @ Vector((0.03*math.cos(math.pi/4 + k*math.pi/2), 0.03*math.sin(math.pi/4 + k*math.pi/2), 0)), cd, r=0.004)
put("culata", bm, "motor", [AL]); set_origin("culata", CRANK)
bd = (cd + Vector((0, 0, 0.5))).normalized(); b0 = h0 + cd*0.03
bm = bmesh.new()
tube(bm, b0, b0 + bd*0.012, 0.007, seg=6, mi=1); tube(bm, b0 + bd*0.012, b0 + bd*0.035, 0.005, 0.004, seg=16, mi=0)
for k in range(4): tube(bm, b0 + bd*(0.016 + 0.004*k), b0 + bd*(0.0175 + 0.004*k), 0.0062, seg=16, mi=0)
tube(bm, b0 + bd*0.035, b0 + bd*0.042, 0.003, seg=8, mi=1)
put("bujia", bm, "motor", [PO, AC]); set_origin("bujia", b0)

# pistón, biela y cigüeñal (interiores; se ven con los cortes)
bm = bmesh.new(); pc = CRANK + cd*0.085
tube(bm, pc - cd*0.022, pc + cd*0.02, 0.0192, seg=28)
for k in range(2): tube(bm, pc + cd*(0.008 + 0.006*k), pc + cd*(0.0095 + 0.006*k), 0.0196, seg=28)
tube(bm, pc + Vector((0, -0.017, 0)), pc + Vector((0, 0.017, 0)), 0.005, seg=12)
put("piston", bm, "motor", [AL]); set_origin("piston", pc)
bm = bmesh.new(); pin = CRANK + Vector((0.014, 0, -0.012))
tube(bm, pin, pc, 0.006, 0.0045, seg=12)
disc(bm, pin, 0.011, -0.006, 0.006, seg=20); disc(bm, pc, 0.008, -0.006, 0.006, seg=16)
put("biela", bm, "motor", [AC]); set_origin("biela", pin)
bm = bmesh.new()
for y in (-0.02, 0.012): disc(bm, CRANK, 0.034, y, y + 0.008, seg=36)
disc(bm, CRANK, 0.009, -0.08, 0.09, seg=16); disc(bm, pin, 0.006, -0.012, 0.012, seg=12)
put("ciguenal", bm, "motor", [AC]); set_origin("ciguenal", CRANK)

# volante magnético y su tapa (lado izquierdo, +Y)
bm = bmesh.new(); disc(bm, CRANK, 0.06, 0.056, 0.084, seg=40)
for k in range(16):
    a = 2*math.pi*k/16; d = Vector((math.cos(a), 0, math.sin(a)))
    box(bm, CRANK + d*0.045 + Y*0.086, (0.03, 0.005, 0.004) if abs(d.x) > 0.7 else (0.004, 0.005, 0.03))
put("volante", bm, "motor", [AC]); set_origin("volante", CRANK)
bm = bmesh.new()
path_tube(bm, [CRANK + Y*0.05, CRANK + Y*0.07, CRANK + Y*0.092, CRANK + Y*0.104, CRANK + Y*0.108], [0.074, 0.074, 0.07, 0.058, 0.035], seg=48)
for k in range(12):
    a = 2*math.pi*k/12; d = Vector((math.cos(a), 0, math.sin(a)))
    path_tube(bm, [CRANK + d*0.04 + Y*0.106, CRANK + d*0.066 + Y*0.098], 0.003, seg=6)          # nervios
disc(bm, CRANK, 0.022, 0.106, 0.112, seg=32, mi=1)
put("tapa-volante", bm, "motor", [CA, CR]); set_origin("tapa-volante", CRANK)

# carburador y filtro de aire (lado izquierdo, sobre el cigüeñal)
cc = P3(357, 342, 0.06); bm = bmesh.new()
tube(bm, cc + Vector((0.03, -0.035, -0.01)), cc + Vector((0, 0, 0)), 0.012, seg=16)                  # tubo de admisión
tube(bm, cc + Vector((0, -0.012, 0)), cc + Vector((0, 0.022, 0)), 0.016, seg=20)                      # cuerpo
tube(bm, cc + Vector((0, 0, -0.012)), cc + Vector((0, 0, -0.036)), 0.018, seg=24)                     # cuba
tube(bm, cc + Vector((0, 0, 0.012)), cc + Vector((0, 0, 0.03)), 0.008, seg=12)                        # tapa del pistón
put("carburador", bm, "motor", [AL]); set_origin("carburador", cc)
fc_ = cc + Vector((-0.05, 0.004, 0)); bm = bmesh.new()
tube(bm, cc + Vector((0, 0.012, 0)), fc_, 0.012, seg=16)
tube(bm, fc_ + Vector((0, -0.032, 0)), fc_ + Vector((0, 0.032, 0)), 0.03, seg=28)
for k in range(6): tube(bm, fc_ + Vector((0, -0.026 + 0.0104*k, 0)), fc_ + Vector((0, -0.024 + 0.0104*k, 0)), 0.032, seg=28)
put("filtro", bm, "motor", [AC]); set_origin("filtro", fc_)

# depósito bajo el sillín (dentro de la trasera)
bm = bmesh.new(); rings = []
for i, x in enumerate([-0.405, -0.4, -0.32, -0.245, -0.24]):
    s = 0.85 if i in (0, 4) else 1.0
    rings.append(superellipse(x, 0, 0.6, 0.07*s, 0.065*s, n=20, e=0.3, axis='X'))
loft(bm, rings)
tube(bm, Vector((-0.3, 0, 0.66)), Vector((-0.3, 0, 0.685)), 0.018, seg=24, mi=1)
tube(bm, Vector((-0.3, 0, 0.685)), Vector((-0.3, 0, 0.69)), 0.022, seg=24, mi=1)
put("deposito", bm, "motor", [AL, CR], subsurf=1); set_origin("deposito", Vector((-0.324, 0, 0.6)))

# ---------------------------------------------------------------- transmisión (lado derecho)
bm = bmesh.new(); vpulley(bm, CRANK, 0.042, -0.08, -0.062)
put("motriz", bm, "transmision", [AL]); set_origin("motriz", CRANK)
bm = bmesh.new()   # muelle del variador
path_tube(bm, [CRANK + Vector((0.016*math.cos(a), -0.04 - 0.02*a/(2*math.pi*5), 0.016*math.sin(a))) for a in [i*0.25 for i in range(int(2*math.pi*5/0.25))]], 0.0022, seg=6)
put("muelle", bm, "transmision", [AC]); set_origin("muelle", CRANK)
bm = bmesh.new(); vpulley(bm, DRIVEN, 0.066, -0.084, -0.062)
put("conducida", bm, "transmision", [AL]); set_origin("conducida", DRIVEN)
bm = bmesh.new(); tube(bm, DRIVEN + Y*-0.086, DRIVEN + Y*-0.1, 0.062, 0.058, seg=40)
for k in range(12):
    a = 2*math.pi*k/12; box(bm, DRIVEN + Vector((0.06*math.cos(a), -0.093, 0.06*math.sin(a))), (0.006, 0.012, 0.006))
put("embrague", bm, "transmision", [AC]); set_origin("embrague", DRIVEN)
bm = bmesh.new(); gear(bm, DRIVEN, 0.011, 10, -0.056, -0.046); gear(bm, REAR_AXLE, 0.023, 22, -0.056, -0.046)
put("engranajes", bm, "transmision", [AC]); set_origin("engranajes", DRIVEN)
# correa: envolvente de las dos poleas, sección trapecial
def hull(pts):
    pts = sorted(set(pts)); lo = []; hi = []
    cr = lambda o, a, b: (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cr(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    return lo[:-1] + hi[:-1]
cir = [(round(c.x + r*math.cos(2*math.pi*k/64), 5), round(c.z + r*math.sin(2*math.pi*k/64), 5)) for c, r in ((CRANK, 0.034), (DRIVEN, 0.058)) for k in range(64)]
h = hull(cir); path = [Vector((x, 0, z)) for x, z in h] + [Vector((h[0][0], 0, h[0][1]))]
bm = bmesh.new(); R = sweep(bm, path, [(0.004, 0.008)]*len(path), n=8)
for ring in R:
    for v in ring: v.co.y -= 0.071
put("correa", bm, "transmision", [GO]); set_origin("correa", CRANK)

# tapa de la transmisión: caja alargada con dos abombados con rejilla, rótulo y tornillos
c1, c2, r = (186, 408), (364, 408), 37
def ring_at(y, inset):
    return [P3(px, py, y) for px, py in stadium(c1, c2, r - inset, 20)]
bm = bmesh.new(); loft(bm, [ring_at(-0.066, 0), ring_at(-0.094, 0), ring_at(-0.101, 3), ring_at(-0.104, 9)])
put("cubierta-correa", bm, "transmision", [CA, CR, GO], subsurf=1); apply_mods("cubierta-correa")
bm = bmesh.new()
for px in (205, 342):
    c = P3(px, 405)
    path_tube(bm, [c + Y*-0.1, c + Y*-0.108, c + Y*-0.114, c + Y*-0.117], [0.074, 0.072, 0.064, 0.05], seg=40)
    disc(bm, c, 0.024, -0.1185, -0.117, seg=28, mi=2)
    for dz in (-0.016, -0.008, 0, 0.008, 0.016):
        w = 2*math.sqrt(0.024**2 - dz**2); box(bm, c + Vector((0, -0.119, dz)), (w, 0.002, 0.003), mi=1)
for px, py in ((300, 410), (250, 380), (162, 408), (392, 402), (275, 438)):
    bolt(bm, P3(px, py, -0.1045), (0, -1, 0), r=0.004, mi=1)
merge_into("cubierta-correa", bm)
add_text("cubierta-correa", "Vespino", P3(272, 398, -0.1052), (math.pi/2, 0, 0), 0.03, r"C:\Windows\Fonts\segoesc.ttf", mi=1)
set_origin("cubierta-correa", REAR_AXLE)

# ---------------------------------------------------------------- otros
# escape: codo desde la lumbrera, bajo el motor, silenciador largo con protector calado
port = CRANK + cd*0.075 + Vector((0, -0.01, -0.05))
bm = bmesh.new(); yy = -0.078
pts = catmull([port, P3(410, 438, -0.04), P3(400, 455, yy), P3(378, 461, yy)], 6)
path_tube(bm, pts, 0.011, seg=16)
s0, s1 = P3(380, 462, yy), P3(122, 462, yy)
tube(bm, s0, s0 + Vector((-0.02, 0, 0)), 0.011, 0.026, seg=28)
tube(bm, s0 + Vector((-0.02, 0, 0)), s1 + Vector((0.02, 0, 0)), 0.026, seg=28)
tube(bm, s1 + Vector((0.02, 0, 0)), s1, 0.026, 0.012, seg=28); tube(bm, s1, s1 + Vector((-0.02, 0, 0)), 0.008, seg=12)
sh0, sh1 = P3(370, 452, yy - 0.006), P3(150, 452, yy - 0.006)
rings = []
for i in range(12):
    p = sh0.lerp(sh1, i/11)
    rings.append([p + Vector((0, -0.03*math.cos(a), 0.03*math.sin(a))) for a in [math.radians(-20 + 140*k/10) for k in range(11)]])
loft(bm, rings, closed=False, caps=False, mi=1)
for k in range(9): box(bm, sh0.lerp(sh1, 0.08 + 0.1*k) + Vector((0, -0.031, 0.012)), (0.012, 0.002, 0.004), mi=2)
put("escape", bm, "otros", [CR, CR, GO]); set_origin("escape", port)

# pedales: eje, bielas opuestas y pedal de goma con catadióptrico
PA = P3(372, 410); arm = (P3(350, 478) - PA)
bm = bmesh.new(); disc(bm, PA, 0.009, -0.125, 0.125, seg=16)
for s in (-1, 1):
    a = arm if s < 0 else -arm; b = PA + Y*(0.12*s)
    path_tube(bm, [b, b + a], [0.009, 0.007], seg=12); e = b + a
    tube(bm, e, e + Y*(0.1*s), 0.005, seg=10)
    box(bm, e + Y*(0.055*s), (0.03, 0.09, 0.018), mi=1)
    for k in range(4): box(bm, e + Y*(0.02*s + 0.022*k*s) + Vector((0, 0, 0.01)), (0.032, 0.006, 0.004), mi=1)
    box(bm, e + Y*(0.055*s) + Vector((0.016, 0, 0)), (0.003, 0.03, 0.01), mi=2)
put("pedales", bm, "otros", [CR, GO, MAT("piloto")]); set_origin("pedales", PA)

# caballete central plegado: horquilla de tubo con travesaño, patines y muelle
pv = P3(360, 446); ft = P3(258, 458)
bm = bmesh.new(); disc(bm, pv, 0.009, -0.085, 0.085, seg=16)
for s in (-1, 1):
    path_tube(bm, catmull([pv + Y*0.075*s, pv.lerp(ft, 0.5) + Y*0.08*s + Vector((0, 0, -0.012)), ft + Y*0.085*s], 5), 0.009, seg=12)
    box(bm, ft + Y*0.085*s + Vector((0, 0, -0.008)), (0.04, 0.03, 0.006))
path_tube(bm, [pv.lerp(ft, 0.7) + Y*-0.08, pv.lerp(ft, 0.7) + Y*0.08], 0.007, seg=10)
path_tube(bm, [pv.lerp(ft, 0.3) + Y*0.03 + Vector((0.01*math.cos(a), 0.0, 0.01*math.sin(a))) + Vector((-0.002*a, 0, 0)) for a in [i*0.4 for i in range(40)]], 0.0018, seg=6)
put("caballete", bm, "otros", [AC]); set_origin("caballete", pv)

# amortiguador trasero: ojo inferior en el brazo del cárter, cuerpo pintado arriba
lo_, hi_ = P3(240, 352, -0.09), P3(268, 252, -0.09); d = (hi_ - lo_).normalized()
bm = bmesh.new()
disc(bm, lo_, 0.012, -0.01, 0.01, seg=16, mi=1); disc(bm, hi_, 0.012, -0.01, 0.01, seg=16, mi=1)
tube(bm, lo_ + d*0.01, lo_ + d*0.07, 0.009, seg=16, mi=2)
tube(bm, lo_ + d*0.07, hi_ - d*0.012, 0.022, 0.02, seg=24, mi=0)
for k in range(3): tube(bm, lo_ + d*(0.075 + 0.006*k), lo_ + d*(0.078 + 0.006*k), 0.0235, seg=24, mi=1)
put("amortiguador", bm, "otros", [PI, AL, CR]); set_origin("amortiguador", hi_)

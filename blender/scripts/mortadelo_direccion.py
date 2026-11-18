# Mortadelo: horquilla, faro, manillar, velocímetro, claxon y espejo. Requiere helpers.py + vespino.py.
from mathutils import Vector
PI, AL, CR, GO, AC, CRI, ES, RO = (MAT(n) for n in ("pintura","aluminio","cromo","goma","acero","cristal","esfera","piloto"))
PIV = AX(125)                      # pivote de giro de toda la dirección
A = FRONT_AXLE
# ---- horquilla: tija superior (py 140), columna blanca hasta la abrazadera (py 230), barras grises hasta el eje
bm = bmesh.new()
for y in (-0.058, 0.058):
    o = Vector((0, y, 0)); d = (A - AX(300)).normalized()
    # funda blanca: en el perfil la columna mide ~35 px (0,076 m), se estrecha hacia abajo
    tube(bm, AX(142)+o, AX(300)+o, 0.036, 0.03, seg=28, mi=0)
    tube(bm, AX(296)+o, AX(301)+o, 0.0315, seg=28, mi=2)         # aro cromado
    tube(bm, AX(301)+o, A+o-d*0.004, 0.0145, seg=24, mi=1)       # barra
    bolt(bm, A+Vector((0, y*1.15, 0)), (0, 1 if y > 0 else -1, 0), r=0.006, mi=2)
for py in (140, 230):
    c = AX(py); box(bm, c, (0.07, 0.165, 0.02), mi=0)
    for y in (-0.058, 0.058): bolt(bm, c+Vector((0, y, 0.011)), (0, 0, 1), r=0.0045, mi=2)
tube(bm, AX(118), AX(142), 0.016, seg=16, mi=0)                  # vástago hasta el faro
put("horquilla", bm, "direccion", [PI, AL, CR]); set_origin("horquilla", PIV)
# ---- faro: carcasa, aro, reflector y cristal con estrías
fc = P3(598, 92); fw = Vector((1, 0, -0.08)).normalized()
bm = bmesh.new()
path_tube(bm, [fc-fw*0.085+Vector((0,0,-0.02)), fc-fw*0.06+Vector((0,0,-0.01)), fc-fw*0.03, fc-fw*0.006], [0.024,0.044,0.06,0.066], seg=40, mi=0)
tube(bm, fc-fw*0.006, fc+fw*0.012, 0.067, 0.064, seg=48, mi=1)
tube(bm, fc-fw*0.03, fc+fw*0.004, 0.02, 0.056, seg=40, mi=1, caps=False)
tube(bm, fc+fw*0.004, fc+fw*0.013, 0.057, 0.054, seg=40, mi=2)
for k in range(1, 5): tube(bm, fc+fw*0.0132, fc+fw*0.0136, 0.0115*k, seg=40, mi=2, caps=False)
bolt(bm, fc+fw*0.004+Vector((0,0,-0.064)), (0,0,-1), r=0.003, mi=1)
put("faro", bm, "direccion", [PI, CR, CRI]); set_origin("faro", PIV)
# ---- manillar fundido: cuerpo bajo el faro, brazos, puños estriados, manetas y cables de freno
top = AX(112); bm = bmesh.new()
sphere(bm, fc-fw*0.075+Vector((-0.01,0,-0.012)), 0.036, 1.25, 1.15, 0.9, mi=0)
for s in (-1, 1):
    p0 = fc-fw*0.06+Vector((0,0.035*s,-0.01)); p1 = top+Vector((-0.04,0.15*s,0.01)); p2 = top+Vector((-0.075,0.2*s,0.008))
    path_tube(bm, catmull([p0,p1,p2], 6), [0.022]+[0.022-0.007*i/12 for i in range(1,13)], seg=20, mi=0)
    g0 = top+Vector((-0.085,0.205*s,0.008)); g1 = top+Vector((-0.12,0.302*s,-0.006))   # ancho total 0,61 (ficha)
    tube(bm, p2, g0, 0.0125, seg=16, mi=1)
    path_tube(bm, [g0.lerp(g1, i/30) for i in range(31)], [0.0165+0.0018*(1 if i % 3 == 0 else 0) for i in range(31)], seg=16, mi=2)
    path_tube(bm, catmull([top+Vector((-0.055,0.19*s,0.02)), top+Vector((-0.025,0.235*s,0.008)), top+Vector((-0.04,0.282*s,-0.004))], 5), 0.0045, seg=8, mi=1)
    path_tube(bm, catmull([top+Vector((-0.055,0.19*s,0.018)), top+Vector((-0.02,0.12*s,-0.04)), AX(200)+Vector((-0.035,0.05*s,0)), AX(300)+Vector((-0.04,0.06*s,0))], 6), 0.0028, seg=8, mi=3)
put("manillar", bm, "direccion", [PI, AL, GO, AC]); set_origin("manillar", PIV)
# ---- velocímetro Veglia sobre la carcasa: aro, esfera, marcas y aguja
vc = fc-fw*0.06+Vector((-0.005,0,0.04)); up = Vector((-0.45,0,1)).normalized(); q = up.to_track_quat('Z','Y').to_matrix()
bm = bmesh.new(); tube(bm, vc-up*0.012, vc+up*0.003, 0.03, seg=36, mi=0); tube(bm, vc+up*0.003, vc+up*0.0045, 0.025, seg=36, mi=1)
for k in range(13):
    a = math.radians(-120+20*k); box(bm, vc+up*0.005+q@Vector((math.cos(a), math.sin(a), 0))*0.02, (0.002,0.002,0.001), mi=2)
nd = q@Vector((math.cos(math.radians(40)), math.sin(math.radians(40)), 0)); path_tube(bm, [vc+up*0.0055, vc+up*0.0055+nd*0.018], 0.0009, seg=6, mi=3)
put("velocimetro", bm, "direccion", [CR, ES, AC, RO]); set_origin("velocimetro", PIV)
# ---- claxon cromado con lamas, delante de la tija superior
hc = AX(160)+Vector((0.034,0,0)); hf = Vector((1,0,0.2)).normalized(); qh = hf.to_track_quat('Z','Y').to_matrix()
bm = bmesh.new(); tube(bm, hc-hf*0.014, hc, 0.032, 0.033, seg=36); sphere(bm, hc, 0.031)
for k in range(9):
    d = qh@Vector((math.cos(2*math.pi*k/9), math.sin(2*math.pi*k/9), 0))
    path_tube(bm, [hc+hf*0.031*math.cos(t)+d*0.031*math.sin(t) for t in [i*0.12 for i in range(1,11)]], 0.0025, seg=6)
put("claxon", bm, "direccion", [CR]); set_origin("claxon", PIV)
# ---- espejo redondo en el lado derecho (no sale en las fotos de catálogo; la maqueta lo pide)
# alto oficial 1,04 m: el espejo queda por debajo del faro (centro a +0,035 sobre el puño)
ms = top+Vector((-0.065,-0.22,0.012)); me_ = ms+Vector((0.012,-0.03,0.04))
bm = bmesh.new(); path_tube(bm, catmull([ms, ms+Vector((0.004,-0.025,0.025)), me_], 5), 0.0045, seg=8)
tube(bm, me_+Vector((0.008,0,0)), me_+Vector((-0.01,0,0)), 0.038, seg=32)
put("espejos", bm, "direccion", [CR]); set_origin("espejos", PIV)

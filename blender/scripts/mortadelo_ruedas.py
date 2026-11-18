# Mortadelo: ruedas 2 1/4" x 18". Requiere helpers.py + vespino.py.
from mathutils import Vector
GO, CR, AL, AC = (MAT(n) for n in ("goma", "cromo", "aluminio", "acero"))
RT = 0.2855          # radio exterior del neumático (ficha: 18" + 2 x 2 1/4")
TR = 0.0286          # medio ancho del neumático
RIM_R = 0.2286       # 18" de llanta

def ring_pts(R, y, z, n=72):
    return [Vector((R*math.cos(2*math.pi*i/n), y, R*math.sin(2*math.pi*i/n))) for i in range(n)]

def tyre():
    bm = bmesh.new(); n = 72; rs = 16; rings = []
    for i in range(n):
        a = 2*math.pi*i/n; ring = []
        for j in range(rs):
            b = 2*math.pi*j/rs; d = (RT - TR) + TR*math.cos(b)
            ring.append(Vector((d*math.cos(a), TR*math.sin(b)*1.05, d*math.sin(a))))
        rings.append(ring)
    loft(bm, rings + [rings[0]], caps=False)
    # dibujo: dos filas de tacos alternados en la banda de rodadura
    for i in range(56):
        a = 2*math.pi*i/56
        for row, off in ((-1, 0), (1, math.pi/56)):
            aa = a + off; d = Vector((math.cos(aa), 0, math.sin(aa)))
            # dibujo de carretera: tacos bajos (2 mm) y estrechos, no de campo
            c = d*(RT - 0.0012) + Vector((0, row*0.009, 0))
            q = d.to_track_quat('Z', 'Y').to_matrix(); v = bmesh.ops.create_cube(bm, size=1.0)['verts']
            for vv in v: vv.co = c + q @ Vector((vv.co.x*0.011, vv.co.y*0.012, vv.co.z*0.0026))
    return bm

def rim_and_spokes():
    bm = bmesh.new(); n = 72
    prof = [(-0.017, 0.006), (-0.016, -0.004), (-0.008, -0.010), (0.008, -0.010), (0.016, -0.004), (0.017, 0.006)]  # (y, radial)
    rings = [[bm.verts.new(((RIM_R + r)*math.cos(2*math.pi*i/n), y, (RIM_R + r)*math.sin(2*math.pi*i/n))) for (y, r) in prof] for i in range(n)]
    for A, B in zip(rings, rings[1:] + rings[:1]):
        for k in range(len(prof) - 1): bm.faces.new((A[k], A[k+1], B[k+1], B[k]))
    hub_r, fl = 0.045, 0.032
    for i in range(36):
        side = 1 if i % 2 else -1; a_h = 2*math.pi*i/36
        a_r = a_h + side*math.radians(30)*(1 if (i//2) % 2 else -1)
        ph = Vector((hub_r*math.cos(a_h), side*fl, hub_r*math.sin(a_h)))
        pr = Vector(((RIM_R - 0.011)*math.cos(a_r), side*0.004, (RIM_R - 0.011)*math.sin(a_r)))
        tube(bm, ph, pr, 0.0011, seg=5, caps=False)
        tube(bm, pr, pr + (pr - ph).normalized()*0.008, 0.0022, seg=6)          # niple
    return bm

def hub(front):
    bm = bmesh.new()
    tube(bm, Vector((0, -0.05, 0)), Vector((0, 0.005, 0)), 0.062 if not front else 0.055, seg=40, mi=0)   # tambor
    tube(bm, Vector((0, 0.005, 0)), Vector((0, 0.04, 0)), 0.048, seg=32, mi=0)                        # cubo
    for y in (-0.032, 0.032): tube(bm, Vector((0, y - 0.002, 0)), Vector((0, y + 0.002, 0)), 0.052, seg=36, mi=0)  # pestañas de radios
    tube(bm, Vector((0, -0.054, 0)), Vector((0, -0.05, 0)), 0.064 if not front else 0.057, seg=40, mi=1)  # plato de freno
    path_tube(bm, [Vector((0.0, -0.058, 0.0)), Vector((0.03, -0.058, -0.03)), Vector((0.065, -0.058, -0.045))], 0.004, seg=8, mi=1)  # brazo
    tube(bm, Vector((0, -0.08, 0)), Vector((0, 0.08, 0)), 0.008, seg=12, mi=1)                        # eje
    for y in (-0.08, 0.08): tube(bm, Vector((0, y, 0)), Vector((0, y + (0.008 if y > 0 else -0.008), 0)), 0.011, seg=6, mi=1)  # tuercas
    return bm

for tag, x in (("t", -0.565), ("d", 0.565)):
    loc = Vector((x, 0, RT))
    o = put(f"rueda-{tag}-neumatico", tyre(), "ruedas", [GO]); o.location = loc
    o = put(f"rueda-{tag}-llanta", rim_and_spokes(), "ruedas", [CR]); o.location = loc
    o = put(f"rueda-{tag}-tambor", hub(tag == "d"), "ruedas", [AL, AC]); o.location = loc

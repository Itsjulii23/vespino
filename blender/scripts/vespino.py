# Ayudas del proyecto Vespino. Cargar después de las genéricas:
#   exec(open(r"C:\Users\julyc\.claude\skills\blender-modelo-desde-fotos\scripts\helpers.py", encoding="utf-8").read())
#   exec(open(r"C:\Users\julyc\Desktop\Vespino\blender\scripts\vespino.py", encoding="utf-8").read())
import re
ROOT = r"C:\Users\julyc\Desktop\Vespino"
REF = ROOT + r"\referencias\mortadelo\\"
GROUPS = ["carroceria", "direccion", "ruedas", "motor", "transmision", "otros"]

# perfil.jpg: 0,002173 m/px; eje trasero px (189,405), suelo y=541; eje trasero en X=-0,565 (Blender)
S = 0.002173
CAL_PERFIL = Calib(REF + "perfil.jpg", 'XZ', S, (189, 541), (-0.565, 0.0))
def P(px, py): return CAL_PERFIL.uv(px, py)                 # (x, z)
def P3(px, py, y=0.0): return CAL_PERFIL.world(px, py, y)
# eje de dirección: centro de la columna blanca de la horquilla, px (589,160), pendiente 0,455 (24,5° de la vertical),
# leído sobre recorte ampliado con rejilla. Tija superior en py 140, abrazadera inferior en py 230.
def AX(py): return P3(589 + (py - 160) * 0.455, py)
FRONT_AXLE = P3(709, 409)

def mask_perfil():
    a = load_pixels(CAL_PERFIL.path); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return ~((r > 0.8) & (g > 0.6) & (g < 0.92) & (b < 0.3))   # todo lo que no es el fondo amarillo

def part_ids():
    txt = open(ROOT + r"\vespino-sim\parts.js", encoding="utf-8").read()
    ids = set(re.findall(r"^\s*'?([a-z][a-z0-9-]*)'?: \{\s*$", txt, re.M)) - {"rel"}
    for w in ("t", "d"):
        ids |= {f"rueda-{w}-neumatico", f"rueda-{w}-llanta", f"rueda-{w}-tambor"}
    return sorted(ids)

def bike_names():
    return [o.name for c in GROUPS for o in bpy.data.collections[c].objects]

def check_parts():
    have, want = set(bike_names()), set(part_ids())
    return sorted(want - have) + ["+" + n for n in sorted(have - want)]

def iou(names=None):
    return silhouette_iou(CAL_PERFIL, names or bike_names(), mask_perfil())

def iou_body(names=None):
    """IoU sin el interior de las ruedas (r < 100 px): en la foto el borde de cada radio no es amarillo puro
    y la máscara lo cuenta como moto, así que el IoU total nunca pasa de ~0,8 aunque la forma sea buena."""
    import numpy as np
    m = render_mask(CAL_PERFIL, names or bike_names()); ph = mask_perfil()
    yy, xx = np.mgrid[0:ph.shape[0], 0:ph.shape[1]]; keep = np.ones_like(ph)
    for cx, cy in ((189, 405), (709, 409)): keep &= ((xx - cx)**2 + (yy - cy)**2) > 100**2
    return float((m & ph & keep).sum() / ((m | ph) & keep).sum())

def build_all():
    """Reconstruye la moto entera desde los scripts del modelo."""
    for f in ("mortadelo_chasis.py", "mortadelo_carroceria.py", "mortadelo_direccion.py", "mortadelo_ruedas.py", "mortadelo_motor.py"):
        exec(open(ROOT + r"\blender\scripts\\" + f, encoding="utf-8").read(), globals())

def prec(names):
    return silhouette_precision(CAL_PERFIL, names, mask_perfil())

def cmp(names=None, out=ROOT + r"\blender\cmp_perfil.png"):
    return compare(CAL_PERFIL, names or bike_names(), out)

def dims():
    lo, hi = world_bbox(bike_names())
    return {'length': hi.x - lo.x, 'width': hi.y - lo.y, 'height': hi.z - lo.z}

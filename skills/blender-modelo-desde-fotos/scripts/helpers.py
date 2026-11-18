# Ayudas genéricas para modelar en Blender un objeto real a partir de fotos calibradas.
# Se cargan dentro de Blender con:
#   exec(open(r"<ruta>/helpers.py", encoding="utf-8").read())
# o guardando este texto en un bloque de texto del .blend y haciendo exec(bpy.data.texts[...].as_string()).
import bpy, bmesh, math, os, tempfile
import numpy as np
from mathutils import Vector, Matrix

# ------------------------------------------------------------------ fotos y calibración
def load_pixels(path):
    """Imagen como array float (alto, ancho, 4) con la fila 0 arriba."""
    img = bpy.data.images.load(path, check_existing=True)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    return a

class Calib:
    """Calibración de una foto casi ortogonal.
    plane: 'XZ' (perfil, se mira desde -Y), 'YZ' (frente, se mira desde +X), 'XY' (planta, desde +Z).
    s: metros por píxel. ref_px: un píxel conocido. ref_w: sus coordenadas (u, v) en el plano, en metros.
    u crece a la derecha de la foto y v hacia arriba."""
    def __init__(self, path, plane, s, ref_px, ref_w, flip_u=False):
        self.path, self.plane, self.s = path, plane, s
        self.ref_px, self.ref_w, self.flip_u = ref_px, ref_w, flip_u
        img = bpy.data.images.load(path, check_existing=True)
        self.w, self.h = img.size
    def uv(self, px, py):
        du = (px - self.ref_px[0]) * self.s * (-1 if self.flip_u else 1)
        return (self.ref_w[0] + du, self.ref_w[1] + (self.ref_px[1] - py) * self.s)
    def world(self, px, py, depth=0.0):
        u, v = self.uv(px, py)
        return Vector({'XZ': (u, depth, v), 'YZ': (depth, u, v), 'XY': (u, v, depth)}[self.plane])
    def extent(self):
        """(u_min, u_max, v_min, v_max) de toda la foto en metros."""
        u0, v1 = self.uv(0, 0); u1, v0 = self.uv(self.w, self.h)
        return (min(u0, u1), max(u0, u1), v0, v1)

def ref_plane(name, cal, depth, coll="referencias"):
    """Plano con la foto (material de emisión) colocado según la calibración. Sale en look y en renders."""
    u0, u1, v0, v1 = cal.extent()
    corners = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    if cal.flip_u: uvs = [(1, 0), (0, 0), (0, 1), (1, 1)]
    me = bpy.data.meshes.get(name) or bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = []
    for (u, v) in corners:
        vs.append(bm.verts.new({'XZ': (u, depth, v), 'YZ': (depth, u, v), 'XY': (u, v, depth)}[cal.plane]))
    f = bm.faces.new(vs); lay = bm.loops.layers.uv.new()
    for l, t in zip(f.loops, uvs): l[lay].uv = t
    bm.to_mesh(me); bm.free()
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); e = nt.nodes.new("ShaderNodeEmission"); t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(cal.path, check_existing=True)
    nt.links.new(t.outputs[0], e.inputs[0]); nt.links.new(e.outputs[0], o.inputs[0])
    me.materials.clear(); me.materials.append(m)
    ob = bpy.data.objects.get(name) or bpy.data.objects.new(name, me)
    c = bpy.data.collections.get(coll) or bpy.data.collections.new(coll)
    if c.name not in bpy.context.scene.collection.children_recursive and c is not bpy.context.scene.collection:
        try: bpy.context.scene.collection.children.link(c)
        except RuntimeError: pass
    if ob.name not in c.objects: c.objects.link(ob)
    ob.hide_select = True
    return ob

# ------------------------------------------------------------------ geometría
def MAT(n): return bpy.data.materials[n]

def put(name, bm, coll, mats, smooth=True, subsurf=0, bevel=0.0, seg=3, angle=35):
    """Escribe el bmesh en el objeto `name` (lo crea si no existe) y deja solo los modificadores pedidos."""
    if not isinstance(mats, (list, tuple)): mats = [mats]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.get(name) or bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    me.materials.clear()
    for m in mats: me.materials.append(m)
    ob = bpy.data.objects.get(name)
    if not ob:
        ob = bpy.data.objects.new(name, me); bpy.data.collections[coll].objects.link(ob)
    ob.data = me; ob.location = (0, 0, 0)
    for m in list(ob.modifiers): ob.modifiers.remove(m)
    if bevel > 0:
        b = ob.modifiers.new("Bevel", "BEVEL"); b.width = bevel; b.segments = seg
        b.limit_method = 'ANGLE'; b.angle_limit = math.radians(angle)
    if subsurf > 0:
        s = ob.modifiers.new("Subdivision", "SUBSURF"); s.levels = subsurf; s.render_levels = subsurf
    return ob

def set_origin(name, world_pt):
    """Mueve el origen al punto de montaje o de giro sin mover la geometría."""
    ob = bpy.data.objects[name]; o = Vector(world_pt) - ob.location
    ob.data.transform(Matrix.Translation(-o)); ob.location = ob.location + o

def _frame(d):
    return d.normalized().to_track_quat('Z', 'Y').to_matrix()

def tube(bm, p0, p1, r0, r1=None, seg=20, caps=True, mi=0):
    r1 = r0 if r1 is None else r1
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; q = _frame(d)
    a = [bm.verts.new(p0 + q @ Vector((r0*math.cos(2*math.pi*i/seg), r0*math.sin(2*math.pi*i/seg), 0))) for i in range(seg)]
    b = [bm.verts.new(p1 + q @ Vector((r1*math.cos(2*math.pi*i/seg), r1*math.sin(2*math.pi*i/seg), 0))) for i in range(seg)]
    fs = [bm.faces.new((a[i], a[(i+1) % seg], b[(i+1) % seg], b[i])) for i in range(seg)]
    if caps: fs += [bm.faces.new(list(reversed(a))), bm.faces.new(b)]
    for f in fs: f.material_index = mi
    return fs

def path_tube(bm, pts, r, seg=16, mi=0, caps=True):
    """Tubo a lo largo de una polilínea; r puede ser número o lista (un radio por punto)."""
    pts = [Vector(p) for p in pts]; rs = r if isinstance(r, (list, tuple)) else [r]*len(pts); rings = []
    for i, p in enumerate(pts):
        q = _frame(pts[min(i+1, len(pts)-1)] - pts[max(i-1, 0)])
        rings.append([bm.verts.new(p + q @ Vector((rs[i]*math.cos(2*math.pi*k/seg), rs[i]*math.sin(2*math.pi*k/seg), 0))) for k in range(seg)])
    for A, B in zip(rings, rings[1:]):
        for k in range(seg): bm.faces.new((A[k], A[(k+1) % seg], B[(k+1) % seg], B[k])).material_index = mi
    if caps:
        bm.faces.new(list(reversed(rings[0]))).material_index = mi; bm.faces.new(rings[-1]).material_index = mi

def sphere(bm, c, r, sx=1, sy=1, sz=1, mi=0, u=24, v=12):
    vs = bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)['verts']
    for vv in vs: vv.co = Vector((vv.co.x*sx, vv.co.y*sy, vv.co.z*sz)) + Vector(c)
    for f in {f for vv in vs for f in vv.link_faces}: f.material_index = mi

def box(bm, c, size, mi=0):
    vs = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for vv in vs: vv.co = Vector((vv.co.x*size[0], vv.co.y*size[1], vv.co.z*size[2])) + Vector(c)
    for f in {f for vv in vs for f in vv.link_faces}: f.material_index = mi

def loft(bm, rings, closed=True, caps=True, mi=0):
    """Une secciones (listas de puntos con el mismo número de vértices) en una malla. Base para chapa con subdivisión."""
    R = [[bm.verts.new(Vector(p)) for p in ring] for ring in rings]; n = len(R[0])
    for A, B in zip(R, R[1:]):
        for k in range(n if closed else n-1):
            bm.faces.new((A[k], A[(k+1) % n], B[(k+1) % n], B[k])).material_index = mi
    if caps and closed:
        bm.faces.new(list(reversed(R[0]))).material_index = mi; bm.faces.new(R[-1]).material_index = mi
    return R

def superellipse(cx, cy, cz, hw, hh, n=16, e=0.35, axis='X'):
    """Sección redondeada-cuadrada (e<1 más cuadrada). axis: eje normal a la sección."""
    pts = []
    for k in range(n):
        a = 2*math.pi*k/n; c, s = math.cos(a), math.sin(a)
        p = hw*math.copysign(abs(c)**e, c); q = hh*math.copysign(abs(s)**e, s)
        pts.append({'X': (cx, cy+p, cz+q), 'Y': (cx+p, cy, cz+q), 'Z': (cx+p, cy+q, cz)}[axis])
    return pts

def catmull(pts, n):
    """Curva Catmull-Rom que pasa por los puntos (Vectors o tuplas), n muestras por tramo."""
    pts = [Vector(p) for p in pts]; out = []; Q = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i-1], Q[i], Q[i+1], Q[i+2]
        for k in range(n):
            t = k / n; t2 = t*t; t3 = t2*t
            out.append(0.5*((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3))
    out.append(pts[-1]); return out

def sweep(bm, path, sizes, n=16, e=0.45, up=Vector((0, 1, 0)), mi=0):
    """Barre una sección redondeada (superelipse) a lo largo de `path`.
    sizes[i] = (medio grosor en el plano de la curva, media anchura a lo largo de `up`)."""
    rings = []
    for i, c in enumerate(path):
        t = (path[min(i+1, len(path)-1)] - path[max(i-1, 0)]).normalized()
        nrm = t.cross(up).normalized(); h, w = sizes[i][0], sizes[i][1]; ring = []
        for k in range(n):
            a = 2*math.pi*k/n; ca, sa = math.cos(a), math.sin(a)
            ring.append(c + up*(w*math.copysign(abs(ca)**e, ca)) + nrm*(h*math.copysign(abs(sa)**e, sa)))
        rings.append(ring)
    return loft(bm, rings, mi=mi)

def apply_mods(name):
    """Aplica los modificadores (subdivisión, bisel) a la malla. Hacerlo antes de añadir detalles finos
    (rótulos, tornillos) que la subdivisión deformaría."""
    ob = bpy.data.objects[name]; dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); old = ob.data; ob.data = me
    for m in list(ob.modifiers): ob.modifiers.remove(m)
    bpy.data.meshes.remove(old); me.name = name

def merge_into(name, bm_extra):
    """Añade la geometría de un bmesh (en coordenadas de mundo) al objeto `name`. Consume bm_extra."""
    ob = bpy.data.objects[name]; me = bpy.data.meshes.new("_tmp"); bm_extra.to_mesh(me); bm_extra.free()
    me.transform(ob.matrix_world.inverted())
    b = bmesh.new(); b.from_mesh(ob.data); b.from_mesh(me); b.to_mesh(ob.data); b.free(); bpy.data.meshes.remove(me)

def add_text(name, text, loc, rot, size, font=None, mi=1, extrude=0.0012):
    """Rótulo en relieve (emblema) convertido a malla y unido al objeto `name` con el material `mi`."""
    cu = bpy.data.curves.new("_txt", "FONT"); cu.body = text; cu.size = size; cu.extrude = extrude
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.resolution_u = 2   # las letras de caligrafía disparan los triángulos
    if font:
        try: cu.font = bpy.data.fonts.load(font, check_existing=True)
        except Exception as e: print("fuente no disponible:", e)
    t = bpy.data.objects.new("_txt", cu); bpy.context.scene.collection.objects.link(t)
    t.location = loc; t.rotation_euler = rot
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(t.evaluated_get(dg))
    me.transform(t.matrix_world); bpy.data.objects.remove(t); bpy.data.curves.remove(cu)
    b = bmesh.new(); b.from_mesh(me); bpy.data.meshes.remove(me)
    for f in b.faces: f.material_index = mi
    merge_into(name, b)

def bolt(bm, c, axis, r=0.004, mi=0):
    """Tornillo de cabeza hexagonal con arandela, saliendo de la superficie en la dirección `axis`."""
    c = Vector(c); a = Vector(axis).normalized()
    tube(bm, c, c + a*0.0012, r*1.6, seg=16, mi=mi)
    tube(bm, c + a*0.0012, c + a*(0.0012 + r*0.8), r, seg=6, mi=mi)

def extrude_outline(bm, cal, pts_px, d0, d1, mi=0):
    """Contorno calcado de una foto (píxeles) extruido en profundidad de d0 a d1. Solo para encaje inicial."""
    f = bm.faces.new([bm.verts.new(cal.world(px, py, d0)) for px, py in pts_px]); f.material_index = mi
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    n = {'XZ': Vector((0, 1, 0)), 'YZ': Vector((1, 0, 0)), 'XY': Vector((0, 0, 1))}[cal.plane]
    bmesh.ops.translate(bm, verts=[e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)], vec=n*(d1-d0))

# ------------------------------------------------------------------ comprobaciones
def _objs(names):
    return [bpy.data.objects[n] for n in names]

def world_bbox(names):
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,)*3); hi = Vector((-1e9,)*3)
    for o in _objs(names):
        e = o.evaluated_get(dg)
        for c in e.bound_box:
            w = e.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi

def tri_count(names):
    dg = bpy.context.evaluated_depsgraph_get(); t = 0
    for o in _objs(names):
        e = o.evaluated_get(dg); me = e.to_mesh(); t += sum(len(p.vertices)-2 for p in me.polygons); e.to_mesh_clear()
    return t

def mesh_health(names):
    """{'nombre': {'sueltos': n, 'sin_material': bool}} solo de los objetos con problemas."""
    out = {}
    for o in _objs(names):
        bm = bmesh.new(); bm.from_mesh(o.data)
        loose = sum(1 for v in bm.verts if not v.link_edges); bm.free()
        nomat = len(o.data.materials) == 0 or any(m is None for m in o.data.materials)
        if loose or nomat: out[o.name] = {'sueltos': loose, 'sin_material': nomat}
    return out

def render_mask(cal, names, path=None):
    """Render ortográfico de los objetos `names` encuadrado exactamente como la foto calibrada.
    Devuelve una máscara booleana (alto, ancho) con la fila 0 arriba."""
    sc = bpy.context.scene; r = sc.render
    keep = dict(engine=r.engine, rx=r.resolution_x, ry=r.resolution_y, pct=r.resolution_percentage,
                film=r.film_transparent, cam=sc.camera, fp=r.filepath, fmt=r.image_settings.file_format,
                mode=r.image_settings.color_mode)
    hidden = {}
    for o in sc.objects:
        hidden[o.name] = o.hide_render; o.hide_render = o.name not in names
    u0, u1, v0, v1 = cal.extent(); cu, cv = (u0+u1)/2, (v0+v1)/2
    cd = bpy.data.cameras.new("_mask_cam"); cd.type = 'ORTHO'; cd.ortho_scale = max(u1-u0, v1-v0)
    cd.sensor_fit = 'HORIZONTAL' if (u1-u0) >= (v1-v0) else 'VERTICAL'; cd.clip_end = 100
    cam = bpy.data.objects.new("_mask_cam", cd); sc.collection.objects.link(cam)
    if cal.plane == 'XZ': cam.location = (cu, -20, cv); cam.rotation_euler = (math.pi/2, 0, 0)
    elif cal.plane == 'YZ': cam.location = (20, cu, cv); cam.rotation_euler = (math.pi/2, 0, math.pi/2)
    else: cam.location = (cu, cv, 20); cam.rotation_euler = (0, 0, 0)
    if cal.flip_u and cal.plane == 'YZ': cam.location.x = -20; cam.rotation_euler = (math.pi/2, 0, -math.pi/2)
    sc.camera = cam
    try: r.engine = 'BLENDER_WORKBENCH'
    except TypeError: pass
    r.resolution_x, r.resolution_y, r.resolution_percentage = cal.w, cal.h, 100
    r.film_transparent = True; r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    out = path or os.path.join(tempfile.gettempdir(), "_mask.png"); r.filepath = out
    try:
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(out, check_existing=False); img.reload()
        a = np.array(img.pixels[:], dtype=np.float32).reshape(cal.h, cal.w, 4)[::-1]
        bpy.data.images.remove(img)
    finally:
        for n, h in hidden.items():
            if n in sc.objects: sc.objects[n].hide_render = h
        sc.camera = keep['cam']; bpy.data.objects.remove(cam); bpy.data.cameras.remove(cd)
        r.engine = keep['engine']; r.resolution_x, r.resolution_y, r.resolution_percentage = keep['rx'], keep['ry'], keep['pct']
        r.film_transparent = keep['film']; r.filepath = keep['fp']
        r.image_settings.file_format = keep['fmt']; r.image_settings.color_mode = keep['mode']
    return a[..., 3] > 0.5

def silhouette_iou(cal, names, photo_mask):
    """Intersección sobre unión entre la silueta del modelo y una máscara de la foto (bool alto x ancho)."""
    m = render_mask(cal, names)
    inter = np.logical_and(m, photo_mask).sum(); union = np.logical_or(m, photo_mask).sum()
    return float(inter) / float(max(union, 1))

def silhouette_precision(cal, names, photo_mask):
    """Fracción de la silueta del modelo que cae dentro del objeto en la foto (1 = nada sobresale).
    Sirve para piezas sueltas o grupos, donde el IoU contra la foto entera no dice nada."""
    m = render_mask(cal, names)
    return float(np.logical_and(m, photo_mask).sum()) / float(max(m.sum(), 1))

def compare(cal, names, out_path, alpha=0.5):
    """Guarda la foto con la silueta del modelo superpuesta en rojo, para revisar a ojo con Read."""
    m = render_mask(cal, names); a = load_pixels(cal.path).copy()
    a[m, 0] = a[m, 0]*(1-alpha) + alpha; a[m, 1] *= (1-alpha); a[m, 2] *= (1-alpha)
    img = bpy.data.images.new("_compare", cal.w, cal.h, alpha=True)
    img.pixels[:] = a[::-1].ravel(); img.filepath_raw = out_path; img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(img)
    return out_path

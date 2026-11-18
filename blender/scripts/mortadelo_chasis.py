# Mortadelo: bastidor en U. Requiere helpers.py + vespino.py cargados.
from mathutils import Vector
PI = MAT("pintura")
# línea central (px de perfil.jpg) y (medio grosor en el plano, media anchura) en cada punto
# (brazo delantero ajustado por barrido: +10 px y grosor 0,03 dan la mejor precisión de silueta, 0,90)
ctrl = [(602,172),(587,200),(576,225),(565,250),(553,275),(540,300),(517,322),(490,333),(470,338),(415,338),(382,332),(360,316),(345,290),(336,258),(333,230)]
size = [(0.03,0.040),(0.03,0.042),(0.03,0.044),(0.03,0.047),(0.03,0.051),(0.03,0.055),(0.029,0.06),(0.028,0.062),(0.028,0.062),(0.028,0.062),(0.034,0.062),(0.04,0.063),(0.036,0.064),(0.03,0.066),(0.03,0.066)]
path = catmull([Vector((P(*c)[0], 0, P(*c)[1])) for c in ctrl], 5)
sz = catmull([Vector((a, b, 0)) for a, b in size], 5)
bm = bmesh.new(); sweep(bm, path, [(s.x, s.y) for s in sz])
tube(bm, AX(150), AX(236), 0.03, seg=28)          # tubo de dirección (queda dentro de la columna de la horquilla)
put("chasis", bm, "carroceria", [PI], subsurf=1); set_origin("chasis", AX(180))

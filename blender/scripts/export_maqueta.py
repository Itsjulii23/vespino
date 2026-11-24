# Exporta el Mortadelo para la web. Requiere helpers.py + vespino.py cargados.
#   export_maqueta()  -> Vespino-web/vespino-sim/mortadelo.glb (solo GLB_IDS, eje trasero en el origen)
#   export_completo() -> models/mortadelo.glb (las 43 piezas, mismo origen)
import re

def glb_ids():
    txt = open(WEB + r"\vespino-sim\glb-ids.js", encoding="utf-8").read()
    return re.findall(r"'([a-z0-9-]+)'", txt.split("[", 1)[1])

def _export(names, path, dx=0.565):
    """Mueve las piezas para que el eje trasero quede en X=0, exporta con Y arriba y deshace el movimiento."""
    obs = [bpy.data.objects[n] for n in names]
    for o in bpy.context.scene.objects: o.select_set(False)
    hidden = [o for o in obs if o.hide_get() or o.hide_viewport]
    for o in hidden: o.hide_set(False); o.hide_viewport = False
    for o in obs: o.location.x += dx; o.select_set(True)
    try:
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_cameras=False, export_lights=False,
                                  export_texcoords=False, export_extras=False)
    finally:
        for o in obs: o.location.x -= dx; o.select_set(False)
    import os; return os.path.getsize(path)

def export_maqueta():
    return _export(glb_ids(), WEB + r"\vespino-sim\mortadelo.glb")

def export_completo():
    return _export(bike_names(), ROOT + r"\models\mortadelo.glb")

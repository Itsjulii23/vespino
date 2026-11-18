---
name: vespino-blender
description: Modelar un Vespino (hoy el Mortadelo de 1968; en el futuro más modelos) en Blender con medidas oficiales y llevarlo a la maqueta teardown `vespino-3d.html`. Usar al crear, detallar o exportar cualquier pieza 3D de un Vespino, o al integrar el modelo en `vespino-sim`.
---

# Vespino en Blender y en la maqueta

**Carga primero la skill genérica `blender-modelo-desde-fotos`**: ahí está el método (calibrar, secciones con subdivisión, lista de detalles, comprobaciones, exportación). Esta skill añade solo lo del Vespino.

- Datos de cada modelo: `modelos/<modelo>.md` (hoy `mortadelo`). Para un modelo nuevo, crear su archivo antes de modelar (medidas con fuente, rasgos, colores, referencias, calibraciones, pendientes); no reutilizar medidas de otro.
- Fotos: `referencias/<modelo>/`. Solo las que hay; no se piden fotos nuevas. No se suben al repositorio (es público).
- Blender: `blender/<modelo>.blend`. Ayudas del proyecto: `blender/scripts/vespino.py`.

## Arranque en cada llamada a Blender
```python
exec(open(r"C:\Users\julyc\.claude\skills\blender-modelo-desde-fotos\scripts\helpers.py", encoding="utf-8").read())
exec(open(r"C:\Users\julyc\Desktop\Vespino\blender\scripts\vespino.py", encoding="utf-8").read())
```
Da `CAL_PERFIL`, `P(px,py)`, `P3(px,py,y)`, `AX(py)` (eje de dirección), `FRONT_AXLE`, `part_ids()`, `bike_names()`, `check_parts()`, `iou(nombres)`, `iou_body()`, `prec(nombres)`, `cmp(nombres)` (escribe `blender/cmp_perfil.png`), `dims()` y `build_all()`.

## La moto es código
Cada pieza se genera desde un script en `blender/scripts/` (`mortadelo_chasis.py`, `_carroceria`, `_direccion`, `_ruedas`, `_motor`). **Se cambia el script y se vuelve a ejecutar**, nunca se retoca la malla a mano en Blender: así `build_all()` reconstruye la moto entera igual y el cambio queda en git. Para un modelo nuevo, copiar estos scripts con el prefijo del modelo.

## Reglas del proyecto
- Blender: metros, X adelante, Y a la izquierda del piloto, Z arriba; ruedas en Z=0; centro entre ejes en X=0. Las fotos de perfil del catálogo muestran el lado derecho (-Y): ahí van tapa de correa, escape y amortiguador.
- Colecciones = `GROUPS` de `parts.js`: carroceria, direccion, ruedas, motor, transmision, otros.
- **Nombre de objeto = id de `vespino-sim/parts.js`** (43; ruedas `rueda-t-*` y `rueda-d-*`). `check_parts()` debe devolver `[]`.
- Origen en el punto de giro: ruedas en su eje, dirección en `AX(125)`, motor en el cigüeñal.
- Materiales (nombres fijos, los reconoce `bike.js`): `pintura`, `pintura_interior`, `cromo`, `aluminio`, `carter`, `acero`, `goma`, `asiento`, `cristal`, `piloto`, `esfera`, `porcelana`.

## Umbrales de aceptación (Mortadelo)
- `prec(grupo)` ≥ 0,9 en carrocería, ruedas, motor, transmisión y otros; dirección ≥ 0,85 (manillar y espejo salen de perfil fuera de la foto). Una pieza suelta por debajo de 0,85 se revisa con `cmp()`.
- `iou_body()` ≥ 0,83 y `iou()` ≥ 0,78. El IoU total no sirve como objetivo alto: el borde de los radios cuenta como moto en la máscara de la foto y lo limita a ~0,8 (el 0,88 inicial era imposible). Partida: 0,763; detalle (nov. 2026): 0,784 / 0,846.
- `dims()`: largo 1,76 ± 0,03, alto 1,04 ± 0,02, ancho 0,61 ± 0,01 (espejo incluido).
- Para colocar una pieza dudosa: barrido de 2 parámetros (posición, grosor) midiendo `prec` + `iou` y quedarse con el mejor; anotar el resultado en el script.
- `tri_count(bike_names())` < 150.000.
- Revisar `cmp()` con Read: nada naranja grande (sobra modelo) ni zonas blancas sin teñir (falta modelo).

## Integración en la maqueta teardown (`vespino-sim`)
- Coordenadas de la maqueta: metros, x adelante, y arriba, z a la izquierda del piloto, **eje trasero en el origen**. Al exportar: X += 0,565 en una escena temporal, `export_yup=True`.
- Archivo: `vespino-sim/mortadelo.glb`, importado desde `vespino-sim/mortadelo.js` (`import glb from './mortadelo.glb'` llega como base64), decodificado con `GLTFLoader.parse` en `loadMortadelo()`; `main.js` hace `loadMortadelo().then(runLive)`.
- Piezas que vienen del GLB (`GLB_IDS`): chasis, trasera, cubierta, guardabarros-t, guardabarros-d, portabultos, sillin, piloto, deposito, horquilla, claxon, manillar, espejos, faro, velocimetro, carter, tapa-volante, filtro, carburador, cubierta-correa, escape, amortiguador, caballete, cilindro, culata, bujia.
- Siguen en código porque se animan con la cinemática de `kin.js`: ruedas, pistón, biela, cigüeñal, volante, motriz, conducida, muelle, correa, embrague, engranajes, pedales.
- Cotas del Mortadelo en la maqueta: `AXLE.rear [0, 0.2855]`, `AXLE.front [1.13, 0.2855]`, `CRANK [0.343, 0.287]`, `DRIVEN [0.035, 0.29]`.
- Materiales del GLB → los de `bike.js` (para que funcionen el color y los cortes): pintura→GREEN, pintura_interior→GREEN2, cromo→CHROME, aluminio→ALU, carter→CASE, acero→STEEL, goma→RUBBER, asiento→DARK.
- Compilar: `node "C:/Users/julyc/.claude/skills/teardown/sims/build.mjs" ./vespino-sim` → `teardown-out/dist/vespino-sim.html` → copiar a `vespino-3d.html`. Probar con Playwright (en `~/.claude/skills/teardown/node_modules`) abriendo por `file://` con la red bloqueada.

## Avisos
- Lo estimado sobre foto se dice como estimado.
- Si algo de esta skill deja de ser cierto al trabajar, actualizarla en el momento.

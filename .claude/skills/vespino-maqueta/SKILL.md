---
name: vespino-maqueta
description: Mantener la maqueta teardown `vespino-3d.html` y su código `vespino-sim`: cómo carga el GLB del Mortadelo, qué piezas siguen en código, cotas, materiales, compilar y probar. Usar al tocar la maqueta o la web del Vespino, o al meter un modelo nuevo exportado desde el repositorio del modelado 3D (carpeta `Vespino`, skill `vespino-blender`).
---

# Maqueta del Vespino (web)

Esta carpeta es la web. El modelo se hace en la carpeta hermana `Vespino` (rama `main`, skill `vespino-blender`): allí se exporta `mortadelo.glb` directamente a `vespino-sim/` de esta carpeta.

## Integración y compilación
- Coordenadas de la maqueta: metros, x adelante, y arriba, z a la izquierda del piloto, **eje trasero en el origen**. Al exportar: X += 0,565 en una escena temporal, `export_yup=True`.
- Exportar: lo hace el repositorio del modelado (`export_maqueta()` en `Vespino/blender/scripts/export_maqueta.py`), que escribe `vespino-sim/mortadelo.glb` aquí (solo `GLB_IDS`).
- Carga: `vespino-sim/mortadelo.js` (`import glb from './mortadelo.glb'` llega como base64), `GLTFLoader.parse` en `loadMortadelo()`; `main.js` hace `loadMortadelo().then(runLive)`. `bike.js` coloca cada pieza con `glb(id, grupo)`.
- `GLB_IDS` vive en `vespino-sim/glb-ids.js` (27): chasis, trasera, cubierta, guardabarros-t, guardabarros-d, portabultos, sillin, piloto, deposito, horquilla, claxon, manillar, espejos, faro, velocimetro, carter, tapa-volante, filtro, carburador, cubierta-correa, escape, amortiguador, caballete, cilindro, culata, bujia, pedales.
- Siguen en código porque se animan con la cinemática de `kin.js`: ruedas (escaladas a 0,2855 m), pistón, biela, cigüeñal, volante, motriz, conducida, muelle, correa, embrague, engranajes; y la aguja y la esfera impresa del velocímetro (la aguja fija del GLB, material `piloto`, se oculta).
- Cotas del Mortadelo en la maqueta: `AXLE.rear [0, 0.2855]`, `AXLE.front [1.13, 0.2855]`, `CRANK [0.343, 0.287]`, `DRIVEN [0.035, 0.29]`, cilindro inclinado 12° (`CYL_TILT`: el grupo `eng` gira y las fundiciones del GLB van en un grupo con la transformación inversa). Engranajes dibujados con módulo 1 mm y el intermedio fuera de la línea, porque la polea conducida está a 35 mm del cubo. Si cambian, actualizar también las cámaras `VIEW_FN` de `live.js` y los `anchors` de `bike.js`.
- Lados: Blender -Y (derecha del piloto, lo que se ve en las fotos) acaba en +z de la maqueta, el mismo lado que la correa del código.
- Materiales del GLB → los de `bike.js`: pintura→GREEN, pintura_interior→GREEN2, cromo→CHROME, aluminio→ALU (CAST en carter/cilindro/culata, para que se vuelvan cristal), carter→CASE, acero→STEEL, goma→RUBBER, asiento→SEAT. En las piezas de chapa y fundición (`SHELL_PARTS`) el cromo y la goma usan copias que están en `SHELLS`, para que tornillos, rejillas y rótulos se vuelvan cristal con su pieza y no floten.
- Compilar: `node "<ruta-de-teardown>/sims/build.mjs" ./vespino-sim` → `teardown-out/dist/vespino-sim.html` → copiar a `vespino-3d.html`.
- Pruebas: `node --test vespino-sim/tests/glb.test.mjs` (GLB: piezas, tamaño, coordenadas, materiales) y `node --test vespino-sim/tests/page.test.mjs` (Playwright por `file://` con la red cortada: sin errores, 43 piezas con malla, color, corte, cotas; `PAGE=vespino-3d.html` para probar la copia publicada). Las capturas con Playwright y SwiftShader tardan: ventana 1280x720 y `timeout` de captura de 150 s.


## Avisos
- Si algo de esta skill deja de ser cierto al trabajar, actualizarla en el momento.

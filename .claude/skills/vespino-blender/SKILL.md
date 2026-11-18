---
name: vespino-blender
description: Modelar en Blender (vía MCP) un modelo de Vespino (hoy el Mortadelo de primera serie; en el futuro más) con medidas oficiales, piezas nombradas como el catálogo de la maqueta y exportación a GLB. Usar al crear, ajustar o exportar cualquier pieza 3D de un Vespino.
---

# Vespino en Blender (varios modelos)

Esta skill tiene dos capas:
- **Este archivo:** reglas comunes a todos los modelos.
- **`modelos/<modelo>.md`:** medidas oficiales, rasgos, colores y referencias de cada modelo. Modelos disponibles: `mortadelo` (primera serie, 1968-69).

## Antes de modelar
1. Identificar el modelo y leer su `modelos/<modelo>.md`. Si no existe, crearlo con la plantilla de abajo antes de modelar; no reutilizar medidas de otro modelo.
2. `get_addon_status` y `get_scene_info` (Blender conectado).
3. Mirar las referencias de `referencias/<modelo>/` con Read y comparar siempre con la foto; no inventar formas.
4. Leer `docs/PIEZAS.md` y `vespino-sim/parts.js` (catálogo de piezas y sus ids). Si un modelo tiene piezas distintas (por ejemplo otro motor), anotarlo en su archivo.

## Plantilla para un modelo nuevo (`modelos/<modelo>.md`)
Medidas oficiales con fuente, cotas estimadas, rasgos que lo distinguen de los demás, colores originales, lista de referencias (y cuáles NO son de ese modelo), pendientes. Buscar las medidas en documentos oficiales o fichas técnicas; si solo hay fuentes de aficionados, decirlo.

## Reglas de escena (comunes)
- Unidades en metros, escala 1.0. Las dos ruedas apoyadas en Z=0.
- Convención de la maqueta: x hacia delante, y arriba, z hacia la izquierda del piloto. En Blender (Z arriba) la moto mira a +X; el exportador glTF pasa a Y arriba.
- Un `.blend` por modelo en `blender/<modelo>.blend`, guardado con frecuencia.
- Colecciones por sistema, igual que `GROUPS` en `parts.js`: carroceria, direccion, ruedas, motor, transmision, otros.
- **Nombre de cada objeto = id de la pieza en `parts.js`** (ruedas: `rueda-t-neumatico`, `rueda-t-llanta`, `rueda-t-tambor`, y lo mismo con `rueda-d-`). Simétricas: sufijos `.L` / `.R`. Si un modelo tiene una pieza propia, usar un id nuevo con prefijo del modelo.
- En Blender, Y positivo es la izquierda del piloto. Las fotos de perfil del catálogo muestran el lado derecho (-Y): ahí van la tapa de la correa, el escape y el amortiguador visibles.
- Origen de cada objeto en su punto de montaje o de giro (eje de rueda, pivote del manillar).
- Materiales Principled; buscar el nodo por tipo, no por nombre. Colores según el archivo del modelo.

## Piezas compartidas entre modelos
Antes de modelar una pieza, comprobar si ya existe en otro modelo y es igual (ruedas, faro, cuentakilómetros). Si lo es, reutilizar el objeto enlazado o copiado; si difiere (llantas de aleación, asiento de banco), modelarla aparte y anotarlo en el archivo del modelo.

## Calcar la foto de perfil (lo que mejor ha funcionado)
1. Medir la foto con Python dentro de Blender (`bpy.data.images.load` + numpy): punto más bajo de cada neumático = centro de rueda en X; borde exterior = radio. Escala = distancia entre ejes oficial / distancia entre ejes en píxeles. Comprobar que longitud, altura y diámetro de rueda salen a un 1-2 % de la ficha; si no, la foto tiene perspectiva y no sirve para calcar.
2. Para leer contornos, superponer una rejilla de píxeles a la foto (PowerShell + System.Drawing en este equipo; aquí no hay Python fuera de Blender) y leer los puntos.
3. Guardar en el `.blend` un texto `vespino_helpers` con la conversión píxel→metros y las funciones de geometría, y cargarlo con `exec(bpy.data.texts["vespino_helpers"].as_string())` en cada llamada.
4. Para comparar, poner la foto como **plano con material de emisión** detrás de la moto (colección `referencias`). Los empties de imagen no salen en `look`, y el visor no siempre acepta cambios de vista por código.
5. La chapa se hace extruyendo en Y el contorno calcado y redondeando con Bevel (0,03-0,045 m en las piezas grandes). Los guardabarros se barren como perfil en U a lo largo de un arco centrado en el eje de la rueda.

## Orden de trabajo
1. Escena base: unidades, colecciones, foto de perfil a escala, y estudio (fondo oscuro, luz principal, relleno y contraluz, suelo y cámara). Sin luces, `look` en modo render sale negro.
2. Volumen general sin detalle, con las proporciones correctas.
3. Separar en piezas con los nombres del catálogo.
4. Detalle pieza a pieza, mirando con `look` desde varios ángulos y comparando con la foto.

## Técnica
- Chapa (bastidor, guardabarros, cubierta): malla de baja densidad + Subdivision Surface; bordes con Bevel o creases.
- Piezas mecánicas (cilindro, llantas, radios, cárter): geometría paramétrica con bmesh o primitivas.
- Radios: 36 por rueda, como en la maqueta; instancias o curvas, no objetos sueltos.
- Verificar cada pieza con `look` (angles) y `get_scene_info` (topology): sin caras sueltas ni normales invertidas.

## Exportar
- GLB, Y arriba, modificadores y transformaciones aplicados, un material por color. Un GLB por modelo: `models/<modelo>.glb`.
- Presupuesto orientativo: moto completa por debajo de ~150.000 triángulos.
- **Destino web (a futuro):** servir el GLB como archivo aparte y cargarlo al pulsar un botón (carga diferida), con el visor 3D en un script propio. Es mejor que incrustarlo en base64 en la página: el HTML pesa poco, el navegador cachea el modelo y se pueden tener varios modelos sin cargarlos todos. El HTML único con el modelo incrustado solo se usa si se pide un archivo autocontenido para llevarlo en un pendrive o enviarlo.

## Avisos
- Estas reglas se afinan al modelar; si algo falla o se descubre un dato mejor, actualizar este archivo o el del modelo.
- No presentar como oficial una medida estimada sobre foto.
- Las fotos de referencia son solo guía; no incrustarlas en el HTML publicado.

---
name: blender-modelo-desde-fotos
description: Modelar en Blender (vía MCP) un objeto real con detalle a partir de fotos de referencia y medidas oficiales — vehículos, máquinas, muebles, aparatos — con calibración de fotos, comparación automática de silueta, piezas con nombre y exportación a GLB para la web (three.js / teardown). Usar cuando haya que reproducir un objeto real en 3D con fidelidad, no para modelos inventados.
---

# Modelo fiel desde fotos en Blender

Método genérico. Si el proyecto tiene una skill propia del objeto (medidas, ids de piezas, integración), cárgala también: esta dice **cómo** modelar; la del proyecto dice **qué**.

Funciones listas en `scripts/helpers.py` (de esta skill). Cárgalas al principio de cada llamada:

```python
exec(open(r"<ruta de esta skill>/scripts/helpers.py", encoding="utf-8").read())
```

## 1. Datos antes que formas
- Ficha con medidas oficiales y su fuente. Distinguir siempre **oficial** de **estimado sobre foto**; lo estimado se dice al usuario.
- Lista de piezas con ids estables (los del catálogo o de la app que usará el modelo). El nombre de cada objeto es su id.
- Convención de ejes del destino (three.js: Y arriba). En Blender se trabaja con Z arriba; el exportador glTF convierte.

## 2. Clasificar las fotos
- **Calcables**: casi ortogonales (perfil, frente, planta), objeto entero, sin gran angular. Sirven para medir.
- **De detalle**: primeros planos; dan forma, no medidas.
- **De otra versión**: marcarlas; solo valen para lo que comparten.
- Descartar duplicados y fotos que no aporten.

## 3. Calibrar
1. Cargar la foto con `load_pixels` y medir con numpy puntos inequívocos (contacto de ruedas con el suelo, bordes extremos).
2. Escala = medida oficial / distancia en píxeles. **Comprobar con 2-3 medidas oficiales más**: si alguna se desvía más de un 3 %, la foto tiene perspectiva y no se calca.
3. Crear `Calib(path, plane, s, ref_px, ref_w)` y colocar la foto con `ref_plane` detrás del modelo (los empties de imagen no salen en `look`).
4. Para leer contornos a ojo, superponer una rejilla de píxeles a la foto y abrirla con Read.

## 4. Encaje (blockout)
- **El modelo es código**: cada grupo de piezas se genera con un script en disco (`<objeto>_<grupo>.py`) que se ejecuta con `exec`; para cambiar una pieza se cambia el script y se vuelve a ejecutar, nunca se retoca la malla a mano. Así se puede reconstruir todo (`build_all()`), repetir las mediciones y versionarlo en git.
- Una pieza por id desde el principio, en colecciones por sistema y con el origen en su punto de giro o montaje (`set_origin`).
- Encaje rápido: `extrude_outline` del contorno calcado. Solo sirve para fijar proporciones.
- Comprobar con `silhouette_iou` y `compare` (ver 7) antes de pasar al detalle.

## 5. Modelado por secciones (el detalle)
- Chapa, carcasas, asientos: **secciones** (`superellipse`, perfiles a mano) tomadas del perfil para la altura, del frente para la anchura y de la planta para el contorno, unidas con `loft` y suavizadas con Subdivision Surface (`put(..., subsurf=2)`). Así las superficies curvan en las tres direcciones; una extrusión deja los laterales planos.
- Bordes vivos: loops de apoyo cerca del borde o Bevel con límite por ángulo.
- Piezas mecánicas: geometría paramétrica (`tube`, `path_tube`, `box`, `sphere`) con las cotas de la ficha.
- Repeticiones (radios, aletas, tornillos, dibujo de neumático): en un solo objeto por pieza, generadas en bucle; nunca cientos de objetos sueltos.

## 6. Lista de detalles que hacen que parezca real
Revisar en cada pieza visible:
- Tornillería en las uniones (cabeza hexagonal + arandela).
- Cables y latiguillos con su recorrido (`path_tube`, radio 2-3 mm).
- Emblemas y rótulos en relieve o como textura.
- Rejillas, lamas, aletas de refrigeración.
- Juntas y separaciones entre paneles (ranura de 1-2 mm).
- Neumáticos con dibujo; llantas con perfil, no con un tubo.
- Cristales con aro y reflector detrás.
- Biselado pequeño en toda arista: nada perfectamente afilado.

## 7. Comprobaciones automáticas (obligatorias)
Después de cada pieza o grupo:
- `silhouette_iou(cal, nombres, mascara_foto)`: coincidencia de silueta con la foto calibrada. La máscara de la foto se saca por color de fondo. Fijar un umbral por grupo y no darlo por bueno si baja.
- Para una pieza o grupo suelto usar `silhouette_precision` (qué parte del modelo cae sobre el objeto de la foto), no el IoU contra la foto entera, que sale casi cero. Objetivo: ≥ 0,9.
- Zonas que la máscara no puede separar del fondo (entre radios, rejillas, mallas finas: el borde antialiasado no es fondo puro) limitan el IoU total por mucho que mejore la forma. Medir también el IoU **excluyendo esas zonas** y fijar ahí el umbral alto; si un umbral no sube con ningún cambio, comprobar antes si es alcanzable.
- Mapa de fallos: pintar en una imagen lo que falta (rojo) y lo que sobra (azul) y agrupar por celdas de 40 px: dice qué pieza tocar primero.
- Para colocar una pieza dudosa (grosor, desplazamiento) hacer un barrido de 2 parámetros midiendo precisión e IoU y quedarse con el mejor, anotando el valor en el script.
- Medir a ojo sobre un recorte ampliado con rejilla en px (PowerShell + System.Drawing si no hay Python fuera de Blender) cuando la máscara automática mezcla piezas del mismo color.
- `compare(cal, nombres, ruta)`: foto con la silueta del modelo en rojo; abrir con Read. Lo naranja (rojo sobre fondo) es modelo que sobra; lo que queda sin teñir dentro del objeto es lo que falta.
- `world_bbox` contra las medidas oficiales; `tri_count` contra el presupuesto; `mesh_health` sin vértices sueltos ni piezas sin material.
- `look` desde varios ángulos frente a las fotos de detalle. Sin luces en la escena, el modo render sale negro: montar estudio (fondo, luz principal, relleno, contraluz, suelo, cámara).

## 8. Materiales
- Pocos materiales con nombres fijos y genéricos (`pintura`, `cromo`, `aluminio`, `goma`, `plastico_negro`, `cristal`...). La app de destino los reconoce por nombre y los cambia por los suyos.
- Principled BSDF; buscar el nodo por tipo, nunca por nombre (los nombres están traducidos).
- Pintura con capa de barniz (Coat), cromo metálico de rugosidad baja, goma rugosa y oscura.

## 9. Exportar para la web
- GLB, `export_yup=True`, `export_apply=True`, sin cámaras ni luces, solo los objetos del modelo.
- Un nodo por pieza con el nombre del id; origen en el punto de giro.
- Trasladar al origen que espera la app (por ejemplo, el eje trasero) en una escena temporal, no en la de trabajo.
- Presupuesto orientativo: < 150.000 triángulos y < 4 MB para una página que se abre en cualquier ordenador. Lo que más dispara los triángulos: rótulos con letra de caligrafía (`resolution_u` baja) y Subdivision nivel 2 en piezas grandes; nivel 1 suele bastar.
- En la app, cambiar los materiales del GLB por los suyos según el nombre, y que los detalles pegados a una carcasa (tornillos, rejillas, rótulos) usen copias de material que siguen a la carcasa en los cortes transparentes; si no, flotan.
- Si la app mueve piezas por código (pistones, poleas), mover sus constantes a las cotas del modelo y comprobar con un test que siguen encajando (correa sobre las poleas, pistón dentro del cilindro).
- **Teardown**: un `import modelo from './modelo.glb'` en la sim llega como base64 (el build lo incrusta); decodificarlo con `GLTFLoader.parse` **antes** de construir la escena (`load().then(run)`), porque la construcción es síncrona. `build.json` permite servir un GLB más ligero (`swap`) o dejarlo fuera de la página (`external`).

## 10. Guardar y documentar
- `.blend` en la carpeta del proyecto y guardado frecuente; los scripts de ayuda del proyecto también en disco.
- Anotar en la ficha del objeto: calibraciones, umbrales de silueta alcanzados y qué partes son aproximadas por falta de foto.
- Las fotos de terceros son referencia: no subirlas a repositorios públicos ni incrustarlas en lo publicado.

# Vespino Mortadelo (primera serie, 1968-69)

Carpeta de referencias: `referencias/mortadelo/`. Archivo Blender: `blender/mortadelo.blend`.

## Medidas oficiales
Fuente: ficha de Vespinos.org, primera serie. No cambiar sin avisar al usuario.

| Dato | Valor |
|---|---|
| Distancia entre ejes | 1130 mm |
| Longitud / anchura / altura | 1760 / 610 / 1040 mm |
| Radio mínimo de giro | 1400 mm |
| Neumáticos | 2 1/4" x 18", radios de alambre |
| Motor | 49,77 cc, 38,4 x 43,0 mm, válvula rotativa |
| Peso en vacío | 52 kg |

Cotas estimadas sobre foto (decirlo al usuario): altura del asiento, ancho del manillar, diámetro de llanta, posición del piloto trasero.

## Calibración de `perfil.jpg` (889 x 600 px)
- Escala: **0,002173 m/px** (1130 mm / 520 px entre ejes).
- Eje trasero en px (189, 405), eje delantero (709, 409), suelo en y = 541.
- En el modelo: eje trasero en X = -0,565, delantero en X = +0,565, ruedas de radio 0,2855 m.
- Comprobación: longitud 1747 mm (ficha 1760), altura 1045 mm (ficha 1040), rueda 582 mm (18" + 2¼" = 571 mm).
- Eje de dirección: centro de la columna blanca de la horquilla, px (589, 160) con pendiente 0,455 px/px (24,5° de la vertical). Tija superior en py 140, abrazadera inferior en py 230; las barras bajan desde ahí hasta el eje delantero (709, 409). La columna blanca mide ~35 px (0,076 m) de perfil.
- Cigüeñal en el centro de la toma de aire delantera de la tapa (347, 409); polea trasera en la toma de atrás (205, 405).
- Sillín de py 150 a 195; silenciador de px 122 a 380 a la altura py 462; pedal en (350, 478) con eje en (372, 410); amortiguador de (240, 352) a (268, 252).

## Estado
- Volumen general (nov. 2026), luego detalle completo (nov. 2026) generado por `blender/scripts/mortadelo_*.py` (`build_all()`).
- Detalle: 85.800 triángulos; 1,734 x 0,617 x 1,043 m; `iou()` 0,784, `iou_body()` 0,846; precisión por grupo: carrocería 0,95, dirección 0,89, ruedas 0,95, motor 0,995, transmisión 1,0, otros 0,93.
- Las piezas internas del motor y la transmisión están colocadas por cotas de la ficha y lógica mecánica, no por fotos.
- Sin hacer: calibración frontal/cenital (se comprobó a ojo con `look`).
- En la maqueta (`vespino-3d.html` de la carpeta `Vespino-web`) desde noviembre de 2026: 27 piezas del GLB (1,46 MB, 67.000 triángulos), el resto en código.

## Rasgos que lo distinguen de otras series
- Faro redondo y piloto trasero pequeño, más alto que en series posteriores.
- Asiento individual (silla), no banco.
- Cárter gris azulado con dos tomas de aire redondas; escape cromado bajo el cárter.
- Cuentakilómetros Veglia hasta 60 km/h, en el centro del manillar.
- Radios de alambre en ambas ruedas; freno de tambor.

## Colores originales
Blanco crudo (alternativas azul y verde del catálogo), cárter gris azulado, escape cromado, asiento negro, llantas cromadas.

## Referencias (`referencias/mortadelo/`)
- Perfil: `perfil.jpg`, `lateral-completo.jpg`. Frontal: `frontal.jpg`, `frontal-completo.jpg`.
- Cenital: `manillar-cenital.jpg`, `asiento-portaequipajes-cenital.jpg`, `portaequipajes.jpg`.
- Detalle: `carter.jpg`, `faro-claxon.jpg`, `faro-y-tija.jpg`, `guardabarros-delantero.jpg`, `cubo-delantero.jpg`, `cuentakilometros.jpg`, `despiece-horquilla.jpg`.
- `trasera-tres-cuartos.webp` NO es primera serie (asiento de banco, cárter negro): usar solo para guardabarros, piloto y portaequipajes traseros.

## Pendiente
- Falta una vista trasera limpia del Mortadelo y fotos del motor abierto (variador, cilindro, cigüeñal): esas piezas serán aproximadas.

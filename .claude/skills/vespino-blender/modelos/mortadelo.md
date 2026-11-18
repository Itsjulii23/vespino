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
- Eje de dirección en px: de (581, 125) al eje delantero; unos 24° respecto a la vertical.
- Cigüeñal en el centro de la toma de aire delantera de la tapa (347, 409); polea trasera en la toma de atrás (205, 405).

## Estado
- Volumen general de las 43 piezas hecho (noviembre de 2026): `blender/mortadelo.blend`, exportado a `models/mortadelo.glb` (unos 28.000 triángulos, 519 KB).
- Las piezas internas del motor y la transmisión están colocadas por cotas de la ficha y lógica mecánica, no por fotos.

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

# Vespino 3D

Si has crecido en España, seguro que has visto (o has tenido) un Vespino. Este proyecto es mi forma de desmontarlo pieza a pieza sin mancharme las manos de aceite: una maqueta 3D que puedes girar, abrir por dentro y ver funcionar.

Todo cabe en una sola página HTML que funciona sin internet. Le das doble clic y ya está.

> **Antes de nada, gracias a [@elvarofficial](https://github.com/elvarofficial).** La maqueta está construida con su skill [teardown](https://github.com/elvarofficial/teardown): la escena, los cortes, el recorrido automático y toda la estructura del simulador salen de ahí. Sin ese trabajo esto no existiría. Hay más en [Agradecimientos](#agradecimientos).

![Vista general](docs/vista-general.png)

## Pruébala

- **En el navegador:** https://itsjulii23.github.io/vespino/
- **En tu ordenador:** descarga `vespino-3d.html` y ábrelo con Chrome, Edge o Firefox. No hace falta instalar nada.

## Qué puedes hacer con ella

Lo que más me gusta es desmontarla. Tiene 43 piezas y cada una se puede quitar, mirar de cerca y leer para qué sirve. Si arrastras el deslizador de **Despiece**, la moto se abre entera en el aire.

![Despiece completo](docs/despiece-completo.webp)

Además del despiece, hay siete pestañas:

| Pestaña | Qué encontrarás |
| --- | --- |
| **Vistas** | Seis cámaras, cortes para ver por dentro, un recorrido automático, modo conducción y el sonido del motor. |
| **Piezas** | Las 43 piezas. Un clic abre su ficha, doble clic la quita. |
| **Motor** | Nueve lecciones sobre cómo funciona un dos tiempos, con el pistón moviéndose a cámara lenta mientras lees. |
| **Historia** | La vida del Vespino desde 1967 hasta 2000. |
| **Averías** | Nueve averías de las de siempre (no arranca, echa humo, patina…) con cómo detectarlas y arreglarlas. Las piezas implicadas se iluminan. |
| **Quiz** | «Adivina la pieza» y «Monta la moto», donde empiezas con la moto desmontada y tienes que montarla en orden. |
| **Modelos** | 13 modelos reales, del primer Vespino al de Telepizza, y cambio de color y accesorios. |

![Pestaña Averías](docs/pestana-averias.png)

El motor no es decorativo: pistón, biela y cigüeñal se mueven con la cinemática real de biela-manivela, y el variador abre y cierra sus poleas según el acelerador.

Si quieres leer sobre las piezas sin abrir la maqueta, está el **[catálogo de las 43 piezas](docs/PIEZAS.md)**.

<details>
<summary>Más capturas</summary>

![Quiz](docs/pestana-quiz.png)
![Modelos y color](docs/pestana-modelos.png)
![Modo conducción](docs/modo-conduccion.png)
![Despiece en la maqueta](docs/despiece.png)
![Ficha de una pieza](docs/ficha-pieza.png)
![Pestaña Motor](docs/pestana-motor.png)
![Pestaña Historia](docs/pestana-historia.png)

</details>

## Cómo se maneja

- **Arrastra** para girar la moto y usa la **rueda del ratón** para acercarte.
- **Clic** en una pieza para ver su ficha, **doble clic** para quitarla y **Esc** para volver.
- Las teclas **1 a 6** cambian de cámara y **H** esconde los paneles.
- La dirección de la página cambia al elegir una pieza o una pestaña (por ejemplo `#pieza=carter`), así que puedes copiar el enlace y compartir justo lo que estás viendo.
- En el móvil los paneles se esconden tras un botón **☰ Menú**, pero donde mejor se ve es en el ordenador.

Si tu ordenador va justo, la página lo nota y baja la calidad sola para que no vaya a saltos.

## Lo nuevo: el Mortadelo en Blender

La maqueta web está hecha por código y su forma es aproximada. Ahora estoy haciendo un modelo más fiel en Blender, empezando por el primer Vespino de todos, el de 1968 al que muchos llaman **Mortadelo**.

![El Mortadelo en Blender](docs/mortadelo-blender.png)

Esta vez las medidas son las de la ficha técnica: 1130 mm entre ejes, 1760 mm de largo, 1040 mm de alto y ruedas de 18 pulgadas. La silueta está calcada de la foto de perfil del catálogo original, escalada con esas medidas. Al comprobarla, el largo, el alto y las ruedas cuadran con la ficha con menos de un 2 % de error.

Por ahora está el volumen general de las 43 piezas, cada una con el mismo nombre que en la maqueta para que algún día se puedan intercambiar. Lo siguiente es ir afinando pieza a pieza. Más adelante la idea es meterlo en una web donde se cargue al pulsar un botón, y añadir otros modelos de Vespino.

- `blender/mortadelo.blend`: el archivo de Blender.
- `models/mortadelo.glb`: el modelo exportado para la web (unos 500 KB).

## Por dentro

```
vespino-3d.html     la maqueta compilada (un solo archivo)
vespino-sim/        el código de la maqueta
  kin.js            cómo se mueven el motor y la transmisión
  bike.js           el modelo 3D y las piezas
  parts.js          las 43 piezas y sus fichas
  motor.js          las lecciones del motor
  learn.js          averías, modelos y colores
  history.js        la línea de tiempo
  stage.js          escena, luces y calidad
  console.js        la interfaz
  live.js           la interacción
  main.js           el punto de entrada
blender/            modelos de Blender
models/             modelos exportados a GLB
```

Para volver a compilar la maqueta hace falta la skill [teardown](https://github.com/elvarofficial/teardown) y Node 20 o superior:

```
node "<ruta-de-teardown>/sims/build.mjs" ./vespino-sim
```

El resultado sale en `teardown-out/dist/vespino-sim.html`.

## De dónde salen los datos

He intentado no inventarme nada, pero conviene que sepas qué es dato y qué es aproximación:

- Las fechas, los modelos y la historia vienen de [Wikipedia](https://es.wikipedia.org/wiki/Motovespa_Vespino), [vespinos.org](https://vespinos.org/historia-del-vespino/) y [Motorpasión Moto](https://www.motorpasionmoto.com/scooter/el-mitico-vespino-cumple-50-anos-el-ciclomotor-que-se-viralizo-en-espana). En alguna fecha no se ponen de acuerdo entre ellas.
- La cilindrada (49,77 cc), el diámetro y la carrera (38,4 × 43 mm) y las medidas del Mortadelo vienen de esas fuentes y de la ficha de [vespinos.org](https://vespinos.org/vespinos-con-valvula-rotativa/).
- La reducción final, el tamaño de las poleas del variador y las revoluciones del embrague son estimaciones mías, no datos del manual.
- Los textos de las piezas están escritos con lo que se sabe en general de los motores de dos tiempos.
- En el modelo de Blender, lo que no se ve en las fotos (el interior del motor, la parte de atrás) está colocado según la ficha y la lógica mecánica.

## Agradecimientos

Otra vez, gracias a **[elvarofficial](https://github.com/elvarofficial)** por la skill [teardown](https://github.com/elvarofficial/teardown). El motor de escena, las capturas, el recorrido automático y la forma de montar el simulador son suyos. Un trabajazo.

La skill, a su vez, usa [claude-motion](https://github.com/whaleyxbt/claude-motion) (licencia MIT).

Y gracias a la gente de [vespinos.org](https://vespinos.org), [vespinos.com](https://www.vespinos.com), [Vespinarium](http://vespinarium.blogspot.com) y [gaviras.com](https://gaviras.com), que comparten fotos y fichas de sus Vespinos y sin las que el modelo de Blender no habría sido posible.

## Aviso

Es un proyecto personal y educativo, sin relación con Piaggio ni con Moto Vespa S.A. «Vespino» y «Vespa» son marcas de sus dueños.

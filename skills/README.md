# Mis skills

Estas son las skills que escribí para modelar el Vespino con Claude Code y Blender. Una skill es un archivo de instrucciones que Claude lee antes de ponerse con una tarea: le cuenta cómo hacerla y qué tener en cuenta.

| Skill | Dónde está | Para qué sirve |
| --- | --- | --- |
| **blender-modelo-desde-fotos** | [`skills/blender-modelo-desde-fotos/`](blender-modelo-desde-fotos/SKILL.md) | Es la general. Sirve para modelar cualquier objeto real en Blender a partir de fotos y medidas oficiales: calibrar las fotos, comparar la silueta del modelo con la foto, nombrar las piezas y exportar a GLB para la web. Vale para una moto, un coche, un mueble o un aparato. |
| **vespino-blender** | [`.claude/skills/vespino-blender/`](../.claude/skills/vespino-blender/SKILL.md) | Es la específica de este proyecto. Lleva las medidas del Mortadelo, los nombres de las 43 piezas, los umbrales para dar una pieza por buena y cómo meter el modelo en la maqueta teardown. Tiene una ficha por modelo en `modelos/`, para poder añadir más Vespinos. |

La primera dice **cómo** modelar y la segunda **qué** modelar en este proyecto.

## Cómo usarlas

- **vespino-blender**: no hay que hacer nada. Está en `.claude/skills/` del proyecto, así que Claude Code la encuentra solo al abrir esta carpeta.
- **blender-modelo-desde-fotos**: si la quieres para tus propios proyectos, copia la carpeta a `~/.claude/skills/` (en Windows, `C:\Users\<tu-usuario>\.claude\skills\`).

Las dos necesitan Blender conectado a Claude por MCP. Las funciones que usan (calibrar, comparar siluetas, contar triángulos…) están en `blender-modelo-desde-fotos/scripts/helpers.py`.

Las fotos de referencia que usé no están en el repositorio porque son de otras personas. Las skills explican qué hacer con las tuyas.

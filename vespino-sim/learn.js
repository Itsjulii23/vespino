// Content for the Averías, Modelos and Quiz tabs.
// Averías: general two-stroke moped advice, not from the Vespino manual. Modelos: facts from the Spanish Wikipedia page
// on the Motovespa Vespino (the model years and differences it lists); colours are only for trying out.

export const COLORES = [
  ['Verde', '#86c872'],
  ['Rojo', '#d5473d'],
  ['Azul', '#4a86c9'],
  ['Amarillo', '#e7c33f'],
  ['Naranja', '#e8873a'],
  ['Blanco', '#eceeea'],
  ['Negro', '#3a3d40'],
];

export const AVERIAS = [
  {
    t: 'No arranca: no hay chispa', s: 'El motor gira pero no se enciende', view: 'engine', parts: ['bujia', 'volante'], inside: true,
    secs: [
      ['Síntoma', 'Das pedal o patada y el motor no da ni una explosión. Huele a gasolina.'],
      ['Causa probable', 'Bujía sucia, mojada o gastada; pipa de la bujía floja; o fallo en la bobina del volante magnético.'],
      ['Cómo se revisa', 'Saca la bujía, apóyala en una parte metálica del motor y gira el motor: debe saltar una chispa azulada. Mira si el electrodo está negro o húmedo.'],
      ['Solución', 'Limpiar o cambiar la bujía. Si sigue sin chispa, revisar cables y bobina en un taller.'],
    ],
  },
  {
    t: 'No arranca: no llega gasolina', s: 'Hay chispa, pero no hay mezcla', view: 'engine', parts: ['deposito', 'filtro', 'carburador'], inside: false,
    secs: [
      ['Síntoma', 'Hay chispa pero el motor no coge. No huele a gasolina o el depósito está vacío.'],
      ['Causa probable', 'Depósito vacío, grifo cerrado, filtro atascado o chiclé del carburador obstruido.'],
      ['Cómo se revisa', 'Comprueba el nivel y el grifo, afloja con cuidado la manguera del carburador y mira si fluye gasolina.'],
      ['Solución', 'Rellenar, abrir el grifo, limpiar el filtro y desmontar y limpiar el carburador con limpiador específico.'],
    ],
  },
  {
    t: 'Ralentí inestable o se cala', s: 'Arranca y se apaga al soltar el acelerador', view: 'engine', parts: ['carburador', 'filtro'], inside: false,
    secs: [
      ['Síntoma', 'Con el acelerador suelto el motor tiembla, sube y baja de vueltas o se apaga.'],
      ['Causa probable', 'Carburador sucio, ralentí mal regulado o entrada de aire por una junta agrietada.'],
      ['Cómo se revisa', 'Mira el estado de las juntas de la admisión y regula el tornillo de ralentí del carburador.'],
      ['Solución', 'Limpiar y regular el carburador y cambiar las juntas dañadas.'],
    ],
  },
  {
    t: 'Humo azul o blanco', s: 'Sale mucho humo por el escape', view: 'engine', parts: ['piston', 'cilindro', 'escape'], inside: true,
    secs: [
      ['Síntoma', 'Una nube de humo azulado y olor a aceite quemado, sobre todo al acelerar.'],
      ['Causa probable', 'Demasiado aceite en la mezcla, o segmentos y cilindro gastados que dejan pasar aceite.'],
      ['Cómo se revisa', 'Comprueba la proporción de la mezcla (el consumo se calcula con un 2 %) y mira el aspecto del pistón y del cilindro.'],
      ['Solución', 'Preparar bien la mezcla; si el desgaste es grande, cambiar segmentos o el kit de cilindro y pistón.'],
    ],
  },
  {
    t: 'Pierde potencia', s: 'No sube de vueltas ni en las cuestas', view: 'engine', parts: ['escape', 'piston', 'filtro'], inside: false,
    secs: [
      ['Síntoma', 'La moto va floja, le cuesta acelerar y no llega a su velocidad habitual.'],
      ['Causa probable', 'Escape obstruido por carbonilla, segmentos gastados o filtro de aire sucio.'],
      ['Cómo se revisa', 'Limpia el filtro, mira si el escape está atascado de carbonilla y comprueba la compresión del cilindro.'],
      ['Solución', 'Descarbonizar o cambiar el escape, limpiar el filtro y cambiar los segmentos si hace falta.'],
    ],
  },
  {
    t: 'Acelera pero no avanza', s: 'El motor sube de vueltas y la moto patina', view: 'drive', parts: ['correa', 'embrague', 'motriz', 'conducida'], inside: true,
    secs: [
      ['Síntoma', 'El motor sube de vueltas pero la rueda trasera apenas recibe fuerza, o hay olor a goma.'],
      ['Causa probable', 'Correa gastada o aceitosa, zapatas del embrague gastadas, o masas del variador desgastadas.'],
      ['Cómo se revisa', 'Abre la cubierta del variador y mira la correa (grietas, ancho) y el estado de las zapatas del embrague.'],
      ['Solución', 'Cambiar la correa y las piezas gastadas del variador y del embrague, siempre en juego.'],
    ],
  },
  {
    t: 'Golpeteo metálico', s: 'Un ruido seco que sube con las vueltas', view: 'engine', parts: ['biela', 'piston', 'ciguenal'], inside: true,
    secs: [
      ['Síntoma', 'Un golpeteo metálico dentro del motor que crece con las vueltas.'],
      ['Causa probable', 'Holgura en la biela o en el cigüeñal, o un pistón demasiado gastado.'],
      ['Cómo se revisa', 'Es una avería interna: con el motor parado se busca holgura moviendo el pistón; lo demás exige abrir el motor.'],
      ['Solución', 'Parar el motor y llevarlo a un taller: seguir circulando puede destrozarlo.'],
    ],
  },
  {
    t: 'El motor se agarrota', s: 'Se queda bloqueado de golpe', view: 'engine', parts: ['piston', 'cilindro', 'culata'], inside: true,
    secs: [
      ['Síntoma', 'El motor pierde fuerza, se calienta y se bloquea de repente.'],
      ['Causa probable', 'Falta de aceite en la mezcla, mezcla demasiado pobre o sobrecalentamiento.'],
      ['Cómo se revisa', 'Al abrirlo se ven marcas de rozamiento en el pistón y las paredes del cilindro.'],
      ['Solución', 'Reparar el cilindro y el pistón y revisar la mezcla. Es mejor prevenirlo usando siempre la mezcla correcta.'],
    ],
  },
  {
    t: 'Frenos flojos', s: 'Hay que apretar mucho para parar', view: 'side', parts: ['rueda-t-tambor', 'rueda-d-tambor'], inside: false,
    secs: [
      ['Síntoma', 'La palanca llega casi al final y la moto frena poco o tarda en parar.'],
      ['Causa probable', 'Zapatas gastadas, cable destensado o tambor con grasa.'],
      ['Cómo se revisa', 'Mira el desgaste de las zapatas del tambor y la holgura del cable.'],
      ['Solución', 'Tensar el cable, limpiar el tambor y cambiar las zapatas.'],
    ],
  },
];

export const MODELOS = [
  {y: '1968–1969', t: 'Vespino', s: 'El original', p: 'El primero, con faro redondo, de 1968. Nace de una patente de 1967 y es el punto de partida de toda la familia.', f: ['Motor de dos tiempos de 49 cc', 'Variador de correa', 'Faro redondo']},
  {y: '1969–1970', t: 'N', s: 'El «normal»', p: 'Se llamó N para distinguirlo del Tour y del Lujo. Cambia poco: no lleva logo en los puños y el amortiguador trasero no se engrasa.', f: ['Sin logo en los puños', 'Amortiguador sin engrasador']},
  {y: '1969–1971', t: 'Tour', s: 'Con cromados', p: 'Añade cromados y un piloto trasero situado más bajo.', f: ['Cromados', 'Piloto trasero bajo']},
  {y: '1969–1972', t: 'Lujo', s: 'El más equipado', p: 'Incorpora encendido electrónico, cromados en la horquilla y en el amortiguador y un sillín corrido. El Lujo de 1969 tiene faro rectangular.', f: ['Encendido electrónico', 'Sillín corrido', 'Faro rectangular (1969)']},
  {y: '1970–1972', t: 'Brisa', s: 'El sencillo', p: 'Una versión sencilla, preferida para exportar, con horquilla de brazos oscilantes y asiento individual. Para diseñarlo se tomó como referencia la Piaggio Ciao.', f: ['Horquilla de brazos oscilantes', 'Asiento individual', 'Pensado para exportar']},
  {y: '1970–1972', t: 'Rally', s: 'El deportivo', p: 'Tiene un depósito de 6,5 litros entre las piernas, casi el doble del estándar, y un manillar deportivo.', f: ['Depósito de 6,5 litros', 'Manillar deportivo']},
  {y: '1973–1979', t: 'Serie T (T, TN, TL, TS)', s: 'Horquilla telescópica', p: 'Estrena horquilla telescópica y llantas de 16 pulgadas. El TS suma intermitentes y asiento doble. La velocidad máxima se limita a 40 km/h.', f: ['Horquilla telescópica', 'Llantas de 16 pulgadas', 'TS: intermitentes y asiento doble']},
  {y: '1973–1980', t: 'Serie L y GL', s: 'Faro cuadrado', p: 'Se distinguen por el faro cuadrado. El GL añade el mando de luces cromado y una tapa de plástico.', f: ['Faro cuadrado', 'GL: mando de luces cromado']},
  {y: '1978–1980', t: 'NL', s: 'Sin tapa basculante', p: 'Elimina la tapa basculante de la carrocería. Monta llantas de acero de 17 y 18 pulgadas; el NL T3A lleva llantas de aleación de serie.', f: ['Sin tapa basculante', 'NL T3A: llantas de aleación']},
  {y: '1980–1985', t: 'SC / SCA / SCAN', s: 'Llantas de aleación', p: 'El SC lleva llantas de acero y el SCA, de aleación. La serie SCAN es negra o blanca con adhesivos rojizos. En algunos mercados se exportó como Gilera Toledo.', f: ['SC: llantas de acero', 'SCA: llantas de aleación', 'Exportado como Gilera Toledo']},
  {y: '1985–1988', t: 'AL / ALX', s: 'Nuevo chasis', p: 'Nuevo chasis y admisión por láminas en el AL (1985). El ALX (1986) añade intermitentes y reserva luminosa, y pasa a 12 voltios.', f: ['Admisión por láminas', 'ALX: 12 voltios']},
  {y: '1988–1991', t: 'XE (Elestart)', s: 'Arranque eléctrico', p: 'Incorpora arranque eléctrico y llantas de aleación exclusivas.', f: ['Arranque eléctrico']},
  {y: '1994–2000', t: 'Series Telepizza', s: 'Ediciones especiales', p: 'Seis series especiales para Telepizza entre 1994 y 2000. La última unidad que salió de la fábrica de Madrid fue una de ellas.', f: ['6 series', 'Último Vespino fabricado']},
];

// the order in which the bike is put back together in the assembly game
export const ASM = ['chasis', 'rueda-t-neumatico', 'rueda-d-neumatico', 'carter', 'cilindro', 'piston', 'volante', 'motriz', 'correa', 'escape', 'horquilla', 'manillar', 'faro', 'sillin'];

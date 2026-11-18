import {runLive} from './live.js';
import {loadMortadelo} from './mortadelo.js';

// Vespino · Two-Stroke as an interactive page: views, cutaway, overlays, throttle, orbit, and an auto tour when left alone.
// The Mortadelo's bodywork comes from Blender (mortadelo.glb, inlined); it is decoded before the bike is built.
loadMortadelo().then(runLive).catch((e) => { console.error(e); document.body.textContent = 'No se pudo cargar el modelo: ' + e.message; });

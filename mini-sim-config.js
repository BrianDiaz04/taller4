//------------------------------------------------------------
// Configuración de la simulación de interacción en las
// miniaturas de la home (grilla de 3x3 / 1 columna en mobile).
//
// Este archivo NO contiene lógica de ningún subsistema.
// Solo define los tiempos que subsistema.js, subsistema2.js
// y script.js leen cuando se cargan dentro de un <iframe>
// en modo miniatura (?mini=1).
//
// Si más adelante cambiás el código de un subsistema
// (subsistema.js, subsistema2.js o script.js), la miniatura
// sigue mostrando ese cambio automáticamente, porque es el
// mismo archivo cargado en un iframe. Este script solo ajusta
// EL RITMO de la interacción simulada, no el dibujo en sí.
//
// Cargá este script ANTES del script del subsistema
// correspondiente en cada subsistemaN.html.
//------------------------------------------------------------

window.MINI_SIM_CONFIG = {
  // Subsistemas 1 y 2 (subsistema.js / subsistema2.js):
  // simulan un "click" (tap) cada tanto. Antes de cada click
  // se espera un tiempo al azar entre estos dos límites, en
  // milisegundos. Con 5000-6000 queda un click cada 5-6 segundos.
  click: {
    intervalMin: 5000,
    intervalMax: 6000
  },

  // Subsistema 3 / última fila (script.js): en vez de un click
  // instantáneo, simula un drag/touch sostenido hacia arriba
  // (como si alguien mantuviera el dedo apretado en la pantalla
  // para "acelerar"). Se compone de dos tiempos:
  drag: {
    // Cuánto se espera, al azar entre estos límites, antes de
    // iniciar el próximo drag.
    intervalMin: 5000,
    intervalMax: 6000,

    // Una vez iniciado el drag, cuánto tiempo se mantiene
    // sostenido (al azar entre estos límites) antes de soltarlo.
    holdDurationMin: 1800,
    holdDurationMax: 2600
  }
};

//------------------------------------
// Home: cuadrícula de 9 estados
//
// Cada miniatura es un <iframe> que carga la
// página real del subsistema correspondiente
// (mismo HTML/CSS/JS, sin duplicar código).
// Solo se la escala con CSS para que entre en
// la celda. Cualquier cambio en subsistema.js,
// subsistema2.js o script.js se ve reflejado
// automáticamente acá.
//------------------------------------

const IFRAME_BASE_WIDTH = 900; // debe coincidir con el width fijo del iframe en style.css

function scaleFrames() {
  document.querySelectorAll(".cell-frame-wrap").forEach((wrap) => {
    const iframe = wrap.querySelector("iframe");
    if (!iframe) return;

    const scale = wrap.clientWidth / IFRAME_BASE_WIDTH;
    iframe.style.transform = `scale(${scale})`;
  });
}

window.addEventListener("load", scaleFrames);
window.addEventListener("resize", scaleFrames);

// Por si el layout todavía no midió bien en el primer frame
requestAnimationFrame(scaleFrames);
scaleFrames();

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

// El resto de las páginas (subsistemaN.html) necesitan
// "touch-action: none" y "overflow: hidden" en html/body para que
// el dedo dibuje sobre el canvas en vez de scrollear la página.
// Esta página (el menú principal) es al revés: en mobile la
// cuadrícula de 9 experiencias no entra en una pantalla y hace
// falta poder scrollear para llegar a las de más abajo. Como esas
// reglas están en el CSS compartido, acá las pisamos puntualmente
// (solo en esta página) para habilitar el scroll vertical.
document.documentElement.style.overflowY = "auto";
document.documentElement.style.touchAction = "pan-y";
document.body.style.touchAction = "pan-y";
document.body.style.overscrollBehavior = "auto";

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

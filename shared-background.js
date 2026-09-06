//------------------------------------------------------------
// Fondo único y compartido por las 9 experiencias (los 3
// estados de cada uno de los 3 subsistemas).
//
// Esta es la ÚNICA implementación del fondo: subsistema.js,
// subsistema2.js y script.js la llaman a ella en vez de tener
// cada uno su propia copia. Así el fondo es literalmente el
// mismo (mismo código, mismos valores), no solo una copia
// escrita para que se vea igual.
//
// Basado en el fondo original del subsistema 2 (Colaboración),
// con el azul oscurecido un poco más.
//
// glow: número entre 0 y 1 (opcional). Los subsistemas que no
// manejan un valor de "glow" propio simplemente no lo pasan,
// y queda en 0.
//------------------------------------------------------------

function drawSharedBackground(ctx, w, h, glow = 0) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = lerpRgbShared([5, 4, 9], [14, 10, 26], glow);
  ctx.fillRect(0, 0, w, h);

  const skyGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
  skyGlow.addColorStop(0, "rgba(12, 42, 60, 0.16)");
  skyGlow.addColorStop(0.48, "rgba(12, 28, 44, 0.16)");
  skyGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, w, h);
}

function lerpRgbShared(a, b, t) {
  const c = [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

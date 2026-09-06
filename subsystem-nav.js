//------------------------------------------------------------
// Flechas de navegación entre estados.
//
// Se agregan como botones HTML normales (no dibujados en el
// canvas) flotando sobre la experiencia, para poder moverse
// al estado anterior/siguiente SIN importar de qué subsistema
// sea ni en qué archivo estemos parados. Cruzan entre
// subsistema1.html, subsistema2.html y subsistema3.html.
//
// No aparecen en modo miniatura (?mini=1): ahí no hacen falta
// y estorbarían dentro de la celda de la grilla.
//
// Se puede pegar este script en cualquier subsistemaN.html,
// después del script principal; no depende de sus variables
// internas, solo lee la URL actual.
//------------------------------------------------------------

(function () {
  const STATES = [
    { file: "subsistema1.html", estado: "memoria", label: "Memoria" },
    { file: "subsistema1.html", estado: "herencia", label: "Herencia" },
    { file: "subsistema1.html", estado: "caducidad", label: "Caducidad" },
    { file: "subsistema2.html", estado: "sinergias", label: "Colaboración" },
    { file: "subsistema2.html", estado: "ramas", label: "Empatía" },
    { file: "subsistema2.html", estado: "ruptura", label: "Identidad" },
    { file: "subsistema3.html", estado: "incertidumbre", label: "Incertidumbre" },
    { file: "subsistema3.html", estado: "ansiedad", label: "Ansiedad" },
    { file: "subsistema3.html", estado: "expectativa", label: "Expectativa" }
  ];

  const params = new URLSearchParams(window.location.search);

  // En miniatura (dentro del iframe de la home) no se muestran flechas.
  if (params.get("mini") === "1") return;

  const currentFile = window.location.pathname.split("/").pop();

  // OJO: currentIndex se recalcula en cada goTo(), no una sola vez al
  // cargar. Los botones con título (Memoria/Herencia/Caducidad, etc.)
  // cambian el estado dentro de la misma página y actualizan el
  // parámetro ?estado= de la URL sin recargarla (ver switchSystem /
  // switchWork / startPhase en cada subsistemaN). Si acá se leyera la
  // URL una sola vez al inicio, la flecha ignoraría esos cambios y
  // siempre partiría del estado con el que se cargó la página.
  function getCurrentIndex() {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get("estado");
    const index = STATES.findIndex((s) => s.file === currentFile && s.estado === estado);
    return index === -1 ? 0 : index;
  }

  function goTo(index) {
    const wrapped = (index + STATES.length) % STATES.length;
    const target = STATES[wrapped];
    window.location.href = target.file + "?estado=" + target.estado;
  }

  function createArrow(direction, symbol, ariaLabel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-arrow nav-arrow-" + direction;
    btn.setAttribute("aria-label", ariaLabel);
    btn.textContent = symbol;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentIndex = getCurrentIndex();
      goTo(direction === "prev" ? currentIndex - 1 : currentIndex + 1);
    });

    // Evita que el canvas interprete el tap sobre la flecha como
    // un click en la simulación (mousedown/touchstart del canvas).
    btn.addEventListener("mousedown", (e) => e.stopPropagation());
    btn.addEventListener("touchstart", (e) => e.stopPropagation());

    document.body.appendChild(btn);
  }

  function createHomeButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-home";
    btn.setAttribute("aria-label", "Volver al inicio");
    btn.textContent = "⌂";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.location.href = "index.html";
    });

    // Evita que el canvas interprete el click sobre el botón como
    // un click en la simulación (mousedown/touchstart del canvas).
    btn.addEventListener("mousedown", (e) => e.stopPropagation());
    btn.addEventListener("touchstart", (e) => e.stopPropagation());

    document.body.appendChild(btn);
  }

  createArrow("prev", "‹", "Estado anterior");
  createArrow("next", "›", "Estado siguiente");

  // El botón de "volver al inicio" solo se agrega en pantallas de
  // escritorio: en mobile ya hay bastante interfaz encima de la
  // experiencia (botones de fase, flechas) y el gesto para volver
  // atrás del navegador ya cumple esa función.
  const isDesktop = window.innerWidth >= 768;
  if (isDesktop) createHomeButton();
})();

/* Renderização offline de diagramas Mermaid, integrada ao dark mode do Material */
(function () {
  "use strict";

  function currentTheme() {
    var scheme = document.body.getAttribute("data-md-color-scheme");
    return scheme === "slate" ? "dark" : "default";
  }

  var sources = new WeakMap();

  function renderAll() {
    if (typeof mermaid === "undefined") return;
    var blocks = document.querySelectorAll("div.mermaid");
    blocks.forEach(function (el) {
      if (!sources.has(el)) sources.set(el, el.textContent);
      el.removeAttribute("data-processed");
      el.innerHTML = "";
      el.textContent = sources.get(el);
    });
    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme(),
      securityLevel: "loose",
      flowchart: { useMaxWidth: true },
      themeVariables: currentTheme() === "dark" ? { fontSize: "15px" } : { fontSize: "15px" }
    });
    mermaid.run({ nodes: blocks });
  }

  // Primeira renderização
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }

  // Re-renderiza ao trocar entre modo claro/escuro
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === "data-md-color-scheme") renderAll();
    });
  });
  observer.observe(document.body, { attributes: true });

  // Suporte a navigation.instant do Material
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () {
      sources = new WeakMap();
      renderAll();
    });
  }
})();

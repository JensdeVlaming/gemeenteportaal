window.plausible =
  window.plausible ||
  function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };

var script = document.createElement("script");
script.defer = true;
script.setAttribute("data-domain", "preekrooster.devlaming.net");
script.src = "https://pl.devlaming.net/js/script.js";
document.head.appendChild(script);

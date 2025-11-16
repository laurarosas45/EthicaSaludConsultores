
/* Mini-router para #/quienes/:subvista  */
(() => {
  const SUBS = ["conocenos","vision","mision"];

  function showSubView(name){
    // activar bloque
    document.querySelectorAll('.quienes-bloque').forEach(el=>{
      el.classList.toggle('is-active', el.dataset.subView === name);
    });
    // link activo
    document.querySelectorAll('.quienes-subnav a').forEach(a=>{
      const is = a.getAttribute('href').endsWith('/'+name);
      a.classList.toggle('is-active', is);
      a.setAttribute('aria-current', is ? 'page' : null);
    });
    // scroll suave a la sección (sin mover si ya estás dentro)
    const wrap = document.querySelector('#quienes');
    if (wrap){ wrap.scrollIntoView({behavior:'smooth', block:'start'}); }
  }

  function parseHash(){
    const h = location.hash || "#/quienes/conocenos";
    const m = h.match(/^#\/quienes\/([^\/?#]+)/i);
    const sub = (m && SUBS.includes(m[1].toLowerCase())) ? m[1].toLowerCase() : "conocenos";
    showSubView(sub);
  }

  window.addEventListener('hashchange', parseHash);
  window.addEventListener('DOMContentLoaded', parseHash);
})();
  
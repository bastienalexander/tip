/* TIP · hover-effecten voor de site (overzicht en terugknoppen)
   Bij hover kantelt een knop of regel: de tekst wordt omhoog weggedrukt en een omgekeerde
   versie schuift er van onderen in. Kaartjes krijgen een kleurvlak van de richting dat
   omhoog schuift, en het beeld zoomt een fractie in. */
(function () {
  const css = `
  .roll{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}
  .roll .r1{display:block;transition:transform .3s ease-in-out;transform-origin:50% 0}
  .roll .r2{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;
    background:var(--roll-bg,#fff);color:var(--roll-fg,#141414);border-radius:inherit;transform:translateY(101%);transition:transform .3s ease-in-out}
  .roll:hover .r1,.roll:focus-visible .r1{transform:translateY(-25%) scaleY(0)}
  .roll:hover .r2,.roll:focus-visible .r2{transform:translateY(0)}
  nav a.roll{padding:2px 6px;margin:0 -6px;border-radius:5px;--roll-bg:var(--ink,#141414);--roll-fg:var(--bg,#fff)}
  .cap a.roll{--roll-bg:#141414;--roll-fg:#fff} /* zwart: blijft zichtbaar op elk kleurvlak */
  a.back.roll{--roll-bg:#fff;--roll-fg:#141414}
  .cell{position:relative}
  .cell img,.cell canvas.bus,.cell .frame{transition:transform .5s ease-in-out}
  .cell:hover img,.cell:hover canvas.bus,.cell:hover .frame{transform:scale(1.035)}
  .cell .cap{position:relative;overflow:hidden;transition:color .3s ease-in-out}
  .cell .cap::before{content:"";position:absolute;inset:0;background:var(--acc,#fff);transform:translateY(101%);transition:transform .3s ease-in-out}
  .cell .cap>*{position:relative}
  .cell:hover .cap::before{transform:translateY(0)}
  .cell:hover .cap,.cell:hover .cap b{color:var(--acc-ink,#141414)}
  .cell.link{cursor:pointer}
  #d1{--acc:#5BBFC0;--acc-ink:#141414} #d2{--acc:#FF5000;--acc-ink:#141414} #d3{--acc:#7614DD;--acc-ink:#fff}
  #d4{--acc:#2F4BEF;--acc-ink:#fff} #d5{--acc:#05A34A;--acc-ink:#141414}
  @media (prefers-reduced-motion:reduce){.roll .r1,.roll .r2,.cell img,.cell canvas.bus,.cell .frame,.cell .cap::before{transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function roll(el) {
    if (el.classList.contains('roll')) return;
    const t = el.textContent.trim(); if (!t) return;
    el.classList.add('roll');
    el.innerHTML = '';
    const a = document.createElement('span'); a.className = 'r1'; a.textContent = t;
    const b = document.createElement('span'); b.className = 'r2'; b.textContent = t; b.setAttribute('aria-hidden', 'true');
    el.append(a, b);
  }
  function init() {
    document.querySelectorAll('nav a, .cap a, a.back').forEach(roll);
    // kaartje met een "Openen"-knop: het hele kaartje is klikbaar
    document.querySelectorAll('.cell').forEach(c => {
      const a = c.querySelector('.cap a'); if (!a) return;
      c.classList.add('link');
      c.addEventListener('click', e => { if (!e.target.closest('a')) location.href = a.href; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

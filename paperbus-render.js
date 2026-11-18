/* TIP · paperbus: een ontwerp om de zuil op de foto buigen.
   Gedeeld door tip-paperbus.html (de tool) en index.html (het overzicht).
   Per pixel berekend (geen naden), ontwerp eerst netjes verkleind (geen moiré),
   en de schaduw en kreukels van het papier uit de foto komen erdoorheen. */
(function () {
  // vorm van het papier op beelden/zuil.jpg, als fractie van breedte en hoogte
  // (gemeten op volle resolutie; boven- en onderrand gepast op 11 meetpunten, afwijking < 1 px)
  const G = { TL: [357.5 / 1050, 489.5 / 1400], TR: [643.8 / 1050, 493.3 / 1400], TC: 444.9 / 1400,
              BL: [349.6 / 1050, 994.0 / 1400], BR: [654.5 / 1050, 989.5 / 1400], BC: 1015.2 / 1400 };
  const D2R = Math.PI / 180;

  // hoe ver het ontwerp om de zuil loopt, in graden, als de verhouding wordt aangehouden
  function spanFor(photo, art, g, size) {
    const W = 1000, H = 1000 * photo.height / photo.width;
    const r = ((g.TR[0] - g.TL[0]) + (g.BR[0] - g.BL[0])) / 4 * W, h = (g.BC - g.TC) * H;
    return art.width / art.height * h * size / r / D2R;
  }

  // ontwerp stap voor stap halveren tot ongeveer de maat op de zuil
  const cache = new WeakMap();
  function texFor(art, hTarget) {
    hTarget = Math.max(64, Math.min(art.height, Math.round(hTarget)));
    const hit = cache.get(art);
    if (hit && hit.h === hTarget) return hit;
    let src = art, sw = art.width, sh = art.height;
    while (sh / 2 >= hTarget) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(sw / 2)); c.height = Math.max(1, Math.round(sh / 2));
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    const c = document.createElement('canvas'); c.height = hTarget; c.width = Math.max(1, Math.round(sw * hTarget / sh));
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    const t = { h: hTarget, w: c.width, d: x.getImageData(0, 0, c.width, c.height).data };
    cache.set(art, t); return t;
  }

  // helderste papier = 'wit' (97e percentiel per kanaal)
  function paperWhite(p) {
    const ch = [[], [], []];
    for (let i = 0; i < p.length; i += 4 * 7) { if (p[i] + p[i + 1] + p[i + 2] > 420) for (let c = 0; c < 3; c++) ch[c].push(p[i + c]); }
    return ch.map(v => { if (!v.length) return 255; v.sort((a, b) => a - b); return v[Math.floor(v.length * .97)] || 255; });
  }

  /* render(photo, art, W, H, opts) → canvas met de foto en het gebogen ontwerp
     opts: g (vorm), span (graden; leeg = verhouding aanhouden), rot (graden), rep (rondom herhalen),
           pap (0–1, schaduw en kreukels), size (1 = past precies, groter = ingezoomd), pos (0 boven – 1 onder) */
  function render(photo, art, W, H, o = {}) {
    const g = o.g || G, rot = o.rot || 0, rep = !!o.rep, pap = o.pap ?? .85, size = o.size ?? 1, pos = o.pos ?? .5;
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d'); ctx.drawImage(photo, 0, 0, W, H);
    if (!art) return out;
    const sp = (o.span ?? spanFor(photo, art, g, size)) * D2R, ph = rot * D2R;
    const T = { cx: (g.TL[0] + g.TR[0]) / 2 * W, r: (g.TR[0] - g.TL[0]) / 2 * W, yl: g.TL[1] * H, yr: g.TR[1] * H };
    const B = { cx: (g.BL[0] + g.BR[0]) / 2 * W, r: (g.BR[0] - g.BL[0]) / 2 * W, yl: g.BL[1] * H, yr: g.BR[1] * H };
    T.dy = g.TC * H - (T.yl + T.yr) / 2; B.dy = g.BC * H - (B.yl + B.yr) / 2;
    const xs = [g.TL[0], g.BL[0], g.TR[0], g.BR[0]].map(x => x * W), ys = [g.TC, g.BC, g.TL[1], g.BL[1], g.TR[1], g.BR[1]].map(y => y * H);
    const bx = Math.max(0, Math.floor(Math.min(...xs)) - 3), by = Math.max(0, Math.floor(Math.min(...ys)) - 3);
    const bw = Math.min(W - bx, Math.ceil(Math.max(...xs)) - bx + 6), bh = Math.min(H - by, Math.ceil(Math.max(...ys)) - by + 6);
    const tex = texFor(art, (g.BC - g.TC) * H * size * 1.25), tw = tex.w, th = tex.h, td = tex.d;
    const P = ctx.getImageData(bx, by, bw, bh), p = P.data, ref = paperWhite(p);
    for (let py = 0; py < bh; py++) {
      const y = by + py + .5;
      for (let px = 0; px < bw; px++) {
        const x = bx + px + .5;
        // terugrekenen: welke hoek (a) en hoogte (v) op de zuil hoort bij deze pixel
        let v = .5, a = 0, s = 0, ok = true;
        for (let k = 0; k < 4; k++) {
          const cx = T.cx + (B.cx - T.cx) * v, r = T.r + (B.r - T.r) * v; s = (x - cx) / r;
          if (s <= -1 || s >= 1) { ok = false; break; }
          a = Math.asin(s); const c = Math.cos(a);
          const yt = T.yl + (T.yr - T.yl) * (s + 1) / 2 + T.dy * c, yb = B.yl + (B.yr - B.yl) * (s + 1) / 2 + B.dy * c;
          v = (y - yt) / (yb - yt);
        }
        if (!ok || v < -.01 || v > 1.01) continue;
        const vv = (v - pos * (1 - size)) / size; if (vv < -.01 || vv > 1.01) continue;
        let u = .5 + (a - ph) / sp; if (rep) u -= Math.floor(u);
        // bilineair bemonsteren; buiten het ontwerp doorzichtig, zodat randen zacht blijven
        const fx = u * tw - .5, fy = vv * th - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
        let R = 0, Gc = 0, Bc = 0, A = 0;
        for (let j = 0; j < 2; j++) {
          const yy = y0 + j; if (yy < 0 || yy >= th) continue; const wy = j ? ay : 1 - ay;
          for (let i = 0; i < 2; i++) {
            let xx = x0 + i; if (rep) xx = ((xx % tw) + tw) % tw; else if (xx < 0 || xx >= tw) continue;
            const w = (i ? ax : 1 - ax) * wy, q = (yy * tw + xx) * 4, al = td[q + 3] / 255 * w;
            R += td[q] * al; Gc += td[q + 1] * al; Bc += td[q + 2] * al; A += al;
          }
        }
        if (A <= 0) continue; R /= A; Gc /= A; Bc /= A;
        // papier en licht: ontwerp × (foto / wit papier)
        const o4 = (py * bw + px) * 4, col = [R, Gc, Bc];
        for (let c = 0; c < 3; c++) { const sh = Math.min(1.08, p[o4 + c] / ref[c]), m = 1 - pap + pap * sh; p[o4 + c] = p[o4 + c] * (1 - A) + Math.min(255, col[c] * m) * A; }
      }
    }
    ctx.putImageData(P, bx, by); return out;
  }

  // SVG-poster inladen en scherp omzetten (breedte en hoogte uit de viewBox)
  function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
  async function loadSvgPoster(url, hiH = 3200) {
    const s = await (await fetch(url)).text(), vb = s.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number);
    const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.replace('<svg ', `<svg width="${vb[2]}" height="${vb[3]}" `)));
    const c = document.createElement('canvas'); c.height = hiH; c.width = Math.round(vb[2] / vb[3] * hiH);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); return c;
  }

  // ronddraaien door horizontaal te slepen, met muis of vinger; na loslaten draait de zuil even door
  function dragRotate(el, { radius, get, set, end, skip }) {
    const wrap = a => ((a + 180) % 360 + 360) % 360 - 180;
    let d = null, raf = 0;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => { el.classList.remove('turning'); end && end(); };
    el.addEventListener('pointerdown', e => {
      if (e.button || (skip && skip(e))) return;
      cancelAnimationFrame(raf);
      d = { id: e.pointerId, x: e.clientX, a: get(), last: get(), t: e.timeStamp, v: 0 };
      el.setPointerCapture(e.pointerId); el.classList.add('turning');
    });
    el.addEventListener('pointermove', e => {
      if (!d || e.pointerId !== d.id) return;
      const a = d.a + (e.clientX - d.x) / (radius() || 1) / D2R, dt = Math.max(1, e.timeStamp - d.t);
      d.v = .7 * d.v + .3 * (a - d.last) / dt; d.last = a; d.t = e.timeStamp; set(wrap(a));
    });
    const up = e => {
      if (!d || e.pointerId !== d.id) return;
      let a = d.last, v = d.v * 16; const idle = e.timeStamp - d.t > 80; d = null;
      if (e.type === 'pointercancel' || calm || idle || Math.abs(v) < .15) return finish();
      const spin = () => { a += v; v *= .93; set(wrap(a)); if (Math.abs(v) > .08) raf = requestAnimationFrame(spin); else finish(); };
      raf = requestAnimationFrame(spin);
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  // standaard-uitsnede per poster: size = vergroting, pos = welk deel in hoogte (0 boven – 1 onder), rot = draaien in graden
  // Kader, Platform en Blokken groot en kloek; Patroon en Kantelpunt vullen het papier precies
  const POSTERS = {
    kader:     { size: 1.6,  pos: .10, rot: 38 }, // tekst begint links op de zuil en loopt rechts om de ronding weg
    platform2: { size: 1.45, pos: .48, rot: -4 },
    pattern:   { size: 1,    pos: .5,  rot: 0 },
    tipping:   { size: 1,    pos: .5,  rot: 0 },
    blok:      { size: 1.65, pos: .5,  rot: 0 },
  };

  window.TIPBUS = { G, POSTERS, spanFor, render, loadImg, loadSvgPoster, dragRotate };
})();

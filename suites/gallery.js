/* TYR suite: "Gallery" -- the archive as pictures instead of prose.
 *
 * Every other suite on this hub explains itself at length. This one does not
 * explain anything: the whole page is under a hundred rendered words. What is
 * on it is a set of images whose SHAPE is the data. Nothing here is
 * decoration, and nothing here is random.
 *
 * Determinism. Every drawing is a pure function of the row it came from. The
 * only pseudo-random quantity anywhere is the starting angle of a match
 * portrait, and that is FNV-1a of the match id, so the same match draws the
 * same picture on every visit, on every machine. There is no Math.random in
 * this file. That is what makes a portrait a fingerprint rather than an
 * ornament: two portraits that look alike came from matches that were alike.
 *
 * What each image encodes, since the page itself will not tell you:
 *
 *   Match portrait   hue          = map
 *                    rotation     = hash of the match id (identity, not data)
 *                    ring radius  = duration
 *                    ring style   = solid elimination / dashed capture /
 *                                   faint when the archive has no result
 *                    16 spokes    = one per player, length = damage,
 *                                   team 0 is the first contiguous half and
 *                                   team 1 the second, winners bright and
 *                                   losers dim
 *                    outer arc    = how one sided it was, by team damage
 *                    core disc    = total kills
 *                    (enlarged only) tip dots = that player's kills
 *
 *   Map plate        one spoke per match on that map, sorted by duration so
 *                    the silhouette IS the duration distribution. Spoke
 *                    length = duration, width = total damage, tip = kills,
 *                    pale spokes were capture wins. The thin arc is that
 *                    map's mean duration, and all six plates share one radial
 *                    scale so they can be compared by eye.
 *
 *   Tank sigil       rings        = class (1 light, 2 medium, 3 heavy)
 *                    ring width   = games played (measured)
 *                    gauge arc    = win rate (measured), from the top tick
 *                    star radius  = hit points (published)
 *                    star points  = shell damage (published)
 *                    star notch   = penetration (published)
 *                    star twist   = speed, read against the top tick
 *                    star opacity = camouflage, faint means hidden
 *                    rim dots     = difficulty, 1 to 5
 *                    core disc    = measured average damage
 *
 *   Colour field     one cell per match, chronological, row major. Hue,
 *                    saturation and lightness each carry a different stat and
 *                    the three of them rotate on click. The key strip under
 *                    it names which is which.
 *
 *   Season           one column per match, chronological. Winners stacked up
 *                    from the midline, losers down, one segment per player,
 *                    height = damage, colour = tank. The band on the midline
 *                    is the map.
 *
 * Sources: T.DATA.matches (308 rows, 305 of them with a full sixteen players,
 * 16 with no recorded winner), T.DATA.tanks (17 measured), T.OFFICIAL.byTank
 * (17 published), T.DATA.maps (6). No per-match files are fetched, so the
 * page costs one paint and no network.
 *
 * Cost. The 308 portrait wall, the colour field and the season strip are each
 * a single canvas painted once. There is no requestAnimationFrame anywhere in
 * this file and no per-frame work of any kind, so nothing keeps running after
 * you navigate away.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var ACC = "#a06bff";
  var TAU = Math.PI * 2;

  var CSS = "" +
    ".gal-wrap{display:flex;flex-direction:column;gap:10px}" +
    ".gal-btns{display:flex;flex-wrap:wrap;gap:6px;align-items:center}" +
    ".gal-btn{background:transparent;border:1px solid var(--border);border-radius:999px;color:var(--dim);font:inherit;font-size:.76rem;letter-spacing:.03em;padding:4px 13px;cursor:pointer;line-height:1.5}" +
    ".gal-btn:hover{border-color:" + ACC + ";color:var(--text)}" +
    ".gal-btn.gal-on{background:rgba(160,107,255,.2);border-color:" + ACC + ";color:#e7dbff}" +
    ".gal-row{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}" +
    ".gal-focus{flex:0 0 auto;width:224px;height:224px;border:1px solid var(--border);border-radius:14px;background:radial-gradient(125% 125% at 50% 4%,#161d3a,#0c1124);display:block}" +
    // Below about 700px a 22 wide grid of portraits would shrink to specks, so
    // the wide images pan inside their own scroller rather than the page.
    ".gal-scroll{overflow-x:auto;overflow-y:hidden;max-width:100%}" +
    ".gal-scroll.gal-grow{flex:1 1 400px;min-width:0}" +
    ".gal-wallwrap{position:relative;min-width:470px;line-height:0}" +
    ".gal-wall,.gal-hi{width:100%;height:auto;display:block;border-radius:11px}" +
    ".gal-wall{background:#0c1124;border:1px solid var(--border);cursor:crosshair}" +
    ".gal-hi{position:absolute;left:0;top:0;pointer-events:none}" +
    ".gal-plates{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}" +
    ".gal-plate{background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:9px 9px 7px;transition:border-color .16s ease,box-shadow .16s ease}" +
    ".gal-plate:hover{border-color:var(--gc,#a06bff);box-shadow:0 10px 26px -14px var(--gc,#a06bff)}" +
    ".gal-plate svg{width:100%;height:auto;display:block}" +
    ".gal-plate b{display:block;text-align:center;font-size:.73rem;font-weight:600;color:var(--text);letter-spacing:.05em;margin-top:5px}" +
    ".gal-sigils{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}" +
    ".gal-sig{background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:7px 5px 6px;text-align:center;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}" +
    ".gal-sig:hover{transform:scale(1.1);border-color:var(--gc,#a06bff);box-shadow:0 12px 28px -12px var(--gc,#a06bff);position:relative;z-index:3}" +
    ".gal-sig svg{width:100%;height:auto;display:block}" +
    ".gal-sig b{display:block;font-size:.71rem;font-weight:600;color:var(--text);letter-spacing:.05em;margin-top:3px}" +
    ".gal-field{width:100%;min-width:430px;height:auto;display:block;border-radius:11px;border:1px solid var(--border);cursor:pointer}" +
    ".gal-keys{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}" +
    ".gal-key{display:flex;flex-direction:column;gap:4px;min-width:82px}" +
    ".gal-keybar{height:9px;border-radius:3px;border:1px solid rgba(35,44,82,.9)}" +
    ".gal-key span{font-size:.71rem;color:var(--dim);letter-spacing:.05em}" +
    ".gal-strip{width:100%;min-width:620px;height:auto;display:block;border-radius:11px;border:1px solid var(--border);background:#0c1124}" +
    ".gal-axis{display:flex;justify-content:space-between;align-items:center;font-size:.71rem;color:var(--dim);letter-spacing:.05em}" +
    ".gal-axis i{font-style:normal;flex:1 1 auto;text-align:center;color:rgba(127,137,179,.6)}";

  /* ------------------------------------------------------------------ *
   * numbers and colour
   * ------------------------------------------------------------------ */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  // Geometry to one decimal, opacity to two. The tile preview is 300 nodes of
  // SVG string and full precision doubles its size for no visible gain.
  function f1(n) { return Math.round(n * 10) / 10; }
  function f2(n) { return Math.round(n * 100) / 100; }

  // FNV-1a. The only source of pseudo-randomness on the page, and it is a
  // pure function of the match id, so a portrait never changes.
  function hash32(s) {
    var h = 2166136261, i;
    s = String(s == null ? "" : s);
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function rgbOf(hex) {
    var s = String(hex || "#808898").replace("#", "");
    if (s.length === 3) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    if (s.length < 6) s = "808898";
    return [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
  }

  function hexOf(r, g, b) {
    function p(v) { var t = clamp(Math.round(v), 0, 255).toString(16); return t.length < 2 ? "0" + t : t; }
    return "#" + p(r) + p(g) + p(b);
  }

  // Toward white. Used to keep every mark well clear of the panel colour;
  // the raw tank palette sits near 2.9:1 on #10162e and that is too close.
  function lighten(hex, t) {
    var c = rgbOf(hex);
    return hexOf(c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t);
  }

  var MAP_COL = {
    "Ravine": "#f2933a",
    "Wind Valley": "#a17bf5",
    "Fields": "#7ecb57",
    "Scorch": "#ef5a49",
    "Divide": "#43bde8",
    "Expanse": "#ee6bbf"
  };
  var MAP_HUE = { "Ravine": 30, "Wind Valley": 264, "Fields": 100, "Scorch": 6, "Divide": 194, "Expanse": 320 };
  var MAP_ORDER = ["Ravine", "Wind Valley", "Fields", "Scorch", "Divide", "Expanse"];

  function mapCol(n) { return MAP_COL[n] || "#8c9ac4"; }

  /* ------------------------------------------------------------------ *
   * drawing primitives
   *
   * One geometry pass produces a list of ops; two tiny back ends paint them,
   * one to canvas (the 308 wall, the enlargement) and one to an SVG string
   * (the tile preview, the map plates, the tank sigils). Writing the shapes
   * twice is how they drift apart.
   * ------------------------------------------------------------------ */

  function opDisc(x, y, r, c, a) { return { t: 1, x: x, y: y, r: r, c: c, a: a }; }
  function opRing(x, y, r, c, a, w, d) { return { t: 2, x: x, y: y, r: r, c: c, a: a, w: w, d: d }; }
  function opArc(x, y, r, s, e, c, a, w) { return { t: 3, x: x, y: y, r: r, s: s, e: e, c: c, a: a, w: w }; }
  function opLine(x, y, x2, y2, c, a, w) { return { t: 4, x: x, y: y, x2: x2, y2: y2, c: c, a: a, w: w }; }
  function opPoly(p, fc, fa, sc, sa, w) { return { t: 5, p: p, fc: fc, fa: fa, sc: sc, sa: sa, w: w }; }

  function paintOps(ctx, ops, cx, cy, s, wm) {
    var i, o, x, y, r, w;
    wm = wm || 1;
    ctx.lineCap = "round";
    for (i = 0; i < ops.length; i++) {
      o = ops[i];
      x = cx + o.x * s; y = cy + o.y * s;
      w = Math.max(0.45, (o.w || 1) * s * wm);
      ctx.globalAlpha = o.a === undefined ? 1 : o.a;
      if (o.t === 1) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.35, o.r * s), 0, TAU);
        ctx.fillStyle = o.c; ctx.fill();
      } else if (o.t === 2) {
        r = Math.max(0.35, o.r * s);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.strokeStyle = o.c; ctx.lineWidth = w;
        if (o.d) ctx.setLineDash([o.d * s, o.d * s * 0.8]);
        ctx.stroke();
        if (o.d) ctx.setLineDash([]);
      } else if (o.t === 3) {
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.35, o.r * s), o.s, o.e);
        ctx.strokeStyle = o.c; ctx.lineWidth = w; ctx.stroke();
      } else if (o.t === 4) {
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(cx + o.x2 * s, cy + o.y2 * s);
        ctx.strokeStyle = o.c; ctx.lineWidth = w; ctx.stroke();
      } else if (o.t === 5) {
        ctx.beginPath();
        for (r = 0; r < o.p.length; r++) {
          if (r === 0) ctx.moveTo(cx + o.p[r][0] * s, cy + o.p[r][1] * s);
          else ctx.lineTo(cx + o.p[r][0] * s, cy + o.p[r][1] * s);
        }
        ctx.closePath();
        if (o.fc) { ctx.globalAlpha = o.fa; ctx.fillStyle = o.fc; ctx.fill(); }
        if (o.sc) { ctx.globalAlpha = o.sa; ctx.strokeStyle = o.sc; ctx.lineWidth = w; ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
  }

  function arcPath(cx, cy, r, a0, a1) {
    var d = a1 - a0;
    if (d > TAU * 0.995) d = TAU * 0.995;
    a1 = a0 + d;
    return "M" + f1(cx + Math.cos(a0) * r) + " " + f1(cy + Math.sin(a0) * r) +
      "A" + f1(r) + " " + f1(r) + " 0 " + (Math.abs(d) > Math.PI ? 1 : 0) + " " +
      (d > 0 ? 1 : 0) + " " + f1(cx + Math.cos(a1) * r) + " " + f1(cy + Math.sin(a1) * r);
  }

  function opsToSvg(ops, cx, cy, s, wm) {
    var out = [], i, o, x, y, w, pts, k;
    wm = wm || 1;
    for (i = 0; i < ops.length; i++) {
      o = ops[i];
      x = cx + o.x * s; y = cy + o.y * s;
      w = Math.max(0.3, (o.w || 1) * s * wm);
      if (o.t === 1) {
        out.push('<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(Math.max(0.3, o.r * s)) +
          '" fill="' + o.c + '" opacity="' + f2(o.a) + '"/>');
      } else if (o.t === 2) {
        out.push('<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(Math.max(0.3, o.r * s)) +
          '" fill="none" stroke="' + o.c + '" stroke-width="' + f1(w) + '" opacity="' + f2(o.a) + '"' +
          (o.d ? ' stroke-dasharray="' + f1(o.d * s) + " " + f1(o.d * s * 0.8) + '"' : "") + "/>");
      } else if (o.t === 3) {
        out.push('<path d="' + arcPath(x, y, Math.max(0.3, o.r * s), o.s, o.e) +
          '" fill="none" stroke="' + o.c + '" stroke-width="' + f1(w) +
          '" stroke-linecap="round" opacity="' + f2(o.a) + '"/>');
      } else if (o.t === 4) {
        out.push('<line x1="' + f1(x) + '" y1="' + f1(y) + '" x2="' + f1(cx + o.x2 * s) +
          '" y2="' + f1(cy + o.y2 * s) + '" stroke="' + o.c + '" stroke-width="' + f1(w) +
          '" stroke-linecap="round" opacity="' + f2(o.a) + '"/>');
      } else if (o.t === 5) {
        pts = [];
        for (k = 0; k < o.p.length; k++) pts.push(f1(cx + o.p[k][0] * s) + "," + f1(cy + o.p[k][1] * s));
        out.push('<polygon points="' + pts.join(" ") + '" fill="' + (o.fc || "none") +
          '" fill-opacity="' + f2(o.fa || 0) + '" stroke="' + (o.sc || "none") +
          '" stroke-width="' + f1(w) + '" stroke-opacity="' + f2(o.sa || 0) +
          '" stroke-linejoin="round"/>');
      }
    }
    return out.join("");
  }

  /* ------------------------------------------------------------------ *
   * the model
   * ------------------------------------------------------------------ */

  var MODEL = null;

  function model(T) {
    if (MODEL) return MODEL;
    var raw = (T && T.DATA && T.DATA.matches) || [];
    var ms = [], i, j, m, p, n, t0, t1, k, a, b, tot;
    var maxDur = 1, maxDmg = 1, maxTeam = 1;
    for (i = 0; i < raw.length; i++) {
      m = raw[i];
      if (!m || !m.players || !m.players.length) continue;
      n = m.players.length; t0 = 0; t1 = 0; k = 0; a = []; b = [];
      for (j = 0; j < n; j++) {
        p = m.players[j];
        if (!p) continue;
        k += p.kills || 0;
        if (p.team === 1) { t1 += p.dmg || 0; b.push(p); }
        else { t0 += p.dmg || 0; a.push(p); }
      }
      tot = t0 + t1;
      a.sort(byDmg); b.sort(byDmg);
      ms.push({
        id: m.match_id || m.guid || ("m" + i),
        map: m.map || "",
        dur: m.duration_sec || 0,
        win: (m.winning_team === 0 || m.winning_team === 1) ? m.winning_team : -1,
        wt: m.win_type || "",
        t: m.captured_unix || 0,
        kills: k,
        dmg: tot,
        margin: tot ? Math.abs(t0 - t1) / tot : 0,
        a: a, b: b
      });
      if (m.duration_sec > maxDur) maxDur = m.duration_sec;
      if (tot > maxDmg) maxDmg = tot;
      if (t0 > maxTeam) maxTeam = t0;
      if (t1 > maxTeam) maxTeam = t1;
    }
    ms.sort(function (x, y) { return x.t - y.t; });
    MODEL = { matches: ms, maxDur: maxDur || 1, maxDmg: maxDmg || 1, maxTeam: maxTeam || 1 };
    return MODEL;
  }

  function byDmg(x, y) { return (y.dmg || 0) - (x.dmg || 0); }

  /* ------------------------------------------------------------------ *
   * the match portrait
   * ------------------------------------------------------------------ */

  var DESIGN = 48;          // half extent of a portrait in local units
  var DMG_REF = 5200;       // a player at or above this gets the longest spoke
  var DUR_REF = 640;        // the longest match in the archive is 629 seconds

  function portrait(m, detail) {
    var col = mapCol(m.map);
    var bright = lighten(col, 0.42);
    var pale = lighten(col, 0.66);
    var ops = [];
    var rot = (hash32(m.id) % 4096) / 4096 * TAU;
    var R = 14 + 27 * Math.sqrt(clamp(m.dur, 30, DUR_REF) / DUR_REF);
    var order = m.a.concat(m.b);
    var n = order.length || 1;
    var i, p, ang, L, c, al, w, side, core;

    ops.push(opDisc(0, 0, 45, col, 0.16));

    for (i = 0; i < n; i++) {
      p = order[i];
      ang = rot + i * TAU / n;
      L = 4 + 32 * Math.sqrt(clamp(p.dmg || 0, 0, DMG_REF) / DMG_REF);
      side = m.win === -1 ? 0 : (((p.team === 1 ? 1 : 0) === m.win) ? 1 : -1);
      if (side === 1) { c = bright; al = 0.95; w = 2.0; }
      else if (side === -1) { c = col; al = 0.42; w = 1.3; }
      else { c = col; al = 0.62; w = 1.5; }
      ops.push(opLine(Math.cos(ang) * 5, Math.sin(ang) * 5,
        Math.cos(ang) * (5 + L), Math.sin(ang) * (5 + L), c, al, w));
      if (detail && (p.kills || 0) > 0) {
        ops.push(opDisc(Math.cos(ang) * (5 + L + 2.4), Math.sin(ang) * (5 + L + 2.4),
          clamp(1 + 0.85 * (p.kills || 0), 1, 3.2), pale, 0.92));
      }
    }

    if (m.wt === "capture") ops.push(opRing(0, 0, R, bright, 0.9, 1.7, 3.4));
    else if (m.wt === "elimination") ops.push(opRing(0, 0, R, bright, 0.78, 1.3, 0));
    else ops.push(opRing(0, 0, R, col, 0.34, 0.9, 0));

    var sweep = clamp(m.margin, 0, 0.72) / 0.72 * TAU * 0.94;
    if (sweep > 0.03) ops.push(opArc(0, 0, R + 4.4, rot, rot + sweep, pale, 0.92, 2.6));

    core = 2.2 + 5.4 * clamp(m.kills, 0, 16) / 16;
    ops.push(opDisc(0, 0, core, pale, 0.95));
    if (detail) ops.push(opRing(0, 0, core + 2.6, bright, 0.5, 0.9, 0));
    return ops;
  }

  /* ------------------------------------------------------------------ *
   * the tile preview: twelve real portraits, spread across the archive
   *
   * The tile is dimmed to 0.62 and the caption scrim eats the bottom third,
   * so the grid is 4 x 3 in the top 150 rows only, the strokes are widened,
   * and every mark is a lightened map colour. Measured after dimming: the
   * brightest marks land near 6:1 against #10162e.
   * ------------------------------------------------------------------ */

  function preview(T) {
    var M;
    try { M = model(T); } catch (e) { return ""; }
    var ms = M.matches;
    if (!ms.length) return "";
    var cols = 4, rows = 3, cw = 58, ch = 49.5, x0 = 4, y0 = 2;
    var s = 24.75 * 0.99 / DESIGN;
    var body = "", i, idx, r, c;
    for (i = 0; i < cols * rows; i++) {
      idx = Math.round(i * (ms.length - 1) / (cols * rows - 1));
      r = Math.floor(i / cols); c = i % cols;
      body += opsToSvg(portrait(ms[idx], false),
        x0 + c * cw + cw / 2, y0 + r * ch + ch / 2, s, 2);
    }
    return '<svg viewBox="0 0 240 240">' + body + "</svg>";
  }

  /* ------------------------------------------------------------------ *
   * panel one: the wall
   * ------------------------------------------------------------------ */

  var COLS = 22, ROWS = 14, CELL = 60;

  var SORTS = [
    { k: "time", f: function (x, y) { return x.t - y.t; } },
    { k: "length", f: function (x, y) { return x.dur - y.dur; } },
    { k: "kills", f: function (x, y) { return y.kills - x.kills; } },
    {
      k: "map", f: function (x, y) {
        var d = mapRank(x.map) - mapRank(y.map);
        return d || (x.t - y.t);
      }
    },
    { k: "gap", f: function (x, y) { return x.margin - y.margin; } }
  ];

  function mapRank(n) {
    var i = MAP_ORDER.indexOf(n);
    return i < 0 ? 99 : i;
  }

  function wallBody() {
    var btns = "", i;
    for (i = 0; i < SORTS.length; i++) {
      btns += '<button type="button" class="gal-btn' + (i === 0 ? " gal-on" : "") +
        '" data-wsort="' + SORTS[i].k + '">' + SORTS[i].k + "</button>";
    }
    return '<div class="gal-wrap"><div class="gal-btns">' + btns + "</div>" +
      '<div class="gal-row">' +
      '<canvas class="gal-focus" id="gal-focus" width="440" height="440"></canvas>' +
      '<div class="gal-scroll gal-grow"><div class="gal-wallwrap">' +
      '<canvas class="gal-wall" id="gal-wall" width="' + (COLS * CELL) + '" height="' + (ROWS * CELL) + '"></canvas>' +
      '<canvas class="gal-hi" id="gal-hi" width="' + (COLS * CELL) + '" height="' + (ROWS * CELL) + '"></canvas>' +
      "</div></div></div></div>";
  }

  /* ------------------------------------------------------------------ *
   * panel two: one plate per map
   * ------------------------------------------------------------------ */

  function plateSvg(list, name, durRef) {
    // Spokes sorted by duration, so the outline is the duration distribution
    // of that map. All plates share durRef, so their sizes compare.
    var col = mapCol(name);
    var bright = lighten(col, 0.36);
    var pale = lighten(col, 0.66);
    var cx = 65, cy = 64, r0 = 6, span = 52;
    var a0 = -Math.PI + 0.30, a1 = -0.30;
    var n = list.length, i, m, t, ang, r, w, out = "", sum = 0;
    var sorted = list.slice().sort(function (x, y) { return x.dur - y.dur; });

    for (i = 0; i < n; i++) sum += sorted[i].dur;
    var mean = n ? sum / n : 0;

    out += '<path d="' + arcPath(cx, cy, r0 + span * clamp(mean, 0, durRef) / durRef, a0, a1) +
      '" fill="none" stroke="' + pale + '" stroke-width="0.8" opacity="0.42"/>';

    for (i = 0; i < n; i++) {
      m = sorted[i];
      t = n > 1 ? i / (n - 1) : 0.5;
      ang = a0 + (a1 - a0) * t;
      r = r0 + span * clamp(m.dur, 0, durRef) / durRef;
      w = 0.7 + 1.7 * clamp(m.dmg, 4000, 26000) / 26000;
      var c = m.win === -1 ? col : (m.wt === "capture" ? pale : bright);
      var al = m.win === -1 ? 0.3 : 0.9;
      out += '<line x1="' + f1(cx + Math.cos(ang) * r0) + '" y1="' + f1(cy + Math.sin(ang) * r0) +
        '" x2="' + f1(cx + Math.cos(ang) * r) + '" y2="' + f1(cy + Math.sin(ang) * r) +
        '" stroke="' + c + '" stroke-width="' + f2(w) + '" stroke-linecap="round" opacity="' + al + '"/>';
      if (m.kills > 0) {
        out += '<circle cx="' + f1(cx + Math.cos(ang) * (r + 1.6)) + '" cy="' +
          f1(cy + Math.sin(ang) * (r + 1.6)) + '" r="' + f2(0.5 + 0.085 * m.kills) +
          '" fill="' + pale + '" opacity="0.85"/>';
      }
    }
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="2.6" fill="' + pale + '" opacity="0.9"/>';
    return '<svg viewBox="0 0 130 70">' + out + "</svg>";
  }

  function platesBody(T, M) {
    var by = {}, i, m, out = "";
    for (i = 0; i < M.matches.length; i++) {
      m = M.matches[i];
      if (!by[m.map]) by[m.map] = [];
      by[m.map].push(m);
    }
    var names = MAP_ORDER.filter(function (n) { return by[n] && by[n].length; });
    for (i = 0; i < names.length; i++) {
      out += '<div class="gal-plate" style="--gc:' + mapCol(names[i]) + '">' +
        plateSvg(by[names[i]], names[i], DUR_REF) +
        "<b>" + T.esc(names[i]) + "</b></div>";
    }
    return '<div class="gal-plates">' + out + "</div>";
  }

  /* ------------------------------------------------------------------ *
   * panel three: one sigil per tank
   * ------------------------------------------------------------------ */

  var SIG_SORTS = [
    { k: "games", f: function (x, y) { return (y.mg || 0) - (x.mg || 0); } },
    { k: "hp", f: function (x, y) { return (y.hp || 0) - (x.hp || 0); } },
    { k: "wins", f: function (x, y) { return (y.wr || 0) - (x.wr || 0); } }
  ];

  function tankRows(T) {
    var meas = (T.DATA && T.DATA.tanks) || [];
    var byT = (T.OFFICIAL && T.OFFICIAL.byTank) || {};
    var off = (T.OFFICIAL && T.OFFICIAL.tanks) || [];
    var i, o, m, rows = [];
    if (!T.OFFICIAL || !T.OFFICIAL.byTank) {
      byT = {};
      for (i = 0; i < off.length; i++) byT[off[i].tank] = off[i];
    }
    var maxGames = 1;
    for (i = 0; i < meas.length; i++) if ((meas[i].games || 0) > maxGames) maxGames = meas[i].games;
    for (i = 0; i < meas.length; i++) {
      m = meas[i];
      o = byT[m.tank];
      if (!o) continue;
      rows.push({
        name: m.tank,
        cls: o["class"] || "Medium",
        hp: o.hp || 1000,
        sdmg: o.dmg || 200,
        pen: o.pen || 70,
        spd: o.spd || 45,
        camo: o.camo || 0,
        diff: o.difficulty || 1,
        mg: m.games || 0,
        gShare: (m.games || 0) / maxGames,
        wr: m.winrate || 50,
        adm: (m.avg && m.avg.dmg) || 0,
        col: lighten(T.tankColor(m.tank) || "#5c6f9a", 0.34)
      });
    }
    return rows;
  }

  function sigilSvg(r) {
    var col = r.col;
    var bright = lighten(col, 0.3);
    var pale = lighten(col, 0.6);
    var ops = [];
    var rings = r.cls === "Heavy" ? 3 : (r.cls === "Medium" ? 2 : 1);
    var i, k;

    for (i = 0; i < rings; i++) {
      ops.push(opRing(0, 0, 46 - i * 3.6, col, 0.5, 0.7 + (i === 0 ? 1.6 * r.gShare : 0), 0));
    }
    // win rate, swept clockwise from the top tick
    var wr = clamp((r.wr - 38) / 30, 0, 1);
    ops.push(opArc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + wr * TAU * 0.97, pale, 0.95, 2.3));
    ops.push(opLine(0, -49.5, 0, -41, "#d6dcf5", 0.6, 1.1));

    // difficulty, as a tally along the bottom
    for (k = 0; k < r.diff; k++) {
      var da = Math.PI / 2 + (k - (r.diff - 1) / 2) * 0.17;
      ops.push(opDisc(Math.cos(da) * 39.5, Math.sin(da) * 39.5, 1.5, pale, 0.9));
    }

    var R = 15 + 20 * clamp((r.hp - 800) / 1300, 0, 1);
    var pts = 3 + Math.round(9 * clamp((r.sdmg - 85) / 315, 0, 1));
    var inner = 0.34 + 0.36 * clamp((r.pen - 50) / 50, 0, 1);
    var twist = clamp((r.spd - 23) / 42, 0, 1) * (Math.PI / pts);
    var poly = [];
    for (i = 0; i < pts * 2; i++) {
      var rr = (i % 2 === 0) ? R : R * inner;
      var aa = -Math.PI / 2 + twist + i * Math.PI / pts;
      poly.push([Math.cos(aa) * rr, Math.sin(aa) * rr]);
    }
    var fa = 0.75 - 0.41 * clamp(r.camo / 42, 0, 1);
    ops.push(opPoly(poly, col, fa, bright, 0.95, 1.5));

    ops.push(opDisc(0, 0, 3 + 9 * clamp((r.adm - 700) / 1150, 0, 1), pale, 0.95));
    return '<svg viewBox="-50 -50 100 100">' + opsToSvg(ops, 0, 0, 1, 1) + "</svg>";
  }

  function sigilsHtml(T, rows) {
    var out = "", i;
    for (i = 0; i < rows.length; i++) {
      out += '<div class="gal-sig" style="--gc:' + rows[i].col + '">' + sigilSvg(rows[i]) +
        "<b>" + T.esc(rows[i].name) + "</b></div>";
    }
    return out;
  }

  function sigilsBody(T, rows) {
    var btns = "", i;
    for (i = 0; i < SIG_SORTS.length; i++) {
      btns += '<button type="button" class="gal-btn' + (i === 0 ? " gal-on" : "") +
        '" data-ssort="' + SIG_SORTS[i].k + '">' + SIG_SORTS[i].k + "</button>";
    }
    var sorted = rows.slice().sort(SIG_SORTS[0].f);
    return '<div class="gal-wrap"><div class="gal-btns">' + btns + "</div>" +
      '<div class="gal-sigils" id="gal-sigils">' + sigilsHtml(T, sorted) + "</div></div>";
  }

  /* ------------------------------------------------------------------ *
   * panel four: the colour field
   * ------------------------------------------------------------------ */

  var FCOLS = 28, FROWS = 11, FCELL = 50;

  // Three stats at a time, one per channel, rotated on click.
  var CHAN = [
    ["map", "gap", "damage"],
    ["length", "kills", "damage"],
    ["damage", "length", "gap"],
    ["gap", "damage", "kills"]
  ];

  function statVal(key, m, M) {
    if (key === "length") return clamp(m.dur / DUR_REF, 0, 1);
    if (key === "kills") return clamp(m.kills / 16, 0, 1);
    if (key === "damage") return clamp(m.dmg / M.maxDmg, 0, 1);
    if (key === "gap") return clamp(m.margin / 0.7, 0, 1);
    return clamp(mapRank(m.map) / 5, 0, 1);
  }

  function cellColor(m, M, keys) {
    var hue;
    if (keys[0] === "map") hue = MAP_HUE[m.map] === undefined ? 220 : MAP_HUE[m.map];
    else hue = 212 - statVal(keys[0], m, M) * 176;
    var sat = 16 + statVal(keys[1], m, M) * 72;
    // The floor keeps the darkest cell above 2:1 against the panel, so an
    // empty looking corner is a real low value and not an unreadable one.
    var lig = 37 + statVal(keys[2], m, M) * 42;
    return "hsl(" + Math.round(hue) + "," + Math.round(sat) + "%," + Math.round(lig) + "%)";
  }

  function fieldBody() {
    return '<div class="gal-wrap">' +
      '<div class="gal-scroll"><canvas class="gal-field" id="gal-field" width="' +
      (FCOLS * FCELL) + '" height="' + (FROWS * FCELL) + '"></canvas></div>' +
      '<div class="gal-keys">' +
      '<button type="button" class="gal-btn" id="gal-cyc" aria-label="rotate">&#8635;</button>' +
      '<div class="gal-key"><div class="gal-keybar" style="background:linear-gradient(90deg,#43bde8,#7ecb57,#f2c14a,#ef5a49,#ee6bbf)"></div><span id="gal-k0">' + CHAN[0][0] + "</span></div>" +
      '<div class="gal-key"><div class="gal-keybar" style="background:linear-gradient(90deg,#6d7594,#a06bff)"></div><span id="gal-k1">' + CHAN[0][1] + "</span></div>" +
      '<div class="gal-key"><div class="gal-keybar" style="background:linear-gradient(90deg,#2a3358,#e4eaff)"></div><span id="gal-k2">' + CHAN[0][2] + "</span></div>" +
      "</div></div>";
  }

  /* ------------------------------------------------------------------ *
   * panel five: the season as one image
   * ------------------------------------------------------------------ */

  var SW = 6, SH = 560, SMID = 282, SARM = 236;

  function shortDate(u) {
    if (!u) return "";
    try {
      return new Date(u * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) { return ""; }
  }

  function seasonBody(T, M) {
    var ms = M.matches;
    var a = ms.length ? shortDate(ms[0].t) : "";
    var b = ms.length ? shortDate(ms[ms.length - 1].t) : "";
    return '<div class="gal-wrap">' +
      '<div class="gal-scroll"><canvas class="gal-strip" id="gal-strip" width="' +
      (ms.length * SW) + '" height="' + SH + '"></canvas></div>' +
      '<div class="gal-axis"><span>' + T.esc(a) + "</span><i>&#8594;</i><span>" + T.esc(b) + "</span></div></div>";
  }

  function drawSeason(T, ctx, M) {
    var ms = M.matches, i, j, x, y, p, h;
    var k = SARM / (M.maxTeam || 1);
    var tc = {};
    function tankCol(n) {
      if (!tc[n]) tc[n] = lighten(T.tankColor(n) || "#5c6f9a", 0.34);
      return tc[n];
    }
    ctx.clearRect(0, 0, ms.length * SW, SH);
    for (i = 0; i < ms.length; i++) {
      x = i * SW;
      var m = ms[i];
      var up = m.win === 1 ? m.b : m.a;
      var dn = m.win === 1 ? m.a : m.b;
      var dim = m.win === -1 ? 0.55 : 1;

      ctx.globalAlpha = dim;
      y = SMID - 4;
      for (j = 0; j < up.length; j++) {
        p = up[j];
        h = (p.dmg || 0) * k;
        ctx.fillStyle = tankCol(p.tank);
        ctx.fillRect(x + 0.5, y - h, SW - 1.4, Math.max(0.6, h - 0.7));
        y -= h;
      }
      y = SMID + 4;
      ctx.globalAlpha = dim * 0.55;
      for (j = 0; j < dn.length; j++) {
        p = dn[j];
        h = (p.dmg || 0) * k;
        ctx.fillStyle = tankCol(p.tank);
        ctx.fillRect(x + 0.5, y, SW - 1.4, Math.max(0.6, h - 0.7));
        y += h;
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = mapCol(m.map);
      ctx.fillRect(x + 0.5, SMID - 2.5, SW - 1.4, 5);
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ *
   * registration
   * ------------------------------------------------------------------ */

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "gallery",
    title: "Gallery",
    // No count here. A blurb is a fixed string on the hub tile, drawn before
    // the data loads, so a number in one goes stale the moment a replay lands.
    blurb: "Every match as a picture. Same match, same picture, every time.",
    accent: ACC,
    css: CSS,
    gated: false,

    preview: preview,

    render: function (T) {
      var M = model(T);
      if (!M.matches.length) return "";
      var rows = tankRows(T);
      return T.bigPanel("Match portraits", wallBody(), "") +
        T.bigPanel("Six maps", platesBody(T, M), "") +
        (rows.length ? T.bigPanel("Tank sigils", sigilsBody(T, rows), "") : "") +
        T.bigPanel("Colour field", fieldBody(), "") +
        T.bigPanel("One season", seasonBody(T, M), "");
    },

    wire: function (T, root) {
      var M = model(T);
      if (!M.matches.length) return;
      var ms = M.matches;

      function q(id) { return root.querySelector("#" + id); }
      function ctxOf(el) {
        if (!el || !el.getContext) return null;
        var c = null;
        try { c = el.getContext("2d"); } catch (e) { c = null; }
        return c;
      }

      /* ---- the wall ------------------------------------------------ */
      var wallEl = q("gal-wall"), hiEl = q("gal-hi"), focEl = q("gal-focus");
      var wallCtx = ctxOf(wallEl), hiCtx = ctxOf(hiEl), focCtx = ctxOf(focEl);
      var order = ms.slice();
      var pinId = null, hoverIdx = -1;
      var opsCache = {};

      function opsFor(m) {
        if (!opsCache[m.id]) opsCache[m.id] = portrait(m, false);
        return opsCache[m.id];
      }

      function drawWall() {
        if (!wallCtx) return;
        wallCtx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
        var s = (CELL / 2) * 0.97 / DESIGN;
        var i, r, c;
        for (i = 0; i < order.length && i < COLS * ROWS; i++) {
          r = Math.floor(i / COLS); c = i % COLS;
          paintOps(wallCtx, opsFor(order[i]), c * CELL + CELL / 2, r * CELL + CELL / 2, s, 1);
        }
      }

      function drawFocus(m) {
        if (!focCtx || !m) return;
        focCtx.clearRect(0, 0, 440, 440);
        paintOps(focCtx, portrait(m, true), 220, 220, 220 * 0.94 / DESIGN, 1);
      }

      function drawHi() {
        if (!hiCtx) return;
        hiCtx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
        function box(idx, col, w) {
          if (idx < 0 || idx >= order.length) return;
          var r = Math.floor(idx / COLS), c = idx % COLS;
          hiCtx.strokeStyle = col; hiCtx.lineWidth = w;
          hiCtx.strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
        }
        if (pinId !== null) {
          var pi = -1, i;
          for (i = 0; i < order.length; i++) if (order[i].id === pinId) { pi = i; break; }
          box(pi, ACC, 3);
        }
        if (hoverIdx >= 0) box(hoverIdx, "#e4eaff", 1.6);
      }

      function setSort(key) {
        var i, s = SORTS[0];
        for (i = 0; i < SORTS.length; i++) if (SORTS[i].k === key) s = SORTS[i];
        order = ms.slice().sort(s.f);
        drawWall(); drawHi();
      }

      // Open on the heaviest match in the archive, so the enlargement is
      // showing something before anyone touches it.
      var start = ms[0], si;
      for (si = 1; si < ms.length; si++) if (ms[si].dmg > start.dmg) start = ms[si];
      drawWall();
      drawFocus(start);
      drawHi();

      function cellAt(ev) {
        if (!wallEl || !wallEl.getBoundingClientRect) return -1;
        var b = wallEl.getBoundingClientRect();
        if (!b.width || !b.height) return -1;
        var c = Math.floor((ev.clientX - b.left) / b.width * COLS);
        var r = Math.floor((ev.clientY - b.top) / b.height * ROWS);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
        var i = r * COLS + c;
        return i < order.length ? i : -1;
      }

      if (wallEl) {
        wallEl.addEventListener("mousemove", function (ev) {
          var i = cellAt(ev);
          if (i === hoverIdx) return;
          hoverIdx = i;
          drawHi();
          if (i >= 0 && pinId === null) drawFocus(order[i]);
        });
        wallEl.addEventListener("mouseleave", function () {
          hoverIdx = -1;
          drawHi();
        });
        wallEl.addEventListener("click", function (ev) {
          var i = cellAt(ev);
          if (i < 0) { pinId = null; drawHi(); return; }
          hoverIdx = i;
          pinId = (pinId === order[i].id) ? null : order[i].id;
          drawFocus(order[i]);
          drawHi();
        });
      }

      /* ---- the colour field ---------------------------------------- */
      var fieldEl = q("gal-field");
      var fieldCtx = ctxOf(fieldEl);
      var chan = 0;

      function drawField() {
        if (!fieldCtx) return;
        var keys = CHAN[chan], i, r, c;
        fieldCtx.clearRect(0, 0, FCOLS * FCELL, FROWS * FCELL);
        for (i = 0; i < ms.length && i < FCOLS * FROWS; i++) {
          r = Math.floor(i / FCOLS); c = i % FCOLS;
          fieldCtx.fillStyle = cellColor(ms[i], M, keys);
          fieldCtx.fillRect(c * FCELL, r * FCELL, FCELL, FCELL);
        }
        for (i = 0; i < 3; i++) {
          var lab = q("gal-k" + i);
          if (lab) lab.textContent = keys[i];
        }
      }

      function cycle() {
        chan = (chan + 1) % CHAN.length;
        drawField();
      }

      drawField();
      if (fieldEl) fieldEl.addEventListener("click", cycle);
      var cyc = q("gal-cyc");
      if (cyc) cyc.addEventListener("click", cycle);

      /* ---- the season strip ---------------------------------------- */
      var stripCtx = ctxOf(q("gal-strip"));
      if (stripCtx) drawSeason(T, stripCtx, M);

      /* ---- sort buttons -------------------------------------------- */
      var rows = tankRows(T);
      var sigWrap = q("gal-sigils");

      root.addEventListener("click", function (ev) {
        var b = ev.target;
        while (b && b !== root && b.tagName !== "BUTTON") b = b.parentNode;
        if (!b || b === root || b.tagName !== "BUTTON") return;

        var ws = b.getAttribute("data-wsort");
        if (ws) {
          markOn(b, "data-wsort");
          setSort(ws);
          return;
        }
        var ss = b.getAttribute("data-ssort");
        if (ss && sigWrap) {
          markOn(b, "data-ssort");
          var i, s = SIG_SORTS[0];
          for (i = 0; i < SIG_SORTS.length; i++) if (SIG_SORTS[i].k === ss) s = SIG_SORTS[i];
          sigWrap.innerHTML = sigilsHtml(T, rows.slice().sort(s.f));
        }
      });

      function markOn(btn, attr) {
        var sibs = root.querySelectorAll("[" + attr + "]"), i;
        for (i = 0; i < sibs.length; i++) sibs[i].className = "gal-btn";
        btn.className = "gal-btn gal-on";
      }
    }
  });
})();

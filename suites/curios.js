/* Curiosities suite -- the odd-angle views of the Tyr replay archive.
 *
 * Self-contained. Reads only the T object the host hands in. Two panels run a
 * canvas simulation; both loops check document.body.contains() every frame and
 * stop the moment their canvas leaves the page.
 */
(function () {
  "use strict";

  var CSS = [
    ".cu-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}",
    ".cu-bar-lab{color:var(--dim,#7f89b3);font-size:.7rem;text-transform:uppercase;",
    "letter-spacing:.06em;font-weight:700}",
    ".cu-chip{-webkit-appearance:none;appearance:none;background:var(--panel2,#131a33);",
    "color:var(--fg,var(--text,#d6dcf5));border:1px solid var(--line,var(--border,#232c52));",
    "border-radius:999px;padding:4px 11px;font:inherit;font-size:.78rem;line-height:1.35;",
    "cursor:pointer}",
    ".cu-chip:hover{border-color:var(--accent,#65508a)}",
    ".cu-chip.cu-on{background:rgba(101,80,138,.32);border-color:var(--accent,#65508a);color:#e7ddff}",
    ".cu-range{width:132px;max-width:40vw;accent-color:var(--accent,#65508a);vertical-align:middle}",
    ".cu-cv{display:block;width:100%;border-radius:10px;background:rgba(0,0,0,.22);",
    "touch-action:none;cursor:crosshair}",
    ".cu-cv.cu-grab{cursor:grab}",
    ".cu-cv.cu-grabbing{cursor:grabbing}",
    ".cu-read{min-height:2.6em;margin-top:8px;font-size:.82rem;color:var(--dim,#7f89b3)}",
    ".cu-read b{color:var(--fg,var(--text,#d6dcf5));font-weight:600}",
    ".cu-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:.74rem;",
    "color:var(--dim,#7f89b3)}",
    ".cu-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;",
    "vertical-align:0}",
    ".cu-scroll{overflow-x:auto;padding-bottom:4px}",
    ".cu-per{display:flex;flex-direction:column;gap:7px;min-width:560px}",
    ".cu-perrow{display:flex;gap:6px;align-items:stretch}",
    ".cu-perlab{flex:0 0 52px;display:flex;align-items:center;font-size:.7rem;font-weight:700;",
    "letter-spacing:.06em;text-transform:uppercase;color:var(--dim,#7f89b3)}",
    ".cu-el{flex:1 1 0;min-width:0;border:1px solid var(--line,var(--border,#232c52));",
    "border-radius:8px;padding:7px 6px 6px;cursor:pointer;text-align:left;color:inherit;",
    "font:inherit;display:block}",
    ".cu-el:hover{border-color:var(--fg,var(--text,#d6dcf5))}",
    ".cu-el.cu-on{border-color:#fff;box-shadow:0 0 0 1px #fff inset}",
    ".cu-el-n{display:block;font-size:.6rem;color:var(--dim,#7f89b3);line-height:1}",
    ".cu-el-sym{display:block;font-size:1.05rem;font-weight:700;line-height:1.25;",
    "font-family:ui-monospace,Consolas,Menlo,monospace}",
    ".cu-el-v{display:block;font-size:.72rem;color:var(--dim,#7f89b3);line-height:1.2;",
    "font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".cu-det{margin-top:12px;padding:11px 13px;border:1px solid var(--line,var(--border,#232c52));",
    "border-radius:9px;background:var(--panel2,#131a33);font-size:.83rem}",
    ".cu-det h4{margin:0 0 4px;font-size:.95rem}",
    ".cu-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:5px 14px;",
    "margin-top:8px;font-variant-numeric:tabular-nums}",
    ".cu-kv i{font-style:normal;color:var(--dim,#7f89b3);display:block;font-size:.68rem;",
    "text-transform:uppercase;letter-spacing:.05em}",
    ".cu-svg{width:100%;height:auto;display:block}",
    ".cu-sigs{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}",
    ".cu-sig{background:none;border:1px solid transparent;border-radius:10px;padding:3px;",
    "cursor:pointer;color:inherit;font:inherit}",
    ".cu-sig:hover{background:rgba(255,255,255,.04)}",
    ".cu-sig.cu-on{border-color:var(--accent,#65508a);background:rgba(101,80,138,.16)}",
    ".cu-sig svg{width:100%;height:auto;display:block}",
    ".cu-sig em{display:block;font-style:normal;text-align:center;font-size:.68rem;",
    "color:var(--dim,#7f89b3);margin-top:1px;white-space:nowrap;overflow:hidden;",
    "text-overflow:ellipsis}",
    ".cu-duel{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}",
    ".cu-sel{background:var(--panel2,#131a33);color:var(--fg,var(--text,#d6dcf5));",
    "border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:5px 8px;",
    "font:inherit;font-size:.85rem;max-width:100%}",
    ".cu-verdict{margin-top:12px;font-size:.9rem}",
    ".cu-verdict b{font-size:1.05rem}"
  ].join("");

  /* ------------------------------------------------------------------ util */

  function has(v) { return v !== null && v !== undefined; }
  function fin(v) { return typeof v === "number" && isFinite(v); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* Lehmer PRNG. Deterministic so the hub tile never changes between loads. */
  function rng(seed) {
    var s = Math.floor(seed) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function hexRgb(hex) {
    var h = String(hex || "#888888").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return [136, 136, 136];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = hexRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }
  function mix(h1, h2, t) {
    var a = hexRgb(h1), b = hexRgb(h2), u = clamp(t, 0, 1);
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * u) + "," +
      Math.round(a[1] + (b[1] - a[1]) * u) + "," +
      Math.round(a[2] + (b[2] - a[2]) * u) + ")";
  }

  function listMap(list, key) {
    var out = {};
    (list || []).forEach(function (r) { out[r.label] = key ? r[key] : r.value; });
    return out;
  }

  function tankHue(T, name, i) {
    return T.tankColor(name) || T.CHART_COLORS[i % T.CHART_COLORS.length];
  }

  function officialOf(T, name) {
    var o = T.OFFICIAL;
    if (!o || !o.byTank) return null;
    return o.byTank[name] || null;
  }

  /* ------------------------------------------------- shared: encounter graph */

  /* Nodes are tanks. An edge between two tanks counts how many times a player
   * on one of them shared a match with a player on the other, on the OPPOSING
   * side. That is a literal "these two were in the same battle" count, taken
   * from the 297 match rosters, not from kills. Kill counts ride along on the
   * edge only so the readout can quote them; they never move anything. */
  function buildGraph(T) {
    var D = T.DATA || {};
    var tanks = D.tanks || [];
    var matches = D.matches || [];
    if (tanks.length < 4 || matches.length < 10) return null;

    var byName = {}, nodes = [], i, j;
    for (i = 0; i < tanks.length; i++) {
      byName[tanks[i].tank] = i;
      nodes.push({
        name: tanks[i].tank,
        games: tanks[i].games || 0,
        winrate: fin(tanks[i].winrate) ? tanks[i].winrate : null,
        color: tankHue(T, tanks[i].tank, i)
      });
    }
    var n = nodes.length;

    var meet = [], kills = [];
    for (i = 0; i < n; i++) {
      meet.push([]); kills.push([]);
      for (j = 0; j < n; j++) { meet[i].push(0); kills[i].push(0); }
    }

    var mirrorPairs = 0, mirrorMatches = 0, used = 0;
    for (var mi = 0; mi < matches.length; mi++) {
      var ps = matches[mi].players || [];
      if (ps.length < 2) continue;
      used++;
      var mirroredHere = 0;
      for (var a = 0; a < ps.length; a++) {
        var ia = byName[ps[a].tank];
        if (ia === undefined) continue;
        for (var b = a + 1; b < ps.length; b++) {
          if (ps[b].team === ps[a].team) continue;
          var ib = byName[ps[b].tank];
          if (ib === undefined) continue;
          if (ia === ib) { meet[ia][ia]++; continue; }
          meet[ia][ib]++; meet[ib][ia]++;
        }
      }
      var t0 = {}, t1 = {};
      for (var k = 0; k < ps.length; k++) {
        if (!has(ps[k].tank)) continue;
        if (ps[k].team === 0) t0[ps[k].tank] = 1; else if (ps[k].team === 1) t1[ps[k].tank] = 1;
      }
      for (var nm in t0) { if (t1[nm]) mirroredHere++; }
      mirrorPairs += mirroredHere;
      if (mirroredHere) mirrorMatches++;
    }

    var mm = (T.STATS || {}).tank_matchup_matrix;
    if (mm && mm.tanks && mm.counts) {
      for (i = 0; i < mm.tanks.length; i++) {
        var ri = byName[mm.tanks[i]];
        if (ri === undefined) continue;
        for (j = 0; j < mm.tanks.length; j++) {
          var ci = byName[mm.tanks[j]];
          if (ci === undefined) continue;
          var v = (mm.counts[i] || [])[j];
          if (fin(v)) kills[ri][ci] = v;
        }
      }
    }

    var edges = [], maxW = 0;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        if (meet[i][j] <= 0) continue;
        if (meet[i][j] > maxW) maxW = meet[i][j];
        edges.push({ a: i, b: j, w: meet[i][j], ka: kills[i][j], kb: kills[j][i] });
      }
    }
    if (!edges.length) return null;
    edges.sort(function (p, q) { return q.w - p.w; });
    edges.forEach(function (e) { e.wn = maxW ? e.w / maxW : 0; });

    return {
      nodes: nodes, edges: edges, meet: meet, kills: kills, maxW: maxW,
      matches: used, mirrorPairs: mirrorPairs, mirrorMatches: mirrorMatches
    };
  }

  /* Plain spring/repulsion relaxation in a square of side BOX. Nothing here is
   * a metric embedding: it is a compromise that puts often-paired tanks nearer
   * each other, and every panel note says so. */
  var BOX = 1000;

  function makeSim(g, seed, topEdges) {
    var rnd = rng(seed), i;
    var maxG = 1;
    for (i = 0; i < g.nodes.length; i++) maxG = Math.max(maxG, g.nodes[i].games);
    var pts = [];
    for (i = 0; i < g.nodes.length; i++) {
      var ang = (i / g.nodes.length) * Math.PI * 2 + rnd() * 0.9;
      var rad = BOX * (0.16 + rnd() * 0.22);
      pts.push({
        x: BOX / 2 + Math.cos(ang) * rad,
        y: BOX / 2 + Math.sin(ang) * rad,
        vx: 0, vy: 0, pinned: false,
        r: 12 + 26 * Math.sqrt(g.nodes[i].games / maxG)
      });
    }
    return { pts: pts, edges: g.edges.slice(0, topEdges), alpha: 1 };
  }

  function stepSim(sim, pull) {
    var pts = sim.pts, n = pts.length, i, j, dx, dy, d2, d, f;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        dx = pts[j].x - pts[i].x; dy = pts[j].y - pts[i].y;
        d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = (i % 2 ? 1 : -1) * 0.7; dy = 0.7; d2 = 1; }
        d = Math.sqrt(d2);
        f = 70 * (pts[i].r * pts[j].r) / d2;
        var minD = pts[i].r + pts[j].r + 14;
        if (d < minD) f += (minD - d) * 1.1;
        if (f > 26) f = 26;
        var ux = dx / d, uy = dy / d;
        pts[i].vx -= ux * f; pts[i].vy -= uy * f;
        pts[j].vx += ux * f; pts[j].vy += uy * f;
      }
    }
    for (i = 0; i < sim.edges.length; i++) {
      var e = sim.edges[i], p = pts[e.a], q = pts[e.b];
      dx = q.x - p.x; dy = q.y - p.y;
      d = Math.sqrt(dx * dx + dy * dy) || 1;
      var rest = 90 + (1 - e.wn) * BOX * 0.46;
      f = (d - rest) * 0.010 * (0.18 + 0.82 * e.wn) * pull;
      if (f > 22) f = 22; if (f < -22) f = -22;
      p.vx += dx / d * f; p.vy += dy / d * f;
      q.vx -= dx / d * f; q.vy -= dy / d * f;
    }
    for (i = 0; i < n; i++) {
      pts[i].vx += (BOX / 2 - pts[i].x) * 0.0035;
      pts[i].vy += (BOX / 2 - pts[i].y) * 0.0035;
      pts[i].vx *= 0.80; pts[i].vy *= 0.80;
      var sp = Math.sqrt(pts[i].vx * pts[i].vx + pts[i].vy * pts[i].vy);
      if (sp > 40) { pts[i].vx *= 40 / sp; pts[i].vy *= 40 / sp; }
      if (pts[i].pinned) { pts[i].vx = 0; pts[i].vy = 0; continue; }
      pts[i].x += pts[i].vx * sim.alpha;
      pts[i].y += pts[i].vy * sim.alpha;
    }
    sim.alpha *= 0.99;
    if (sim.alpha < 0.0015) sim.alpha = 0.0015;
  }

  /* Fit node centres (plus radii) into a w x h frame with padding. */
  function fitFrame(pts, w, h, pad) {
    var i, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < pts.length; i++) {
      x0 = Math.min(x0, pts[i].x - pts[i].r); x1 = Math.max(x1, pts[i].x + pts[i].r);
      y0 = Math.min(y0, pts[i].y - pts[i].r); y1 = Math.max(y1, pts[i].y + pts[i].r);
    }
    var sx = (w - pad * 2) / Math.max(1, x1 - x0);
    var sy = (h - pad * 2) / Math.max(1, y1 - y0);
    var s = Math.min(sx, sy);
    return {
      s: s,
      ox: pad + (w - pad * 2 - (x1 - x0) * s) / 2 - x0 * s,
      oy: pad + (h - pad * 2 - (y1 - y0) * s) / 2 - y0 * s
    };
  }

  /* ---------------------------------------------------------- panel: facts */

  function factsPanel(T) {
    var D = T.DATA || {}, S = T.STATS || {};
    var g = buildGraph(T);
    var cards = [], notes = [];

    if (g && g.matches) {
      cards.push(T.card("Mirrored picks per match",
        T.fmtNum(r1(g.mirrorPairs / g.matches))));
      notes.push("Same tank on both sides, mean per match over " + T.fmtNum(g.matches) + " matches.");
    }

    var maps = (D.maps || []).slice().filter(function (m) { return (m.match_ids || []).length; });
    if (maps.length > 1) {
      maps.sort(function (a, b) { return a.match_ids.length - b.match_ids.length; });
      var rare = maps[0];
      cards.push(T.card("Least played map", T.esc(rare.map)));
      notes.push(T.esc(rare.map) + ": " + T.fmtNum(rare.match_ids.length) + " of " +
        T.fmtNum((D.matches || []).length) + " matches.");
    }

    var tanksD = (D.tanks || []).slice();
    var bestKs = null;
    tanksD.forEach(function (t) {
      var ks = t.keystones || [];
      if (!ks.length || !fin(ks[0].share)) return;
      if (!bestKs || ks[0].share > bestKs.share) {
        bestKs = { tank: t.tank, share: ks[0].share, games: ks[0].games };
      }
    });
    if (bestKs) {
      cards.push(T.card("Most uniform build",
        T.esc(bestKs.tank) + " " + T.fmtPct(bestKs.share)));
      notes.push("Largest single-keystone share, from " + T.fmtNum(bestKs.games) +
        " games where the keystone decoded.");
    }

    var peak = listMap(S.tank_max_hp);
    var gap = null;
    tanksD.forEach(function (t) {
      var o = officialOf(T, t.tank);
      if (!o || !fin(o.hp) || !o.hp || !fin(peak[t.tank])) return;
      var ratio = peak[t.tank] / o.hp;
      if (!gap || ratio > gap.ratio) gap = { tank: t.tank, ratio: ratio, peak: peak[t.tank], base: o.hp };
    });
    if (gap) {
      cards.push(T.card("Widest health gap",
        T.esc(gap.tank) + " &times;" + T.fmtNum(r1(gap.ratio))));
      notes.push("Highest HP ever seen (" + T.fmtNum(gap.peak) + ") against published base (" +
        T.fmtNum(gap.base) + "). Upgrades and heals.");
    }

    var skins = S.skin_variety || [];
    if (skins.length) {
      var total = 0;
      skins.forEach(function (r) { total += (r.count || 0); });
      cards.push(T.card("Distinct skins seen", T.fmtNum(total)));
      notes.push("Sum of per-tank skin counts across " + T.fmtNum(skins.length) + " tanks.");
    }

    var wd = S.matches_by_weekday || [];
    if (wd.length > 2) {
      var quiet = wd[0], busy = wd[0];
      wd.forEach(function (r) {
        if (r.count < quiet.count) quiet = r;
        if (r.count > busy.count) busy = r;
      });
      cards.push(T.card("Quietest day", T.esc(quiet.label)));
      notes.push("Counts uploads, not play: " + T.esc(quiet.label) + " " + T.fmtNum(quiet.count) +
        " vs " + T.esc(busy.label) + " " + T.fmtNum(busy.count) + ".");
    }

    if (cards.length < 3) return "";
    return T.bigPanel("Odd numbers",
      '<div class="stat-grid">' + cards.join("") + "</div>",
      notes.join(" "));
  }

  /* --------------------------------------------------- panel: constellation */

  function constellationPanel(T) {
    var g = buildGraph(T);
    if (!g) return "";
    return T.bigPanel("Tank constellation",
      '<div class="cu-bar">' +
      '<span class="cu-bar-lab">Pull</span>' +
      '<input class="cu-range" type="range" min="0" max="100" value="55" data-cu="pull">' +
      '<span class="cu-bar-lab">Links</span>' +
      '<input class="cu-range" type="range" min="8" max="' + g.edges.length +
      '" value="' + Math.min(46, g.edges.length) + '" data-cu="links">' +
      '<button type="button" class="cu-chip" data-cu="reseed">Reseed layout</button>' +
      '<button type="button" class="cu-chip" data-cu="clear">Clear selection</button>' +
      "</div>" +
      '<canvas class="cu-cv cu-grab" data-cu="cv"></canvas>' +
      '<div class="cu-read" data-cu="read">Hover a tank. Drag one to pull the web around.</div>',
      "Dot size = games played. Line weight = meetings across " + T.fmtNum(g.matches) +
      " match rosters (max " + T.fmtNum(g.maxW) + "). The layout is decorative. " +
      "Position means nothing.");
  }

  function wireConstellation(T, root) {
    var wrap = root.querySelector('[data-cu="cv"]');
    if (!wrap) return;
    var cv = wrap;
    var readEl = root.querySelector('[data-cu="read"]');
    var pullEl = root.querySelector('[data-cu="pull"]');
    var linkEl = root.querySelector('[data-cu="links"]');
    var g = buildGraph(T);
    if (!g) return;

    var H = 440;
    var seed = 11;
    var sim = makeSim(g, seed, +linkEl.value);
    var ctx = cv.getContext("2d");
    var raf = 0, dragIdx = -1, hoverIdx = -1, selIdx = -1, frame = null;

    function pull() { return 0.15 + (+pullEl.value / 100) * 1.85; }

    function fit() {
      var w = cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 640;
      var dpr = window.devicePixelRatio || 1;
      if (cv._cw === w && cv._cd === dpr) return false;
      cv._cw = w; cv._cd = dpr;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      cv.style.height = H + "px";
      return true;
    }

    function draw() {
      var w = cv._cw || 640, dpr = cv._cd || 1, i;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, H);
      frame = fitFrame(sim.pts, w, H, 26);
      var focus = selIdx >= 0 ? selIdx : hoverIdx;

      for (i = 0; i < sim.edges.length; i++) {
        var e = sim.edges[i];
        var p = sim.pts[e.a], q = sim.pts[e.b];
        var on = focus < 0 || e.a === focus || e.b === focus;
        ctx.beginPath();
        ctx.moveTo(p.x * frame.s + frame.ox, p.y * frame.s + frame.oy);
        ctx.lineTo(q.x * frame.s + frame.ox, q.y * frame.s + frame.oy);
        ctx.lineWidth = 0.5 + e.wn * 3.4;
        ctx.strokeStyle = on
          ? "rgba(168,181,228," + (0.10 + e.wn * 0.55).toFixed(3) + ")"
          : "rgba(120,132,175,0.05)";
        ctx.stroke();
      }

      for (i = 0; i < sim.pts.length; i++) {
        var pt = sim.pts[i], nd = g.nodes[i];
        var cx = pt.x * frame.s + frame.ox, cy = pt.y * frame.s + frame.oy;
        var rr = Math.max(4, pt.r * frame.s);
        var dim = focus >= 0 && focus !== i && !linked(focus, i);
        ctx.beginPath();
        ctx.arc(cx, cy, rr + 6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(nd.color, dim ? 0.04 : 0.16);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fillStyle = dim ? rgba(nd.color, 0.30) : nd.color;
        ctx.fill();
        ctx.lineWidth = i === focus ? 2 : 1;
        ctx.strokeStyle = i === focus ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.22)";
        ctx.stroke();
        ctx.font = (i === focus ? "700 " : "") + "11px ui-monospace, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = dim ? "rgba(214,220,245,0.28)" : "rgba(232,236,255,0.94)";
        ctx.fillText(nd.name, cx, cy + rr + 9);
      }
    }

    function linked(a, b) {
      for (var i = 0; i < sim.edges.length; i++) {
        var e = sim.edges[i];
        if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return true;
      }
      return false;
    }

    function settled() { return sim.alpha < 0.004 && dragIdx < 0; }

    function onScreen() {
      if (document.hidden) return false;
      var r = cv.getBoundingClientRect();
      return r.bottom > -60 && r.top < (window.innerHeight || 800) + 60;
    }

    function loop() {
      raf = 0;
      if (!document.body.contains(cv)) return;   // gone from the page: stop for good
      var vis = onScreen();
      if (vis) {
        fit();
        stepSim(sim, pull());
        draw();
        if (settled()) return;                    // rest until something changes
      }
      raf = window.requestAnimationFrame(loop);
    }
    function kick(a) {
      sim.alpha = Math.max(sim.alpha, a || 0.55);
      if (!raf) raf = window.requestAnimationFrame(loop);
    }

    function pick(ev) {
      if (!frame) return -1;
      var r = cv.getBoundingClientRect();
      var mx = (ev.clientX - r.left), my = (ev.clientY - r.top);
      var best = -1, bd = 1e9;
      for (var i = 0; i < sim.pts.length; i++) {
        var cx = sim.pts[i].x * frame.s + frame.ox, cy = sim.pts[i].y * frame.s + frame.oy;
        var d = Math.sqrt((mx - cx) * (mx - cx) + (my - cy) * (my - cy));
        var rr = Math.max(6, sim.pts[i].r * frame.s) + 6;
        if (d < rr && d < bd) { bd = d; best = i; }
      }
      return best;
    }

    function toSim(ev) {
      var r = cv.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left - frame.ox) / frame.s,
        y: (ev.clientY - r.top - frame.oy) / frame.s
      };
    }

    function say(idx) {
      if (idx < 0) {
        readEl.innerHTML = "Hover a tank. Click to lock its lines on.";
        return;
      }
      var nd = g.nodes[idx], i;
      var partners = [];
      for (i = 0; i < g.nodes.length; i++) {
        if (i === idx) continue;
        if (g.meet[idx][i] > 0) partners.push({ i: i, w: g.meet[idx][i] });
      }
      partners.sort(function (a, b) { return b.w - a.w; });
      var top = partners.slice(0, 3).map(function (p) {
        var kf = g.kills[idx][p.i], ka = g.kills[p.i][idx];
        var tail = (fin(kf) && fin(ka) && (kf + ka) >= 20)
          ? " (" + T.fmtNum(kf) + " to " + T.fmtNum(ka) + " kills)"
          : "";
        return T.esc(g.nodes[p.i].name) + " &times;" + T.fmtNum(p.w) + tail;
      }).join(", ");
      readEl.innerHTML = "<b>" + T.esc(nd.name) + "</b>, " + T.fmtNum(nd.games) +
        " games, " + (has(nd.winrate) ? T.fmtPct(nd.winrate) + " win rate" : "win rate unknown") +
        ". Most-met opponents: " + (top || "none recorded") + ".";
    }

    cv.addEventListener("mousedown", function (ev) {
      var i = pick(ev);
      if (i < 0) { selIdx = -1; say(hoverIdx); draw(); return; }
      dragIdx = i; selIdx = i;
      sim.pts[i].pinned = true;
      cv.className = "cu-cv cu-grabbing";
      say(i);
      kick(0.35);
    });
    cv.addEventListener("mousemove", function (ev) {
      if (dragIdx >= 0 && frame) {
        var p = toSim(ev);
        sim.pts[dragIdx].x = p.x; sim.pts[dragIdx].y = p.y;
        kick(0.35);
        return;
      }
      var i = pick(ev);
      if (i !== hoverIdx) {
        hoverIdx = i;
        cv.className = "cu-cv " + (i >= 0 ? "cu-grab" : "cu-cv" === "" ? "" : "cu-grab");
        if (selIdx < 0) say(i);
        draw();
      }
    });
    function endDrag() {
      if (dragIdx >= 0) { sim.pts[dragIdx].pinned = false; dragIdx = -1; kick(0.30); }
      cv.className = "cu-cv cu-grab";
    }
    cv.addEventListener("mouseup", endDrag);
    cv.addEventListener("mouseleave", function () {
      endDrag();
      if (hoverIdx >= 0) { hoverIdx = -1; if (selIdx < 0) say(-1); draw(); }
    });
    cv.addEventListener("touchstart", function (ev) {
      var t = ev.touches[0]; if (!t) return;
      var i = pick(t);
      if (i >= 0) { ev.preventDefault(); dragIdx = i; selIdx = i; sim.pts[i].pinned = true; say(i); kick(0.35); }
    }, { passive: false });
    cv.addEventListener("touchmove", function (ev) {
      if (dragIdx < 0 || !frame) return;
      var t = ev.touches[0]; if (!t) return;
      ev.preventDefault();
      var p = toSim(t);
      sim.pts[dragIdx].x = p.x; sim.pts[dragIdx].y = p.y;
      kick(0.35);
    }, { passive: false });
    cv.addEventListener("touchend", endDrag);

    pullEl.addEventListener("input", function () { kick(0.6); });
    linkEl.addEventListener("input", function () {
      sim.edges = g.edges.slice(0, +linkEl.value);
      kick(0.7);
    });
    root.querySelector('[data-cu="reseed"]').addEventListener("click", function () {
      seed = Math.floor(Math.random() * 2000000) + 3;
      var old = sim.edges;
      sim = makeSim(g, seed, +linkEl.value);
      sim.edges = old;
      kick(1);
    });
    root.querySelector('[data-cu="clear"]').addEventListener("click", function () {
      selIdx = -1; hoverIdx = -1; say(-1); draw();
    });

    function onResize() {
      if (!document.body.contains(cv)) { window.removeEventListener("resize", onResize); return; }
      if (fit()) draw();
    }
    window.addEventListener("resize", onResize);

    fit();
    for (var i = 0; i < 240; i++) stepSim(sim, pull());
    sim.alpha = 0.5;
    kick(0.5);
  }

  /* ------------------------------------------------- panel: periodic table */

  function tableRows(T) {
    var D = T.DATA || {};
    var tanks = (D.tanks || []).slice();
    if (tanks.length < 6) return null;
    var peak = listMap((T.STATS || {}).tank_max_hp);
    var rows = tanks.map(function (t, i) {
      return {
        name: t.tank, d: t, o: officialOf(T, t.tank),
        peak: fin(peak[t.tank]) ? peak[t.tank] : null,
        color: tankHue(T, t.tank, i)
      };
    });
    return rows;
  }

  function metricDefs(T, rows) {
    var anyOfficial = false;
    rows.forEach(function (r) { if (r.o) anyOfficial = true; });
    var defs = [];
    function m(id, name, unit, f) { defs.push({ id: id, name: name, unit: unit, get: f }); }
    if (anyOfficial) {
      m("hp", "Health", "", function (r) { return r.o ? r.o.hp : null; });
      m("dmg", "Shell damage", "", function (r) { return r.o ? r.o.dmg : null; });
      m("pen", "Penetration", "mm", function (r) { return r.o ? r.o.pen : null; });
      m("spd", "Top speed", "", function (r) { return r.o ? r.o.spd : null; });
      m("reload", "Reload", "s", function (r) { return r.o ? r.o.reload_s : null; });
      m("camo", "Camo", "", function (r) { return r.o ? r.o.camo : null; });
      m("det", "Detection", "m", function (r) { return r.o ? r.o.detection_m : null; });
      m("diff", "Difficulty", "/5", function (r) { return r.o ? r.o.difficulty : null; });
    }
    m("games", "Games played", "", function (r) { return r.d.games; });
    m("wr", "Win rate", "%", function (r) { return r.d.winrate; });
    m("avgdmg", "Avg damage", "", function (r) { return r.d.avg ? r.d.avg.dmg : null; });
    m("dpm", "Damage per min", "", function (r) { return r.d.dpm; });
    m("surv", "Avg survival", "%", function (r) { return r.d.avg_survival_pct; });
    m("peak", "Highest HP seen", "", function (r) { return r.peak; });
    return defs;
  }

  function periodicPanel(T) {
    var rows = tableRows(T);
    if (!rows) return "";
    var defs = metricDefs(T, rows);
    var chips = defs.map(function (d, i) {
      return '<button type="button" class="cu-chip' + (i === 0 ? " cu-on" : "") +
        '" data-cu="metric" data-id="' + d.id + '">' + T.esc(d.name) + "</button>";
    }).join("");
    return T.bigPanel("A periodic table of tanks",
      '<div class="cu-bar"><span class="cu-bar-lab">Colour &amp; order by</span>' + chips + "</div>" +
      '<div class="cu-scroll"><div class="cu-per" data-cu="grid"></div></div>' +
      '<div data-cu="tdet"></div>',
      "Rows = weight class. Colour/order = chosen stat, brighter higher (reload, difficulty " +
      "read backwards). Published sheet stats vs measured replay stats.");
  }

  function wirePeriodic(T, root) {
    var grid = root.querySelector('[data-cu="grid"]');
    if (!grid) return;
    var det = root.querySelector('[data-cu="tdet"]');
    var rows = tableRows(T);
    if (!rows) return;
    var defs = metricDefs(T, rows);
    var cur = defs[0], sel = null;

    var CLASS_ORDER = ["Light", "Medium", "Heavy"];

    function sym(n) { return String(n).substring(0, 3); }

    function paint() {
      var vals = [], i;
      rows.forEach(function (r) {
        var v = cur.get(r);
        r._v = fin(v) ? v : null;
        if (r._v !== null) vals.push(r._v);
      });
      var lo = vals.length ? Math.min.apply(null, vals) : 0;
      var hi = vals.length ? Math.max.apply(null, vals) : 1;
      var ranked = rows.slice().filter(function (r) { return r._v !== null; })
        .sort(function (a, b) { return b._v - a._v; });
      var rank = {};
      for (i = 0; i < ranked.length; i++) rank[ranked[i].name] = i + 1;

      var groups = {}, order = [];
      rows.forEach(function (r) {
        var c = (r.o && r.o["class"]) ? r.o["class"] : "Unclassed";
        if (!groups[c]) { groups[c] = []; order.push(c); }
        groups[c].push(r);
      });
      order.sort(function (a, b) {
        var ia = CLASS_ORDER.indexOf(a), ib = CLASS_ORDER.indexOf(b);
        if (ia < 0) ia = 9; if (ib < 0) ib = 9;
        return ia - ib;
      });

      var html = order.map(function (c) {
        var list = groups[c].slice().sort(function (a, b) {
          if (a._v === null && b._v === null) return a.name < b.name ? -1 : 1;
          if (a._v === null) return 1;
          if (b._v === null) return -1;
          return b._v - a._v;
        });
        var cells = list.map(function (r) {
          var t = (r._v === null || hi === lo) ? 0 : (r._v - lo) / (hi - lo);
          var bg = mix("#151c39", "#8a6fd0", 0.10 + t * 0.90);
          var label = r._v === null ? "-" : (T.fmtNum(r._v) + (cur.unit || ""));
          return '<button type="button" class="cu-el' + (sel === r.name ? " cu-on" : "") +
            '" data-tank="' + T.esc(r.name) + '" style="background:' + bg +
            ';border-left:3px solid ' + r.color + '">' +
            '<span class="cu-el-n">' + (rank[r.name] || "-") + "</span>" +
            '<span class="cu-el-sym">' + T.esc(sym(r.name)) + "</span>" +
            '<span class="cu-el-v">' + label + "</span></button>";
        }).join("");
        return '<div class="cu-perrow"><span class="cu-perlab">' + T.esc(c) + "</span>" + cells + "</div>";
      }).join("");
      grid.innerHTML = html;
    }

    function detail(name) {
      var r = null, i;
      for (i = 0; i < rows.length; i++) { if (rows[i].name === name) r = rows[i]; }
      if (!r) { det.innerHTML = ""; return; }
      var o = r.o, d = r.d;
      var kv = [];
      function kvp(k, v) { kv.push("<div><i>" + k + "</i>" + v + "</div>"); }
      if (o) {
        kvp("Health", T.fmtNum(o.hp));
        kvp("Shell dmg", T.fmtNum(o.dmg));
        kvp("Penetration", T.fmtNum(o.pen) + " mm");
        kvp("Reload", T.fmtNum(o.reload_s) + " s");
        kvp("Top speed", T.fmtNum(o.spd));
        kvp("Camo", T.fmtNum(o.camo));
        kvp("Detection", T.fmtNum(o.detection_m) + " m");
        kvp("Difficulty", T.fmtNum(o.difficulty) + "/5");
      }
      kvp("Games", T.fmtNum(d.games));
      kvp("Win rate", T.fmtPct(d.winrate));
      kvp("Avg damage", T.fmtNum(d.avg ? d.avg.dmg : null));
      kvp("Damage/min", T.fmtNum(d.dpm));
      kvp("Avg survival", T.fmtPct(d.avg_survival_pct));
      if (r.peak !== null) kvp("Highest HP seen", T.fmtNum(r.peak));

      var ab = (o && o.ability) ? ("<div style=\"margin-top:6px\"><b>" + T.esc(o.ability.name) +
        "</b>: " + T.esc(o.ability.text) + "</div>") : "";
      var comps = (o && o.components && o.components.length)
        ? "<div style=\"margin-top:6px\" class=\"small\">" + o.components.map(function (c) {
          return "L" + T.esc(c.level) + " " + T.esc(c.name) + ": " + T.esc(c.text);
        }).join("<br>") + "</div>"
        : "";
      det.innerHTML = '<div class="cu-det"><h4 style="color:' + r.color + '">' + T.esc(r.name) +
        (o && o["class"] ? ' <span class="small">' + T.esc(o["class"]) + "</span>" : "") +
        "</h4>" + ab + '<div class="cu-kv">' + kv.join("") + "</div>" + comps + "</div>";
    }

    root.querySelectorAll('[data-cu="metric"]').forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id"), i;
        for (i = 0; i < defs.length; i++) { if (defs[i].id === id) cur = defs[i]; }
        root.querySelectorAll('[data-cu="metric"]').forEach(function (x) {
          x.className = "cu-chip" + (x === b ? " cu-on" : "");
        });
        paint();
      });
    });
    grid.addEventListener("click", function (ev) {
      var el = ev.target;
      while (el && el !== grid && !el.getAttribute("data-tank")) el = el.parentNode;
      if (!el || el === grid) return;
      var name = el.getAttribute("data-tank");
      sel = (sel === name) ? null : name;
      paint();
      if (sel) detail(sel); else det.innerHTML = "";
    });

    paint();
  }

  /* -------------------------------------------------- panel: match gravity */

  function gravityMatches(T) {
    var D = T.DATA || {};
    var out = [];
    (D.matches || []).forEach(function (m) {
      var ps = m.players || [];
      if (!ps.length || !fin(m.duration_sec) || m.duration_sec <= 0) return;
      var dmg = 0, kills = 0, alive = 0, known = 0;
      ps.forEach(function (p) {
        if (fin(p.dmg)) dmg += p.dmg;
        if (fin(p.kills)) kills += p.kills;
        if (fin(p.survival_pct)) { known++; if (p.survival_pct >= 99) alive++; }
      });
      var d = new Date(m.captured_unix * 1000);
      out.push({
        id: m.match_id, map: m.map || "Unknown", dur: m.duration_sec,
        dmg: dmg, kills: kills, alive: known ? alive : null,
        margin: (fin(m.score_ally) && fin(m.score_enemy)) ? Math.abs(m.score_ally - m.score_enemy) : null,
        hour: fin(m.captured_unix) ? (d.getHours() + d.getMinutes() / 60) : null,
        when: m.captured_unix
      });
    });
    return out;
  }

  var GRAV_FIELDS = [
    { id: "dur", name: "Match length", unit: "s", f: function (m) { return m.dur; } },
    { id: "dmg", name: "Total damage", unit: "", f: function (m) { return m.dmg; } },
    { id: "kills", name: "Total kills", unit: "", f: function (m) { return m.kills; } },
    { id: "alive", name: "Survivors at end", unit: "", f: function (m) { return m.alive; } },
    { id: "margin", name: "Score margin", unit: "", f: function (m) { return m.margin; } },
    { id: "hour", name: "Hour of day", unit: "h", f: function (m) { return m.hour; } }
  ];

  function gravityPanel(T) {
    var ms = gravityMatches(T);
    if (ms.length < 20) return "";
    var maps = {}, order = [];
    ms.forEach(function (m) { if (!maps[m.map]) { maps[m.map] = 1; order.push(m.map); } });
    order.sort();
    var legend = order.map(function (nm, i) {
      return '<span><span class="cu-dot" style="background:' +
        T.CHART_COLORS[i % T.CHART_COLORS.length] + '"></span>' + T.esc(nm) + "</span>";
    }).join("");
    var chips = GRAV_FIELDS.map(function (f, i) {
      return '<button type="button" class="cu-chip' + (i === 0 ? " cu-on" : "") +
        '" data-cu="grav" data-id="' + f.id + '">' + T.esc(f.name) + "</button>";
    }).join("");
    return T.bigPanel("Match gravity",
      '<div class="cu-bar"><span class="cu-bar-lab">Pulled by</span>' + chips + "</div>" +
      '<canvas class="cu-cv" data-cu="gcv"></canvas>' +
      '<div class="cu-legend">' + legend + "</div>" +
      '<div class="cu-read" data-cu="gread">Click to nudge dots; they resettle.</div>',
      "One dot per match (" + T.fmtNum(ms.length) + " of " + T.fmtNum((T.DATA.matches || []).length) +
      "). Horizontal = selected stat. Vertical is <b>decorative</b>, not data. Colour is the map.");
  }

  function wireGravity(T, root) {
    var cv = root.querySelector('[data-cu="gcv"]');
    if (!cv) return;
    var readEl = root.querySelector('[data-cu="gread"]');
    var ms = gravityMatches(T);
    if (ms.length < 20) return;

    var mapColor = {}, order = [];
    ms.forEach(function (m) { if (!mapColor[m.map]) { mapColor[m.map] = 1; order.push(m.map); } });
    order.sort();
    order.forEach(function (nm, i) { mapColor[nm] = T.CHART_COLORS[i % T.CHART_COLORS.length]; });

    var H = 330, PAD = 34, AX = 26;
    var ctx = cv.getContext("2d");
    var field = GRAV_FIELDS[0];
    var raf = 0, lo = 0, hi = 1, hoverIdx = -1;
    var parts = ms.map(function (m) {
      return { m: m, x: 0, y: 0, vx: 0, vy: 0, r: 4, tx: 0, live: true };
    });

    function fit() {
      var w = cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 640;
      var dpr = window.devicePixelRatio || 1;
      if (cv._cw === w && cv._cd === dpr) return false;
      cv._cw = w; cv._cd = dpr;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      cv.style.height = H + "px";
      return true;
    }

    function retarget() {
      var vals = [], i;
      for (i = 0; i < parts.length; i++) {
        var v = field.f(parts[i].m);
        parts[i].live = fin(v);
        if (parts[i].live) vals.push(v);
      }
      if (!vals.length) return;
      lo = Math.min.apply(null, vals); hi = Math.max.apply(null, vals);
      if (hi === lo) hi = lo + 1;
      var w = cv._cw || 640;
      for (i = 0; i < parts.length; i++) {
        if (!parts[i].live) { parts[i].tx = -999; continue; }
        var t = (field.f(parts[i].m) - lo) / (hi - lo);
        parts[i].tx = PAD + t * (w - PAD * 2);
      }
    }

    function seed() {
      var rnd = rng(4021), i;
      for (i = 0; i < parts.length; i++) {
        parts[i].x = parts[i].tx > 0 ? parts[i].tx : (cv._cw || 640) / 2;
        parts[i].y = 20 + rnd() * (H - AX - 40);
        parts[i].vx = 0; parts[i].vy = 0;
      }
    }

    function step() {
      var w = cv._cw || 640, floor = H - AX, i, j;
      var cell = 11, cols = Math.max(1, Math.ceil(w / cell)), rowsN = Math.max(1, Math.ceil(H / cell));
      var buckets = [];
      for (i = 0; i < cols * rowsN; i++) buckets.push(null);
      for (i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.live) continue;
        p.vx += (p.tx - p.x) * 0.030;
        p.vy += 0.55;
        var cxi = clamp(Math.floor(p.x / cell), 0, cols - 1);
        var cyi = clamp(Math.floor(p.y / cell), 0, rowsN - 1);
        var key = cyi * cols + cxi;
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(i);
      }
      for (i = 0; i < parts.length; i++) {
        var a = parts[i];
        if (!a.live) continue;
        var bx = clamp(Math.floor(a.x / cell), 0, cols - 1);
        var by = clamp(Math.floor(a.y / cell), 0, rowsN - 1);
        for (var ox = -1; ox <= 1; ox++) {
          for (var oy = -1; oy <= 1; oy++) {
            var nx = bx + ox, ny = by + oy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rowsN) continue;
            var list = buckets[ny * cols + nx];
            if (!list) continue;
            for (j = 0; j < list.length; j++) {
              var k = list[j];
              if (k <= i) continue;
              var b = parts[k];
              var dx = b.x - a.x, dy = b.y - a.y;
              var d2 = dx * dx + dy * dy;
              var md = a.r + b.r + 0.6;
              if (d2 >= md * md || d2 < 1e-6) continue;
              var d = Math.sqrt(d2);
              var push = (md - d) * 0.42;
              var ux = dx / d, uy = dy / d;
              a.vx -= ux * push; a.vy -= uy * push;
              b.vx += ux * push; b.vy += uy * push;
            }
          }
        }
      }
      var energy = 0;
      for (i = 0; i < parts.length; i++) {
        var q = parts[i];
        if (!q.live) continue;
        q.vx *= 0.86; q.vy *= 0.86;
        q.x += q.vx; q.y += q.vy;
        if (q.y > floor - q.r) { q.y = floor - q.r; if (q.vy > 0) q.vy *= -0.14; }
        if (q.y < q.r + 6) { q.y = q.r + 6; if (q.vy < 0) q.vy = 0; }
        if (q.x < 4) { q.x = 4; q.vx = 0; }
        if (q.x > w - 4) { q.x = w - 4; q.vx = 0; }
        energy += Math.abs(q.vx) + Math.abs(q.vy);
      }
      return energy / Math.max(1, parts.length);
    }

    function draw() {
      var w = cv._cw || 640, dpr = cv._cd || 1, i;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, H);
      var floor = H - AX;
      ctx.strokeStyle = "rgba(160,172,214,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD - 10, floor + 0.5); ctx.lineTo(w - PAD + 10, floor + 0.5); ctx.stroke();
      ctx.font = "10px ui-monospace, Consolas, monospace";
      ctx.fillStyle = "rgba(160,172,214,0.80)";
      ctx.textBaseline = "top";
      for (i = 0; i <= 4; i++) {
        var t = i / 4;
        var x = PAD + t * (w - PAD * 2);
        ctx.strokeStyle = "rgba(160,172,214,0.13)";
        ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, floor); ctx.stroke();
        ctx.textAlign = i === 0 ? "left" : (i === 4 ? "right" : "center");
        ctx.fillText(T.fmtNum(Math.round((lo + (hi - lo) * t) * 10) / 10) + (field.unit || ""), x, floor + 6);
      }
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(200,208,240,0.85)";
      ctx.fillText(field.name, PAD - 10, 6);

      for (i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.live) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = i === hoverIdx ? "#ffffff" : rgba(mapColor[p.m.map] || "#7f89b3", 0.86);
        ctx.fill();
        if (i === hoverIdx) {
          ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }

    function onScreen() {
      if (document.hidden) return false;
      var r = cv.getBoundingClientRect();
      return r.bottom > -60 && r.top < (window.innerHeight || 800) + 60;
    }

    var calm = 0;
    function loop() {
      raf = 0;
      if (!document.body.contains(cv)) return;   // element gone: end the loop
      if (onScreen()) {
        if (fit()) { retarget(); }
        var e = step();
        draw();
        calm = e < 0.08 ? calm + 1 : 0;
        if (calm > 24) return;
      }
      raf = window.requestAnimationFrame(loop);
    }
    function kick() { calm = 0; if (!raf) raf = window.requestAnimationFrame(loop); }

    root.querySelectorAll('[data-cu="grav"]').forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id"), i;
        for (i = 0; i < GRAV_FIELDS.length; i++) { if (GRAV_FIELDS[i].id === id) field = GRAV_FIELDS[i]; }
        root.querySelectorAll('[data-cu="grav"]').forEach(function (x) {
          x.className = "cu-chip" + (x === b ? " cu-on" : "");
        });
        retarget();
        var missing = 0;
        for (i = 0; i < parts.length; i++) { if (!parts[i].live) missing++; }
        readEl.innerHTML = "Sorted by <b>" + T.esc(field.name) + "</b>, range " +
          T.fmtNum(Math.round(lo * 10) / 10) + " to " + T.fmtNum(Math.round(hi * 10) / 10) +
          (field.unit ? " " + field.unit : "") +
          (missing ? ". " + T.fmtNum(missing) + " matches hidden (no value)." : ".");
        kick();
      });
    });

    cv.addEventListener("click", function (ev) {
      var r = cv.getBoundingClientRect();
      var mx = ev.clientX - r.left, my = ev.clientY - r.top;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.live) continue;
        var dx = p.x - mx, dy = p.y - my;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d > 150) continue;
        var f = (1 - d / 150) * 13;
        p.vx += dx / d * f; p.vy += dy / d * f - 1.5;
      }
      kick();
    });

    cv.addEventListener("mousemove", function (ev) {
      var r = cv.getBoundingClientRect();
      var mx = ev.clientX - r.left, my = ev.clientY - r.top;
      var best = -1, bd = 10;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.live) continue;
        var d = Math.sqrt((p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my));
        if (d < bd) { bd = d; best = i; }
      }
      if (best === hoverIdx) return;
      hoverIdx = best;
      if (best >= 0) {
        var m = parts[best].m;
        readEl.innerHTML = "<b>" + T.esc(m.map) + "</b>, " + T.fmtDateTime(m.when) +
          ", " + T.fmtNum(m.dur) + "s, " + T.fmtNum(m.dmg) + " damage, " +
          T.fmtNum(m.kills) + " kills" +
          (m.alive === null ? "" : ", " + T.fmtNum(m.alive) + " alive at the end") + ".";
      } else {
        readEl.innerHTML = "Click to nudge dots; they resettle.";
      }
      if (!raf) draw();
    });
    cv.addEventListener("mouseleave", function () {
      if (hoverIdx < 0) return;
      hoverIdx = -1;
      readEl.innerHTML = "Click anywhere in the field to shove the matches apart and watch them re-settle.";
      if (!raf) draw();
    });

    function onResize() {
      if (!document.body.contains(cv)) { window.removeEventListener("resize", onResize); return; }
      if (fit()) { retarget(); kick(); }
    }
    window.addEventListener("resize", onResize);

    fit();
    retarget();
    seed();
    kick();
  }

  /* ------------------------------------------------------- panel: duel lab */

  function duelTanks(T) {
    var rows = tableRows(T);
    if (!rows) return null;
    var out = rows.filter(function (r) {
      return r.o && fin(r.o.hp) && fin(r.o.dmg) && r.o.dmg > 0 && fin(r.o.reload_s);
    });
    return out.length >= 4 ? out : null;
  }

  function duelPanel(T) {
    var rows = duelTanks(T);
    if (!rows) return "";
    var opts = rows.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; })
      .map(function (r) { return '<option value="' + T.esc(r.name) + '">' + T.esc(r.name) + "</option>"; })
      .join("");
    return T.bigPanel("Duel lab",
      '<div class="cu-duel">' +
      '<div><div class="cu-bar-lab">Attacker</div>' +
      '<select class="cu-sel" data-cu="dA">' + opts + "</select></div>" +
      '<div><div class="cu-bar-lab">Defender</div>' +
      '<select class="cu-sel" data-cu="dB">' + opts + "</select></div>" +
      "</div>" +
      '<div class="cu-bar" style="margin-top:12px">' +
      '<span class="cu-bar-lab">Shots that penetrate</span>' +
      '<input class="cu-range" type="range" min="20" max="100" step="5" value="100" data-cu="dPen">' +
      '<span class="cu-bar-lab" data-cu="dPenV">100%</span>' +
      '<span class="cu-bar-lab">Health</span>' +
      '<button type="button" class="cu-chip cu-on" data-cu="dHp" data-id="base">Published base</button>' +
      '<button type="button" class="cu-chip" data-cu="dHp" data-id="peak">Highest seen</button>' +
      "</div>" +
      '<svg class="cu-svg" viewBox="0 0 640 190" data-cu="dSvg" role="img"></svg>' +
      '<div class="cu-verdict" data-cu="dOut"></div>',
      "Arithmetic on published stats, not a measurement. A ceiling. It ignores aim, angle, " +
      "crew, abilities and ammo choice. <b>Highest seen</b> swaps in the largest HP recorded on " +
      "that tank, above its published base.");
  }

  function wireDuel(T, root) {
    var svg = root.querySelector('[data-cu="dSvg"]');
    if (!svg) return;
    var rows = duelTanks(T);
    if (!rows) return;
    var byName = {};
    rows.forEach(function (r) { byName[r.name] = r; });
    var selA = root.querySelector('[data-cu="dA"]');
    var selB = root.querySelector('[data-cu="dB"]');
    var pen = root.querySelector('[data-cu="dPen"]');
    var penV = root.querySelector('[data-cu="dPenV"]');
    var out = root.querySelector('[data-cu="dOut"]');
    var hpMode = "base";

    var sorted = rows.slice().sort(function (a, b) { return b.d.games - a.d.games; });
    selA.value = sorted[0].name;
    selB.value = (sorted[1] || sorted[0]).name;

    function hpOf(r) {
      if (hpMode === "peak" && r.peak !== null) return r.peak;
      return r.o.hp;
    }

    function solve(att, def) {
      var p = (+pen.value) / 100;
      var hp = hpOf(def), dmg = att.o.dmg, rl = att.o.reload_s;
      var hits = Math.ceil(hp / dmg);
      var shots = hits / p;
      var t = (shots - 1) * rl;
      return { hits: hits, shots: shots, t: t, rl: rl, hp: hp, dmg: dmg };
    }

    function bar(y, r, res, worst, color) {
      var w = 470, x0 = 150;
      var frac = worst > 0 ? clamp(res.t / worst, 0, 1) : 0;
      var g = '<text x="4" y="' + (y + 14) + '" fill="' + color +
        '" font-size="13" font-weight="700">' + T.esc(r.name) + "</text>";
      g += '<rect x="' + x0 + '" y="' + y + '" width="' + w + '" height="20" rx="4" fill="rgba(255,255,255,0.05)"/>';
      g += '<rect x="' + x0 + '" y="' + y + '" width="' + (w * frac).toFixed(1) +
        '" height="20" rx="4" fill="' + rgba(color, 0.55) + '"/>';
      var n = Math.min(30, Math.max(1, Math.round(res.shots)));
      for (var i = 0; i < n; i++) {
        var tt = worst > 0 ? (i * res.rl) / worst : 0;
        if (tt > 1) break;
        var x = x0 + w * tt;
        g += '<line x1="' + x.toFixed(1) + '" y1="' + y + '" x2="' + x.toFixed(1) +
          '" y2="' + (y + 20) + '" stroke="rgba(255,255,255,0.42)" stroke-width="1"/>';
      }
      g += '<text x="4" y="' + (y + 30) + '" fill="rgba(160,172,214,0.9)" font-size="10">' +
        T.fmtNum(res.hits) + " hits &#183; " + T.fmtNum(Math.round(res.shots * 10) / 10) +
        " shots &#183; " + T.fmtNum(res.rl) + "s reload</text>";
      g += '<text x="' + (x0 + w) + '" y="' + (y - 4) + '" text-anchor="end" ' +
        'fill="rgba(214,220,245,0.95)" font-size="12" font-weight="700">' +
        T.fmtNum(Math.round(res.t * 10) / 10) + "s</text>";
      return g;
    }

    function paint() {
      var a = byName[selA.value], b = byName[selB.value];
      if (!a || !b) return;
      penV.textContent = pen.value + "%";
      var ra = solve(a, b), rb = solve(b, a);
      var worst = Math.max(ra.t, rb.t, 0.001);
      svg.innerHTML =
        '<text x="4" y="12" fill="rgba(160,172,214,0.85)" font-size="10">TIME TO STRIP THE OTHER TANK, SHARED SCALE TO ' +
        T.fmtNum(Math.round(worst * 10) / 10) + 's</text>' +
        bar(30, a, ra, worst, a.color) +
        bar(100, b, rb, worst, b.color);

      var msg;
      if (a.name === b.name) {
        msg = "Same tank on both sides. Dead heat at " +
          T.fmtNum(Math.round(ra.t * 10) / 10) + "s.";
      } else if (Math.abs(ra.t - rb.t) < 0.05) {
        msg = "<b>Dead heat.</b> Both need about " + T.fmtNum(Math.round(ra.t * 10) / 10) +
          "s under these assumptions.";
      } else {
        var win = ra.t < rb.t ? a : b, lose = ra.t < rb.t ? b : a;
        var wt = Math.min(ra.t, rb.t), lt = Math.max(ra.t, rb.t);
        msg = "<b>" + T.esc(win.name) + "</b> finishes first, " +
          T.fmtNum(Math.round(wt * 10) / 10) + "s against " +
          T.fmtNum(Math.round(lt * 10) / 10) + "s, a margin of " +
          T.fmtNum(Math.round((lt - wt) * 10) / 10) + "s. " +
          T.esc(lose.name) + " needs " + T.fmtNum(solve(lose, win).hits) +
          " penetrating hits to get through " + T.fmtNum(hpOf(win)) + " health.";
      }
      out.innerHTML = msg;
    }

    selA.addEventListener("change", paint);
    selB.addEventListener("change", paint);
    pen.addEventListener("input", paint);
    root.querySelectorAll('[data-cu="dHp"]').forEach(function (b) {
      b.addEventListener("click", function () {
        hpMode = b.getAttribute("data-id");
        root.querySelectorAll('[data-cu="dHp"]').forEach(function (x) {
          x.className = "cu-chip" + (x === b ? " cu-on" : "");
        });
        paint();
      });
    });
    paint();
  }

  /* -------------------------------------------------------- panel: sunburst */

  function sunRows(T, mode) {
    var D = T.DATA || {};
    var matches = D.matches || [];
    if (matches.length < 10) return null;
    var groups = {}, order = [], total = 0;
    matches.forEach(function (m) {
      (m.players || []).forEach(function (p) {
        if (!p.tank) return;
        var o = officialOf(T, p.tank);
        var cls = (o && o["class"]) ? o["class"] : null;
        if (!cls) return;
        var key;
        if (mode === "fate") {
          if (!fin(p.survival_pct)) return;
          key = p.survival_pct >= 99 ? "Alive at the end" : "Destroyed";
        } else {
          if (!has(m.winning_team) || !has(p.team)) return;
          key = p.team === m.winning_team ? "Won" : "Lost";
        }
        if (!groups[cls]) { groups[cls] = { name: cls, total: 0, tanks: {}, order: [] }; order.push(cls); }
        var G = groups[cls];
        if (!G.tanks[p.tank]) { G.tanks[p.tank] = { name: p.tank, total: 0, parts: {} }; G.order.push(p.tank); }
        var Tk = G.tanks[p.tank];
        Tk.parts[key] = (Tk.parts[key] || 0) + 1;
        Tk.total++; G.total++; total++;
      });
    });
    if (total < 50) return null;
    var CL = ["Light", "Medium", "Heavy"];
    order.sort(function (a, b) {
      var ia = CL.indexOf(a), ib = CL.indexOf(b);
      if (ia < 0) ia = 9; if (ib < 0) ib = 9;
      return ia - ib;
    });
    return {
      total: total,
      classes: order.map(function (c) {
        var G = groups[c];
        return {
          name: c, total: G.total,
          tanks: G.order.map(function (t) { return G.tanks[t]; })
            .sort(function (a, b) { return b.total - a.total; })
        };
      })
    };
  }

  var SUN_KEYS = {
    outcome: [["Won", "#42588d"], ["Lost", "#8a4444"]],
    fate: [["Alive at the end", "#35674a"], ["Destroyed", "#8a6169"]]
  };

  function arcPath(cx, cy, r0, r1, a0, a1) {
    var span = a1 - a0;
    if (span >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4;
    var big = (a1 - a0) > Math.PI ? 1 : 0;
    function px(r, a) { return (cx + r * Math.cos(a)).toFixed(2); }
    function py(r, a) { return (cy + r * Math.sin(a)).toFixed(2); }
    return "M" + px(r1, a0) + " " + py(r1, a0) +
      "A" + r1 + " " + r1 + " 0 " + big + " 1 " + px(r1, a1) + " " + py(r1, a1) +
      "L" + px(r0, a1) + " " + py(r0, a1) +
      "A" + r0 + " " + r0 + " 0 " + big + " 0 " + px(r0, a0) + " " + py(r0, a0) + "Z";
  }

  function sunSvg(T, data, mode, focus) {
    var cx = 230, cy = 230;
    var keys = SUN_KEYS[mode];
    var classes = data.classes;
    if (focus) {
      classes = classes.filter(function (c) { return c.name === focus; });
      if (!classes.length) { classes = data.classes; focus = null; }
    }
    var shown = 0;
    classes.forEach(function (c) { shown += c.total; });
    if (!shown) return "";

    var out = [], a = -Math.PI / 2;
    var step = (Math.PI * 2) / shown;

    classes.forEach(function (c, ci) {
      var ca0 = a, ca1 = a + c.total * step;
      var cCol = mix("#4a5f9e", "#a06bff", classes.length > 1 ? ci / (classes.length - 1) : 0.5);
      out.push('<path d="' + arcPath(cx, cy, 48, 96, ca0, ca1) + '" fill="' + cCol +
        '" fill-opacity="0.72" stroke="rgba(10,14,31,0.85)" stroke-width="1" ' +
        'style="cursor:pointer" data-cls="' + T.esc(c.name) + '"><title>' + T.esc(c.name) +
        ": " + T.fmtNum(c.total) + " entries</title></path>");
      var mid = (ca0 + ca1) / 2, deg = mid * 180 / Math.PI;
      var flip = Math.cos(mid) < 0;
      if (ca1 - ca0 > 0.22) {
        out.push('<text transform="translate(' + cx + ',' + cy + ') rotate(' + deg.toFixed(1) +
          ') translate(72,0) rotate(' + (flip ? 180 : 0) + ')" text-anchor="middle" ' +
          'dominant-baseline="middle" font-size="12" font-weight="700" fill="#f0f2ff" ' +
          'pointer-events="none">' + T.esc(c.name) + "</text>");
      }

      var ta = ca0;
      c.tanks.forEach(function (tk, ti) {
        var t0 = ta, t1 = ta + tk.total * step;
        var col = tankHue(T, tk.name, ti);
        out.push('<path d="' + arcPath(cx, cy, 100, 160, t0, t1) + '" fill="' + col +
          '" fill-opacity="0.85" stroke="rgba(10,14,31,0.85)" stroke-width="1"><title>' +
          T.esc(tk.name) + ": " + T.fmtNum(tk.total) + " entries</title></path>");
        if (t1 - t0 > 0.14) {
          var m2 = (t0 + t1) / 2, d2 = m2 * 180 / Math.PI, f2 = Math.cos(m2) < 0;
          out.push('<text transform="translate(' + cx + ',' + cy + ') rotate(' + d2.toFixed(1) +
            ') translate(130,0) rotate(' + (f2 ? 180 : 0) + ')" text-anchor="middle" ' +
            'dominant-baseline="middle" font-size="10" fill="#0d1226" font-weight="700" ' +
            'pointer-events="none">' + T.esc(tk.name) + "</text>");
        }
        var pa = t0;
        keys.forEach(function (k) {
          var n = tk.parts[k[0]] || 0;
          if (!n) return;
          var p1 = pa + n * step;
          out.push('<path d="' + arcPath(cx, cy, 164, 206, pa, p1) + '" fill="' + k[1] +
            '" fill-opacity="0.9" stroke="rgba(10,14,31,0.7)" stroke-width="0.6"><title>' +
            T.esc(tk.name) + " " + T.esc(k[0]) + ": " + T.fmtNum(n) + " of " +
            T.fmtNum(tk.total) + " (" + T.fmtPct(r1(100 * n / tk.total)) + ")</title></path>");
          pa = p1;
        });
        ta = t1;
      });
      a = ca1;
    });

    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="rgba(19,26,51,0.95)" ' +
      'stroke="rgba(160,172,214,0.28)" style="cursor:pointer" data-cls="__all"><title>' +
      "Click to show every class</title></circle>");
    out.push('<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="15" ' +
      'font-weight="700" fill="#e6eaff" pointer-events="none">' + T.fmtNum(shown) + "</text>");
    out.push('<text x="' + cx + '" y="' + (cy + 11) + '" text-anchor="middle" font-size="9" ' +
      'fill="rgba(160,172,214,0.9)" pointer-events="none">' +
      (focus ? T.esc(focus).toUpperCase() : "ROSTER ROWS") + "</text>");

    return '<svg class="cu-svg" viewBox="0 0 460 460" role="img">' + out.join("") + "</svg>";
  }

  function sunburstPanel(T) {
    if (!sunRows(T, "outcome")) return "";
    return T.bigPanel("Class, tank, ending",
      '<div class="cu-bar">' +
      '<button type="button" class="cu-chip cu-on" data-cu="sun" data-id="outcome">Won or lost</button>' +
      '<button type="button" class="cu-chip" data-cu="sun" data-id="fate">Alive or destroyed</button>' +
      '<span class="cu-bar-lab" data-cu="sunleg"></span>' +
      "</div>" +
      '<div data-cu="sunwrap"></div>' +
      '<div class="cu-read">Click a ring to expand it, click centre to reset.</div>',
      "Rings: class, tank, outcome, one row per player per match. Wedge size is a count, not " +
      "skill. The two modes exclude different unrecorded rows.");
  }

  function wireSunburst(T, root) {
    var wrap = root.querySelector('[data-cu="sunwrap"]');
    if (!wrap) return;
    var leg = root.querySelector('[data-cu="sunleg"]');
    var mode = "outcome", focus = null;
    var cache = {};

    function data() {
      if (!cache[mode]) cache[mode] = sunRows(T, mode);
      return cache[mode];
    }

    function paint() {
      var d = data();
      if (!d) { wrap.innerHTML = '<div class="small">No rows for this view.</div>'; return; }
      wrap.innerHTML = sunSvg(T, d, mode, focus);
      leg.innerHTML = SUN_KEYS[mode].map(function (k) {
        return '<span style="margin-right:10px"><span class="cu-dot" style="background:' +
          k[1] + '"></span>' + T.esc(k[0]) + "</span>";
      }).join("");
    }

    wrap.addEventListener("click", function (ev) {
      var el = ev.target;
      while (el && el !== wrap && !el.getAttribute) el = el.parentNode;
      var cls = el && el.getAttribute ? el.getAttribute("data-cls") : null;
      if (!cls) return;
      focus = (cls === "__all" || cls === focus) ? null : cls;
      paint();
    });
    root.querySelectorAll('[data-cu="sun"]').forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-id");
        focus = null;
        root.querySelectorAll('[data-cu="sun"]').forEach(function (x) {
          x.className = "cu-chip" + (x === b ? " cu-on" : "");
        });
        paint();
      });
    });
    paint();
  }

  /* --------------------------------------------------------- panel: sigils */

  /* A glyph is a closed polar curve. Six numbers from one tank set six shape
   * features. It is a mnemonic, not a chart: do not read areas off it. */
  function sigilFeatures(T, r, driver, ranges) {
    function norm(v, key) {
      var rg = ranges[key];
      if (!rg || !fin(v) || rg.hi === rg.lo) return 0.5;
      return clamp((v - rg.lo) / (rg.hi - rg.lo), 0, 1);
    }
    if (driver === "measured") {
      return {
        size: norm(r.d.avg ? r.d.avg.dmg : null, "avgdmg"),
        lobes: norm(r.d.avg_survival_pct, "surv"),
        spike: norm(r.d.winrate, "wr"),
        core: norm(r.d.dpm, "dpm"),
        spin: norm(r.d.pick_rate, "pick"),
        dots: norm(r.d.games, "games"),
        labels: [
          ["Radius", "avg damage", T.fmtNum(r.d.avg ? r.d.avg.dmg : null)],
          ["Lobes", "avg survival", T.fmtPct(r.d.avg_survival_pct)],
          ["Spikiness", "win rate", T.fmtPct(r.d.winrate)],
          ["Core disc", "damage per minute", T.fmtNum(r.d.dpm)],
          ["Rotation", "pick rate", T.fmtPct(fin(r.d.pick_rate) ? r1(r.d.pick_rate * 100) : null)],
          ["Dots", "games played", T.fmtNum(r.d.games)]
        ]
      };
    }
    var o = r.o || {};
    return {
      size: norm(o.hp, "hp"),
      lobes: norm(o.pen, "pen"),
      spike: norm(o.camo, "camo"),
      core: norm(fin(o.reload_s) && o.reload_s > 0 ? 1 / o.reload_s : null, "rate"),
      spin: norm(o.spd, "spd"),
      dots: norm(o.difficulty, "diff"),
      labels: [
        ["Radius", "health", T.fmtNum(o.hp)],
        ["Lobes", "penetration", T.fmtNum(o.pen)],
        ["Spikiness", "camo", T.fmtNum(o.camo)],
        ["Core disc", "rate of fire", T.fmtNum(o.reload_s) + "s reload"],
        ["Rotation", "top speed", T.fmtNum(o.spd)],
        ["Dots", "difficulty", T.fmtNum(o.difficulty) + "/5"]
      ]
    };
  }

  function sigilRanges(T, rows) {
    var keys = {
      hp: [], pen: [], camo: [], rate: [], spd: [], diff: [],
      avgdmg: [], surv: [], wr: [], dpm: [], pick: [], games: []
    };
    rows.forEach(function (r) {
      var o = r.o || {};
      if (fin(o.hp)) keys.hp.push(o.hp);
      if (fin(o.pen)) keys.pen.push(o.pen);
      if (fin(o.camo)) keys.camo.push(o.camo);
      if (fin(o.reload_s) && o.reload_s > 0) keys.rate.push(1 / o.reload_s);
      if (fin(o.spd)) keys.spd.push(o.spd);
      if (fin(o.difficulty)) keys.diff.push(o.difficulty);
      if (r.d.avg && fin(r.d.avg.dmg)) keys.avgdmg.push(r.d.avg.dmg);
      if (fin(r.d.avg_survival_pct)) keys.surv.push(r.d.avg_survival_pct);
      if (fin(r.d.winrate)) keys.wr.push(r.d.winrate);
      if (fin(r.d.dpm)) keys.dpm.push(r.d.dpm);
      if (fin(r.d.pick_rate)) keys.pick.push(r.d.pick_rate);
      if (fin(r.d.games)) keys.games.push(r.d.games);
    });
    var out = {};
    for (var k in keys) {
      out[k] = keys[k].length
        ? { lo: Math.min.apply(null, keys[k]), hi: Math.max.apply(null, keys[k]) }
        : null;
    }
    return out;
  }

  function sigilSvg(f, color, size) {
    var c = size / 2;
    var R = size * (0.20 + 0.17 * f.size);
    var P = Math.round(4 + f.lobes * 7);
    var S = R * (0.06 + 0.30 * f.spike);
    var core = R * (0.16 + 0.34 * f.core);
    var spin = f.spin * Math.PI * 2;
    var pts = [], i, N = 160;
    for (i = 0; i < N; i++) {
      var th = (i / N) * Math.PI * 2;
      var rr = R + S * Math.sin(P * th + spin);
      pts.push((c + rr * Math.cos(th)).toFixed(1) + "," + (c + rr * Math.sin(th)).toFixed(1));
    }
    var g = '<polygon points="' + pts.join(" ") + '" fill="' + rgba(color, 0.24) +
      '" stroke="' + color + '" stroke-width="' + (size / 90).toFixed(2) + '"/>';
    g += '<circle cx="' + c + '" cy="' + c + '" r="' + core.toFixed(1) + '" fill="' +
      rgba(color, 0.55) + '" stroke="' + rgba(color, 0.9) + '" stroke-width="1"/>';
    var dots = Math.round(1 + f.dots * 4);
    for (i = 0; i < dots; i++) {
      var da = spin + (i / dots) * Math.PI * 2;
      g += '<circle cx="' + (c + Math.cos(da) * core * 0.55).toFixed(1) + '" cy="' +
        (c + Math.sin(da) * core * 0.55).toFixed(1) + '" r="' + (size / 62).toFixed(2) +
        '" fill="#f2f4ff"/>';
    }
    g += '<line x1="' + c + '" y1="' + c + '" x2="' + (c + Math.cos(spin - Math.PI / 2) * (R + S + size * 0.045)).toFixed(1) +
      '" y2="' + (c + Math.sin(spin - Math.PI / 2) * (R + S + size * 0.045)).toFixed(1) +
      '" stroke="' + rgba(color, 0.7) + '" stroke-width="1"/>';
    return '<svg viewBox="0 0 ' + size + " " + size + '" role="img">' + g + "</svg>";
  }

  function sigilPanel(T) {
    var rows = tableRows(T);
    if (!rows) return "";
    return T.bigPanel("Tank sigils",
      '<div class="cu-bar"><span class="cu-bar-lab">Shaped by</span>' +
      '<button type="button" class="cu-chip cu-on" data-cu="sig" data-id="official">Published stats</button>' +
      '<button type="button" class="cu-chip" data-cu="sig" data-id="measured">Measured play</button>' +
      "</div>" +
      '<div class="cu-sigs" data-cu="sigs"></div>' +
      '<div data-cu="sigdet"></div>',
      "Decoration, not a chart. Six stats shape each glyph, rescaled across " +
      T.fmtNum(rows.length) + " tanks. Areas and lengths mean nothing in absolute terms.");
  }

  function wireSigils(T, root) {
    var host = root.querySelector('[data-cu="sigs"]');
    if (!host) return;
    var det = root.querySelector('[data-cu="sigdet"]');
    var rows = tableRows(T);
    if (!rows) return;
    var ranges = sigilRanges(T, rows);
    var driver = "official", sel = null;

    function paint() {
      host.innerHTML = rows.map(function (r) {
        var f = sigilFeatures(T, r, driver, ranges);
        return '<button type="button" class="cu-sig' + (sel === r.name ? " cu-on" : "") +
          '" data-tank="' + T.esc(r.name) + '">' + sigilSvg(f, r.color, 100) +
          "<em>" + T.esc(r.name) + "</em></button>";
      }).join("");
      if (sel) detail(sel); else det.innerHTML = "";
    }

    function detail(name) {
      var r = null, i;
      for (i = 0; i < rows.length; i++) { if (rows[i].name === name) r = rows[i]; }
      if (!r) { det.innerHTML = ""; return; }
      var f = sigilFeatures(T, r, driver, ranges);
      var kv = f.labels.map(function (l) {
        return "<div><i>" + T.esc(l[0]) + "</i>" + T.esc(l[2]) +
          '<span class="small"> &middot; ' + T.esc(l[1]) + "</span></div>";
      }).join("");
      det.innerHTML = '<div class="cu-det"><h4 style="color:' + r.color + '">' + T.esc(r.name) +
        "</h4>" +
        '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
        '<div style="width:150px;flex:0 0 150px">' + sigilSvg(f, r.color, 150) + "</div>" +
        '<div style="flex:1 1 200px"><div class="cu-kv">' + kv + "</div></div></div></div>";
    }

    host.addEventListener("click", function (ev) {
      var el = ev.target;
      while (el && el !== host && !el.getAttribute("data-tank")) el = el.parentNode;
      if (!el || el === host) return;
      var name = el.getAttribute("data-tank");
      sel = (sel === name) ? null : name;
      paint();
    });
    root.querySelectorAll('[data-cu="sig"]').forEach(function (b) {
      b.addEventListener("click", function () {
        driver = b.getAttribute("data-id");
        root.querySelectorAll('[data-cu="sig"]').forEach(function (x) {
          x.className = "cu-chip" + (x === b ? " cu-on" : "");
        });
        paint();
      });
    });
    paint();
  }

  /* --------------------------------------------------------------- preview */

  /* The constellation panel in miniature: same graph, same seed, so the tile
   * and the page settle into the same arrangement.
   *
   * Two allowances for where it is shown. The layout is fitted into the top
   * 178px rather than the whole square, because the hub lays a caption scrim
   * across the bottom third and a node under it is a node nobody sees. And the
   * node fills are pulled a quarter of the way to white, the halo carries the
   * suite's violet, and the links are brighter than on the page, because the
   * tile is drawn at 62% opacity over the panel colour: the raw tank hues
   * dissolve into the background at that strength. */
  function previewSvg(T) {
    var g = buildGraph(T);
    if (!g) return "";
    var top = Math.min(44, g.edges.length);
    var sim = makeSim(g, 7, top);
    var i;
    for (i = 0; i < 520; i++) stepSim(sim, 1.0);
    var fr = fitFrame(sim.pts, 240, 178, 11);
    var out = [];
    out.push('<defs><radialGradient id="cuPvBg" cx="50%" cy="36%" r="78%">' +
      '<stop offset="0" stop-color="#1b1a3c"/><stop offset="1" stop-color="#080b1c"/>' +
      "</radialGradient></defs>");
    out.push('<rect x="0" y="0" width="240" height="240" rx="10" fill="url(#cuPvBg)"/>');
    for (i = 0; i < sim.edges.length; i++) {
      var e = sim.edges[i], p = sim.pts[e.a], q = sim.pts[e.b];
      out.push('<line x1="' + (p.x * fr.s + fr.ox).toFixed(1) + '" y1="' + (p.y * fr.s + fr.oy).toFixed(1) +
        '" x2="' + (q.x * fr.s + fr.ox).toFixed(1) + '" y2="' + (q.y * fr.s + fr.oy).toFixed(1) +
        '" stroke="rgba(186,196,242,' + (0.16 + e.wn * 0.60).toFixed(2) + ')" stroke-width="' +
        (0.5 + e.wn * 3.0).toFixed(2) + '"/>');
    }
    for (i = 0; i < sim.pts.length; i++) {
      var pt = sim.pts[i], nd = g.nodes[i];
      var cx = (pt.x * fr.s + fr.ox).toFixed(1), cy = (pt.y * fr.s + fr.oy).toFixed(1);
      var rr = Math.max(2.5, pt.r * fr.s);
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (rr + 4.5).toFixed(1) +
        '" fill="rgba(126,101,172,0.34)"/>');
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rr.toFixed(1) +
        '" fill="' + mix(nd.color, "#ffffff", 0.24) +
        '" stroke="rgba(255,255,255,0.58)" stroke-width="1"/>');
    }
    return '<svg viewBox="0 0 240 240" role="img">' + out.join("") + "</svg>";
  }

  /* ------------------------------------------------------------- registration */

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "curios",
    title: "Curiosities",
    blurb: "Odd-angle views: a tank web you can drag, a periodic table, duels, sigils.",
    accent: "#65508a",
    css: CSS,

    preview: function (T) {
      try { return previewSvg(T); } catch (e) { return ""; }
    },

    render: function (T) {
      var parts = [];
      function add(fn) {
        try { parts.push(fn(T) || ""); } catch (e) { parts.push(""); }
      }
      add(factsPanel);
      add(constellationPanel);
      add(periodicPanel);
      add(gravityPanel);
      add(duelPanel);
      add(sunburstPanel);
      add(sigilPanel);
      var body = parts.join("");
      if (!body) {
        return '<div class="panel avg-panel"><h2>Curiosities</h2>' +
          '<div class="small">Not enough data loaded to build these views.</div></div>';
      }
      return body;
    },

    wire: function (T, root) {
      if (!root) return;
      [wireConstellation, wirePeriodic, wireGravity, wireDuel, wireSunburst, wireSigils]
        .forEach(function (fn) {
          try { fn(T, root); } catch (e) { /* one broken panel must not kill the page */ }
        });
    }
  });
})();

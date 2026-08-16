/* Atlas suite: the maps themselves.
 *
 * Terrain owns distance. This file owns the grounds as places: how big they
 * are, what shape the drivable part is, where the two spawns sit, where the
 * fighting settles, and how a match on one plays out differently from a match
 * on another.
 *
 * Everything spatial is drawn through the same verified world-to-minimap
 * calibration the site's own replay map view uses (match.calibration), so a
 * point lands in the same pixel here as it does there. Nothing here writes.
 */
(function () {
  "use strict";

  var CSS = "" +
    ".at-ctrls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}" +
    ".at-ctrls-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin-right:2px}" +
    ".at-btn{-webkit-appearance:none;appearance:none;cursor:pointer;font:inherit;font-size:.78rem;" +
      "padding:5px 11px;border-radius:999px;border:1px solid var(--border,#232c52);" +
      "background:var(--panel2,#131a33);color:var(--dim,#7f89b3);line-height:1.25}" +
    ".at-btn:hover{color:var(--text,#d6dcf5);border-color:#3d4a7d}" +
    ".at-btn[disabled]{opacity:.36;cursor:not-allowed}" +
    ".at-btn.on{background:rgba(67,111,131,.34);border-color:#6ba0ba;color:#dbeef7}" +
    ".at-btn .at-sub{opacity:.62;margin-left:5px;font-size:.72rem}" +
    ".at-sel{font:inherit;font-size:.78rem;padding:5px 8px;border-radius:8px;" +
      "border:1px solid var(--border,#232c52);background:var(--panel2,#131a33);" +
      "color:var(--text,#d6dcf5)}" +
    ".at-swatch{width:9px;height:9px;border-radius:2px;display:inline-block;" +
      "margin-right:6px;vertical-align:middle}" +
    ".at-split{display:grid;grid-template-columns:minmax(280px,460px) 1fr;gap:24px;" +
      "align-items:start}" +
    "@media (max-width:860px){.at-split{grid-template-columns:1fr}}" +
    ".at-stage{position:relative;width:100%;border:1px solid var(--border,#232c52);" +
      "border-radius:10px;overflow:hidden;background:#04060e}" +
    ".at-stage img{display:block;width:100%;height:auto;opacity:.72}" +
    ".at-stage canvas{position:absolute;left:0;top:0;pointer-events:none}" +
    ".at-stage-pad{width:100%;padding-bottom:100%}" +
    ".at-stage-msg{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;" +
      "align-items:center;justify-content:center;text-align:center;padding:22px;" +
      "font-size:.82rem;color:var(--dim,#7f89b3);background:rgba(4,6,14,.7)}" +
    ".at-facts{list-style:none;margin:0;padding:0;font-size:.84rem}" +
    ".at-facts li{display:flex;align-items:baseline;gap:10px;padding:5px 0;" +
      "border-bottom:1px solid rgba(255,255,255,.06)}" +
    ".at-facts li:last-child{border-bottom:0}" +
    ".at-facts .at-k{flex:1 1 auto;color:var(--dim,#7f89b3)}" +
    ".at-facts .at-v{color:var(--text,#d6dcf5);font-variant-numeric:tabular-nums;" +
      "text-align:right;white-space:nowrap}" +
    ".at-facts .at-v em{font-style:normal;color:var(--dim,#7f89b3);font-size:.9em}" +
    ".at-read{font-size:.78rem;color:var(--dim,#7f89b3);margin:8px 0 0;min-height:1.4em;" +
      "font-family:ui-monospace,'Cascadia Mono',Consolas,Menlo,monospace}" +
    ".at-read b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".at-sliderrow{display:flex;align-items:center;gap:12px;margin:10px 0 4px}" +
    ".at-sliderrow input[type=range]{flex:1 1 auto;accent-color:#6ba0ba;min-width:120px}" +
    ".at-phaselbl{font-size:.78rem;color:var(--text,#d6dcf5);width:170px;flex:0 0 170px}" +
    ".at-sub-h{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin:18px 0 8px}" +
    ".at-empty{font-size:.82rem;color:var(--dim,#7f89b3);padding:10px 0;margin:0}" +
    ".at-tiles{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end}" +
    ".at-tile{cursor:pointer;border:0;background:none;padding:0;font:inherit;text-align:center}" +
    ".at-tile canvas{display:block;border-radius:6px;background:#05080f;" +
      "border:1px solid rgba(255,255,255,.10)}" +
    ".at-tile.on canvas{border-color:#6ba0ba;box-shadow:0 0 0 1px rgba(107,160,186,.55)}" +
    ".at-tile-cap{font-size:.76rem;color:var(--dim,#7f89b3);margin-top:6px}" +
    ".at-tile.on .at-tile-cap{color:#dbeef7}" +
    ".at-tile-cap b{display:block;color:var(--text,#d6dcf5);font-weight:600}" +
    ".at-axisrow{margin:0 0 4px}" +
    ".at-legend{display:flex;flex-wrap:wrap;gap:12px 18px;margin:10px 0 0;" +
      "font-size:.78rem;color:var(--dim,#7f89b3)}" +
    ".at-legend span.at-li{display:inline-flex;align-items:center;gap:6px}";

  var ACCENT = "#436f83";
  var UU_PER_M = 100;          // decoded world units per metre
  var HEAT_CELLS = 100;        // phase grid resolution across the capture square
  var A_HEX = "#4fd08a";       // team A, brightened for drawing over map art
  var B_HEX = "#ff7d68";       // team B
  var PHASE_DEFAULT = 8;       // per-match files pooled before you ask for more
  var TT = null;

  // ------------------------------------------------------------------ utils

  function E(s) { return TT && TT.esc ? TT.esc(s) : String(s == null ? "" : s); }
  function NUM(v) { return TT && TT.fmtNum ? TT.fmtNum(v) : String(v); }
  function PCT(v) { return TT && TT.fmtPct ? TT.fmtPct(v) : String(v) + "%"; }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function asc(a, b) { return a - b; }

  function hexRgb(hex, fallback) {
    var h = String(hex || "").replace("#", "");
    if (h.length !== 6) return fallback;
    var n = parseInt(h, 16);
    if (isNaN(n)) return fallback;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function chartColor(i) {
    var c = (TT && TT.CHART_COLORS) || [ACCENT];
    return c[i % c.length];
  }
  function tankHue(name, i) {
    var c = TT && TT.tankColor ? TT.tankColor(name) : null;
    return c || chartColor(i);
  }
  function pctileSorted(sorted, p) {
    if (!sorted || !sorted.length) return null;
    var i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[i];
  }
  function zeros(n) {
    var a = [], i;
    for (i = 0; i < n; i++) a.push(0);
    return a;
  }
  function clock(sec) {
    if (!isNum(sec)) return "-";
    var s = Math.round(sec), m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  // 95% Wilson score interval, as percentages. Normal approximation intervals
  // go negative on small samples; this one does not.
  function wilson(k, n) {
    if (!n) return null;
    var z = 1.96, p = k / n, d = 1 + z * z / n;
    var c = (p + z * z / (2 * n)) / d;
    var m = (z / d) * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, (c - m) * 100), Math.min(100, (c + m) * 100)];
  }

  function mapListOf(T) {
    var maps = (T.DATA && T.DATA.maps) || [];
    return maps.filter(function (m) { return m && m.slug && m.match_ids; })
      .slice().sort(function (a, b) {
        return (b.match_ids.length || 0) - (a.match_ids.length || 0);
      });
  }
  function mapEntry(T, slug) {
    var maps = mapListOf(T), i;
    for (i = 0; i < maps.length; i++) if (maps[i].slug === slug) return maps[i];
    return null;
  }
  function mapNameOf(T, slug) {
    var m = mapEntry(T, slug);
    return m ? m.map : slug;
  }

  // What the official list says exists, against what this archive actually has.
  function coverage(T) {
    var off = (T.OFFICIAL && T.OFFICIAL.maps) || {};
    var have = {}, list = mapListOf(T), i;
    for (i = 0; i < list.length; i++) have[list[i].map] = list[i];
    function tag(names) {
      return (names || []).map(function (n) { return { name: n, rec: have[n] || null }; });
    }
    var rel = tag(off.released), pro = tag(off.prototype);
    var known = {};
    rel.concat(pro).forEach(function (r) { known[r.name] = 1; });
    var extra = [];
    for (i = 0; i < list.length; i++) {
      if (!known[list[i].map]) extra.push({ name: list[i].map, rec: list[i] });
    }
    return { released: rel, prototype: pro, extra: extra };
  }

  function coverageNote(T) {
    var c = coverage(T);
    function missing(rows) {
      return rows.filter(function (r) { return !r.rec; })
        .map(function (r) { return r.name; });
    }
    var mRel = missing(c.released), mPro = missing(c.prototype);
    var out = [];
    out.push((c.released.length - mRel.length) + " of " + c.released.length +
      " released maps recorded, " + (c.prototype.length - mPro.length) + " of " +
      c.prototype.length + " prototypes.");
    if (mRel.length) {
      out.push("No replay of " + E(mRel.join(", ")) + ". Blank means absent, not zero.");
    }
    if (mPro.length) {
      out.push(E(mPro.join(", ")) + " unrecorded too.");
    }
    return out.join(" ");
  }

  // ------------------------------------------------------ per-map file prep

  // World -> canvas. Identical maths to the site's own replay map, so the
  // overlay sits on the art rather than near it.
  function buildTf(cal, w, h) {
    if (cal && cal.worldCenterX != null && cal.worldSize) {
      var th = (cal.rotationDeg || 0) * Math.PI / 180;
      var cs = Math.cos(th), sn = Math.sin(th);
      return {
        calibrated: true,
        fwd: function (x, y) {
          var dx = x - cal.worldCenterX, dy = y - cal.worldCenterY;
          var rx = dx * cs - dy * sn, ry = dx * sn + dy * cs;
          if (cal.flipX) rx = -rx;
          if (cal.flipY) ry = -ry;
          return [(0.5 + rx / cal.worldSize) * w, (0.5 + ry / cal.worldSize) * h];
        }
      };
    }
    return null;
  }

  // The modal start cell of a team's recorded tracks, refined by averaging
  // every start within 60 m of it. Enemy tracks only begin when the enemy is
  // first seen, so a team's tracks are a mix of true spawn starts and mid-map
  // pickups; the cluster is the spawn, the rest is noise.
  function spawnOf(d, team) {
    var lines = d.trackLines || [], starts = [], i;
    for (i = 0; i < lines.length; i++) {
      if (lines[i][0] !== team) continue;
      var pts = lines[i][1];
      if (pts && pts.length) starts.push(pts[0]);
    }
    if (starts.length < 6) return null;
    var bucket = {}, best = null, bestN = 0, key;
    for (i = 0; i < starts.length; i++) {
      key = Math.round(starts[i][0] / 2000) + "|" + Math.round(starts[i][1] / 2000);
      bucket[key] = (bucket[key] || 0) + 1;
      if (bucket[key] > bestN) { bestN = bucket[key]; best = key; }
    }
    if (!best) return null;
    var parts = best.split("|");
    var cx = parseFloat(parts[0]) * 2000, cy = parseFloat(parts[1]) * 2000;
    var sx = 0, sy = 0, n = 0;
    for (i = 0; i < starts.length; i++) {
      if (Math.hypot(starts[i][0] - cx, starts[i][1] - cy) <= 6000) {
        sx += starts[i][0]; sy += starts[i][1]; n++;
      }
    }
    if (n < 6) return null;
    return { x: sx / n, y: sy / n, n: n, of: starts.length };
  }

  function prepMap(d) {
    if (d._at) return d;
    var cal = (d.match && d.match.calibration) || null;
    var heat = d.heatTeam || [], i;

    // grid pitch, read off the data rather than assumed
    var seen = {}, xs = [];
    for (i = 0; i < heat.length; i++) {
      if (!seen[heat[i][0]]) { seen[heat[i][0]] = 1; xs.push(heat[i][0]); }
    }
    xs.sort(asc);
    var gap = Infinity;
    for (i = 1; i < xs.length; i++) {
      var g = xs[i] - xs[i - 1];
      if (g > 0 && g < gap) gap = g;
    }
    var pitch = isFinite(gap) && gap > 0
      ? gap
      : (cal && cal.worldSize ? cal.worldSize / 220 : 400);

    // footprint: every grid cell anybody was recorded standing in
    var fb = null, weights = [];
    for (i = 0; i < heat.length; i++) {
      var c = heat[i];
      if (!fb) fb = { minX: c[0], maxX: c[0], minY: c[1], maxY: c[1] };
      if (c[0] < fb.minX) fb.minX = c[0];
      if (c[0] > fb.maxX) fb.maxX = c[0];
      if (c[1] < fb.minY) fb.minY = c[1];
      if (c[1] > fb.maxY) fb.maxY = c[1];
      weights.push((c[2] || 0) + (c[3] || 0));
    }
    weights.sort(asc);

    var spawns = { 0: spawnOf(d, 0), 1: spawnOf(d, 1) };
    var axis = null;
    if (spawns[0] && spawns[1]) {
      var ax = spawns[0].x, ay = spawns[0].y;
      var bx = spawns[1].x, by = spawns[1].y;
      var len = Math.hypot(bx - ax, by - ay);
      if (len > 1) {
        axis = { ax: ax, ay: ay, bx: bx, by: by, len: len,
                 ux: (bx - ax) / len, uy: (by - ay) / len };
      }
    }

    var cellM = pitch / UU_PER_M;
    d._at = {
      cal: cal,
      pitch: pitch,
      cells: heat.length,
      footprint: fb,
      areaM2: heat.length * cellM * cellM,
      heatScale: pctileSorted(weights, 0.95) || 1,
      spawns: spawns,
      axis: axis
    };
    return d;
  }

  function ensureMap(T, S, slug) {
    if (S.mapCache[slug]) return Promise.resolve(S.mapCache[slug]);
    if (S.mapPending[slug]) return S.mapPending[slug];
    var p = T.loadJson("maps/" + encodeURIComponent(slug) + ".json").then(function (d) {
      if (!d || !d.match) throw new Error("no map file");
      S.mapCache[slug] = prepMap(d);
      delete S.mapPending[slug];
      fire(S, "map", slug);
      return S.mapCache[slug];
    })["catch"](function (err) {
      delete S.mapPending[slug];
      S.mapFailed[slug] = true;
      fire(S, "map", slug);
      throw err;
    });
    S.mapPending[slug] = p;
    return p;
  }

  function fire(S, kind, slug) {
    for (var i = 0; i < S.listeners.length; i++) {
      try { S.listeners[i](kind, slug); } catch (e) { /* one panel must not kill another */ }
    }
  }

  // ------------------------------------------------- per-match phase pooling

  // Evenly spaced picks across a map's match list, so a sample of 8 is spread
  // over the whole archive rather than being the 8 oldest replays.
  function spread(ids, want) {
    if (ids.length <= want) return ids.slice();
    var out = [], step = ids.length / want, i;
    for (i = 0; i < want; i++) out.push(ids[Math.floor(i * step)]);
    return out;
  }

  function newPhaseJob(want) {
    return { want: want, done: 0, failed: 0, cal: null, phases: 0,
             a: [], b: [], maxPer: [], maxAll: 0, running: false, token: 0 };
  }

  function addPhaseFile(job, deep) {
    var rows = deep && deep.heatPhases;
    if (!rows || !rows.length) return;
    var cal = deep.match && deep.match.calibration;
    if (!job.cal) {
      if (!cal || cal.worldCenterX == null || !cal.worldSize) return;
      job.cal = cal;
      job.phases = deep.heatPhaseCount || 6;
      for (var p = 0; p < job.phases; p++) {
        job.a.push(zeros(HEAT_CELLS * HEAT_CELLS));
        job.b.push(zeros(HEAT_CELLS * HEAT_CELLS));
      }
    }
    var minX = job.cal.worldCenterX - job.cal.worldSize / 2;
    var minY = job.cal.worldCenterY - job.cal.worldSize / 2;
    var span = job.cal.worldSize, i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i], ph = r[2] | 0;
      if (ph < 0 || ph >= job.phases) continue;
      var gx = Math.floor((r[0] - minX) / span * HEAT_CELLS);
      var gy = Math.floor((r[1] - minY) / span * HEAT_CELLS);
      if (gx < 0 || gy < 0 || gx >= HEAT_CELLS || gy >= HEAT_CELLS) continue;
      var k = gy * HEAT_CELLS + gx;
      job.a[ph][k] += r[3] || 0;
      job.b[ph][k] += r[4] || 0;
    }
  }

  // Per-phase and overall 97th percentile of cell weight, so one parking spot
  // does not flatten the rest of the map.
  function rescale(job) {
    job.maxPer = [];
    job.maxAll = 0;
    for (var p = 0; p < job.phases; p++) {
      var vals = [], i;
      for (i = 0; i < job.a[p].length; i++) {
        var t = job.a[p][i] + job.b[p][i];
        if (t > 0) vals.push(t);
      }
      vals.sort(asc);
      var m = pctileSorted(vals, 0.97) || 1;
      job.maxPer.push(m);
      if (m > job.maxAll) job.maxAll = m;
    }
    if (!job.maxAll) job.maxAll = 1;
  }

  // ------------------------------------------------------------- preview
  //
  // Six plates, one per recorded ground, laid out like an atlas index. Plate
  // AREA is that map's share of the archive (side scales with the square root
  // of its match count), so Expanse showing up as a chip rather than a plate
  // is the point: it has one replay. The horizontal split inside each plate is
  // that map's decided win rate by team, and the lower band is team A because
  // team A's spawn sits at the bottom of every calibrated capture in this
  // archive. Nothing here is decorative except the corner ticks.
  //
  // The hub dims this to 62% over #10162e and scrims the bottom third, so the
  // fills are deliberately light and the whole grid sits above y=150.
  function preview(T) {
    TT = T;
    var maps = mapListOf(T).slice(0, 6);
    if (!maps.length) return "";
    var maxG = 1, i;
    for (i = 0; i < maps.length; i++) {
      if ((maps[i].games || 0) > maxG) maxG = maps[i].games || 0;
    }
    var CX = [46, 120, 194], CY = [56, 122];
    var body = "";
    for (i = 0; i < maps.length; i++) {
      var m = maps[i];
      var side = 9 + 51 * Math.sqrt((m.games || 0) / maxG);
      var cx = CX[i % 3], cy = CY[Math.floor(i / 3)];
      var x = cx - side / 2, y = cy - side / 2;
      var wa = isNum(m.win_rate_a) ? m.win_rate_a : 50;
      var hb = side * (1 - wa / 100);       // team B holds the top band
      body +=
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + side.toFixed(1) +
          '" height="' + side.toFixed(1) + '" rx="3" fill="#0b1226"></rect>' +
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + side.toFixed(1) +
          '" height="' + hb.toFixed(1) + '" rx="2" fill="#f0876f" fill-opacity="0.93"></rect>' +
        '<rect x="' + x.toFixed(1) + '" y="' + (y + hb).toFixed(1) + '" width="' + side.toFixed(1) +
          '" height="' + (side - hb).toFixed(1) + '" rx="2" fill="#7fd39b" fill-opacity="0.93"></rect>' +
        '<line x1="' + x.toFixed(1) + '" y1="' + (y + hb).toFixed(1) + '" x2="' +
          (x + side).toFixed(1) + '" y2="' + (y + hb).toFixed(1) +
          '" stroke="#ffffff" stroke-opacity="0.92" stroke-width="1.4"></line>' +
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + side.toFixed(1) +
          '" height="' + side.toFixed(1) + '" rx="3" fill="none" stroke="#cfe4ee" ' +
          'stroke-opacity="0.62" stroke-width="1.1"></rect>';
      // registration ticks, the one purely graphic element
      var t = 4.5;
      body +=
        '<path d="M' + x.toFixed(1) + " " + (y + t).toFixed(1) + "L" + x.toFixed(1) + " " +
          y.toFixed(1) + "L" + (x + t).toFixed(1) + " " + y.toFixed(1) +
          'M' + (x + side - t).toFixed(1) + " " + (y + side).toFixed(1) + "L" +
          (x + side).toFixed(1) + " " + (y + side).toFixed(1) + "L" + (x + side).toFixed(1) +
          " " + (y + side - t).toFixed(1) + '" fill="none" stroke="#9fd8ee" ' +
          'stroke-opacity="0.95" stroke-width="1.6"></path>';
    }
    return '<svg viewBox="0 0 240 240">' +
      '<defs><radialGradient id="atPvBg" cx="50%" cy="36%" r="78%">' +
      '<stop offset="0" stop-color="#17233f"></stop>' +
      '<stop offset="1" stop-color="#070b1a"></stop></radialGradient></defs>' +
      '<rect width="240" height="240" fill="url(#atPvBg)"></rect>' +
      body +
      '<line x1="20" y1="160" x2="220" y2="160" stroke="#9fd8ee" stroke-opacity="0.45" ' +
      'stroke-width="1"></line>' +
      "</svg>";
  }

  // ------------------------------------------------------ shared map picker

  function pickerHtml(T, sel, cls) {
    var maps = mapListOf(T);
    var html = maps.map(function (m) {
      return '<button type="button" class="at-btn ' + cls + (m.slug === sel ? " on" : "") +
        '" data-slug="' + E(m.slug) + '">' + E(m.map) +
        '<span class="at-sub">' + m.games + "</span></button>";
    }).join("");
    var c = coverage(T), gaps = [];
    c.released.concat(c.prototype).forEach(function (r) {
      if (!r.rec) gaps.push(r.name);
    });
    html += gaps.map(function (n) {
      return '<button type="button" class="at-btn" disabled title="No replay here">' +
        E(n) + '<span class="at-sub">0</span></button>';
    }).join("");
    return html;
  }

  function syncPicker(root, cls, sel) {
    var btns = root.querySelectorAll("." + cls), i;
    for (i = 0; i < btns.length; i++) {
      btns[i].className = "at-btn " + cls +
        (btns[i].getAttribute("data-slug") === sel ? " on" : "");
    }
  }

  function bindPicker(root, cls, onPick) {
    var btns = root.querySelectorAll("." + cls), i;
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var s = this.getAttribute("data-slug");
        if (s) onPick(s);
      });
    }
  }

  // ------------------------------------------------------------ stat cards

  function cardsHtml(T) {
    var maps = mapListOf(T), out = [], i;
    if (!maps.length) return "";
    var c = coverage(T);
    var withData = 0, total = 0, offTotal = c.released.length + c.prototype.length;
    for (i = 0; i < maps.length; i++) { withData++; total += maps[i].games || 0; }

    var lean = null, longest = null, shortest = null;
    for (i = 0; i < maps.length; i++) {
      var m = maps[i];
      if ((m.decided_games || 0) >= 20 && isNum(m.win_rate_a)) {
        var off = Math.abs(m.win_rate_a - 50);
        if (!lean || off > lean.off) lean = { off: off, m: m };
      }
      if ((m.games || 0) >= 20 && isNum(m.avg_duration_sec)) {
        if (!longest || m.avg_duration_sec > longest.avg_duration_sec) longest = m;
        if (!shortest || m.avg_duration_sec < shortest.avg_duration_sec) shortest = m;
      }
    }

    out.push(T.card("Grounds with replays", withData + " of " + offTotal));
    out.push(T.card("Matches placed on them", NUM(total)));
    if (lean) {
      out.push(T.card("Widest side lean",
        E(lean.m.map) + '<em style="font-style:normal;color:var(--dim);font-size:.6em"> ' +
        PCT(Math.round(lean.m.win_rate_a * 10) / 10) + " to A</em>"));
    }
    if (longest) out.push(T.card("Longest average match", E(longest.map) + " " + clock(longest.avg_duration_sec)));
    if (shortest && longest && shortest !== longest) {
      out.push(T.card("Shortest average match", E(shortest.map) + " " + clock(shortest.avg_duration_sec)));
    }
    return '<div class="stat-grid">' + out.join("") + "</div>" +
      '<p class="small" style="margin-top:-10px">' + coverageNote(T) +
      " Side lean needs 20+ decided matches.</p>";
  }

  // ------------------------------------------------- panel 1: the ground

  function groundPanel(T, sel) {
    var maps = mapListOf(T);
    if (!maps.length) return "";
    var body =
      '<div class="at-ctrls"><span class="at-ctrls-label">Ground</span>' +
        pickerHtml(T, sel, "at-gpick") + "</div>" +
      '<div class="at-split">' +
        '<div>' +
          '<div class="at-stage at-gstage">' +
            '<div class="at-stage-pad"></div>' +
            '<img class="at-gimg" alt="" src="assets/maps/minimap/' + E(sel) + '.png">' +
            '<canvas class="at-gcv"></canvas>' +
            '<div class="at-stage-msg at-gmsg">Loading the position file...</div>' +
          "</div>" +
          '<div class="at-legend">' +
            '<span class="at-li"><span class="at-swatch" style="background:' + A_HEX +
              '"></span>Team A ground</span>' +
            '<span class="at-li"><span class="at-swatch" style="background:' + B_HEX +
              '"></span>Team B ground</span>' +
            '<span class="at-li"><span class="at-swatch" style="background:#ffffff' +
              '"></span>Spawn, and the line between them</span>' +
          "</div>" +
        "</div>" +
        '<div><ul class="at-facts at-gfacts"><li><span class="at-k">Loading</span>' +
          '<span class="at-v">...</span></li></ul></div>' +
      "</div>";
    var note = "Cell colour is whoever held the ground. Blank means unvisited, not zero. " +
      "Spawn markers are guessed from where tracks start.";
    return '<div class="panel avg-panel at-ground"><h2>The ground</h2>' + body +
      '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function drawFootprint(cv, d, w) {
    var ctx = cv.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = w + "px";
    cv.style.height = w + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, w);

    var P = d._at, cal = P.cal;
    var tf = buildTf(cal, w, w);
    if (!tf) return null;

    // Cells go onto a small offscreen buffer and are then scaled up, which is
    // both faster than thousands of fillRects and gives the footprint a soft
    // edge instead of a staircase.
    var N = 220;
    var off = document.createElement("canvas");
    off.width = N; off.height = N;
    var octx = off.getContext("2d");
    var img = octx.createImageData(N, N), px = img.data;
    var ga = hexRgb(A_HEX, [79, 208, 138]), gb = hexRgb(B_HEX, [255, 125, 104]);
    var heat = d.heatTeam || [], i;
    var minX = cal.worldCenterX - cal.worldSize / 2;
    var minY = cal.worldCenterY - cal.worldSize / 2;
    var scale = P.heatScale || 1;
    for (i = 0; i < heat.length; i++) {
      var c = heat[i], t = (c[2] || 0) + (c[3] || 0);
      if (!t) continue;
      var gx = Math.floor((c[0] - minX) / cal.worldSize * N);
      var gy = Math.floor((c[1] - minY) / cal.worldSize * N);
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
      var f = (c[3] || 0) / t;
      var k = (gy * N + gx) * 4;
      px[k] = Math.round(ga[0] + (gb[0] - ga[0]) * f);
      px[k + 1] = Math.round(ga[1] + (gb[1] - ga[1]) * f);
      px[k + 2] = Math.round(ga[2] + (gb[2] - ga[2]) * f);
      px[k + 3] = Math.round(90 + 150 * Math.min(1, Math.sqrt(t / scale)));
    }
    octx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgba(4,7,17,0.42)";
    ctx.fillRect(0, 0, w, w);
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, w);

    // spawns and the line between them
    var sa = P.spawns[0], sb = P.spawns[1];
    if (sa && sb) {
      var pa = tf.fwd(sa.x, sa.y), pb = tf.fwd(sb.x, sb.y);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      ctx.setLineDash([]);
    }
    [[0, sa, A_HEX, "A"], [1, sb, B_HEX, "B"]].forEach(function (row) {
      if (!row[1]) return;
      var p = tf.fwd(row[1].x, row[1].y);
      ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, 7);
      ctx.fillStyle = "rgba(6,9,20,0.85)"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = row[2]; ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(row[3], p[0], p[1] + 0.5);
    });

    // scale bar, 200 m
    var o0 = tf.fwd(0, 0), o1 = tf.fwd(200 * UU_PER_M, 0);
    var barPx = Math.abs(o1[0] - o0[0]);
    if (barPx > 12 && barPx < w * 0.8) {
      var bx = 12, by = w - 14;
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + barPx, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4);
      ctx.moveTo(bx + barPx, by - 4); ctx.lineTo(bx + barPx, by + 4); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("200 m", bx + 2, by - 5);
    }
    return tf;
  }

  function durationStats(T, slug) {
    var ms = (T.DATA && T.DATA.matches) || [], v = [], i;
    for (i = 0; i < ms.length; i++) {
      if (ms[i].map_slug === slug && isNum(ms[i].duration_sec)) v.push(ms[i].duration_sec);
    }
    v.sort(asc);
    if (!v.length) return null;
    return { n: v.length, lo: v[0], hi: v[v.length - 1],
             p25: pctileSorted(v, 0.25), p50: pctileSorted(v, 0.5), p75: pctileSorted(v, 0.75) };
  }

  function endingsOf(T, slug) {
    var ms = (T.DATA && T.DATA.matches) || [], out = { elimination: 0, capture: 0, other: 0, n: 0 }, i;
    for (i = 0; i < ms.length; i++) {
      if (ms[i].map_slug !== slug) continue;
      out.n++;
      var w = ms[i].win_type;
      if (w === "elimination") out.elimination++;
      else if (w === "capture") out.capture++;
      else out.other++;
    }
    return out;
  }

  function factsHtml(T, slug, d) {
    var m = mapEntry(T, slug);
    if (!m) return "";
    var rows = [];
    function row(k, v, sub) {
      rows.push('<li><span class="at-k">' + E(k) + '</span><span class="at-v">' + v +
        (sub ? " <em>" + E(sub) + "</em>" : "") + "</span></li>");
    }
    var c = coverage(T), tier = "not on the official list";
    c.released.forEach(function (r) { if (r.name === m.map) tier = "released"; });
    c.prototype.forEach(function (r) { if (r.name === m.map) tier = "prototype"; });

    row("Official status", E(tier));
    row("Matches recorded", NUM(m.games), m.decided_games + " with a winner");
    var dur = durationStats(T, slug);
    if (dur) {
      row("Match length, median", clock(dur.p50),
        clock(dur.lo) + " to " + clock(dur.hi));
    }
    var end = endingsOf(T, slug);
    if (end.n) {
      row("Ends by elimination", PCT(Math.round(end.elimination / end.n * 1000) / 10),
        end.capture + " by capture" + (end.other ? ", " + end.other + " not recorded" : ""));
    }
    if (isNum(m.avg_eliminations)) row("Tanks destroyed per match", NUM(Math.round(m.avg_eliminations * 10) / 10));
    if (isNum(m.avg_survival_pct)) row("Average share of a match survived", PCT(m.avg_survival_pct));
    if (isNum(m.win_rate_a) && m.decided_games) {
      var w = wilson(Math.round(m.win_rate_a / 100 * m.decided_games), m.decided_games);
      row("Team A wins", PCT(Math.round(m.win_rate_a * 10) / 10),
        w ? "95% range " + Math.round(w[0]) + " to " + Math.round(w[1]) + "%" : "");
    }

    if (d && d._at) {
      var P = d._at, fp = P.footprint;
      if (fp) {
        row("Recorded footprint", Math.round((fp.maxX - fp.minX) / UU_PER_M) + " by " +
          Math.round((fp.maxY - fp.minY) / UU_PER_M) + " m", "bounding box of driven ground");
        row("Ground driven on", NUM(Math.round(P.areaM2 / 1000) / 1000) + " km" +
          String.fromCharCode(178), NUM(P.cells) + " cells of " +
          (Math.round(P.pitch / UU_PER_M * 10) / 10) + " m");
      }
      if (P.axis) {
        row("Spawn to spawn", NUM(Math.round(P.axis.len / UU_PER_M)) + " m",
          "straight line");
      } else {
        row("Spawn to spawn", "-", "no clear spawn cluster");
      }
    }
    return '<ul class="at-facts at-gfacts">' + rows.join("") + "</ul>";
  }

  function wireGround(T, root, S) {
    var panel = root.querySelector(".at-ground");
    if (!panel) return;
    var stage = panel.querySelector(".at-gstage");
    var img = panel.querySelector(".at-gimg");
    var cv = panel.querySelector(".at-gcv");
    var msg = panel.querySelector(".at-gmsg");
    var factsBox = panel.querySelector(".at-gfacts");
    if (!stage || !cv) return;

    function facts(d) {
      var html = factsHtml(T, S.sel, d);
      var holder = panel.querySelector(".at-gfacts");
      if (holder && holder.parentNode) holder.parentNode.innerHTML = html;
    }

    function redraw() {
      var d = S.mapCache[S.sel];
      var w = Math.max(180, Math.round(stage.clientWidth || 400));
      if (!d) {
        msg.style.display = "";
        msg.textContent = S.mapFailed[S.sel]
          ? "Could not load " + mapNameOf(T, S.sel) + "."
          : "Loading " + mapNameOf(T, S.sel) + "...";
        facts(null);
        return;
      }
      msg.style.display = "none";
      var tf = drawFootprint(cv, d, w);
      if (!tf) {
        msg.style.display = "";
        msg.textContent = "No verified alignment for this map.";
      }
      facts(d);
    }

    function select(slug) {
      S.sel = slug;
      syncPicker(panel, "at-gpick", slug);
      if (img) img.setAttribute("src", "assets/maps/minimap/" + encodeURIComponent(slug) + ".png");
      redraw();
      if (!S.mapCache[slug]) {
        ensureMap(T, S, slug).then(function () {
          if (S.sel === slug) redraw();
        }, function () {
          if (S.sel === slug) redraw();
        });
      }
    }

    bindPicker(panel, "at-gpick", function (slug) { S.select(slug); });
    S.listeners.push(function (kind, slug) {
      if (kind === "sel") { select(slug); return; }
      if (kind === "map" && slug === S.sel) redraw();
    });
    if (img) img.addEventListener("load", redraw);

    var timer = null;
    function onResize() {
      if (!document.body.contains(panel)) {
        window.removeEventListener("resize", onResize);
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(redraw, 160);
    }
    window.addEventListener("resize", onResize);
    select(S.sel);
    if (factsBox) { /* replaced on first draw */ }
  }

  // ------------------------------------------- panel 2: the fight over time

  function phasePanel(T, sel) {
    var maps = mapListOf(T);
    if (!maps.length) return "";
    var body =
      '<div class="at-ctrls"><span class="at-ctrls-label">Ground</span>' +
        pickerHtml(T, sel, "at-ppick") + "</div>" +
      '<div class="at-ctrls">' +
        '<span class="at-ctrls-label">Show</span>' +
        '<button type="button" class="at-btn at-pteam on" data-team="both">Both teams</button>' +
        '<button type="button" class="at-btn at-pteam" data-team="a">' +
          '<span class="at-swatch" style="background:' + A_HEX + '"></span>Team A</button>' +
        '<button type="button" class="at-btn at-pteam" data-team="b">' +
          '<span class="at-swatch" style="background:' + B_HEX + '"></span>Team B</button>' +
        '<span class="at-ctrls-label" style="margin-left:8px">Brightness</span>' +
        '<button type="button" class="at-btn at-pscale on" data-scale="each">Per slice</button>' +
        '<button type="button" class="at-btn at-pscale" data-scale="all">Across the match</button>' +
        '<span class="at-ctrls-label" style="margin-left:8px">Pool</span>' +
        '<select class="at-sel at-pcount">' +
          '<option value="8" selected>8 matches</option>' +
          '<option value="16">16 matches</option>' +
          '<option value="24">24 matches</option>' +
        "</select>" +
      "</div>" +
      '<div class="at-split">' +
        '<div>' +
          '<div class="at-stage at-pstage">' +
            '<div class="at-stage-pad"></div>' +
            '<img class="at-pimg" alt="" src="assets/maps/minimap/' + E(sel) + '.png">' +
            '<canvas class="at-pcv"></canvas>' +
            '<div class="at-stage-msg at-pmsg">Pooling match files...</div>' +
          "</div>" +
        "</div>" +
        '<div>' +
          '<div class="at-sliderrow">' +
            '<button type="button" class="at-btn at-pplay">Play</button>' +
            '<span class="at-phaselbl at-plabel">All of the match</span>' +
          "</div>" +
          '<div class="at-sliderrow">' +
            '<input type="range" class="at-pslider" min="0" max="6" step="1" value="0">' +
          "</div>" +
          '<p class="at-read at-pread">&nbsp;</p>' +
          '<div class="at-legend">' +
            '<span class="at-li"><span class="at-swatch" style="background:' + A_HEX +
              '"></span>Team A holds this ground</span>' +
            '<span class="at-li"><span class="at-swatch" style="background:' + B_HEX +
              '"></span>Team B holds it</span>' +
            '<span class="at-li">Brightness is time spent</span>' +
          "</div>" +
        "</div>" +
      "</div>";
    var note = "Slices are sixths of match progress, not clock time. A parked tank counts the " +
      "same as one trading shots. Sampled matches, not all.";
    return '<div class="panel avg-panel at-phase"><h2>Watch the fight move across the ground</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function drawPhase(cv, job, w, phase, team, scaleMode, spawnTf, spawns) {
    var ctx = cv.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = w + "px";
    cv.style.height = w + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, w);
    if (!job || !job.phases) return;

    var N = HEAT_CELLS;
    var off = document.createElement("canvas");
    off.width = N; off.height = N;
    var octx = off.getContext("2d");
    var img = octx.createImageData(N, N), px = img.data;
    var ga = hexRgb(A_HEX, [79, 208, 138]), gb = hexRgb(B_HEX, [255, 125, 104]);

    var lo = phase < 0 ? 0 : phase, hi = phase < 0 ? job.phases - 1 : phase;

    // job.phases comes from each map's own heatPhaseCount, but the slider's
    // range is fixed at six. On a map that recorded fewer phases the slider
    // can ask for one that was never built, and job.a[p] is then undefined,
    // which throws from inside an event handler and takes the page with it.
    // Clamp to what actually exists, and floor, since a range input's value
    // is a string and nothing else here forces it to a whole number.
    var avail = Math.min(job.a ? job.a.length : 0, job.b ? job.b.length : 0);
    if (!avail) return;
    lo = Math.max(0, Math.min(Math.floor(lo), avail - 1));
    hi = Math.max(lo, Math.min(Math.floor(hi), avail - 1));

    var scale;
    if (phase < 0) {
      scale = job.maxAll * (job.phases * 0.55);
    } else {
      scale = scaleMode === "each" ? (job.maxPer[phase] || 1) : job.maxAll;
    }
    if (!scale) scale = 1;

    var i, p;
    for (i = 0; i < N * N; i++) {
      var a = 0, b = 0;
      for (p = lo; p <= hi; p++) { a += job.a[p][i]; b += job.b[p][i]; }
      var t;
      if (team === "a") { t = a; b = 0; }
      else if (team === "b") { t = b; a = 0; }
      else t = a + b;
      if (t <= 0) continue;
      var f = team === "a" ? 0 : (team === "b" ? 1 : b / t);
      var k = i * 4;
      px[k] = Math.round(ga[0] + (gb[0] - ga[0]) * f);
      px[k + 1] = Math.round(ga[1] + (gb[1] - ga[1]) * f);
      px[k + 2] = Math.round(ga[2] + (gb[2] - ga[2]) * f);
      px[k + 3] = Math.round(255 * Math.min(1, Math.pow(t / scale, 0.6)));
    }
    octx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgba(3,5,14,0.58)";
    ctx.fillRect(0, 0, w, w);
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, w);

    if (spawnTf && spawns) {
      [[spawns[0], A_HEX, "A"], [spawns[1], B_HEX, "B"]].forEach(function (row) {
        if (!row[0]) return;
        var q = spawnTf.fwd(row[0].x, row[0].y);
        ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7);
        ctx.fillStyle = "rgba(6,9,20,0.8)"; ctx.fill();
        ctx.lineWidth = 1.8; ctx.strokeStyle = row[1]; ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(row[2], q[0], q[1] + 0.5);
      });
    }
  }

  function phaseLabel(phase, count) {
    if (phase < 0) return "All of the match";
    var lo = Math.round(phase / count * 100), hi = Math.round((phase + 1) / count * 100);
    var names = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
    var word = names[phase] || (phase + 1) + "th";
    return word + " sixth, " + lo + " to " + hi + "% in";
  }

  function wirePhase(T, root, S) {
    var panel = root.querySelector(".at-phase");
    if (!panel) return;
    var stage = panel.querySelector(".at-pstage");
    var img = panel.querySelector(".at-pimg");
    var cv = panel.querySelector(".at-pcv");
    var msg = panel.querySelector(".at-pmsg");
    var read = panel.querySelector(".at-pread");
    var label = panel.querySelector(".at-plabel");
    var slider = panel.querySelector(".at-pslider");
    var playBtn = panel.querySelector(".at-pplay");
    var countSel = panel.querySelector(".at-pcount");
    if (!stage || !cv) return;

    var phase = -1, team = "both", scaleMode = "each";
    var playing = false, timer = null;

    function job() { return S.phaseJobs[S.sel] || null; }

    function redraw() {
      var j = job();
      var w = Math.max(180, Math.round(stage.clientWidth || 400));
      var d = S.mapCache[S.sel];
      var tf = d && d._at && d._at.cal ? buildTf(d._at.cal, w, w) : null;
      var spawns = d && d._at ? d._at.spawns : null;
      if (!j || !j.phases || !j.done) {
        drawPhase(cv, null, w, phase, team, scaleMode, null, null);
        msg.style.display = "";
        msg.textContent = j && j.running
          ? "Pooling match files for " + mapNameOf(T, S.sel) + ", " + j.done + " of " + j.want + "..."
          : "Loading match files for " + mapNameOf(T, S.sel) + "...";
        return;
      }
      msg.style.display = j.running ? "" : "none";
      if (j.running) {
        msg.textContent = "Pooling " + mapNameOf(T, S.sel) + ", " + j.done + " of " + j.want + "...";
      }
      drawPhase(cv, j, w, phase, team, scaleMode, tf, spawns);
      slider.setAttribute("max", String(j.phases));
      label.textContent = phaseLabel(phase, j.phases);
      var total = mapEntry(T, S.sel);
      read.innerHTML = "Pooled from <b>" + j.done + "</b> of " +
        (total ? total.games : "?") + " recorded matches on <b>" + E(mapNameOf(T, S.sel)) +
        "</b>" + (j.failed ? ", " + j.failed + " file(s) failed" : "") + ". " +
        (phase < 0 ? "Showing every slice at once." :
          "Showing slice " + (phase + 1) + " of " + j.phases + ".");
    }

    function sliderToPhase(v) { return v === 0 ? -1 : v - 1; }

    function startLoad(slug) {
      var want = +countSel.value || PHASE_DEFAULT;
      var existing = S.phaseJobs[slug];
      if (existing && existing.want >= want && !existing.running) { redraw(); return; }
      if (existing && existing.running) { redraw(); return; }
      var entry = mapEntry(T, slug);
      if (!entry) return;
      var ids = spread(entry.match_ids || [], want);
      var j = newPhaseJob(ids.length);
      j.running = true;
      j.token = ++S.phaseToken;
      S.phaseJobs[slug] = j;
      redraw();
      var at = 0;
      function step() {
        if (j.token !== S.phaseToken) { j.running = false; return; }
        if (at >= ids.length) {
          j.running = false;
          rescale(j);
          if (S.sel === slug) redraw();
          return;
        }
        var id = ids[at++];
        T.loadJson("matches/" + encodeURIComponent(id) + ".json").then(function (deep) {
          if (j.token !== S.phaseToken) { j.running = false; return; }
          if (deep) { addPhaseFile(j, deep); j.done++; } else { j.failed++; }
          if (j.done && j.done % 4 === 0) { rescale(j); if (S.sel === slug) redraw(); }
          else if (S.sel === slug && j.done === 1) { rescale(j); redraw(); }
          step();
        }, function () {
          if (j.token !== S.phaseToken) { j.running = false; return; }
          j.failed++;
          step();
        });
      }
      step();
    }

    function select(slug) {
      if (img) img.setAttribute("src", "assets/maps/minimap/" + encodeURIComponent(slug) + ".png");
      if (!S.mapCache[slug]) {
        ensureMap(T, S, slug).then(function () { if (S.sel === slug) redraw(); },
          function () { /* footprint extras are optional here */ });
      }
      startLoad(slug);
    }

    bindPicker(panel, "at-ppick", function (slug) { S.select(slug); });
    S.listeners.push(function (kind, slug) {
      if (kind === "sel") { syncPicker(panel, "at-ppick", slug); select(slug); return; }
      if (kind === "map" && slug === S.sel) redraw();
    });

    slider.addEventListener("input", function () {
      phase = sliderToPhase(+this.value);
      stopPlay();
      redraw();
    });

    var teamBtns = panel.querySelectorAll(".at-pteam"), i;
    for (i = 0; i < teamBtns.length; i++) {
      teamBtns[i].addEventListener("click", function () {
        team = this.getAttribute("data-team");
        var all = panel.querySelectorAll(".at-pteam"), j;
        for (j = 0; j < all.length; j++) {
          all[j].className = "at-btn at-pteam" +
            (all[j].getAttribute("data-team") === team ? " on" : "");
        }
        redraw();
      });
    }
    var scaleBtns = panel.querySelectorAll(".at-pscale");
    for (i = 0; i < scaleBtns.length; i++) {
      scaleBtns[i].addEventListener("click", function () {
        scaleMode = this.getAttribute("data-scale");
        var all = panel.querySelectorAll(".at-pscale"), j;
        for (j = 0; j < all.length; j++) {
          all[j].className = "at-btn at-pscale" +
            (all[j].getAttribute("data-scale") === scaleMode ? " on" : "");
        }
        redraw();
      });
    }
    countSel.addEventListener("change", function () {
      S.phaseJobs[S.sel] = null;
      startLoad(S.sel);
    });

    function stopPlay() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      playBtn.textContent = "Play";
      playBtn.className = "at-btn at-pplay";
    }
    playBtn.addEventListener("click", function () {
      if (playing) { stopPlay(); return; }
      var j = job();
      if (!j || !j.phases) return;
      playing = true;
      playBtn.textContent = "Pause";
      playBtn.className = "at-btn at-pplay on";
      if (phase < 0) phase = 0;
      timer = setInterval(function () {
        if (!document.body.contains(panel)) { stopPlay(); return; }
        var jj = job();
        if (!jj || !jj.phases) return;
        phase = (phase + 1) % jj.phases;
        slider.value = String(phase + 1);
        redraw();
      }, 950);
    });

    var timer2 = null;
    function onResize() {
      if (!document.body.contains(panel)) {
        window.removeEventListener("resize", onResize);
        stopPlay();
        return;
      }
      if (timer2) clearTimeout(timer2);
      timer2 = setTimeout(redraw, 160);
    }
    window.addEventListener("resize", onResize);
    if (img) img.addEventListener("load", redraw);
    syncPicker(panel, "at-ppick", S.sel);
    select(S.sel);
  }

  // ------------------------------------------ panel 3: every ground to scale

  function scalePanel(T) {
    var maps = mapListOf(T);
    if (maps.length < 2) return "";
    var body =
      '<div class="at-ctrls">' +
        '<button type="button" class="at-btn at-sloadall">Trace every ground ' +
          "(about 10 MB of position files)</button>" +
        '<span class="small at-sloadmsg"></span>' +
      "</div>" +
      '<div class="at-tiles at-stiles"></div>';
    var note = "Same metres-per-pixel scale for every ground. Shape is where tanks drove, not " +
      "the art boundary. A map with one replay traces one match.";
    return '<div class="panel avg-panel at-scale"><h2>Every ground at the same scale</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function drawSilhouette(cv, d, mPerPx, sel) {
    var P = d._at, cal = P.cal, fp = P.footprint;
    if (!cal || !fp) return;
    var wUU = (fp.maxX - fp.minX) + P.pitch, hUU = (fp.maxY - fp.minY) + P.pitch;
    var w = Math.max(24, Math.round(wUU / UU_PER_M / mPerPx));
    var h = Math.max(24, Math.round(hUU / UU_PER_M / mPerPx));
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var N = 200;
    var off = document.createElement("canvas");
    off.width = N; off.height = N;
    var octx = off.getContext("2d");
    var img = octx.createImageData(N, N), px = img.data;
    var ga = hexRgb(A_HEX, [79, 208, 138]), gb = hexRgb(B_HEX, [255, 125, 104]);
    var heat = d.heatTeam || [], i;
    var scale = P.heatScale || 1;
    for (i = 0; i < heat.length; i++) {
      var c = heat[i], t = (c[2] || 0) + (c[3] || 0);
      if (!t) continue;
      var gx = Math.floor((c[0] - fp.minX) / Math.max(1, wUU) * N);
      var gy = Math.floor((c[1] - fp.minY) / Math.max(1, hUU) * N);
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
      var f = (c[3] || 0) / t;
      var k = (gy * N + gx) * 4;
      px[k] = Math.round(ga[0] + (gb[0] - ga[0]) * f);
      px[k + 1] = Math.round(ga[1] + (gb[1] - ga[1]) * f);
      px[k + 2] = Math.round(ga[2] + (gb[2] - ga[2]) * f);
      px[k + 3] = Math.round(105 + 150 * Math.min(1, Math.sqrt(t / scale)));
    }
    octx.putImageData(img, 0, 0);
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, h);

    if (P.axis) {
      var toPx = function (x, y) {
        return [(x - fp.minX) / Math.max(1, wUU) * w, (y - fp.minY) / Math.max(1, hUU) * h];
      };
      var pa = toPx(P.axis.ax, P.axis.ay), pb = toPx(P.axis.bx, P.axis.by);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (sel) {
      ctx.strokeStyle = "rgba(107,160,186,0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    }
  }

  function wireScale(T, root, S) {
    var panel = root.querySelector(".at-scale");
    if (!panel) return;
    var box = panel.querySelector(".at-stiles");
    var msg = panel.querySelector(".at-sloadmsg");
    var loadAll = panel.querySelector(".at-sloadall");
    var maps = mapListOf(T);

    function draw() {
      var loaded = [], i;
      for (i = 0; i < maps.length; i++) {
        var d = S.mapCache[maps[i].slug];
        if (d && d._at && d._at.footprint) loaded.push({ m: maps[i], d: d });
      }
      if (!loaded.length) {
        box.innerHTML = '<p class="at-empty">No position file is loaded yet. Pick a ground ' +
          "above, or use the button to trace all of them.</p>";
        return;
      }
      var widest = 0;
      for (i = 0; i < loaded.length; i++) {
        var P = loaded[i].d._at, fp = P.footprint;
        widest = Math.max(widest, (fp.maxX - fp.minX) / UU_PER_M, (fp.maxY - fp.minY) / UU_PER_M);
      }
      var mPerPx = Math.max(widest / 190, 1);
      box.innerHTML = loaded.map(function (row) {
        var P = row.d._at, fp = P.footprint;
        var wm = Math.round((fp.maxX - fp.minX) / UU_PER_M);
        var hm = Math.round((fp.maxY - fp.minY) / UU_PER_M);
        return '<button type="button" class="at-tile at-stile' +
          (row.m.slug === S.sel ? " on" : "") + '" data-slug="' + E(row.m.slug) + '">' +
          '<canvas></canvas><span class="at-tile-cap"><b>' + E(row.m.map) + "</b>" +
          wm + " by " + hm + " m, " +
          NUM(Math.round(P.areaM2 / 1000) / 1000) + " km" + String.fromCharCode(178) +
          "</span></button>";
      }).join("");
      var tiles = box.querySelectorAll(".at-stile");
      for (i = 0; i < tiles.length; i++) {
        (function (btn, row) {
          drawSilhouette(btn.querySelector("canvas"), row.d, mPerPx, row.m.slug === S.sel);
          btn.addEventListener("click", function () { S.select(row.m.slug); });
        }(tiles[i], loaded[i]));
      }
      msg.textContent = loaded.length + " of " + maps.length + " grounds traced. " +
        "1 pixel is about " + (Math.round(mPerPx * 10) / 10) + " m.";
    }

    if (loadAll) {
      loadAll.addEventListener("click", function () {
        var queue = [], i;
        for (i = 0; i < maps.length; i++) {
          if (!S.mapCache[maps[i].slug]) queue.push(maps[i].slug);
        }
        if (!queue.length) { msg.textContent = "Every ground is already traced."; return; }
        loadAll.setAttribute("disabled", "disabled");
        var at = 0, failed = 0;
        function step() {
          if (at >= queue.length) {
            loadAll.removeAttribute("disabled");
            if (failed) msg.textContent = failed + " position file(s) could not be loaded.";
            draw();
            return;
          }
          msg.textContent = "Tracing " + mapNameOf(T, queue[at]) + " (" + (at + 1) + " of " +
            queue.length + ")...";
          ensureMap(T, S, queue[at]).then(function () { at++; step(); },
            function () { failed++; at++; step(); });
        }
        step();
      });
    }

    S.listeners.push(function (kind) {
      if (kind === "map" || kind === "sel") draw();
    });
    draw();
  }

  // ------------------------------------------- panel 4: the contested middle

  function middlePanel(T) {
    var maps = mapListOf(T);
    if (maps.length < 2) return "";
    var body =
      '<div class="at-ctrls"><span class="at-ctrls-label">Plot</span>' +
        '<button type="button" class="at-btn at-mmode on" data-mode="deaths">' +
          "Where tanks died</button>" +
        '<button type="button" class="at-btn at-mmode" data-mode="shooters">' +
          "Where the killing shots came from</button>" +
        '<button type="button" class="at-btn at-mmode" data-mode="time">' +
          "Where time was spent</button>" +
      "</div>" +
      '<div class="at-mbox"></div>' +
      '<div class="at-legend">' +
        '<span class="at-li"><span class="at-swatch" style="background:' + A_HEX +
          '"></span>Team A, drawn upward</span>' +
        '<span class="at-li"><span class="at-swatch" style="background:' + B_HEX +
          '"></span>Team B, drawn downward</span>' +
        '<span class="at-li">0 is team A’s spawn, 1 is team B’s</span>' +
      "</div>";
    var note = "Position is projected onto the spawn-to-spawn line. Sideways position is dropped. " +
      "A 2-lane map can read as one lane. Kill positions are approximate.";
    return '<div class="panel avg-panel at-middle"><h2>The contested middle</h2>' + body +
      '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  var AX_BINS = 30, AX_LO = -0.15, AX_HI = 1.15;

  function axisHist(d, mode) {
    var P = d._at, ax = P.axis;
    if (!ax) return null;
    var a = zeros(AX_BINS), b = zeros(AX_BINS), all = [], i;
    function put(x, y, team, w) {
      var t = ((x - ax.ax) * ax.ux + (y - ax.ay) * ax.uy) / ax.len;
      var f = (t - AX_LO) / (AX_HI - AX_LO);
      var k = Math.floor(f * AX_BINS);
      if (k < 0) k = 0;
      if (k >= AX_BINS) k = AX_BINS - 1;
      if (team === 1) b[k] += w; else a[k] += w;
      all.push(t);
    }
    if (mode === "time") {
      var heat = d.heatTeam || [];
      for (i = 0; i < heat.length; i++) {
        var c = heat[i];
        if (c[2]) put(c[0], c[1], 0, c[2]);
        if (c[3]) put(c[0], c[1], 1, c[3]);
      }
    } else {
      var lines = d.killLines || [];
      for (i = 0; i < lines.length; i++) {
        var L = lines[i], vt = L[4] === 1 ? 1 : 0;
        if (mode === "shooters") put(L[0], L[1], 1 - vt, 1);
        else put(L[2], L[3], vt, 1);
      }
    }
    if (!all.length) return null;
    all.sort(asc);
    var sa = 0, sb = 0;
    for (i = 0; i < AX_BINS; i++) { sa += a[i]; sb += b[i]; }
    if (!sa && !sb) return null;
    return { a: a, b: b, sumA: sa, sumB: sb, median: pctileSorted(all, 0.5), n: all.length };
  }

  function axisRow(label, h, lenM, opts) {
    var W = 900, H = 96, padL = 118, padR = 58;
    var plotW = W - padL - padR, mid = 48;
    var maxV = 1, i;
    for (i = 0; i < AX_BINS; i++) {
      maxV = Math.max(maxV, h.a[i] / (h.sumA || 1), h.b[i] / (h.sumB || 1));
    }
    function bx(k) { return padL + (k + 0.5) / AX_BINS * plotW; }
    function toX(t) { return padL + ((t - AX_LO) / (AX_HI - AX_LO)) * plotW; }

    function area(vals, sum, up, color) {
      var pts = [], k;
      for (k = 0; k < AX_BINS; k++) {
        var v = (vals[k] / (sum || 1)) / maxV;
        var y = up ? mid - v * 40 : mid + v * 40;
        pts.push(bx(k).toFixed(1) + "," + y.toFixed(1));
      }
      return '<polygon points="' + bx(0).toFixed(1) + "," + mid + " " + pts.join(" ") + " " +
        bx(AX_BINS - 1).toFixed(1) + "," + mid + '" fill="' + color +
        '" fill-opacity="0.62" stroke="' + color + '" stroke-width="1.2"></polygon>';
    }

    var grid = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      var x = toX(t);
      grid += '<line x1="' + x.toFixed(1) + '" y1="6" x2="' + x.toFixed(1) + '" y2="' +
        (mid + 44) + '" stroke="rgba(255,255,255,' + (t === 0.5 ? "0.22" : "0.09") +
        ')" stroke-width="1"></line>' +
        '<text x="' + x.toFixed(1) + '" y="' + (H - 4) +
        '" text-anchor="middle" class="chart-axis-label">' +
        (t === 0 ? "A spawn" : (t === 1 ? "B spawn" : String(t))) + "</text>";
    });

    var medX = toX(h.median);
    var lenTxt = isNum(lenM) ? Math.round(lenM) + " m apart" : "";
    return '<svg class="chart-svg at-axisrow" width="100%" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMinYMin meet">' + grid +
      '<line x1="' + padL + '" y1="' + mid + '" x2="' + (W - padR) + '" y2="' + mid +
      '" stroke="rgba(255,255,255,0.3)" stroke-width="1"></line>' +
      area(h.a, h.sumA, true, A_HEX) + area(h.b, h.sumB, false, B_HEX) +
      '<line x1="' + medX.toFixed(1) + '" y1="8" x2="' + medX.toFixed(1) + '" y2="' + (mid + 42) +
      '" stroke="#ffd88a" stroke-width="1.6" stroke-dasharray="4 3"></line>' +
      '<text x="' + (padL - 10) + '" y="' + (mid - 6) +
      '" text-anchor="end" fill="#d6dcf5" font-size="12">' + E(label) + "</text>" +
      '<text x="' + (padL - 10) + '" y="' + (mid + 12) +
      '" text-anchor="end" class="chart-axis-label">' + E(lenTxt) + "</text>" +
      '<text x="' + (W - padR + 6) + '" y="' + (mid + 4) +
      '" class="chart-axis-label">median ' + (Math.round(h.median * 100) / 100) + "</text>" +
      (opts && opts.n ? '<text x="' + (W - padR + 6) + '" y="' + (mid + 18) +
        '" class="chart-axis-label">' + NUM(opts.n) + " " + E(opts.unit || "") + "</text>" : "") +
      "</svg>";
  }

  function wireMiddle(T, root, S) {
    var panel = root.querySelector(".at-middle");
    if (!panel) return;
    var box = panel.querySelector(".at-mbox");
    var mode = "deaths";
    var maps = mapListOf(T);

    function draw() {
      var rows = [], i;
      for (i = 0; i < maps.length; i++) {
        var d = S.mapCache[maps[i].slug];
        if (!d || !d._at || !d._at.axis) continue;
        var h = axisHist(d, mode);
        if (!h) continue;
        rows.push({ m: maps[i], d: d, h: h });
      }
      if (!rows.length) {
        box.innerHTML = '<p class="at-empty">No position file with two locatable spawns is ' +
          "loaded yet. Pick a ground above, or trace them all in the panel below.</p>";
        return;
      }
      rows.sort(function (x, y) { return x.h.median - y.h.median; });
      var unit = mode === "time" ? "position samples" : "kills";
      box.innerHTML = rows.map(function (r) {
        return axisRow(r.m.map, r.h, r.d._at.axis.len / UU_PER_M,
          { n: mode === "time" ? Math.round(r.h.sumA + r.h.sumB) : r.h.n, unit: unit });
      }).join("") +
        '<p class="small" style="margin-top:6px">' + rows.length + " of " + maps.length +
        " grounds shown, sorted by median position. Each curve is scaled to its own total.</p>";
    }

    var btns = panel.querySelectorAll(".at-mmode"), i;
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        mode = this.getAttribute("data-mode");
        var all = panel.querySelectorAll(".at-mmode"), j;
        for (j = 0; j < all.length; j++) {
          all[j].className = "at-btn at-mmode" +
            (all[j].getAttribute("data-mode") === mode ? " on" : "");
        }
        draw();
      });
    }
    S.listeners.push(function (kind) { if (kind === "map") draw(); });
    draw();
  }

  // ------------------------------------------------- panel 5: how it ends

  function endsPanel(T) {
    var maps = mapListOf(T);
    if (maps.length < 2) return "";
    var body =
      '<div class="at-ctrls"><span class="at-ctrls-label">Show</span>' +
        '<select class="at-sel at-emetric">' +
          '<option value="type">How the match ended</option>' +
          '<option value="length">How long it took</option>' +
          '<option value="side">Which end of the map won</option>' +
          '<option value="kills">Tanks destroyed per match</option>' +
          '<option value="survive">Share of the match a tank survived</option>' +
        "</select>" +
        '<span class="at-ctrls-label">Hide grounds under</span>' +
        '<select class="at-sel at-emin">' +
          '<option value="1">1 match</option>' +
          '<option value="10" selected>10 matches</option>' +
          '<option value="30">30 matches</option>' +
        "</select>" +
      "</div>" +
      '<div class="at-ebox"></div>';
    return '<div class="panel avg-panel at-ends"><h2>How a match here ends</h2>' + body +
      '<div class="small at-enote" style="margin-top:8px"></div></div>';
  }

  // lo/p25/p50/p75/hi per row, drawn as a range with a median tick. Written
  // here rather than reusing svgBoxPlot because that helper's tooltip text is
  // worded for kill ranges in metres.
  function spreadChart(rows, fmt) {
    if (!rows.length) return '<p class="at-empty">Nothing to show.</p>';
    var W = 900, rowH = 26, gap = 8, labelW = 110, padR = 130;
    var H = rows.length * (rowH + gap) + 20;
    var maxV = 1, i;
    for (i = 0; i < rows.length; i++) maxV = Math.max(maxV, rows[i].hi);
    var plotW = W - labelW - padR;
    function sx(v) { return labelW + 8 + (v / maxV) * plotW; }
    var axis = "";
    for (i = 0; i <= 4; i++) {
      var v = maxV * i / 4, gx = sx(v);
      axis += '<line x1="' + gx.toFixed(1) + '" y1="0" x2="' + gx.toFixed(1) + '" y2="' +
        (H - 20) + '" stroke="rgba(255,255,255,0.07)"></line>' +
        '<text x="' + gx.toFixed(1) + '" y="' + (H - 5) +
        '" text-anchor="middle" class="chart-axis-label">' + E(fmt(v)) + "</text>";
    }
    var body = rows.map(function (r, i2) {
      var y = i2 * (rowH + gap), mid = y + rowH / 2;
      var color = r.color || chartColor(i2);
      return '<text x="' + labelW + '" y="' + (mid + 4) +
        '" text-anchor="end" class="chart-axis-label">' + E(r.label) + "</text>" +
        '<line x1="' + sx(r.lo).toFixed(1) + '" y1="' + mid + '" x2="' + sx(r.hi).toFixed(1) +
        '" y2="' + mid + '" stroke="' + color + '" stroke-opacity="0.5" stroke-width="1.5"></line>' +
        '<rect x="' + sx(r.p25).toFixed(1) + '" y="' + (y + 4) + '" width="' +
        Math.max(2, sx(r.p75) - sx(r.p25)).toFixed(1) + '" height="' + (rowH - 8) +
        '" rx="3" fill="' + color + '" fill-opacity="0.6"><title>' +
        E(r.label + ": half of its matches ran " + fmt(r.p25) + " to " + fmt(r.p75) +
          ", median " + fmt(r.p50) + ", from " + r.n + " matches") + "</title></rect>" +
        '<line x1="' + sx(r.p50).toFixed(1) + '" y1="' + (y + 2) + '" x2="' + sx(r.p50).toFixed(1) +
        '" y2="' + (y + rowH - 2) + '" stroke="#fff" stroke-opacity="0.85" stroke-width="2"></line>' +
        '<text x="' + (W - padR + 8) + '" y="' + (mid + 4) + '" class="chart-axis-label">' +
        E(fmt(r.p50) + "  (" + fmt(r.lo) + " to " + fmt(r.hi) + ")") + "</text>";
    }).join("");
    return '<svg class="chart-svg" width="100%" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMinYMin meet">' + axis + body + "</svg>";
  }

  // A point with its 95% interval against a 50% reference line.
  function intervalChart(rows) {
    if (!rows.length) return '<p class="at-empty">Nothing to show.</p>';
    var W = 900, rowH = 26, gap = 8, labelW = 120, padR = 150;
    var H = rows.length * (rowH + gap) + 20;
    var plotW = W - labelW - padR;
    var lo = 20, hi = 80, i;
    for (i = 0; i < rows.length; i++) {
      lo = Math.min(lo, rows[i].lo - 2);
      hi = Math.max(hi, rows[i].hi + 2);
    }
    lo = Math.max(0, lo); hi = Math.min(100, hi);
    function sx(v) { return labelW + 8 + ((v - lo) / (hi - lo)) * plotW; }
    var axis = "";
    for (i = 0; i <= 4; i++) {
      var v = lo + (hi - lo) * i / 4, gx = sx(v);
      axis += '<line x1="' + gx.toFixed(1) + '" y1="0" x2="' + gx.toFixed(1) + '" y2="' +
        (H - 20) + '" stroke="rgba(255,255,255,0.07)"></line>' +
        '<text x="' + gx.toFixed(1) + '" y="' + (H - 5) +
        '" text-anchor="middle" class="chart-axis-label">' + Math.round(v) + "%</text>";
    }
    var fifty = sx(50);
    var body = rows.map(function (r, i2) {
      var y = i2 * (rowH + gap), mid = y + rowH / 2;
      var crosses = r.lo <= 50 && r.hi >= 50;
      var color = crosses ? "#7f89b3" : (r.value > 50 ? A_HEX : B_HEX);
      return '<text x="' + labelW + '" y="' + (mid + 4) +
        '" text-anchor="end" class="chart-axis-label">' + E(r.label) + "</text>" +
        '<line x1="' + sx(r.lo).toFixed(1) + '" y1="' + mid + '" x2="' + sx(r.hi).toFixed(1) +
        '" y2="' + mid + '" stroke="' + color + '" stroke-opacity="0.55" stroke-width="6" ' +
        'stroke-linecap="round"><title>' + E(r.label + ": team A won " + r.k + " of " + r.n +
        " decided matches, 95% range " + Math.round(r.lo) + " to " + Math.round(r.hi) + "%") +
        "</title></line>" +
        '<circle cx="' + sx(r.value).toFixed(1) + '" cy="' + mid + '" r="4.5" fill="' + color +
        '" stroke="#0b1020" stroke-width="1"></circle>' +
        '<text x="' + (W - padR + 8) + '" y="' + (mid + 4) + '" class="chart-axis-label">' +
        E((Math.round(r.value * 10) / 10) + "%  " + Math.round(r.lo) + " to " +
          Math.round(r.hi) + ", n=" + r.n) + "</text>";
    }).join("");
    return '<svg class="chart-svg" width="100%" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMinYMin meet">' + axis +
      '<line x1="' + fifty.toFixed(1) + '" y1="0" x2="' + fifty.toFixed(1) + '" y2="' + (H - 20) +
      '" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 4"></line>' + body + "</svg>";
  }

  function wireEnds(T, root, S) {
    var panel = root.querySelector(".at-ends");
    if (!panel) return;
    var box = panel.querySelector(".at-ebox");
    var noteBox = panel.querySelector(".at-enote");
    var metricEl = panel.querySelector(".at-emetric");
    var minEl = panel.querySelector(".at-emin");
    var maps = mapListOf(T);

    function eligible() {
      var min = +minEl.value;
      return maps.filter(function (m) { return (m.games || 0) >= min; });
    }

    function draw() {
      var metric = metricEl.value, list = eligible(), i, note;
      if (!list.length) {
        box.innerHTML = '<p class="at-empty">No ground has that many matches.</p>';
        noteBox.innerHTML = "";
        return;
      }
      if (metric === "type") {
        var rows = list.map(function (m) {
          var e = endingsOf(T, m.slug);
          return {
            label: m.map + " (" + e.n + ")",
            parts: [
              { name: "elimination", n: e.elimination, color: "#8a4444" },
              { name: "capture", n: e.capture, color: "#436f83" },
              { name: "not recorded", n: e.other, color: "#39405f" }
            ]
          };
        });
        box.innerHTML = T.svgStackedBar(rows, { width: 900, labelWidth: 130, rowHeight: 26 }) +
          '<div class="chart-legend" style="margin-top:6px">' +
          '<span class="chart-legend-item"><span class="chart-legend-dot" ' +
          'style="background:#8a4444"></span>Every enemy destroyed</span>' +
          '<span class="chart-legend-item"><span class="chart-legend-dot" ' +
          'style="background:#436f83"></span>Objective captured</span>' +
          '<span class="chart-legend-item"><span class="chart-legend-dot" ' +
          'style="background:#39405f"></span>Ending not recorded in the replay</span></div>';
        note = "How each ground's matches ended. Not who won.";
      } else if (metric === "length") {
        var lrows = [];
        for (i = 0; i < list.length; i++) {
          var d = durationStats(T, list[i].slug);
          if (!d) continue;
          lrows.push({ label: list[i].map, lo: d.lo, p25: d.p25, p50: d.p50, p75: d.p75,
                       hi: d.hi, n: d.n, color: chartColor(i) });
        }
        lrows.sort(function (a, b) { return b.p50 - a.p50; });
        box.innerHTML = spreadChart(lrows, clock);
        note = "Bar is the middle half of matches, white line the median.";
      } else if (metric === "side") {
        var irows = [];
        for (i = 0; i < list.length; i++) {
          var m = list[i];
          var n = m.decided_games || 0;
          if (!n) continue;
          var k = Math.round((m.win_rate_a || 0) / 100 * n);
          var w = wilson(k, n);
          if (!w) continue;
          irows.push({ label: m.map, value: k / n * 100, lo: w[0], hi: w[1], k: k, n: n });
        }
        irows.sort(function (a, b) { return b.value - a.value; });
        var pooled = { k: 0, n: 0 };
        for (i = 0; i < irows.length; i++) { pooled.k += irows[i].k; pooled.n += irows[i].n; }
        var pw = wilson(pooled.k, pooled.n);
        if (pw) {
          irows.push({ label: "All grounds", value: pooled.k / pooled.n * 100,
                       lo: pw[0], hi: pw[1], k: pooled.k, n: pooled.n });
        }
        box.innerHTML = intervalChart(irows);
        note = "Team A's win share, 95% Wilson interval. Grey bars can't be told apart from 50%.";
      } else if (metric === "kills") {
        var krows = list.filter(function (m) { return isNum(m.avg_eliminations); })
          .slice().sort(function (a, b) { return b.avg_eliminations - a.avg_eliminations; })
          .map(function (m, i2) {
            return { label: m.map, value: Math.round(m.avg_eliminations * 10) / 10,
                     color: chartColor(i2),
                     valueLabel: NUM(Math.round(m.avg_eliminations * 10) / 10) + " of 16 (" +
                       m.games + " matches)" };
          });
        box.innerHTML = T.svgBarChart(krows, { width: 900, labelWidth: 120, rowHeight: 24,
          maxValue: 16, gridColor: "rgba(255,255,255,0.10)" });
        note = "Average tanks destroyed of 16 starters. Capture wins leave survivors.";
      } else {
        var srows = list.filter(function (m) { return isNum(m.avg_survival_pct); })
          .slice().sort(function (a, b) { return b.avg_survival_pct - a.avg_survival_pct; })
          .map(function (m, i2) {
            return { label: m.map, value: m.avg_survival_pct, color: chartColor(i2),
                     valueLabel: PCT(m.avg_survival_pct) + " (" + m.games + " matches)" };
          });
        box.innerHTML = T.svgBarChart(srows, { width: 900, labelWidth: 120, rowHeight: 24,
          maxValue: 100, gridColor: "rgba(255,255,255,0.10)" });
        note = "Average share of a match survived. Capture-heavy grounds score higher.";
      }
      noteBox.innerHTML = note + " " + coverageNote(T);
    }

    metricEl.addEventListener("change", draw);
    minEl.addEventListener("change", draw);
    draw();
  }

  // ------------------------------------------ panel 6: what a ground asks for

  function charPanel(T, sel) {
    var maps = mapListOf(T);
    if (maps.length < 2) return "";
    var hasAmmo = ((T.STATS && T.STATS.ammo_by_map) || []).length > 1;
    var body =
      '<div class="at-ctrls"><span class="at-ctrls-label">Ground</span>' +
        pickerHtml(T, sel, "at-cpick") + "</div>" +
      '<div class="at-ctrls"><span class="at-ctrls-label">Compare</span>' +
        '<button type="button" class="at-btn at-cmode on" data-mode="tank">Tanks taken</button>' +
        (hasAmmo ? '<button type="button" class="at-btn at-cmode" data-mode="ammo">' +
          "Ammunition fired</button>" : "") +
      "</div>" +
      '<div class="at-cbox"></div>';
    return '<div class="panel avg-panel at-char"><h2>What a ground asks for</h2>' + body +
      '<div class="small at-cnote" style="margin-top:8px"></div></div>';
  }

  function wireChar(T, root, S) {
    var panel = root.querySelector(".at-char");
    if (!panel) return;
    var box = panel.querySelector(".at-cbox");
    var noteBox = panel.querySelector(".at-cnote");
    var mode = "tank";
    var maps = mapListOf(T);

    // pooled pick rate across every ground, so a map is judged against the
    // archive rather than against an even split
    var poolTank = {}, poolTotal = 0, i, j;
    for (i = 0; i < maps.length; i++) {
      var tl = maps[i].tanks || [];
      for (j = 0; j < tl.length; j++) {
        poolTank[tl[j].tank] = (poolTank[tl[j].tank] || 0) + (tl[j].games || 0);
        poolTotal += tl[j].games || 0;
      }
    }
    var ammoByMap = {}, poolAmmo = {}, poolAmmoTotal = 0;
    ((T.STATS && T.STATS.ammo_by_map) || []).forEach(function (r) {
      ammoByMap[r.map] = r;
      var k;
      for (k in r.shares) {
        if (Object.prototype.hasOwnProperty.call(r.shares, k)) {
          poolAmmo[k] = (poolAmmo[k] || 0) + r.shares[k] / 100 * (r.total || 0);
        }
      }
      poolAmmoTotal += r.total || 0;
    });

    function draw() {
      var m = mapEntry(T, S.sel);
      if (!m) { box.innerHTML = ""; return; }
      var rows = [], note, k;
      if (mode === "tank") {
        var mine = 0, list = m.tanks || [];
        for (i = 0; i < list.length; i++) mine += list[i].games || 0;
        if (!mine || !poolTotal) {
          box.innerHTML = '<p class="at-empty">No tank counts recorded for this ground.</p>';
          return;
        }
        var shown = 0, hidden = 0;
        for (i = 0; i < list.length; i++) {
          var t = list[i];
          if ((t.games || 0) < 15) { hidden++; continue; }
          var here = t.games / mine * 100;
          var every = (poolTank[t.tank] || 0) / poolTotal * 100;
          shown++;
          rows.push({
            label: t.tank,
            value: Math.round((here - every) * 10) / 10,
            sub: (Math.round(here * 10) / 10) + "% here vs " +
              (Math.round(every * 10) / 10) + "% overall, " + t.games + " games"
          });
        }
        if (!rows.length) {
          box.innerHTML = '<p class="at-empty">No tank has 15 games on ' + E(m.map) + ".</p>";
          return;
        }
        rows.sort(function (a, b) { return b.value - a.value; });
        box.innerHTML = T.svgDivergingBars(rows, { width: 900, labelWidth: 150, rowHeight: 22 });
        note = "Pick rate here vs archive-wide, in points. " + shown + " tanks shown, " +
          hidden + " under 15 games. Choice, not performance.";
      } else {
        var r = ammoByMap[m.map];
        if (!r || !poolAmmoTotal) {
          box.innerHTML = '<p class="at-empty">No ammunition counts recorded for this ground.</p>';
          return;
        }
        for (k in r.shares) {
          if (!Object.prototype.hasOwnProperty.call(r.shares, k)) continue;
          var every2 = (poolAmmo[k] || 0) / poolAmmoTotal * 100;
          rows.push({
            label: k,
            value: Math.round((r.shares[k] - every2) * 10) / 10,
            sub: (Math.round(r.shares[k] * 10) / 10) +
              "% here vs " + (Math.round(every2 * 10) / 10) + "% overall"
          });
        }
        rows.sort(function (a, b) { return b.value - a.value; });
        box.innerHTML = T.svgDivergingBars(rows, { width: 900, labelWidth: 150, rowHeight: 22 });
        note = "Shell share here vs archive-wide, in points, from " + NUM(r.total) + " shots.";
      }
      noteBox.innerHTML = note;
    }

    bindPicker(panel, "at-cpick", function (slug) { S.select(slug); });
    var btns = panel.querySelectorAll(".at-cmode");
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        mode = this.getAttribute("data-mode");
        var all = panel.querySelectorAll(".at-cmode"), q;
        for (q = 0; q < all.length; q++) {
          all[q].className = "at-btn at-cmode" +
            (all[q].getAttribute("data-mode") === mode ? " on" : "");
        }
        draw();
      });
    }
    S.listeners.push(function (kind, slug) {
      if (kind === "sel") { syncPicker(panel, "at-cpick", slug); draw(); }
    });
    draw();
  }

  // ----------------------------------------------------------------- suite

  function firstSlug(T) {
    var maps = mapListOf(T);
    return maps.length ? maps[0].slug : null;
  }

  function render(T) {
    TT = T;
    var sel = firstSlug(T);
    if (!sel) {
      return '<div class="panel avg-panel"><h2>Atlas</h2><p class="small">No map in this ' +
        "archive has a recorded match, so there is no ground to describe.</p></div>";
    }
    var parts = [
      cardsHtml(T),
      groundPanel(T, sel),
      phasePanel(T, sel),
      middlePanel(T),
      scalePanel(T),
      endsPanel(T),
      charPanel(T, sel)
    ].filter(function (p) { return !!p; });
    return parts.join("");
  }

  function wire(T, root) {
    TT = T;
    var sel = firstSlug(T);
    if (!sel) return;
    var S = {
      sel: sel,
      mapCache: {}, mapPending: {}, mapFailed: {},
      phaseJobs: {}, phaseToken: 0,
      listeners: [],
      select: function (slug) {
        if (slug === S.sel) return;
        S.sel = slug;
        fire(S, "sel", slug);
      }
    };
    try { wireGround(T, root, S); } catch (e) { /* one panel must not kill the page */ }
    try { wirePhase(T, root, S); } catch (e) { /* ditto */ }
    try { wireMiddle(T, root, S); } catch (e) { /* ditto */ }
    try { wireScale(T, root, S); } catch (e) { /* ditto */ }
    try { wireEnds(T, root, S); } catch (e) { /* ditto */ }
    try { wireChar(T, root, S); } catch (e) { /* ditto */ }
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "atlas",
    title: "Atlas",
    blurb: "Shape, spawns, and where the fighting settles.",
    accent: ACCENT,
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

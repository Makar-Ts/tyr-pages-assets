/* Terrain suite: space, distance and ground.
 *
 * Everything here is derived from decoded replay positions. A "range" is the
 * flat distance between the shooter and the victim at the moment of the kill,
 * measured off both tanks' decoded position samples, so it is approximate.
 * Nothing in this file writes; it only reads T and draws.
 */
(function () {
  "use strict";

  var CSS = "" +
    ".te-ctrls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}" +
    ".te-ctrls-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin-right:2px}" +
    ".te-btn{-webkit-appearance:none;appearance:none;cursor:pointer;font:inherit;font-size:.78rem;" +
      "padding:5px 11px;border-radius:999px;border:1px solid var(--border,#232c52);" +
      "background:var(--panel2,#131a33);color:var(--dim,#7f89b3);line-height:1.25}" +
    ".te-btn:hover{color:var(--text,#d6dcf5);border-color:#3d4a7d}" +
    ".te-btn[disabled]{opacity:.4;cursor:default}" +
    ".te-btn.on{background:rgba(67,111,131,.32);border-color:#5f93ab;color:#d3e8f1}" +
    ".te-btn .te-sub{opacity:.65;margin-left:5px;font-size:.72rem}" +
    ".te-swatch{width:8px;height:8px;border-radius:2px;display:inline-block;" +
      "margin-right:6px;vertical-align:middle;background:#6c779e}" +
    ".te-sel{font:inherit;font-size:.78rem;padding:5px 8px;border-radius:8px;" +
      "border:1px solid var(--border,#232c52);background:var(--panel2,#131a33);" +
      "color:var(--text,#d6dcf5)}" +
    ".te-stage{position:relative;width:100%;max-width:760px;margin:2px auto 8px;" +
      "border:1px solid var(--border,#232c52);border-radius:10px;overflow:hidden;background:#05070f}" +
    ".te-stage img{display:block;width:100%;height:auto}" +
    ".te-stage canvas{position:absolute;left:0;top:0}" +
    ".te-cv-over{cursor:crosshair}" +
    ".te-stage-note{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;" +
      "align-items:center;justify-content:center;text-align:center;padding:20px;" +
      "font-size:.82rem;color:var(--dim,#7f89b3)}" +
    ".te-read{max-width:760px;margin:0 auto;font-size:.78rem;color:var(--dim,#7f89b3);" +
      "font-family:ui-monospace,'Cascadia Mono',Consolas,Menlo,monospace;min-height:2.6em}" +
    ".te-read b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".te-sliderbox{max-width:760px;margin:0 auto 6px}" +
    ".te-sliderrow{display:flex;align-items:center;gap:10px;margin:2px 0}" +
    ".te-sliderrow span{font-size:.72rem;color:var(--dim,#7f89b3);width:74px;flex:0 0 74px}" +
    ".te-sliderrow input[type=range]{flex:1 1 auto;width:100%;accent-color:#5f93ab}" +
    ".te-two{display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:center}" +
    "@media (max-width:820px){.te-two{grid-template-columns:1fr}}" +
    ".te-bands{list-style:none;margin:0;padding:0;font-size:.8rem}" +
    ".te-bands li{display:flex;align-items:baseline;gap:8px;padding:3px 0;" +
      "border-bottom:1px solid rgba(255,255,255,.05)}" +
    ".te-bands li:last-child{border-bottom:0}" +
    ".te-bands .te-bl{flex:1 1 auto;color:var(--dim,#7f89b3)}" +
    ".te-bands .te-bv{font-variant-numeric:tabular-nums;color:var(--text,#d6dcf5)}" +
    ".te-bands .te-bp{font-variant-numeric:tabular-nums;color:var(--dim,#7f89b3);" +
      "width:52px;text-align:right}" +
    ".te-sub-h{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin:16px 0 6px}" +
    ".te-empty{font-size:.82rem;color:var(--dim,#7f89b3);padding:10px 0}";

  var TT = null;                       // the T object, set at every entry point
  var RANGE_TOP = 900;                 // slider ceiling, just past the longest kill
  var HOVER_M = 40;                    // radius of the hover probe, in metres
  var UU_PER_M = 100;                  // world units per metre in decoded positions
  var ACCENT = "#436f83";

  // ------------------------------------------------------------------ utils

  function E(s) { return TT && TT.esc ? TT.esc(s) : String(s == null ? "" : s); }
  function NUM(v) { return TT && TT.fmtNum ? TT.fmtNum(v) : String(v); }
  function PCT(v) { return TT && TT.fmtPct ? TT.fmtPct(v) : String(v) + "%"; }
  function chartColor(i) {
    var c = (TT && TT.CHART_COLORS) || [ACCENT];
    return c[i % c.length];
  }
  function tankHue(name, i) {
    var c = TT && TT.tankColor ? TT.tankColor(name) : null;
    return c || chartColor(i);
  }
  function teamHex(t) {
    var m = (TT && TT.TEAM_HEX) || {};
    return m[t] || (t === 1 ? "#8a4444" : "#35674a");
  }
  function hexRgb(hex, fallback) {
    var h = String(hex || "").replace("#", "");
    if (h.length !== 6) return fallback;
    var n = parseInt(h, 16);
    if (isNaN(n)) return fallback;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function sortedCopy(arr) {
    return arr.slice().sort(function (a, b) { return a - b; });
  }
  // p on 0..1 against an ALREADY sorted array
  function pctile(sorted, p) {
    if (!sorted.length) return null;
    var i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[i];
  }
  function mapListOf(T) {
    var maps = (T.DATA && T.DATA.maps) || [];
    return maps.filter(function (m) { return m && m.slug && m.match_ids; })
      .slice().sort(function (a, b) {
        return (b.match_ids.length || 0) - (a.match_ids.length || 0);
      });
  }

  // ------------------------------------------------- per-map file handling

  // Attach the derived values the panels need, once per file rather than once
  // per redraw: every kill's range, a lookup grid for the presence cloud, and
  // the cell pitch the cloud was binned at.
  function prepMap(d) {
    if (d._te) return d;
    var lines = d.killLines || [];
    var ranges = [], i;
    for (i = 0; i < lines.length; i++) {
      var L = lines[i];
      ranges.push(Math.hypot(L[0] - L[2], L[1] - L[3]) / UU_PER_M);
    }
    var heat = d.heatTeam || [];
    var pitch = 400, seen = {}, xs = [];
    for (i = 0; i < heat.length; i++) {
      if (!seen[heat[i][0]]) { seen[heat[i][0]] = 1; xs.push(heat[i][0]); }
    }
    xs.sort(function (a, b) { return a - b; });
    var best = Infinity;
    for (i = 1; i < xs.length; i++) {
      var gap = xs[i] - xs[i - 1];
      if (gap > 0 && gap < best) best = gap;
    }
    if (isFinite(best) && best > 0) pitch = best;
    var index = {}, weights = [];
    for (i = 0; i < heat.length; i++) {
      var c = heat[i];
      index[Math.round(c[0] / pitch) + "|" + Math.round(c[1] / pitch)] = c;
      weights.push((c[2] || 0) + (c[3] || 0));
    }
    weights.sort(function (a, b) { return a - b; });
    d._te = {
      ranges: ranges,
      sorted: sortedCopy(ranges),
      pitch: pitch,
      index: index,
      heatScale: pctile(weights, 0.95) || 1
    };
    return d;
  }

  function ensureMap(T, S, slug) {
    if (S.cache[slug]) return Promise.resolve(S.cache[slug]);
    if (S.pending[slug]) return S.pending[slug];
    var p = T.loadJson("maps/" + encodeURIComponent(slug) + ".json").then(function (d) {
      if (!d || !d.match) throw new Error("no data");
      S.cache[slug] = prepMap(d);
      delete S.pending[slug];
      for (var i = 0; i < S.listeners.length; i++) {
        try { S.listeners[i](slug); } catch (e) { /* one panel must not break another */ }
      }
      return S.cache[slug];
    })["catch"](function (err) {
      delete S.pending[slug];
      S.failed[slug] = true;
      throw err;
    });
    S.pending[slug] = p;
    return p;
  }

  // world -> canvas, and back. Mirrors the calibrated transform the site's own
  // map view uses, so a point lands in the same place on both pages.
  function buildTf(d, w, h) {
    var cal = d.match && d.match.calibration;
    if (cal && cal.worldCenterX != null && cal.worldSize) {
      var th = (cal.rotationDeg || 0) * Math.PI / 180;
      var cs = Math.cos(th), sn = Math.sin(th);
      return {
        fwd: function (x, y) {
          var dx = x - cal.worldCenterX, dy = y - cal.worldCenterY;
          var rx = dx * cs - dy * sn, ry = dx * sn + dy * cs;
          if (cal.flipX) rx = -rx;
          if (cal.flipY) ry = -ry;
          return [(0.5 + rx / cal.worldSize) * w, (0.5 + ry / cal.worldSize) * h];
        },
        inv: function (px, py) {
          var rx = (px / w - 0.5) * cal.worldSize, ry = (py / h - 0.5) * cal.worldSize;
          if (cal.flipX) rx = -rx;
          if (cal.flipY) ry = -ry;
          return [rx * cs + ry * sn + cal.worldCenterX, -rx * sn + ry * cs + cal.worldCenterY];
        },
        calibrated: true
      };
    }
    // No calibration: fit the play area into the box. The background art will
    // not line up, which the panel says out loud.
    var b = d.mapBounds || d.bounds;
    if (!b) return null;
    var cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    var s = Math.min(w / Math.max(b.maxX - b.minX, 1), h / Math.max(b.maxY - b.minY, 1)) * 0.94;
    return {
      fwd: function (x, y) { return [w / 2 + (x - cx) * s, h / 2 - (y - cy) * s]; },
      inv: function (px, py) { return [(px - w / 2) / s + cx, -(py - h / 2) / s + cy]; },
      calibrated: false
    };
  }

  // --------------------------------------------------------- the bullseye

  // Concentric range bands. Radius is the square root of the distance so the
  // crowded first hundred metres stay legible next to the half-kilometre
  // shots; area is therefore NOT proportional to anything, only the shading
  // carries the counts.
  var BAND_EDGES = [0, 25, 50, 100, 200, 350, 500, RANGE_TOP];

  function bandsFromRanges(ranges) {
    var out = [], i, j;
    for (i = 0; i < BAND_EDGES.length - 1; i++) out.push(0);
    for (i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      for (j = BAND_EDGES.length - 2; j >= 0; j--) {
        if (r >= BAND_EDGES[j]) { out[j]++; break; }
      }
    }
    return out;
  }

  function bandLabel(i) {
    var lo = BAND_EDGES[i], hi = BAND_EDGES[i + 1];
    if (i === 0) return "Under " + hi + " m";
    if (i === BAND_EDGES.length - 2) return "Over " + lo + " m";
    return lo + " to " + hi + " m";
  }

  function bullseye(counts, opts) {
    opts = opts || {};
    var size = opts.size || 240, mid = size / 2;
    var R = mid - (opts.pad == null ? 12 : opts.pad);
    var total = 0, max = 0, i;
    for (i = 0; i < counts.length; i++) { total += counts[i]; if (counts[i] > max) max = counts[i]; }
    if (!total) return "";
    var rgb = hexRgb(opts.color || ACCENT, [67, 111, 131]);
    function rad(d) { return R * Math.sqrt(d / RANGE_TOP); }
    var body = "";
    for (i = counts.length - 1; i >= 0; i--) {
      var ro = rad(BAND_EDGES[i + 1]);
      var a = 0.10 + 0.72 * (max ? counts[i] / max : 0);
      body += '<circle cx="' + mid + '" cy="' + mid + '" r="' + ro.toFixed(1) +
        '" fill="rgb(' + rgb[0] + "," + rgb[1] + "," + rgb[2] + ')" fill-opacity="' +
        a.toFixed(3) + '" stroke="rgba(255,255,255,0.14)" stroke-width="1"><title>' +
        E(bandLabel(i) + ": " + counts[i] + " kills, " +
          (Math.round(counts[i] / total * 1000) / 10) + "%") + "</title></circle>";
    }
    // spokes, purely to read the rings as distance rather than as a pie
    var spokes = "";
    for (i = 0; i < 8; i++) {
      var ang = (i / 8) * Math.PI * 2;
      spokes += '<line x1="' + mid + '" y1="' + mid + '" x2="' +
        (mid + Math.cos(ang) * R).toFixed(1) + '" y2="' + (mid + Math.sin(ang) * R).toFixed(1) +
        '" stroke="rgba(255,255,255,0.07)" stroke-width="1"></line>';
    }
    var marker = "";
    if (isNum(opts.median) && opts.median > 0) {
      var rm = rad(Math.min(opts.median, RANGE_TOP));
      marker = '<circle cx="' + mid + '" cy="' + mid + '" r="' + rm.toFixed(1) +
        '" fill="none" stroke="#e8c46a" stroke-width="1.6" stroke-dasharray="4 4"></circle>';
      if (opts.labels) {
        marker += '<text x="' + mid + '" y="' + (mid - rm - 5).toFixed(1) +
          '" text-anchor="middle" fill="#e8c46a" font-size="10">median ' +
          Math.round(opts.median) + " m</text>";
      }
    }
    var ticks = "";
    if (opts.labels) {
      for (i = 1; i < BAND_EDGES.length - 1; i++) {
        ticks += '<text x="' + (mid + rad(BAND_EDGES[i]) + 2).toFixed(1) + '" y="' + (mid + 10) +
          '" fill="rgba(255,255,255,0.45)" font-size="9">' + BAND_EDGES[i] + "</text>";
      }
    }
    return '<svg viewBox="0 0 ' + size + " " + size + '" class="chart-svg" ' +
      'preserveAspectRatio="xMidYMid meet">' + body + spokes + marker + ticks +
      '<circle cx="' + mid + '" cy="' + mid + '" r="2" fill="#fff" fill-opacity="0.7"></circle></svg>';
  }

  // ------------------------------------------------------------ preview

  // A miniature of the bullseye, with the per-tank range rose laid over it.
  //
  // Radius is metres on the same square-root scale the panel uses, so the rings
  // and the needles measure the same thing. A ring is one kill-range band, shaded
  // by how many kills landed in it. A needle is one tank: it starts at that
  // tank's median kill range and runs out to its long shot, so a long needle is
  // a gun that reaches. The gold dashes are the roster median.
  //
  // The centre sits above the middle of the tile on purpose. The hub dims the
  // preview to 62% and lays a caption scrim over the bottom third, so a disc
  // centred at 120 loses half of itself, and anything painted in one dark hue
  // washes out to nothing. Hence the light end of the ramp and the white edges.
  function preview(T) {
    TT = T;
    var s = T.STATS || {}, i;
    var bands = s.kill_range_bands || [];
    var counts = [], total = 0, max = 0;
    for (i = 0; i < BAND_EDGES.length - 1; i++) {
      var c = bands[i] && isNum(bands[i].count) ? bands[i].count : 0;
      counts.push(c);
      total += c;
      if (c > max) max = c;
    }
    if (!total) return "";

    var CX = 120, CY = 102, R = 92;
    function rad(m) {
      var f = m / RANGE_TOP;
      return R * Math.sqrt(f < 0 ? 0 : (f > 1 ? 1 : f));
    }
    function mixHex(a, b, t) {
      var p = hexRgb(a, [40, 70, 90]), q = hexRgb(b, [150, 200, 230]);
      var u = t < 0 ? 0 : (t > 1 ? 1 : t);
      return "rgb(" + Math.round(p[0] + (q[0] - p[0]) * u) + "," +
        Math.round(p[1] + (q[1] - p[1]) * u) + "," +
        Math.round(p[2] + (q[2] - p[2]) * u) + ")";
    }

    var rings = "";
    for (i = counts.length - 1; i >= 0; i--) {
      rings += '<circle cx="' + CX + '" cy="' + CY + '" r="' + rad(BAND_EDGES[i + 1]).toFixed(1) +
        '" fill="' + mixHex("#26506b", "#9ad3ec", max ? counts[i] / max : 0) +
        '" fill-opacity="0.94" stroke="rgba(255,255,255,0.44)" stroke-width="1"></circle>';
    }

    var med = "";
    if (isNum(s.kill_range_median) && s.kill_range_median > 0) {
      med = '<circle cx="' + CX + '" cy="' + CY + '" r="' + rad(s.kill_range_median).toFixed(1) +
        '" fill="none" stroke="#f0c96a" stroke-width="1.8" stroke-dasharray="5 4"></circle>';
    }

    var byTank = s.kill_range_by_tank || [];
    var rose = "", m = byTank.length;
    for (i = 0; i < m; i++) {
      var t = byTank[i];
      if (!t || !isNum(t.value)) continue;
      var ang = (i / m) * Math.PI * 2 - Math.PI / 2;
      var r0 = rad(t.value);
      var r1 = isNum(t.far) && t.far > t.value ? rad(t.far) : r0 + 7;
      var ux = Math.cos(ang), uy = Math.sin(ang);
      var ax = (CX + ux * r0).toFixed(1), ay = (CY + uy * r0).toFixed(1);
      var bx = (CX + ux * r1).toFixed(1), by = (CY + uy * r1).toFixed(1);
      var hue = tankHue(t.label, i);
      rose +=
        '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by +
        '" stroke="' + hue + '" stroke-width="4" stroke-linecap="round"></line>' +
        '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by +
        '" stroke="' + mixHex(hue, "#ffffff", 0.5) +
        '" stroke-width="1.4" stroke-linecap="round"></line>' +
        '<circle cx="' + ax + '" cy="' + ay + '" r="2.5" fill="#f2fbff"></circle>';
    }

    return '<svg viewBox="0 0 240 240">' +
      '<defs><radialGradient id="tePvBg" cx="50%" cy="40%" r="76%">' +
      '<stop offset="0" stop-color="#16223f"></stop>' +
      '<stop offset="1" stop-color="#070b1b"></stop></radialGradient></defs>' +
      '<rect width="240" height="240" fill="url(#tePvBg)"></rect>' +
      rings + med + rose +
      '<circle cx="' + CX + '" cy="' + CY + '" r="6.5" fill="#ffffff" fill-opacity="0.14"></circle>' +
      '<circle cx="' + CX + '" cy="' + CY + '" r="2.6" fill="#ffffff" fill-opacity="0.85"></circle>' +
      "</svg>";
  }

  // ------------------------------------------------- panel 1: the map board

  function boardPanel(T) {
    var maps = mapListOf(T);
    if (!maps.length) return "";
    var chips = maps.map(function (m, i) {
      return '<button type="button" class="te-btn te-map' + (i === 0 ? " on" : "") +
        '" data-slug="' + E(m.slug) + '">' + E(m.map) +
        '<span class="te-sub">' + m.match_ids.length + "</span></button>";
    }).join("");
    var layers = [
      ["kills", "Kill lines", "#ffd166"],
      ["deaths", "Where tanks died", "#c96a6a"],
      ["shots", "Shot origins", "#5ad2ff"],
      ["heat", "Time spent", "#7fa06b"]
    ].map(function (l) {
      var on = (l[0] === "kills" || l[0] === "deaths");
      return '<button type="button" class="te-btn te-layer' + (on ? " on" : "") +
        '" data-layer="' + l[0] + '"><span class="te-swatch" style="background:' + l[2] +
        '"></span>' + E(l[1]) + "</button>";
    }).join("");
    var body =
      '<div class="te-ctrls"><span class="te-ctrls-label">Map</span>' + chips + "</div>" +
      '<div class="te-ctrls"><span class="te-ctrls-label">Layers</span>' + layers + "</div>" +
      '<div class="te-sliderbox">' +
        '<div class="te-sliderrow"><span>From 0 m</span>' +
          '<input type="range" class="te-lo" min="0" max="' + RANGE_TOP + '" step="10" value="0"></div>' +
        '<div class="te-sliderrow"><span>To ' + RANGE_TOP + ' m</span>' +
          '<input type="range" class="te-hi" min="0" max="' + RANGE_TOP + '" step="10" value="' +
          RANGE_TOP + '"></div>' +
        '<div class="te-hist"></div>' +
      "</div>" +
      '<div class="te-stage">' +
        '<img class="te-mapimg" alt="" src="assets/maps/minimap/' + E(maps[0].slug) + '.png">' +
        '<canvas class="te-cv-base"></canvas><canvas class="te-cv-over"></canvas>' +
      "</div>" +
      '<div class="te-read te-status">Loading ' + E(maps[0].map) + "...</div>";
    var note = "Every kill drawn shooter to victim. Ranges are approximate: positions come from " +
      "decoded movement samples. A kill is dropped when either end is unresolved. " +
      "Shot origins are thinned to 6,000 per map, tracks to 600. Samples, not totals.";
    return '<div class="panel avg-panel te-board"><h2>Where the fighting lands</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function rangeHistSvg(sorted, lo, hi) {
    if (!sorted || !sorted.length) return "";
    var W = 760, H = 44, bin = 25, n = Math.ceil(RANGE_TOP / bin);
    var counts = [], i;
    for (i = 0; i < n; i++) counts.push(0);
    for (i = 0; i < sorted.length; i++) {
      var b = Math.floor(sorted[i] / bin);
      if (b < 0) b = 0;
      if (b >= n) b = n - 1;
      counts[b]++;
    }
    var max = 1;
    for (i = 0; i < n; i++) if (counts[i] > max) max = counts[i];
    var bw = W / n, body = "";
    for (i = 0; i < n; i++) {
      var inWin = (i * bin) >= lo - 0.001 && (i * bin) < hi;
      var h = Math.max(counts[i] ? 1.5 : 0, (counts[i] / max) * (H - 12));
      body += '<rect x="' + (i * bw + 0.6).toFixed(1) + '" y="' + (H - 12 - h).toFixed(1) +
        '" width="' + (bw - 1.2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1" fill="' +
        (inWin ? ACCENT : "rgba(255,255,255,0.10)") + '" fill-opacity="' + (inWin ? "0.95" : "1") +
        '"><title>' + E((i * bin) + " to " + ((i + 1) * bin) + " m: " + counts[i] + " kills") +
        "</title></rect>";
    }
    var ticks = "";
    [0, 300, 600, 900].forEach(function (d) {
      var x = (d / RANGE_TOP) * W;
      ticks += '<text x="' + Math.min(W - 12, Math.max(6, x)).toFixed(1) + '" y="' + (H - 1) +
        '" text-anchor="' + (d === 0 ? "start" : (d === RANGE_TOP ? "end" : "middle")) +
        '" class="chart-axis-label">' + d + " m</text>";
    });
    return '<svg class="chart-svg" width="100%" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="none">' + body + ticks + "</svg>";
  }

  function wireBoard(T, root, S) {
    var panel = root.querySelector(".te-board");
    if (!panel) return;
    var stage = panel.querySelector(".te-stage");
    var img = panel.querySelector(".te-mapimg");
    var base = panel.querySelector(".te-cv-base");
    var over = panel.querySelector(".te-cv-over");
    var status = panel.querySelector(".te-status");
    var histBox = panel.querySelector(".te-hist");
    var loEl = panel.querySelector(".te-lo");
    var hiEl = panel.querySelector(".te-hi");
    var loLbl = panel.querySelector(".te-sliderrow span");
    var hiLbl = panel.querySelectorAll(".te-sliderrow span")[1];
    if (!stage || !base || !over) return;

    var geom = { w: 0, h: 0, tf: null };

    function ctxOf(cv) {
      var dpr = window.devicePixelRatio || 1;
      var w = Math.max(160, Math.round(stage.clientWidth || 700));
      cv.style.width = w + "px";
      cv.style.height = w + "px";
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * dpr);
      var c = cv.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, w);
      geom.w = w; geom.h = w;
      return c;
    }

    function drawBase() {
      var d = S.cache[S.sel];
      var c = ctxOf(base);
      ctxOf(over);
      if (!d) return;
      geom.tf = buildTf(d, geom.w, geom.h);
      if (!geom.tf) return;
      var tf = geom.tf.fwd, i;

      if (S.layers.heat && (d.heatTeam || []).length) {
        var p0 = tf(0, 0), p1 = tf(d._te.pitch, 0);
        var cell = Math.max(1.6, Math.abs(p1[0] - p0[0]) + Math.abs(p1[1] - p0[1]) + 0.8);
        var g0 = hexRgb(teamHex(0), [53, 103, 74]);
        var g1 = hexRgb(teamHex(1), [138, 68, 68]);
        var scale = d._te.heatScale || 1;
        for (i = 0; i < d.heatTeam.length; i++) {
          var q = d.heatTeam[i], a0 = q[2] || 0, a1 = q[3] || 0, tot = a0 + a1;
          if (!tot) continue;
          var f = a1 / tot;
          var r = Math.round(g0[0] + (g1[0] - g0[0]) * f);
          var gg = Math.round(g0[1] + (g1[1] - g0[1]) * f);
          var bb = Math.round(g0[2] + (g1[2] - g0[2]) * f);
          var al = Math.min(1, tot / scale) * 0.6;
          var xy = tf(q[0], q[1]);
          c.fillStyle = "rgba(" + r + "," + gg + "," + bb + "," + al.toFixed(3) + ")";
          c.fillRect(xy[0] - cell / 2, xy[1] - cell / 2, cell, cell);
        }
      }

      if (S.layers.shots && (d.shots || []).length) {
        c.fillStyle = "rgba(90,210,255,0.55)";
        for (i = 0; i < d.shots.length; i++) {
          var sxy = tf(d.shots[i][0], d.shots[i][1]);
          c.fillRect(sxy[0] - 0.9, sxy[1] - 0.9, 1.8, 1.8);
        }
      }

      var lines = d.killLines || [], rg = d._te.ranges, shown = 0, kept = [];
      for (i = 0; i < lines.length; i++) {
        if (rg[i] >= S.lo && rg[i] <= S.hi) { kept.push(i); shown++; }
      }
      if (S.layers.kills && kept.length) {
        var alpha = Math.max(0.16, Math.min(0.6, 70 / kept.length));
        c.lineCap = "round";
        c.strokeStyle = "rgba(0,0,0,0.5)";
        c.lineWidth = 3;
        c.beginPath();
        for (i = 0; i < kept.length; i++) {
          var La = lines[kept[i]];
          var ua = tf(La[0], La[1]), wa = tf(La[2], La[3]);
          c.moveTo(ua[0], ua[1]); c.lineTo(wa[0], wa[1]);
        }
        c.stroke();
        c.lineWidth = 1.5;
        for (i = 0; i < kept.length; i++) {
          var L = lines[kept[i]];
          var a = tf(L[0], L[1]), b = tf(L[2], L[3]);
          var grad = c.createLinearGradient(a[0], a[1], b[0], b[1]);
          var vr = hexRgb(teamHex(L[4] === 1 ? 1 : 0), [138, 68, 68]);
          grad.addColorStop(0, "rgba(255,209,102," + (alpha * 0.8).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(" + vr[0] + "," + vr[1] + "," + vr[2] + "," +
            Math.min(1, alpha * 2.2).toFixed(3) + ")");
          c.strokeStyle = grad;
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        }
      }
      if (S.layers.deaths && kept.length) {
        for (i = 0; i < kept.length; i++) {
          var K = lines[kept[i]];
          var dxy = tf(K[2], K[3]);
          var dr = hexRgb(teamHex(K[4] === 1 ? 1 : 0), [138, 68, 68]);
          c.beginPath(); c.arc(dxy[0], dxy[1], 3, 0, 7);
          c.fillStyle = "rgba(" + dr[0] + "," + dr[1] + "," + dr[2] + ",0.85)";
          c.fill();
          c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineWidth = 1; c.stroke();
        }
      }

      var win = [];
      for (i = 0; i < kept.length; i++) win.push(rg[kept[i]]);
      win.sort(function (x, y) { return x - y; });
      var med = win.length ? Math.round(pctile(win, 0.5)) : null;
      var mapName = mapNameOf(T, S.sel);
      status.innerHTML = "<b>" + E(mapName) + "</b>, " +
        E(String((S.games[S.sel] || 0))) + " matches. Showing <b>" + shown + "</b> of " +
        lines.length + " kills between <b>" + Math.round(S.lo) + "</b> and <b>" +
        Math.round(S.hi) + "</b> m" +
        (med != null ? ", median of those <b>" + med + " m</b>." : ".") +
        (geom.tf.calibrated ? "" : " Alignment unverified, so the overlay may sit off the art.");
      histBox.innerHTML = rangeHistSvg(d._te.sorted, S.lo, S.hi);
    }

    // hover probe on the overlay canvas only, so the heavy layers are not
    // redrawn on every mouse move
    var rafPending = false, lastEvt = null;
    function drawHover() {
      rafPending = false;
      var d = S.cache[S.sel];
      var c = over.getContext("2d");
      c.clearRect(0, 0, geom.w, geom.h);
      if (!d || !geom.tf || !lastEvt) return;
      var rect = over.getBoundingClientRect();
      var px = lastEvt.clientX - rect.left, py = lastEvt.clientY - rect.top;
      if (px < 0 || py < 0 || px > geom.w || py > geom.h) return;
      var world = geom.tf.inv(px, py);
      var radUU = HOVER_M * UU_PER_M;
      // pixel radius via two projected points, so it survives a rotated capture
      var o0 = geom.tf.fwd(0, 0), o1 = geom.tf.fwd(radUU, 0);
      var pr = Math.hypot(o1[0] - o0[0], o1[1] - o0[1]);

      c.beginPath(); c.arc(px, py, pr, 0, 7);
      c.strokeStyle = "rgba(255,255,255,0.45)"; c.lineWidth = 1.2; c.stroke();

      var lines = d.killLines || [], rg = d._te.ranges, near = 0, from = 0, i;
      for (i = 0; i < lines.length; i++) {
        if (rg[i] < S.lo || rg[i] > S.hi) continue;
        var L = lines[i];
        if (Math.hypot(L[2] - world[0], L[3] - world[1]) <= radUU) {
          near++;
          var a = geom.tf.fwd(L[0], L[1]), b = geom.tf.fwd(L[2], L[3]);
          c.strokeStyle = "rgba(255,235,180,0.85)"; c.lineWidth = 1.4;
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        }
        if (Math.hypot(L[0] - world[0], L[1] - world[1]) <= radUU) from++;
      }
      // presence in the 3x3 block of cells around the cursor
      var pitch = d._te.pitch, gx = Math.round(world[0] / pitch), gy = Math.round(world[1] / pitch);
      var t0 = 0, t1 = 0;
      for (var ox = -1; ox <= 1; ox++) {
        for (var oy = -1; oy <= 1; oy++) {
          var cell = d._te.index[(gx + ox) + "|" + (gy + oy)];
          if (cell) { t0 += cell[2] || 0; t1 += cell[3] || 0; }
        }
      }
      var tot = t0 + t1;
      status.innerHTML = "Within " + HOVER_M + " m: <b>" + near +
        "</b> deaths, <b>" + from + "</b> killing shots." +
        (tot ? " Time here: A <b>" + Math.round(t0 / tot * 100) + "%</b> / B <b>" +
          Math.round(100 - Math.round(t0 / tot * 100)) + "%</b> of " + NUM(tot) + " samples." :
          " No movement samples here.");
    }

    function onMove(ev) {
      lastEvt = ev;
      if (rafPending) return;
      rafPending = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(drawHover);
      else drawHover();
    }
    function onLeave() {
      lastEvt = null;
      var c = over.getContext("2d");
      c.clearRect(0, 0, geom.w, geom.h);
      drawBase();
    }
    over.addEventListener("mousemove", onMove);
    over.addEventListener("mouseleave", onLeave);

    function select(slug) {
      S.sel = slug;
      var btns = panel.querySelectorAll(".te-map"), i;
      for (i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute("data-slug") === slug) btns[i].className = "te-btn te-map on";
        else btns[i].className = "te-btn te-map";
      }
      img.setAttribute("src", "assets/maps/minimap/" + encodeURIComponent(slug) + ".png");
      if (S.cache[slug]) { drawBase(); return; }
      status.textContent = "Loading " + mapNameOf(T, slug) + "...";
      ctxOf(base); ctxOf(over);
      ensureMap(T, S, slug).then(function () {
        if (S.sel === slug) drawBase();
      }, function () {
        if (S.sel === slug) {
          status.textContent = "Could not load " + mapNameOf(T, slug) + ".";
        }
      });
    }

    var mapBtns = panel.querySelectorAll(".te-map");
    for (var i = 0; i < mapBtns.length; i++) {
      mapBtns[i].addEventListener("click", function () {
        select(this.getAttribute("data-slug"));
      });
    }
    var layerBtns = panel.querySelectorAll(".te-layer");
    for (i = 0; i < layerBtns.length; i++) {
      layerBtns[i].addEventListener("click", function () {
        var k = this.getAttribute("data-layer");
        S.layers[k] = !S.layers[k];
        this.className = "te-btn te-layer" + (S.layers[k] ? " on" : "");
        drawBase();
      });
    }
    function onSlide() {
      var lo = +loEl.value, hi = +hiEl.value;
      if (lo > hi) { if (this === loEl) hi = lo; else lo = hi; }
      loEl.value = lo; hiEl.value = hi;
      S.lo = lo; S.hi = hi;
      if (loLbl) loLbl.textContent = "From " + lo + " m";
      if (hiLbl) hiLbl.textContent = "To " + hi + " m";
      drawBase();
    }
    loEl.addEventListener("input", onSlide);
    hiEl.addEventListener("input", onSlide);
    loEl.addEventListener("change", onSlide);
    hiEl.addEventListener("change", onSlide);

    var resizeTimer = null;
    function onResize() {
      if (!document.body.contains(panel)) {
        window.removeEventListener("resize", onResize);
        return;
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(drawBase, 150);
    }
    window.addEventListener("resize", onResize);
    if (img) img.addEventListener("load", function () { drawBase(); });

    select(S.sel);
  }

  function mapNameOf(T, slug) {
    var maps = (T.DATA && T.DATA.maps) || [];
    for (var i = 0; i < maps.length; i++) if (maps[i].slug === slug) return maps[i].map;
    return slug;
  }

  // ------------------------------------- panel 2: range bands and per-map spread

  function bandsPanel(T) {
    var s = T.STATS || {};
    var bands = s.kill_range_bands || [];
    if (!bands.length || !s.kill_range_samples) return "";
    var maps = mapListOf(T);
    var chips = '<button type="button" class="te-btn te-band on" data-slug="">All maps' +
      '<span class="te-sub">' + NUM(s.kill_range_samples) + "</span></button>" +
      maps.map(function (m) {
        return '<button type="button" class="te-btn te-band" data-slug="' + E(m.slug) +
          '" disabled>' + E(m.map) + "</button>";
      }).join("");
    var missing = missingMapsNote(T);
    var body =
      '<div class="te-ctrls"><span class="te-ctrls-label">Kills from</span>' + chips + "</div>" +
      '<div class="te-two">' +
        '<div class="te-eye"></div>' +
        '<div><ul class="te-bands"></ul></div>' +
      "</div>" +
      '<div class="te-sub-h">Spread of kill range, map by map</div>' +
      '<div class="te-box"><p class="te-empty">Load a map above to fill this in.</p></div>' +
      '<div class="te-ctrls" style="margin-top:10px">' +
        '<button type="button" class="te-btn te-loadall">Load every map file (about 9.6 MB)</button>' +
        '<span class="small te-loadmsg"></span>' +
      "</div>";
    var note = "Distance bands from the shooter, shaded by kill count. Spacing is square-root: " +
      "area is not count. Dashed ring is the median. The box plot fills in as maps load, at " +
      "20 decoded kills a map. Kills, not damage." +
      (missing ? " " + missing : "");
    return '<div class="panel avg-panel te-bands-panel"><h2>How far apart kills happen</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function missingMapsNote(T) {
    var off = T.OFFICIAL && T.OFFICIAL.maps;
    if (!off) return "";
    var have = {};
    ((T.DATA && T.DATA.maps) || []).forEach(function (m) { have[m.map] = true; });
    var gapRel = (off.released || []).filter(function (n) { return !have[n]; });
    var gapProto = (off.prototype || []).filter(function (n) { return !have[n]; });
    var out = [];
    if (gapRel.length) {
      out.push("No replays on " + E(gapRel.join(" or ")) + ", both released.");
    }
    if (gapProto.length) {
      out.push("Prototype " + E(gapProto.join(", ")) + " unrecorded too.");
    }
    return out.join(" ");
  }

  function wireBands(T, root, S) {
    var panel = root.querySelector(".te-bands-panel");
    if (!panel) return;
    var eye = panel.querySelector(".te-eye");
    var list = panel.querySelector(".te-bands");
    var box = panel.querySelector(".te-box");
    var msg = panel.querySelector(".te-loadmsg");
    var loadAll = panel.querySelector(".te-loadall");
    var s = T.STATS || {};
    var sel = "";

    function allCounts() {
      var out = [];
      for (var i = 0; i < BAND_EDGES.length - 1; i++) {
        var b = (s.kill_range_bands || [])[i];
        out.push(b && isNum(b.count) ? b.count : 0);
      }
      return out;
    }

    function drawEye() {
      var counts, median, total = 0, label;
      if (sel && S.cache[sel]) {
        var rs = S.cache[sel]._te.sorted;
        counts = bandsFromRanges(rs);
        median = rs.length ? pctile(rs, 0.5) : null;
        label = mapNameOf(T, sel);
      } else {
        counts = allCounts();
        median = s.kill_range_median;
        label = "every map";
      }
      var i;
      for (i = 0; i < counts.length; i++) total += counts[i];
      eye.innerHTML = total
        ? bullseye(counts, { size: 260, pad: 16, median: median, labels: true, color: ACCENT })
        : '<p class="te-empty">No decoded kills on this map.</p>';
      var rows = "";
      for (i = 0; i < counts.length; i++) {
        rows += '<li><span class="te-swatch" style="background:' + ACCENT + ";opacity:" +
          (0.25 + 0.75 * (total ? counts[i] / Math.max.apply(null, counts) : 0)).toFixed(2) +
          '"></span><span class="te-bl">' + E(bandLabel(i)) + '</span><span class="te-bv">' +
          NUM(counts[i]) + '</span><span class="te-bp">' +
          (total ? PCT(Math.round(counts[i] / total * 1000) / 10) : "-") + "</span></li>";
      }
      rows += '<li><span class="te-bl">Total kills, ' + E(label) + '</span><span class="te-bv">' +
        NUM(total) + "</span><span class=\"te-bp\"></span></li>";
      list.innerHTML = rows;
    }

    function drawBox() {
      var maps = mapListOf(T), rows = [], loaded = 0, i;
      for (i = 0; i < maps.length; i++) {
        var d = S.cache[maps[i].slug];
        if (!d) continue;
        loaded++;
        var rs = d._te.sorted;
        if (rs.length < 20) continue;
        rows.push({
          label: maps[i].map,
          count: rs.length,
          p10: Math.round(pctile(rs, 0.10)),
          p25: Math.round(pctile(rs, 0.25)),
          p50: Math.round(pctile(rs, 0.50)),
          p75: Math.round(pctile(rs, 0.75)),
          p90: Math.round(pctile(rs, 0.90)),
          color: chartColor(i)
        });
      }
      if (!rows.length) {
        box.innerHTML = '<p class="te-empty">Nothing loaded with 20+ decoded kills.</p>';
        return;
      }
      rows.sort(function (a, b) { return b.p50 - a.p50; });
      box.innerHTML = T.svgBoxPlot(rows, { width: 1000, labelWidth: 110, rowHeight: 26 }) +
        '<p class="small" style="margin-top:6px">' + loaded + " of " + maps.length +
        " maps loaded, " + rows.length + " with 20+ decoded kills. " +
        "Box is the middle half, line the median, whiskers the 10th and 90th.</p>";
    }

    var chips = panel.querySelectorAll(".te-band");
    function refreshChips() {
      for (var i = 0; i < chips.length; i++) {
        var sl = chips[i].getAttribute("data-slug");
        if (sl && S.cache[sl]) chips[i].removeAttribute("disabled");
        chips[i].className = "te-btn te-band" + (sl === sel ? " on" : "");
      }
    }
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener("click", function () {
        if (this.hasAttribute("disabled")) return;
        sel = this.getAttribute("data-slug");
        refreshChips();
        drawEye();
      });
    }

    S.listeners.push(function () { refreshChips(); drawBox(); });

    if (loadAll) {
      loadAll.addEventListener("click", function () {
        var maps = mapListOf(T), queue = [], j;
        for (j = 0; j < maps.length; j++) {
          if (!S.cache[maps[j].slug]) queue.push(maps[j].slug);
        }
        if (!queue.length) { msg.textContent = "All maps already loaded."; return; }
        loadAll.setAttribute("disabled", "disabled");
        var at = 0, failed = 0;
        function step() {
          if (at >= queue.length) {
            loadAll.removeAttribute("disabled");
            msg.textContent = failed
              ? (failed + " map file" + (failed > 1 ? "s" : "") + " could not be loaded.")
              : "All maps loaded.";
            return;
          }
          msg.textContent = "Loading " + mapNameOf(T, queue[at]) + " (" + (at + 1) + " of " +
            queue.length + ")...";
          ensureMap(T, S, queue[at]).then(function () { at++; step(); },
            function () { failed++; at++; step(); });
        }
        step();
      });
    }

    drawEye();
    drawBox();
    refreshChips();
  }

  // -------------------------------------------- panel 3: range curves overlay

  function curvesPanel(T) {
    var s = T.STATS || {};
    var curves = (s.kill_range_curves || []).filter(function (c) {
      return c && c.bins && c.bins.length > 2;
    });
    if (curves.length < 2) return "";
    var bin = s.kill_range_bin_m || 25;
    var span = bin * curves[0].bins.length;
    var byCount = curves.slice().sort(function (a, b) { return b.count - a.count; });
    var chips = curves.map(function (c, i) {
      var on = byCount.indexOf(c) < 4;
      return '<button type="button" class="te-btn te-curve' + (on ? " on" : "") +
        '" data-tank="' + E(c.label) + '"><span class="te-swatch" style="background:' +
        tankHue(c.label, i) + '"></span>' + E(c.label) + '<span class="te-sub">' +
        c.count + "</span></button>";
    }).join("");
    var body =
      '<div class="te-ctrls"><span class="te-ctrls-label">Overlay</span>' + chips + "</div>" +
      '<div class="te-ctrls"><span class="te-ctrls-label">Show</span>' +
        '<button type="button" class="te-btn te-mode on" data-mode="share">' +
          "Share of that tank's kills</button>" +
        '<button type="button" class="te-btn te-mode" data-mode="count">Kill count</button>' +
        '<button type="button" class="te-btn te-curve-reset">Back to the four most used</button>' +
      "</div>" +
      '<div class="te-curvebox"></div>';
    var note = "Kills per " + bin + " m band, 0 to " + span +
      " m. Share is normalised per tank, count is raw. Kills past " + span +
      " m run off the right edge. Needs 12 kills with a resolvable range.";
    return '<div class="panel avg-panel te-curves"><h2>Engagement range, tank by tank</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function wireCurves(T, root) {
    var panel = root.querySelector(".te-curves");
    if (!panel) return;
    var s = T.STATS || {};
    var curves = (s.kill_range_curves || []).filter(function (c) {
      return c && c.bins && c.bins.length > 2;
    });
    var bin = s.kill_range_bin_m || 25;
    var box = panel.querySelector(".te-curvebox");
    var mode = "share";
    var picked = {};
    var byCount = curves.slice().sort(function (a, b) { return b.count - a.count; });
    function defaults() {
      picked = {};
      for (var i = 0; i < Math.min(4, byCount.length); i++) picked[byCount[i].label] = true;
    }
    defaults();

    function draw() {
      var series = [], i;
      for (i = 0; i < curves.length; i++) {
        var c = curves[i];
        if (!picked[c.label]) continue;
        var vals = [];
        for (var b = 0; b < c.bins.length; b++) {
          vals.push(mode === "share" && c.count
            ? Math.round(c.bins[b] / c.count * 1000) / 10
            : c.bins[b]);
        }
        series.push({
          label: c.label + " (" + c.count + " kills)",
          color: tankHue(c.label, i),
          values: vals
        });
      }
      if (!series.length) {
        box.innerHTML = '<p class="te-empty">Pick at least one tank above.</p>';
        return;
      }
      var labels = [];
      for (i = 0; i < curves[0].bins.length; i++) labels.push((i * bin) + " m");
      box.innerHTML = T.svgLineChart(series, {
        width: 1100, height: 300, min: 0, xLabels: labels
      });
    }

    function syncChips() {
      var btns = panel.querySelectorAll(".te-curve");
      for (var i = 0; i < btns.length; i++) {
        btns[i].className = "te-btn te-curve" +
          (picked[btns[i].getAttribute("data-tank")] ? " on" : "");
      }
    }

    var btns = panel.querySelectorAll(".te-curve");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var k = this.getAttribute("data-tank");
        if (picked[k]) delete picked[k]; else picked[k] = true;
        syncChips();
        draw();
      });
    }
    var modes = panel.querySelectorAll(".te-mode");
    for (i = 0; i < modes.length; i++) {
      modes[i].addEventListener("click", function () {
        mode = this.getAttribute("data-mode");
        var all = panel.querySelectorAll(".te-mode");
        for (var j = 0; j < all.length; j++) {
          all[j].className = "te-btn te-mode" +
            (all[j].getAttribute("data-mode") === mode ? " on" : "");
        }
        draw();
      });
    }
    var reset = panel.querySelector(".te-curve-reset");
    if (reset) {
      reset.addEventListener("click", function () { defaults(); syncChips(); draw(); });
    }
    draw();
  }

  // ------------------------------- panel 4: killing range against dying range

  function rangeVsPanel(T) {
    var s = T.STATS || {};
    if (!(s.kill_range_by_tank || []).length || !(s.death_range_by_tank || []).length) return "";
    var body =
      '<div class="te-ctrls">' +
        '<span class="te-ctrls-label">Sort by</span>' +
        '<select class="te-sel te-vs-sort">' +
          '<option value="kill">Range it kills at</option>' +
          '<option value="death">Range it dies at</option>' +
          '<option value="gap">Gap between the two</option>' +
          '<option value="name">Name</option>' +
        "</select>" +
        '<span class="te-ctrls-label">At least</span>' +
        '<select class="te-sel te-vs-min">' +
          '<option value="12">12 of each</option>' +
          '<option value="30" selected>30 of each</option>' +
          '<option value="60">60 of each</option>' +
          '<option value="100">100 of each</option>' +
        "</select>" +
      "</div>" +
      '<div class="te-vsbox"></div>';
    var note = "Green is the median range a tank kills at, red where it dies. Both come from the " +
      "same kills. A tank that mostly fights its own kind lands on the diagonal. Medians hide " +
      "spread. Filter uses the smaller count.";
    return '<div class="panel avg-panel te-vs"><h2>Where a tank kills against where it dies</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function wireRangeVs(T, root) {
    var panel = root.querySelector(".te-vs");
    if (!panel) return;
    var s = T.STATS || {};
    var box = panel.querySelector(".te-vsbox");
    var sortEl = panel.querySelector(".te-vs-sort");
    var minEl = panel.querySelector(".te-vs-min");
    var kill = {}, death = {};
    (s.kill_range_by_tank || []).forEach(function (r) { kill[r.label] = r; });
    (s.death_range_by_tank || []).forEach(function (r) { death[r.label] = r; });

    function draw() {
      var min = +minEl.value, mode = sortEl.value, rows = [], k;
      for (k in kill) {
        if (!Object.prototype.hasOwnProperty.call(kill, k)) continue;
        if (!death[k]) continue;
        if (Math.min(kill[k].count || 0, death[k].count || 0) < min) continue;
        rows.push({
          label: k,
          a: kill[k].value,
          b: death[k].value,
          n: Math.min(kill[k].count, death[k].count)
        });
      }
      if (rows.length < 2) {
        box.innerHTML = '<p class="te-empty">No tank has that many kills and deaths ' +
          'with a resolvable range. Try a lower threshold.</p>';
        return;
      }
      rows.sort(function (x, y) {
        if (mode === "death") return y.b - x.b;
        if (mode === "gap") return (y.a - y.b) - (x.a - x.b);
        if (mode === "name") return x.label < y.label ? -1 : (x.label > y.label ? 1 : 0);
        return y.a - x.a;
      });
      box.innerHTML = T.svgDumbbell(rows, {
        width: 1000, labelWidth: 110, rowHeight: 24,
        aName: "kills at", bName: "dies at",
        aColor: "#6f9a4a", bColor: "#c0392b"
      }) + '<div class="chart-legend" style="margin-top:6px">' +
        '<span class="chart-legend-item"><span class="chart-legend-dot" ' +
        'style="background:#6f9a4a"></span>Median range of its kills</span>' +
        '<span class="chart-legend-item"><span class="chart-legend-dot" ' +
        'style="background:#c0392b"></span>Median range of its deaths</span>' +
        '<span class="chart-legend-item">' + rows.length + ' tanks, metres</span></div>';
    }
    sortEl.addEventListener("change", draw);
    minEl.addEventListener("change", draw);
    draw();
  }

  // ------------------------------------------- panel 5: map against tank grid

  function mapTankCube(T) {
    var cube = {}, matches = (T.DATA && T.DATA.matches) || [], i, j;
    for (i = 0; i < matches.length; i++) {
      var m = matches[i];
      if (!m || !m.players || !m.map) continue;
      var row = cube[m.map] || (cube[m.map] = {});
      var wt = m.winning_team;
      var decided = (wt === 0 || wt === 1);
      for (j = 0; j < m.players.length; j++) {
        var p = m.players[j];
        if (!p || !p.tank) continue;
        var c = row[p.tank] || (row[p.tank] = { g: 0, dec: 0, w: 0, dmg: 0 });
        c.g++;
        c.dmg += p.dmg || 0;
        if (decided) { c.dec++; if (p.team === wt) c.w++; }
      }
    }
    return cube;
  }

  function gridPanel(T) {
    var maps = mapListOf(T);
    var tanks = (T.DATA && T.DATA.tanks) || [];
    if (maps.length < 2 || tanks.length < 3) return "";
    var body =
      '<div class="te-ctrls">' +
        '<span class="te-ctrls-label">Cell</span>' +
        '<select class="te-sel te-grid-metric">' +
          '<option value="win">Win rate</option>' +
          '<option value="pick">Share of that map\'s slots</option>' +
          '<option value="dmg">Damage per game</option>' +
        "</select>" +
        '<span class="te-ctrls-label">Hide cells under</span>' +
        '<select class="te-sel te-grid-min">' +
          '<option value="5">5 games</option>' +
          '<option value="15" selected>15 games</option>' +
          '<option value="30">30 games</option>' +
        "</select>" +
      "</div>" +
      '<div class="te-gridbox"></div>';
    var note = "Colour is distance from that tank's own average across maps. Blue above, orange " +
      "below. Blank is under the games threshold. Small maps move on a handful of games. " +
      "Treat single cells as a hint.";
    return '<div class="panel avg-panel te-grid"><h2>Which ground suits which tank</h2>' +
      body + '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  function wireGrid(T, root) {
    var panel = root.querySelector(".te-grid");
    if (!panel) return;
    var box = panel.querySelector(".te-gridbox");
    var metricEl = panel.querySelector(".te-grid-metric");
    var minEl = panel.querySelector(".te-grid-min");
    var cube = mapTankCube(T);
    var maps = mapListOf(T);
    var rowLabels = [], i;
    for (i = 0; i < maps.length; i++) if (cube[maps[i].map]) rowLabels.push(maps[i].map);
    var tanks = ((T.DATA && T.DATA.tanks) || []).slice().sort(function (a, b) {
      return (b.games || 0) - (a.games || 0);
    });
    var colLabels = tanks.map(function (t) { return t.tank; });
    var mapTotals = {};
    for (i = 0; i < rowLabels.length; i++) {
      var tot = 0, k;
      for (k in cube[rowLabels[i]]) {
        if (Object.prototype.hasOwnProperty.call(cube[rowLabels[i]], k)) {
          tot += cube[rowLabels[i]][k].g;
        }
      }
      mapTotals[rowLabels[i]] = tot;
    }

    function draw() {
      var metric = metricEl.value, min = +minEl.value;
      function valueAt(mapName, tank) {
        var c = cube[mapName] && cube[mapName][tank];
        if (!c) return null;
        if (metric === "pick") {
          if (c.g < min || !mapTotals[mapName]) return null;
          return Math.round(c.g / mapTotals[mapName] * 1000) / 10;
        }
        if (metric === "dmg") {
          if (c.g < min) return null;
          return Math.round(c.dmg / c.g);
        }
        if (c.dec < min) return null;
        return Math.round(c.w / c.dec * 1000) / 10;
      }
      var fmt = metric === "dmg"
        ? function (v) { return String(Math.round(v)); }
        : function (v) { return (Math.round(v * 10) / 10) + "%"; };
      if (!rowLabels.length || !colLabels.length) {
        box.innerHTML = '<p class="te-empty">Not enough recorded matches.</p>';
        return;
      }
      box.innerHTML = T.svgDeviationGrid(rowLabels, colLabels, valueAt, {
        cellW: 68, cellH: 30, labelWidth: 100, fmt: fmt
      });
    }
    metricEl.addEventListener("change", draw);
    minEl.addEventListener("change", draw);
    draw();
  }

  // ------------------------------------------------ panel 6: ground covered

  function groundPanel(T) {
    var s = T.STATS || {};
    var dist = (s.distance_by_tank || []).filter(function (r) {
      return r && isNum(r.value) && (r.tracks || 0) >= 100;
    });
    var zones = (s.zone_contested || []).filter(function (z) { return z && z.count; });
    if (dist.length < 3 && !zones.length) return "";
    var body = "";
    if (dist.length >= 3) {
      var rows = dist.slice().sort(function (a, b) { return b.value - a.value; })
        .map(function (r, i) {
          return {
            label: r.label,
            value: r.value,
            color: tankHue(r.label, i),
            valueLabel: NUM(r.value) + " m (" + NUM(r.tracks) + " tracks)"
          };
        });
      body += T.svgBarChart(rows, {
        width: 1000, labelWidth: 100, rowHeight: 22,
        gridColor: "rgba(120,150,210,0.20)"
      });
    }
    if (zones.length) {
      var ztot = 0;
      zones.forEach(function (z) { ztot += z.count; });
      var zrows = zones.map(function (z, i) {
        return {
          label: String(z.label).replace(/Zone$/, ""),
          value: z.count,
          color: chartColor(i + 2),
          valueLabel: NUM(z.count) + " ticks (" + PCT(Math.round(z.count / ztot * 1000) / 10) + ")"
        };
      });
      body += '<div class="te-sub-h">Ground under contest, by what is on it</div>' +
        T.svgBarChart(zrows, {
          width: 1000, labelWidth: 130, rowHeight: 24,
          gridColor: "rgba(255,255,255,0.08)"
        });
    }
    if (!body) return "";
    var note = "Median metres per match along each decoded track. Tracks are sampled, not " +
      "continuous. Every figure is a floor. Compare the ranking, not the number. Needs 100 " +
      "tracks. Contest ticks scale with how often a zone type appears, not how hard it is fought.";
    return '<div class="panel avg-panel te-ground"><h2>Ground covered</h2>' + body +
      '<div class="small" style="margin-top:8px">' + note + "</div></div>";
  }

  // ------------------------------------------------------------ stat cards

  function cardsHtml(T) {
    var s = T.STATS || {}, out = [];
    if (isNum(s.kill_range_median)) {
      out.push(T.card("Median kill range", NUM(s.kill_range_median) + " m"));
    }
    if (isNum(s.kill_range_max)) {
      out.push(T.card("Longest kill", NUM(s.kill_range_max) + " m"));
    }
    if (isNum(s.brawl_share)) {
      out.push(T.card("Kills inside 50 m", PCT(s.brawl_share)));
    }
    if (isNum(s.snipe_share)) {
      out.push(T.card("Kills past 300 m", PCT(s.snipe_share)));
    }
    if (isNum(s.distance_median_m)) {
      out.push(T.card("Ground per match", NUM(Math.round(s.distance_median_m)) + " m"));
    }
    if (isNum(s.dist_per_kill_m)) {
      out.push(T.card("Ground per kill", NUM(Math.round(s.dist_per_kill_m)) + " m"));
    }
    if (isNum(s.moving_share)) {
      out.push(T.card("Samples on the move", PCT(s.moving_share)));
    }
    if (!out.length) return "";
    var n = isNum(s.kill_range_samples) ? NUM(s.kill_range_samples) : "0";
    var m = isNum(s.distance_matches) ? NUM(s.distance_matches) : "0";
    return '<div class="stat-grid">' + out.join("") + "</div>" +
      '<p class="small" style="margin-top:-10px">Kill ranges come from ' + n +
      " kills with both positions resolved. Ground figures from " + m +
      " matches. Both are read off decoded position samples and are approximate.</p>";
  }

  // ----------------------------------------------------------------- suite

  function render(T) {
    TT = T;
    var parts = [
      cardsHtml(T),
      boardPanel(T),
      bandsPanel(T),
      curvesPanel(T),
      rangeVsPanel(T),
      gridPanel(T),
      groundPanel(T)
    ].filter(function (p) { return !!p; });
    if (!parts.length) {
      return '<div class="panel avg-panel"><h2>Terrain</h2>' +
        '<p class="small">No position data has been decoded yet, so there is nothing ' +
        "to place on a map.</p></div>";
    }
    return parts.join("");
  }

  function wire(T, root) {
    TT = T;
    var maps = mapListOf(T);
    var games = {};
    maps.forEach(function (m) { games[m.slug] = m.match_ids.length; });
    var S = {
      sel: maps.length ? maps[0].slug : null,
      cache: {}, pending: {}, failed: {}, listeners: [],
      layers: { kills: true, deaths: true, shots: false, heat: false },
      lo: 0, hi: RANGE_TOP,
      games: games
    };
    try { wireBoard(T, root, S); } catch (e) { /* keep the other panels alive */ }
    try { wireBands(T, root, S); } catch (e) { /* ditto */ }
    try { wireCurves(T, root); } catch (e) { /* ditto */ }
    try { wireRangeVs(T, root); } catch (e) { /* ditto */ }
    try { wireGrid(T, root); } catch (e) { /* ditto */ }
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "terrain",
    title: "Terrain",
    blurb: "Maps, engagement ranges, and the ground tanks cover before they die.",
    accent: ACCENT,
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

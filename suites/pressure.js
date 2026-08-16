/* TYR suite: "Pressure" -- matches as a process over time.
 *
 * Everything here is about WHEN things happen and how a match swings: the
 * average health trace played forward, the per-match player-count lead, how
 * often a deficit is recovered, when kills land, how long matches run.
 *
 * Two data sources, and they are NOT interchangeable:
 *   1. T.STATS.*        aggregates the build script computed over every
 *                       replay it could read (up to 297 matches).
 *   2. a reconstruction from T.DATA.matches[].players[].survival_sec, which
 *      is an exact death timestamp. It is only usable on matches where EVERY
 *      player has one, which is a much smaller and self-selected subset. Any
 *      panel built on it says so and prints its own sample size.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var CSS = "" +
    ".pr-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:4px 0 14px}" +
    ".pr-ctl-label{font-size:.7rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}" +
    ".pr-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}" +
    ".pr-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.8rem;padding:6px 13px;cursor:pointer}" +
    ".pr-seg button+button{border-left:1px solid var(--border)}" +
    ".pr-seg button.pr-on{background:rgba(192,57,43,.24);color:var(--text)}" +
    ".pr-btn{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.8rem;padding:6px 15px;cursor:pointer;min-width:74px}" +
    ".pr-btn:hover{border-color:#c0392b}" +
    ".pr-range{width:240px;max-width:46vw;accent-color:#c0392b;vertical-align:middle}" +
    ".pr-read{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:12px;padding-top:11px;border-top:1px solid var(--border)}" +
    ".pr-read .pr-k{font-size:.66rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}" +
    ".pr-read .pr-v{font-size:1.18rem;font-weight:700;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".pr-sentence{margin:14px 0 0;font-size:.95rem;line-height:1.65}" +
    ".pr-sentence b{color:#e08b7e;font-variant-numeric:tabular-nums}" +
    ".pr-scroll{overflow-x:auto}" +
    ".pr-grid{border-collapse:separate;border-spacing:3px;font-variant-numeric:tabular-nums}" +
    ".pr-grid th{font-size:.66rem;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:3px 6px;white-space:nowrap}" +
    ".pr-grid th.pr-rowh{text-align:right}" +
    ".pr-grid td{text-align:center;border-radius:6px;padding:7px 9px;cursor:pointer;border:1px solid transparent;font-size:.85rem;font-weight:600;min-width:56px}" +
    ".pr-grid td.pr-sel{border-color:rgba(255,255,255,.75)}" +
    ".pr-grid td .pr-n{display:block;font-size:.6rem;font-weight:400;color:var(--dim);margin-top:1px}" +
    ".pr-grid td.pr-thin{opacity:.42}" +
    ".pr-grid td.pr-void{cursor:default;opacity:.18}" +
    ".pr-select{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.8rem;padding:6px 10px}" +
    ".pr-lane-hit{cursor:pointer}" +
    ".pr-detail{margin-top:12px;padding:11px 13px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;font-size:.85rem;line-height:1.75}" +
    ".pr-detail .pr-dim{color:var(--dim)}" +
    ".pr-key{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:.75rem;color:var(--dim);margin-bottom:8px}" +
    ".pr-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}";

  // ------------------------------------------------------------------ paint
  var AHEAD = "#4e8c5a";      // eventual winner is up on tanks alive
  var BEHIND = "#b8483c";     // eventual winner is down on tanks alive
  var LEVEL = "#2c3557";      // dead level
  var WIN_LINE = "#6f9a4a";
  var LOSE_LINE = "#c0392b";
  var LANE_STEPS = 24;        // columns per match in the lane chart
  var PHASES = 5;             // fifths of a match for the deficit table
  var PHASE_NAMES = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
  var MIN_CELL = 8;           // below this many matches a cell is greyed out

  function n2(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function mmss(sec) {
    if (sec == null || !isFinite(sec)) return "-";
    var s = Math.round(sec), m = Math.floor(s / 60);
    var r = s - m * 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function pctStr(v) { return (Math.round(v * 10) / 10) + "%"; }
  function quant(sorted, q) {
    if (!sorted.length) return null;
    var i = clamp(Math.floor((sorted.length - 1) * q), 0, sorted.length - 1);
    return sorted[i];
  }
  function leadColor(lead) {
    if (!lead) return LEVEL;
    var mag = Math.min(Math.abs(lead), 4) / 4;          // 0.25 .. 1
    var o = (0.30 + mag * 0.70).toFixed(2);
    return (lead > 0 ? AHEAD : BEHIND) + shadeAlpha(o);
  }
  // 8-digit hex so a single string carries the alpha; every target browser
  // for this site supports #rrggbbaa.
  function shadeAlpha(o) {
    var v = Math.round(parseFloat(o) * 255).toString(16);
    return v.length < 2 ? "0" + v : v;
  }

  // ------------------------------------------------- reconstruction (cached)
  //
  // survival_sec is the exact second a player's health hit zero (or the match
  // duration if they lived). Cross-checked against the per-match deathEvents
  // feed: the times and the death counts agree exactly. But a player whose
  // health never replicated to the recorder carries null, so a match is only
  // usable when all sixteen are present.
  var _built = null;
  function timeline(T) {
    if (_built) return _built;
    var out = [], ms = (T && T.DATA && T.DATA.matches) || [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], ps = m.players || [];
      var w = m.winning_team, dur = n2(m.duration_sec);
      if ((w !== 0 && w !== 1) || !dur || dur <= 0 || ps.length < 10) continue;
      var roster = [0, 0], deaths = [], bad = false;
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j], tm = p.team, sv = n2(p.survival_sec);
        if ((tm !== 0 && tm !== 1) || sv === null) { bad = true; break; }
        roster[tm]++;
        if (sv < dur - 0.05) deaths.push([sv, tm]);
      }
      if (bad || !roster[0] || !roster[1]) continue;
      deaths.sort(function (a, b) { return a[0] - b[0]; });

      var lane = [], worst = 0, behind = 0, flips = 0, sign = 0, secured = 0;
      for (var k = 0; k < LANE_STEPS; k++) {
        var t = dur * (k + 0.5) / LANE_STEPS;
        var alive = [roster[0], roster[1]];
        for (var q = 0; q < deaths.length; q++) {
          if (deaths[q][0] <= t) alive[deaths[q][1]]--; else break;
        }
        var lead = alive[w] - alive[1 - w];
        lane.push(lead);
        if (lead < worst) worst = lead;
        if (lead < 0) behind++;
        if (lead <= 0) secured = k + 1;
        var sg = lead > 0 ? 1 : (lead < 0 ? -1 : 0);
        if (sg && sign && sg !== sign) flips++;
        if (sg) sign = sg;
      }
      var survW = roster[w], survL = roster[1 - w];
      for (var z = 0; z < deaths.length; z++) {
        if (deaths[z][1] === w) survW--; else survL--;
      }
      out.push({
        id: m.match_id, map: m.map || null, dur: dur,
        winType: m.win_type || null, when: n2(m.captured_unix),
        lane: lane, worst: worst, behindFrac: behind / LANE_STEPS,
        flips: flips, securedFrac: secured / LANE_STEPS,
        deaths: deaths.length, survW: survW, survL: survL,
        firstDeath: deaths.length ? deaths[0][0] : null,
        firstBloodWon: deaths.length ? (deaths[0][1] !== w) : null
      });
    }
    _built = out;
    return out;
  }

  // Phase x player-count-lead -> how often that side went on to win.
  // Every match contributes at most one sample per phase, taken at the phase
  // midpoint, and contributes it from BOTH sides (the winner at +k and the
  // loser at -k). That makes the table symmetric on purpose: a lead of 0 is
  // 50% by construction, not by discovery.
  var _tbl = null;
  function deficitTable(T) {
    if (_tbl) return _tbl;
    var rows = timeline(T), map = {}, minL = 0, maxL = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      for (var ph = 0; ph < PHASES; ph++) {
        var idx = Math.floor((ph + 0.5) / PHASES * LANE_STEPS);
        var lead = r.lane[clamp(idx, 0, LANE_STEPS - 1)];
        add(ph, lead, 1);
        add(ph, -lead, 0);
        if (lead > maxL) maxL = lead;
        if (-lead < minL) minL = -lead;
      }
    }
    function add(ph, lead, won) {
      var key = ph + "|" + lead;
      if (!map[key]) map[key] = [0, 0];
      map[key][0]++;
      map[key][1] += won;
    }
    var span = Math.min(4, Math.max(Math.abs(minL), Math.abs(maxL)));
    _tbl = { map: map, span: span, matches: rows.length };
    return _tbl;
  }
  function cell(tbl, ph, lead) {
    var c = tbl.map[ph + "|" + lead];
    return c ? { n: c[0], wins: c[1], rate: c[0] ? c[1] / c[0] * 100 : null } : { n: 0, wins: 0, rate: null };
  }

  // ------------------------------------------------------------- mini charts
  //
  // These are hand-rolled rather than routed through T.svgLineChart because
  // every one of them needs a movable cursor drawn into the same SVG, which
  // the shared helper has no way to express.
  function polyline(vals, x0, x1, yTop, yBot, vmin, vmax, color, width, opacity) {
    var pts = [], n = vals.length;
    for (var i = 0; i < n; i++) {
      if (vals[i] == null) continue;
      var x = x0 + (n > 1 ? i / (n - 1) : 0) * (x1 - x0);
      var y = yBot - (vals[i] - vmin) / (vmax - vmin || 1) * (yBot - yTop);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    if (pts.length < 2) return "";
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color +
      '" stroke-width="' + width + '" stroke-linejoin="round" stroke-linecap="round"' +
      (opacity != null ? ' opacity="' + opacity + '"' : "") + "></polyline>";
  }
  function dotAt(vals, i, x0, x1, yTop, yBot, vmin, vmax, color) {
    if (vals[i] == null) return "";
    var n = vals.length;
    var x = x0 + (n > 1 ? i / (n - 1) : 0) * (x1 - x0);
    var y = yBot - (vals[i] - vmin) / (vmax - vmin || 1) * (yBot - yTop);
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" fill="' +
      color + '" stroke="var(--panel)" stroke-width="1.5"></circle>';
  }

  // ==========================================================================
  // Panel 1 -- the average match, played forward
  // ==========================================================================
  function shapeModes(T) {
    var S = T.STATS || {}, out = [];
    var hc = S.health_curve;
    if (hc && hc.winner && hc.loser && hc.seconds && hc.winner.length > 3) {
      out.push({
        key: "wl", label: "Winner vs loser",
        a: { name: "Eventual winner", vals: hc.winner, color: WIN_LINE },
        b: { name: "Eventual loser", vals: hc.loser, color: LOSE_LINE },
        x: hc.seconds, xKind: "sec", live: hc.matches_at || null,
        base: hc.decided_matches || null
      });
    }
    var cc = S.comeback_curves;
    if (cc && cc.comeback && cc.normal && cc.comeback.length > 3) {
      var xs = [], steps = cc.comeback.length;
      for (var i = 0; i < steps; i++) xs.push(Math.round(i / (steps - 1) * 100));
      out.push({
        key: "cb", label: "Comebacks vs the rest",
        a: { name: "Behind at halftime (" + (cc.comebackMatches || 0) + ")", vals: cc.comeback, color: "#c98b3a" },
        b: { name: "Not behind (" + (cc.normalMatches || 0) + ")", vals: cc.normal, color: WIN_LINE },
        x: xs, xKind: "pct", live: null,
        base: (cc.comebackMatches || 0) + (cc.normalMatches || 0)
      });
    }
    return out;
  }

  function drawShape(mode, idx) {
    var W = 720, H = 268, L = 44, R = 14, Tp = 16, B = 34;
    var x0 = L, x1 = W - R, yTop = Tp, yBot = H - B;
    var all = mode.a.vals.concat(mode.b.vals).filter(function (v) { return v != null; });
    var vmax = Math.max.apply(null, all.concat([1]));
    vmax = Math.ceil(vmax / 10) * 10;
    var vmin = 0, n = mode.x.length;

    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var v = vmin + (vmax - vmin) * g / 4;
      var y = yBot - (v - vmin) / (vmax - vmin) * (yBot - yTop);
      grid += '<line x1="' + x0 + '" y1="' + y.toFixed(1) + '" x2="' + x1 + '" y2="' + y.toFixed(1) +
        '" stroke="var(--border)" stroke-width="1"></line>' +
        '<text x="' + (x0 - 6) + '" y="' + (y + 3.5).toFixed(1) +
        '" text-anchor="end" class="chart-axis-label">' + Math.round(v) + "</text>";
    }

    // Shade the stretch where fewer than 30 matches were still running: the
    // averages there are drawn from a handful of long games.
    var thin = "";
    if (mode.live) {
      var firstThin = -1;
      for (var i = 0; i < mode.live.length; i++) {
        if (mode.live[i] < 30) { firstThin = i; break; }
      }
      if (firstThin > 0) {
        var tx = x0 + firstThin / (n - 1) * (x1 - x0);
        thin = '<rect x="' + tx.toFixed(1) + '" y="' + yTop + '" width="' + (x1 - tx).toFixed(1) +
          '" height="' + (yBot - yTop) + '" fill="rgba(255,255,255,0.045)"></rect>' +
          '<text x="' + (tx + 6).toFixed(1) + '" y="' + (yTop + 12) +
          '" class="chart-axis-label">under 30 matches live</text>';
      }
    }

    // Ghost the whole curve, then redraw the part up to the cursor solid.
    var upToA = mode.a.vals.slice(0, idx + 1), upToB = mode.b.vals.slice(0, idx + 1);
    var lines =
      polyline(mode.a.vals, x0, x1, yTop, yBot, vmin, vmax, mode.a.color, 2, 0.22) +
      polyline(mode.b.vals, x0, x1, yTop, yBot, vmin, vmax, mode.b.color, 2, 0.22);
    // The partial series has to keep the FULL series' x spacing, or the drawn
    // prefix would stretch to fill the width and the cursor would drift off it.
    function partial(vals, color) {
      var pts = [];
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] == null) continue;
        var x = x0 + (n > 1 ? i / (n - 1) : 0) * (x1 - x0);
        var y = yBot - (vals[i] - vmin) / (vmax - vmin) * (yBot - yTop);
        pts.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      if (pts.length < 2) return "";
      return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color +
        '" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"></polyline>';
    }
    lines += partial(upToA, mode.a.color) + partial(upToB, mode.b.color);

    var cx = x0 + (n > 1 ? idx / (n - 1) : 0) * (x1 - x0);
    var cursor = '<line x1="' + cx.toFixed(1) + '" y1="' + yTop + '" x2="' + cx.toFixed(1) +
      '" y2="' + yBot + '" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" stroke-dasharray="3 3"></line>' +
      dotAt(mode.a.vals, idx, x0, x1, yTop, yBot, vmin, vmax, mode.a.color) +
      dotAt(mode.b.vals, idx, x0, x1, yTop, yBot, vmin, vmax, mode.b.color);

    var ticks = "";
    var step = Math.max(1, Math.ceil(n / 9));
    for (var t = 0; t < n; t += step) {
      var xx = x0 + (n > 1 ? t / (n - 1) : 0) * (x1 - x0);
      ticks += '<text x="' + xx.toFixed(1) + '" y="' + (H - 12) +
        '" text-anchor="middle" class="chart-axis-label">' +
        (mode.xKind === "sec" ? mmss(mode.x[t]) : mode.x[t] + "%") + "</text>";
    }

    var legend = '<div class="chart-legend">' +
      '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:' + mode.a.color + '"></span>' + mode.a.name + "</span>" +
      '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:' + mode.b.color + '"></span>' + mode.b.name + "</span>" +
      "</div>";

    var av = mode.a.vals[idx], bv = mode.b.vals[idx];
    var readout =
      '<div class="pr-read">' +
      rd(mode.xKind === "sec" ? "Clock" : "Match progress",
         mode.xKind === "sec" ? mmss(mode.x[idx]) : mode.x[idx] + "%") +
      rd(mode.key === "wl" ? "Winner pool" : "Comeback winners", av == null ? "-" : pctStr(av)) +
      rd(mode.key === "wl" ? "Loser pool" : "Other winners", bv == null ? "-" : pctStr(bv)) +
      rd("Gap", (av == null || bv == null) ? "-" : (av - bv >= 0 ? "+" : "") + pctStr(av - bv)) +
      (mode.live ? rd("Matches still live", mode.live[idx] == null ? "-" : mode.live[idx]) : "") +
      "</div>";

    return legend +
      '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet">' +
      thin + grid + lines + cursor + ticks + "</svg>" + readout;
  }
  function rd(k, v) {
    return '<div><div class="pr-k">' + k + '</div><div class="pr-v">' + v + "</div></div>";
  }

  // ==========================================================================
  // Panel 2 -- one lane per match
  // ==========================================================================
  var SORTS = [
    { key: "worst", label: "Deepest deficit",
      cmp: function (a, b) { return a.worst - b.worst || b.behindFrac - a.behindFrac; } },
    { key: "behind", label: "Time spent behind",
      cmp: function (a, b) { return b.behindFrac - a.behindFrac || a.worst - b.worst; } },
    { key: "secured", label: "Latest lead secured",
      cmp: function (a, b) { return b.securedFrac - a.securedFrac; } },
    { key: "flips", label: "Lead changes",
      cmp: function (a, b) { return b.flips - a.flips || b.behindFrac - a.behindFrac; } },
    { key: "dur", label: "Match length", cmp: function (a, b) { return b.dur - a.dur; } },
    { key: "when", label: "Most recent first", cmp: function (a, b) { return (b.when || 0) - (a.when || 0); } }
  ];
  function sortedLanes(rows, key) {
    var s = null;
    for (var i = 0; i < SORTS.length; i++) if (SORTS[i].key === key) s = SORTS[i];
    var copy = rows.slice();
    copy.sort((s || SORTS[0]).cmp);
    return copy;
  }

  // Every lane cell as its own <rect> is ~2,200 nodes for 92 matches, and the
  // chart is rebuilt on every sort change. Runs of the same colour inside a
  // lane collapse first, then everything of one colour becomes a single
  // <path> of rectangle subpaths -- nine paths instead of thousands of nodes.
  function laneCells(rows, x0, plotW, laneH, yAt) {
    var byColor = {}, cw = plotW / LANE_STEPS, c;
    for (var i = 0; i < rows.length; i++) {
      var lane = rows[i].lane, y = yAt(i), start = 0;
      for (var k = 1; k <= LANE_STEPS; k++) {
        if (k < LANE_STEPS && lane[k] === lane[start]) continue;
        c = leadColor(lane[start]);
        var x = x0 + start * cw, w = (k - start) * cw + 0.35;
        if (!byColor[c]) byColor[c] = [];
        byColor[c].push("M" + x.toFixed(2) + " " + y.toFixed(2) +
          "h" + w.toFixed(2) + "v" + laneH.toFixed(2) + "h-" + w.toFixed(2) + "z");
        start = k;
      }
    }
    var out = "";
    for (c in byColor) {
      if (!byColor.hasOwnProperty(c)) continue;
      out += '<path fill="' + c + '" d="' + byColor[c].join("") + '"></path>';
    }
    return out;
  }

  function drawLanes(rows, selId) {
    if (!rows.length) return "";
    var W = 940, L = 10, R = 10, top = 20;
    var laneH = rows.length > 70 ? 6 : (rows.length > 40 ? 9 : 13);
    var gap = laneH > 7 ? 2 : 1;
    var H = top + rows.length * (laneH + gap) + 6;
    var plotW = W - L - R;

    var axis = "";
    for (var g = 0; g <= 4; g++) {
      var x = L + plotW * g / 4;
      axis += '<line x1="' + x.toFixed(1) + '" y1="' + top + '" x2="' + x.toFixed(1) +
        '" y2="' + (H - 4) + '" stroke="rgba(255,255,255,0.10)" stroke-width="1"></line>' +
        '<text x="' + x.toFixed(1) + '" y="12" text-anchor="' +
        (g === 0 ? "start" : (g === 4 ? "end" : "middle")) +
        '" class="chart-axis-label">' + (g * 25) + "%</text>";
    }

    var yAt = function (i) { return top + i * (laneH + gap); };
    var body = laneCells(rows, L, plotW, laneH, yAt);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var tip = mmss(r.dur) + ", " + r.deaths + " lost, " +
        (r.worst < 0 ? "down " + Math.abs(r.worst) + " at worst" : "never behind") +
        ", lead locked at " + Math.round(r.securedFrac * 100) + "%";
      body += '<rect class="pr-lane-hit" data-lane="' + r.id + '" x="' + L + '" y="' + yAt(i) +
        '" width="' + plotW.toFixed(1) + '" height="' + laneH + '" fill="transparent"' +
        (r.id === selId ? ' stroke="rgba(255,255,255,0.9)" stroke-width="1.2"' : "") +
        "><title>" + tip + "</title></rect>";
    }

    var key = '<div class="pr-key">' +
      '<span><i style="background:' + BEHIND + '"></i>winner behind</span>' +
      '<span><i style="background:' + LEVEL + '"></i>level</span>' +
      '<span><i style="background:' + AHEAD + '"></i>winner ahead</span>' +
      "<span>brighter = bigger gap</span></div>";

    return key + '<div class="pr-scroll"><svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMinYMin meet">' + axis + body + "</svg></div>";
  }

  function laneDetail(T, rows, selId) {
    if (!selId) return '<div class="pr-detail pr-dim">Click a lane.</div>';
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === selId) r = rows[i];
    if (!r) return '<div class="pr-detail pr-dim">Click a lane.</div>';
    var bits = [];
    bits.push("<b>" + mmss(r.dur) + "</b>");
    if (r.winType) bits.push(T.esc(r.winType));
    if (r.map) bits.push(T.esc(r.map));
    if (r.when) bits.push(T.esc(T.fmtDateTime(r.when)));
    var line2 = [];
    line2.push(r.deaths + " destroyed");
    line2.push("winner ended " + r.survW + " v " + r.survL);
    line2.push(r.worst < 0 ? "down " + Math.abs(r.worst) + " at worst" : "never behind");
    line2.push(Math.round(r.behindFrac * 100) + "% behind");
    line2.push("lead locked at " + Math.round(r.securedFrac * 100) + "%");
    line2.push(r.flips + " lead " + (r.flips === 1 ? "change" : "changes"));
    return '<div class="pr-detail">' + bits.join(" &middot; ") +
      '<br><span class="pr-dim">' + line2.join(" &middot; ") + "</span></div>";
  }

  // ==========================================================================
  // Panel 3 -- deficit lookup
  // ==========================================================================
  function drawDeficitGrid(tbl, ph, lead) {
    var leads = [], span = tbl.span;
    for (var l = span; l >= -span; l--) leads.push(l);
    var head = '<tr><th class="pr-rowh">Tanks up</th>';
    for (var p = 0; p < PHASES; p++) head += "<th>" + PHASE_NAMES[p] + "</th>";
    head += "</tr>";
    var body = "";
    for (var i = 0; i < leads.length; i++) {
      var lv = leads[i];
      body += '<tr><th class="pr-rowh">' + (lv > 0 ? "+" + lv : lv) + "</th>";
      for (var q = 0; q < PHASES; q++) {
        var c = cell(tbl, q, lv);
        if (!c.n) {
          body += '<td class="pr-void">&ndash;</td>';
          continue;
        }
        var f = c.rate / 100;
        var col = f >= 0.5
          ? "rgba(78,140,90," + (0.16 + (f - 0.5) * 1.5).toFixed(2) + ")"
          : "rgba(184,72,60," + (0.16 + (0.5 - f) * 1.5).toFixed(2) + ")";
        var cls = "";
        if (c.n < MIN_CELL) cls += " pr-thin";
        if (q === ph && lv === lead) cls += " pr-sel";
        body += '<td class="' + cls.replace(/^ /, "") + '" data-ph="' + q + '" data-lead="' + lv +
          '" style="background:' + col + '">' + Math.round(c.rate) + "%" +
          '<span class="pr-n">' + c.n + "</span></td>";
      }
      body += "</tr>";
    }
    return '<div class="pr-scroll"><table class="pr-grid">' + head + body + "</table></div>";
  }

  function deficitSentence(tbl, ph, lead) {
    var c = cell(tbl, ph, lead);
    var who = lead === 0 ? "level on tanks"
      : (lead > 0 ? "up " + lead + " " + (lead === 1 ? "tank" : "tanks")
                  : "down " + Math.abs(lead) + " " + (Math.abs(lead) === 1 ? "tank" : "tanks"));
    if (!c.n) {
      return '<p class="pr-sentence">No match was <b>' + who +
        "</b> at <b>" + PHASE_NAMES[ph] + "</b>.</p>";
    }
    if (lead === 0) {
      return '<p class="pr-sentence"><b>Level on tanks</b> at <b>' + PHASE_NAMES[ph] +
        "</b> wins <b>50%</b>. Both sides are level at the same moment. The row is " +
        "arithmetic, and the baseline for the others. n=" + c.n + ".</p>";
    }
    var caveat = c.n < MIN_CELL ? " Thin sample. Treat it as a hint." : "";
    return '<p class="pr-sentence"><b>' + who + "</b> at <b>" + PHASE_NAMES[ph] +
      "</b> won <b>" + Math.round(c.rate) + "%</b>, " +
      c.wins + " of " + c.n + " states." + caveat + "</p>";
  }

  // ==========================================================================
  // Panel 4 -- the kill clock
  // ==========================================================================
  function histTotal(bins) {
    var t = 0;
    for (var i = 0; i < (bins || []).length; i++) t += bins[i].count || 0;
    return t;
  }
  // Share of the distribution at or before t. Linear inside a bin, because the
  // published histogram is all there is -- the raw times are not in the file.
  function cumAt(bins, total, t) {
    if (!total) return 0;
    var acc = 0;
    for (var i = 0; i < bins.length; i++) {
      var b = bins[i];
      if (t >= b.hi) { acc += b.count; continue; }
      if (t > b.lo && b.hi > b.lo) acc += b.count * (t - b.lo) / (b.hi - b.lo);
      break;
    }
    return acc / total * 100;
  }

  function drawClock(kb, kt, fb, ft, t, tmax) {
    var W = 720, H = 250, L = 42, R = 14, Tp = 14, B = 32;
    var x0 = L, x1 = W - R, yTop = Tp, yBot = H - B;
    var N = 60, ks = [], fs = [];
    for (var i = 0; i <= N; i++) {
      var tt = tmax * i / N;
      ks.push(cumAt(kb, kt, tt));
      fs.push(fb ? cumAt(fb, ft, tt) : null);
    }
    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var v = g * 25, y = yBot - v / 100 * (yBot - yTop);
      grid += '<line x1="' + x0 + '" y1="' + y.toFixed(1) + '" x2="' + x1 + '" y2="' + y.toFixed(1) +
        '" stroke="var(--border)"></line><text x="' + (x0 - 6) + '" y="' + (y + 3.5).toFixed(1) +
        '" text-anchor="end" class="chart-axis-label">' + v + "%</text>";
    }
    var lines = polyline(ks, x0, x1, yTop, yBot, 0, 100, LOSE_LINE, 2.6);
    if (fb) lines += polyline(fs, x0, x1, yTop, yBot, 0, 100, "#c98b3a", 2.6);

    var cx = x0 + clamp(t / tmax, 0, 1) * (x1 - x0);
    var cursor = '<line x1="' + cx.toFixed(1) + '" y1="' + yTop + '" x2="' + cx.toFixed(1) +
      '" y2="' + yBot + '" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" stroke-dasharray="3 3"></line>';
    var kv = cumAt(kb, kt, t), fv = fb ? cumAt(fb, ft, t) : null;
    cursor += '<circle cx="' + cx.toFixed(1) + '" cy="' + (yBot - kv / 100 * (yBot - yTop)).toFixed(1) +
      '" r="4.5" fill="' + LOSE_LINE + '" stroke="var(--panel)" stroke-width="1.5"></circle>';
    if (fb) cursor += '<circle cx="' + cx.toFixed(1) + '" cy="' + (yBot - fv / 100 * (yBot - yTop)).toFixed(1) +
      '" r="4.5" fill="#c98b3a" stroke="var(--panel)" stroke-width="1.5"></circle>';

    var ticks = "";
    for (var q = 0; q <= 8; q++) {
      var xx = x0 + (x1 - x0) * q / 8;
      ticks += '<text x="' + xx.toFixed(1) + '" y="' + (H - 11) +
        '" text-anchor="middle" class="chart-axis-label">' + mmss(tmax * q / 8) + "</text>";
    }
    var legend = '<div class="chart-legend">' +
      '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:' + LOSE_LINE + '"></span>kills made</span>' +
      (fb ? '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:#c98b3a"></span>first blood seen</span>' : "") +
      "</div>";

    var readout = '<div class="pr-read">' +
      rd("Clock", mmss(t)) +
      rd("Kills made", pctStr(kv)) +
      (fb ? rd("Past first blood", pctStr(fv)) : "") +
      rd("Still to come", pctStr(100 - kv)) +
      "</div>";

    return legend + '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + grid + lines + cursor + ticks + "</svg>" + readout;
  }

  // ==========================================================================
  // Panel 5 -- match length
  // ==========================================================================
  function durations(T, wt) {
    var ms = (T.DATA && T.DATA.matches) || [], out = [];
    for (var i = 0; i < ms.length; i++) {
      var d = n2(ms[i].duration_sec);
      if (!d || d <= 0) continue;
      if (wt !== "all" && (ms[i].win_type || "unknown") !== wt) continue;
      out.push(d);
    }
    out.sort(function (a, b) { return a - b; });
    return out;
  }
  function drawDurations(vals, binW) {
    if (vals.length < 4) return '<p class="small">Too few matches here.</p>';
    var lo = Math.floor(vals[0] / binW) * binW;
    var hi = Math.ceil(vals[vals.length - 1] / binW) * binW;
    var nb = Math.max(1, Math.round((hi - lo) / binW));
    var counts = [], i;
    for (i = 0; i < nb; i++) counts.push(0);
    for (i = 0; i < vals.length; i++) {
      var b = clamp(Math.floor((vals[i] - lo) / binW), 0, nb - 1);
      counts[b]++;
    }
    var peak = Math.max.apply(null, counts.concat([1]));
    var W = 720, H = 230, L = 34, R = 10, Tp = 12, B = 34;
    var x0 = L, x1 = W - R, yTop = Tp, yBot = H - B, cw = (x1 - x0) / nb;
    var bars = "";
    for (i = 0; i < nb; i++) {
      var h = counts[i] / peak * (yBot - yTop);
      bars += '<rect x="' + (x0 + i * cw + 1).toFixed(1) + '" y="' + (yBot - h).toFixed(1) +
        '" width="' + Math.max(1, cw - 2).toFixed(1) + '" height="' + h.toFixed(1) +
        '" rx="2" fill="' + LOSE_LINE + '" fill-opacity="0.72"><title>' +
        mmss(lo + i * binW) + " to " + mmss(lo + (i + 1) * binW) + ": " + counts[i] +
        " matches</title></rect>";
    }
    var med = quant(vals, 0.5);
    var mx = x0 + clamp((med - lo) / (hi - lo || 1), 0, 1) * (x1 - x0);
    var medLine = '<line x1="' + mx.toFixed(1) + '" y1="' + yTop + '" x2="' + mx.toFixed(1) +
      '" y2="' + yBot + '" stroke="#e6e9f5" stroke-width="1.5" stroke-dasharray="4 3"></line>' +
      '<text x="' + (mx + 5).toFixed(1) + '" y="' + (yTop + 11) + '" class="chart-axis-label">median ' +
      mmss(med) + "</text>";
    var ticks = "";
    for (var q = 0; q <= 6; q++) {
      var xx = x0 + (x1 - x0) * q / 6;
      ticks += '<text x="' + xx.toFixed(1) + '" y="' + (H - 12) +
        '" text-anchor="middle" class="chart-axis-label">' + mmss(lo + (hi - lo) * q / 6) + "</text>";
    }
    var readout = '<div class="pr-read">' +
      rd("Matches", vals.length) +
      rd("Median", mmss(med)) +
      rd("Shortest", mmss(vals[0])) +
      rd("Longest", mmss(vals[vals.length - 1])) +
      rd("Middle 80%", mmss(quant(vals, 0.1)) + " to " + mmss(quant(vals, 0.9))) +
      "</div>";
    return '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + bars + medLine + ticks + "</svg>" + readout;
  }

  // ==========================================================================
  // preview
  // ==========================================================================
  // A miniature of panel 1, which is this suite's signature picture: the two
  // average team-health traces played forward on the match clock, with the
  // winner's surplus shaded on top of the loser's remaining pool, and the
  // kill-timing histogram as a rug on the same clock along the top.
  //
  // Everything that carries meaning is kept above y=158, because the hub lays
  // a caption scrim over the bottom third of the tile and dims the whole thing
  // to 62%. The strokes are lightened well past the page palette for the same
  // reason: the page draws them on a panel at full opacity, the tile does not.
  function preview(T) {
    var S = (T && T.STATS) || {}, i;
    var hc = S.health_curve;
    if (!hc || !hc.winner || !hc.loser || !hc.seconds || hc.winner.length < 4) return "";
    var win = hc.winner, los = hc.loser, secs = hc.seconds;

    // One clock for both series, so the rug and the curves agree on where a
    // moment in the match sits horizontally.
    var kh = S.kill_time_histogram || [];
    var tMax = n2(secs[secs.length - 1]) || 0;
    for (i = 0; i < kh.length; i++) {
      if (kh[i] && n2(kh[i].hi) !== null && kh[i].hi > tMax) tMax = kh[i].hi;
    }
    if (!tMax) return "";

    var vmax = 10;
    for (i = 0; i < win.length; i++) {
      if (n2(win[i]) !== null && win[i] > vmax) vmax = win[i];
      if (n2(los[i]) !== null && los[i] > vmax) vmax = los[i];
    }
    vmax = Math.ceil(vmax / 10) * 10;

    var X0 = 8, X1 = 232, YT = 46, YB = 158;
    function xAt(t) { return X0 + clamp(t / tMax, 0, 1) * (X1 - X0); }
    function yAt(v) { return YB - clamp(v / vmax, 0, 1) * (YB - YT); }
    function chain(vals) {
      var out = [], k;
      for (k = 0; k < vals.length && k < secs.length; k++) {
        if (n2(vals[k]) === null || n2(secs[k]) === null) continue;
        out.push([xAt(secs[k]), yAt(vals[k])]);
      }
      return out;
    }
    function pathOf(pts, cont) {
      var s = "", k;
      for (k = 0; k < pts.length; k++) {
        s += (k || cont ? "L" : "M") + pts[k][0].toFixed(1) + " " + pts[k][1].toFixed(1);
      }
      return s;
    }
    var wp = chain(win), lp = chain(los);
    if (wp.length < 3 || lp.length < 3) return "";

    // The loser's pool, then the winner's surplus stacked directly on it: the
    // top edge of the upper band is the winner trace, so the two shapes read as
    // one total and the gap between them is the lead.
    var pool = pathOf(lp) + "L" + lp[lp.length - 1][0].toFixed(1) + " " + YB +
      "L" + lp[0][0].toFixed(1) + " " + YB + "Z";
    var surplus = pathOf(wp) + pathOf(lp.slice().reverse(), true) + "Z";

    var kmax = 0;
    for (i = 0; i < kh.length; i++) {
      if (kh[i] && n2(kh[i].count) !== null && kh[i].count > kmax) kmax = kh[i].count;
    }
    var rug = "";
    for (i = 0; kmax > 0 && i < kh.length; i++) {
      var b = kh[i];
      if (!b || n2(b.count) === null || n2(b.lo) === null || n2(b.hi) === null) continue;
      var bx = xAt(b.lo), bw = Math.max(1.6, xAt(b.hi) - bx - 1.4), f = b.count / kmax;
      rug += '<rect x="' + bx.toFixed(1) + '" y="8" width="' + bw.toFixed(1) +
        '" height="' + (4 + 26 * f).toFixed(1) + '" rx="1.4" fill="#e2604f" fill-opacity="' +
        (0.34 + 0.56 * f).toFixed(2) + '"></rect>';
    }

    var grid = "";
    for (i = 1; i <= 4; i++) {
      var gy = yAt(vmax * i / 4).toFixed(1);
      grid += '<line x1="' + X0 + '" y1="' + gy + '" x2="' + X1 + '" y2="' + gy +
        '" stroke="rgba(255,255,255,0.10)" stroke-width="1"></line>';
    }
    grid += '<line x1="' + X0 + '" y1="' + YB + '" x2="' + X1 + '" y2="' + YB +
      '" stroke="rgba(255,255,255,0.26)" stroke-width="1"></line>';

    var fb = n2(S.first_blood_median_sec), mark = "";
    if (fb !== null && fb > 0 && fb < tMax) {
      var fx = xAt(fb).toFixed(1);
      mark = '<line x1="' + fx + '" y1="40" x2="' + fx + '" y2="' + YB +
        '" stroke="rgba(255,255,255,0.44)" stroke-width="1.2" stroke-dasharray="3 4"></line>' +
        '<circle cx="' + fx + '" cy="40" r="3.1" fill="#ffd7a1"></circle>';
    }

    function stroke(pts, color) {
      var d = pathOf(pts);
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-opacity="0.30" ' +
        'stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round"></path>' +
        '<path d="' + d + '" fill="none" stroke="' + color +
        '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"></path>';
    }

    return '<svg viewBox="0 0 240 240">' +
      '<defs>' +
      '<linearGradient id="prPvBg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#171e3e"></stop>' +
      '<stop offset="1" stop-color="#090e20"></stop></linearGradient>' +
      '<linearGradient id="prPvPool" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#d8483a" stop-opacity="0.80"></stop>' +
      '<stop offset="1" stop-color="#c0392b" stop-opacity="0.16"></stop></linearGradient>' +
      '<linearGradient id="prPvLead" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#8fc46a" stop-opacity="0.18"></stop>' +
      '<stop offset="1" stop-color="#a8dd7c" stop-opacity="0.58"></stop></linearGradient>' +
      "</defs>" +
      '<rect width="240" height="240" fill="url(#prPvBg)"></rect>' +
      rug + grid +
      '<path d="' + pool + '" fill="url(#prPvPool)"></path>' +
      '<path d="' + surplus + '" fill="url(#prPvLead)"></path>' +
      mark + stroke(lp, "#ff8a72") + stroke(wp, "#a8dd7c") +
      "</svg>";
  }

  // ==========================================================================
  // render
  // ==========================================================================
  function render(T) {
    var S = T.STATS || {}, html = "";
    var rows = timeline(T);
    var modes = shapeModes(T);

    // ---- headline cards -------------------------------------------------
    var cards = [];
    var durAll = durations(T, "all");
    if (durAll.length) cards.push(T.card("Median match", mmss(quant(durAll, 0.5))));
    if (n2(S.kills_per_min) !== null) cards.push(T.card("Kills per minute", T.fmtNum(S.kills_per_min)));
    if (n2(S.first_blood_median_sec) !== null) cards.push(T.card("First blood at", mmss(S.first_blood_median_sec)));
    if (n2(S.first_blood_win_rate) !== null) cards.push(T.card("First blood then wins", T.fmtPct(S.first_blood_win_rate)));
    if (n2(S.comeback_rate) !== null) cards.push(T.card("Comeback rate", T.fmtPct(S.comeback_rate)));
    if (n2(S.blowout_rate) !== null) cards.push(T.card("Blowouts", T.fmtPct(S.blowout_rate)));
    if (n2(S.close_rate) !== null) cards.push(T.card("Nail-biters", T.fmtPct(S.close_rate)));
    if (n2(S.lead_changes_median) !== null) cards.push(T.card("Median lead changes", T.fmtNum(S.lead_changes_median)));
    if (cards.length) html += '<div class="stat-grid">' + cards.join("") + "</div>";

    // ---- panel 1 --------------------------------------------------------
    if (modes.length) {
      var segs = "";
      for (var i = 0; i < modes.length; i++) {
        segs += '<button type="button" data-mode="' + modes[i].key + '"' +
          (i === 0 ? ' class="pr-on"' : "") + ">" + T.esc(modes[i].label) + "</button>";
      }
      var maxIdx = modes[0].x.length - 1;
      var body =
        '<div class="pr-ctl">' +
        (modes.length > 1 ? '<span class="pr-seg" id="pr-shape-seg">' + segs + "</span>" : "") +
        '<button type="button" class="pr-btn" id="pr-play">Play</button>' +
        '<input type="range" class="pr-range" id="pr-shape-range" min="0" max="' + maxIdx + '" value="' + maxIdx + '">' +
        "</div><div id=\"pr-shape-body\"></div>";
      var note = "Team health averaged over " +
        (S.health_curve && S.health_curve.decided_matches ? S.health_curve.decided_matches : "the decided") +
        " matches, every 15s. Repairs can push it above 100%. No single match looks like " +
        "this. Under 30 were still running past the shading.";
      html += T.bigPanel("The average match, played forward", body, note);
    }

    // ---- panel 2 --------------------------------------------------------
    if (rows.length >= 8) {
      var opts = "";
      for (var s = 0; s < SORTS.length; s++) {
        opts += '<option value="' + SORTS[s].key + '">' + T.esc(SORTS[s].label) + "</option>";
      }
      var body2 =
        '<div class="pr-ctl"><span class="pr-ctl-label">Sort by</span>' +
        '<select class="pr-select" id="pr-lane-sort">' + opts + "</select></div>" +
        '<div id="pr-lane-body"></div>';
      var behindCount = 0, deepCount = 0, fbWins = 0, fbSeen = 0;
      for (var r2 = 0; r2 < rows.length; r2++) {
        if (rows[r2].worst < 0) behindCount++;
        if (rows[r2].worst <= -2) deepCount++;
        if (rows[r2].firstBloodWon !== null) {
          fbSeen++;
          if (rows[r2].firstBloodWon) fbWins++;
        }
      }
      // The same first-blood question, asked of this subset and of every match
      // the build script could read. They disagree by a wide margin, which is
      // the clearest available evidence that the subset is not representative,
      // so it is printed rather than hidden.
      var fbHere = fbSeen ? Math.round(fbWins / fbSeen * 100) : null;
      var fbAll = n2(S.first_blood_win_rate);
      var bias = (fbHere !== null && fbAll !== null)
        ? "Self-selected: first blood wins " + fbHere + "% here against " +
          Math.round(fbAll) + "% across all matches. "
        : "Self-selected. Read the shapes, not the rates. ";
      var note2 = "One row per match, 0% to 100% of its own length. Colour is the eventual " +
        "winner's tank lead. Red to green is a comeback. Only " + rows.length + " of " +
        ((T.DATA && T.DATA.matches) ? T.DATA.matches.length : "the") +
        " matches carry a death time for every player. " + bias +
        behindCount + " winners fell behind, " + deepCount + " of them by two or more. " +
        "Tank count ignores health.";
      html += T.bigPanel("Every match as one lane", body2, note2);
    }

    // ---- panel 3 --------------------------------------------------------
    var tbl = rows.length >= 8 ? deficitTable(T) : null;
    if (tbl && tbl.span >= 1) {
      var body3 =
        '<div class="pr-ctl">' +
        '<span class="pr-ctl-label">Match stage</span>' +
        '<input type="range" class="pr-range" id="pr-ph" min="0" max="' + (PHASES - 1) + '" value="2">' +
        '<span class="pr-ctl-label">Tanks up or down</span>' +
        '<input type="range" class="pr-range" id="pr-lead" min="' + (-tbl.span) + '" max="' + tbl.span + '" value="-2">' +
        "</div>" +
        '<div id="pr-def-body"></div>';
      var note3 = "Win rate from that state; the small number is the sample. Same " + tbl.matches +
        "-match reconstruction as the lanes. Both sides of every sample are counted, which " +
        "pins the level row at 50%. Under " + MIN_CELL + " samples is faded. Tanks only, no health.";
      html += T.bigPanel("How doomed were you?", body3, note3);
    }

    // ---- panel 4 --------------------------------------------------------
    var kb = S.kill_time_histogram, fbh = S.first_blood_histogram;
    if (kb && kb.length > 2) {
      var kt = histTotal(kb), ft = histTotal(fbh);
      var tmax = Math.round(kb[kb.length - 1].hi);
      var body4 =
        '<div class="pr-ctl"><span class="pr-ctl-label">Clock</span>' +
        '<input type="range" class="pr-range" id="pr-clock" min="0" max="' + tmax + '" step="5" value="150">' +
        "</div><div id=\"pr-clock-body\"></div>";
      var phase = S.kill_phase;
      if (phase && phase.length) {
        var parts = [], pcolors = ["#436f83", "#8c6739", "#8a4444"];
        for (var pz = 0; pz < phase.length; pz++) {
          parts.push({ name: phase[pz].label, n: phase[pz].count, color: pcolors[pz % pcolors.length] });
        }
        body4 += '<div style="margin-top:14px">' +
          T.svgStackedBar([{ label: "Kills", parts: parts }],
            { width: 720, labelWidth: 60, rowHeight: 26 }) + "</div>";
      }
      var note4 = "Cumulative share of the published histograms: " + T.fmtNum(kt) + " kills, " +
        T.fmtNum(ft) + " opening kills. Interpolation inside the bins makes readings " +
        "approximate. The clock is wall-clock, and only long matches reach the right edge. " +
        "The bar below works in thirds of each match.";
      html += T.bigPanel("The kill clock", body4, note4);
    }

    // ---- panel 5 --------------------------------------------------------
    if (durAll.length >= 10) {
      var wtCounts = {};
      var msAll = (T.DATA && T.DATA.matches) || [];
      for (var w1 = 0; w1 < msAll.length; w1++) {
        var k1 = msAll[w1].win_type || "unknown";
        wtCounts[k1] = (wtCounts[k1] || 0) + 1;
      }
      var wtSegs = '<button type="button" data-wt="all" class="pr-on">All (' + durAll.length + ")</button>";
      var order = ["elimination", "capture"];
      for (var w2 = 0; w2 < order.length; w2++) {
        if (!wtCounts[order[w2]]) continue;
        wtSegs += '<button type="button" data-wt="' + order[w2] + '">' +
          order[w2].charAt(0).toUpperCase() + order[w2].slice(1) + " (" + wtCounts[order[w2]] + ")</button>";
      }
      var body5 =
        '<div class="pr-ctl">' +
        '<span class="pr-seg" id="pr-dur-seg">' + wtSegs + "</span>" +
        '<span class="pr-ctl-label">Bin width</span>' +
        '<select class="pr-select" id="pr-dur-bin"><option value="30">30s</option>' +
        '<option value="45" selected>45s</option><option value="60">60s</option></select>' +
        "</div><div id=\"pr-dur-body\"></div>";
      var note5 = "Recorded duration of " + durAll.length + " matches. Replay length includes " +
        "the countdown and runs longer than the fighting. Unknown win types sit only in All.";
      html += T.bigPanel("How long a match runs", body5, note5);
    }

    // ---- panel 6 --------------------------------------------------------
    var sv = S.survivors_at_end;
    if (sv && sv.length) {
      var svRows = [];
      var svTotal = 0;
      for (var v1 = 0; v1 < sv.length; v1++) svTotal += sv[v1].count || 0;
      for (var v2 = 0; v2 < sv.length; v2++) {
        svRows.push({
          label: sv[v2].label + (sv[v2].label === "1" ? " tank left" : " tanks left"),
          value: sv[v2].count,
          color: CHIP_SCALE(v2, sv.length),
          valueLabel: T.fmtNum(sv[v2].count) + " (" + Math.round(sv[v2].count / (svTotal || 1) * 100) + "%)"
        });
      }
      var endCards = [];
      if (n2(S.victory_margin_median) !== null) endCards.push(T.card("Winner's health left", T.fmtPct(S.victory_margin_median)));
      if (n2(S.blowout_rate) !== null) endCards.push(T.card("Won with 60%+ left", T.fmtPct(S.blowout_rate)));
      if (n2(S.close_rate) !== null) endCards.push(T.card("Won with 15% or less", T.fmtPct(S.close_rate)));
      if (n2(S.lead_changes_max) !== null) endCards.push(T.card("Most lead changes", T.fmtNum(S.lead_changes_max)));
      if (n2(S.kill_gap_median) !== null) endCards.push(T.card("Median gap between kills", mmss(S.kill_gap_median)));
      if (n2(S.trades) !== null) endCards.push(T.card("Trades inside 3s", T.fmtNum(S.trades)));
      var mk = S.multikills;
      if (mk && mk.length) {
        for (var mki = 0; mki < mk.length; mki++) {
          endCards.push(T.card(mk[mki].label, T.fmtNum(mk[mki].count)));
        }
      }
      var body6 = T.svgBarChart(svRows, { width: 700, labelWidth: 110, rowHeight: 22 }) +
        (endCards.length ? '<div class="stat-grid" style="margin-top:16px;margin-bottom:0">' + endCards.join("") + "</div>" : "");
      var note6 = "How " + T.fmtNum(svTotal) + " decided matches ended. Bars are the winner's tanks left, " +
        "cards its share of starting health. Trade: opposite-side deaths within 3s. Multikill: one player " +
        "inside 10s. Lead changes come from health, not tanks.";
      html += T.bigPanel("How matches end", body6, note6);
    }

    return html ? '<div class="pr-wrap">' + html + "</div>" : "";
  }

  function CHIP_SCALE(i, n) {
    // 1 survivor (a scrape) through 8 (untouched): red to green.
    var f = n > 1 ? i / (n - 1) : 0;
    var r = Math.round(184 + (78 - 184) * f);
    var g = Math.round(72 + (140 - 72) * f);
    var b = Math.round(60 + (90 - 60) * f);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  // ==========================================================================
  // wire
  // ==========================================================================
  function wire(T, root) {
    var S = T.STATS || {};

    // ---- panel 1 --------------------------------------------------------
    var shapeBody = root.querySelector("#pr-shape-body");
    if (shapeBody) {
      var modes = shapeModes(T);
      var mi = 0, idx = modes[0].x.length - 1, timer = null;
      var range = root.querySelector("#pr-shape-range");
      var playBtn = root.querySelector("#pr-play");
      var seg = root.querySelector("#pr-shape-seg");

      var paint = function () { shapeBody.innerHTML = drawShape(modes[mi], idx); };
      paint();

      if (range) {
        range.addEventListener("input", function () {
          idx = clamp(parseInt(range.value, 10) || 0, 0, modes[mi].x.length - 1);
          paint();
        });
      }
      var stop = function () {
        if (timer) { clearInterval(timer); timer = null; }
        if (playBtn) playBtn.textContent = "Play";
      };
      if (playBtn) {
        playBtn.addEventListener("click", function () {
          if (timer) { stop(); return; }
          if (idx >= modes[mi].x.length - 1) idx = 0;
          playBtn.textContent = "Pause";
          timer = setInterval(function () {
            // The suite is torn out of the DOM on navigation and there is no
            // teardown hook, so the interval has to notice by itself.
            if (!document.body.contains(root)) { clearInterval(timer); timer = null; return; }
            idx++;
            if (idx >= modes[mi].x.length - 1) { idx = modes[mi].x.length - 1; paint(); sync(); stop(); return; }
            paint(); sync();
          }, 260);
        });
      }
      var sync = function () { if (range) range.value = String(idx); };
      if (seg) {
        seg.addEventListener("click", function (e) {
          var b = e.target.closest ? e.target.closest("button[data-mode]") : null;
          if (!b) return;
          stop();
          for (var k = 0; k < modes.length; k++) if (modes[k].key === b.getAttribute("data-mode")) mi = k;
          var btns = seg.querySelectorAll("button");
          for (var q = 0; q < btns.length; q++) btns[q].className = btns[q] === b ? "pr-on" : "";
          idx = modes[mi].x.length - 1;
          if (range) { range.max = String(idx); range.value = String(idx); }
          paint();
        });
      }
    }

    // ---- panel 2 --------------------------------------------------------
    var laneBody = root.querySelector("#pr-lane-body");
    if (laneBody) {
      var all = timeline(T), sortKey = SORTS[0].key, sel = null, cur = sortedLanes(all, sortKey);
      var paintLanes = function () {
        cur = sortedLanes(all, sortKey);
        laneBody.innerHTML = drawLanes(cur, sel) + laneDetail(T, cur, sel);
      };
      paintLanes();
      var sortSel = root.querySelector("#pr-lane-sort");
      if (sortSel) {
        sortSel.addEventListener("change", function () { sortKey = sortSel.value; paintLanes(); });
      }
      laneBody.addEventListener("click", function (e) {
        var t = e.target;
        var id = t && t.getAttribute ? t.getAttribute("data-lane") : null;
        if (!id && t && t.parentNode && t.parentNode.getAttribute) id = t.parentNode.getAttribute("data-lane");
        if (!id) return;
        sel = (sel === id) ? null : id;
        paintLanes();
      });
    }

    // ---- panel 3 --------------------------------------------------------
    var defBody = root.querySelector("#pr-def-body");
    if (defBody) {
      var tbl = deficitTable(T);
      var ph = 2, lead = clamp(-2, -tbl.span, tbl.span);
      var phIn = root.querySelector("#pr-ph"), leadIn = root.querySelector("#pr-lead");
      if (leadIn) leadIn.value = String(lead);
      var paintDef = function () {
        defBody.innerHTML = deficitSentence(tbl, ph, lead) +
          '<div style="margin-top:14px">' + drawDeficitGrid(tbl, ph, lead) + "</div>";
      };
      paintDef();
      if (phIn) phIn.addEventListener("input", function () {
        ph = clamp(parseInt(phIn.value, 10) || 0, 0, PHASES - 1); paintDef();
      });
      if (leadIn) leadIn.addEventListener("input", function () {
        lead = clamp(parseInt(leadIn.value, 10) || 0, -tbl.span, tbl.span); paintDef();
      });
      defBody.addEventListener("click", function (e) {
        var t = e.target;
        while (t && t !== defBody && !(t.getAttribute && t.getAttribute("data-ph"))) t = t.parentNode;
        if (!t || t === defBody || !t.getAttribute) return;
        ph = parseInt(t.getAttribute("data-ph"), 10);
        lead = parseInt(t.getAttribute("data-lead"), 10);
        if (phIn) phIn.value = String(ph);
        if (leadIn) leadIn.value = String(lead);
        paintDef();
      });
    }

    // ---- panel 4 --------------------------------------------------------
    var clockBody = root.querySelector("#pr-clock-body");
    if (clockBody) {
      var kb = S.kill_time_histogram, fbh = S.first_blood_histogram;
      var ktot = histTotal(kb), ftot = histTotal(fbh);
      var tmax = Math.round(kb[kb.length - 1].hi);
      var cin = root.querySelector("#pr-clock");
      var paintClock = function () {
        var t = cin ? clamp(parseInt(cin.value, 10) || 0, 0, tmax) : 150;
        clockBody.innerHTML = drawClock(kb, ktot, (ftot ? fbh : null), ftot, t, tmax);
      };
      paintClock();
      if (cin) cin.addEventListener("input", paintClock);
    }

    // ---- panel 5 --------------------------------------------------------
    var durBody = root.querySelector("#pr-dur-body");
    if (durBody) {
      var wt = "all", binW = 45;
      var paintDur = function () { durBody.innerHTML = drawDurations(durations(T, wt), binW); };
      paintDur();
      var dseg = root.querySelector("#pr-dur-seg");
      if (dseg) {
        dseg.addEventListener("click", function (e) {
          var b = e.target.closest ? e.target.closest("button[data-wt]") : null;
          if (!b) return;
          wt = b.getAttribute("data-wt");
          var btns = dseg.querySelectorAll("button");
          for (var q = 0; q < btns.length; q++) btns[q].className = btns[q] === b ? "pr-on" : "";
          paintDur();
        });
      }
      var binSel = root.querySelector("#pr-dur-bin");
      if (binSel) {
        binSel.addEventListener("change", function () {
          binW = parseInt(binSel.value, 10) || 45; paintDur();
        });
      }
    }
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "pressure",
    title: "Pressure",
    blurb: "Leads, collapses and comebacks: how a match swings from start to finish.",
    accent: "#c0392b",
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

/* TYR suite: "Endgame" -- how matches finish.
 *
 * Everything here is about the last part of a match and the shape of its
 * conclusion. Not the arc over time (the Pressure suite owns that), not tank
 * stat sheets (Arsenal owns those). Endings.
 *
 * Two tiers of evidence, and they are NOT interchangeable:
 *
 *   1. FULL ARCHIVE. Every match carries a complete scoreboard: tank, kills,
 *      damage, assist, blocked for all sixteen players, plus the win type,
 *      the winning side and both teams' final health pools. Nothing is null
 *      in those columns, so panels built on them use every match.
 *
 *   2. DEATH TIMING. survival_sec is the exact second a player's health hit
 *      zero. It is missing for about 9% of player rows, almost all of them on
 *      the winning side. A death ORDER can only be reconstructed when every
 *      player in the match has one, which is a much smaller, self-selected
 *      subset. Panels that need it say so and print their own sample size.
 *
 * The two score columns are the teams' final health pools, verified against
 * the per-match teamHealth block in site/matches/<id>.json. They are absolute
 * hit points, not a share of anything: a team's starting pool depends on which
 * tanks it fielded, so the raw number is only loosely comparable across
 * matches. The build script's own percentage version of that figure lives in
 * stats.json and is quoted where it belongs.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var CSS = "" +
    ".eg-wrap .avg-panel{overflow:hidden}" +
    ".eg-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:2px 0 14px}" +
    ".eg-lab{font-size:.68rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em}" +
    ".eg-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-wrap:wrap}" +
    ".eg-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.8rem;padding:6px 13px;cursor:pointer}" +
    ".eg-seg button+button{border-left:1px solid var(--border)}" +
    ".eg-seg button.eg-on{background:rgba(138,68,68,.30);color:var(--text)}" +
    ".eg-chip{display:inline-flex;align-items:center;gap:7px;background:var(--panel2);border:1px solid var(--border);border-radius:20px;color:var(--text);font:inherit;font-size:.78rem;padding:5px 13px;cursor:pointer}" +
    ".eg-chip i{width:11px;height:11px;border-radius:3px;display:inline-block}" +
    ".eg-chip.eg-off{opacity:.34}" +
    ".eg-range{width:230px;max-width:44vw;accent-color:#8a4444;vertical-align:middle}" +
    ".eg-read{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:13px;padding-top:12px;border-top:1px solid var(--border)}" +
    ".eg-read .eg-k{font-size:.64rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}" +
    ".eg-read .eg-v{font-size:1.16rem;font-weight:700;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".eg-say{margin:13px 0 0;font-size:.94rem;line-height:1.68}" +
    ".eg-say b{color:#e39a8e;font-variant-numeric:tabular-nums}" +
    ".eg-note-in{margin-top:11px;padding:10px 13px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;font-size:.85rem;line-height:1.7;min-height:1.7em}" +
    ".eg-note-in .eg-dim{color:var(--dim)}" +
    ".eg-scroll{overflow-x:auto}" +
    ".eg-svg{width:100%;height:auto;display:block}" +
    ".eg-hit{cursor:pointer}" +
    ".eg-two{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px}" +
    ".eg-col{flex:1 1 260px;border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--panel2)}" +
    ".eg-col h3{margin:0 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;font-weight:700}" +
    ".eg-col dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:5px 14px;font-size:.86rem}" +
    ".eg-col dt{color:var(--dim)}" +
    ".eg-col dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}" +
    ".eg-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.75rem;color:var(--dim);margin:0 0 9px}" +
    ".eg-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}";

  // ------------------------------------------------------------------ paint
  var ELIM = "#8a4444";      // the losing team was wiped out
  var CAP  = "#436f83";      // the objective ended it with both sides alive
  var UNK  = "#8c6739";      // the decoder could not confirm an ending
  var WINC = "#4e8c5a";
  var LOSEC = "#b8483c";
  var GRIDL = "rgba(255,255,255,0.08)";

  var WT_NAME = { elimination: "Elimination", capture: "Capture", unresolved: "Unresolved" };
  var WT_COLOR = { elimination: ELIM, capture: CAP, unresolved: UNK };
  var WT_ORDER = ["elimination", "capture", "unresolved"];

  // ---------------------------------------------------------------- helpers
  function n2(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function sortNum(a, b) { return a - b; }
  function pctStr(v) { return v == null ? "-" : (Math.round(v * 10) / 10) + "%"; }
  function mmss(sec) {
    if (sec == null || !isFinite(sec)) return "-";
    var s = Math.round(sec), m = Math.floor(s / 60), r = s - m * 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function quant(sorted, q) {
    if (!sorted.length) return null;
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function medOf(list) {
    var s = list.slice().sort(sortNum);
    return quant(s, 0.5);
  }
  function maxOf(list, floor) {
    var m = floor || 0;
    for (var i = 0; i < list.length; i++) if (list[i] > m) m = list[i];
    return m;
  }
  function txt(x, y, s, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || "chart-axis-label") +
      '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + s + "</text>";
  }
  // A two-stop ramp through a neutral middle. Used for the win-probability
  // grid, where the middle is a genuine coin flip and deserves to look like
  // nothing rather than like a weak version of one side.
  function heat(p) {
    var f = clamp(p, 0, 100) / 100;
    var a = [158, 62, 54], b = [44, 52, 82], c = [74, 146, 92];
    var lo = f < 0.5 ? a : b, hi = f < 0.5 ? b : c;
    var t = f < 0.5 ? f * 2 : (f - 0.5) * 2;
    var out = [];
    for (var i = 0; i < 3; i++) out.push(Math.round(lo[i] + (hi[i] - lo[i]) * t));
    return "rgb(" + out.join(",") + ")";
  }

  // ------------------------------------------------------ archive (cached)
  //
  // One pass over T.DATA.matches. Everything downstream reads this.
  var _built = null;
  function build(T) {
    if (_built) return _built;
    var src = (T && T.DATA && T.DATA.matches) || [];
    var rows = [], i, j;
    for (i = 0; i < src.length; i++) {
      var m = src[i], ps = m.players || [];
      if (ps.length < 10) continue;
      var dur = n2(m.duration_sec);
      if (dur !== null && dur <= 0) dur = null;
      var w = (m.winning_team === 0 || m.winning_team === 1) ? m.winning_team : null;
      var sa = n2(m.score_ally) || 0, se = n2(m.score_enemy) || 0;
      var allyWon = m.result === "VICTORY";
      var wt = (m.win_type === "elimination" || m.win_type === "capture")
        ? m.win_type : "unresolved";
      var rec = {
        id: m.match_id, map: m.map || "", dur: dur, wt: wt, win: w,
        hi: Math.max(sa, se), lo: Math.min(sa, se),
        winScore: w === null ? null : (allyWon ? sa : se),
        loseScore: w === null ? null : (allyWon ? se : sa),
        kills: 0, dmg: 0,
        winKills: 0, loseKills: 0, winDmg: 0, loseDmg: 0,
        winSurv: 0, loseSurv: 0, survKnown: true,
        roster: [0, 0], deaths: null, complete: false
      };
      var deaths = [], anyNull = false;
      for (j = 0; j < ps.length; j++) {
        var p = ps[j], tm = p.team;
        if (tm !== 0 && tm !== 1) { anyNull = true; continue; }
        rec.roster[tm]++;
        var k = n2(p.kills) || 0, dg = n2(p.dmg) || 0;
        rec.kills += k; rec.dmg += dg;
        if (w !== null) {
          if (tm === w) { rec.winKills += k; rec.winDmg += dg; }
          else { rec.loseKills += k; rec.loseDmg += dg; }
        }
        var pc = n2(p.survival_pct), sv = n2(p.survival_sec);
        if (pc === null || sv === null) { anyNull = true; rec.survKnown = false; }
        else {
          if (pc >= 100) {
            if (w !== null) { if (tm === w) rec.winSurv++; else rec.loseSurv++; }
          }
          if (dur !== null && sv < dur - 0.05) deaths.push([sv, tm]);
        }
      }
      if (w !== null) rec.killGap = rec.winKills - rec.loseKills;
      if (!anyNull && dur !== null && rec.roster[0] > 0 && rec.roster[1] > 0) {
        deaths.sort(function (a, b) { return a[0] - b[0]; });
        rec.deaths = deaths;
        rec.complete = true;
      }
      rows.push(rec);
    }
    var counts = { elimination: 0, capture: 0, unresolved: 0 };
    var decided = 0, complete = 0, compDur = [], allDur = [];
    for (i = 0; i < rows.length; i++) {
      counts[rows[i].wt]++;
      if (rows[i].win !== null) decided++;
      if (rows[i].dur !== null) allDur.push(rows[i].dur);
      if (rows[i].complete && rows[i].win !== null) { complete++; compDur.push(rows[i].dur); }
    }
    _built = {
      rows: rows, counts: counts, decided: decided, complete: complete,
      medDur: medOf(allDur), medCompDur: medOf(compDur)
    };
    return _built;
  }

  // Win probability indexed by the roster state, not by the clock: given a
  // team has N tanks alive against M, how often did that team go
  // on to win? Every state a match passes through is counted once for each
  // side, so the grid is exactly antisymmetric and the diagonal reads 50% by
  // construction rather than as a finding.
  var _grid = null;
  function stateGrid(T) {
    if (_grid) return _grid;
    var rows = build(T).rows, cells = {}, n = 0, maxAlive = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.win === null || !r.complete) continue;
      n++;
      var alive = [r.roster[0], r.roster[1]];
      if (alive[0] > maxAlive) maxAlive = alive[0];
      if (alive[1] > maxAlive) maxAlive = alive[1];
      var states = [[alive[0], alive[1]]], d;
      for (d = 0; d < r.deaths.length; d++) {
        alive[r.deaths[d][1]] = Math.max(0, alive[r.deaths[d][1]] - 1);
        states.push([alive[0], alive[1]]);
      }
      var seen = {};
      for (var s = 0; s < states.length; s++) {
        for (var t = 0; t < 2; t++) {
          var mine = states[s][t], theirs = states[s][1 - t];
          var sk = mine + "|" + theirs + "|" + t;
          if (seen[sk]) continue;
          seen[sk] = 1;
          var ck = mine + "|" + theirs;
          if (!cells[ck]) cells[ck] = { mine: mine, theirs: theirs, n: 0, w: 0 };
          cells[ck].n++;
          if (t === r.win) cells[ck].w++;
        }
      }
    }
    _grid = { cells: cells, matches: n, size: maxAlive };
    return _grid;
  }

  // Which side the k-th death from the END of the match fell on. Needs a full
  // death order, so this runs on the complete subset only.
  var _close = null;
  function closing(T) {
    if (_close) return _close;
    var rows = build(T).rows, out = { all: [], elimination: [], capture: [] };
    var DEPTH = 10, i, k, key;
    var keys = ["all", "elimination", "capture"];
    for (i = 0; i < keys.length; i++) {
      out[keys[i]] = [];
      for (k = 0; k < DEPTH; k++) out[keys[i]].push({ win: 0, lose: 0 });
    }
    var used = { all: 0, elimination: 0, capture: 0 };
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.win === null || !r.complete || !r.deaths.length) continue;
      var buckets = ["all"];
      if (r.wt === "elimination" || r.wt === "capture") buckets.push(r.wt);
      for (var b = 0; b < buckets.length; b++) {
        key = buckets[b];
        used[key]++;
        for (k = 0; k < DEPTH && k < r.deaths.length; k++) {
          var ev = r.deaths[r.deaths.length - 1 - k];
          if (ev[1] === r.win) out[key][k].win++; else out[key][k].lose++;
        }
      }
    }
    _close = { depth: DEPTH, series: out, used: used };
    return _close;
  }

  // Who was the best player on each side, by each of the four scoreboard
  // columns. Complete for every match: none of these columns is ever null.
  var _best = null;
  var BEST_KEYS = ["dmg", "kills", "assist", "blocked"];
  var BEST_NAME = { dmg: "Damage", kills: "Kills", assist: "Assist damage", blocked: "Damage blocked" };
  function bestOf(T) {
    if (_best) return _best;
    var src = (T && T.DATA && T.DATA.matches) || [];
    var acc = {};
    for (var q = 0; q < BEST_KEYS.length; q++) {
      acc[BEST_KEYS[q]] = {
        n: 0, topOnLoser: 0, winVals: [], loseVals: [],
        tank: {}   // tank -> {winN, winTop, loseN, loseTop}
      };
    }
    for (var i = 0; i < src.length; i++) {
      var m = src[i], ps = m.players || [];
      var w = (m.winning_team === 0 || m.winning_team === 1) ? m.winning_team : null;
      if (w === null || ps.length < 10) continue;
      for (var q2 = 0; q2 < BEST_KEYS.length; q2++) {
        var kk = BEST_KEYS[q2], A = acc[kk];
        var bestW = null, bestL = null;
        for (var j = 0; j < ps.length; j++) {
          var p = ps[j];
          if (p.team !== 0 && p.team !== 1) continue;
          var v = n2(p[kk]) || 0;
          if (p.team === w) { if (!bestW || v > bestW.v) bestW = { v: v, p: p }; }
          else if (!bestL || v > bestL.v) bestL = { v: v, p: p };
        }
        if (!bestW || !bestL) continue;
        A.n++;
        A.winVals.push(bestW.v);
        A.loseVals.push(bestL.v);
        if (bestL.v > bestW.v) A.topOnLoser++;
        for (var j2 = 0; j2 < ps.length; j2++) {
          var p2 = ps[j2];
          if ((p2.team !== 0 && p2.team !== 1) || !p2.tank) continue;
          if (!A.tank[p2.tank]) A.tank[p2.tank] = { winN: 0, winTop: 0, loseN: 0, loseTop: 0 };
          var rec = A.tank[p2.tank];
          if (p2.team === w) { rec.winN++; if (p2 === bestW.p) rec.winTop++; }
          else { rec.loseN++; if (p2 === bestL.p) rec.loseTop++; }
        }
      }
    }
    _best = acc;
    return _best;
  }

  // =========================================================== panel 1
  // The two final health pools against each other. This is the panel that
  // shows what "unresolved" actually looks like rather than just counting it.
  function scatterPoints(T) {
    var rows = build(T).rows, out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var x = r.win === null ? r.hi : r.winScore;
      var y = r.win === null ? r.lo : r.loseScore;
      if (x == null || y == null) continue;
      out.push({ x: x, y: y, wt: r.wt, id: r.id, map: r.map, dur: r.dur, kills: r.kills });
    }
    return out;
  }

  function scatterSvg(T, on) {
    var pts = scatterPoints(T);
    if (pts.length < 10) return "";
    var W = 1000, H = 520, padL = 74, padB = 46, padT = 16, padR = 18;
    var mx = 1000;
    for (var i = 0; i < pts.length; i++) if (pts[i].x > mx) mx = pts[i].x;
    mx = Math.ceil(mx / 2000) * 2000;
    function xAt(v) { return padL + (v / mx) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mx) * (H - padB - padT); }
    var g = "", t;
    for (t = 0; t <= 7; t++) {
      var v = mx * t / 7;
      g += '<line x1="' + xAt(v).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(v).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        '<line x1="' + padL + '" y1="' + yAt(v).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(v).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(v).toFixed(1), H - padB + 16, T.fmtNum(Math.round(v)), null, "middle") +
        txt(padL - 8, yAt(v) + 4, T.fmtNum(Math.round(v)), null, "end");
    }
    g += '<line x1="' + xAt(0) + '" y1="' + yAt(0) + '" x2="' + xAt(mx) + '" y2="' + yAt(mx) +
      '" stroke="rgba(255,255,255,0.22)" stroke-dasharray="5 5"></line>' +
      txt(xAt(mx * 0.72), yAt(mx * 0.72) - 9, "both teams equally battered", null, "middle");
    g += txt(W / 2, H - 6, "winner&#39;s health pool at the end", null, "middle");
    g += '<text transform="translate(15,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">losing side&#39;s pool</text>';

    var body = "";
    for (i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (on && on[p.wt] === false) continue;
      body += '<circle class="eg-hit" data-eg-pt="' + i + '" cx="' + xAt(p.x).toFixed(1) +
        '" cy="' + yAt(p.y).toFixed(1) + '" r="4" fill="' + WT_COLOR[p.wt] +
        '" fill-opacity="0.72" stroke="rgba(10,14,31,0.7)" stroke-width="0.7"><title>' +
        T.esc(p.map + " " + mmss(p.dur) + ", " + WT_NAME[p.wt].toLowerCase() +
              ", pools " + p.x + " / " + p.y + ", " + p.kills + " kills") + "</title></circle>";
    }
    return '<svg class="eg-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + g + body + "</svg>";
  }

  function panelLedger(T) {
    var B = build(T);
    var pts = scatterPoints(T);
    if (pts.length < 10) return "";
    var rows = B.rows, unresolved = [], capUpset = 0, capN = 0, i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].wt === "unresolved") unresolved.push(rows[i]);
      if (rows[i].wt === "capture" && rows[i].win !== null) {
        capN++;
        if (rows[i].winScore < rows[i].loseScore) capUpset++;
      }
    }
    var uDur = [], uKills = [], eDur = [];
    for (i = 0; i < rows.length; i++) {
      if (rows[i].wt === "unresolved") {
        if (rows[i].dur !== null) uDur.push(rows[i].dur);
        uKills.push(rows[i].kills);
      } else if (rows[i].dur !== null) eDur.push(rows[i].dur);
    }
    var chips = "";
    for (i = 0; i < WT_ORDER.length; i++) {
      var k = WT_ORDER[i];
      chips += '<button type="button" class="eg-chip" data-eg-wt="' + k + '">' +
        '<i style="background:' + WT_COLOR[k] + '"></i>' + WT_NAME[k] + " (" +
        T.fmtNum(B.counts[k]) + ")</button>";
    }
    var cards =
      T.card("Matches", T.fmtNum(rows.length)) +
      T.card("Ended by elimination", T.fmtNum(B.counts.elimination)) +
      T.card("Ended by capture", T.fmtNum(B.counts.capture)) +
      T.card("Ending not readable", T.fmtNum(B.counts.unresolved)) +
      T.card("Median length", mmss(B.medDur));

    var body =
      '<div class="stat-grid" style="margin-bottom:14px">' + cards + "</div>" +
      '<div class="eg-ctl">' + chips + "</div>" +
      '<div class="eg-scroll" id="eg-scatter"></div>' +
      '<div class="eg-note-in" id="eg-scatter-read"><span class="eg-dim">' +
      "Click any point for that match." + "</span></div>";

    var note =
      "One dot per match: each team&#39;s health pool when the recording ended. These are hit " +
      "points, not shares, and they do not compare across matches. " + B.counts.unresolved +
      " matches never showed an ending signal.";
    return T.bigPanel("How a match stops", body, note);
  }

  function capturePools(T) {
    var rows = build(T).rows, out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].wt === "capture" && rows[i].win !== null) out.push(rows[i].loseScore);
    }
    return out;
  }

  // =========================================================== panel 2
  // Elimination and capture, side by side, on one axis at a time.
  var METRICS = [
    { key: "dur", name: "Match length", unit: "time", needWin: false },
    { key: "kills", name: "Kills in the match", unit: "num", needWin: false },
    { key: "dmg", name: "Damage dealt", unit: "num", needWin: false },
    { key: "winhp", name: "Winner&#39;s health left", unit: "num", needWin: false },
    { key: "losehp", name: "Loser&#39;s health left", unit: "num", needWin: false },
    { key: "gap", name: "Winner&#39;s kill lead", unit: "num", needWin: true },
    { key: "share", name: "Winner&#39;s share of the damage", unit: "pct", needWin: true }
  ];
  function metricAt(r, key) {
    if (key === "dur") return r.dur;
    if (key === "kills") return r.kills;
    if (key === "dmg") return r.dmg;
    if (key === "winhp") return r.win === null ? r.hi : r.winScore;
    if (key === "losehp") return r.win === null ? r.lo : r.loseScore;
    if (key === "gap") return r.win === null ? null : r.killGap;
    if (key === "share") {
      if (r.win === null) return null;
      var tot = r.winDmg + r.loseDmg;
      return tot > 0 ? 100 * r.winDmg / tot : null;
    }
    return null;
  }
  function metricFmt(T, key, v) {
    if (v == null) return "-";
    for (var i = 0; i < METRICS.length; i++) {
      if (METRICS[i].key !== key) continue;
      if (METRICS[i].unit === "time") return mmss(v);
      if (METRICS[i].unit === "pct") return pctStr(v);
      return T.fmtNum(Math.round(v * 10) / 10);
    }
    return String(v);
  }

  function stripSvg(T, key) {
    var rows = build(T).rows, groups = [], i, g;
    var spec = null;
    for (i = 0; i < METRICS.length; i++) if (METRICS[i].key === key) spec = METRICS[i];
    if (!spec) return "";
    var order = spec.needWin ? ["elimination", "capture"] : WT_ORDER;
    var all = [];
    for (g = 0; g < order.length; g++) {
      var vals = [];
      for (i = 0; i < rows.length; i++) {
        if (rows[i].wt !== order[g]) continue;
        var v = metricAt(rows[i], key);
        if (v == null) continue;
        vals.push(v);
        all.push(v);
      }
      vals.sort(sortNum);
      if (vals.length) groups.push({ wt: order[g], vals: vals });
    }
    if (!groups.length || all.length < 10) return "";
    var lo = 0, hiV = maxOf(all, 1);
    var minAll = all[0];
    for (i = 0; i < all.length; i++) if (all[i] < minAll) minAll = all[i];
    if (minAll < 0) lo = minAll;
    // A share is drawn against the whole 0 to 100 range it could occupy, so a
    // cluster that sits between 40 and 80 looks like a cluster and not like
    // the entire span of the possible.
    if (spec.unit === "pct") { lo = 0; hiV = 100; }
    var span = hiV - lo || 1;
    var W = 1000, labelW = 118, padR = 132, laneH = 74, top = 26;
    var H = top + groups.length * laneH + 26;
    function xAt(v) { return labelW + ((v - lo) / span) * (W - labelW - padR); }
    var out = "", t;
    for (t = 0; t <= 6; t++) {
      var gv = lo + span * t / 6;
      out += '<line x1="' + xAt(gv).toFixed(1) + '" y1="' + (top - 12) + '" x2="' + xAt(gv).toFixed(1) +
        '" y2="' + (H - 24) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(gv).toFixed(1), H - 8, T.esc(metricFmt(T, key, gv)), null, "middle");
    }
    for (g = 0; g < groups.length; g++) {
      var grp = groups[g], col = WT_COLOR[grp.wt];
      var y0 = top + g * laneH, mid = y0 + laneH / 2 - 6;
      var p10 = quant(grp.vals, 0.1), p25 = quant(grp.vals, 0.25);
      var p50 = quant(grp.vals, 0.5), p75 = quant(grp.vals, 0.75), p90 = quant(grp.vals, 0.9);
      out += txt(labelW - 10, mid - 4, T.esc(WT_NAME[grp.wt]), null, "end") +
        txt(labelW - 10, mid + 11, T.fmtNum(grp.vals.length) + " matches", null, "end");
      for (i = 0; i < grp.vals.length; i++) {
        out += '<line x1="' + xAt(grp.vals[i]).toFixed(1) + '" y1="' + (mid - 20) +
          '" x2="' + xAt(grp.vals[i]).toFixed(1) + '" y2="' + (mid + 20) +
          '" stroke="' + col + '" stroke-opacity="0.30" stroke-width="1.6"></line>';
      }
      out += '<line x1="' + xAt(p10).toFixed(1) + '" y1="' + mid + '" x2="' + xAt(p90).toFixed(1) +
        '" y2="' + mid + '" stroke="' + col + '" stroke-width="2"></line>' +
        '<rect x="' + xAt(p25).toFixed(1) + '" y="' + (mid - 13) + '" width="' +
        Math.max(2, xAt(p75) - xAt(p25)).toFixed(1) + '" height="26" rx="4" fill="' + col +
        '" fill-opacity="0.42" stroke="' + col + '" stroke-opacity="0.9"></rect>' +
        '<line x1="' + xAt(p50).toFixed(1) + '" y1="' + (mid - 16) + '" x2="' + xAt(p50).toFixed(1) +
        '" y2="' + (mid + 16) + '" stroke="#ffffff" stroke-opacity="0.9" stroke-width="2.5"></line>' +
        txt(W - padR + 10, mid + 5, T.esc(metricFmt(T, key, p50)), null, null);
    }
    out += txt(W - padR + 10, top - 14, "median", null, null);
    return '<svg class="eg-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelTwoGames(T) {
    var B = build(T);
    if (!B.rows.length) return "";
    var segs = "";
    for (var i = 0; i < METRICS.length; i++) {
      segs += '<button type="button" data-eg-metric="' + METRICS[i].key + '"' +
        (i === 0 ? ' class="eg-on"' : "") + ">" + METRICS[i].name + "</button>";
    }
    // Loser survivor split: the sharpest single contrast between the two
    // endings, and it needs no timing, only survival_pct on the losing side.
    var lsurv = { elimination: [0, 0, 0, 0, 0], capture: [0, 0, 0, 0, 0] };
    var lsN = { elimination: 0, capture: 0 };
    for (i = 0; i < B.rows.length; i++) {
      var r = B.rows[i];
      if (r.win === null || (r.wt !== "elimination" && r.wt !== "capture")) continue;
      var c = clamp(r.loseSurv, 0, 4);
      lsurv[r.wt][c]++; lsN[r.wt]++;
    }
    var aliveRows = [];
    var keys2 = ["elimination", "capture"];
    for (i = 0; i < keys2.length; i++) {
      var kk = keys2[i], parts = [], tot = lsN[kk] || 1;
      var shades = ["rgba(184,72,60,0.90)", "rgba(150,110,70,0.85)", "rgba(105,130,95,0.85)",
                    "rgba(78,140,90,0.85)", "rgba(110,170,120,0.85)"];
      for (var b = 0; b < 5; b++) {
        parts.push({ name: b === 4 ? "4 or more alive" : (b + " alive"), n: lsurv[kk][b], color: shades[b] });
      }
      aliveRows.push({ label: WT_NAME[kk] + " (" + tot + ")", parts: parts });
    }
    var wiped = lsN.elimination ? 100 * lsurv.elimination[0] / lsN.elimination : 0;
    var capAlive = lsN.capture ? 100 * (lsN.capture - lsurv.capture[0]) / lsN.capture : 0;

    var body =
      '<div class="eg-ctl"><span class="eg-lab">Axis</span>' +
      '<span class="eg-seg" id="eg-metric">' + segs + "</span></div>" +
      '<div class="eg-scroll" id="eg-strip"></div>' +
      '<div class="eg-note-in" id="eg-strip-read"></div>' +
      '<h3 style="margin:20px 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;color:var(--dim)">' +
      "Tanks the losing team still had standing</h3>" +
      T.svgStackedBar(aliveRows, { width: 1000, labelWidth: 150, rowHeight: 30 });

    var note =
      "Each tick is one match. Box is the middle half, white line the median. " +
      "<b>Elimination wipes the loser " + pctStr(wiped) + " of the time</b>; capture leaves " +
      pctStr(capAlive) + " with a tank alive. Survivor counts are missing from " +
      missingLoserRows(T) + " of " + T.fmtNum(B.decided) + " decided matches and can only " +
      "undercount.";
    return T.bigPanel("Elimination and capture are different games", body, note);
  }

  function missingLoserRows(T) {
    var src = (T && T.DATA && T.DATA.matches) || [], n = 0;
    for (var i = 0; i < src.length; i++) {
      var m = src[i], w = m.winning_team;
      if (w !== 0 && w !== 1) continue;
      var ps = m.players || [], bad = false;
      for (var j = 0; j < ps.length; j++) {
        if (ps[j].team === w || (ps[j].team !== 0 && ps[j].team !== 1)) continue;
        if (n2(ps[j].survival_pct) === null) { bad = true; break; }
      }
      if (bad) n++;
    }
    return n;
  }

  // =========================================================== panel 3
  function gridSvg(T, minN, sel) {
    var G = stateGrid(T);
    if (G.matches < 20) return "";
    var N = G.size, cw = 74, chh = 42, labelW = 118, top = 46;
    var W = labelW + (N + 1) * cw + 14, H = top + (N + 1) * chh + 30;
    var out = "", a, b;
    out += txt(labelW + ((N + 1) * cw) / 2, 16, "TANKS THE OTHER SIDE HAS ALIVE", null, "middle");
    for (b = 0; b <= N; b++) {
      out += txt(labelW + b * cw + cw / 2, top - 8, String(b), null, "middle");
    }
    out += '<text transform="translate(16,' + (top + ((N + 1) * chh) / 2) +
      ') rotate(-90)" text-anchor="middle" class="chart-axis-label">TANKS YOU HAVE ALIVE</text>';
    for (a = N; a >= 0; a--) {
      var ry = top + (N - a) * chh;
      out += txt(labelW - 12, ry + chh / 2 + 4, String(a), null, "end");
      for (b = 0; b <= N; b++) {
        var c = G.cells[a + "|" + b];
        var x = labelW + b * cw;
        if (!c || !c.n) {
          out += '<rect x="' + x + '" y="' + ry + '" width="' + (cw - 3) + '" height="' + (chh - 3) +
            '" rx="4" fill="rgba(255,255,255,0.03)"></rect>';
          continue;
        }
        var p = 100 * c.w / c.n, thin = c.n < minN;
        var isSel = sel && sel === (a + "|" + b);
        out += '<rect class="eg-hit" data-eg-cell="' + a + "|" + b + '" x="' + x + '" y="' + ry +
          '" width="' + (cw - 3) + '" height="' + (chh - 3) + '" rx="4" fill="' + heat(p) +
          '" fill-opacity="' + (thin ? "0.20" : "1") + '" stroke="' +
          (isSel ? "rgba(255,255,255,0.85)" : "rgba(10,14,31,0.5)") + '" stroke-width="' +
          (isSel ? "2" : "1") + '"><title>' + T.esc(a + " against " + b + ": won " +
          pctStr(p) + " of " + c.n + " states") + "</title></rect>";
        if (!thin) {
          out += '<text x="' + (x + (cw - 3) / 2) + '" y="' + (ry + 17) +
            '" text-anchor="middle" font-size="12" font-weight="700" fill="#eef1ff" ' +
            'pointer-events="none">' + Math.round(p) + "%</text>" +
            '<text x="' + (x + (cw - 3) / 2) + '" y="' + (ry + 30) +
            '" text-anchor="middle" font-size="9" fill="rgba(230,234,255,0.62)" ' +
            'pointer-events="none">n=' + c.n + "</text>";
        }
      }
    }
    return '<svg class="eg-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelLastStand(T) {
    var B = build(T), G = stateGrid(T);
    if (G.matches < 20) return "";
    var c42 = G.cells["4|2"], c86 = G.cells["8|6"], c21 = G.cells["2|1"], c31 = G.cells["3|1"];
    var say = "";
    if (c42 && c86 && c42.n >= 20 && c86.n >= 20) {
      say = '<p class="eg-say">A two tank lead at four against two wins <b>' +
        pctStr(100 * c42.w / c42.n) + "</b> (" + c42.n + " states); at eight against six, <b>" +
        pctStr(100 * c86.w / c86.n) + "</b> (" + c86.n + ").</p>";
    }
    var body =
      '<div class="eg-ctl">' +
      '<span class="eg-lab">Hide cells under</span>' +
      '<input type="range" class="eg-range" id="eg-grid-min" min="1" max="40" step="1" value="10">' +
      '<span class="eg-lab" id="eg-grid-min-out"></span>' +
      "</div>" +
      '<div class="eg-key"><i style="background:' + heat(4) + '"></i>loses' +
      '<i style="background:' + heat(50) + ';margin-left:14px"></i>coin flip' +
      '<i style="background:' + heat(96) + ';margin-left:14px"></i>wins</div>' +
      '<div class="eg-scroll" id="eg-grid"></div>' +
      '<div class="eg-note-in" id="eg-grid-read"><span class="eg-dim">Click a cell for its ' +
      "numbers." + "</span></div>" + say;

    var note =
      "Rows are your tanks alive, columns theirs. Built from the <b>" + T.fmtNum(G.matches) +
      " matches</b> with a complete death order, out of " + T.fmtNum(B.decided) + " decided. " +
      "That subset skews long: median " + mmss(B.medCompDur) + " against " + mmss(B.medDur) +
      ". The diagonal is 50% by construction. n counts states reached, not matches.";
    return T.bigPanel("Last stand: what the roster is worth", body, note);
  }

  // =========================================================== panel 4
  function closingSvg(T, key, window) {
    var C = closing(T), ser = C.series[key];
    if (!ser) return "";
    var W = 1000, H = 320, padL = 62, padB = 52, padT = 22;
    var barW = (W - padL - 24) / C.depth;
    var out = "";
    for (var t = 0; t <= 4; t++) {
      var y = padT + (H - padT - padB) * t / 4;
      var v = 100 - 25 * t;
      out += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - 24) + '" y2="' +
        y.toFixed(1) + '" stroke="' + (v === 50 ? "rgba(255,255,255,0.30)" : GRIDL) +
        '"' + (v === 50 ? ' stroke-dasharray="5 4"' : "") + "></line>" +
        txt(padL - 8, y + 4, v + "%", null, "end");
    }
    for (var k = 0; k < C.depth; k++) {
      var cell = ser[k], tot = cell.win + cell.lose;
      var x = padL + k * barW;
      var inWin = k < window;
      if (!tot) continue;
      var share = 100 * cell.lose / tot;
      var hgt = (H - padT - padB) * share / 100;
      var yb = H - padB - hgt;
      out += '<rect x="' + (x + 6).toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' +
        (barW - 12).toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="3" fill="' + LOSEC +
        '" fill-opacity="' + (inWin ? "0.95" : "0.34") + '"><title>' +
        T.esc((k + 1) + " from the end: " + cell.lose + " of " + tot + " on the loser") +
        "</title></rect>" +
        txt(x + barW / 2, yb - 6, pctStr(share), null, "middle") +
        txt(x + barW / 2, H - padB + 17, k === 0 ? "last" : "-" + (k + 1), null, "middle") +
        txt(x + barW / 2, H - padB + 31, "n=" + tot, null, "middle");
    }
    out += txt(W / 2, H - 6, "deaths back from the end", null, "middle");
    return '<svg class="eg-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelClosing(T) {
    var C = closing(T);
    if (C.used.all < 20) return "";
    var segs = "";
    var opts = [["all", "All endings"], ["elimination", "Elimination"], ["capture", "Capture"]];
    for (var i = 0; i < opts.length; i++) {
      if (!C.used[opts[i][0]]) continue;
      segs += '<button type="button" data-eg-close="' + opts[i][0] + '"' +
        (i === 0 ? ' class="eg-on"' : "") + ">" + opts[i][1] + " (" + C.used[opts[i][0]] + ")</button>";
    }
    var body =
      '<div class="eg-ctl">' +
      '<span class="eg-seg" id="eg-close-seg">' + segs + "</span>" +
      '<span class="eg-lab">Closing window</span>' +
      '<input type="range" class="eg-range" id="eg-close-win" min="1" max="' + C.depth +
      '" step="1" value="3">' +
      '<span class="eg-lab" id="eg-close-out"></span>' +
      "</div>" +
      '<div class="eg-scroll" id="eg-close"></div>' +
      '<div class="eg-note-in" id="eg-close-read"></div>';

    var note =
      "Deaths counted back from the last one. The bar is the share that fell on the losing " +
      "team. Same " + C.used.all + "-match subset as the grid above. The capture slice is " +
      C.used.capture + " matches. Too few to read closely.";
    return T.bigPanel("The closing sequence", body, note);
  }

  // =========================================================== panel 5
  function gapHist(T) {
    var rows = build(T).rows, h = {}, lo = 0, hi = 0, n = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.win === null) continue;
      var g = r.killGap;
      h[g] = (h[g] || 0) + 1;
      if (g < lo) lo = g;
      if (g > hi) hi = g;
      n++;
    }
    return { h: h, lo: lo, hi: hi, n: n };
  }

  function gapSvg(T, thr) {
    var G = gapHist(T);
    if (G.n < 30) return "";
    var W = 1000, H = 300, padL = 56, padB = 50, padT = 20;
    var span = G.hi - G.lo + 1;
    var barW = (W - padL - 26) / span;
    var mx = 1;
    for (var g = G.lo; g <= G.hi; g++) if ((G.h[g] || 0) > mx) mx = G.h[g];
    var out = "", t;
    for (t = 0; t <= 4; t++) {
      var y = padT + (H - padT - padB) * t / 4;
      out += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - 26) + '" y2="' +
        y.toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(padL - 8, y + 4, String(Math.round(mx * (1 - t / 4))), null, "end");
    }
    for (g = G.lo; g <= G.hi; g++) {
      var c = G.h[g] || 0, x = padL + (g - G.lo) * barW;
      var hgt = (H - padT - padB) * c / mx;
      var blow = g >= thr;
      out += '<rect x="' + (x + 5).toFixed(1) + '" y="' + (H - padB - hgt).toFixed(1) +
        '" width="' + (barW - 10).toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="3" fill="' +
        (blow ? ELIM : "#436f83") + '" fill-opacity="0.92"><title>' +
        T.esc("won by " + g + " kills: " + c + " matches") + "</title></rect>" +
        txt(x + barW / 2, H - padB - hgt - 6, c ? String(c) : "", null, "middle") +
        txt(x + barW / 2, H - padB + 17, (g > 0 ? "+" : "") + g, null, "middle");
    }
    var tx = padL + (thr - G.lo) * barW;
    out += '<line x1="' + tx.toFixed(1) + '" y1="' + (padT - 8) + '" x2="' + tx.toFixed(1) +
      '" y2="' + (H - padB + 4) + '" stroke="#e5c07b" stroke-width="2" stroke-dasharray="6 4"></line>' +
      txt(tx + 6, padT - 1, "blowout from here", null, null);
    out += txt(W / 2, H - 6, "the winner&#39;s kill lead", null, "middle");
    return '<svg class="eg-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelBlowout(T) {
    var G = gapHist(T);
    if (G.n < 30) return "";
    var S = (T && T.STATS) || {};
    var body =
      '<div class="eg-ctl">' +
      '<span class="eg-lab">A blowout is a win by at least</span>' +
      '<input type="range" class="eg-range" id="eg-thr" min="' + Math.max(1, G.lo + 1) +
      '" max="' + G.hi + '" step="1" value="5">' +
      '<span class="eg-lab" id="eg-thr-out"></span>' +
      "</div>" +
      '<div class="eg-scroll" id="eg-gap"></div>' +
      '<div class="eg-two" id="eg-thr-cols"></div>';

    var note =
      "Winner&#39;s kills minus the loser&#39;s, over all " + T.fmtNum(G.n) + " decided matches. " +
      "The published figures draw the line at 60% of health instead: " +
      (n2(S.blowout_rate) !== null ? T.fmtPct(S.blowout_rate) : "unavailable") + " blowouts, " +
      "median winner on " +
      (n2(S.victory_margin_median) !== null ? T.fmtPct(S.victory_margin_median) : "-") +
      " of its pool.";
    return T.bigPanel("Blowout or grind, on your own threshold", body, note);
  }

  function gapAgree(T) {
    var rows = build(T).rows, ok = 0, n = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.win === null || !r.complete) continue;
      n++;
      var recon = r.roster[r.win] - r.loseKills;
      if (Math.abs(recon - r.winSurv) <= 1) ok++;
    }
    return n ? (ok + " of " + n) : "no matches";
  }

  function thrCols(T, thr) {
    var rows = build(T).rows;
    var sets = [{ key: "blow", label: "Blowout", col: ELIM, list: [] },
                { key: "grind", label: "Grind", col: "#436f83", list: [] }];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.win === null) continue;
      (r.killGap >= thr ? sets[0].list : sets[1].list).push(r);
    }
    var total = sets[0].list.length + sets[1].list.length;
    var out = "";
    for (var s = 0; s < sets.length; s++) {
      var L = sets[s].list, dur = [], dmg = [], hp = [], cap = 0, surv = [];
      for (i = 0; i < L.length; i++) {
        if (L[i].dur !== null) dur.push(L[i].dur);
        dmg.push(L[i].dmg);
        hp.push(L[i].winScore);
        if (L[i].wt === "capture") cap++;
        if (L[i].complete) surv.push(L[i].winSurv);
      }
      out += '<div class="eg-col" style="border-color:' + sets[s].col + '">' +
        "<h3 style=\"color:" + sets[s].col + '">' + sets[s].label + "</h3><dl>" +
        "<dt>Matches</dt><dd>" + T.fmtNum(L.length) + " (" +
        (total ? Math.round(100 * L.length / total) : 0) + "%)</dd>" +
        "<dt>Median length</dt><dd>" + mmss(medOf(dur)) + "</dd>" +
        "<dt>Median damage</dt><dd>" + T.fmtNum(Math.round(medOf(dmg) || 0)) + "</dd>" +
        "<dt>Median winner health</dt><dd>" + T.fmtNum(Math.round(medOf(hp) || 0)) + "</dd>" +
        "<dt>Ended by capture</dt><dd>" + (L.length ? Math.round(100 * cap / L.length) : 0) + "%</dd>" +
        "<dt>Median winner tanks alive" + (surv.length ? " (" + surv.length + ")" : "") +
        "</dt><dd>" + (surv.length ? T.fmtNum(medOf(surv)) : "-") + "</dd>" +
        "</dl></div>";
    }
    return out;
  }

  // =========================================================== panel 6
  function panelBestLoser(T) {
    var A = bestOf(T);
    if (!A || !A.dmg || A.dmg.n < 30) return "";
    var segs = "";
    for (var i = 0; i < BEST_KEYS.length; i++) {
      segs += '<button type="button" data-eg-best="' + BEST_KEYS[i] + '"' +
        (i === 0 ? ' class="eg-on"' : "") + ">" + BEST_NAME[BEST_KEYS[i]] + "</button>";
    }
    var body =
      '<div class="eg-ctl"><span class="eg-lab">Judge them by</span>' +
      '<span class="eg-seg" id="eg-best-seg">' + segs + "</span></div>" +
      '<div id="eg-best-head"></div>' +
      '<div class="eg-scroll" id="eg-best-bar"></div>' +
      '<h3 style="margin:22px 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;color:var(--dim)">' +
      "How often a tank tops its own team</h3>" +
      '<div class="eg-key"><i style="background:' + LOSEC + '"></i>led its losing team' +
      '<i style="background:' + WINC + ';margin-left:16px"></i>led its winning team' +
      "<span style=\"margin-left:16px\">right: gap in points</span></div>" +
      '<div class="eg-scroll" id="eg-best-tank"></div>' +
      '<div class="eg-note-in" id="eg-best-read"></div>';

    var note =
      "Top player on each side by the chosen column, all " + T.fmtNum(A.dmg.n) + " decided " +
      "matches. The tank chart measures topping your own team. It does not measure being " +
      "good. Under 40 appearances on a side are left out.";
    return T.bigPanel("The best player on the losing team", body, note);
  }

  function bestHead(T, key) {
    var A = bestOf(T)[key];
    if (!A || !A.n) return "";
    var share = 100 * A.topOnLoser / A.n;
    var mw = medOf(A.winVals), ml = medOf(A.loseVals);
    return '<div class="eg-read">' +
      '<div><div class="eg-k">Best in the match was a loser</div><div class="eg-v">' +
      pctStr(share) + "</div></div>" +
      '<div><div class="eg-k">Matches</div><div class="eg-v">' + T.fmtNum(A.n) + "</div></div>" +
      '<div><div class="eg-k">Median best, winner</div><div class="eg-v">' +
      T.fmtNum(Math.round(mw * 10) / 10) + "</div></div>" +
      '<div><div class="eg-k">Median best, loser</div><div class="eg-v">' +
      T.fmtNum(Math.round(ml * 10) / 10) + "</div></div>" +
      '<div><div class="eg-k">Gap</div><div class="eg-v">' +
      (mw > 0 ? pctStr(100 * (mw - ml) / mw) : "-") + "</div></div>" +
      "</div>";
  }

  function bestBar(T, key) {
    var A = bestOf(T)[key];
    if (!A || !A.n) return "";
    var mw = medOf(A.winVals), ml = medOf(A.loseVals);
    var rows = [
      { label: "Best on the winner", value: mw, color: WINC, valueLabel: T.fmtNum(Math.round(mw * 10) / 10) },
      { label: "Best on the loser", value: ml, color: LOSEC, valueLabel: T.fmtNum(Math.round(ml * 10) / 10) }
    ];
    return T.svgBarChart(rows, { width: 900, labelWidth: 160, rowHeight: 30 });
  }

  function bestTank(T, key) {
    var A = bestOf(T)[key];
    if (!A) return "";
    var rows = [], name;
    for (name in A.tank) {
      if (!Object.prototype.hasOwnProperty.call(A.tank, name)) continue;
      var r = A.tank[name];
      if (r.winN < 40 || r.loseN < 40) continue;
      rows.push({
        label: name,
        a: r1(100 * r.loseTop / r.loseN),
        b: r1(100 * r.winTop / r.winN)
      });
    }
    if (rows.length < 3) return '<p class="small">Not enough appearances on both sides yet.</p>';
    rows.sort(function (x, y) { return (y.a - y.b) - (x.a - x.b); });
    return T.svgDumbbell(rows, {
      width: 940, labelWidth: 100, rowHeight: 22,
      aName: "when its team lost", bName: "when its team won",
      aColor: LOSEC, bColor: WINC
    });
  }

  // =========================================================== panel 7
  var STAND_MODES = [
    { key: "alive", name: "Still alive at the end" },
    { key: "first", name: "Dies in the first quarter" },
    { key: "half", name: "Dies in the first half" },
    { key: "kept", name: "Kills scored by a player who lived" }
  ];
  // The roster cut is by appearances, but the slider counts TANKS rather than
  // appearances, so every step of it removes exactly one row instead of
  // sitting still through the gaps in the distribution. The readout prints the
  // appearance floor that the chosen count implies.
  function standPool(T) {
    var S = (T && T.STATS) || {};
    var order = (S.death_order_by_tank || []).slice();
    var out = [];
    for (var i = 0; i < order.length; i++) {
      var o = order[i];
      if (!o.buckets || o.buckets.length < 5 || !o.total) continue;
      out.push(o);
    }
    out.sort(function (a, b) { return (b.total || 0) - (a.total || 0); });
    return out;
  }
  function standRows(T, mode, topN) {
    var S = (T && T.STATS) || {};
    var pool = standPool(T);
    var kept = {}, i;
    var sak = S.survive_after_kill || [];
    for (i = 0; i < sak.length; i++) kept[sak[i].label] = sak[i];
    var take = clamp(topN, 1, pool.length);
    var rows = [], floor = null;
    for (i = 0; i < take; i++) {
      var o = pool[i], b = o.buckets, tot = o.total;
      floor = tot;
      var v, sub;
      if (mode === "alive") { v = 100 * b[4] / tot; sub = T.fmtNum(b[4]) + " of " + T.fmtNum(tot); }
      else if (mode === "first") { v = 100 * b[0] / tot; sub = T.fmtNum(b[0]) + " of " + T.fmtNum(tot); }
      else if (mode === "half") {
        v = 100 * (b[0] + b[1]) / tot; sub = T.fmtNum(b[0] + b[1]) + " of " + T.fmtNum(tot);
      } else {
        var kr = kept[o.label];
        if (!kr || !kr.count) continue;
        v = kr.value; sub = T.fmtNum(kr.count) + " kills";
      }
      rows.push({
        label: o.label, value: r1(v),
        color: T.tankColor(o.label) || ELIM,
        valueLabel: pctStr(v) + "  " + sub
      });
    }
    rows.sort(function (x, y) { return y.value - x.value; });
    return { rows: rows, floor: floor, pool: pool.length };
  }

  function panelStanding(T) {
    var pool = standPool(T);
    if (pool.length < 4) return "";
    var segs = "";
    for (var i = 0; i < STAND_MODES.length; i++) {
      segs += '<button type="button" data-eg-stand="' + STAND_MODES[i].key + '"' +
        (i === 0 ? ' class="eg-on"' : "") + ">" + STAND_MODES[i].name + "</button>";
    }
    var body =
      '<div class="eg-ctl"><span class="eg-seg" id="eg-stand-seg">' + segs + "</span>" +
      '<span class="eg-lab">Keep the most played</span>' +
      '<input type="range" class="eg-range" id="eg-stand-min" min="3" max="' + pool.length +
      '" step="1" value="' + pool.length + '">' +
      '<span class="eg-lab" id="eg-stand-out"></span></div>' +
      '<div class="eg-scroll" id="eg-stand"></div>';

    var note =
      "Bars are scaled to 100%. Quarters are of the death order, not the clock. The last view " +
      "changes denominator: it is the share of a tank&#39;s kills made by a player who lived. " +
      "Nothing is adjusted for which side won.";
    return T.bigPanel("Who is left standing", body, note);
  }

  // ================================================================= render
  function render(T) {
    if (!T || !T.DATA || !(T.DATA.matches || []).length) {
      return '<div class="panel"><p class="small">No matches loaded.</p></div>';
    }
    var html = "";
    html += panelLedger(T);
    html += panelTwoGames(T);
    html += panelLastStand(T);
    html += panelClosing(T);
    html += panelBlowout(T);
    html += panelBestLoser(T);
    html += panelStanding(T);
    return html ? '<div class="eg-wrap">' + html + "</div>" : "";
  }

  // =================================================================== wire
  function wire(T, root) {
    if (!root) return;
    var pts = scatterPoints(T);

    // ---- panel 1: legend toggles + click a point
    var scWrap = root.querySelector("#eg-scatter");
    var scRead = root.querySelector("#eg-scatter-read");
    if (scWrap) {
      var on = { elimination: true, capture: true, unresolved: true };
      var paintScatter = function () {
        scWrap.innerHTML = scatterSvg(T, on);
      };
      paintScatter();
      var chips = root.querySelectorAll("[data-eg-wt]");
      for (var ci = 0; ci < chips.length; ci++) {
        chips[ci].addEventListener("click", function (e) {
          var k = e.currentTarget.getAttribute("data-eg-wt");
          on[k] = !on[k];
          if (on[k]) e.currentTarget.classList.remove("eg-off");
          else e.currentTarget.classList.add("eg-off");
          paintScatter();
        });
      }
      scWrap.addEventListener("click", function (e) {
        var el = e.target;
        while (el && el !== scWrap && !el.getAttribute) el = el.parentNode;
        var idx = el && el.getAttribute ? el.getAttribute("data-eg-pt") : null;
        if (idx == null) return;
        var p = pts[+idx];
        if (!p || !scRead) return;
        scRead.innerHTML =
          "<b>" + T.esc(p.map) + "</b>, " + mmss(p.dur) + ", " + p.kills + " kills. " +
          '<span class="eg-dim">Ending:</span> ' + T.esc(WT_NAME[p.wt].toLowerCase()) + ". " +
          '<span class="eg-dim">Health pools left:</span> ' + T.fmtNum(p.x) + " and " +
          T.fmtNum(p.y) + ". " + '<span class="eg-dim">Match</span> ' +
          '<span class="mono">' + T.esc(p.id) + "</span>";
      });
    }

    // ---- panel 2: metric segmented control
    var stripWrap = root.querySelector("#eg-strip");
    var stripRead = root.querySelector("#eg-strip-read");
    var metricSeg = root.querySelector("#eg-metric");
    if (stripWrap) {
      var mKey = METRICS[0].key;
      var paintStrip = function () {
        stripWrap.innerHTML = stripSvg(T, mKey) ||
          '<p class="small">Not enough data for that axis.</p>';
        if (stripRead) stripRead.innerHTML = stripSentence(T, mKey);
      };
      paintStrip();
      if (metricSeg) {
        metricSeg.addEventListener("click", function (e) {
          var b = e.target;
          if (!b || !b.getAttribute || !b.getAttribute("data-eg-metric")) return;
          mKey = b.getAttribute("data-eg-metric");
          var bs = metricSeg.querySelectorAll("button");
          for (var i = 0; i < bs.length; i++) bs[i].classList.remove("eg-on");
          b.classList.add("eg-on");
          paintStrip();
        });
      }
    }

    // ---- panel 3: min-sample slider + click a cell
    var gridWrap = root.querySelector("#eg-grid");
    var gridMin = root.querySelector("#eg-grid-min");
    var gridOut = root.querySelector("#eg-grid-min-out");
    var gridRead = root.querySelector("#eg-grid-read");
    if (gridWrap) {
      var selCell = null;
      var paintGrid = function () {
        var v = gridMin ? +gridMin.value : 10;
        gridWrap.innerHTML = gridSvg(T, v, selCell);
        if (gridOut) gridOut.textContent = v + (v === 1 ? " visit" : " visits");
      };
      paintGrid();
      if (gridMin) gridMin.addEventListener("input", paintGrid);
      gridWrap.addEventListener("click", function (e) {
        var el = e.target;
        var key = el && el.getAttribute ? el.getAttribute("data-eg-cell") : null;
        if (!key) return;
        selCell = key;
        var c = stateGrid(T).cells[key];
        if (c && gridRead) {
          var p = 100 * c.w / c.n;
          gridRead.innerHTML = "<b>" + c.mine + "</b> against <b>" + c.theirs + "</b>: won <b>" +
            pctStr(p) + "</b> of " + c.n + " states" +
            (c.n < 10 ? ' <span class="eg-dim">(too few to lean on)</span>' : "") + ".";
        }
        paintGrid();
      });
    }

    // ---- panel 4: win-type segment + closing-window slider
    var closeWrap = root.querySelector("#eg-close");
    var closeSeg = root.querySelector("#eg-close-seg");
    var closeWin = root.querySelector("#eg-close-win");
    var closeOut = root.querySelector("#eg-close-out");
    var closeRead = root.querySelector("#eg-close-read");
    if (closeWrap) {
      var cKey = "all";
      var paintClose = function () {
        var w = closeWin ? +closeWin.value : 3;
        closeWrap.innerHTML = closingSvg(T, cKey, w);
        if (closeOut) closeOut.textContent = "last " + w + (w === 1 ? " death" : " deaths");
        if (closeRead) {
          var ser = closing(T).series[cKey], lose = 0, tot = 0;
          for (var k = 0; k < w && k < ser.length; k++) { lose += ser[k].lose; tot += ser[k].win + ser[k].lose; }
          closeRead.innerHTML = tot
            ? ("Last " + w + (w === 1 ? " death" : " deaths") + ": <b>" +
               pctStr(100 * lose / tot) + "</b> on the losing team (" + T.fmtNum(lose) +
               " of " + T.fmtNum(tot) + ").")
            : '<span class="eg-dim">No deaths in that window.</span>';
        }
      };
      paintClose();
      if (closeWin) closeWin.addEventListener("input", paintClose);
      if (closeSeg) {
        closeSeg.addEventListener("click", function (e) {
          var b = e.target;
          if (!b || !b.getAttribute || !b.getAttribute("data-eg-close")) return;
          cKey = b.getAttribute("data-eg-close");
          var bs = closeSeg.querySelectorAll("button");
          for (var i = 0; i < bs.length; i++) bs[i].classList.remove("eg-on");
          b.classList.add("eg-on");
          paintClose();
        });
      }
    }

    // ---- panel 5: blowout threshold
    var gapWrap = root.querySelector("#eg-gap");
    var thr = root.querySelector("#eg-thr");
    var thrOut = root.querySelector("#eg-thr-out");
    var thrCol = root.querySelector("#eg-thr-cols");
    if (gapWrap && thr) {
      var paintGap = function () {
        var v = +thr.value;
        gapWrap.innerHTML = gapSvg(T, v);
        if (thrOut) thrOut.textContent = v + (v === 1 ? " kill" : " kills");
        if (thrCol) thrCol.innerHTML = thrCols(T, v);
      };
      paintGap();
      thr.addEventListener("input", paintGap);
    }

    // ---- panel 6: metric toggle
    var bestSeg = root.querySelector("#eg-best-seg");
    var bestH = root.querySelector("#eg-best-head");
    var bestB = root.querySelector("#eg-best-bar");
    var bestTk = root.querySelector("#eg-best-tank");
    var bestRd = root.querySelector("#eg-best-read");
    if (bestH && bestB) {
      var bKey = BEST_KEYS[0];
      var paintBest = function () {
        bestH.innerHTML = bestHead(T, bKey);
        bestB.innerHTML = bestBar(T, bKey);
        if (bestTk) bestTk.innerHTML = bestTank(T, bKey);
        if (bestRd) {
          var A = bestOf(T)[bKey];
          bestRd.innerHTML = A && A.n
            ? ("Top " + BEST_NAME[bKey].toLowerCase() + " was on the losing side <b>" +
               T.fmtNum(A.topOnLoser) + "</b> of " + T.fmtNum(A.n) + " matches.")
            : "";
        }
      };
      paintBest();
      if (bestSeg) {
        bestSeg.addEventListener("click", function (e) {
          var b = e.target;
          if (!b || !b.getAttribute || !b.getAttribute("data-eg-best")) return;
          bKey = b.getAttribute("data-eg-best");
          var bs = bestSeg.querySelectorAll("button");
          for (var i = 0; i < bs.length; i++) bs[i].classList.remove("eg-on");
          b.classList.add("eg-on");
          paintBest();
        });
      }
    }

    // ---- panel 7: mode + minimum appearances
    var standWrap = root.querySelector("#eg-stand");
    var standSeg = root.querySelector("#eg-stand-seg");
    var standMin = root.querySelector("#eg-stand-min");
    var standOut = root.querySelector("#eg-stand-out");
    if (standWrap) {
      var sKey = STAND_MODES[0].key;
      var paintStand = function () {
        var v = standMin ? +standMin.value : 99;
        var got = standRows(T, sKey, v);
        standWrap.innerHTML = got.rows.length
          ? T.svgBarChart(got.rows, { width: 980, labelWidth: 96, rowHeight: 24, maxValue: 100 })
          : '<p class="small">Nothing to draw at that setting.</p>';
        if (standOut) {
          standOut.textContent = got.rows.length + " tanks" +
            (got.floor ? ", " + got.floor + "+ appearances" : "");
        }
      };
      paintStand();
      if (standMin) standMin.addEventListener("input", paintStand);
      if (standSeg) {
        standSeg.addEventListener("click", function (e) {
          var b = e.target;
          if (!b || !b.getAttribute || !b.getAttribute("data-eg-stand")) return;
          sKey = b.getAttribute("data-eg-stand");
          var bs = standSeg.querySelectorAll("button");
          for (var i = 0; i < bs.length; i++) bs[i].classList.remove("eg-on");
          b.classList.add("eg-on");
          paintStand();
        });
      }
    }
  }

  function stripSentence(T, key) {
    var rows = build(T).rows, out = {}, i;
    for (i = 0; i < WT_ORDER.length; i++) out[WT_ORDER[i]] = [];
    for (i = 0; i < rows.length; i++) {
      var v = metricAt(rows[i], key);
      if (v == null) continue;
      out[rows[i].wt].push(v);
    }
    var bits = [];
    for (i = 0; i < WT_ORDER.length; i++) {
      var k = WT_ORDER[i], L = out[k];
      if (!L.length) continue;
      bits.push('<span class="eg-dim">' + WT_NAME[k] + "</span> " +
        "<b>" + T.esc(metricFmt(T, key, medOf(L))) + "</b> " +
        '<span class="eg-dim">(' + L.length + ")</span>");
    }
    return bits.length ? "Median: " + bits.join(" &nbsp;&middot;&nbsp; ") : "";
  }

  // ================================================================ preview
  function preview(T) {
    var G;
    try { G = stateGrid(T); } catch (e) { return ""; }
    if (!G || G.matches < 20 || G.size < 4) return "";
    var N = G.size, cell = 240 / (N + 1), out = "", a, b;
    for (a = N; a >= 1; a--) {
      for (b = 1; b <= N; b++) {
        var c = G.cells[a + "|" + b];
        var x = (b - 1) * (240 / N), y = (N - a) * (240 / N);
        var w = 240 / N;
        var fill = c && c.n ? heat(100 * c.w / c.n) : "rgba(255,255,255,0.03)";
        var op = c && c.n ? Math.min(1, 0.34 + c.n / 60).toFixed(2) : "1";
        out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' +
          (w - 1.2).toFixed(1) + '" height="' + (w - 1.2).toFixed(1) + '" fill="' + fill +
          '" opacity="' + op + '"/>';
      }
    }
    out += '<line x1="0" y1="240" x2="240" y2="0" stroke="rgba(255,255,255,0.20)" ' +
      'stroke-width="1.4" stroke-dasharray="4 4"/>';
    return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice">' + out + "</svg>";
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "endgame",
    title: "Endgame",
    blurb: "How matches finish: the last kills, the last tank alive, what sealed it.",
    accent: "#8a4444",
    css: CSS,
    gated: false,
    preview: preview,
    render: render,
    wire: wire
  });
})();

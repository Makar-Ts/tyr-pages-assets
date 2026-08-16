/* TYR suite: "Attrition" -- the damage economy.
 *
 * Every match is an exchange of health. This suite is about the terms of that
 * exchange: who trades up, who trades down, what a point of damage costs and
 * which tanks are worth their health pool.
 *
 * TWO TIERS OF EVIDENCE, and they are not interchangeable.
 *
 *   1. THE SCOREBOARD, complete for all 308 matches. Damage dealt, assist
 *      damage, damage blocked and kills are never null, so anything built
 *      only from those columns uses the whole archive.
 *
 *   2. DAMAGE TAKEN, which no scoreboard carries. Each per-match deep file
 *      holds playerHealth, a per player health trace of {series:[[t,hp],...]}.
 *      Health only falls from damage, so the sum of the downward steps is
 *      exactly what that player absorbed, and the upward steps are repairs.
 *      About 9% of player rows have no trace at all, and the ones that are
 *      missing are not a random sample: their median scoreboard damage is
 *      higher than the traced rows.
 *
 * The reconstruction is checked here on the page rather than asserted. On the
 * matches where all sixteen players have a trace, the downward steps come to
 * roughly 93% of the scoreboard's damage dealt. The missing few per cent is
 * overkill past zero, which the scoreboard credits and a health trace cannot
 * show, plus hits that merge between two samples of the same trace. So every
 * "health lost" figure on this page is a floor, not an exact number.
 *
 * COST OF THE EVIDENCE. Those deep files are about 0.35 MB each and there are
 * 308 of them, which is far too much to pull on a page load. This page reads
 * a sample instead, in a fixed nested order: every eighth match first, then
 * every fourth, then every second, then the rest. Every prefix of that order
 * is evenly spread across the archive by capture time, so a bigger sample is
 * the smaller one plus more, never a different set. The page always prints
 * how many matches it has actually read, and every sampled panel recomputes
 * as more arrive. Nothing is silently truncated.
 *
 * NO PLAYER NAMES. playerHealth is keyed by player name, so this file reads
 * names to join a trace to a scoreboard row, and never renders one.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var CSS = "" +
    ".at-wrap .avg-panel{overflow:hidden}" +
    ".at-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:2px 0 14px}" +
    ".at-lab{font-size:.68rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em}" +
    ".at-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-wrap:wrap}" +
    ".at-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.8rem;padding:6px 13px;cursor:pointer}" +
    ".at-seg button+button{border-left:1px solid var(--border)}" +
    ".at-seg button.at-on{background:rgba(224,169,74,.24);color:var(--text)}" +
    ".at-seg button.at-done{color:var(--text);opacity:.55;cursor:default}" +
    ".at-chip{display:inline-flex;align-items:center;gap:7px;background:var(--panel2);border:1px solid var(--border);border-radius:20px;color:var(--text);font:inherit;font-size:.78rem;padding:5px 13px;cursor:pointer}" +
    ".at-chip i{width:11px;height:11px;border-radius:3px;display:inline-block}" +
    ".at-chip.at-off{opacity:.34}" +
    ".at-range{width:230px;max-width:44vw;accent-color:#e0a94a;vertical-align:middle}" +
    ".at-sel{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.8rem;padding:6px 10px}" +
    ".at-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden;margin:0 0 14px}" +
    ".at-bar i{display:block;height:100%;background:linear-gradient(90deg,#8c6739,#e0a94a);width:0}" +
    ".at-note-in{margin-top:11px;padding:10px 13px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;font-size:.85rem;line-height:1.7;min-height:1.7em}" +
    ".at-note-in .at-dim{color:var(--dim)}" +
    ".at-scroll{overflow-x:auto}" +
    ".at-svg{width:100%;height:auto;display:block}" +
    ".at-hit{cursor:pointer}" +
    ".at-read{display:flex;flex-wrap:wrap;gap:10px 26px;margin:13px 0 0;padding-top:12px;border-top:1px solid var(--border)}" +
    ".at-read .at-k{font-size:.64rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}" +
    ".at-read .at-v{font-size:1.16rem;font-weight:700;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".at-two{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px}" +
    ".at-col{flex:1 1 250px;border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--panel2)}" +
    ".at-col h3{margin:0 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;font-weight:700}" +
    ".at-col dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:5px 14px;font-size:.86rem}" +
    ".at-col dt{color:var(--dim)}" +
    ".at-col dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}" +
    ".at-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.75rem;color:var(--dim);margin:0 0 9px}" +
    ".at-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}" +
    ".at-say{margin:13px 0 0;font-size:.94rem;line-height:1.68}" +
    ".at-say b{color:#e0a94a;font-variant-numeric:tabular-nums}" +
    ".at-sub{margin:20px 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;color:var(--dim)}" +
    ".at-thin{color:var(--dim);font-size:.86rem}";

  // ------------------------------------------------------------------ paint
  var OUT = "#e0a94a";     // output: damage dealt
  var COST = "#b8564a";    // cost: health lost
  var REPC = "#57988c";    // repairs
  var WINC = "#4e8c5a";
  var LOSEC = "#b8483c";
  var NEUT = "#436f83";
  var GRIDL = "rgba(255,255,255,0.08)";
  var EDGE = "rgba(9,13,28,0.72)";

  var CONC = 5;            // deep files in flight at once
  var MB_EACH = 0.35;      // median deep file size, for the honest label

  // ---------------------------------------------------------------- helpers
  function n2(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function sortNum(a, b) { return a - b; }
  function pctStr(v) { return v == null || !isFinite(v) ? "-" : (Math.round(v * 10) / 10) + "%"; }
  function quant(sorted, q) {
    if (!sorted.length) return null;
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function medOf(list) { return quant(list.slice().sort(sortNum), 0.5); }
  function maxOf(list, floor) {
    var m = floor || 0;
    for (var i = 0; i < list.length; i++) if (list[i] > m) m = list[i];
    return m;
  }
  function txt(x, y, s, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || "chart-axis-label") +
      '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + s + "</text>";
  }
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var f = v / mag;
    var step = f <= 1 ? 1 : (f <= 2 ? 2 : (f <= 2.5 ? 2.5 : (f <= 5 ? 5 : 10)));
    return step * mag;
  }
  function tankHue(T, name, i) {
    return T.tankColor(name) || T.CHART_COLORS[i % T.CHART_COLORS.length];
  }
  // Warm for a tank that gets more out than it puts in, cool-red for one that
  // does not. Used only where the ratio itself is the subject.
  function ratioHue(ratio) {
    var f = clamp((ratio - 0.55) / 0.9, 0, 1);
    var a = [176, 78, 66], b = [230, 176, 84];
    var o = [];
    for (var i = 0; i < 3; i++) o.push(Math.round(a[i] + (b[i] - a[i]) * f));
    return "rgb(" + o.join(",") + ")";
  }

  // ================================================================== store
  //
  // Module level, so the sample survives leaving the page and coming back.
  var S = {
    ids: null, order: null,
    want: 0, next: 0, done: 0, fail: 0, inflight: 0,
    rows: [], matches: [], seen: {},
    ticks: 0
  };
  var ROOT = null;         // the live container, or null once navigated away
  var REPAINT = null;      // set by wire()

  // Nested sample order: every 8th match, then every 4th, then every 2nd,
  // then the rest. Any prefix is an even spread across the whole archive.
  function buildOrder(n) {
    var strides = [8, 4, 2, 1], out = [], seen = {}, s, i;
    for (s = 0; s < strides.length; s++) {
      for (i = 0; i < n; i += strides[s]) {
        if (!seen[i]) { seen[i] = 1; out.push(i); }
      }
    }
    return out;
  }

  function initStore(T) {
    if (S.ids) return;
    var src = (T && T.DATA && T.DATA.matches) || [];
    S.ids = [];
    for (var i = 0; i < src.length; i++) {
      if (src[i] && src[i].match_id) S.ids.push(src[i].match_id);
    }
    S.order = buildOrder(S.ids.length);
  }

  function levels() {
    var n = S.ids ? S.ids.length : 0;
    var strides = [8, 4, 2, 1];
    var names = ["every 8th match", "every 4th", "every 2nd", "all of them"];
    var out = [];
    for (var i = 0; i < strides.length; i++) {
      var c = Math.ceil(n / strides[i]);
      if (c < 1) continue;
      if (out.length && out[out.length - 1].n === c) continue;
      out.push({ n: c, name: names[i] });
    }
    return out;
  }

  function ingest(id, deep) {
    if (S.seen[id]) return;
    S.seen[id] = 1;
    var ph = (deep && deep.playerHealth) || {};
    var ps = (deep && deep.players) || [];
    var mh = (deep && deep.match) || {};
    var win = (mh.winningTeam === 0 || mh.winningTeam === 1) ? mh.winningTeam : null;
    var traced = 0, lost = 0, dmg = 0, rep = 0, i, j;
    for (i = 0; i < ps.length; i++) {
      var p = ps[i];
      dmg += n2(p.damage) || 0;
      var h = ph[p.name];
      var ser = h && h.series;
      if (!ser || ser.length < 2) continue;
      var a = 0, r = 0, zeroAt = null;
      for (j = 1; j < ser.length; j++) {
        var dv = ser[j][1] - ser[j - 1][1];
        if (dv < 0) a -= dv; else r += dv;
        if (zeroAt === null && ser[j][1] <= 0) zeroAt = ser[j][0];
      }
      traced++; lost += a; rep += r;
      S.rows.push({
        mid: id,
        tank: (p.egsTank && p.egsTank.display) || null,
        team: p.team,
        won: win === null ? null : (p.team === win),
        dmg: n2(p.damage) || 0,
        assist: n2(p.assist) || 0,
        blocked: n2(p.blocked) || 0,
        kills: n2(p.kills) || 0,
        hp: n2(p.maxHp) || 0,
        lost: a, rep: r,
        died: zeroAt !== null,
        endHp: ser[ser.length - 1][1]
      });
    }
    S.matches.push({
      id: id, map: mh.map || "", dur: n2(mh.durationSec),
      seats: ps.length, traced: traced, lost: lost, dmg: dmg, rep: rep, win: win
    });
  }

  function alive() { return ROOT && document.body.contains(ROOT); }

  function pump(T) {
    if (!S.order || !alive()) return;
    while (S.inflight < CONC && S.next < S.want && S.next < S.order.length) {
      dispatch(T, S.order[S.next]);
      S.next++;
    }
    if (S.inflight === 0 && REPAINT && alive()) REPAINT(true);
  }

  function dispatch(T, idx) {
    var id = S.ids[idx];
    if (!id) { S.fail++; return; }
    S.inflight++;
    var pr = null;
    try { pr = T.loadJson("matches/" + encodeURIComponent(id) + ".json"); } catch (e) { pr = null; }
    if (!pr || typeof pr.then !== "function") { S.inflight--; S.fail++; return; }
    pr.then(function (deep) {
      S.inflight--;
      if (deep && deep.players && deep.players.length) { ingest(id, deep); S.done++; }
      else S.fail++;
      after(T);
    }, function () { S.inflight--; S.fail++; after(T); });
  }

  function after(T) {
    S.ticks++;
    if (!alive()) return;
    if (REPAINT) REPAINT(S.ticks % 4 === 0 || S.inflight === 0);
    pump(T);
  }

  function want(T, n) {
    initStore(T);
    if (n > S.want) S.want = Math.min(n, S.order.length);
    pump(T);
  }

  // ------------------------------------------------------------ derived cuts
  function tankAgg() {
    var m = {}, i;
    for (i = 0; i < S.rows.length; i++) {
      var r = S.rows[i];
      if (!r.tank) continue;
      var e = m[r.tank];
      if (!e) {
        e = m[r.tank] = { label: r.tank, n: 0, dmg: 0, assist: 0, blocked: 0, kills: 0,
                          lost: 0, rep: 0, hp: 0, died: 0, repN: 0 };
      }
      e.n++; e.dmg += r.dmg; e.assist += r.assist; e.blocked += r.blocked;
      e.kills += r.kills; e.lost += r.lost; e.rep += r.rep; e.hp += r.hp;
      if (r.died) e.died++;
      if (r.rep > 0) e.repN++;
    }
    var out = [];
    for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) out.push(m[k]);
    out.sort(function (a, b) { return b.n - a.n; });
    return out;
  }

  // Per match, the average traced player on each side. Averages rather than
  // team totals so one missing trace does not silently shrink a side.
  // Memoised against the row count, because the separation panel asks for it
  // once per column on every repaint.
  var _sm = null, _smN = -1;
  function sideMeans() {
    if (_smN === S.rows.length && _sm) return _sm;
    var acc = {}, i;
    for (i = 0; i < S.rows.length; i++) {
      var r = S.rows[i];
      if (r.won === null) continue;
      var key = r.mid + "|" + (r.won ? "w" : "l");
      var e = acc[key];
      if (!e) e = acc[key] = { n: 0, lost: 0 };
      e.n++; e.lost += r.lost;
    }
    var out = [], mid;
    var byMatch = {};
    for (mid in acc) {
      if (!Object.prototype.hasOwnProperty.call(acc, mid)) continue;
      var parts = mid.split("|");
      var b = byMatch[parts[0]];
      if (!b) b = byMatch[parts[0]] = {};
      b[parts[1]] = acc[mid];
    }
    for (mid in byMatch) {
      if (!Object.prototype.hasOwnProperty.call(byMatch, mid)) continue;
      var g = byMatch[mid];
      if (!g.w || !g.l || g.w.n < 4 || g.l.n < 4) continue;
      out.push({ id: mid, w: g.w.lost / g.w.n, l: g.l.lost / g.l.n });
    }
    return out;
  }

  // How well the reconstruction agrees with the scoreboard, on the sampled
  // matches where every seat has a trace.
  function calibration() {
    var full = [], part = [], i;
    for (i = 0; i < S.matches.length; i++) {
      var m = S.matches[i];
      if (!m.dmg) continue;
      (m.traced >= m.seats ? full : part).push(m);
    }
    var ratios = [], fl = 0, fd = 0;
    for (i = 0; i < full.length; i++) {
      ratios.push(full[i].lost / full[i].dmg);
      fl += full[i].lost; fd += full[i].dmg;
    }
    return {
      full: full, part: part,
      med: ratios.length ? medOf(ratios) : null,
      pooled: fd > 0 ? fl / fd : null
    };
  }

  function traceCoverage() {
    var seats = 0, traced = 0;
    for (var i = 0; i < S.matches.length; i++) { seats += S.matches[i].seats; traced += S.matches[i].traced; }
    return { seats: seats, traced: traced };
  }

  // ============================================================== panel 1
  function loaderHtml(T) {
    var L = levels(), segs = "", i;
    for (i = 0; i < L.length; i++) {
      segs += '<button type="button" data-at-n="' + L[i].n + '">' + L[i].name +
        " (" + T.fmtNum(L[i].n) + ")</button>";
    }
    return '<div class="at-ctl"><span class="at-lab">Health traces read</span>' +
      '<span class="at-seg" id="at-load-seg">' + segs + "</span>" +
      '<span class="at-lab" id="at-load-out"></span></div>' +
      '<div class="at-bar"><i id="at-bar-fill"></i></div>';
  }

  function calSvg(T, on, sel) {
    var C = calibration();
    var pts = [], i;
    for (i = 0; i < S.matches.length; i++) {
      var m = S.matches[i];
      if (!m.dmg || !m.traced) continue;
      pts.push({ m: m, whole: m.traced >= m.seats });
    }
    if (pts.length < 3) return "";
    var W = 1000, H = 470, padL = 84, padB = 50, padT = 18, padR = 22;
    var mx = 1;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].m.dmg > mx) mx = pts[i].m.dmg;
      if (pts[i].m.lost > mx) mx = pts[i].m.lost;
    }
    mx = Math.ceil(mx / 5000) * 5000;
    function xAt(v) { return padL + (v / mx) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mx) * (H - padB - padT); }
    var g = "", t;
    for (t = 0; t <= 5; t++) {
      var v = mx * t / 5;
      g += '<line x1="' + xAt(v).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(v).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        '<line x1="' + padL + '" y1="' + yAt(v).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(v).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(v).toFixed(1), H - padB + 16, T.fmtNum(Math.round(v)), null, "middle") +
        txt(padL - 8, yAt(v) + 4, T.fmtNum(Math.round(v)), null, "end");
    }
    g += '<line x1="' + xAt(0) + '" y1="' + yAt(0) + '" x2="' + xAt(mx) + '" y2="' + yAt(mx) +
      '" stroke="rgba(210,220,255,0.32)" stroke-dasharray="6 5"></line>' +
      txt(xAt(mx * 0.80), yAt(mx * 0.80) - 8, "perfect agreement", null, "middle");
    if (C.med) {
      g += '<line x1="' + xAt(0) + '" y1="' + yAt(0) + '" x2="' + xAt(mx) + '" y2="' +
        yAt(mx * C.med) + '" stroke="' + OUT + '" stroke-width="2"></line>' +
        txt(xAt(mx * 0.86), yAt(mx * C.med * 0.86) + 17,
            pctStr(100 * C.med) + " of the scoreboard", null, "middle");
    }
    g += txt(W / 2, H - 6, "damage dealt on the scoreboard, all sixteen seats", null, "middle");
    g += '<text transform="translate(16,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">health destroyed, rebuilt from the traces</text>';

    var body = "";
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], key = p.whole ? "whole" : "part";
      if (on && on[key] === false) continue;
      var isSel = sel === p.m.id;
      body += '<circle class="at-hit" data-at-cal="' + T.esc(p.m.id) + '" cx="' +
        xAt(p.m.dmg).toFixed(1) + '" cy="' + yAt(p.m.lost).toFixed(1) + '" r="' +
        (isSel ? 7 : 4.6) + '" fill="' + (p.whole ? OUT : NEUT) + '" fill-opacity="' +
        (p.whole ? "0.85" : "0.62") + '" stroke="' + (isSel ? "#ffffff" : EDGE) +
        '" stroke-width="' + (isSel ? 2 : 0.8) + '"><title>' +
        T.esc(p.m.map + ": " + Math.round(p.m.lost) + " health destroyed against " +
              Math.round(p.m.dmg) + " damage dealt, " + p.m.traced + " of " + p.m.seats +
              " traces") + "</title></circle>";
    }
    return '<svg class="at-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + g + body + "</svg>";
  }

  function calCards(T) {
    var C = calibration(), cov = traceCoverage();
    var lost = 0, rep = 0, dmg = 0, i;
    for (i = 0; i < S.matches.length; i++) {
      lost += S.matches[i].lost; rep += S.matches[i].rep; dmg += S.matches[i].dmg;
    }
    var total = S.ids ? S.ids.length : 0;
    return T.card("Matches read", T.fmtNum(S.done) + " of " + T.fmtNum(total)) +
      T.card("Seats with a health trace", cov.seats
        ? T.fmtNum(cov.traced) + " of " + T.fmtNum(cov.seats) +
          " (" + pctStr(100 * cov.traced / cov.seats) + ")"
        : "-") +
      T.card("Health destroyed", T.fmtNum(Math.round(lost))) +
      T.card("Health repaired back", T.fmtNum(Math.round(rep))) +
      T.card("Recovered share of the scoreboard",
        C.med === null ? "-" : pctStr(100 * C.med));
  }

  function panelLedger(T) {
    var body =
      loaderHtml(T) +
      '<div class="stat-grid" id="at-cards" style="margin-bottom:14px"></div>' +
      '<div class="at-ctl">' +
      '<button type="button" class="at-chip" data-at-cal-chip="whole"><i style="background:' +
      OUT + '"></i><span id="at-chip-whole">all sixteen traced</span></button>' +
      '<button type="button" class="at-chip" data-at-cal-chip="part"><i style="background:' +
      NEUT + '"></i><span id="at-chip-part">some traces missing</span></button>' +
      "</div>" +
      '<div class="at-scroll" id="at-cal"></div>' +
      '<div class="at-note-in" id="at-cal-read"><span class="at-dim">Click a match.' +
      "</span></div>";

    var note =
      '<span id="at-cal-live">The traces are not read yet.</span> Health lost is a floor. ' +
      "Blue dots are missing a trace, and those rows skew toward higher damage.";
    return T.bigPanel("What the scoreboard threw away", body, note);
  }

  // ============================================================== panel 2
  var OUT_MODES = [
    { key: "dmg", name: "Damage dealt" },
    { key: "assist", name: "Damage and assist" },
    { key: "blocked", name: "Damage, assist and blocked" }
  ];
  function outputOf(e, mode) {
    if (mode === "assist") return e.dmg + e.assist;
    if (mode === "blocked") return e.dmg + e.assist + e.blocked;
    return e.dmg;
  }

  function frontierSvg(T, mode, minN, sel) {
    var agg = tankAgg(), keep = [], i;
    for (i = 0; i < agg.length; i++) {
      if (agg[i].n >= minN && agg[i].lost > 0) keep.push(agg[i]);
    }
    if (keep.length < 3) return "";
    var W = 1000, H = 560, padL = 84, padB = 52, padT = 20, padR = 26;
    var mxN = 1, mx = 1;
    for (i = 0; i < keep.length; i++) {
      var xv = keep[i].lost / keep[i].n, yv = outputOf(keep[i], mode) / keep[i].n;
      if (xv > mx) mx = xv;
      if (yv > mx) mx = yv;
      if (keep[i].n > mxN) mxN = keep[i].n;
    }
    mx = niceMax(mx * 1.12);
    function xAt(v) { return padL + (v / mx) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mx) * (H - padB - padT); }
    var g = "", t;
    for (t = 0; t <= 5; t++) {
      var v = mx * t / 5;
      g += '<line x1="' + xAt(v).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(v).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        '<line x1="' + padL + '" y1="' + yAt(v).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(v).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(v).toFixed(1), H - padB + 16, T.fmtNum(Math.round(v)), null, "middle") +
        txt(padL - 8, yAt(v) + 4, T.fmtNum(Math.round(v)), null, "end");
    }
    g += '<line x1="' + xAt(0) + '" y1="' + yAt(0) + '" x2="' + xAt(mx) + '" y2="' + yAt(mx) +
      '" stroke="rgba(224,169,74,0.55)" stroke-width="2" stroke-dasharray="7 5"></line>' +
      txt(xAt(mx * 0.74), yAt(mx * 0.74) - 10, "break even: one point out for one point in",
          null, "middle");
    g += txt(W / 2, H - 6, "health lost per game", null, "middle");
    g += '<text transform="translate(16,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">output per game</text>';

    // Bubbles first, then decluttered labels on top.
    var marks = "", labels = [];
    for (i = 0; i < keep.length; i++) {
      var e = keep[i];
      var x = xAt(e.lost / e.n), y = yAt(outputOf(e, mode) / e.n);
      var rad = 6 + 18 * Math.sqrt(e.n / mxN);
      var ratio = outputOf(e, mode) / e.lost;
      var isSel = sel === e.label;
      marks += '<circle class="at-hit" data-at-tank="' + T.esc(e.label) + '" cx="' + x.toFixed(1) +
        '" cy="' + y.toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + tankHue(T, e.label, i) +
        '" fill-opacity="' + (isSel ? "0.95" : "0.72") + '" stroke="' +
        (isSel ? "#ffffff" : EDGE) + '" stroke-width="' + (isSel ? 2.4 : 1) + '"><title>' +
        T.esc(e.label + ": " + Math.round(outputOf(e, mode) / e.n) + " out, " +
              Math.round(e.lost / e.n) + " in, ratio " + r2(ratio) + ", " + e.n + " games") +
        "</title></circle>";
      labels.push({ x: x + rad + 5, y: y, s: e.label + " " + r2(ratio), sel: isSel });
    }
    labels.sort(function (a, b) { return a.y - b.y; });
    var lastY = -99;
    for (i = 0; i < labels.length; i++) {
      if (labels[i].y - lastY < 13) labels[i].y = lastY + 13;
      lastY = labels[i].y;
      marks += '<text x="' + labels[i].x.toFixed(1) + '" y="' + (labels[i].y + 4).toFixed(1) +
        '" font-size="11" font-weight="' + (labels[i].sel ? "700" : "600") + '" fill="' +
        (labels[i].sel ? "#ffffff" : "rgba(226,232,255,0.80)") + '" pointer-events="none">' +
        T.esc(labels[i].s) + "</text>";
    }
    return '<svg class="at-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + g + marks + "</svg>";
  }

  function panelFrontier(T) {
    var segs = "", i;
    for (i = 0; i < OUT_MODES.length; i++) {
      segs += '<button type="button" data-at-out="' + OUT_MODES[i].key + '"' +
        (i === 0 ? ' class="at-on"' : "") + ">" + OUT_MODES[i].name + "</button>";
    }
    var body =
      '<div class="at-ctl"><span class="at-lab">Count as output</span>' +
      '<span class="at-seg" id="at-out-seg">' + segs + "</span>" +
      '<span class="at-lab">Hide tanks under</span>' +
      '<input type="range" class="at-range" id="at-ex-min" min="5" max="120" step="5" value="15">' +
      '<span class="at-lab" id="at-ex-min-out"></span></div>' +
      '<div class="at-scroll" id="at-ex"></div>' +
      '<div class="at-note-in" id="at-ex-read"><span class="at-dim">Click a tank.' +
      "</span></div>";

    var note =
      "Bubble size is games played; the ratio beside each name is output over health lost. " +
      "Counting blocked damage as output flatters heavy tanks most.";
    return T.bigPanel("The exchange rate", body, note);
  }

  // ============================================================== panel 3
  var COST_MODES = [
    { key: "lostPerKill", name: "Health lost per kill scored", src: "sample" },
    { key: "dmgPerKill", name: "Damage dealt per kill", src: "archive" },
    { key: "killsPerK", name: "Kills per 1,000 health lost", src: "sample" },
    { key: "deathsPerKill", name: "Deaths per kill", src: "archive" }
  ];

  function costRows(T, mode, minN) {
    var out = [], i;
    if (mode === "lostPerKill" || mode === "killsPerK") {
      var agg = tankAgg();
      for (i = 0; i < agg.length; i++) {
        var e = agg[i];
        if (e.n < minN || e.kills < 3 || e.lost <= 0) continue;
        if (mode === "lostPerKill") {
          out.push({ label: e.label, value: Math.round(e.lost / e.kills),
                     color: tankHue(T, e.label, i),
                     valueLabel: T.fmtNum(Math.round(e.lost / e.kills)) + "  " +
                       T.fmtNum(e.kills) + " kills over " + T.fmtNum(e.n) + " games" });
        } else {
          out.push({ label: e.label, value: r1(1000 * e.kills / e.lost),
                     color: tankHue(T, e.label, i),
                     valueLabel: T.fmtNum(r1(1000 * e.kills / e.lost)) + "  " +
                       T.fmtNum(e.kills) + " kills over " + T.fmtNum(e.n) + " games" });
        }
      }
    } else if (mode === "dmgPerKill") {
      var src = (T.STATS && T.STATS.dmg_per_kill_by_tank) || [];
      for (i = 0; i < src.length; i++) {
        var d = src[i];
        if (n2(d.value) === null || (d.count || 0) < minN) continue;
        out.push({ label: d.label, value: Math.round(d.value), color: tankHue(T, d.label, i),
                   valueLabel: T.fmtNum(Math.round(d.value)) + "  from " +
                     T.fmtNum(d.count) + " kills" });
      }
    } else {
      var kl = (T.STATS && T.STATS.tank_kills) || [];
      var dl = (T.STATS && T.STATS.tank_deaths) || [];
      var kmap = {}, dmap = {};
      for (i = 0; i < kl.length; i++) kmap[kl[i].label] = kl[i].count || 0;
      for (i = 0; i < dl.length; i++) dmap[dl[i].label] = dl[i].count || 0;
      var names = [];
      for (var k in kmap) if (Object.prototype.hasOwnProperty.call(kmap, k)) names.push(k);
      for (i = 0; i < names.length; i++) {
        var kk = kmap[names[i]] || 0, dd = dmap[names[i]] || 0;
        if (kk < minN || !kk) continue;
        out.push({ label: names[i], value: r2(dd / kk), color: tankHue(T, names[i], i),
                   valueLabel: r2(dd / kk) + "  " + T.fmtNum(dd) + " deaths, " +
                     T.fmtNum(kk) + " kills" });
      }
    }
    out.sort(function (a, b) { return b.value - a.value; });
    return out;
  }

  function panelCost(T) {
    var segs = "", i;
    for (i = 0; i < COST_MODES.length; i++) {
      segs += '<button type="button" data-at-cost="' + COST_MODES[i].key + '"' +
        (i === 0 ? ' class="at-on"' : "") + ">" + COST_MODES[i].name + "</button>";
    }
    var body =
      '<div class="at-ctl"><span class="at-lab">Price it in</span>' +
      '<span class="at-seg" id="at-cost-seg">' + segs + "</span>" +
      '<span class="at-lab">Minimum sample</span>' +
      '<input type="range" class="at-range" id="at-cost-min" min="5" max="150" step="5" value="15">' +
      '<span class="at-lab" id="at-cost-min-out"></span></div>' +
      '<div class="at-scroll" id="at-cost"></div>' +
      '<div class="at-note-in" id="at-cost-read"></div>';

    // The archive count is read at render time. It was typed in as 308 and had
    // already been overtaken by the time anyone noticed.
    var note =
      "Four prices for one event. First and third are measured from sampled traces. Second " +
      "and fourth are published, over all " +
      T.fmtNum(((T.DATA || {}).matches || []).length) + " matches. Kill credit goes to the " +
      "last hit, not to whoever did the work. " +
      '<span id="at-cost-live"></span>';
    return T.bigPanel("What a kill costs", body, note);
  }

  // ============================================================== panel 4
  //
  // Which scoreboard column actually separates a winning team from a losing
  // one. Four columns are complete for the whole archive; the fifth needs the
  // sampled traces and prints its own count.
  var SEP_COLS = [
    { key: "dmg", name: "Damage dealt", src: "archive", better: "high" },
    { key: "assist", name: "Assist damage", src: "archive", better: "high" },
    { key: "blocked", name: "Damage blocked", src: "archive", better: "high" },
    { key: "kills", name: "Kills", src: "archive", better: "high" },
    { key: "lost", name: "Health lost", src: "sample", better: "low" }
  ];

  var _sep = null;
  function sepArchive(T) {
    if (_sep) return _sep;
    var src = (T && T.DATA && T.DATA.matches) || [];
    var acc = {};
    for (var c = 0; c < SEP_COLS.length; c++) {
      if (SEP_COLS[c].src === "archive") acc[SEP_COLS[c].key] = [];
    }
    for (var i = 0; i < src.length; i++) {
      var m = src[i], w = m.winning_team;
      if (w !== 0 && w !== 1) continue;
      var ps = m.players || [];
      var sums = {}, cnt = [0, 0], key;
      for (key in acc) if (Object.prototype.hasOwnProperty.call(acc, key)) sums[key] = [0, 0];
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j];
        if (p.team !== 0 && p.team !== 1) continue;
        cnt[p.team]++;
        for (key in acc) {
          if (!Object.prototype.hasOwnProperty.call(acc, key)) continue;
          sums[key][p.team] += n2(p[key]) || 0;
        }
      }
      if (cnt[0] < 4 || cnt[1] < 4) continue;
      for (key in acc) {
        if (!Object.prototype.hasOwnProperty.call(acc, key)) continue;
        acc[key].push({ id: m.match_id, w: sums[key][w] / cnt[w], l: sums[key][1 - w] / cnt[1 - w] });
      }
    }
    _sep = acc;
    return _sep;
  }

  function sepPairs(T, key) {
    if (key === "lost") return sideMeans();
    return sepArchive(T)[key] || [];
  }

  // Share of matches where the winning side came out ahead on this column by
  // at least `thr` per cent of the losing side's figure.
  function sepLead(T, key, thr) {
    var pairs = sepPairs(T, key), col = null, i;
    for (i = 0; i < SEP_COLS.length; i++) if (SEP_COLS[i].key === key) col = SEP_COLS[i];
    if (!col || !pairs.length) return null;
    var ahead = 0, n = 0, wv = [], lv = [];
    for (i = 0; i < pairs.length; i++) {
      var a = pairs[i].w, b = pairs[i].l;
      if (!isFinite(a) || !isFinite(b)) continue;
      n++; wv.push(a); lv.push(b);
      var good = col.better === "high" ? a - b : b - a;
      var base = col.better === "high" ? b : a;
      if (base <= 0) { if (good > 0) ahead++; continue; }
      if (good / base >= thr / 100) ahead++;
    }
    if (!n) return null;
    var mw = medOf(wv), ml = medOf(lv);
    var edge = col.better === "high"
      ? (ml > 0 ? 100 * (mw - ml) / ml : null)
      : (mw > 0 ? 100 * (ml - mw) / mw : null);
    return { n: n, ahead: ahead, share: 100 * ahead / n, medW: mw, medL: ml, edge: edge, col: col };
  }

  function sepSummary(T, key, thr) {
    var rows = [], i;
    for (i = 0; i < SEP_COLS.length; i++) {
      var got = sepLead(T, SEP_COLS[i].key, thr);
      if (!got) continue;
      rows.push({
        label: SEP_COLS[i].name,
        value: r1(got.share),
        color: SEP_COLS[i].key === key ? OUT : "rgba(224,169,74,0.34)",
        valueLabel: pctStr(got.share) + "  " + T.fmtNum(got.ahead) + " of " + T.fmtNum(got.n) +
          (SEP_COLS[i].src === "sample" ? " sampled" : "")
      });
    }
    if (!rows.length) return "";
    return T.svgBarChart(rows, { width: 980, labelWidth: 130, rowHeight: 26, maxValue: 100,
                                 gridColor: "rgba(255,255,255,0.10)" });
  }

  function sepHist(T, key) {
    var got = sepLead(T, key, 0);
    if (!got || got.n < 20) return "";
    var pairs = sepPairs(T, key), diffs = [], i;
    for (i = 0; i < pairs.length; i++) {
      var d = got.col.better === "high" ? pairs[i].w - pairs[i].l : pairs[i].l - pairs[i].w;
      if (isFinite(d)) diffs.push(d);
    }
    if (diffs.length < 20) return "";
    var lo = 0, hi = 0;
    for (i = 0; i < diffs.length; i++) {
      if (diffs[i] < lo) lo = diffs[i];
      if (diffs[i] > hi) hi = diffs[i];
    }
    var span = Math.max(Math.abs(lo), Math.abs(hi));
    if (span <= 0) return "";
    var BINS = 25, half = Math.ceil(BINS / 2);
    var step = span / half;
    var counts = [], b;
    for (b = 0; b < BINS; b++) counts.push(0);
    for (i = 0; i < diffs.length; i++) {
      var bi = Math.floor(diffs[i] / step) + half;
      counts[clamp(bi, 0, BINS - 1)]++;
    }
    var mxC = maxOf(counts, 1);
    var W = 1000, H = 260, padL = 46, padB = 44, padT = 18, padR = 20;
    var bw = (W - padL - padR) / BINS;
    var out = "", t;
    for (t = 0; t <= 4; t++) {
      var y = padT + (H - padT - padB) * t / 4;
      out += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' +
        y.toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(padL - 8, y + 4, String(Math.round(mxC * (1 - t / 4))), null, "end");
    }
    for (b = 0; b < BINS; b++) {
      var c = counts[b];
      if (!c) continue;
      var hgt = (H - padT - padB) * c / mxC;
      var x = padL + b * bw;
      var isWin = (b - half) >= 0;
      var loV = (b - half) * step, hiV = loV + step;
      out += '<rect x="' + (x + 2).toFixed(1) + '" y="' + (H - padB - hgt).toFixed(1) +
        '" width="' + (bw - 4).toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="3" fill="' +
        (isWin ? WINC : LOSEC) + '" fill-opacity="0.92"><title>' +
        T.esc((isWin ? "winning side ahead by " : "losing side ahead by ") +
              T.fmtNum(Math.round(Math.abs(loV))) + " to " +
              T.fmtNum(Math.round(Math.abs(hiV))) + ": " + c + " matches") + "</title></rect>";
    }
    var zx = padL + half * bw;
    out += '<line x1="' + zx.toFixed(1) + '" y1="' + (padT - 8) + '" x2="' + zx.toFixed(1) +
      '" y2="' + (H - padB + 6) + '" stroke="rgba(230,236,255,0.55)" stroke-width="2"></line>' +
      txt(zx + 6, padT - 1, "dead level", null, null);
    out += txt(padL, H - 8, "losing side ahead", null, "start") +
      txt(W - padR, H - 8, "winning side ahead", null, "end") +
      txt(W / 2, H - 8, "per player difference between the two sides", null, "middle");
    return '<svg class="at-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelSeparation(T) {
    var segs = "", i;
    for (i = 0; i < SEP_COLS.length; i++) {
      segs += '<button type="button" data-at-sep="' + SEP_COLS[i].key + '"' +
        (i === 2 ? ' class="at-on"' : "") + ">" + SEP_COLS[i].name + "</button>";
    }
    var body =
      '<div class="at-ctl"><span class="at-lab">Call it a lead only above</span>' +
      '<input type="range" class="at-range" id="at-sep-thr" min="0" max="60" step="2" value="0">' +
      '<span class="at-lab" id="at-sep-thr-out"></span></div>' +
      '<div class="at-scroll" id="at-sep-sum"></div>' +
      '<h3 class="at-sub">One column at a time</h3>' +
      '<div class="at-ctl"><span class="at-seg" id="at-sep-seg">' + segs + "</span></div>" +
      '<div class="at-read" id="at-sep-head"></div>' +
      '<div class="at-scroll" id="at-sep-hist" style="margin-top:12px"></div>' +
      '<div class="at-note-in" id="at-sep-read"></div>';

    var note =
      "Correlation, not cause: the winner and loser labels come from the result. " +
      "<b>Damage blocked barely separates winners from losers.</b> It is near a coin flip. " +
      "Health lost (5th column) uses the sampled matches only, and its count grows as more " +
      "are read.";
    return T.bigPanel("Which column separates a winner from a loser", body, note);
  }

  // ============================================================== panel 5
  var REP_MODES = [
    { key: "perGame", name: "Repair per game" },
    { key: "share", name: "Repair against the tank&#39;s own pool" },
    { key: "any", name: "Share of games with any repair" }
  ];

  function repRows(T, mode, minN) {
    var agg = tankAgg(), out = [], i;
    for (i = 0; i < agg.length; i++) {
      var e = agg[i];
      if (e.n < minN) continue;
      var v, lab;
      if (mode === "perGame") {
        v = Math.round(e.rep / e.n);
        lab = T.fmtNum(v) + "  over " + T.fmtNum(e.n) + " games";
      } else if (mode === "share") {
        var pool = e.hp / e.n;
        if (!(pool > 0)) continue;
        v = r1(100 * (e.rep / e.n) / pool);
        lab = pctStr(v) + "  of a " + T.fmtNum(Math.round(pool)) + " point pool";
      } else {
        v = r1(100 * e.repN / e.n);
        lab = pctStr(v) + "  " + T.fmtNum(e.repN) + " of " + T.fmtNum(e.n);
      }
      out.push({ label: e.label, value: v, color: REPC, valueLabel: lab });
    }
    out.sort(function (a, b) { return b.value - a.value; });
    return out;
  }

  function repSplit(thr) {
    var a = { n: 0, died: 0, lost: 0, dmg: 0 }, b = { n: 0, died: 0, lost: 0, dmg: 0 }, i;
    for (i = 0; i < S.rows.length; i++) {
      var r = S.rows[i];
      var g = r.rep >= thr && thr > 0 ? a : (r.rep < thr ? b : a);
      if (thr === 0) g = r.rep > 0 ? a : b;
      g.n++; g.lost += r.lost; g.dmg += r.dmg;
      if (r.died) g.died++;
    }
    return { rep: a, dry: b };
  }

  function repCols(T, thr) {
    var sp = repSplit(thr);
    var sets = [{ label: "Patched up", col: REPC, d: sp.rep },
                { label: "Never patched", col: COST, d: sp.dry }];
    var out = "";
    for (var i = 0; i < sets.length; i++) {
      var d = sets[i].d;
      out += '<div class="at-col" style="border-color:' + sets[i].col + '">' +
        '<h3 style="color:' + sets[i].col + '">' + sets[i].label + "</h3><dl>" +
        "<dt>Player games</dt><dd>" + T.fmtNum(d.n) + "</dd>" +
        "<dt>Killed before the end</dt><dd>" + (d.n ? pctStr(100 * d.died / d.n) : "-") + "</dd>" +
        "<dt>Health lost per game</dt><dd>" + (d.n ? T.fmtNum(Math.round(d.lost / d.n)) : "-") + "</dd>" +
        "<dt>Damage dealt per game</dt><dd>" + (d.n ? T.fmtNum(Math.round(d.dmg / d.n)) : "-") + "</dd>" +
        "</dl></div>";
    }
    return out;
  }

  function panelRepairs(T) {
    var segs = "", i;
    for (i = 0; i < REP_MODES.length; i++) {
      segs += '<button type="button" data-at-rep="' + REP_MODES[i].key + '"' +
        (i === 0 ? ' class="at-on"' : "") + ">" + REP_MODES[i].name + "</button>";
    }
    var body =
      '<div class="at-read" id="at-rep-head" style="border-top:0;padding-top:0;margin-top:0"></div>' +
      '<div class="at-ctl" style="margin-top:16px"><span class="at-seg" id="at-rep-seg">' +
      segs + "</span>" +
      '<span class="at-lab">Hide tanks under</span>' +
      '<input type="range" class="at-range" id="at-rep-min" min="5" max="120" step="5" value="15">' +
      '<span class="at-lab" id="at-rep-min-out"></span></div>' +
      '<div class="at-scroll" id="at-rep"></div>' +
      '<h3 class="at-sub">Does it change anything</h3>' +
      '<div class="at-ctl"><span class="at-lab">Count a player patched up at</span>' +
      '<input type="range" class="at-range" id="at-rep-thr" min="0" max="800" step="25" value="0">' +
      '<span class="at-lab" id="at-rep-thr-out"></span></div>' +
      '<div class="at-two" id="at-rep-cols"></div>' +
      '<div class="at-note-in" id="at-rep-read"></div>';

    var note =
      "Upward steps in a trace are health regained. The source (heal, kit, regen) is not " +
      "recorded. Patched-up players die less. Staying alive also buys time to heal, and the " +
      "arrow runs both ways.";
    return T.bigPanel("Repairs, the health that comes back", body, note);
  }

  // ============================================================== panel 6
  var CLOUD_MODES = [
    { key: "fate", name: "Survived or killed" },
    { key: "result", name: "Won or lost" },
    { key: "tank", name: "By tank" }
  ];

  function cloudSvg(T, mode, pick) {
    if (S.rows.length < 40) return "";
    var W = 1000, H = 560, padL = 84, padB = 52, padT = 20, padR = 22;
    var mx = 1, i;
    for (i = 0; i < S.rows.length; i++) {
      if (S.rows[i].lost > mx) mx = S.rows[i].lost;
      if (S.rows[i].dmg > mx) mx = S.rows[i].dmg;
    }
    mx = niceMax(mx);
    function xAt(v) { return padL + (v / mx) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mx) * (H - padB - padT); }
    var g = "", t;
    for (t = 0; t <= 5; t++) {
      var v = mx * t / 5;
      g += '<line x1="' + xAt(v).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(v).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        '<line x1="' + padL + '" y1="' + yAt(v).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(v).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(v).toFixed(1), H - padB + 16, T.fmtNum(Math.round(v)), null, "middle") +
        txt(padL - 8, yAt(v) + 4, T.fmtNum(Math.round(v)), null, "end");
    }
    g += '<line x1="' + xAt(0) + '" y1="' + yAt(0) + '" x2="' + xAt(mx) + '" y2="' + yAt(mx) +
      '" stroke="rgba(224,169,74,0.55)" stroke-width="2" stroke-dasharray="7 5"></line>' +
      txt(xAt(mx * 0.80), yAt(mx * 0.80) - 9, "break even", null, "middle");
    g += txt(W / 2, H - 6, "health that player lost", null, "middle");
    g += '<text transform="translate(16,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">damage that player dealt</text>';

    var dim = "", hot = "", ti = 0, tidx = {};
    for (i = 0; i < S.rows.length; i++) {
      var r = S.rows[i];
      var on = !pick || pick === "*" || r.tank === pick;
      var col;
      if (mode === "fate") col = r.died ? LOSEC : WINC;
      else if (mode === "result") col = r.won === null ? NEUT : (r.won ? WINC : LOSEC);
      else {
        if (r.tank && tidx[r.tank] === undefined) tidx[r.tank] = ti++;
        col = tankHue(T, r.tank, r.tank ? tidx[r.tank] : 0);
      }
      var mark = '<circle cx="' + xAt(r.lost).toFixed(1) + '" cy="' + yAt(r.dmg).toFixed(1) +
        '" r="' + (on ? 3.4 : 2.2) + '" fill="' + (on ? col : "rgba(150,162,205,0.30)") +
        '" fill-opacity="' + (on ? "0.78" : "0.5") + '"></circle>';
      if (on) hot += mark; else dim += mark;
    }
    return '<svg class="at-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + g + dim + hot + "</svg>";
  }

  function panelCloud(T) {
    var segs = "", i;
    for (i = 0; i < CLOUD_MODES.length; i++) {
      segs += '<button type="button" data-at-cloud="' + CLOUD_MODES[i].key + '"' +
        (i === 0 ? ' class="at-on"' : "") + ">" + CLOUD_MODES[i].name + "</button>";
    }
    var body =
      '<div class="at-ctl"><span class="at-lab">Colour by</span>' +
      '<span class="at-seg" id="at-cloud-seg">' + segs + "</span>" +
      '<span class="at-lab">Pick out</span>' +
      '<select class="at-sel" id="at-cloud-tank"><option value="*">every tank</option></select>' +
      "</div>" +
      '<div class="at-key"><i style="background:' + WINC + '"></i><span id="at-cloud-k1">' +
      "still alive at the end</span>" +
      '<i style="background:' + LOSEC + ';margin-left:16px"></i><span id="at-cloud-k2">' +
      "killed</span></div>" +
      '<div class="at-scroll" id="at-cloud"></div>' +
      '<div class="at-note-in" id="at-cloud-read"></div>';

    var note =
      "One dot per player game. Picking one tank barely narrows the spread. " +
      "About 9% of seats have no trace and are missing here.";
    return T.bigPanel("Every trade, one dot", body, note);
  }

  // ================================================================= render
  function render(T) {
    if (!T || !T.DATA || !(T.DATA.matches || []).length) {
      return '<div class="panel"><p class="small">No matches loaded.</p></div>';
    }
    initStore(T);
    var html = "";
    html += panelLedger(T);
    html += panelFrontier(T);
    html += panelCost(T);
    html += panelSeparation(T);
    html += panelRepairs(T);
    html += panelCloud(T);
    return '<div class="at-wrap">' + html + "</div>";
  }

  // =================================================================== wire
  function wire(T, root) {
    if (!root) return;
    ROOT = root;
    initStore(T);

    var waiting = '<p class="at-thin">Reading health traces...</p>';

    // ---- panel 1 -------------------------------------------------------
    var loadSeg = root.querySelector("#at-load-seg");
    var loadOut = root.querySelector("#at-load-out");
    var barFill = root.querySelector("#at-bar-fill");
    var cards = root.querySelector("#at-cards");
    var calWrap = root.querySelector("#at-cal");
    var calRead = root.querySelector("#at-cal-read");
    var calLive = root.querySelector("#at-cal-live");
    var chipWhole = root.querySelector("#at-chip-whole");
    var chipPart = root.querySelector("#at-chip-part");
    var calOn = { whole: true, part: true };
    var calSel = null;

    function paintLoader() {
      var total = S.ids.length;
      if (loadOut) {
        loadOut.textContent = S.done + " read" +
          (S.next > S.done + S.fail ? ", " + (S.next - S.done - S.fail) + " in flight" : "") +
          (S.fail ? ", " + S.fail + " missing" : "") +
          ", about " + Math.round(S.done * MB_EACH) + " MB so far";
      }
      if (barFill) {
        barFill.style.width = total ? (100 * S.done / total).toFixed(1) + "%" : "0";
      }
      if (loadSeg) {
        var bs = loadSeg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) {
          var n = +bs[i].getAttribute("data-at-n");
          bs[i].className = n <= S.done ? "at-done" : (n === S.want ? "at-on" : "");
        }
      }
    }

    function paintCal() {
      if (cards) cards.innerHTML = calCards(T);
      var C = calibration();
      if (chipWhole) chipWhole.textContent = "all sixteen traced (" + C.full.length + ")";
      if (chipPart) chipPart.textContent = "some traces missing (" + C.part.length + ")";
      if (calWrap) calWrap.innerHTML = calSvg(T, calOn, calSel) || waiting;
      if (calLive) {
        calLive.innerHTML = C.med === null
          ? "The traces are not read yet."
          : ("Traces recover about <b>" + pctStr(100 * C.med) + "</b> of scoreboard damage, " +
             "over " + C.full.length + " fully traced matches.");
      }
    }

    if (loadSeg) {
      loadSeg.addEventListener("click", function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute("data-at-n")) return;
        var n = +b.getAttribute("data-at-n");
        if (n <= S.done) return;
        want(T, n);
        paintLoader();
      });
    }
    var calChips = root.querySelectorAll("[data-at-cal-chip]");
    for (var ci = 0; ci < calChips.length; ci++) {
      calChips[ci].addEventListener("click", function (e) {
        var el = e.currentTarget, k = el.getAttribute("data-at-cal-chip");
        calOn[k] = !calOn[k];
        if (calOn[k]) el.classList.remove("at-off"); else el.classList.add("at-off");
        paintCal();
      });
    }
    if (calWrap) {
      calWrap.addEventListener("click", function (e) {
        var el = e.target;
        var id = el && el.getAttribute ? el.getAttribute("data-at-cal") : null;
        if (!id) return;
        calSel = id;
        var m = null;
        for (var i = 0; i < S.matches.length; i++) if (S.matches[i].id === id) m = S.matches[i];
        if (m && calRead) {
          calRead.innerHTML = "<b>" + T.esc(m.map) + "</b>: dealt <b>" +
            T.fmtNum(Math.round(m.dmg)) + "</b>, destroyed <b>" +
            T.fmtNum(Math.round(m.lost)) + "</b> (" +
            pctStr(m.dmg ? 100 * m.lost / m.dmg : 0) + "). Traces " + m.traced + "/" + m.seats +
            ". Repaired " + T.fmtNum(Math.round(m.rep)) +
            '. <span class="mono">' + T.esc(m.id) + "</span>";
        }
        paintCal();
      });
    }

    // ---- panel 2 -------------------------------------------------------
    var exWrap = root.querySelector("#at-ex");
    var exRead = root.querySelector("#at-ex-read");
    var exSeg = root.querySelector("#at-out-seg");
    var exMin = root.querySelector("#at-ex-min");
    var exMinOut = root.querySelector("#at-ex-min-out");
    var outMode = OUT_MODES[0].key;
    var exSel = null;

    function paintEx() {
      var v = exMin ? +exMin.value : 15;
      if (exMinOut) exMinOut.textContent = v + " games";
      if (exWrap) exWrap.innerHTML = frontierSvg(T, outMode, v, exSel) || waiting;
      if (exRead && exSel) {
        var agg = tankAgg(), e = null;
        for (var i = 0; i < agg.length; i++) if (agg[i].label === exSel) e = agg[i];
        if (e && e.lost > 0) {
          exRead.innerHTML = "<b>" + T.esc(e.label) + "</b> (n=" + T.fmtNum(e.n) +
            "): <b>" + T.fmtNum(Math.round(e.dmg / e.n)) + "</b> dmg, <b>" +
            T.fmtNum(Math.round(e.assist / e.n)) + "</b> assist, <b>" +
            T.fmtNum(Math.round(e.blocked / e.n)) + "</b> blocked per game vs <b>" +
            T.fmtNum(Math.round(e.lost / e.n)) + "</b> lost. Ratio <b>" +
            r2(outputOf(e, outMode) / e.lost) + "</b>. Killed <b>" +
            pctStr(100 * e.died / e.n) + "</b>.";
        }
      }
    }
    if (exSeg) {
      exSeg.addEventListener("click", function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute("data-at-out")) return;
        outMode = b.getAttribute("data-at-out");
        var bs = exSeg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("at-on");
        b.classList.add("at-on");
        paintEx();
      });
    }
    if (exMin) exMin.addEventListener("input", paintEx);
    if (exWrap) {
      exWrap.addEventListener("click", function (e) {
        var el = e.target;
        var nm = el && el.getAttribute ? el.getAttribute("data-at-tank") : null;
        if (!nm) return;
        exSel = exSel === nm ? null : nm;
        if (!exSel && exRead) {
          exRead.innerHTML = '<span class="at-dim">Click a tank for its side of the ledger.</span>';
        }
        paintEx();
      });
    }

    // ---- panel 3 -------------------------------------------------------
    var costWrap = root.querySelector("#at-cost");
    var costSeg = root.querySelector("#at-cost-seg");
    var costMin = root.querySelector("#at-cost-min");
    var costMinOut = root.querySelector("#at-cost-min-out");
    var costRead = root.querySelector("#at-cost-read");
    var costLive = root.querySelector("#at-cost-live");
    var costMode = COST_MODES[0].key;

    function costSpec() {
      for (var i = 0; i < COST_MODES.length; i++) {
        if (COST_MODES[i].key === costMode) return COST_MODES[i];
      }
      return COST_MODES[0];
    }
    function paintCost() {
      var v = costMin ? +costMin.value : 15;
      var spec = costSpec();
      if (costMinOut) {
        costMinOut.textContent = v + (spec.src === "sample" ? " games" : " kills");
      }
      var rows = costRows(T, costMode, v);
      if (costWrap) {
        costWrap.innerHTML = rows.length
          ? T.svgBarChart(rows, { width: 980, labelWidth: 96, rowHeight: 24,
                                  gridColor: "rgba(255,255,255,0.10)" })
          : (spec.src === "sample" ? waiting :
             '<p class="at-thin">Nothing clears that minimum.</p>');
      }
      if (costRead) {
        if (!rows.length) costRead.innerHTML = '<span class="at-dim">Not read yet.</span>';
        else {
          var lo = rows[rows.length - 1], hi = rows[0];
          costRead.innerHTML = T.esc(spec.name) + ", " + rows.length + " tanks. Highest <b>" +
            T.esc(hi.label) + "</b> <b>" + T.fmtNum(hi.value) + "</b>, lowest <b>" +
            T.esc(lo.label) + "</b> <b>" + T.fmtNum(lo.value) + "</b>, spread <b>" +
            (lo.value > 0 ? r2(hi.value / lo.value) + "x" : "-") + "</b>.";
        }
      }
      if (costLive) {
        var agg = tankAgg(), k = 0, l = 0;
        for (var i = 0; i < agg.length; i++) { k += agg[i].kills; l += agg[i].lost; }
        costLive.innerHTML = k
          ? ("Overall: a kill costs about <b>" + T.fmtNum(Math.round(l / k)) +
             "</b> health, n=" + T.fmtNum(k) + " kills.")
          : "";
      }
    }
    if (costSeg) {
      costSeg.addEventListener("click", function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute("data-at-cost")) return;
        costMode = b.getAttribute("data-at-cost");
        var bs = costSeg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("at-on");
        b.classList.add("at-on");
        paintCost();
      });
    }
    if (costMin) costMin.addEventListener("input", paintCost);

    // ---- panel 4 -------------------------------------------------------
    var sepSum = root.querySelector("#at-sep-sum");
    var sepSeg = root.querySelector("#at-sep-seg");
    var sepThr = root.querySelector("#at-sep-thr");
    var sepThrOut = root.querySelector("#at-sep-thr-out");
    var sepHead = root.querySelector("#at-sep-head");
    var sepHistEl = root.querySelector("#at-sep-hist");
    var sepRead = root.querySelector("#at-sep-read");
    var sepKey = SEP_COLS[2].key;

    function paintSep() {
      var thr = sepThr ? +sepThr.value : 0;
      if (sepThrOut) {
        sepThrOut.textContent = thr === 0 ? "any margin at all" : thr + "% of the other side";
      }
      if (sepSum) sepSum.innerHTML = sepSummary(T, sepKey, thr) || waiting;
      var got = sepLead(T, sepKey, thr);
      var spec = null, i;
      for (i = 0; i < SEP_COLS.length; i++) if (SEP_COLS[i].key === sepKey) spec = SEP_COLS[i];
      if (sepHead) {
        sepHead.innerHTML = got
          ? ('<div><div class="at-k">Winning side ahead</div><div class="at-v">' +
             pctStr(got.share) + "</div></div>" +
             '<div><div class="at-k">Matches</div><div class="at-v">' + T.fmtNum(got.n) +
             "</div></div>" +
             '<div><div class="at-k">Median winner, per player</div><div class="at-v">' +
             T.fmtNum(Math.round(got.medW)) + "</div></div>" +
             '<div><div class="at-k">Median loser, per player</div><div class="at-v">' +
             T.fmtNum(Math.round(got.medL)) + "</div></div>" +
             '<div><div class="at-k">Winner&#39;s edge</div><div class="at-v">' +
             (got.edge === null ? "-" : pctStr(got.edge)) + "</div></div>")
          : '<div><div class="at-k">Waiting</div><div class="at-v">-</div></div>';
      }
      if (sepHistEl) sepHistEl.innerHTML = sepHist(T, sepKey) || "";
      if (sepRead) {
        if (!got) sepRead.innerHTML = '<span class="at-dim">Not read yet.</span>';
        else {
          sepRead.innerHTML = "<b>" + T.esc(spec ? spec.name.toLowerCase() : sepKey) +
            "</b>: winner ahead in <b>" + T.fmtNum(got.ahead) + "</b> of " +
            T.fmtNum(got.n) + " (<b>" + pctStr(got.share) + "</b>). " +
            (spec && spec.src === "sample"
              ? '<span class="at-dim">Sampled matches only.</span>'
              : '<span class="at-dim">Full archive.</span>');
        }
      }
    }
    if (sepSeg) {
      sepSeg.addEventListener("click", function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute("data-at-sep")) return;
        sepKey = b.getAttribute("data-at-sep");
        var bs = sepSeg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("at-on");
        b.classList.add("at-on");
        paintSep();
      });
    }
    if (sepThr) sepThr.addEventListener("input", paintSep);

    // ---- panel 5 -------------------------------------------------------
    var repHead = root.querySelector("#at-rep-head");
    var repWrap = root.querySelector("#at-rep");
    var repSeg = root.querySelector("#at-rep-seg");
    var repMin = root.querySelector("#at-rep-min");
    var repMinOut = root.querySelector("#at-rep-min-out");
    var repThr = root.querySelector("#at-rep-thr");
    var repThrOut = root.querySelector("#at-rep-thr-out");
    var repColsEl = root.querySelector("#at-rep-cols");
    var repRead = root.querySelector("#at-rep-read");
    var repMode = REP_MODES[0].key;

    function paintRep() {
      var minN = repMin ? +repMin.value : 15;
      var thr = repThr ? +repThr.value : 0;
      if (repMinOut) repMinOut.textContent = minN + " games";
      if (repThrOut) {
        repThrOut.textContent = thr === 0 ? "any repair at all" : thr + " points or more";
      }
      var lost = 0, rep = 0, any = 0, shares = [], i;
      for (i = 0; i < S.rows.length; i++) {
        lost += S.rows[i].lost; rep += S.rows[i].rep;
        if (S.rows[i].rep > 0) {
          any++;
          if (S.rows[i].hp > 0) shares.push(100 * S.rows[i].rep / S.rows[i].hp);
        }
      }
      if (repHead) {
        repHead.innerHTML = S.rows.length
          ? ('<div><div class="at-k">Repaired against destroyed</div><div class="at-v">' +
             (lost > 0 ? pctStr(100 * rep / lost) : "-") + "</div></div>" +
             '<div><div class="at-k">Player games with any repair</div><div class="at-v">' +
             pctStr(100 * any / S.rows.length) + "</div></div>" +
             '<div><div class="at-k">Median repair, where there was one</div><div class="at-v">' +
             (shares.length ? pctStr(medOf(shares)) + " of pool" : "-") + "</div></div>" +
             '<div><div class="at-k">Traces read</div><div class="at-v">' +
             T.fmtNum(S.rows.length) + "</div></div>")
          : '<div><div class="at-k">Waiting</div><div class="at-v">-</div></div>';
      }
      var rows = repRows(T, repMode, minN);
      if (repWrap) {
        repWrap.innerHTML = rows.length
          ? T.svgBarChart(rows, { width: 980, labelWidth: 96, rowHeight: 24,
                                  gridColor: "rgba(255,255,255,0.10)" })
          : waiting;
      }
      if (repColsEl) repColsEl.innerHTML = S.rows.length ? repCols(T, thr) : "";
      if (repRead) {
        var sp = repSplit(thr);
        repRead.innerHTML = (sp.rep.n && sp.dry.n)
          ? ("Patched <b>" + T.fmtNum(sp.rep.n) + "</b> vs unpatched <b>" + T.fmtNum(sp.dry.n) +
             "</b>. Died: <b>" + pctStr(100 * sp.rep.died / sp.rep.n) + "</b> vs <b>" +
             pctStr(100 * sp.dry.died / sp.dry.n) + "</b>. Correlation, not cause.")
          : '<span class="at-dim">Not read yet.</span>';
      }
    }
    if (repSeg) {
      repSeg.addEventListener("click", function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute("data-at-rep")) return;
        repMode = b.getAttribute("data-at-rep");
        var bs = repSeg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("at-on");
        b.classList.add("at-on");
        paintRep();
      });
    }
    if (repMin) repMin.addEventListener("input", paintRep);
    if (repThr) repThr.addEventListener("input", paintRep);

    // ---- panel 6 -------------------------------------------------------
    var cloudWrap = root.querySelector("#at-cloud");
    var cloudSeg = root.querySelector("#at-cloud-seg");
    var cloudSel = root.querySelector("#at-cloud-tank");
    var cloudRead = root.querySelector("#at-cloud-read");
    var cloudK1 = root.querySelector("#at-cloud-k1");
    var cloudK2 = root.querySelector("#at-cloud-k2");
    var cloudMode = CLOUD_MODES[0].key;
    var cloudPick = "*";
    var cloudFilled = 0;

    function fillTankSelect() {
      if (!cloudSel) return;
      var agg = tankAgg();
      if (agg.length === cloudFilled) return;
      cloudFilled = agg.length;
      var html = '<option value="*">every tank</option>', i;
      var byName = agg.slice().sort(function (a, b) {
        return a.label < b.label ? -1 : (a.label > b.label ? 1 : 0);
      });
      for (i = 0; i < byName.length; i++) {
        html += '<option value="' + T.esc(byName[i].label) + '"' +
          (byName[i].label === cloudPick ? " selected" : "") + ">" +
          T.esc(byName[i].label) + " (" + byName[i].n + ")</option>";
      }
      cloudSel.innerHTML = html;
    }

    function paintCloud() {
      fillTankSelect();
      if (cloudK1) {
        cloudK1.textContent = cloudMode === "fate" ? "still alive at the end"
          : (cloudMode === "result" ? "on the winning side" : "one colour per tank");
      }
      if (cloudK2) {
        cloudK2.textContent = cloudMode === "fate" ? "killed"
          : (cloudMode === "result" ? "on the losing side" : "");
      }
      if (cloudWrap) cloudWrap.innerHTML = cloudSvg(T, cloudMode, cloudPick) || waiting;
      if (cloudRead) {
        var xs = [], ys = [], above = 0, n = 0, i;
        for (i = 0; i < S.rows.length; i++) {
          var r = S.rows[i];
          if (cloudPick !== "*" && r.tank !== cloudPick) continue;
          n++; xs.push(r.lost); ys.push(r.dmg);
          if (r.dmg > r.lost) above++;
        }
        cloudRead.innerHTML = n
          ? ("<b>" + T.esc(cloudPick === "*" ? "Every tank" : cloudPick) + "</b> (n=" +
             T.fmtNum(n) + "): median lost <b>" +
             T.fmtNum(Math.round(medOf(xs))) + "</b>, dealt <b>" +
             T.fmtNum(Math.round(medOf(ys))) + "</b>. Above break-even: <b>" +
             pctStr(100 * above / n) + "</b>.")
          : '<span class="at-dim">Not read yet.</span>';
      }
    }
    if (cloudSeg) {
      cloudSeg.addEventListener("click", function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute("data-at-cloud")) return;
        cloudMode = b.getAttribute("data-at-cloud");
        var bs = cloudSeg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("at-on");
        b.classList.add("at-on");
        paintCloud();
      });
    }
    if (cloudSel) {
      cloudSel.addEventListener("change", function (e) {
        cloudPick = e.target.value || "*";
        paintCloud();
      });
    }

    // ---- shared repaint -------------------------------------------------
    REPAINT = function (heavy) {
      if (!alive()) return;
      paintLoader();
      if (!heavy) return;
      paintCal(); paintEx(); paintCost(); paintSep(); paintRep(); paintCloud();
    };

    REPAINT(true);
    // Default sample: every eighth match. Bigger samples are one click away
    // and the buttons say what they cost.
    var L = levels();
    want(T, L.length ? L[0].n : 0);
    paintLoader();
  }

  // ================================================================ preview
  //
  // The crudest exchange rate in the archive, and the only one available
  // without reading a single deep file: kills against deaths for every tank,
  // as a spine with a bar for each side of the ledger. Built from
  // stats.json, which is loaded before any tile is drawn.
  function preview(T) {
    var kl = (T && T.STATS && T.STATS.tank_kills) || [];
    var dl = (T && T.STATS && T.STATS.tank_deaths) || [];
    if (kl.length < 6 || dl.length < 6) return "";
    var dmap = {}, i;
    for (i = 0; i < dl.length; i++) dmap[dl[i].label] = dl[i].count || 0;
    var rows = [];
    for (i = 0; i < kl.length; i++) {
      var k = kl[i].count || 0, d = dmap[kl[i].label] || 0;
      if (k + d < 40) continue;
      rows.push({ dev: k / (d || 1) - 1 });
    }
    if (rows.length < 5) return "";
    rows.sort(function (a, b) { return b.dev - a.dev; });
    var mx = 0;
    for (i = 0; i < rows.length; i++) if (Math.abs(rows[i].dev) > mx) mx = Math.abs(rows[i].dev);
    if (!(mx > 0)) return "";

    var cx = 116, top = 12, pitch = Math.min(11, 146 / rows.length), h = Math.max(4, pitch - 2.4);
    var out = '<rect x="0" y="0" width="240" height="240" fill="#0c1226"/>';
    for (i = 0; i < rows.length; i++) {
      var y = top + i * pitch;
      var w = Math.max(3, (Math.abs(rows[i].dev) / mx) * 104);
      var up = rows[i].dev >= 0;
      out += '<rect x="' + (up ? cx + 2 : cx - 2 - w).toFixed(1) + '" y="' + y.toFixed(1) +
        '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.6" fill="' +
        (up ? "#f0b95e" : "#ef7a63") + '"/>';
    }
    out += '<rect x="' + (cx - 1) + '" y="' + (top - 5) + '" width="2" height="' +
      (rows.length * pitch + 8).toFixed(1) + '" fill="#aab8e8"/>';
    return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice">' + out + "</svg>";
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "attrition",
    title: "Attrition",
    blurb: "The damage economy: what a kill costs, and which tanks trade up.",
    accent: "#8c6739",
    css: CSS,
    gated: false,
    preview: preview,
    render: render,
    wire: wire
  });
})();

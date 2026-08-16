/* TYR suite: "Openings" -- the first ninety seconds.
 *
 * Endgame owns how a match finishes. This page owns how one starts, and the
 * single claim it is here to test: does the opening predict the ending.
 *
 * WHERE THE OPENING COMES FROM. site_data.json carries survival_sec for every
 * player, which is the second their health reached zero. Sort a match's rows
 * by it and you have the death order and the death clock without loading a
 * single per-match file. The first entry is first blood.
 *
 * WHO GOT IT. survival_sec names the victim, never the killer. Nobody
 * respawns in Tyr and no first death in the archive is a team kill or a
 * suicide, checked against the killerTeam field of deathEvents in all 308
 * per-match files, so the side that drew first blood is exactly the side that
 * did NOT lose the tank. That inference is what this page uses. Cross-checked
 * against deathEvents match by match it agrees on the time and the victim side
 * in 306 of 308 matches, and reproduces the build script's own published
 * figures: median 87.5 seconds against its 87.4, first-blood win rate 69.8%
 * against its 68.9%. The build script's number rests on a smaller 238 match
 * slice; this page uses all 291 decided matches that have a readable opening.
 *
 * WHAT IS MISSING. About 9.5% of player rows have no survival_sec, but they
 * are overwhelmingly winners who were never killed: 15.4% of winning-side rows
 * against 0.5% of losing-side rows. A player who survived has no death to
 * record, so the gap costs the death CLOCK almost nothing. The cumulative
 * attrition curves on this page were rebuilt from deathEvents as a check and
 * agreed to within 0.04 of a tank at every step out to five minutes.
 *
 * THE KILLER'S TANK is the one thing that genuinely cannot be derived here, so
 * the tank panel uses the build script's own first_blood_by_tank, and carries
 * that aggregate's own hole: 63 of 308 openings have no identified killer tank.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var CSS = "" +
    ".ope-wrap .avg-panel{overflow:hidden}" +
    ".ope-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:2px 0 14px}" +
    ".ope-lab{font-size:.68rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em}" +
    ".ope-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-wrap:wrap}" +
    ".ope-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.8rem;padding:6px 13px;cursor:pointer}" +
    ".ope-seg button+button{border-left:1px solid var(--border)}" +
    ".ope-seg button.ope-on{background:rgba(122,150,66,.30);color:var(--text)}" +
    ".ope-chip{display:inline-flex;align-items:center;gap:7px;background:var(--panel2);border:1px solid var(--border);border-radius:20px;color:var(--text);font:inherit;font-size:.78rem;padding:5px 13px;cursor:pointer}" +
    ".ope-chip i{width:11px;height:11px;border-radius:3px;display:inline-block}" +
    ".ope-chip.ope-off{opacity:.34}" +
    ".ope-range{width:230px;max-width:44vw;accent-color:#8fae4a;vertical-align:middle}" +
    ".ope-sel{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.82rem;padding:6px 10px;max-width:min(520px,88vw)}" +
    ".ope-read{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:13px;padding-top:12px;border-top:1px solid var(--border)}" +
    ".ope-read .ope-k{font-size:.64rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}" +
    ".ope-read .ope-v{font-size:1.16rem;font-weight:700;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".ope-say{margin:13px 0 0;font-size:.94rem;line-height:1.68}" +
    ".ope-say b{color:#c2dd72;font-variant-numeric:tabular-nums}" +
    ".ope-note-in{margin-top:11px;padding:10px 13px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;font-size:.85rem;line-height:1.7;min-height:1.7em}" +
    ".ope-note-in .ope-dim{color:var(--dim)}" +
    ".ope-note-in b{color:#c2dd72;font-variant-numeric:tabular-nums}" +
    ".ope-scroll{overflow-x:auto}" +
    ".ope-svg{width:100%;height:auto;display:block}" +
    ".ope-hit{cursor:pointer}" +
    ".ope-two{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px}" +
    ".ope-col{flex:1 1 260px;border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--panel2)}" +
    ".ope-col h3{margin:0 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;font-weight:700}" +
    ".ope-col dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:5px 14px;font-size:.86rem}" +
    ".ope-col dt{color:var(--dim)}" +
    ".ope-col dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}" +
    ".ope-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.75rem;color:var(--dim);margin:0 0 9px}" +
    ".ope-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}" +
    ".ope-sub{margin:20px 0 8px;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;color:var(--dim);font-weight:700}" +
    ".ope-tl{width:100%;border-collapse:collapse;font-size:.84rem;margin-top:10px}" +
    ".ope-tl th{text-align:left;font-size:.64rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;padding:4px 10px 6px;border-bottom:1px solid var(--border)}" +
    ".ope-tl td{padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.045);font-variant-numeric:tabular-nums}" +
    ".ope-tl td.ope-n{text-align:right}";

  // ------------------------------------------------------------------ paint
  //
  // The suite accent is an olive; everything that means "the opening" sits in
  // that family, everything that means "the rest of the match" is cool, and
  // the two outcome colours are the same green and brick the rest of the site
  // uses for won and lost.
  var LIME = "#9fbe4e";      // the opening
  var OLIVE = "#5a6d39";     // the accent, used for structure
  var COOL = "#48708a";      // the rest of the match
  var WONC = "#6f9a4a";      // the side that drew first blood went on to win
  var LOSTC = "#b0563c";     // it went on to lose
  var AMBER = "#d3963f";
  var GRIDL = "rgba(255,255,255,0.08)";
  var GRIDM = "rgba(255,255,255,0.22)";

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
  function medOf(list) { return quant(list.slice().sort(sortNum), 0.5); }
  function txt(x, y, s, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || "chart-axis-label") +
      '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + s + "</text>";
  }
  // A Wilson score interval. A normal-approximation interval runs off the end
  // of the scale on the small buckets here (one of them is 20 for 20), and a
  // panel whose whole point is "do not over-read this" cannot then draw an
  // upper bound of 112%.
  function wilson(c, n) {
    if (!n) return [0, 0];
    var z = 1.96, p = c / n, d = 1 + z * z / n;
    var ctr = (p + z * z / (2 * n)) / d;
    var h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return [100 * Math.max(0, ctr - h), 100 * Math.min(1, ctr + h)];
  }
  function pearson(a, b) {
    var n = a.length, i, ma = 0, mb = 0;
    if (n < 3) return null;
    for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    var num = 0, da = 0, db = 0;
    for (i = 0; i < n; i++) {
      num += (a[i] - ma) * (b[i] - mb);
      da += (a[i] - ma) * (a[i] - ma);
      db += (b[i] - mb) * (b[i] - mb);
    }
    return (da > 0 && db > 0) ? num / Math.sqrt(da * db) : null;
  }

  // ------------------------------------------------------ archive (cached)
  //
  // One pass over T.DATA.matches. Every panel except the tank one reads this.
  var _built = null;
  function build(T) {
    if (_built) return _built;
    var src = (T && T.DATA && T.DATA.matches) || [];
    var rows = [], skipped = 0, i, j;
    for (i = 0; i < src.length; i++) {
      var m = src[i], ps = m.players || [];
      if (ps.length < 10) { skipped++; continue; }
      var dur = n2(m.duration_sec);
      if (dur === null || dur <= 0) { skipped++; continue; }
      var deaths = [], roster = [0, 0];
      for (j = 0; j < ps.length; j++) {
        var p = ps[j], tm = p.team;
        if (tm !== 0 && tm !== 1) continue;
        roster[tm]++;
        var sv = n2(p.survival_sec), pc = n2(p.survival_pct);
        if (sv === null || pc === null) continue;
        if (pc >= 100) continue;              // never died
        if (sv >= dur - 0.05) continue;       // alive at the whistle
        deaths.push({ t: sv, team: tm, tank: p.tank || "" });
      }
      if (!deaths.length) { skipped++; continue; }
      deaths.sort(function (a, b) { return a.t - b.t; });
      var w = (m.winning_team === 0 || m.winning_team === 1) ? m.winning_team : null;
      var first = deaths[0], fbTeam = 1 - first.team;
      var answer = null;
      for (j = 1; j < deaths.length; j++) {
        if (deaths[j].team !== first.team) { answer = deaths[j].t - first.t; break; }
      }
      rows.push({
        id: m.match_id, map: m.map || "Unknown", dur: dur,
        win: w, wt: (m.win_type === "capture" ? "capture" : "elimination"),
        deaths: deaths, roster: roster,
        fb: first.t, fbTeam: fbTeam, fbTank: first.tank,
        fbWon: w === null ? null : (fbTeam === w),
        answer: answer,
        secondTeam: deaths.length > 1 ? deaths[1].team : null,
        left: dur - first.t
      });
    }
    var dec = [], fbTimes = [], durs = [], i2;
    for (i2 = 0; i2 < rows.length; i2++) {
      fbTimes.push(rows[i2].fb);
      durs.push(rows[i2].dur);
      if (rows[i2].win !== null) dec.push(rows[i2]);
    }
    fbTimes.sort(sortNum); durs.sort(sortNum);
    var won = 0;
    for (i2 = 0; i2 < dec.length; i2++) if (dec[i2].fbWon) won++;
    _built = {
      rows: rows, decided: dec, skipped: skipped,
      fbSorted: fbTimes, durSorted: durs,
      fbWins: won,
      total: (T && T.DATA && T.DATA.matches ? T.DATA.matches.length : 0)
    };
    return _built;
  }

  // =========================================================== panel 1
  // The distribution of first blood, with a movable line between an early
  // opening and a late one, and the two halves compared underneath.
  var BIN = 8;    // seconds per histogram bar
  var HLO = 40, HHI = 216;

  function fbHist(T) {
    var B = build(T), h = [], i;
    var nb = Math.ceil((HHI - HLO) / BIN);
    for (i = 0; i < nb; i++) h.push({ lo: HLO + i * BIN, hi: HLO + (i + 1) * BIN, n: 0, won: 0, lost: 0, und: 0 });
    for (i = 0; i < B.rows.length; i++) {
      var r = B.rows[i], k = Math.floor((r.fb - HLO) / BIN);
      if (k < 0) k = 0;
      if (k >= nb) k = nb - 1;
      h[k].n++;
      if (r.fbWon === true) h[k].won++;
      else if (r.fbWon === false) h[k].lost++;
      else h[k].und++;
    }
    return h;
  }

  function histSvg(T, thr) {
    var h = fbHist(T), B = build(T);
    if (!h.length) return "";
    var W = 1000, H = 340, padL = 54, padR = 20, padT = 20, padB = 48;
    var mx = 1, i;
    for (i = 0; i < h.length; i++) if (h[i].n > mx) mx = h[i].n;
    mx = Math.ceil(mx / 5) * 5;
    var barW = (W - padL - padR) / h.length;
    function yAt(v) { return H - padB - (v / mx) * (H - padT - padB); }
    function xAt(sec) { return padL + ((sec - HLO) / (HHI - HLO)) * (W - padL - padR); }
    var out = "", t;
    for (t = 0; t <= 4; t++) {
      var gv = mx * t / 4;
      out += '<line x1="' + padL + '" y1="' + yAt(gv).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(gv).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(padL - 8, yAt(gv) + 4, String(Math.round(gv)), null, "end");
    }
    for (i = 0; i < h.length; i++) {
      var b = h[i];
      if (!b.n) continue;
      var x = padL + i * barW, hgt = (H - padT - padB) * b.n / mx;
      var early = b.hi <= thr;
      var col = early ? LIME : COOL;
      out += '<rect x="' + (x + 1.6).toFixed(1) + '" y="' + yAt(b.n).toFixed(1) + '" width="' +
        (barW - 3.2).toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="2" fill="' + col +
        '" fill-opacity="' + (early ? "0.95" : "0.55") + '"><title>' +
        T.esc(mmss(b.lo) + " to " + mmss(b.hi) + ": " + b.n + " matches, first-blood side won " +
              b.won + " of " + (b.won + b.lost)) + "</title></rect>";
    }
    // the median, and the movable threshold
    var med = quant(B.fbSorted, 0.5);
    out += '<line x1="' + xAt(med).toFixed(1) + '" y1="' + (padT - 6) + '" x2="' + xAt(med).toFixed(1) +
      '" y2="' + (H - padB) + '" stroke="' + GRIDM + '" stroke-dasharray="4 4"></line>' +
      txt(xAt(med) + 6, padT + 2, "median " + mmss(med), null, null);
    var tx = xAt(thr);
    out += '<line x1="' + tx.toFixed(1) + '" y1="' + (padT - 12) + '" x2="' + tx.toFixed(1) +
      '" y2="' + (H - padB + 6) + '" stroke="#e6d16b" stroke-width="2.2"></line>' +
      txt(tx - 7, padT - 4, "early", null, "end") +
      txt(tx + 7, padT - 4, "late", null, null);
    for (t = HLO; t <= HHI; t += 20) {
      out += txt(xAt(t).toFixed(1), H - padB + 17, mmss(t), null, "middle");
    }
    out += txt(W / 2, H - 8, "first tank died, seconds in", null, "middle");
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function thrCols(T, thr) {
    var B = build(T);
    var sets = [
      { label: "Early opening", col: LIME, list: [] },
      { label: "Late opening", col: COOL, list: [] }
    ];
    var i;
    for (i = 0; i < B.rows.length; i++) {
      (B.rows[i].fb < thr ? sets[0].list : sets[1].list).push(B.rows[i]);
    }
    var out = "";
    for (var s = 0; s < sets.length; s++) {
      var L = sets[s].list, dur = [], left = [], deaths = [], won = 0, dn = 0, elim = 0;
      for (i = 0; i < L.length; i++) {
        dur.push(L[i].dur); left.push(L[i].left); deaths.push(L[i].deaths.length);
        if (L[i].wt === "elimination") elim++;
        if (L[i].win !== null) { dn++; if (L[i].fbWon) won++; }
      }
      var ci = wilson(won, dn);
      out += '<div class="ope-col" style="border-color:' + sets[s].col + '">' +
        '<h3 style="color:' + sets[s].col + '">' + sets[s].label +
        (s === 0 ? " (before " + mmss(thr) + ")" : " (" + mmss(thr) + " or later)") + "</h3><dl>" +
        "<dt>Matches</dt><dd>" + T.fmtNum(L.length) + "</dd>" +
        "<dt>Median first blood</dt><dd>" + mmss(medOf(dur.length ? L.map(function (r) { return r.fb; }) : [])) + "</dd>" +
        "<dt>Median match length</dt><dd>" + mmss(medOf(dur)) + "</dd>" +
        "<dt>Median time left after it</dt><dd>" + mmss(medOf(left)) + "</dd>" +
        "<dt>Median deaths in the match</dt><dd>" + T.fmtNum(medOf(deaths)) + "</dd>" +
        "<dt>Ended by elimination</dt><dd>" + (L.length ? Math.round(100 * elim / L.length) : 0) + "%</dd>" +
        "<dt>First-blood side won (" + dn + ")</dt><dd>" +
        (dn ? pctStr(100 * won / dn) + ' <span class="ope-dim" style="font-weight:400;color:var(--dim)">&plusmn;' +
              Math.round((ci[1] - ci[0]) / 2) + "</span>" : "-") + "</dd>" +
        "</dl></div>";
    }
    return out;
  }

  function panelShape(T) {
    var B = build(T), S = (T && T.STATS) || {};
    if (B.rows.length < 30) return "";
    var med = quant(B.fbSorted, 0.5);
    var p10 = quant(B.fbSorted, 0.1), p90 = quant(B.fbSorted, 0.9);
    var medDur = quant(B.durSorted, 0.5);
    var shares = [], i;
    for (i = 0; i < B.rows.length; i++) shares.push(100 * B.rows[i].fb / B.rows[i].dur);
    var kp = S.kill_phase || [], kpTot = 0, kpEarly = null;
    for (i = 0; i < kp.length; i++) {
      kpTot += kp[i].count || 0;
      if (kp[i].label === "Early") kpEarly = kp[i].count || 0;
    }
    var cards =
      T.card("Matches with a readable opening", T.fmtNum(B.rows.length)) +
      T.card("Median first blood", mmss(med)) +
      T.card("Middle 80% of them", mmss(p10) + " to " + mmss(p90)) +
      T.card("Earliest ever seen", mmss(B.fbSorted[0])) +
      T.card("Median share of the match gone", pctStr(medOf(shares)));

    var body =
      '<div class="stat-grid" style="margin-bottom:14px">' + cards + "</div>" +
      '<div class="ope-ctl">' +
      '<span class="ope-lab">Early opening cutoff</span>' +
      '<input type="range" class="ope-range" id="ope-thr" min="50" max="150" step="2" value="88">' +
      '<span class="ope-lab" id="ope-thr-out"></span>' +
      "</div>" +
      '<div class="ope-scroll" id="ope-hist"></div>' +
      '<div class="ope-two" id="ope-thr-cols"></div>' +
      (kpEarly !== null && kpTot > 0
        ? '<p class="ope-say">First blood lands at <b>' + mmss(med) +
          "</b>. Only <b>" + pctStr(100 * kpEarly / kpTot) + "</b> of all kills come in the " +
          "first third of a match.</p>"
        : "");

    var note =
      "Built from " + T.fmtNum(B.rows.length) + " of " + T.fmtNum(B.total) +
      " matches. The two columns describe; they control for nothing. " +
      "&plusmn; is a 95% Wilson interval.";
    return T.bigPanel("The first ninety seconds", body, note);
  }

  // =========================================================== panel 2
  // Does first blood win? Bucketed several ways, with intervals, because the
  // honest answer is "less than the headline number suggests".
  var SPLITS = [
    { key: "when", name: "When it landed" },
    { key: "answer", name: "Was it answered" },
    { key: "speed", name: "How fast the answer came" },
    { key: "ending", name: "How the match ended" },
    { key: "map", name: "The map" }
  ];
  var WHEN_EDGES = [0, 60, 75, 90, 105, 120, 150, 1e9];

  function splitRows(T, key) {
    var B = build(T), dec = B.decided, i, out = [], order = [], acc = {};
    function bump(k, r) {
      if (!acc[k]) { acc[k] = { key: k, n: 0, w: 0 }; order.push(k); }
      acc[k].n++;
      if (r.fbWon) acc[k].w++;
    }
    if (key === "when") {
      for (i = 0; i < WHEN_EDGES.length - 1; i++) {
        var lo = WHEN_EDGES[i], hi = WHEN_EDGES[i + 1];
        var nm = i === 0 ? "Before " + mmss(hi)
               : (hi > 1e8 ? "After " + mmss(lo) : mmss(lo) + " to " + mmss(hi));
        acc[nm] = { key: nm, n: 0, w: 0 }; order.push(nm);
      }
      for (i = 0; i < dec.length; i++) {
        for (var e = 0; e < WHEN_EDGES.length - 1; e++) {
          if (dec[i].fb >= WHEN_EDGES[e] && dec[i].fb < WHEN_EDGES[e + 1]) {
            var nm2 = e === 0 ? "Before " + mmss(WHEN_EDGES[1])
                    : (WHEN_EDGES[e + 1] > 1e8 ? "After " + mmss(WHEN_EDGES[e])
                       : mmss(WHEN_EDGES[e]) + " to " + mmss(WHEN_EDGES[e + 1]));
            acc[nm2].n++;
            if (dec[i].fbWon) acc[nm2].w++;
            break;
          }
        }
      }
    } else if (key === "answer") {
      order = ["The same side lost the next tank too", "The other side hit back next"];
      acc[order[0]] = { key: order[0], n: 0, w: 0 };
      acc[order[1]] = { key: order[1], n: 0, w: 0 };
      for (i = 0; i < dec.length; i++) {
        if (dec[i].secondTeam === null) continue;
        var k1 = dec[i].secondTeam === dec[i].deaths[0].team ? order[0] : order[1];
        acc[k1].n++;
        if (dec[i].fbWon) acc[k1].w++;
      }
    } else if (key === "speed") {
      order = ["Answered inside 15s", "Answered in 15 to 40s", "Answered after 40s", "Never answered"];
      for (i = 0; i < order.length; i++) acc[order[i]] = { key: order[i], n: 0, w: 0 };
      for (i = 0; i < dec.length; i++) {
        var a = dec[i].answer;
        var k2 = a === null ? order[3] : (a < 15 ? order[0] : (a < 40 ? order[1] : order[2]));
        acc[k2].n++;
        if (dec[i].fbWon) acc[k2].w++;
      }
    } else if (key === "ending") {
      order = ["Elimination", "Capture"];
      for (i = 0; i < order.length; i++) acc[order[i]] = { key: order[i], n: 0, w: 0 };
      for (i = 0; i < dec.length; i++) {
        var k3 = dec[i].wt === "capture" ? "Capture" : "Elimination";
        acc[k3].n++;
        if (dec[i].fbWon) acc[k3].w++;
      }
    } else {
      for (i = 0; i < dec.length; i++) bump(dec[i].map, dec[i]);
      order.sort(function (x, y) { return acc[y].n - acc[x].n; });
    }
    for (i = 0; i < order.length; i++) {
      var c = acc[order[i]];
      if (!c || c.n < 5) continue;
      var ci = wilson(c.w, c.n);
      out.push({ label: order[i], n: c.n, w: c.w, p: 100 * c.w / c.n, lo: ci[0], hi: ci[1] });
    }
    return out;
  }

  function splitSvg(T, key, sel) {
    var rows = splitRows(T, key);
    if (!rows.length) return "";
    var W = 1000, labelW = 236, padR = 96, rowH = 40, top = 26;
    var H = top + rows.length * rowH + 32;
    function xAt(v) { return labelW + (clamp(v, 0, 100) / 100) * (W - labelW - padR); }
    var out = "", t, i;
    for (t = 0; t <= 5; t++) {
      var gv = t * 20;
      out += '<line x1="' + xAt(gv).toFixed(1) + '" y1="' + (top - 12) + '" x2="' + xAt(gv).toFixed(1) +
        '" y2="' + (H - 26) + '" stroke="' + (gv === 50 ? GRIDM : GRIDL) + '"' +
        (gv === 50 ? ' stroke-dasharray="5 4"' : "") + "></line>" +
        txt(xAt(gv).toFixed(1), H - 10, gv + "%", null, "middle");
    }
    out += txt(xAt(50), top - 16, "a coin flip", null, "middle");
    for (i = 0; i < rows.length; i++) {
      var r = rows[i], y = top + i * rowH + rowH / 2 - 4;
      var col = r.lo > 50 ? WONC : (r.hi < 50 ? LOSTC : AMBER);
      var isSel = sel === r.label;
      out += '<rect class="ope-hit" data-ope-split="' + T.esc(r.label) + '" x="0" y="' +
        (top + i * rowH - 4) + '" width="' + W + '" height="' + (rowH - 4) + '" rx="6" fill="' +
        (isSel ? "rgba(255,255,255,0.06)" : "transparent") + '"></rect>' +
        txt(labelW - 12, y + 4, T.esc(r.label), null, "end") +
        '<line x1="' + xAt(r.lo).toFixed(1) + '" y1="' + y + '" x2="' + xAt(r.hi).toFixed(1) +
        '" y2="' + y + '" stroke="' + col + '" stroke-width="9" stroke-opacity="0.30" ' +
        'stroke-linecap="round" pointer-events="none"></line>' +
        '<line x1="' + xAt(r.lo).toFixed(1) + '" y1="' + (y - 7) + '" x2="' + xAt(r.lo).toFixed(1) +
        '" y2="' + (y + 7) + '" stroke="' + col + '" stroke-opacity="0.75" pointer-events="none"></line>' +
        '<line x1="' + xAt(r.hi).toFixed(1) + '" y1="' + (y - 7) + '" x2="' + xAt(r.hi).toFixed(1) +
        '" y2="' + (y + 7) + '" stroke="' + col + '" stroke-opacity="0.75" pointer-events="none"></line>' +
        '<circle cx="' + xAt(r.p).toFixed(1) + '" cy="' + y + '" r="6.5" fill="' + col +
        '" stroke="rgba(10,14,31,0.75)" stroke-width="1.2" pointer-events="none"></circle>' +
        '<text x="' + (W - padR + 10) + '" y="' + (y + 4) + '" class="chart-axis-label">' +
        pctStr(r.p) + "</text>" +
        '<text x="' + (W - padR + 10) + '" y="' + (y + 16) + '" class="chart-axis-label" ' +
        'opacity="0.7">n=' + r.n + "</text>";
    }
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelDoesItWin(T) {
    var B = build(T);
    if (B.decided.length < 40) return "";
    var segs = "", i;
    for (i = 0; i < SPLITS.length; i++) {
      segs += '<button type="button" data-ope-split-key="' + SPLITS[i].key + '"' +
        (i === 0 ? ' class="ope-on"' : "") + ">" + SPLITS[i].name + "</button>";
    }
    var allCi = wilson(B.fbWins, B.decided.length);
    var ans = splitRows(T, "answer"), unanswered = null, traded = null;
    for (i = 0; i < ans.length; i++) {
      if (ans[i].label.indexOf("same side") >= 0) unanswered = ans[i];
      else traded = ans[i];
    }
    var say = "";
    if (unanswered && traded) {
      say = '<p class="ope-say">Unanswered first blood wins <b>' + pctStr(unanswered.p) +
        "</b> (n=" + unanswered.n + "). Traded, <b>" + pctStr(traded.p) + "</b> (n=" +
        traded.n + "). The second kill carries more weight than the first.</p>";
    }
    var body =
      '<div class="ope-read" style="border-top:0;padding-top:0;margin-top:0;margin-bottom:14px">' +
      '<div><div class="ope-k">First-blood side won</div><div class="ope-v">' +
      pctStr(100 * B.fbWins / B.decided.length) + "</div></div>" +
      '<div><div class="ope-k">95% interval</div><div class="ope-v">' +
      pctStr(allCi[0]) + " to " + pctStr(allCi[1]) + "</div></div>" +
      '<div><div class="ope-k">Decided matches</div><div class="ope-v">' +
      T.fmtNum(B.decided.length) + "</div></div>" +
      '<div><div class="ope-k">Matches it lost anyway</div><div class="ope-v">' +
      T.fmtNum(B.decided.length - B.fbWins) + "</div></div>" +
      "</div>" +
      '<div class="ope-ctl"><span class="ope-lab">Split by</span>' +
      '<span class="ope-seg" id="ope-split-seg">' + segs + "</span></div>" +
      '<div class="ope-scroll" id="ope-split"></div>' +
      '<div class="ope-note-in" id="ope-split-read"><span class="ope-dim">' +
      "Click a row.</span></div>" + say;

    var note =
      "Win rate of the first-blood side, dot and 95% Wilson interval. Rows under 5 matches " +
      "are dropped. <b>Correlation, not cause.</b> The &quot;never answered&quot; row is " +
      "close to circular: it is almost the definition of winning.";
    return T.bigPanel("Does first blood win?", body, note);
  }

  // =========================================================== panel 3
  // Cumulative tanks lost by the eventual winner and the eventual loser, with
  // a cursor you drag through the opening.
  var _clock = null;
  var CLOCK_STEP = 5;
  function clockCurves(T) {
    if (_clock) return _clock;
    var dec = build(T).decided, i, j;
    var maxT = 0;
    for (i = 0; i < dec.length; i++) if (dec[i].dur > maxT) maxT = dec[i].dur;
    maxT = Math.min(maxT, 600);
    var steps = Math.floor(maxT / CLOCK_STEP) + 1;
    var wLost = [], lLost = [], running = [], ahead = [];
    for (i = 0; i < steps; i++) { wLost.push(0); lLost.push(0); running.push(0); ahead.push(0); }
    for (i = 0; i < dec.length; i++) {
      var r = dec[i], wc = 0, lc = 0, k = 0;
      var ds = r.deaths;
      for (j = 0; j < steps; j++) {
        var t = j * CLOCK_STEP;
        while (k < ds.length && ds[k].t <= t) {
          if (ds[k].team === r.win) wc++; else lc++;
          k++;
        }
        wLost[j] += wc; lLost[j] += lc;
        if (lc > wc) ahead[j]++;
        if (r.dur >= t) running[j]++;
      }
    }
    for (i = 0; i < steps; i++) { wLost[i] /= dec.length; lLost[i] /= dec.length; }
    _clock = { w: wLost, l: lLost, running: running, ahead: ahead, n: dec.length, step: CLOCK_STEP, steps: steps };
    return _clock;
  }

  function clockSvg(T, cursor, span) {
    var C = clockCurves(T);
    if (!C.n) return "";
    var W = 1000, H = 380, padL = 58, padR = 24, padT = 20, padB = 50;
    var last = Math.min(C.steps - 1, Math.floor(span / C.step));
    var mx = Math.max(C.l[last], 1);
    mx = Math.ceil(mx * 1.08 * 2) / 2;
    function xAt(t) { return padL + (t / span) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mx) * (H - padT - padB); }
    var out = "", t, i;
    for (t = 0; t <= 4; t++) {
      var gv = mx * t / 4;
      out += '<line x1="' + padL + '" y1="' + yAt(gv).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(gv).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(padL - 8, yAt(gv) + 4, (Math.round(gv * 10) / 10).toFixed(1), null, "end");
    }
    var tickEvery = span <= 150 ? 15 : (span <= 300 ? 30 : 60);
    for (t = 0; t <= span; t += tickEvery) {
      out += '<line x1="' + xAt(t).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(t).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(t).toFixed(1), H - padB + 17, mmss(t), null, "middle");
    }
    function path(arr, close) {
      var d = "", n = 0;
      for (i = 0; i <= last; i++) {
        var x = xAt(i * C.step), y = yAt(arr[i]);
        d += (n ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
        n++;
      }
      if (close && n) d += "L" + xAt(last * C.step).toFixed(1) + " " + yAt(0).toFixed(1) +
        "L" + xAt(0).toFixed(1) + " " + yAt(0).toFixed(1) + "Z";
      return d;
    }
    out += '<path d="' + path(C.l, true) + '" fill="' + LOSTC + '" fill-opacity="0.14"></path>' +
      '<path d="' + path(C.w, true) + '" fill="' + WONC + '" fill-opacity="0.16"></path>' +
      '<path d="' + path(C.l, false) + '" fill="none" stroke="' + LOSTC + '" stroke-width="2.8"></path>' +
      '<path d="' + path(C.w, false) + '" fill="none" stroke="' + WONC + '" stroke-width="2.8"></path>';
    var ci = clamp(Math.round(cursor / C.step), 0, last);
    var cx = xAt(ci * C.step);
    out += '<line x1="' + cx.toFixed(1) + '" y1="' + (padT - 10) + '" x2="' + cx.toFixed(1) +
      '" y2="' + (H - padB + 6) + '" stroke="#e6d16b" stroke-width="2"></line>' +
      '<circle cx="' + cx.toFixed(1) + '" cy="' + yAt(C.l[ci]).toFixed(1) + '" r="5.5" fill="' +
      LOSTC + '" stroke="rgba(10,14,31,0.8)"></circle>' +
      '<circle cx="' + cx.toFixed(1) + '" cy="' + yAt(C.w[ci]).toFixed(1) + '" r="5.5" fill="' +
      WONC + '" stroke="rgba(10,14,31,0.8)"></circle>' +
      txt(cx + 8, padT - 2, mmss(ci * C.step), null, null);
    out += txt(W / 2, H - 8, "seconds into the match", null, "middle");
    out += '<text transform="translate(15,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">avg tanks lost</text>';
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelClock(T) {
    var C = clockCurves(T);
    if (C.n < 40) return "";
    var i90 = Math.round(90 / C.step);
    var say = "";
    if (C.l[i90] > 0 && C.w[i90] > 0) {
      say = '<p class="ope-say">At 90s the losing side is already down <b>' +
        (C.l[i90] / C.w[i90]).toFixed(1) + " to 1</b> on tanks. That is the widest the " +
        "gap ever gets.</p>";
    }
    var body =
      '<div class="ope-key">' +
      '<span><i style="background:' + WONC + '"></i>tanks lost by the side that went on to win</span>' +
      '<span><i style="background:' + LOSTC + '"></i>tanks lost by the side that went on to lose</span>' +
      "</div>" +
      '<div class="ope-ctl">' +
      '<span class="ope-lab">Show</span><span class="ope-seg" id="ope-clock-seg">' +
      '<button type="button" data-ope-span="120">First 2 minutes</button>' +
      '<button type="button" data-ope-span="300" class="ope-on">First 5 minutes</button>' +
      '<button type="button" data-ope-span="600">Ten minutes</button></span>' +
      '<span class="ope-lab">Cursor</span>' +
      '<input type="range" class="ope-range" id="ope-clock-cur" min="0" max="300" step="5" value="90">' +
      "</div>" +
      '<div class="ope-scroll" id="ope-clock"></div>' +
      '<div class="ope-note-in" id="ope-clock-read"></div>' + say;

    var note =
      "Over " + T.fmtNum(C.n) + " decided matches. Winner and loser are hindsight labels, " +
      "taken from the result. Past about 4 minutes matches start ending and the average sags.";
    return T.bigPanel("The opening clock", body, note);
  }

  // =========================================================== panel 4
  // Which tanks draw first blood, and which tanks are it.
  //
  // Both series come from the build script. They do NOT share a denominator's
  // worth of events: the killer's tank could not be identified in 63 of the
  // 308 openings, the victim's in 5, so the raw rates are on different
  // footings and cannot be plotted against each other as they stand. Dividing
  // each by its own pooled rate cancels that out, which is why both axes are
  // in multiples of expected rather than in per cent.
  var _tanks = null;
  function tankRows(T) {
    if (_tanks) return _tanks;
    var S = (T && T.STATS) || {};
    var fb = S.first_blood_by_tank || [], fd = S.first_down_by_tank || [];
    if (!fb.length || !fd.length) { _tanks = { rows: [], ok: false }; return _tanks; }
    var byName = {}, i, cb = 0, gb = 0, cd = 0, gd = 0;
    for (i = 0; i < fb.length; i++) {
      var a = fb[i];
      if (!a || !a.games) continue;
      byName[a.label] = { label: a.label, games: a.games, fbC: a.count || 0, fbR: a.value };
      cb += a.count || 0; gb += a.games;
    }
    for (i = 0; i < fd.length; i++) {
      var b = fd[i];
      if (!b || !byName[b.label]) continue;
      byName[b.label].fdC = b.count || 0;
      byName[b.label].fdR = b.value;
      cd += b.count || 0; gd += b.games;
    }
    var poolB = gb ? cb / gb : 0, poolD = gd ? cd / gd : 0;
    if (!poolB || !poolD) { _tanks = { rows: [], ok: false }; return _tanks; }
    var rows = [], name;
    for (name in byName) {
      if (!Object.prototype.hasOwnProperty.call(byName, name)) continue;
      var r = byName[name];
      if (r.fdR == null) continue;
      var cib = wilson(r.fbC, r.games), cid = wilson(r.fdC, r.games);
      rows.push({
        label: r.label, games: r.games,
        fbC: r.fbC, fdC: r.fdC, fbR: r.fbR, fdR: r.fdR,
        x: (r.fbR / 100) / poolB, y: (r.fdR / 100) / poolD,
        xlo: (cib[0] / 100) / poolB, xhi: (cib[1] / 100) / poolB,
        ylo: (cid[0] / 100) / poolD, yhi: (cid[1] / 100) / poolD
      });
    }
    rows.sort(function (p, q) { return q.games - p.games; });
    _tanks = {
      rows: rows, ok: rows.length >= 6,
      poolB: 100 * poolB, poolD: 100 * poolD,
      eventsB: cb, eventsD: cd, appearances: gb
    };
    return _tanks;
  }

  function tankSvg(T, minG, showCi, sel) {
    var P = tankRows(T);
    if (!P.ok) return "";
    var W = 1000, H = 560, padL = 66, padR = 26, padT = 24, padB = 56;
    var rows = [], i, mxX = 1.2, mxY = 1.2, mxG = 1;
    for (i = 0; i < P.rows.length; i++) {
      var r = P.rows[i];
      if (r.games < minG) continue;
      rows.push(r);
      if (r.games > mxG) mxG = r.games;
      var xr = showCi ? r.xhi : r.x, yr = showCi ? r.yhi : r.y;
      if (xr > mxX) mxX = xr;
      if (yr > mxY) mxY = yr;
    }
    if (!rows.length) return "";
    mxX = Math.ceil(mxX * 4) / 4; mxY = Math.ceil(mxY * 4) / 4;
    function xAt(v) { return padL + (v / mxX) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mxY) * (H - padT - padB); }
    var out = "", t;
    for (t = 0; t <= 4; t++) {
      var gx = mxX * t / 4, gy = mxY * t / 4;
      out += '<line x1="' + xAt(gx).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(gx).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(gx).toFixed(1), H - padB + 17, (Math.round(gx * 100) / 100).toFixed(2) + "x", null, "middle") +
        '<line x1="' + padL + '" y1="' + yAt(gy).toFixed(1) + '" x2="' + (W - padR) + '" y2="' +
        yAt(gy).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(padL - 8, yAt(gy) + 4, (Math.round(gy * 100) / 100).toFixed(2) + "x", null, "end");
    }
    // the "no different from average" crosshair
    out += '<line x1="' + xAt(1).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(1).toFixed(1) +
      '" y2="' + (H - padB) + '" stroke="' + GRIDM + '" stroke-dasharray="5 4"></line>' +
      '<line x1="' + padL + '" y1="' + yAt(1).toFixed(1) + '" x2="' + (W - padR) + '" y2="' +
      yAt(1).toFixed(1) + '" stroke="' + GRIDM + '" stroke-dasharray="5 4"></line>' +
      txt(xAt(1) + 6, padT + 12, "draws first blood more than average", null, null) +
      txt(W - padR - 6, yAt(1) - 7, "dies first more than average", null, "end");
    for (i = 0; i < rows.length; i++) {
      var q = rows[i];
      var col = T.tankColor(q.label) || LIME;
      var rad = 6 + 15 * Math.sqrt(q.games / mxG);
      var isSel = sel === q.label;
      if (showCi) {
        out += '<line x1="' + xAt(q.xlo).toFixed(1) + '" y1="' + yAt(q.y).toFixed(1) + '" x2="' +
          xAt(q.xhi).toFixed(1) + '" y2="' + yAt(q.y).toFixed(1) + '" stroke="' + col +
          '" stroke-opacity="0.34" stroke-width="1.4"></line>' +
          '<line x1="' + xAt(q.x).toFixed(1) + '" y1="' + yAt(q.ylo).toFixed(1) + '" x2="' +
          xAt(q.x).toFixed(1) + '" y2="' + yAt(q.yhi).toFixed(1) + '" stroke="' + col +
          '" stroke-opacity="0.34" stroke-width="1.4"></line>';
      }
      out += '<circle class="ope-hit" data-ope-tank="' + T.esc(q.label) + '" cx="' +
        xAt(q.x).toFixed(1) + '" cy="' + yAt(q.y).toFixed(1) + '" r="' + rad.toFixed(1) +
        '" fill="' + col + '" fill-opacity="' + (isSel ? "0.95" : "0.66") + '" stroke="' +
        (isSel ? "#ffffff" : "rgba(10,14,31,0.75)") + '" stroke-width="' + (isSel ? "2.2" : "1") +
        '"><title>' + T.esc(q.label + ": drew first blood in " + q.fbC + " of " + q.games +
        " appearances, died first in " + q.fdC) + "</title></circle>" +
        '<text x="' + xAt(q.x).toFixed(1) + '" y="' + (yAt(q.y) - rad - 5).toFixed(1) +
        '" text-anchor="middle" font-size="11" font-weight="600" fill="#e2e8ff" ' +
        'pointer-events="none">' + T.esc(q.label) + "</text>";
    }
    out += txt(W / 2, H - 10, "first-blood rate vs average", null, "middle");
    out += '<text transform="translate(16,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">first-to-die rate</text>';
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelTanks(T) {
    var P = tankRows(T);
    if (!P.ok) return "";
    var mn = P.rows[P.rows.length - 1].games, mxg = P.rows[0].games, i;
    for (i = 0; i < P.rows.length; i++) {
      if (P.rows[i].games < mn) mn = P.rows[i].games;
      if (P.rows[i].games > mxg) mxg = P.rows[i].games;
    }
    var body =
      '<div class="ope-ctl">' +
      '<span class="ope-lab">Minimum appearances</span>' +
      '<input type="range" class="ope-range" id="ope-tank-min" min="' + mn + '" max="' +
      Math.max(mn + 1, Math.round(mxg * 0.6)) + '" step="5" value="' + mn + '">' +
      '<span class="ope-lab" id="ope-tank-min-out"></span>' +
      '<button type="button" class="ope-chip" id="ope-tank-ci">' +
      '<i style="background:' + LIME + '"></i>95% intervals</button>' +
      "</div>" +
      '<div class="ope-scroll" id="ope-tank"></div>' +
      '<div class="ope-note-in" id="ope-tank-read"><span class="ope-dim">' +
      "Click a tank. Circle area = pick rate.</span></div>";

    var note =
      "1.00x is the roster average. The axes count different events: the killer was known " +
      "in " + P.eventsB + " openings, the victim in " + P.eventsD + ". That is why both read " +
      "as multiples and not per cent. They will not match the deep-cuts page. Killer tank is " +
      "unknown in about a fifth of openings. Turn the intervals on.";
    return T.bigPanel("Predator and prey", body, note);
  }

  // =========================================================== panel 5
  // How long each map stays quiet.
  var _maps = null;
  function mapRows(T) {
    if (_maps) return _maps;
    var B = build(T), acc = {}, i, name;
    for (i = 0; i < B.rows.length; i++) {
      var r = B.rows[i];
      if (!acc[r.map]) acc[r.map] = { label: r.map, fb: [], dur: [], n: 0, dec: 0, won: 0 };
      var a = acc[r.map];
      a.fb.push(r.fb); a.dur.push(r.dur); a.n++;
      if (r.win !== null) { a.dec++; if (r.fbWon) a.won++; }
    }
    var out = [], thin = 0;
    for (name in acc) {
      if (!Object.prototype.hasOwnProperty.call(acc, name)) continue;
      var m = acc[name];
      if (m.n < 8) { thin++; continue; }
      m.fb.sort(sortNum);
      out.push({
        label: m.label, n: m.n, dec: m.dec, won: m.won,
        p10: quant(m.fb, 0.1), p25: quant(m.fb, 0.25), p50: quant(m.fb, 0.5),
        p75: quant(m.fb, 0.75), p90: quant(m.fb, 0.9),
        vals: m.fb, medDur: medOf(m.dur)
      });
    }
    _maps = { rows: out, thin: thin };
    return _maps;
  }

  function mapSvg(T, sort, sel) {
    var M = mapRows(T);
    var rows = M.rows.slice();
    if (rows.length < 2) return "";
    if (sort === "median") rows.sort(function (a, b) { return a.p50 - b.p50; });
    else if (sort === "matches") rows.sort(function (a, b) { return b.n - a.n; });
    else rows.sort(function (a, b) { return a.label < b.label ? -1 : 1; });
    var W = 1000, labelW = 130, padR = 168, laneH = 62, top = 24;
    var H = top + rows.length * laneH + 30;
    var lo = 30, hi = 0, i, j;
    for (i = 0; i < rows.length; i++) if (rows[i].p90 > hi) hi = rows[i].p90;
    hi = Math.ceil((hi + 10) / 15) * 15;
    function xAt(v) { return labelW + ((v - lo) / (hi - lo)) * (W - labelW - padR); }
    var out = "", t;
    for (t = lo; t <= hi; t += 15) {
      out += '<line x1="' + xAt(t).toFixed(1) + '" y1="' + (top - 10) + '" x2="' + xAt(t).toFixed(1) +
        '" y2="' + (H - 26) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(t).toFixed(1), H - 8, mmss(t), null, "middle");
    }
    for (i = 0; i < rows.length; i++) {
      var r = rows[i], y0 = top + i * laneH, mid = y0 + laneH / 2 - 4;
      var col = r.label === sel ? "#d7e88a" : LIME;
      out += '<rect class="ope-hit" data-ope-map="' + T.esc(r.label) + '" x="0" y="' + y0 +
        '" width="' + W + '" height="' + (laneH - 6) + '" rx="6" fill="' +
        (r.label === sel ? "rgba(255,255,255,0.05)" : "transparent") + '"></rect>' +
        txt(labelW - 12, mid - 3, T.esc(r.label), null, "end") +
        txt(labelW - 12, mid + 12, r.n + " matches", null, "end");
      for (j = 0; j < r.vals.length; j++) {
        out += '<line x1="' + xAt(r.vals[j]).toFixed(1) + '" y1="' + (mid - 17) + '" x2="' +
          xAt(r.vals[j]).toFixed(1) + '" y2="' + (mid + 17) + '" stroke="' + col +
          '" stroke-opacity="0.26" stroke-width="1.5" pointer-events="none"></line>';
      }
      out += '<line x1="' + xAt(r.p10).toFixed(1) + '" y1="' + mid + '" x2="' + xAt(r.p90).toFixed(1) +
        '" y2="' + mid + '" stroke="' + col + '" stroke-width="2" pointer-events="none"></line>' +
        '<rect x="' + xAt(r.p25).toFixed(1) + '" y="' + (mid - 11) + '" width="' +
        Math.max(2, xAt(r.p75) - xAt(r.p25)).toFixed(1) + '" height="22" rx="4" fill="' + col +
        '" fill-opacity="0.40" stroke="' + col + '" stroke-opacity="0.85" pointer-events="none"></rect>' +
        '<line x1="' + xAt(r.p50).toFixed(1) + '" y1="' + (mid - 14) + '" x2="' + xAt(r.p50).toFixed(1) +
        '" y2="' + (mid + 14) + '" stroke="#ffffff" stroke-opacity="0.92" stroke-width="2.5" ' +
        'pointer-events="none"></line>' +
        '<text x="' + (W - padR + 12) + '" y="' + (mid - 3) + '" class="chart-axis-label">median ' +
        mmss(r.p50) + "</text>" +
        '<text x="' + (W - padR + 12) + '" y="' + (mid + 12) + '" class="chart-axis-label" ' +
        'opacity="0.75">first blood side won ' + (r.dec ? pctStr(100 * r.won / r.dec) : "-") +
        " (" + r.dec + ")</text>";
    }
    out += txt(labelW, top - 14, "each thin tick is one match", null, null);
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function panelMaps(T) {
    var M = mapRows(T);
    if (M.rows.length < 2) return "";
    var i, fast = M.rows[0], slow = M.rows[0];
    for (i = 0; i < M.rows.length; i++) {
      if (M.rows[i].p50 < fast.p50) fast = M.rows[i];
      if (M.rows[i].p50 > slow.p50) slow = M.rows[i];
    }
    var body =
      '<div class="ope-ctl"><span class="ope-lab">Sort by</span>' +
      '<span class="ope-seg" id="ope-map-seg">' +
      '<button type="button" data-ope-sort="median" class="ope-on">Time to first death</button>' +
      '<button type="button" data-ope-sort="matches">Matches recorded</button>' +
      '<button type="button" data-ope-sort="name">Name</button>' +
      "</span></div>" +
      '<div class="ope-scroll" id="ope-map"></div>' +
      '<div class="ope-note-in" id="ope-map-read"><span class="ope-dim">' +
      "Click a map.</span></div>" +
      '<p class="ope-say">The quietest map opens <b>' + Math.round(slow.p50 - fast.p50) +
      "s</b> later than the loudest. The spreads overlap almost completely.</p>";

    var note =
      "Box is the middle half, line the median, whisker the 10th to 90th. Maps under 8 " +
      "matches are left out. The win-rate gaps all sit inside 95% noise. Time includes " +
      "the countdown.";
    return T.bigPanel("How long each map stays quiet", body, note);
  }

  // =========================================================== panel 6
  // Fast opening: short match, or just an early one?
  var SCAT_Y = [
    { key: "dur", name: "The whole match" },
    { key: "left", name: "What was left after first blood" }
  ];
  var SCAT_C = [
    { key: "outcome", name: "Did the first-blood side win" },
    { key: "wt", name: "How it ended" },
    { key: "map", name: "Map" }
  ];

  function scatSvg(T, ykey, ckey, sel) {
    var B = build(T), pts = B.rows;
    if (pts.length < 30) return "";
    var W = 1000, H = 520, padL = 66, padR = 22, padT = 18, padB = 52;
    var mxX = 0, mxY = 0, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].fb > mxX) mxX = pts[i].fb;
      var v = ykey === "dur" ? pts[i].dur : pts[i].left;
      if (v > mxY) mxY = v;
    }
    mxX = Math.ceil(mxX / 30) * 30; mxY = Math.ceil(mxY / 60) * 60;
    function xAt(v) { return padL + (v / mxX) * (W - padL - padR); }
    function yAt(v) { return H - padB - (v / mxY) * (H - padT - padB); }
    var out = "", t;
    for (t = 0; t <= mxX; t += 30) {
      out += '<line x1="' + xAt(t).toFixed(1) + '" y1="' + padT + '" x2="' + xAt(t).toFixed(1) +
        '" y2="' + (H - padB) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(t).toFixed(1), H - padB + 17, mmss(t), null, "middle");
    }
    for (t = 0; t <= mxY; t += 120) {
      out += '<line x1="' + padL + '" y1="' + yAt(t).toFixed(1) + '" x2="' + (W - padR) +
        '" y2="' + yAt(t).toFixed(1) + '" stroke="' + GRIDL + '"></line>' +
        txt(padL - 8, yAt(t) + 4, mmss(t), null, "end");
    }
    if (ykey === "dur") {
      out += '<line x1="' + xAt(0) + '" y1="' + yAt(0) + '" x2="' + xAt(mxX).toFixed(1) +
        '" y2="' + yAt(mxX).toFixed(1) + '" stroke="' + GRIDM + '" stroke-dasharray="5 5"></line>' +
        txt(xAt(mxX * 0.78), yAt(mxX * 0.78) - 9, "the match ends on the first kill", null, "middle");
    }
    // the median of y within each x band, drawn as a step, so the trend is
    // visible without a regression line pretending to more than it has
    var bands = [], nb = 8, bw = mxX / nb, k;
    for (k = 0; k < nb; k++) bands.push([]);
    for (i = 0; i < pts.length; i++) {
      var bi = clamp(Math.floor(pts[i].fb / bw), 0, nb - 1);
      bands[bi].push(ykey === "dur" ? pts[i].dur : pts[i].left);
    }
    var step = "", started = false;
    for (k = 0; k < nb; k++) {
      if (bands[k].length < 8) continue;
      var m = medOf(bands[k]);
      var x0 = xAt(k * bw), x1 = xAt((k + 1) * bw), yv = yAt(m);
      step += (started ? "L" : "M") + x0.toFixed(1) + " " + yv.toFixed(1) +
        "L" + x1.toFixed(1) + " " + yv.toFixed(1);
      started = true;
    }
    if (started) {
      out += '<path d="' + step + '" fill="none" stroke="#e6d16b" stroke-width="2.6" ' +
        'stroke-opacity="0.9"></path>' +
        txt(W - padR - 6, padT + 12, "median in each band", null, "end");
    }
    var body = "";
    for (i = 0; i < pts.length; i++) {
      var p = pts[i];
      var yv2 = ykey === "dur" ? p.dur : p.left;
      var col;
      if (ckey === "outcome") col = p.fbWon === null ? AMBER : (p.fbWon ? WONC : LOSTC);
      else if (ckey === "wt") col = p.wt === "capture" ? COOL : OLIVE;
      else col = T.CHART_COLORS[Math.abs(hashStr(p.map)) % T.CHART_COLORS.length];
      body += '<circle class="ope-hit" data-ope-pt="' + i + '" cx="' + xAt(p.fb).toFixed(1) +
        '" cy="' + yAt(yv2).toFixed(1) + '" r="' + (sel === i ? "6.5" : "4.2") + '" fill="' + col +
        '" fill-opacity="' + (sel === i ? "1" : "0.72") + '" stroke="' +
        (sel === i ? "#ffffff" : "rgba(10,14,31,0.7)") + '" stroke-width="' +
        (sel === i ? "2" : "0.8") + '"><title>' +
        T.esc(p.map + ": first blood " + mmss(p.fb) + ", match " + mmss(p.dur) + ", " +
              mmss(p.left) + " left, " + p.deaths.length + " deaths") + "</title></circle>";
    }
    out += body;
    out += txt(W / 2, H - 8, "first blood, seconds in", null, "middle");
    out += '<text transform="translate(16,' + ((H - padB) / 2) + ') rotate(-90)" ' +
      'text-anchor="middle" class="chart-axis-label">' +
      (ykey === "dur" ? "match length" : "time left after first blood") +
      "</text>";
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function hashStr(s) {
    var h = 2166136261, i;
    s = String(s || "");
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h | 0;
  }

  function scatSentence(T, ykey) {
    var B = build(T), i;
    var fb = [], y = [];
    for (i = 0; i < B.rows.length; i++) {
      fb.push(B.rows[i].fb);
      y.push(ykey === "dur" ? B.rows[i].dur : B.rows[i].left);
    }
    var r = pearson(fb, y);
    var q1 = quant(B.fbSorted, 0.25), q3 = quant(B.fbSorted, 0.75);
    var fastY = [], slowY = [];
    for (i = 0; i < B.rows.length; i++) {
      var v = ykey === "dur" ? B.rows[i].dur : B.rows[i].left;
      if (B.rows[i].fb < q1) fastY.push(v);
      else if (B.rows[i].fb >= q3) slowY.push(v);
    }
    return "r = " + (r === null ? "-" : (Math.round(r * 1000) / 1000)) + " over " +
      T.fmtNum(B.rows.length) + " matches. Fastest-quarter median <b>" + mmss(medOf(fastY)) +
      "</b>; slowest-quarter <b>" + mmss(medOf(slowY)) + "</b>.";
  }

  function panelShortOrEarly(T) {
    var B = build(T);
    if (B.rows.length < 30) return "";
    var i, segs = "", csegs = "";
    for (i = 0; i < SCAT_Y.length; i++) {
      segs += '<button type="button" data-ope-y="' + SCAT_Y[i].key + '"' +
        (i === 0 ? ' class="ope-on"' : "") + ">" + SCAT_Y[i].name + "</button>";
    }
    for (i = 0; i < SCAT_C.length; i++) {
      csegs += '<button type="button" data-ope-c="' + SCAT_C[i].key + '"' +
        (i === 0 ? ' class="ope-on"' : "") + ">" + SCAT_C[i].name + "</button>";
    }
    var body =
      '<div class="ope-ctl">' +
      '<span class="ope-lab">Vertical axis</span>' +
      '<span class="ope-seg" id="ope-y-seg">' + segs + "</span>" +
      '<span class="ope-lab">Colour</span>' +
      '<span class="ope-seg" id="ope-c-seg">' + csegs + "</span>" +
      "</div>" +
      '<div class="ope-scroll" id="ope-scat"></div>' +
      '<div class="ope-note-in" id="ope-scat-read"></div>' +
      '<div class="ope-note-in" id="ope-scat-pick"><span class="ope-dim">' +
      "Click a dot.</span></div>";

    var note =
      T.fmtNum(B.rows.length) + " matches. The yellow step is the band median. A late " +
      "opening buys a quiet minute at the front. It does not add fighting later.";
    return T.bigPanel("A fast opening makes an early match, not a short one", body, note);
  }

  // =========================================================== panel 7
  // One opening, second by second, from the per-match file. This is the only
  // panel that fetches anything, and only when asked.
  function pickList(T) {
    var B = build(T);
    var s = B.rows.slice().sort(function (a, b) { return a.fb - b.fb; });
    if (s.length < 12) return s;
    var out = [], seen = {}, i;
    function take(r) {
      if (!r || seen[r.id]) return;
      seen[r.id] = 1; out.push(r);
    }
    for (i = 0; i < 5; i++) take(s[i]);
    var mid = Math.floor(s.length / 2);
    for (i = mid - 2; i <= mid + 2; i++) take(s[i]);
    for (i = s.length - 5; i < s.length; i++) take(s[i]);
    out.sort(function (a, b) { return a.fb - b.fb; });
    return out;
  }

  function timelineSvg(T, deep, row, window) {
    var ev = (deep && deep.deathEvents) || [];
    if (!ev.length) return "";
    var list = ev.slice().sort(function (a, b) { return (a.t || 0) - (b.t || 0); });
    var W = 1000, H = 260, padL = 40, padR = 30, midY = 132;
    var span = Math.max(30, window);
    function xAt(t) { return padL + (t / span) * (W - padL - padR); }
    var out = "", t, i;
    if (row) {
      out += '<text x="' + padL + '" y="14" font-size="12" fill="#dbe3ff">' +
        T.esc(row.map) + ", " + mmss(row.dur) + " long, " + row.deaths.length +
        " tanks lost, ended by " + T.esc(row.wt) + "</text>";
    }
    var tick = span <= 120 ? 15 : (span <= 300 ? 30 : 60);
    for (t = 0; t <= span; t += tick) {
      out += '<line x1="' + xAt(t).toFixed(1) + '" y1="30" x2="' + xAt(t).toFixed(1) +
        '" y2="' + (H - 40) + '" stroke="' + GRIDL + '"></line>' +
        txt(xAt(t).toFixed(1), H - 22, mmss(t), null, "middle");
    }
    out += '<line x1="' + padL + '" y1="' + midY + '" x2="' + (W - padR) + '" y2="' + midY +
      '" stroke="rgba(255,255,255,0.28)" stroke-width="1.4"></line>';
    out += txt(padL, 24, "team B loses a tank", null, null) +
      txt(padL, H - 48, "team A loses a tank", null, null);
    var shown = 0;
    for (i = 0; i < list.length; i++) {
      var e = list[i], et = e.t || 0;
      if (et > span) continue;
      shown++;
      var up = e.victimTeam === 1;
      var x = xAt(et);
      var y2 = up ? 52 : H - 68;
      var col = i === 0 ? "#e6d16b" : (up ? COOL : OLIVE);
      var vt = e.victimTank || "?", kt = e.killerTank || "unidentified";
      out += '<line x1="' + x.toFixed(1) + '" y1="' + midY + '" x2="' + x.toFixed(1) + '" y2="' +
        y2 + '" stroke="' + col + '" stroke-width="2"></line>' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y2 + '" r="' + (i === 0 ? "7" : "5") +
        '" fill="' + col + '" stroke="rgba(10,14,31,0.8)" stroke-width="1.2"><title>' +
        T.esc(mmss(et) + ": " + vt + " killed by " + kt +
              (e.rangeM != null ? " at " + e.rangeM + " m" : "")) + "</title></circle>" +
        '<text x="' + x.toFixed(1) + '" y="' + (up ? y2 - 12 : y2 + 18) +
        '" text-anchor="middle" font-size="11" fill="#dbe3ff">' + T.esc(vt) + "</text>";
      if (i === 0) {
        out += '<text x="' + x.toFixed(1) + '" y="' + (up ? y2 - 26 : y2 + 32) +
          '" text-anchor="middle" font-size="10" fill="#e6d16b">first blood</text>';
      }
    }
    if (!shown) return '<p class="small">No deaths inside that window.</p>';
    out += txt(W / 2, H - 6, "seconds into the match, showing " + shown + " of " + list.length +
      " deaths", null, "middle");
    return '<svg class="ope-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  function timelineTable(T, deep, window) {
    var ev = (deep && deep.deathEvents) || [];
    if (!ev.length) return "";
    var list = ev.slice().sort(function (a, b) { return (a.t || 0) - (b.t || 0); });
    var body = "", i, n = 0;
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if ((e.t || 0) > window) continue;
      n++;
      body += "<tr>" +
        '<td class="ope-n">' + mmss(e.t || 0) + "</td>" +
        "<td>" + T.esc(e.victimTank || "unknown") + "</td>" +
        "<td>" + (e.victimTeam === 1 ? "B" : "A") + "</td>" +
        "<td>" + T.esc(e.killerTank || "unidentified") + "</td>" +
        '<td class="ope-n">' + (e.rangeM != null ? T.fmtNum(e.rangeM) + " m" : "-") + "</td>" +
        "</tr>";
    }
    if (!n) return "";
    return '<table class="ope-tl"><thead><tr><th class="ope-n">At</th><th>Tank lost</th>' +
      "<th>Side</th><th>Killed by</th><th class=\"ope-n\">Range</th></tr></thead><tbody>" +
      body + "</tbody></table>";
  }

  function panelOneOpening(T) {
    var list = pickList(T);
    if (list.length < 4) return "";
    var opts = "", i;
    for (i = 0; i < list.length; i++) {
      var r = list[i];
      opts += '<option value="' + T.esc(r.id) + '">' + T.esc(r.map) + ", first blood " +
        mmss(r.fb) + ", match " + mmss(r.dur) + ", " + r.deaths.length + " deaths</option>";
    }
    var body =
      '<div class="ope-ctl">' +
      '<span class="ope-lab">Match</span>' +
      '<select class="ope-sel" id="ope-pick">' + opts + "</select>" +
      '<span class="ope-lab">Show the first</span>' +
      '<input type="range" class="ope-range" id="ope-win" min="60" max="360" step="10" value="180">' +
      '<span class="ope-lab" id="ope-win-out"></span>' +
      "</div>" +
      '<div class="ope-scroll" id="ope-tl"></div>' +
      '<div id="ope-tl-table"></div>';

    var note =
      "The earliest 5, the middle 5 and the latest 5. Not a sample. Killer tank is unknown " +
      "in about a fifth of cases. Team A and B are arbitrary; up or down only says which " +
      "side lost the tank.";
    return T.bigPanel("Watch one opening", body, note);
  }

  // ================================================================= render
  function render(T) {
    if (!T || !T.DATA || !(T.DATA.matches || []).length) {
      return '<div class="panel"><p class="small">No matches loaded.</p></div>';
    }
    var B = build(T);
    if (!B.rows.length) {
      return '<div class="panel"><p class="small">No readable openings in the archive.</p></div>';
    }
    var html = "";
    html += panelShape(T);
    html += panelDoesItWin(T);
    html += panelClock(T);
    html += panelTanks(T);
    html += panelMaps(T);
    html += panelShortOrEarly(T);
    html += panelOneOpening(T);
    return html ? '<div class="ope-wrap">' + html + "</div>" : "";
  }

  // =================================================================== wire
  function wire(T, root) {
    if (!root) return;

    function segClick(seg, attr, fn) {
      if (!seg) return;
      seg.addEventListener("click", function (e) {
        var b = e.target;
        while (b && b !== seg && (!b.getAttribute || !b.getAttribute(attr))) b = b.parentNode;
        if (!b || b === seg || !b.getAttribute || !b.getAttribute(attr)) return;
        var bs = seg.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) bs[i].classList.remove("ope-on");
        b.classList.add("ope-on");
        fn(b.getAttribute(attr));
      });
    }
    function hitAttr(el, wrapEl, attr) {
      var n = el;
      while (n && n !== wrapEl) {
        if (n.getAttribute && n.getAttribute(attr) != null) return n.getAttribute(attr);
        n = n.parentNode;
      }
      return null;
    }

    // ---- panel 1: the early / late line
    var histWrap = root.querySelector("#ope-hist");
    var thr = root.querySelector("#ope-thr");
    var thrOut = root.querySelector("#ope-thr-out");
    var thrCol = root.querySelector("#ope-thr-cols");
    if (histWrap && thr) {
      var paintHist = function () {
        var v = +thr.value;
        histWrap.innerHTML = histSvg(T, v);
        if (thrOut) thrOut.textContent = mmss(v);
        if (thrCol) thrCol.innerHTML = thrCols(T, v);
      };
      paintHist();
      thr.addEventListener("input", paintHist);
    }

    // ---- panel 2: split control + click a row
    var splitWrap = root.querySelector("#ope-split");
    var splitRead = root.querySelector("#ope-split-read");
    if (splitWrap) {
      var sKey = SPLITS[0].key, sSel = null;
      var paintSplit = function () {
        splitWrap.innerHTML = splitSvg(T, sKey, sSel) ||
          '<p class="small">Not enough matches to split that way.</p>';
      };
      paintSplit();
      segClick(root.querySelector("#ope-split-seg"), "data-ope-split-key", function (k) {
        sKey = k; sSel = null;
        if (splitRead) {
          splitRead.innerHTML = '<span class="ope-dim">Click a row.</span>';
        }
        paintSplit();
      });
      splitWrap.addEventListener("click", function (e) {
        var lab = hitAttr(e.target, splitWrap, "data-ope-split");
        if (lab == null) return;
        var rows = splitRows(T, sKey), i;
        for (i = 0; i < rows.length; i++) {
          if (rows[i].label !== lab) continue;
          sSel = lab;
          if (splitRead) {
            splitRead.innerHTML = "<b>" + T.esc(rows[i].label) + "</b>: won <b>" + rows[i].w +
              " of " + rows[i].n + "</b> (" + pctStr(rows[i].p) + "), 95% CI " +
              pctStr(rows[i].lo) + " to " + pctStr(rows[i].hi) + ". " +
              (rows[i].lo > 50
                ? '<span class="ope-dim">Above a coin flip.</span>'
                : (rows[i].hi < 50
                   ? '<span class="ope-dim">Below a coin flip.</span>'
                   : '<span class="ope-dim">Crosses a coin flip.</span>'));
          }
          paintSplit();
          return;
        }
      });
    }

    // ---- panel 3: time cursor + span
    var clockWrap = root.querySelector("#ope-clock");
    var clockCur = root.querySelector("#ope-clock-cur");
    var clockRead = root.querySelector("#ope-clock-read");
    if (clockWrap) {
      var span = 300;
      var paintClock = function () {
        var cur = clockCur ? clamp(+clockCur.value, 0, span) : 90;
        clockWrap.innerHTML = clockSvg(T, cur, span);
        if (clockRead) {
          var C = clockCurves(T);
          var i = clamp(Math.round(cur / C.step), 0, C.steps - 1);
          var ratio = C.w[i] > 0 ? (C.l[i] / C.w[i]).toFixed(1) + " to 1" : "no losses yet";
          clockRead.innerHTML = "At <b>" + mmss(i * C.step) + "</b>: winners lost <b>" +
            C.w[i].toFixed(2) + "</b>, losers <b>" + C.l[i].toFixed(2) + "</b> (" + ratio +
            "). Losers already behind in <b>" + C.ahead[i] + "</b> of " + T.fmtNum(C.n) +
            "; <b>" + T.fmtNum(C.running[i]) + "</b> still running.";
        }
      };
      paintClock();
      if (clockCur) clockCur.addEventListener("input", paintClock);
      segClick(root.querySelector("#ope-clock-seg"), "data-ope-span", function (v) {
        span = +v;
        if (clockCur) {
          clockCur.max = String(span);
          if (+clockCur.value > span) clockCur.value = String(span);
        }
        paintClock();
      });
    }

    // ---- panel 4: minimum appearances, intervals, click a tank
    var tankWrap = root.querySelector("#ope-tank");
    var tankMin = root.querySelector("#ope-tank-min");
    var tankMinOut = root.querySelector("#ope-tank-min-out");
    var tankCi = root.querySelector("#ope-tank-ci");
    var tankRead = root.querySelector("#ope-tank-read");
    if (tankWrap) {
      var showCi = false, tSel = null;
      if (tankCi) tankCi.classList.add("ope-off");
      var paintTank = function () {
        var v = tankMin ? +tankMin.value : 0;
        tankWrap.innerHTML = tankSvg(T, v, showCi, tSel) ||
          '<p class="small">No tank clears that many appearances.</p>';
        if (tankMinOut) {
          var P = tankRows(T), kept = 0, i;
          for (i = 0; i < P.rows.length; i++) if (P.rows[i].games >= v) kept++;
          tankMinOut.textContent = v + "+ appearances, " + kept + " tanks";
        }
      };
      paintTank();
      if (tankMin) tankMin.addEventListener("input", paintTank);
      if (tankCi) {
        tankCi.addEventListener("click", function () {
          showCi = !showCi;
          if (showCi) tankCi.classList.remove("ope-off");
          else tankCi.classList.add("ope-off");
          paintTank();
        });
      }
      tankWrap.addEventListener("click", function (e) {
        var nm = hitAttr(e.target, tankWrap, "data-ope-tank");
        if (nm == null) return;
        var P = tankRows(T), i;
        for (i = 0; i < P.rows.length; i++) {
          if (P.rows[i].label !== nm) continue;
          var q = P.rows[i];
          tSel = nm;
          if (tankRead) {
            tankRead.innerHTML = "<b>" + T.esc(q.label) + "</b>, " + T.fmtNum(q.games) +
              " games. First blood <b>" + q.fbC + "</b>x (" + q.x.toFixed(2) + "x avg). " +
              "First to die <b>" + q.fdC + "</b>x (" + q.y.toFixed(2) + "x avg). " +
              '<span class="ope-dim">CI ' + q.xlo.toFixed(2) + "-" + q.xhi.toFixed(2) +
              "x, " + q.ylo.toFixed(2) + "-" + q.yhi.toFixed(2) + "x.</span>";
          }
          paintTank();
          return;
        }
      });
    }

    // ---- panel 5: sort + click a map
    var mapWrap = root.querySelector("#ope-map");
    var mapRead = root.querySelector("#ope-map-read");
    if (mapWrap) {
      var mSort = "median", mSel = null;
      var paintMap = function () { mapWrap.innerHTML = mapSvg(T, mSort, mSel); };
      paintMap();
      segClick(root.querySelector("#ope-map-seg"), "data-ope-sort", function (k) {
        mSort = k; paintMap();
      });
      mapWrap.addEventListener("click", function (e) {
        var nm = hitAttr(e.target, mapWrap, "data-ope-map");
        if (nm == null) return;
        var M = mapRows(T), i;
        for (i = 0; i < M.rows.length; i++) {
          if (M.rows[i].label !== nm) continue;
          var r = M.rows[i];
          mSel = nm;
          var ci = wilson(r.won, r.dec);
          if (mapRead) {
            mapRead.innerHTML = "<b>" + T.esc(r.label) + "</b>, " + r.n + " matches. Median " +
              "first blood <b>" + mmss(r.p50) + "</b> (10-90%: " + mmss(r.p10) + "-" +
              mmss(r.p90) + "). Won <b>" + r.won + " of " + r.dec + "</b> (" +
              (r.dec ? pctStr(100 * r.won / r.dec) : "-") + ", CI " + pctStr(ci[0]) +
              "-" + pctStr(ci[1]) + ").";
          }
          paintMap();
          return;
        }
      });
    }

    // ---- panel 6: axis, colour, click a dot
    var scatWrap = root.querySelector("#ope-scat");
    var scatRead = root.querySelector("#ope-scat-read");
    var scatPick = root.querySelector("#ope-scat-pick");
    if (scatWrap) {
      var yKey = SCAT_Y[0].key, cKey = SCAT_C[0].key, pSel = null;
      var paintScat = function () {
        scatWrap.innerHTML = scatSvg(T, yKey, cKey, pSel);
        if (scatRead) scatRead.innerHTML = scatSentence(T, yKey);
      };
      paintScat();
      segClick(root.querySelector("#ope-y-seg"), "data-ope-y", function (k) {
        yKey = k; paintScat();
      });
      segClick(root.querySelector("#ope-c-seg"), "data-ope-c", function (k) {
        cKey = k; paintScat();
      });
      scatWrap.addEventListener("click", function (e) {
        var idx = hitAttr(e.target, scatWrap, "data-ope-pt");
        if (idx == null) return;
        var p = build(T).rows[+idx];
        if (!p) return;
        pSel = +idx;
        if (scatPick) {
          scatPick.innerHTML = "<b>" + T.esc(p.map) + "</b>. First blood <b>" + mmss(p.fb) +
            "</b>, match " + mmss(p.dur) + ", <b>" + mmss(p.left) + "</b> left after. " +
            p.deaths.length + " deaths, ended by " + p.wt + ". " +
            (p.fbWon === null
              ? '<span class="ope-dim">No winner decoded.</span>'
              : "First blood <b>" + (p.fbWon ? "won" : "lost") + "</b>.") +
            ' <span class="mono">' + T.esc(p.id) + "</span>";
        }
        paintScat();
      });
    }

    // ---- panel 7: pick a match, fetch it once, scrub the window
    var pick = root.querySelector("#ope-pick");
    var tlWrap = root.querySelector("#ope-tl");
    var tlTable = root.querySelector("#ope-tl-table");
    var win = root.querySelector("#ope-win");
    var winOut = root.querySelector("#ope-win-out");
    if (pick && tlWrap) {
      var cache = {}, current = null;
      var rowById = function (id) {
        var rows = build(T).rows, i;
        for (i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
        return null;
      };
      var paintTl = function () {
        var w = win ? +win.value : 180;
        if (winOut) winOut.textContent = mmss(w);
        if (!current) return;
        var deep = cache[current];
        if (deep === undefined) return;
        if (!deep || !deep.deathEvents || !deep.deathEvents.length) {
          tlWrap.innerHTML = '<p class="small">Match file could not be read.</p>';
          if (tlTable) tlTable.innerHTML = "";
          return;
        }
        tlWrap.innerHTML = timelineSvg(T, deep, rowById(current), w);
        if (tlTable) tlTable.innerHTML = timelineTable(T, deep, w);
      };
      var load = function (id) {
        current = id;
        if (cache[id] !== undefined) { paintTl(); return; }
        tlWrap.innerHTML = '<p class="small">Loading that match&#39;s own file…</p>';
        if (tlTable) tlTable.innerHTML = "";
        T.loadJson("matches/" + id + ".json").then(function (deep) {
          cache[id] = deep || null;
          if (!document.body.contains(tlWrap)) return;
          if (current === id) paintTl();
        });
      };
      pick.addEventListener("change", function () { load(pick.value); });
      if (win) win.addEventListener("input", paintTl);
      if (winOut) winOut.textContent = mmss(win ? +win.value : 180);
      load(pick.value);
    }
  }

  // ================================================================ preview
  //
  // The distribution of first blood, split into the share of each bar where
  // the side that drew it went on to win and the share where it did not. It is
  // the page in one shape: a mountain that sits well after the start of the
  // match, mostly in the winning colour but never all of it.
  //
  // The tile is drawn at about 62% opacity over #10162e with a scrim across
  // the bottom third, so the fills here are deliberately bright. The lime
  // lands near 5.5:1 against that background after the dimming and the amber
  // near 3.8:1; the accent olive itself measures under 2:1 and is used only
  // for the baseline.
  function preview(T) {
    var h;
    try { h = fbHist(T); } catch (e) { return ""; }
    if (!h || h.length < 6) return "";
    var i, mx = 0, any = 0;
    for (i = 0; i < h.length; i++) { if (h[i].n > mx) mx = h[i].n; any += h[i].n; }
    if (!mx || any < 40) return "";
    var y0 = 154, yTop = 22, x0 = -6, x1 = 246;
    function xAt(i2) { return x0 + (x1 - x0) * (i2 / (h.length - 1)); }
    function yAt(v) { return y0 - (v / mx) * (y0 - yTop); }
    var topPts = [], winPts = [];
    for (i = 0; i < h.length; i++) {
      topPts.push([xAt(i), yAt(h[i].n)]);
      winPts.push([xAt(i), yAt(h[i].won)]);
    }
    function poly(pts, close) {
      var d = "", k;
      for (k = 0; k < pts.length; k++) {
        d += (k ? "L" : "M") + pts[k][0].toFixed(1) + " " + pts[k][1].toFixed(1);
      }
      if (close) d += "L" + x1 + " " + y0 + "L" + x0 + " " + y0 + "Z";
      return d;
    }
    var out = "";
    // the whole distribution, in the colour of a match the first-blood side lost
    out += '<path d="' + poly(topPts, true) + '" fill="#e0a44f" fill-opacity="0.92"/>';
    // the part of it the first-blood side went on to win
    out += '<path d="' + poly(winPts, true) + '" fill="#cbe66b" fill-opacity="0.97"/>';
    out += '<path d="' + poly(topPts, false) + '" fill="none" stroke="#f2f6e4" ' +
      'stroke-width="2.6" stroke-linejoin="round"/>';
    // the median, and the floor
    var B;
    try { B = build(T); } catch (e2) { B = null; }
    if (B && B.fbSorted.length) {
      var med = quant(B.fbSorted, 0.5);
      var mi = clamp((med - HLO) / BIN, 0, h.length - 1);
      var mxp = xAt(mi);
      out += '<line x1="' + mxp.toFixed(1) + '" y1="' + (yTop - 8) + '" x2="' + mxp.toFixed(1) +
        '" y2="' + y0 + '" stroke="#f2f6e4" stroke-width="2" stroke-opacity="0.85"/>' +
        '<circle cx="' + mxp.toFixed(1) + '" cy="' + (yTop - 6) + '" r="6" fill="#f2f6e4"/>';
    }
    out += '<line x1="0" y1="' + y0 + '" x2="240" y2="' + y0 +
      '" stroke="#5a6d39" stroke-width="3"/>';
    // a few opening seconds ticked off along the floor, as texture rather than
    // as a readable axis
    for (i = 0; i < h.length; i += 3) {
      out += '<line x1="' + xAt(i).toFixed(1) + '" y1="' + y0 + '" x2="' + xAt(i).toFixed(1) +
        '" y2="' + (y0 + 7) + '" stroke="#8fae4a" stroke-width="2"/>';
    }
    return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice">' + out + "</svg>";
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "openings",
    title: "Openings",
    blurb: "The first ninety seconds, and whether they decide anything.",
    accent: "#5a6d39",
    css: CSS,
    gated: false,
    preview: preview,
    render: render,
    wire: wire
  });
})();

/* TYR suite: "Records" -- the extremes of the archive.
 *
 * Everything on this page is a maximum or a minimum taken over what has been
 * uploaded, and every one of them names the match it came from so a reader
 * can go and check it. That is the whole point: a superlative you cannot
 * follow back to a game is just an assertion.
 *
 * Sources, and what each one actually is:
 *   T.DATA.matches[].players[]   one row per player per match. dmg / kills /
 *                                assist / blocked are the endgame scoreboard
 *                                numbers. survival_sec is the second that
 *                                player's health reached zero, or the match
 *                                duration if they were still alive.
 *   T.DATA.players[]             career rows, used ONLY for the game count
 *                                shown beside every record holder.
 *   match.score_ally/score_enemy the two numbers the site prints as "Score".
 *                                The build script writes each side's final
 *                                team health into them, so they are read here
 *                                as health left standing, not as points.
 *
 * survival_sec is missing for some players, so any record built on death
 * times is restricted to matches where all sixteen rows have one, and those
 * panels print that smaller count themselves.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var GOLD = "#c9a227";
  var GOLD_TEXT = "#f2e2ae";
  var COOL = "#42588d";

  var CSS = "" +
    ".rec-topbar{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 16px;padding:12px 14px;background:linear-gradient(180deg,rgba(201,162,39,.11),rgba(201,162,39,0));border:1px solid var(--border);border-left:3px solid " + GOLD + ";border-radius:10px}" +
    ".rec-k{font-size:.64rem;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}" +
    ".rec-chips{display:flex;flex-wrap:wrap;gap:6px}" +
    ".rec-chip{background:transparent;border:1px solid var(--border);border-radius:999px;color:var(--dim);font:inherit;font-size:.78rem;padding:5px 13px;cursor:pointer}" +
    ".rec-chip:hover{border-color:" + GOLD + ";color:var(--text)}" +
    ".rec-chip.rec-on{background:rgba(201,162,39,.18);border-color:" + GOLD + ";color:" + GOLD_TEXT + "}" +
    ".rec-headline{margin-left:auto;text-align:right;font-size:.76rem;color:var(--dim);line-height:1.5}" +
    ".rec-headline b{display:block;color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;font-size:1.15rem;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".rec-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 12px}" +
    ".rec-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}" +
    ".rec-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.78rem;padding:6px 12px;cursor:pointer}" +
    ".rec-seg button+button{border-left:1px solid var(--border)}" +
    ".rec-seg button.rec-on{background:rgba(201,162,39,.2);color:" + GOLD_TEXT + "}" +
    ".rec-note{font-size:.76rem;color:var(--dim)}" +
    ".rec-scroll{overflow-x:auto}" +
    ".rec-table{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}" +
    ".rec-table th{text-align:left;font-size:.62rem;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);font-weight:600;padding:0 8px 7px;border-bottom:1px solid var(--border);white-space:nowrap}" +
    ".rec-table td{padding:7px 8px;border-bottom:1px solid rgba(127,137,179,.16);white-space:nowrap}" +
    ".rec-table tr:hover td{background:rgba(201,162,39,.05)}" +
    ".rec-table a{color:inherit}" +
    ".rec-rank{width:24px;color:var(--dim);font-size:.74rem;text-align:right}" +
    ".rec-valcell{position:relative;min-width:158px}" +
    ".rec-bar{position:absolute;left:0;top:4px;bottom:4px;background:linear-gradient(90deg,rgba(201,162,39,.44),rgba(201,162,39,.07));border-radius:3px}" +
    ".rec-valcell b{position:relative;color:" + GOLD_TEXT + ";padding-left:7px;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".rec-tank{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;color:var(--text);text-decoration:none}" +
    ".rec-tank:before{content:'';width:8px;height:8px;border-radius:2px;background:var(--tc);flex:0 0 auto}" +
    ".rec-tank:hover{text-decoration:underline}" +
    ".rec-dim{color:var(--dim)}" +
    ".rec-games{font-size:.74rem;color:var(--dim)}" +
    ".rec-thin td{background:rgba(201,162,39,.06)}" +
    ".rec-warn{display:inline-block;margin-left:6px;color:" + GOLD + ";font-size:.7rem}" +
    ".rec-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(218px,1fr));gap:10px}" +
    ".rec-card{background:var(--panel2);border:1px solid var(--border);border-top:2px solid rgba(201,162,39,.55);border-radius:10px;padding:11px 13px}" +
    ".rec-cl{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim)}" +
    ".rec-cv{font-size:1.45rem;font-weight:700;color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;margin:4px 0 3px;font-family:ui-monospace,Consolas,Menlo,monospace;line-height:1.1}" +
    ".rec-cs{font-size:.74rem;color:var(--dim);line-height:1.55}" +
    ".rec-cs a{color:" + GOLD + "}" +
    ".rec-probe{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 6px}" +
    ".rec-num{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.9rem;padding:6px 10px;width:118px;font-variant-numeric:tabular-nums}" +
    ".rec-num:focus{outline:0;border-color:" + GOLD + "}" +
    ".rec-range{width:330px;max-width:52vw;accent-color:" + GOLD + ";vertical-align:middle}" +
    ".rec-read{display:flex;flex-wrap:wrap;gap:10px 30px;margin:14px 0 2px;padding-top:12px;border-top:1px solid var(--border)}" +
    ".rec-rk{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin-bottom:3px}" +
    ".rec-rv{font-size:1.22rem;font-weight:700;color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".rec-sentence{margin:12px 0 0;font-size:.9rem;line-height:1.7;color:var(--text)}" +
    ".rec-sentence b{color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums}" +
    ".rec-grid{border-collapse:separate;border-spacing:3px;font-variant-numeric:tabular-nums;font-size:.78rem}" +
    ".rec-grid th{font-size:.62rem;color:var(--dim);font-weight:600;padding:2px 6px;white-space:nowrap}" +
    ".rec-grid th.rec-rowh{text-align:right;font-size:.74rem;color:var(--text);font-weight:400}" +
    ".rec-grid td{text-align:center;min-width:46px;padding:6px 7px;border-radius:5px;border:1px solid transparent;color:" + GOLD_TEXT + "}" +
    ".rec-grid td.rec-never{color:#3f4870;background:rgba(127,137,179,.07)}" +
    ".rec-grid td.rec-colon{border-color:rgba(242,226,174,.7)}" +
    ".rec-grid th.rec-colon{color:" + GOLD_TEXT + "}" +
    ".rec-lane{display:block;position:relative;height:16px;background:rgba(127,137,179,.09);border-radius:3px;min-width:180px}" +
    ".rec-lane i{position:absolute;top:0;bottom:0;left:0;border-radius:3px;background:linear-gradient(90deg,rgba(201,162,39,.5),rgba(201,162,39,.16))}" +
    ".rec-lane u{position:absolute;top:-2px;bottom:-2px;width:2px;background:#9fb2e8}" +
    ".rec-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.72rem;color:var(--dim);margin:0 0 9px}" +
    ".rec-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}" +
    ".rec-spark{vertical-align:middle}";

  // ------------------------------------------------------------- formatting
  function E(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fint(n) {
    if (n === null || n === undefined || !isFinite(n)) return "-";
    return Math.round(n).toLocaleString();
  }
  function f1(n) {
    if (n === null || n === undefined || !isFinite(n)) return "-";
    return (Math.round(n * 10) / 10).toLocaleString(undefined,
      { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  function mmss(sec) {
    if (sec === null || sec === undefined || !isFinite(sec)) return "-";
    var s = Math.round(sec), m = Math.floor(s / 60), r = s - m * 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  var TT = null;   // the T handed in by the router, for links and colours

  function who(r) {
    if (!TT || TT.SHOW_PLAYER_PAGES === false) {
      return '<span class="rec-dim">Player ' + E(r.sid) + "</span>";
    }
    var key = (r.sid !== null && r.sid !== undefined) ? r.sid : r.pid;
    return '<a href="#/player/' + encodeURIComponent(key) + '">' + E(r.label) + "</a>";
  }
  function tankChip(name, id) {
    if (!name) return '<span class="rec-dim">unknown</span>';
    var c = (TT && TT.tankColor && TT.tankColor(name)) || GOLD;
    return '<a class="rec-tank" href="#/tank/' + encodeURIComponent(id || slugify(name)) +
      '" style="--tc:' + c + '">' + E(name) + "</a>";
  }
  function matchLink(mid, text) {
    if (!mid) return E(text);
    return '<a href="#/match/' + encodeURIComponent(mid) + '">' + E(text) + "</a>";
  }
  function dateOf(unix) {
    if (TT && TT.fmtDateTime) return TT.fmtDateTime(unix);
    return "-";
  }
  function tankColorOf(name) {
    return (TT && TT.tankColor && TT.tankColor(name)) || GOLD;
  }

  // -------------------------------------------------------- stat definitions
  //
  // Every one of these is a column the endgame scoreboard actually prints,
  // except the last two, which are stated arithmetic over two of them.
  var STATS = [
    { key: "dmg", label: "Damage", noun: "damage",
      get: function (r) { return r.dmg; }, fmt: fint, rnd: Math.round },
    { key: "kills", label: "Kills", noun: "kills",
      get: function (r) { return r.kills; }, fmt: fint, rnd: Math.round },
    { key: "assist", label: "Assist damage", noun: "assist damage",
      get: function (r) { return r.assist; }, fmt: fint, rnd: Math.round },
    { key: "blocked", label: "Damage blocked", noun: "blocked damage",
      get: function (r) { return r.blocked; }, fmt: fint, rnd: Math.round },
    { key: "combo", label: "Damage + assist", noun: "damage plus assist",
      get: function (r) { return r.dmg + r.assist; }, fmt: fint, rnd: Math.round },
    { key: "dpm", label: "Damage per minute", noun: "damage per minute alive",
      get: function (r) {
        return (r.sv !== null && r.sv >= 60) ? r.dmg / (r.sv / 60) : null;
      }, fmt: f1, rnd: function (v) { return Math.round(v * 10) / 10; },
      only: "alive 60s or more" }
  ];
  function statDef(key) {
    for (var i = 0; i < STATS.length; i++) if (STATS[i].key === key) return STATS[i];
    return STATS[0];
  }

  // ------------------------------------------------------------------ model
  var _M = null;
  function model(T) {
    if (_M) return _M;
    var D = (T && T.DATA) || {};
    var matches = D.matches || [];

    var career = {};
    (D.players || []).forEach(function (p) { if (p && p.id) career[p.id] = p; });

    var rows = [], byMid = {}, i, j;
    for (i = 0; i < matches.length; i++) {
      var m = matches[i];
      if (!m || !m.match_id) continue;
      byMid[m.match_id] = m;
      var ps = m.players || [];
      for (j = 0; j < ps.length; j++) {
        var p = ps[j];
        var cp = career[p.id];
        rows.push({
          pid: p.id, sid: p.short_id, label: p.label || "?", clan: p.clan,
          tank: p.tank || null, tankId: p.tank_id || null,
          dmg: numOr0(p.dmg), kills: numOr0(p.kills),
          assist: numOr0(p.assist), blocked: numOr0(p.blocked),
          sv: numOrNull(p.survival_sec),
          team: p.team, side: p.side,
          mid: m.match_id, map: m.map || "?", when: m.captured_unix,
          dur: numOr0(m.duration_sec),
          games: cp ? cp.games : null
        });
      }
    }

    // Per stat: every eligible player-game, sorted both ways, grouped by tank
    // and by match. One pass, cached, because five panels read the same thing.
    var stat = {};
    for (i = 0; i < STATS.length; i++) {
      var sd = STATS[i];
      var list = [], byTank = {}, best = {};
      for (j = 0; j < rows.length; j++) {
        var v = sd.get(rows[j]);
        if (v === null || v === undefined || !isFinite(v)) continue;
        var ent = { v: v, r: rows[j] };
        list.push(ent);
        if (rows[j].tank) {
          if (!byTank[rows[j].tank]) byTank[rows[j].tank] = [];
          byTank[rows[j].tank].push(ent);
        }
        var cur = best[rows[j].mid];
        if (!cur || v > cur.v) best[rows[j].mid] = ent;
      }
      var desc = list.slice().sort(function (a, b) {
        return (b.v - a.v) || ((a.r.when || 0) - (b.r.when || 0));
      });
      var asc = [];
      for (j = 0; j < list.length; j++) asc.push(list[j].v);
      asc.sort(function (a, b) { return a - b; });

      var tanks = {};
      for (var tk in byTank) {
        if (!byTank.hasOwnProperty(tk)) continue;
        var tl = byTank[tk].slice().sort(function (a, b) { return a.v - b.v; });
        var tv = [];
        for (j = 0; j < tl.length; j++) tv.push(tl[j].v);
        tanks[tk] = {
          tank: tk, n: tl.length, vals: tv,
          max: tv[tv.length - 1], med: median(tv),
          best: tl[tl.length - 1]
        };
      }
      stat[sd.key] = {
        def: sd, desc: desc, asc: asc, n: list.length,
        max: desc.length ? desc[0].v : 0,
        byMatch: best, tanks: tanks
      };
    }

    var chrono = matches.slice().sort(function (a, b) {
      return (a.captured_unix || 0) - (b.captured_unix || 0);
    });

    _M = {
      matches: matches, rows: rows, byMid: byMid, stat: stat,
      chrono: chrono, career: career,
      matchRecs: matchRecords(matches),
      span: [
        chrono.length ? chrono[0].captured_unix : null,
        chrono.length ? chrono[chrono.length - 1].captured_unix : null
      ]
    };
    return _M;
  }
  function numOr0(v) { return (typeof v === "number" && isFinite(v)) ? v : 0; }
  function numOrNull(v) { return (typeof v === "number" && isFinite(v)) ? v : null; }
  function median(sortedAsc) {
    if (!sortedAsc.length) return null;
    var n = sortedAsc.length, h = n >> 1;
    return n % 2 ? sortedAsc[h] : (sortedAsc[h - 1] + sortedAsc[h]) / 2;
  }
  // count of values >= x in an ascending array
  function countAtOrAbove(asc, x) {
    var lo = 0, hi = asc.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (asc[mid] < x) lo = mid + 1; else hi = mid;
    }
    return asc.length - lo;
  }

  // ------------------------------------------------------- match level records
  function matchRecords(matches) {
    var out = {
      longest: null, longestTies: 0, shortest: null,
      fastElim: null, fastCap: null,
      mostDmg: null, leastDmg: null, mostKills: null, mostKillsTies: 0,
      widest: null, narrowest: null,
      deficit: null, deficitN: 0, clean: null, cleanN: 0, cleanTies: 0
    };
    var i, j, m, ps;
    var dur = [], full = [];
    for (i = 0; i < matches.length; i++) {
      m = matches[i];
      if (!m || !m.match_id) continue;
      ps = m.players || [];
      var d = numOr0(m.duration_sec);
      var td = 0, tk = 0, missing = false;
      for (j = 0; j < ps.length; j++) {
        td += numOr0(ps[j].dmg);
        tk += numOr0(ps[j].kills);
        if (numOrNull(ps[j].survival_sec) === null) missing = true;
      }
      var rec = { m: m, dur: d, td: td, tk: tk, full: !missing };
      if (d > 0) dur.push(rec);
      full.push(rec);

      if (!out.mostDmg || td > out.mostDmg.td) out.mostDmg = rec;
      if (td > 0 && (!out.leastDmg || td < out.leastDmg.td)) out.leastDmg = rec;
      if (!out.mostKills || tk > out.mostKills.tk) out.mostKills = rec;
    }
    for (i = 0; i < dur.length; i++) {
      var r = dur[i];
      if (!out.longest || r.dur > out.longest.dur) out.longest = r;
      if (!out.shortest || r.dur < out.shortest.dur) out.shortest = r;
      if (r.m.win_type === "elimination" && (!out.fastElim || r.dur < out.fastElim.dur)) out.fastElim = r;
      if (r.m.win_type === "capture" && (!out.fastCap || r.dur < out.fastCap.dur)) out.fastCap = r;
    }
    for (i = 0; i < dur.length; i++) {
      if (out.longest && dur[i].dur === out.longest.dur) out.longestTies++;
    }
    for (i = 0; i < full.length; i++) {
      if (out.mostKills && full[i].tk === out.mostKills.tk) out.mostKillsTies++;
    }

    // The two numbers the site prints as "Score" are each side's final team
    // health. Which of the pair belongs to the winner depends on which side
    // the recording player was on, and every row carries that as "side".
    for (i = 0; i < matches.length; i++) {
      m = matches[i];
      if (!m || (m.winning_team !== 0 && m.winning_team !== 1)) continue;
      ps = m.players || [];
      var allyTeam = null;
      for (j = 0; j < ps.length; j++) {
        if (ps[j].side === "ally") { allyTeam = ps[j].team; break; }
      }
      if (allyTeam === null) continue;
      var sa = numOrNull(m.score_ally), se = numOrNull(m.score_enemy);
      if (sa === null || se === null) continue;
      var wh = (allyTeam === m.winning_team) ? sa : se;
      var lh = (allyTeam === m.winning_team) ? se : sa;
      var e = { m: m, wh: wh, lh: lh };
      if (!out.widest || wh > out.widest.wh) out.widest = e;
      if (wh > 0 && (!out.narrowest || wh < out.narrowest.wh)) out.narrowest = e;
    }

    // Death-time records, restricted to matches where every player has one.
    for (i = 0; i < matches.length; i++) {
      m = matches[i];
      if (!m || (m.winning_team !== 0 && m.winning_team !== 1)) continue;
      var d2 = numOr0(m.duration_sec);
      if (d2 <= 0) continue;
      ps = m.players || [];
      var ok = ps.length > 0, deaths = [], alive = [0, 0], wDead = 0, lDead = 0;
      for (j = 0; j < ps.length; j++) {
        var sv = numOrNull(ps[j].survival_sec), tm = ps[j].team;
        if (sv === null || (tm !== 0 && tm !== 1)) { ok = false; break; }
        alive[tm]++;
        if (sv < d2 - 1) {
          deaths.push([sv, tm]);
          if (tm === m.winning_team) wDead++; else lDead++;
        }
      }
      if (!ok || !alive[0] || !alive[1]) continue;
      out.deficitN++;
      out.cleanN++;
      deaths.sort(function (a, b) { return a[0] - b[0]; });
      var worst = 0, worstT = 0;
      for (j = 0; j < deaths.length; j++) {
        alive[deaths[j][1]]--;
        var lead = alive[m.winning_team] - alive[1 - m.winning_team];
        if (lead < worst) { worst = lead; worstT = deaths[j][0]; }
      }
      if (!out.deficit || worst < out.deficit.worst) {
        out.deficit = { m: m, worst: worst, at: worstT };
      }
      var cl = { m: m, wDead: wDead, lDead: lDead, dur: d2 };
      if (!out.clean ||
          cl.wDead < out.clean.wDead ||
          (cl.wDead === out.clean.wDead && cl.lDead > out.clean.lDead)) {
        out.clean = cl;
      }
    }
    if (out.clean) {
      for (i = 0; i < matches.length; i++) {
        m = matches[i];
        if (!m || (m.winning_team !== 0 && m.winning_team !== 1)) continue;
        var d3 = numOr0(m.duration_sec);
        if (d3 <= 0) continue;
        ps = m.players || [];
        var good = ps.length > 0, wd = 0;
        for (j = 0; j < ps.length; j++) {
          var s2 = numOrNull(ps[j].survival_sec);
          if (s2 === null) { good = false; break; }
          if (s2 < d3 - 1 && ps[j].team === m.winning_team) wd++;
        }
        if (good && wd === out.clean.wDead) out.cleanTies++;
      }
    }
    return out;
  }

  // --------------------------------------------------------------- SVG bits
  // matches the site's own charts: .chart-svg is width:100%; height:auto
  function svgOpen(w, h) {
    return '<svg class="chart-svg" width="100%" viewBox="0 0 ' + w + " " + h + '">';
  }
  function esc2(s) { return E(s); }

  // Distribution of every eligible player-game for one stat, with the record
  // and the reader's probe marked on it. Bar height is on a square-root scale
  // so the thin tail where the records live stays visible next to the bulk.
  function distStrip(S, probe) {
    var W = 1000, H = 150, L = 10, R = 10, TOP = 14, BOT = 26;
    var max = S.max || 1, bins = 72, i;
    var counts = [];
    for (i = 0; i < bins; i++) counts.push(0);
    for (i = 0; i < S.asc.length; i++) {
      var b = Math.floor(S.asc[i] / max * bins);
      counts[clamp(b, 0, bins - 1)]++;
    }
    var cmax = 1;
    for (i = 0; i < bins; i++) if (counts[i] > cmax) cmax = counts[i];
    var pw = W - L - R, ph = H - TOP - BOT;
    var bw = pw / bins;
    var out = svgOpen(W, H);
    out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
      '" fill="rgba(127,137,179,.05)"/>';
    for (i = 0; i < bins; i++) {
      var h = Math.sqrt(counts[i] / cmax) * ph;
      if (h < 0.6 && counts[i] > 0) h = 0.6;
      var on = probe !== null && ((i + 1) / bins * max) > probe;
      out += '<rect x="' + (L + i * bw).toFixed(2) + '" y="' + (TOP + ph - h).toFixed(2) +
        '" width="' + (bw - 0.7).toFixed(2) + '" height="' + h.toFixed(2) +
        '" fill="' + (on ? GOLD : COOL) + '" opacity="' + (on ? 0.85 : 0.72) + '"/>';
    }
    function x(v) { return L + clamp(v / max, 0, 1) * pw; }
    if (probe !== null) {
      out += '<line x1="' + x(probe).toFixed(1) + '" y1="' + (TOP - 6) + '" x2="' +
        x(probe).toFixed(1) + '" y2="' + (TOP + ph) + '" stroke="' + GOLD_TEXT +
        '" stroke-width="1.6"/>';
    }
    out += '<line x1="' + x(max).toFixed(1) + '" y1="' + (TOP - 6) + '" x2="' +
      x(max).toFixed(1) + '" y2="' + (TOP + ph) + '" stroke="' + GOLD +
      '" stroke-width="1.6" stroke-dasharray="3 3"/>';
    out += '<line x1="' + L + '" y1="' + (TOP + ph) + '" x2="' + (W - R) + '" y2="' +
      (TOP + ph) + '" stroke="rgba(127,137,179,.4)" stroke-width="1"/>';
    var ticks = [0, 0.25, 0.5, 0.75, 1];
    for (i = 0; i < ticks.length; i++) {
      var tv = ticks[i] * max;
      out += '<text x="' + x(tv).toFixed(1) + '" y="' + (H - 8) +
        '" fill="#7f89b3" font-size="12" text-anchor="' +
        (i === 0 ? "start" : (i === ticks.length - 1 ? "end" : "middle")) +
        '">' + esc2(S.def.fmt(tv)) + "</text>";
    }
    out += "</svg>";
    return out;
  }

  // Running maximum over the archive in the order matches were recorded. The
  // faint dots are each match's own best, so the near misses are visible under
  // the line that only ever goes up.
  function timeChart(M, S) {
    var chrono = M.chrono;
    var pts = [], breaks = [], run = null, i;
    for (i = 0; i < chrono.length; i++) {
      var e = S.byMatch[chrono[i].match_id];
      var v = e ? e.v : null;
      if (v !== null && (run === null || v > run)) {
        run = v;
        breaks.push({ i: i, v: v, e: e });
      }
      pts.push({ run: run, own: v, m: chrono[i] });
    }
    if (breaks.length < 2) return { html: "", breaks: breaks };
    var W = 1000, H = 260, L = 12, R = 12, TOP = 14, BOT = 30;
    var pw = W - L - R, ph = H - TOP - BOT;
    var max = S.max || 1;
    function x(i2) { return L + (chrono.length < 2 ? 0 : i2 / (chrono.length - 1)) * pw; }
    function y(v) { return TOP + ph - clamp(v / max, 0, 1) * ph; }
    var out = svgOpen(W, H);
    out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
      '" fill="rgba(127,137,179,.05)"/>';
    for (i = 0; i < pts.length; i++) {
      if (pts[i].own === null) continue;
      out += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(pts[i].own).toFixed(1) +
        '" r="1.7" fill="' + COOL + '" opacity="0.7"/>';
    }
    var d = "";
    for (i = 0; i < pts.length; i++) {
      if (pts[i].run === null) continue;
      var px = x(i).toFixed(1), py = y(pts[i].run).toFixed(1);
      d += (d ? " L" + px + "," + py : "M" + px + "," + py);
    }
    out += '<path d="' + d + '" fill="none" stroke="' + GOLD +
      '" stroke-width="2" stroke-linejoin="round"/>';
    for (i = 0; i < breaks.length; i++) {
      var b = breaks[i];
      var cx = x(b.i).toFixed(1), cy = y(b.v).toFixed(1);
      out += '<a href="#/match/' + encodeURIComponent(b.e.r.mid) + '">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' +
        (i === breaks.length - 1 ? 5 : 3.4) + '" fill="' +
        (i === breaks.length - 1 ? GOLD_TEXT : GOLD) + '" stroke="#0a0e1f" stroke-width="1">' +
        "<title>" + esc2(S.def.fmt(b.v) + " " + S.def.noun + ", " +
          b.e.r.map + ", " + dateOf(b.e.r.when)) + "</title></circle></a>";
    }
    out += '<line x1="' + L + '" y1="' + (TOP + ph) + '" x2="' + (W - R) + '" y2="' +
      (TOP + ph) + '" stroke="rgba(127,137,179,.4)"/>';
    out += '<text x="' + L + '" y="' + (H - 9) + '" fill="#7f89b3" font-size="12">' +
      esc2(dateOf(M.span[0])) + "</text>";
    out += '<text x="' + (W - R) + '" y="' + (H - 9) +
      '" fill="#7f89b3" font-size="12" text-anchor="end">' + esc2(dateOf(M.span[1])) + "</text>";
    out += "</svg>";
    return { html: out, breaks: breaks };
  }

  function sparkTop(entries, max) {
    var W = 132, H = 22, n = entries.length;
    if (!n) return "";
    var bw = W / n;
    var out = '<svg class="rec-spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' +
      W + " " + H + '">';
    for (var i = 0; i < n; i++) {
      var h = Math.max(1.5, (entries[i].v / (max || 1)) * (H - 2));
      out += '<rect x="' + (i * bw + 0.6).toFixed(2) + '" y="' + (H - h).toFixed(2) +
        '" width="' + (bw - 1.2).toFixed(2) + '" height="' + h.toFixed(2) +
        '" fill="' + (i === 0 ? GOLD_TEXT : GOLD) + '" opacity="' +
        (i === 0 ? 1 : 0.45) + '"/>';
    }
    return out + "</svg>";
  }

  // ------------------------------------------------------------------ state
  var ST = { stat: "dmg", minGames: 1, perPlayer: false, probe: null, thIdx: 0 };

  function pctlValue(S, q) {
    if (!S.asc.length) return 0;
    return S.asc[clamp(Math.round((S.asc.length - 1) * q), 0, S.asc.length - 1)];
  }
  function defaultProbe(S) { return pctlValue(S, 0.9); }

  function tanksList(S) {
    var list = [];
    for (var k in S.tanks) if (S.tanks.hasOwnProperty(k)) list.push(S.tanks[k]);
    list.sort(function (a, b) { return b.max - a.max; });
    return list;
  }

  // Open the grid on the first bar that somebody has never cleared, since a
  // column every tank has managed says nothing.
  function defaultThIdx(S) {
    var th = thresholds(S), list = tanksList(S);
    for (var c = 0; c < th.length; c++) {
      for (var i = 0; i < list.length; i++) {
        if (countAtOrAbove(list[i].vals, th[c]) === 0) return c;
      }
    }
    return 0;
  }

  function thresholds(S) {
    var max = S.max || 1;
    var mags = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 1500,
                2000, 2500, 5000, 10000];
    var step = mags[mags.length - 1];
    for (var i = 0; i < mags.length; i++) {
      if (Math.floor(max / mags[i]) <= 9) { step = mags[i]; break; }
    }
    var out = [];
    for (var v = step; v <= max + 1e-9 && out.length < 12; v += step) out.push(v);
    if (!out.length) out.push(max);
    return out;
  }

  // ------------------------------------------------------------- the panels
  function headlineHtml(M) {
    var S = M.stat[ST.stat];
    if (!S || !S.desc.length) return "";
    var top = S.desc[0];
    var g = top.r.games;
    return "<b>" + esc2(S.def.fmt(top.v)) + "</b>" +
      esc2(S.def.noun) + " &middot; " + who(top.r) + " &middot; " +
      (g === null ? "games unknown" : esc2(fint(g) + (g === 1 ? " game" : " games"))) +
      " &middot; " + matchLink(top.r.mid, "the match");
  }

  function boardHtml(M) {
    var S = M.stat[ST.stat];
    var mins = [1, 3, 5, 10, 25];
    var segs = mins.map(function (n) {
      return '<button type="button" data-mg="' + n + '"' +
        (ST.minGames === n ? ' class="rec-on"' : "") + ">" +
        (n === 1 ? "any" : n + "+") + "</button>";
    }).join("");

    var kept = [], i, seen = {};
    var eligible = 0, holders = 0;
    for (i = 0; i < S.desc.length; i++) {
      var e = S.desc[i], g = e.r.games;
      if (ST.minGames > 1 && (g === null || g < ST.minGames)) continue;
      eligible++;
      var fresh = !seen[e.r.pid];
      if (fresh) { seen[e.r.pid] = 1; holders++; }
      if (kept.length < 14 && (fresh || !ST.perPlayer)) kept.push(e);
    }
    var top = kept.length ? kept[0].v : 1;

    var rows = kept.map(function (e, idx) {
      var r = e.r, thin = (r.games !== null && r.games < 5);
      return '<tr' + (thin ? ' class="rec-thin"' : "") + ">" +
        '<td class="rec-rank">' + (idx + 1) + "</td>" +
        '<td class="rec-valcell"><span class="rec-bar" style="width:' +
          (clamp(e.v / (top || 1), 0, 1) * 100).toFixed(1) + '%"></span><b>' +
          esc2(S.def.fmt(e.v)) + "</b></td>" +
        "<td>" + who(r) + (thin ? '<span class="rec-warn" title="' +
          esc2(fint(r.games)) + ' games on record">thin</span>' : "") + "</td>" +
        "<td>" + tankChip(r.tank, r.tankId) + "</td>" +
        '<td class="rec-dim">' + esc2(r.map) + "</td>" +
        '<td class="rec-games">' + (r.games === null ? "-" : esc2(fint(r.games))) + "</td>" +
        '<td class="rec-dim">' + esc2(dateOf(r.when)) + "</td>" +
        '<td class="rec-dim">' + matchLink(r.mid, "match") + "</td>" +
        "</tr>";
    }).join("");

    return '<div class="rec-ctl">' +
      '<span class="rec-k">Holder must have</span>' +
      '<div class="rec-seg" id="rec-mg">' + segs + "</div>" +
      '<span class="rec-k">Show</span>' +
      '<div class="rec-seg">' +
        '<button type="button" data-pp="0"' + (ST.perPlayer ? "" : ' class="rec-on"') +
          ">every game</button>" +
        '<button type="button" data-pp="1"' + (ST.perPlayer ? ' class="rec-on"' : "") +
          ">best per player</button>" +
      "</div>" +
      '<span class="rec-note">' + esc2(fint(eligible)) + " of " + esc2(fint(S.n)) +
        " player-games qualify, from " + esc2(fint(holders)) + " players" +
        (S.def.only ? " (" + esc2(S.def.only) + ")" : "") +
      "</span></div>" +
      (kept.length
        ? '<div class="rec-scroll"><table class="rec-table"><thead><tr>' +
          "<th></th><th>" + esc2(S.def.label) + "</th><th>Player</th><th>Tank</th>" +
          "<th>Map</th><th>Games</th><th>When</th><th></th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div>"
        : '<p class="rec-note">No holder has that many games.</p>');
  }

  function rareCtlHtml(M) {
    var S = M.stat[ST.stat];
    var max = S.max || 1;
    var step = max > 200 ? 10 : (max > 20 ? 1 : 0.5);
    return '<div class="rec-probe">' +
      '<span class="rec-k">' + esc2(S.def.label) + "</span>" +
      '<input class="rec-num" id="rec-probe-num" type="number" min="0" max="' +
        Math.ceil(max) + '" step="' + step + '" value="' + Math.round(ST.probe) + '">' +
      '<input class="rec-range" id="rec-probe-range" type="range" min="0" max="' +
        Math.ceil(max) + '" step="' + step + '" value="' + Math.round(ST.probe) + '">' +
      '<div class="rec-seg">' +
        '<button type="button" data-quick="0.5">median</button>' +
        '<button type="button" data-quick="0.9">top 10%</button>' +
        '<button type="button" data-quick="0.99">top 1%</button>' +
        '<button type="button" data-quick="1">the record</button>' +
      "</div></div>";
  }

  function rareOutHtml(M) {
    var S = M.stat[ST.stat];
    var x = ST.probe;
    var at = countAtOrAbove(S.asc, x);
    var below = S.n - at;
    var pct = S.n ? below / S.n * 100 : 0;
    var oneIn = at > 0 ? S.n / at : null;

    var sentence;
    if (at === 0) {
      sentence = "Nothing in the archive reaches <b>" + esc2(S.def.fmt(x)) +
        "</b> " + esc2(S.def.noun) + ". Highest is <b>" +
        esc2(S.def.fmt(S.max)) + "</b>.";
    } else {
      var ratio = x > 0 ? S.max / x : null;
      var tail;
      if (x >= S.max) tail = ". Nothing has gone higher.";
      else if (ratio !== null && ratio < 1.05) {
        tail = ", within a few percent of the record <b>" +
          esc2(S.def.fmt(S.max)) + "</b>.";
      } else if (ratio !== null) {
        tail = ". Record <b>" + esc2(S.def.fmt(S.max)) + "</b>, " +
          esc2(f1(ratio)) + " times this.";
      } else tail = ".";
      sentence = "<b>" + esc2(fint(at)) + "</b> of " + esc2(fint(S.n)) +
        " player-games at <b>" + esc2(S.def.fmt(x)) + "</b> " + esc2(S.def.noun) +
        " or more, about <b>1 in " + esc2(fint(oneIn)) + "</b>" + tail;
    }

    return '<div class="rec-key">' +
        '<span><i style="background:' + GOLD + '"></i>at or above your number</span>' +
        '<span><i style="background:' + COOL + '"></i>below it</span>' +
        '<span><i style="background:' + GOLD + ';opacity:.5"></i>dashed line: the record</span>' +
      "</div>" +
      distStrip(S, x) +
      '<div class="rec-read">' +
        '<div><div class="rec-rk">Percentile</div><div class="rec-rv">' +
          esc2(f1(pct)) + "</div></div>" +
        '<div><div class="rec-rk">Games at or above</div><div class="rec-rv">' +
          esc2(fint(at)) + "</div></div>" +
        '<div><div class="rec-rk">Out of</div><div class="rec-rv">' +
          esc2(fint(S.n)) + "</div></div>" +
        '<div><div class="rec-rk">Record</div><div class="rec-rv">' +
          esc2(S.def.fmt(S.max)) + "</div></div>" +
      "</div>" +
      '<p class="rec-sentence">' + sentence + "</p>";
  }

  function ceilingHtml(M) {
    var S = M.stat[ST.stat];
    var list = tanksList(S);
    if (!list.length) return "";
    var gmax = S.max || 1;
    var never = [];
    for (var i = 0; i < list.length; i++) if (list[i].max <= 0) never.push(list[i]);

    var rows = list.map(function (t) {
      var w = clamp(t.max / gmax, 0, 1) * 100;
      var mw = clamp((t.med || 0) / gmax, 0, 1) * 100;
      // a ceiling of zero has no holder worth naming: nobody did anything
      var zero = !(t.max > 0);
      return "<tr>" +
        "<td>" + tankChip(t.tank, null) + "</td>" +
        '<td style="width:52%"><span class="rec-lane"><i style="width:' + w.toFixed(1) +
          '%"></i><u style="left:' + mw.toFixed(1) + '%" title="median ' +
          esc2(S.def.fmt(t.med)) + '"></u></span></td>' +
        '<td class="rec-valcell"><b>' + esc2(S.def.fmt(t.max)) + "</b></td>" +
        '<td class="rec-dim">' + esc2(S.def.fmt(t.med)) + "</td>" +
        '<td class="rec-games">' + esc2(fint(t.n)) + "</td>" +
        "<td>" + (zero ? '<span class="rec-dim">nobody</span>' : who(t.best.r)) + "</td>" +
        '<td class="rec-dim">' + (zero ? "" : matchLink(t.best.r.mid, "match")) + "</td>" +
        "</tr>";
    }).join("");

    var neverLine = "";
    if (never.length) {
      var names = never.map(function (t) {
        return esc2(t.tank) + " (" + esc2(fint(t.n)) + " games)";
      }).join(", ");
      neverLine = '<p class="rec-sentence">Never recorded any ' +
        esc2(S.def.noun) + ": <b>" + names + "</b>.</p>";
    }

    return '<div class="rec-key">' +
        '<span><i style="background:' + GOLD + '"></i>best single game</span>' +
        '<span><i style="background:#9fb2e8"></i>median game</span>' +
        "<span>same scale, ending at the record " +
        esc2(S.def.fmt(gmax)) + "</span>" +
      "</div>" +
      '<div class="rec-scroll"><table class="rec-table"><thead><tr>' +
      "<th>Tank</th><th></th><th>Ceiling</th><th>Median</th><th>Games</th>" +
      "<th>Who</th><th></th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      neverLine;
  }

  function progressionHtml(M) {
    var S = M.stat[ST.stat];
    var tc = timeChart(M, S);
    if (!tc.html) return '<p class="rec-note">Not enough matches to draw this.</p>';
    var last = tc.breaks[tc.breaks.length - 1];
    var since = M.chrono.length - 1 - last.i;
    var first = tc.breaks[0];
    return tc.html +
      '<div class="rec-read">' +
        '<div><div class="rec-rk">Times the record moved</div><div class="rec-rv">' +
          esc2(fint(tc.breaks.length - 1)) + "</div></div>" +
        '<div><div class="rec-rk">Opening mark</div><div class="rec-rv">' +
          esc2(S.def.fmt(first.v)) + "</div></div>" +
        '<div><div class="rec-rk">Standing mark</div><div class="rec-rv">' +
          esc2(S.def.fmt(last.v)) + "</div></div>" +
        '<div><div class="rec-rk">Matches since</div><div class="rec-rv">' +
          esc2(fint(since)) + "</div></div>" +
      "</div>" +
      '<p class="rec-sentence">Standing mark <b>' + esc2(S.def.fmt(last.v)) +
      "</b>: " + esc2(last.e.r.map) + ", " + who(last.e.r) + ", " +
      esc2(dateOf(last.e.r.when)) + " (" + matchLink(last.e.r.mid, "match") +
      "). Unbeaten for <b>" + esc2(fint(since)) + "</b> matches.</p>";
  }

  function cardsHtml(M) {
    var R = M.matchRecs, out = [];
    function card(label, value, sub, mid) {
      out.push('<div class="rec-card"><div class="rec-cl">' + esc2(label) + "</div>" +
        '<div class="rec-cv">' + value + "</div>" +
        '<div class="rec-cs">' + sub +
        (mid ? " &middot; " + matchLink(mid, "open") : "") + "</div></div>");
    }
    function where(m) {
      return esc2((m.map || "?") + ", " + dateOf(m.captured_unix));
    }
    if (R.longest) {
      card("Longest match", esc2(mmss(R.longest.dur)),
        where(R.longest.m) + (R.longestTies > 1
          ? " &middot; tied by " + esc2(fint(R.longestTies)) + " matches"
          : ""), R.longest.m.match_id);
    }
    if (R.shortest) {
      card("Shortest match", esc2(mmss(R.shortest.dur)),
        where(R.shortest.m), R.shortest.m.match_id);
    }
    if (R.fastElim) {
      card("Fastest win by elimination", esc2(mmss(R.fastElim.dur)),
        where(R.fastElim.m), R.fastElim.m.match_id);
    }
    if (R.fastCap) {
      card("Fastest capture", esc2(mmss(R.fastCap.dur)),
        where(R.fastCap.m), R.fastCap.m.match_id);
    }
    if (R.mostDmg) {
      card("Most damage in one match", esc2(fint(R.mostDmg.td)),
        "all sixteen players &middot; " + where(R.mostDmg.m), R.mostDmg.m.match_id);
    }
    if (R.leastDmg) {
      card("Least damage in one match", esc2(fint(R.leastDmg.td)),
        "all sixteen players &middot; " + where(R.leastDmg.m), R.leastDmg.m.match_id);
    }
    if (R.mostKills) {
      card("Most eliminations", esc2(fint(R.mostKills.tk)),
        where(R.mostKills.m) + (R.mostKillsTies > 1
          ? " &middot; tied by " + esc2(fint(R.mostKillsTies)) + " matches" : ""),
        R.mostKills.m.match_id);
    }
    if (R.widest) {
      card("Most health left standing", esc2(fint(R.widest.wh)),
        "winner, against " + esc2(fint(R.widest.lh)) + " &middot; " +
        where(R.widest.m), R.widest.m.match_id);
    }
    if (R.narrowest) {
      card("Narrowest win", esc2(fint(R.narrowest.wh)),
        "winner's health left &middot; " + where(R.narrowest.m),
        R.narrowest.m.match_id);
    }
    if (R.deficit && R.deficit.worst < 0) {
      card("Deepest hole climbed out of", esc2(fint(-R.deficit.worst)) + " tanks",
        "down at " + esc2(mmss(R.deficit.at)) + ", still won &middot; " +
        where(R.deficit.m), R.deficit.m.match_id);
    }
    if (R.clean) {
      card("Cleanest win", esc2(fint(R.clean.wDead)) + " lost",
        "winner lost " + esc2(fint(R.clean.wDead)) + ", took " +
        esc2(fint(R.clean.lDead)) + " &middot; " + where(R.clean.m), R.clean.m.match_id);
    }
    return '<div class="rec-cards">' + out.join("") + "</div>";
  }

  function neverCtlHtml(M) {
    var S = M.stat[ST.stat];
    var th = thresholds(S);
    if (ST.thIdx >= th.length) ST.thIdx = th.length - 1;
    if (ST.thIdx < 0) ST.thIdx = 0;
    return '<div class="rec-probe">' +
      '<span class="rec-k">Bar to clear</span>' +
      '<input class="rec-range" id="rec-th-range" type="range" min="0" max="' +
        (th.length - 1) + '" step="1" value="' + ST.thIdx + '">' +
      '<span class="rec-rv">' + esc2(S.def.fmt(th[ST.thIdx])) + " " +
        esc2(S.def.noun) + "</span></div>";
  }

  function neverOutHtml(M) {
    var S = M.stat[ST.stat];
    var th = thresholds(S);
    var sel = clamp(ST.thIdx, 0, th.length - 1);
    var list = tanksList(S);
    if (!list.length) return "";

    var head = '<tr><th class="rec-rowh">Tank</th><th class="rec-rowh">Games</th>';
    for (var c = 0; c < th.length; c++) {
      head += "<th" + (c === sel ? ' class="rec-colon"' : "") + ">" +
        esc2(S.def.fmt(th[c])) + "</th>";
    }
    head += "</tr>";

    var body = list.map(function (t) {
      var tds = "";
      for (var c2 = 0; c2 < th.length; c2++) {
        var n = countAtOrAbove(t.vals, th[c2]);
        var share = t.n ? n / t.n : 0;
        var cls = (n === 0 ? "rec-never" : "") + (c2 === sel ? " rec-colon" : "");
        var bg = n === 0 ? "" :
          ';background:rgba(201,162,39,' + (0.12 + Math.min(0.72, Math.sqrt(share) * 0.8)).toFixed(2) + ")";
        tds += '<td class="' + cls + '" style="' + bg.replace(/^;/, "") + '" title="' +
          esc2(t.tank + ": " + fint(n) + " of " + fint(t.n) + " games at or above " +
            S.def.fmt(th[c2])) + '">' + (n === 0 ? "never" : esc2(fint(n))) + "</td>";
      }
      return '<tr><th class="rec-rowh" style="color:' + tankColorOf(t.tank) + '">' +
        esc2(t.tank) + '</th><th class="rec-rowh"><span class="rec-games">' +
        esc2(fint(t.n)) + "</span></th>" + tds + "</tr>";
    }).join("");

    var cleared = 0, tot = 0, neverNames = [];
    for (var i = 0; i < list.length; i++) {
      tot++;
      if (countAtOrAbove(list[i].vals, th[sel]) > 0) cleared++;
      else neverNames.push(list[i].tank);
    }
    var sentence = "At <b>" + esc2(S.def.fmt(th[sel])) + "</b> " + esc2(S.def.noun) +
      ": <b>" + esc2(fint(cleared)) + "</b> of " + esc2(fint(tot)) + " tanks. " +
      (neverNames.length
        ? "Never: <b>" + esc2(neverNames.join(", ")) + "</b>."
        : "All of them.");

    return '<div class="rec-scroll"><table class="rec-grid"><thead>' + head +
      "</thead><tbody>" + body + "</tbody></table></div>" +
      '<p class="rec-sentence">' + sentence + "</p>";
  }

  function safetyHtml(M) {
    var rows = STATS.map(function (sd) {
      var S = M.stat[sd.key];
      if (S.desc.length < 2) return "";
      var a = S.desc[0], b = S.desc[1];
      // subtract the numbers as they are printed, so the gap column agrees
      // with the two columns either side of it
      var rnd = sd.rnd || Math.round;
      var gap = rnd(a.v) - rnd(b.v);
      var gapPct = b.v ? gap / rnd(b.v) * 100 : null;
      var tied = 0;
      for (var i = 0; i < S.desc.length; i++) { if (S.desc[i].v === a.v) tied++; else break; }
      var holders = {}, distinct = 0;
      for (var j = 0; j < Math.min(10, S.desc.length); j++) {
        var pid = S.desc[j].r.pid;
        if (!holders[pid]) { holders[pid] = 1; distinct++; }
      }
      var thin = (a.r.games !== null && a.r.games < 5);
      return '<tr' + (thin ? ' class="rec-thin"' : "") + ">" +
        "<td>" + esc2(sd.label) + "</td>" +
        '<td class="rec-valcell"><b>' + esc2(sd.fmt(a.v)) + "</b></td>" +
        "<td>" + who(a.r) + "</td>" +
        '<td class="rec-games">' + (a.r.games === null ? "-" : esc2(fint(a.r.games))) + "</td>" +
        '<td class="rec-dim">' + esc2(sd.fmt(b.v)) + "</td>" +
        "<td>" + (tied > 1
          ? '<span class="rec-dim">tied ' + esc2(fint(tied)) + " ways</span>"
          : "+" + esc2(sd.fmt(gap)) + (gapPct === null ? "" :
              ' <span class="rec-dim">(' + esc2(f1(gapPct)) + "%)</span>")) + "</td>" +
        '<td class="rec-games">' + esc2(fint(distinct)) + "</td>" +
        "<td>" + sparkTop(S.desc.slice(0, 10), S.max) + "</td>" +
        "</tr>";
    }).join("");
    return '<div class="rec-scroll"><table class="rec-table"><thead><tr>' +
      "<th>Record</th><th>Mark</th><th>Holder</th><th>Their games</th>" +
      "<th>Second</th><th>Clear by</th><th>Names in top 10</th><th>Top 10 drop-off</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  // ------------------------------------------------------------------ notes
  function archiveNote(M) {
    var n = M.matches.length;
    var top = null, D = (TT && TT.DATA) || {};
    (D.players || []).forEach(function (p) {
      if (!top || (p.games || 0) > (top.games || 0)) top = p;
    });
    return "Extremes of " + esc2(fint(n)) + " uploaded matches (" +
      esc2(fint(M.rows.length)) + " player-games), not of the game. " +
      "Any unuploaded game could beat these.";
  }

  // ------------------------------------------------------------------ suite
  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "records",
    title: "Records",
    blurb: "The archive's best and worst, each tied to its match.",
    accent: GOLD,
    css: CSS,
    gated: true,

    // The top 240 player-games by damage, ranked left to right, against the
    // median of all of them. Real values, no decoration.
    preview: function (T) {
      TT = T;
      var M;
      try { M = model(T); } catch (e) { return ""; }
      var S = M.stat.dmg;
      if (!S || S.desc.length < 120) return "";
      var n = Math.min(240, S.desc.length);
      var max = S.max || 1;
      var med = median(S.asc) || 0;
      var out = '<svg viewBox="0 0 240 240">';
      out += '<rect x="0" y="0" width="240" height="240" fill="#0d1226"/>';
      for (var i = 0; i < n; i++) {
        var h = (S.desc[i].v / max) * 196;
        var t = i / n;
        out += '<rect x="' + i + '" y="' + (222 - h).toFixed(1) + '" width="1" height="' +
          h.toFixed(1) + '" fill="' + (i < 3 ? "#f2e2ae" : GOLD) + '" opacity="' +
          (0.95 - t * 0.55).toFixed(2) + '"/>';
      }
      var my = 222 - (med / max) * 196;
      out += '<line x1="0" y1="' + my.toFixed(1) + '" x2="240" y2="' + my.toFixed(1) +
        '" stroke="#6b78a8" stroke-width="1" stroke-dasharray="4 4"/>';
      out += '<circle cx="0.5" cy="' + (222 - 196).toFixed(1) +
        '" r="4" fill="#f2e2ae"/>';
      out += "</svg>";
      return out;
    },

    render: function (T) {
      TT = T;
      var M = model(T);
      if (!M.rows.length) {
        return T.bigPanel("Records", '<p class="small">No matches in the archive yet.</p>', "");
      }
      var S = M.stat[ST.stat];
      if (ST.probe === null) {
        ST.probe = defaultProbe(S);
        ST.thIdx = defaultThIdx(S);
      }

      var chips = STATS.map(function (sd) {
        return '<button type="button" class="rec-chip' +
          (ST.stat === sd.key ? " rec-on" : "") + '" data-stat="' + sd.key + '">' +
          esc2(sd.label) + "</button>";
      }).join("");

      var html = '<div class="rec-topbar">' +
        '<span class="rec-k">Pick the record</span>' +
        '<div class="rec-chips">' + chips + "</div>" +
        '<div class="rec-headline" id="rec-headline">' + headlineHtml(M) + "</div>" +
        "</div>";

      html += T.bigPanel("The board",
        '<div id="rec-board-inner">' + boardHtml(M) + "</div>",
        "Top fourteen single games, from " +
        fint(M.rows.length) + " player-games in " + fint(M.matches.length) +
        " matches. Games is the player's whole career. Thin bars come from under " +
        "five games. Weaker claim.");

      html += T.bigPanel("How rare is that",
        '<div id="rec-rare-inner">' +
          '<div id="rec-rare-ctl">' + rareCtlHtml(M) + "</div>" +
          '<div id="rec-rare-out">' + rareOutHtml(M) + "</div>" +
        "</div>",
        "Bar heights are square-root scaled, not proportional. Percentile is the " +
        "share strictly below. Rare here is not rare in the game.");

      html += T.bigPanel("Every tank's ceiling",
        '<div id="rec-ceil-inner">' + ceilingHtml(M) + "</div>",
        "Best game per tank, median marked on the same bar. A high ceiling on " +
        "few games is mostly chances taken. A maximum, not a rating.");

      html += T.bigPanel("The record, as it was set",
        '<div id="rec-time-inner">' + progressionHtml(M) + "</div>",
        "Running maximum in upload order, not calendar order. Gaps are not to " +
        "scale. Faint dots are every other match's own best.");

      html += T.bigPanel("Match records",
        cardsHtml(M),
        "Whole matches, not single players. Lengths and damage cover all " +
        fint(M.matches.length) + ". The deepest hole and cleanest win need every " +
        "death time. Those cover " + fint(M.matchRecs.cleanN) + ".");

      html += T.bigPanel("What has never happened",
        '<div id="rec-never-inner">' +
          '<div id="rec-never-ctl">' + neverCtlHtml(M) + "</div>" +
          '<div id="rec-never-out">' + neverOutHtml(M) + "</div>" +
        "</div>",
        "A never cell means no recorded game reached that bar. That is telling at " +
        "a hundred games. Not at ten. Shading is share of that tank's own games, " +
        "not volume.");

      html += T.bigPanel("How safe is each record",
        safetyHtml(M),
        "Distance from second place. Names in top 10 is how many distinct " +
        "players hold the ten best games. " + archiveNote(M));

      return html;
    },

    wire: function (T, root) {
      TT = T;
      var M = model(T);

      function el(id) { return root.querySelector("#" + id); }
      function setHtml(id, html) { var e = el(id); if (e) e.innerHTML = html; }

      function redrawStat() {
        var S = M.stat[ST.stat];
        ST.probe = defaultProbe(S);
        ST.thIdx = defaultThIdx(S);
        var chips = root.querySelectorAll(".rec-chip");
        for (var i = 0; i < chips.length; i++) {
          var on = chips[i].getAttribute("data-stat") === ST.stat;
          chips[i].className = "rec-chip" + (on ? " rec-on" : "");
        }
        setHtml("rec-headline", headlineHtml(M));
        setHtml("rec-board-inner", boardHtml(M));
        setHtml("rec-rare-ctl", rareCtlHtml(M));
        setHtml("rec-rare-out", rareOutHtml(M));
        setHtml("rec-ceil-inner", ceilingHtml(M));
        setHtml("rec-time-inner", progressionHtml(M));
        setHtml("rec-never-ctl", neverCtlHtml(M));
        setHtml("rec-never-out", neverOutHtml(M));
      }

      // The probe controls are deliberately NOT rebuilt while the reader is
      // dragging them; only the readout under them is.
      function redrawProbe(fromInput) {
        var num = el("rec-probe-num"), rng = el("rec-probe-range");
        if (num && fromInput !== "num") num.value = Math.round(ST.probe);
        if (rng && fromInput !== "range") rng.value = Math.round(ST.probe);
        setHtml("rec-rare-out", rareOutHtml(M));
      }

      function redrawThreshold() {
        var S = M.stat[ST.stat];
        var th = thresholds(S);
        var lab = root.querySelector("#rec-never-ctl .rec-rv");
        if (lab) {
          lab.innerHTML = esc2(S.def.fmt(th[clamp(ST.thIdx, 0, th.length - 1)])) +
            " " + esc2(S.def.noun);
        }
        setHtml("rec-never-out", neverOutHtml(M));
      }

      function upTo(node, tag) {
        while (node && node !== root) {
          if (node.tagName && node.tagName.toLowerCase() === tag) return node;
          node = node.parentNode;
        }
        return null;
      }

      root.addEventListener("click", function (e) {
        var b = upTo(e.target, "button");
        if (!b) return;
        var st = b.getAttribute("data-stat");
        if (st) {
          if (st === ST.stat) return;
          ST.stat = st;
          redrawStat();
          return;
        }
        var mg = b.getAttribute("data-mg");
        if (mg) {
          ST.minGames = parseInt(mg, 10) || 1;
          setHtml("rec-board-inner", boardHtml(M));
          return;
        }
        var pp = b.getAttribute("data-pp");
        if (pp !== null) {
          ST.perPlayer = (pp === "1");
          setHtml("rec-board-inner", boardHtml(M));
          return;
        }
        var q = b.getAttribute("data-quick");
        if (q) {
          var S = M.stat[ST.stat];
          var qq = parseFloat(q);
          ST.probe = qq >= 1 ? S.max : pctlValue(S, qq);
          redrawProbe(null);
        }
      });

      root.addEventListener("input", function (e) {
        var t = e.target;
        if (!t || !t.id) return;
        var S = M.stat[ST.stat];
        if (t.id === "rec-probe-range") {
          ST.probe = clamp(parseFloat(t.value) || 0, 0, Math.ceil(S.max));
          redrawProbe("range");
        } else if (t.id === "rec-probe-num") {
          if (t.value === "") return;
          var v = parseFloat(t.value);
          if (!isFinite(v)) return;
          ST.probe = clamp(v, 0, Math.ceil(S.max));
          redrawProbe("num");
        } else if (t.id === "rec-th-range") {
          ST.thIdx = parseInt(t.value, 10) || 0;
          redrawThreshold();
        }
      });
    }
  });
})();

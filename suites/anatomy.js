/* TYR suite: "Anatomy" -- one match, taken apart.
 *
 * Every other suite on this site aggregates. This one picks a single match,
 * loads its deep file (site/matches/<id>.json) and dissects it, then lets the
 * reader change which match.
 *
 * THE ONE DERIVED NUMBER THAT MATTERS
 *   playerHealth[name].series is [[t, hp], ...], sampled from replicated
 *   health updates. Health only falls from damage, so the sum of the downward
 *   steps in a trace is exactly the damage that player TOOK. That number is on
 *   no scoreboard in the game and in no other panel on this site. An upward
 *   step is a repair.
 *
 *   Sanity check over the matches where all sixteen players have a trace: the
 *   downward steps come to about 93% of the scoreboard's total damage dealt.
 *   The missing 7% is overkill, the damage past zero that a health bar cannot
 *   record, plus whatever falls between two samples. Said out loud in the
 *   panel notes rather than hidden.
 *
 * WHAT IS NOT RELIABLE
 *   About 9% of players have no health trace at all. They are drawn greyed and
 *   excluded from every derived number, with a count printed on the page.
 *   About one death in six carries no killer. durationSec is 0 on one replay,
 *   so the clock falls back to the furthest timestamp in the file.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var CSS = "" +
    /* ---- picker ---- */
    ".an-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:9px 14px;margin:2px 0 12px}" +
    ".an-lab{font-size:.66rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em}" +
    ".an-sel{background:var(--panel2);border:1px solid var(--border);border-radius:8px;" +
      "color:var(--text);font:inherit;font-size:.82rem;padding:6px 10px;max-width:min(560px,72vw)}" +
    ".an-btn{background:var(--panel2);border:1px solid var(--border);border-radius:8px;" +
      "color:var(--text);font:inherit;font-size:.8rem;padding:6px 13px;cursor:pointer}" +
    ".an-btn:hover{border-color:#5fbe8b}" +
    ".an-btn:disabled{opacity:.35;cursor:default}" +
    ".an-chips{display:flex;flex-wrap:wrap;gap:7px}" +
    ".an-chip{background:transparent;border:1px solid var(--border);border-radius:999px;" +
      "color:var(--dim);font:inherit;font-size:.74rem;padding:4px 12px;cursor:pointer}" +
    ".an-chip:hover{border-color:#5fbe8b;color:var(--text)}" +
    ".an-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}" +
    ".an-seg button{background:transparent;border:0;color:var(--dim);font:inherit;" +
      "font-size:.78rem;padding:6px 12px;cursor:pointer}" +
    ".an-seg button+button{border-left:1px solid var(--border)}" +
    ".an-seg button.an-on{background:rgba(95,190,139,.20);color:var(--text)}" +
    ".an-miss{margin-top:10px;font-size:.78rem;color:#d5a05e;line-height:1.6}" +

    /* ---- the stage ---- */
    ".an-stage{border:1px solid var(--border);border-radius:12px;padding:14px 14px 12px;" +
      "background:radial-gradient(130% 95% at 50% -25%,rgba(95,190,139,.11),rgba(0,0,0,0) 60%),#080c1a}" +
    ".an-stop{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin-bottom:10px}" +
    ".an-clock{font-family:ui-monospace,Consolas,Menlo,monospace;font-size:2.1rem;" +
      "font-weight:700;line-height:1;font-variant-numeric:tabular-nums}" +
    ".an-clock i{font-style:normal;font-size:.92rem;font-weight:400;color:var(--dim);margin-left:9px}" +
    ".an-trans{display:flex;align-items:center;gap:8px;margin-left:auto}" +
    ".an-play{min-width:76px;font-weight:600}" +
    ".an-rail{position:relative;height:15px;margin:2px 1px 0;cursor:pointer}" +
    ".an-rail::after{content:'';position:absolute;left:0;right:0;top:6px;height:2px;background:#232c52}" +
    ".an-tick{position:absolute;top:1px;width:0;height:0;border-left:4px solid transparent;" +
      "border-right:4px solid transparent;border-top:8px solid #888;transform:translateX(-4px)}" +
    ".an-scrub{width:100%;accent-color:#5fbe8b;margin:0;display:block}" +
    ".an-teams{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px}" +
    "@media (max-width:760px){.an-teams{grid-template-columns:1fr}}" +
    ".an-tcol{min-width:0}" +
    ".an-thead{display:flex;align-items:center;gap:9px;margin-bottom:7px;font-size:.8rem}" +
    ".an-thead b{font-size:.95rem}" +
    ".an-tbar{flex:1;min-width:30px;height:7px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden}" +
    ".an-tbar i{display:block;height:100%;width:100%;border-radius:4px}" +
    ".an-tpct{font-family:ui-monospace,Consolas,Menlo,monospace;font-size:.74rem;" +
      "min-width:86px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dim)}" +
    ".an-row{display:grid;grid-template-columns:9px minmax(0,1.15fr) minmax(0,.8fr) 2fr 60px;" +
      "align-items:center;gap:8px;padding:4px 6px;border-radius:7px;cursor:pointer}" +
    ".an-row:hover{background:rgba(255,255,255,.05)}" +
    ".an-row.an-sel{background:rgba(255,255,255,.09);box-shadow:inset 0 0 0 1px rgba(255,255,255,.24)}" +
    ".an-row.an-dead{opacity:.36}" +
    ".an-row.an-dead .an-nm{text-decoration:line-through}" +
    ".an-row.an-notrace{opacity:.32}" +
    ".an-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}" +
    ".an-nm{font-size:.83rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".an-tk{font-size:.72rem;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".an-bar{height:9px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden}" +
    ".an-bar i{display:block;height:100%;width:100%;border-radius:5px}" +
    ".an-hp{font-family:ui-monospace,Consolas,Menlo,monospace;font-size:.72rem;text-align:right;" +
      "font-variant-numeric:tabular-nums;color:var(--dim);overflow:hidden;text-overflow:ellipsis;" +
      "white-space:nowrap}" +
    /* The site's .stat-value is 1.4rem monospace and does not wrap mid word, so
       a card holding words rather than a number gets its own smaller type. */
    ".an-cv{display:block;font-size:.95rem;line-height:1.35;overflow-wrap:anywhere}" +
    ".an-feed{margin-top:13px;padding-top:10px;border-top:1px solid var(--border);" +
      "min-height:76px;display:flex;flex-direction:column;gap:3px;font-size:.8rem}" +
    ".an-feed div{color:var(--dim)}" +
    ".an-feed div:first-child{color:var(--text)}" +
    ".an-feed .an-fm{font-family:ui-monospace,Consolas,Menlo,monospace;font-size:.72rem;" +
      "margin-right:8px;opacity:.65}" +

    /* ---- plots ---- */
    ".an-plot{position:relative;line-height:0}" +
    ".an-plot.an-click{cursor:crosshair}" +
    ".an-svg{width:100%;height:auto;display:block}" +
    ".an-ph{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.7);" +
      "pointer-events:none;box-shadow:0 0 7px rgba(255,255,255,.45)}" +
    ".an-key{display:flex;flex-wrap:wrap;gap:7px 16px;font-size:.74rem;color:var(--dim);margin-bottom:8px}" +
    ".an-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}" +

    /* ---- trace wall ---- */
    ".an-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:9px}" +
    ".an-cell{border:1px solid var(--border);border-radius:9px;padding:7px 8px 6px;" +
      "background:var(--panel2);cursor:pointer}" +
    ".an-cell:hover{border-color:rgba(255,255,255,.32)}" +
    ".an-cell.an-sel{border-color:rgba(255,255,255,.72)}" +
    ".an-cell-h{display:flex;align-items:center;gap:6px;margin-bottom:3px}" +
    ".an-cell-h b{font-size:.78rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".an-cell-h .an-ct{font-size:.67rem;color:var(--dim);margin-left:auto;white-space:nowrap}" +
    ".an-cell-f{display:flex;flex-wrap:wrap;gap:9px;font-size:.66rem;color:var(--dim);" +
      "font-variant-numeric:tabular-nums;margin-top:3px}" +
    ".an-cell-f b{font-weight:600;color:var(--text)}" +

    /* ---- death ladder ---- */
    ".an-ladder{display:flex;flex-direction:column;gap:4px}" +
    ".an-dr{display:grid;grid-template-columns:24px 50px minmax(0,1fr) 130px 66px;align-items:center;" +
      "gap:10px;padding:6px 9px;border:1px solid var(--border);border-radius:8px;" +
      "background:var(--panel2);cursor:pointer;font-size:.82rem}" +
    ".an-dr:hover{border-color:rgba(255,255,255,.32)}" +
    ".an-dr.an-past{background:rgba(255,255,255,.055)}" +
    ".an-dr .an-i{color:var(--dim);font-size:.7rem;font-variant-numeric:tabular-nums}" +
    ".an-dr .an-tm{font-family:ui-monospace,Consolas,Menlo,monospace;font-variant-numeric:tabular-nums;font-size:.78rem}" +
    ".an-dr .an-ev{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".an-dr .an-rg{color:var(--dim);font-size:.72rem;text-align:right;font-variant-numeric:tabular-nums}" +
    ".an-pips{display:flex;gap:2px;align-items:center}" +
    ".an-pip{width:5px;height:12px;border-radius:2px;display:inline-block;flex:none}" +
    ".an-gap{width:8px;display:inline-block;flex:none}" +
    "@media (max-width:680px){.an-dr{grid-template-columns:24px 46px minmax(0,1fr)}" +
      ".an-dr .an-rg,.an-dr .an-pips{display:none}}" +

    ".an-warn{color:#d5a05e}";

  // ------------------------------------------------------------------ paint
  var REPAIR = "#6fd0ee";     // upward steps in a health trace
  var ABILITY = "#c9a227";    // ability resource
  var DEADX = "#d05a52";
  var INK = "#cdd6ee";
  var GRID = "#232c52";
  var DIM = "#7f89b3";

  function teamHex(T, k) {
    var h = T && T.TEAM_HEX && T.TEAM_HEX[k];
    return h || (k === 0 ? "#35674a" : "#8a4444");
  }
  // Brighter siblings of the site's team pair. The muted pair reads as mud on
  // the near black stage, so lines and bars use these and fills use the site's.
  function teamLit(k) { return k === 0 ? "#5fbe8b" : "#e08279"; }
  function teamName(k) { return k === 0 ? "Team A" : "Team B"; }

  // ---------------------------------------------------------------- helpers
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : null; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }

  function mmss(sec) {
    if (sec == null || !isFinite(sec)) return "-";
    var s = Math.max(0, Math.round(sec)), m = Math.floor(s / 60), r = s - m * 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  // A health series holds its value until the next sample, so every read is a
  // step lookup and never an interpolation. `hint` is the previous index, so
  // playing the match forward costs one comparison per player per frame.
  function stepIndex(series, t, hint) {
    var i = hint || 0;
    if (i >= series.length || series[i][0] > t) i = 0;
    while (i + 1 < series.length && series[i + 1][0] <= t) i++;
    return i;
  }
  function stepValue(series, t, hint) {
    if (!series || !series.length) return null;
    if (series[0][0] > t) return series[0][1];
    return series[stepIndex(series, t, hint)][1];
  }

  // Prepend a sample at t=0 so a trace that starts late still draws from the
  // left edge at its opening value instead of floating in mid air.
  function padded(series) {
    if (!series || !series.length) return [];
    if (series[0][0] > 0.05) return [[0, series[0][1]]].concat(series);
    return series;
  }

  function stepPoints(series, xOf, yOf, endT) {
    var pts = [], i, x, y;
    for (i = 0; i < series.length; i++) {
      x = xOf(series[i][0]); y = yOf(series[i][1]);
      if (i > 0) pts.push([x, pts[pts.length - 1][1]]);
      pts.push([x, y]);
    }
    if (pts.length && endT != null) {
      var lx = xOf(endT);
      if (lx > pts[pts.length - 1][0]) pts.push([lx, pts[pts.length - 1][1]]);
    }
    return pts;
  }
  function polyStr(pts) {
    var out = [], i;
    for (i = 0; i < pts.length; i++) out.push(f1(pts[i][0]) + "," + f1(pts[i][1]));
    return out.join(" ");
  }
  // The site's .stat-value is 1.4rem monospace and will not break a long word,
  // so any card holding words rather than a number goes through here.
  function word(s) { return '<span class="an-cv">' + s + "</span>"; }

  function txt(x, y, s, opts) {
    opts = opts || {};
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" fill="' + (opts.fill || DIM) +
      '" font-size="' + (opts.size || 11) + '"' +
      (opts.anchor ? ' text-anchor="' + opts.anchor + '"' : "") +
      (opts.extra || "") + ">" + s + "</text>";
  }

  // ------------------------------------------------------- the derived model
  //
  // Everything the panels draw comes out of here, so there is exactly one
  // place where a missing field turns into a null instead of an exception.
  function analyse(T, deep) {
    var m = deep.match || {};
    var raw = deep.players || [];
    var ph = deep.playerHealth || {};
    var pa = deep.playerAbilityResource || {};
    var deaths = (deep.deathEvents || []).filter(function (d) {
      return d && num(d.t) != null && d.victim;
    });
    deaths = deaths.slice().sort(function (a, b) { return a.t - b.t; });

    // durationSec is 0 on at least one replay, so fall back to the furthest
    // timestamp anything in the file mentions.
    var dur = num(m.durationSec) || 0;
    var k;
    for (k in ph) {
      if (ph[k] && ph[k].series && ph[k].series.length) {
        dur = Math.max(dur, ph[k].series[ph[k].series.length - 1][0]);
      }
    }
    if (deaths.length) dur = Math.max(dur, deaths[deaths.length - 1].t);
    if (!(dur > 0)) dur = 1;

    var deathBy = {};
    deaths.forEach(function (d) { if (!deathBy[d.victim]) deathBy[d.victim] = d; });

    var players = raw.map(function (p) {
      var team = p.team === 1 ? 1 : 0;
      var h = ph[p.name] || null;
      var hs = (h && h.series && h.series.length) ? padded(h.series) : null;
      var taken = 0, repaired = 0, i, d;
      if (hs) {
        for (i = 1; i < hs.length; i++) {
          d = hs[i - 1][1] - hs[i][1];
          if (d > 0) taken += d; else repaired += -d;
        }
      }
      var maxHp = num(p.maxHp);
      if (!maxHp && h) maxHp = num(h.max);
      if (!maxHp && hs) maxHp = hs[0][1];

      var a = pa[p.name] || null;
      var as = (a && a.series && a.series.length) ? padded(a.series) : null;
      var spent = 0;
      if (as) {
        for (i = 1; i < as.length; i++) {
          d = as[i - 1][1] - as[i][1];
          if (d > 0) spent += d;
        }
      }

      var de = deathBy[p.name] || null;
      var tank = (p.egsTank && p.egsTank.display) || null;
      return {
        name: p.name,
        team: team,
        tank: tank,
        color: (tank && T.tankColor(tank)) || teamLit(team),
        kills: num(p.kills) || 0,
        dmg: num(p.damage) || 0,
        assist: num(p.assist) || 0,
        blocked: num(p.blocked) || 0,
        ping: num(p.pingMs),
        clan: p.clan || null,
        maxHp: maxHp || null,
        hp: hs,
        hpIdx: 0,
        taken: hs ? Math.round(taken) : null,
        repaired: hs ? Math.round(repaired) : null,
        ability: as,
        abilityMax: a ? num(a.max) : null,
        abilitySpent: as ? Math.round(spent) : null,
        deathT: de ? de.t : null,
        killedBy: de ? (de.killer || null) : null,
        killedByTank: de ? (de.killerTank || null) : null,
        aliveSec: de ? de.t : dur,
        victims: []
      };
    });

    var byName = {};
    players.forEach(function (p) { byName[p.name] = p; });
    deaths.forEach(function (d) {
      if (d.killer && byName[d.killer]) byName[d.killer].victims.push(d.victim);
    });

    var teams = [{ idx: 0, players: [], startHp: 0, size: 0 },
                 { idx: 1, players: [], startHp: 0, size: 0 }];
    players.forEach(function (p) {
      var t = teams[p.team];
      t.players.push(p);
      t.size++;
      if (p.hp) t.startHp += p.hp[0][1];
    });
    teams.forEach(function (t) {
      t.players.sort(function (a, b) { return b.dmg - a.dmg; });
    });

    var traced = players.filter(function (p) { return !!p.hp; });

    return {
      id: m.id || null,
      map: m.map || "unknown map",
      dur: dur,
      winner: (m.winningTeam === 0 || m.winningTeam === 1) ? m.winningTeam : null,
      winType: m.winType || null,
      ownSide: (m.ownSide === 0 || m.ownSide === 1) ? m.ownSide : null,
      captured: num(m.capturedUnix),
      players: players,
      byName: byName,
      teams: teams,
      untraced: players.length - traced.length,
      deaths: deaths,
      teamSeries: m.teamHealthSeries || null,
      winProb: (m.winProb && m.winProb.length) ? m.winProb : null
    };
  }

  // ------------------------------------------------------------------ picker
  function matchLabel(T, m) {
    var bits = [m.map || "?", mmss(m.duration_sec)];
    if (m.win_type) bits.push(m.win_type);
    bits.push(T.fmtDateTime(m.captured_unix));
    return bits.join("  ·  ");
  }

  function usableMatches(T) {
    var all = ((T.DATA && T.DATA.matches) || []).filter(function (m) {
      return m && m.match_id;
    });
    all.sort(function (a, b) { return (b.captured_unix || 0) - (a.captured_unix || 0); });
    return all;
  }

  function matchKills(m) {
    return (m.players || []).reduce(function (s, p) { return s + (p.kills || 0); }, 0);
  }
  function matchTopDmg(m) {
    return (m.players || []).reduce(function (s, p) { return Math.max(s, p.dmg || 0); }, 0);
  }
  function pickBest(list, score) {
    var best = null, bv = -Infinity;
    list.forEach(function (m) {
      var v = score(m);
      if (v != null && v > bv) { bv = v; best = m; }
    });
    return best;
  }

  // ----------------------------------------------------------------- preview
  //
  // Sixteen lifelines from one real match: bar length is how long that player
  // stayed alive. Built from site_data survival_sec, which only 97 of the 308
  // matches carry for every player, so it takes the most recent one that does.
  function preview(T) {
    var all = usableMatches(T).filter(function (m) {
      var ps = m.players || [];
      if (ps.length < 12 || !(m.duration_sec > 0)) return false;
      for (var i = 0; i < ps.length; i++) {
        if (typeof ps[i].survival_sec !== "number") return false;
      }
      return true;
    });
    if (!all.length) return "";
    var m = all[0];
    var rows = m.players.slice();
    rows.sort(function (a, b) {
      if ((a.team || 0) !== (b.team || 0)) return (a.team || 0) - (b.team || 0);
      return (b.survival_sec || 0) - (a.survival_sec || 0);
    });
    rows = rows.slice(0, 16);

    var out = '<rect x="0" y="0" width="240" height="240" fill="#080c1a"/>';
    var i, g;
    for (g = 1; g < 4; g++) {
      out += '<line x1="' + (8 + g * 56) + '" y1="4" x2="' + (8 + g * 56) +
        '" y2="236" stroke="#1b2340" stroke-width="1"/>';
    }
    var h = 240 / rows.length;
    for (i = 0; i < rows.length; i++) {
      var p = rows[i];
      var frac = clamp((p.survival_sec || 0) / m.duration_sec, 0, 1);
      var w = Math.max(3, 224 * frac);
      var y = i * h + h * 0.22;
      var bh = h * 0.56;
      out += '<rect x="8" y="' + f1(y) + '" width="224" height="' + f1(bh) +
        '" rx="2" fill="#141b33"/>' +
        '<rect x="8" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(bh) +
        '" rx="2" fill="' + teamLit(p.team === 1 ? 1 : 0) + '" opacity="' +
        (frac > 0.995 ? "0.95" : "0.72") + '"/>';
      if (frac < 0.995) {
        out += '<rect x="' + f1(8 + w - 1.5) + '" y="' + f1(y - 1) +
          '" width="2.5" height="' + f1(bh + 2) + '" fill="' + DEADX + '"/>';
      }
    }
    return '<svg viewBox="0 0 240 240">' + out + "</svg>";
  }

  // ------------------------------------------------------------------ render
  function render(T) {
    var list = usableMatches(T);
    if (!list.length) {
      return T.bigPanel("Anatomy",
        '<p class="small">The archive is empty. Nothing to take apart.</p>', "");
    }

    var seen = {}, mapNames = [];
    list.forEach(function (m) {
      if (m.map && !seen[m.map]) { seen[m.map] = 1; mapNames.push(m.map); }
    });
    mapNames.sort();

    var opts = list.map(function (m) {
      return '<option value="' + T.esc(m.match_id) + '">' + T.esc(matchLabel(T, m)) +
        "</option>";
    }).join("");

    var chips = [["longest", "Longest"], ["shortest", "Shortest"],
                 ["kills", "Most kills"], ["topdmg", "Biggest single game"],
                 ["random", "Random"]].map(function (c) {
      return '<button class="an-chip" data-pick="' + c[0] + '">' + c[1] + "</button>";
    }).join("");

    var body =
      '<div class="an-ctl">' +
        '<span class="an-lab">Map</span>' +
        '<select class="an-sel" id="an-map"><option value="">All ' + mapNames.length +
          " maps</option>" +
          mapNames.map(function (n) {
            return '<option value="' + T.esc(n) + '">' + T.esc(n) + "</option>";
          }).join("") + "</select>" +
        '<span class="an-lab">Match</span>' +
        '<select class="an-sel" id="an-match">' + opts + "</select>" +
        '<button class="an-btn" id="an-prev">Newer</button>' +
        '<button class="an-btn" id="an-next">Older</button>' +
      "</div>" +
      '<div class="an-chips" id="an-chips">' + chips + "</div>" +
      '<div id="an-head" style="margin-top:14px"></div>' +
      '<div id="an-miss" class="an-miss" hidden></div>';

    return T.bigPanel("Pick a match", body,
      T.fmtNum(list.length) + " matches, each with a deep file of about 350 KB. Every " +
      "panel below is built from the one you pick. Quick picks read the index.") +
      '<div id="an-rest"><div class="panel"><p class="small">Loading the match ' +
      "file.</p></div></div>";
  }

  // ------------------------------------------------------------- panel bodies
  function headHtml(T, M) {
    var winTxt = M.winner == null ? "not recorded"
      : teamName(M.winner) + (M.winType ? " by " + M.winType : "");
    var totalDmg = 0, totalTaken = 0, tracedN = 0;
    M.players.forEach(function (p) {
      totalDmg += p.dmg;
      if (p.taken != null) { totalTaken += p.taken; tracedN++; }
    });
    return '<div class="stat-grid">' +
      T.card("Map", word(T.esc(M.map))) +
      T.card("Length", mmss(M.dur)) +
      T.card("Ending", word(T.esc(winTxt))) +
      T.card("Deaths", T.fmtNum(M.deaths.length)) +
      T.card("Damage on the scoreboard", T.fmtNum(Math.round(totalDmg))) +
      T.card("Damage in the health traces", T.fmtNum(Math.round(totalTaken))) +
      T.card("Played", word(M.captured ? T.esc(T.fmtDateTime(M.captured, true)) : "-")) +
      "</div>" +
      '<p class="small" style="margin-top:10px">Recorded from ' +
      (M.ownSide == null ? "an unknown side" : teamName(M.ownSide)) +
      ". The last two cards are the same quantity twice: scoreboard damage dealt, and " +
      "damage taken summed from " + T.fmtNum(tracedN) + " of " + T.fmtNum(M.players.length) +
      " health traces. The trace figure runs low.</p>";
  }

  // ---- panel 2: the stage ------------------------------------------------
  function stageHtml(T, M) {
    var rail = M.deaths.map(function (d) {
      return '<span class="an-tick" style="left:' +
        f1(clamp(d.t / M.dur, 0, 1) * 100) + "%;border-top-color:" +
        teamLit(d.victimTeam === 1 ? 1 : 0) + '"></span>';
    }).join("");

    function col(t) {
      var rows = t.players.map(function (p) {
        return '<div class="an-row' + (p.hp ? "" : " an-notrace") + '" data-p="' +
          T.esc(p.name) + '">' +
          '<span class="an-dot" style="background:' + p.color + '"></span>' +
          '<span class="an-nm">' + T.esc(p.name) + "</span>" +
          '<span class="an-tk">' + T.esc(p.tank || "unknown") + "</span>" +
          '<span class="an-bar"><i style="background:' + teamLit(t.idx) + '"></i></span>' +
          '<span class="an-hp">' + (p.hp ? T.fmtNum(Math.round(p.hp[0][1])) : "no trace") +
          "</span></div>";
      }).join("");
      return '<div class="an-tcol">' +
        '<div class="an-thead"><b style="color:' + teamLit(t.idx) + '">' + teamName(t.idx) +
        "</b>" + (M.winner === t.idx ? '<span class="small">won</span>' : "") +
        '<span class="an-tbar"><i style="background:' + teamLit(t.idx) + '"></i></span>' +
        '<span class="an-tpct" data-tp="' + t.idx + '">100% · ' + t.size +
        " up</span></div>" + rows + "</div>";
    }

    return '<div class="an-stage">' +
      '<div class="an-stop">' +
        '<div class="an-clock"><span id="an-clock">0:00</span><i>of ' + mmss(M.dur) + "</i></div>" +
        '<div class="an-trans">' +
          '<button class="an-btn an-play" id="an-play">Play</button>' +
          '<div class="an-seg" id="an-speed">' +
            '<button data-sp="1">1x</button><button data-sp="2">2x</button>' +
            '<button data-sp="4" class="an-on">4x</button><button data-sp="8">8x</button>' +
          "</div>" +
          '<button class="an-btn" id="an-restart">Restart</button>' +
        "</div>" +
      "</div>" +
      '<div class="an-rail" id="an-rail">' + rail + "</div>" +
      '<input type="range" class="an-scrub" id="an-scrub" min="0" max="' +
        Math.round(M.dur * 10) + '" step="1" value="0" aria-label="Match time">' +
      '<div class="an-teams">' + col(M.teams[0]) + col(M.teams[1]) + "</div>" +
      '<div class="an-feed" id="an-feed"><div>Nothing has happened yet.</div></div>' +
      "</div>";
  }

  // ---- panel 3: two health pools -----------------------------------------
  var RB = { W: 1100, H: 348, padL: 52, padR: 18, topY: 22, topH: 176, wpY: 254, wpH: 74 };

  function ribbonHtml(T, M) {
    var W = RB.W, padL = RB.padL, padR = RB.padR;
    var topY = RB.topY, topH = RB.topH, wpY = RB.wpY, wpH = RB.wpH;
    var w = W - padL - padR;
    var xOf = function (t) { return padL + clamp(t / M.dur, 0, 1) * w; };

    var out = "", g, gy;
    for (g = 0; g <= 4; g++) {
      gy = topY + topH - (g / 4) * topH;
      out += '<line x1="' + padL + '" y1="' + f1(gy) + '" x2="' + (W - padR) + '" y2="' +
        f1(gy) + '" stroke="' + GRID + '" stroke-width="1"/>' +
        txt(padL - 8, gy + 3.5, (g * 25) + "%", { anchor: "end" });
    }

    // Team health as a share of that team's own starting pool. Taken from the
    // published teamHealthSeries when the file carries one, otherwise summed
    // out of the individual traces.
    var series = {}, computed = false;
    if (M.teamSeries && M.teamSeries["0"] && M.teamSeries["1"] &&
        M.teamSeries["0"].length > 1 && M.teamSeries["1"].length > 1) {
      series[0] = padded(M.teamSeries["0"]);
      series[1] = padded(M.teamSeries["1"]);
    } else {
      computed = true;
      [0, 1].forEach(function (k) {
        var times = [0], s = [], i;
        M.teams[k].players.forEach(function (p) {
          if (p.hp) p.hp.forEach(function (pt) { times.push(pt[0]); });
        });
        times.sort(function (a, b) { return a - b; });
        var start = M.teams[k].startHp || 1, prev = null;
        for (i = 0; i < times.length; i++) {
          if (prev != null && times[i] - prev < 0.05) continue;
          prev = times[i];
          var tot = 0, ti = times[i];
          M.teams[k].players.forEach(function (p) {
            if (p.hp) tot += stepValue(p.hp, ti, 0) || 0;
          });
          s.push([ti, (tot / start) * 100]);
        }
        series[k] = s;
      });
    }

    function drawTeam(k) {
      if (!series[k] || !series[k].length) return "";
      var pts = stepPoints(series[k], xOf, function (v) {
        return topY + topH - clamp(v, 0, 100) / 100 * topH;
      }, M.dur);
      if (!pts.length) return "";
      var area = polyStr(pts) + " " + f1(pts[pts.length - 1][0]) + "," + (topY + topH) +
        " " + f1(pts[0][0]) + "," + (topY + topH);
      return '<polygon points="' + area + '" fill="' + teamHex(T, k) + '" opacity="0.30"/>' +
        '<polyline points="' + polyStr(pts) + '" fill="none" stroke="' + teamLit(k) +
        '" stroke-width="2.1" stroke-linejoin="round"/>';
    }
    out += drawTeam(0) + drawTeam(1);

    M.deaths.forEach(function (d) {
      var x = xOf(d.t);
      out += '<path d="M' + f1(x - 3.6) + " " + (topY - 6) + "L" + f1(x + 3.6) + " " +
        (topY - 6) + "L" + f1(x) + " " + (topY - 1) + 'Z" fill="' +
        teamLit(d.victimTeam === 1 ? 1 : 0) + '" opacity="0.9"/>';
    });

    if (M.winProb) {
      var mid = wpY + wpH / 2;
      var wpts = stepPoints(padded(M.winProb), xOf, function (v) {
        return wpY + wpH - clamp(v, 0, 1) * wpH;
      }, M.dur);
      var wArea = polyStr(wpts) + " " + f1(wpts[wpts.length - 1][0]) + "," + mid +
        " " + f1(wpts[0][0]) + "," + mid;
      out += '<clipPath id="an-clip-a"><rect x="' + padL + '" y="' + wpY + '" width="' +
        w + '" height="' + (wpH / 2) + '"/></clipPath>' +
        '<clipPath id="an-clip-b"><rect x="' + padL + '" y="' + mid + '" width="' + w +
        '" height="' + (wpH / 2) + '"/></clipPath>' +
        '<polygon points="' + wArea + '" fill="' + teamHex(T, 0) +
        '" opacity="0.55" clip-path="url(#an-clip-a)"/>' +
        '<polygon points="' + wArea + '" fill="' + teamHex(T, 1) +
        '" opacity="0.55" clip-path="url(#an-clip-b)"/>' +
        '<line x1="' + padL + '" y1="' + mid + '" x2="' + (W - padR) + '" y2="' + mid +
        '" stroke="#3a4470" stroke-width="1" stroke-dasharray="3 4"/>' +
        '<polyline points="' + polyStr(wpts) + '" fill="none" stroke="' + INK +
        '" stroke-width="1.5" opacity="0.85"/>' +
        txt(padL - 8, wpY + 4, "100%", { anchor: "end", size: 10 }) +
        txt(padL - 8, mid + 3.5, "50%", { anchor: "end", size: 10 }) +
        txt(padL - 8, wpY + wpH + 3, "0%", { anchor: "end", size: 10 }) +
        txt(padL, wpY - 9, "Modelled chance Team A wins");
    } else {
      out += txt(padL, wpY + wpH / 2, "No win probability curve in this file.", { size: 12 });
    }

    for (g = 0; g <= 4; g++) {
      out += txt(xOf(M.dur * g / 4), topY + topH + 17, mmss(M.dur * g / 4),
        { anchor: g === 0 ? "start" : (g === 4 ? "end" : "middle") });
    }

    return '<div class="an-key">' +
      '<span><i style="background:' + teamLit(0) + '"></i>Team A health</span>' +
      '<span><i style="background:' + teamLit(1) + '"></i>Team B health</span>' +
      '<span><i style="background:' + INK + '"></i>modelled win chance</span>' +
      "<span>Triangles are deaths, coloured by the side that lost the tank.</span></div>" +
      '<div class="an-plot an-click" id="an-ribbon">' +
      '<svg class="an-svg" viewBox="0 0 ' + W + " " + RB.H + '">' + out + "</svg>" +
      '<div class="an-ph" style="left:' + f1(padL / W * 100) + '%"></div></div>' +
      (computed ? '<p class="small an-warn" style="margin-top:6px">No published team ' +
        "health series here; both lines were summed from the individual traces.</p>" : "");
  }

  // ---- panel 4: dealt against taken --------------------------------------
  function scatterHtml(T, M, mode, sel) {
    var pts = M.players.filter(function (p) { return p.taken != null; });
    var seg = '<div class="an-ctl"><span class="an-lab">Axes</span>' +
      '<div class="an-seg" id="an-smode">' +
      '<button data-md="raw"' + (mode === "rate" ? "" : ' class="an-on"') +
      ">Match total</button>" +
      '<button data-md="rate"' + (mode === "rate" ? ' class="an-on"' : "") +
      ">Per minute alive</button></div>" +
      '<span class="small">Circle size is kills, capped at four. Click a circle to ' +
      "select that player.</span></div>";

    if (!pts.length) {
      return seg + '<p class="small">No player in this match has a health trace. ' +
        "Damage taken cannot be derived.</p>";
    }

    var perMin = mode === "rate";
    function vx(p) { return perMin ? (p.dmg / Math.max(1, p.aliveSec) * 60) : p.dmg; }
    function vy(p) { return perMin ? (p.taken / Math.max(1, p.aliveSec) * 60) : p.taken; }

    var hi = 1;
    pts.forEach(function (p) { hi = Math.max(hi, vx(p), vy(p)); });
    var mag = Math.pow(10, Math.floor(Math.log(hi) / Math.LN10));
    var top = Math.ceil(hi / (mag / 2)) * (mag / 2);
    if (!(top > 0)) top = 1;

    var W = 1100, H = 470, padL = 82, padR = 24, padT = 18, padB = 54;
    var w = W - padL - padR, h = H - padT - padB;
    function X(v) { return padL + clamp(v / top, 0, 1) * w; }
    function Y(v) { return padT + h - clamp(v / top, 0, 1) * h; }

    var out = "", g, v;
    for (g = 0; g <= 4; g++) {
      v = top * g / 4;
      out += '<line x1="' + padL + '" y1="' + f1(Y(v)) + '" x2="' + (W - padR) + '" y2="' +
        f1(Y(v)) + '" stroke="#1c2444" stroke-width="1"/>' +
        '<line x1="' + f1(X(v)) + '" y1="' + padT + '" x2="' + f1(X(v)) + '" y2="' +
        (padT + h) + '" stroke="#1c2444" stroke-width="1"/>' +
        txt(padL - 9, Y(v) + 4, T.fmtNum(Math.round(v)), { anchor: "end" }) +
        txt(X(v), padT + h + 18, T.fmtNum(Math.round(v)), { anchor: "middle" });
    }
    out += '<line x1="' + f1(X(0)) + '" y1="' + f1(Y(0)) + '" x2="' + f1(X(top)) +
      '" y2="' + f1(Y(top)) + '" stroke="#55618f" stroke-width="1" stroke-dasharray="5 5"/>' +
      txt(X(top) - 8, Y(top) + 17, "gave as good as it got", { anchor: "end" });

    var named = {};
    pts.slice().sort(function (a, b) { return vx(b) - vx(a); }).slice(0, 3)
      .forEach(function (p) { named[p.name] = 1; });
    pts.slice().sort(function (a, b) { return vy(b) - vy(a); }).slice(0, 3)
      .forEach(function (p) { named[p.name] = 1; });
    if (sel) named[sel] = 1;

    pts.forEach(function (p) {
      var cx = X(vx(p)), cy = Y(vy(p));
      var r = 5.5 + Math.min(4, p.kills) * 2.4;
      var on = p.name === sel;
      out += '<circle data-p="' + T.esc(p.name) + '" cx="' + f1(cx) + '" cy="' + f1(cy) +
        '" r="' + f1(r) + '" fill="' + teamLit(p.team) + '" fill-opacity="' +
        (on ? "0.95" : "0.55") + '" stroke="' + (on ? "#ffffff" : teamLit(p.team)) +
        '" stroke-width="' + (on ? "2.2" : "1.2") + '" style="cursor:pointer"><title>' +
        T.esc(p.name) + " on " + T.esc(p.tank || "unknown") + ": dealt " +
        T.fmtNum(Math.round(vx(p))) + ", took " + T.fmtNum(Math.round(vy(p))) +
        "</title></circle>";
      if (named[p.name]) {
        out += txt(cx + r + 5, cy + 4, T.esc(p.name),
          { fill: INK, extra: ' pointer-events="none"' });
      }
    });

    out += txt(padL + w / 2, H - 12, "damage dealt" + (perMin ? " per minute alive" : "") +
      " (scoreboard)", { anchor: "middle", size: 12 }) +
      '<text x="18" y="' + f1(padT + h / 2) + '" fill="' + DIM + '" font-size="12" ' +
      'text-anchor="middle" transform="rotate(-90 18 ' + f1(padT + h / 2) +
      ')">damage taken' + (perMin ? " per minute alive" : "") + " (health trace)</text>";

    return seg + '<div class="an-plot" id="an-scatter">' +
      '<svg class="an-svg" viewBox="0 0 ' + W + " " + H + '">' + out + "</svg></div>";
  }

  // ---- panel 5: the trace wall -------------------------------------------
  var CW = { W: 240, H: 84, x0: 3, x1: 237, y0: 6, y1: 74 };

  function cellSvg(T, M, p) {
    var W = CW.W, H = CW.H, x0 = CW.x0, x1 = CW.x1, y0 = CW.y0, y1 = CW.y1;
    var head = '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' +
      (y1 - y0) + '" fill="#0d1327"/>';
    if (!p.hp) {
      return '<svg class="an-svg" viewBox="0 0 ' + W + " " + H + '">' + head +
        txt(W / 2, (y0 + y1) / 2 + 4, "no health trace", { anchor: "middle" }) + "</svg>";
    }
    var top = p.maxHp || p.hp[0][1] || 1;
    var end = p.deathT != null ? p.deathT : M.dur;
    var xOf = function (t) { return x0 + clamp(t / M.dur, 0, 1) * (x1 - x0); };
    var yOf = function (v) { return y1 - clamp(v / top, 0, 1) * (y1 - y0); };
    var pts = stepPoints(p.hp, xOf, yOf, end);
    var area = polyStr(pts) + " " + f1(pts[pts.length - 1][0]) + "," + y1 + " " +
      f1(pts[0][0]) + "," + y1;
    var svg = head +
      '<polygon points="' + area + '" fill="' + teamHex(T, p.team) + '" opacity="0.45"/>' +
      '<polyline points="' + polyStr(pts) + '" fill="none" stroke="' + teamLit(p.team) +
      '" stroke-width="1.5" stroke-linejoin="round"/>';
    var i;
    for (i = 1; i < p.hp.length; i++) {
      if (p.hp[i][1] > p.hp[i - 1][1] + 0.5) {
        svg += '<line x1="' + f1(xOf(p.hp[i][0])) + '" y1="' + f1(yOf(p.hp[i - 1][1])) +
          '" x2="' + f1(xOf(p.hp[i][0])) + '" y2="' + f1(yOf(p.hp[i][1])) + '" stroke="' +
          REPAIR + '" stroke-width="2"/>';
      }
    }
    if (p.deathT != null) {
      svg += '<line x1="' + f1(xOf(p.deathT)) + '" y1="' + y0 + '" x2="' +
        f1(xOf(p.deathT)) + '" y2="' + y1 + '" stroke="' + DEADX +
        '" stroke-width="1.4" opacity="0.85"/>';
    }
    return '<svg class="an-svg" viewBox="0 0 ' + W + " " + H + '">' + svg + "</svg>";
  }

  function wallHtml(T, M, sel) {
    var order = M.players.slice().sort(function (a, b) {
      if (a.team !== b.team) return a.team - b.team;
      return b.dmg - a.dmg;
    });
    var cells = order.map(function (p) {
      var dealt = "<span>dealt <b>" + T.fmtNum(Math.round(p.dmg)) + "</b></span>";
      var foot = p.hp
        ? "<span>took <b>" + T.fmtNum(p.taken) + "</b></span>" +
          (p.repaired ? "<span>repaired <b>" + T.fmtNum(p.repaired) + "</b></span>" : "") +
          dealt
        : dealt;
      return '<div class="an-cell' + (p.name === sel ? " an-sel" : "") + '" data-p="' +
        T.esc(p.name) + '">' +
        '<div class="an-cell-h"><span class="an-dot" style="background:' + p.color +
        '"></span><b>' + T.esc(p.name) + '</b><span class="an-ct">' +
        T.esc(p.tank || "unknown") + "</span></div>" +
        '<div class="an-plot">' + cellSvg(T, M, p) +
        '<div class="an-ph" style="left:' + f1(CW.x0 / CW.W * 100) + '%"></div></div>' +
        '<div class="an-cell-f">' + foot + "</div></div>";
    }).join("");

    return '<div class="an-key">' +
      '<span><i style="background:' + teamLit(0) + '"></i>Team A</span>' +
      '<span><i style="background:' + teamLit(1) + '"></i>Team B</span>' +
      '<span><i style="background:' + REPAIR + '"></i>repair</span>' +
      '<span><i style="background:' + DEADX + '"></i>death</span>' +
      "<span>Click a card to select that player.</span></div>" +
      '<div class="an-wall" id="an-wall">' + cells + "</div>";
  }

  // ---- panel 6: the order of death ---------------------------------------
  function ladderHtml(T, M) {
    if (!M.deaths.length) {
      return '<p class="small">Nobody died in this replay. Usually that means the ' +
        "recording stops before the fighting starts.</p>";
    }
    var aliveA = M.teams[0].size, aliveB = M.teams[1].size;
    var rows = M.deaths.map(function (d, i) {
      if (d.victimTeam === 1) aliveB--; else aliveA--;
      var ev = '<b style="color:' + teamLit(d.victimTeam === 1 ? 1 : 0) + '">' +
        T.esc(d.victim) + '</b><span class="small"> on ' +
        T.esc(d.victimTank || "unknown") + "</span>";
      if (d.killer) {
        ev += '<span class="small"> killed by </span><b style="color:' +
          teamLit(d.killerTeam === 1 ? 1 : 0) + '">' + T.esc(d.killer) +
          '</b><span class="small"> on ' + T.esc(d.killerTank || "unknown") + "</span>";
      } else {
        ev += '<span class="small"> died with no killer recorded</span>';
      }
      var pips = "", k;
      for (k = 0; k < M.teams[0].size; k++) {
        pips += '<span class="an-pip" style="background:' +
          (k < aliveA ? teamLit(0) : "rgba(255,255,255,.11)") + '"></span>';
      }
      pips += '<span class="an-gap"></span>';
      for (k = 0; k < M.teams[1].size; k++) {
        pips += '<span class="an-pip" style="background:' +
          (k < aliveB ? teamLit(1) : "rgba(255,255,255,.11)") + '"></span>';
      }
      return '<div class="an-dr" data-t="' + d.t + '">' +
        '<span class="an-i">' + (i + 1) + "</span>" +
        '<span class="an-tm">' + mmss(d.t) + "</span>" +
        '<span class="an-ev">' + ev + "</span>" +
        '<span class="an-pips">' + pips + "</span>" +
        '<span class="an-rg">' + (num(d.rangeM) != null ? T.fmtNum(d.rangeM) + " m" : "-") +
        "</span></div>";
    }).join("");
    return '<div class="an-ladder" id="an-ladder">' + rows + "</div>";
  }

  // ---- panel 7: one player ------------------------------------------------
  var PB = { W: 1100, H: 212, AH: 136, x0: 46, x1: 1082, y0: 16, y1: 168, ay0: 14, ay1: 96 };

  function playerHtml(T, M, name) {
    var p = M.byName[name];
    if (!p) return '<p class="small">No player is selected.</p>';

    var sel = '<div class="an-ctl"><span class="an-lab">Player</span>' +
      '<select class="an-sel" id="an-psel">' +
      [0, 1].map(function (k) {
        return '<optgroup label="' + teamName(k) + '">' +
          M.teams[k].players.map(function (q) {
            return '<option value="' + T.esc(q.name) + '"' +
              (q.name === name ? " selected" : "") + ">" + T.esc(q.name) + " on " +
              T.esc(q.tank || "unknown") + "</option>";
          }).join("") + "</optgroup>";
      }).join("") + "</select></div>";

    var cards = '<div class="stat-grid">' +
      T.card("Tank", word(T.esc(p.tank || "unknown"))) +
      T.card("Damage dealt", T.fmtNum(Math.round(p.dmg))) +
      T.card("Damage taken", p.taken == null ? word("no trace") : T.fmtNum(p.taken)) +
      T.card("Repaired", p.repaired == null ? word("no trace") : T.fmtNum(p.repaired)) +
      T.card("Assisted", T.fmtNum(Math.round(p.assist))) +
      T.card("Blocked", T.fmtNum(Math.round(p.blocked))) +
      T.card("Kills", T.fmtNum(p.kills)) +
      T.card("Alive for", mmss(p.aliveSec)) +
      T.card("Ping", p.ping == null ? "-" : T.fmtNum(p.ping) + " ms") +
      "</div>";

    var story = p.deathT != null
      ? "Died at " + mmss(p.deathT) + (p.killedBy
          ? " to " + T.esc(p.killedBy) + " on " + T.esc(p.killedByTank || "unknown")
          : " with no killer recorded") + ". "
      : "Survived to the end. ";
    story += p.victims.length
      ? "Killed " + p.victims.map(function (v) { return T.esc(v); }).join(", ") + ". "
      : "Killed nobody. ";
    if (p.taken != null) {
      story += "Absorbed " + T.fmtNum(p.taken) + " damage" +
        (p.repaired ? " and had " + T.fmtNum(p.repaired) + " health put back" : "") + ".";
    } else {
      story += "No health trace. Damage taken is unknown.";
    }

    var W = PB.W, H = PB.H, x0 = PB.x0, x1 = PB.x1, y0 = PB.y0, y1 = PB.y1;
    var xOf = function (t) { return x0 + clamp(t / M.dur, 0, 1) * (x1 - x0); };
    var hp = "", g;
    if (p.hp) {
      var top = p.maxHp || p.hp[0][1] || 1;
      var yOf = function (v) { return y1 - clamp(v / top, 0, 1) * (y1 - y0); };
      var end = p.deathT != null ? p.deathT : M.dur;
      var pts = stepPoints(p.hp, xOf, yOf, end);
      for (g = 0; g <= 2; g++) {
        var gy = y1 - (g / 2) * (y1 - y0);
        hp += '<line x1="' + x0 + '" y1="' + f1(gy) + '" x2="' + x1 + '" y2="' + f1(gy) +
          '" stroke="' + GRID + '" stroke-width="1"/>' +
          txt(x0 - 7, gy + 4, T.fmtNum(Math.round(top * g / 2)), { anchor: "end" });
      }
      hp += '<polygon points="' + polyStr(pts) + " " + f1(pts[pts.length - 1][0]) + "," +
        y1 + " " + f1(pts[0][0]) + "," + y1 + '" fill="' + teamHex(T, p.team) +
        '" opacity="0.45"/>' +
        '<polyline points="' + polyStr(pts) + '" fill="none" stroke="' + teamLit(p.team) +
        '" stroke-width="2.2" stroke-linejoin="round"/>';
      var i;
      for (i = 1; i < p.hp.length; i++) {
        var dv = p.hp[i][1] - p.hp[i - 1][1];
        var px = xOf(p.hp[i][0]);
        if (dv > 0.5) {
          hp += '<line x1="' + f1(px) + '" y1="' + f1(yOf(p.hp[i - 1][1])) + '" x2="' +
            f1(px) + '" y2="' + f1(yOf(p.hp[i][1])) + '" stroke="' + REPAIR +
            '" stroke-width="3"/><circle cx="' + f1(px) + '" cy="' +
            f1(yOf(p.hp[i][1])) + '" r="2.6" fill="' + REPAIR + '"><title>+' +
            T.fmtNum(Math.round(dv)) + " at " + mmss(p.hp[i][0]) + "</title></circle>";
        } else if (dv < -0.5) {
          hp += '<circle cx="' + f1(px) + '" cy="' + f1(yOf(p.hp[i][1])) +
            '" r="2.4" fill="#e6ecff" opacity="0.6"><title>-' +
            T.fmtNum(Math.round(-dv)) + " at " + mmss(p.hp[i][0]) + "</title></circle>";
        }
      }
      if (p.deathT != null) {
        hp += '<line x1="' + f1(xOf(p.deathT)) + '" y1="' + y0 + '" x2="' +
          f1(xOf(p.deathT)) + '" y2="' + y1 + '" stroke="' + DEADX + '" stroke-width="1.8"/>' +
          txt(xOf(p.deathT) - 6, y0 + 12, "killed", { anchor: "end", fill: DEADX });
      }
      for (g = 0; g <= 4; g++) {
        hp += txt(xOf(M.dur * g / 4), y1 + 21, mmss(M.dur * g / 4),
          { anchor: g === 0 ? "start" : (g === 4 ? "end" : "middle") });
      }
    } else {
      hp = txt(W / 2, H / 2, "No health trace for this player.",
        { anchor: "middle", size: 13 });
    }

    var AH = PB.AH, ay0 = PB.ay0, ay1 = PB.ay1;
    var ab = "";
    if (p.ability && p.abilityMax) {
      var amax = p.abilityMax;
      var ayOf = function (v) { return ay1 - clamp(v / amax, 0, 1) * (ay1 - ay0); };
      var apts = stepPoints(p.ability, xOf, ayOf, M.dur);
      ab += '<line x1="' + x0 + '" y1="' + ay1 + '" x2="' + x1 + '" y2="' + ay1 +
        '" stroke="' + GRID + '" stroke-width="1"/>' +
        '<polyline points="' + polyStr(apts) + '" fill="none" stroke="' + ABILITY +
        '" stroke-width="1.8" stroke-linejoin="round"/>';
      var j;
      for (j = 1; j < p.ability.length; j++) {
        if (p.ability[j][1] < p.ability[j - 1][1] - 0.5) {
          ab += '<line x1="' + f1(xOf(p.ability[j][0])) + '" y1="' +
            f1(ayOf(p.ability[j - 1][1])) + '" x2="' + f1(xOf(p.ability[j][0])) +
            '" y2="' + f1(ayOf(p.ability[j][1])) +
            '" stroke="#e6b743" stroke-width="2.4" opacity="0.9"/>';
        }
      }
      ab += txt(x0 - 7, ay0 + 4, T.fmtNum(Math.round(amax)), { anchor: "end" }) +
        txt(x0 - 7, ay1 + 4, "0", { anchor: "end" }) +
        txt(x0, AH - 8, "Ability resource. Drops are spending; " +
          T.fmtNum(p.abilitySpent) + " spent in all.");
    } else {
      ab = txt(W / 2, AH / 2, "No ability resource trace for this player.",
        { anchor: "middle", size: 12 });
    }

    return sel + cards +
      '<p class="small" style="margin:12px 0 10px">' + story + "</p>" +
      '<div class="an-plot"><svg class="an-svg" viewBox="0 0 ' + W + " " + H + '">' + hp +
      '</svg><div class="an-ph" style="left:' + f1(x0 / W * 100) + '%"></div></div>' +
      '<div class="an-plot" style="margin-top:6px"><svg class="an-svg" viewBox="0 0 ' + W +
      " " + AH + '">' + ab + '</svg><div class="an-ph" style="left:' +
      f1(x0 / W * 100) + '%"></div></div>';
  }

  // ------------------------------------------------------------------- wire
  function wire(T, root) {
    var list = usableMatches(T);
    if (!list.length) return;

    var mapSel = root.querySelector("#an-map");
    var matchSel = root.querySelector("#an-match");
    var rest = root.querySelector("#an-rest");
    var head = root.querySelector("#an-head");
    var missEl = root.querySelector("#an-miss");
    if (!matchSel || !rest) return;

    var hasRaf = typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function";

    var S = {
      id: null, M: null, t: 0, playing: false, speed: 4, raf: null, lastTs: 0,
      sel: null, smode: "raw", feedIdx: -1,
      rows: [], phs: [], teamBars: [], clock: null, scrub: null, feed: null
    };

    // ---- clock -----------------------------------------------------------
    function setPlaying(on) {
      S.playing = !!on && hasRaf && !!S.M;
      var b = rest.querySelector("#an-play");
      if (b) b.textContent = S.playing ? "Pause" : "Play";
      if (S.playing && !S.raf) {
        S.lastTs = 0;
        S.raf = window.requestAnimationFrame(frame);
      }
    }

    function frame(ts) {
      S.raf = null;
      // The router replaces #app wholesale on navigation. Once this container
      // is off the page the loop has nothing to drive and must stop.
      if (!document.body.contains(rest) || !S.M) { S.playing = false; return; }
      if (!S.playing) return;
      var dt = S.lastTs ? (ts - S.lastTs) / 1000 : 0;
      S.lastTs = ts;
      if (dt > 0.4) dt = 0.4;
      var nt = S.t + dt * S.speed;
      if (nt >= S.M.dur) { setTime(S.M.dur, false); setPlaying(false); return; }
      setTime(nt, false);
      S.raf = window.requestAnimationFrame(frame);
    }

    function setTime(t, fromScrub) {
      if (!S.M) return;
      S.t = clamp(t, 0, S.M.dur);
      var frac = S.M.dur > 0 ? S.t / S.M.dur : 0;

      if (S.clock) S.clock.textContent = mmss(S.t);
      if (S.scrub && !fromScrub) S.scrub.value = String(Math.round(S.t * 10));

      var i, sum = [0, 0], aliveN = [0, 0];
      for (i = 0; i < S.rows.length; i++) {
        var r = S.rows[i], p = r.p;
        if (p.hp && r.fill) {
          p.hpIdx = stepIndex(p.hp, S.t, p.hpIdx);
          var v = (p.hp[0][0] > S.t) ? p.hp[0][1] : p.hp[p.hpIdx][1];
          var top = p.maxHp || p.hp[0][1] || 1;
          r.fill.style.width = f1(clamp(v / top, 0, 1) * 100) + "%";
          if (r.hp) r.hp.textContent = T.fmtNum(Math.round(v));
          sum[p.team] += v;
        }
        var dead = p.deathT != null && p.deathT <= S.t;
        if (dead !== r.dead) {
          r.dead = dead;
          r.el.className = r.el.className.replace(/ an-dead/g, "") + (dead ? " an-dead" : "");
        }
        if (!dead) aliveN[p.team]++;
      }
      for (i = 0; i < S.teamBars.length; i++) {
        var tb = S.teamBars[i];
        var start = S.M.teams[tb.k].startHp || 1;
        var pc = clamp(sum[tb.k] / start, 0, 1) * 100;
        if (tb.fill) tb.fill.style.width = f1(pc) + "%";
        if (tb.pct) tb.pct.textContent = Math.round(pc) + "% · " + aliveN[tb.k] + " up";
      }
      for (i = 0; i < S.phs.length; i++) {
        S.phs[i].el.style.left = f1(S.phs[i].a + (S.phs[i].b - S.phs[i].a) * frac) + "%";
      }

      // The feed and the ladder only change when a death is crossed.
      var di = 0;
      while (di < S.M.deaths.length && S.M.deaths[di].t <= S.t) di++;
      if (di !== S.feedIdx) {
        S.feedIdx = di;
        paintFeed(di);
        var ld = rest.querySelector("#an-ladder");
        if (ld) {
          var kids = ld.children;
          for (i = 0; i < kids.length; i++) {
            kids[i].className = "an-dr" + (i < di ? " an-past" : "");
          }
        }
      }
    }

    function paintFeed(di) {
      if (!S.feed) return;
      if (!di) { S.feed.innerHTML = "<div>Nothing has happened yet.</div>"; return; }
      var out = "", i;
      for (i = di - 1; i >= 0 && i > di - 6; i--) {
        var d = S.M.deaths[i];
        out += '<div><span class="an-fm">' + mmss(d.t) + '</span><b style="color:' +
          teamLit(d.victimTeam === 1 ? 1 : 0) + '">' + T.esc(d.victim) + "</b>" +
          (d.killer
            ? ' killed by <b style="color:' + teamLit(d.killerTeam === 1 ? 1 : 0) + '">' +
              T.esc(d.killer) + "</b>" +
              (num(d.rangeM) != null ? " at " + T.fmtNum(d.rangeM) + " m" : "")
            : " died, no killer recorded") + "</div>";
      }
      S.feed.innerHTML = out;
    }

    // ---- painting --------------------------------------------------------
    function collectPh(plot, a, b) {
      if (!plot) return;
      var el = plot.querySelector(".an-ph");
      if (el) S.phs.push({ el: el, a: a, b: b });
    }

    function paintRest() {
      var M = S.M;
      if (!M) return;
      if (!S.sel || !M.byName[S.sel]) {
        var best = M.players.slice().sort(function (a, b) { return b.dmg - a.dmg; })[0];
        S.sel = best ? best.name : null;
      }

      rest.innerHTML =
        T.bigPanel("The match, played forward", stageHtml(T, M),
          "Each bar is replicated health at that moment, sampled only when it changes. " +
          "Team bars leave out any player with no trace.") +
        T.bigPanel("Two health pools, one clock",
          '<div id="an-ribbon-box">' + ribbonHtml(T, M) + "</div>",
          "Each line is a side's share of its own starting pool. The win strip is a " +
          "model fitted on this same match. Read it as a reconstruction. Early on it " +
          "sits near a coin flip.") +
        T.bigPanel("Damage dealt against damage taken",
          '<div id="an-scatter-box">' + scatterHtml(T, M, S.smode, S.sel) + "</div>",
          "Damage taken is the sum of downward steps in the health trace, not a " +
          "scoreboard column. It undercounts. Traces hold about 93% of the scoreboard's " +
          "damage, and players with no trace are not drawn.") +
        T.bigPanel("Sixteen health traces", wallHtml(T, M, S.sel),
          "One card per player, one clock. A card that ends early ends in a death. " +
          "Each scale is that player's own max health; the heights do not compare. " +
          "Blue is a repair.") +
        T.bigPanel("The order of death", ladderHtml(T, M),
          "Kill events in order. Pips are tanks alive on each side just after, Team A " +
          "left and Team B right. Range is missing on some kills. About one death in " +
          "six carries no killer.") +
        T.bigPanel("One player, taken apart",
          '<div id="an-player-box">' + playerHtml(T, M, S.sel) + "</div>",
          "Health above, ability resource below. The resource units are the game's own " +
          "and undocumented. Read the shape, not the number.");

      cacheStage();
      setTime(S.t, false);
      setPlaying(false);
    }

    // Cache everything the animation touches, and record where each playhead
    // may travel: the left and right edge of its own plot area, in percent of
    // the SVG width, so one fraction moves all of them.
    function cacheStage() {
      S.clock = rest.querySelector("#an-clock");
      S.scrub = rest.querySelector("#an-scrub");
      S.feed = rest.querySelector("#an-feed");
      S.rows = [];
      S.teamBars = [];
      S.phs = [];
      S.feedIdx = -1;

      var i, els = rest.querySelectorAll(".an-row");
      for (i = 0; i < els.length; i++) {
        var p = S.M.byName[els[i].getAttribute("data-p")];
        if (!p) continue;
        S.rows.push({
          p: p, el: els[i], dead: false,
          fill: els[i].querySelector(".an-bar i"),
          hp: els[i].querySelector(".an-hp")
        });
      }
      var tps = rest.querySelectorAll("[data-tp]");
      for (i = 0; i < tps.length; i++) {
        S.teamBars.push({
          k: tps[i].getAttribute("data-tp") === "1" ? 1 : 0,
          pct: tps[i],
          fill: tps[i].parentNode ? tps[i].parentNode.querySelector(".an-tbar i") : null
        });
      }
      collectPh(rest.querySelector("#an-ribbon"),
        RB.padL / RB.W * 100, (RB.W - RB.padR) / RB.W * 100);
      var walls = rest.querySelectorAll("#an-wall .an-plot");
      for (i = 0; i < walls.length; i++) {
        collectPh(walls[i], CW.x0 / CW.W * 100, CW.x1 / CW.W * 100);
      }
      cachePlayerPh();
      markSelected();
    }

    function cachePlayerPh() {
      var box = rest.querySelector("#an-player-box");
      if (!box) return;
      var plots = box.querySelectorAll(".an-plot"), i;
      for (i = 0; i < plots.length; i++) {
        collectPh(plots[i], PB.x0 / PB.W * 100, PB.x1 / PB.W * 100);
      }
    }

    function markSelected() {
      var i, els = rest.querySelectorAll(".an-row, .an-cell");
      for (i = 0; i < els.length; i++) {
        var base = els[i].className.replace(/ an-sel/g, "");
        els[i].className = (els[i].getAttribute("data-p") === S.sel) ? base + " an-sel" : base;
      }
    }

    function setSelected(name) {
      if (!S.M || !name || !S.M.byName[name] || name === S.sel) {
        if (S.M && name && S.M.byName[name]) S.sel = name;
        markSelected();
        return;
      }
      S.sel = name;
      markSelected();
      // Only the two panels that depend on the selection are redrawn, and the
      // playheads that were inside them are dropped and re-collected.
      var sbox = rest.querySelector("#an-scatter-box");
      if (sbox) sbox.innerHTML = scatterHtml(T, S.M, S.smode, S.sel);
      var pbox = rest.querySelector("#an-player-box");
      if (pbox) {
        pbox.innerHTML = playerHtml(T, S.M, S.sel);
        var keep = [], i;
        for (i = 0; i < S.phs.length; i++) {
          if (rest.contains(S.phs[i].el)) keep.push(S.phs[i]);
        }
        S.phs = keep;
        cachePlayerPh();
      }
      setTime(S.t, false);
    }

    // ---- loading ---------------------------------------------------------
    function load(id) {
      if (!id) return;
      S.id = id;
      S.M = null;
      S.playing = false;
      S.t = 0;
      S.sel = null;
      S.rows = []; S.phs = []; S.teamBars = [];
      S.clock = null; S.scrub = null; S.feed = null;
      if (missEl) { missEl.hidden = true; missEl.textContent = ""; }
      if (head) head.innerHTML = '<p class="small">Loading.</p>';
      rest.innerHTML = '<div class="panel"><p class="small">Loading the match file.</p></div>';

      function fail(msg) {
        if (S.id !== id || !document.body.contains(rest)) return;
        if (head) head.innerHTML = "";
        rest.innerHTML = '<div class="panel"><p class="small">' + T.esc(msg) + "</p></div>";
      }

      var pr;
      try {
        pr = T.loadJson("matches/" + encodeURIComponent(id) + ".json");
      } catch (e) {
        fail("The match file could not be requested. Pick another match.");
        return;
      }
      if (!pr || typeof pr.then !== "function") {
        fail("The match file could not be requested. Pick another match.");
        return;
      }

      pr.then(function (deep) {
        if (S.id !== id || !document.body.contains(rest)) return;
        if (!deep || !deep.players || !deep.players.length) {
          fail("There is no deep file for this match, or it holds no players. " +
            "Pick another match.");
          return;
        }
        S.M = analyse(T, deep);
        if (head) head.innerHTML = headHtml(T, S.M);
        if (missEl) {
          var bits = [];
          if (S.M.untraced) {
            bits.push(S.M.untraced + " of " + S.M.players.length + " players have no " +
              "health trace: greyed out, and left out of every damage taken figure.");
          }
          var nk = S.M.deaths.filter(function (d) { return !d.killer; }).length;
          if (nk) bits.push(nk + " of " + S.M.deaths.length + " deaths carry no killer.");
          if (!S.M.winProb) bits.push("This file has no win probability curve.");
          if (bits.length) { missEl.textContent = bits.join(" "); missEl.hidden = false; }
        }
        paintRest();
      }, function () {
        fail("The match file failed to load. Pick another match, or try again.");
      });
    }

    // ---- picker wiring ---------------------------------------------------
    function visible() {
      var want = mapSel ? mapSel.value : "";
      return list.filter(function (m) { return !want || m.map === want; });
    }
    function updateArrows() {
      var pb = root.querySelector("#an-prev"), nb = root.querySelector("#an-next");
      var i = matchSel.selectedIndex, n = matchSel.options.length;
      if (pb) pb.disabled = i <= 0;
      if (nb) nb.disabled = i < 0 || i >= n - 1;
    }
    function rebuildOptions(keepId) {
      var vis = visible(), i, found = false;
      matchSel.innerHTML = vis.map(function (m) {
        return '<option value="' + T.esc(m.match_id) + '">' + T.esc(matchLabel(T, m)) +
          "</option>";
      }).join("");
      for (i = 0; i < vis.length; i++) if (vis[i].match_id === keepId) found = true;
      var pickId = found ? keepId : (vis.length ? vis[0].match_id : null);
      if (pickId) matchSel.value = pickId;
      updateArrows();
      return pickId;
    }

    if (mapSel) {
      mapSel.addEventListener("change", function () {
        var id = rebuildOptions(S.id);
        if (id && id !== S.id) load(id);
      });
    }
    matchSel.addEventListener("change", function () {
      updateArrows();
      if (matchSel.value && matchSel.value !== S.id) load(matchSel.value);
    });
    function nudge(delta) {
      var i = matchSel.selectedIndex + delta;
      if (i < 0 || i >= matchSel.options.length) return;
      matchSel.selectedIndex = i;
      updateArrows();
      load(matchSel.value);
    }
    var pbtn = root.querySelector("#an-prev"), nbtn = root.querySelector("#an-next");
    if (pbtn) pbtn.addEventListener("click", function () { nudge(-1); });
    if (nbtn) nbtn.addEventListener("click", function () { nudge(1); });

    var chipBox = root.querySelector("#an-chips");
    if (chipBox) {
      chipBox.addEventListener("click", function (e) {
        var b = e.target && e.target.closest
          ? e.target.closest("button[data-pick]") : null;
        if (!b) return;
        var kind = b.getAttribute("data-pick"), vis = visible(), m = null;
        if (!vis.length) return;
        if (kind === "longest") {
          m = pickBest(vis, function (x) { return x.duration_sec || 0; });
        } else if (kind === "shortest") {
          m = pickBest(vis, function (x) {
            return (x.duration_sec || 0) >= 60 ? -x.duration_sec : null;
          });
        } else if (kind === "kills") {
          m = pickBest(vis, matchKills);
        } else if (kind === "topdmg") {
          m = pickBest(vis, matchTopDmg);
        } else {
          m = vis[Math.floor(Math.random() * vis.length)];
        }
        if (!m) return;
        matchSel.value = m.match_id;
        updateArrows();
        if (m.match_id !== S.id) load(m.match_id);
      });
    }

    // ---- one delegated listener for everything inside #an-rest ------------
    rest.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest || !S.M) return;

      if (t.closest("#an-play")) { setPlaying(!S.playing); return; }
      if (t.closest("#an-restart")) { setTime(0, false); setPlaying(true); return; }

      var sp = t.closest("#an-speed button");
      if (sp) {
        S.speed = parseFloat(sp.getAttribute("data-sp")) || 1;
        var sibs = sp.parentNode.children, i;
        for (i = 0; i < sibs.length; i++) sibs[i].className = sibs[i] === sp ? "an-on" : "";
        return;
      }

      var md = t.closest("#an-smode button");
      if (md) {
        S.smode = md.getAttribute("data-md") === "rate" ? "rate" : "raw";
        var sbox = rest.querySelector("#an-scatter-box");
        if (sbox) sbox.innerHTML = scatterHtml(T, S.M, S.smode, S.sel);
        return;
      }

      var dr = t.closest(".an-dr");
      if (dr) {
        setPlaying(false);
        setTime(parseFloat(dr.getAttribute("data-t")) || 0, false);
        return;
      }

      var holder = t.closest(".an-cell, .an-row");
      if (holder) { setSelected(holder.getAttribute("data-p")); return; }

      if (t.tagName && String(t.tagName).toLowerCase() === "circle" &&
          t.getAttribute("data-p")) {
        setSelected(t.getAttribute("data-p"));
        return;
      }

      var rib = t.closest("#an-ribbon");
      if (rib) {
        var rr = rib.getBoundingClientRect();
        if (rr.width > 0) {
          var vx = (e.clientX - rr.left) / rr.width * RB.W;
          setPlaying(false);
          setTime(clamp((vx - RB.padL) / (RB.W - RB.padR - RB.padL), 0, 1) * S.M.dur, false);
        }
        return;
      }

      var rail = t.closest("#an-rail");
      if (rail) {
        var ar = rail.getBoundingClientRect();
        if (ar.width > 0) {
          setPlaying(false);
          setTime(clamp((e.clientX - ar.left) / ar.width, 0, 1) * S.M.dur, false);
        }
      }
    });

    rest.addEventListener("input", function (e) {
      if (e.target && e.target.id === "an-scrub") {
        setPlaying(false);
        setTime((parseFloat(e.target.value) || 0) / 10, true);
      }
    });

    rest.addEventListener("change", function (e) {
      if (e.target && e.target.id === "an-psel") setSelected(e.target.value);
    });

    // ---- first match -----------------------------------------------------
    // The default is the most recent match that ran at least two minutes, so a
    // truncated recording is not the first thing anyone sees.
    var first = null, i;
    for (i = 0; i < list.length; i++) {
      if ((list[i].duration_sec || 0) >= 120) { first = list[i]; break; }
    }
    if (!first) first = list[0];
    matchSel.value = first.match_id;
    updateArrows();
    load(first.match_id);
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "anatomy",
    title: "Anatomy",
    blurb: "One match pulled apart: every health trace, every death, second by second.",
    accent: "#35674a",
    css: CSS,
    gated: true,
    preview: preview,
    render: render,
    wire: wire
  });
})();

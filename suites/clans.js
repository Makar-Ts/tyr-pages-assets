/* TYR suite: "Clans" -- the tags people wear, and what is behind them.
 *
 * Nothing else on the site is built around clans, so this page starts from
 * the two facts that decide how everything on it must be read.
 *
 * quarters of the uploaded matches. A clan is in this data because it met
 * The page states that at the top and gives it a whole panel at the bottom.
 *
 * The second is that a clan is not a team. Members turn up on opposite sides
 * of the same match. The unit of account on this page is therefore the
 * clan-side: one clan, on one team, in one match. A match with members on
 * both teams produces two clan-sides, one won and one lost.
 *
 * Sources, and what each one holds:
 *   T.DATA.clans[]        tag, slug, members[{id,label,games,winrate,avg,
 *                         short_id}]. members is the career roster. Every
 *                         member got there by wearing the tag in a recorded
 *                         match, so the roster is built from this archive.
 *   T.DATA.matches[]      players[] carry clan, which is the tag worn in that
 *                         match. It is per match, so a player who changed
 *                         tags shows both. Every count of appearances,
 *                         sides, tanks, maps and head-to-head on this page
 *                         comes from these rows.
 *   T.DATA.players[]      career rows, read only for a member's total games.
 *
 * T.STATS.clan_sizes is not used. It counts appearances, not people, and the
 * size panel says so.
 *
 * Every clan tag and every player name goes through tagLabel() or who(),
 * which print "Clan 7" and "Player 1442" when T.SHOW_PLAYER_PAGES is false.
 * The suite is marked gated as well, so in that mode it is hidden outright.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var GOLD = "#4f7cff";      // the site accent, not the published-stat gold
  var GOLD_TEXT = "#c3d2ff";   // pale blue, was pale gold
  var GOLD_HI = "#dbe4ff";     // pale blue, was pale gold
  var COOL = "#5a72ad";
  var COOL_DIM = "#3a4a78";
  var GREY = "#232b4d";
  var ROSE = "#e0707f";
  var TEAL = "#58d8c0";
  var AMBER = "#a06bff";     // violet, matching the rest of the site

  var CSS = "" +
    ".cln-topbar{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 16px;padding:12px 14px;background:linear-gradient(180deg,rgba(79,124,255,.11),rgba(79,124,255,0));border:1px solid var(--border);border-left:3px solid " + GOLD + ";border-radius:10px}" +
    ".cln-k{font-size:.64rem;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}" +
    ".cln-select{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.86rem;padding:6px 10px;max-width:min(26rem,70vw)}" +
    ".cln-select:focus{outline:0;border-color:" + GOLD + "}" +
    ".cln-range{width:250px;max-width:44vw;accent-color:" + GOLD + ";vertical-align:middle}" +
    ".cln-read{font-size:.78rem;color:var(--dim);line-height:1.5}" +
    ".cln-read b{color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".cln-headline{margin-left:auto;text-align:right;font-size:.76rem;color:var(--dim);line-height:1.5;max-width:34rem}" +
    ".cln-headline b{color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".cln-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 12px}" +
    ".cln-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-wrap:wrap}" +
    ".cln-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.78rem;padding:6px 12px;cursor:pointer}" +
    ".cln-seg button+button{border-left:1px solid var(--border)}" +
    ".cln-seg button:hover{color:var(--text)}" +
    ".cln-seg button.cln-on{background:rgba(79,124,255,.2);color:" + GOLD_TEXT + "}" +
    ".cln-note{font-size:.76rem;color:var(--dim)}" +
    ".cln-scroll{overflow-x:auto}" +
    ".cln-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:10px}" +
    ".cln-card{background:var(--panel2);border:1px solid var(--border);border-top:2px solid rgba(79,124,255,.55);border-radius:10px;padding:11px 13px}" +
    ".cln-cl{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim)}" +
    ".cln-cv{font-size:1.4rem;font-weight:700;color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;margin:5px 0 3px;font-family:ui-monospace,Consolas,Menlo,monospace;line-height:1.1}" +
    ".cln-cs{font-size:.74rem;color:var(--dim);line-height:1.55}" +
    ".cln-table{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}" +
    ".cln-table th{text-align:left;font-size:.62rem;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);font-weight:600;padding:0 8px 7px;border-bottom:1px solid var(--border);white-space:nowrap}" +
    ".cln-table th.cln-sortable{cursor:pointer}" +
    ".cln-table th.cln-sortable:hover{color:var(--text)}" +
    ".cln-table th.cln-sorted{color:" + GOLD_TEXT + "}" +
    ".cln-table td{padding:7px 8px;border-bottom:1px solid rgba(127,137,179,.16);white-space:nowrap}" +
    ".cln-table tr:hover td{background:rgba(79,124,255,.05)}" +
    ".cln-table tr.cln-me td{background:rgba(79,124,255,.12)}" +
    ".cln-table a{color:inherit}" +
    ".cln-rank{width:26px;color:var(--dim);font-size:.74rem;text-align:right}" +
    ".cln-dim{color:var(--dim)}" +
    ".cln-valcell{position:relative;min-width:120px}" +
    ".cln-bar{position:absolute;left:0;top:4px;bottom:4px;background:linear-gradient(90deg,rgba(79,124,255,.46),rgba(79,124,255,.07));border-radius:3px}" +
    ".cln-valcell b{position:relative;color:" + GOLD_TEXT + ";padding-left:7px;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".cln-thin{color:" + AMBER + ";font-size:.7rem;margin-left:6px}" +
    ".cln-panelread{display:flex;flex-wrap:wrap;gap:10px 30px;margin:14px 0 2px;padding-top:12px;border-top:1px solid var(--border)}" +
    ".cln-rk{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin-bottom:3px}" +
    ".cln-rv{font-size:1.2rem;font-weight:700;color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".cln-sentence{margin:12px 0 0;font-size:.9rem;line-height:1.7;color:var(--text)}" +
    ".cln-sentence b{color:" + GOLD_TEXT + ";font-variant-numeric:tabular-nums}" +
    ".cln-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.72rem;color:var(--dim);margin:0 0 9px}" +
    ".cln-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}";

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
  function pc(n) { return f1(n) + "%"; }
  function sgn(n) { return (n > 0 ? "+" : "") + f1(n); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }
  function plural(n, one, many) { return n === 1 ? one : many; }

  var TT = null;   // the T handed in by the router

  // A clan tag names the people wearing it, so it is gated exactly like a
  // player name. With player pages off this prints a position, not a tag.
  function tagLabel(R) {
    if (!TT || TT.SHOW_PLAYER_PAGES === false || !R || !R.tag) {
      return "Clan " + ((R ? R.idx : 0) + 1);
    }
    return R.tag;
  }
  function who(mem) {
    var sid = (mem && mem.short_id !== undefined) ? mem.short_id : null;
    if (!TT || TT.SHOW_PLAYER_PAGES === false || !mem || !mem.label) {
      return '<span class="cln-dim">Player ' +
        E(sid === null || sid === undefined ? "?" : sid) + "</span>";
    }
    if (sid === null || sid === undefined) return E(mem.label);
    return '<a href="#/player/' + encodeURIComponent(sid) + '">' + E(mem.label) + "</a>";
  }
  function matchLink(mid, text) {
    if (!mid) return E(text);
    return '<a href="#/match/' + encodeURIComponent(mid) + '">' + E(text) + "</a>";
  }
  function dateOf(unix) {
    if (TT && TT.fmtDateTime && unix) return TT.fmtDateTime(unix);
    return "-";
  }
  function tankHue(name) {
    return (TT && TT.tankColor && TT.tankColor(name)) || GOLD;
  }
  function medianOf(vals) {
    if (!vals.length) return null;
    var a = vals.slice();
    a.sort(function (x, y) { return x - y; });
    var h = a.length >> 1;
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }

  // ------------------------------------------------------------------ model
  var _M = null;

  function bump(store, key, won) {
    if (!store[key]) store[key] = { n: 0, w: 0, l: 0 };
    var e = store[key];
    e.n++;
    if (won === 1) e.w++;
    else if (won === 0) e.l++;
    return e;
  }

  function model(T) {
    if (_M) return _M;
    var D = (T && T.DATA) || {};
    var i, j, k;

    var matches = [];
    var msrc = D.matches || [];
    for (i = 0; i < msrc.length; i++) {
      if (msrc[i] && msrc[i].match_id) matches.push(msrc[i]);
    }
    matches.sort(function (a, b) {
      return (num(a.captured_unix, 0) - num(b.captured_unix, 0));
    });

    var career = {};
    var psrc = D.players || [];
    for (i = 0; i < psrc.length; i++) {
      if (psrc[i] && psrc[i].id) career[psrc[i].id] = psrc[i];
    }

    // Who the archive belongs to: the player present in the most matches.
    // Counted once per match, not once per row.
    var presence = {}, topId = null, topN = 0;
    for (i = 0; i < matches.length; i++) {
      var here = {}, rws = matches[i].players || [];
      for (j = 0; j < rws.length; j++) if (rws[j] && rws[j].id) here[rws[j].id] = 1;
      for (k in here) {
        if (!here.hasOwnProperty(k)) continue;
        presence[k] = (presence[k] || 0) + 1;
        if (presence[k] > topN) { topN = presence[k]; topId = k; }
      }
    }

    var byTag = {}, list = [];
    function rec(tag) {
      if (!byTag[tag]) {
        byTag[tag] = {
          idx: list.length, tag: tag, roster: [],
          matchN: 0, withTop: 0, split: 0,
          sides: 0, wins: 0, losses: 0, undec: 0,
          together: 0, alone: 0,
          rows: 0, dmg: 0, kills: 0, assist: 0, blocked: 0,
          byMember: {}, tanks: {}, maps: {},
          mine: [], opp: {}, ally: {},
          firstI: null, lastI: null
        };
        list.push(byTag[tag]);
      }
      return byTag[tag];
    }

    var csrc = D.clans || [];
    for (i = 0; i < csrc.length; i++) {
      if (!csrc[i] || !csrc[i].tag) continue;
      rec(csrc[i].tag).roster = csrc[i].members || [];
    }

    var tankBase = {}, tankBaseN = 0, mapBase = {}, mapBaseN = 0;

    for (i = 0; i < matches.length; i++) {
      var m = matches[i];
      var wt = (m.winning_team === 0 || m.winning_team === 1) ? m.winning_team : null;
      var rows = m.players || [];
      var hasTop = false;
      var groups = {}, teamTags = [{}, {}];

      for (j = 0; j < rows.length; j++) {
        var p = rows[j];
        if (!p) continue;
        if (p.id === topId) hasTop = true;
        if (p.tank) { tankBase[p.tank] = (tankBase[p.tank] || 0) + 1; tankBaseN++; }
        if (!p.clan) continue;
        var tm = (p.team === 0 || p.team === 1) ? p.team : "x";
        if (!groups[p.clan]) groups[p.clan] = {};
        if (!groups[p.clan][tm]) groups[p.clan][tm] = [];
        groups[p.clan][tm].push(p);
        if (tm !== "x") teamTags[tm][p.clan] = 1;
      }
      if (m.map) { mapBase[m.map] = (mapBase[m.map] || 0) + 1; mapBaseN++; }

      for (var tg in groups) {
        if (!groups.hasOwnProperty(tg)) continue;
        var R = rec(tg);
        R.matchN++;
        if (hasTop) R.withTop++;
        if (R.firstI === null) R.firstI = i;
        R.lastI = i;
        if (m.map) R.maps[m.map] = (R.maps[m.map] || 0) + 1;

        var teams = groups[tg], nteams = 0, wonAny = 0, lostAny = 0, undecAny = 0;
        var entry = {
          i: i, mid: m.match_id, when: m.captured_unix, map: m.map || "?",
          top: hasTop, n: 0, result: null
        };
        for (var tk in teams) {
          if (!teams.hasOwnProperty(tk)) continue;
          nteams++;
          var grp = teams[tk];
          var tnum = (tk === "x") ? null : (tk === "0" ? 0 : 1);
          var won = (wt === null || tnum === null) ? null : (tnum === wt ? 1 : 0);
          R.sides++;
          if (won === 1) { R.wins++; wonAny++; }
          else if (won === 0) { R.losses++; lostAny++; }
          else { R.undec++; undecAny++; }
          if (grp.length >= 2) R.together++; else R.alone++;
          entry.n += grp.length;
          for (var q = 0; q < grp.length; q++) {
            var pr = grp[q];
            R.rows++;
            R.byMember[pr.id] = (R.byMember[pr.id] || 0) + 1;
            if (pr.tank) R.tanks[pr.tank] = (R.tanks[pr.tank] || 0) + 1;
            R.dmg += num(pr.dmg, 0);
            R.kills += num(pr.kills, 0);
            R.assist += num(pr.assist, 0);
            R.blocked += num(pr.blocked, 0);
          }
        }
        if (nteams > 1) R.split++;
        entry.result = (wonAny && lostAny) ? "both"
          : (wonAny ? "won" : (lostAny ? "lost" : null));
        R.mine.push(entry);
      }

      // head to head, and who shared a team
      var a = [], b = [], z;
      for (z in teamTags[0]) if (teamTags[0].hasOwnProperty(z)) a.push(z);
      for (z in teamTags[1]) if (teamTags[1].hasOwnProperty(z)) b.push(z);
      for (var u = 0; u < a.length; u++) {
        for (var v = 0; v < b.length; v++) {
          if (a[u] === b[v]) continue;
          bump(rec(a[u]).opp, b[v], wt === null ? null : (wt === 0 ? 1 : 0));
          bump(rec(b[v]).opp, a[u], wt === null ? null : (wt === 1 ? 1 : 0));
        }
      }
      var sides2 = [a, b];
      for (var s = 0; s < 2; s++) {
        var g2 = sides2[s];
        var w2 = (wt === null) ? null : (wt === s ? 1 : 0);
        for (var x = 0; x < g2.length; x++) {
          for (var y = 0; y < g2.length; y++) {
            if (x === y) continue;
            bump(rec(g2[x]).ally, g2[y], w2);
          }
        }
      }
    }

    // derived, then a display order: most present first
    var totalSides = 0, totalTogether = 0, maxSides = 1, neverTogether = 0;
    for (i = 0; i < list.length; i++) {
      var C = list[i];
      C.decided = C.wins + C.losses;
      C.winrate = C.decided ? C.wins / C.decided * 100 : null;
      C.togetherPct = C.sides ? C.together / C.sides * 100 : null;
      C.topPct = C.matchN ? C.withTop / C.matchN * 100 : null;
      C.avgDmg = C.rows ? C.dmg / C.rows : null;
      C.avgKills = C.rows ? C.kills / C.rows : null;
      C.avgAssist = C.rows ? C.assist / C.rows : null;
      C.avgBlocked = C.rows ? C.blocked / C.rows : null;
      C.rosterN = C.roster.length;
      var lead = 0;
      for (k in C.byMember) {
        if (C.byMember.hasOwnProperty(k) && C.byMember[k] > lead) lead = C.byMember[k];
      }
      C.leadRows = lead;
      C.leadPct = C.rows ? lead / C.rows * 100 : null;
      totalSides += C.sides;
      totalTogether += C.together;
      if (C.sides && !C.together) neverTogether++;
      if (C.sides > maxSides) maxSides = C.sides;
    }
    list.sort(function (p1, p2) {
      return (p2.matchN - p1.matchN) || (p2.sides - p1.sides) ||
        (p1.tag < p2.tag ? -1 : 1);
    });
    for (i = 0; i < list.length; i++) list[i].idx = i;

    _M = {
      matches: matches, list: list, byTag: byTag,
      topId: topId, topN: topN,
      topLabel: (career[topId] && career[topId].label) || null,
      career: career,
      tankBase: tankBase, tankBaseN: tankBaseN,
      mapBase: mapBase, mapBaseN: mapBaseN,
      totalSides: totalSides, totalTogether: totalTogether,
      neverTogether: neverTogether, maxSides: maxSides,
      medMatches: medianOf(list.map(function (c) { return c.matchN; })),
      medRoster: medianOf(list.map(function (c) { return c.rosterN; })),
      soloClans: (function () {
        var n = 0;
        for (var q2 = 0; q2 < list.length; q2++) if (list[q2].rosterN === 1) n++;
        return n;
      })(),
      oneVoice: (function () {
        var n = 0;
        for (var q3 = 0; q3 < list.length; q3++) {
          if (list[q3].rows >= 2 && list[q3].leadPct !== null && list[q3].leadPct >= 50) n++;
        }
        return n;
      })()
    };
    return _M;
  }

  // ------------------------------------------------------------------ state
  var ST = {
    clan: 0,
    minSides: 8,
    dim: "tank",
    pmode: "result",
    h2h: "against",
    size: "roster",
    sortKey: "sides",
    sortDir: -1
  };

  function cur(M) {
    if (!M.list.length) return null;
    var i = clamp(ST.clan, 0, M.list.length - 1);
    return M.list[i];
  }
  function above(M) {
    var out = [];
    for (var i = 0; i < M.list.length; i++) {
      if (M.list[i].sides >= ST.minSides) out.push(M.list[i]);
    }
    return out;
  }

  // --------------------------------------------------------------- SVG bits
  function svgOpen(w, h) {
    return '<svg class="chart-svg" width="100%" viewBox="0 0 ' + w + " " + h +
      '" preserveAspectRatio="xMidYMid meet">';
  }
  function axisText(x, y, txt, anchor, fill) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' +
      (fill || "#7f89b3") + '" font-size="12" text-anchor="' + (anchor || "middle") +
      '">' + E(txt) + "</text>";
  }

  // ------------------------------------------------------------- the topbar
  function pickerHtml(M) {
    var opts = M.list.map(function (C) {
      return '<option value="' + C.idx + '"' + (C.idx === ST.clan ? " selected" : "") +
        ">" + E(tagLabel(C)) + " (" + fint(C.matchN) + " " +
        plural(C.matchN, "match", "matches") + ")</option>";
    }).join("");
    return '<span class="cln-k">Clan</span>' +
      '<select class="cln-select" id="cln-pick">' + opts + "</select>";
  }

  function floorReadHtml(M) {
    var kept = above(M);
    return "<b>" + E(fint(kept.length)) + "</b> of " + E(fint(M.list.length)) +
      " tags clear <b>" + E(fint(ST.minSides)) + "</b> " +
      E(plural(ST.minSides, "clan-side", "clan-sides")) + ".";
  }

  function headlineHtml(M) {
    if (!M.matches.length) return "";
    return E(fint(M.list.length)) + " tags across " +
      E(fint(M.matches.length)) + " matches.";
  }

  // -------------------------------------------------- panel: the clan picked
  function profileHtml(M) {
    var C = cur(M);
    if (!C) return "";
    var n = M.matches.length;
    var out = [];
    function card(label, value, sub) {
      out.push('<div class="cln-card"><div class="cln-cl">' + E(label) + "</div>" +
        '<div class="cln-cv">' + value + "</div>" +
        '<div class="cln-cs">' + sub + "</div></div>");
    }
    card("Matches present", E(fint(C.matchN)),
      E(pc(n ? C.matchN / n * 100 : 0)) + " of the archive");
    card("Clan-sides", E(fint(C.sides)),
      E(fint(C.together)) + " with two or more members");
    card("Win rate", C.decided ? E(pc(C.winrate)) : '<span class="cln-dim">-</span>',
      C.decided
        ? E(fint(C.wins)) + " won, " + E(fint(C.losses)) + " lost" +
          (C.undec ? ", " + E(fint(C.undec)) + " undecided" : "")
        : "no decided side");
    card("On both sides", E(fint(C.split)),
      C.split ? "each counts as a win and a loss" : "never split a match");
    card("Roster", E(fint(C.rosterN)),
      E(fint(C.rows)) + " tagged " + E(plural(C.rows, "appearance", "appearances")));
    card("Busiest member", C.rows ? E(pc(C.leadPct)) : '<span class="cln-dim">-</span>',
      C.rows ? "of the tag's appearances" : "nothing recorded");
    card("Damage per game", C.avgDmg === null ? '<span class="cln-dim">-</span>' : E(fint(C.avgDmg)),
      C.avgKills === null ? "" : E(f1(C.avgKills) + " kills, " + fint(C.avgAssist) + " assist"));
    var windowN = (C.firstI === null) ? 0 : (C.lastI - C.firstI + 1);
    card("Window", E(fint(windowN)),
      windowN ? "matches between first and last sighting" : "never sighted");

    // roster, ordered by appearances under this tag then career games
    var mem = C.roster.slice();
    mem.sort(function (a, b) {
      var ra = C.byMember[a.id] || 0, rb = C.byMember[b.id] || 0;
      return (rb - ra) || (num(b.games, 0) - num(a.games, 0));
    });
    var maxRows = 1;
    for (var i = 0; i < mem.length; i++) {
      var r = C.byMember[mem[i].id] || 0;
      if (r > maxRows) maxRows = r;
    }
    var body = mem.map(function (mm, idx) {
      var got = C.byMember[mm.id] || 0;
      var g = num(mm.games, null);
      var av = mm.avg || {};
      return "<tr>" +
        '<td class="cln-rank">' + (idx + 1) + "</td>" +
        "<td>" + who(mm) + "</td>" +
        '<td class="cln-valcell"><span class="cln-bar" style="width:' +
          (got / maxRows * 100).toFixed(1) + '%"></span><b>' + E(fint(got)) + "</b></td>" +
        '<td class="cln-dim">' + E(g === null ? "-" : fint(g)) + "</td>" +
        '<td class="cln-dim">' + E(mm.winrate === undefined || mm.winrate === null
          ? "-" : pc(mm.winrate)) + "</td>" +
        '<td class="cln-dim">' + E(fint(num(av.dmg, null))) + "</td>" +
        '<td class="cln-dim">' + E(f1(num(av.kills, null))) + "</td>" +
        '<td class="cln-dim">' + E(fint(num(av.assist, null))) + "</td>" +
        '<td class="cln-dim">' + E(fint(num(av.blocked, null))) + "</td>" +
        "</tr>";
    }).join("");

    var line = "";
    if (C.matchN) {
      line = '<p class="cln-sentence">Seen from ' +
        matchLink(M.matches[C.firstI].match_id, dateOf(M.matches[C.firstI].captured_unix)) +
        " to " +
        matchLink(M.matches[C.lastI].match_id, dateOf(M.matches[C.lastI].captured_unix)) +
        ".</p>";
    }

    return '<div class="cln-cards">' + out.join("") + "</div>" + line +
      (mem.length
        ? '<div class="cln-scroll" style="margin-top:14px"><table class="cln-table"><thead><tr>' +
          "<th></th><th>Member</th><th>Games with this tag</th><th>Career games</th>" +
          "<th>Career win rate</th><th>Avg damage</th><th>Avg kills</th>" +
          "<th>Avg assist</th><th>Avg blocked</th>" +
          "</tr></thead><tbody>" + body + "</tbody></table></div>"
        : '<p class="cln-note">No roster recorded for this tag.</p>');
  }

  // ------------------------------------------------- panel: tanks, and maps
  function mixCtlHtml() {
    return '<div class="cln-ctl">' +
      '<span class="cln-k">Compare</span>' +
      '<div class="cln-seg" id="cln-dim">' +
        '<button type="button" data-dim="tank"' + (ST.dim === "tank" ? ' class="cln-on"' : "") +
          ">tanks</button>" +
        '<button type="button" data-dim="map"' + (ST.dim === "map" ? ' class="cln-on"' : "") +
          ">maps</button>" +
      "</div></div>";
  }

  function mixOutHtml(M) {
    var C = cur(M);
    if (!C) return "";
    var isTank = ST.dim === "tank";
    var counts = isTank ? C.tanks : C.maps;
    var base = isTank ? M.tankBase : M.mapBase;
    var baseN = isTank ? M.tankBaseN : M.mapBaseN;
    var tot = isTank ? C.rows : C.matchN;
    if (!tot || !baseN) {
      return mixCtlHtml() + '<p class="cln-note">Nothing recorded for this tag.</p>';
    }

    var rows = [], key;
    for (key in base) {
      if (!base.hasOwnProperty(key)) continue;
      var got = counts[key] || 0;
      var share = got / tot * 100;
      var bshare = base[key] / baseN * 100;
      rows.push({ label: key, got: got, share: share, base: bshare, diff: share - bshare });
    }
    rows.sort(function (a, b) { return b.diff - a.diff; });

    var span = 1;
    for (var i = 0; i < rows.length; i++) {
      if (Math.abs(rows[i].diff) > span) span = Math.abs(rows[i].diff);
    }
    span = Math.ceil(span / 5) * 5;

    var W = 1000, ROWH = 22, GAP = 5, L = 150, R = 230;
    var H = rows.length * (ROWH + GAP) + 26;
    var pw = W - L - R, mid = L + pw / 2;
    var out = svgOpen(W, H);
    for (i = 0; i <= 4; i++) {
      var gx = L + pw * i / 4;
      out += '<line x1="' + gx.toFixed(1) + '" y1="0" x2="' + gx.toFixed(1) + '" y2="' +
        (H - 26) + '" stroke="rgba(127,137,179,' + (i === 2 ? ".38" : ".12") +
        ')" stroke-width="1"/>' +
        axisText(gx, H - 8, sgn(-span + span * i / 2) + "pt", i === 0 ? "start" : "middle");
    }
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var y = i * (ROWH + GAP);
      var w = Math.abs(r.diff) / span * (pw / 2);
      var x0 = r.diff >= 0 ? mid : mid - w;
      var col = isTank ? tankHue(r.label) : (r.diff >= 0 ? GOLD : COOL);
      out += '<text x="' + (L - 10) + '" y="' + (y + ROWH / 2 + 4) +
        '" fill="#d6dcf5" font-size="12" text-anchor="end">' + E(r.label) + "</text>";
      out += '<rect x="' + x0.toFixed(1) + '" y="' + (y + 2) + '" width="' +
        Math.max(1.5, w).toFixed(1) + '" height="' + (ROWH - 4) + '" rx="3" fill="' + col +
        '" opacity="' + (r.got ? "0.92" : "0.4") + '"><title>' +
        E(r.label + ": " + fint(r.got) + " of " + fint(tot) + " (" + pc(r.share) +
          "), archive " + pc(r.base)) + "</title></rect>";
      out += '<text x="' + (W - 6) + '" y="' + (y + ROWH / 2 + 4) +
        '" fill="#7f89b3" font-size="12" text-anchor="end">' +
        E(fint(r.got) + " of " + fint(tot) + " = " + pc(r.share) +
          ", archive " + pc(r.base)) + "</text>";
    }
    out += "</svg>";

    var lean = rows[0], shy = rows[rows.length - 1];
    return mixCtlHtml() +
      '<div class="cln-key">' +
        '<span>bars are percentage points away from the archive share</span>' +
        '<span>right of centre means this tag picks it more often</span>' +
      "</div>" + out +
      '<p class="cln-sentence">Furthest above the archive: <b>' + E(lean.label) +
      "</b>, " + E(fint(lean.got)) + " of " + E(fint(tot)) + " (<b>" + E(sgn(lean.diff)) +
      " points</b>). Furthest below: <b>" + E(shy.label) + "</b>, " + E(fint(shy.got)) +
      " (" + E(sgn(shy.diff)) + ").</p>";
  }

  // ----------------------------------------------- panel: where they turn up


  var _topCache = {};
  function hasTopIn(M, m) {
    if (_topCache[m.match_id] !== undefined) return _topCache[m.match_id];
    var rows = m.players || [], got = false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].id === M.topId) { got = true; break; }
    }
    _topCache[m.match_id] = got;
    return got;
  }

  // ------------------------------------------------ panel: who they meet
  function h2hCtlHtml() {
    return '<div class="cln-ctl">' +
      '<span class="cln-k">Show</span>' +
      '<div class="cln-seg" id="cln-h2h">' +
        '<button type="button" data-h2h="against"' + (ST.h2h === "against" ? ' class="cln-on"' : "") +
          ">tags they faced</button>" +
        '<button type="button" data-h2h="with"' + (ST.h2h === "with" ? ' class="cln-on"' : "") +
          ">tags they shared a team with</button>" +
      "</div></div>";
  }

  function h2hOutHtml(M) {
    var C = cur(M);
    if (!C) return "";
    var store = ST.h2h === "against" ? C.opp : C.ally;
    var rows = [], key;
    for (key in store) {
      if (!store.hasOwnProperty(key)) continue;
      var other = M.byTag[key];
      if (!other) continue;
      var e = store[key];
      rows.push({ o: other, n: e.n, w: e.w, l: e.l });
    }
    if (!rows.length) {
      return h2hCtlHtml() + '<p class="cln-note">No other tag shares a match with this one.</p>';
    }
    rows.sort(function (a, b) { return (b.n - a.n) || (b.w - a.w); });
    var shown = rows.slice(0, 16);
    var maxN = shown[0].n || 1;

    var once = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i].n === 1) once++;

    var body = shown.map(function (r, idx) {
      var dec = r.w + r.l;
      return "<tr>" +
        '<td class="cln-rank">' + (idx + 1) + "</td>" +
        "<td>" + E(tagLabel(r.o)) + "</td>" +
        '<td class="cln-valcell"><span class="cln-bar" style="width:' +
          (r.n / maxN * 100).toFixed(1) + '%"></span><b>' + E(fint(r.n)) + "</b></td>" +
        '<td class="cln-dim">' + E(fint(r.w)) + " / " + E(fint(r.l)) + "</td>" +
        "<td>" + (dec
          ? E(pc(r.w / dec * 100)) + ' <span class="cln-dim">on ' + E(fint(dec)) + "</span>"
          : '<span class="cln-dim">-</span>') + "</td>" +
        '<td class="cln-dim">' + E(fint(r.o.matchN)) + "</td>" +
        '<td class="cln-dim">' + E(fint(r.o.rosterN)) + "</td>" +
        "</tr>";
    }).join("");

    return h2hCtlHtml() +
      '<div class="cln-scroll"><table class="cln-table"><thead><tr>' +
      "<th></th><th>Tag</th><th>" +
      (ST.h2h === "against" ? "Matches faced" : "Matches together") +
      "</th><th>Won / lost</th><th>Rate</th><th>Their matches</th><th>Their roster</th>" +
      "</tr></thead><tbody>" + body + "</tbody></table></div>" +
      '<p class="cln-sentence">' + E(tagLabel(C)) + " has crossed <b>" +
      E(fint(rows.length)) + "</b> other " + E(plural(rows.length, "tag", "tags")) +
      " this way. <b>" + E(fint(once)) + "</b> of those met once. Top " +
      E(fint(shown.length)) + " shown.</p>";
  }

  // ------------------------------------------------ panel: how big they are
  var PRESENT_BINS = [
    { label: "1", lo: 1, hi: 1 }, { label: "2", lo: 2, hi: 2 },
    { label: "3-4", lo: 3, hi: 4 }, { label: "5-9", lo: 5, hi: 9 },
    { label: "10-19", lo: 10, hi: 19 }, { label: "20-39", lo: 20, hi: 39 },
    { label: "40+", lo: 40, hi: 1e9 }
  ];

  function sizeOutHtml(M) {
    var i, bars = [];
    if (ST.size === "roster") {
      var maxR = 1;
      for (i = 0; i < M.list.length; i++) if (M.list[i].rosterN > maxR) maxR = M.list[i].rosterN;
      for (i = 1; i <= maxR; i++) bars.push({ label: String(i), n: 0, lo: i, hi: i });
      for (i = 0; i < M.list.length; i++) {
        var r = M.list[i].rosterN;
        if (r >= 1 && r <= maxR) bars[r - 1].n++;
      }
    } else {
      for (i = 0; i < PRESENT_BINS.length; i++) {
        bars.push({ label: PRESENT_BINS[i].label, n: 0 });
      }
      for (i = 0; i < M.list.length; i++) {
        var mn = M.list[i].matchN;
        for (var b = 0; b < PRESENT_BINS.length; b++) {
          if (mn >= PRESENT_BINS[b].lo && mn <= PRESENT_BINS[b].hi) { bars[b].n++; break; }
        }
      }
    }

    var W = 1000, H = 250, L = 46, R = 14, TOP = 14, BOT = 34;
    var pw = W - L - R, ph = H - TOP - BOT;
    var cmax = 1;
    for (i = 0; i < bars.length; i++) if (bars[i].n > cmax) cmax = bars[i].n;
    var pitch = pw / bars.length, bw = Math.max(4, pitch - 6);

    var out = svgOpen(W, H);
    out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
      '" fill="rgba(127,137,179,.05)"/>';
    for (i = 0; i <= 4; i++) {
      var gy = TOP + ph - (i / 4) * ph;
      out += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' +
        gy.toFixed(1) + '" stroke="rgba(127,137,179,.16)" stroke-width="1"/>' +
        axisText(L - 6, gy + 4, fint(cmax * i / 4), "end");
    }
    for (i = 0; i < bars.length; i++) {
      var h = bars[i].n / cmax * ph;
      var x = L + i * pitch + (pitch - bw) / 2;
      out += '<rect x="' + x.toFixed(1) + '" y="' + (TOP + ph - h).toFixed(1) + '" width="' +
        bw.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="2" fill="' + GOLD +
        '" opacity="0.9"><title>' + E(fint(bars[i].n) + " " +
          plural(bars[i].n, "tag", "tags")) + "</title></rect>";
      out += axisText(x + bw / 2, H - 14, bars[i].label, "middle");
    }
    out += axisText(W - R, H - 14,
      ST.size === "roster" ? "members on the roster" : "matches present", "end");
    out += "</svg>";

    // the ten most present tags, with the roster beside the appearance count
    var top = M.list.slice(0, 10);
    var body = top.map(function (C, idx) {
      return '<tr' + (C.idx === ST.clan ? ' class="cln-me"' : "") + ">" +
        '<td class="cln-rank">' + (idx + 1) + "</td>" +
        "<td>" + E(tagLabel(C)) + "</td>" +
        '<td class="cln-valcell"><span class="cln-bar" style="width:' +
          (C.rows / (M.list[0].rows || 1) * 100).toFixed(1) + '%"></span><b>' +
          E(fint(C.rows)) + "</b></td>" +
        '<td class="cln-dim">' + E(fint(C.rosterN)) + "</td>" +
        '<td class="cln-dim">' + E(fint(C.matchN)) + "</td>" +
        '<td class="cln-dim">' + E(fint(C.sides)) + "</td>" +
        "</tr>";
    }).join("");

    return '<div class="cln-ctl">' +
        '<span class="cln-k">Count tags by</span>' +
        '<div class="cln-seg" id="cln-size">' +
          '<button type="button" data-size="roster"' + (ST.size === "roster" ? ' class="cln-on"' : "") +
            ">roster size</button>" +
          '<button type="button" data-size="present"' + (ST.size === "present" ? ' class="cln-on"' : "") +
            ">matches present</button>" +
        "</div></div>" +
      out +
      '<p class="cln-sentence"><b>' + E(fint(M.soloClans)) + "</b> of the <b>" +
      E(fint(M.list.length)) + "</b> tags belong to one person. The median tag has <b>" +
      E(fint(M.medRoster)) + "</b> " + E(plural(M.medRoster, "member", "members")) +
      " and shows up in <b>" + E(fint(M.medMatches)) + "</b> matches.</p>" +
      '<p class="cln-note" style="margin-top:12px">The ten tags in most matches. ' +
      "Ranked by how often they appear here.</p>" +
      '<div class="cln-scroll"><table class="cln-table"><thead><tr>' +
      "<th></th><th>Tag</th><th>Tagged appearances</th><th>Roster</th>" +
      "<th>Matches</th><th>Clan-sides</th></tr></thead><tbody>" + body +
      "</tbody></table></div>";
  }

  // --------------------------------------------- panel: a tag, or a team
  function togetherOutHtml(M) {
    var kept = above(M);
    if (!kept.length) {
      return '<p class="cln-note">Not enough games for this one.</p>';
    }
    kept = kept.slice().sort(function (a, b) {
      return (b.togetherPct - a.togetherPct) || (b.sides - a.sides);
    });
    var shown = kept.slice(0, 30);

    var W = 1000, ROWH = 21, GAP = 5, L = 200, R = 250;
    var H = shown.length * (ROWH + GAP) + 24;
    var pw = W - L - R;
    var out = svgOpen(W, H), i;
    for (i = 0; i <= 4; i++) {
      var gx = L + pw * i / 4;
      out += '<line x1="' + gx.toFixed(1) + '" y1="0" x2="' + gx.toFixed(1) + '" y2="' +
        (H - 24) + '" stroke="rgba(127,137,179,.13)" stroke-width="1"/>' +
        axisText(gx, H - 7, (i * 25) + "%", i === 0 ? "start" : "middle");
    }
    for (i = 0; i < shown.length; i++) {
      var C = shown[i];
      var y = i * (ROWH + GAP);
      var w = clamp(C.togetherPct / 100, 0, 1) * pw;
      var me = C.idx === ST.clan;
      out += '<text x="' + (L - 10) + '" y="' + (y + ROWH / 2 + 4) + '" fill="' +
        (me ? GOLD_TEXT : "#d6dcf5") + '" font-size="12" text-anchor="end">' +
        E(tagLabel(C)) + "</text>";
      out += '<rect x="' + L + '" y="' + (y + 1) + '" width="' + Math.max(1.5, w).toFixed(1) +
        '" height="' + (ROWH - 2) + '" rx="3" fill="' + (me ? GOLD_HI : GOLD) +
        '" opacity="' + (me ? "1" : "0.82") + '"><title>' +
        E(tagLabel(C) + ": " + fint(C.together) + " of " + fint(C.sides) +
          " clan-sides had two or more members") + "</title></rect>";
      out += '<text x="' + (W - 6) + '" y="' + (y + ROWH / 2 + 4) +
        '" fill="#7f89b3" font-size="12" text-anchor="end">' +
        E(pc(C.togetherPct) + " - " + fint(C.together) + " of " + fint(C.sides) +
          " sides, " + fint(C.rosterN) + " on the roster") + "</text>";
    }
    out += "</svg>";

    var flat = 0;
    for (i = 0; i < kept.length; i++) if (!kept[i].together) flat++;

    return '<div class="cln-key">' +
        "<span>how often two of them end up on the same team</span>" +
      "</div>" + out +
      '<div class="cln-panelread">' +
        '<div><div class="cln-rk">Clan-sides in the archive</div><div class="cln-rv">' +
          E(fint(M.totalSides)) + "</div></div>" +
        '<div><div class="cln-rk">With two or more together</div><div class="cln-rv">' +
          E(fint(M.totalTogether)) + "</div></div>" +
        '<div><div class="cln-rk">That share</div><div class="cln-rv">' +
          E(pc(M.totalSides ? M.totalTogether / M.totalSides * 100 : 0)) + "</div></div>" +
        '<div><div class="cln-rk">Tags never seen together</div><div class="cln-rv">' +
          E(fint(M.neverTogether)) + "</div></div>" +
      "</div>" +
      '<p class="cln-sentence">Above the floor, <b>' + E(fint(flat)) + "</b> of <b>" +
      E(fint(kept.length)) + "</b> tags never put two members on one team. " +
      "In those, the tag travels alone. Showing the top <b>" + E(fint(shown.length)) +
      "</b>.</p>";
  }

  // ------------------------------- panel: win rate, and what it rests on
  var COLS = [
    { key: "sides", label: "Clan-sides", get: function (c) { return c.sides; }, fmt: fint },
    { key: "wins", label: "Won", get: function (c) { return c.wins; }, fmt: fint },
    { key: "winrate", label: "Win rate", get: function (c) { return c.winrate; }, fmt: pc },
    { key: "together", label: "Together", get: function (c) { return c.togetherPct; }, fmt: pc },
    { key: "dmg", label: "Avg damage", get: function (c) { return c.avgDmg; }, fmt: fint },
    { key: "kills", label: "Avg kills", get: function (c) { return c.avgKills; }, fmt: f1 },
    { key: "roster", label: "Roster", get: function (c) { return c.rosterN; }, fmt: fint }
  ];
  function colDef(key) {
    for (var i = 0; i < COLS.length; i++) if (COLS[i].key === key) return COLS[i];
    return COLS[0];
  }

  function tableOutHtml(M) {
    var kept = above(M);
    if (!kept.length) {
      return '<p class="cln-note">Not enough games for this one.</p>';
    }
    var cd = colDef(ST.sortKey);
    kept = kept.slice().sort(function (a, b) {
      var av = cd.get(a), bv = cd.get(b);
      if (av === null || av === undefined) av = -Infinity;
      if (bv === null || bv === undefined) bv = -Infinity;
      return (av - bv) * ST.sortDir || (b.sides - a.sides);
    });
    var shown = kept.slice(0, 30), i;
    var top = 0;
    for (i = 0; i < shown.length; i++) {
      var v = cd.get(shown[i]);
      if (v !== null && v !== undefined && v > top) top = v;
    }

    var head = "<th></th><th>Tag</th>";
    for (i = 0; i < COLS.length; i++) {
      head += '<th class="cln-sortable' + (COLS[i].key === ST.sortKey ? " cln-sorted" : "") +
        '" data-sort="' + COLS[i].key + '">' + E(COLS[i].label) +
        (COLS[i].key === ST.sortKey ? (ST.sortDir < 0 ? " &darr;" : " &uarr;") : "") + "</th>";
    }

    var body = shown.map(function (C, idx) {
      var v = cd.get(C);
      var cells = "";
      for (var c = 0; c < COLS.length; c++) {
        var cv = COLS[c].get(C);
        var txt = (cv === null || cv === undefined) ? "-" : COLS[c].fmt(cv);
        if (COLS[c].key === ST.sortKey) {
          cells += '<td class="cln-valcell"><span class="cln-bar" style="width:' +
            (top > 0 && v !== null && v !== undefined ? clamp(v / top, 0, 1) * 100 : 0).toFixed(1) +
            '%"></span><b>' + E(txt) + "</b></td>";
        } else {
          cells += '<td class="cln-dim">' + E(txt) + "</td>";
        }
      }
      return '<tr' + (C.idx === ST.clan ? ' class="cln-me"' : "") + ">" +
        '<td class="cln-rank">' + (idx + 1) + "</td>" +
        "<td>" + E(tagLabel(C)) +
        (C.decided < 10 ? '<span class="cln-thin" title="fewer than ten decided sides">thin</span>' : "") +
        "</td>" + cells + "</tr>";
    }).join("");

    var thin = 0, split = 0;
    for (i = 0; i < shown.length; i++) {
      if (shown[i].decided < 10) thin++;
      if (shown[i].split) split++;
    }

    return '<p class="cln-note" style="margin:0 0 10px">Sorted by ' +
      E(cd.label.toLowerCase()) + ", " + (ST.sortDir < 0 ? "highest first" : "lowest first") +
      ". " + E(fint(kept.length)) + " " + E(plural(kept.length, "tag", "tags")) +
      " clear the floor; top " + E(fint(shown.length)) + " shown.</p>" +
      '<div class="cln-scroll"><table class="cln-table"><thead><tr>' + head +
      "</tr></thead><tbody>" + body + "</tbody></table></div>" +
      '<p class="cln-sentence">Of the <b>' + E(fint(shown.length)) + "</b> listed, <b>" +
      E(fint(thin)) + "</b> rest on fewer than ten decided sides. <b>" + E(fint(split)) +
      "</b> have been on both sides of one match, which scores a win and a loss.</p>";
  }

  // ------------------------------------------- panel: one player's shadow

  // ------------------------------------------------------------------ suite
  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "clans",
    title: "Clans",
    blurb: "Every tag in the archive, its roster and who it plays.",
    accent: GOLD,
    css: CSS,
    gated: true,

    // The most present tags as columns, each split into the clan-sides where
    // two or more members played together and the ones where a single member
    // wore the tag alone. Real counts, and the page's main finding.
    preview: function (T) {
      TT = T;
      var M;
      try { M = model(T); } catch (e) { return ""; }
      if (!M.list.length || M.totalSides < 40) return "";

      var n = Math.min(24, M.list.length);
      var top = M.list.slice(0, n).sort(function (a, b) { return b.sides - a.sides; });
      var max = 1, i;
      for (i = 0; i < top.length; i++) if (top[i].sides > max) max = top[i].sides;

      var pad = 12, base = 152, height = 122;
      var pitch = (240 - pad * 2) / top.length;
      var bw = Math.max(2, pitch - 2.2);

      var out = '<svg viewBox="0 0 240 240">';
      out += '<rect x="0" y="0" width="240" height="240" fill="#0d1226"/>';
      for (i = 0; i < top.length; i++) {
        var C = top[i];
        var h = C.sides / max * height;
        var th = C.sides ? (C.together / C.sides) * h : 0;
        var x = pad + i * pitch;
        // alone on top, together at the bottom, both from the same baseline
        out += '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' +
          bw.toFixed(1) + '" height="' + Math.max(0.8, h - th).toFixed(1) +
          '" fill="' + COOL + '"/>';
        out += '<rect x="' + x.toFixed(1) + '" y="' + (base - th).toFixed(1) + '" width="' +
          bw.toFixed(1) + '" height="' + Math.max(0.8, th).toFixed(1) +
          '" fill="' + GOLD + '"/>';
      }
      out += '<rect x="' + pad + '" y="' + (base + 2) + '" width="' + (240 - pad * 2) +
        '" height="1.6" fill="#4a5588"/>';
      out += "</svg>";
      return out;
    },

    render: function (T) {
      TT = T;
      var M = model(T);
      if (!M.list.length) {
        return T.bigPanel("Clans", '<p class="small">No clan tags in the archive yet.</p>', "");
      }
      if (ST.minSides > M.maxSides) ST.minSides = M.maxSides;

      var html = '<div class="cln-topbar">' +
        pickerHtml(M) +
        '<div class="cln-headline" id="cln-headline">' + headlineHtml(M) + "</div>" +
      "</div>";

      html += T.bigPanel("The tag you picked",
        '<div id="cln-profile">' + profileHtml(M) + "</div>",
        "Career numbers per member. Tagged appearances count only games played wearing this tag.");

      html += T.bigPanel("What they bring",
        '<div id="cln-mix">' + mixOutHtml(M) + "</div>",
        "Share of this tag's games minus the archive share. Few games swing it hard.");

      html += T.bigPanel("Who they meet",
        '<div id="cln-h2h-out">' + h2hOutHtml(M) + "</div>",
        "Both tags must be worn in the same match. Most pairs meet once.");

      html += T.bigPanel("How big the tags really are",
        '<div id="cln-size-out">' + sizeOutHtml(M) + "</div>",
        "Roster is people. The site's clan_sizes counts appearances, which is a different number.");

      html += T.bigPanel("A tag, or a team",
        '<div id="cln-together">' + togetherOutHtml(M) + "</div>",
        "A clan-side is one tag, on one team, in one match.");

      html += T.bigPanel("Win rate, and what it rests on",
        '<div id="cln-table">' + tableOutHtml(M) + "</div>",
        "A tag on both sides scores one win and one loss. Undecided matches are dropped.");

      return html;
    },

    wire: function (T, root) {
      TT = T;
      var M = model(T);

      function el(id) { return root.querySelector("#" + id); }
      function setHtml(id, html) { var e = el(id); if (e) e.innerHTML = html; }

      function redrawClan() {
        setHtml("cln-profile", profileHtml(M));
        setHtml("cln-mix", mixOutHtml(M));
        setHtml("cln-h2h-out", h2hOutHtml(M));
        setHtml("cln-size-out", sizeOutHtml(M));
        setHtml("cln-together", togetherOutHtml(M));
        setHtml("cln-table", tableOutHtml(M));
      }
      function redrawFloor() {
        setHtml("cln-together", togetherOutHtml(M));
        setHtml("cln-table", tableOutHtml(M));
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
        if (b) {
          var d = b.getAttribute("data-dim");
          if (d) {
            if (d === ST.dim) return;
            ST.dim = d;
            setHtml("cln-mix", mixOutHtml(M));
            return;
          }
          var pm = b.getAttribute("data-pmode");
          if (pm) {
            if (pm === ST.pmode) return;
            ST.pmode = pm;
                return;
          }
          var hh = b.getAttribute("data-h2h");
          if (hh) {
            if (hh === ST.h2h) return;
            ST.h2h = hh;
            setHtml("cln-h2h-out", h2hOutHtml(M));
            return;
          }
          var sz = b.getAttribute("data-size");
          if (sz) {
            if (sz === ST.size) return;
            ST.size = sz;
            setHtml("cln-size-out", sizeOutHtml(M));
            return;
          }
          return;
        }
        var th = upTo(e.target, "th");
        if (th) {
          var sk = th.getAttribute("data-sort");
          if (!sk) return;
          if (sk === ST.sortKey) ST.sortDir = -ST.sortDir;
          else { ST.sortKey = sk; ST.sortDir = -1; }
          setHtml("cln-table", tableOutHtml(M));
        }
      });

      root.addEventListener("change", function (e) {
        var t = e.target;
        if (!t || t.id !== "cln-pick") return;
        var v = parseInt(t.value, 10);
        if (!isFinite(v)) return;
        ST.clan = clamp(v, 0, M.list.length - 1);
        redrawClan();
      });
    }
  });
})();

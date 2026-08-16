/* TYR suite: "Ladder" -- the shape of the playerbase.
 *
 * Records owns the single game extremes. This page owns the population: who
 * is in the archive, how many games they have, what a rating is worth at that
 * many games, and how the clans compare.
 *
 * The first thing this page has to say is that the archive is not a sample of
 * the playerbase. It is four people's match history. 71 of the 308 matches
 * carry an explicit uploader; the other 237 do not, and exactly one player is
 * present in every single one of them. So every panel here is a statement
 * about the games that got uploaded, and the panels that would be misread
 * otherwise say so on the panel rather than in a footnote.
 *
 * Sources, and what each one actually is:
 *   T.DATA.players[]     one career row per player: games, wins, winrate,
 *                        avg{dmg,kills,assist,blocked}, rating,
 *                        rating_history[{match_id,t,rating}], provisional
 *                        (which is set for anyone with two games or fewer),
 *                        short_id (the id the site routes player pages by).
 *   T.DATA.matches[]     used only for uploaded_by_ids / uploaded_by and the
 *   T.DATA.clans[]       tag, games, players, winrate, avg{...}, members[].
 *                        games is the sum of its members' games, not games
 *                        the members played together.
 *   T.STATS              squad_winrate and ping_histogram, both aggregates
 *                        the build script writes over player-games.
 *
 * Every name on this page goes through who(), which prints "Player 1442"
 * instead of a label when T.SHOW_PLAYER_PAGES is false. The suite is also
 * marked gated, so in that mode it is hidden from the hub entirely.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var VIO = "#a06bff";       // the suite accent
  var VIO_HI = "#c9a6ff";    // bright violet, for marks that must survive dimming
  var VIO_TXT = "#e3d5ff";   // numerals
  var TEAL = "#58d8c0";
  var AMBER = "#ffc857";
  var ROSE = "#ff7a8a";
  var COOL = "#42588d";
  var GREY = "#242c52";
  var UP_COLORS = [VIO_HI, TEAL, AMBER, ROSE, "#6ea8fe", "#8ce99a", "#d0a6ff"];

  var CSS = "" +
    ".lad-topbar{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 16px;padding:12px 14px;background:linear-gradient(180deg,rgba(160,107,255,.13),rgba(160,107,255,0));border:1px solid var(--border);border-left:3px solid " + VIO + ";border-radius:10px}" +
    ".lad-k{font-size:.64rem;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}" +
    ".lad-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-wrap:wrap}" +
    ".lad-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.78rem;padding:6px 12px;cursor:pointer}" +
    ".lad-seg button+button{border-left:1px solid var(--border)}" +
    ".lad-seg button:hover{color:var(--text)}" +
    ".lad-seg button.lad-on{background:rgba(160,107,255,.22);color:" + VIO_TXT + "}" +
    ".lad-headline{margin-left:auto;text-align:right;font-size:.76rem;color:var(--dim);line-height:1.5;max-width:38rem}" +
    ".lad-headline b{color:" + VIO_TXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".lad-floorread{font-size:.78rem;color:var(--dim);line-height:1.5}" +
    ".lad-floorread b{color:" + VIO_TXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".lad-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:0 0 12px}" +
    ".lad-note{font-size:.76rem;color:var(--dim)}" +
    ".lad-scroll{overflow-x:auto}" +
    ".lad-read{display:flex;flex-wrap:wrap;gap:10px 30px;margin:14px 0 2px;padding-top:12px;border-top:1px solid var(--border)}" +
    ".lad-rk{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin-bottom:3px}" +
    ".lad-rv{font-size:1.22rem;font-weight:700;color:" + VIO_TXT + ";font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".lad-rv small{font-size:.64rem;font-weight:400;color:var(--dim);font-family:inherit;margin-left:5px}" +
    ".lad-sentence{margin:12px 0 0;font-size:.9rem;line-height:1.7;color:var(--text)}" +
    ".lad-sentence b{color:" + VIO_TXT + ";font-variant-numeric:tabular-nums}" +
    ".lad-key{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.72rem;color:var(--dim);margin:0 0 9px}" +
    ".lad-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}" +
    ".lad-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(206px,1fr));gap:10px;margin-top:14px}" +
    ".lad-card{background:var(--panel2);border:1px solid var(--border);border-top:2px solid var(--cc,rgba(160,107,255,.6));border-radius:10px;padding:11px 13px}" +
    ".lad-cl{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);display:flex;align-items:center;gap:6px}" +
    ".lad-cl i{display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--cc,#fff)}" +
    ".lad-cv{font-size:1.4rem;font-weight:700;color:" + VIO_TXT + ";font-variant-numeric:tabular-nums;margin:5px 0 3px;font-family:ui-monospace,Consolas,Menlo,monospace;line-height:1.1}" +
    ".lad-cs{font-size:.74rem;color:var(--dim);line-height:1.55}" +
    ".lad-cs a{color:" + VIO + "}" +
    ".lad-table{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums}" +
    ".lad-table th{text-align:left;font-size:.62rem;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);font-weight:600;padding:0 8px 7px;border-bottom:1px solid var(--border);white-space:nowrap}" +
    ".lad-table th.lad-sortable{cursor:pointer}" +
    ".lad-table th.lad-sortable:hover{color:var(--text)}" +
    ".lad-table th.lad-sorted{color:" + VIO_TXT + "}" +
    ".lad-table td{padding:7px 8px;border-bottom:1px solid rgba(127,137,179,.16);white-space:nowrap}" +
    ".lad-table tr:hover td{background:rgba(160,107,255,.06)}" +
    ".lad-table a{color:inherit}" +
    ".lad-rank{width:26px;color:var(--dim);font-size:.74rem;text-align:right}" +
    ".lad-dim{color:var(--dim)}" +
    ".lad-prov{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;font-size:.64rem;color:#0d1226;background:" + AMBER + "}" +
    ".lad-valcell{position:relative;min-width:132px}" +
    ".lad-bar{position:absolute;left:0;top:4px;bottom:4px;background:linear-gradient(90deg,rgba(160,107,255,.5),rgba(160,107,255,.08));border-radius:3px}" +
    ".lad-valcell b{position:relative;color:" + VIO_TXT + ";padding-left:7px;font-family:ui-monospace,Consolas,Menlo,monospace}" +
    ".lad-range{width:320px;max-width:52vw;accent-color:" + VIO + ";vertical-align:middle}" +
    ".lad-select{background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:.86rem;padding:6px 10px;max-width:min(24rem,70vw)}" +
    ".lad-select:focus{outline:0;border-color:" + VIO + "}" +
    ".lad-warnbox{margin:0 0 12px;padding:10px 12px;border:1px solid rgba(255,200,87,.34);border-left:3px solid " + AMBER + ";border-radius:8px;background:rgba(255,200,87,.06);font-size:.82rem;line-height:1.6;color:var(--text)}" +
    ".lad-warnbox b{color:" + AMBER + ";font-variant-numeric:tabular-nums}";

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
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }
  function plural(n, one, many) { return n === 1 ? one : many; }

  var TT = null;   // the T handed in by the router

  // Every name on the page comes through here. With player pages off the
  // suite is hidden anyway, but this is the belt to that pair of braces.
  function who(label, sid) {
    if (!TT || TT.SHOW_PLAYER_PAGES === false || !label) {
      return '<span class="lad-dim">Player ' +
        E(sid === null || sid === undefined ? "?" : sid) + "</span>";
    }
    if (sid === null || sid === undefined) return E(label);
    return '<a href="#/player/' + encodeURIComponent(sid) + '">' + E(label) + "</a>";
  }
  function whoPlain(label, sid) {
    if (!TT || TT.SHOW_PLAYER_PAGES === false || !label) {
      return "Player " + (sid === null || sid === undefined ? "?" : sid);
    }
    return label;
  }
  function matchLink(mid, text) {
    if (!mid) return E(text);
    return '<a href="#/match/' + encodeURIComponent(mid) + '">' + E(text) + "</a>";
  }
  function dateOf(unix) {
    if (TT && TT.fmtDateTime && unix) return TT.fmtDateTime(unix);
    return "-";
  }

  // ---------------------------------------------------------------- maths
  function sortedCopy(list) {
    var a = list.slice();
    a.sort(function (x, y) { return x - y; });
    return a;
  }
  function pctl(asc, q) {
    if (!asc.length) return null;
    var i = clamp(Math.round((asc.length - 1) * q), 0, asc.length - 1);
    return asc[i];
  }
  function mean(list) {
    if (!list.length) return null;
    var s = 0;
    for (var i = 0; i < list.length; i++) s += list[i];
    return s / list.length;
  }
  function sd(list) {
    if (list.length < 2) return null;
    var m = mean(list), s = 0;
    for (var i = 0; i < list.length; i++) s += (list[i] - m) * (list[i] - m);
    return Math.sqrt(s / list.length);
  }

  // ------------------------------------------------------------------ model
  var _M = null;
  function model(T) {
    if (_M) return _M;
    var D = (T && T.DATA) || {};
    var S = (T && T.STATS) || {};
    var i, p;

    var players = [];
    var src = D.players || [];
    for (i = 0; i < src.length; i++) {
      p = src[i];
      if (!p || !p.id) continue;
      players.push({
        id: p.id,
        sid: (p.short_id === undefined ? null : p.short_id),
        label: p.label || null,
        clan: p.clan || null,
        games: num(p.games, 0),
        wins: num(p.wins, 0),
        losses: num(p.losses, 0),
        winrate: num(p.winrate, null),
        rating: num(p.rating, null),
        prov: !!p.provisional,
        dmg: num(p.avg && p.avg.dmg, null),
        kills: num(p.avg && p.avg.kills, null),
        assist: num(p.avg && p.avg.assist, null),
        blocked: num(p.avg && p.avg.blocked, null),
        survPct: num(p.avg_survival_pct, null),
        hist: (p.rating_history && p.rating_history.length) ? p.rating_history : []
      });
    }

    var matches = [];
    var msrc = D.matches || [];
    for (i = 0; i < msrc.length; i++) {
      if (msrc[i] && msrc[i].match_id) matches.push(msrc[i]);
    }

    var byGames = players.slice().sort(function (a, b) {
      return (b.games - a.games) || ((b.rating || 0) - (a.rating || 0));
    });
    var totalPG = 0;
    for (i = 0; i < players.length; i++) totalPG += players[i].games;

    // Cumulative share of player-games, players ordered most present first.
    var cumShare = [], run = 0;
    for (i = 0; i < byGames.length; i++) {
      run += byGames[i].games;
      cumShare.push(totalPG ? run / totalPG : 0);
    }

    // games -> how many players have exactly that many
    var gcount = {}, maxGames = 0;
    for (i = 0; i < players.length; i++) {
      var g = players[i].games;
      gcount[g] = (gcount[g] || 0) + 1;
      if (g > maxGames) maxGames = g;
    }

    var ratingMax = 0;
    for (i = 0; i < players.length; i++) {
      if (players[i].rating !== null && players[i].rating > ratingMax) ratingMax = players[i].rating;
    }
    if (ratingMax <= 0) ratingMax = 100;
    ratingMax = Math.ceil(ratingMax / 25) * 25;

    var clans = [];
    var csrc = D.clans || [];
    for (i = 0; i < csrc.length; i++) {
      var c = csrc[i];
      if (!c || !c.tag) continue;
      clans.push({
        tag: c.tag,
        games: num(c.games, 0),
        players: num(c.players, (c.members || []).length),
        winrate: num(c.winrate, null),
        dmg: num(c.avg && c.avg.dmg, null),
        kills: num(c.avg && c.avg.kills, null),
        assist: num(c.avg && c.avg.assist, null),
        blocked: num(c.avg && c.avg.blocked, null)
      });
    }
    var clanMaxGames = 0;
    for (i = 0; i < clans.length; i++) if (clans[i].games > clanMaxGames) clanMaxGames = clans[i].games;
    var clanned = 0;
    for (i = 0; i < players.length; i++) if (players[i].clan) clanned++;

    var traj = [];
    for (i = 0; i < players.length; i++) {
      if (players[i].hist.length >= 8) traj.push(players[i]);
    }
    traj.sort(function (a, b) { return b.hist.length - a.hist.length; });

    _M = {
      players: players, byGames: byGames, matches: matches,
      totalPG: totalPG, cumShare: cumShare, gcount: gcount, maxGames: maxGames,
      ratingMax: ratingMax, clans: clans, clanMaxGames: clanMaxGames,
      clanned: clanned, traj: traj,
      upl: uploaders(matches, players),
      bins: ratingBins(players),
      squad: S.squad_winrate || [],
      ping: S.ping_histogram || [],
      pingMedian: num(S.ping_median, null)
    };
    return _M;
  }

  // Who the archive belongs to.
  //
  // A match may carry uploaded_by_ids. Where it does, that is the answer. The
  // older matches do not carry it, so the only honest thing left is to ask
  // which players appear in every one of them: if exactly one does, that is
  // almost certainly the person whose client recorded them, and the panel
  // labels those matches as inferred rather than recorded. If more than one
  // player survives the intersection, nothing is claimed and they go into an
  // unattributed bucket.
  function uploaders(matches, players) {
    var byId = {}, i, j;
    for (i = 0; i < players.length; i++) byId[players[i].id] = players[i];

    var groups = {}, order = [], unattr = [];
    function group(id, label) {
      if (!groups[id]) {
        var pl = byId[id];
        groups[id] = {
          id: id,
          label: pl ? pl.label : (label || null),
          sid: pl ? pl.sid : null,
          games: pl ? pl.games : null,
          n: 0, recorded: 0, inferred: 0, mids: {}
        };
        order.push(id);
      }
      return groups[id];
    }

    for (i = 0; i < matches.length; i++) {
      var m = matches[i];
      var ids = m.uploaded_by_ids || [];
      var names = m.uploaded_by || [];
      if (ids.length) {
        var gg = group(ids[0], names[0]);
        gg.n++; gg.recorded++; gg.mids[m.match_id] = 1;
      } else {
        unattr.push(m);
      }
    }

    var common = null;
    for (i = 0; i < unattr.length; i++) {
      var set = {}, ps = unattr[i].players || [];
      for (j = 0; j < ps.length; j++) set[ps[j].id] = 1;
      if (common === null) { common = set; continue; }
      var next = {};
      for (var k in common) if (common.hasOwnProperty(k) && set[k]) next[k] = 1;
      common = next;
    }
    var commonIds = [];
    if (common) for (var k2 in common) if (common.hasOwnProperty(k2)) commonIds.push(k2);

    var ambiguous = false;
    if (unattr.length) {
      if (commonIds.length === 1) {
        var g2 = group(commonIds[0], null);
        for (i = 0; i < unattr.length; i++) {
          g2.n++; g2.inferred++; g2.mids[unattr[i].match_id] = 1;
        }
      } else {
        ambiguous = true;
        groups.__unknown = {
          id: null, label: null, sid: null, games: null, unknown: true,
          n: 0, recorded: 0, inferred: 0, mids: {}
        };
        order.push("__unknown");
        for (i = 0; i < unattr.length; i++) {
          groups.__unknown.n++;
          groups.__unknown.inferred++;
          groups.__unknown.mids[unattr[i].match_id] = 1;
        }
      }
    }

    var list = [];
    for (i = 0; i < order.length; i++) list.push(groups[order[i]]);
    list.sort(function (a, b) { return b.n - a.n; });

    var midTo = {};
    for (i = 0; i < list.length; i++) {
      list[i].color = UP_COLORS[i % UP_COLORS.length];
      for (var mid in list[i].mids) {
        if (list[i].mids.hasOwnProperty(mid)) midTo[mid] = i;
      }
    }

    var recorded = 0;
    for (i = 0; i < list.length; i++) recorded += list[i].recorded;

    return {
      list: list, midTo: midTo, unattrN: unattr.length,
      recordedN: recorded, ambiguous: ambiguous, total: matches.length
    };
  }

  // Rating spread by how many games the player has. The whole point of the
  // page is in this table: at one game the spread is the prior plus one
  // result, and it narrows every time somebody plays again.
  var BIN_DEFS = [
    { label: "1 game", lo: 1, hi: 1 },
    { label: "2 games", lo: 2, hi: 2 },
    { label: "3 to 4", lo: 3, hi: 4 },
    { label: "5 to 9", lo: 5, hi: 9 },
    { label: "10 or more", lo: 10, hi: 1e9 }
  ];
  function ratingBins(players) {
    var out = [], i, b;
    for (b = 0; b < BIN_DEFS.length; b++) {
      var d = BIN_DEFS[b], vals = [];
      for (i = 0; i < players.length; i++) {
        var p = players[i];
        if (p.rating === null) continue;
        if (p.games < d.lo || p.games > d.hi) continue;
        vals.push(p.rating);
      }
      var asc = sortedCopy(vals);
      out.push({
        label: d.label, lo: d.lo, hi: d.hi, n: asc.length,
        p10: pctl(asc, 0.1), p25: pctl(asc, 0.25), p50: pctl(asc, 0.5),
        p75: pctl(asc, 0.75), p90: pctl(asc, 0.9),
        sd: sd(vals), mean: mean(vals)
      });
    }
    return out;
  }

  // --------------------------------------------------------------- SVG bits
  function svgOpen(w, h) {
    return '<svg class="chart-svg" width="100%" viewBox="0 0 ' + w + " " + h +
      '" preserveAspectRatio="xMidYMid meet">';
  }
  function axisText(x, y, txt, anchor) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
      '" fill="#7f89b3" font-size="12" text-anchor="' + (anchor || "middle") + '">' +
      E(txt) + "</text>";
  }

  // ------------------------------------------------------------------ state
  var FLOORS = [1, 2, 3, 5, 10, 15];
  var ST = {
    floor: 1,
    step: 1,
    order: "time",
    scale: "count",
    clanMin: 20,
    clanMetric: "winrate",
    traj: null,
    sortKey: "rating",
    sortDir: -1,
    pop: "squad"
  };

  function above(M, floor) {
    var out = [];
    for (var i = 0; i < M.byGames.length; i++) {
      if (M.byGames[i].games >= floor) out.push(M.byGames[i]);
    }
    return out;
  }

  // ------------------------------------------------------- panel 0: the top
  function headlineHtml(M) {
    var U = M.upl;
    if (!U.list.length || !M.matches.length) return "";
    var t = U.list[0];
    var share = t.n / M.matches.length * 100;
    return "<b>" + E(fint(t.n)) + "</b> of the <b>" +
      E(fint(M.matches.length)) + "</b> uploaded matches (<b>" + E(pc(share)) +
      "</b>).";
  }

  function floorReadHtml(M) {
    var kept = above(M, ST.floor), i, pg = 0;
    for (i = 0; i < kept.length; i++) pg += kept[i].games;
    var pShare = M.players.length ? kept.length / M.players.length * 100 : 0;
    var gShare = M.totalPG ? pg / M.totalPG * 100 : 0;
    return "<b>" + E(fint(kept.length)) + "</b> of " + E(fint(M.players.length)) +
      " players (" + E(pc(pShare)) + ") clear " + E(fint(ST.floor)) + " " +
      E(plural(ST.floor, "game", "games")) + ", holding <b>" + E(pc(gShare)) +
      "</b> of the " + E(fint(M.totalPG)) + " player-games.";
  }

  function floorChipsHtml() {
    return FLOORS.map(function (n) {
      return '<button type="button" data-floor="' + n + '"' +
        (ST.floor === n ? ' class="lad-on"' : "") + ">" +
        (n === 1 ? "any" : n + "+") + "</button>";
    }).join("");
  }

  // ------------------------------------------------- panel 1: whose archive
  function orderedMids(M) {
    var mids = M.matches.slice().sort(function (a, b) {
      return (a.captured_unix || 0) - (b.captured_unix || 0);
    });
    if (ST.order === "group") {
      mids = mids.map(function (m, i) { return { m: m, i: i }; });
      mids.sort(function (a, b) {
        var ga = M.upl.midTo[a.m.match_id];
        var gb = M.upl.midTo[b.m.match_id];
        if (ga === undefined) ga = 999;
        if (gb === undefined) gb = 999;
        return (ga - gb) || (a.i - b.i);
      });
      mids = mids.map(function (x) { return x.m; });
    }
    return mids;
  }

  function coverCtlHtml(M) {
    var U = M.upl;
    var steps = U.list.map(function (g, i) {
      return '<button type="button" data-step="' + (i + 1) + '"' +
        (ST.step === i + 1 ? ' class="lad-on"' : "") + ">" + (i + 1) + "</button>";
    }).join("");
    return '<div class="lad-ctl">' +
      '<span class="lad-k">Uploaders shown</span>' +
      '<div class="lad-seg" id="lad-step">' + steps + "</div>" +
      '<span class="lad-k">Cell order</span>' +
      '<div class="lad-seg" id="lad-order">' +
        '<button type="button" data-order="time"' + (ST.order === "time" ? ' class="lad-on"' : "") +
          ">by date</button>" +
        '<button type="button" data-order="group"' + (ST.order === "group" ? ' class="lad-on"' : "") +
          ">grouped</button>" +
      "</div></div>";
  }


  // ------------------------------------------ panel 2: how many games people have
  function distOutHtml(M) {
    var TOPN = 20;
    var bars = [], i, tail = 0;
    for (i = 1; i <= TOPN; i++) bars.push({ g: i, n: M.gcount[i] || 0, label: String(i) });
    for (var k in M.gcount) {
      if (!M.gcount.hasOwnProperty(k)) continue;
      if (+k > TOPN) tail += M.gcount[k];
    }
    if (M.maxGames > TOPN) bars.push({ g: TOPN + 1, n: tail, label: (TOPN + 1) + "+", tail: true });

    var W = 1000, H = 300, L = 46, R = 12, TOP = 14, BOT = 34;
    var pw = W - L - R, ph = H - TOP - BOT;
    var cmax = 1;
    for (i = 0; i < bars.length; i++) if (bars[i].n > cmax) cmax = bars[i].n;
    var pitch = pw / bars.length;
    var bw = Math.max(3, pitch - 5);

    function hOf(v) {
      if (v <= 0) return 0;
      var f = ST.scale === "sqrt" ? Math.sqrt(v / cmax) : (v / cmax);
      return Math.max(1.4, f * ph);
    }

    var out = svgOpen(W, H);
    out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
      '" fill="rgba(127,137,179,.05)"/>';
    var ticks = ST.scale === "sqrt" ? [0, 0.0625, 0.25, 0.5625, 1] : [0, 0.25, 0.5, 0.75, 1];
    for (i = 0; i < ticks.length; i++) {
      var tv = ticks[i] * cmax;
      var ty = TOP + ph - hOf(tv);
      if (tv === 0) ty = TOP + ph;
      out += '<line x1="' + L + '" y1="' + ty.toFixed(1) + '" x2="' + (W - R) + '" y2="' +
        ty.toFixed(1) + '" stroke="rgba(127,137,179,.18)" stroke-width="1"/>' +
        axisText(L - 6, ty + 4, fint(tv), "end");
    }
    for (i = 0; i < bars.length; i++) {
      var b = bars[i];
      var h = hOf(b.n);
      var x = L + i * pitch + (pitch - bw) / 2;
      var inFloor = b.tail ? (TOPN + 1 >= ST.floor) : (b.g >= ST.floor);
      out += '<rect x="' + x.toFixed(1) + '" y="' + (TOP + ph - h).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' +
        (inFloor ? VIO_HI : COOL) + '" opacity="' + (inFloor ? "0.92" : "0.6") +
        '"><title>' + E(fint(b.n) + " " + plural(b.n, "player", "players") + " with " +
          (b.tail ? (TOPN + 1) + " or more games" : b.g + " " + plural(b.g, "game", "games"))) +
        "</title></rect>";
      if (i % 2 === 0 || b.tail) out += axisText(x + bw / 2, H - 14, b.label, "middle");
    }
    // the floor itself
    var fi = clamp(ST.floor, 1, bars.length) - 1;
    var fx = L + fi * pitch + (pitch - bw) / 2 - 2.5;
    out += '<line x1="' + fx.toFixed(1) + '" y1="' + (TOP - 4) + '" x2="' + fx.toFixed(1) +
      '" y2="' + (TOP + ph + 4) + '" stroke="' + AMBER + '" stroke-width="1.6"/>';
    out += axisText(W - R, H - 14, "games played", "end");
    out += "</svg>";

    // concentration: cumulative share of player-games by player rank
    var CW = 1000, CH = 230, CL = 46, CR = 12, CT = 14, CB = 32;
    var cpw = CW - CL - CR, cph = CH - CT - CB;
    var np = M.cumShare.length;
    var curve = "", step = Math.max(1, Math.floor(np / 600));
    for (i = 0; i < np; i += step) {
      var cx = CL + (i / (np - 1 || 1)) * cpw;
      var cy = CT + cph - M.cumShare[i] * cph;
      curve += (curve ? "L" : "M") + cx.toFixed(1) + " " + cy.toFixed(1);
    }
    if (np) {
      curve += "L" + (CL + cpw).toFixed(1) + " " + (CT).toFixed(1);
    }
    var conc = svgOpen(CW, CH);
    conc += '<rect x="' + CL + '" y="' + CT + '" width="' + cpw + '" height="' + cph +
      '" fill="rgba(127,137,179,.05)"/>';
    conc += '<line x1="' + CL + '" y1="' + (CT + cph) + '" x2="' + (CL + cpw) + '" y2="' + CT +
      '" stroke="' + COOL + '" stroke-width="1.4" stroke-dasharray="5 4"/>';
    conc += '<path d="' + curve + '" fill="none" stroke="' + VIO_HI + '" stroke-width="2.4"/>';
    for (i = 0; i <= 4; i++) {
      var gy = CT + cph - (i / 4) * cph;
      conc += axisText(CL - 6, gy + 4, (i * 25) + "%", "end");
    }
    conc += axisText(CL, CH - 10, "busiest account", "start");
    conc += axisText(CL + cpw, CH - 10, "all " + fint(np) + " players", "end");
    conc += "</svg>";

    var oneGame = M.gcount[1] || 0;
    var top1 = Math.max(1, Math.round(np * 0.01));
    var top1share = M.cumShare.length ? M.cumShare[top1 - 1] * 100 : 0;
    var top10 = Math.max(1, Math.round(np * 0.1));
    var top10share = M.cumShare.length ? M.cumShare[top10 - 1] * 100 : 0;

    return '<div class="lad-ctl">' +
        '<span class="lad-k">Bar height</span>' +
        '<div class="lad-seg" id="lad-scale">' +
          '<button type="button" data-scale="count"' + (ST.scale === "count" ? ' class="lad-on"' : "") +
            ">player count</button>" +
          '<button type="button" data-scale="sqrt"' + (ST.scale === "sqrt" ? ' class="lad-on"' : "") +
            ">square root</button>" +
        "</div>" +
        '<span class="lad-note">the amber line is the minimum-games floor set at the top of the page</span>' +
      "</div>" +
      '<div class="lad-key">' +
        '<span><i style="background:' + VIO_HI + '"></i>at or above the floor</span>' +
        '<span><i style="background:' + COOL + '"></i>below it</span>' +
      "</div>" +
      out +
      '<p class="lad-sentence"><b>' + E(fint(oneGame)) + "</b> of the " + E(fint(np)) +
      " players in the archive have exactly one game. That is <b>" +
      E(pc(np ? oneGame / np * 100 : 0)) + "</b>.</p>" +
      '<div class="lad-key" style="margin-top:18px">' +
        '<span><i style="background:' + VIO_HI + '"></i>cumulative share of player-games</span>' +
        '<span><i style="background:' + COOL + '"></i>the line everyone having played equally would follow</span>' +
      "</div>" +
      conc +
      '<div class="lad-read">' +
        '<div><div class="lad-rk">Player-games in total</div><div class="lad-rv">' +
          E(fint(M.totalPG)) + "</div></div>" +
        '<div><div class="lad-rk">Median games per player</div><div class="lad-rv">' +
          E(fint(pctl(sortedCopy(M.players.map(function (p) { return p.games; })), 0.5))) +
          "</div></div>" +
        '<div><div class="lad-rk">Held by the busiest 1%</div><div class="lad-rv">' +
          E(pc(top1share)) + "</div></div>" +
        '<div><div class="lad-rk">Held by the busiest 10%</div><div class="lad-rv">' +
          E(pc(top10share)) + "</div></div>" +
      "</div>";
  }

  // --------------------------------------- panel 3: rating against games played
  function scatterOutHtml(M) {
    var W = 1000, H = 340, L = 46, R = 14, TOP = 16, BOT = 36;
    var pw = W - L - R, ph = H - TOP - BOT;
    var maxG = Math.max(2, M.maxGames);
    var lg = Math.log(maxG);
    function xAt(g) { return L + (Math.log(Math.max(1, g)) / lg) * pw; }
    function yAt(r) { return TOP + ph - clamp(r / M.ratingMax, 0, 1) * ph; }

    var out = svgOpen(W, H), i;
    out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
      '" fill="rgba(127,137,179,.05)"/>';
    for (i = 0; i <= 6; i++) {
      var rv = M.ratingMax * i / 6;
      var gy = yAt(rv);
      out += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' +
        gy.toFixed(1) + '" stroke="rgba(127,137,179,.16)" stroke-width="1"/>' +
        axisText(L - 6, gy + 4, fint(rv), "end");
    }
    var xt = [1, 2, 3, 5, 10, 20, 50, 100, maxG];
    for (i = 0; i < xt.length; i++) {
      if (xt[i] > maxG) continue;
      out += '<line x1="' + xAt(xt[i]).toFixed(1) + '" y1="' + TOP + '" x2="' +
        xAt(xt[i]).toFixed(1) + '" y2="' + (TOP + ph) +
        '" stroke="rgba(127,137,179,.12)" stroke-width="1"/>' +
        axisText(xAt(xt[i]), H - 14, fint(xt[i]), i === 0 ? "start" : "middle");
    }
    // the floor, as a shaded region rather than a bare line
    var fx = xAt(ST.floor);
    if (ST.floor > 1) {
      out += '<rect x="' + L + '" y="' + TOP + '" width="' + (fx - L).toFixed(1) +
        '" height="' + ph + '" fill="#0d1226" opacity="0.55"/>';
      out += '<line x1="' + fx.toFixed(1) + '" y1="' + (TOP - 4) + '" x2="' + fx.toFixed(1) +
        '" y2="' + (TOP + ph + 4) + '" stroke="' + AMBER + '" stroke-width="1.6"/>';
    }
    for (i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      if (p.rating === null) continue;
      var kept = p.games >= ST.floor;
      out += '<circle cx="' + xAt(p.games).toFixed(1) + '" cy="' + yAt(p.rating).toFixed(1) +
        '" r="' + (kept ? 2.4 : 1.9) + '" fill="' + (kept ? VIO_HI : COOL) +
        '" opacity="' + (kept ? 0.62 : 0.4) + '"/>';
    }
    out += axisText(W - R, H - 14, "games played (log scale)", "end");
    out += "</svg>";

    // the spread by experience, as boxes
    var BW = 1000, ROWH = 30, GAP = 9;
    var box = svgOpen(BW, M.bins.length * (ROWH + GAP) + 24);
    var BL = 110, BR = 150;
    var bpw = BW - BL - BR;
    function bx(v) { return BL + clamp(v / M.ratingMax, 0, 1) * bpw; }
    for (i = 0; i <= 6; i++) {
      var vv = M.ratingMax * i / 6;
      box += '<line x1="' + bx(vv).toFixed(1) + '" y1="0" x2="' + bx(vv).toFixed(1) + '" y2="' +
        (M.bins.length * (ROWH + GAP)) + '" stroke="rgba(127,137,179,.12)" stroke-width="1"/>' +
        axisText(bx(vv), M.bins.length * (ROWH + GAP) + 18, fint(vv), "middle");
    }
    for (i = 0; i < M.bins.length; i++) {
      var bn = M.bins[i];
      if (!bn.n) continue;
      var y0 = i * (ROWH + GAP), mid = y0 + ROWH / 2;
      var lit = bn.lo >= ST.floor;
      var col = lit ? VIO_HI : COOL;
      box += '<text x="' + (BL - 10) + '" y="' + (mid + 4) +
        '" fill="#d6dcf5" font-size="12" text-anchor="end">' + E(bn.label) + "</text>";
      box += '<line x1="' + bx(bn.p10).toFixed(1) + '" y1="' + mid + '" x2="' +
        bx(bn.p90).toFixed(1) + '" y2="' + mid + '" stroke="' + col +
        '" stroke-opacity="0.6" stroke-width="1.5"/>';
      box += '<rect x="' + bx(bn.p25).toFixed(1) + '" y="' + (y0 + 5) + '" width="' +
        Math.max(2, bx(bn.p75) - bx(bn.p25)).toFixed(1) + '" height="' + (ROWH - 10) +
        '" rx="3" fill="' + col + '" fill-opacity="' + (lit ? 0.55 : 0.3) + '"/>';
      box += '<line x1="' + bx(bn.p50).toFixed(1) + '" y1="' + (y0 + 2) + '" x2="' +
        bx(bn.p50).toFixed(1) + '" y2="' + (y0 + ROWH - 2) + '" stroke="' + VIO_TXT +
        '" stroke-width="2"/>';
      box += '<text x="' + (BW - BR + 8) + '" y="' + (mid + 4) +
        '" fill="#7f89b3" font-size="12">' + E(fint(bn.n) + " players, sd " + f1(bn.sd)) +
        "</text>";
    }
    box += "</svg>";

    var kept2 = above(M, ST.floor);
    var rs = [];
    for (i = 0; i < kept2.length; i++) if (kept2[i].rating !== null) rs.push(kept2[i].rating);
    var asc = sortedCopy(rs);
    var first = M.bins[0], last = null;
    for (i = M.bins.length - 1; i >= 0; i--) { if (M.bins[i].n) { last = M.bins[i]; break; } }

    return out +
      '<div class="lad-key" style="margin-top:16px">' +
        '<span><i style="background:' + VIO_HI + '"></i>10th to 90th percentile of rating</span>' +
        '<span><i style="background:' + VIO_TXT + '"></i>median</span>' +
        "<span>box is the middle half</span>" +
      "</div>" +
      box +
      '<div class="lad-read">' +
        '<div><div class="lad-rk">Players above the floor</div><div class="lad-rv">' +
          E(fint(rs.length)) + "</div></div>" +
        '<div><div class="lad-rk">Median rating there</div><div class="lad-rv">' +
          E(f1(pctl(asc, 0.5))) + "</div></div>" +
        '<div><div class="lad-rk">10th to 90th</div><div class="lad-rv">' +
          E(f1(pctl(asc, 0.1)) + " to " + f1(pctl(asc, 0.9))) + "</div></div>" +
        '<div><div class="lad-rk">Standard deviation</div><div class="lad-rv">' +
          E(f1(sd(rs))) + "</div></div>" +
      "</div>" +
      (first && last && first !== last && first.sd && last.sd
        ? '<p class="lad-sentence">Rating spread is <b>' + E(f1(first.sd)) +
          "</b> points across the <b>" + E(fint(first.n)) + "</b> players with one game, <b>" +
          E(f1(last.sd)) + "</b> across the <b>" + E(fint(last.n)) + "</b> with " +
          E(last.label) + ".</p>"
        : "");
  }

  // ------------------------------------------------- panel 4: the ladder table
  var COLS = [
    { key: "games", label: "Games", get: function (p) { return p.games; }, fmt: fint },
    { key: "winrate", label: "Win rate", get: function (p) { return p.winrate; }, fmt: pc },
    { key: "rating", label: "Rating", get: function (p) { return p.rating; }, fmt: f1 },
    { key: "dmg", label: "Avg damage", get: function (p) { return p.dmg; }, fmt: fint },
    { key: "kills", label: "Avg kills", get: function (p) { return p.kills; }, fmt: f1 },
    { key: "assist", label: "Avg assist", get: function (p) { return p.assist; }, fmt: fint },
    { key: "blocked", label: "Avg blocked", get: function (p) { return p.blocked; }, fmt: fint },
    { key: "survPct", label: "Survived", get: function (p) { return p.survPct; }, fmt: pc }
  ];
  function colDef(key) {
    for (var i = 0; i < COLS.length; i++) if (COLS[i].key === key) return COLS[i];
    return COLS[2];
  }

  function tableOutHtml(M) {
    var kept = above(M, ST.floor);
    var cd = colDef(ST.sortKey);
    kept = kept.slice().sort(function (a, b) {
      var av = cd.get(a), bv = cd.get(b);
      if (av === null || av === undefined) av = -Infinity;
      if (bv === null || bv === undefined) bv = -Infinity;
      return (av - bv) * ST.sortDir || (b.games - a.games);
    });
    var shown = kept.slice(0, 40);
    if (!shown.length) {
      return '<p class="lad-note">Nobody has that many games on record.</p>';
    }
    var top = 0;
    for (var i = 0; i < shown.length; i++) {
      var v = cd.get(shown[i]);
      if (v !== null && v > top) top = v;
    }

    var head = '<th></th><th>Player</th><th>Clan</th>';
    for (i = 0; i < COLS.length; i++) {
      head += '<th class="lad-sortable' + (COLS[i].key === ST.sortKey ? " lad-sorted" : "") +
        '" data-sort="' + COLS[i].key + '">' + E(COLS[i].label) +
        (COLS[i].key === ST.sortKey ? (ST.sortDir < 0 ? " &darr;" : " &uarr;") : "") + "</th>";
    }

    var rows = shown.map(function (p, idx) {
      var v = cd.get(p);
      var cells = "";
      for (var c = 0; c < COLS.length; c++) {
        var cv = COLS[c].get(p);
        var isSort = COLS[c].key === ST.sortKey;
        var txt = (cv === null || cv === undefined) ? "-" : COLS[c].fmt(cv);
        if (isSort) {
          cells += '<td class="lad-valcell"><span class="lad-bar" style="width:' +
            (top > 0 && v !== null ? clamp(v / top, 0, 1) * 100 : 0).toFixed(1) +
            '%"></span><b>' + E(txt) + "</b></td>";
        } else {
          cells += '<td class="lad-dim">' + E(txt) + "</td>";
        }
      }
      return "<tr>" +
        '<td class="lad-rank">' + (idx + 1) + "</td>" +
        "<td>" + who(p.label, p.sid) +
          (p.prov ? '<span class="lad-prov" title="two games or fewer">provisional</span>' : "") +
        "</td>" +
        '<td class="lad-dim">' + (p.clan ? E(p.clan) : "-") + "</td>" +
        cells + "</tr>";
    }).join("");

    var provN = 0;
    for (i = 0; i < shown.length; i++) if (shown[i].prov) provN++;

    return '<p class="lad-note" style="margin:0 0 10px">Sorted by ' + E(cd.label.toLowerCase()) +
      ", " + (ST.sortDir < 0 ? "highest first" : "lowest first") + ". " +
      E(fint(kept.length)) + " " + E(plural(kept.length, "player", "players")) +
      " clear " + E(fint(ST.floor)) + " " +
      E(plural(ST.floor, "game", "games")) + "; top " + E(fint(shown.length)) +
      " shown. " + (provN
        ? "<b>" + E(fint(provN)) + "</b> provisional."
        : "None provisional.") + "</p>" +
      '<div class="lad-scroll"><table class="lad-table"><thead><tr>' + head +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  // ---------------------------------------------------------- panel 5: clans
  var CLAN_METRICS = [
    { key: "winrate", label: "Win rate", fmt: pc, pinned: 100 },
    { key: "dmg", label: "Avg damage", fmt: fint, pinned: null },
    { key: "kills", label: "Avg kills", fmt: f1, pinned: null },
    { key: "assist", label: "Avg assist", fmt: fint, pinned: null },
    { key: "blocked", label: "Avg blocked", fmt: fint, pinned: null },
    { key: "games", label: "Games on record", fmt: fint, pinned: null }
  ];
  function clanMetric(key) {
    for (var i = 0; i < CLAN_METRICS.length; i++) {
      if (CLAN_METRICS[i].key === key) return CLAN_METRICS[i];
    }
    return CLAN_METRICS[0];
  }

  function clanCtlHtml(M) {
    var chips = CLAN_METRICS.map(function (m) {
      return '<button type="button" data-cm="' + m.key + '"' +
        (ST.clanMetric === m.key ? ' class="lad-on"' : "") + ">" + E(m.label) + "</button>";
    }).join("");
    return '<div class="lad-ctl">' +
      '<span class="lad-k">Compare on</span>' +
      '<div class="lad-seg" id="lad-cm">' + chips + "</div>" +
      "</div>" +
      '<div class="lad-ctl">' +
      '<span class="lad-k">Clan needs at least</span>' +
      '<input class="lad-range" id="lad-clanmin" type="range" min="1" max="' +
        Math.max(2, M.clanMaxGames) + '" step="1" value="' + ST.clanMin + '">' +
      '<span class="lad-floorread" id="lad-clanread">' + clanReadHtml(M) + "</span>" +
      "</div>";
  }

  function clanReadHtml(M) {
    var n = 0, i;
    for (i = 0; i < M.clans.length; i++) if (M.clans[i].games >= ST.clanMin) n++;
    return "<b>" + E(fint(ST.clanMin)) + "</b> games. <b>" + E(fint(n)) + "</b> of " +
      E(fint(M.clans.length)) + " clans qualify.";
  }

  function clanOutHtml(M) {
    var m = clanMetric(ST.clanMetric);
    var kept = [], i;
    for (i = 0; i < M.clans.length; i++) {
      var c = M.clans[i];
      if (c.games < ST.clanMin) continue;
      if (c[m.key] === null || c[m.key] === undefined) continue;
      kept.push(c);
    }
    if (!kept.length) {
      return '<p class="lad-note">No clan has that many games on record.</p>';
    }
    kept.sort(function (a, b) { return b[m.key] - a[m.key]; });
    var shown = kept.slice(0, 20);

    var maxV = m.pinned;
    if (maxV === null) {
      maxV = 1;
      for (i = 0; i < shown.length; i++) if (shown[i][m.key] > maxV) maxV = shown[i][m.key];
    }
    var W = 1000, ROWH = 24, GAP = 6, LW = 190, VW = 150;
    var H = shown.length * (ROWH + GAP) + 22;
    var pw = W - LW - VW;
    var out = svgOpen(W, H);
    for (i = 0; i <= 4; i++) {
      var gx = LW + (pw * i / 4);
      out += '<line x1="' + gx.toFixed(1) + '" y1="0" x2="' + gx.toFixed(1) + '" y2="' +
        (H - 22) + '" stroke="rgba(127,137,179,.13)" stroke-width="1"/>' +
        axisText(gx, H - 6, m.fmt(maxV * i / 4), i === 0 ? "start" : "middle");
    }
    // a reference line at 50% for win rate, since that is where the axis means
    // something rather than being an arbitrary maximum
    if (m.key === "winrate") {
      var hx = LW + pw * 0.5;
      out += '<line x1="' + hx.toFixed(1) + '" y1="0" x2="' + hx.toFixed(1) + '" y2="' +
        (H - 22) + '" stroke="' + AMBER + '" stroke-width="1.4" stroke-dasharray="4 4"/>';
    }
    for (i = 0; i < shown.length; i++) {
      var c2 = shown[i];
      var y = i * (ROWH + GAP);
      var w = clamp(c2[m.key] / maxV, 0, 1) * pw;
      // thin evidence gets a dimmer bar, because a 90% win rate over 6 games is
      // not the same claim as 64% over 108
      var thin = c2.games < 20;
      out += '<text x="' + (LW - 10) + '" y="' + (y + ROWH / 2 + 4) +
        '" fill="#d6dcf5" font-size="12" text-anchor="end">' + E(c2.tag) + "</text>";
      out += '<rect x="' + LW + '" y="' + y + '" width="' + Math.max(2, w).toFixed(1) +
        '" height="' + ROWH + '" rx="4" fill="' + (thin ? COOL : VIO) + '" opacity="' +
        (thin ? "0.72" : "0.95") + '"><title>' + E(c2.tag + ": " + m.fmt(c2[m.key]) + " over " +
          fint(c2.games) + " games from " + fint(c2.players) + " members") + "</title></rect>";
      out += '<text x="' + (LW + Math.max(2, w) + 8).toFixed(1) + '" y="' + (y + ROWH / 2 + 4) +
        '" fill="#e3d5ff" font-size="12">' + E(m.fmt(c2[m.key])) + "</text>";
      out += '<text x="' + (W - 6) + '" y="' + (y + ROWH / 2 + 4) +
        '" fill="#7f89b3" font-size="12" text-anchor="end">' +
        E(fint(c2.games) + " games, " + fint(c2.players) + " members") + "</text>";
    }
    out += "</svg>";

    return '<div class="lad-key">' +
        '<span><i style="background:' + VIO + '"></i>20 or more games on record</span>' +
        '<span><i style="background:' + COOL + '"></i>fewer than 20, so read it as a hint</span>' +
        (m.key === "winrate" ? '<span><i style="background:' + AMBER + '"></i>50%</span>' : "") +
      "</div>" + out;
  }

  // --------------------------------------------- panel 6: rating trajectories
  function trajOutHtml(M) {
    if (!M.traj.length) return '<p class="lad-note">No player has enough history to draw.</p>';
    var sel = null, i;
    for (i = 0; i < M.traj.length; i++) if (M.traj[i].id === ST.traj) sel = M.traj[i];
    if (!sel) { sel = M.traj[0]; ST.traj = sel.id; }

    var opts = M.traj.map(function (p) {
      return '<option value="' + E(p.id) + '"' + (p.id === sel.id ? " selected" : "") + ">" +
        E(whoPlain(p.label, p.sid)) + " (" + fint(p.hist.length) + " games)</option>";
    }).join("");

    var W = 1000, H = 320, L = 46, R = 14, TOP = 16, BOT = 34;
    var pw = W - L - R, ph = H - TOP - BOT;
    var maxLen = 0;
    for (i = 0; i < M.traj.length; i++) if (M.traj[i].hist.length > maxLen) maxLen = M.traj[i].hist.length;
    function xAt(k) { return L + (maxLen > 1 ? k / (maxLen - 1) : 0) * pw; }
    function yAt(r) { return TOP + ph - clamp(r / M.ratingMax, 0, 1) * ph; }

    var out = svgOpen(W, H);
    out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
      '" fill="rgba(127,137,179,.05)"/>';
    for (i = 0; i <= 6; i++) {
      var rv = M.ratingMax * i / 6, gy = yAt(rv);
      out += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' +
        gy.toFixed(1) + '" stroke="rgba(127,137,179,.16)" stroke-width="1"/>' +
        axisText(L - 6, gy + 4, fint(rv), "end");
    }
    // everybody else, faint, for context
    for (i = 0; i < M.traj.length; i++) {
      var q = M.traj[i];
      if (q.id === sel.id) continue;
      var d = "";
      for (var k = 0; k < q.hist.length; k++) {
        var rr = num(q.hist[k].rating, null);
        if (rr === null) continue;
        d += (d ? "L" : "M") + xAt(k).toFixed(1) + " " + yAt(rr).toFixed(1);
      }
      if (d) out += '<path d="' + d + '" fill="none" stroke="' + COOL +
        '" stroke-width="1" opacity="0.34"/>';
    }
    // the selected one
    var dd = "", pts = [];
    for (i = 0; i < sel.hist.length; i++) {
      var r2 = num(sel.hist[i].rating, null);
      if (r2 === null) continue;
      pts.push({ i: i, r: r2, mid: sel.hist[i].match_id, t: sel.hist[i].t });
      dd += (dd ? "L" : "M") + xAt(i).toFixed(1) + " " + yAt(r2).toFixed(1);
    }
    out += '<path d="' + dd + '" fill="none" stroke="' + VIO_HI +
      '" stroke-width="2.4" stroke-linejoin="round"/>';
    // mark the first ten games, which is where the movement is manufactured
    var settle = Math.min(10, pts.length);
    if (settle > 1) {
      out += '<rect x="' + L + '" y="' + TOP + '" width="' + (xAt(settle - 1) - L).toFixed(1) +
        '" height="' + ph + '" fill="' + AMBER + '" opacity="0.07"/>';
      out += '<line x1="' + xAt(settle - 1).toFixed(1) + '" y1="' + TOP + '" x2="' +
        xAt(settle - 1).toFixed(1) + '" y2="' + (TOP + ph) + '" stroke="' + AMBER +
        '" stroke-width="1.2" stroke-dasharray="4 4"/>';
    }
    var everyN = Math.max(1, Math.ceil(pts.length / 60));
    for (i = 0; i < pts.length; i++) {
      var lastOne = (i === pts.length - 1);
      if (!lastOne && i % everyN !== 0 && i !== 0) continue;
      out += '<a href="#/match/' + encodeURIComponent(pts[i].mid) + '">' +
        '<circle cx="' + xAt(pts[i].i).toFixed(1) + '" cy="' + yAt(pts[i].r).toFixed(1) +
        '" r="' + (lastOne ? 5 : 2.6) + '" fill="' + (lastOne ? VIO_TXT : VIO_HI) +
        '" stroke="#0a0e1f" stroke-width="1"><title>' +
        E("game " + (pts[i].i + 1) + ": rating " + f1(pts[i].r) + ", " + dateOf(pts[i].t)) +
        "</title></circle></a>";
    }
    out += axisText(L, H - 12, "first game", "start");
    out += axisText(W - R, H - 12, "game " + fint(maxLen), "end");
    out += "</svg>";

    var vals = pts.map(function (q2) { return q2.r; });
    var early = vals.slice(0, settle), lateFrom = Math.max(0, vals.length - 10);
    var late = vals.slice(lateFrom);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var swingEarly = early.length > 1
      ? Math.max.apply(null, early) - Math.min.apply(null, early) : null;
    var swingLate = late.length > 1
      ? Math.max.apply(null, late) - Math.min.apply(null, late) : null;

    return '<div class="lad-ctl">' +
        '<span class="lad-k">Player</span>' +
        '<select class="lad-select" id="lad-traj">' + opts + "</select>" +
        '<span class="lad-note">' + E(fint(M.traj.length)) +
        " players have eight or more games, which is the whole list</span>" +
      "</div>" +
      '<div class="lad-key">' +
        '<span><i style="background:' + VIO_HI + '"></i>the selected player</span>' +
        '<span><i style="background:' + COOL + '"></i>every other player with eight or more games</span>' +
        '<span><i style="background:' + AMBER + ';opacity:.5"></i>their first ten games</span>' +
      "</div>" +
      out +
      '<div class="lad-read">' +
        '<div><div class="lad-rk">Games</div><div class="lad-rv">' +
          E(fint(pts.length)) + "</div></div>" +
        '<div><div class="lad-rk">First rating</div><div class="lad-rv">' +
          E(f1(vals[0])) + "</div></div>" +
        '<div><div class="lad-rk">Low to high</div><div class="lad-rv">' +
          E(f1(lo) + " to " + f1(hi)) + "</div></div>" +
        '<div><div class="lad-rk">Where it is now</div><div class="lad-rv">' +
          E(f1(vals[vals.length - 1])) + "</div></div>" +
      "</div>" +
      (swingEarly !== null && swingLate !== null
        ? '<p class="lad-sentence">' + who(sel.label, sel.sid) +
          " moved <b>" + E(f1(swingEarly)) + "</b> points over their first " +
          E(fint(early.length)) + " games, <b>" + E(f1(swingLate)) +
          "</b> over their last " + E(fint(late.length)) + ".</p>"
        : "");
  }

  // ------------------------------- panel 7: squad size and where people connect
  function popOutHtml(M) {
    var W = 1000, i, out;
    if (ST.pop === "ping") {
      if (!M.ping.length) return '<p class="lad-note">No ping histogram in this build.</p>';
      var H = 280, L = 46, R = 14, TOP = 14, BOT = 40;
      var pw = W - L - R, ph = H - TOP - BOT;
      var cmax = 1, tot = 0;
      for (i = 0; i < M.ping.length; i++) {
        if (M.ping[i].count > cmax) cmax = M.ping[i].count;
        tot += M.ping[i].count;
      }
      var pitch = pw / M.ping.length, bw = Math.max(3, pitch - 6);
      out = svgOpen(W, H);
      out += '<rect x="' + L + '" y="' + TOP + '" width="' + pw + '" height="' + ph +
        '" fill="rgba(127,137,179,.05)"/>';
      for (i = 0; i <= 4; i++) {
        var gy = TOP + ph - (i / 4) * ph;
        out += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' +
          gy.toFixed(1) + '" stroke="rgba(127,137,179,.16)" stroke-width="1"/>' +
          axisText(L - 6, gy + 4, fint(cmax * i / 4), "end");
      }
      for (i = 0; i < M.ping.length; i++) {
        var b = M.ping[i];
        var h = (b.count / cmax) * ph;
        var x = L + i * pitch + (pitch - bw) / 2;
        out += '<rect x="' + x.toFixed(1) + '" y="' + (TOP + ph - h).toFixed(1) + '" width="' +
          bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + VIO_HI +
          '" opacity="0.9"><title>' + E(fint(b.count) + " player-games between " +
            fint(b.lo) + " and " + fint(b.hi) + " ms") + "</title></rect>";
        out += axisText(x + bw / 2, H - 18, fint(b.lo), "middle");
      }
      out += axisText(W - R, H - 18, "ms", "end");
      out += "</svg>";
      return popCtlHtml() + out +
        '<div class="lad-read">' +
          '<div><div class="lad-rk">Median ping</div><div class="lad-rv">' +
            E(M.pingMedian === null ? "-" : fint(M.pingMedian) + " ms") + "</div></div>" +
          '<div><div class="lad-rk">Player-games measured</div><div class="lad-rv">' +
            E(fint(tot)) + "</div></div>" +
          '<div><div class="lad-rk">Above 200 ms</div><div class="lad-rv">' +
            E(pc(pingAbove(M, 200) / (tot || 1) * 100)) + "</div></div>" +
        "</div>";
    }

    if (!M.squad.length) return popCtlHtml() +
      '<p class="lad-note">No squad breakdown in this build.</p>';
    var SH = M.squad.length * 34 + 26, SL = 110, SR = 210;
    var spw = W - SL - SR;
    var totG = 0;
    for (i = 0; i < M.squad.length; i++) totG += num(M.squad[i].games, 0);
    out = svgOpen(W, SH);
    for (i = 0; i <= 4; i++) {
      var sx = SL + spw * i / 4;
      out += '<line x1="' + sx.toFixed(1) + '" y1="0" x2="' + sx.toFixed(1) + '" y2="' +
        (SH - 26) + '" stroke="rgba(127,137,179,.13)" stroke-width="1"/>' +
        axisText(sx, SH - 8, (i * 25) + "%", i === 0 ? "start" : "middle");
    }
    var half = SL + spw * 0.5;
    out += '<line x1="' + half.toFixed(1) + '" y1="0" x2="' + half.toFixed(1) + '" y2="' +
      (SH - 26) + '" stroke="' + AMBER + '" stroke-width="1.4" stroke-dasharray="4 4"/>';
    for (i = 0; i < M.squad.length; i++) {
      var r = M.squad[i];
      var wr = num(r.winrate, 0);
      var y = i * 34;
      var w = clamp(wr / 100, 0, 1) * spw;
      out += '<text x="' + (SL - 10) + '" y="' + (y + 21) +
        '" fill="#d6dcf5" font-size="12" text-anchor="end">' + E(r.label) + "</text>";
      out += '<rect x="' + SL + '" y="' + (y + 5) + '" width="' + Math.max(2, w).toFixed(1) +
        '" height="' + 22 + '" rx="4" fill="' + VIO + '" opacity="0.95"/>';
      out += '<text x="' + (SL + w + 8).toFixed(1) + '" y="' + (y + 21) +
        '" fill="#e3d5ff" font-size="12">' + E(pc(wr)) + "</text>";
      out += '<text x="' + (W - 6) + '" y="' + (y + 21) +
        '" fill="#7f89b3" font-size="12" text-anchor="end">' +
        E(fint(num(r.games, 0)) + " player-games, " + fint(num(r.wins, 0)) + " won") + "</text>";
    }
    out += "</svg>";
    var spread = 0;
    if (M.squad.length > 1) {
      var lo2 = 1e9, hi2 = -1e9;
      for (i = 0; i < M.squad.length; i++) {
        var v2 = num(M.squad[i].winrate, null);
        if (v2 === null) continue;
        if (v2 < lo2) lo2 = v2;
        if (v2 > hi2) hi2 = v2;
      }
      spread = hi2 - lo2;
    }
    return popCtlHtml() +
      '<div class="lad-key">' +
        '<span><i style="background:' + AMBER + '"></i>50%, which is where a balanced pool sits</span>' +
      "</div>" + out +
      '<p class="lad-sentence">Best to worst squad size spans <b>' + E(f1(spread)) +
      "</b> points over <b>" + E(fint(totG)) + "</b> classified player-games.</p>";
  }
  function pingAbove(M, ms) {
    var n = 0;
    for (var i = 0; i < M.ping.length; i++) if (M.ping[i].lo >= ms) n += M.ping[i].count;
    return n;
  }
  function popCtlHtml() {
    return '<div class="lad-ctl">' +
      '<span class="lad-k">Show</span>' +
      '<div class="lad-seg" id="lad-pop">' +
        '<button type="button" data-pop="squad"' + (ST.pop === "squad" ? ' class="lad-on"' : "") +
          ">squad size</button>" +
        '<button type="button" data-pop="ping"' + (ST.pop === "ping" ? ' class="lad-on"' : "") +
          ">ping</button>" +
      "</div></div>";
  }

  // ------------------------------------------------------------------- notes
  function provNote(M) {
    var prov = 0;
    for (var i = 0; i < M.players.length; i++) if (M.players[i].prov) prov++;
    return fint(prov) + " of " + fint(M.players.length) + " players (" +
      pc(M.players.length ? prov / M.players.length * 100 : 0) +
      ") are provisional, at two games or fewer.";
  }

  // ------------------------------------------------------------------ suite
  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "ladder",
    title: "Ladder",
    blurb: "Who plays, how many games they have, and how little of it is settled.",
    accent: VIO,
    css: CSS,
    gated: true,

    // Every uploaded match as one cell, coloured by who uploaded it. One
    // colour covers most of the square, which is the honest first impression
    // of this archive.
    preview: function (T) {
      TT = T;
      var M;
      try { M = model(T); } catch (e) { return ""; }
      var U = M.upl;
      if (!U.list.length || M.matches.length < 40) return "";

      var mids = M.matches.slice().sort(function (a, b) {
        var ga = U.midTo[a.match_id], gb = U.midTo[b.match_id];
        if (ga === undefined) ga = 999;
        if (gb === undefined) gb = 999;
        return (ga - gb) || ((a.captured_unix || 0) - (b.captured_unix || 0));
      });

      var n = mids.length;
      var cols = Math.max(6, Math.round(Math.sqrt(n * 1.55)));
      var rows = Math.ceil(n / cols);
      var pad = 10;
      var pitch = (240 - pad * 2) / cols;
      var size = Math.max(2, pitch - Math.max(1.2, pitch * 0.16));
      // keep the whole block inside the upper two thirds, where the tile is
      // not covered by the caption scrim
      var top = 16;
      var maxH = 150;
      if (rows * pitch > maxH) { pitch = maxH / rows; size = Math.max(2, pitch - pitch * 0.16); }

      var out = '<svg viewBox="0 0 240 240">';
      out += '<rect x="0" y="0" width="240" height="240" fill="#0d1226"/>';
      for (var i = 0; i < n; i++) {
        var gi = U.midTo[mids[i].match_id];
        var col = (gi === undefined) ? "#39406b" : U.list[gi].color;
        var x = pad + (i % cols) * pitch;
        var y = top + Math.floor(i / cols) * pitch;
        out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' +
          size.toFixed(1) + '" height="' + size.toFixed(1) + '" rx="1.6" fill="' + col + '"/>';
      }
      // one solid bar under the block, split by uploader, so the proportion
      // reads even when the cells shrink
      var bx = pad, by = top + rows * pitch + 8, bw = 240 - pad * 2;
      for (var j = 0; j < U.list.length; j++) {
        var seg = bw * (U.list[j].n / n);
        out += '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' +
          Math.max(1, seg).toFixed(1) + '" height="7" fill="' + U.list[j].color + '"/>';
        bx += seg;
      }
      out += "</svg>";
      return out;
    },

    render: function (T) {
      TT = T;
      var M = model(T);
      if (!M.players.length) {
        return T.bigPanel("Ladder", '<p class="small">No players in the archive yet.</p>', "");
      }
      if (ST.traj === null && M.traj.length) ST.traj = M.traj[0].id;
      if (M.clanMaxGames && ST.clanMin > M.clanMaxGames) ST.clanMin = M.clanMaxGames;

      var html = '<div class="lad-topbar">' +
        '<span class="lad-k">Minimum games</span>' +
        '<div class="lad-seg" id="lad-floor">' + floorChipsHtml() + "</div>" +
        '<span class="lad-floorread" id="lad-floorread">' + floorReadHtml(M) + "</span>" +
        '<div class="lad-headline" id="lad-headline">' + headlineHtml(M) + "</div>" +
      "</div>";

      html += T.bigPanel("How many games people have",
        '<div id="lad-dist-inner">' + distOutHtml(M) + "</div>",
        "One bar per exact game count over " + fint(M.players.length) +
        " players, plus a tail bucket. The scale is square root: heights are not " +
        "proportional. " + provNote(M));

      html += T.bigPanel("Rating against games played",
        '<div id="lad-scatter-inner">' + scatterOutHtml(M) + "</div>",
        "Most players have one or two games. Their spread is the rating system's " +
        "uncertainty, not skill. More games is not better play. It is more " +
        "uploads.");

      html += T.bigPanel("The ladder",
        '<div id="lad-table-inner">' + tableOutHtml(M) + "</div>",
        "The top forty above the floor. At a floor of one game, the rating column is " +
        "single good matches. Provisional means two games or fewer. Not worth reading.");

      html += T.bigPanel("Clans, above a floor you set",
        '<div id="lad-clan-ctl">' + clanCtlHtml(M) + "</div>" +
        '<div id="lad-clan-out">' + clanOutHtml(M) + "</div>",
        "The " + fint(M.clans.length) + " clan tags in the archive. A clan's games are " +
        "the sum of its members' games, not games played together. Only " +
        fint(M.clanned) + " of " + fint(M.players.length) + " players carry a tag.");

      html += T.bigPanel("One player's rating, game by game",
        '<div id="lad-traj-inner">' + trajOutHtml(M) + "</div>",
        "Every rating recorded for the selected player, in play order, with the rest " +
        "faint behind. The axis is game number, not date. Only " + fint(M.traj.length) +
        " of " + fint(M.players.length) + " players have eight games.");

      html += T.bigPanel("Squad size, and where people connect from",
        '<div id="lad-pop-inner">' + popOutHtml(M) + "</div>",
        "Squad size does not cover every player-game. Its total falls under " +
        fint(M.totalPG) + ". Ping is what the client reported. Neither is corrected " +
        "for who uploaded the match.");

      return html;
    },

    wire: function (T, root) {
      TT = T;
      var M = model(T);

      function el(id) { return root.querySelector("#" + id); }
      function setHtml(id, html) { var e = el(id); if (e) e.innerHTML = html; }

      function markSeg(containerId, attr, value) {
        var box = el(containerId);
        if (!box) return;
        var bs = box.querySelectorAll("button");
        for (var i = 0; i < bs.length; i++) {
          var on = bs[i].getAttribute(attr) === String(value);
          bs[i].className = on ? "lad-on" : "";
        }
      }

      function redrawFloor() {
        markSeg("lad-floor", "data-floor", ST.floor);
        setHtml("lad-floorread", floorReadHtml(M));
        setHtml("lad-dist-inner", distOutHtml(M));
        setHtml("lad-scatter-inner", scatterOutHtml(M));
        setHtml("lad-table-inner", tableOutHtml(M));
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
          var fl = b.getAttribute("data-floor");
          if (fl) {
            var nf = parseInt(fl, 10) || 1;
            if (nf === ST.floor) return;
            ST.floor = nf;
            redrawFloor();
            return;
          }
          var st = b.getAttribute("data-step");
          if (st) {
            var ns = parseInt(st, 10) || 1;
            if (ns === ST.step) return;
            ST.step = ns;
                return;
          }
          var or = b.getAttribute("data-order");
          if (or) {
            if (or === ST.order) return;
            ST.order = or;
                return;
          }
          var sc = b.getAttribute("data-scale");
          if (sc) {
            if (sc === ST.scale) return;
            ST.scale = sc;
            setHtml("lad-dist-inner", distOutHtml(M));
            return;
          }
          var cm = b.getAttribute("data-cm");
          if (cm) {
            if (cm === ST.clanMetric) return;
            ST.clanMetric = cm;
            markSeg("lad-cm", "data-cm", cm);
            setHtml("lad-clan-out", clanOutHtml(M));
            return;
          }
          var pp = b.getAttribute("data-pop");
          if (pp) {
            if (pp === ST.pop) return;
            ST.pop = pp;
            setHtml("lad-pop-inner", popOutHtml(M));
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
          setHtml("lad-table-inner", tableOutHtml(M));
        }
      });

      root.addEventListener("input", function (e) {
        var t = e.target;
        if (!t || !t.id) return;
        if (t.id === "lad-clanmin") {
          var v = parseInt(t.value, 10);
          if (!isFinite(v)) return;
          ST.clanMin = clamp(v, 1, Math.max(2, M.clanMaxGames));
          var read = el("lad-clanread");
          if (read) read.innerHTML = clanReadHtml(M);
          setHtml("lad-clan-out", clanOutHtml(M));
        }
      });

      root.addEventListener("change", function (e) {
        var t = e.target;
        if (!t || t.id !== "lad-traj") return;
        ST.traj = t.value;
        setHtml("lad-traj-inner", trajOutHtml(M));
      });
    }
  });
})();

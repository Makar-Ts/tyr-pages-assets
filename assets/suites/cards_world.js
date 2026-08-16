// Odd-page cards: maps, distance, people, and the archive itself.
//
// Every number here is computed from T at render time. Nothing is typed in,
// so a card that stops being true stops saying it.
//
// Two things this file is careful about, because both are easy to get wrong:
//
//   Upload timing is not playerbase timing. captured_unix says when a match
//   was RECORDED by whoever was running the recorder, and there are four
//   uploaders in the whole archive. DATA.steam is the opposite: Valve's own
//   count for everyone playing the game. A card built on one never speaks for
//   the other, and each says which it is.
//
//   Most players here have one or two games. Nothing below averages a player
//   stat or orders players by one, because with n=1 that is not a ranking of
//   anything.
(function () {
  window.TYR_CARDS = window.TYR_CARDS || [];
  var A = window.TYR_ART;
  if (!A) return;

  var DIM = "#3a4570";

  function isNum(v) { return typeof v === "number" && !isNaN(v); }

  // A.esc only coerces to string; T.esc is the one that escapes. Map names and
  // clan tags come from the game and from players, so they go through T.esc.
  function X(T, s) {
    return T && T.esc ? T.esc(s) : String(s == null ? "" : s);
  }

  function N(T, v) { return T && T.fmtNum ? T.fmtNum(v) : String(v); }

  function round1(v) { return Math.round(v * 10) / 10; }

  // ---- shared reads --------------------------------------------------

  function matches(T) {
    return (T.DATA && T.DATA.matches) || [];
  }

  function stats(T) { return T.STATS || {}; }

  // Maps with enough games to compare. One match on a map is a match, not a
  // map, and averaging it against sixty would be the whole lie.
  function bigMaps(T, floor) {
    var all = (T.DATA && T.DATA.maps) || [], out = [], i;
    for (i = 0; i < all.length; i++) {
      if ((all[i].games || 0) >= (floor || 10)) out.push(all[i]);
    }
    return out;
  }

  // Calendar days on which matches were recorded, biggest first. UTC, so the
  // shape is the same for every visitor.
  function recordingDays(T) {
    var ms = matches(T), by = {}, i, k, out = [];
    for (i = 0; i < ms.length; i++) {
      if (!isNum(ms[i].captured_unix)) continue;
      k = Math.floor(ms[i].captured_unix / 86400);
      by[k] = (by[k] || 0) + 1;
    }
    for (k in by) if (by.hasOwnProperty(k)) out.push(by[k]);
    out.sort(function (a, b) { return b - a; });
    return out;
  }

  function steamCounts(T) {
    var s = (T.DATA && T.DATA.steam && T.DATA.steam.samples) || [], out = [], i;
    for (i = 0; i < s.length; i++) if (isNum(s[i].count)) out.push(s[i].count);
    return out;
  }

  // How many distinct maps each player has been recorded on, bucketed by
  // count. Index 0 is "seen on one map".
  function mapsPerPlayer(T) {
    var ms = matches(T), seen = {}, mapSet = {}, i, j, p, id, k;
    for (i = 0; i < ms.length; i++) {
      var ps = ms[i].players || [];
      if (ms[i].map) mapSet[ms[i].map] = 1;
      for (j = 0; j < ps.length; j++) {
        p = ps[j];
        id = p.id || p.label;
        if (!id || !ms[i].map) continue;
        if (!seen[id]) seen[id] = {};
        seen[id][ms[i].map] = 1;
      }
    }
    var nMaps = 0;
    for (k in mapSet) if (mapSet.hasOwnProperty(k)) nMaps++;
    var buckets = [], players = 0, n;
    for (i = 0; i < nMaps; i++) buckets.push(0);
    for (id in seen) {
      if (!seen.hasOwnProperty(id)) continue;
      n = 0;
      for (k in seen[id]) if (seen[id].hasOwnProperty(k)) n++;
      if (n >= 1 && n <= nMaps) buckets[n - 1]++;
      players++;
    }
    return { buckets: buckets, players: players, maps: nMaps };
  }

  // How many matches each clan tag turns up in, biggest first, plus the roster
  // size of the leader.
  function clanReach(T) {
    var ms = matches(T), count = {}, i, j, tag, seen, ranked = [], best = null;
    for (i = 0; i < ms.length; i++) {
      var ps = ms[i].players || [];
      seen = {};
      for (j = 0; j < ps.length; j++) {
        tag = ps[j].clan;
        if (!tag || seen[tag]) continue;
        seen[tag] = 1;
        count[tag] = (count[tag] || 0) + 1;
      }
    }
    for (tag in count) if (count.hasOwnProperty(tag)) ranked.push(count[tag]);
    ranked.sort(function (a, b) { return b - a; });
    for (tag in count) {
      if (count.hasOwnProperty(tag) && (!best || count[tag] > count[best])) best = tag;
    }
    if (!best) return null;
    var clans = (T.DATA && T.DATA.clans) || [], members = 0;
    for (i = 0; i < clans.length; i++) {
      if (clans[i].tag === best) members = (clans[i].members || []).length;
    }
    return { tag: best, matches: count[best], members: members,
             clans: clans.length, ranked: ranked };
  }

  // ---- drawing -------------------------------------------------------
  // One shape each, no axes, no keys.

  // Vertical bars for a sorted list of counts, the first `lit` of them in
  // colour. Used where the shape of a lopsided distribution is the point.
  function columns(counts, lit, color, labels) {
    var W = 380, H = labels ? 74 : 62, n = counts.length, i;
    if (!n) return "";
    var max = 1;
    for (i = 0; i < n; i++) max = Math.max(max, counts[i]);
    var slot = W / n, bw = Math.max(2, Math.min(slot - 4, 40));
    var out = "", base = labels ? 58 : H;
    for (i = 0; i < n; i++) {
      var h = Math.max(2, (counts[i] / max) * (base - 4));
      var x = i * slot + (slot - bw) / 2;
      out += '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
        '" rx="2" fill="' + (i < lit ? color : DIM) + '"/>';
      if (labels && labels[i] != null) {
        out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="72" fill="#7f89b3" ' +
          'font-size="11" text-anchor="middle" ' +
          'font-family="ui-monospace,monospace">' + labels[i] + "</text>";
      }
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '">' + out + "</svg>";
  }

  // Labelled horizontal bars where the label sits to the left, so a long tank
  // or map name never runs off the right edge the way A.twoBars can.
  function namedBars(rows, color, hot) {
    var i, max = 1;
    for (i = 0; i < rows.length; i++) max = Math.max(max, rows[i].v);
    var out = "", y = 0;
    for (i = 0; i < rows.length; i++) {
      var w = Math.max(2, (rows[i].v / max) * 210);
      out += '<text x="0" y="' + (y + 15) + '" fill="#7f89b3" font-size="12">' +
        rows[i].k + "</text>" +
        '<rect x="110" y="' + (y + 4) + '" width="' + w.toFixed(1) +
        '" height="14" rx="3" fill="' + (rows[i].hot ? (hot || color) : DIM) + '"/>' +
        '<text x="' + (116 + w).toFixed(1) + '" y="' + (y + 16) +
        '" fill="#d6dcf5" font-size="12" font-family="ui-monospace,monospace">' +
        rows[i].t + "</text>";
      y += 23;
    }
    return '<svg viewBox="0 0 380 ' + y + '">' + out + "</svg>";
  }

  // One continuous trace, with the high and low readings marked.
  function trace(vals, color) {
    var W = 380, H = 92, n = vals.length, i;
    if (n < 2) return "";
    var lo = vals[0], hi = vals[0], iLo = 0, iHi = 0;
    for (i = 1; i < n; i++) {
      if (vals[i] < lo) { lo = vals[i]; iLo = i; }
      if (vals[i] > hi) { hi = vals[i]; iHi = i; }
    }
    var span = hi - lo || 1;
    function px(i) { return (i / (n - 1)) * W; }
    function py(v) { return H - 8 - ((v - lo) / span) * (H - 20); }
    var pts = [];
    for (i = 0; i < n; i++) pts.push(px(i).toFixed(1) + "," + py(vals[i]).toFixed(1));
    return '<svg viewBox="0 0 ' + W + " " + H + '">' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color +
      '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="' + px(iHi).toFixed(1) + '" cy="' + py(hi).toFixed(1) +
      '" r="5" fill="' + color + '"/>' +
      '<circle cx="' + px(iLo).toFixed(1) + '" cy="' + py(lo).toFixed(1) +
      '" r="5" fill="#d6dcf5"/></svg>';
  }

  // ====================================================================
  // 1. When the archive was actually recorded.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-three-days",
    color: "#65508a",
    wide: true,
    big: function (T) {
      var d = recordingDays(T);
      if (!d.length) return null;
      var total = 0, i;
      for (i = 0; i < d.length; i++) total += d[i];
      var run = 0;
      for (i = 0; i < d.length; i++) {
        run += d[i];
        if (run * 2 >= total) return (i + 1) + " days";
      }
      return null;
    },
    sub: function (T) {
      var d = recordingDays(T), ms = matches(T), lo = null, hi = null, i;
      for (i = 0; i < ms.length; i++) {
        if (!isNum(ms[i].captured_unix)) continue;
        if (lo == null || ms[i].captured_unix < lo) lo = ms[i].captured_unix;
        if (hi == null || ms[i].captured_unix > hi) hi = ms[i].captured_unix;
      }
      var span = lo == null ? 0 : Math.round((hi - lo) / 86400);
      return "hold half of the " + N(T, ms.length) + " matches here. " +
        "The archive spans " + N(T, span) + " days and touches " + d.length +
        " of them.";
    },
    art: function (T) {
      var d = recordingDays(T);
      if (!d.length) return "";
      var total = 0, i, run = 0, lit = d.length;
      for (i = 0; i < d.length; i++) total += d[i];
      for (i = 0; i < d.length; i++) {
        run += d[i];
        if (run * 2 >= total) { lit = i + 1; break; }
      }
      return columns(d, lit, "#9d8ccb");
    }
  });

  // ====================================================================
  // 2. Released maps the archive has never seen.
  // ====================================================================
  function unseenMaps(T) {
    var rel = (T.OFFICIAL && T.OFFICIAL.maps && T.OFFICIAL.maps.released) || [];
    var have = {}, all = (T.DATA && T.DATA.maps) || [], i, out = [];
    for (i = 0; i < all.length; i++) if (all[i].map) have[all[i].map] = 1;
    for (i = 0; i < rel.length; i++) if (!have[rel[i]]) out.push(rel[i]);
    return { released: rel.length, missing: out };
  }

  window.TYR_CARDS.push({
    id: "world-unrecorded-maps",
    color: "#8c6739",
    big: function (T) {
      var u = unseenMaps(T);
      if (!u.released || !u.missing.length) return null;
      return u.missing.length + " of " + u.released;
    },
    sub: function (T) {
      var u = unseenMaps(T), names = [], i;
      for (i = 0; i < u.missing.length; i++) names.push(X(T, u.missing[i]));
      return "released maps are missing from the archive: " +
        names.join(" and ") + ".";
    },
    art: function (T) {
      var u = unseenMaps(T);
      return A.dots(u.released, u.released - u.missing.length, "#b8874a",
        { per: u.released, gap: 46, r: 17 });
    }
  });

  // ====================================================================
  // 3. A prototype map that turned up anyway.
  // ====================================================================
  function protoPresent(T) {
    var proto = (T.OFFICIAL && T.OFFICIAL.maps && T.OFFICIAL.maps.prototype) || [];
    var on = {}, i, all = (T.DATA && T.DATA.maps) || [], out = [], games = 0;
    for (i = 0; i < proto.length; i++) on[proto[i]] = 1;
    for (i = 0; i < all.length; i++) {
      if (on[all[i].map]) { out.push(all[i]); games += all[i].games || 0; }
    }
    return { maps: out, games: games, protoTotal: proto.length };
  }

  window.TYR_CARDS.push({
    id: "world-prototype-map",
    color: "#436f83",
    big: function (T) {
      var p = protoPresent(T);
      if (!p.maps.length || !p.games) return null;
      return N(T, p.games);
    },
    sub: function (T) {
      var p = protoPresent(T), names = [], i;
      for (i = 0; i < p.maps.length; i++) names.push(X(T, p.maps[i].map));
      return (p.games === 1 ? "match, out of " : "matches, out of ") +
        N(T, matches(T).length) + ", was played on " + names.join(" and ") +
        ". The game still lists " +
        (names.length > 1 ? "them as prototypes." : "it as a prototype.");
    },
    art: function (T) {
      var p = protoPresent(T), n = matches(T).length;
      if (!n) return "";
      return A.dots(n, p.games, "#5f97b0");
    }
  });

  // ====================================================================
  // 4. The maps are barely distinguishable from each other.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-maps-alike",
    color: "#35674a",
    big: function (T) {
      var mp = bigMaps(T, 10), i, lo = null, hi = null;
      if (mp.length < 3) return null;
      for (i = 0; i < mp.length; i++) {
        var v = mp[i].avg && mp[i].avg.dmg;
        if (!isNum(v)) return null;
        if (lo == null || v < lo) lo = v;
        if (hi == null || v > hi) hi = v;
      }
      if (!lo) return null;
      return Math.round((hi / lo - 1) * 100) + "%";
    },
    sub: function (T) {
      var mp = bigMaps(T, 10), i, lo = null, hi = null, sLo = null, sHi = null;
      for (i = 0; i < mp.length; i++) {
        var v = mp[i].avg.dmg, s = mp[i].avg_survival_pct;
        if (lo == null || v < lo) lo = v;
        if (hi == null || v > hi) hi = v;
        if (isNum(s)) {
          if (sLo == null || s < sLo) sLo = s;
          if (sHi == null || s > sHi) sHi = s;
        }
      }
      return "separates the highest and lowest average damage on the " +
        mp.length + " well-played maps. Survival spans " +
        (sLo == null ? "as little" : N(T, round1(sHi - sLo)) + " points") + ".";
    },
    art: function (T) { return A.rings(bigMaps(T, 10).length, "#5fbe8b"); }
  });

  // ====================================================================
  // 5. Except one, which runs at a different speed.
  // ====================================================================
  function tempo(T) {
    var mp = bigMaps(T, 10), rows = [], i;
    for (i = 0; i < mp.length; i++) {
      var d = mp[i].avg && mp[i].avg.dmg, s = mp[i].avg_duration_sec;
      if (!isNum(d) || !isNum(s) || s <= 0) continue;
      rows.push({ map: mp[i].map, v: d / (s / 60), dur: s });
    }
    rows.sort(function (a, b) { return b.v - a.v; });
    return rows;
  }

  window.TYR_CARDS.push({
    id: "world-map-tempo",
    color: "#c0392b",
    big: function (T) {
      var r = tempo(T);
      if (r.length < 2 || !r[1].v) return null;
      return "+" + Math.round((r[0].v / r[1].v - 1) * 100) + "%";
    },
    sub: function (T) {
      var r = tempo(T);
      if (r.length < 2) return "";
      var slowest = r[0], i;
      for (i = 0; i < r.length; i++) if (r[i].dur > slowest.dur) slowest = r[i];
      return X(T, r[0].map) + " puts out more damage a minute than any other map. " +
        "It also finishes " + Math.round(slowest.dur - r[0].dur) +
        " seconds sooner than the slowest.";
    },
    art: function (T) {
      var r = tempo(T), rows = [], i;
      for (i = 0; i < r.length; i++) {
        rows.push({ k: X(T, r[i].map), v: r[i].v,
                    t: Math.round(r[i].v) + "/min", hot: i === 0 });
      }
      return namedBars(rows, "#c0392b", "#e05c46");
    }
  });

  // ====================================================================
  // 6. How much ground a kill costs.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-ground-per-kill",
    color: "#6ea8fe",
    big: function (T) {
      var s = stats(T);
      if (!isNum(s.dist_per_kill_m)) return null;
      return N(T, Math.round(s.dist_per_kill_m)) + " m";
    },
    sub: function (T) {
      var s = stats(T);
      var perMatch = isNum(s.distance_median_m)
        ? (s.distance_median_m / 1000).toFixed(1) + " km" : null;
      return "of tank movement goes into every kill." +
        (perMatch ? " A whole match moves " + perMatch + " of tank." : "");
    },
    art: function (T) {
      var s = stats(T);
      if (!isNum(s.distance_median_m) || !isNum(s.dist_per_kill_m)) return "";
      return A.twoBars(s.distance_median_m, s.dist_per_kill_m,
        (s.distance_median_m / 1000).toFixed(1) + " km",
        N(T, Math.round(s.dist_per_kill_m)) + " m", "#6ea8fe");
    }
  });

  // ====================================================================
  // 7. Two tanks fighting two different wars.
  // ====================================================================
  function killRangeEnds(T) {
    var rows = stats(T).kill_range_by_tank || [], lo = null, hi = null, i;
    for (i = 0; i < rows.length; i++) {
      if (!isNum(rows[i].value) || (rows[i].count || 0) < 30) continue;
      if (!lo || rows[i].value < lo.value) lo = rows[i];
      if (!hi || rows[i].value > hi.value) hi = rows[i];
    }
    return lo && hi && lo !== hi ? { lo: lo, hi: hi } : null;
  }

  window.TYR_CARDS.push({
    id: "world-kill-range-spread",
    color: "#c9a227",
    big: function (T) {
      var e = killRangeEnds(T);
      if (!e || !e.lo.value) return null;
      return round1(e.hi.value / e.lo.value) + "x";
    },
    sub: function (T) {
      var e = killRangeEnds(T);
      if (!e) return "";
      return "between the tank that kills furthest out and the one that kills " +
        "closest in, on the same maps.";
    },
    art: function (T) {
      var e = killRangeEnds(T);
      if (!e) return "";
      return A.spanLine(e.lo.value, e.hi.value,
        X(T, e.lo.label) + "  " + e.lo.value + " m",
        X(T, e.hi.label) + "  " + e.hi.value + " m", "#c9a227");
    }
  });

  // ====================================================================
  // 8. Tanks mostly do not move.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-standing-still",
    color: "#8a4444",
    big: function (T) {
      var s = stats(T);
      if (!isNum(s.moving_share)) return null;
      return Math.round(100 - s.moving_share) + "%";
    },
    sub: function (T) {
      return "of position samples catch a tank standing still. Under half a metre " +
        "between samples counts as still.";
    },
    art: function (T) {
      var s = stats(T);
      if (!isNum(s.moving_share)) return "";
      return A.dots(100, Math.round(100 - s.moving_share), "#c0392b",
        { per: 20, gap: 15, r: 5.4 });
    }
  });

  // ====================================================================
  // 9. Most of the playerbase in this archive passes through once.
  // ====================================================================
  function onceOnly(T) {
    var ps = (T.DATA && T.DATA.players) || [], one = 0, i;
    for (i = 0; i < ps.length; i++) if ((ps[i].games || 0) === 1) one++;
    return { one: one, total: ps.length };
  }

  window.TYR_CARDS.push({
    id: "world-one-and-done",
    color: "#a06bff",
    big: function (T) {
      var o = onceOnly(T);
      if (!o.total || !o.one) return null;
      return Math.round((o.one / o.total) * 100) + "%";
    },
    sub: function (T) {
      var o = onceOnly(T);
      return "of the " + N(T, o.total) + " players here appear in exactly one " +
        "match. " + N(T, o.one) + " people, one game each.";
    },
    art: function (T) {
      var o = onceOnly(T);
      if (!o.total) return "";
      return A.dots(100, Math.round((o.one / o.total) * 100), "#a06bff",
        { per: 20, gap: 15, r: 5.4 });
    }
  });

  // ====================================================================
  // 10. Almost nobody has been recorded on the whole map pool.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-all-six-maps",
    color: "#35674a",
    big: function (T) {
      var m = mapsPerPlayer(T);
      if (!m.maps || !m.players) return null;
      return N(T, m.buckets[m.maps - 1]);
    },
    sub: function (T) {
      var m = mapsPerPlayer(T);
      if (!m.maps) return "";
      return "players out of " + N(T, m.players) + " have been recorded on all " +
        m.maps + " maps. " + N(T, m.buckets[0]) + " have only been seen on one.";
    },
    art: function (T) {
      var m = mapsPerPlayer(T), labels = [], i;
      if (!m.maps) return "";
      for (i = 0; i < m.maps; i++) labels.push(String(i + 1));
      return columns(m.buckets, m.maps, "#5fbe8b", labels);
    }
  });

  // ====================================================================
  // 11. Squadding up buys almost nothing.
  // ====================================================================
  function squadEnds(T) {
    var rows = stats(T).squad_winrate || [], lo = null, hi = null, i;
    for (i = 0; i < rows.length; i++) {
      if (!isNum(rows[i].winrate)) continue;
      if (!lo || rows[i].winrate < lo.winrate) lo = rows[i];
      if (!hi || rows[i].winrate > hi.winrate) hi = rows[i];
    }
    return lo && hi && lo !== hi ? { lo: lo, hi: hi } : null;
  }

  window.TYR_CARDS.push({
    id: "world-squad-edge",
    color: "#436f83",
    big: function (T) {
      var e = squadEnds(T);
      if (!e) return null;
      return "+" + round1(e.hi.winrate - e.lo.winrate) + " pt";
    },
    sub: function (T) {
      var e = squadEnds(T);
      if (!e) return "";
      return "is all a " + X(T, e.hi.label).toLowerCase() + " is worth: " +
        N(T, e.hi.winrate) + "% against " + N(T, e.lo.winrate) + "% for " +
        X(T, e.lo.label).toLowerCase() + ", over " +
        N(T, e.hi.games + e.lo.games) + " games.";
    },
    art: function (T) {
      var rows = stats(T).squad_winrate || [], out = [], i, best = null;
      for (i = 0; i < rows.length; i++) {
        if (!isNum(rows[i].winrate)) continue;
        if (!best || rows[i].winrate > best) best = rows[i].winrate;
      }
      for (i = 0; i < rows.length; i++) {
        if (!isNum(rows[i].winrate)) continue;
        out.push({ k: X(T, rows[i].label), v: rows[i].winrate,
                   t: N(T, rows[i].winrate) + "%",
                   hot: rows[i].winrate === best });
      }
      return namedBars(out, "#436f83", "#5f97b0");
    }
  });

  // ====================================================================
  // 12. The live playerbase, which is not this archive.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-steam-swing",
    color: "#c9a227",
    wide: true,
    big: function (T) {
      var c = steamCounts(T);
      if (c.length < 10) return null;
      var lo = Math.min.apply(null, c), hi = Math.max.apply(null, c);
      if (!lo) return null;
      return round1(hi / lo) + "x";
    },
    sub: function (T) {
      var c = steamCounts(T);
      if (c.length < 10) return "";
      var lo = Math.min.apply(null, c), hi = Math.max.apply(null, c);
      return "in Steam's count for the whole game, over " + N(T, c.length) +
        " readings: " + N(T, hi) + " at the peak, " + N(T, lo) + " at the trough.";
    },
    art: function (T) { return trace(steamCounts(T), "#c9a227"); }
  });

  // ====================================================================
  // 13. The connection spread nobody sees on the scoreboard.
  // ====================================================================
  function pingEnds(T) {
    var h = stats(T).ping_histogram || [], lo = null, hi = null, n = 0, i;
    for (i = 0; i < h.length; i++) {
      if (!(h[i].count > 0)) continue;
      n += h[i].count;
      if (lo == null) lo = h[i].lo;
      hi = h[i].hi;
    }
    return lo == null ? null : { lo: lo, hi: hi, n: n };
  }

  window.TYR_CARDS.push({
    id: "world-ping-span",
    color: "#6ea8fe",
    big: function (T) {
      var p = pingEnds(T);
      if (!p) return null;
      return N(T, Math.round(p.hi)) + " ms";
    },
    sub: function (T) {
      var p = pingEnds(T), med = stats(T).ping_median;
      if (!p) return "";
      return "is the worst of " + N(T, p.n) + " connections recorded here. " +
        "The best is " + N(T, Math.round(p.lo)) + " ms and the median " +
        N(T, med) + ".";
    },
    art: function (T) {
      var p = pingEnds(T);
      if (!p) return "";
      return A.spanLine(p.lo, p.hi, Math.round(p.lo) + " ms",
        N(T, Math.round(p.hi)) + " ms", "#6ea8fe");
    }
  });

  // ====================================================================
  // 14. One clan is a quarter of the archive. Named, so it is gated.
  // ====================================================================
  window.TYR_CARDS.push({
    id: "world-clan-footprint",
    color: "#65508a",
    big: function (T) {
      if (!T.SHOW_PLAYER_PAGES) return null;
      var c = clanReach(T), n = matches(T).length;
      if (!c || !n || !c.members) return null;
      return Math.round((c.matches / n) * 100) + "%";
    },
    sub: function (T) {
      var c = clanReach(T), n = matches(T).length;
      if (!c) return "";
      return "of the " + N(T, n) + " matches contain someone from " + X(T, c.tag) +
        ", a roster of " + N(T, c.members) + " out of " + N(T, c.clans) + " clans.";
    },
    art: function (T) {
      var c = clanReach(T);
      if (!c) return "";
      return columns(c.ranked.slice(0, 24), 1, "#9d8ccb");
    }
  });
})();

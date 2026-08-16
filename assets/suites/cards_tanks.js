// Odd cards about the 17 tanks and their guns.
//
// Two sources disagree here and the disagreement is the interesting part:
// T.OFFICIAL is the sheet the game publishes, T.DATA and T.STATS are what the
// replays actually measured. Every number below is recomputed from those at
// render time, so a card that stops being true stops saying it.
(function () {
  window.TYR_CARDS = window.TYR_CARDS || [];
  var A = window.TYR_ART;

  // ---- small lookups -------------------------------------------------
  function sheetMap(T) {
    var list = ((T.OFFICIAL || {}).tanks) || [], m = {}, i;
    for (i = 0; i < list.length; i++) m[list[i].tank] = list[i];
    return m;
  }
  function byLabel(list) {
    var m = {}, i;
    list = list || [];
    for (i = 0; i < list.length; i++) m[list[i].label] = list[i];
    return m;
  }
  function median(arr) {
    var v = arr.slice().sort(function (a, b) { return a - b; });
    if (!v.length) return null;
    return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  }
  function playerRows(T) {
    var ms = ((T.DATA || {}).matches) || [], out = [], i, j, ps;
    for (i = 0; i < ms.length; i++) {
      ps = ms[i].players || [];
      for (j = 0; j < ps.length; j++) out.push(ps[j]);
    }
    return out;
  }

  // ---- extra shapes ---------------------------------------------------
  // One bar, with a rule across it marking where the published number sits.
  function barWithMark(v, mark, color, vLab, markLab) {
    var x0 = 6, bw = 368, mx = x0 + bw * (mark / v);
    return '<svg viewBox="0 0 380 74">' +
      '<text x="' + (mx - 5).toFixed(1) + '" y="12" fill="#7f89b3" font-size="12" ' +
      'text-anchor="end" font-family="ui-monospace,monospace">' + A.esc(markLab) + "</text>" +
      '<rect x="' + x0 + '" y="18" width="' + bw + '" height="30" rx="4" fill="' + color + '"/>' +
      '<line x1="' + mx.toFixed(1) + '" y1="14" x2="' + mx.toFixed(1) + '" y2="52" ' +
      'stroke="#0d1330" stroke-width="4"/>' +
      '<text x="' + (x0 + bw) + '" y="68" fill="#d6dcf5" font-size="12" text-anchor="end" ' +
      'font-family="ui-monospace,monospace">' + A.esc(vLab) + "</text>" + "</svg>";
  }

  // A run of bars off a common baseline. The first "lit" of them are accent.
  function skyline(vals, color, lit) {
    var n = vals.length, gap = 380 / Math.max(n, 1), bw = gap * 0.6, H = 96, mx = 0, i;
    for (i = 0; i < n; i++) mx = Math.max(mx, vals[i]);
    if (!mx) return "";
    var out = '<line x1="0" y1="' + H + '" x2="380" y2="' + H + '" stroke="#2b3457" stroke-width="2"/>';
    for (i = 0; i < n; i++) {
      var h = Math.max(2, (vals[i] / mx) * (H - 8));
      out += '<rect x="' + (i * gap + (gap - bw) / 2).toFixed(1) + '" y="' + (H - h).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' +
        (i < lit ? color : "#3a4570") + '"/>';
    }
    return '<svg viewBox="0 0 380 ' + (H + 4) + '">' + out + "</svg>";
  }

  // One row of circles, lit where the flag says so.
  function markedRow(flags, color) {
    var n = flags.length, gap = 380 / Math.max(n, 1);
    var r = Math.min(9, gap * 0.38), out = "", i;
    for (i = 0; i < n; i++) {
      out += '<circle cx="' + (i * gap + gap / 2).toFixed(1) + '" cy="12" r="' +
        (flags[i] ? r : r * 0.62).toFixed(1) + '" fill="' + (flags[i] ? color : "#2b3457") + '"/>';
    }
    return '<svg viewBox="0 0 380 26">' + out + "</svg>";
  }

  // ---- 1. measured top speed against the published top speed ----------
  // "top" in speed_by_tank is the median over player tracks of that track's
  // 95th percentile speed, so this is the typical driver, not a freak run.
  function speedFacts(T) {
    var sheet = sheetMap(T), sp = ((T.STATS || {}).speed_by_tank) || [];
    var best = null, over = 0, seen = 0, i;
    for (i = 0; i < sp.length; i++) {
      var s = sheet[sp[i].label];
      if (!s || !s.spd || !sp[i].top) continue;
      seen++;
      var r = sp[i].top / s.spd;
      if (r > 1) over++;
      if (!best || r > best.r) best = { r: r, name: sp[i].label, top: sp[i].top, spd: s.spd };
    }
    return best && seen ? { best: best, over: over, seen: seen } : null;
  }

  window.TYR_CARDS.push({
    id: "tanks-faster-than-the-sheet",
    color: "#6ea8fe",
    big: function (T) {
      var f = speedFacts(T);
      return f ? "+" + Math.round((f.best.r - 1) * 100) + "%" : null;
    },
    sub: function (T) {
      var f = speedFacts(T);
      return A.esc(f.best.name) + " clocks " + f.best.top + " km/h. The sheet says " +
        f.best.spd + ". " + f.over + " of " + f.seen + " tanks beat their printed top speed.";
    },
    art: function (T) {
      var f = speedFacts(T);
      return barWithMark(f.best.top, f.best.spd, "#6ea8fe",
        "replays  " + f.best.top + " km/h", "sheet  " + f.best.spd);
    }
  });

  // ---- 2. every tank carries more health than the sheet gives it -------
  function hpFacts(T) {
    var sheet = sheetMap(T), hp = ((T.STATS || {}).tank_max_hp) || [];
    var rows = [], i;
    for (i = 0; i < hp.length; i++) {
      var s = sheet[hp[i].label];
      if (!s || !s.hp || !hp[i].value) continue;
      rows.push({ name: hp[i].label, r: hp[i].value / s.hp, seen: hp[i].value, sheet: s.hp });
    }
    if (!rows.length) return null;
    rows.sort(function (a, b) { return b.r - a.r; });
    var over = 0;
    for (i = 0; i < rows.length; i++) if (rows[i].r > 1) over++;
    return { rows: rows, over: over };
  }

  window.TYR_CARDS.push({
    id: "tanks-health-over-sheet",
    color: "#35674a",
    wide: true,
    big: function (T) {
      var f = hpFacts(T);
      return f ? f.over + " / " + f.rows.length : null;
    },
    sub: function (T) {
      var f = hpFacts(T), t = f.rows[0];
      return "tanks carry more health than the sheet gives them. " +
        A.esc(t.name) + " holds " + T.fmtNum(t.seen) + " where the sheet says " +
        T.fmtNum(t.sheet) + ".";
    },
    art: function (T) {
      var f = hpFacts(T), vals = [], i;
      for (i = 0; i < f.rows.length; i++) vals.push(f.rows[i].r - 1);
      return skyline(vals, "#35674a", f.over);
    }
  });

  // ---- 3. the difficulty rating runs backwards -------------------------
  function diffFacts(T) {
    var sheet = sheetMap(T), meas = ((T.DATA || {}).tanks) || [];
    var g = {}, i, keys = [], k;
    for (i = 0; i < meas.length; i++) {
      var s = sheet[meas[i].tank];
      if (!s || s.difficulty == null || meas[i].winrate == null || !meas[i].games) continue;
      k = s.difficulty;
      if (!g[k]) { g[k] = { w: 0, n: 0, tanks: 0 }; keys.push(k); }
      g[k].w += meas[i].winrate * meas[i].games;
      g[k].n += meas[i].games;
      g[k].tanks++;
    }
    if (keys.length < 2) return null;
    keys.sort(function (a, b) { return a - b; });
    var lo = keys[0], hi = keys[keys.length - 1];
    return {
      lo: lo, hi: hi,
      loWr: g[lo].w / g[lo].n, hiWr: g[hi].w / g[hi].n,
      loTanks: g[lo].tanks, hiTanks: g[hi].tanks,
      loGames: g[lo].n, hiGames: g[hi].n
    };
  }

  window.TYR_CARDS.push({
    id: "tanks-difficulty-backwards",
    color: "#a06bff",
    big: function (T) {
      var f = diffFacts(T);
      return f ? (Math.round(f.hiWr * 10) / 10) + "%" : null;
    },
    sub: function (T) {
      var f = diffFacts(T);
      return "The " + f.hiTanks + " tanks rated hardest to drive win this much. The " +
        f.loTanks + " rated easiest win " + (Math.round(f.loWr * 10) / 10) + "%.";
    },
    art: function (T) {
      var f = diffFacts(T);
      return A.twoBars(f.loWr, f.hiWr,
        "rated " + f.lo + "   " + (Math.round(f.loWr * 10) / 10) + "%",
        "rated " + f.hi + "   " + (Math.round(f.hiWr * 10) / 10) + "%", "#a06bff");
    }
  });

  // ---- 4. camouflage predicts who dies first, the wrong way round ------
  function camoFacts(T) {
    var sheet = ((T.OFFICIAL || {}).tanks || []).slice();
    var fd = byLabel((T.STATS || {}).first_down_by_tank);
    sheet = sheet.filter(function (t) { return t.camo != null && fd[t.tank]; });
    if (sheet.length < 10) return null;
    sheet.sort(function (a, b) { return b.camo - a.camo; });
    function pool(list) {
      var c = 0, n = 0, i;
      for (i = 0; i < list.length; i++) { c += fd[list[i].tank].count; n += fd[list[i].tank].games; }
      return n ? c / n * 100 : 0;
    }
    var k = 5;
    var top = sheet.slice(0, k), bot = sheet.slice(sheet.length - k);
    var a = pool(top), b = pool(bot);
    if (!b) return null;
    return {
      k: k, a: a, b: b, ratio: a / b,
      hiCamo: top[0].camo, loCamo: bot[bot.length - 1].camo
    };
  }

  window.TYR_CARDS.push({
    id: "tanks-camo-dies-first",
    color: "#436f83",
    big: function (T) {
      var f = camoFacts(T);
      return f ? (Math.round(f.ratio * 10) / 10) + "x" : null;
    },
    sub: function (T) {
      var f = camoFacts(T);
      return "more likely to be first killed. The " + f.k +
        " best-camouflaged tanks against the " + f.k + " worst. Camo runs " +
        f.loCamo + " to " + f.hiCamo + ".";
    },
    art: function (T) {
      var f = camoFacts(T);
      return A.twoBars(f.a, f.b,
        "camo " + f.hiCamo + "-end   " + (Math.round(f.a * 10) / 10) + "%",
        "camo " + f.loCamo + "-end   " + (Math.round(f.b * 10) / 10) + "%", "#436f83");
    }
  });

  // ---- 5. nobody fires their gun ---------------------------------------
  // Sheet damage divided by sheet reload is the most damage a minute of
  // uninterrupted firing can produce. Measured dpm is damage per minute alive.
  function paperFacts(T) {
    var sheet = sheetMap(T), meas = ((T.DATA || {}).tanks) || [];
    var rows = [], i;
    for (i = 0; i < meas.length; i++) {
      var s = sheet[meas[i].tank];
      if (!s || !s.dmg || !s.reload_s || !meas[i].dpm) continue;
      rows.push({ name: meas[i].tank, r: meas[i].dpm / (s.dmg / s.reload_s * 60) });
    }
    if (rows.length < 5) return null;
    rows.sort(function (a, b) { return a.r - b.r; });
    var vals = [], half = 0;
    for (i = 0; i < rows.length; i++) { vals.push(rows[i].r); if (rows[i].r >= 0.5) half++; }
    return { rows: rows, med: median(vals), worst: rows[0], best: rows[rows.length - 1], half: half };
  }

  window.TYR_CARDS.push({
    id: "tanks-paper-dpm",
    color: "#c9a227",
    big: function (T) {
      var f = paperFacts(T);
      return f ? Math.round(f.med * 100) + "%" : null;
    },
    sub: function (T) {
      var f = paperFacts(T);
      return "of its gun's paper damage rate is what the median tank deals. " +
        A.esc(f.worst.name) + " manages " + Math.round(f.worst.r * 100) + "%.";
    },
    art: function (T) {
      var f = paperFacts(T);
      return A.dots(100, Math.round(f.med * 100), "#c9a227", { per: 20, gap: 15, r: 5.4 });
    }
  });

  // ---- 6. Light is not a playstyle, it is a survival penalty -----------
  function lightFacts(T) {
    var sheet = sheetMap(T), meas = ((T.DATA || {}).tanks || []).slice();
    meas = meas.filter(function (t) { return sheet[t.tank] && t.avg_survival_pct != null; });
    if (meas.length < 10) return null;
    meas.sort(function (a, b) { return b.avg_survival_pct - a.avg_survival_pct; });
    var flags = [], i, cls = {}, c;
    for (i = 0; i < meas.length; i++) {
      c = sheet[meas[i].tank]["class"];
      flags.push(c === "Light");
      if (!cls[c]) cls[c] = { w: 0, n: 0, t: 0 };
      cls[c].w += meas[i].winrate * meas[i].games;
      cls[c].n += meas[i].games;
      cls[c].t++;
    }
    if (!cls.Light || !cls.Heavy) return null;
    var lights = cls.Light.t, tail = 0;
    for (i = meas.length - lights; i < meas.length; i++) if (flags[i]) tail++;
    return {
      flags: flags, lights: lights, tail: tail,
      lightWr: cls.Light.w / cls.Light.n, heavyWr: cls.Heavy.w / cls.Heavy.n
    };
  }

  window.TYR_CARDS.push({
    id: "tanks-lights-die",
    color: "#c0392b",
    big: function (T) {
      var f = lightFacts(T);
      return f && f.tail === f.lights ? f.tail + " / " + f.lights : null;
    },
    sub: function (T) {
      var f = lightFacts(T);
      return "Light tanks fill the bottom " + f.lights + " places for survival. Lights win " +
        Math.round(f.lightWr) + "% of their games, Heavies " + Math.round(f.heavyWr) + "%.";
    },
    art: function (T) { return markedRow(lightFacts(T).flags, "#c0392b"); }
  });

  // ---- 7. class says nothing about how far you drive -------------------
  function roamFacts(T) {
    var sheet = sheetMap(T), di = ((T.STATS || {}).distance_by_tank) || [];
    var groups = {}, i, c;
    for (i = 0; i < di.length; i++) {
      var s = sheet[di[i].label];
      if (!s || !di[i].value) continue;
      c = s["class"];
      if (!groups[c]) groups[c] = [];
      groups[c].push({ name: di[i].label, v: di[i].value });
    }
    var best = null;
    for (c in groups) {
      var g = groups[c];
      if (g.length < 3) continue;
      g.sort(function (a, b) { return b.v - a.v; });
      var r = g[0].v / g[g.length - 1].v;
      if (!best || r > best.r) best = { cls: c, r: r, hi: g[0], lo: g[g.length - 1], n: g.length };
    }
    return best;
  }

  window.TYR_CARDS.push({
    id: "tanks-class-and-roaming",
    color: "#8c6739",
    big: function (T) {
      var f = roamFacts(T);
      return f ? (Math.round(f.r * 10) / 10) + "x" : null;
    },
    sub: function (T) {
      var f = roamFacts(T);
      return "between the " + A.esc(f.cls) + " that covers the most ground in a life and the " +
        "one that covers the least. Same class.";
    },
    art: function (T) {
      var f = roamFacts(T);
      return A.spanLine(f.lo.v, f.hi.v,
        f.lo.name + "  " + Math.round(f.lo.v) + " m",
        f.hi.name + "  " + Math.round(f.hi.v) + " m", "#8c6739");
    }
  });

  // ---- 8. when the sheet is wrong about reload it is wrong one way -----
  function reloadFacts(T) {
    var sheet = sheetMap(T), meas = ((T.DATA || {}).tanks) || [];
    var faster = 0, slower = 0, same = 0, worst = null, i;
    for (i = 0; i < meas.length; i++) {
      var s = sheet[meas[i].tank];
      if (!s || s.reload_s == null || meas[i].reload_sec == null) continue;
      var d = meas[i].reload_sec - s.reload_s;
      if (d < 0) faster++; else if (d > 0) slower++; else same++;
      if (!worst || d < worst.d) {
        worst = { d: d, name: meas[i].tank, meas: meas[i].reload_sec, sheet: s.reload_s };
      }
    }
    return worst && faster ? { faster: faster, slower: slower, same: same, worst: worst } : null;
  }

  window.TYR_CARDS.push({
    id: "tanks-reload-only-faster",
    color: "#65508a",
    big: function (T) {
      var f = reloadFacts(T);
      return f ? (Math.round(-f.worst.d * 100) / 100) + " s" : null;
    },
    sub: function (T) {
      var f = reloadFacts(T);
      return A.esc(f.worst.name) + " reloads that much faster than the sheet says. " + f.faster +
        " tanks beat their printed reload, " + f.slower + " fall short.";
    },
    art: function (T) {
      var f = reloadFacts(T);
      return A.twoBars(f.worst.meas, f.worst.sheet,
        f.worst.name + " measured  " + f.worst.meas + "s",
        "sheet  " + f.worst.sheet + "s", "#65508a");
    }
  });

  // ---- 9. the three nobody picks are the three that win ----------------
  function rareFacts(T) {
    var meas = ((T.DATA || {}).tanks || []).filter(function (t) {
      return t.pick_rate != null && t.winrate != null && t.games;
    });
    if (meas.length < 8) return null;
    var byPick = meas.slice().sort(function (a, b) { return a.pick_rate - b.pick_rate; });
    var byWin = meas.slice().sort(function (a, b) { return b.winrate - a.winrate; });
    var k = 3, i, set = {}, hit = 0;
    for (i = 0; i < k; i++) set[byPick[i].tank] = 1;
    for (i = 0; i < k; i++) if (set[byWin[i].tank]) hit++;
    function pool(list) {
      var w = 0, n = 0, j;
      for (j = 0; j < list.length; j++) { w += list[j].winrate * list[j].games; n += list[j].games; }
      return { wr: n ? w / n : 0, n: n };
    }
    var rare = pool(byPick.slice(0, k)), rest = pool(byPick.slice(k));
    var vals = [], j;
    for (j = 0; j < byPick.length; j++) vals.push(byPick[j].winrate);
    return { k: k, hit: hit, rare: rare, rest: rest, vals: vals, names: [byPick[0].tank, byPick[1].tank, byPick[2].tank] };
  }

  window.TYR_CARDS.push({
    id: "tanks-rare-and-winning",
    color: "#c9a227",
    wide: true,
    big: function (T) {
      var f = rareFacts(T);
      return f && f.hit === f.k ? f.hit + " / " + f.k : null;
    },
    sub: function (T) {
      var f = rareFacts(T);
      return "of the game's least-picked tanks also have its best win rates. " +
        A.esc(f.names.join(", ")) + " win " + Math.round(f.rare.wr) + "%; the rest " +
        Math.round(f.rest.wr) + "%.";
    },
    art: function (T) {
      var f = rareFacts(T);
      return skyline(f.vals, "#c9a227", f.k);
    }
  });

  // ---- 10. one tank owns the kill table --------------------------------
  function matrixFacts(T) {
    var M = (T.STATS || {}).tank_matchup_matrix;
    if (!M || !M.tanks || !M.counts) return null;
    var ts = M.tanks, C = M.counts, pairs = [], i, j;
    for (i = 0; i < ts.length; i++) {
      for (j = 0; j < ts.length; j++) {
        if (C[i] && C[i][j]) pairs.push({ n: C[i][j], killer: ts[i], victim: ts[j] });
      }
    }
    if (pairs.length < 10) return null;
    pairs.sort(function (a, b) { return b.n - a.n; });
    var top = pairs[0].killer, run = 0;
    while (run < pairs.length && pairs[run].killer === top) run++;
    return { pairs: pairs, top: top, run: run, first: pairs[0] };
  }

  window.TYR_CARDS.push({
    id: "tanks-one-killer",
    color: "#8a4444",
    big: function (T) {
      var f = matrixFacts(T);
      return f && f.run > 2 ? String(f.run) : null;
    },
    sub: function (T) {
      var f = matrixFacts(T);
      return "most common tank-versus-tank kills. " + A.esc(f.top) +
        " holds the gun in every one. Top of the list is " + A.esc(f.first.killer) +
        " killing " + A.esc(f.first.victim) + ".";
    },
    art: function (T) {
      var f = matrixFacts(T);
      return A.dots(Math.min(f.pairs.length, f.run * 2), f.run, "#8a4444",
        { per: 14, gap: 26, r: 10 });
    }
  });

  // ---- 11. one gun on the sheet is missing its magazine -----------------
  // dmg / reload_s is a hard ceiling for a single-shot gun: this many
  // seconds of firing are needed to deal that damage. Games that beat it
  // while alive are games the published gun cannot explain.
  function ceilingFacts(T) {
    var sheet = sheetMap(T), rows = playerRows(T);
    var counts = {}, over = [], order = [], i, t, s, need, alive;
    for (i = 0; i < rows.length; i++) {
      s = sheet[rows[i].tank];
      alive = rows[i].survival_sec;
      if (!s || !s.dmg || !s.reload_s || !alive || !rows[i].dmg) continue;
      need = rows[i].dmg / s.dmg * s.reload_s;
      if (need <= alive) continue;
      t = rows[i].tank;
      if (!counts[t]) { counts[t] = 0; order.push(t); }
      counts[t]++;
      over.push({ r: need / alive, tank: t, dmg: rows[i].dmg, alive: alive,
                  cap: alive / s.reload_s * s.dmg, shell: s.dmg, reload: s.reload_s });
    }
    if (!over.length) return null;
    order.sort(function (a, b) { return counts[b] - counts[a]; });
    var top = order[0], worst = null;
    for (i = 0; i < over.length; i++) {
      if (over[i].tank !== top) continue;
      if (!worst || over[i].r > worst.r) worst = over[i];
    }
    if (!worst) return null;
    return { top: top, n: counts[top], worst: worst, total: over.length };
  }

  window.TYR_CARDS.push({
    id: "tanks-missing-magazine",
    color: "#a06bff",
    big: function (T) {
      var f = ceilingFacts(T);
      return f && f.n > 5 ? String(f.n) : null;
    },
    sub: function (T) {
      var f = ceilingFacts(T);
      return A.esc(f.top) + " games dealt more damage than " + f.worst.shell + " every " +
        f.worst.reload + " s allows. The sheet lists no magazine.";
    },
    art: function (T) {
      var f = ceilingFacts(T);
      return A.twoBars(f.worst.dmg, f.worst.cap,
        "dealt  " + T.fmtNum(f.worst.dmg),
        "gun's ceiling  " + T.fmtNum(Math.round(f.worst.cap)), "#a06bff");
    }
  });

  // ---- 12. the tank that mostly does not shoot --------------------------
  function assistFacts(T) {
    var meas = ((T.DATA || {}).tanks) || [], share = byLabel((T.STATS || {}).assist_share_by_tank);
    var flip = [], best = null, i, a;
    for (i = 0; i < meas.length; i++) {
      a = meas[i].avg || {};
      if (a.dmg == null || a.assist == null) continue;
      if (a.assist > a.dmg) flip.push(meas[i]);
      var sh = share[meas[i].tank];
      if (sh && (!best || sh.value > best.v)) best = { name: meas[i].tank, v: sh.value, avg: a };
    }
    if (!best || flip.length !== 1 || flip[0].tank !== best.name) return null;
    return { best: best, flip: flip.length };
  }

  window.TYR_CARDS.push({
    id: "tanks-assist-over-damage",
    color: "#436f83",
    big: function (T) {
      var f = assistFacts(T);
      return f ? Math.round(f.best.v) + "%" : null;
    },
    sub: function (T) {
      var f = assistFacts(T);
      return "of what " + A.esc(f.best.name) + " contributes is somebody else's damage. The " +
        "only tank that assists more than it shoots.";
    },
    art: function (T) {
      var f = assistFacts(T);
      return A.twoBars(f.best.avg.assist, f.best.avg.dmg,
        "assist  " + T.fmtNum(Math.round(f.best.avg.assist)),
        "damage  " + T.fmtNum(Math.round(f.best.avg.dmg)), "#436f83");
    }
  });

  // ---- 13. one tank reverses faster than others drive -------------------
  function reverseFacts(T) {
    var list = ((T.OFFICIAL || {}).tanks) || [];
    var best = null, i, j, beat, slowest = null;
    for (i = 0; i < list.length; i++) {
      if (list[i].reverse_spd == null) continue;
      if (!best || list[i].reverse_spd > best.reverse_spd) best = list[i];
      if (list[i].spd != null && (!slowest || list[i].spd < slowest.spd)) slowest = list[i];
    }
    if (!best || !slowest) return null;
    beat = [];
    for (j = 0; j < list.length; j++) {
      if (list[j].spd != null && list[j].spd < best.reverse_spd) beat.push(list[j].tank);
    }
    return beat.length ? { best: best, beat: beat.length, slowest: slowest } : null;
  }

  window.TYR_CARDS.push({
    id: "tanks-reverse-gear",
    color: "#c9a227",
    big: function (T) {
      var f = reverseFacts(T);
      return f ? f.best.reverse_spd + " km/h" : null;
    },
    sub: function (T) {
      var f = reverseFacts(T);
      return "is how fast " + A.esc(f.best.tank) + " goes backwards. " + f.beat +
        " tanks are slower than that going forwards.";
    },
    art: function (T) {
      var f = reverseFacts(T);
      return A.spanLine(f.slowest.spd, f.best.reverse_spd,
        f.slowest.tank + " forwards  " + f.slowest.spd,
        f.best.tank + " backwards  " + f.best.reverse_spd, "#c9a227");
    }
  });

  // ---- 14. trading badly and winning anyway -----------------------------
  function tradeFacts(T) {
    var kills = byLabel((T.STATS || {}).tank_kills), deaths = byLabel((T.STATS || {}).tank_deaths);
    var meas = ((T.DATA || {}).tanks) || [], rows = [], i;
    for (i = 0; i < meas.length; i++) {
      var k = kills[meas[i].tank], d = deaths[meas[i].tank];
      if (!k || !d || !d.count) continue;
      rows.push({ name: meas[i].tank, kd: k.count / d.count, wr: meas[i].winrate,
                  kills: k.count, deaths: d.count });
    }
    if (rows.length < 8) return null;
    var byKd = rows.slice().sort(function (a, b) { return a.kd - b.kd; });
    var byWr = rows.slice().sort(function (a, b) { return b.wr - a.wr; });
    var bottom = byKd.slice(0, 5), best = null, i2;
    for (i2 = 0; i2 < bottom.length; i2++) {
      if (!best || bottom[i2].wr > best.wr) best = bottom[i2];
    }
    var wrRank = 1, kdRank = 1;
    for (i2 = 0; i2 < byWr.length; i2++) if (byWr[i2].name === best.name) wrRank = i2 + 1;
    for (i2 = 0; i2 < byKd.length; i2++) if (byKd[i2].name === best.name) kdRank = i2 + 1;
    return { best: best, wrRank: wrRank, kdRank: kdRank, n: rows.length };
  }

  window.TYR_CARDS.push({
    id: "tanks-bad-trades-good-wins",
    color: "#c0392b",
    big: function (T) {
      var f = tradeFacts(T);
      if (!f || f.wrRank > 5) return null;
      return String(Math.round(f.best.kd * 100) / 100);
    },
    sub: function (T) {
      var f = tradeFacts(T);
      return "kills per death for " + A.esc(f.best.name) + ", " + f.kdRank + " of " + f.n +
        " from the bottom. Its win rate is " + f.wrRank + " of " + f.n + " from the top.";
    },
    art: function (T) {
      var f = tradeFacts(T);
      return A.dots(f.best.kills + f.best.deaths, f.best.kills, "#c0392b",
        { per: 45, gap: 8, r: 3.1 });
    }
  });
})();

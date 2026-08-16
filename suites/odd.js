// Odd — nine things that are true, each with one picture.
//
// The analytical suites went too far: too many controls, too many clever
// encodings, too much reading. This is the opposite. One fact per card, one
// number big enough to see from across the room, one shape that makes the
// fact obvious. Nothing to click, nothing to configure, nothing to work out.
//
// Every number is computed from the data at render time rather than typed in,
// so a card that stops being true stops saying it.
(function () {
  var CSS =
    ".odd-wrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}" +
    ".odd-card{position:relative;border:1px solid var(--border);border-radius:14px;" +
      "background:var(--panel);padding:20px 20px 18px;overflow:hidden;min-height:250px;" +
      "display:flex;flex-direction:column}" +
    ".odd-card::before{content:'';position:absolute;inset:0 0 auto 0;height:3px;background:var(--oc)}" +
    ".odd-big{font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:2.9rem;" +
      "line-height:1;color:var(--oc);letter-spacing:-1px}" +
    ".odd-sub{font-size:.82rem;color:var(--dim);margin-top:6px;line-height:1.45}" +
    ".odd-art{margin-top:auto;padding-top:16px}" +
    ".odd-art svg{width:100%;height:auto;display:block}" +
    ".odd-wide{grid-column:1/-1}" +
    "@media (max-width:520px){.odd-big{font-size:2.2rem}}";

  var E = function (s) { return String(s == null ? "" : s); };

  // ---- small drawing helpers ----------------------------------------
  // Deliberately blunt: bars, dots and one line. If a card needs an axis it
  // is the wrong card for this page.

  function dots(total, lit, color, opts) {
    opts = opts || {};
    var per = opts.per || 28, r = opts.r || 4.6, gap = opts.gap || 12.4;
    var rows = Math.ceil(total / per);
    var W = per * gap, H = rows * gap;
    var out = "", i;
    for (i = 0; i < total; i++) {
      var x = (i % per) * gap + gap / 2, y = Math.floor(i / per) * gap + gap / 2;
      var on = i < lit;
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' +
        (on ? r : r * 0.72).toFixed(1) + '" fill="' + (on ? color : "#2b3457") + '"/>';
    }
    return '<svg viewBox="0 0 ' + W + " " + H.toFixed(1) + '">' + out + "</svg>";
  }

  function twoBars(a, b, aLab, bLab, color) {
    var max = Math.max(a, b, 1);
    function bar(v, lab, y, col) {
      var w = Math.max(v > 0 ? 2 : 0, (v / max) * 300);
      return '<rect x="0" y="' + y + '" width="' + w.toFixed(1) + '" height="26" rx="4" fill="' + col + '"/>' +
        '<text x="' + (w + 8).toFixed(1) + '" y="' + (y + 18) + '" fill="#d6dcf5" font-size="13" ' +
        'font-family="ui-monospace,monospace">' + E(lab) + "</text>";
    }
    return '<svg viewBox="0 0 380 74">' + bar(a, aLab, 0, color) +
      bar(b, bLab, 38, "#3a4570") + "</svg>";
  }

  function barRow(items, color) {
    var max = 1, i;
    for (i = 0; i < items.length; i++) max = Math.max(max, Math.abs(items[i].v));
    var out = "", y = 0;
    for (i = 0; i < items.length; i++) {
      var w = (Math.abs(items[i].v) / max) * 250;
      out += '<text x="0" y="' + (y + 14) + '" fill="#7f89b3" font-size="12">' + E(items[i].k) + "</text>" +
        '<rect x="74" y="' + (y + 3) + '" width="' + w.toFixed(1) + '" height="14" rx="3" fill="' +
        (items[i].v >= 100 ? color : "#3a4570") + '"/>' +
        '<text x="' + (78 + w).toFixed(1) + '" y="' + (y + 15) + '" fill="#d6dcf5" font-size="12" ' +
        'font-family="ui-monospace,monospace">+' + Math.round(items[i].v) + "%</text>";
      y += 22;
    }
    return '<svg viewBox="0 0 380 ' + y + '">' + out + "</svg>";
  }

  function rings(n, color) {
    var per = 9, gap = 40, out = "", i;
    var rows = Math.ceil(n / per);
    for (i = 0; i < n; i++) {
      var x = (i % per) * gap + gap / 2, y = Math.floor(i / per) * gap + gap / 2;
      out += '<circle cx="' + x + '" cy="' + y + '" r="15" fill="none" stroke="' + color +
        '" stroke-width="2.2" opacity="0.9"/>';
    }
    return '<svg viewBox="0 0 ' + (per * gap) + " " + (rows * gap) + '">' + out + "</svg>";
  }

  function spanLine(lo, hi, loLab, hiLab, color) {
    return '<svg viewBox="0 0 380 62">' +
      '<line x1="14" y1="26" x2="366" y2="26" stroke="#2b3457" stroke-width="3"/>' +
      '<circle cx="14" cy="26" r="9" fill="' + color + '"/>' +
      '<circle cx="366" cy="26" r="9" fill="' + color + '"/>' +
      '<text x="14" y="52" fill="#d6dcf5" font-size="12" text-anchor="start" ' +
      'font-family="ui-monospace,monospace">' + E(loLab) + "</text>" +
      '<text x="366" y="52" fill="#d6dcf5" font-size="12" text-anchor="end" ' +
      'font-family="ui-monospace,monospace">' + E(hiLab) + "</text>" + "</svg>";
  }

  // ---- the numbers, all computed ------------------------------------
  function facts(T) {
    var D = T.DATA || {}, S = T.STATS || {}, O = T.OFFICIAL || {};
    var matches = D.matches || [];
    var rows = [], i, j, m, p;
    for (i = 0; i < matches.length; i++) {
      var ps = matches[i].players || [];
      for (j = 0; j < ps.length; j++) rows.push(ps[j]);
    }

    var blocked = {}, games = {};
    for (i = 0; i < rows.length; i++) {
      p = rows[i];
      if (!p.tank) continue;
      blocked[p.tank] = (blocked[p.tank] || 0) + (p.blocked || 0);
      games[p.tank] = (games[p.tank] || 0) + 1;
    }
    var never = null, most = null, k;
    for (k in games) {
      if (blocked[k] === 0 && (!never || games[k] > games[never])) never = k;
      if (!most || blocked[k] > blocked[most]) most = k;
    }

    var noKill = 0, withDmg = 0;
    for (i = 0; i < rows.length; i++) {
      if ((rows[i].dmg || 0) > 0) {
        withDmg++;
        if (!(rows[i].kills > 0)) noKill++;
      }
    }

    // winner against loser, per stat
    var W = {}, L = {}, keys = ["kills", "assist", "dmg", "blocked"];
    for (i = 0; i < keys.length; i++) { W[keys[i]] = [0, 0]; L[keys[i]] = [0, 0]; }
    for (i = 0; i < matches.length; i++) {
      m = matches[i];
      if (m.winning_team !== 0 && m.winning_team !== 1) continue;
      var ps2 = m.players || [];
      for (j = 0; j < ps2.length; j++) {
        p = ps2[j];
        var into = p.team === m.winning_team ? W : L;
        for (var q = 0; q < keys.length; q++) {
          if (p[keys[q]] != null) { into[keys[q]][0] += p[keys[q]]; into[keys[q]][1]++; }
        }
      }
    }
    var gaps = [];
    for (i = 0; i < keys.length; i++) {
      var a = W[keys[i]][1] ? W[keys[i]][0] / W[keys[i]][1] : 0;
      var b = L[keys[i]][1] ? L[keys[i]][0] / L[keys[i]][1] : 0;
      if (b) gaps.push({ k: keys[i] === "dmg" ? "damage" : keys[i], v: (a / b - 1) * 100 });
    }
    gaps.sort(function (x, y) { return y.v - x.v; });

    // reload, measured against the published sheet
    var pub = {}, tanks = O.tanks || [];
    for (i = 0; i < tanks.length; i++) pub[tanks[i].tank] = tanks[i].reload_s;
    var exact = 0, haveBoth = 0;
    var mt = D.tanks || [];
    for (i = 0; i < mt.length; i++) {
      if (mt[i].reload_sec == null || pub[mt[i].tank] == null) continue;
      haveBoth++;
      if (mt[i].reload_sec === pub[mt[i].tank]) exact++;
    }

    // slowest and fastest gun on the sheet
    var lo = null, hi = null;
    for (i = 0; i < tanks.length; i++) {
      if (tanks[i].reload_s == null) continue;
      if (!lo || tanks[i].reload_s < lo.reload_s) lo = tanks[i];
      if (!hi || tanks[i].reload_s > hi.reload_s) hi = tanks[i];
    }

    // ammunition types that are really abilities
    var am = {}, at = S.ammo_totals || [];
    for (i = 0; i < at.length; i++) am[at[i].label] = at[i].count;
    var abilityShots = (am.Heal || 0) + (am.Siege || 0);

    // how much of the archive is one person
    var who = {}, best = null;
    for (i = 0; i < matches.length; i++) {
      var seen = {}, ps3 = matches[i].players || [];
      for (j = 0; j < ps3.length; j++) {
        var nm = ps3[j].label;
        if (!nm || seen[nm]) continue;
        seen[nm] = 1;
        who[nm] = (who[nm] || 0) + 1;
        if (!best || who[nm] > who[best]) best = nm;
      }
    }

    return {
      matches: matches.length, rows: rows.length,
      never: never, neverGames: games[never] || 0,
      most: most, mostBlocked: Math.round(blocked[most] || 0),
      noKill: noKill, withDmg: withDmg,
      gaps: gaps,
      exact: exact, haveBoth: haveBoth,
      vision: (O.vision || {}).range_m, tankCount: tanks.length,
      lo: lo, hi: hi,
      heal: am.Heal || 0, siege: am.Siege || 0, abilityShots: abilityShots,
      topShare: best ? who[best] : 0,
      killMedian: S.kill_range_median, killMax: S.kill_range_max,
      killN: S.kill_range_samples,
    };
  }

  function card(color, big, sub, art, wide) {
    return '<div class="odd-card' + (wide ? " odd-wide" : "") + '" style="--oc:' + color + '">' +
      '<div class="odd-big">' + big + "</div>" +
      '<div class="odd-sub">' + sub + "</div>" +
      '<div class="odd-art">' + art + "</div></div>";
  }

  // Shared with any file that wants to add cards. Blunt on purpose: a card
  // that needs an axis or a legend is the wrong card for this page.
  window.TYR_ART = {
    dots: dots,            // dots(total, lit, color, {per, gap, r})
    twoBars: twoBars,      // twoBars(a, b, aLabel, bLabel, color)
    barRow: barRow,        // barRow([{k, v}], color) -- v is a percentage
    rings: rings,          // rings(n, color)
    spanLine: spanLine,    // spanLine(lo, hi, loLabel, hiLabel, color)
    esc: E,
  };

  // Cards from other files. Each is {id, color, big, sub, art}, where big,
  // sub and art are functions of T returning strings. Returning null from
  // big() drops the card, which is how a card whose data is missing removes
  // itself rather than rendering an empty box.
  window.TYR_CARDS = window.TYR_CARDS || [];

  function extraCards(T) {
    var list = window.TYR_CARDS || [], out = [], i;
    for (i = 0; i < list.length; i++) {
      var c = list[i];
      try {
        var big = c.big(T);
        if (big == null || big === "") continue;
        out.push(card(c.color || "#6ea8fe", big, c.sub(T) || "", c.art(T) || "", c.wide));
      } catch (e) {
        // one bad card must not cost the page
      }
    }
    return out;
  }

  function render(T) {
    var f = facts(T);
    if (!f.matches) return '<div class="panel"><p class="small">No data.</p></div>';
    var out = [];

    if (f.never) {
      out.push(card("#c0392b", "0",
        E(f.never) + " has blocked nothing in " + T.fmtNum(f.neverGames) +
        " games. " + E(f.most) + " has blocked " + T.fmtNum(f.mostBlocked) + ".",
        twoBars(0, f.mostBlocked, f.never + "  0", f.most + "  " +
          T.fmtNum(f.mostBlocked), "#c0392b")));
    }

    if (f.withDmg) {
      var pct = Math.round((f.noKill / f.withDmg) * 100);
      out.push(card("#8c6739", pct + "%",
        // The share is out of players who dealt damage, so quote that count.
        // The full player-game total read as if it were the denominator.
        "of players who deal damage finish with no kills. " + T.fmtNum(f.withDmg) + " of them.",
        dots(100, pct, "#c9a227", { per: 20, gap: 15, r: 5.4 })));
    }

    if (f.gaps.length) {
      out.push(card("#35674a", "+" + Math.round(f.gaps[f.gaps.length - 1].v) + "%",
        "Winners barely out-block losers. They more than double their kills.",
        barRow(f.gaps, "#5fbe8b")));
    }

    if (f.haveBoth) {
      out.push(card("#6ea8fe", f.exact + " / " + f.haveBoth,
        "tanks hit their published reload exactly. Measured off the replays.",
        dots(f.haveBoth, f.exact, "#6ea8fe", { per: 17, gap: 20, r: 7.5 })));
    }

    if (f.vision && f.tankCount) {
      out.push(card("#436f83", f.vision + " m",
        "vision range. The same on all " + f.tankCount + " tanks. Nobody sees further.",
        rings(f.tankCount, "#5f97b0")));
    }

    if (f.lo && f.hi) {
      out.push(card("#c9a227", Math.round(f.hi.reload_s / f.lo.reload_s) + "x",
        "between the fastest gun and the slowest.",
        spanLine(f.lo.reload_s, f.hi.reload_s,
          f.lo.tank + "  " + f.lo.reload_s + "s", f.hi.tank + "  " + f.hi.reload_s + "s",
          "#c9a227")));
    }

    if (f.abilityShots) {
      out.push(card("#a06bff", T.fmtNum(f.abilityShots),
        "shots that are not shells. Valor's heal and Arbalest's siege count as ammunition.",
        twoBars(f.heal, f.siege, "Heal  " + T.fmtNum(f.heal),
          "Siege  " + T.fmtNum(f.siege), "#a06bff")));
    }

    if (f.killN) {
      out.push(card("#8a4444", f.killMedian + " m",
        "median distance a kill happens from. The longest was " + T.fmtNum(f.killMax) +
        " m. " + T.fmtNum(f.killN) + " kills.",
        spanLine(0, f.killMax, "median " + f.killMedian + " m",
          "longest " + T.fmtNum(f.killMax) + " m", "#c0392b")));
    }

    if (T.SHOW_PLAYER_PAGES && f.topShare) {
      out.push(card("#65508a", Math.round((f.topShare / f.matches) * 100) + "%",
        "of every match here has the same player in it. It is one person's archive.",
        dots(f.matches, f.topShare, "#9d8ccb", { per: 44, gap: 8.4, r: 3.1 }), true));
    }

    out = out.concat(extraCards(T));
    return '<div class="odd-wrap">' + out.join("") + "</div>";
  }

  function preview(T) {
    var f = facts(T);
    if (!f.withDmg) return "";
    var pct = Math.round((f.noKill / f.withDmg) * 100);
    var out = '<rect x="0" y="0" width="240" height="240" fill="#151d38"/>';
    var per = 10, gap = 21, i;
    for (i = 0; i < 100; i++) {
      var x = (i % per) * gap + 25, y = Math.floor(i / per) * gap + 16;
      out += '<circle cx="' + x + '" cy="' + y + '" r="' + (i < pct ? 7.4 : 5) +
        '" fill="' + (i < pct ? "#e0b53a" : "#39456e") + '"/>';
    }
    return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice">' + out + "</svg>";
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "odd",
    title: "Odd",
    blurb: "True things, one picture each.",
    accent: "#c9a227",
    css: CSS,
    preview: preview,
    render: render,
  });
})();

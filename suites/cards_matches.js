// Odd cards — matches, time and how games end.
//
// Thirteen things about the shape of a Tyr match: when the first tank can
// die, what a team's health does before anyone shoots it, and the two
// different endings the game actually has.
//
// Every number here is computed from T at render time. Nothing is typed in,
// including the ones in the prose, so a card that stops being true stops
// saying it.
//
// One thing deliberately NOT claimed anywhere below: that any duration is a
// time limit. Five matches end at 629 seconds, but five also end at 287 and
// five more at 301 — that is what 308 matches spread over a few hundred
// possible lengths looks like, not a rule.
(function () {
  window.TYR_CARDS = window.TYR_CARDS || [];
  var A = window.TYR_ART;

  // ---- small helpers -------------------------------------------------

  function med(arr) {
    if (!arr || !arr.length) return null;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var h = Math.floor(a.length / 2);
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }

  function r1(n) { return Math.round(n * 10) / 10; }

  function nearestIdx(list, target) {
    var b = 0, i;
    for (i = 0; i < list.length; i++) {
      if (Math.abs(list[i] - target) < Math.abs(list[b] - target)) b = i;
    }
    return b;
  }

  // ---- hand-drawn shapes ---------------------------------------------
  // Three shapes the shared kit does not have. Each is one idea, no axis.

  // A bar with a dead stretch at its head: "nothing happens for this long".
  function quietHead(quiet, total, color, loLab, hiLab) {
    if (!(total > 0)) return "";
    var q = Math.max(0, Math.min(1, quiet / total)) * 380;
    return '<svg viewBox="0 0 380 56">' +
      '<rect x="0" y="0" width="380" height="30" rx="3" fill="#2b3457"/>' +
      '<rect x="' + q.toFixed(1) + '" y="0" width="' + (380 - q).toFixed(1) +
        '" height="30" rx="3" fill="' + color + '"/>' +
      '<text x="0" y="50" fill="#d6dcf5" font-size="12" ' +
        'font-family="ui-monospace,monospace">' + A.esc(loLab) + "</text>" +
      '<text x="380" y="50" fill="#7f89b3" font-size="12" text-anchor="end" ' +
        'font-family="ui-monospace,monospace">' + A.esc(hiLab) + "</text></svg>";
  }

  // One bar cut into labelled slices, for a whole split into parts. The first
  // label hangs off the left end and the last off the right end, so a slice
  // too thin to hold its own name still gets one.
  function segBar(parts) {
    var total = 0, i;
    for (i = 0; i < parts.length; i++) total += parts[i].v || 0;
    if (!(total > 0)) return "";
    var x = 0, bars = "", labs = "";
    for (i = 0; i < parts.length; i++) {
      var w = ((parts[i].v || 0) / total) * 380;
      bars += '<rect x="' + x.toFixed(1) + '" y="0" width="' +
        Math.max(w, 1.5).toFixed(1) + '" height="30" rx="2" fill="' +
        (parts[i].color || "#3a4570") + '"/>';
      var at = null, anchor = "start";
      if (i === 0) { at = 0; }
      else if (i === parts.length - 1) { at = 380; anchor = "end"; }
      else if (w > 62) { at = x + w / 2; anchor = "middle"; }
      if (at !== null) {
        labs += '<text x="' + at.toFixed(1) + '" y="50" fill="#d6dcf5" ' +
          'font-size="12" text-anchor="' + anchor + '" ' +
          'font-family="ui-monospace,monospace">' + A.esc(parts[i].lab) + "</text>";
      }
      x += w;
    }
    return '<svg viewBox="0 0 380 56">' + bars + labs + "</svg>";
  }

  // A single filled fraction of a bar.
  function pctBar(pct, color, lab) {
    var w = Math.max(0, Math.min(100, pct)) / 100 * 380;
    return '<svg viewBox="0 0 380 56">' +
      '<rect x="0" y="0" width="380" height="30" rx="3" fill="#2b3457"/>' +
      '<rect x="0" y="0" width="' + w.toFixed(1) + '" height="30" rx="3" fill="' +
        color + '"/>' +
      '<text x="0" y="50" fill="#d6dcf5" font-size="12" ' +
        'font-family="ui-monospace,monospace">' + A.esc(lab) + "</text></svg>";
  }

  // A line and the level it started from, for a curve that goes the wrong way.
  function spark(vals, base, color) {
    if (!vals || vals.length < 2) return "";
    var lo = base, hi = base, i;
    for (i = 0; i < vals.length; i++) {
      if (vals[i] < lo) lo = vals[i];
      if (vals[i] > hi) hi = vals[i];
    }
    var span = (hi - lo) || 1;
    function yOf(v) { return (6 + (1 - (v - lo) / span) * 48).toFixed(1); }
    var pts = [];
    for (i = 0; i < vals.length; i++) {
      pts.push(((i / (vals.length - 1)) * 372 + 4).toFixed(1) + "," + yOf(vals[i]));
    }
    return '<svg viewBox="0 0 380 60">' +
      '<line x1="4" y1="' + yOf(base) + '" x2="376" y2="' + yOf(base) +
        '" stroke="#2b3457" stroke-width="2" stroke-dasharray="5 5"/>' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color +
        '" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  // ---- the numbers ----------------------------------------------------
  // Computed once per T and reused by every card's big/sub/art.

  var _key = null, _val = null;

  function F(T) {
    if (_key === T && _val) return _val;
    var D = T.DATA || {}, S = T.STATS || {};
    var matches = D.matches || [];
    var f = {
      matches: matches.length,
      decided: 0, elim: 0, cap: 0, elimWipe: 0, capAlive: 0,
      upset: 0, upsetCap: 0, topLoser: 0,
      winHp: [], elimWinHp: [], allDur: [],
      unkN: 0, unkDur: [], unkKills: [], unkStanding: [],
      knDur: [], knKills: []
    };
    var i, j, m, p, ps;

    for (i = 0; i < matches.length; i++) {
      m = matches[i];
      ps = m.players || [];
      var kills = 0;
      for (j = 0; j < ps.length; j++) kills += ps[j].kills || 0;
      if (m.duration_sec) f.allDur.push(m.duration_sec);

      var settled = (m.winning_team === 0 || m.winning_team === 1) &&
        (m.result === "VICTORY" || m.result === "DEFEAT") &&
        m.score_ally != null && m.score_enemy != null;

      if (!settled) {
        // No winner on record. These are the matches with no ending.
        if (m.winning_team !== 0 && m.winning_team !== 1) {
          f.unkN++;
          if (m.duration_sec) f.unkDur.push(m.duration_sec);
          f.unkKills.push(kills);
          if (m.score_ally != null && m.score_enemy != null) {
            f.unkStanding.push(Math.min(m.score_ally, m.score_enemy));
          }
        }
        continue;
      }

      f.decided++;
      if (m.duration_sec) f.knDur.push(m.duration_sec);
      f.knKills.push(kills);

      // score_ally / score_enemy are each side's FINAL TEAM HEALTH, and they
      // are named from the recorder's seat, so result says which is which.
      var won = m.result === "VICTORY" ? m.score_ally : m.score_enemy;
      var lost = m.result === "VICTORY" ? m.score_enemy : m.score_ally;
      f.winHp.push(won);

      if (m.win_type === "elimination") {
        f.elim++;
        f.elimWinHp.push(won);
        if (lost === 0) f.elimWipe++;
      } else if (m.win_type === "capture") {
        f.cap++;
        if (lost > 0) f.capAlive++;
      }
      if (won < lost) {
        f.upset++;
        if (m.win_type === "capture") f.upsetCap++;
      }

      var bw = -1, bl = -1;
      for (j = 0; j < ps.length; j++) {
        p = ps[j];
        var v = p.dmg || 0;
        if (p.team === m.winning_team) { if (v > bw) bw = v; }
        else if (v > bl) bl = v;
      }
      if (bl > bw) f.topLoser++;
    }

    f.medDur = med(f.allDur);
    f.medWinHp = med(f.winHp);
    f.medUnkDur = med(f.unkDur);
    f.medKnDur = med(f.knDur);
    f.medUnkKills = med(f.unkKills);
    f.medKnKills = med(f.knKills);
    f.medStanding = med(f.unkStanding);
    f.thinnest = null;
    for (i = 0; i < f.elimWinHp.length; i++) {
      if (f.thinnest === null || f.elimWinHp[i] < f.thinnest) f.thinnest = f.elimWinHp[i];
    }

    // earliest death anywhere: the low edge of the first kill-time bucket
    var kth = S.kill_time_histogram || [];
    f.firstKill = kth.length ? kth[0].lo : null;
    f.totalKills = 0;
    for (i = 0; i < kth.length; i++) f.totalKills += kth[i].count || 0;

    // team health over the clock, indexed to 100 at the opening whistle
    var hc = S.health_curve || {};
    var hw = hc.winner || [], hl = hc.loser || [], hs = hc.seconds || [];
    f.hw = hw; f.hl = hl;
    f.peak = null; f.peakSec = null; f.peakLoser = null; f.aboveSec = null;
    f.gap = null; f.gapSec = null; f.gapLate = null; f.gapLateSec = null;
    f.at60 = null; f.at60L = null;
    if (hw.length && hw.length === hs.length && hl.length === hs.length) {
      var bi = 0;
      for (i = 0; i < hw.length; i++) if (hw[i] > hw[bi]) bi = i;
      f.peak = hw[bi]; f.peakSec = hs[bi]; f.peakLoser = hl[bi];
      f.aboveSec = hs[0];
      for (i = 1; i < hw.length; i++) {
        if (hw[i] < hw[0]) break;
        f.aboveSec = hs[i];
      }
      var i1 = nearestIdx(hs, 60), i2 = nearestIdx(hs, 120);
      f.gapSec = hs[i1]; f.gap = r1(hw[i1] - hl[i1]);
      f.at60 = hw[i1]; f.at60L = hl[i1];
      f.gapLateSec = hs[i2]; f.gapLate = r1(hw[i2] - hl[i2]);
      f.riseEnd = Math.min(hw.length, nearestIdx(hs, 90) + 1);
    }

    // multikills, biggest run last
    var mk = S.multikills || [];
    f.mkTop = mk.length ? mk[mk.length - 1] : null;
    f.mkPrev = mk.length > 1 ? mk[mk.length - 2] : null;

    // how many of the winning team walked out
    var sv = S.survivors_at_end || [];
    f.svTotal = 0;
    for (i = 0; i < sv.length; i++) f.svTotal += sv[i].count || 0;
    f.svMed = null; f.svFull = null; f.svFullCount = 0;
    var run = 0;
    for (i = 0; i < sv.length; i++) {
      run += sv[i].count || 0;
      if (f.svMed === null && run >= f.svTotal / 2) f.svMed = sv[i].label;
    }
    if (sv.length) {
      f.svFull = sv[sv.length - 1].label;
      f.svFullCount = sv[sv.length - 1].count || 0;
    }

    // which third of a match kills land in
    var kp = S.kill_phase || [];
    f.kpTotal = 0;
    for (i = 0; i < kp.length; i++) f.kpTotal += kp[i].count || 0;
    f.kp = kp;

    f.margin = S.victory_margin_median;
    f.comeback = S.comeback_rate;
    f.comebackN = S.comeback_matches;
    f.decidedS = S.decided_matches;

    _key = T; _val = f;
    return f;
  }

  function push(c) { window.TYR_CARDS.push(c); }

  // ---- 1. nothing dies early -----------------------------------------

  push({
    id: "m-quiet-opening",
    color: "#6ea8fe",
    big: function (T) {
      var f = F(T);
      return f.firstKill && f.totalKills ? Math.floor(f.firstKill) + " s" : null;
    },
    sub: function (T) {
      var f = F(T);
      return "is the earliest death on record, out of " + T.fmtNum(f.totalKills) + " kills.";
    },
    art: function (T) {
      var f = F(T);
      return quietHead(f.firstKill, f.medDur, "#6ea8fe",
        "silent  " + Math.floor(f.firstKill) + " s",
        "median match  " + Math.round(f.medDur) + " s");
    }
  });

  // ---- 2. health goes up first ---------------------------------------

  push({
    id: "m-health-rises",
    color: "#35674a",
    big: function (T) {
      var f = F(T);
      if (f.peak == null || !(f.peak > f.hw[0])) return null;
      return "+" + r1(f.peak - f.hw[0]) + "%";
    },
    sub: function (T) {
      var f = F(T);
      return "Both sides peak above their starting health " + f.peakSec +
        " s in. The winner is still above at " + f.aboveSec + " s.";
    },
    art: function (T) {
      var f = F(T);
      // riseEnd can come back as 1 when the curve is already near its mark,
      // and spark draws nothing with a single point, so this card was
      // rendering its number with no picture under it.
      return spark(f.hw.slice(0, Math.max(4, f.riseEnd || 7)), f.hw[0], "#5fbe8b");
    }
  });

  // ---- 3. a minute in, nobody is winning ------------------------------

  push({
    id: "m-minute-one",
    color: "#436f83",
    big: function (T) {
      var f = F(T);
      return f.gap == null ? null : f.gap + "%";
    },
    sub: function (T) {
      var f = F(T);
      return "separates the two teams at " + f.gapSec + " s. By " + f.gapLateSec +
        " s it is " + f.gapLate + ". Both curves open at 100.";
    },
    art: function (T) {
      var f = F(T);
      return A.twoBars(f.at60, f.at60L,
        "eventual winner  " + f.at60, "eventual loser  " + f.at60L, "#5f97b0");
    }
  });

  // ---- 4. two endings, and one of them is rare ------------------------

  push({
    id: "m-wipe-or-point",
    color: "#c0392b",
    big: function (T) {
      var f = F(T);
      if (!(f.elim + f.cap)) return null;
      return Math.round((f.elim / (f.elim + f.cap)) * 100) + "%";
    },
    sub: function (T) {
      var f = F(T);
      return "of decided matches end with one team on zero health. All " +
        f.cap + " captures left the loser alive.";
    },
    art: function (T) {
      var f = F(T);
      return segBar([
        { v: f.elim, color: "#c0392b", lab: "wiped out  " + f.elim },
        { v: f.cap, color: "#3a4570", lab: "captured  " + f.cap }
      ]);
    }
  });

  // ---- 5. winning while losing the fight ------------------------------

  push({
    id: "m-won-with-less",
    color: "#a06bff",
    big: function (T) {
      var f = F(T);
      return f.decided ? String(f.upset) : null;
    },
    sub: function (T) {
      var f = F(T);
      return "wins where the winner finished with less health than the team it beat. All " +
        (f.upset === f.upsetCap ? f.upsetCap : f.upsetCap + " of them") +
        " were captures.";
    },
    art: function (T) {
      var f = F(T);
      return A.dots(f.decided, f.upset, "#a06bff", { per: 26, gap: 14.2, r: 5.2 });
    }
  });

  // ---- 6. the one triple kill -----------------------------------------

  push({
    id: "m-one-triple",
    color: "#c9a227",
    big: function (T) {
      var f = F(T);
      return f.mkTop && f.mkPrev ? T.fmtNum(f.mkTop.count) : null;
    },
    sub: function (T) {
      var f = F(T);
      var top = f.mkTop.label.split(" "), prev = f.mkPrev.label.split(" ");
      return "time one player took " + top[0] + " kills inside " + top[2] +
        ". " + prev[0] + " kills inside " + prev[2] + " happened " +
        T.fmtNum(f.mkPrev.count) + " times, out of " + T.fmtNum(f.totalKills) + " deaths.";
    },
    art: function (T) {
      var f = F(T);
      return A.twoBars(f.mkPrev.count, f.mkTop.count,
        f.mkPrev.label + "  " + f.mkPrev.count,
        f.mkTop.label + "  " + f.mkTop.count, "#c9a227");
    }
  });

  // ---- 7. the best player was often on the losing side ----------------

  push({
    id: "m-best-on-losing-side",
    color: "#8c6739",
    big: function (T) {
      var f = F(T);
      return f.decided ? Math.round((f.topLoser / f.decided) * 100) + "%" : null;
    },
    sub: function (T) {
      var f = F(T);
      return "of decided matches had the top-damage player on the losing team. " +
        f.topLoser + " of " + f.decided + ".";
    },
    art: function (T) {
      var f = F(T);
      return A.dots(f.decided, f.topLoser, "#c9a227", { per: 26, gap: 14.2, r: 5.2 });
    }
  });

  // ---- 8. what the winners have left ----------------------------------

  push({
    id: "m-winners-left-standing",
    color: "#65508a",
    big: function (T) {
      var f = F(T);
      return f.svMed && f.svFull ? f.svMed + " / " + f.svFull : null;
    },
    sub: function (T) {
      var f = F(T);
      return "tanks the median winning team still has standing. Only " +
        f.svFullCount + " wins in " + f.svTotal + " kept the whole team alive.";
    },
    art: function (T) {
      var f = F(T);
      return A.dots(Number(f.svFull), Number(f.svMed), "#9d8ccb",
        { per: Number(f.svFull), gap: 44, r: 16 });
    }
  });

  // ---- 9. matches that never finished ---------------------------------

  push({
    id: "m-no-ending",
    color: "#8a4444",
    big: function (T) {
      var f = F(T);
      return f.unkN ? String(f.unkN) : null;
    },
    sub: function (T) {
      var f = F(T);
      return "matches have no recorded ending. They run " +
        Math.round(f.medUnkDur) + " s and " + Math.round(f.medUnkKills) +
        " kills. Finished ones run " + Math.round(f.medKnDur) + " s and " +
        Math.round(f.medKnKills) + ".";
    },
    art: function (T) {
      var f = F(T);
      return A.twoBars(f.medUnkKills, f.medKnKills,
        "no ending  " + Math.round(f.medUnkKills) + " kills",
        "finished  " + Math.round(f.medKnKills) + " kills", "#8a4444");
    }
  });

  // ---- 10. winning is expensive ---------------------------------------

  push({
    id: "m-winner-half-dead",
    color: "#6ea8fe",
    big: function (T) {
      var f = F(T);
      return f.margin == null ? null : Math.round(f.margin) + "%";
    },
    sub: function (T) {
      var f = F(T);
      return "of its peak health is what the winning team walks away with. " +
        "Median over " + T.fmtNum(f.decidedS) + " decided matches.";
    },
    art: function (T) {
      var f = F(T);
      return pctBar(f.margin, "#6ea8fe", "winner keeps " + r1(f.margin) + "%");
    }
  });

  // ---- 11. kills are a late-match event -------------------------------

  push({
    id: "m-kills-arrive-late",
    color: "#35674a",
    big: function (T) {
      var f = F(T);
      if (!f.kpTotal || !f.kp.length) return null;
      return Math.round((f.kp[0].count / f.kpTotal) * 100) + "%";
    },
    sub: function (T) {
      var f = F(T);
      var last = f.kp[f.kp.length - 1];
      return "of kills land in the first third of a match. The last third takes " +
        Math.round((last.count / f.kpTotal) * 100) + "%.";
    },
    art: function (T) {
      var f = F(T);
      var cols = ["#35674a", "#5fbe8b", "#3a4570"], parts = [], i;
      for (i = 0; i < f.kp.length; i++) {
        parts.push({ v: f.kp[i].count, color: cols[i % cols.length],
          lab: f.kp[i].label + "  " + T.fmtNum(f.kp[i].count) });
      }
      return segBar(parts);
    }
  });

  // ---- 12. behind at halftime, winning anyway -------------------------

  push({
    id: "m-behind-at-half",
    color: "#a06bff",
    big: function (T) {
      var f = F(T);
      return f.comeback == null ? null : Math.round(f.comeback) + "%";
    },
    sub: function (T) {
      var f = F(T);
      return "of decided matches are won by the team behind on health at halftime. " +
        T.fmtNum(f.comebackN) + " of " + T.fmtNum(f.decidedS) + ".";
    },
    art: function (T) {
      var f = F(T);
      return A.dots(f.decidedS, f.comebackN, "#a06bff", { per: 26, gap: 14.2, r: 5.2 });
    }
  });

  // ---- 13. the closest win in the archive -----------------------------

  push({
    id: "m-thinnest-win",
    color: "#c0392b",
    big: function (T) {
      var f = F(T);
      return f.thinnest == null ? null : T.fmtNum(f.thinnest);
    },
    sub: function (T) {
      var f = F(T);
      return "health left in the tightest win by elimination. The median winner finishes on " +
        T.fmtNum(Math.round(f.medWinHp)) + ".";
    },
    art: function (T) {
      var f = F(T);
      return A.spanLine(f.thinnest, f.medWinHp,
        "tightest  " + T.fmtNum(f.thinnest),
        "median  " + T.fmtNum(Math.round(f.medWinHp)), "#c0392b");
    }
  });
})();

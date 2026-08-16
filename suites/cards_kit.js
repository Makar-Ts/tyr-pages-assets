// Odd cards — ammunition, abilities, energy and modules.
//
// What a tank loads, casts and breaks. Half of these numbers are the game's
// own published sheet (T.OFFICIAL, copied from tyrhq) and half are measured
// from replays (T.STATS). The two never mean the same thing, so every card
// whose headline is a published figure says "published" in its line.
//
// Nothing here is typed in. Every number, including the published ones, is
// read out of T at render time, so a card that stops being true stops saying
// it rather than sitting there repeating a number nobody re-checked.
(function () {
  window.TYR_CARDS = window.TYR_CARDS || [];
  var A = window.TYR_ART;

  // The six columns tyrhq publishes for every shell. Counted rather than
  // assumed, so "all six multipliers" stays honest if a seventh appears.
  var MULTS = [
    "damage_mult", "penetration_mult", "reload_mult",
    "dispersion_mult", "detection_mult", "velocity_mult"
  ];

  function has(o, k) {
    return o != null && Object.prototype.hasOwnProperty.call(o, k);
  }

  // A published share (0.035) as a percentage, without the float dust that
  // 0.035 * 100 leaves behind.
  function pct(share) {
    return String(Math.round(share * 10000) / 100);
  }

  // ---- the numbers ---------------------------------------------------
  //
  // Computed once per render and cached against the T it came from, because
  // thirteen cards each walking the match list is thirteen times the work for
  // one answer.
  var CACHE = null;

  function kit(T) {
    if (CACHE && CACHE._t === T) return CACHE;

    var O = (T && T.OFFICIAL) || {};
    var S = (T && T.STATS) || {};
    var D = (T && T.DATA) || {};
    var shells = O.shells || [];
    var tanks = O.tanks || [];
    var f = { _t: T }, i, j, k;

    // --- shells, by published name -----------------------------------
    var byName = {};
    for (i = 0; i < shells.length; i++) byName[shells[i].shell] = shells[i];
    f.shell = function (n) { return has(byName, n) ? byName[n] : null; };
    f.shellCount = shells.length;

    // The names on the wire are not all the names players see. tyrhq keeps
    // the mapping, so shot counts can be added to the sheet rather than
    // guessed at.
    var drift = O._shell_name_drift || {};
    var shots = {}, sawShots = false;
    for (i = 0; i < shells.length; i++) shots[shells[i].shell] = 0;
    var at = S.ammo_totals || [];
    for (i = 0; i < at.length; i++) {
      var lab = at[i].label;
      var name = has(drift, lab) && has(shots, drift[lab]) ? drift[lab] : lab;
      if (has(shots, name)) { shots[name] += at[i].count || 0; sawShots = true; }
    }
    f.shots = sawShots ? shots : null;

    // Loudest and quietest shell, and the loudest that is not the default.
    if (sawShots) {
      var top = null, low = null, topSpec = null, secondSpec = null;
      for (i = 0; i < shells.length; i++) {
        var s = shells[i], c = shots[s.shell];
        if (top === null || c > shots[top]) top = s.shell;
        if (low === null || c < shots[low]) low = s.shell;
        if (s.group === "Standard") continue;
        if (topSpec === null || c > shots[topSpec]) {
          secondSpec = topSpec; topSpec = s.shell;
        } else if (secondSpec === null || c > shots[secondSpec]) {
          secondSpec = s.shell;
        }
      }
      f.topShell = top; f.lowShell = low;
      f.topSpec = topSpec; f.secondSpec = secondSpec;
    }

    // --- penetration --------------------------------------------------
    var pens = [];
    for (i = 0; i < tanks.length; i++) {
      if (tanks[i].pen != null) pens.push(tanks[i].pen);
    }
    f.penTanks = pens.length;
    if (pens.length) {
      f.penMin = Math.min.apply(null, pens);
      f.penMax = Math.max.apply(null, pens);
    }

    var pb = O.penetration_by_tank_mm || {};
    var penKeys = [];
    for (k in pb) if (has(pb, k)) penKeys.push(Number(k));
    penKeys.sort(function (a, b) { return a - b; });
    f.penKeys = penKeys;
    f.penBands = pb;
    var covered = 0, modeK = null, modeN = 0;
    for (i = 0; i < penKeys.length; i++) {
      var n = (pb[String(penKeys[i])] || []).length;
      covered += n;
      if (n > modeN) { modeN = n; modeK = penKeys[i]; }
    }
    f.penCovered = covered;
    f.penModeK = modeK;
    f.penModeN = modeN;

    // --- energy -------------------------------------------------------
    var E = O.energy || {};
    f.energy = E;

    // Cast costs are measured, not published: tyrhq says they vary per tank
    // and does not list them, so the pipeline reads them off the meter.
    var cc = (S.cast_costs || []).slice();
    cc.sort(function (a, b) { return Number(a.label) - Number(b.label); });
    var castTotal = 0;
    for (i = 0; i < cc.length; i++) castTotal += cc[i].count || 0;
    f.castTotal = castTotal;
    f.castCosts = cc;
    if (castTotal) {
      var run = 0;
      for (i = 0; i < cc.length; i++) {
        run += cc[i].count || 0;
        if (run >= castTotal / 2) { f.castMedian = Number(cc[i].label); break; }
      }
    }

    // How many player-lives the cast measurement covers, so casts per match
    // is scaled by a real roster rather than an assumed sixteen.
    var cbt = S.casts_by_tank || [];
    var castLives = 0;
    for (i = 0; i < cbt.length; i++) castLives += cbt[i].count || 0;
    f.castLives = castLives;

    var matches = D.matches || [];
    var rows = 0, durSum = 0, durN = 0;
    for (i = 0; i < matches.length; i++) {
      rows += (matches[i].players || []).length;
      if (matches[i].duration_sec) { durSum += matches[i].duration_sec; durN++; }
    }
    f.matches = matches.length;
    f.roster = matches.length ? rows / matches.length : 0;
    f.meanDur = durN ? durSum / durN : 0;
    if (castLives && f.roster) f.castsPerMatch = castTotal / castLives * f.roster;
    f.shotsMedian = S.shots_median;

    // When in a match abilities fire.
    var cp = S.cast_progress || [];
    var cpTotal = 0, cpMax = 0;
    for (i = 0; i < cp.length; i++) {
      cpTotal += cp[i].count || 0;
      if ((cp[i].count || 0) > cpMax) cpMax = cp[i].count;
    }
    f.castProg = cp;
    f.castProgTotal = cpTotal;
    f.castProgMax = cpMax;

    // --- modules ------------------------------------------------------
    var mods = O.modules || {};
    var seqs = [];
    for (k in mods) {
      if (!has(mods, k)) continue;
      var m = mods[k];
      if (!m || typeof m !== "object" || !m.repair_s || !m.repair_s.length) continue;
      seqs.push({ name: k, r: m.repair_s });
    }
    f.repairSeqs = seqs;
    if (seqs.length) {
      var tally = {}, bestKey = null, bestN = 0, bestR = null, longest = seqs[0];
      for (i = 0; i < seqs.length; i++) {
        var arr = seqs[i].r;
        var ratio = arr[0] / arr[arr.length - 1];
        var key = ratio.toFixed(3);
        tally[key] = (has(tally, key) ? tally[key] : 0) + 1;
        if (tally[key] > bestN) { bestN = tally[key]; bestKey = key; bestR = ratio; }
        if (arr[0] > longest.r[0]) longest = seqs[i];
      }
      f.repairRatio = bestR;
      f.repairRatioN = bestN;
      f.repairLongest = longest;
      // "the third break" is only sayable while every module has the same
      // number of steps. If the sheet ever grows one, the card says "last".
      var steps = seqs[0].r.length, same = true;
      for (i = 1; i < seqs.length; i++) if (seqs[i].r.length !== steps) same = false;
      f.repairSteps = same ? steps : null;
    }

    // --- components ---------------------------------------------------
    var comps = O.components || {};
    var abil = comps.Ability || [];
    var abilSet = {};
    for (i = 0; i < abil.length; i++) abilSet[abil[i]] = 1;
    var withAbil = 0, usedAbil = {}, nUsedAbil = 0;
    for (i = 0; i < tanks.length; i++) {
      var cs = tanks[i].components || [], hit = false;
      for (j = 0; j < cs.length; j++) {
        if (!has(abilSet, cs[j].name)) continue;
        hit = true;
        if (!has(usedAbil, cs[j].name)) { usedAbil[cs[j].name] = 1; nUsedAbil++; }
      }
      if (hit) withAbil++;
    }
    f.tankCount = tanks.length;
    f.abilPool = abil.length;
    f.abilTanks = withAbil;
    f.abilUsed = nUsedAbil;

    // --- kills inside the Momentum ramp -------------------------------
    // Bands are labelled, not numeric, so the upper edge is read out of the
    // label. "Over 500 m" has no upper edge and never counts as inside.
    var bands = S.kill_range_bands || [];
    var bTotal = 0, bWithin = 0;
    var mom = f.shell("Momentum");
    var ramp = mom && mom.extra ? mom.extra.damage_ramp_distance_m : null;
    for (i = 0; i < bands.length; i++) {
      var cnt = bands[i].count || 0;
      bTotal += cnt;
      if (ramp == null) continue;
      var text = String(bands[i].label || "");
      if (text.indexOf("Over") === 0) continue;
      var nums = text.match(/\d+/g);
      if (!nums) continue;
      var hi = 0;
      for (j = 0; j < nums.length; j++) hi = Math.max(hi, Number(nums[j]));
      if (hi <= ramp) bWithin += cnt;
    }
    f.killBands = bands;
    f.killTotal = bTotal;
    f.killWithin = bWithin;
    f.ramp = ramp;

    CACHE = f;
    return f;
  }

  // ---- hand drawn shapes ----------------------------------------------
  // One idea each, no axes, no legends, viewBox only so they scale.

  function penColumns(f, color) {
    var keys = f.penKeys, i, j;
    if (!keys || !keys.length) return "";
    var colW = 380 / keys.length;
    var H = 26 + Math.max(1, f.penModeN) * 15;
    var out = "";
    for (i = 0; i < keys.length; i++) {
      var cx = i * colW + colW / 2;
      var n = (f.penBands[String(keys[i])] || []).length;
      for (j = 0; j < n; j++) {
        out += '<circle cx="' + cx.toFixed(1) + '" cy="' + (H - 20 - j * 15).toFixed(1) +
          '" r="5.4" fill="' + color + '"/>';
      }
      out += '<text x="' + cx.toFixed(1) + '" y="' + (H - 2) + '" fill="#7f89b3" ' +
        'font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">' +
        keys[i] + "</text>";
    }
    return '<svg viewBox="0 0 380 ' + H.toFixed(1) + '">' + out + "</svg>";
  }

  function splitBar(share, color, leftLab, rightLab) {
    var w = Math.max(0, Math.min(1, share)) * 380;
    return '<svg viewBox="0 0 380 52">' +
      '<rect x="0" y="6" width="380" height="24" rx="5" fill="#2b3457"/>' +
      '<rect x="0" y="6" width="' + w.toFixed(1) + '" height="24" rx="5" fill="' + color + '"/>' +
      '<line x1="' + w.toFixed(1) + '" y1="0" x2="' + w.toFixed(1) +
      '" y2="36" stroke="#d6dcf5" stroke-width="2"/>' +
      '<text x="0" y="48" fill="#d6dcf5" font-size="12" ' +
      'font-family="ui-monospace,monospace">' + A.esc(leftLab) + "</text>" +
      '<text x="380" y="48" fill="#7f89b3" font-size="12" text-anchor="end" ' +
      'font-family="ui-monospace,monospace">' + A.esc(rightLab) + "</text></svg>";
  }

  function shrinkBars(seq, color) {
    var max = seq[0], out = "", i;
    for (i = 0; i < seq.length; i++) {
      var w = Math.max(4, (seq[i] / max) * 280);
      out += '<rect x="0" y="' + (i * 30 + 4) + '" width="' + w.toFixed(1) +
        '" height="20" rx="4" fill="' + color + '" opacity="' + (1 - i * 0.18).toFixed(2) + '"/>' +
        '<text x="' + (w + 9).toFixed(1) + '" y="' + (i * 30 + 19) +
        '" fill="#d6dcf5" font-size="12" font-family="ui-monospace,monospace">break ' +
        (i + 1) + "  " + seq[i] + "s</text>";
    }
    return '<svg viewBox="0 0 380 ' + (seq.length * 30) + '">' + out + "</svg>";
  }

  function columns(vals, hiIndex, color) {
    var max = 1, i;
    for (i = 0; i < vals.length; i++) max = Math.max(max, vals[i]);
    var colW = 380 / Math.max(1, vals.length), H = 88, out = "";
    for (i = 0; i < vals.length; i++) {
      var h = Math.max(2, (vals[i] / max) * (H - 10));
      out += '<rect x="' + (i * colW + 2).toFixed(1) + '" y="' + (H - h).toFixed(1) +
        '" width="' + (colW - 5).toFixed(1) + '" height="' + h.toFixed(1) +
        '" rx="3" fill="' + (i === hiIndex ? color : "#3a4570") + '"/>';
    }
    return '<svg viewBox="0 0 380 ' + H + '">' + out + "</svg>";
  }

  // ---- the cards -------------------------------------------------------

  // High Explosive replaces penetration with a flat number rather than
  // multiplying it, which sounds like a trade and is not one: the flat number
  // is below every gun in the game.
  window.TYR_CARDS.push({
    id: "kit-he-fixed-pen",
    color: "#c0392b",
    big: function (T) {
      var f = kit(T), he = f.shell("High Explosive");
      if (!he || !he.extra || he.extra.penetration_fixed_mm == null) return null;
      if (!f.penTanks) return null;
      var gain = 0, tanks = (T.OFFICIAL || {}).tanks || [], i;
      for (i = 0; i < tanks.length; i++) {
        if (tanks[i].pen != null && tanks[i].pen < he.extra.penetration_fixed_mm) gain++;
      }
      return gain + " / " + f.penTanks;
    },
    sub: function (T) {
      var f = kit(T), he = f.shell("High Explosive");
      return "tanks gain penetration from High Explosive's published " +
        he.extra.penetration_fixed_mm + " mm. The weakest gun already makes " + f.penMin + " mm.";
    },
    art: function (T) {
      var f = kit(T), he = f.shell("High Explosive");
      return A.twoBars(he.extra.penetration_fixed_mm, f.penMin,
        "High Explosive  " + he.extra.penetration_fixed_mm + " mm",
        "weakest gun  " + f.penMin + " mm", "#c0392b");
    }
  });

  // Detection is a per shell multiplier that exactly one shell uses, and it
  // uses it to switch the thing off.
  window.TYR_CARDS.push({
    id: "kit-silenced-detection",
    color: "#436f83",
    big: function (T) {
      var f = kit(T), s = f.shell("Silenced");
      if (!s || s.detection_mult == null) return null;
      // Only worth a card while it is the sole shell that touches detection.
      var sh = T.OFFICIAL.shells || [], i, movers = 0;
      for (i = 0; i < sh.length; i++) if (sh[i].detection_mult !== 1) movers++;
      if (movers !== 1) return null;
      return "x" + s.detection_mult;
    },
    sub: function (T) {
      var f = kit(T), s = f.shell("Silenced");
      return "detection on Silenced, the only shell of " + f.shellCount +
        " that touches it. Published. It costs " +
        Math.round((1 - s.damage_mult) * 100) + "% of its damage.";
    },
    art: function (T) {
      var s = kit(T).shell("Silenced");
      return A.twoBars(s.damage_mult * 100, s.detection_mult * 100,
        "damage  x" + s.damage_mult, "detection  x" + s.detection_mult, "#436f83");
    }
  });

  // The most loaded specialty shell in the archive alters nothing about the
  // shot it is fired as.
  window.TYR_CARDS.push({
    id: "kit-energy-shell-inert",
    color: "#a06bff",
    big: function (T) {
      var f = kit(T);
      if (!f.shots || f.topSpec !== "Energy") return null;
      var s = f.shell("Energy"), i;
      for (i = 0; i < MULTS.length; i++) if (s[MULTS[i]] !== 1) return null;
      return T.fmtNum(f.shots.Energy);
    },
    sub: function (T) {
      var f = kit(T), s = f.shell("Energy");
      return "shots of the most loaded specialty shell. All " + MULTS.length +
        " of its published multipliers are 1. It grants " +
        s.extra.energy_on_penetration + " energy and nothing else.";
    },
    art: function (T) {
      var f = kit(T);
      return A.twoBars(f.shots.Energy, f.shots[f.secondSpec],
        "Energy  " + T.fmtNum(f.shots.Energy),
        f.secondSpec + "  " + T.fmtNum(f.shots[f.secondSpec]), "#a06bff");
    }
  });

  // The one shell that gives up penetration is the one nobody loads.
  window.TYR_CARDS.push({
    id: "kit-lightweight-ignored",
    color: "#8c6739",
    big: function (T) {
      var f = kit(T);
      if (!f.shots || f.lowShell !== "Lightweight" || !f.shots.Lightweight) return null;
      return Math.round(f.shots[f.topShell] / f.shots.Lightweight) + "x";
    },
    sub: function (T) {
      var f = kit(T);
      return "more " + f.topShell + " shots than Lightweight, the least loaded shell. It is " +
        "also the only one whose published penetration multiplier drops under 1.";
    },
    art: function (T) {
      var f = kit(T);
      return A.twoBars(f.shots[f.topShell], f.shots.Lightweight,
        f.topShell + "  " + T.fmtNum(f.shots[f.topShell]),
        "Lightweight  " + T.fmtNum(f.shots.Lightweight), "#8c6739");
    }
  });

  // A published column that is 1 the whole way down. Ammunition is allowed to
  // change five things about a shot and reload is not one of them.
  window.TYR_CARDS.push({
    id: "kit-reload-untouched",
    color: "#6ea8fe",
    big: function (T) {
      var sh = (T.OFFICIAL || {}).shells || [], i, off = 0;
      if (!sh.length) return null;
      for (i = 0; i < sh.length; i++) if (sh[i].reload_mult !== 1) off++;
      if (off) return null;
      return sh[0].reload_mult.toFixed(2) + "x";
    },
    sub: function (T) {
      var f = kit(T), sh = T.OFFICIAL.shells || [], i, moved = [];
      for (i = 0; i < MULTS.length; i++) {
        var j, any = 0;
        for (j = 0; j < sh.length; j++) if (sh[j][MULTS[i]] !== 1) any++;
        if (any) moved.push(MULTS[i].replace("_mult", ""));
      }
      return "the published reload multiplier on all " + f.shellCount +
        " shells. Ammunition moves " + moved.length +
        " other things about a shot. Reload is not one of them.";
    },
    art: function (T) { return A.rings(kit(T).shellCount, "#6ea8fe"); }
  });

  // Seventeen cannons and six numbers between them.
  window.TYR_CARDS.push({
    id: "kit-penetration-ladder",
    color: "#c9a227",
    big: function (T) {
      var f = kit(T);
      if (!f.penKeys.length || !f.penCovered) return null;
      return f.penKeys.length + " / " + f.penCovered;
    },
    sub: function (T) {
      var f = kit(T);
      var lo = f.penKeys[0], hi = f.penKeys[f.penKeys.length - 1];
      return "published penetration values across " + f.penCovered + " cannons. " +
        f.penModeN + " tanks share " + f.penModeK + " mm. The whole range, " + lo + " to " +
        hi + " mm, is exactly " + (hi / lo) + "x.";
    },
    art: function (T) { return penColumns(kit(T), "#c9a227"); }
  });

  // Momentum pays 30% more damage after 200 m. Most kills never get there.
  window.TYR_CARDS.push({
    id: "kit-momentum-ramp",
    color: "#65508a",
    big: function (T) {
      var f = kit(T);
      if (!f.ramp || !f.killTotal) return null;
      return Math.round((f.killWithin / f.killTotal) * 100) + "%";
    },
    sub: function (T) {
      var f = kit(T), mom = f.shell("Momentum");
      return "of kills happen inside " + f.ramp +
        " m. That is how far a Momentum shell must fly for its published " +
        Math.round((mom.damage_mult - 1) * 100) + "%.";
    },
    art: function (T) {
      var f = kit(T);
      return splitBar(f.killWithin / f.killTotal, "#65508a",
        "under " + f.ramp + " m", "beyond");
    }
  });

  // Energy is bought with damage at a published rate, so an ability has a
  // price in damage whether or not anyone thinks of it that way.
  window.TYR_CARDS.push({
    id: "kit-damage-per-cast",
    color: "#35674a",
    big: function (T) {
      var f = kit(T), E = f.energy;
      if (!E.gain_share_of_damage_dealt || f.castMedian == null) return null;
      return T.fmtNum(Math.round(f.castMedian / E.gain_share_of_damage_dealt));
    },
    sub: function (T) {
      var f = kit(T), E = f.energy;
      return "damage buys one ability cast. Median measured cost is " + f.castMedian +
        " energy. Damage pays into the meter at a published " +
        pct(E.gain_share_of_damage_dealt) + "%.";
    },
    art: function (T) {
      var f = kit(T), E = f.energy;
      return A.dots(E.max, f.castMedian, "#35674a", { per: 25, gap: 13, r: 4.8 });
    }
  });

  // Blocking a shell feeds the energy meter too, at a seventh of the rate.
  window.TYR_CARDS.push({
    id: "kit-block-vs-deal",
    color: "#8a4444",
    big: function (T) {
      var E = kit(T).energy;
      if (!E.gain_share_of_damage_dealt || !E.gain_share_of_damage_blocked) return null;
      var r = E.gain_share_of_damage_dealt / E.gain_share_of_damage_blocked;
      return (Math.round(r * 10) / 10) + "x";
    },
    sub: function (T) {
      var E = kit(T).energy;
      return "more damage must be blocked than dealt for the same energy. Published: " +
        pct(E.gain_share_of_damage_dealt) + "% against " +
        pct(E.gain_share_of_damage_blocked) + "%.";
    },
    art: function (T) {
      var E = kit(T).energy;
      return A.twoBars(E.gain_share_of_damage_dealt * 100,
        E.gain_share_of_damage_blocked * 100,
        "dealt  " + pct(E.gain_share_of_damage_dealt) + "%",
        "blocked  " + pct(E.gain_share_of_damage_blocked) + "%", "#8a4444");
    }
  });

  // A repair timer that rewards being hit in the same place twice.
  window.TYR_CARDS.push({
    id: "kit-repair-accelerates",
    color: "#c0392b",
    big: function (T) {
      var f = kit(T);
      if (!f.repairRatio) return null;
      return Math.round(f.repairRatio) + "x";
    },
    sub: function (T) {
      var f = kit(T);
      var ORD = ["", "first", "second", "third", "fourth", "fifth"];
      var which = ORD[f.repairSteps] || "last";
      return "faster to repair the " + which +
        " time a module breaks than the first. Published, on " + f.repairRatioN +
        " of " + f.repairSeqs.length + " repairable modules.";
    },
    art: function (T) {
      var f = kit(T);
      return shrinkBars(f.repairLongest.r, "#c0392b");
    }
  });

  // Every ability component in the game lands on the same handful of tanks.
  window.TYR_CARDS.push({
    id: "kit-ability-components",
    color: "#c9a227",
    big: function (T) {
      var f = kit(T);
      if (!f.tankCount || !f.abilPool) return null;
      return f.abilTanks + " / " + f.tankCount;
    },
    sub: function (T) {
      var f = kit(T);
      var rest = f.tankCount - f.abilTanks;
      return "tanks get a published ability component. Between them they hold " +
        (f.abilUsed === f.abilPool ? "all " + f.abilPool : f.abilUsed + " of " + f.abilPool) +
        ". The other " + rest + " get nothing.";
    },
    art: function (T) {
      var f = kit(T);
      return A.dots(f.tankCount, f.abilTanks, "#c9a227", { per: 9, gap: 26, r: 9 });
    }
  });

  // Abilities are not rare. A match is full of them.
  window.TYR_CARDS.push({
    id: "kit-casts-per-match",
    color: "#6ea8fe",
    big: function (T) {
      var f = kit(T);
      if (!f.castsPerMatch) return null;
      return String(Math.round(f.castsPerMatch));
    },
    sub: function (T) {
      var f = kit(T);
      var every = f.meanDur ? Math.round(f.meanDur / f.castsPerMatch) : null;
      var per = f.shotsMedian ? Math.round(f.shotsMedian / f.castsPerMatch) : null;
      return "ability casts in an average match." +
        (every ? " One every " + every + " seconds." : "") +
        (per ? " One for every " + per + " shells." : "");
    },
    art: function (T) {
      var f = kit(T);
      return A.twoBars(f.castsPerMatch, f.shotsMedian,
        Math.round(f.castsPerMatch) + " casts",
        T.fmtNum(f.shotsMedian) + " shells", "#6ea8fe");
    }
  });

  // Nobody opens with an ability, even though everybody spawns holding a
  // third of a meter.
  window.TYR_CARDS.push({
    id: "kit-cast-timing",
    color: "#a06bff",
    big: function (T) {
      var f = kit(T);
      if (!f.castProgTotal || !f.castProg.length) return null;
      return Math.round((f.castProg[0].count / f.castProgTotal) * 100) + "%";
    },
    sub: function (T) {
      var f = kit(T);
      var r = Math.round(f.castProgMax / f.castProg[0].count);
      return "of ability casts land in the first tenth of a match. The busiest tenth carries " +
        r + " times as many.";
    },
    art: function (T) {
      var f = kit(T), vals = [], i;
      for (i = 0; i < f.castProg.length; i++) vals.push(f.castProg[i].count || 0);
      return columns(vals, 0, "#a06bff");
    }
  });
})();

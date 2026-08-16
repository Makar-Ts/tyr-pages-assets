// Cards about player titles, which the decoder only started reading today.
//
// A title is a profile cosmetic carried on each player's end-game record. It
// was sitting in the replay the whole time and nothing had ever looked at it.
(function () {
  window.TYR_CARDS = window.TYR_CARDS || [];
  var A = window.TYR_ART;

  // The per-tank mastery titles use the wire codename, and for five tanks that
  // is not the slug the site uses either. Seven line up (BushMaster is the
  // Ark slug "bush"), five do not, so those are named here rather than
  // silently mis-attributed. Derived from tools/replay_site.py's TANK_DISPLAY.
  var CODE_ALIAS = {
    vtol: "Ikarus", canopener: "Arbalest", slow: "Helio",
    wall: "Rook", brawler: "Fortis",
  };

  function rows(T) {
    var out = [], ms = (T.DATA || {}).matches || [], i, j;
    for (i = 0; i < ms.length; i++) {
      var ps = ms[i].players || [];
      for (j = 0; j < ps.length; j++) out.push(ps[j]);
    }
    return out;
  }

  function counts(T) {
    var r = rows(T), c = {}, withTitle = 0, i;
    for (i = 0; i < r.length; i++) {
      var t = r[i].title;
      if (!t) continue;
      withTitle++;
      c[t] = (c[t] || 0) + 1;
    }
    return { c: c, withTitle: withTitle, total: r.length };
  }

  // "VtolMaster" -> the tank it belongs to, or null if it is not a mastery.
  function masteryTank(T, title) {
    if (!/Master$/.test(title)) return null;
    var code = title.replace(/Master$/, "").toLowerCase();
    if (CODE_ALIAS[code]) return CODE_ALIAS[code];
    var tanks = (T.DATA || {}).tanks || [], i;
    for (i = 0; i < tanks.length; i++) {
      if (String(tanks[i].tank_id).toLowerCase() === code) return tanks[i].tank;
    }
    return null;
  }

  // ---- how many players show a title at all --------------------------
  window.TYR_CARDS.push({
    id: "t-share",
    color: "#c9a227",
    big: function (T) {
      var k = counts(T);
      if (!k.total || !k.withTitle) return null;
      return Math.round((k.withTitle / k.total) * 100) + "%";
    },
    sub: function (T) {
      var k = counts(T);
      return "of seats show a profile title. " + T.fmtNum(k.withTitle) + " of " +
        T.fmtNum(k.total) + ", spread across " + Object.keys(k.c).length + " titles.";
    },
    art: function (T) {
      var k = counts(T);
      var pct = Math.round((k.withTitle / k.total) * 100);
      return A.dots(100, pct, "#c9a227", { per: 20, gap: 15, r: 5.4 });
    },
  });

  // ---- the spread, which is very lopsided ----------------------------
  window.TYR_CARDS.push({
    id: "t-top",
    color: "#65508a",
    big: function (T) {
      var k = counts(T), best = null, name = null, t;
      for (t in k.c) if (!best || k.c[t] > best) { best = k.c[t]; name = t; }
      if (!name) return null;
      return T.fmtNum(best);
    },
    sub: function (T) {
      var k = counts(T), list = [], t;
      for (t in k.c) list.push([t, k.c[t]]);
      list.sort(function (a, b) { return b[1] - a[1]; });
      if (!list.length) return "";
      var rare = list[list.length - 1];
      return "seats wear " + list[0][0] + ", the commonest title. " + rare[0] +
        ", the rarest, has " + T.fmtNum(rare[1]) + ".";
    },
    art: function (T) {
      var k = counts(T), list = [], t;
      for (t in k.c) list.push({ label: t, v: k.c[t] });
      list.sort(function (a, b) { return b.v - a.v; });
      return A.barRow(list.slice(0, 5).map(function (x) {
        return { k: x.label.slice(0, 14), v: x.v };
      }), "#9d8ccb");
    },
  });

  // ---- mastery titles, by tank ---------------------------------------
  window.TYR_CARDS.push({
    id: "t-mastery",
    color: "#436f83",
    big: function (T) {
      var k = counts(T), n = 0, t;
      for (t in k.c) if (masteryTank(T, t)) n++;
      return n ? n : null;
    },
    sub: function (T) {
      var k = counts(T), by = {}, t, best = null;
      for (t in k.c) {
        var tank = masteryTank(T, t);
        if (!tank) continue;
        by[tank] = (by[tank] || 0) + k.c[t];
        if (!best || by[tank] > by[best]) best = tank;
      }
      return "tanks have someone wearing their mastery title. " +
        (best ? best + " has the most." : "");
    },
    art: function (T) {
      var k = counts(T), by = {}, t;
      for (t in k.c) {
        var tank = masteryTank(T, t);
        if (tank) by[tank] = (by[tank] || 0) + k.c[t];
      }
      var list = [];
      for (t in by) list.push({ label: t, v: by[t] });
      list.sort(function (a, b) { return b.v - a.v; });
      if (!list.length) return "";
      return A.barRow(list.slice(0, 6).map(function (x) {
        return { k: x.label, v: x.v };
      }), "#5f97b0");
    },
  });
})();

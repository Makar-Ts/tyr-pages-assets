// Sheet vs road — the game's published numbers against the measured ones.
//
// Gold is what the game publishes. Blue is what the replays show. Nothing here
// is an opinion: both sides are read at render time from their own source, and
// the two sources never touch until this page puts them side by side.
(function () {
  var CSS =
    ".sr-key{display:flex;gap:18px;margin-bottom:14px;font-size:.78rem;color:var(--dim)}" +
    ".sr-key i{width:11px;height:11px;border-radius:3px;display:inline-block;margin-right:6px}" +
    ".sr-lead{font-size:1.5rem;font-family:ui-monospace,Consolas,monospace;color:var(--fg);" +
      "margin-bottom:2px}" +
    ".sr-agree{font-size:.78rem;color:var(--dim);margin:10px 0 0}";

  var PUB = "#c9a227";
  var MEAS = "#6ea8fe";

  function key() {
    return '<div class="sr-key"><span><i style="background:' + PUB +
      '"></i>sheet</span><span><i style="background:' + MEAS +
      '"></i>measured</span></div>';
  }

  function pub(T) {
    var o = {}, list = (T.OFFICIAL || {}).tanks || [], i;
    for (i = 0; i < list.length; i++) o[list[i].tank] = list[i];
    return o;
  }

  function statMap(list, key2) {
    var o = {}, i;
    for (i = 0; i < (list || []).length; i++) {
      o[list[i].label] = key2 ? list[i][key2] : list[i].value;
    }
    return o;
  }

  function r1(n) { return Math.round(n * 10) / 10; }

  // one row per tank, sheet against measured, biggest gap first
  function pair(T, get_pub, get_meas) {
    var P = pub(T), rows = [], i;
    var mt = (T.DATA || {}).tanks || [];
    for (i = 0; i < mt.length; i++) {
      var o = P[mt[i].tank];
      if (!o) continue;
      var a = get_pub(o), b = get_meas(mt[i], o);
      if (a == null || b == null) continue;
      rows.push({ label: mt[i].tank, a: r1(a), b: r1(b), gap: b - a });
    }
    rows.sort(function (x, y) { return y.gap - x.gap; });
    return rows;
  }

  // Only the tanks that disagree. A row where the sheet and the measurement
  // land on the same number draws as one dot on top of another, which reads
  // as a broken chart, and thirteen of them read as a broken page.
  function off(rows) {
    return rows.filter(function (r) { return r.a !== r.b; });
  }

  function dumbbell(T, rows) {
    return T.svgDumbbell(rows, {
      aName: "sheet", bName: "measured",
      aColor: PUB, bColor: MEAS, labelWidth: 96,
    });
  }

  function agreeLine(n, total) {
    if (!n) return "";
    return '<p class="sr-agree">' + n + " of " + total + " land on the number " +
      "exactly and are not drawn.</p>";
  }

  // ---- speed ----------------------------------------------------------
  function panelSpeed(T) {
    var top = statMap((T.STATS || {}).speed_by_tank, "top");
    var rows = pair(T, function (o) { return o.spd; },
                       function (m) { return top[m.tank]; });
    if (rows.length < 4) return "";
    var d = off(rows);
    return T.bigPanel("Top speed",
      key() + dumbbell(T, d) +
      agreeLine(rows.length - d.length, rows.length),
      "Fastest seen, per tank. Downhill and abilities count.");
  }

  // ---- reload ---------------------------------------------------------
  function panelReload(T) {
    var rows = pair(T, function (o) { return o.reload_s; },
                       function (m) { return m.reload_sec; });
    if (rows.length < 4) return "";
    var exact = rows.filter(function (r) { return r.a === r.b; }).length;
    var d = off(rows);
    return T.bigPanel("Reload",
      key() + dumbbell(T, d) + agreeLine(exact, rows.length),
      "Only these " + d.length + " differ. All of them are faster.");
  }

  // ---- health ---------------------------------------------------------
  function panelHealth(T) {
    var peak = statMap((T.STATS || {}).tank_max_hp);
    var rows = pair(T, function (o) { return o.hp; },
                       function (m) { return peak[m.tank]; });
    if (rows.length < 4) return "";
    var d = off(rows);
    return T.bigPanel("Health",
      key() + dumbbell(T, d) +
      agreeLine(rows.length - d.length, rows.length),
      "Biggest pool ever seen. Upgrades explain it.");
  }

  // ---- damage per minute ----------------------------------------------
  function panelGun(T) {
    var rows = pair(T,
      function (o) { return o.reload_s ? (o.dmg * 60) / o.reload_s : null; },
      function (m) { return m.dpm; });
    if (rows.length < 4) return "";
    var d = off(rows);
    return T.bigPanel("Damage a minute",
      key() + dumbbell(T, d) +
      agreeLine(rows.length - d.length, rows.length),
      "Sheet is assuming every shell lands.");
  }

  function render(T) {
    return panelSpeed(T) + panelReload(T) + panelHealth(T) + panelGun(T);
  }

  function preview(T) {
    var top = statMap((T.STATS || {}).speed_by_tank, "top");
    var rows = pair(T, function (o) { return o.spd; },
                       function (m) { return top[m.tank]; });
    if (rows.length < 4) return "";
    rows = rows.slice(0, 9);
    var max = 1, i;
    for (i = 0; i < rows.length; i++) max = Math.max(max, rows[i].a, rows[i].b);
    var out = '<rect x="0" y="0" width="240" height="240" fill="#151b31"/>';
    for (i = 0; i < rows.length; i++) {
      var y = 16 + i * 17;
      var xa = 18 + (rows[i].a / max) * 190;
      var xb = 18 + (rows[i].b / max) * 190;
      out += '<line x1="' + Math.min(xa, xb).toFixed(1) + '" y1="' + y +
        '" x2="' + Math.max(xa, xb).toFixed(1) + '" y2="' + y +
        '" stroke="#41507f" stroke-width="3"/>';
      out += '<circle cx="' + xa.toFixed(1) + '" cy="' + y + '" r="5" fill="' + PUB + '"/>';
      out += '<circle cx="' + xb.toFixed(1) + '" cy="' + y + '" r="5" fill="' + MEAS + '"/>';
    }
    return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice">' + out + "</svg>";
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "sheet",
    title: "Differences",
    blurb: "Where the game's numbers and the replays disagree.",
    accent: "#c9a227",
    css: CSS,
    preview: preview,
    render: render,
  });
})();

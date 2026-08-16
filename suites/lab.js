/* Lab suite -- plot anything against anything.
 *
 * Every other page on this site answers a question somebody already picked.
 * This one hands over the controls: thirty numeric fields on seventeen tanks,
 * and six panels that all read from the same field list.
 *
 * Two rules hold everywhere on this page and every note repeats them.
 *
 *   1. Gold is PUBLISHED by the game (the tyrhq.com sheet, carried in
 *      site/tyrhq_official.json). Blue and teal are MEASURED by this pipeline
 *      from replays. reload is the only quantity that exists in both forms
 *      and the two are never mixed into one number.
 *   2. Seventeen tanks is a small sample. A correlation here is a shape in a
 *      scatter of seventeen points, not a cause and not a law. Every panel
 *      that shows a correlation prints its n next to it.
 *
 * T.STATS.reload_by_tank is deliberately not used anywhere in this file: it is
 * a naive median that reads an autoloader's burst interval as its reload.
 * DATA.tanks[].reload_sec is the mode-split measurement and is what the
 * "reload, measured" field carries.
 */
(function () {
  "use strict";

  var ACCENT = "#4f7cff";       // suite accent, same as the global --blue
  var GOLD = "#c9a227";         // published by tyrhq
  var BLUE = "#6ea8fe";         // measured, from per-match aggregates
  var TEAL = "#5fd0c6";         // measured, from decoded positions and timings

  var CLS_COLOR = { Light: "#5fd0c6", Medium: "#7f9cf5", Heavy: "#e0895a" };

  var GROUP_NAME = {
    p: "Published by the game",
    m: "Measured, per match",
    x: "Measured, from tracks"
  };
  var GROUP_COLOR = { p: GOLD, m: BLUE, x: TEAL };

  /* ----------------------------------------------------------------- css */

  var CSS = [
    ".lab-lede{font-size:.87rem;line-height:1.65;color:var(--dim,#7f89b3);margin:0 0 15px;max-width:78ch}",
    ".lab-lede b{color:var(--fg,var(--text,#d6dcf5));font-weight:600}",
    ".lab-key{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:0 0 15px;font-size:.76rem;color:var(--dim,#7f89b3)}",
    ".lab-key b{font-weight:600;color:var(--fg,var(--text,#d6dcf5))}",
    ".lab-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:0}",

    ".lab-ctl{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:0 0 14px}",
    ".lab-f{display:flex;flex-direction:column;gap:5px}",
    ".lab-f>span{font-size:.64rem;letter-spacing:.09em;text-transform:uppercase;color:var(--dim,#7f89b3)}",
    ".lab-f select{background:var(--panel2,#131a33);color:var(--fg,var(--text,#d6dcf5));",
    "border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:7px 10px;",
    "font:inherit;font-size:.85rem;min-width:186px}",
    ".lab-f select:focus{outline:none;border-color:" + ACCENT + "}",
    ".lab-btn{background:var(--panel2,#131a33);color:var(--dim,#7f89b3);cursor:pointer;",
    "border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:8px 14px;",
    "font:inherit;font-size:.8rem;line-height:1.2}",
    ".lab-btn:hover{color:var(--fg,var(--text,#d6dcf5));border-color:" + ACCENT + "}",
    ".lab-btn.on{color:#08101f;background:" + ACCENT + ";border-color:" + ACCENT + ";font-weight:600}",

    ".lab-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 13px}",
    ".lab-chip{cursor:pointer;font:inherit;font-size:.75rem;padding:4px 11px;border-radius:999px;",
    "background:transparent;color:var(--dim,#7f89b3);border:1px solid var(--line,var(--border,#232c52));",
    "line-height:1.35}",
    ".lab-chip:hover{color:var(--fg,var(--text,#d6dcf5))}",
    ".lab-chip.on{color:#08101f;background:var(--cc," + ACCENT + ");border-color:var(--cc," + ACCENT + ");font-weight:600}",
    ".lab-chip.tk{border-left:3px solid var(--tc,#666)}",

    ".lab-plotwrap{position:relative}",
    ".lab-svg{width:100%;height:auto;display:block}",
    ".lab-pt{transition:transform .62s cubic-bezier(.32,.86,.3,1);cursor:pointer}",
    ".lab-pt circle{transition:r .62s cubic-bezier(.32,.86,.3,1),fill .45s ease,",
    "fill-opacity .3s ease,stroke-width .18s ease}",
    ".lab-pt text{transition:opacity .35s ease}",
    ".lab-pt.off{opacity:.13;pointer-events:none}",
    ".lab-pt.hot circle{stroke:#fff;stroke-width:2.2}",
    ".lab-pt.sel circle{stroke:" + ACCENT + ";stroke-width:2.6}",
    ".lab-tip{position:absolute;pointer-events:none;opacity:0;transition:opacity .13s ease;",
    "background:rgba(8,13,30,.96);border:1px solid var(--line,var(--border,#232c52));",
    "border-left:3px solid var(--tc," + ACCENT + ");border-radius:8px;padding:9px 12px;",
    "font-size:.78rem;line-height:1.5;z-index:5;min-width:158px;box-shadow:0 8px 22px rgba(0,0,0,.45)}",
    ".lab-tip b{display:block;font-size:.9rem;margin-bottom:1px}",
    ".lab-tip .lab-tc{display:block;color:var(--dim,#7f89b3);font-size:.7rem;margin-bottom:6px}",
    ".lab-tip div{display:flex;justify-content:space-between;gap:16px}",
    ".lab-tip div span:first-child{color:var(--dim,#7f89b3)}",
    ".lab-tip div span:last-child{font-variant-numeric:tabular-nums}",

    ".lab-read{font-size:.82rem;color:var(--dim,#7f89b3);margin:10px 0 0;min-height:1.5em}",
    ".lab-read b{color:var(--fg,var(--text,#d6dcf5));font-weight:600;font-variant-numeric:tabular-nums}",
    ".lab-read .lab-warn{color:#e0a04a}",

    ".lab-mx{overflow-x:auto}",
    ".lab-mx svg{display:block}",
    ".lab-cell{cursor:pointer}",
    ".lab-cell:hover{stroke:#fff;stroke-width:1.4}",

    ".lab-rank{position:relative;margin-top:4px}",
    ".lab-rk{position:absolute;left:0;right:0;top:0;height:26px;display:grid;",
    "grid-template-columns:24px 96px 1fr 96px 104px;gap:11px;align-items:center;",
    "transition:transform .55s cubic-bezier(.32,.86,.3,1),opacity .3s ease}",
    ".lab-rk-n{font-size:.72rem;color:var(--dim,#7f89b3);text-align:right;font-variant-numeric:tabular-nums}",
    ".lab-rk-t{font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".lab-rk-bars{display:flex;flex-direction:column;gap:3px;min-width:0}",
    ".lab-rk-bar{height:13px;border-radius:3px;transition:width .55s cubic-bezier(.32,.86,.3,1),",
    "background-color .35s ease;min-width:1px}",
    ".lab-rk.pair .lab-rk-bar{height:8px}",
    ".lab-rk-b{display:none}",
    ".lab-rk.pair .lab-rk-b{display:block}",
    ".lab-rk-v{font-size:.8rem;text-align:right;font-variant-numeric:tabular-nums}",
    ".lab-rk-d{font-size:.72rem;color:var(--dim,#7f89b3);text-align:right;font-variant-numeric:tabular-nums}",
    ".lab-rk.off{opacity:.16}",

    ".lab-pc-legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}",
    ".lab-line{transition:opacity .3s ease,stroke-width .2s ease;cursor:pointer}",
    ".lab-line.off{opacity:.07}",
    ".lab-line.hot{stroke-width:3.4}",

    ".lab-ins{display:grid;grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:11px}",
    ".lab-icol{min-width:0}",
    ".lab-ih{font-size:.66rem;letter-spacing:.09em;text-transform:uppercase;margin:0 0 8px;font-weight:600}",
    ".lab-irow{display:grid;grid-template-columns:1fr 84px 46px;gap:9px;align-items:center;",
    "padding:5px 7px;border-radius:6px;cursor:pointer;border:1px solid transparent}",
    ".lab-irow:hover{background:rgba(255,255,255,.035);border-color:var(--line,var(--border,#232c52))}",
    ".lab-il{font-size:.78rem;min-width:0}",
    ".lab-ibar{height:4px;border-radius:2px;background:rgba(255,255,255,.07);margin-top:4px;position:relative}",
    ".lab-ibar i{position:absolute;left:0;top:0;bottom:0;border-radius:2px;display:block;",
    "transition:width .5s cubic-bezier(.32,.86,.3,1)}",
    ".lab-iv{font-size:.8rem;text-align:right;font-variant-numeric:tabular-nums}",
    ".lab-ir{font-size:.68rem;text-align:right;color:var(--dim,#7f89b3);font-variant-numeric:tabular-nums}",
    ".lab-ihead{display:flex;flex-wrap:wrap;gap:18px;align-items:baseline;margin:2px 0 14px}",
    ".lab-ihead h3{margin:0;font-size:1.22rem}",
    ".lab-ihead span{font-size:.78rem;color:var(--dim,#7f89b3)}",

    ".lab-scroll{overflow-x:auto;border-radius:8px}",
    ".lab-tbl{width:100%;border-collapse:collapse;font-size:.8rem;min-width:880px}",
    ".lab-tbl th,.lab-tbl td{padding:6px 9px;border-bottom:1px solid var(--line,var(--border,#232c52));",
    "text-align:right;white-space:nowrap}",
    ".lab-tbl th:first-child,.lab-tbl td:first-child,.lab-tbl .lab-l{text-align:left;white-space:normal}",
    ".lab-tbl thead th{color:var(--dim,#7f89b3);font-weight:600;font-size:.7rem;letter-spacing:.03em}",
    // only the headings that actually sort get the affordance
    ".lab-tbl thead th[data-s]{cursor:pointer;user-select:none}",
    ".lab-tbl thead th[data-s]:hover{color:var(--fg,var(--text,#d6dcf5))}",
    ".lab-tbl thead th[data-s]:after{content:'\\2195';opacity:.3;margin-left:5px}",
    ".lab-tbl thead th.on{color:" + ACCENT + "}",
    ".lab-tbl thead th.on:after{opacity:.85}",
    ".lab-tbl tbody tr{cursor:pointer}",
    ".lab-tbl tbody tr:hover{background:rgba(255,255,255,.035)}",
    ".lab-tbl td.lab-num{font-variant-numeric:tabular-nums}",
    ".lab-src{display:inline-block;font-size:.62rem;letter-spacing:.05em;text-transform:uppercase;",
    "padding:1px 7px;border-radius:999px;border:1px solid currentColor;opacity:.9}",
    ".lab-desc{color:var(--dim,#7f89b3);font-size:.75rem;line-height:1.5;max-width:46ch}"
  ].join("");

  /* -------------------------------------------------------------- fields */

  /* Every numeric field the page can plot. g is the source group:
   *   p = published on the tyrhq sheet
   *   m = measured, aggregated per match from decoded replays
   *   x = measured, derived from decoded positions and shot timings
   * short is what fits in a matrix gutter. dec and unit drive every number
   * printed on the page, so a field is formatted the same way in all six
   * panels.
   */
  var FIELDS = [
    { k: "games", g: "m", label: "Games played", short: "games", unit: "", dec: 0,
      desc: "Decoded matches with this tank." },
    { k: "winrate", g: "m", label: "Win rate", short: "win rate", unit: "%", dec: 1,
      desc: "Share of its games its team won." },
    { k: "pick", g: "m", label: "Pick rate", short: "pick rate", unit: "%", dec: 2,
      desc: "Share of all tank slots. Games rescaled, nothing new." },
    { k: "dpm", g: "m", label: "Damage per minute", short: "dpm", unit: "", dec: 0,
      desc: "Damage per minute alive, averaged." },
    { k: "avgdmg", g: "m", label: "Average damage", short: "avg dmg", unit: "", dec: 0,
      desc: "Damage in one game, averaged." },
    { k: "kills", g: "m", label: "Average kills", short: "avg kills", unit: "", dec: 2,
      desc: "Kills in one game, averaged." },
    { k: "assist", g: "m", label: "Average assist", short: "avg assist", unit: "", dec: 0,
      desc: "Assist damage in one game, averaged." },
    { k: "blocked", g: "m", label: "Average blocked", short: "avg blocked", unit: "", dec: 0,
      desc: "Damage absorbed without losing health, per game." },
    { k: "survsec", g: "m", label: "Survival time", short: "surv secs", unit: " s", dec: 0,
      desc: "Seconds alive per game, averaged." },
    { k: "survpct", g: "m", label: "Survival share", short: "surv share", unit: "%", dec: 1,
      desc: "Share of the match alive, averaged." },
    { k: "mreload", g: "m", label: "Reload, measured", short: "reload meas", unit: " s", dec: 2,
      desc: "Most common gap between its shots in replays, bursts separated from reloads." },

    { k: "hp", g: "p", label: "Hit points", short: "hp", unit: "", dec: 0,
      desc: "Health at full." },
    { k: "pdmg", g: "p", label: "Shell damage", short: "shell dmg", unit: "", dec: 0,
      desc: "One standard shell. Not average damage, which is a whole game." },
    { k: "pen", g: "p", label: "Penetration", short: "pen", unit: " mm", dec: 0,
      desc: "One standard shell." },
    { k: "spd", g: "p", label: "Top speed", short: "top speed", unit: " kph", dec: 1,
      desc: "Top forward speed." },
    { k: "rev", g: "p", label: "Reverse speed", short: "rev speed", unit: " kph", dec: 0,
      desc: "Top reverse speed." },
    { k: "preload", g: "p", label: "Reload, published", short: "reload pub", unit: " s", dec: 1,
      desc: "Reload between shots. Kept apart from the measured one." },
    { k: "det", g: "p", label: "Detection range", short: "detection", unit: " m", dec: 0,
      desc: "Range at which it spots." },
    { k: "camo", g: "p", label: "Camouflage", short: "camo", unit: "", dec: 0,
      desc: "Camouflage rating. No unit given." },
    { k: "diff", g: "p", label: "Difficulty rating", short: "difficulty", unit: "", dec: 0,
      desc: "The sheet's 1 to 5 rating. Editorial, not measured." },

    { k: "killrange", g: "x", label: "Median kill range", short: "kill range", unit: " m", dec: 0,
      desc: "Median metres between both tanks at a kill. From positions, not shots." },
    { k: "deathrange", g: "x", label: "Median death range", short: "death range", unit: " m", dec: 0,
      desc: "Median metres to whoever killed it." },
    { k: "speed", g: "x", label: "Median driving speed", short: "drive speed", unit: " kph", dec: 1,
      desc: "Median over decoded tracks. Over 120 kph counts as a jump." },
    { k: "dist", g: "x", label: "Distance driven", short: "distance", unit: " m", dec: 0,
      desc: "Median metres driven per match." },
    { k: "dmgperkill", g: "x", label: "Damage per kill", short: "dmg per kill", unit: "", dec: 0,
      desc: "Median damage per kill credited." },
    { k: "blockratio", g: "x", label: "Blocked over damage", short: "block ratio", unit: "%", dec: 1,
      desc: "Median blocked as a share of damage dealt." },
    { k: "assistshare", g: "x", label: "Assist share of work", short: "assist share", unit: "%", dec: 1,
      desc: "Assist as a share of damage plus assist." },
    { k: "firstblood", g: "x", label: "First blood rate", short: "first blood", unit: "%", dec: 1,
      desc: "Share of its games with the first kill." },
    { k: "firstdown", g: "x", label: "First to die rate", short: "first down", unit: "%", dec: 1,
      desc: "Share of its games destroyed first." },
    { k: "survafterkill", g: "x", label: "Killer survived", short: "killer lived", unit: "%", dec: 1,
      desc: "Share of its kills where it lived to the end." }
  ];

  var FBY = {};
  (function () {
    for (var i = 0; i < FIELDS.length; i++) FBY[FIELDS[i].k] = FIELDS[i];
  })();

  function fld(k) { return FBY[k] || FIELDS[0]; }

  /* --------------------------------------------------------------- state */

  var T = null;
  var ROOT = null;
  var ROWS = [];

  // Filled in by the wire pass. Panels reach each other only through these,
  // so a panel that failed to start cannot break the ones that did.
  var PLOT_API = null;
  var RANK_API = null;

  var S = {
    x: "hp", y: "spd", size: "games", color: "cls",
    cls: "All", trend: true, names: true,
    mx: { p: 1, m: 1, x: 1 },
    rankField: "winrate", rankDir: -1,
    pcKeys: ["hp", "spd", "camo", "avgdmg", "winrate"],
    pcPin: null,
    inspect: null,
    dictSort: "grp", dictDir: 1
  };

  /* ---------------------------------------------------------- small util */

  function esc(s) { return T ? T.esc(s) : String(s == null ? "" : s); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }

  function fmtVal(f, v) {
    if (!isNum(v)) return "-";
    var s = f.dec === 0 ? String(Math.round(v)) : v.toFixed(f.dec);
    if (Math.abs(v) >= 1000) {
      var parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      s = parts.join(".");
    }
    return s + (f.unit || "");
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function hex2rgb(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(a) {
    function p(n) { var s = Math.round(clamp(n, 0, 255)).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + p(a[0]) + p(a[1]) + p(a[2]);
  }
  function mix(a, b, t) {
    var A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  function lighten(h, t) { return mix(h, "#ffffff", t); }

  // Sequential ramp for "colour by a field". Dark blue through teal and green
  // to a warm top, which stays readable on this background at small radii.
  var RAMP = ["#2d3574", "#35619e", "#3a9b93", "#8bbd58", "#f0cb59"];
  function rampColor(t) {
    t = clamp(t, 0, 1) * (RAMP.length - 1);
    var i = Math.floor(t);
    if (i >= RAMP.length - 1) return RAMP[RAMP.length - 1];
    return mix(RAMP[i], RAMP[i + 1], t - i);
  }

  // Diverging scale for correlation. Blue means the two rise together, warm
  // means one rises as the other falls, and near zero fades into the panel so
  // an empty cell reads as empty.
  function corrColor(r) {
    var m = Math.pow(Math.min(1, Math.abs(r)), 0.68);
    return r >= 0 ? mix("#151c34", ACCENT, m) : mix("#151c34", "#e0894a", m);
  }

  function tankHex(name) {
    var c = (T && T.tankColor && T.tankColor(name)) || null;
    return c ? lighten(c, 0.28) : "#6b7590";
  }

  /* ---------------------------------------------------------------- data */

  function officialByTank() {
    var o = (T && T.OFFICIAL) || {};
    if (o.byTank) return o.byTank;
    var m = {};
    (o.tanks || []).forEach(function (r) { if (r && r.tank) m[r.tank] = r; });
    return m;
  }

  function statMap(key, valueKey) {
    var s = (T && T.STATS) || {};
    if (T && T.statByTank) return T.statByTank(s[key], valueKey);
    var m = {};
    (s[key] || []).forEach(function (r) { m[r.label] = valueKey ? r[valueKey] : r.value; });
    return m;
  }

  // One row per tank, every field resolved once. v holds the numbers, n holds
  // the sample count behind a number where the pipeline recorded one, so the
  // dictionary panel can print the thinnest tank behind each field instead of
  // implying they are all equally well observed.
  function buildRows() {
    var off = officialByTank();
    var V = {
      killrange: statMap("kill_range_by_tank"), killrangeN: statMap("kill_range_by_tank", "count"),
      deathrange: statMap("death_range_by_tank"), deathrangeN: statMap("death_range_by_tank", "count"),
      speed: statMap("speed_by_tank"),
      dist: statMap("distance_by_tank"), distN: statMap("distance_by_tank", "tracks"),
      dmgperkill: statMap("dmg_per_kill_by_tank"), dmgperkillN: statMap("dmg_per_kill_by_tank", "count"),
      blockratio: statMap("block_ratio_by_tank"),
      assistshare: statMap("assist_share_by_tank"), assistshareN: statMap("assist_share_by_tank", "count"),
      firstblood: statMap("first_blood_by_tank"), firstbloodN: statMap("first_blood_by_tank", "games"),
      firstdown: statMap("first_down_by_tank"), firstdownN: statMap("first_down_by_tank", "games"),
      survafterkill: statMap("survive_after_kill"), survafterkillN: statMap("survive_after_kill", "count")
    };

    function num(v) { return isNum(v) ? v : null; }

    return ((T && T.DATA && T.DATA.tanks) || []).map(function (t) {
      var o = off[t.tank] || {};
      var a = t.avg || {};
      var v = {
        games: num(t.games),
        winrate: num(t.winrate),
        pick: isNum(t.pick_rate) ? t.pick_rate * 100 : null,
        dpm: num(t.dpm),
        avgdmg: num(a.dmg),
        kills: num(a.kills),
        assist: num(a.assist),
        blocked: num(a.blocked),
        survsec: num(t.avg_survival_sec),
        survpct: num(t.avg_survival_pct),
        mreload: num(t.reload_sec),
        hp: num(o.hp), pdmg: num(o.dmg), pen: num(o.pen), spd: num(o.spd),
        rev: num(o.reverse_spd), preload: num(o.reload_s), det: num(o.detection_m),
        camo: num(o.camo), diff: num(o.difficulty),
        killrange: num(V.killrange[t.tank]), deathrange: num(V.deathrange[t.tank]),
        speed: num(V.speed[t.tank]), dist: num(V.dist[t.tank]),
        dmgperkill: num(V.dmgperkill[t.tank]), blockratio: num(V.blockratio[t.tank]),
        assistshare: num(V.assistshare[t.tank]), firstblood: num(V.firstblood[t.tank]),
        firstdown: num(V.firstdown[t.tank]), survafterkill: num(V.survafterkill[t.tank])
      };
      var n = { games: v.games };
      FIELDS.forEach(function (f) { if (f.g === "m") n[f.k] = v.games; });
      n.killrange = num(V.killrangeN[t.tank]);
      n.deathrange = num(V.deathrangeN[t.tank]);
      n.dist = num(V.distN[t.tank]);
      n.dmgperkill = num(V.dmgperkillN[t.tank]);
      n.assistshare = num(V.assistshareN[t.tank]);
      n.firstblood = num(V.firstbloodN[t.tank]);
      n.firstdown = num(V.firstdownN[t.tank]);
      n.survafterkill = num(V.survafterkillN[t.tank]);
      return {
        name: t.tank, id: t.tank_id || "", cls: o["class"] || "Unlisted",
        hex: tankHex(t.tank), v: v, n: n
      };
    });
  }

  function ensure(api) {
    T = api;
    ROWS = buildRows();
    if (!S.inspect && ROWS.length) S.inspect = ROWS[0].name;
    return ROWS.length > 0;
  }

  function rowByName(nm) {
    for (var i = 0; i < ROWS.length; i++) if (ROWS[i].name === nm) return ROWS[i];
    return null;
  }

  function classes() {
    var seen = {}, out = [];
    ROWS.forEach(function (r) { if (!seen[r.cls]) { seen[r.cls] = 1; out.push(r.cls); } });
    out.sort(function (a, b) {
      var order = { Light: 0, Medium: 1, Heavy: 2 };
      var oa = order[a] === undefined ? 9 : order[a], ob = order[b] === undefined ? 9 : order[b];
      return oa - ob;
    });
    return out;
  }

  function inClass(r) { return S.cls === "All" || r.cls === S.cls; }

  /* ---------------------------------------------------------------- math */

  function extent(key) {
    var lo = null, hi = null;
    ROWS.forEach(function (r) {
      var v = r.v[key];
      if (!isNum(v)) return;
      if (lo === null || v < lo) lo = v;
      if (hi === null || v > hi) hi = v;
    });
    return [lo, hi];
  }

  function values(key) {
    var out = [];
    ROWS.forEach(function (r) { if (isNum(r.v[key])) out.push(r.v[key]); });
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  function median(sorted) {
    if (!sorted.length) return null;
    var m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }

  function pearsonOf(pairs) {
    var n = pairs.length, i;
    if (n < 3) return null;
    var mx = 0, my = 0;
    for (i = 0; i < n; i++) { mx += pairs[i][0]; my += pairs[i][1]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) {
      var dx = pairs[i][0] - mx, dy = pairs[i][1] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx <= 0 || syy <= 0) return null;
    return { r: sxy / Math.sqrt(sxx * syy), n: n, mx: mx, my: my, b: sxy / sxx };
  }

  function corrOf(a, b, rows) {
    var pairs = [];
    (rows || ROWS).forEach(function (r) {
      var x = r.v[a], y = r.v[b];
      if (isNum(x) && isNum(y)) pairs.push([x, y]);
    });
    return pearsonOf(pairs);
  }

  function ticksFor(lo, hi, want) {
    var span = hi - lo;
    if (!(span > 0)) return [lo];
    var raw = span / Math.max(1, want);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag, step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 2.5) step = 2.5;
    else if (norm <= 5) step = 5;
    else step = 10;
    step *= mag;
    var out = [], t = Math.ceil(lo / step - 1e-9) * step, guard = 0;
    while (t <= hi + step * 1e-6 && guard++ < 40) { out.push(t); t += step; }
    return out;
  }

  function fmtTick(v, step) {
    var dec = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2);
    var s = Math.abs(v) < 1e-9 ? "0" : v.toFixed(dec);
    if (Math.abs(v) >= 1000) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return s;
  }

  function domainOf(list) {
    var lo = Math.min.apply(null, list), hi = Math.max.apply(null, list);
    if (!(hi > lo)) { var d = Math.abs(hi) > 0 ? Math.abs(hi) * 0.1 : 1; return [lo - d, hi + d]; }
    var pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  }

  /* ---------------------------------------------- panel 1: the plotter */

  var PW = 1100, PH = 580, PL = 84, PR = 132, PT = 24, PB = 58;
  var IW = PW - PL - PR, IH = PH - PT - PB;

  function fieldOptions(sel, extra) {
    var out = extra || "";
    ["p", "m", "x"].forEach(function (g) {
      out += '<optgroup label="' + esc(GROUP_NAME[g]) + '">';
      FIELDS.forEach(function (f) {
        if (f.g !== g) return;
        out += '<option value="' + f.k + '"' + (f.k === sel ? " selected" : "") + ">" +
          esc(f.label) + "</option>";
      });
      out += "</optgroup>";
    });
    return out;
  }

  // Everything the scatter needs, computed from state alone. Called once for
  // the static string and again on every control change; the point nodes are
  // then updated in place so their positions animate rather than jump.
  function computePlot() {
    var fx = fld(S.x), fy = fld(S.y);
    var fs = S.size === "none" ? null : fld(S.size);
    var fc = (S.color === "cls" || S.color === "tank") ? null : fld(S.color);

    var pts = [], skipped = 0;
    ROWS.forEach(function (r) {
      var xv = r.v[S.x], yv = r.v[S.y];
      if (!isNum(xv) || !isNum(yv)) { skipped++; return; }
      pts.push({ row: r, xv: xv, yv: yv, sv: fs ? r.v[fs.k] : null, cv: fc ? r.v[fc.k] : null });
    });

    var out = {
      fx: fx, fy: fy, fs: fs, fc: fc, pts: pts, skipped: skipped,
      xt: [], yt: [], fit: null, corr: null, shown: 0
    };
    if (!pts.length) return out;

    var dx = domainOf(pts.map(function (p) { return p.xv; }));
    var dy = domainOf(pts.map(function (p) { return p.yv; }));
    // Size runs from zero rather than from the smallest tank, so the area of a
    // point is proportional to the value and not to its distance above the
    // roster floor. Fields that can go negative fall back to a padded domain.
    var se = null;
    if (fs) {
      var svs = pts.map(function (p) { return isNum(p.sv) ? p.sv : 0; });
      var slo = Math.min.apply(null, svs), shi = Math.max.apply(null, svs);
      se = (slo >= 0 && shi > 0) ? [0, shi] : domainOf(svs);
    }
    var ce = fc ? domainOf(pts.map(function (p) { return isNum(p.cv) ? p.cv : 0; })) : null;

    function sx(v) { return PL + (v - dx[0]) / (dx[1] - dx[0]) * IW; }
    function sy(v) { return PT + IH - (v - dy[0]) / (dy[1] - dy[0]) * IH; }

    pts.forEach(function (p) {
      p.px = sx(p.xv);
      p.py = sy(p.yv);
      var t = (fs && se && se[1] > se[0] && isNum(p.sv)) ? (p.sv - se[0]) / (se[1] - se[0]) : null;
      p.rad = t === null ? 8.5 : 4.6 + 15.4 * Math.sqrt(clamp(t, 0, 1));
      if (S.color === "cls") p.fill = CLS_COLOR[p.row.cls] || "#7f89b3";
      else if (S.color === "tank") p.fill = p.row.hex;
      else if (ce && ce[1] > ce[0] && isNum(p.cv)) p.fill = rampColor((p.cv - ce[0]) / (ce[1] - ce[0]));
      else p.fill = "#6b7590";
      if (!/^#[0-9a-f]{6}$/i.test(p.fill)) p.fill = "#6b7590";
      p.on = inClass(p.row);
      p.side = p.px > PL + IW * 0.76 ? -1 : 1;
      if (p.on) out.shown++;
    });

    var xticks = ticksFor(dx[0], dx[1], 6), yticks = ticksFor(dy[0], dy[1], 5);
    var xstep = xticks.length > 1 ? xticks[1] - xticks[0] : 1;
    var ystep = yticks.length > 1 ? yticks[1] - yticks[0] : 1;
    out.xt = xticks.map(function (v) { return { x: sx(v), label: fmtTick(v, xstep) }; });
    out.yt = yticks.map(function (v) { return { y: sy(v), label: fmtTick(v, ystep) }; });

    var vis = pts.filter(function (p) { return p.on; });
    out.corr = pearsonOf(vis.map(function (p) { return [p.xv, p.yv]; }));
    if (out.corr && S.trend) {
      var c = out.corr;
      var y0 = c.my + c.b * (dx[0] - c.mx), y1 = c.my + c.b * (dx[1] - c.mx);
      // Drawn across the full x domain; a steep fit runs past the top or
      // bottom of the box, so the group carrying it is clipped to the box.
      out.fit = { x1: sx(dx[0]), y1: sy(y0), x2: sx(dx[1]), y2: sy(y1) };
    }
    return out;
  }

  function gridSvg(p) {
    var out = "";
    p.yt.forEach(function (t) {
      out += '<line x1="' + PL + '" y1="' + t.y.toFixed(1) + '" x2="' + (PL + IW) +
        '" y2="' + t.y.toFixed(1) + '" stroke="rgba(255,255,255,.055)" stroke-width="1"/>' +
        '<text x="' + (PL - 10) + '" y="' + (t.y + 4).toFixed(1) +
        '" text-anchor="end" font-size="11" fill="#7f89b3">' + esc(t.label) + "</text>";
    });
    p.xt.forEach(function (t) {
      out += '<line x1="' + t.x.toFixed(1) + '" y1="' + PT + '" x2="' + t.x.toFixed(1) +
        '" y2="' + (PT + IH) + '" stroke="rgba(255,255,255,.055)" stroke-width="1"/>' +
        '<text x="' + t.x.toFixed(1) + '" y="' + (PT + IH + 20) +
        '" text-anchor="middle" font-size="11" fill="#7f89b3">' + esc(t.label) + "</text>";
    });
    out += '<rect x="' + PL + '" y="' + PT + '" width="' + IW + '" height="' + IH +
      '" fill="none" stroke="rgba(255,255,255,.10)"/>';
    out += '<text x="' + (PL + IW / 2) + '" y="' + (PT + IH + 46) +
      '" text-anchor="middle" font-size="12.5" fill="' + GROUP_COLOR[p.fx.g] + '">' +
      esc(p.fx.label) + "</text>";
    out += '<text transform="translate(' + (PL - 56) + ',' + (PT + IH / 2) +
      ') rotate(-90)" text-anchor="middle" font-size="12.5" fill="' +
      GROUP_COLOR[p.fy.g] + '">' + esc(p.fy.label) + "</text>";
    return out;
  }

  function fitSvg(p) {
    if (!p.fit) return "";
    return '<line x1="' + p.fit.x1.toFixed(1) + '" y1="' + p.fit.y1.toFixed(1) +
      '" x2="' + p.fit.x2.toFixed(1) + '" y2="' + p.fit.y2.toFixed(1) +
      '" stroke="rgba(255,255,255,.30)" stroke-width="1.4" stroke-dasharray="7 6"/>';
  }

  function pointsSvg(p) {
    return p.pts.map(function (q) {
      var lx = q.side > 0 ? (q.rad + 7) : -(q.rad + 7);
      return '<g class="lab-pt' + (q.on ? "" : " off") + '" data-tank="' + esc(q.row.name) +
        '" style="transform:translate(' + q.px.toFixed(1) + 'px,' + q.py.toFixed(1) + 'px)">' +
        '<circle r="' + q.rad.toFixed(1) + '" fill="' + q.fill +
        '" fill-opacity="0.82" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
        '<text x="' + lx.toFixed(1) + '" y="4" text-anchor="' + (q.side > 0 ? "start" : "end") +
        '" font-size="11.5" fill="#c8d0ea" paint-order="stroke" stroke="#0a0e1f" ' +
        'stroke-width="3" stroke-linejoin="round" opacity="' + (S.names ? 1 : 0) + '">' +
        esc(q.row.name) + "</text></g>";
    }).join("");
  }

  function plotReadout(p) {
    var bits = [];
    if (p.corr) {
      var a = Math.abs(p.corr.r);
      bits.push("<b>r = " + (p.corr.r >= 0 ? "+" : "") + p.corr.r.toFixed(2) +
        "</b> across <b>" + p.corr.n + "</b> tanks, " +
        (a >= 0.8 ? "a tight line" : a >= 0.5 ? "a loose slope" :
          a >= 0.25 ? "a hint at best" : "no visible relationship"));
    } else {
      bits.push("Not enough points on both axes to fit anything");
    }
    if (p.skipped) bits.push('<span class="lab-warn">' + p.skipped +
      " tank" + (p.skipped === 1 ? "" : "s") + " left out for a missing value</span>");
    if (S.x === S.y) bits.push('<span class="lab-warn">Both axes are the same field</span>');
    if ((S.x === "games" && S.y === "pick") || (S.x === "pick" && S.y === "games")) {
      bits.push('<span class="lab-warn">These two are the same number rescaled. ' +
        "The perfect line means nothing</span>");
    }
    return bits.join(". ") + ".";
  }

  function plotPanel() {
    var p = computePlot();
    var body =
      '<p class="lab-lede">Any two of <b>' + FIELDS.length + "</b> fields, against " +
      "each other. Size and colour take a third and a fourth. One point per tank. " +
      "<b>" + ROWS.length + "</b> tanks in all.</p>" +
      '<div class="lab-key">' +
      '<span><i class="lab-dot" style="background:' + GOLD + '"></i><b>Published</b></span>' +
      '<span><i class="lab-dot" style="background:' + BLUE + '"></i><b>Measured</b>, per match</span>' +
      '<span><i class="lab-dot" style="background:' + TEAL + '"></i><b>Measured</b>, from positions</span>' +
      "</div>" +
      '<div class="lab-ctl">' +
      '<label class="lab-f"><span>X axis</span><select class="lab-selx">' + fieldOptions(S.x) + "</select></label>" +
      '<label class="lab-f"><span>Y axis</span><select class="lab-sely">' + fieldOptions(S.y) + "</select></label>" +
      '<label class="lab-f"><span>Point size</span><select class="lab-sels">' +
      fieldOptions(S.size, '<option value="none"' + (S.size === "none" ? " selected" : "") +
        ">Same size for all</option>") + "</select></label>" +
      '<label class="lab-f"><span>Point colour</span><select class="lab-selc">' +
      fieldOptions(S.color,
        '<option value="cls"' + (S.color === "cls" ? " selected" : "") + ">Tank class</option>" +
        '<option value="tank"' + (S.color === "tank" ? " selected" : "") + ">Tank identity</option>") +
      "</select></label>" +
      '<button type="button" class="lab-btn lab-swap">Swap axes</button>' +
      '<button type="button" class="lab-btn lab-fit' + (S.trend ? " on" : "") + '">Fit line</button>' +
      '<button type="button" class="lab-btn lab-nm' + (S.names ? " on" : "") + '">Names</button>' +
      "</div>" +
      '<div class="lab-chips lab-clsrow">' + classChips() + "</div>" +
      '<div class="lab-plotwrap">' +
      '<svg class="lab-svg lab-plot" viewBox="0 0 ' + PW + " " + PH + '" role="img">' +
      '<defs><clipPath id="labplotclip"><rect x="' + PL + '" y="' + PT + '" width="' +
      IW + '" height="' + IH + '"/></clipPath></defs>' +
      '<g class="lab-grid">' + gridSvg(p) + "</g>" +
      '<g class="lab-trend" clip-path="url(#labplotclip)">' + fitSvg(p) + "</g>" +
      '<g class="lab-pts">' + pointsSvg(p) + "</g>" +
      "</svg>" +
      '<div class="lab-tip"></div>' +
      "</div>" +
      '<div class="lab-read lab-plotread">' + plotReadout(p) + "</div>";

    var nMatch = ((T.DATA && T.DATA.matches) || []).length;
    return T.bigPanel("Plot anything against anything", body,
      "n=" + ROWS.length + " tanks. Every fit here is thin, and none of them says " +
      "anything about cause. Measured fields come from " +
      (nMatch ? T.fmtNum(nMatch) + " decoded matches" : "decoded matches") +
      ". Point size has a minimum radius. Read it as bigger and smaller, not as a " +
      "ratio.");
  }

  function classChips() {
    var out = '<button type="button" class="lab-chip lab-cc' + (S.cls === "All" ? " on" : "") +
      '" data-cls="All">All ' + ROWS.length + "</button>";
    classes().forEach(function (c) {
      var n = 0;
      ROWS.forEach(function (r) { if (r.cls === c) n++; });
      out += '<button type="button" class="lab-chip lab-cc' + (S.cls === c ? " on" : "") +
        '" data-cls="' + esc(c) + '" style="--cc:' + (CLS_COLOR[c] || ACCENT) + '">' +
        esc(c) + " " + n + "</button>";
    });
    return out;
  }

  function wirePlot() {
    var wrap = ROOT.querySelector(".lab-plotwrap");
    if (!wrap) return;
    var svg = wrap.querySelector(".lab-plot");
    var tip = wrap.querySelector(".lab-tip");
    var gGrid = svg.querySelector(".lab-grid");
    var gTrend = svg.querySelector(".lab-trend");
    var gPts = svg.querySelector(".lab-pts");
    var read = ROOT.querySelector(".lab-plotread");

    function nodes() {
      var out = {}, list = gPts.childNodes, i;
      for (i = 0; i < list.length; i++) {
        if (list[i].getAttribute) out[list[i].getAttribute("data-tank")] = list[i];
      }
      return out;
    }
    var NODE = nodes();

    function apply() {
      var p = computePlot();
      gGrid.innerHTML = gridSvg(p);
      gTrend.innerHTML = fitSvg(p);
      var seen = {};
      p.pts.forEach(function (q) {
        var g = NODE[q.row.name];
        seen[q.row.name] = 1;
        if (!g) return;
        g.style.transform = "translate(" + q.px.toFixed(1) + "px," + q.py.toFixed(1) + "px)";
        g.style.display = "";
        var c = g.getElementsByTagName("circle")[0];
        var t = g.getElementsByTagName("text")[0];
        if (c) { c.setAttribute("r", q.rad.toFixed(1)); c.setAttribute("fill", q.fill); }
        if (t) {
          var lx = q.side > 0 ? (q.rad + 7) : -(q.rad + 7);
          t.setAttribute("x", lx.toFixed(1));
          t.setAttribute("text-anchor", q.side > 0 ? "start" : "end");
          t.setAttribute("opacity", S.names ? "1" : "0");
        }
        setCls(g, q.row.name, q.on);
      });
      ROWS.forEach(function (r) {
        var g = NODE[r.name];
        if (g && !seen[r.name]) g.style.display = "none";
      });
      if (read) read.innerHTML = plotReadout(p);
    }

    function setCls(g, name, on) {
      var c = "lab-pt";
      if (!on) c += " off";
      if (S.inspect === name) c += " sel";
      g.setAttribute("class", c);
    }

    function bindSel(cls, key) {
      var e = ROOT.querySelector(cls);
      if (!e) return;
      e.addEventListener("change", function () { S[key] = e.value; apply(); });
    }
    bindSel(".lab-selx", "x");
    bindSel(".lab-sely", "y");
    bindSel(".lab-sels", "size");
    bindSel(".lab-selc", "color");

    var swap = ROOT.querySelector(".lab-swap");
    if (swap) swap.addEventListener("click", function () {
      var t = S.x; S.x = S.y; S.y = t;
      syncSelects();
      apply();
    });
    var fit = ROOT.querySelector(".lab-fit");
    if (fit) fit.addEventListener("click", function () {
      S.trend = !S.trend;
      fit.className = "lab-btn lab-fit" + (S.trend ? " on" : "");
      apply();
    });
    var nm = ROOT.querySelector(".lab-nm");
    if (nm) nm.addEventListener("click", function () {
      S.names = !S.names;
      nm.className = "lab-btn lab-nm" + (S.names ? " on" : "");
      apply();
    });

    var clsRow = ROOT.querySelector(".lab-clsrow");
    if (clsRow) clsRow.addEventListener("click", function (e) {
      var b = e.target;
      while (b && b !== clsRow && !b.getAttribute) b = b.parentNode;
      var c = b && b.getAttribute ? b.getAttribute("data-cls") : null;
      if (!c) return;
      S.cls = c;
      clsRow.innerHTML = classChips();
      apply();
      updPc();
      if (RANK_API) RANK_API.apply();
    });

    // Hover readout. The tooltip is HTML rather than SVG so the numbers stay
    // crisp at any zoom and can use tabular figures.
    function pointOf(el) {
      while (el && el !== svg) {
        if (el.getAttribute && el.getAttribute("data-tank")) return el;
        el = el.parentNode;
      }
      return null;
    }

    svg.addEventListener("mousemove", function (e) {
      var g = pointOf(e.target);
      if (!g) { tip.style.opacity = "0"; return; }
      var name = g.getAttribute("data-tank");
      var r = rowByName(name);
      if (!r) return;
      var box = wrap.getBoundingClientRect();
      var lx = e.clientX - box.left + 16, ly = e.clientY - box.top + 14;
      if (lx > box.width - 190) lx = box.width - 190;
      tip.style.left = Math.max(0, lx) + "px";
      tip.style.top = Math.max(0, ly) + "px";
      tip.style.setProperty("--tc", r.hex);
      var lines = [{ k: "X", f: fld(S.x) }, { k: "Y", f: fld(S.y) }];
      if (S.size !== "none") lines.push({ k: "Size", f: fld(S.size) });
      if (S.color !== "cls" && S.color !== "tank") lines.push({ k: "Colour", f: fld(S.color) });
      tip.innerHTML = "<b>" + esc(r.name) + "</b>" +
        '<span class="lab-tc">' + esc(r.cls) + " &middot; " +
        T.fmtNum(r.v.games) + " games</span>" +
        lines.map(function (l) {
          return "<div><span>" + esc(l.f.label) + "</span><span style='color:" +
            GROUP_COLOR[l.f.g] + "'>" + esc(fmtVal(l.f, r.v[l.f.k])) + "</span></div>";
        }).join("");
      tip.style.opacity = "1";
    });
    svg.addEventListener("mouseleave", function () { tip.style.opacity = "0"; });

    svg.addEventListener("click", function (e) {
      var g = pointOf(e.target);
      if (!g) return;
      S.inspect = g.getAttribute("data-tank");
      apply();
      updInspect();
    });

    function syncSelects() {
      var m = { ".lab-selx": "x", ".lab-sely": "y", ".lab-sels": "size", ".lab-selc": "color" };
      for (var cls in m) {
        if (!Object.prototype.hasOwnProperty.call(m, cls)) continue;
        var e = ROOT.querySelector(cls);
        if (e) e.value = S[m[cls]];
      }
    }

    // Other panels drive the plot; this is the door they come in through.
    PLOT_API = { apply: apply, sync: function () { syncSelects(); apply(); } };
  }

  function updPlot() { if (PLOT_API) PLOT_API.sync(); }

  /* ------------------------------------------- panel 2: the correlation grid */

  function mxFields() {
    return FIELDS.filter(function (f) { return S.mx[f.g]; });
  }

  function matrixSvg() {
    var fs = mxFields();
    var n = fs.length;
    if (n < 2) return '<p class="small">Turn at least one group back on.</p>';
    var cell = Math.max(19, Math.min(40, Math.floor(760 / n)));
    var left = 118, top = 96, right = 66, bottom = 10;
    var W = left + n * cell + right, H = top + n * cell + bottom;
    var out = '<svg class="lab-svg lab-mxsvg" viewBox="0 0 ' + W + " " + H +
      '" style="max-width:' + W + 'px" role="img">';
    var showNum = cell >= 30;

    for (var i = 0; i < n; i++) {
      var fy = fs[i];
      out += '<text x="' + (left - 8) + '" y="' + (top + i * cell + cell / 2 + 3.5) +
        '" text-anchor="end" font-size="10.5" fill="' + GROUP_COLOR[fy.g] + '">' +
        esc(fy.short) + "</text>";
      var fxx = fs[i];
      out += '<text transform="translate(' + (left + i * cell + cell / 2 + 3) + "," + (top - 7) +
        ') rotate(-52)" text-anchor="start" font-size="10.5" fill="' + GROUP_COLOR[fxx.g] + '">' +
        esc(fxx.short) + "</text>";
    }

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var x = left + c * cell, y = top + r * cell;
        if (r === c) {
          out += '<rect x="' + x + '" y="' + y + '" width="' + (cell - 1) + '" height="' +
            (cell - 1) + '" fill="rgba(255,255,255,.05)"/>';
          continue;
        }
        var cr = corrOf(fs[c].k, fs[r].k);
        var v = cr ? cr.r : null;
        var sel = (fs[c].k === S.x && fs[r].k === S.y);
        out += '<rect class="lab-cell" x="' + x + '" y="' + y + '" width="' + (cell - 1) +
          '" height="' + (cell - 1) + '" rx="2" fill="' + (v === null ? "#151c34" : corrColor(v)) +
          '" stroke="' + (sel ? "#ffffff" : "rgba(255,255,255,.05)") + '" stroke-width="' +
          (sel ? 2 : 0.6) + '" data-a="' + fs[c].k + '" data-b="' + fs[r].k + '"></rect>';
        if (showNum && v !== null) {
          out += '<text x="' + (x + (cell - 1) / 2) + '" y="' + (y + cell / 2 + 3.5) +
            '" text-anchor="middle" font-size="9.5" pointer-events="none" fill="' +
            (Math.abs(v) > 0.55 ? "#0b1020" : "#96a0c4") + '">' +
            (v >= 0 ? "" : "-") + Math.round(Math.abs(v) * 100) + "</text>";
        }
      }
    }
    out += "</svg>";
    return out;
  }

  function matrixLegend() {
    var stops = "";
    for (var i = 0; i <= 20; i++) {
      var v = -1 + (i / 20) * 2;
      stops += '<stop offset="' + (i * 5) + '%" stop-color="' + corrColor(v) + '"/>';
    }
    return '<svg viewBox="0 0 320 34" style="width:320px;max-width:100%;height:auto" role="img">' +
      '<defs><linearGradient id="labcg" x1="0" x2="1">' + stops + "</linearGradient></defs>" +
      '<rect x="0" y="4" width="320" height="11" rx="3" fill="url(#labcg)"/>' +
      '<text x="0" y="30" font-size="10.5" fill="#7f89b3">-1 one falls as the other rises</text>' +
      '<text x="320" y="30" text-anchor="end" font-size="10.5" fill="#7f89b3">+1 they rise together</text>' +
      "</svg>";
  }

  function matrixPanel() {
    var body =
      '<p class="lab-lede">Each square is the correlation between two fields ' +
      "across the roster. <b>Click one to load that pair into the scatter " +
      "above.</b></p>" +
      '<div class="lab-chips lab-mxrow">' +
      ["p", "m", "x"].map(function (g) {
        var n = 0;
        FIELDS.forEach(function (f) { if (f.g === g) n++; });
        return '<button type="button" class="lab-chip lab-mxg' + (S.mx[g] ? " on" : "") +
          '" data-g="' + g + '" style="--cc:' + GROUP_COLOR[g] + '">' +
          esc(GROUP_NAME[g]) + " " + n + "</button>";
      }).join("") + "</div>" +
      '<div class="lab-mx lab-mxhost">' + matrixSvg() + "</div>" +
      '<div style="margin-top:10px">' + matrixLegend() + "</div>" +
      '<div class="lab-read lab-mxread">Hover a square for the pair and its correlation.</div>';

    var pairs = FIELDS.length * (FIELDS.length - 1) / 2;
    return T.bigPanel("Which pairs are worth plotting", body,
      "Pearson r over n=" + ROWS.length + " tanks at most. This grid runs " + pairs +
      " pairs, and about " + Math.round(pairs * 0.05) + " squares would look " +
      "significant on random numbers alone. A bright square is a place to look, " +
      "not a result. Pearson also misses curves.");
  }

  function wireMatrix() {
    var host = ROOT.querySelector(".lab-mxhost");
    var read = ROOT.querySelector(".lab-mxread");
    var row = ROOT.querySelector(".lab-mxrow");
    if (!host) return;

    function describe(a, b) {
      var cr = corrOf(a, b);
      if (!cr) return "No overlap between those two fields.";
      var fa = fld(a), fb = fld(b);
      var extra = "";
      if ((a === "games" && b === "pick") || (a === "pick" && b === "games")) {
        extra = ' <span class="lab-warn">These are the same number rescaled.</span>';
      } else if ((a === "mreload" && b === "preload") || (a === "preload" && b === "mreload")) {
        extra = " One quantity from two sources. A check, not a finding.";
      }
      return "<b>" + esc(fa.label) + "</b> against <b>" + esc(fb.label) +
        "</b>: r = <b>" + (cr.r >= 0 ? "+" : "") + cr.r.toFixed(2) + "</b> over <b>" +
        cr.n + "</b> tanks." + extra;
    }

    function cellOf(el) {
      while (el && el !== host) {
        if (el.getAttribute && el.getAttribute("data-a")) return el;
        el = el.parentNode;
      }
      return null;
    }

    host.addEventListener("mousemove", function (e) {
      var c = cellOf(e.target);
      if (!c || !read) return;
      read.innerHTML = describe(c.getAttribute("data-a"), c.getAttribute("data-b"));
    });
    host.addEventListener("click", function (e) {
      var c = cellOf(e.target);
      if (!c) return;
      S.x = c.getAttribute("data-a");
      S.y = c.getAttribute("data-b");
      host.innerHTML = matrixSvg();
      if (read) read.innerHTML = describe(S.x, S.y) + " Loaded into the scatter above.";
      updPlot();
    });
    if (row) row.addEventListener("click", function (e) {
      var b = e.target;
      while (b && b !== row && !(b.getAttribute && b.getAttribute("data-g"))) b = b.parentNode;
      var g = b && b.getAttribute ? b.getAttribute("data-g") : null;
      if (!g) return;
      var on = 0;
      ["p", "m", "x"].forEach(function (k) { if (S.mx[k]) on++; });
      if (S.mx[g] && on <= 1) return;         // never leave the grid empty
      S.mx[g] = S.mx[g] ? 0 : 1;
      b.className = "lab-chip lab-mxg" + (S.mx[g] ? " on" : "");
      host.innerHTML = matrixSvg();
    });
  }

  /* ------------------------------------------------ panel 3: the ranking */

  var RANK_H = 26;

  // reload is the only quantity the site holds in both a published and a
  // measured form, so it is the only field that gets a paired row. Nothing
  // else is paired, because nothing else measures the same thing twice.
  var PAIR = { mreload: "preload", preload: "mreload" };

  function rankPair() { return PAIR[S.rankField] || null; }

  function rankOrder() {
    var f = S.rankField;
    var list = ROWS.slice();
    list.sort(function (a, b) {
      var av = a.v[f], bv = b.v[f];
      if (!isNum(av) && !isNum(bv)) return a.name < b.name ? -1 : 1;
      if (!isNum(av)) return 1;
      if (!isNum(bv)) return -1;
      if (av === bv) return a.name < b.name ? -1 : 1;
      return S.rankDir < 0 ? bv - av : av - bv;
    });
    return list;
  }

  function rankRowsHtml() {
    return ROWS.map(function (r) {
      return '<div class="lab-rk" data-tank="' + esc(r.name) + '" style="transform:translateY(0px)">' +
        '<span class="lab-rk-n"></span>' +
        '<span class="lab-rk-t" style="color:' + r.hex + '">' + esc(r.name) + "</span>" +
        '<span class="lab-rk-bars">' +
        '<span class="lab-rk-bar lab-rk-a" style="width:0%"></span>' +
        '<span class="lab-rk-bar lab-rk-b" style="width:0%"></span>' +
        "</span>" +
        '<span class="lab-rk-v"></span>' +
        '<span class="lab-rk-d"></span>' +
        "</div>";
    }).join("");
  }

  function rankPanel() {
    var body =
      '<p class="lab-lede">One field, every tank, sorted. Where a published and a ' +
      "measured version both exist, both bars are drawn.</p>" +
      '<div class="lab-ctl">' +
      '<label class="lab-f"><span>Field</span><select class="lab-selr">' +
      fieldOptions(S.rankField) + "</select></label>" +
      '<button type="button" class="lab-btn lab-rdir">' +
      (S.rankDir < 0 ? "Highest first" : "Lowest first") + "</button>" +
      "</div>" +
      '<div class="lab-rank lab-rankhost" style="height:' + (ROWS.length * RANK_H) + 'px">' +
      rankRowsHtml() + "</div>" +
      '<div class="lab-read lab-rankread"></div>';

    return T.bigPanel("One field, all " + ROWS.length + " tanks", body,
      "Bars run from zero. A short bar is a small number, not a bad one. Reload is " +
      "the only field with two sources, and the measured one is a mode, not a median.");
  }

  function wireRank() {
    var host = ROOT.querySelector(".lab-rankhost");
    var read = ROOT.querySelector(".lab-rankread");
    if (!host) return;
    var sel = ROOT.querySelector(".lab-selr");
    var dir = ROOT.querySelector(".lab-rdir");

    var NODE = {};
    (function () {
      var list = host.childNodes;
      for (var i = 0; i < list.length; i++) {
        if (list[i].getAttribute) NODE[list[i].getAttribute("data-tank")] = list[i];
      }
    })();

    function apply() {
      var f = fld(S.rankField);
      var pk = rankPair();
      var pf = pk ? fld(pk) : null;
      var order = rankOrder();
      var top = 0;
      ROWS.forEach(function (r) {
        var v = r.v[f.k];
        if (isNum(v) && v > top) top = v;
        if (pf) { var w = r.v[pf.k]; if (isNum(w) && w > top) top = w; }
      });
      if (!(top > 0)) top = 1;

      var deltas = 0, worst = null, everAbove = false, compared = 0;
      order.forEach(function (r, i) {
        var g = NODE[r.name];
        if (!g) return;
        g.style.transform = "translateY(" + (i * RANK_H) + "px)";
        g.className = "lab-rk" + (pf ? " pair" : "") + (inClass(r) ? "" : " off");
        var kids = g.childNodes;
        kids[0].innerHTML = String(i + 1);
        var bars = kids[2];
        var a = bars.childNodes[0], b = bars.childNodes[1];
        var v = r.v[f.k];
        a.style.width = (isNum(v) ? clamp(v / top, 0, 1) * 100 : 0).toFixed(2) + "%";
        a.style.backgroundColor = f.g === "p" ? GOLD : (f.g === "x" ? TEAL : BLUE);
        var d = "";
        if (pf) {
          var w = r.v[pf.k];
          b.style.width = (isNum(w) ? clamp(w / top, 0, 1) * 100 : 0).toFixed(2) + "%";
          b.style.backgroundColor = pf.g === "p" ? GOLD : (pf.g === "x" ? TEAL : BLUE);
          if (isNum(v) && isNum(w)) {
            var meas = f.g === "p" ? w : v, pub = f.g === "p" ? v : w;
            var gap = meas - pub;
            compared++;
            if (gap > 0.001) everAbove = true;
            if (Math.abs(gap) >= 0.05) {
              deltas++;
              if (worst === null || Math.abs(gap) > Math.abs(worst.gap)) worst = { name: r.name, gap: gap };
              d = (gap > 0 ? "+" : "") + gap.toFixed(2) + " s";
            } else {
              d = "matches";
            }
          }
        } else {
          b.style.width = "0%";
        }
        kids[3].innerHTML = esc(fmtVal(f, v));
        kids[4].innerHTML = esc(d);
      });

      if (read) {
        if (pf) {
          var cr = corrOf("mreload", "preload");
          read.innerHTML = '<span style="color:' + GOLD + '">Gold is published</span>, ' +
            '<span style="color:' + BLUE + '">blue is measured</span>. They land within ' +
            "0.05 s of each other on <b>" + (compared - deltas) + "</b> of <b>" + compared +
            "</b> tanks" + (cr ? ", r = <b>+" + cr.r.toFixed(2) + "</b> over " + cr.n +
              " tanks" : "") +
            (worst ? ". The widest gap is <b>" + esc(worst.name) + "</b> at " +
              (worst.gap > 0 ? "+" : "") + worst.gap.toFixed(2) + " s" : "") +
            (compared && !everAbove ? ", and measured stays under published throughout" : "") +
            ". Last column is measured minus published.";
        } else {
          var vals = values(f.k);
          read.innerHTML = vals.length
            ? "Lowest <b>" + esc(fmtVal(f, vals[0])) + "</b>, median <b>" +
              esc(fmtVal(f, median(vals))) + "</b>, highest <b>" +
              esc(fmtVal(f, vals[vals.length - 1])) + "</b> over <b>" + vals.length +
              "</b> tanks."
            : "No tank carries a value for that field.";
        }
      }
    }

    if (sel) sel.addEventListener("change", function () { S.rankField = sel.value; apply(); });
    if (dir) dir.addEventListener("click", function () {
      S.rankDir = -S.rankDir;
      dir.innerHTML = S.rankDir < 0 ? "Highest first" : "Lowest first";
      apply();
    });
    host.addEventListener("click", function (e) {
      var el = e.target;
      while (el && el !== host && !(el.getAttribute && el.getAttribute("data-tank"))) el = el.parentNode;
      if (!el || el === host) return;
      S.inspect = el.getAttribute("data-tank");
      updPlot();
      updInspect();
    });

    RANK_API = { apply: apply };
    apply();
  }

  /* -------------------------------- panel 4: every field at once (parallel) */

  var PCW = 1100, PCH = 420, PCL = 26, PCR = 26, PCT = 44, PCB = 46;

  function pcSvg() {
    var keys = S.pcKeys.slice();
    if (keys.length < 2) {
      return '<p class="small">Pick at least two fields.</p>';
    }
    var n = keys.length;
    var innerW = PCW - PCL - PCR, innerH = PCH - PCT - PCB;
    var stepX = n > 1 ? innerW / (n - 1) : 0;
    var ext = keys.map(function (k) { return extent(k); });

    var out = '<svg class="lab-svg lab-pcsvg" viewBox="0 0 ' + PCW + " " + PCH + '" role="img">';
    keys.forEach(function (k, i) {
      var f = fld(k), x = PCL + i * stepX, e = ext[i];
      out += '<line x1="' + x.toFixed(1) + '" y1="' + PCT + '" x2="' + x.toFixed(1) +
        '" y2="' + (PCT + innerH) + '" stroke="rgba(255,255,255,.13)" stroke-width="1"/>';
      var anchor = i === 0 ? "start" : (i === n - 1 ? "end" : "middle");
      out += '<text x="' + x.toFixed(1) + '" y="' + (PCT - 22) + '" text-anchor="' + anchor +
        '" font-size="12" fill="' + GROUP_COLOR[f.g] + '">' + esc(f.short) + "</text>";
      out += '<text x="' + x.toFixed(1) + '" y="' + (PCT - 8) + '" text-anchor="' + anchor +
        '" font-size="10" fill="#7f89b3">' + esc(e[1] === null ? "-" : fmtVal(f, e[1])) + "</text>";
      out += '<text x="' + x.toFixed(1) + '" y="' + (PCT + innerH + 16) + '" text-anchor="' +
        anchor + '" font-size="10" fill="#7f89b3">' +
        esc(e[0] === null ? "-" : fmtVal(f, e[0])) + "</text>";
    });

    var lines = "";
    ROWS.forEach(function (r) {
      var pts = [], ok = true;
      keys.forEach(function (k, i) {
        var v = r.v[k], e = ext[i];
        if (!isNum(v) || e[0] === null) { ok = false; return; }
        var t = e[1] > e[0] ? (v - e[0]) / (e[1] - e[0]) : 0.5;
        pts.push([PCL + i * stepX, PCT + innerH - t * innerH]);
      });
      if (!ok || pts.length < 2) return;
      var d = pts.map(function (p, i) {
        return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
      }).join(" ");
      var on = inClass(r) && (!S.pcPin || S.pcPin === r.name);
      var hot = S.pcPin === r.name;
      lines += '<path class="lab-line' + (on ? "" : " off") + (hot ? " hot" : "") +
        '" data-tank="' + esc(r.name) + '" d="' + d + '" fill="none" stroke="' +
        (CLS_COLOR[r.cls] || "#7f89b3") + '" stroke-width="' + (hot ? 3.4 : 1.9) +
        '" stroke-opacity="0.85" stroke-linejoin="round"/>';
    });
    out += lines + "</svg>";
    return out;
  }

  function pcPanel() {
    var body =
      '<p class="lab-lede">Every tank as one line, across as many fields as you ' +
      "want. <b>Click a field to add or drop an axis, click a tank to pin it.</b></p>" +
      '<div class="lab-chips lab-pcrow">' +
      FIELDS.map(function (f) {
        var on = S.pcKeys.indexOf(f.k) >= 0;
        return '<button type="button" class="lab-chip lab-pcf' + (on ? " on" : "") +
          '" data-k="' + f.k + '" style="--cc:' + GROUP_COLOR[f.g] + '">' +
          esc(f.short) + "</button>";
      }).join("") + "</div>" +
      '<div class="lab-pchost">' + pcSvg() + "</div>" +
      '<div class="lab-pc-legend lab-pcleg">' +
      ROWS.map(function (r) {
        return '<button type="button" class="lab-chip tk lab-pct' +
          (S.pcPin === r.name ? " on" : "") + '" data-tank="' + esc(r.name) +
          '" style="--tc:' + (CLS_COLOR[r.cls] || "#7f89b3") + ";--cc:" +
          (CLS_COLOR[r.cls] || ACCENT) + '">' + esc(r.name) + "</button>";
      }).join("") + "</div>" +
      '<div class="lab-read lab-pcread">Lines are coloured by class. Click a tank to pin it.</div>';

    return T.bigPanel("Every field at once", body,
      "Each axis runs lowest tank to highest. Height is a rank, not a value. A tank " +
      "missing any selected axis is not drawn at all.");
  }

  function updPc() {
    if (!ROOT) return;
    var host = ROOT.querySelector(".lab-pchost");
    if (host) host.innerHTML = pcSvg();
  }

  function wirePc() {
    var host = ROOT.querySelector(".lab-pchost");
    var row = ROOT.querySelector(".lab-pcrow");
    var leg = ROOT.querySelector(".lab-pcleg");
    var read = ROOT.querySelector(".lab-pcread");
    if (!host) return;

    if (row) row.addEventListener("click", function (e) {
      var b = e.target;
      while (b && b !== row && !(b.getAttribute && b.getAttribute("data-k"))) b = b.parentNode;
      var k = b && b.getAttribute ? b.getAttribute("data-k") : null;
      if (!k) return;
      var i = S.pcKeys.indexOf(k);
      if (i >= 0) {
        if (S.pcKeys.length <= 2) return;     // two axes is the floor
        S.pcKeys.splice(i, 1);
      } else {
        S.pcKeys.push(k);
      }
      b.className = "lab-chip lab-pcf" + (S.pcKeys.indexOf(k) >= 0 ? " on" : "");
      updPc();
      if (read) read.innerHTML = "<b>" + S.pcKeys.length + "</b> axes. " +
        (S.pcKeys.length > 8 ? "Past eight the lines stop being readable." :
          "Lines are coloured by class.");
    });

    if (leg) leg.addEventListener("click", function (e) {
      var b = e.target;
      while (b && b !== leg && !(b.getAttribute && b.getAttribute("data-tank"))) b = b.parentNode;
      var nm = b && b.getAttribute ? b.getAttribute("data-tank") : null;
      if (!nm) return;
      S.pcPin = S.pcPin === nm ? null : nm;
      var kids = leg.childNodes;
      for (var i = 0; i < kids.length; i++) {
        if (!kids[i].getAttribute) continue;
        var on = kids[i].getAttribute("data-tank") === S.pcPin;
        kids[i].className = "lab-chip tk lab-pct" + (on ? " on" : "");
      }
      updPc();
      if (read) {
        var r = S.pcPin ? rowByName(S.pcPin) : null;
        read.innerHTML = r
          ? "<b>" + esc(r.name) + "</b>, " + esc(r.cls) + ". Click it again to release."
          : "Lines are coloured by class. Click a tank to pin it.";
      }
    });

    host.addEventListener("mousemove", function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var nm = el.getAttribute("data-tank");
      if (!nm || !read || S.pcPin) return;
      var r = rowByName(nm);
      if (r) read.innerHTML = "<b>" + esc(r.name) + "</b>, " + esc(r.cls) + ". " +
        S.pcKeys.map(function (k) {
          return esc(fld(k).short) + " " + esc(fmtVal(fld(k), r.v[k]));
        }).join(", ") + ".";
    });
    host.addEventListener("click", function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var nm = el.getAttribute("data-tank");
      if (!nm) return;
      S.pcPin = S.pcPin === nm ? null : nm;
      S.inspect = nm;
      updPc();
      updPlot();
      updInspect();
      if (leg) {
        var kids = leg.childNodes;
        for (var i = 0; i < kids.length; i++) {
          if (!kids[i].getAttribute) continue;
          kids[i].className = "lab-chip tk lab-pct" +
            (kids[i].getAttribute("data-tank") === S.pcPin ? " on" : "");
        }
      }
    });
  }

  /* ------------------------------------------ panel 5: one tank, every number */

  function rankOf(key, value, dir) {
    if (!isNum(value)) return null;
    var better = 0, total = 0;
    ROWS.forEach(function (r) {
      var v = r.v[key];
      if (!isNum(v)) return;
      total++;
      if (dir > 0 ? v > value : v < value) better++;
    });
    return { rank: better + 1, of: total };
  }

  function inspectBody() {
    var r = rowByName(S.inspect) || ROWS[0];
    if (!r) return "";
    var head = '<div class="lab-ihead"><h3 style="color:' + r.hex + '">' + esc(r.name) + "</h3>" +
      "<span>" + esc(r.cls) + "</span>" +
      "<span>" + T.fmtNum(r.v.games) + " decoded games</span>" +
      "<span>" + T.fmtPct(r.v.winrate) + " win rate</span></div>";

    var cols = ["p", "m", "x"].map(function (g) {
      var rows = FIELDS.filter(function (f) { return f.g === g; }).map(function (f) {
        var v = r.v[f.k];
        var e = extent(f.k);
        var t = (isNum(v) && e[0] !== null && e[1] > e[0]) ? (v - e[0]) / (e[1] - e[0]) : 0;
        var rk = rankOf(f.k, v, 1);
        return '<div class="lab-irow" data-k="' + f.k + '">' +
          '<span class="lab-il">' + esc(f.label) +
          '<span class="lab-ibar"><i style="width:' + (t * 100).toFixed(1) +
          "%;background:" + GROUP_COLOR[g] + '"></i></span></span>' +
          '<span class="lab-iv">' + esc(fmtVal(f, v)) + "</span>" +
          '<span class="lab-ir">' + (rk ? rk.rank + "/" + rk.of : "-") + "</span>" +
          "</div>";
      }).join("");
      return '<div class="lab-icol"><div class="lab-ih" style="color:' + GROUP_COLOR[g] + '">' +
        esc(GROUP_NAME[g]) + "</div>" + rows + "</div>";
    }).join("");

    return head + '<div class="lab-ins">' + cols + "</div>";
  }

  function inspectPanel() {
    var body =
      '<p class="lab-lede">Every field, for one tank at a time. <b>Click a field to ' +
      "send it to the scatter&#39;s Y axis.</b></p>" +
      '<div class="lab-chips lab-insrow">' +
      ROWS.map(function (r) {
        return '<button type="button" class="lab-chip tk lab-ins-t' +
          (S.inspect === r.name ? " on" : "") + '" data-tank="' + esc(r.name) +
          '" style="--tc:' + r.hex + ";--cc:" + r.hex + '">' + esc(r.name) + "</button>";
      }).join("") + "</div>" +
      '<div class="lab-inshost">' + inspectBody() + "</div>";

    return T.bigPanel("One tank, every number", body,
      "Rank 1 is the highest value, not the best. Bars are min to max, and not " +
      "percentiles. Measured fields rest on that tank's decoded games, from " +
      (function () {
        var g = values("games");
        return g.length ? T.fmtNum(g[0]) + " to " + T.fmtNum(g[g.length - 1]) : "a small number";
      })() + " across the roster.");
  }

  function updInspect() {
    if (!ROOT) return;
    var host = ROOT.querySelector(".lab-inshost");
    if (host) host.innerHTML = inspectBody();
    var row = ROOT.querySelector(".lab-insrow");
    if (row) {
      var kids = row.childNodes;
      for (var i = 0; i < kids.length; i++) {
        if (!kids[i].getAttribute) continue;
        kids[i].className = "lab-chip tk lab-ins-t" +
          (kids[i].getAttribute("data-tank") === S.inspect ? " on" : "");
      }
    }
  }

  function wireInspect() {
    var host = ROOT.querySelector(".lab-inshost");
    var row = ROOT.querySelector(".lab-insrow");
    if (row) row.addEventListener("click", function (e) {
      var b = e.target;
      while (b && b !== row && !(b.getAttribute && b.getAttribute("data-tank"))) b = b.parentNode;
      var nm = b && b.getAttribute ? b.getAttribute("data-tank") : null;
      if (!nm) return;
      S.inspect = nm;
      updInspect();
      updPlot();
    });
    if (host) host.addEventListener("click", function (e) {
      var el = e.target;
      while (el && el !== host && !(el.getAttribute && el.getAttribute("data-k"))) el = el.parentNode;
      var k = el && el.getAttribute ? el.getAttribute("data-k") : null;
      if (!k) return;
      S.y = k;
      updPlot();
    });
  }

  /* ---------------------------------------- panel 6: what each field is */

  function dictRows() {
    return FIELDS.map(function (f) {
      var vals = values(f.k);
      var wr = f.k === "winrate" ? null : corrOf(f.k, "winrate");
      var ns = [];
      ROWS.forEach(function (r) { if (isNum(r.n[f.k])) ns.push(r.n[f.k]); });
      return {
        f: f, n: vals.length,
        lo: vals.length ? vals[0] : null,
        mid: median(vals),
        hi: vals.length ? vals[vals.length - 1] : null,
        wr: wr ? wr.r : null,
        thin: ns.length ? Math.min.apply(null, ns) : null
      };
    });
  }

  function dictTable() {
    var rows = dictRows();
    var GORD = { p: 0, m: 1, x: 2 };
    rows.sort(function (a, b) {
      var av, bv;
      if (S.dictSort === "grp") { av = GORD[a.f.g]; bv = GORD[b.f.g]; }
      else if (S.dictSort === "name") { return (a.f.label < b.f.label ? -1 : 1) * S.dictDir; }
      else if (S.dictSort === "wr") {
        av = a.wr === null ? null : Math.abs(a.wr);
        bv = b.wr === null ? null : Math.abs(b.wr);
      } else if (S.dictSort === "thin") { av = a.thin; bv = b.thin; }
      else { av = a.n; bv = b.n; }
      // A field with nothing in the sorted column sinks either way round,
      // rather than taking the top of the table when the sort flips.
      if (av === null && bv === null) return a.f.label < b.f.label ? -1 : 1;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av === bv) return a.f.label < b.f.label ? -1 : 1;
      return (av - bv) * S.dictDir;
    });

    function th(key, label, cls) {
      return '<th class="' + (cls || "") + (S.dictSort === key ? " on" : "") +
        '" data-s="' + key + '">' + esc(label) + "</th>";
    }

    var head = "<thead><tr>" +
      th("name", "Field", "lab-l") +
      th("grp", "Source", "lab-l") +
      "<th class=\"lab-l\">What the number is</th>" +
      th("n", "Tanks") +
      "<th>Lowest</th><th>Median</th><th>Highest</th>" +
      th("thin", "Thinnest n") +
      th("wr", "r with win rate") +
      "</tr></thead>";

    var body = "<tbody>" + rows.map(function (d) {
      var f = d.f;
      return '<tr data-k="' + f.k + '">' +
        '<td class="lab-l"><b>' + esc(f.label) + "</b></td>" +
        '<td class="lab-l"><span class="lab-src" style="color:' + GROUP_COLOR[f.g] + '">' +
        (f.g === "p" ? "published" : "measured") + "</span></td>" +
        '<td class="lab-l"><span class="lab-desc">' + esc(f.desc) + "</span></td>" +
        '<td class="lab-num">' + d.n + "</td>" +
        '<td class="lab-num">' + esc(fmtVal(f, d.lo)) + "</td>" +
        '<td class="lab-num">' + esc(fmtVal(f, d.mid)) + "</td>" +
        '<td class="lab-num">' + esc(fmtVal(f, d.hi)) + "</td>" +
        '<td class="lab-num">' + (d.thin === null ? "-" : T.fmtNum(d.thin)) + "</td>" +
        '<td class="lab-num" style="color:' + (d.wr === null ? "#7f89b3" : corrColor(d.wr)) +
        ';background:' + (d.wr === null ? "transparent" :
          "linear-gradient(90deg,transparent," + corrColor(d.wr) + ")") + '">' +
        (d.wr === null ? "-" : (d.wr >= 0 ? "+" : "") + d.wr.toFixed(2)) + "</td>" +
        "</tr>";
    }).join("") + "</tbody>";

    return '<table class="lab-tbl">' + head + body + "</table>";
  }

  function dictPanel() {
    var best = null;
    dictRows().forEach(function (d) {
      if (d.wr === null) return;
      if (best === null || Math.abs(d.wr) > Math.abs(best.wr)) best = d;
    });
    var body =
      '<p class="lab-lede">What every field counts and where it came from. ' +
      "<b>Click a heading to sort, a row to send that field to the X axis.</b></p>" +
      '<div class="lab-scroll lab-dicthost">' + dictTable() + "</div>" +
      '<div class="lab-read">' +
      (best
        ? "Closest to win rate: <b>" + esc(best.f.label) + "</b> at r = " +
          (best.wr >= 0 ? "+" : "") + best.wr.toFixed(2) + " over " + best.n +
          " tanks. Weak, and close to circular."
        : "") +
      "</div>";

    return T.bigPanel("What each field is",
      body,
      "Thinnest n is the smallest sample behind any one tank. A dash means no count " +
      "is held, not that the field is well sampled. Last column is r against win " +
      "rate, n=" + ROWS.length + " at most. Treat it as a rough sort order.");
  }

  function wireDict() {
    var host = ROOT.querySelector(".lab-dicthost");
    if (!host) return;
    host.addEventListener("click", function (e) {
      var el = e.target;
      while (el && el !== host) {
        if (el.getAttribute && el.getAttribute("data-s")) {
          var k = el.getAttribute("data-s");
          // Thinnest n opens on the thin end, which is the end worth reading.
          if (S.dictSort === k) S.dictDir = -S.dictDir;
          else { S.dictSort = k; S.dictDir = (k === "name" || k === "grp" || k === "thin") ? 1 : -1; }
          host.innerHTML = dictTable();
          return;
        }
        if (el.getAttribute && el.getAttribute("data-k")) {
          S.x = el.getAttribute("data-k");
          updPlot();
          return;
        }
        el = el.parentNode;
      }
    });
  }

  /* ------------------------------------------------------------- preview */

  // The tile. Real numbers: published hit points against published top speed,
  // the roster's clearest design axis, coloured by class.
  function previewSvg(api) {
    T = api;
    var rows = buildRows();
    var pts = [];
    rows.forEach(function (r) {
      if (isNum(r.v.hp) && isNum(r.v.spd)) pts.push(r);
    });
    if (pts.length < 4) return "";
    var xs = pts.map(function (r) { return r.v.hp; });
    var ys = pts.map(function (r) { return r.v.spd; });
    var dx = domainOf(xs), dy = domainOf(ys);
    var out = '<rect x="0" y="0" width="240" height="240" fill="#0c1226"/>';
    var i;
    for (i = 1; i < 5; i++) {
      out += '<line x1="16" y1="' + (i * 48) + '" x2="224" y2="' + (i * 48) +
        '" stroke="rgba(255,255,255,.05)"/>' +
        '<line x1="' + (i * 48) + '" y1="16" x2="' + (i * 48) +
        '" y2="224" stroke="rgba(255,255,255,.05)"/>';
    }
    var c = pearsonOf(pts.map(function (r) { return [r.v.hp, r.v.spd]; }));
    function px(v) { return 22 + (v - dx[0]) / (dx[1] - dx[0]) * 196; }
    function py(v) { return 218 - (v - dy[0]) / (dy[1] - dy[0]) * 196; }
    if (c) {
      var y0 = c.my + c.b * (dx[0] - c.mx), y1 = c.my + c.b * (dx[1] - c.mx);
      out += '<line x1="' + px(dx[0]).toFixed(1) + '" y1="' + py(y0).toFixed(1) +
        '" x2="' + px(dx[1]).toFixed(1) + '" y2="' + py(y1).toFixed(1) +
        '" stroke="rgba(255,255,255,.22)" stroke-width="1.4" stroke-dasharray="5 5"/>';
    }
    pts.forEach(function (r) {
      var g = isNum(r.v.games) ? r.v.games : 0;
      out += '<circle cx="' + px(r.v.hp).toFixed(1) + '" cy="' + py(r.v.spd).toFixed(1) +
        '" r="' + (4 + 7 * Math.sqrt(g / 800)).toFixed(1) + '" fill="' +
        (CLS_COLOR[r.cls] || "#7f89b3") + '" fill-opacity="0.8" ' +
        'stroke="rgba(255,255,255,.3)" stroke-width="0.8"/>';
    });
    return '<svg viewBox="0 0 240 240" role="img">' + out + "</svg>";
  }

  /* -------------------------------------------------------- registration */

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "lab",
    title: "Lab",
    blurb: "Plot anything against anything: 30 fields, 17 tanks, your axes.",
    accent: ACCENT,
    css: CSS,

    preview: function (api) {
      try { return previewSvg(api) || ""; } catch (e) { return ""; }
    },

    render: function (api) {
      if (!ensure(api)) {
        return '<div class="panel avg-panel"><h2>Lab</h2>' +
          '<div class="small">No tank rows loaded. Nothing to plot.</div></div>';
      }
      var parts = [];
      [plotPanel, matrixPanel, rankPanel, pcPanel, inspectPanel, dictPanel].forEach(function (fn) {
        try { parts.push(fn() || ""); } catch (e) { parts.push(""); }
      });
      var body = parts.join("");
      if (!body) {
        return '<div class="panel avg-panel"><h2>Lab</h2>' +
          '<div class="small">Not enough data loaded to build these views.</div></div>';
      }
      return body;
    },

    wire: function (api, root) {
      if (!root) return;
      T = api;
      ROOT = root;
      if (!ROWS.length) ROWS = buildRows();
      [wirePlot, wireMatrix, wireRank, wirePc, wireInspect, wireDict].forEach(function (fn) {
        try { fn(); } catch (e) { /* one dead panel must not take the page */ }
      });
    }
  });
})();

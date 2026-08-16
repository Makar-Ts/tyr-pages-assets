/* Arsenal suite -- tanks, shells, abilities and components.
 *
 * The one page where the game's own published numbers (tyrhq.com, carried in
 * site/tyrhq_official.json) sit next to numbers this pipeline measured from
 * replays. Gold means published. Blue means measured. That rule holds
 * everywhere on this page and every panel note repeats which side it is on.
 */
(function () {
  "use strict";

  var GOLD = "#c9a227";   // published by tyrhq
  var BLUE = "#6ea8fe";   // measured from replays

  var CSS = [
    ".ar-key{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin:0 0 16px;font-size:.8rem;color:var(--dim,#7f89b3)}",
    ".ar-key b{font-weight:600;color:var(--fg,var(--text,#d6dcf5))}",
    ".ar-dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}",
    ".ar-sub{font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim,#7f89b3);margin:0 0 8px}",
    ".ar-pickrow{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;margin-bottom:16px}",
    ".ar-pick{display:flex;flex-direction:column;gap:5px}",
    ".ar-pick span{font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim,#7f89b3)}",
    ".ar-pick select{background:var(--panel2,#131a33);color:var(--fg,var(--text,#d6dcf5));",
    "border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:7px 10px;",
    "font:inherit;font-size:.88rem;min-width:170px}",
    ".ar-pick select:focus{outline:none;border-color:var(--accent,#c9a227)}",
    ".ar-btn{background:var(--panel2,#131a33);color:var(--dim,#7f89b3);cursor:pointer;",
    "border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:8px 14px;font:inherit;font-size:.82rem}",
    ".ar-btn:hover{color:var(--fg,var(--text,#d6dcf5));border-color:var(--accent,#c9a227)}",
    ".ar-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}",
    ".ar-chip{cursor:pointer;font:inherit;font-size:.78rem;padding:4px 13px;border-radius:999px;",
    "background:transparent;color:var(--dim,#7f89b3);border:1px solid var(--line,var(--border,#232c52))}",
    ".ar-chip:hover{color:var(--fg,var(--text,#d6dcf5))}",
    ".ar-chip.on{color:#0a0e1f;background:var(--accent,#c9a227);border-color:var(--accent,#c9a227);font-weight:600}",
    ".ar-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}",
    ".ar-col{min-width:0}",
    ".ar-tbl{width:100%;border-collapse:collapse;font-size:.84rem;min-width:820px}",
    ".ar-tbl th,.ar-tbl td{padding:6px 9px;border-bottom:1px solid var(--line,var(--border,#232c52));text-align:right;white-space:nowrap}",
    ".ar-tbl th:first-child,.ar-tbl td:first-child,.ar-tbl .ar-l{text-align:left}",
    ".ar-tbl thead th{color:var(--dim,#7f89b3);font-weight:600;font-size:.72rem;letter-spacing:.03em}",
    ".ar-tbl thead th.ar-sortable{cursor:pointer;user-select:none}",
    ".ar-tbl thead th.ar-sortable:hover{color:var(--fg,var(--text,#d6dcf5))}",
    ".ar-tbl thead th.ar-on{color:var(--accent,#c9a227)}",
    ".ar-tbl tbody tr:hover{background:rgba(255,255,255,.03)}",
    ".ar-grp{text-align:center!important;font-size:.66rem;letter-spacing:.09em;text-transform:uppercase;",
    "border-bottom:1px solid var(--line,var(--border,#232c52))}",
    ".ar-grp-pub{color:" + GOLD + "}",
    ".ar-grp-meas{color:" + BLUE + "}",
    ".ar-tk{border-left:3px solid var(--tc,#666);padding-left:8px!important}",
    ".ar-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(146px,1fr));gap:8px}",
    ".ar-card{cursor:pointer;text-align:left;font:inherit;background:var(--panel2,#131a33);",
    "border:1px solid var(--line,var(--border,#232c52));border-left:3px solid var(--tc,#666);",
    "border-radius:8px;padding:8px 10px;color:var(--fg,var(--text,#d6dcf5))}",
    ".ar-card:hover{border-color:var(--accent,#c9a227);border-left-color:var(--tc,#666)}",
    ".ar-card.on{background:rgba(201,162,39,.12);border-color:var(--accent,#c9a227);border-left-color:var(--tc,#666)}",
    ".ar-card .ar-cn{font-size:.82rem;font-weight:600;display:block}",
    ".ar-card .ar-ca{font-size:.74rem;color:var(--accent,#c9a227);display:block;margin-top:2px}",
    ".ar-card .ar-cm{font-size:.68rem;color:var(--dim,#7f89b3);display:block;margin-top:3px}",
    ".ar-detail{margin-top:16px;border:1px solid var(--line,var(--border,#232c52));border-radius:10px;",
    "padding:14px 16px;background:var(--panel2,#131a33)}",
    ".ar-dh{font-size:1.02rem;font-weight:700;margin:0 0 2px}",
    ".ar-dt{font-size:.86rem;line-height:1.6;margin:0 0 14px;color:var(--fg,var(--text,#d6dcf5))}",
    ".ar-comps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}",
    ".ar-comp{border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:10px 12px}",
    ".ar-lvl{display:inline-block;font-size:.62rem;letter-spacing:.06em;padding:1px 7px;border-radius:999px;",
    "border:1px solid var(--line,var(--border,#232c52));color:var(--dim,#7f89b3);margin-right:7px;vertical-align:1px}",
    ".ar-comp b{font-size:.83rem}",
    ".ar-comp p{margin:6px 0 0;font-size:.78rem;line-height:1.55;color:var(--dim,#7f89b3)}",
    ".ar-out{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin-bottom:14px}",
    ".ar-o{border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:10px 12px;background:var(--panel2,#131a33)}",
    ".ar-o .ar-ol{font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--dim,#7f89b3);margin-bottom:5px}",
    ".ar-o .ar-ov{font-size:1.24rem;font-weight:700;line-height:1.15}",
    ".ar-o .ar-od{font-size:.7rem;color:var(--dim,#7f89b3);margin-top:4px}",
    ".ar-o.ar-up .ar-ov{color:#7fb06a}",
    ".ar-o.ar-dn .ar-ov{color:#d0736a}",
    ".ar-flags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}",
    ".ar-flag{font-size:.76rem;padding:4px 11px;border-radius:6px;border:1px solid rgba(201,162,39,.42);",
    "background:rgba(201,162,39,.10);color:var(--fg,var(--text,#d6dcf5))}",
    ".ar-lede{font-size:.86rem;line-height:1.6;color:var(--dim,#7f89b3);margin:0 0 14px}",
    ".ar-lede b{color:var(--fg,var(--text,#d6dcf5));font-weight:600}",
    ".ar-scroll{overflow-x:auto;border-radius:8px}"
  ].join("");

  /* --------------------------------------------------------------- state */

  var T = null;                       // captured on each entry point
  var sheet = { k: "games", dir: -1, cls: "All" };
  var cmp = { a: null, b: null };
  var calc = { tank: null, shell: null };
  var atlas = { tank: null };

  function esc(s) { return T.esc(s); }
  function num(n) { return T.fmtNum(n); }
  function pct(n) { return T.fmtPct(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function color(name) { return T.tankColor(name) || "#5b6472"; }

  /* ---------------------------------------------------------------- data */

  function official() {
    var o = T && T.OFFICIAL;
    if (!o || !o.tanks || !o.tanks.length) return null;
    return o;
  }
  function offList() {
    var o = official();
    if (!o) return [];
    return o.tanks.filter(function (t) { return t && t.tank; });
  }
  function offOne(name) {
    var o = official();
    if (!o) return null;
    if (o.byTank && o.byTank[name]) return o.byTank[name];
    var l = offList();
    for (var i = 0; i < l.length; i++) { if (l[i].tank === name) return l[i]; }
    return null;
  }
  function measList() {
    return (T && T.DATA && T.DATA.tanks) || [];
  }
  function measOne(name) {
    var l = measList();
    for (var i = 0; i < l.length; i++) { if (l[i].tank === name) return l[i]; }
    return null;
  }
  function statMap(key, field) {
    var s = (T && T.STATS) || {};
    if (!s[key]) return {};
    return T.statByTank(s[key], field);
  }
  /* Rows that have BOTH a published spec and a measured record. Everything on
   * this page is built from these, so a tank missing from either side simply
   * does not appear rather than showing half a row. */
  function joined() {
    var out = [];
    offList().forEach(function (o) {
      var m = measOne(o.tank);
      if (m) out.push({ name: o.tank, o: o, m: m });
    });
    out.sort(function (x, y) { return (y.m.games || 0) - (x.m.games || 0); });
    return out;
  }
  function maxOf(rows, fn) {
    var mx = 0;
    rows.forEach(function (r) {
      var v = fn(r);
      if (typeof v === "number" && isFinite(v) && v > mx) mx = v;
    });
    return mx || 1;
  }
  function sum(list, fn) {
    return list.reduce(function (s, x) { return s + (fn(x) || 0); }, 0);
  }

  /* Wire names in the replay ammunition stream are not all the names players
   * see. tyrhq's own drift table settles it; Heal and Siege are not shells at
   * all, they are Valor's and Arbalest's abilities implemented as a shot. */
  var WIRE_TO_SHELL = { Ability: "Energy", Leech: "Siphon", Mobility: "Lightweight" };
  var NOT_A_SHELL = { Heal: "Valor's ability", Siege: "Arbalest's ability" };

  function ammoRows() {
    var s = (T && T.STATS) || {};
    var list = s.ammo_totals || s.ammo_usage || [];
    return list.map(function (r) {
      var disp = WIRE_TO_SHELL[r.label] || r.label;
      return { shell: disp, wire: r.label, count: r.count || 0, ability: !!NOT_A_SHELL[r.label] };
    });
  }
  function shellUse(name) {
    var rows = ammoRows();
    for (var i = 0; i < rows.length; i++) { if (rows[i].shell === name) return rows[i].count; }
    return null;
  }

  /* ------------------------------------------------------------- preview */

  /* A miniature of panel 6, which is the page's whole argument in one picture:
   * gold is what the sheet promises, blue is what the replays measured, and
   * both are on the SAME scale, so the short blue foot inside every long gold
   * bar is the real gap rather than a rescaling trick.
   *
   * One row per tank that has both a published spec and a measured record,
   * sorted by paper rate. Gold bar = published damage per shell divided by the
   * published reload, in damage per minute. Blue bar = the damage per minute
   * alive that the replays actually recorded. Nothing is drawn below y=156:
   * the hub covers the bottom third of the tile with a caption scrim. */
  function preview(Tin) {
    T = Tin;
    var rows = joined().filter(function (r) {
      return r.o && r.o.dmg > 0 && r.o.reload_s > 0 && r.m && r.m.dpm > 0;
    });
    if (rows.length < 4) return "";

    var calc = rows.map(function (r) {
      return { paper: r.o.dmg * 60 / r.o.reload_s, real: r.m.dpm };
    }).sort(function (a, b) { return b.paper - a.paper; });
    var top = 0;
    calc.forEach(function (c) { if (c.paper > top) top = c.paper; });
    if (!top) return "";

    var n = Math.min(calc.length, 18);
    var X0 = 17, W = 210, Y0 = 22, Y1 = 150, BH = 5.4;
    var pitch = n > 1 ? (Y1 - Y0) / (n - 1) : 0;

    var grid = "";
    for (var g = 1; g <= 4; g++) {
      var gx = (X0 + W * g / 4).toFixed(1);
      grid += '<line x1="' + gx + '" y1="16" x2="' + gx + '" y2="' + (Y1 + BH + 6) +
        '" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>';
    }
    grid += '<line x1="' + (X0 - 1.5) + '" y1="16" x2="' + (X0 - 1.5) + '" y2="' +
      (Y1 + BH + 6) + '" stroke="' + GOLD + '" stroke-opacity="0.55" stroke-width="1.6"/>';

    var bars = "";
    for (var i = 0; i < n; i++) {
      var c = calc[i], y = Y0 + i * pitch;
      var gw = Math.max(2.5, c.paper / top * W);
      var bw = Math.max(2.5, Math.min(gw, c.real / top * W));
      bars +=
        '<rect x="' + X0 + '" y="' + y.toFixed(1) + '" width="' + gw.toFixed(1) +
        '" height="' + BH + '" rx="2.2" fill="url(#arPvGold)"/>' +
        '<rect x="' + (X0 + gw - 1.3).toFixed(1) + '" y="' + (y - 1.7).toFixed(1) +
        '" width="2.6" height="' + (BH + 3.4).toFixed(1) + '" rx="1.2" fill="#e8c46a"/>' +
        '<rect x="' + X0 + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + BH + '" rx="2.2" fill="#6ea8fe" fill-opacity="0.95"/>';
    }

    return '<svg viewBox="0 0 240 240">' +
      '<defs>' +
      '<linearGradient id="arPvBg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1c1c33"></stop>' +
      '<stop offset="1" stop-color="#090d1e"></stop></linearGradient>' +
      '<linearGradient id="arPvGold" gradientUnits="userSpaceOnUse" x1="' + X0 +
      '" y1="0" x2="' + (X0 + W) + '" y2="0">' +
      '<stop offset="0" stop-color="' + GOLD + '" stop-opacity="0.80"></stop>' +
      '<stop offset="1" stop-color="#e8c46a" stop-opacity="0.34"></stop></linearGradient>' +
      "</defs>" +
      '<rect width="240" height="240" fill="url(#arPvBg)"/>' +
      grid + bars + "</svg>";
  }

  /* -------------------------------------------------- panel 1: spec sheet */

  var SHEET_COLS = [
    { k: "cls", h: "Class", pub: 1, get: function (r) { return r.o["class"]; }, txt: 1 },
    { k: "diff", h: "Diff", pub: 1, get: function (r) { return r.o.difficulty; } },
    { k: "hp", h: "HP", pub: 1, get: function (r) { return r.o.hp; } },
    { k: "dmg", h: "Dmg", pub: 1, get: function (r) { return r.o.dmg; } },
    { k: "pen", h: "Pen mm", pub: 1, get: function (r) { return r.o.pen; } },
    { k: "spd", h: "Speed", pub: 1, get: function (r) { return r.o.spd; } },
    { k: "rld", h: "Reload s", pub: 1, get: function (r) { return r.o.reload_s; } },
    { k: "det", h: "Detect m", pub: 1, get: function (r) { return r.o.detection_m; } },
    { k: "camo", h: "Camo", pub: 1, get: function (r) { return r.o.camo; } },
    { k: "abil", h: "Ability", pub: 1, txt: 1, get: function (r) { return (r.o.ability || {}).name || ""; } },
    { k: "games", h: "Games", pub: 0, get: function (r) { return r.m.games; } },
    { k: "wr", h: "Win rate", pub: 0, get: function (r) { return r.m.winrate; }, fmt: pct },
    { k: "peak", h: "Peak HP seen", pub: 0, get: function (r) { return r.peak; } }
  ];

  function sheetRows() {
    var peak = statMap("tank_max_hp");
    var rows = joined();
    rows.forEach(function (r) { r.peak = peak[r.name] != null ? peak[r.name] : null; });
    if (sheet.cls !== "All") {
      rows = rows.filter(function (r) { return r.o["class"] === sheet.cls; });
    }
    var col = null;
    for (var i = 0; i < SHEET_COLS.length; i++) { if (SHEET_COLS[i].k === sheet.k) col = SHEET_COLS[i]; }
    rows.sort(function (x, y) {
      if (sheet.k === "tank") return x.name < y.name ? -sheet.dir : (x.name > y.name ? sheet.dir : 0);
      if (!col) return 0;
      var a = col.get(x), b = col.get(y);
      if (col.txt) return String(a) < String(b) ? -sheet.dir : (String(a) > String(b) ? sheet.dir : 0);
      a = a == null ? -Infinity : a; b = b == null ? -Infinity : b;
      return (a - b) * sheet.dir;
    });
    return rows;
  }

  function sheetTable() {
    var rows = sheetRows();
    if (!rows.length) return '<p class="small">No tank matches that filter.</p>';
    var nPub = 0, nMeas = 0;
    SHEET_COLS.forEach(function (c) { if (c.pub) nPub++; else nMeas++; });

    function arrow(k) { return sheet.k === k ? (sheet.dir < 0 ? " ▾" : " ▴") : ""; }
    function th(k, label, extra, span) {
      return "<th " + (span || "") + 'class="ar-sortable' + (sheet.k === k ? " ar-on" : "") +
        (extra || "") + '" data-k="' + k + '">' + esc(label) + arrow(k) + "</th>";
    }
    // the tank name is neither published nor measured, so its heading spans
    // both rows and sits outside the two provenance groups
    var head =
      "<tr>" + th("tank", "Tank", " ar-l", 'rowspan="2" ') +
      '<th class="ar-grp ar-grp-pub" colspan="' + nPub + '">Published by tyrhq</th>' +
      '<th class="ar-grp ar-grp-meas" colspan="' + nMeas + '">Measured from replays</th></tr>' +
      "<tr>" + SHEET_COLS.map(function (c) {
        return th(c.k, c.h, c.txt ? " ar-l" : "");
      }).join("") + "</tr>";

    var body = rows.map(function (r) {
      return '<tr><td class="ar-l ar-tk" style="--tc:' + color(r.name) + '">' + esc(r.name) + "</td>" +
        SHEET_COLS.map(function (c) {
          var v = c.get(r);
          var out = c.txt ? esc(v == null ? "-" : v) : (c.fmt ? c.fmt(v) : num(v));
          return '<td class="' + (c.txt ? "ar-l" : "") + '">' + out + "</td>";
        }).join("") + "</tr>";
    }).join("");

    return '<div class="ar-scroll"><table class="ar-tbl"><thead>' + head + "</thead><tbody>" +
      body + "</tbody></table></div>";
  }

  function panelSheet() {
    var rows = joined();
    if (rows.length < 4) return "";
    var classes = ["All"];
    rows.forEach(function (r) {
      if (classes.indexOf(r.o["class"]) < 0) classes.push(r.o["class"]);
    });
    var chips = classes.map(function (c) {
      return '<button class="ar-chip' + (sheet.cls === c ? " on" : "") +
        '" data-cls="' + esc(c) + '">' + esc(c) + "</button>";
    }).join("");

    // how far the highest health pool ever recorded runs above the published
    // base, worked out here rather than asserted
    var peak = statMap("tank_max_hp");
    var ratios = [];
    rows.forEach(function (r) {
      if (peak[r.name] && r.o.hp) ratios.push(peak[r.name] / r.o.hp);
    });
    ratios.sort(function (a, b) { return a - b; });
    var lede = "";
    if (ratios.length) {
      lede = '<p class="ar-lede">Every tank\'s peak health runs above its published base. ' +
        "<b>" + num(r1(ratios[0])) + "x</b> to <b>" + num(r1(ratios[ratios.length - 1])) +
        "x</b>, across " + ratios.length + " tanks. Probably in-match upgrades.</p>";
    }

    return T.bigPanel("Published spec sheet",
      lede +
      '<div class="ar-chips" data-role="sheet-chips">' + chips + "</div>" +
      '<div data-role="sheet-body">' + sheetTable() + "</div>",
      "Gold is published. Blue is measured from " +
      num((T.DATA.matches || []).length) + " replays and " +
      num(sum(rows, function (r) { return r.m.games; })) + " tank-games. " +
      "Peak HP seen is the largest pool ever observed, not a typical one. " +
      "Armour appears nowhere on the sheet.");
  }

  /* ------------------------------------------------- panel 2: comparator */

  function pubAxesDef(rows) {
    return [
      { label: "HP", max: maxOf(rows, function (r) { return r.o.hp; }),
        get: function (r) { return r.o.hp; }, disp: function (r) { return num(r.o.hp); } },
      { label: "Damage", max: maxOf(rows, function (r) { return r.o.dmg; }),
        get: function (r) { return r.o.dmg; }, disp: function (r) { return num(r.o.dmg) + " per shell"; } },
      { label: "Penetration", max: maxOf(rows, function (r) { return r.o.pen; }),
        get: function (r) { return r.o.pen; }, disp: function (r) { return num(r.o.pen) + " mm"; } },
      { label: "Top speed", max: maxOf(rows, function (r) { return r.o.spd; }),
        get: function (r) { return r.o.spd; }, disp: function (r) { return num(r.o.spd); } },
      { label: "Camouflage", max: maxOf(rows, function (r) { return r.o.camo; }),
        get: function (r) { return r.o.camo; }, disp: function (r) { return num(r.o.camo); } },
      { label: "Shots / min", max: maxOf(rows, function (r) { return r.o.reload_s ? 60 / r.o.reload_s : 0; }),
        get: function (r) { return r.o.reload_s ? 60 / r.o.reload_s : 0; },
        disp: function (r) { return num(r1(60 / r.o.reload_s)) + " (" + num(r.o.reload_s) + "s reload)"; } }
    ];
  }
  function measAxesDef(rows) {
    return [
      { label: "Avg damage", max: maxOf(rows, function (r) { return r.m.avg.dmg; }),
        get: function (r) { return r.m.avg.dmg; }, disp: function (r) { return num(r.m.avg.dmg); } },
      { label: "Dmg / min alive", max: maxOf(rows, function (r) { return r.m.dpm; }),
        get: function (r) { return r.m.dpm; }, disp: function (r) { return num(r.m.dpm); } },
      { label: "Avg assist", max: maxOf(rows, function (r) { return r.m.avg.assist; }),
        get: function (r) { return r.m.avg.assist; }, disp: function (r) { return num(r.m.avg.assist); } },
      { label: "Avg blocked", max: maxOf(rows, function (r) { return r.m.avg.blocked; }),
        get: function (r) { return r.m.avg.blocked; }, disp: function (r) { return num(r.m.avg.blocked); } },
      { label: "Survival %", max: maxOf(rows, function (r) { return r.m.avg_survival_pct; }),
        get: function (r) { return r.m.avg_survival_pct; },
        disp: function (r) { return pct(r.m.avg_survival_pct); } },
      { label: "Win rate", max: maxOf(rows, function (r) { return r.m.winrate; }),
        get: function (r) { return r.m.winrate; }, disp: function (r) { return pct(r.m.winrate); } }
    ];
  }
  function toRadar(def, row) {
    return def.map(function (ax) {
      return { label: ax.label, value: ax.get(row) || 0, max: ax.max, display: ax.disp(row) };
    });
  }

  function cmpBody() {
    var rows = joined();
    var A = null, B = null;
    rows.forEach(function (r) {
      if (r.name === cmp.a) A = r;
      if (r.name === cmp.b) B = r;
    });
    if (!A || !B) return '<p class="small">Pick two tanks.</p>';
    var ca = color(A.name), cb = color(B.name);
    var pubDef = pubAxesDef(rows), measDef = measAxesDef(rows);

    function legend() {
      return '<div class="ar-key">' +
        '<span><span class="ar-dot" style="background:' + ca + '"></span><b>' + esc(A.name) + "</b> solid</span>" +
        '<span><span class="ar-dot" style="background:' + cb + '"></span><b>' + esc(B.name) + "</b> dashed</span>" +
        "</div>";
    }
    function deltaTable(def, srcLabel) {
      return '<div class="ar-scroll"><table class="ar-tbl" style="min-width:0">' +
        "<thead><tr><th class=\"ar-l\">" + esc(srcLabel) + "</th><th>" + esc(A.name) +
        "</th><th>" + esc(B.name) + "</th><th>Gap</th></tr></thead><tbody>" +
        def.map(function (ax) {
          var va = ax.get(A) || 0, vb = ax.get(B) || 0, d = r1(va - vb);
          return '<tr><td class="ar-l">' + esc(ax.label) + "</td><td>" + num(r1(va)) +
            "</td><td>" + num(r1(vb)) + '</td><td style="color:' +
            (d === 0 ? "var(--dim,#7f89b3)" : (d > 0 ? ca : cb)) + '">' +
            (d > 0 ? "+" : "") + num(d) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    function head(t) {
      var o = t.o, m = t.m;
      return '<div class="ar-lede" style="margin-bottom:6px"><b>' + esc(t.name) + "</b> · " +
        esc(o["class"]) + " · difficulty " + num(o.difficulty) + " of 5 · ability " +
        esc((o.ability || {}).name || "?") + " · " + num(m.games) + " games measured</div>";
    }

    return head(A) + head(B) + legend() +
      '<div class="ar-two">' +
        '<div class="ar-col"><div class="ar-sub" style="color:' + GOLD + '">Published specification</div>' +
          T.svgRadar(toRadar(pubDef, A), { size: 300, color: ca, compare: toRadar(pubDef, B), compareColor: cb }) +
          deltaTable(pubDef, "tyrhq sheet") + "</div>" +
        '<div class="ar-col"><div class="ar-sub" style="color:' + BLUE + '">Measured across matches</div>' +
          T.svgRadar(toRadar(measDef, A), { size: 300, color: ca, compare: toRadar(measDef, B), compareColor: cb }) +
          deltaTable(measDef, "replay average") + "</div>" +
      "</div>";
  }

  function panelCompare() {
    var rows = joined();
    if (rows.length < 4) return "";
    if (!cmp.a) cmp.a = rows[0].name;
    if (!cmp.b) cmp.b = rows.length > 1 ? rows[1].name : rows[0].name;
    function sel(role, cur) {
      return '<label class="ar-pick"><span>Tank ' + role.toUpperCase() + '</span><select data-role="cmp-' +
        role + '">' + rows.map(function (r) {
          return '<option value="' + esc(r.name) + '"' + (r.name === cur ? " selected" : "") + ">" +
            esc(r.name) + " (" + num(r.m.games) + ")</option>";
        }).join("") + "</select></label>";
    }
    return T.bigPanel("Tank comparator",
      '<div class="ar-pickrow">' + sel("a", cmp.a) + sel("b", cmp.b) +
        '<button class="ar-btn" data-role="cmp-swap">Swap</button></div>' +
      '<div data-role="cmp-body">' + cmpBody() + "</div>",
      "Left web published, right web measured. Axes scale to the " +
      rows.length + "-tank maximum. A fuller shape is bigger, not better. " +
      "The measured web folds in who picks the tank.");
  }

  /* --------------------------------------------- panel 3: shell calculator */

  function shellList() {
    var o = official();
    if (!o || !o.shells) return [];
    return o.shells.filter(function (s) { return s && s.shell; });
  }
  function shellOne(name) {
    var l = shellList();
    for (var i = 0; i < l.length; i++) { if (l[i].shell === name) return l[i]; }
    return null;
  }

  function extraFlags(sh) {
    var e = sh.extra || {}, out = [];
    if (e.energy_on_penetration != null) out.push("+" + e.energy_on_penetration + " energy on a penetration");
    if (e.heal_on_penetration != null) {
      var h = "+" + e.heal_on_penetration + " health on a penetration";
      if (e.low_health_multiplier != null) h += ", " + e.low_health_multiplier + "x below half health";
      out.push(h);
    }
    if (e.penetration_fixed_mm != null) out.push("penetration replaced by a flat " + e.penetration_fixed_mm + " mm, not scaled");
    if (e.velocity_ms != null) out.push("fixed " + e.velocity_ms + " m/s");
    if (e.damage_ramp_distance_m != null) out.push("damage bonus only past " + e.damage_ramp_distance_m + " m");
    if (e.strafe_mult != null) out.push("strafe speed x" + e.strafe_mult);
    if (sh.detection_mult === 0) out.push("detection multiplier is exactly 0, and firing stays invisible");
    return out;
  }

  function calcBody() {
    var t = offOne(calc.tank), sh = shellOne(calc.shell);
    if (!t || !sh) return '<p class="small">Pick a tank and a shell.</p>';
    var m = measOne(calc.tank);
    var rows = joined();

    var dmg = r1(t.dmg * (sh.damage_mult == null ? 1 : sh.damage_mult));
    var fixedPen = sh.extra && sh.extra.penetration_fixed_mm != null ? sh.extra.penetration_fixed_mm : null;
    var pen = fixedPen != null ? fixedPen : r1(t.pen * (sh.penetration_mult == null ? 1 : sh.penetration_mult));
    var rld = r1(t.reload_s * (sh.reload_mult == null ? 1 : sh.reload_mult));
    var spd = r1(t.spd * ((sh.extra && sh.extra.top_speed_mult) || 1));
    var rev = r1(t.reverse_spd * ((sh.extra && sh.extra.reverse_mult) || 1));

    function box(label, value, detail, dir) {
      return '<div class="ar-o' + (dir > 0 ? " ar-up" : (dir < 0 ? " ar-dn" : "")) + '">' +
        '<div class="ar-ol">' + esc(label) + '</div><div class="ar-ov">' + value + "</div>" +
        (detail ? '<div class="ar-od">' + detail + "</div>" : "") + "</div>";
    }
    function cmpDir(a, b) { return a > b ? 1 : (a < b ? -1 : 0); }

    var boxes =
      box("Damage per shell", num(dmg), "base " + num(t.dmg), cmpDir(dmg, t.dmg)) +
      box("Penetration", num(pen) + " mm", fixedPen != null ? "fixed, base " + num(t.pen) + " mm"
          : "base " + num(t.pen) + " mm", cmpDir(pen, t.pen)) +
      box("Reload", num(rld) + " s", "sheet " + num(t.reload_s) + " s", -cmpDir(rld, t.reload_s)) +
      box("Dispersion", "x" + num(sh.dispersion_mult), sh.dispersion_mult < 1 ? "tighter than standard"
          : (sh.dispersion_mult > 1 ? "looser than standard" : "unchanged"), -cmpDir(sh.dispersion_mult, 1)) +
      box("Shell velocity", sh.extra && sh.extra.velocity_ms != null ? num(sh.extra.velocity_ms) + " m/s"
          : "x" + num(sh.velocity_mult), sh.extra && sh.extra.velocity_ms != null ? "fixed by the shell"
          : "relative to standard", sh.extra && sh.extra.velocity_ms != null ? 0 : cmpDir(sh.velocity_mult, 1)) +
      box("Top speed", num(spd), "base " + num(t.spd) + ", reverse " + num(rev), cmpDir(spd, t.spd));

    var flags = extraFlags(sh);
    var flagHtml = flags.length
      ? '<div class="ar-flags">' + flags.map(function (f) {
          return '<span class="ar-flag">' + esc(f) + "</span>";
        }).join("") + "</div>" : "";

    // shells needed against every tank's PUBLISHED base health, at this damage
    var needRows = rows.map(function (r) {
      return { label: r.name, value: Math.ceil(r.o.hp / dmg), color: color(r.name),
               valueLabel: Math.ceil(r.o.hp / dmg) + " (" + num(r.o.hp) + " HP)" };
    }).sort(function (a, b) { return b.value - a.value; });

    // where this shell sits in what players actually load
    var use = ammoRows().filter(function (a) { return !a.ability; })
      .sort(function (a, b) { return b.count - a.count; });
    var useTotal = sum(use, function (a) { return a.count; });
    var useRows = use.map(function (a) {
      return { label: a.shell, value: a.count,
               color: a.shell === calc.shell ? GOLD : "#3a4468",
               valueLabel: num(a.count) + " · " + pct(r1(a.count / (useTotal || 1) * 100)) };
    });

    var used = shellUse(calc.shell);
    var lede = '<p class="ar-lede"><b>' + esc(sh.shell) + "</b> · " + esc(sh.slot) + " · " +
      esc(sh.text) +
      (used != null ? " Loaded <b>" + num(used) + "</b> times in replays, " +
        pct(r1(used / (useTotal || 1) * 100)) + " of all shells." : "") + "</p>";

    var measNote = m && m.reload_sec
      ? '<p class="ar-lede">Reload above is published. Measured stopwatch: <b>' +
        num(m.reload_sec) + " s</b>" +
        (m.burst_sec ? ", " + num(m.burst_sec) + " s between shells in a magazine" : "") +
        ".</p>" : "";

    return lede + '<div class="ar-out">' + boxes + "</div>" + flagHtml + measNote +
      '<div class="ar-two">' +
        '<div class="ar-col"><div class="ar-sub">Shells to strip a published health bar</div>' +
          T.svgBarChart(needRows, { width: 620, labelWidth: 84, rowHeight: 18 }) + "</div>" +
        '<div class="ar-col"><div class="ar-sub" style="color:' + BLUE + '">Shells loaded, every tank</div>' +
          T.svgBarChart(useRows, { width: 620, labelWidth: 96, rowHeight: 18 }) + "</div>" +
      "</div>";
  }

  function panelCalc() {
    var rows = joined(), shells = shellList();
    if (rows.length < 4 || shells.length < 3) return "";
    if (!calc.tank) calc.tank = rows[0].name;
    if (!calc.shell) calc.shell = shells[0].shell;

    // High Explosive pins penetration at a flat 45 mm rather than scaling it.
    // Worth checking whether that is ever an upgrade rather than assuming.
    var he = shellOne("High Explosive");
    var heNote = "";
    if (he && he.extra && he.extra.penetration_fixed_mm != null) {
      var fx = he.extra.penetration_fixed_mm, below = 0, lowest = null;
      rows.forEach(function (r) {
        if (r.o.pen > fx) below++;
        if (lowest === null || r.o.pen < lowest) lowest = r.o.pen;
      });
      heNote = '<p class="ar-lede">High Explosive pins penetration at a fixed ' + fx +
        " mm instead of scaling it. The thinnest gun on the roster already publishes " +
        num(lowest) + " mm. That makes it a downgrade on all <b>" + below +
        "</b> tanks.</p>";
    }

    return T.bigPanel("Shell calculator",
      heNote +
      '<div class="ar-pickrow">' +
        '<label class="ar-pick"><span>Tank</span><select data-role="calc-tank">' +
          rows.map(function (r) {
            return '<option value="' + esc(r.name) + '"' + (r.name === calc.tank ? " selected" : "") +
              ">" + esc(r.name) + "</option>";
          }).join("") + "</select></label>" +
        '<label class="ar-pick"><span>Shell</span><select data-role="calc-shell">' +
          shells.map(function (s) {
            return '<option value="' + esc(s.shell) + '"' + (s.shell === calc.shell ? " selected" : "") +
              ">" + esc(s.shell) + "</option>";
          }).join("") + "</select></label>" +
      "</div>" +
      '<div data-role="calc-body">' + calcBody() + "</div>",
      "Published base times published modifier. Nothing measured. Armour and angle are not " +
      "published anywhere, and this panel cannot tell you whether a shell penetrates. The " +
      "left chart assumes it does, on published base health. The right chart is the one " +
      "measured part, from " + num((T.DATA.matches || []).length) + " replays.");
  }

  /* ---------------------------------- panel 4: abilities and components */

  function atlasDetail() {
    var t = offOne(atlas.tank);
    if (!t) return "";
    var ab = t.ability || {};
    var casts = statMap("casts_by_tank");
    var castN = statMap("casts_by_tank", "count");
    var comps = (t.components || []).slice().sort(function (a, b) { return (a.level || 0) - (b.level || 0); });
    var measured = casts[atlas.tank] != null
      ? '<p class="ar-lede" style="margin-bottom:12px"><span class="ar-dot" style="background:' + BLUE +
        '"></span>Measured: a median of <b>' + num(casts[atlas.tank]) + "</b> casts a match over <b>" +
        num(castN[atlas.tank]) + "</b> matches.</p>"
      : "";
    return '<div class="ar-detail" style="border-left:3px solid ' + color(t.tank) + '">' +
      '<div class="ar-dh">' + esc(t.tank) + " · " + esc(ab.name || "ability") + "</div>" +
      '<p class="ar-dt">' + esc(ab.text || "") + "</p>" + measured +
      (comps.length
        ? '<div class="ar-sub" style="color:' + GOLD + '">Signature components, published</div>' +
          '<div class="ar-comps">' + comps.map(function (c) {
            return '<div class="ar-comp"><span class="ar-lvl">Lv ' + num(c.level) + "</span><b>" +
              esc(c.name) + '</b><p>' + esc(c.text || "") + "</p></div>";
          }).join("") + "</div>"
        : '<p class="small">No components published for this tank.</p>') +
      "</div>";
  }

  function panelAtlas() {
    var rows = joined();
    if (rows.length < 4) return "";
    if (!atlas.tank) atlas.tank = rows[0].name;
    var casts = statMap("casts_by_tank");

    var cards = rows.map(function (r) {
      var ab = r.o.ability || {};
      var c = casts[r.name];
      return '<button class="ar-card' + (r.name === atlas.tank ? " on" : "") + '" data-tank="' +
        esc(r.name) + '" style="--tc:' + color(r.name) + '">' +
        '<span class="ar-cn">' + esc(r.name) + "</span>" +
        '<span class="ar-ca">' + esc(ab.name || "?") + "</span>" +
        '<span class="ar-cm">' + (c != null ? num(c) + " casts a match" : "no cast data") + "</span></button>";
    }).join("");

    // the measured energy cost histogram, which tyrhq explicitly does not publish
    var s = T.STATS || {};
    var costRows = (s.cast_costs || []).map(function (r) {
      return { label: r.label + " energy", value: r.count, color: BLUE, valueLabel: num(r.count) + " casts" };
    });
    var totalCasts = sum(s.cast_costs || [], function (r) { return r.count; });
    var mode = null;
    (s.cast_costs || []).forEach(function (r) { if (!mode || r.count > mode.count) mode = r; });
    var energy = (official() || {}).energy || {};

    var costBlock = costRows.length
      ? '<div class="ar-sub" style="color:' + BLUE + ';margin-top:22px">What a cast costs, measured</div>' +
        (mode && energy.start != null
          ? '<p class="ar-lede">tyrhq lists no cast costs. Measured, the commonest cast ' +
            "drains about <b>" + esc(mode.label) + "</b> energy against a <b>" +
            num(energy.start) + "</b> spawn.</p>"
          : "") +
        T.svgBarChart(costRows, { width: 1000, labelWidth: 100, rowHeight: 20 })
      : "";

    return T.bigPanel("Ability atlas and components",
      '<div class="ar-cards" data-role="atlas-cards">' + cards + "</div>" +
      '<div data-role="atlas-detail">' + atlasDetail() + "</div>" +
      costBlock,
      "Ability text and components are published. Cast counts and the histogram are measured, " +
      "pooled over 17 tanks and " + num(totalCasts) + " casts. Rounded to 5 energy. Buckets " +
      "under 20 dropped.");
  }

  /* -------------------------------------------- panel 5: reload dumbbell */

  function panelReload() {
    var rows = joined().filter(function (r) {
      return r.o.reload_s && r.m.reload_sec;
    });
    if (rows.length < 4) return "";
    var exact = 0, close = 0, off = [];
    rows.forEach(function (r) {
      var d = r.m.reload_sec - r.o.reload_s;
      var rel = Math.abs(d) / r.o.reload_s;
      if (d === 0) exact++;
      else if (rel <= 0.01) close++;
      else off.push({ name: r.name, pct: r1(-rel * 100) });
    });
    off.sort(function (a, b) { return a.pct - b.pct; });
    var allFaster = off.length > 0 && off.every(function (o) { return o.pct < 0; });

    var bars = rows.slice().sort(function (a, b) {
      return Math.abs(b.o.reload_s - b.m.reload_sec) - Math.abs(a.o.reload_s - a.m.reload_sec);
    }).map(function (r) {
      return { label: r.name, a: r.o.reload_s, b: r.m.reload_sec };
    });

    var burst = joined().filter(function (r) { return r.m.burst_sec; })
      .sort(function (a, b) { return a.m.burst_sec - b.m.burst_sec; });
    var burstLine = burst.length
      ? '<p class="ar-lede" style="margin-top:14px">' + burst.length +
        " guns fire more than one shell per magazine. Measured interval inside the magazine: " +
        burst.map(function (r) { return esc(r.name) + " " + num(r.m.burst_sec) + "s"; }).join(", ") +
        ". Not the reload.</p>"
      : "";

    var lede = '<p class="ar-lede"><b>' + exact + "</b> of " + rows.length +
      " tanks match the published reload exactly, <b>" + close + "</b> more within 1%." +
      (off.length
        ? " The " + off.length + " that disagree (" +
          off.map(function (o) { return esc(o.name) + " " + num(o.pct) + "%"; }).join(", ") +
          ")" +
          (allFaster
            ? " every one reloads <b>faster</b> than the sheet. None slower."
            : " differ in both directions.")
        : "") + "</p>";

    return T.bigPanel("Reload: sheet against stopwatch",
      lede +
      T.svgDumbbell(bars, { aName: "tyrhq sheet", bName: "replay stopwatch",
        aColor: GOLD, bColor: BLUE, labelWidth: 100, width: 1000 }) +
      burstLine,
      "Gold published. Blue measured from the repeating long gap between a player's shots. " +
      "The right-hand number is sheet minus stopwatch. These are per-tank aggregates, and " +
      "one player's reload upgrade drags the whole figure.");
  }

  /* -------------------------------------- panel 6: paper rate vs realised */

  function panelPaperRate() {
    var rows = joined().filter(function (r) {
      return r.o.reload_s > 0 && r.o.dmg > 0 && r.m.dpm > 0;
    });
    if (rows.length < 4) return "";
    var calcd = rows.map(function (r) {
      var paper = r.o.dmg * 60 / r.o.reload_s;
      return { name: r.name, paper: paper, real: r.m.dpm, share: r.m.dpm / paper * 100,
               mag: !!r.m.burst_sec, games: r.m.games };
    }).sort(function (a, b) { return b.share - a.share; });

    var bars = calcd.map(function (c) {
      return { label: c.name + (c.mag ? " ◆" : ""), value: r1(c.share), color: color(c.name),
               valueLabel: pct(r1(c.share)) + " · " + num(Math.round(c.real)) + " of " +
                 num(Math.round(c.paper)) + " dmg/min" };
    });

    // how many magazine guns sit in the top third
    var third = Math.max(1, Math.round(calcd.length / 3));
    var magTop = 0, magAll = 0;
    calcd.forEach(function (c, i) { if (c.mag) { magAll++; if (i < third) magTop++; } });

    var lede = '<p class="ar-lede">Paper rate is published damage over published reload. ' +
      "Realised is measured, per minute alive. The roster lands between " +
      num(r1(calcd[calcd.length - 1].share)) + "% and " + num(r1(calcd[0].share)) + "%." +
      (magAll
        ? " ◆ marks the " + magAll + " magazine guns, " + magTop + " of them in the top " +
          third + ". They sit high because paper rate assumes one shell per reload."
        : "") + "</p>";

    return T.bigPanel("Paper rate against realised rate",
      lede + T.svgBarChart(bars, { width: 1000, labelWidth: 110, rowHeight: 22 }),
      "Paper is published, realised measured. This is not an efficiency score. It folds in " +
      "aiming, penetration and magazine size. Sample sizes run " +
      num(Math.min.apply(null, calcd.map(function (c) { return c.games; }))) + " to " +
      num(Math.max.apply(null, calcd.map(function (c) { return c.games; }))) + " games per tank.");
  }

  /* ------------------------------------ panel 7: difficulty vs win rate */

  function panelDifficulty() {
    var rows = joined().filter(function (r) { return r.o.difficulty && r.m.games; });
    if (rows.length < 6) return "";
    var buckets = {};
    rows.forEach(function (r) {
      var d = r.o.difficulty;
      if (!buckets[d]) buckets[d] = { d: d, games: 0, wsum: 0, n: 0 };
      buckets[d].games += r.m.games;
      buckets[d].wsum += r.m.winrate * r.m.games;
      buckets[d].n++;
    });
    var levels = [];
    for (var k in buckets) {
      if (Object.prototype.hasOwnProperty.call(buckets, k)) levels.push(buckets[k]);
    }
    levels.sort(function (a, b) { return a.d - b.d; });
    if (levels.length < 3) return "";

    var barRows = levels.map(function (b) {
      return { label: "Difficulty " + b.d, value: r1(b.wsum / b.games), color: GOLD,
               valueLabel: pct(r1(b.wsum / b.games)) + "   " + num(b.games) + " games, " + b.n +
                 (b.n === 1 ? " tank" : " tanks") };
    });
    var pickRows = levels.map(function (b) {
      return { label: "Difficulty " + b.d, value: b.games, color: BLUE,
               valueLabel: num(b.games) + " games over " + b.n + (b.n === 1 ? " tank" : " tanks") };
    });

    var spread = rows.slice().sort(function (a, b) {
      return a.o.difficulty - b.o.difficulty || b.m.winrate - a.m.winrate;
    }).map(function (r) {
      return { label: r.name + "  (diff " + r.o.difficulty + ")", value: r1(r.m.winrate - 50),
               sub: r.name + ": " + pct(r.m.winrate) + " over " + num(r.m.games) + " games" };
    });

    // is the pick volume monotonic in difficulty?
    var mono = true;
    for (var i = 1; i < levels.length; i++) { if (levels[i].games >= levels[i - 1].games) mono = false; }

    var lede = '<p class="ar-lede">tyrhq rates difficulty 1 to 5. Against measured win rate ' +
      "the rating is weak. The spread inside one band beats the gap between bands." +
      (mono ? " Pick volume does fall at every step, across " + levels.length +
        " bands." : "") + "</p>";

    return T.bigPanel("Does the published difficulty rating mean anything?",
      lede +
      '<div class="ar-two">' +
        '<div class="ar-col"><div class="ar-sub">Win rate by published difficulty, weighted by games</div>' +
          T.svgBarChart(barRows, { width: 620, labelWidth: 92, rowHeight: 24, maxValue: 100 }) + "</div>" +
        '<div class="ar-col"><div class="ar-sub">Games played by published difficulty</div>' +
          T.svgBarChart(pickRows, { width: 620, labelWidth: 92, rowHeight: 24 }) + "</div>" +
      "</div>" +
      '<div class="ar-sub" style="margin-top:20px">Every tank against a 50% line, grouped by difficulty</div>' +
      T.svgDivergingBars(spread, { width: 1000, labelWidth: 170, rowHeight: 20 }),
      "Difficulty is published. Win rates and games are measured across " +
      num((T.DATA.matches || []).length) + " replays, weighted by games. " +
      "Seventeen tanks over five bands is too small for a correlation, and win rate carries " +
      "whoever picked the tank.");
  }

  /* --------------------------------------------------------------- page */

  function headline() {
    var o = official();
    if (!o) return "";
    var rows = joined();
    var shots = sum(ammoRows(), function (a) { return a.count; });
    return '<div class="stat-grid">' +
      T.card("Tanks published", num(offList().length)) +
      T.card("Shells published", num(shellList().length)) +
      T.card("Tank-games measured", num(sum(rows, function (r) { return r.m.games; }))) +
      T.card("Shots decoded", num(shots)) +
      "</div>";
  }

  function render(Tin) {
    T = Tin;
    sheet = { k: "games", dir: -1, cls: "All" };
    cmp = { a: null, b: null };
    calc = { tank: null, shell: null };
    atlas = { tank: null };

    if (!official()) {
      return T.bigPanel("Arsenal",
        '<p class="small">The published sheet has not loaded. Nothing to compare ' +
        "against.</p>", "");
    }

    var key = '<div class="ar-key">' +
      '<span><span class="ar-dot" style="background:' + GOLD + '"></span><b>Gold</b> is published by ' +
      "tyrhq.com</span>" +
      '<span><span class="ar-dot" style="background:' + BLUE + '"></span><b>Blue</b> is measured from ' +
      "replays</span></div>";

    return headline() + key +
      panelSheet() + panelCompare() + panelCalc() + panelAtlas() +
      panelReload() + panelPaperRate() + panelDifficulty();
  }

  /* --------------------------------------------------------------- wire */

  function wire(Tin, root) {
    T = Tin;
    if (!root || !official()) return;

    function q(sel) { return root.querySelector(sel); }
    function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

    /* --- spec sheet: sort + class filter --- */
    var chipBar = q('[data-role="sheet-chips"]');
    var sheetBody = q('[data-role="sheet-body"]');
    function redrawSheet() {
      if (sheetBody) sheetBody.innerHTML = sheetTable();
      if (chipBar) {
        var cs = chipBar.querySelectorAll(".ar-chip");
        for (var i = 0; i < cs.length; i++) {
          if (cs[i].getAttribute("data-cls") === sheet.cls) cs[i].className = "ar-chip on";
          else cs[i].className = "ar-chip";
        }
      }
    }
    on(chipBar, "click", function (ev) {
      var b = ev.target.closest ? ev.target.closest(".ar-chip") : null;
      if (!b) return;
      sheet.cls = b.getAttribute("data-cls");
      redrawSheet();
    });
    on(sheetBody, "click", function (ev) {
      var th = ev.target.closest ? ev.target.closest("th[data-k]") : null;
      if (!th) return;
      var k = th.getAttribute("data-k");
      if (sheet.k === k) sheet.dir = -sheet.dir;
      else { sheet.k = k; sheet.dir = (k === "tank" || k === "cls" || k === "abil") ? 1 : -1; }
      redrawSheet();
    });

    /* --- comparator: two pickers plus swap --- */
    var selA = q('[data-role="cmp-a"]'), selB = q('[data-role="cmp-b"]');
    var cmpOut = q('[data-role="cmp-body"]');
    function redrawCmp() { if (cmpOut) cmpOut.innerHTML = cmpBody(); }
    on(selA, "change", function () { cmp.a = selA.value; redrawCmp(); });
    on(selB, "change", function () { cmp.b = selB.value; redrawCmp(); });
    on(q('[data-role="cmp-swap"]'), "click", function () {
      var t = cmp.a; cmp.a = cmp.b; cmp.b = t;
      if (selA) selA.value = cmp.a;
      if (selB) selB.value = cmp.b;
      redrawCmp();
    });

    /* --- shell calculator --- */
    var ct = q('[data-role="calc-tank"]'), cs2 = q('[data-role="calc-shell"]');
    var calcOut = q('[data-role="calc-body"]');
    function redrawCalc() { if (calcOut) calcOut.innerHTML = calcBody(); }
    on(ct, "change", function () { calc.tank = ct.value; redrawCalc(); });
    on(cs2, "change", function () { calc.shell = cs2.value; redrawCalc(); });

    /* --- ability atlas: click a tank card --- */
    var cardBar = q('[data-role="atlas-cards"]');
    var detail = q('[data-role="atlas-detail"]');
    on(cardBar, "click", function (ev) {
      var b = ev.target.closest ? ev.target.closest(".ar-card") : null;
      if (!b) return;
      atlas.tank = b.getAttribute("data-tank");
      if (detail) detail.innerHTML = atlasDetail();
      var all = cardBar.querySelectorAll(".ar-card");
      for (var i = 0; i < all.length; i++) {
        all[i].className = all[i].getAttribute("data-tank") === atlas.tank ? "ar-card on" : "ar-card";
      }
    });
  }

  /* -------------------------------------------------------------- export */

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "arsenal",
    title: "Arsenal",
    blurb: "The game's published tank and shell numbers against what replays measured.",
    accent: GOLD,
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

/* Energy suite: the ability economy.
 *
 * Every tank has one ability and one meter to pay for it. The rules for
 * filling that meter are published on tyrhq. The price of a cast is not
 * published anywhere, so this pipeline measures it from the meter itself.
 *
 * Two colours run through the whole page and mean one thing each:
 *   violet  = published, copied from tyrhq.com
 *   amber   = measured, derived from decoded replays in this archive
 * Nothing here writes; it only reads T and draws.
 */
(function () {
  "use strict";

  var ACCENT = "#a06bff";
  var PUB = "#a06bff";          // published numbers
  var MEAS = "#e0a458";         // measured numbers
  var MEAS_DIM = "rgba(224,164,88,0.26)";
  var CUT = "#e2685f";          // a step down in the meter, i.e. a cast

  // the pipeline's own detector settings, mirrored here so the page can
  // describe exactly what it did (tools/replay_to_site.py)
  var MIN_DROP = 8;             // a fall of this much or more counts as a cast
  var ROUND_TO = 5;             // costs are rounded to the nearest 5
  var MAX_LIVE_MATCHES = 12;    // politeness cap on the live loader

  var CSS = "" +
    ".en-lead{margin:0 0 20px}" +
    ".en-key{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin:0 0 12px;" +
      "font-size:.78rem;color:var(--dim,#7f89b3)}" +
    ".en-chip{display:inline-flex;align-items:center;gap:6px;padding:2px 9px;border-radius:999px;" +
      "font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;border:1px solid}" +
    ".en-chip-pub{color:#cbb0ff;border-color:rgba(160,107,255,.55);background:rgba(160,107,255,.12)}" +
    ".en-chip-meas{color:#f0c894;border-color:rgba(224,164,88,.5);background:rgba(224,164,88,.1)}" +
    ".en-chip-flat{color:var(--dim,#7f89b3);border-color:var(--border,#232c52);background:transparent}" +
    ".en-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(134px,1fr));gap:10px;margin:0 0 10px}" +
    ".en-card{position:relative;overflow:hidden;border:1px solid var(--border,#232c52);border-radius:10px;" +
      "padding:11px 13px 10px 15px;background:var(--panel2,#131a33)}" +
    ".en-card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:" + PUB + "}" +
    ".en-card.en-m:before{background:" + MEAS + "}" +
    ".en-card-l{font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:var(--dim,#7f89b3);" +
      "margin-bottom:5px;line-height:1.3}" +
    ".en-card-v{font-size:1.3rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.15;" +
      "color:var(--text,#d6dcf5)}" +
    ".en-card-v small{font-size:.72rem;font-weight:600;color:var(--dim,#7f89b3);margin-left:3px}" +
    ".en-card-s{font-size:.68rem;color:var(--dim,#7f89b3);margin-top:4px;line-height:1.35}" +

    ".en-two{display:grid;grid-template-columns:288px 1fr;gap:24px;align-items:start}" +
    "@media (max-width:880px){.en-two{grid-template-columns:1fr}}" +
    ".en-ctl-h{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin:14px 0 6px}" +
    ".en-ctl-h:first-child{margin-top:0}" +
    ".en-sel{font:inherit;font-size:.8rem;padding:6px 8px;border-radius:8px;width:100%;" +
      "border:1px solid var(--border,#232c52);background:var(--panel2,#131a33);color:var(--text,#d6dcf5)}" +
    ".en-slider{margin:0 0 9px}" +
    ".en-slider label{display:flex;justify-content:space-between;align-items:baseline;" +
      "font-size:.76rem;color:var(--dim,#7f89b3);margin-bottom:2px}" +
    ".en-slider label b{color:var(--text,#d6dcf5);font-variant-numeric:tabular-nums;font-weight:600}" +
    ".en-slider input[type=range]{width:100%;margin:0;display:block;accent-color:" + ACCENT + "}" +
    ".en-sw{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;" +
      "vertical-align:baseline}" +
    ".en-btn{-webkit-appearance:none;appearance:none;cursor:pointer;font:inherit;font-size:.78rem;" +
      "padding:5px 11px;border-radius:999px;border:1px solid var(--border,#232c52);" +
      "background:var(--panel2,#131a33);color:var(--dim,#7f89b3);line-height:1.25}" +
    ".en-btn:hover{color:var(--text,#d6dcf5);border-color:#4a3d75}" +
    ".en-btn.on{background:rgba(160,107,255,.26);border-color:#8d6bd0;color:#e2d6ff}" +
    ".en-btn[disabled]{opacity:.4;cursor:default}" +
    ".en-btn-m.on{background:rgba(224,164,88,.22);border-color:#b98944;color:#f4d6ac}" +
    ".en-btns{display:flex;flex-wrap:wrap;gap:6px}" +
    ".en-checks{display:flex;flex-direction:column;gap:5px}" +
    ".en-check{display:flex;gap:8px;align-items:flex-start;font-size:.78rem;cursor:pointer;" +
      "color:var(--text,#d6dcf5);line-height:1.35}" +
    ".en-check input{margin-top:3px;accent-color:" + ACCENT + ";cursor:pointer}" +
    ".en-check i{font-style:normal;color:var(--dim,#7f89b3);font-size:.74rem;display:block}" +

    ".en-readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px;margin:14px 0 0}" +
    ".en-ro{border:1px solid var(--border,#232c52);border-radius:9px;padding:9px 11px;background:rgba(255,255,255,.02)}" +
    ".en-ro-l{font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:var(--dim,#7f89b3)}" +
    ".en-ro-v{font-size:1.15rem;font-weight:700;font-variant-numeric:tabular-nums;margin-top:3px}" +
    ".en-ro-s{font-size:.7rem;color:var(--dim,#7f89b3);margin-top:2px;line-height:1.35}" +
    ".en-verdict{margin:12px 0 0;font-size:.82rem;line-height:1.6;color:var(--text,#d6dcf5);" +
      "border-left:2px solid " + MEAS + ";padding:2px 0 2px 12px}" +
    ".en-verdict b{font-variant-numeric:tabular-nums}" +

    ".en-legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin:8px 0 0;font-size:.75rem;" +
      "color:var(--dim,#7f89b3)}" +
    ".en-legend b{color:var(--text,#d6dcf5);font-weight:600;font-variant-numeric:tabular-nums}" +
    ".en-cap{font-size:.8rem;color:var(--dim,#7f89b3);line-height:1.6;min-height:3.2em;margin:10px 0 0;" +
      "border-left:2px solid var(--border,#232c52);padding-left:12px}" +
    ".en-cap b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".en-bin{cursor:pointer}" +
    ".en-method{display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:center;" +
      "margin:14px 0 0;border-top:1px solid var(--border,#232c52);padding-top:14px}" +
    "@media (max-width:820px){.en-method{grid-template-columns:1fr}}" +
    ".en-method p{margin:0;font-size:.82rem;line-height:1.65;color:var(--dim,#7f89b3)}" +
    ".en-method p b{color:var(--text,#d6dcf5);font-weight:600}" +

    ".en-live-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px}" +
    ".en-live-count{font-size:.78rem;color:var(--dim,#7f89b3);font-variant-numeric:tabular-nums}" +
    ".en-mini{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:8px}" +
    ".en-mini-cell{border:1px solid var(--border,#232c52);border-radius:8px;padding:6px 7px 3px;" +
      "background:rgba(255,255,255,.015)}" +
    ".en-mini-h{display:flex;justify-content:space-between;align-items:baseline;font-size:.72rem;" +
      "margin-bottom:2px}" +
    ".en-mini-h b{font-weight:600}" +
    ".en-mini-h span{color:var(--dim,#7f89b3);font-variant-numeric:tabular-nums}" +
    ".en-tally{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:18px 0 0;" +
      "border-top:1px solid var(--border,#232c52);padding-top:16px}" +
    "@media (max-width:880px){.en-tally{grid-template-columns:1fr}}" +
    ".en-tally-h{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin:0 0 8px}" +
    ".en-starts{list-style:none;margin:0;padding:0;font-size:.78rem}" +
    ".en-starts li{display:grid;grid-template-columns:50px 80px 1fr 38px;gap:9px;align-items:center;" +
      "padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}" +
    ".en-starts li:last-child{border-bottom:0}" +
    ".en-starts .en-sv{font-variant-numeric:tabular-nums;color:var(--text,#d6dcf5);font-weight:600}" +
    ".en-starts .en-sn{font-variant-numeric:tabular-nums;color:var(--dim,#7f89b3);text-align:right}" +
    ".en-starts .en-sbar{position:relative;height:11px;border-radius:3px;background:rgba(255,255,255,.05)}" +
    ".en-starts .en-sbar i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;display:block}" +
    ".en-starts .en-snote{font-size:.73rem;color:var(--dim,#7f89b3);line-height:1.35}" +
    "@media (max-width:560px){.en-starts li{grid-template-columns:50px 1fr 38px}" +
      ".en-starts .en-snote{grid-column:1/-1}}" +

    ".en-tanks{display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:10px}" +
    ".en-tk{border:1px solid var(--border,#232c52);border-radius:10px;padding:11px 12px;" +
      "background:var(--panel2,#131a33);cursor:pointer;position:relative;overflow:hidden}" +
    ".en-tk:hover{border-color:#3d4a7d}" +
    ".en-tk:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#4a5478}" +
    ".en-tk-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}" +
    ".en-tk-n{font-weight:700;font-size:.92rem}" +
    ".en-tk-c{font-size:.68rem;color:var(--dim,#7f89b3);text-transform:uppercase;letter-spacing:.05em}" +
    ".en-tk-a{font-size:.84rem;color:#cbb0ff;margin:6px 0 3px;font-weight:600}" +
    ".en-tk-t{font-size:.76rem;color:var(--dim,#7f89b3);line-height:1.5;margin:0}" +
    ".en-tk-m{display:flex;gap:12px;align-items:baseline;margin:8px 0 0;font-size:.74rem;" +
      "color:var(--dim,#7f89b3);font-variant-numeric:tabular-nums}" +
    ".en-tk-m b{color:" + MEAS + ";font-size:.95rem}" +
    ".en-tk-more{margin:9px 0 0;border-top:1px solid var(--border,#232c52);padding-top:8px;display:none}" +
    ".en-tk.open .en-tk-more{display:block}" +
    ".en-tk-comp{font-size:.74rem;line-height:1.5;margin:0 0 6px;color:var(--dim,#7f89b3)}" +
    ".en-tk-comp:last-child{margin-bottom:0}" +
    ".en-tk-comp b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".en-tk-comp.en-ab b{color:#cbb0ff}" +
    ".en-tk-tag{font-size:.64rem;text-transform:uppercase;letter-spacing:.05em;color:#f0c894;" +
      "border:1px solid rgba(224,164,88,.45);border-radius:999px;padding:1px 7px;white-space:nowrap}" +
    ".en-hint{font-size:.72rem;color:var(--dim,#7f89b3);margin:8px 0 0}" +
    ".en-sub-h{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin:18px 0 6px}" +
    ".en-sub-h:first-child{margin-top:0}" +
    ".en-empty{font-size:.82rem;color:var(--dim,#7f89b3);padding:8px 0}";

  var TT = null;

  // ------------------------------------------------------------- utilities

  function E(s) { return TT && TT.esc ? TT.esc(s) : String(s == null ? "" : s); }
  function NUM(n) { return TT && TT.fmtNum ? TT.fmtNum(n) : String(n); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function pct1(x) { return r1(x).toFixed(1) + "%"; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function tankHue(name, i) {
    var c = TT && TT.tankColor ? TT.tankColor(name) : null;
    if (c) return c;
    var cc = (TT && TT.CHART_COLORS) || [ACCENT];
    return cc[(i || 0) % cc.length];
  }
  function chip(kind) {
    return kind === "pub"
      ? '<span class="en-chip en-chip-pub">published</span>'
      : '<span class="en-chip en-chip-meas">measured</span>';
  }
  function sw(color) { return '<i class="en-sw" style="background:' + color + '"></i>'; }
  // walk up for a delegated click target, ES5 style
  function upTo(el, attr, stop) {
    while (el && el !== stop) {
      if (el.getAttribute && el.getAttribute(attr) != null) return el;
      el = el.parentNode;
    }
    return null;
  }
  function mmss(sec) {
    var m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function energyRules(T) {
    var e = (T.OFFICIAL && T.OFFICIAL.energy) || null;
    if (!e || !isNum(e.start) || !isNum(e.max)) return null;
    return e;
  }
  function statList(T, key) {
    var v = T.STATS && T.STATS[key];
    return v && v.length ? v : null;
  }

  // ------------------------------------------------------ shared drawings

  // A column histogram. bins: [{key, label, count, hot}]. Used by the cost
  // panel and again, live, by the loader panel, so both read the same way.
  function vHistogram(bins, opts) {
    opts = opts || {};
    if (!bins || !bins.length) return "";
    var W = opts.width || 660, H = opts.height || 208;
    var padT = 20, padB = 30, padL = 6, padR = 6;
    var maxC = 1, i;
    for (i = 0; i < bins.length; i++) if (bins[i].count > maxC) maxC = bins[i].count;
    var slot = (W - padL - padR) / bins.length;
    var bw = Math.min(opts.barWidth || 44, slot * 0.7);
    var base = H - padB;
    var out = '<line x1="' + padL + '" y1="' + base + '" x2="' + (W - padR) + '" y2="' + base +
      '" stroke="var(--border,#232c52)" stroke-width="1"></line>';
    for (i = 0; i < bins.length; i++) {
      var b = bins[i];
      var cx = padL + slot * (i + 0.5);
      var h = Math.max(b.count > 0 ? 2 : 0, (b.count / maxC) * (base - padT));
      var fill = b.hot ? MEAS : MEAS_DIM;
      out += '<g class="en-bin"' + (opts.pick ? ' data-bin="' + E(b.key) + '"' : "") + '>' +
        '<rect x="' + (cx - slot / 2).toFixed(1) + '" y="0" width="' + slot.toFixed(1) +
          '" height="' + H + '" fill="transparent"></rect>' +
        '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + (base - h).toFixed(1) +
          '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + fill + '"' +
          (opts.sel === b.key ? ' stroke="#f4d6ac" stroke-width="1.5"' : "") + '></rect>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (base - h - 6).toFixed(1) +
          '" text-anchor="middle" class="chart-axis-label"' +
          (b.hot ? ' style="fill:#f0c894"' : "") + '>' + E(NUM(b.count)) + "</text>" +
        '<text x="' + cx.toFixed(1) + '" y="' + (base + 15) +
          '" text-anchor="middle" class="chart-axis-label">' + E(b.label) + "</text>" +
        "</g>";
    }
    if (opts.axisLabel) {
      out += '<text x="' + (W - padR) + '" y="' + (H - 2) + '" text-anchor="end" ' +
        'class="chart-axis-label">' + E(opts.axisLabel) + "</text>";
    }
    return '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  // The detector, drawn. A meter that rises, falls twice, and the fall being
  // called a cast. Schematic on purpose: the shape is illustrative, the rule
  // it illustrates (a fall of 8 or more) is the real one.
  function methodSvg() {
    var W = 340, H = 150, x0 = 26, x1 = W - 10, y0 = H - 24, y1 = 16;
    function X(f) { return x0 + f * (x1 - x0); }
    function Y(v) { return y0 - (v / 110) * (y0 - y1); }
    var pts = [[0, 33], [0.12, 41], [0.26, 55], [0.34, 25], [0.5, 38], [0.62, 52],
               [0.7, 66], [0.78, 36], [0.9, 48], [1, 57]];
    var d = "", i;
    for (i = 0; i < pts.length; i++) d += (i ? "L" : "M") + X(pts[i][0]).toFixed(1) + " " + Y(pts[i][1]).toFixed(1);
    var out = '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 +
      '" stroke="var(--border,#232c52)"></line>' +
      '<line x1="' + x0 + '" y1="' + Y(33) + '" x2="' + x1 + '" y2="' + Y(33) +
      '" stroke="' + PUB + '" stroke-width="1" stroke-dasharray="3 3" opacity="0.75"></line>' +
      '<text x="4" y="' + (Y(33) + 3.5) + '" class="chart-axis-label" style="fill:#cbb0ff">33</text>' +
      '<path d="' + d + '" fill="none" stroke="' + MEAS + '" stroke-width="2" ' +
        'stroke-linejoin="round" stroke-linecap="round"></path>';
    // the two falls, marked
    var falls = [[0.26, 55, 0.34, 25], [0.7, 66, 0.78, 36]];
    for (i = 0; i < falls.length; i++) {
      var f = falls[i];
      out += '<line x1="' + X(f[2]).toFixed(1) + '" y1="' + Y(f[1]).toFixed(1) +
        '" x2="' + X(f[2]).toFixed(1) + '" y2="' + Y(f[3]).toFixed(1) +
        '" stroke="' + CUT + '" stroke-width="2"></line>' +
        '<circle cx="' + X(f[2]).toFixed(1) + '" cy="' + Y(f[3]).toFixed(1) +
        '" r="3" fill="' + CUT + '"></circle>' +
        '<text x="' + (X(f[2]) + 6).toFixed(1) + '" y="' + ((Y(f[1]) + Y(f[3])) / 2 + 3).toFixed(1) +
        '" class="chart-axis-label" style="fill:#e2685f">-30</text>';
    }
    return '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + out + "</svg>";
  }

  // ------------------------------------------------------- lead: the rules

  function leadHtml(T) {
    var e = energyRules(T);
    if (!e) return "";
    var costs = statList(T, "cast_costs") || [];
    var byTank = statList(T, "casts_by_tank") || [];
    var totalCasts = 0, i;
    for (i = 0; i < costs.length; i++) totalCasts += costs[i].count || 0;
    var meters = 0;
    for (i = 0; i < byTank.length; i++) meters += byTank[i].count || 0;
    var topCost = null, topN = -1;
    for (i = 0; i < costs.length; i++) {
      if ((costs[i].count || 0) > topN) { topN = costs[i].count; topCost = costs[i].label; }
    }

    function c(cls, label, value, small) {
      return '<div class="en-card' + (cls ? " " + cls : "") + '">' +
        '<div class="en-card-l">' + E(label) + "</div>" +
        '<div class="en-card-v">' + value + "</div>" +
        '<div class="en-card-s">' + E(small) + "</div></div>";
    }
    var pubCards =
      c("", "Starting energy", NUM(e.start), "every tank, every match") +
      c("", "Meter cap", NUM(e.max), "nothing carries over past it") +
      c("", "Of damage dealt", pct1(e.gain_share_of_damage_dealt * 100), "the main income") +
      c("", "Of assist points", pct1(e.gain_share_of_assist_points * 100), "spotting, tracking, bounces") +
      c("", "Of damage blocked", pct1(e.gain_share_of_damage_blocked * 100), "armour pays badly") +
      c("", "Energy zone", "+" + NUM(e.energy_zone_grant), "a flat grant, once taken") +
      c("", "Energy shell", "+" + NUM(e.energy_shell_flat_grant), "per penetration");
    var measCards =
      c("en-m", "Casts detected", NUM(totalCasts), "meter falls, whole archive") +
      c("en-m", "Meters read", NUM(meters), "one per player per match") +
      c("en-m", "Most common cost", NUM(Number(topCost)), "not published anywhere") +
      c("en-m", "Cost is published", "no", "tyrhq lists none");

    return '<div class="en-lead">' +
      '<div class="en-key">' + chip("pub") +
        "<span>published, from tyrhq.com</span>" +
        chip("meas") + "<span>measured from decoded replays</span></div>" +
      '<div class="en-cards">' + pubCards + "</div>" +
      '<div class="en-cards">' + measCards + "</div>" +
      '<p class="small" style="margin:2px 0 0">Every figure carries one mark. None carries both.</p></div>';
  }

  // ------------------------------------------------- panel 1: fill the meter

  function calcPanel(T) {
    var e = energyRules(T);
    if (!e) return "";
    var tanks = (T.DATA && T.DATA.tanks) || [];
    if (!tanks.length) return "";
    var sorted = tanks.slice().sort(function (a, b) { return (b.games || 0) - (a.games || 0); });
    var opts = "", i;
    for (i = 0; i < sorted.length; i++) {
      opts += '<option value="' + E(sorted[i].tank) + '">' + E(sorted[i].tank) + "</option>";
    }
    var costs = [20, 25, 30, 35];
    var costBtns = "";
    for (i = 0; i < costs.length; i++) {
      costBtns += '<button class="en-btn en-btn-m' + (costs[i] === 30 ? " on" : "") +
        '" data-cost="' + costs[i] + '" type="button">' + costs[i] + "</button>";
    }

    function slider(id, label, max, step) {
      return '<div class="en-slider"><label for="en-' + id + '"><span>' + E(label) +
        '</span><b id="en-' + id + '-v">0</b></label>' +
        '<input id="en-' + id + '" type="range" min="0" max="' + max + '" step="' + step +
        '" value="0"></div>';
    }

    var controls =
      '<div class="en-ctl-h">Tank</div>' +
      '<select class="en-sel" id="en-tank">' + opts + "</select>" +
      '<div class="en-ctl-h">One match, as you played it</div>' +
      slider("dmg", "Damage dealt", 6000, 25) +
      slider("blk", "Damage blocked", 3000, 25) +
      slider("ast", "Assist points", 2500, 25) +
      '<div class="en-ctl-h">Cost of one cast ' + chip("meas") + "</div>" +
      '<div class="en-btns" id="en-costs">' + costBtns + "</div>" +
      '<div class="en-ctl-h">Ability components ' + chip("pub") + "</div>" +
      '<div class="en-checks">' +
        '<label class="en-check"><input type="checkbox" id="en-inj"><span>Core Injector' +
          "<i>ability energy cost down 10%</i></span></label>" +
        '<label class="en-check"><input type="checkbox" id="en-exp"><span>Energy Expander' +
          "<i>max and starting energy up 30%</i></span></label>" +
        '<label class="en-check"><input type="checkbox" id="en-syn"><span>Synchronizer' +
          "<i>starting energy up 7.5</i></span></label>" +
        '<label class="en-check"><input type="checkbox" id="en-zone"><span>Took an energy zone' +
          "<i>a flat +" + NUM(e.energy_zone_grant) + " once</i></span></label>" +
      "</div>";

    var body = '<div class="en-two"><div>' + controls + "</div>" +
      '<div id="en-calc-out"></div></div>';

    var note = "Published arithmetic: " +
      pct1(e.gain_share_of_damage_dealt * 100) + " of damage, " +
      pct1(e.gain_share_of_assist_points * 100) + " of assist, " +
      pct1(e.gain_share_of_damage_blocked * 100) + " of blocked, plus a flat " +
      NUM(e.energy_zone_grant) + " zone grant. The four costs are measured. Three shortcuts: " +
      "Core Booster is skipped, scoreboard assist is taken for assist points, and the cap is " +
      "ignored mid-match. Sliders open at that tank's measured average.";
    return T.bigPanel("Fill the meter", body, note);
  }

  // Everything the calculator draws, rebuilt on every input.
  function calcOut(T, S) {
    var e = energyRules(T);
    var start = e.start * (S.exp ? 1.3 : 1) + (S.syn ? 7.5 : 0);
    var cap = e.max * (S.exp ? 1.3 : 1);
    var gD = S.dmg * e.gain_share_of_damage_dealt;
    var gA = S.ast * e.gain_share_of_assist_points;
    var gB = S.blk * e.gain_share_of_damage_blocked;
    var gZ = S.zone ? e.energy_zone_grant : 0;
    var income = gD + gA + gB + gZ;
    var budget = start + income;
    var cost = S.cost * (S.inj ? 0.9 : 1);
    var casts = Math.floor(budget / cost);
    var dmgPerCast = cost / e.gain_share_of_damage_dealt;

    // the budget bar, scaled so both the cap and the whole budget are on it
    var W = 660, H = 92, x0 = 8, x1 = W - 8;
    var top = Math.max(cap, budget, cost) * 1.04;
    function X(v) { return x0 + (v / top) * (x1 - x0); }
    var segs = [
      { v: start, c: "#7d5bd0", l: "start" },
      { v: gD, c: PUB, l: "damage" },
      { v: gA, c: "#6ea8fe", l: "assist" },
      { v: gB, c: "#4aa3c9", l: "blocked" },
      { v: gZ, c: "#d67ad6", l: "zone" }
    ];
    var barY = 26, barH = 34, acc = 0, bars = "", i;
    bars += '<rect x="' + x0 + '" y="' + barY + '" width="' + (x1 - x0) + '" height="' + barH +
      '" rx="6" fill="rgba(255,255,255,.04)"></rect>';
    for (i = 0; i < segs.length; i++) {
      if (segs[i].v <= 0) continue;
      var xa = X(acc), xb = X(acc + segs[i].v);
      bars += '<rect x="' + xa.toFixed(1) + '" y="' + barY + '" width="' + Math.max(0.6, xb - xa).toFixed(1) +
        '" height="' + barH + '" fill="' + segs[i].c + '"></rect>';
      acc += segs[i].v;
    }
    // cast notches: how many cast-widths fit inside the budget
    var notches = "";
    var k = 1;
    while (k * cost <= top && k <= 40) {
      var nx = X(k * cost);
      var paid = k * cost <= budget;
      notches += '<line x1="' + nx.toFixed(1) + '" y1="' + (barY - 5) + '" x2="' + nx.toFixed(1) +
        '" y2="' + (barY + barH + 5) + '" stroke="' + (paid ? "#0a0e1f" : "rgba(255,255,255,.16)") +
        '" stroke-width="' + (paid ? 2 : 1) + '"></line>' +
        '<text x="' + nx.toFixed(1) + '" y="' + (barY + barH + 17) + '" text-anchor="middle" ' +
        'class="chart-axis-label"' + (paid ? ' style="fill:#f0c894"' : "") + ">" + k + "</text>";
      k++;
    }
    // the cap, published
    var capX = X(cap);
    var capMark = '<line x1="' + capX.toFixed(1) + '" y1="' + (barY - 14) + '" x2="' + capX.toFixed(1) +
      '" y2="' + (barY + barH + 4) + '" stroke="' + PUB + '" stroke-width="1.5" stroke-dasharray="4 3"></line>' +
      '<text x="' + (capX - 5).toFixed(1) + '" y="' + (barY - 18) + '" text-anchor="end" ' +
      'class="chart-axis-label" style="fill:#cbb0ff">cap ' + E(NUM(r1(cap))) + "</text>";
    // the label sits to the right of the fill, and flips to the left of it
    // once the fill is far enough along that it would run off the edge
    var flip = X(budget) > W * 0.58;
    var budgetMark = '<text x="' + (flip ? X(budget) - 6 : X(budget) + 6).toFixed(1) + '" y="' +
      (barY - 18) + '" text-anchor="' + (flip ? "end" : "start") +
      '" class="chart-axis-label" style="fill:#f0c894">' + E(NUM(r1(budget))) +
      " energy for the match</text>";
    var svg = '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + bars + notches + capMark + budgetMark +
      '<text x="' + x0 + '" y="' + (H - 4) + '" class="chart-axis-label">numbered ticks are casts at ' +
      E(NUM(r1(cost))) + " each</text></svg>";

    var legend = '<div class="en-legend">' +
      sw("#7d5bd0") + "<span>start <b>" + NUM(r1(start)) + "</b></span>" +
      sw(PUB) + "<span>damage <b>" + NUM(r1(gD)) + "</b></span>" +
      sw("#6ea8fe") + "<span>assist <b>" + NUM(r1(gA)) + "</b></span>" +
      sw("#4aa3c9") + "<span>blocked <b>" + NUM(r1(gB)) + "</b></span>" +
      (gZ ? sw("#d67ad6") + "<span>zone <b>" + NUM(r1(gZ)) + "</b></span>" : "") +
      "</div>";

    // the tank's own measured behaviour, for the comparison line
    var tk = null, tanks = (T.DATA && T.DATA.tanks) || [];
    for (i = 0; i < tanks.length; i++) if (tanks[i].tank === S.tank) tk = tanks[i];
    var castRow = null, list = statList(T, "casts_by_tank") || [];
    for (i = 0; i < list.length; i++) if (list[i].label === S.tank) castRow = list[i];

    var minutes = (tk && tk.dpm) ? dmgPerCast / tk.dpm : null;
    var ro =
      '<div class="en-readout">' +
      '<div class="en-ro"><div class="en-ro-l">Casts you can pay for</div>' +
        '<div class="en-ro-v" style="color:' + MEAS + '">' + casts + "</div>" +
        '<div class="en-ro-s">' + NUM(r1(budget)) + " energy at " + NUM(r1(cost)) + " each</div></div>" +
      '<div class="en-ro"><div class="en-ro-l">Damage for one cast</div>' +
        '<div class="en-ro-v">' + NUM(Math.round(dmgPerCast)) + "</div>" +
        '<div class="en-ro-s">if damage were your only income</div></div>' +
      '<div class="en-ro"><div class="en-ro-l">Time to earn it</div>' +
        '<div class="en-ro-v">' + (minutes ? mmss(minutes * 60) : "-") + "</div>" +
        '<div class="en-ro-s">' + (tk && tk.dpm ? "at " + NUM(Math.round(tk.dpm)) +
          " dmg/min, measured" : "no damage rate for this tank") +
        "</div></div>" +
      '<div class="en-ro"><div class="en-ro-l">Blocking instead</div>' +
        '<div class="en-ro-v">' + NUM(Math.round(cost / e.gain_share_of_damage_blocked)) + "</div>" +
        '<div class="en-ro-s">blocked for one cast</div></div>' +
      "</div>";

    var verdict = "";
    if (castRow) {
      var med = castRow.value;
      var closing = casts > med
        ? " Budget beats behaviour. The meter rarely stops a cast."
        : (casts < med
          ? " Budget falls short. The rest came from a zone, a shell or a component."
          : " Budget and behaviour agree here.");
      verdict = '<div class="en-verdict">' + E(S.tank) + " can afford <b>" +
        casts + "</b> cast" + (casts === 1 ? "" : "s") + ". Measured: a median of <b>" +
        NUM(med) + "</b> per match over <b>" + NUM(castRow.count) +
        "</b> matches." + closing + "</div>";
    }
    return svg + legend + ro + verdict;
  }

  function wireCalc(T, root) {
    var out = root.querySelector("#en-calc-out");
    if (!out) return;
    var sel = root.querySelector("#en-tank");
    var S = { tank: sel ? sel.value : null, dmg: 0, blk: 0, ast: 0, cost: 30,
              inj: false, exp: false, syn: false, zone: false };
    var ids = { dmg: "en-dmg", blk: "en-blk", ast: "en-ast" };

    function seed() {
      var tanks = (T.DATA && T.DATA.tanks) || [], i, tk = null;
      for (i = 0; i < tanks.length; i++) if (tanks[i].tank === S.tank) tk = tanks[i];
      var a = (tk && tk.avg) || {};
      S.dmg = Math.round((a.dmg || 0) / 25) * 25;
      S.blk = Math.round((a.blocked || 0) / 25) * 25;
      S.ast = Math.round((a.assist || 0) / 25) * 25;
      var key;
      for (key in ids) {
        if (!Object.prototype.hasOwnProperty.call(ids, key)) continue;
        var el = root.querySelector("#" + ids[key]);
        if (!el) continue;
        S[key] = clamp(S[key], 0, Number(el.max) || S[key]);
        el.value = String(S[key]);
      }
    }
    function labels() {
      var key;
      for (key in ids) {
        if (!Object.prototype.hasOwnProperty.call(ids, key)) continue;
        var lab = root.querySelector("#" + ids[key] + "-v");
        if (lab) lab.textContent = NUM(S[key]);
      }
    }
    function draw() { labels(); out.innerHTML = calcOut(T, S); }

    if (sel) {
      sel.addEventListener("change", function () {
        S.tank = sel.value; seed(); draw();
      });
    }
    var key2;
    for (key2 in ids) {
      if (!Object.prototype.hasOwnProperty.call(ids, key2)) continue;
      (function (k) {
        var el = root.querySelector("#" + ids[k]);
        if (!el) return;
        el.addEventListener("input", function () { S[k] = Number(el.value) || 0; draw(); });
      })(key2);
    }
    var costBox = root.querySelector("#en-costs");
    if (costBox) {
      costBox.addEventListener("click", function (ev) {
        var b = upTo(ev.target, "data-cost", costBox);
        if (!b) return;
        S.cost = Number(b.getAttribute("data-cost"));
        var all = costBox.querySelectorAll("[data-cost]"), i;
        for (i = 0; i < all.length; i++) all[i].className = "en-btn en-btn-m" +
          (all[i] === b ? " on" : "");
        draw();
      });
    }
    var boxes = [["#en-inj", "inj"], ["#en-exp", "exp"], ["#en-syn", "syn"], ["#en-zone", "zone"]];
    for (var j = 0; j < boxes.length; j++) {
      (function (pair) {
        var el = root.querySelector(pair[0]);
        if (!el) return;
        el.addEventListener("change", function () { S[pair[1]] = !!el.checked; draw(); });
      })(boxes[j]);
    }
    seed(); draw();
  }

  // ---------------------------------------------- panel 2: what a cast costs

  var BIN_TEXT = {
    low: "Below any plausible price. Any fall of " + MIN_DROP +
      " counts as a cast, and a discounted ability or a partial step lands here.",
    core: "The cluster. Four bins hold most casts. They sit 5 apart because the measurement " +
      "rounds to 5, not because the game prices in fives.",
    high: "Larger than any single price. Probably two casts inside one replication gap. The " +
      "meter is sampled only when it changes."
  };

  function costPanel(T) {
    var costs = statList(T, "cast_costs");
    if (!costs) return "";
    var total = 0, i;
    for (i = 0; i < costs.length; i++) total += costs[i].count || 0;
    var core = 0;
    for (i = 0; i < costs.length; i++) {
      var v = Number(costs[i].label);
      if (v >= 20 && v <= 35) core += costs[i].count || 0;
    }
    var body =
      '<div id="en-cost-chart">' + vHistogram(costBins(costs, null), { pick: true, axisLabel: "energy per cast" }) + "</div>" +
      '<div class="en-cap" id="en-cost-cap"><b>' + pct1(100 * core / total) +
        " of every cast measured</b> costs 20, 25, 30 or 35. Click a bar.</div>" +
      '<div class="en-method"><div>' + methodSvg() + "</div>" +
      "<div><p><b>How this was measured.</b> The meter replicates whenever it changes. A cast " +
      "shows up as a step down. Every fall of <b>" + MIN_DROP + " or more</b> counts as " +
      "one cast, rounded to <b>" + ROUND_TO + "</b>. Bins under 20 are dropped. The dashed " +
      "line is the published start of 33.</p></div></div>";
    var note = "Measured, not published. tyrhq lists no costs at all. " + NUM(total) +
      " detected casts, spread over casts and not over tanks, so popular tanks weigh more " +
      "and no bin can be pinned on one ability. Rounding to " + ROUND_TO +
      " hides Core Injector's 10% discount.";
    return T.bigPanel("What a cast costs", body, note);
  }

  function costBins(costs, sel) {
    var bins = [], i;
    for (i = 0; i < costs.length; i++) {
      var v = Number(costs[i].label);
      bins.push({ key: costs[i].label, label: costs[i].label, count: costs[i].count || 0,
                  hot: v >= 20 && v <= 35 });
    }
    return bins;
  }

  function wireCost(T, root) {
    var chart = root.querySelector("#en-cost-chart");
    var cap = root.querySelector("#en-cost-cap");
    var costs = statList(T, "cast_costs");
    if (!chart || !cap || !costs) return;
    var total = 0, i;
    for (i = 0; i < costs.length; i++) total += costs[i].count || 0;
    chart.addEventListener("click", function (ev) {
      var g = upTo(ev.target, "data-bin", chart);
      if (!g) return;
      var keyVal = g.getAttribute("data-bin");
      var v = Number(keyVal), row = null, j;
      for (j = 0; j < costs.length; j++) if (costs[j].label === keyVal) row = costs[j];
      if (!row) return;
      var which = v < 20 ? "low" : (v <= 35 ? "core" : "high");
      chart.innerHTML = vHistogram(costBins(costs, keyVal),
        { pick: true, sel: keyVal, axisLabel: "energy per cast" });
      cap.innerHTML = "<b>" + E(keyVal) + " energy: " + NUM(row.count) + " casts, " +
        pct1(100 * row.count / total) + " of the total.</b> " + E(BIN_TEXT[which]);
    });
  }

  // ------------------------------------------- panel 3: measure it yourself

  function livePanel(T) {
    var ms = (T.DATA && T.DATA.matches) || [];
    if (!ms.length) return "";
    var body =
      '<div class="en-live-head">' +
      '<button class="en-btn en-btn-m" id="en-live-add" type="button">Read another match</button>' +
      '<span class="en-live-count" id="en-live-count">reading the first match...</span></div>' +
      '<div id="en-live-mini" class="en-mini"></div>' +
      '<div id="en-live-tally"></div>';
    var note = "Fetches whole matches, about 350 KB each, and reads every meter. The dashed " +
      "line is the published start of 33. Red marks each fall of " + MIN_DROP + " or more. " +
      "The meter replicates only when it changes, so income and spending here are floors.";
    return T.bigPanel("Measure it yourself", body, note);
  }

  // Pull every usable meter out of one decoded match. rates are the published
  // shares, passed in rather than baked in so this never drifts from the sheet.
  function scanMatch(m, rates) {
    var byName = {}, out = [], i;
    var pl = m.players || [];
    for (i = 0; i < pl.length; i++) if (pl[i] && pl[i].name) byName[pl[i].name] = pl[i];
    var ar = m.playerAbilityResource || {};
    var dur = (m.match && m.match.durationSec) || 0;
    var name;
    for (name in ar) {
      if (!Object.prototype.hasOwnProperty.call(ar, name)) continue;
      var s = (ar[name] || {}).series || [];
      if (s.length < 4) continue;
      var p = byName[name] || {};
      var casts = [], rise = 0, peak = 0, j;
      for (j = 0; j < s.length; j++) if (s[j][1] > peak) peak = s[j][1];
      for (j = 1; j < s.length; j++) {
        var d = s[j][1] - s[j - 1][1];
        if (d > 0) { rise += d; continue; }
        if (-d >= MIN_DROP) {
          casts.push({ t: s[j][0], from: s[j - 1][1], to: s[j][1],
                       cost: Math.round((-d) / ROUND_TO) * ROUND_TO });
        }
      }
      out.push({
        tank: (p.egsTank && p.egsTank.display) || null,
        first: s[0][1], peak: peak, series: s, casts: casts, rise: rise,
        pred: rates.d * (p.damage || 0) + rates.a * (p.assist || 0) + rates.b * (p.blocked || 0)
      });
    }
    out.sort(function (a, b) { return b.casts.length - a.casts.length; });
    return { dur: dur, map: (m.match && m.match.map) || "", meters: out };
  }

  function miniTrace(mt, dur, idx) {
    var W = 178, H = 66, padL = 4, padR = 4, padT = 7, padB = 9;
    var top = Math.max(100, Math.ceil(mt.peak / 10) * 10);
    var last = mt.series[mt.series.length - 1][0];
    var span = Math.max(dur || 0, last, 1);
    function X(t) { return padL + (t / span) * (W - padL - padR); }
    function Y(v) { return H - padB - (v / top) * (H - padT - padB); }
    var d = "", i;
    for (i = 0; i < mt.series.length; i++) {
      d += (i ? "L" : "M") + X(mt.series[i][0]).toFixed(1) + " " + Y(mt.series[i][1]).toFixed(1);
    }
    var marks = "";
    for (i = 0; i < mt.casts.length; i++) {
      var c = mt.casts[i];
      marks += '<line x1="' + X(c.t).toFixed(1) + '" y1="' + Y(c.from).toFixed(1) +
        '" x2="' + X(c.t).toFixed(1) + '" y2="' + Y(c.to).toFixed(1) +
        '" stroke="' + CUT + '" stroke-width="1.6"></line>' +
        '<circle cx="' + X(c.t).toFixed(1) + '" cy="' + Y(c.to).toFixed(1) + '" r="2" fill="' + CUT + '"></circle>';
    }
    var onPub = Math.abs(mt.first - 33) < 0.05;
    var hue = tankHue(mt.tank, idx);
    return '<div class="en-mini-cell">' +
      '<div class="en-mini-h"><b style="color:' + hue + '">' + E(mt.tank || "unknown") + "</b>" +
      "<span>starts " + E(NUM(r1(mt.first))) +
      (onPub ? ' <b style="color:' + PUB + '">&bull;</b>' : "") + "</span></div>" +
      '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet">' +
      '<line x1="' + padL + '" y1="' + Y(33).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(33).toFixed(1) +
      '" stroke="' + PUB + '" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"></line>' +
      '<line x1="' + padL + '" y1="' + Y(0).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(0).toFixed(1) +
      '" stroke="var(--border,#232c52)"></line>' +
      '<path d="' + d + '" fill="none" stroke="' + hue + '" stroke-width="1.6" ' +
      'stroke-linejoin="round" stroke-linecap="round"></path>' + marks +
      '<text x="' + (W - padR) + '" y="' + (H - 1) + '" text-anchor="end" class="chart-axis-label">' +
      mt.casts.length + " cast" + (mt.casts.length === 1 ? "" : "s") + "</text></svg></div>";
  }

  // Starting values that the published component effects land on exactly.
  // Energy Expander is +30% starting energy, Synchronizer is +7.5.
  var NAMED_STARTS = [
    [42.9, "33 x 1.30, an Energy Expander"],
    [40.5, "33 + 7.5, a Synchronizer"],
    [50.4, "33 x 1.30 + 7.5, both of them"],
    [52.65, "(33 + 7.5) x 1.30, both of them"]
  ];
  function namedStart(v) {
    for (var i = 0; i < NAMED_STARTS.length; i++) {
      if (Math.abs(v - NAMED_STARTS[i][0]) < 0.06) return NAMED_STARTS[i][1];
    }
    return null;
  }
  function startNote(v) {
    if (Math.abs(v - 33) < 0.05) return "the published start, exactly";
    var named = namedStart(v);
    if (named) return named;
    if (v > 33) return "above 33, source unknown";
    return "below the published start";
  }

  function tallyHtml(T, A) {
    if (!A.meters) return "";
    var rules = energyRules(T);
    // starting values, most common first
    var keys = [], k;
    for (k in A.starts) if (Object.prototype.hasOwnProperty.call(A.starts, k)) keys.push(k);
    keys.sort(function (a, b) { return A.starts[b] - A.starts[a]; });
    var maxS = A.starts[keys[0]] || 1;
    var rows = "", i;
    for (i = 0; i < keys.length && i < 9; i++) {
      var v = Number(keys[i]), n = A.starts[keys[i]];
      var exact = Math.abs(v - 33) < 0.05;
      rows += "<li><span class=\"en-sv\">" + E(NUM(v)) + "</span>" +
        '<span class="en-sbar"><i style="width:' + (100 * n / maxS).toFixed(1) + "%;background:" +
        (exact ? PUB : "rgba(224,164,88,.4)") + '"></i></span>' +
        '<span class="en-snote">' + E(startNote(v)) + "</span>" +
        '<span class="en-sn">' + n + "</span></li>";
    }
    var pubStarts = 0, namedN = 0;
    for (k in A.starts) {
      if (!Object.prototype.hasOwnProperty.call(A.starts, k)) continue;
      if (Math.abs(Number(k) - 33) < 0.05) pubStarts += A.starts[k];
      else if (namedStart(Number(k))) namedN += A.starts[k];
    }

    // cost bins from the live sample
    var bins = [], lo = null, hi = null;
    for (k in A.costs) {
      if (!Object.prototype.hasOwnProperty.call(A.costs, k)) continue;
      var c = Number(k);
      if (lo === null || c < lo) lo = c;
      if (hi === null || c > hi) hi = c;
    }
    if (lo !== null) {
      for (var b = lo; b <= hi; b += ROUND_TO) {
        bins.push({ key: String(b), label: String(b), count: A.costs[String(b)] || 0,
                    hot: b >= 20 && b <= 35 });
      }
    }

    // income against the published rates
    var obs = A.rise / A.meters, pred = A.pred / A.meters;
    var wide = Math.max(obs, pred) * 1.12 || 1;
    function incomeBar(label, val, color, sub) {
      return '<div style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;' +
        'font-size:.76rem;color:var(--dim,#7f89b3)"><span>' + E(label) + "</span><b style=\"color:" +
        color + ';font-variant-numeric:tabular-nums">' + E(NUM(r1(val))) + "</b></div>" +
        '<div style="height:14px;border-radius:3px;background:rgba(255,255,255,.05);margin:3px 0 2px">' +
        '<i style="display:block;height:14px;border-radius:3px;width:' +
        (100 * val / wide).toFixed(1) + "%;background:" + color + '"></i></div>' +
        '<div style="font-size:.7rem;color:var(--dim,#7f89b3)">' + E(sub) + "</div></div>";
    }
    var ratio = pred > 0 ? obs / pred : null;
    var gap = obs - pred;
    var zoneEvery = (gap > 0 && rules && rules.energy_zone_grant)
      ? Math.max(1, Math.round(rules.energy_zone_grant / gap)) : null;

    return '<div class="en-tally">' +
      "<div>" +
      '<div class="en-tally-h">Where each meter started ' + chip("meas") + "</div>" +
      '<ul class="en-starts">' + rows + "</ul>" +
      '<p class="en-hint"><b style="color:var(--text,#d6dcf5)">' + pubStarts + " of " + A.meters +
      "</b> meters opened on exactly 33, the published start. " +
      (namedN ? "Another <b style=\"color:var(--text,#d6dcf5)\">" + namedN + "</b> land on a " +
        "published component. The rest are unattributed." : "The rest are unattributed.") + "</p>" +
      "</div><div>" +
      '<div class="en-tally-h">Income per meter, this sample ' + chip("meas") + "</div>" +
      incomeBar("Energy actually gained", obs, MEAS, "every rise, added up") +
      incomeBar("Predicted by the published rates", pred, PUB,
        rules ? pct1(rules.gain_share_of_damage_dealt * 100) + " of damage + " +
          pct1(rules.gain_share_of_assist_points * 100) + " of assist + " +
          pct1(rules.gain_share_of_damage_blocked * 100) + " of blocked"
              : "published shares") +
      '<p class="en-hint">' + (ratio ? "Players gained <b style=\"color:var(--text,#d6dcf5)\">" +
        r1(ratio).toFixed(2) + " times</b> what damage, assists and blocking pay. The published " +
        "extras: energy zone +" + (rules ? NUM(rules.energy_zone_grant) : "50") +
        ", Energy shell +" + (rules ? NUM(rules.energy_shell_flat_grant) : "7") +
        " a penetration, plus components. " + (zoneEvery ? "One zone every " + zoneEvery +
        " matches would cover the gap." : "") : "") + "</p>" +
      "</div></div>" +
      (bins.length ? '<div class="en-tally-h" style="margin-top:16px">Cost of every cast in this ' +
        "sample " + chip("meas") + "</div>" + vHistogram(bins, { height: 170, axisLabel: "energy per cast" }) : "");
  }

  function wireLive(T, root) {
    var mini = root.querySelector("#en-live-mini");
    var tally = root.querySelector("#en-live-tally");
    var count = root.querySelector("#en-live-count");
    var btn = root.querySelector("#en-live-add");
    if (!mini || !tally || !count) return;
    var ids = [], ms = (T.DATA && T.DATA.matches) || [], i;
    for (i = 0; i < ms.length; i++) if (ms[i] && ms[i].match_id) ids.push(ms[i].match_id);
    if (!ids.length) { count.textContent = "no decoded matches available"; return; }

    var A = { matches: 0, meters: 0, starts: {}, costs: {}, rise: 0, pred: 0 };
    var used = {}, busy = false;
    var er = energyRules(T) || {};
    var rates = {
      d: isNum(er.gain_share_of_damage_dealt) ? er.gain_share_of_damage_dealt : 0.035,
      a: isNum(er.gain_share_of_assist_points) ? er.gain_share_of_assist_points : 0.02,
      b: isNum(er.gain_share_of_damage_blocked) ? er.gain_share_of_damage_blocked : 0.005
    };

    function pick() {
      var tries = 0;
      while (tries < 60) {
        var id = ids[Math.floor(Math.random() * ids.length)];
        if (!used[id]) { used[id] = 1; return id; }
        tries++;
      }
      for (var j = 0; j < ids.length; j++) if (!used[ids[j]]) { used[ids[j]] = 1; return ids[j]; }
      return null;
    }

    function load() {
      if (busy) return;
      var id = pick();
      if (!id) { if (btn) btn.disabled = true; return; }
      busy = true;
      if (btn) btn.disabled = true;
      count.textContent = "reading match " + id + "...";
      T.loadJson("matches/" + id + ".json").then(function (m) {
        busy = false;
        if (!document.body.contains(mini)) return;   // navigated away mid fetch
        if (!m) {
          count.textContent = "match file failed. Try another.";
          if (btn) btn.disabled = false;
          return;
        }
        var scan = scanMatch(m, rates), k;
        A.matches++;
        if (btn) btn.disabled = A.matches >= MAX_LIVE_MATCHES;
        var cells = "";
        for (k = 0; k < scan.meters.length; k++) {
          var mt = scan.meters[k];
          A.meters++;
          var sk = String(r1(mt.first));
          A.starts[sk] = (A.starts[sk] || 0) + 1;
          A.rise += mt.rise;
          A.pred += mt.pred;
          for (var q = 0; q < mt.casts.length; q++) {
            var ck = String(mt.casts[q].cost);
            A.costs[ck] = (A.costs[ck] || 0) + 1;
          }
          cells += miniTrace(mt, scan.dur, k);
        }
        mini.innerHTML = cells || '<p class="en-empty">This match carried no readable meters.</p>';
        tally.innerHTML = tallyHtml(T, A);
        count.textContent = A.matches + " match" + (A.matches === 1 ? "" : "es") + " read, " +
          A.meters + " meters, " + scan.meters.length + " of them shown above from " +
          (scan.map || "this match") + ", " + mmss(scan.dur || 0) + " long" +
          (A.matches >= MAX_LIVE_MATCHES ? ". Cap reached." : ".");
      });
    }

    if (btn) btn.addEventListener("click", load);
    load();
  }

  // ---------------------------------------------- panel 4: the ability atlas

  function atlasPanel(T) {
    var off = (T.OFFICIAL && T.OFFICIAL.tanks) || [];
    if (!off.length) return "";
    var body =
      '<div class="en-btns" style="margin:0 0 12px">' +
      '<button class="en-btn on" data-sort="casts" type="button">By casts measured</button>' +
      '<button class="en-btn" data-sort="class" type="button">By class</button>' +
      '<button class="en-btn" data-sort="name" type="button">A to Z</button></div>' +
      '<div class="en-tanks" id="en-atlas"></div>' +
      '<p class="en-hint">Click a card for components.</p>';
    var note = "Names published by tyrhq. Cast counts measured: median casts per match, with " +
      "the match count beside it. Components are tyrhq's three per tank, not necessarily what " +
      "was fitted. Meters still open above 33 on tanks carrying nothing that raises the start.";
    return T.bigPanel("The ability atlas", body, note);
  }

  function atlasCards(T, sortKey) {
    var off = (T.OFFICIAL && T.OFFICIAL.tanks) || [];
    var casts = {}, list = statList(T, "casts_by_tank") || [], i;
    for (i = 0; i < list.length; i++) casts[list[i].label] = list[i];
    var abilityComps = (T.OFFICIAL && T.OFFICIAL.components &&
                        T.OFFICIAL.components.Ability) || [];
    function isAbilityComp(n) {
      for (var j = 0; j < abilityComps.length; j++) if (abilityComps[j] === n) return true;
      return false;
    }
    var order = { Light: 0, Medium: 1, Heavy: 2 };
    var rows = off.slice();
    rows.sort(function (a, b) {
      if (sortKey === "name") return a.tank.localeCompare(b.tank);
      if (sortKey === "class") {
        return (order[a["class"]] - order[b["class"]]) || a.tank.localeCompare(b.tank);
      }
      var ca = casts[a.tank] ? casts[a.tank].value : -1;
      var cb = casts[b.tank] ? casts[b.tank].value : -1;
      return (cb - ca) || a.tank.localeCompare(b.tank);
    });
    // the two abilities that arrive as a shot, per the official notes
    var asShot = { Valor: "Heal", Arbalest: "Siege" };
    var out = "";
    for (i = 0; i < rows.length; i++) {
      var t = rows[i], c = casts[t.tank];
      var hue = tankHue(t.tank, i);
      var comps = t.components || [], cHtml = "", j;
      for (j = 0; j < comps.length; j++) {
        cHtml += '<p class="en-tk-comp' + (isAbilityComp(comps[j].name) ? " en-ab" : "") +
          '"><b>' + E(comps[j].name) + "</b> <span>level " + E(comps[j].level) + "</span><br>" +
          E(comps[j].text) + "</p>";
      }
      out += '<div class="en-tk" data-tank="' + E(t.tank) + '">' +
        '<span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:' + hue + '"></span>' +
        '<div class="en-tk-h"><span class="en-tk-n" style="color:' + hue + '">' + E(t.tank) + "</span>" +
        '<span class="en-tk-c">' + E(t["class"]) + " &middot; " + E(NUM(t.hp)) + " hp</span></div>" +
        '<div class="en-tk-a">' + E((t.ability && t.ability.name) || "-") +
        (asShot[t.tank] ? ' <span class="en-tk-tag">arrives as a shell</span>' : "") + "</div>" +
        '<p class="en-tk-t">' + E((t.ability && t.ability.text) || "") + "</p>" +
        '<div class="en-tk-m"><span><b>' + (c ? E(NUM(c.value)) : "-") +
        "</b> " + (c && c.value === 1 ? "cast" : "casts") + ", median</span><span>" +
        (c ? E(NUM(c.count)) + " matches" : "not measured") + "</span></div>" +
        '<div class="en-tk-more">' + cHtml + "</div></div>";
    }
    return out;
  }

  function wireAtlas(T, root) {
    var box = root.querySelector("#en-atlas");
    if (!box) return;
    var btns = root.querySelectorAll("[data-sort]");
    box.innerHTML = atlasCards(T, "casts");
    box.addEventListener("click", function (ev) {
      var card = upTo(ev.target, "data-tank", box);
      if (!card) return;
      card.className = card.className.indexOf("open") >= 0 ? "en-tk" : "en-tk open";
    });
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener("click", function () {
          for (var j = 0; j < btns.length; j++) btns[j].className = "en-btn";
          b.className = "en-btn on";
          box.innerHTML = atlasCards(T, b.getAttribute("data-sort"));
        });
      })(btns[i]);
    }
  }

  // --------------------------------------------- panel 5: across the match

  function timePanel(T) {
    var curve = T.STATS && T.STATS.ability_resource_curve;
    var prog = statList(T, "cast_progress");
    if ((!curve || !curve.avg || curve.avg.length < 3) && !prog) return "";
    var e = energyRules(T);
    var body = "";
    if (curve && curve.avg && curve.avg.length > 2 && e) {
      var flat = [], i;
      for (i = 0; i < curve.avg.length; i++) flat.push(e.start);
      var xl = [];
      for (i = 0; i < (curve.seconds || []).length; i++) xl.push(mmss(curve.seconds[i]));
      body += '<div class="en-sub-h">Average meter across every player still being sampled ' +
        chip("meas") + "</div>" +
        T.svgLineChart([
          { label: "measured average energy", color: MEAS, values: curve.avg },
          { label: "published starting energy", color: PUB, values: flat }
        ], { min: 0, max: e.max, xLabels: xl, height: 250 }) +
        '<p class="en-hint">Top gridline is the published cap of ' + NUM(e.max) +
        ". Nobody gets near it.</p>";
    }
    if (prog) {
      body += '<div class="en-sub-h">When in a match those casts happen ' + chip("meas") +
        '</div><div class="en-btns" style="margin:0 0 10px">' +
        '<button class="en-btn en-btn-m on" data-when="raw" type="button">Casts counted</button>' +
        '<button class="en-btn en-btn-m" data-when="alive" type="button">Adjusted for who is alive</button>' +
        '</div><div id="en-when"></div><div class="en-cap" id="en-when-cap"></div>';
    }
    var note = "Both charts measured. The line averages every reporting meter in 15s buckets " +
      "and cuts below eight meters, so its right end is long matches only. The first bucket " +
      "is each meter's opening value, not always 33. Bars place casts inside each match's own " +
      "length. Adjusted divides by the share of tanks still alive, and corrects nothing else.";
    return T.bigPanel("Across the match", body, note);
  }

  // Average share of tanks still alive at each tenth of a match, weighted by
  // how many lives each tank contributes.
  function aliveShares(T) {
    var sc = statList(T, "survival_curves");
    if (!sc) return null;
    var atPct = {}, tot = 0, i, j;
    for (i = 0; i < sc.length; i++) {
      var n = sc[i].count || 0;
      tot += n;
      var pts = sc[i].points || [];
      for (j = 0; j < pts.length; j++) {
        var key = String(pts[j][0]);
        atPct[key] = (atPct[key] || 0) + n * pts[j][1];
      }
    }
    if (!tot) return null;
    var out = [];
    for (i = 0; i < 10; i++) {
      var a = atPct[String(i * 10)], b = atPct[String((i + 1) * 10)];
      if (a == null || b == null) return null;
      out.push(((a / tot) + (b / tot)) / 2 / 100);
    }
    return out;
  }

  function whenRows(T, mode) {
    var prog = statList(T, "cast_progress");
    if (!prog) return null;
    var alive = mode === "alive" ? aliveShares(T) : null;
    if (mode === "alive" && !alive) return null;
    var rows = [], maxV = 0, i;
    for (i = 0; i < prog.length; i++) {
      var v = prog[i].count || 0;
      if (alive) v = alive[i] > 0.02 ? v / alive[i] : 0;
      if (v > maxV) maxV = v;
      rows.push({ label: prog[i].label, value: v,
                  valueLabel: alive ? NUM(Math.round(v)) : NUM(prog[i].count) });
    }
    for (i = 0; i < rows.length; i++) {
      var f = maxV ? rows[i].value / maxV : 0;
      rows[i].color = "rgba(224,164,88," + (0.32 + 0.55 * f).toFixed(2) + ")";
    }
    return rows;
  }

  function wireTime(T, root) {
    var box = root.querySelector("#en-when");
    var cap = root.querySelector("#en-when-cap");
    if (!box) return;
    var btns = root.querySelectorAll("[data-when]");
    var prog = statList(T, "cast_progress") || [];
    var total = 0, i;
    for (i = 0; i < prog.length; i++) total += prog[i].count || 0;

    function draw(mode) {
      var rows = whenRows(T, mode);
      if (!rows) {
        box.innerHTML = '<p class="en-empty">No survival curves to adjust with.</p>';
        return;
      }
      box.innerHTML = T.svgBarChart(rows, { labelWidth: 92, rowHeight: 22, width: 660 });
      if (!cap) return;
      var j;
      if (mode === "raw") {
        var early = 0;
        for (j = 0; j < prog.length; j++) if (j < 5) early += prog[j].count || 0;
        var alive = aliveShares(T);
        cap.innerHTML = "<b>" + pct1(100 * early / total) + " of " + NUM(total) +
          " casts land in the first half.</b> " +
          (alive ? "By the last tenth only " + pct1(100 * alive[alive.length - 1]) +
            " of the field is alive. " : "") +
          "The other view divides that back out.";
      } else {
        // describe the adjusted shape from the adjusted numbers, not from memory
        var mid = [], sum = 0;
        for (j = 3; j < rows.length - 1; j++) { mid.push(rows[j].value); sum += rows[j].value; }
        var mean = mid.length ? sum / mid.length : 0, dev = 0;
        for (j = 0; j < mid.length; j++) {
          dev = Math.max(dev, mean ? Math.abs(mid[j] - mean) / mean : 0);
        }
        var opening = rows[0].value > 0 ? mean / rows[0].value : 0;
        cap.innerHTML = "<b>Adjusted, the late fall mostly goes away.</b> Tenths four to nine " +
          "stay within " + pct1(100 * dev) + " of their average" +
          (opening > 1.5 ? "; the first runs about a " + Math.round(opening) +
          "th of that, nobody having earned anything yet" : "") +
          ". The last dips where matches end mid-cooldown.";
      }
    }
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener("click", function () {
          for (var j = 0; j < btns.length; j++) btns[j].className = "en-btn en-btn-m";
          b.className = "en-btn en-btn-m on";
          draw(b.getAttribute("data-when"));
        });
      })(btns[i]);
    }
    draw("raw");
  }

  // ------------------------------------- panel 6: abilities in the ammo list

  function ammoPanel(T) {
    var ammo = statList(T, "ammo_totals");
    if (!ammo) return "";
    var drift = (T.OFFICIAL && T.OFFICIAL._shell_name_drift) || {};
    var e = energyRules(T);
    var casts = {}, list = statList(T, "casts_by_tank") || [], i;
    for (i = 0; i < list.length; i++) casts[list[i].label] = list[i];
    var special = { Heal: "Valor", Siege: "Arbalest" };
    var total = 0;
    for (i = 0; i < ammo.length; i++) total += ammo[i].count || 0;

    // the wire carries some shells under names players never see. Rename the
    // ones the official sheet resolves to a real shell, leave the rest alone.
    var renamed = {}, dk;
    for (dk in drift) {
      if (!Object.prototype.hasOwnProperty.call(drift, dk)) continue;
      if (dk.charAt(0) === "_" || special[dk]) continue;
      if (typeof drift[dk] === "string" && drift[dk].indexOf(" ") < 0) renamed[dk] = drift[dk];
    }
    var rows = [];
    for (i = 0; i < ammo.length; i++) {
      var name = ammo[i].label;
      var label = name, color = "rgba(120,132,170,.42)";
      if (name === "Ability") { label = "Energy (Ability on the wire)"; color = PUB; }
      else if (special[name]) { label = name + " (" + special[name] + "'s ability)"; color = MEAS; }
      else if (renamed[name]) { label = renamed[name] + " (" + name + " on the wire)"; }
      rows.push({ label: label, value: ammo[i].count || 0, color: color,
                  valueLabel: NUM(ammo[i].count) + "  " + pct1(100 * ammo[i].count / total) });
    }
    var body = T.svgBarChart(rows, { labelWidth: 176, rowHeight: 21, width: 660 });

    // the cross check: two independent routes to the same cast count
    var cross = "";
    var k, kn;
    for (k in special) {
      if (!Object.prototype.hasOwnProperty.call(special, k)) continue;
      var shots = 0;
      for (i = 0; i < ammo.length; i++) if (ammo[i].label === k) shots = ammo[i].count || 0;
      kn = casts[special[k]];
      if (!shots || !kn) continue;
      cross += "<li><b>" + E(special[k]) + "</b>: " + NUM(shots) + " " + E(k) +
        " shots over " + NUM(kn.count) + " matches is " + NUM(r1(shots / kn.count)) +
        " a match; the meter puts the median at " + NUM(kn.value) + ".</li>";
    }
    if (cross) {
      body += '<div class="en-cap" style="margin-top:14px"><b>Two routes to the same number.</b>' +
        '<ul style="margin:6px 0 0;padding-left:18px;line-height:1.7">' + cross + "</ul></div>";
    }
    if (e) {
      body += '<p class="en-hint" style="margin-top:10px">Only the Energy shell pays into the ' +
        "meter: <b style=\"color:#cbb0ff\">+" + NUM(e.energy_shell_flat_grant) +
        " per penetration</b>, published. Its wire tag reads " +
        "<span class=\"mono\">Gameplay.Ammunition.Type.Abilityresource</span>, and decoded " +
        "lists call it Ability.</p>";
    }
    var note = "Shot counts measured from ammunition decoded per shot: " + NUM(total) +
      " shots. Heal and Siege are abilities built as shots. Wire names are swapped for the " +
      "sheet's, original in brackets. One caution on the comparison above: it puts a mean " +
      "against a median, from different match sets.";
    return T.bigPanel("Two abilities that arrive as ammunition", body, note);
  }

  // ------------------------------------------------------------- preview

  function preview(T) {
    var curve = T.STATS && T.STATS.ability_resource_curve;
    var e = (T.OFFICIAL && T.OFFICIAL.energy) || null;
    if (!curve || !curve.avg || curve.avg.length < 4) return "";
    var vals = curve.avg, n = vals.length;
    var start = (e && e.start) || 33, cap = (e && e.max) || 100;
    var padT = 18, padB = 26, x0 = 6, x1 = 234;
    function X(i) { return x0 + (i / (n - 1)) * (x1 - x0); }
    function Y(v) { return 240 - padB - (v / cap) * (240 - padT - padB); }
    var d = "", area = "", i;
    for (i = 0; i < n; i++) {
      if (vals[i] == null) continue;
      d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(vals[i]).toFixed(1);
    }
    area = "M" + X(0).toFixed(1) + " " + Y(0).toFixed(1) + "L" + d.substring(1) +
      "L" + X(n - 1).toFixed(1) + " " + Y(0).toFixed(1) + "Z";
    return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice">' +
      '<rect x="0" y="0" width="240" height="240" fill="#0d1226"></rect>' +
      '<line x1="' + x0 + '" y1="' + Y(cap).toFixed(1) + '" x2="' + x1 + '" y2="' + Y(cap).toFixed(1) +
      '" stroke="' + PUB + '" stroke-width="1" opacity="0.55"></line>' +
      '<text x="' + x0 + '" y="' + (Y(cap) - 5).toFixed(1) + '" fill="#cbb0ff" font-size="11">cap ' +
      cap + "</text>" +
      '<path d="' + area + '" fill="' + MEAS + '" opacity="0.16"></path>' +
      '<path d="' + d + '" fill="none" stroke="' + MEAS + '" stroke-width="2.4" ' +
      'stroke-linejoin="round"></path>' +
      '<line x1="' + x0 + '" y1="' + Y(start).toFixed(1) + '" x2="' + x1 + '" y2="' + Y(start).toFixed(1) +
      '" stroke="' + PUB + '" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"></line>' +
      '<text x="' + x0 + '" y="' + (Y(start) + 13).toFixed(1) + '" fill="#cbb0ff" font-size="11">start ' +
      start + "</text>" +
      '<text x="' + x0 + '" y="234" fill="#e0a458" font-size="11">average energy, whole match</text>' +
      "</svg>";
  }

  // -------------------------------------------------------------- assembly

  function render(T) {
    TT = T;
    var parts = [
      leadHtml(T),
      calcPanel(T),
      costPanel(T),
      livePanel(T),
      atlasPanel(T),
      timePanel(T),
      ammoPanel(T)
    ].filter(function (p) { return !!p; });
    if (parts.length < 2) {
      return '<div class="panel avg-panel"><h2>Energy</h2><p class="small">' +
        "Neither the published rules nor the measured data have loaded.</p></div>";
    }
    return parts.join("");
  }

  function wire(T, root) {
    TT = T;
    try { wireCalc(T, root); } catch (e1) { /* one panel must not take the rest */ }
    try { wireCost(T, root); } catch (e2) { /* ditto */ }
    try { wireAtlas(T, root); } catch (e3) { /* ditto */ }
    try { wireTime(T, root); } catch (e4) { /* ditto */ }
    try { wireLive(T, root); } catch (e5) { /* ditto */ }
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "energy",
    title: "Energy",
    blurb: "One ability, one meter. What it costs, and who gets their money's worth.",
    accent: ACCENT,
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

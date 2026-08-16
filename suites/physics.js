/* Physics suite -- penetration, armour, modules and what a shell actually does.
 *
 * This is the one page on the site built almost entirely from published rules
 * rather than from measurements. A replay never records whether a shot went
 * through, so penetration cannot be measured here at all: it can only be
 * computed from the numbers tyrhq.com publishes and the rules it writes down.
 * Every panel says which side of that line it is on. The single measured panel
 * is marked in blue and kept at the bottom.
 */
(function () {
  "use strict";

  var ACCENT = "#c0392b";   // this suite
  var PUB = "#c9a227";      // published, the site's convention
  var MEAS = "#6ea8fe";     // measured from replays, the site's convention

  // The five reticle colours, named by the published shot_outcomes block.
  var OC = {
    green: "#5aa46a",
    grey: "#6d7488",
    yellow: "#d1a02c",
    blue: "#5b8ed6",
    magenta: "#a75bb0"
  };

  var CSS = [
    ".ph-lede{font-size:.88rem;line-height:1.65;color:var(--dim,#7f89b3);margin:0 0 18px;max-width:78ch}",
    ".ph-lede b{color:var(--fg,var(--text,#d6dcf5));font-weight:600}",
    ".ph-key{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin:0 0 18px;font-size:.78rem;color:var(--dim,#7f89b3)}",
    ".ph-key b{font-weight:600;color:var(--fg,var(--text,#d6dcf5))}",
    ".ph-dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}",
    ".ph-sub{font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim,#7f89b3);margin:0 0 8px}",
    ".ph-ctl{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;margin:0 0 16px}",
    ".ph-f{display:flex;flex-direction:column;gap:5px;min-width:0}",
    ".ph-f>span{font-size:.66rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim,#7f89b3)}",
    ".ph-f select{background:var(--panel2,#131a33);color:var(--fg,var(--text,#d6dcf5));",
    "border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:7px 10px;",
    "font:inherit;font-size:.86rem;min-width:158px}",
    ".ph-f select:focus{outline:none;border-color:" + ACCENT + "}",
    ".ph-f input[type=range]{width:190px;accent-color:" + ACCENT + ";background:transparent}",
    ".ph-rd{font-variant-numeric:tabular-nums;font-size:.86rem;color:var(--fg,var(--text,#d6dcf5));",
    "min-width:74px;display:inline-block}",
    ".ph-chk{display:flex;align-items:center;gap:7px;font-size:.8rem;color:var(--dim,#7f89b3);",
    "cursor:pointer;padding-bottom:7px}",
    ".ph-chk input{accent-color:" + ACCENT + "}",
    ".ph-chips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px}",
    ".ph-chip{cursor:pointer;font:inherit;font-size:.76rem;padding:4px 12px;border-radius:999px;",
    "background:transparent;color:var(--dim,#7f89b3);border:1px solid var(--line,var(--border,#232c52))}",
    ".ph-chip:hover{color:var(--fg,var(--text,#d6dcf5))}",
    ".ph-chip.on{color:#0d0f16;background:" + ACCENT + ";border-color:" + ACCENT + ";font-weight:600}",
    ".ph-verdict{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin:0 0 12px}",
    ".ph-vword{font-size:1.5rem;font-weight:800;letter-spacing:.02em;line-height:1.1}",
    ".ph-vtext{font-size:.85rem;color:var(--dim,#7f89b3);line-height:1.5}",
    ".ph-boxes{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;margin:14px 0 0}",
    ".ph-b{border:1px solid var(--line,var(--border,#232c52));border-radius:8px;padding:9px 12px;",
    "background:var(--panel2,#131a33)}",
    ".ph-b .ph-bl{font-size:.64rem;letter-spacing:.06em;text-transform:uppercase;color:var(--dim,#7f89b3);margin-bottom:4px}",
    ".ph-b .ph-bv{font-size:1.16rem;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums}",
    ".ph-b .ph-bd{font-size:.68rem;color:var(--dim,#7f89b3);margin-top:3px;line-height:1.4}",
    ".ph-flags{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}",
    ".ph-flag{font-size:.75rem;padding:4px 11px;border-radius:6px;line-height:1.45;",
    "border:1px solid rgba(192,57,43,.42);background:rgba(192,57,43,.10);color:var(--fg,var(--text,#d6dcf5))}",
    ".ph-flag.ph-warn{border-color:rgba(209,160,44,.5);background:rgba(209,160,44,.11)}",
    ".ph-scroll{overflow-x:auto;border-radius:8px}",
    // chart-svg is width:100%, which would shrink a 17 column grid into
    // unreadable four pixel type on a phone. Floor it and let the box scroll.
    ".ph-scroll>svg{min-width:690px}",
    ".ph-tbl{width:100%;border-collapse:collapse;font-size:.82rem;min-width:840px}",
    ".ph-tbl th,.ph-tbl td{padding:6px 9px;border-bottom:1px solid var(--line,var(--border,#232c52));",
    "text-align:right;white-space:nowrap}",
    ".ph-tbl th:first-child,.ph-tbl td:first-child,.ph-tbl .ph-l{text-align:left}",
    ".ph-tbl thead th{color:var(--dim,#7f89b3);font-weight:600;font-size:.7rem;letter-spacing:.03em}",
    ".ph-tbl tbody tr:hover{background:rgba(255,255,255,.03)}",
    ".ph-tbl tr.ph-trap td:first-child{border-left:3px solid " + ACCENT + ";padding-left:7px}",
    ".ph-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:22px;align-items:start}",
    ".ph-col{min-width:0}",
    ".ph-hot{cursor:pointer}",
    ".ph-hot:hover .ph-hs{stroke:" + ACCENT + ";stroke-width:2}",
    ".ph-note{font-size:.78rem;line-height:1.6;color:var(--dim,#7f89b3);margin:12px 0 0}",
    ".ph-note b{color:var(--fg,var(--text,#d6dcf5));font-weight:600}",
    ".ph-legend{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0 0;font-size:.76rem;color:var(--dim,#7f89b3)}"
  ].join("");

  /* --------------------------------------------------------------- state */

  var T = null;

  var sim = { atk: null, shell: "Standard", tgt: null, mm: 60, ang: 30,
              band: "straddle", crit: false };
  var arc = { mm: 60, pen: 80 };
  var mtx = { shell: "Standard" };
  var shl = { tank: null };
  var mod = { pick: "Treads" };
  var stk = { shell: "Standard", crit: false };
  var mix = { abilities: true };

  function esc(s) { return T.esc(s); }
  function num(n) { return T.fmtNum(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function color(name) { return T.tankColor(name) || "#5b6472"; }
  function cosd(a) { return Math.cos(a * Math.PI / 180); }
  function sind(a) { return Math.sin(a * Math.PI / 180); }
  function tand(a) { return Math.tan(a * Math.PI / 180); }

  /* ---------------------------------------------------------------- data */

  function official() {
    var o = T && T.OFFICIAL;
    if (!o || !o.tanks || !o.tanks.length) return null;
    return o;
  }
  function tanks() {
    var o = official();
    if (!o) return [];
    return o.tanks.filter(function (t) { return t && t.tank && t.pen && t.hp; });
  }
  function tankOne(name) {
    var o = official();
    if (!o) return null;
    if (o.byTank && o.byTank[name]) return o.byTank[name];
    var l = tanks();
    for (var i = 0; i < l.length; i++) { if (l[i].tank === name) return l[i]; }
    return null;
  }
  function shells() {
    var o = official();
    if (!o || !o.shells) return [];
    return o.shells.filter(function (s) { return s && s.shell; });
  }
  function shellOne(name) {
    var l = shells();
    for (var i = 0; i < l.length; i++) { if (l[i].shell === name) return l[i]; }
    return l.length ? l[0] : null;
  }
  function penTiers() {
    var o = official();
    var raw = (o && o.penetration_by_tank_mm) || {};
    var out = [];
    for (var k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) {
        out.push({ mm: Number(k), tanks: raw[k] || [] });
      }
    }
    out.sort(function (a, b) { return a.mm - b.mm; });
    return out;
  }
  function moduleList() {
    var o = official();
    var m = (o && o.modules) || {};
    var order = ["Treads", "Engine", "Gun", "Turret", "Ability", "Fuel tank"];
    var out = [];
    order.forEach(function (k) {
      if (m[k]) out.push({ name: k, effect: m[k].effect, repair: m[k].repair_s });
    });
    return out;
  }
  function immuneSec() {
    var o = official();
    var m = (o && o.modules) || {};
    return m.immune_after_shortest_s == null ? 10 : m.immune_after_shortest_s;
  }

  /* ------------------------------------------------------------- physics */

  // Penetration for one tank firing one shell. High Explosive is the trap:
  // it OVERRIDES penetration to a fixed 45 mm rather than multiplying it, so
  // running it through the multiplier grid gives the wrong answer.
  function penOf(tank, shell) {
    if (!tank) return 0;
    if (shell && shell.extra && shell.extra.penetration_fixed_mm != null) {
      return shell.extra.penetration_fixed_mm;
    }
    var m = shell && shell.penetration_mult != null ? shell.penetration_mult : 1;
    return tank.pen * m;
  }
  function penFixed(shell) {
    return !!(shell && shell.extra && shell.extra.penetration_fixed_mm != null);
  }
  function dmgOf(tank, shell) {
    if (!tank) return 0;
    var m = shell && shell.damage_mult != null ? shell.damage_mult : 1;
    return tank.dmg * m;
  }

  // The published rule set, applied. Angle is measured from the plate normal,
  // so 0 degrees is a square hit and the line of sight through the plate is
  // thickness / cos(angle).
  function shot(pen, nominal, angleDeg, band) {
    var c = Math.max(cosd(angleDeg), 1e-6);
    var eff = nominal / c;
    // "penetration more than 4x the effective armour ignores angle entirely".
    // Read against the plate's own thickness, which is the only reading under
    // which the check can ever change an outcome. See the panel note.
    var over = nominal > 0 && pen > 4 * nominal;
    var need = over ? nominal : eff;
    var res = { eff: eff, need: need, over: over, nominal: nominal, pen: pen };
    res.lo = need * 0.9;
    res.hi = band === "straddle" ? need * 1.1 : need;
    if (need <= 0) { res.kind = "green"; res.lo = 0; res.hi = 0; return res; }
    if (pen >= res.hi) res.kind = "green";
    else if (pen >= res.lo) res.kind = "yellow";
    else res.kind = "grey";
    return res;
  }

  var VERDICT = {
    green: ["THROUGH", "Clears the 10% band. Full damage."],
    yellow: ["COIN FLIP", "Inside the 10% band. Published 50% chance."],
    grey: ["BLOCKED", "Short of the plate. No damage."]
  };

  /* -------------------------------------------------------------- markup */

  function fSel(role, opts, cur, label) {
    var o = opts.map(function (v) {
      var val = typeof v === "string" ? v : v.v;
      var txt = typeof v === "string" ? v : v.t;
      return '<option value="' + esc(val) + '"' + (val === cur ? " selected" : "") +
        ">" + esc(txt) + "</option>";
    }).join("");
    return '<label class="ph-f"><span>' + esc(label) + "</span>" +
      '<select data-role="' + role + '">' + o + "</select></label>";
  }
  function fRange(role, label, min, max, step, cur, readout) {
    return '<label class="ph-f"><span>' + esc(label) +
      ' <b class="ph-rd" data-role="' + role + '-rd">' + readout + "</b></span>" +
      '<input type="range" data-role="' + role + '" min="' + min + '" max="' + max +
      '" step="' + step + '" value="' + cur + '"></label>';
  }
  function fChk(role, label, on) {
    return '<label class="ph-chk"><input type="checkbox" data-role="' + role + '"' +
      (on ? " checked" : "") + ">" + esc(label) + "</label>";
  }
  function box(label, value, detail) {
    return '<div class="ph-b"><div class="ph-bl">' + esc(label) + "</div>" +
      '<div class="ph-bv">' + value + "</div>" +
      (detail ? '<div class="ph-bd">' + detail + "</div>" : "") + "</div>";
  }
  function tankOpts() {
    return tanks().map(function (t) {
      return { v: t.tank, t: t.tank + "  (" + t.pen + " mm, " + t.dmg + " dmg)" };
    });
  }
  function targetOpts() {
    return tanks().map(function (t) {
      return { v: t.tank, t: t.tank + "  (" + t.hp + " HP)" };
    });
  }
  function shellOpts() {
    return shells().map(function (s) { return { v: s.shell, t: s.shell }; });
  }

  /* ------------------------------------------------- panel 1: simulator */

  function panelSim() {
    var ctl = '<div class="ph-ctl">' +
      fSel("sim-atk", tankOpts(), sim.atk, "Firing") +
      fSel("sim-shell", shellOpts(), sim.shell, "Shell") +
      fSel("sim-tgt", targetOpts(), sim.tgt, "Target") +
      fRange("sim-mm", "Plate", 5, 200, 5, sim.mm, sim.mm + " mm") +
      fRange("sim-ang", "Impact angle", 0, 85, 1, sim.ang, sim.ang + " deg") +
      fChk("sim-crit", "critical hit", sim.crit) +
      "</div>" +
      '<div class="ph-chips" data-role="sim-band">' +
      '<button class="ph-chip' + (sim.band === "straddle" ? " on" : "") +
        '" data-band="straddle">band straddles the threshold</button>' +
      '<button class="ph-chip' + (sim.band === "below" ? " on" : "") +
        '" data-band="below">band sits below it</button></div>';

    return T.bigPanel("The shot",
      ctl + '<div data-role="sim-out">' + simBody() + "</div>",
      "Published rules plus plate geometry. Nothing measured. <b>No armour " +
      "thickness is published for any tank</b>. Set the plate yourself. The chips " +
      "read the 10% band two ways, and the rule is silent on which is right.");
  }

  function simBody() {
    var atk = tankOne(sim.atk), tgt = tankOne(sim.tgt), sh = shellOne(sim.shell);
    if (!atk || !tgt || !sh) return '<p class="small">Pick a tank, a shell and a target.</p>';

    var pen = penOf(atk, sh);
    var o = shot(pen, sim.mm, sim.ang, sim.band);
    var dmg = dmgOf(atk, sh);
    var applied = sim.crit ? dmg * 1.5 : dmg;
    var v = VERDICT[o.kind];

    var head = '<div class="ph-verdict">' +
      '<span class="ph-vword" style="color:' + OC[o.kind] + '">' + v[0] + "</span>" +
      '<span class="ph-vtext">' + esc(v[1]) + "</span></div>";

    var boxes = '<div class="ph-boxes">' +
      box("Penetration", num(r1(pen)) + " mm",
          penFixed(sh) ? "fixed by the shell, the tank's " + num(atk.pen) + " mm ignored"
                       : esc(sim.shell) + " on " + num(atk.pen) + " mm base") +
      box("Plate asks for", num(Math.round(o.need)) + " mm",
          o.over ? "angle ignored by overmatch"
                 : num(sim.mm) + " mm at " + sim.ang + " deg") +
      box("Margin", (o.pen >= o.need ? "+" : "") +
          num(r1(o.need > 0 ? (pen / o.need - 1) * 100 : 0)) + "%",
          "against what the plate asks for") +
      box("Damage on a pass", o.kind === "grey" ? "0" : num(r1(applied)),
          o.kind === "yellow" ? "half the time, otherwise nothing"
            : (sim.crit ? "base " + num(atk.dmg) + ", shell x" +
               num(sh.damage_mult) + ", critical x1.5"
              : "base " + num(atk.dmg) + ", shell x" + num(sh.damage_mult))) +
      box("Health left", o.kind === "grey" ? num(tgt.hp)
            : num(Math.max(0, r1(tgt.hp - applied))),
          esc(sim.tgt) + " starts on " + num(tgt.hp)) +
      box("Shells to kill",
          o.kind === "grey" ? "never"
            : (applied > 0
                ? num(Math.ceil(tgt.hp / applied) * (o.kind === "yellow" ? 2 : 1))
                : "-"),
          o.kind === "grey" ? "this shot does not get in"
            : (o.kind === "yellow"
                ? num(Math.ceil(tgt.hp / applied)) + " must land, half will not"
                : "if every shot lands like this")) +
      "</div>";

    return head + simPlate(o, sh) + simAxis(o) + boxes + simFlags(atk, tgt, sh, o) +
      simExtras(sh) + simColours();
  }

  // The plate, the trajectory, the normal and the angle, drawn.
  function simPlate(o, sh) {
    var W = 760, H = 300, cx = 396, cy = 150, DT = 30;
    var a = sim.ang, c = Math.max(cosd(a), 1e-6);
    var half = DT / (2 * c);
    var ex = cx - half, xx = cx + half;
    var HH = Math.max(112, (DT / 2) * Math.abs(tand(a)) + 74);
    var col = OC[o.kind];

    // plate body, rotated about its centre
    var rungs = "";
    for (var k = -HH + 16; k < HH; k += 20) {
      rungs += '<line x1="' + (cx - DT / 2) + '" y1="' + (cy + k) + '" x2="' + (cx + DT / 2) +
        '" y2="' + (cy + k) + '" stroke="rgba(255,255,255,.10)" stroke-width="1"/>';
    }
    var plate = '<g transform="rotate(' + a + " " + cx + " " + cy + ')">' +
      '<rect x="' + (cx - DT / 2) + '" y="' + (cy - HH) + '" width="' + DT + '" height="' +
        (2 * HH) + '" fill="#2b3350" stroke="#59648f" stroke-width="1.5"/>' +
      '<rect x="' + (cx - DT / 2) + '" y="' + (cy - HH) + '" width="4" height="' + (2 * HH) +
        '" fill="rgba(255,255,255,.13)"/>' + rungs +
      '<text x="' + (cx + DT / 2 + 9) + '" y="' + (cy - HH + 22) +
        '" fill="#8e97bd" font-size="11" font-family="inherit">' +
        num(sim.mm) + " mm plate</text>" + "</g>";

    // incoming shell
    var inArrow =
      '<line x1="40" y1="' + cy + '" x2="' + (ex - 4) + '" y2="' + cy +
        '" stroke="#9aa3c8" stroke-width="2" stroke-dasharray="6 5"/>' +
      '<path d="M' + (ex - 30) + " " + (cy - 7) + "L" + (ex - 4) + " " + cy +
        "L" + (ex - 30) + " " + (cy + 7) + 'Z" fill="#c8cee8"/>' +
      '<text x="44" y="' + (cy - 14) + '" fill="#8e97bd" font-size="11" font-family="inherit">' +
        esc(sim.shell) + " from " + esc(sim.atk) + ", " + num(r1(o.pen)) + " mm</text>";

    // line of sight through the plate
    var los =
      '<line x1="' + ex + '" y1="' + cy + '" x2="' + xx + '" y2="' + cy +
        '" stroke="' + col + '" stroke-width="6" opacity="0.92"/>' +
      '<line x1="' + ex + '" y1="' + (cy - 9) + '" x2="' + ex + '" y2="' + (cy + 9) +
        '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<line x1="' + xx + '" y1="' + (cy - 9) + '" x2="' + xx + '" y2="' + (cy + 9) +
        '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" fill="' + col +
        '" font-size="12.5" font-family="inherit" font-weight="600">' +
        num(Math.round(o.eff)) + " mm of steel in the way</text>";

    // the normal, and the angle between it and the trajectory
    var nx = cosd(a), ny = sind(a), R = 52;
    var normal =
      '<line x1="' + (ex - nx * 96).toFixed(1) + '" y1="' + (cy - ny * 96).toFixed(1) +
        '" x2="' + (ex + nx * 96).toFixed(1) + '" y2="' + (cy + ny * 96).toFixed(1) +
        '" stroke="#6f7aa6" stroke-width="1.2" stroke-dasharray="4 4"/>' +
      '<text x="' + (ex - nx * 106).toFixed(1) + '" y="' + (cy - ny * 106 - 4).toFixed(1) +
        '" text-anchor="middle" fill="#6f7aa6" font-size="10" font-family="inherit">normal</text>';
    var arcPath = a > 0.4
      ? '<path d="M' + (ex + R) + " " + cy + "A" + R + " " + R + " 0 0 1 " +
        (ex + R * nx).toFixed(1) + " " + (cy + R * ny).toFixed(1) +
        '" fill="none" stroke="' + PUB + '" stroke-width="1.4"/>' +
        '<text x="' + (ex + (R + 17) * cosd(a / 2)).toFixed(1) + '" y="' +
        (cy + (R + 17) * sind(a / 2) + 4).toFixed(1) + '" fill="' + PUB +
        '" font-size="11.5" font-family="inherit">' + a + " deg</text>"
      : '<text x="' + (ex + R) + '" y="' + (cy + 20) + '" fill="' + PUB +
        '" font-size="11.5" font-family="inherit">square on</text>';

    // what happens after
    var after;
    if (o.kind === "green") {
      after = '<line x1="' + xx + '" y1="' + cy + '" x2="' + (W - 118) + '" y2="' + cy +
        '" stroke="' + OC.green + '" stroke-width="2.5"/>' +
        '<circle cx="' + (W - 108) + '" cy="' + cy + '" r="16" fill="' + OC.green + '" opacity="0.22"/>' +
        '<circle cx="' + (W - 108) + '" cy="' + cy + '" r="7" fill="' + OC.green + '"/>' +
        '<text x="' + (W - 108) + '" y="' + (cy + 40) + '" text-anchor="middle" fill="' +
        OC.green + '" font-size="12" font-family="inherit" font-weight="600">through</text>';
    } else if (o.kind === "yellow") {
      after = '<line x1="' + xx + '" y1="' + cy + '" x2="' + (W - 118) + '" y2="' + cy +
        '" stroke="' + OC.yellow + '" stroke-width="2.5" stroke-dasharray="7 7" opacity="0.85"/>' +
        '<circle cx="' + (W - 108) + '" cy="' + cy + '" r="16" fill="' + OC.yellow + '" opacity="0.18"/>' +
        '<text x="' + (W - 108) + '" y="' + (cy + 6) + '" text-anchor="middle" fill="' +
        OC.yellow + '" font-size="15" font-family="inherit" font-weight="700">50%</text>' +
        '<text x="' + (W - 108) + '" y="' + (cy + 40) + '" text-anchor="middle" fill="' +
        OC.yellow + '" font-size="12" font-family="inherit" font-weight="600">a coin flip</text>';
    } else {
      after = '<path d="M' + (xx - 2) + " " + (cy - 13) + "L" + (xx + 16) + " " + (cy - 26) +
        "M" + (xx - 2) + " " + (cy + 13) + "L" + (xx + 16) + " " + (cy + 26) +
        '" stroke="' + OC.grey + '" stroke-width="2.5" fill="none"/>' +
        '<text x="' + (W - 118) + '" y="' + (cy + 6) + '" text-anchor="middle" fill="' +
        OC.grey + '" font-size="12" font-family="inherit" font-weight="600">stopped</text>';
    }

    var overTag = o.over
      ? '<rect x="' + (cx - 74) + '" y="26" width="148" height="26" rx="6" fill="rgba(192,57,43,.18)" ' +
        'stroke="' + ACCENT + '" stroke-width="1"/>' +
        '<text x="' + cx + '" y="43" text-anchor="middle" fill="' + ACCENT +
        '" font-size="12" font-family="inherit" font-weight="700">OVERMATCH, angle ignored</text>'
      : "";

    return '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' +
      plate + inArrow + los + normal + arcPath + after + overTag + "</svg>";
  }

  // Where this shot's penetration sits on the grey / yellow / green scale.
  function simAxis(o) {
    var W = 760, H = 124, x0 = 54, x1 = 716, yb = 56, hb = 30;
    var hi = Math.max(o.pen, o.need, o.nominal, 10) * 1.3;
    function X(v) { return x0 + Math.max(0, Math.min(v, hi)) / hi * (x1 - x0); }
    var gLo = X(Math.min(o.lo, hi)), gHi = X(Math.min(o.hi, hi));

    var bands =
      '<rect x="' + x0 + '" y="' + yb + '" width="' + (gLo - x0) + '" height="' + hb +
        '" fill="' + OC.grey + '" opacity="0.34" rx="3"/>' +
      '<rect x="' + gLo + '" y="' + yb + '" width="' + Math.max(0, gHi - gLo) + '" height="' + hb +
        '" fill="' + OC.yellow + '" opacity="0.42"/>' +
      '<rect x="' + gHi + '" y="' + yb + '" width="' + Math.max(0, x1 - gHi) + '" height="' + hb +
        '" fill="' + OC.green + '" opacity="0.34" rx="3"/>';

    var labels =
      '<text x="' + ((x0 + gLo) / 2) + '" y="' + (yb + 20) + '" text-anchor="middle" fill="#cdd4ee" ' +
        'font-size="11" font-family="inherit">blocked</text>' +
      (gHi - gLo > 54
        ? '<text x="' + ((gLo + gHi) / 2) + '" y="' + (yb + 20) + '" text-anchor="middle" ' +
          'fill="#1a1c26" font-size="11" font-family="inherit" font-weight="700">50%</text>'
        : "") +
      (x1 - gHi > 60
        ? '<text x="' + ((gHi + x1) / 2) + '" y="' + (yb + 20) + '" text-anchor="middle" ' +
          'fill="#cdd4ee" font-size="11" font-family="inherit">through</text>'
        : "");

    function tick(v, txt, col, up) {
      var x = X(v);
      return '<line x1="' + x + '" y1="' + (up ? yb - 12 : yb + hb) + '" x2="' + x +
        '" y2="' + (up ? yb : yb + hb + 12) + '" stroke="' + col + '" stroke-width="1.5"/>' +
        '<text x="' + x + '" y="' + (up ? yb - 18 : yb + hb + 26) + '" text-anchor="middle" fill="' +
        col + '" font-size="11" font-family="inherit">' + esc(txt) + "</text>";
    }

    var marker = '<path d="M' + (X(o.pen) - 9) + " " + (yb - 10) + "L" + (X(o.pen) + 9) + " " +
      (yb - 10) + "L" + X(o.pen) + " " + (yb + 2) + 'Z" fill="' + OC[o.kind] + '"/>' +
      '<text x="' + X(o.pen) + '" y="' + (yb - 16) + '" text-anchor="middle" fill="' + OC[o.kind] +
      '" font-size="12" font-family="inherit" font-weight="700">your ' + num(r1(o.pen)) + " mm</text>";

    return '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + bands + labels +
      tick(o.nominal, num(o.nominal) + " mm plate", "#8e97bd", false) +
      (Math.abs(o.need - o.nominal) > hi * 0.02
        ? tick(o.need, num(Math.round(o.need)) + " mm asked for", PUB, false) : "") +
      marker +
      '<text x="' + x0 + '" y="' + (H - 6) + '" fill="#6f7aa6" font-size="10" ' +
        'font-family="inherit">0 mm</text>' +
      '<text x="' + x1 + '" y="' + (H - 6) + '" text-anchor="end" fill="#6f7aa6" font-size="10" ' +
        'font-family="inherit">' + num(Math.round(hi)) + " mm</text>" +
      "</svg>";
  }

  function simFlags(atk, tgt, sh, o) {
    var out = [];
    // the overmatch arithmetic, spelled out either way
    out.push('<span class="ph-flag">Overmatch: 4x ' + num(sim.mm) + " mm is " +
      num(sim.mm * 4) + " mm. Your " + num(r1(o.pen)) + " mm is " +
      (o.over ? "over it, so angle stops counting." : "under it, so angle counts.") +
      "</span>");
    // the shot back, always on a Standard shell so the comparison is of cannons
    var back = shot(tgt.pen, sim.mm, sim.ang, sim.band);
    out.push('<span class="ph-flag">Firing back, ' + esc(sim.tgt) +
      "'s " + num(tgt.pen) + " mm on Standard: <b style=\"color:" +
      OC[back.kind] + '">' + esc(VERDICT[back.kind][0].toLowerCase()) + "</b>.</span>");
    if (penFixed(sh)) {
      out.push('<span class="ph-flag ph-warn">' + esc(sh.shell) +
        " does not multiply penetration, it replaces it with " +
        num(sh.extra.penetration_fixed_mm) + " mm flat for every tank, " +
        "while still dealing x" + num(sh.damage_mult) + " damage.</span>");
    }
    return '<div class="ph-flags">' + out.join("") + "</div>";
  }

  function simExtras(sh) {
    var e = sh.extra || {};
    var bits = [];
    if (e.energy_on_penetration != null) {
      bits.push("A penetration grants " + num(e.energy_on_penetration) + " energy.");
    }
    if (e.heal_on_penetration != null) {
      bits.push("A penetration heals " + num(e.heal_on_penetration) +
        ", tripled to " + num(e.heal_on_penetration * (e.low_health_multiplier || 1)) +
        " below half health.");
    }
    if (e.damage_ramp_distance_m != null) {
      bits.push("x" + num(sh.damage_mult) + " damage only past " +
        num(e.damage_ramp_distance_m) + " m; fixed " + num(e.velocity_ms) + " m/s.");
    }
    if (sh.detection_mult === 0) {
      bits.push("Detection multiplier is exactly zero: firing does not raise visibility.");
    }
    if (e.top_speed_mult != null) {
      bits.push("While loaded, top speed and reverse are x" + num(e.top_speed_mult) + ".");
    }
    if (!bits.length) return "";
    return '<p class="ph-note"><b>' + esc(sh.shell) + "</b> also: " + esc(bits.join(" ")) + "</p>";
  }

  function simColours() {
    return '<p class="ph-note">Two published outcomes are missing here. Both are about ' +
      'where the shell lands, not whether it gets in: <b style="color:' + OC.blue +
      '">blue</b> is a module hit, <b style="color:' + OC.magenta +
      '">magenta</b> disables treads and deals no damage.</p>';
  }

  /* --------------------------------------------- panel 2: angle is armour */

  function panelAngle() {
    var tiers = penTiers();
    var lowest = tiers.length ? tiers[0] : null;
    var highest = tiers.length ? tiers[tiers.length - 1] : null;
    var span = lowest && highest
      ? lowest.mm + " to " + highest.mm + " mm"
      : "";
    var chips = tiers.map(function (t) {
      return '<button class="ph-chip' + (arc.pen === t.mm ? " on" : "") + '" data-pen="' +
        t.mm + '">' + t.mm + " mm</button>";
    }).join("");
    var ctl = '<div class="ph-ctl">' +
      fRange("arc-mm", "Plate", 5, 200, 5, arc.mm, arc.mm + " mm") + "</div>" +
      '<div class="ph-sub">Highlight one cannon calibre</div>' +
      '<div class="ph-chips" data-role="arc-chips">' + chips + "</div>";
    return T.bigPanel("Angle is armour",
      ctl + '<div data-role="arc-out">' + arcBody() + "</div>",
      "Thickness over cos(angle). Geometry, not measurement. Dashed lines are the " +
      num(tiers.length) + " published calibres, " + esc(span) + ". The shaded " +
      "strip is the published 10% band for the highlighted one. No tank's armour " +
      "is published anywhere.");
  }

  function arcBody() {
    var tiers = penTiers();
    if (!tiers.length) return "";
    var W = 760, H = 380, x0 = 62, x1 = 704, y0 = 26, y1 = 318;
    var aMax = 85;
    var t = arc.mm;
    var yMax = Math.max(115, Math.min(430, t * 2.7));
    function X(a) { return x0 + (a / aMax) * (x1 - x0); }
    function Y(v) { return y1 - Math.max(0, Math.min(v, yMax)) / yMax * (y1 - y0); }

    var grid = "";
    var stepY = yMax > 260 ? 100 : (yMax > 140 ? 50 : 25);
    for (var gy = 0; gy <= yMax; gy += stepY) {
      grid += '<line x1="' + x0 + '" y1="' + Y(gy) + '" x2="' + x1 + '" y2="' + Y(gy) +
        '" stroke="rgba(255,255,255,.07)" stroke-width="1"/>' +
        '<text x="' + (x0 - 8) + '" y="' + (Y(gy) + 4) + '" text-anchor="end" fill="#6f7aa6" ' +
        'font-size="10" font-family="inherit">' + gy + "</text>";
    }
    for (var ga = 0; ga <= aMax; ga += 15) {
      grid += '<line x1="' + X(ga) + '" y1="' + y0 + '" x2="' + X(ga) + '" y2="' + y1 +
        '" stroke="rgba(255,255,255,.05)" stroke-width="1"/>' +
        '<text x="' + X(ga) + '" y="' + (y1 + 16) + '" text-anchor="middle" fill="#6f7aa6" ' +
        'font-size="10" font-family="inherit">' + ga + "</text>";
    }

    // the coin flip strip for the highlighted calibre
    var strip = "";
    var hp = arc.pen;
    if (hp > 0) {
      var cLo = Math.min(1, 1.1 * t / hp), cHi = Math.min(1, 0.9 * t / hp);
      var aLo = Math.acos(cLo) * 180 / Math.PI, aHi = Math.acos(cHi) * 180 / Math.PI;
      if (aHi > 0.01 && aLo < aMax) {
        var sa = Math.max(0, Math.min(aMax, aLo)), sb = Math.max(0, Math.min(aMax, aHi));
        if (sb > sa) {
          strip = '<rect x="' + X(sa) + '" y="' + y0 + '" width="' + (X(sb) - X(sa)) +
            '" height="' + (y1 - y0) + '" fill="' + OC.yellow + '" opacity="0.16"/>' +
            '<text x="' + ((X(sa) + X(sb)) / 2) + '" y="' + (y0 + 14) + '" text-anchor="middle" ' +
            'fill="' + OC.yellow + '" font-size="10.5" font-family="inherit">coin flip</text>';
        }
      }
    }

    // the curve
    var pts = [];
    for (var a = 0; a <= aMax; a += 0.5) {
      var v = t / Math.max(cosd(a), 1e-6);
      if (v > yMax * 1.02) break;
      pts.push(X(a).toFixed(1) + "," + Y(v).toFixed(1));
    }
    var curve = pts.length > 1
      ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + ACCENT +
        '" stroke-width="2.6"/>' : "";

    // the six calibres
    var lines = tiers.map(function (tr) {
      var on = tr.mm === arc.pen;
      if (tr.mm > yMax) return "";
      var y = Y(tr.mm);
      var s = '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y +
        '" stroke="' + (on ? PUB : "#5a6488") + '" stroke-width="' + (on ? 1.8 : 1) +
        '" stroke-dasharray="6 5" opacity="' + (on ? 1 : 0.7) + '"/>' +
        '<text x="' + (x1 - 4) + '" y="' + (y - 5) + '" text-anchor="end" fill="' +
        (on ? PUB : "#7b85ab") + '" font-size="10.5" font-family="inherit">' + tr.mm +
        " mm: " + esc(tr.tanks.join(", ")) + "</text>";
      if (tr.mm > t) {
        var ac = Math.acos(Math.min(1, t / tr.mm)) * 180 / Math.PI;
        if (ac <= aMax) {
          s += '<circle cx="' + X(ac) + '" cy="' + y + '" r="' + (on ? 5 : 3.4) + '" fill="' +
            (on ? PUB : "#8892b8") + '"/>' +
            '<line x1="' + X(ac) + '" y1="' + y + '" x2="' + X(ac) + '" y2="' + y1 +
            '" stroke="' + (on ? PUB : "#5a6488") + '" stroke-width="1" opacity="0.45"/>' +
            (on ? '<text x="' + X(ac) + '" y="' + (y1 - 6) + '" text-anchor="middle" fill="' +
              PUB + '" font-size="11" font-family="inherit" font-weight="700">' +
              Math.round(ac) + " deg</text>" : "");
        }
      }
      return s;
    }).join("");

    var immune = tiers.filter(function (tr) { return tr.mm <= t; });
    var caption = immune.length
      ? '<p class="ph-note">At ' + num(t) + " mm the plate already stops <b>" +
        esc(immune.map(function (x) { return x.mm + " mm"; }).join(", ")) +
        "</b> square on, before any angle.</p>"
      : '<p class="ph-note">Every published calibre gets through ' + num(t) +
        " mm square on. Angle changes that.</p>";

    return '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' + grid + strip + lines + curve +
      '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 +
        '" stroke="#3d466e" stroke-width="1"/>' +
      '<text x="' + ((x0 + x1) / 2) + '" y="' + (H - 22) + '" text-anchor="middle" fill="#6f7aa6" ' +
        'font-size="11" font-family="inherit">impact angle, degrees from the plate normal</text>' +
      '<text x="14" y="' + ((y0 + y1) / 2) + '" fill="#6f7aa6" font-size="11" ' +
        'font-family="inherit" transform="rotate(-90 14 ' + ((y0 + y1) / 2) +
        ')" text-anchor="middle">millimetres in the way</text>' +
      "</svg>" + caption;
  }

  /* ------------------------------------------- panel 3: who can hurt who */

  function panelMatrix() {
    var ctl = '<div class="ph-ctl">' +
      fSel("mtx-shell", shellOpts(), mtx.shell, "Shell") + "</div>";
    return T.bigPanel("The thickest plate each tank still beats",
      ctl + '<div data-role="mtx-out">' + mtxBody() + "</div>",
      "Published penetration times cos(angle): the plate where that tank stops " +
      "getting through. Not measured, and not a claim about real armour. High " +
      "Explosive flattens every row to one number. It replaces penetration with a " +
      "flat figure instead of multiplying it.");
  }

  function mtxBody() {
    var list = tanks().slice(0).sort(function (a, b) {
      return b.pen - a.pen || (a.tank < b.tank ? -1 : 1);
    });
    if (!list.length) return "";
    var sh = shellOne(mtx.shell);
    var angs = [0, 10, 20, 30, 40, 50, 60, 70, 80];
    var lw = 104, cw = 62, rh = 25, head = 34;
    var W = lw + angs.length * cw, H = head + list.length * rh + 8;

    var vals = list.map(function (t) { return penOf(t, sh); });
    var maxV = Math.max.apply(null, vals.concat([1]));

    var hdr = angs.map(function (a, j) {
      return '<text x="' + (lw + j * cw + cw / 2) + '" y="' + (head - 12) + '">' +
        a + " deg</text>";
    }).join("");

    // Shared text attributes live on the wrapping groups rather than on each
    // of the 150-odd cells, which is most of this panel's markup.
    var rects = [], nums = [], names = [];
    list.forEach(function (t, i) {
      var y = head + i * rh;
      var pen = penOf(t, sh);
      angs.forEach(function (a, j) {
        var v = pen * cosd(a);
        var alpha = 0.08 + 0.62 * Math.min(1, v / maxV);
        rects.push('<rect x="' + (lw + j * cw) + '" y="' + y + '" width="' + (cw - 2) +
          '" height="' + (rh - 2) + '" rx="3" fill="rgba(192,57,43,' + alpha.toFixed(2) + ')">' +
          "<title>" + esc(t.tank + ", " + mtx.shell + ", " + a + " deg: clean under " +
            Math.round(v * 0.9) + ", coin flip to " + Math.round(v * 1.1) +
            ", blocked above") + "</title></rect>");
        nums.push('<text x="' + (lw + j * cw + cw / 2 - 1) + '" y="' + (y + rh / 2 + 3) + '">' +
          Math.round(v) + "</text>");
      });
      rects.push('<rect x="' + (lw - 6) + '" y="' + (y + 3) + '" width="3" height="' + (rh - 8) +
        '" fill="' + color(t.tank) + '"/>');
      names.push('<text x="' + (lw - 12) + '" y="' + (y + rh / 2 + 3) + '">' +
        esc(t.tank) + "</text>");
    });
    var body = rects.join("") +
      '<g fill="#dfe4f6" font-size="11" font-family="inherit" text-anchor="middle">' +
      nums.join("") + "</g>" +
      '<g fill="#c3cae6" font-size="11" font-family="inherit" text-anchor="end">' +
      names.join("") + "</g>";

    var flat = penFixed(sh);
    var cap = flat
      ? '<p class="ph-note"><b>' + esc(mtx.shell) + "</b> pins penetration at a fixed " +
        num(sh.extra.penetration_fixed_mm) + " mm. Every row comes out identical. " +
        "It replaces penetration; it does not multiply it.</p>"
      : '<p class="ph-note">Spread across the roster at a square hit: ' +
        num(Math.round(Math.min.apply(null, vals))) + " mm to " +
        num(Math.round(maxV)) + " mm. At 60 degrees every one of those halves.</p>";

    return '<div class="ph-scroll"><svg class="chart-svg" width="' + W + '" viewBox="0 0 ' +
      W + " " + H + '">' +
      '<g fill="#7f89b3" font-size="10.5" font-family="inherit" text-anchor="middle">' +
      hdr + "</g>" + body + "</svg></div>" + cap;
  }

  /* ------------------------------------------ panel 4: shells on one tank */

  function panelShells() {
    var ctl = '<div class="ph-ctl">' +
      fSel("shl-tank", tankOpts(), shl.tank, "Tank") + "</div>";
    return T.bigPanel("Every shell, on one tank",
      ctl + '<div data-role="shl-out">' + shlBody() + "</div>",
      "Published multipliers on one tank's published numbers. The two red-edged " +
      "rows are where the multiplier grid will mislead you. Shells-to-kill " +
      "assumes every shell penetrates.");
  }

  function shlBody() {
    var t = tankOne(shl.tank);
    var list = shells();
    if (!t || !list.length) return "";

    var lightest = null, heaviest = null;
    tanks().forEach(function (x) {
      if (!lightest || x.hp < lightest.hp) lightest = x;
      if (!heaviest || x.hp > heaviest.hp) heaviest = x;
    });

    var dmgs = list.map(function (s) { return dmgOf(t, s); });
    var pens = list.map(function (s) { return penOf(t, s); });
    var maxD = Math.max.apply(null, dmgs), maxP = Math.max.apply(null, pens);

    function barCell(v, max, text, tone) {
      var w = max > 0 ? Math.round(v / max * 100) : 0;
      return '<td style="background:linear-gradient(90deg,' + tone + " 0 " + w + "%,transparent " +
        w + '%)">' + text + "</td>";
    }

    var rows = list.map(function (s, i) {
      var d = dmgs[i], p = pens[i];
      var trap = penFixed(s) || s.detection_mult === 0;
      var det = s.detection_mult === 0 ? "silent"
        : "x" + num(s.detection_mult);
      var vel = s.extra && s.extra.velocity_ms != null
        ? num(s.extra.velocity_ms) + " m/s"
        : "x" + num(s.velocity_mult);
      var flat45 = p * cosd(45);
      return '<tr' + (trap ? ' class="ph-trap"' : "") + ">" +
        '<td class="ph-l"><b>' + esc(s.shell) + "</b></td>" +
        '<td class="ph-l" style="color:var(--dim,#7f89b3);font-size:.76rem">' +
          esc(s.slot) + "</td>" +
        barCell(d, maxD, num(r1(d)), "rgba(192,57,43,.30)") +
        barCell(p, maxP, num(r1(p)) + (penFixed(s) ? " fixed" : ""), "rgba(201,162,39,.26)") +
        "<td>" + num(Math.round(flat45)) + "</td>" +
        "<td>x" + num(s.dispersion_mult) + "</td>" +
        "<td>" + esc(vel) + "</td>" +
        "<td>" + esc(det) + "</td>" +
        "<td>" + num(Math.ceil(lightest.hp / d)) + "</td>" +
        "<td>" + num(Math.ceil(heaviest.hp / d)) + "</td>" +
        "</tr>";
    }).join("");

    var head = "<thead><tr>" +
      "<th>Shell</th><th>Slot</th><th>Damage</th><th>Penetration</th>" +
      "<th>Beats at 45 deg</th><th>Dispersion</th><th>Velocity</th><th>Detection</th>" +
      "<th>vs " + esc(lightest.tank) + "</th><th>vs " + esc(heaviest.tank) + "</th>" +
      "</tr></thead>";

    var traps = '<div class="ph-flags">' +
      '<span class="ph-flag">High Explosive on ' + esc(t.tank) + ": penetration " +
        num(t.pen) + " mm to a fixed 45 mm, damage " + num(t.dmg) + " to " +
        num(r1(t.dmg * 1.2)) + ".</span>" +
      '<span class="ph-flag ph-warn">Silenced\'s detection multiplier is exactly 0. ' +
        "Not a small number. Anything dividing by it breaks.</span>" +
      "</div>";

    return traps + '<div class="ph-scroll"><table class="ph-tbl">' + head +
      "<tbody>" + rows + "</tbody></table></div>" +
      '<p class="ph-note">"Beats at 45 deg" is penetration times cos 45. Shells to ' +
      "kill use published health " + num(lightest.hp) + " and " +
      num(heaviest.hp) + ". Armour is ignored.</p>";
  }

  /* ---------------------------------------------- panel 5: module system */

  function panelModules() {
    return T.bigPanel("Six modules and their repair clocks",
      '<div data-role="mod-out">' + modBody() + "</div>",
      "Published timers. None measured. Each break repairs faster than the last. " +
      "After the shortest comes " + immuneSec() + " seconds of immunity, then it " +
      "resets to the longest.");
  }

  function modBody() {
    return '<div class="ph-two">' +
      '<div class="ph-col">' + modSchematic() + "</div>" +
      '<div class="ph-col">' + modTimeline() + "</div>" +
      "</div>" + modFooter();
  }

  function modSchematic() {
    var W = 400, H = 320;
    function hot(name, shape, label, lx, ly, anchor) {
      var on = mod.pick === name;
      return '<g class="ph-hot" data-mod="' + esc(name) + '">' + shape(on) +
        '<text x="' + lx + '" y="' + ly + '" text-anchor="' + (anchor || "middle") +
        '" fill="' + (on ? ACCENT : "#8e97bd") + '" font-size="10.5" font-family="inherit"' +
        (on ? ' font-weight="700"' : "") + ">" + esc(label) + "</text></g>";
    }
    function rect(x, y, w, h, rx) {
      return function (on) {
        return '<rect class="ph-hs" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
          '" rx="' + (rx || 4) + '" fill="' + (on ? "rgba(192,57,43,.30)" : "#232b47") +
          '" stroke="' + (on ? ACCENT : "#4a5479") + '" stroke-width="' + (on ? 2 : 1) + '"/>';
      };
    }

    var hull = '<rect x="118" y="52" width="164" height="212" rx="16" fill="#1a2038" ' +
      'stroke="#3c4568" stroke-width="1.5"/>';
    var treads = hot("Treads", function (on) {
      return rect(82, 56, 30, 204, 8)(on) + rect(288, 56, 30, 204, 8)(on);
    }, "Treads", 200, 284);
    var engine = hot("Engine", rect(140, 214, 120, 40, 6), "Engine", 200, 240);
    var fuel = hot("Fuel tank", rect(140, 176, 56, 30, 5), "Fuel", 168, 196);
    var turret = hot("Turret", function (on) {
      return '<circle class="ph-hs" cx="200" cy="136" r="54" fill="' +
        (on ? "rgba(192,57,43,.28)" : "#28304e") + '" stroke="' + (on ? ACCENT : "#4a5479") +
        '" stroke-width="' + (on ? 2 : 1.5) + '"/>';
    }, "Turret", 200, 100);
    var gun = hot("Gun", rect(192, 16, 16, 92, 3), "Gun", 218, 40, "start");
    var ability = hot("Ability", function (on) {
      return '<path class="ph-hs" d="M200 118L222 136L200 154L178 136Z" fill="' +
        (on ? "rgba(192,57,43,.45)" : "#3a4570") + '" stroke="' + (on ? ACCENT : "#6b76a0") +
        '" stroke-width="' + (on ? 2 : 1.2) + '"/>';
    }, "Ability", 200, 172);

    return '<div class="ph-sub">Click a module</div>' +
      '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet" data-role="mod-schem">' +
      hull + treads + engine + fuel + gun + turret + ability + "</svg>" +
      '<p class="ph-note">The layout is readable, not real. Module positions are ' +
      "not published.</p>";
  }

  function modTimeline() {
    var list = moduleList();
    var m = null;
    for (var i = 0; i < list.length; i++) { if (list[i].name === mod.pick) m = list[i]; }
    if (!m) return "";
    if (!m.repair || !m.repair.length) return modFire(m);

    var imm = immuneSec();
    var total = m.repair.reduce(function (s, v) { return s + v; }, 0) + imm;
    var W = 470, H = 268, x0 = 16, x1 = 452, yb = 74, hb = 42;
    function X(t) { return x0 + (t / total) * (x1 - x0); }

    var acc = 0, segs = "", ord = ["first break", "second break", "third break"];
    m.repair.forEach(function (d, i) {
      var xa = X(acc), xb = X(acc + d);
      segs += '<rect x="' + xa + '" y="' + yb + '" width="' + Math.max(2, xb - xa) +
        '" height="' + hb + '" rx="4" fill="rgba(192,57,43,' + (0.62 - i * 0.14).toFixed(2) +
        ')" stroke="' + ACCENT + '" stroke-width="1"/>' +
        '<text x="' + ((xa + xb) / 2) + '" y="' + (yb + 26) + '" text-anchor="middle" ' +
        'fill="#f2e6e4" font-size="12" font-family="inherit" font-weight="700">' +
        num(d) + " s</text>" +
        '<text x="' + ((xa + xb) / 2) + '" y="' + (yb - 10) + '" text-anchor="middle" ' +
        'fill="#8e97bd" font-size="9.5" font-family="inherit">' + ord[i] + "</text>" +
        '<line x1="' + xa + '" y1="' + (yb - 6) + '" x2="' + xa + '" y2="' + (yb + hb + 8) +
        '" stroke="#c8cee8" stroke-width="1.2"/>';
      acc += d;
    });
    var ix = X(acc), ix2 = X(acc + imm);
    segs += '<rect x="' + ix + '" y="' + yb + '" width="' + (ix2 - ix) + '" height="' + hb +
      '" rx="4" fill="rgba(90,164,106,.28)" stroke="' + OC.green + '" stroke-width="1"/>' +
      '<text x="' + ((ix + ix2) / 2) + '" y="' + (yb + 26) + '" text-anchor="middle" fill="#dff0e2" ' +
      'font-size="12" font-family="inherit" font-weight="700">' + num(imm) + " s immune</text>" +
      '<text x="' + ((ix + ix2) / 2) + '" y="' + (yb - 10) + '" text-anchor="middle" fill="#8e97bd" ' +
      'font-size="9.5" font-family="inherit">cannot be broken</text>';

    var axis = "";
    for (var t = 0; t <= total; t += 5) {
      axis += '<line x1="' + X(t) + '" y1="' + (yb + hb + 8) + '" x2="' + X(t) + '" y2="' +
        (yb + hb + 14) + '" stroke="#4a5479" stroke-width="1"/>' +
        '<text x="' + X(t) + '" y="' + (yb + hb + 28) + '" text-anchor="middle" fill="#6f7aa6" ' +
        'font-size="10" font-family="inherit">' + t + "s</text>";
    }

    var sum = m.repair.reduce(function (s, v) { return s + v; }, 0);
    return '<div class="ph-sub">' + esc(m.name) + "</div>" +
      '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' +
      '<text x="' + x0 + '" y="26" fill="#dfe4f6" font-size="14" font-family="inherit" ' +
      'font-weight="700">' + esc(m.name) + "</text>" +
      '<text x="' + x0 + '" y="46" fill="#8e97bd" font-size="11.5" font-family="inherit">' +
      esc(m.effect) + "</text>" + segs + axis +
      '<text x="' + x0 + '" y="' + (yb + hb + 58) + '" fill="#8e97bd" font-size="11" ' +
      'font-family="inherit">Three breaks cost ' + num(sum) + " s of downtime.</text>" +
      '<text x="' + x0 + '" y="' + (yb + hb + 76) + '" fill="#8e97bd" font-size="11" ' +
      'font-family="inherit">Then resets to ' + num(m.repair[0]) + " s.</text>" +
      '<text x="' + x0 + '" y="' + (yb + hb + 100) + '" fill="' + PUB + '" font-size="11" ' +
      'font-family="inherit">Published timers, not measured ones.</text>' +
      "</svg>";
  }

  // The fuel tank has no repair clock. It has a fire.
  function modFire(m) {
    var W = 470, H = 268, x0 = 40, x1 = 452, y0 = 70, y1 = 196;
    var ticks = 8, per = 20, tot = ticks * per;
    function X(t) { return x0 + (t / ticks) * (x1 - x0); }
    function Y(v) { return y1 - (v / tot) * (y1 - y0); }
    var bars = "", line = "M" + x0 + " " + Y(0), cum = 0;
    for (var i = 0; i < ticks; i++) {
      var xa = X(i) + 3, wd = (x1 - x0) / ticks - 6;
      bars += '<rect x="' + xa + '" y="' + (y1 - 26) + '" width="' + wd + '" height="22" rx="3" ' +
        'fill="rgba(192,57,43,.45)" stroke="' + ACCENT + '" stroke-width="1"><title>' +
        esc("second " + (i + 1) + ": " + per + " damage") + "</title></rect>";
      cum += per;
      line += "L" + X(i + 1) + " " + Y(cum);
    }
    var axis = "";
    for (var t = 0; t <= ticks; t++) {
      axis += '<text x="' + X(t) + '" y="' + (y1 + 20) + '" text-anchor="middle" fill="#6f7aa6" ' +
        'font-size="10" font-family="inherit">' + t + "s</text>";
    }
    var soft = null, hard = null;
    tanks().forEach(function (x) {
      if (!soft || x.hp < soft.hp) soft = x;
      if (!hard || x.hp > hard.hp) hard = x;
    });
    var share = soft
      ? num(r1(tot / soft.hp * 100)) + "% of " + soft.tank + "'s " + num(soft.hp) +
        " health, " + num(r1(tot / hard.hp * 100)) + "% of " + hard.tank + "'s " + num(hard.hp) + "."
      : "";
    return '<div class="ph-sub">' + esc(m.name) + "</div>" +
      '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMidYMid meet">' +
      '<text x="' + x0 + '" y="26" fill="#dfe4f6" font-size="14" font-family="inherit" ' +
      'font-weight="700">Fuel tank</text>' +
      '<text x="' + x0 + '" y="46" fill="#8e97bd" font-size="11.5" font-family="inherit">' +
      esc(m.effect) + "</text>" + bars +
      '<path d="' + line + '" fill="none" stroke="' + PUB + '" stroke-width="2.4"/>' +
      '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 +
      '" stroke="#3d466e" stroke-width="1"/>' + axis +
      '<text x="' + (x1 - 4) + '" y="' + (Y(tot) - 8) + '" text-anchor="end" fill="' + PUB +
      '" font-size="12" font-family="inherit" font-weight="700">' + tot + " total</text>" +
      '<text x="' + x0 + '" y="' + (y1 + 46) + '" fill="#8e97bd" font-size="11" ' +
      'font-family="inherit">Eight ticks of 20. No repair timer is published for it.</text>' +
      '<text x="' + x0 + '" y="' + (y1 + 66) + '" fill="#8e97bd" font-size="11" ' +
      'font-family="inherit">' + esc(share) + "</text>" +
      "</svg>";
  }

  function modFooter() {
    var o = official();
    var det = (o && o._module_detection) || "";
    return '<div class="ph-flags">' +
      '<span class="ph-flag">A critical hit is not a module. It is a penetration ' +
      "dealing 50% more damage.</span>" +
      "</div>" +
      (det ? '<p class="ph-note"><b style="color:' + MEAS + '">On the measured side:</b> ' +
        esc(det) + "</p>" : "");
  }

  /* --------------------------------------------- panel 6: shells to kill */

  function panelSTK() {
    var ctl = '<div class="ph-ctl">' +
      fSel("stk-shell", shellOpts(), stk.shell, "Shell") +
      fChk("stk-crit", "every shot a critical hit", stk.crit) + "</div>";
    return T.bigPanel("Shells to kill, every pairing",
      ctl + '<div data-role="stk-out">' + stkBody() + "</div>",
      "Published health over published damage, rounded up. Rows fire, columns " +
      "die. Every shell is assumed to penetrate. Armour, angle and the 50% band " +
      "are all ignored.");
  }

  function stkBody() {
    var atks = tanks().slice(0).sort(function (a, b) { return b.dmg - a.dmg; });
    var tgts = tanks().slice(0).sort(function (a, b) { return b.hp - a.hp; });
    if (!atks.length) return "";
    var sh = shellOne(stk.shell);
    var lw = 96, cw = 35, rh = 24, head = 74;
    var W = lw + tgts.length * cw, H = head + atks.length * rh + 10;

    var lo = 99, hi = 0, grid = [];
    atks.forEach(function (a) {
      var d = dmgOf(a, sh) * (stk.crit ? 1.5 : 1);
      var row = tgts.map(function (t) {
        var n = d > 0 ? Math.ceil(t.hp / d) : 0;
        if (n < lo) lo = n;
        if (n > hi) hi = n;
        return n;
      });
      grid.push(row);
    });
    var span = Math.max(1, hi - lo);

    var hdr = tgts.map(function (t, j) {
      var x = lw + j * cw + cw / 2;
      return '<text x="' + x + '" y="' + (head - 10) + '" transform="rotate(-52 ' + x + " " +
        (head - 10) + ')">' + esc(t.tank) + "</text>";
    }).join("");

    // As in the matrix above, shared attributes sit on the groups so 289 cells
    // do not each carry their own font stack.
    var rects = [], nums = [], names = [];
    atks.forEach(function (a, i) {
      var y = head + i * rh;
      var d = dmgOf(a, sh) * (stk.crit ? 1.5 : 1);
      tgts.forEach(function (t, j) {
        var n = grid[i][j];
        var alpha = 0.07 + 0.6 * (1 - (n - lo) / span);
        rects.push('<rect x="' + (lw + j * cw) + '" y="' + y + '" width="' + (cw - 2) +
          '" height="' + (rh - 2) + '" rx="3" fill="rgba(192,57,43,' + alpha.toFixed(2) +
          ')"><title>' + esc(a.tank + " to " + t.tank + ": " + n + " shells, " +
          r1(d) + " each vs " + t.hp + " health") + "</title></rect>");
        nums.push('<text x="' + (lw + j * cw + cw / 2 - 1) + '" y="' + (y + rh / 2 + 3) + '">' +
          n + "</text>");
      });
      rects.push('<rect x="' + (lw - 6) + '" y="' + (y + 3) + '" width="3" height="' + (rh - 8) +
        '" fill="' + color(a.tank) + '"/>');
      names.push('<text x="' + (lw - 12) + '" y="' + (y + rh / 2 + 3) + '">' +
        esc(a.tank) + "</text>");
    });

    return '<div class="ph-scroll"><svg class="chart-svg" width="' + W + '" viewBox="0 0 ' +
      W + " " + H + '">' +
      '<g fill="#8e97bd" font-size="10" font-family="inherit" text-anchor="start">' +
      hdr + "</g>" + rects.join("") +
      '<g fill="#e2e7f7" font-size="10.5" font-family="inherit" text-anchor="middle">' +
      nums.join("") + "</g>" +
      '<g fill="#c3cae6" font-size="10.5" font-family="inherit" text-anchor="end">' +
      names.join("") + "</g></svg></div>" +
      '<p class="ph-note">With ' + esc(stk.shell) +
      (stk.crit ? " and a critical every time" : "") + ": <b>" + lo +
      "</b> to <b>" + hi + "</b> shells across the grid.</p>";
  }

  /* ------------------------------------- panel 7: the one measured panel */

  function panelMix() {
    var s = (T && T.STATS) || {};
    if (!s.ammo_totals || !s.ammo_totals.length) return "";
    var ctl = '<div class="ph-chips" data-role="mix-chips">' +
      '<button class="ph-chip' + (mix.abilities ? " on" : "") +
        '" data-ab="1">show the two abilities</button>' +
      '<button class="ph-chip' + (mix.abilities ? "" : " on") +
        '" data-ab="0">shells only</button></div>';
    return T.bigPanel("What gets loaded",
      ctl + '<div data-role="mix-out">' + mixBody() + "</div>",
      "The one measured panel, in blue. Every shell fired in the archive, counted " +
      "off the wire. Whether any of them went through is not in the file.");
  }

  function mixBody() {
    var s = (T && T.STATS) || {};
    var o = official();
    var drift = (o && o._shell_name_drift) || {};
    var totals = s.ammo_totals || [];
    var abil = { Heal: "Valor's ability", Siege: "Arbalest's ability" };

    var rows = totals.map(function (r) {
      var isAb = !!abil[r.label];
      var shown = drift[r.label] && !isAb ? drift[r.label] : r.label;
      return { wire: r.label, name: shown, count: r.count, ab: isAb,
               renamed: !!(drift[r.label] && !isAb) };
    }).filter(function (r) { return mix.abilities || !r.ab; });

    var total = 0;
    rows.forEach(function (r) { total += r.count; });
    if (!total) return "";

    var bars = rows.map(function (r) {
      return {
        label: r.name + (r.renamed ? " (" + r.wire + ")" : "") + (r.ab ? " *" : ""),
        value: r.count,
        color: r.ab ? "#3f4a70" : MEAS,
        valueLabel: T.fmtNum(r.count) + "  " + T.fmtPct(r1(r.count / total * 100))
      };
    });

    var std = null;
    rows.forEach(function (r) { if (r.wire === "Standard") std = r; });

    // Which published shells actually turn up, checked rather than asserted.
    var seen = {};
    (s.ammo_totals || []).forEach(function (r) {
      seen[drift[r.label] && !abil[r.label] ? drift[r.label] : r.label] = 1;
    });
    var missing = shells().filter(function (x) { return !seen[x.shell]; })
                          .map(function (x) { return x.shell; });
    var coverage = missing.length
      ? num(shells().length - missing.length) + " of " + num(shells().length) +
        " published shells appear. Not seen: " + esc(missing.join(", ")) + ". "
      : "All " + num(shells().length) + " published shells appear. ";

    var notes = '<p class="ph-note">' + T.fmtNum(total) + " shells" +
      (mix.abilities ? " and ability shots" : "") + " in total" +
      (std ? ", of which Standard is " + T.fmtPct(r1(std.count / total * 100)) : "") +
      ". " + coverage +
      (mix.abilities
        ? "Starred: Valor's Heal and Arbalest's Siege. Abilities, not shells."
        : "Heal and Siege hidden. Abilities, not shells.") +
      "</p>" +
      '<p class="ph-note">Brackets are wire names. Ability is Energy, Leech is ' +
      "Siphon, Mobility is Lightweight.</p>" +
      '<p class="ph-note"><b>This will not join to the penetration panels above.</b> ' +
      "Replays carry no shot outcome to join on.</p>";

    return T.svgBarChart(bars, { width: 660, labelWidth: 168, rowHeight: 20 }) + notes;
  }

  /* --------------------------------------------------------------- shell */

  function headline() {
    var n = tanks().length, sn = shells().length;
    return '<p class="ph-lede">A replay records that a shell was fired. It does not record ' +
      "whether the shell went through. Everything here is the game's <b>published</b> sheet " +
      "plus arithmetic: <b>" + num(n) + " tanks</b>, <b>" + num(sn) + " shells</b>, five " +
      "shot outcomes, six modules. One panel at the bottom is measured.</p>" +
      '<div class="ph-key">' +
      '<span><span class="ph-dot" style="background:' + PUB + '"></span><b>Gold</b> ' +
      "is published by tyrhq.com</span>" +
      '<span><span class="ph-dot" style="background:' + MEAS + '"></span><b>Blue</b> ' +
      "is measured from replays</span>" +
      '<span><span class="ph-dot" style="background:' + OC.green + '"></span>through</span>' +
      '<span><span class="ph-dot" style="background:' + OC.yellow + '"></span>coin flip</span>' +
      '<span><span class="ph-dot" style="background:' + OC.grey + '"></span>blocked</span>' +
      '<span><span class="ph-dot" style="background:' + OC.blue + '"></span>module hit</span>' +
      '<span><span class="ph-dot" style="background:' + OC.magenta + '"></span>treads only</span>' +
      "</div>";
  }

  function initState() {
    var l = tanks();
    if (!l.length) return;
    function has(n) { return !!tankOne(n); }
    if (!sim.atk || !has(sim.atk)) sim.atk = has("Ark") ? "Ark" : l[0].tank;
    if (!sim.tgt || !has(sim.tgt)) sim.tgt = has("Atlas") ? "Atlas" : l[l.length - 1].tank;
    if (!shl.tank || !has(shl.tank)) shl.tank = sim.atk;
    var sl = shells();
    function hasSh(n) { for (var i = 0; i < sl.length; i++) if (sl[i].shell === n) return true; return false; }
    if (!hasSh(sim.shell)) sim.shell = sl.length ? sl[0].shell : null;
    if (!hasSh(mtx.shell)) mtx.shell = sim.shell;
    if (!hasSh(stk.shell)) stk.shell = sim.shell;
    var tiers = penTiers();
    var ok = false;
    tiers.forEach(function (t) { if (t.mm === arc.pen) ok = true; });
    if (!ok && tiers.length) arc.pen = tiers[Math.min(3, tiers.length - 1)].mm;
    var ml = moduleList();
    var okm = false;
    ml.forEach(function (m) { if (m.name === mod.pick) okm = true; });
    if (!okm && ml.length) mod.pick = ml[0].name;
  }

  /* ------------------------------------------------------------- preview */

  function preview(Tin) {
    T = Tin;
    var tiers = penTiers();
    if (!tiers.length) {
      return '<svg viewBox="0 0 240 240"><rect width="240" height="240" fill="none"/></svg>';
    }
    // A 60 mm plate at 60 degrees, which is 120 mm of steel. Real arithmetic.
    var a = 60, t = 60, cx = 138, cy = 82, DT = 26, HH = 86;
    var c = cosd(a), half = DT / (2 * c);
    var ex = cx - half, xx = cx + half;

    var plate = '<g transform="rotate(' + a + " " + cx + " " + cy + ')">' +
      '<rect x="' + (cx - DT / 2) + '" y="' + (cy - HH) + '" width="' + DT + '" height="' +
      (2 * HH) + '" fill="#2b3350" stroke="#59648f" stroke-width="1.2"/></g>';

    var shellPath =
      '<line x1="8" y1="' + cy + '" x2="' + (ex - 3) + '" y2="' + cy +
      '" stroke="#8e97bd" stroke-width="1.6" stroke-dasharray="5 4"/>' +
      '<line x1="' + ex + '" y1="' + cy + '" x2="' + xx + '" y2="' + cy +
      '" stroke="' + OC.green + '" stroke-width="5"/>' +
      '<line x1="' + xx + '" y1="' + cy + '" x2="228" y2="' + cy +
      '" stroke="' + OC.green + '" stroke-width="1.8"/>' +
      '<circle cx="222" cy="' + cy + '" r="5" fill="' + OC.green + '"/>' +
      '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" fill="' + OC.green +
      '" font-size="13" font-family="monospace">' + t + " / " + Math.round(t / c) + " mm</text>" +
      '<text x="' + cx + '" y="' + (cy + 46) + '" text-anchor="middle" fill="#6f7aa6" ' +
      'font-size="10" font-family="monospace">' + a + " deg</text>";

    var bw = 240 / tiers.length;
    var bars = tiers.map(function (tr, i) {
      var h = (tr.mm / 100) * 62;
      return '<rect x="' + (i * bw + 3) + '" y="' + (232 - h) + '" width="' + (bw - 6) +
        '" height="' + h + '" rx="2" fill="' + ACCENT + '" opacity="' +
        (0.4 + 0.55 * (tr.mm / 100)).toFixed(2) + '"/>' +
        '<text x="' + (i * bw + bw / 2) + '" y="236" text-anchor="middle" fill="#6f7aa6" ' +
        'font-size="8" font-family="monospace">' + tr.mm + "</text>";
    }).join("");

    return '<svg viewBox="0 0 240 240">' + plate + shellPath + bars + "</svg>";
  }

  /* -------------------------------------------------------------- render */

  function render(Tin) {
    T = Tin;
    if (!official()) {
      return T.bigPanel("Physics",
        '<p class="small">The published sheet has not loaded. Nothing to ' +
        "compute.</p>", "");
    }
    initState();
    return headline() + panelSim() + panelAngle() + panelMatrix() + panelShells() +
      panelModules() + panelSTK() + panelMix();
  }

  /* ---------------------------------------------------------------- wire */

  function wire(Tin, root) {
    T = Tin;
    if (!root || !official()) return;
    initState();

    function q(sel) { return root.querySelector(sel); }
    function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
    function up(el, html) { if (el) el.innerHTML = html; }
    function chipPick(bar, attr, val) {
      if (!bar) return;
      var cs = bar.querySelectorAll(".ph-chip");
      for (var i = 0; i < cs.length; i++) {
        cs[i].className = cs[i].getAttribute(attr) === String(val) ? "ph-chip on" : "ph-chip";
      }
    }
    function closestOf(ev, sel) {
      var n = ev.target;
      if (!n || !n.closest) return null;
      return n.closest(sel);
    }

    /* --- 1: the shot --- */
    var simOut = q('[data-role="sim-out"]');
    function redrawSim() { up(simOut, simBody()); }
    on(q('[data-role="sim-atk"]'), "change", function (e) { sim.atk = e.target.value; redrawSim(); });
    on(q('[data-role="sim-shell"]'), "change", function (e) { sim.shell = e.target.value; redrawSim(); });
    on(q('[data-role="sim-tgt"]'), "change", function (e) { sim.tgt = e.target.value; redrawSim(); });
    on(q('[data-role="sim-mm"]'), "input", function (e) {
      sim.mm = Number(e.target.value);
      var rd = q('[data-role="sim-mm-rd"]');
      if (rd) rd.textContent = sim.mm + " mm";
      redrawSim();
    });
    on(q('[data-role="sim-ang"]'), "input", function (e) {
      sim.ang = Number(e.target.value);
      var rd = q('[data-role="sim-ang-rd"]');
      if (rd) rd.textContent = sim.ang + " deg";
      redrawSim();
    });
    on(q('[data-role="sim-crit"]'), "change", function (e) {
      sim.crit = !!e.target.checked; redrawSim();
    });
    var bandBar = q('[data-role="sim-band"]');
    on(bandBar, "click", function (ev) {
      var b = closestOf(ev, ".ph-chip");
      if (!b) return;
      sim.band = b.getAttribute("data-band");
      chipPick(bandBar, "data-band", sim.band);
      redrawSim();
    });

    /* --- 2: angle is armour --- */
    var arcOut = q('[data-role="arc-out"]');
    function redrawArc() { up(arcOut, arcBody()); }
    on(q('[data-role="arc-mm"]'), "input", function (e) {
      arc.mm = Number(e.target.value);
      var rd = q('[data-role="arc-mm-rd"]');
      if (rd) rd.textContent = arc.mm + " mm";
      redrawArc();
    });
    var arcChips = q('[data-role="arc-chips"]');
    on(arcChips, "click", function (ev) {
      var b = closestOf(ev, ".ph-chip");
      if (!b) return;
      arc.pen = Number(b.getAttribute("data-pen"));
      chipPick(arcChips, "data-pen", arc.pen);
      redrawArc();
    });

    /* --- 3: the matrix --- */
    var mtxOut = q('[data-role="mtx-out"]');
    on(q('[data-role="mtx-shell"]'), "change", function (e) {
      mtx.shell = e.target.value; up(mtxOut, mtxBody());
    });

    /* --- 4: shells on one tank --- */
    var shlOut = q('[data-role="shl-out"]');
    on(q('[data-role="shl-tank"]'), "change", function (e) {
      shl.tank = e.target.value; up(shlOut, shlBody());
    });

    /* --- 5: modules --- */
    var modOut = q('[data-role="mod-out"]');
    on(modOut, "click", function (ev) {
      var g = closestOf(ev, ".ph-hot");
      if (!g) return;
      var name = g.getAttribute("data-mod");
      if (!name) return;
      mod.pick = name;
      up(modOut, modBody());
    });

    /* --- 6: shells to kill --- */
    var stkOut = q('[data-role="stk-out"]');
    on(q('[data-role="stk-shell"]'), "change", function (e) {
      stk.shell = e.target.value; up(stkOut, stkBody());
    });
    on(q('[data-role="stk-crit"]'), "change", function (e) {
      stk.crit = !!e.target.checked; up(stkOut, stkBody());
    });

    /* --- 7: what gets loaded --- */
    var mixOut = q('[data-role="mix-out"]');
    var mixChips = q('[data-role="mix-chips"]');
    on(mixChips, "click", function (ev) {
      var b = closestOf(ev, ".ph-chip");
      if (!b) return;
      mix.abilities = b.getAttribute("data-ab") === "1";
      chipPick(mixChips, "data-ab", mix.abilities ? "1" : "0");
      up(mixOut, mixBody());
    });
  }

  /* -------------------------------------------------------------- export */

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "physics",
    title: "Physics",
    blurb: "Penetration, armour angle, modules and what a shell does on impact.",
    accent: ACCENT,
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

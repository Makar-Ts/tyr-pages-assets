/* Pipeline suite: how a .replay becomes a statistic.
 *
 * Every other suite shows a conclusion. This one shows where the conclusions
 * come from and, more usefully, where they stop. A .replay is a recording of
 * the packets a server sent one client. Nothing in it is a statistic.
 *
 * The stage descriptions, constants and field orders here are copied from the
 * tools that actually do the work: tools/replay_probe.py (container),
 * tools/replay_decode.py (net stream), tools/replay_site.py (one match) and
 * tools/replay_to_site.py (the archive). The counts are read live from T.DATA
 * and T.STATS so they cannot drift away from the archive.
 *
 * No replay bytes are served to the browser. Where this file shows bytes it
 * says so, and says which ones are constants and which are derived.
 *
 * Nothing here writes; it only reads T and draws.
 */
(function () {
  "use strict";

  var ACCENT = "#65508a";
  var LIT = "#b8a4e6";          // brighter accent, for the live parts
  var KNOWN = "#8fb0ff";        // a value this page can state exactly
  var DERIVED = "#c9a227";      // a value reconstructed, with a caveat
  var GONE = "#6c779e";         // a value that is not here at all

  var CSS = "" +
    ".pl-cards{margin-bottom:6px}" +
    ".pl-lede{max-width:74ch;font-size:.86rem;color:var(--dim,#7f89b3);margin:0 0 16px}" +
    ".pl-lede b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".pl-mono{font-family:ui-monospace,'Cascadia Mono',Consolas,Menlo,monospace}" +

    /* ---- generic controls ---- */
    ".pl-ctrls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px}" +
    ".pl-ctrls-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin-right:2px}" +
    ".pl-btn{-webkit-appearance:none;appearance:none;cursor:pointer;font:inherit;" +
      "font-size:.78rem;padding:5px 11px;border-radius:999px;line-height:1.25;" +
      "border:1px solid var(--border,#232c52);background:var(--panel2,#131a33);" +
      "color:var(--dim,#7f89b3)}" +
    ".pl-btn:hover{color:var(--text,#d6dcf5);border-color:#4a3d68}" +
    ".pl-btn[disabled]{opacity:.4;cursor:default}" +
    ".pl-btn.on{background:rgba(101,80,138,.34);border-color:#8a72bd;color:#dfd3f6}" +
    ".pl-btn .pl-sub{opacity:.6;margin-left:6px;font-size:.72rem}" +
    ".pl-sel{font:inherit;font-size:.78rem;padding:5px 8px;border-radius:8px;max-width:100%;" +
      "border:1px solid var(--border,#232c52);background:var(--panel2,#131a33);" +
      "color:var(--text,#d6dcf5)}" +
    ".pl-subh{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;" +
      "color:var(--dim,#7f89b3);margin:20px 0 8px}" +

    /* ---- 1. the pipeline diagram ---- */
    ".pl-flow{display:grid;grid-template-columns:302px minmax(0,1fr);gap:22px;align-items:stretch}" +
    "@media (max-width:860px){.pl-flow{grid-template-columns:1fr}}" +
    ".pl-flow svg{width:100%;height:auto;display:block;overflow:visible}" +
    ".pl-pipe{stroke:rgba(101,80,138,.55);stroke-width:3;stroke-linecap:round}" +
    ".pl-pipe-run{stroke:" + LIT + ";stroke-width:3;stroke-linecap:round;" +
      "stroke-dasharray:2 13;opacity:.85;animation:pl-run 1.9s linear infinite}" +
    "@keyframes pl-run{from{stroke-dashoffset:0}to{stroke-dashoffset:-30}}" +
    "@media (prefers-reduced-motion:reduce){.pl-pipe-run{animation:none;opacity:.35}}" +
    ".pl-node{fill:var(--panel2,#131a33);stroke:rgba(101,80,138,.75);stroke-width:2}" +
    ".pl-node-on{fill:" + LIT + ";stroke:#e2d7fb;stroke-width:2}" +
    ".pl-halo{fill:none;stroke:" + LIT + ";stroke-width:1.2;opacity:.45}" +
    ".pl-nt{font-size:13px;fill:var(--dim,#7f89b3)}" +
    ".pl-nt-on{font-size:13px;fill:var(--text,#d6dcf5);font-weight:600}" +
    ".pl-nm{font-size:10.5px;fill:#6c779e;font-family:ui-monospace,Consolas,monospace}" +
    ".pl-hit{fill:transparent;cursor:pointer}" +
    ".pl-hit:hover ~ .pl-nt{fill:var(--text,#d6dcf5)}" +
    ".pl-det{border:1px solid var(--border,#232c52);border-radius:12px;display:flex;" +
      "flex-direction:column;background:var(--panel2,#131a33);padding:16px 18px;" +
      "min-height:330px}" +
    ".pl-det h3{margin:0 0 2px;font-size:1.02rem;color:var(--text,#d6dcf5)}" +
    ".pl-det-step{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;" +
      "color:" + LIT + ";margin-bottom:10px}" +
    ".pl-io{display:grid;grid-template-columns:76px 1fr;gap:6px 12px;font-size:.83rem;" +
      "margin:0 0 12px}" +
    ".pl-io dt{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);padding-top:2px}" +
    ".pl-io dd{margin:0;color:var(--text,#d6dcf5)}" +
    ".pl-io dd.pl-loss{color:#e0b28a}" +
    ".pl-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}" +
    ".pl-tag{font-size:.7rem;padding:3px 8px;border-radius:6px;" +
      "font-family:ui-monospace,Consolas,monospace;background:rgba(101,80,138,.2);" +
      "border:1px solid rgba(138,114,189,.35);color:#c7b8e8}" +
    ".pl-src{margin-top:auto;padding-top:14px;font-size:.72rem;color:#6c779e;" +
      "font-family:ui-monospace,Consolas,monospace}" +

    /* ---- 2. the header walk ---- */
    ".pl-ribbon{display:flex;flex-wrap:wrap;gap:3px;margin:0 0 16px;" +
      "font-family:ui-monospace,Consolas,monospace;font-size:.72rem}" +
    ".pl-byte{width:26px;height:26px;display:flex;align-items:center;justify-content:center;" +
      "border-radius:4px;background:rgba(255,255,255,.045);color:var(--dim,#7f89b3);" +
      "border:1px solid transparent}" +
    ".pl-byte.k{background:rgba(143,176,255,.16);color:#bcd0ff}" +
    ".pl-byte.d{background:rgba(201,162,39,.16);color:#e2cd8b}" +
    ".pl-byte.sel{border-color:" + LIT + ";box-shadow:0 0 0 1px " + LIT + "}" +
    ".pl-var{height:26px;display:flex;align-items:center;padding:0 10px;border-radius:4px;" +
      "border:1px dashed #4a5480;color:#6c779e;font-size:.68rem;letter-spacing:.03em}" +
    ".pl-var.sel{border-color:" + LIT + ";color:#c7b8e8}" +
    ".pl-fields{display:flex;flex-direction:column;gap:2px}" +
    ".pl-fld{-webkit-appearance:none;appearance:none;cursor:pointer;font:inherit;width:100%;" +
      "display:grid;grid-template-columns:minmax(0,1fr) 54px 122px minmax(0,1fr);gap:10px;" +
      "align-items:baseline;text-align:left;padding:6px 10px;border-radius:7px;border:1px solid transparent;" +
      "background:transparent;color:var(--text,#d6dcf5);font-size:.8rem}" +
    "@media (max-width:720px){.pl-fld{grid-template-columns:1fr 54px;row-gap:2px}}" +
    ".pl-fld:hover{background:rgba(255,255,255,.035)}" +
    ".pl-fld.on{background:rgba(101,80,138,.24);border-color:#6f5b96}" +
    ".pl-fld .pl-fn{font-family:ui-monospace,Consolas,monospace}" +
    ".pl-fld .pl-fw,.pl-fld .pl-fo{color:var(--dim,#7f89b3);font-size:.74rem;" +
      "font-family:ui-monospace,Consolas,monospace}" +
    ".pl-fld .pl-fv{font-family:ui-monospace,Consolas,monospace;font-size:.76rem}" +
    ".pl-fv.k{color:" + KNOWN + "}.pl-fv.d{color:" + DERIVED + "}.pl-fv.n{color:" + GONE + "}" +
    ".pl-expl{margin-top:12px;padding:11px 13px;border-radius:9px;font-size:.82rem;" +
      "background:rgba(101,80,138,.13);border:1px solid rgba(101,80,138,.4);" +
      "color:var(--text,#d6dcf5);min-height:3.4em}" +
    ".pl-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:.72rem;" +
      "color:var(--dim,#7f89b3);margin:0 0 12px}" +
    ".pl-legend i{width:9px;height:9px;border-radius:2px;display:inline-block;" +
      "margin-right:6px;vertical-align:middle}" +

    /* ---- 3. the bit explorer ---- */
    ".pl-bitwrap{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:22px;align-items:start}" +
    "@media (max-width:860px){.pl-bitwrap{grid-template-columns:1fr}}" +
    ".pl-bytes{display:flex;flex-wrap:wrap;gap:14px;margin:6px 0 4px}" +
    ".pl-bgrp{border:1px solid var(--border,#232c52);border-radius:9px;padding:8px 9px 6px;" +
      "background:rgba(0,0,0,.2)}" +
    ".pl-brow{display:flex;gap:2px}" +
    ".pl-bit{width:22px;height:26px;display:flex;align-items:center;justify-content:center;" +
      "border-radius:3px;font-family:ui-monospace,Consolas,monospace;font-size:.76rem;" +
      "background:rgba(255,255,255,.05);color:#5f6a92}" +
    ".pl-bit.one{background:rgba(184,164,230,.28);color:#e2d7fb}" +
    ".pl-bit.cont{background:rgba(201,162,39,.2);color:#e2cd8b}" +
    ".pl-bit.cont.one{background:rgba(201,162,39,.5);color:#fff0c2}" +
    ".pl-bcap{display:flex;justify-content:space-between;gap:10px;margin-top:5px;" +
      "font-size:.66rem;color:#6c779e;font-family:ui-monospace,Consolas,monospace}" +
    ".pl-read{font-size:.82rem;color:var(--dim,#7f89b3);min-height:3.2em;margin-top:8px;" +
      "font-family:ui-monospace,Consolas,monospace;line-height:1.5}" +
    ".pl-read b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".pl-slider{display:flex;align-items:center;gap:10px;margin:2px 0 6px}" +
    ".pl-slider input[type=range]{flex:1 1 auto;width:100%;accent-color:" + LIT + "}" +
    ".pl-slider span{font-size:.72rem;color:var(--dim,#7f89b3);flex:0 0 auto}" +
    ".pl-cost{border:1px solid var(--border,#232c52);border-radius:10px;padding:10px 12px;max-width:100%;" +
      "background:rgba(0,0,0,.18)}" +
    /* deliberately not a <table>: the site's global table rule carries a
       560px min-width, which this 280px column cannot hold. */
    ".pl-costrow{display:flex;justify-content:space-between;gap:12px;padding:3px 0;" +
      "font-size:.76rem;font-family:ui-monospace,Consolas,monospace;" +
      "border-bottom:1px solid rgba(255,255,255,.05)}" +
    ".pl-costrow:last-child{border-bottom:0}" +
    ".pl-costrow b{color:" + LIT + ";font-weight:400}" +
    ".pl-cost .pl-cost-h{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;" +
      "color:var(--dim,#7f89b3);margin-bottom:6px;font-family:inherit}" +

    /* ---- 4. archive coverage ---- */
    ".pl-cov{display:flex;flex-direction:column;gap:9px;margin:0 0 4px}" +
    ".pl-cov-r{display:grid;grid-template-columns:minmax(0,1fr) 190px 96px;gap:12px;align-items:center;" +
      "font-size:.82rem}" +
    "@media (max-width:640px){.pl-cov-r{grid-template-columns:1fr 96px;row-gap:4px}" +
      ".pl-cov-bar{grid-column:1 / -1}}" +
    ".pl-cov-bar{height:9px;border-radius:5px;overflow:hidden;display:flex;" +
      "background:rgba(255,255,255,.06)}" +
    ".pl-cov-bar i{display:block;height:100%}" +
    ".pl-cov-n{text-align:right;font-family:ui-monospace,Consolas,monospace;font-size:.76rem;" +
      "color:var(--dim,#7f89b3)}" +
    ".pl-cov-n b{color:var(--text,#d6dcf5);font-weight:600}" +
    ".pl-names{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:2px}" +
    ".pl-name{display:grid;grid-template-columns:minmax(0,1fr) 14px minmax(0,1fr);gap:6px;" +
      "align-items:baseline;padding:4px 8px;border-radius:6px;font-size:.79rem;" +
      "font-family:ui-monospace,Consolas,monospace}" +
    ".pl-name:nth-child(odd){background:rgba(255,255,255,.03)}" +
    ".pl-name .pl-wire{color:#c7b8e8}" +
    ".pl-name .pl-arrow{color:#4a5480;text-align:center}" +
    ".pl-name .pl-disp{color:var(--text,#d6dcf5)}" +
    ".pl-name .pl-how{color:#5f6a92;font-size:.68rem;margin-left:6px}" +

    /* ---- 5. limits ---- */
    ".pl-lims{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}" +
    ".pl-lim{border:1px solid var(--border,#232c52);border-radius:11px;overflow:hidden;" +
      "background:var(--panel2,#131a33)}" +
    ".pl-lim.on{border-color:#7a63a8}" +
    ".pl-limh{-webkit-appearance:none;appearance:none;cursor:pointer;font:inherit;width:100%;" +
      "text-align:left;background:transparent;border:0;padding:12px 14px;color:inherit}" +
    ".pl-limh:hover{background:rgba(255,255,255,.03)}" +
    ".pl-limt{display:block;font-size:.88rem;color:var(--text,#d6dcf5);font-weight:600}" +
    ".pl-limv{display:block;margin-top:3px;font-size:.78rem;color:#e0b28a}" +
    ".pl-limc{padding:0 14px 13px;font-size:.82rem;color:var(--dim,#7f89b3);" +
      "line-height:1.55;display:none}" +
    ".pl-lim.on .pl-limc{display:block}" +
    ".pl-limc .pl-src{margin-top:9px;padding-top:0}" +
    ".pl-limmore{float:right;font-size:.7rem;color:#6c779e}" +

    /* ---- 6. verification ---- */
    ".pl-tiers{display:flex;flex-direction:column;gap:6px;margin:0 0 8px}" +
    ".pl-tier{display:grid;grid-template-columns:112px minmax(0,1fr);gap:12px;padding:8px 10px;" +
      "border-radius:8px;background:rgba(255,255,255,.028);font-size:.8rem;align-items:baseline}" +
    "@media (max-width:640px){.pl-tier{grid-template-columns:1fr;row-gap:3px}}" +
    ".pl-tier b{font-family:ui-monospace,Consolas,monospace;font-size:.76rem;color:#c7b8e8;" +
      "font-weight:600}" +
    ".pl-tier span{color:var(--dim,#7f89b3)}" +
    ".pl-tier.pl-tier-key{background:rgba(101,80,138,.22);outline:1px solid rgba(138,114,189,.4)}" +
    ".pl-grid{display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 10px;max-width:640px}" +
    ".pl-cell{width:13px;height:13px;border-radius:3px;background:rgba(255,255,255,.08)}" +
    ".pl-cell.up{background:" + LIT + "}" +
    ".pl-cell.dim{opacity:.16}" +

    /* ---- 7. reload cross check ---- */
    ".pl-chart{width:100%;height:auto;display:block}" +
    ".pl-ct{font-size:11.5px;fill:var(--dim,#7f89b3);" +
      "font-family:ui-monospace,Consolas,monospace}" +
    ".pl-ct-l{font-size:12px;fill:var(--text,#d6dcf5)}" +
    ".pl-ct-g{stroke:rgba(255,255,255,.07)}" +
    ".pl-verdict{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}" +
    ".pl-vd{border:1px solid var(--border,#232c52);border-radius:9px;padding:8px 13px;" +
      "background:rgba(0,0,0,.18);font-size:.79rem;color:var(--dim,#7f89b3)}" +
    ".pl-vd b{display:block;font-size:1.15rem;color:var(--text,#d6dcf5);" +
      "font-family:ui-monospace,Consolas,monospace;font-weight:600;line-height:1.3}" +
    ".pl-fld>span,.pl-tier>span,.pl-cov-r>div,.pl-name>span{min-width:0;overflow-wrap:break-word}" +
    ".pl-empty{font-size:.82rem;color:var(--dim,#7f89b3);padding:10px 0}";

  var TT = null;

  // ------------------------------------------------------------------ utils

  function E(s) { return TT && TT.esc ? TT.esc(s) : String(s == null ? "" : s); }
  function NUM(v) { return TT && TT.fmtNum ? TT.fmtNum(v) : String(v); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function pad2(n) { var s = n.toString(16).toUpperCase(); return s.length < 2 ? "0" + s : s; }
  // little endian bytes of an unsigned 32 bit field, the way the cursor reads them
  function le32(v) {
    var out = [], i;
    for (i = 0; i < 4; i++) out.push((v >>> (8 * i)) & 255);
    return out;
  }
  function sec2(v) { return isNum(v) ? v.toFixed(2).replace(/\.?0+$/, "") || "0" : "-"; }
  function panel(title, body, note) {
    return '<div class="panel avg-panel"><h2>' + E(title) + "</h2>" + body +
      (note ? '<div class="small" style="margin-top:10px">' + note + "</div>" : "") +
      "</div>";
  }
  function on(root, sel, fn) {
    var els = root.querySelectorAll(sel), i;
    for (i = 0; i < els.length; i++) {
      (function (el) { el.addEventListener("click", function (ev) { fn(el, ev); }); })(els[i]);
    }
  }

  // ------------------------------------------------------- facts from T.DATA

  // Everything the page states about the archive is counted here, once, from
  // the live files. Nothing below hardcodes an archive number.
  function facts(T) {
    var D = T.DATA || {}, S = T.STATS || {};
    var ms = D.matches || [];
    var f = {
      matches: ms.length,
      rows: 0, namedTank: 0,
      players: (D.players || []).length,
      clans: (D.clans || []).length,
      tanks: (D.tanks || []).length,
      maps: (D.maps || []).length,
      statKeys: Object.keys(S).length,
      builds: [], wt: { elimination: 0, capture: 0, unknown: 0 },
      fullRoster: 0, credited: 0, corroborated: 0, uploaders: 0,
      officialMaps: 0
    };
    var buildCount = {}, up = {}, i, j, m, p;
    for (i = 0; i < ms.length; i++) {
      m = ms[i];
      buildCount[m.build] = (buildCount[m.build] || 0) + 1;
      var wt = m.win_type || "unknown";
      if (f.wt[wt] == null) f.wt[wt] = 0;
      f.wt[wt] += 1;
      if ((m.players || []).length >= 16) f.fullRoster += 1;
      var ids = m.uploaded_by_ids || [];
      if (ids.length) f.credited += 1;
      if (ids.length > 1) f.corroborated += 1;
      for (j = 0; j < ids.length; j++) up[ids[j]] = 1;
      for (j = 0; j < (m.players || []).length; j++) {
        p = m.players[j];
        f.rows += 1;
        if (p && p.tank) f.namedTank += 1;
      }
    }
    f.uploaders = Object.keys(up).length;
    f.builds = Object.keys(buildCount).map(function (b) {
      return { build: b, count: buildCount[b] };
    }).sort(function (a, b) { return b.count - a.count; });
    f.decided = f.wt.elimination + f.wt.capture;

    // How many of the maps the published sheet names have actually appeared.
    var off = T.OFFICIAL || {}, om = off.maps || {};
    var listed = (om.released || []).concat(om.prototype || []);
    var seen = {};
    (D.maps || []).forEach(function (x) { seen[String(x.map || "").toLowerCase()] = 1; });
    for (i = 0; i < listed.length; i++) {
      if (seen[String(listed[i]).toLowerCase()]) f.officialMaps += 1;
    }
    f.officialMapsListed = listed.length;
    return f;
  }

  // ---------------------------------------------------------- 1. the stages

  // in / out / lost are the three things a stage of a decoder is actually
  // made of. "lost" is the column nobody writes down, so it is written here.
  function stages(T, f) {
    return [
      {
        key: "file", name: "The file",
        inp: "One match, recorded by the client that played it. Nobody else has a copy.",
        out: "Five to nine megabytes of .replay in the game's Demos folder.",
        lost: "Nothing yet. Nothing signed either. No later check can prove the game wrote " +
          "these bytes.",
        meta: ["magic 0x1CA2E27F", "fileVersion 7", "isCompressed false", "isEncrypted false"],
        num: NUM(f.matches) + " decoded",
        src: "tools/replay_probe.py, parse_replay_info"
      },
      {
        key: "chunks", name: "Chunks",
        inp: "The whole file, read from the front with a byte cursor.",
        out: "A flat list of chunks: four byte type, four byte size, payload.",
        lost: "Checkpoint chunks, undecoded. They let a viewer seek, and restate what the " +
          "frames already carry.",
        meta: ["0 Header", "1 ReplayData", "2 Checkpoint", "3 Event", "header magic 0x2CF5A13D"],
        num: "4 types",
        src: "tools/replay_probe.py, probe"
      },
      {
        key: "frames", name: "Frames",
        inp: "Each ReplayData chunk, as a run of demo frames.",
        out: "Per frame: a level index, a float timestamp, export tables, a list of packets.",
        lost: "A frame that fails to parse is dropped on its own. The damage is a fraction of " +
          "a second.",
        meta: ["networkVersion 19", "engineNetworkVersion 42", "flags 0x1 ClientRecorded"],
        num: "",
        src: "tools/replay_decode.py, parse_demo_frame"
      },
      {
        key: "bunches", name: "Packets and bunches",
        inp: "A frame's packets, read as a bit stream.",
        out: "Bunches: channel index, open and close flags, close reason, reliability, " +
          "partial flags, bit length.",
        lost: "Nothing structural. Packets and bunches each carry their own length. One bad " +
          "region does not take the rest down with it.",
        meta: ["MAX_PACKET_SIZE_IN_BITS 16384", "CHANNEL_CLOSE_REASON_MAX 15",
               "MAX_GUID_COUNT 2048"],
        num: "16,384 bits max",
        src: "tools/replay_decode.py, process_packet"
      },
      {
        key: "names", name: "Names",
        inp: "Export tables, scattered wherever the server first needed them.",
        out: "Two lookup tables: network id to object path, class path to numbered property " +
          "names.",
        lost: "A property whose class exported no table stays a bare number and a bit length. " +
          "Tables can arrive long after the object that needs them. Hence two passes.",
        meta: ["prescan pass", "decode pass", "read_net_field_exports"],
        num: "2 passes",
        src: "tools/replay_decode.py, decode"
      },
      {
        key: "props", name: "Properties and calls",
        inp: "A bunch payload, as a loop of handle then bit length then value.",
        out: "Named property updates, and remote procedure calls with their parameter bits.",
        lost: "The layout inside an RPC's parameter blob is nowhere in the file. Fields were " +
          "found by scanning bit offsets until one reproduced a known case. The rest stayed " +
          "undecoded.",
        meta: ["ReplicatedMovement", "PlayerName", "TeamId", "CompressedPing", "bIsAlive",
               "KillerRef", "CurrentClipSize", "Multicast_SendEndGameStats"],
        num: "",
        src: "tools/replay_decode.py, receive_properties"
      },
      {
        key: "match", name: "One match",
        inp: "The decoded event stream for a single replay.",
        out: "Tracks, shots, health over time, deaths with a range, heat, a scoreboard, in " +
          "matches/<id>.json.",
        lost: "Positions arrive quantised. Many samples come out a hundred times too large and " +
          "get rescaled. About half of kills have no usable position, and no range.",
        meta: ["4 s position tolerance", "2000 m range cap", "rescale /100"],
        num: NUM(f.matches) + " views",
        src: "tools/replay_site.py, build"
      },
      {
        key: "archive", name: "The archive",
        inp: "Every decoded match, in capture order.",
        out: "site_data.json and stats.json. Rosters, per tank and per map rollups, histograms, " +
          "curves, matchups.",
        lost: "Everything a per match view did not keep. Component choices go past in the raw " +
          "decode as effect paths and are dropped. An aggregate would mean decoding every " +
          "file again.",
        meta: [NUM(f.matches) + " matches", NUM(f.players) + " players",
               NUM(f.statKeys) + " keys in stats.json"],
        num: NUM(f.statKeys) + " keys",
        src: "tools/replay_to_site.py, aggregate and compute_stats"
      },
      {
        key: "page", name: "This page",
        inp: "Two JSON files, fetched once.",
        out: "Every panel on this site, drawn in your browser.",
        lost: "Nothing further. Every number on the site is one of those keys, or arithmetic " +
          "on them.",
        meta: ["site_data.json", "stats.json", "tyrhq_official.json"],
        num: "",
        src: "site/app.js and site/suites/*.js"
      }
    ];
  }

  function flowSvg(list, sel) {
    var i, y, s, out = "";
    var top = 26, step = 58, x = 26;
    var bottom = top + (list.length - 1) * step;
    out += '<line class="pl-pipe" x1="' + x + '" y1="' + top + '" x2="' + x +
      '" y2="' + bottom + '"></line>';
    out += '<line class="pl-pipe-run" x1="' + x + '" y1="' + top + '" x2="' + x +
      '" y2="' + bottom + '"></line>';
    for (i = 0; i < list.length; i++) {
      s = list[i];
      y = top + i * step;
      var isOn = s.key === sel;
      out += '<g>' +
        '<rect class="pl-hit" x="0" y="' + (y - 24) + '" width="302" height="48" ' +
        'data-stage="' + E(s.key) + '"><title>' + E(s.name) + "</title></rect>" +
        (isOn ? '<circle class="pl-halo" cx="' + x + '" cy="' + y + '" r="15"></circle>' : "") +
        '<circle class="' + (isOn ? "pl-node-on" : "pl-node") + '" cx="' + x + '" cy="' + y +
        '" r="' + (isOn ? 8 : 6) + '"></circle>' +
        '<text class="' + (isOn ? "pl-nt-on" : "pl-nt") + '" x="48" y="' + (y + 4) + '">' +
        E(s.name) + "</text>" +
        (s.num ? '<text class="pl-nm" x="298" y="' + (y + 4) + '" text-anchor="end">' +
          E(s.num) + "</text>" : "") +
        "</g>";
    }
    return '<svg viewBox="0 0 302 ' + (bottom + 26) + '" role="img" ' +
      'aria-label="The decode pipeline, nine stages">' + out + "</svg>";
  }

  function stageDetail(list, sel) {
    var i, s = null, idx = 0;
    for (i = 0; i < list.length; i++) if (list[i].key === sel) { s = list[i]; idx = i; }
    if (!s) return "";
    return '<div class="pl-det-step">Stage ' + (idx + 1) + " of " + list.length + "</div>" +
      "<h3>" + E(s.name) + "</h3>" +
      '<dl class="pl-io">' +
      "<dt>In</dt><dd>" + E(s.inp) + "</dd>" +
      "<dt>Out</dt><dd>" + E(s.out) + "</dd>" +
      "<dt>Lost</dt><dd class=\"pl-loss\">" + E(s.lost) + "</dd>" +
      "</dl>" +
      '<div class="pl-meta">' + s.meta.map(function (m) {
        return '<span class="pl-tag">' + E(m) + "</span>";
      }).join("") + "</div>" +
      '<div class="pl-src">' + E(s.src) + "</div>";
  }

  function flowPanel(T, f) {
    var list = stages(T, f);
    var body =
      '<p class="pl-lede">A replay is the packets one server sent one client. No scores. No ' +
      "averages. Nine steps stand between that and a number on this site, and every one of " +
      "them throws something away. <b>Pick a stage.</b></p>" +
      '<div class="pl-ctrls">' +
      '<button class="pl-btn" data-step="-1" type="button">Previous stage</button>' +
      '<button class="pl-btn" data-step="1" type="button">Next stage</button>' +
      '<span class="pl-ctrls-label" id="pl-flow-pos"></span></div>' +
      '<div class="pl-flow"><div id="pl-flow-svg">' + flowSvg(list, "file") + "</div>" +
      '<div class="pl-det" id="pl-flow-det">' + stageDetail(list, "file") + "</div></div>";
    var note = "Names and constants come straight from the tools. Counts are read live. " +
      "Spacing carries no timing and no cost.";
    return panel("The pipeline", body, note);
  }

  function wireFlow(T, root, f) {
    var list = stages(T, f), sel = "file";
    var svgBox = root.querySelector("#pl-flow-svg");
    var detBox = root.querySelector("#pl-flow-det");
    var posBox = root.querySelector("#pl-flow-pos");
    if (!svgBox || !detBox) return;

    function idxOf(k) {
      var i;
      for (i = 0; i < list.length; i++) if (list[i].key === k) return i;
      return 0;
    }
    function draw() {
      svgBox.innerHTML = flowSvg(list, sel);
      detBox.innerHTML = stageDetail(list, sel);
      if (posBox) posBox.innerHTML = E(list[idxOf(sel)].name);
      bindHits();
    }
    function bindHits() {
      on(svgBox, "[data-stage]", function (el) {
        sel = el.getAttribute("data-stage");
        draw();
      });
    }
    on(root, "[data-step]", function (el) {
      var d = parseInt(el.getAttribute("data-step"), 10) || 0;
      var i = idxOf(sel) + d;
      if (i < 0) i = list.length - 1;
      if (i >= list.length) i = 0;
      sel = list[i].key;
      draw();
    });
    draw();
  }

  // ----------------------------------------------------- 2. the header walk

  // The ReplayInfo header in parse order. kind: "k" a constant this build
  // always writes, "d" a value derived from what the site publishes, "n" a
  // value that is in the file and is not published anywhere on this site.
  function headerFields(match) {
    var build = match ? match.build : null;
    var ms = match && isNum(match.duration_sec) ? match.duration_sec * 1000 : null;
    return [
      { n: "magic", w: 4, kind: "k", bytes: le32(0x1CA2E27F), val: "0x1CA2E27F",
        why: "The first four bytes of every local Unreal replay. A mismatch is fatal." },
      { n: "fileVersion", w: 4, kind: "k", bytes: le32(7), val: "7",
        why: "Version 7 decides what follows: custom version block, timestamp, compression " +
          "and encryption flags. Older versions omit them." },
      { n: "customVersionCount", w: 4, kind: "n", bytes: null, val: "not published",
        why: "How many twenty byte custom version entries follow. Read to skip forward, then " +
          "thrown away." },
      { n: "custom version entries", w: 0, kind: "n", bytes: null, val: "20 bytes each",
        varLabel: "variable, 20 x count",
        why: "Where fixed offsets end. Every field below sits wherever the cursor lands." },
      { n: "lengthInMs", w: 4, kind: "d", bytes: ms == null ? null : le32(ms >>> 0),
        val: ms == null ? "-" : NUM(ms) + " ms",
        why: "Recorded length in milliseconds. The site keeps match length to the second, so " +
          "these are whole seconds times a thousand. The low bytes are wrong." },
      { n: "networkVersion", w: 4, kind: "k", bytes: le32(19), val: "19",
        why: "The demo network version. At 19 every frame carries a level index and its own " +
          "export data. That is why names take two passes." },
      { n: "changelist", w: 4, kind: "k", bytes: build == null ? null : le32(build),
        val: build == null ? "-" : String(build),
        why: "The game build that recorded the file. The only field here that varies across " +
          "the archive. A mismatch against the current build is a warning, not a rejection. " +
          "An old replay is old." },
      { n: "friendlyName", w: 0, kind: "n", bytes: null, val: "not published",
        varLabel: "variable string",
        why: "A length prefixed string the game chose. Second variable length region. Nothing " +
          "after it has a fixed offset either." },
      { n: "isLive", w: 4, kind: "k", bytes: le32(0), val: "0",
        why: "Zero when the game closed properly. Weak evidence: four plaintext bytes an editor " +
          "would flip first. The real check reads match phase out of the stream." },
      { n: "timestamp", w: 8, kind: "n", bytes: null, val: "not published",
        why: "Hundred nanosecond ticks since year 1. Not published. Match pages show the " +
          "file's modified time instead." },
      { n: "isCompressed", w: 4, kind: "k", bytes: le32(0), val: "0",
        why: "Zero across every file measured. The payloads are raw." },
      { n: "isEncrypted", w: 4, kind: "k", bytes: le32(0), val: "0",
        why: "Zero. No key, no signature, no checksum over the contents. One reason no single " +
          "uploaded file can be proved genuine." },
      { n: "encryptionKeySize", w: 4, kind: "k", bytes: le32(0), val: "0",
        why: "Read whenever the version says encryption exists. Zero every time here." }
    ];
  }

  function ribbonHtml(fields, sel) {
    var out = "", i, j, fl;
    for (i = 0; i < fields.length; i++) {
      fl = fields[i];
      var s = (i === sel) ? " sel" : "";
      if (fl.bytes) {
        for (j = 0; j < fl.bytes.length; j++) {
          out += '<span class="pl-byte ' + fl.kind + s + '" title="' + E(fl.n) + '">' +
            pad2(fl.bytes[j]) + "</span>";
        }
      } else if (fl.varLabel) {
        out += '<span class="pl-var' + s + '" title="' + E(fl.n) + '">' + E(fl.varLabel) +
          "</span>";
      } else {
        for (j = 0; j < fl.w; j++) {
          out += '<span class="pl-byte' + s + '" title="' + E(fl.n) +
            ', not published">&middot;&middot;</span>';
        }
      }
    }
    return out;
  }

  function fieldRows(fields, sel) {
    return fields.map(function (fl, i) {
      var w = fl.varLabel ? "var" : (fl.w + " B");
      return '<button class="pl-fld' + (i === sel ? " on" : "") + '" type="button" ' +
        'data-fld="' + i + '">' +
        '<span class="pl-fn">' + E(fl.n) + "</span>" +
        '<span class="pl-fw">' + E(w) + "</span>" +
        '<span class="pl-fv ' + fl.kind + '">' + E(fl.val) + "</span>" +
        '<span class="pl-fo">' + (fl.kind === "k" ? "constant for this build"
          : fl.kind === "d" ? "derived, approximate" : "in the file, not here") + "</span>" +
        "</button>";
    }).join("");
  }

  function pickMatches(T) {
    var ms = (T.DATA && T.DATA.matches) || [];
    var sorted = ms.slice().sort(function (a, b) {
      return (b.captured_unix || 0) - (a.captured_unix || 0);
    });
    var out = sorted.slice(0, 18), have = {}, i;
    for (i = 0; i < out.length; i++) have[out[i].build] = 1;
    for (i = 0; i < sorted.length; i++) {
      if (!have[sorted[i].build]) { have[sorted[i].build] = 1; out.push(sorted[i]); }
    }
    return out;
  }

  function bytesPanel(T) {
    var ms = pickMatches(T);
    if (!ms.length) return "";
    var opts = ms.map(function (m, i) {
      return '<option value="' + i + '">' + E(m.map || "?") + ", build " + E(m.build) +
        ", " + E(T.fmtDateTime ? T.fmtDateTime(m.captured_unix) : m.captured_unix) +
        "</option>";
    }).join("");
    var fields = headerFields(ms[0]);
    var body =
      '<p class="pl-lede">The decoder walks the header one field at a time. Two fields are ' +
      "variable length. Nothing below them has a fixed offset. <b>Click a field.</b></p>" +
      '<div class="pl-ctrls"><span class="pl-ctrls-label">Match</span>' +
      '<select class="pl-sel" id="pl-mt">' + opts + "</select></div>" +
      '<div class="pl-legend">' +
      '<span><i style="background:rgba(143,176,255,.55)"></i>constant this build always writes' +
      "</span>" +
      '<span><i style="background:rgba(201,162,39,.55)"></i>derived from published data</span>' +
      '<span><i style="background:rgba(255,255,255,.12)"></i>in the file, not published here' +
      "</span></div>" +
      '<div class="pl-ribbon pl-mono" id="pl-ribbon">' + ribbonHtml(fields, 0) + "</div>" +
      '<div class="pl-fields" id="pl-flds">' + fieldRows(fields, 0) + "</div>" +
      '<div class="pl-expl" id="pl-fexp">' + E(fields[0].why) + "</div>" +
      '<div class="pl-subh">And then the chunk table</div>' +
      '<p class="small" style="margin:0">After the header it is chunk type, chunk size, ' +
      "payload, repeated. The walk has to land on the last byte with nothing left over. Miss " +
      "one and the file is rejected before decoding.</p>";
    var note = "These bytes come from the parser's field order and widths. No replay bytes " +
      "reach your browser, and the variable length regions mean real fields would not sit here " +
      "anyway. Blue is constant for this build across every file measured. Amber is rebuilt " +
      "from a duration rounded to the second, so its low bytes are wrong.";
    return panel("Down to the byte", body, note);
  }

  function wireBytes(T, root) {
    var ms = pickMatches(T);
    if (!ms.length) return;
    var sel = 0, mi = 0;
    var rib = root.querySelector("#pl-ribbon");
    var box = root.querySelector("#pl-flds");
    var exp = root.querySelector("#pl-fexp");
    var mt = root.querySelector("#pl-mt");
    if (!rib || !box || !exp) return;

    function draw() {
      var fields = headerFields(ms[mi]);
      if (sel >= fields.length) sel = 0;
      rib.innerHTML = ribbonHtml(fields, sel);
      box.innerHTML = fieldRows(fields, sel);
      exp.innerHTML = E(fields[sel].why);
      on(box, "[data-fld]", function (el) {
        sel = parseInt(el.getAttribute("data-fld"), 10) || 0;
        draw();
      });
    }
    if (mt) {
      mt.addEventListener("change", function () {
        mi = parseInt(mt.value, 10) || 0;
        if (mi < 0 || mi >= ms.length) mi = 0;
        draw();
      });
    }
    draw();
  }

  // ------------------------------------------------------ 3. the bit reader

  // FIntPacked, exactly as the reader takes it apart: eight bits at a time,
  // bit 0 says another byte follows, bits 1 to 7 carry seven bits of value.
  function packInt(v) {
    var out = [];
    v = Math.max(0, Math.floor(v));
    do {
      var chunk = v % 128;
      v = Math.floor(v / 128);
      out.push({ payload: chunk, more: v > 0 });
      if (out.length >= 5) break;
    } while (v > 0);
    return out;
  }

  // FBitReader::SerializeInt. The width is not fixed: the loop stops as soon
  // as the value it has already read plus the next mask would reach the bound.
  function serBits(value, max) {
    var out = [], v = 0, mask = 1, guard = 0;
    while (v + mask < max && guard < 40) {
      var bit = (value & mask) ? 1 : 0;
      if (bit) v |= mask;
      out.push(bit);
      mask *= 2;
      guard += 1;
    }
    return { bits: out, value: v };
  }

  var SER_FIELDS = [
    { max: 16384, label: "bunch bit length", note: "MAX_PACKET_SIZE_IN_BITS" },
    { max: 2048, label: "network id count", note: "MAX_GUID_COUNT" },
    { max: 15, label: "channel close reason", note: "CHANNEL_CLOSE_REASON_MAX" }
  ];

  function bitCells(bits, contIdx) {
    var i, out = "";
    for (i = 0; i < bits.length; i++) {
      out += '<span class="pl-bit' + (bits[i] ? " one" : "") +
        (contIdx === i ? " cont" : "") + '">' + bits[i] + "</span>";
    }
    return out;
  }

  function packedView(v) {
    var groups = packInt(v), out = "", i, j, g, byteVal, bits;
    for (i = 0; i < groups.length; i++) {
      g = groups[i];
      byteVal = (g.payload * 2) + (g.more ? 1 : 0);
      bits = [];
      for (j = 0; j < 8; j++) bits.push((byteVal >> j) & 1);
      out += '<div class="pl-bgrp"><div class="pl-brow">' + bitCells(bits, 0) + "</div>" +
        '<div class="pl-bcap"><span>0x' + pad2(byteVal) + "</span><span>+" +
        NUM(g.payload * Math.pow(128, i)) + "</span></div></div>";
    }
    return out;
  }

  function serView(v, max) {
    var r = serBits(v, max);
    if (!r.bits.length) {
      return '<div class="pl-bgrp"><div class="pl-brow">' +
        '<span class="pl-bit">-</span></div>' +
        '<div class="pl-bcap"><span>0 bits</span><span>bound too small</span></div></div>';
    }
    return '<div class="pl-bgrp"><div class="pl-brow">' + bitCells(r.bits, -1) + "</div>" +
      '<div class="pl-bcap"><span>' + r.bits.length + " bits</span><span>reads " +
      NUM(r.value) + "</span></div></div>";
  }

  function costTable(mode, max) {
    var samples = mode === "packed"
      ? [0, 5, 127, 128, 1000, 16383, 200000]
      : [0, 1, max > 8 ? Math.floor(max / 8) : 1, Math.floor(max / 2), max - 2, max - 1];
    var seen = {}, rows = "";
    samples.forEach(function (v) {
      if (v < 0 || seen[v]) return;
      seen[v] = 1;
      var cost = mode === "packed"
        ? packInt(v).length * 8 + " bits"
        : serBits(v, max).bits.length + " bits";
      rows += '<div class="pl-costrow"><span>' + NUM(v) + "</span><b>" + cost + "</b></div>";
    });
    return '<div class="pl-cost"><div class="pl-cost-h">What a value costs</div>' +
      rows + "</div>";
  }

  function bitsPanel() {
    var body =
      '<p class="pl-lede">Below the container there are no bytes, only bits. Values start and ' +
      "end mid-byte, invisible to a hex editor. Least significant bit " +
      "first: bit <span class=\"pl-mono\">i</span> of the stream is bit " +
      "<span class=\"pl-mono\">i &amp; 7</span> of byte <span class=\"pl-mono\">i &gt;&gt; 3" +
      "</span>. <b>Move the slider.</b></p>" +
      '<div class="pl-ctrls"><span class="pl-ctrls-label">Encoding</span>' +
      '<button class="pl-btn on" type="button" data-bm="packed">Packed integer</button>' +
      '<button class="pl-btn" type="button" data-bm="ser">Bounded integer</button>' +
      "</div>" +
      '<div class="pl-ctrls" id="pl-serrow" hidden><span class="pl-ctrls-label">Bound</span>' +
      SER_FIELDS.map(function (s, i) {
        return '<button class="pl-btn' + (i === 0 ? " on" : "") + '" type="button" data-bx="' +
          i + '">' + E(String(s.max)) + '<span class="pl-sub">' + E(s.label) + "</span></button>";
      }).join("") + "</div>" +
      '<div class="pl-bitwrap"><div>' +
      '<div class="pl-slider"><span>value</span>' +
      '<input type="range" id="pl-bv" min="0" max="20000" step="1" value="1337">' +
      '<span id="pl-bvn" class="pl-mono">1337</span></div>' +
      '<div class="pl-bytes" id="pl-bits"></div>' +
      '<div class="pl-read" id="pl-bread"></div>' +
      "</div>" +
      '<div id="pl-bcost"></div></div>';
    var note = "The bits come from the decoder's two integer rules, run on your number. No " +
      "replay involved. A packed integer costs one byte per seven bits, which is cheap for " +
      "small numbers: channel indices, property handles. A bounded integer costs the bits " +
      "needed before the total could reach the bound. Constant for a power of two. Otherwise " +
      "it depends on the value, and under a bound of 15 the value 7 costs three bits while 3 " +
      "costs four. Quantised float vectors are not drawn.";
    return panel("Where the bits go", body, note);
  }

  function wireBits(root) {
    var mode = "packed", bx = 0;
    var bits = root.querySelector("#pl-bits");
    var read = root.querySelector("#pl-bread");
    var cost = root.querySelector("#pl-bcost");
    var slider = root.querySelector("#pl-bv");
    var vnum = root.querySelector("#pl-bvn");
    var serrow = root.querySelector("#pl-serrow");
    if (!bits || !read || !cost || !slider) return;

    function draw() {
      var v = parseInt(slider.value, 10) || 0;
      var max = SER_FIELDS[bx].max;
      if (mode === "ser" && v > max - 1) v = Math.max(0, max - 1);
      if (vnum) vnum.innerHTML = NUM(v);
      if (serrow) serrow.hidden = (mode !== "ser");
      if (mode === "packed") {
        var g = packInt(v);
        bits.innerHTML = packedView(v);
        read.innerHTML = "<b>" + NUM(v) + "</b> costs <b>" + (g.length * 8) +
          " bits</b> in " + g.length + " group" + (g.length === 1 ? "" : "s") +
          ".<br>The amber bit says another group follows. The other seven carry the value, " +
          "least significant group first.";
      } else {
        var r = serBits(v, max);
        var pow2 = max > 0 && (max & (max - 1)) === 0;
        bits.innerHTML = serView(v, max);
        read.innerHTML = "<b>" + NUM(v) + "</b> under a bound of <b>" + NUM(max) +
          "</b> costs <b>" + r.bits.length + " bits</b>.<br>" +
          "The reader stops once what it has plus the next mask would reach " + NUM(max) + ". " +
          (pow2 ? "A power of two: every value costs the same."
            : "Not a power of two: the width depends on the value.");
      }
      cost.innerHTML = costTable(mode, max);
    }
    on(root, "[data-bm]", function (el) {
      mode = el.getAttribute("data-bm");
      var all = root.querySelectorAll("[data-bm]"), i;
      for (i = 0; i < all.length; i++) all[i].className = "pl-btn";
      el.className = "pl-btn on";
      draw();
    });
    on(root, "[data-bx]", function (el) {
      bx = parseInt(el.getAttribute("data-bx"), 10) || 0;
      var all = root.querySelectorAll("[data-bx]"), i;
      for (i = 0; i < all.length; i++) all[i].className = "pl-btn";
      el.className = "pl-btn on";
      draw();
    });
    slider.addEventListener("input", draw);
    slider.addEventListener("change", draw);
    draw();
  }

  // ---------------------------------------------------- 4. what is in there

  // codename on the wire -> the name shown, and how that link was made.
  // Copied from TANK_DISPLAY in tools/replay_site.py.
  var CODENAMES = [
    ["Bush", "Ark", "archetype class"], ["Healer", "Valor", "archetype class"],
    ["Stealth", "Phantom", "archetype class"], ["Ram", "Maul", "archetype class"],
    ["Sonar", "Atlas", "archetype class"], ["Blink", "Alecto", "archetype class"],
    ["Drone", "Kestrel", "archetype class"], ["Ranger", "Ranger", "archetype class"],
    ["Vanguard", "Vanguard", "archetype class"], ["Deadeye", "Deadeye", "archetype class"],
    ["Vtol", "Ikarus", "asked in game"], ["SentinelTank", "Tricera", "asked in game"],
    ["CanOpener", "Arbalest", "asked in game"], ["Brawler", "Fortis", "inferred"],
    ["Tempest", "Tempest", "max health"], ["Helio", "Helio", "max health"],
    ["Rook", "Rook", "max health"]
  ];

  function covRow(label, good, total, sub) {
    var pct = total > 0 ? (good / total) * 100 : 0;
    return '<div class="pl-cov-r"><div>' + E(label) +
      (sub ? ' <span class="small">' + E(sub) + "</span>" : "") + "</div>" +
      '<div class="pl-cov-bar"><i style="width:' + pct.toFixed(1) + "%;background:" + LIT +
      '"></i><i style="width:' + (100 - pct).toFixed(1) +
      '%;background:rgba(255,255,255,.06)"></i></div>' +
      '<div class="pl-cov-n"><b>' + NUM(good) + "</b> / " + NUM(total) + "</div></div>";
  }

  function archivePanel(T, f) {
    if (!f.matches) return "";
    var buildBits = f.builds.map(function (b) {
      return E(b.build) + " (" + NUM(b.count) + ")";
    }).join(", ");
    var body =
      '<div class="pl-cov">' +
      covRow("Matches with a confirmed ending", f.decided, f.matches,
        "elimination or capture") +
      covRow("Matches with a full 16 player roster", f.fullRoster, f.matches) +
      covRow("Player rows with a named tank", f.namedTank, f.rows) +
      covRow("Published maps that have appeared", f.officialMaps,
        f.officialMapsListed, "released and prototype") +
      covRow("Matches naming an uploader", f.credited, f.matches) +
      covRow("Matches uploaded twice", f.corroborated, f.matches) +
      "</div>" +
      '<div class="pl-subh">What the wire calls each tank</div>' +
      '<div class="pl-names">' + CODENAMES.map(function (r) {
        return '<div class="pl-name"><span class="pl-wire">' + E(r[0]) + "</span>" +
          '<span class="pl-arrow">&rarr;</span><span class="pl-disp">' + E(r[1]) +
          '<span class="pl-how">' + E(r[2]) + "</span></span></div>";
      }).join("") + "</div>";
    var note = "Counts read live over " + NUM(f.matches) + " matches, " + NUM(f.rows) +
      " player rows and " + NUM(f.players) + " players, across builds " + E(buildBits) +
      ". Each tank tag says how the link was made, strongest first: ten from the pawn's " +
      "archetype class against the published roster, three confirmed in game, one the last " +
      "unnamed slot, three by matching lowest observed max health to the stat sheet. Tanks " +
      "that have appeared, not tanks that exist.";
    return panel("What the archive contains", body, note);
  }

  // ------------------------------------------------------------- 5. limits

  function limitCards(f) {
    return [
      {
        t: "Hit rate and accuracy", v: "Does not exist here.",
        b: "Shots fired are countable off the ammunition component. Hits are not. The server " +
          "sends no per shot outcome, and no accuracy panel can be built out of these files.",
        s: "tools/replay_decode.py, decode_damage_events"
      },
      {
        t: "Penetration", v: "Published. Not measured.",
        b: "Penetrated or bounced is not in the stream. Every penetration figure on the site " +
          "was typed by hand from the published sheet into a file the pipeline cannot write " +
          "to. That is what keeps the two sides independent.",
        s: "site/tyrhq_official.json"
      },
      {
        t: "Who did that damage", v: "Attempted twice, then dropped.",
        b: "Two broadcasts carry the clue: one on a death, one on a blocked hit. The blocked " +
          "one hides a magnitude and an instigator somewhere in its parameter bits. Two " +
          "attempts to find that instigator failed against known cases. The decoder returns " +
          "an empty list, and no page here attributes a hit to anyone.",
        s: "decode_damage_events returns [] unconditionally"
      },
      {
        t: "Damage taken", v: "On no scoreboard.",
        b: "The end of match broadcast carries damage dealt, assist, blocked and kills. No " +
          "damage taken. Replicated health over time is the stand-in: when a tank lost health " +
          "and how much. Who took it went down with the attribution above.",
        s: "Multicast_SendEndGameStats"
      },
      {
        t: "How the match ended",
        v: NUM(f.wt.unknown) + " of " + NUM(f.matches) + " are recorded as unknown.",
        b: "Elimination is confirmed when exactly one team's health pool hits zero. Capture " +
          "comes from a separate last stand field. Neither signal, and the ending stays null. " +
          "An earlier check read the capture zone's own flags and came out backwards on all " +
          "three known capture matches, which is how the quieter signal won the job.",
        s: "derive_match_result and derive_last_stand_winner"
      },
      {
        t: "Tank names", v: "The wire says Blink, not Alecto.",
        b: "No display name is anywhere in the stream. Seventeen codenames have been matched " +
          "to one, by four routes of differing strength; three rest on lining up observed max " +
          "health with a published sheet. An unmatched codename shows as no tank at all. Two " +
          "player rows have none.",
        s: "TANK_DISPLAY in tools/replay_site.py"
      },
      {
        t: "Ranges", v: "Approximate, and half of kills are missing.",
        b: "A range is the flat distance between two position samples at the moment of a kill. " +
          "Both tanks need a sample inside four seconds. About half of kills are enemies the " +
          "recording client could not see. Anything past two kilometres is dropped as a " +
          "glitch. Positions arrive quantised, many of them a hundred times too large.",
        s: "_kill_range_m, tolerance 4 s, cap 2000 m"
      },
      {
        t: "Which components a player ran", v: "Seen once, not kept.",
        b: "Component effects go past in the raw decode as gameplay effect paths. The per " +
          "match views drop them. An aggregate would mean changing the decoder and running " +
          "every file through again.",
        s: "notes/TODO.md"
      },
      {
        t: "That any single file is genuine", v: "Not provable.",
        b: "Tyr does not sign, encrypt or compress its replays. Every verifier check raises " +
          "the cost of a forgery. None of them proves the bytes are untouched. Only a second " +
          "player uploading the same match does that.",
        s: "tools/replay_verify.py, verdict"
      }
    ];
  }

  function limitsPanel(f) {
    var cards = limitCards(f);
    var body =
      '<p class="pl-lede">Read this panel first. Nine questions the site gets asked and cannot ' +
      "answer, each with its reason. <b>Click a card.</b></p>" +
      '<div class="pl-lims">' + cards.map(function (c, i) {
        return '<div class="pl-lim" data-limbox="' + i + '">' +
          '<button class="pl-limh" type="button" data-lim="' + i + '">' +
          '<span class="pl-limmore">more</span>' +
          '<span class="pl-limt">' + E(c.t) + "</span>" +
          '<span class="pl-limv">' + E(c.v) + "</span></button>" +
          '<div class="pl-limc">' + E(c.b) + '<div class="pl-src">' + E(c.s) +
          "</div></div></div>";
      }).join("") + "</div>";
    var note = "Nine limits. Not a complete list. Each one is a decision in the tools: publish " +
      "nothing before publishing a number no known case could check. The unknown-endings " +
      "count is read live.";
    return panel("What this cannot know", body, note);
  }

  function wireLimits(root) {
    on(root, "[data-lim]", function (el) {
      var i = el.getAttribute("data-lim");
      var box = root.querySelector('[data-limbox="' + i + '"]');
      if (!box) return;
      var isOn = box.className.indexOf("on") >= 0;
      box.className = isOn ? "pl-lim" : "pl-lim on";
      var more = el.querySelector(".pl-limmore");
      if (more) more.innerHTML = isOn ? "more" : "less";
    });
  }

  // -------------------------------------------------------- 6. verification

  var TIERS = [
    ["L1 file", "Size in range, header parses, magic right, chunk table accounts for every " +
      "byte. Not compressed, not encrypted, header chunk present, build fingerprint, official " +
      "map, plausible timestamp."],
    ["L2 stream", "The net stream decodes. Matchmaking, not a custom lobby. Official mode by " +
      "tag name, since indices are renumbered every build. Server issued match id, final phase " +
      "reached, a full eight against eight, header duration within fifteen seconds of the stream."],
    ["L3 anomalies", "No decoder warnings beyond five classes known to be harmless."],
    ["L4 consistency", "The death timeline agrees with itself, scoreboard names match the " +
      "roster, survival times fall inside the match, every position is finite and in the world."],
    ["L6 identity", "The recording player is identified from channels only their own client " +
      "receives, and compared against the uploading account."],
    ["L5 corroboration", "Another player's upload of the same match id agrees on the roster. " +
      "The one check a lone forger cannot beat. It needs someone else to turn up.", true]
  ];

  function verifyPanel(T, f) {
    if (!f.matches) return "";
    var ms = (T.DATA.matches || []).slice().sort(function (a, b) {
      return (a.captured_unix || 0) - (b.captured_unix || 0);
    });
    var cells = ms.map(function (m) {
      var n = (m.uploaded_by_ids || []).length;
      var who = n && T.SHOW_PLAYER_PAGES && m.uploaded_by
        ? ", uploaded by " + m.uploaded_by.join(" and ") : n ? ", uploaded" : "";
      return '<span class="pl-cell' + (n ? " up" : "") + '" data-up="' + n + '" title="' +
        E((m.map || "?") + who) + '"></span>';
    }).join("");
    var body =
      '<p class="pl-lede">Tyr does not sign its replays. No key, no checksum, no signature. A ' +
      "file on its own cannot be proved untouched. The verifier runs twenty six checks in six " +
      "tiers: five raise the cost of a forgery, one settles it. <b>Filter the archive.</b></p>" +
      '<div class="pl-verdict">' +
      '<div class="pl-vd"><b>REJECTED</b>a blocking check failed</div>' +
      '<div class="pl-vd"><b>VERIFIED</b>passed everything one file can be asked</div>' +
      '<div class="pl-vd"><b>CORROBORATED</b>a second upload agrees</div>' +
      "</div>" +
      '<div class="pl-tiers">' + TIERS.map(function (t) {
        return '<div class="pl-tier' + (t[2] ? " pl-tier-key" : "") + '"><b>' + E(t[0]) +
          "</b><span>" + E(t[1]) + "</span></div>";
      }).join("") + "</div>" +
      '<div class="pl-subh">Every match in the archive</div>' +
      '<div class="pl-ctrls">' +
      '<button class="pl-btn on" type="button" data-up="all">All<span class="pl-sub">' +
      NUM(f.matches) + "</span></button>" +
      '<button class="pl-btn" type="button" data-up="yes">Names an uploader' +
      '<span class="pl-sub">' + NUM(f.credited) + "</span></button>" +
      '<button class="pl-btn" type="button" data-up="no">No uploader named' +
      '<span class="pl-sub">' + NUM(f.matches - f.credited) + "</span></button>" +
      '<button class="pl-btn" type="button" data-up="two">Uploaded twice' +
      '<span class="pl-sub">' + NUM(f.corroborated) + "</span></button></div>" +
      '<div class="pl-grid" id="pl-vgrid">' + cells + "</div>" +
      '<div class="pl-read" id="pl-vread"></div>';
    var note = "One square per match, oldest first. Position means nothing else. " +
      NUM(f.credited) + " of " + NUM(f.matches) + " name an uploader, across " +
      NUM(f.uploaders) + " accounts. The rest came off the site owner's disk, outside the " +
      "upload path. " + (f.corroborated ? NUM(f.corroborated) +
      " matches were uploaded by two different players." : "No match has been uploaded twice. " +
      "The one check that would settle authenticity has yet to fire.") +
      " This page shows only whether more than one person supplied a copy. It runs no checks " +
      "and holds no per file result.";
    return panel("Nothing here is signed", body, note);
  }

  function wireVerify(T, root, f) {
    var grid = root.querySelector("#pl-vgrid");
    var read = root.querySelector("#pl-vread");
    if (!grid || !read) return;
    function apply(mode) {
      var cells = grid.querySelectorAll("[data-up]"), i, n = 0;
      for (i = 0; i < cells.length; i++) {
        var v = parseInt(cells[i].getAttribute("data-up"), 10) || 0;
        var keep = mode === "all" || (mode === "yes" && v > 0) ||
          (mode === "no" && v === 0) || (mode === "two" && v > 1);
        if (keep) n += 1;
        cells[i].className = "pl-cell" + (v ? " up" : "") + (keep ? "" : " dim");
      }
      var txt;
      if (mode === "all") {
        txt = "<b>" + NUM(n) + "</b> matches in the archive.";
      } else if (mode === "yes") {
        txt = "<b>" + NUM(n) + "</b> matches came through the upload path and name the sending " +
          "account, across " + NUM(f.uploaders) + " accounts.";
      } else if (mode === "no") {
        txt = "<b>" + NUM(n) + "</b> matches came off local disk. Real decodes, nobody to " +
          "attribute them to.";
      } else {
        txt = n
          ? "<b>" + NUM(n) + "</b> matches were uploaded independently by two players."
          : "<b>None.</b> No match in this archive is corroborated. That is the state of it, " +
            "not a rendering fault.";
      }
      read.innerHTML = txt;
    }
    on(root, ".pl-btn[data-up]", function (el) {
      var mode = el.getAttribute("data-up");
      if (mode !== "all" && mode !== "yes" && mode !== "no" && mode !== "two") return;
      var all = root.querySelectorAll(".pl-btn[data-up]"), i;
      for (i = 0; i < all.length; i++) all[i].className = "pl-btn";
      el.className = "pl-btn on";
      apply(mode);
    });
    apply("all");
  }

  // ------------------------------------------------- 7. the reload check

  function reloadRows(T) {
    var tanks = (T.DATA && T.DATA.tanks) || [];
    var byTank = (T.OFFICIAL && T.OFFICIAL.byTank) || {};
    var single = {};
    ((T.STATS && T.STATS.reload_by_tank) || []).forEach(function (r) { single[r.label] = r; });
    var out = [];
    tanks.forEach(function (t) {
      var o = byTank[t.tank];
      if (!o || !isNum(t.reload_sec) || !isNum(o.reload_s) || o.reload_s <= 0) return;
      var diff = ((t.reload_sec - o.reload_s) / o.reload_s) * 100;
      out.push({
        tank: t.tank, meas: t.reload_sec, pub: o.reload_s, diff: diff,
        burst: isNum(t.burst_sec) ? t.burst_sec : null,
        single: single[t.tank] && isNum(single[t.tank].value) ? single[t.tank].value : null,
        n: single[t.tank] && isNum(single[t.tank].matches) ? single[t.tank].matches : null,
        exact: t.reload_sec === o.reload_s,
        near: Math.abs(diff) <= 1
      });
    });
    return out;
  }

  function reloadChart(rows) {
    if (!rows.length) return "";
    var W = 960, rowH = 24, gap = 8, labelW = 84, padR = 236;
    var H = rows.length * (rowH + gap) + 26;
    var maxV = 0;
    rows.forEach(function (r) { maxV = Math.max(maxV, r.meas, r.pub); });
    var top = Math.ceil(maxV / 5) * 5 || 5;
    var plotW = W - labelW - padR;
    function sx(v) { return labelW + 12 + (v / top) * plotW; }
    var g, out = "";
    for (g = 0; g <= top; g += 5) {
      out += '<line class="pl-ct-g" x1="' + sx(g).toFixed(1) + '" y1="0" x2="' +
        sx(g).toFixed(1) + '" y2="' + (H - 24) + '"></line>' +
        '<text class="pl-ct" x="' + sx(g).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle">' + g + "s</text>";
    }
    rows.forEach(function (r, i) {
      var y = i * (rowH + gap), mid = y + rowH / 2;
      var xa = sx(r.meas), xb = sx(r.pub);
      var col = r.exact ? "#6f9a4a" : r.near ? "#c9a227" : "#c0704a";
      out += '<text class="pl-ct-l" x="' + labelW + '" y="' + (mid + 4) +
        '" text-anchor="end">' + E(r.tank) + "</text>" +
        '<line x1="' + Math.min(xa, xb).toFixed(1) + '" y1="' + mid + '" x2="' +
        Math.max(xa, xb).toFixed(1) + '" y2="' + mid + '" stroke="' + col +
        '" stroke-width="3" stroke-linecap="round" opacity="' +
        (r.exact ? "0" : "0.75") + '"></line>' +
        '<circle cx="' + xb.toFixed(1) + '" cy="' + mid + '" r="6" fill="' + DERIVED +
        '" opacity="0.9"><title>' + E(r.tank + " published " + sec2(r.pub) + " s") +
        "</title></circle>" +
        '<circle cx="' + xa.toFixed(1) + '" cy="' + mid + '" r="5" fill="' + LIT +
        '"><title>' + E(r.tank + " measured " + sec2(r.meas) + " s") + "</title></circle>" +
        '<text class="pl-ct" x="' + (W - padR + 44) + '" y="' + (mid + 4) +
        '" text-anchor="end">' + E(sec2(r.meas)) + "</text>" +
        '<text class="pl-ct" x="' + (W - padR + 108) + '" y="' + (mid + 4) +
        '" text-anchor="end">' + E(sec2(r.pub)) + "</text>" +
        '<text class="pl-ct" x="' + (W - padR + 178) + '" y="' + (mid + 4) +
        '" text-anchor="end" fill="' + col + '">' +
        E(r.exact ? "exact" : (r.diff > 0 ? "+" : "") + r.diff.toFixed(1) + "%") + "</text>" +
        '<text class="pl-ct" x="' + (W - 4) + '" y="' + (mid + 4) +
        '" text-anchor="end">' + (r.n == null ? "" : E(NUM(r.n))) + "</text>";
    });
    out += '<text class="pl-ct" x="' + (W - padR + 44) + '" y="' + (H - 8) +
      '" text-anchor="end">meas</text>' +
      '<text class="pl-ct" x="' + (W - padR + 108) + '" y="' + (H - 8) +
      '" text-anchor="end">pub</text>' +
      '<text class="pl-ct" x="' + (W - 4) + '" y="' + (H - 8) +
      '" text-anchor="end">matches</text>';
    return '<svg class="pl-chart" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMinYMin meet" role="img" ' +
      'aria-label="Measured reload against the published figure, per tank">' + out + "</svg>";
  }

  function burstChart(rows) {
    var list = rows.filter(function (r) { return r.burst != null; });
    if (!list.length) return '<p class="pl-empty">No tank in the archive shows two reload ' +
      "modes.</p>";
    list.sort(function (a, b) { return b.meas - a.meas; });
    var W = 960, rowH = 24, gap = 8, labelW = 84, padR = 250;
    var H = list.length * (rowH + gap) + 26;
    var top = 20, i;
    list.forEach(function (r) { top = Math.max(top, Math.ceil(r.meas / 5) * 5); });
    var plotW = W - labelW - padR;
    function sx(v) { return labelW + 12 + (v / top) * plotW; }
    var out = "";
    for (i = 0; i <= top; i += 5) {
      out += '<line class="pl-ct-g" x1="' + sx(i).toFixed(1) + '" y1="0" x2="' +
        sx(i).toFixed(1) + '" y2="' + (H - 24) + '"></line>' +
        '<text class="pl-ct" x="' + sx(i).toFixed(1) + '" y="' + (H - 8) +
        '" text-anchor="middle">' + i + "s</text>";
    }
    list.forEach(function (r, k) {
      var y = k * (rowH + gap), mid = y + rowH / 2;
      out += '<text class="pl-ct-l" x="' + labelW + '" y="' + (mid + 4) +
        '" text-anchor="end">' + E(r.tank) + "</text>" +
        '<line x1="' + sx(r.burst).toFixed(1) + '" y1="' + mid + '" x2="' +
        sx(r.meas).toFixed(1) + '" y2="' + mid +
        '" stroke="rgba(184,164,230,.35)" stroke-width="3" stroke-linecap="round"></line>' +
        '<circle cx="' + sx(r.burst).toFixed(1) + '" cy="' + mid + '" r="5" fill="#6f9a4a">' +
        "<title>" + E(r.tank + " burst " + sec2(r.burst) + " s") + "</title></circle>" +
        '<circle cx="' + sx(r.meas).toFixed(1) + '" cy="' + mid + '" r="5" fill="' + LIT +
        '"><title>' + E(r.tank + " magazine " + sec2(r.meas) + " s") + "</title></circle>" +
        (r.single == null ? "" : '<circle cx="' + sx(r.single).toFixed(1) + '" cy="' + mid +
          '" r="3.5" fill="none" stroke="#c0704a" stroke-width="1.6"><title>' +
          E(r.tank + " single figure " + sec2(r.single) + " s") + "</title></circle>") +
        '<text class="pl-ct" x="' + (W - padR + 60) + '" y="' + (mid + 4) +
        '" text-anchor="end">' + E(sec2(r.burst)) + "</text>" +
        '<text class="pl-ct" x="' + (W - padR + 136) + '" y="' + (mid + 4) +
        '" text-anchor="end">' + E(sec2(r.meas)) + "</text>" +
        '<text class="pl-ct" x="' + (W - padR + 220) + '" y="' + (mid + 4) +
        '" text-anchor="end" fill="#c0704a">' +
        (r.single == null ? "-" : E(sec2(r.single))) + "</text>";
    });
    out += '<text class="pl-ct" x="' + (W - padR + 60) + '" y="' + (H - 8) +
      '" text-anchor="end">burst</text>' +
      '<text class="pl-ct" x="' + (W - padR + 136) + '" y="' + (H - 8) +
      '" text-anchor="end">magazine</text>' +
      '<text class="pl-ct" x="' + (W - padR + 220) + '" y="' + (H - 8) +
      '" text-anchor="end">one figure</text>';
    return '<svg class="pl-chart" viewBox="0 0 ' + W + " " + H +
      '" preserveAspectRatio="xMinYMin meet" role="img" ' +
      'aria-label="Magazine reload against burst interval, per autoloader">' + out + "</svg>";
  }

  function reloadPanel(T) {
    var rows = reloadRows(T);
    if (rows.length < 5) return "";
    var exact = 0, near = 0, off = 0, low = 0;
    rows.forEach(function (r) {
      if (r.exact) exact += 1;
      else if (r.near) near += 1;
      else { off += 1; if (r.diff < 0) low += 1; }
    });
    var sorted = rows.slice().sort(function (a, b) {
      return Math.abs(b.diff) - Math.abs(a.diff);
    });
    var fetched = (T.OFFICIAL && T.OFFICIAL._fetched) || "";
    var body =
      '<p class="pl-lede">Reload is the one number that exists on both sides. Measured off the ' +
      "ammunition timer in the stream. Published on the game's sheet, typed by hand into a " +
      "file the pipeline cannot write to. A broken decode would show up right here. " +
      "<b>Switch the view.</b></p>" +
      '<div class="stat-grid" style="margin-bottom:14px">' +
      T.card("Exact match", NUM(exact) + " of " + NUM(rows.length)) +
      T.card("Within one percent", NUM(exact + near) + " of " + NUM(rows.length)) +
      T.card("Further off", NUM(off)) +
      T.card("Of those, measured low", NUM(low) + " of " + NUM(off)) +
      "</div>" +
      '<div class="pl-ctrls">' +
      '<button class="pl-btn on" type="button" data-rl="cmp">Against the published sheet' +
      "</button>" +
      '<button class="pl-btn" type="button" data-rl="burst">The autoloaders</button>' +
      '<span class="pl-ctrls-label" id="pl-rlab"></span></div>' +
      '<div id="pl-rchart">' + reloadChart(sorted) + "</div>";
    var note = "Sorted by the gap. Measured values come from the ammunition component's timer " +
      "during play, pooled over every match a tank appeared in; the match count sits on each " +
      "row. Published values were copied from the community stat sheet" +
      (fetched ? " on " + E(fetched) : "") + ". No panel measures them, and that is what " +
      "makes the agreement worth reporting. Two cautions. All " + NUM(off) +
      " disagreements run measured-below-published, the direction a reload reducing effect " +
      "would push them. Call that an explanation offered, not a measurement: no panel here " +
      "isolates a module. And three tank names were identified by matching observed health to " +
      "this same sheet, which makes those three less independent, though the reload column is " +
      "untouched by it.";
    return panel("A cross check that came out right", body, note);
  }

  function wireReload(T, root) {
    var rows = reloadRows(T);
    var box = root.querySelector("#pl-rchart");
    var lab = root.querySelector("#pl-rlab");
    if (!box) return;
    var sorted = rows.slice().sort(function (a, b) {
      return Math.abs(b.diff) - Math.abs(a.diff);
    });
    function draw(mode) {
      if (mode === "burst") {
        box.innerHTML = burstChart(rows);
        if (lab) {
          lab.innerHTML = "The published sheet carries one reload per tank. Nothing to " +
            "compare against.";
        }
      } else {
        box.innerHTML = reloadChart(sorted);
        if (lab) lab.innerHTML = "";
      }
    }
    on(root, "[data-rl]", function (el) {
      var all = root.querySelectorAll("[data-rl]"), i;
      for (i = 0; i < all.length; i++) all[i].className = "pl-btn";
      el.className = "pl-btn on";
      draw(el.getAttribute("data-rl"));
    });
    draw("cmp");
  }

  // ------------------------------------------------------------ stat cards

  function cardsHtml(T, f) {
    if (!f.matches) return "";
    var out = [
      T.card("Replays decoded", NUM(f.matches)),
      T.card("Player rows recovered", NUM(f.rows)),
      T.card("Aggregate keys published", NUM(f.statKeys)),
      T.card("Endings not confirmed", NUM(f.wt.unknown)),
      T.card("Matches uploaded twice", NUM(f.corroborated))
    ];
    return '<div class="stat-grid pl-cards">' + out.join("") + "</div>" +
      '<p class="small" style="margin-top:-8px">Counted from the two published JSON files at ' +
      "render time. Nothing is typed in.</p>";
  }

  // --------------------------------------------------------------- preview

  function preview(T) {
    var D = T.DATA || {}, S = T.STATS || {};
    var steps = [
      { v: 0, l: "rows" }, { v: (D.players || []).length, l: "players" },
      { v: (D.matches || []).length, l: "matches" },
      { v: (D.clans || []).length, l: "clans" },
      { v: Object.keys(S).length, l: "keys" },
      { v: (D.tanks || []).length, l: "tanks" },
      { v: (D.maps || []).length, l: "maps" }
    ];
    (D.matches || []).forEach(function (m) { steps[0].v += (m.players || []).length; });
    var i, ok = true;
    for (i = 0; i < steps.length; i++) if (!steps[i].v) ok = false;
    if (!ok) return "";
    var max = steps[0].v;
    var out = "", pts = [], h = 26, top = 16;
    for (i = 0; i < steps.length; i++) {
      var w = 22 + 190 * (Math.log(steps[i].v) / Math.log(max));
      var y = top + i * h;
      pts.push([120 - w / 2, y, 120 + w / 2]);
      out += '<rect x="' + (120 - w / 2).toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) +
        '" height="' + (h - 6) + '" rx="3" fill="' + LIT + '" opacity="' +
        (0.9 - i * 0.09).toFixed(2) + '"></rect>';
    }
    var left = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); });
    var right = pts.slice().reverse().map(function (p) {
      return p[2].toFixed(1) + "," + p[1].toFixed(1);
    });
    var poly = '<polygon points="' + left.concat(right).join(" ") +
      '" fill="' + ACCENT + '" opacity="0.28"></polygon>';
    return '<svg viewBox="0 0 240 240">' +
      '<rect width="240" height="240" fill="#0d0a16"></rect>' + poly + out + "</svg>";
  }

  // ----------------------------------------------------------------- suite

  function render(T) {
    TT = T;
    var f = facts(T);
    if (!f.matches) {
      return '<div class="panel avg-panel"><h2>Pipeline</h2>' +
        '<p class="small">No matches decoded yet. Nothing to describe.</p></div>';
    }
    var parts = [
      cardsHtml(T, f),
      flowPanel(T, f),
      bytesPanel(T),
      bitsPanel(),
      archivePanel(T, f),
      limitsPanel(f),
      verifyPanel(T, f),
      reloadPanel(T)
    ].filter(function (p) { return !!p; });
    return parts.join("");
  }

  function wire(T, root) {
    TT = T;
    var f = facts(T);
    try { wireFlow(T, root, f); } catch (e) { /* keep the other panels alive */ }
    try { wireBytes(T, root); } catch (e2) { /* ditto */ }
    try { wireBits(root); } catch (e3) { /* ditto */ }
    try { wireLimits(root); } catch (e4) { /* ditto */ }
    try { wireVerify(T, root, f); } catch (e5) { /* ditto */ }
    try { wireReload(T, root); } catch (e6) { /* ditto */ }
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "pipeline",
    title: "Pipeline",
    blurb: "Where every number here comes from, and what a replay cannot record.",
    accent: ACCENT,
    css: CSS,
    preview: preview,
    render: render,
    wire: wire
  });
})();

/* TYR suite: "Rhythm" -- the game's pulse in clock time and calendar time.
 *
 * Two sources, and they answer two DIFFERENT questions. Keeping them apart is
 * the whole point of this page:
 *
 *   1. T.DATA.steam.samples -- a concurrent-player sampler. It watches the
 *      whole playerbase whether or not anybody uploads anything. In the data
 *      this file was written against: 200 readings, about one every 54
 *      minutes, spanning roughly 12 days, with several multi-hour gaps and
 *      almost no weekend coverage. Every panel built on it prints its own
 *      sample count, because 200 readings is a real but modest window.
 *
 *   2. T.DATA.matches[].captured_unix -- when each archived match was played.
 *      This only knows about matches somebody uploaded, and the uploads are
 *      dominated by a handful of accounts, so it is a chart of when THOSE
 *      people play. It is never presented as playerbase timing.
 *
 * Hours are recomputed from unix timestamps with Date#getHours, so every
 * clock on this page is the reader's own local time. T.STATS.matches_by_hour
 * and matches_by_weekday carry the same histograms but are frozen to the
 * clock of the machine that built the site (checked: they are the local-time
 * histogram of captured_unix shifted by that machine's UTC offset), so they
 * are only used as a fallback when per-match timestamps are missing.
 *
 * ES5 only: var / function, no template literals, no arrow functions.
 */
(function () {
  var CSS = "" +
    ".rh-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:9px 16px;margin:2px 0 14px}" +
    ".rh-ctl-label{font-size:.68rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em}" +
    ".rh-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}" +
    ".rh-seg button{background:transparent;border:0;color:var(--dim);font:inherit;font-size:.78rem;padding:6px 13px;cursor:pointer}" +
    ".rh-seg button+button{border-left:1px solid var(--border)}" +
    ".rh-seg button.rh-on{background:rgba(67,111,131,.38);color:var(--text)}" +
    ".rh-seg button:hover{color:var(--text)}" +
    ".rh-read{margin-top:12px;padding-top:11px;border-top:1px solid var(--border);font-size:.87rem;line-height:1.75;min-height:3.4em}" +
    ".rh-read b{color:#8fc8e2;font-variant-numeric:tabular-nums}" +
    ".rh-read i{font-style:normal;color:var(--dim)}" +
    ".rh-clock{max-width:540px;margin:0 auto}" +
    ".rh-huge{font-size:3.1rem;line-height:1.05;font-weight:700;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,Menlo,monospace;color:#8fc8e2}" +
    ".rh-hero{display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;margin-bottom:14px}" +
    ".rh-hero p{margin:0;font-size:.95rem;line-height:1.7;max-width:46ch}" +
    ".rh-hero p b{color:var(--text);font-variant-numeric:tabular-nums}" +
    ".rh-hit{cursor:pointer}" +
    ".rh-scroll{overflow-x:auto;overflow-y:hidden}" +
    ".rh-fixed{display:block;max-width:none;height:auto}" +
    // fills the panel on a desktop, stops shrinking and scrolls on a phone
    ".rh-wide{display:block;width:100%;min-width:720px;height:auto}" +
    ".rh-key{display:flex;flex-wrap:wrap;gap:7px 16px;font-size:.73rem;color:var(--dim);margin:0 0 9px}" +
    ".rh-key i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px;font-style:normal}" +
    ".rh-sub{display:block;font-size:.68rem;color:var(--dim);font-weight:400;margin-top:3px;letter-spacing:0}" +
    ".rh-warn{margin:0 0 12px;padding:9px 12px;border-left:3px solid #c98b3a;background:rgba(201,139,58,.09);font-size:.84rem;line-height:1.7;color:var(--text);border-radius:0 6px 6px 0}";

  // ---------------------------------------------------------------- paint
  var ACC = "#436f83";          // the suite accent: the playerbase series
  var ACC_HI = "#8fc8e2";
  var ACC_LO = "#16202c";
  var WARM = "#c98b3a";         // anything sourced from uploads, never mixed
  var DOWN = "#b8483c";
  var UP = "#4e8c5a";

  function f1(n) { return Math.round(n * 10) / 10; }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function hex(c) {
    return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
  }
  function mix(a, b, t) {
    var A = hex(a), B = hex(b), o = "#";
    t = clamp(t, 0, 1);
    for (var i = 0; i < 3; i++) {
      var v = Math.round(A[i] + (B[i] - A[i]) * t).toString(16);
      o += v.length < 2 ? "0" + v : v;
    }
    return o;
  }

  function dayKey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function locDate(d, opt) {
    try { return d.toLocaleDateString(undefined, opt); } catch (e) { return dayKey(d); }
  }
  function dayLabel(d) { return locDate(d, { weekday: "short", month: "short", day: "numeric" }); }
  function dayShort(d) { return locDate(d, { month: "short", day: "numeric" }); }
  function dowLabel(d) { return locDate(d, { weekday: "short" }); }

  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  }

  function pctChange(a, b) {
    if (!a) return null;
    return Math.round(((b - a) / a) * 1000) / 10;
  }
  function signed(v) { return (v > 0 ? "+" : "") + v; }

  // -------------------------------------------------------------- geometry
  function pt(cx, cy, r, a) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
  function wedgePath(cx, cy, rIn, rOut, a0, a1) {
    var p0 = pt(cx, cy, rIn, a0), p1 = pt(cx, cy, rOut, a0),
        p2 = pt(cx, cy, rOut, a1), p3 = pt(cx, cy, rIn, a1);
    return "M" + f1(p0[0]) + " " + f1(p0[1]) +
           "L" + f1(p1[0]) + " " + f1(p1[1]) +
           "A" + f1(rOut) + " " + f1(rOut) + " 0 0 1 " + f1(p2[0]) + " " + f1(p2[1]) +
           "L" + f1(p3[0]) + " " + f1(p3[1]) +
           "A" + f1(rIn) + " " + f1(rIn) + " 0 0 0 " + f1(p0[0]) + " " + f1(p0[1]) + "Z";
  }
  // A polyline through points, broken wherever a value is null. A gap in the
  // sampler is a gap, not a dive to zero.
  function gapPath(vals, xAt, yAt) {
    var out = "", open = false;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] == null) { open = false; continue; }
      out += (open ? "L" : "M") + f1(xAt(i)) + " " + f1(yAt(vals[i]));
      open = true;
    }
    return out;
  }

  // ------------------------------------------------------------ the model
  //
  // Built once and cached. Everything downstream reads this, so there is one
  // place where "an hour" and "a day" are defined, and both are local.
  var _M = null;
  function model(T) {
    if (_M) return _M;
    var D = (T && T.DATA) || {};
    var raw = (D.steam && D.steam.samples) || [];
    var i, j;

    var list = [];
    for (i = 0; i < raw.length; i++) {
      var s = raw[i];
      if (!s || typeof s.t !== "number" || typeof s.count !== "number") continue;
      if (!isFinite(s.t) || !isFinite(s.count) || s.count < 0) continue;
      list.push({ t: s.t, c: s.count });
    }
    list.sort(function (a, b) { return a.t - b.t; });

    var hours = [];
    for (i = 0; i < 24; i++) hours.push({ h: i, n: 0, sum: 0, min: null, max: null, avg: null });

    var dayMap = {}, dayList = [], counts = [], gapMax = 0, gapAt = null;
    var hi = null, lo = null;

    for (i = 0; i < list.length; i++) {
      var t = list[i].t, c = list[i].c, d = new Date(t * 1000), h = d.getHours();
      counts.push(c);
      if (!hi || c > hi.c) hi = list[i];
      if (!lo || c < lo.c) lo = list[i];
      if (i) {
        var g = t - list[i - 1].t;
        if (g > gapMax) { gapMax = g; gapAt = list[i - 1].t; }
      }
      var hh = hours[h];
      hh.n++; hh.sum += c;
      if (hh.min === null || c < hh.min) hh.min = c;
      if (hh.max === null || c > hh.max) hh.max = c;

      var k = dayKey(d), day = dayMap[k];
      if (!day) {
        day = dayMap[k] = { key: k, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
                            cells: [], n: 0, filled: 0, sum: 0, min: null, max: null };
        for (j = 0; j < 24; j++) day.cells.push(null);
        dayList.push(day);
      }
      var cell = day.cells[h];
      if (!cell) { cell = day.cells[h] = { n: 0, sum: 0, t: t, v: 0 }; day.filled++; }
      cell.n++; cell.sum += c; cell.v = cell.sum / cell.n;
      day.n++; day.sum += c;
      if (day.min === null || c < day.min) day.min = c;
      if (day.max === null || c > day.max) day.max = c;
    }
    dayList.sort(function (a, b) { return a.date - b.date; });
    for (i = 0; i < dayList.length; i++) dayList[i].mean = dayList[i].n ? dayList[i].sum / dayList[i].n : null;

    var peakH = null, troughH = null;
    for (i = 0; i < 24; i++) {
      if (!hours[i].n) continue;
      hours[i].avg = hours[i].sum / hours[i].n;
      if (peakH === null || hours[i].avg > hours[peakH].avg) peakH = i;
      if (troughH === null || hours[i].avg < hours[troughH].avg) troughH = i;
    }

    // Weekend coverage, checked rather than assumed. If it is thin the
    // weekday panels say so instead of averaging two readings into a curve.
    var weekend = 0, weekday = 0;
    for (i = 0; i < list.length; i++) {
      var w = new Date(list[i].t * 1000).getDay();
      if (w === 0 || w === 6) weekend++; else weekday++;
    }

    // Same weekday, one week apart, both days sampled at nearly every hour.
    // Anything thinner is not a comparison, it is two different samples.
    var COVER = 18;
    var pairs = [];
    for (i = 0; i < dayList.length; i++) {
      var a = dayList[i];
      if (a.filled < COVER) continue;
      var nd = new Date(a.date.getFullYear(), a.date.getMonth(), a.date.getDate() + 7);
      var b = dayMap[dayKey(nd)];
      if (b && b.filled >= COVER) pairs.push({ a: a, b: b });
    }

    var spanSec = list.length > 1 ? list[list.length - 1].t - list[0].t : 0;

    _M = {
      list: list, hours: hours, days: dayList, dayMap: dayMap,
      peakH: peakH, troughH: troughH, hi: hi, lo: lo,
      med: median(counts), max: counts.length ? Math.max.apply(null, counts) : 0,
      spanDays: spanSec / 86400, weekend: weekend, weekday: weekday,
      gapMax: gapMax, gapAt: gapAt, pairs: pairs, cover: COVER
    };
    return _M;
  }

  // ------------------------------------------------- the archive (uploads)
  var _A = null;
  function archive(T) {
    if (_A) return _A;
    var ms = ((T && T.DATA && T.DATA.matches) || []);
    var byHour = [], i, j;
    for (i = 0; i < 24; i++) byHour.push(0);
    var dayMap = {}, days = [], upl = {}, unattributed = 0, dated = 0, first = null, last = null;

    for (i = 0; i < ms.length; i++) {
      var m = ms[i], u = m && m.captured_unix;
      if (typeof u !== "number" || !isFinite(u)) continue;
      dated++;
      var d = new Date(u * 1000);
      byHour[d.getHours()]++;
      if (first === null || u < first) first = u;
      if (last === null || u > last) last = u;

      var k = dayKey(d), day = dayMap[k];
      if (!day) {
        day = dayMap[k] = { key: k, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
                            n: 0, by: {} };
        days.push(day);
      }
      day.n++;

      var who = m.uploaded_by;
      if (who && who.length && typeof who !== "string") who = who[0];
      if (typeof who === "string" && who) {
        upl[who] = (upl[who] || 0) + 1;
        day.by[who] = (day.by[who] || 0) + 1;
      } else {
        unattributed++;
        day.by[""] = (day.by[""] || 0) + 1;
      }
    }
    days.sort(function (a, b) { return a.date - b.date; });

    var names = [];
    for (var k2 in upl) if (upl.hasOwnProperty(k2)) names.push({ name: k2, n: upl[k2] });
    names.sort(function (a, b) { return b.n - a.n; });

    // A continuous calendar from the first recorded match to the last, so a
    // six week hole between two clusters is visible as a hole.
    var slots = [];
    if (days.length) {
      var cur = new Date(days[0].date.getTime()), end = days[days.length - 1].date, run = 0;
      var guard = 0;
      while (cur <= end && guard < 4000) {
        var dk = dayKey(cur), dd = dayMap[dk];
        run += dd ? dd.n : 0;
        slots.push({ date: new Date(cur.getTime()), key: dk, n: dd ? dd.n : 0,
                     cum: run, by: dd ? dd.by : null });
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
        guard++;
      }
    }

    _A = { total: dated, byHour: byHour, days: days, slots: slots,
           uploaders: names, unattributed: unattributed, first: first, last: last };
    return _A;
  }

  // Pearson r over the 24 hourly buckets, using only hours the sampler
  // actually reached. Both series are 24 numbers on the same local clock.
  function corr(a, b) {
    var xs = [], ys = [], i;
    for (i = 0; i < 24; i++) {
      if (a[i] == null || b[i] == null) continue;
      xs.push(a[i]); ys.push(b[i]);
    }
    if (xs.length < 6) return null;
    var n = xs.length, mx = 0, my = 0;
    for (i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    var num = 0, dx = 0, dy = 0;
    for (i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      dx += (xs[i] - mx) * (xs[i] - mx);
      dy += (ys[i] - my) * (ys[i] - my);
    }
    if (!dx || !dy) return null;
    return Math.round((num / Math.sqrt(dx * dy)) * 100) / 100;
  }

  // ------------------------------------------------------------ page state
  var ST = { hour: null, mode: "avg", day: null, tape: "abs", pair: 0, series: "both", arc: "cum" };

  function seg(name, items, cur) {
    var out = '<div class="rh-seg" data-rh-seg="' + name + '">';
    for (var i = 0; i < items.length; i++) {
      out += '<button type="button" data-rh-val="' + items[i][0] + '"' +
        (items[i][0] === cur ? ' class="rh-on"' : "") + ">" + items[i][1] + "</button>";
    }
    return out + "</div>";
  }

  // =====================================================================
  // Panel 1: the day as a circle
  // =====================================================================
  function clockSvg(T, M) {
    var size = 470, cx = size / 2, cy = size / 2, rIn = 76, rOut = 194;
    var seg1 = (Math.PI * 2) / 24, pad = 0.011;
    var i, v, vals = [];
    for (i = 0; i < 24; i++) {
      var h = M.hours[i];
      if (!h.n) { vals.push(null); continue; }
      vals.push(ST.mode === "max" ? h.max : (ST.mode === "min" ? h.min : h.avg));
    }
    // One scale for all three modes, pinned to the single highest reading in
    // the window. Rescaling per mode would make the average and the peak draw
    // the same size ring, and it also let the min-to-max spine shoot past the
    // outer ring and get clipped.
    var top = 1;
    for (i = 0; i < 24; i++) if (M.hours[i].max != null && M.hours[i].max > top) top = M.hours[i].max;
    var scale = Math.ceil(top / 50) * 50;
    function rAt(v) { return rIn + (clamp(v / scale, 0, 1)) * (rOut - rIn); }

    var rings = "";
    for (i = 1; i <= 4; i++) {
      rings += '<circle cx="' + cx + '" cy="' + cy + '" r="' + f1(rIn + (i / 4) * (rOut - rIn)) +
        '" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 5"></circle>';
    }

    // Colour is normalised to the metric on show so the palette keeps its
    // full range; the radius stays on the absolute scale above.
    var vtop = 1;
    for (i = 0; i < 24; i++) if (vals[i] != null && vals[i] > vtop) vtop = vals[i];

    var body = "", spread = "", marks = "";
    for (i = 0; i < 24; i++) {
      var a0 = -Math.PI / 2 + (i - 0.5) * seg1 + pad;
      var a1 = a0 + seg1 - pad * 2;
      var am = -Math.PI / 2 + i * seg1;
      var hh = M.hours[i];
      if (vals[i] == null) {
        body += '<path d="' + wedgePath(cx, cy, rIn, rIn + 8, a0, a1) +
          '" fill="rgba(255,255,255,0.05)"></path>';
        continue;
      }
      v = vals[i];
      var t = clamp(v / vtop, 0, 1);
      var sel = ST.hour === i;
      body += '<path class="rh-hit" data-rh-h="' + i + '" d="' +
        wedgePath(cx, cy, rIn, rAt(v), a0, a1) + '" fill="' +
        mix(ACC_LO, ACC_HI, 0.22 + Math.sqrt(t) * 0.78) + '" stroke="' +
        (sel ? "#ffffff" : "none") + '" stroke-width="' + (sel ? 1.6 : 0) + '"></path>';
      // the full spread of readings in that hour, as a spine
      if (hh.min !== hh.max) {
        var p0 = pt(cx, cy, rAt(hh.min), am), p1 = pt(cx, cy, rAt(hh.max), am);
        spread += '<line x1="' + f1(p0[0]) + '" y1="' + f1(p0[1]) + '" x2="' + f1(p1[0]) +
          '" y2="' + f1(p1[1]) + '" stroke="rgba(255,255,255,0.30)" stroke-width="1.3"></line>' +
          '<circle cx="' + f1(p1[0]) + '" cy="' + f1(p1[1]) + '" r="1.9" fill="rgba(255,255,255,0.45)"></circle>';
      }
    }
    // Hit targets that reach the outer ring, so short night hours are still
    // easy to point at.
    var hits = "";
    for (i = 0; i < 24; i++) {
      var b0 = -Math.PI / 2 + (i - 0.5) * seg1, b1 = b0 + seg1;
      hits += '<path class="rh-hit" data-rh-h="' + i + '" d="' +
        wedgePath(cx, cy, rIn, rOut + 10, b0, b1) + '" fill="transparent"></path>';
    }

    for (i = 0; i < 24; i += 3) {
      var la = -Math.PI / 2 + i * seg1, lp = pt(cx, cy, rOut + 24, la);
      marks += '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] + 3.5) +
        '" text-anchor="middle" class="chart-axis-label">' + T.esc(T.fmtHour12(i)) + "</text>";
    }

    var selH = ST.hour === null ? M.peakH : ST.hour;
    var hsel = M.hours[selH] || { n: 0 };
    var shown = vals[selH];
    var centre = "";
    if (hsel.n) {
      centre =
        '<text x="' + cx + '" y="' + (cy - 26) + '" text-anchor="middle" class="chart-axis-label">' +
          T.esc(T.fmtHour12(selH)) + " to " + T.esc(T.fmtHour12((selH + 1) % 24)) + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" fill="' + ACC_HI +
          '" font-size="38" font-weight="700" font-family="ui-monospace,Consolas,monospace">' +
          T.esc(T.fmtNum(Math.round(shown))) + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 31) + '" text-anchor="middle" class="chart-axis-label">' +
          (ST.mode === "max" ? "busiest reading" : (ST.mode === "min" ? "quietest reading" : "players, average")) +
          "</text>" +
        '<text x="' + cx + '" y="' + (cy + 48) + '" text-anchor="middle" class="chart-axis-label">' +
          hsel.n + (hsel.n === 1 ? " reading" : " readings") + "</text>";
    }

    _clockScale = scale;
    return '<svg class="chart-svg" viewBox="0 0 ' + size + " " + size +
      '" preserveAspectRatio="xMidYMid meet">' + rings + body + spread + marks + centre + hits +
      "</svg>";
  }
  // Set by clockSvg so the legend can name the ring the wedges are scaled to.
  var _clockScale = 0;
  function clockKey(T) {
    return '<div class="rh-key"><span><i style="background:' + mix(ACC_LO, ACC_HI, 0.9) +
      '"></i>wedge = hour value</span>' +
      '<span><i style="background:rgba(255,255,255,0.32)"></i>spine = low to high</span>' +
      '<span>rings 25/50/75/100% of ' + T.fmtNum(_clockScale) +
      ", same scale in all modes</span></div>";
  }

  function panelClock(T) {
    var M = model(T);
    if (!M.list.length) return "";
    var pk = M.hours[M.peakH], tr = M.hours[M.troughH];
    var svg = clockSvg(T, M);           // runs first: it fixes the ring scale
    var body =
      '<div class="rh-ctl"><span class="rh-ctl-label">Wedge shows</span>' +
      seg("mode", [["avg", "Average"], ["max", "Busiest reading"], ["min", "Quietest reading"]], ST.mode) +
      "</div>" +
      '<div id="rh-clock-body" class="rh-clock">' + svg + "</div>" +
      '<div id="rh-clock-key">' + clockKey(T) + "</div>" +
      '<div class="rh-read" id="rh-clock-read"></div>';

    var note = "Whole Steam playerbase on your local clock, not the archive. " +
      T.fmtNum(M.list.length) + " readings over " + f1(M.spanDays) + " days, " +
      minN(M) + " to " + maxN(M) + " per hour. Peak " + T.fmtHour12(M.peakH) + " (" +
      T.fmtNum(Math.round(pk.avg)) + "), trough " + T.fmtHour12(M.troughH) + " (" +
      T.fmtNum(Math.round(tr.avg)) + ").";
    return T.bigPanel("The day, as a circle", body, note);
  }
  function minN(M) {
    var v = null;
    for (var i = 0; i < 24; i++) if (M.hours[i].n && (v === null || M.hours[i].n < v)) v = M.hours[i].n;
    return v === null ? 0 : v;
  }
  function maxN(M) {
    var v = 0;
    for (var i = 0; i < 24; i++) if (M.hours[i].n > v) v = M.hours[i].n;
    return v;
  }

  // =====================================================================
  // Panel 2: peak against trough
  // =====================================================================
  function panelSwing(T) {
    var M = model(T);
    if (!M.list.length || M.peakH === null) return "";
    var pk = M.hours[M.peakH], tr = M.hours[M.troughH];
    var ratio = tr.avg ? Math.round((pk.avg / tr.avg) * 10) / 10 : null;
    if (ratio === null) return "";

    var body =
      '<div class="rh-hero">' +
        '<div class="rh-huge">' + ratio + "&times;</div>" +
        "<p>Busiest hour against quietest: <b>" + T.fmtNum(Math.round(tr.avg)) +
        "</b> at <b>" + T.fmtHour12(M.troughH) + "</b> up to <b>" +
        T.fmtNum(Math.round(pk.avg)) + "</b> at <b>" + T.fmtHour12(M.peakH) +
        "</b>, your timezone.</p>" +
      "</div>" +
      '<div class="stat-grid">' +
        T.card("Busiest hour", T.fmtHour12(M.peakH) +
          '<span class="rh-sub">' + T.fmtNum(Math.round(pk.avg)) + " players on average, " + pk.n + " readings</span>") +
        T.card("Quietest hour", T.fmtHour12(M.troughH) +
          '<span class="rh-sub">' + T.fmtNum(Math.round(tr.avg)) + " players on average, " + tr.n + " readings</span>") +
        T.card("Highest single reading", T.fmtNum(M.hi.c) +
          '<span class="rh-sub">' + T.esc(T.fmtDateTime(M.hi.t, true)) + "</span>") +
        T.card("Lowest single reading", T.fmtNum(M.lo.c) +
          '<span class="rh-sub">' + T.esc(T.fmtDateTime(M.lo.t, true)) + "</span>") +
        T.card("Median reading", T.fmtNum(M.med) +
          '<span class="rh-sub">across all ' + T.fmtNum(M.list.length) + " readings</span>") +
        T.card("Most recent reading", T.fmtNum(M.list[M.list.length - 1].c) +
          '<span class="rh-sub">' + T.esc(T.fmtDateTime(M.list[M.list.length - 1].t, true)) + "</span>") +
      "</div>";

    var note = "Peak and trough are hour-bucket averages over " + f1(M.spanDays) +
      " days. A typical day, not a real one. The single readings are one measurement each.";
    return T.bigPanel("Peak against trough", body, note);
  }

  // =====================================================================
  // Panel 3: every reading, laid out as a tape
  // =====================================================================
  function tapeSvg(T, M) {
    var labW = 96, cw = 38, ch = 27, headH = 22;
    var W = labW + 24 * cw + 8, H = headH + M.days.length * ch + 6;
    var i, j, out = "";

    for (i = 0; i < 24; i += 2) {
      out += '<text x="' + (labW + i * cw + cw / 2) + '" y="14" text-anchor="middle" ' +
        'class="chart-axis-label">' + T.esc(T.fmtHour12(i)) + "</text>";
    }
    for (i = 0; i < M.days.length; i++) {
      var day = M.days[i], y = headH + i * ch;
      var on = ST.day === day.key;
      out += '<text x="' + (labW - 10) + '" y="' + (y + ch / 2 + 3) + '" text-anchor="end" ' +
        'class="rh-hit chart-axis-label" data-rh-day="' + day.key + '" ' +
        (on ? 'fill="#ffffff"' : "") + ">" + T.esc(dayLabel(day.date)) + "</text>";
      var scale = ST.tape === "rel" ? (day.max || 1) : (M.max || 1);
      for (j = 0; j < 24; j++) {
        var cell = day.cells[j], x = labW + j * cw;
        if (!cell) {
          out += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (cw - 2) + '" height="' +
            (ch - 3) + '" rx="3" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"></rect>';
          continue;
        }
        var t = clamp(cell.v / scale, 0, 1);
        out += '<rect class="rh-hit" data-rh-cell="' + day.key + ":" + j + '" x="' + (x + 1) +
          '" y="' + (y + 1) + '" width="' + (cw - 2) + '" height="' + (ch - 3) + '" rx="3" fill="' +
          mix(ACC_LO, ACC_HI, 0.12 + Math.sqrt(t) * 0.88) + '"' +
          (on ? ' stroke="rgba(255,255,255,0.55)" stroke-width="1"' : "") + "></rect>" +
          '<text x="' + (x + cw / 2) + '" y="' + (y + ch / 2 + 3) + '" text-anchor="middle" ' +
          'style="pointer-events:none;font-size:9.5px;fill:' + (t > 0.5 ? "#0a0e1f" : "#9fb0cf") +
          '">' + Math.round(cell.v) + "</text>";
      }
    }
    // Deliberately not .chart-svg: that class forces width:100%, which on a
    // phone would squeeze 24 columns of numbers into an unreadable smear.
    // A fixed pixel width inside .rh-scroll keeps every cell legible and
    // scrolls sideways instead.
    return '<div class="rh-scroll"><svg class="rh-fixed" width="' + W + '" height="' + H +
      '" viewBox="0 0 ' + W + " " + H + '">' + out + "</svg></div>";
  }

  function dayCurveSvg(T, M) {
    var day = ST.day && M.dayMap[ST.day];
    if (!day) return "";
    var W = 980, H = 168, padL = 44, padR = 14, padT = 12, padB = 26;
    var colW = (W - padL - padR) / 24;
    function xAt(i) { return padL + (i + 0.5) * colW; }
    var top = Math.ceil((M.max || 1) / 50) * 50;
    function yAt(v) { return H - padB - (v / top) * (H - padT - padB); }
    var vals = [], i;
    for (i = 0; i < 24; i++) vals.push(day.cells[i] ? day.cells[i].v : null);

    var grid = "";
    for (i = 0; i <= 2; i++) {
      var gv = top * (i / 2), gy = yAt(gv);
      grid += '<line x1="' + padL + '" y1="' + f1(gy) + '" x2="' + (W - padR) + '" y2="' + f1(gy) +
        '" stroke="var(--border)" stroke-width="1"></line>' +
        '<text x="' + (padL - 6) + '" y="' + f1(gy + 3) + '" text-anchor="end" class="chart-axis-label">' +
        T.fmtNum(Math.round(gv)) + "</text>";
    }
    var ticks = "";
    for (i = 0; i < 24; i += 3) {
      ticks += '<text x="' + f1(xAt(i)) + '" y="' + (H - 8) + '" text-anchor="middle" ' +
        'class="chart-axis-label">' + T.esc(T.fmtHour12(i)) + "</text>";
    }
    var dots = "";
    for (i = 0; i < 24; i++) {
      if (vals[i] == null) continue;
      dots += '<circle cx="' + f1(xAt(i)) + '" cy="' + f1(yAt(vals[i])) + '" r="2.6" fill="' + ACC_HI + '"></circle>';
    }
    return '<div class="rh-scroll"><svg class="rh-wide" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMinYMid meet">' +
      grid + '<path d="' + gapPath(vals, xAt, yAt) + '" fill="none" stroke="' + ACC_HI +
      '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>' + dots + ticks +
      "</svg></div>";
  }

  function panelTape(T) {
    var M = model(T);
    if (!M.days.length) return "";
    var poss = M.days.length * 24, filled = 0, i;
    for (i = 0; i < M.days.length; i++) filled += M.days[i].filled;

    var body =
      '<div class="rh-ctl"><span class="rh-ctl-label">Shade by</span>' +
      seg("tape", [["abs", "Players"], ["rel", "Share of that day's peak"]], ST.tape) +
      "</div>" +
      '<div id="rh-tape-body">' + tapeSvg(T, M) + "</div>" +
      '<div class="rh-read" id="rh-tape-read"></div>' +
      '<div id="rh-tape-curve">' + dayCurveSvg(T, M) + "</div>";

    var gapH = M.gapMax ? Math.round(M.gapMax / 3600) : 0;
    var note = "One row per day, one column per hour of your local clock. " +
      T.fmtNum(filled) + " of " + T.fmtNum(poss) + " slots reached, largest gap " + gapH +
      " hours. Empty outlines are misses. Weekend coverage is thin: " +
      M.weekend + " readings against " + M.weekday + " on weekdays.";
    return T.bigPanel("Every reading, day by day", body, note);
  }

  // =====================================================================
  // Panel 4: the same weekday, one week apart
  // =====================================================================
  function wowSvg(T, M) {
    var p = M.pairs[ST.pair];
    if (!p) return "";
    var W = 980, H = 320, padL = 46, padR = 16, padT = 16, padB = 30;
    var colW = (W - padL - padR) / 24;
    function xAt(i) { return padL + (i + 0.5) * colW; }
    var top = 1, i;
    for (i = 0; i < 24; i++) {
      if (p.a.cells[i] && p.a.cells[i].v > top) top = p.a.cells[i].v;
      if (p.b.cells[i] && p.b.cells[i].v > top) top = p.b.cells[i].v;
    }
    top = Math.ceil(top / 50) * 50;
    function yAt(v) { return H - padB - (v / top) * (H - padT - padB); }

    var grid = "";
    for (i = 0; i <= 4; i++) {
      var gv = top * (i / 4), gy = yAt(gv);
      grid += '<line x1="' + padL + '" y1="' + f1(gy) + '" x2="' + (W - padR) + '" y2="' + f1(gy) +
        '" stroke="var(--border)" stroke-width="1"></line>' +
        '<text x="' + (padL - 6) + '" y="' + f1(gy + 3) + '" text-anchor="end" class="chart-axis-label">' +
        T.fmtNum(Math.round(gv)) + "</text>";
    }
    var bars = "", av = [], bv = [];
    for (i = 0; i < 24; i++) {
      var ca = p.a.cells[i], cb = p.b.cells[i];
      av.push(ca ? ca.v : null); bv.push(cb ? cb.v : null);
      if (!ca || !cb) continue;
      var y0 = yAt(ca.v), y1 = yAt(cb.v);
      bars += '<rect x="' + f1(xAt(i) - 2) + '" y="' + f1(Math.min(y0, y1)) + '" width="4" height="' +
        f1(Math.abs(y1 - y0)) + '" rx="2" fill="' + (cb.v >= ca.v ? UP : DOWN) + '" opacity="0.5"></rect>';
    }
    var ticks = "", hits = "";
    for (i = 0; i < 24; i += 3) {
      ticks += '<text x="' + f1(xAt(i)) + '" y="' + (H - 9) + '" text-anchor="middle" ' +
        'class="chart-axis-label">' + T.esc(T.fmtHour12(i)) + "</text>";
    }
    for (i = 0; i < 24; i++) {
      hits += '<rect class="rh-hit" data-rh-wow="' + i + '" x="' + f1(padL + i * colW) + '" y="0" width="' +
        f1(colW) + '" height="' + H + '" fill="transparent"></rect>';
    }
    return '<div class="rh-scroll"><svg class="rh-wide" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMinYMid meet">' +
      grid + bars +
      '<path d="' + gapPath(av, xAt, yAt) + '" fill="none" stroke="' + WARM +
      '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"></path>' +
      '<path d="' + gapPath(bv, xAt, yAt) + '" fill="none" stroke="' + ACC_HI +
      '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"></path>' +
      ticks + hits + "</svg></div>";
  }

  function wowKey(T, M) {
    var p = M.pairs[ST.pair];
    if (!p) return "";
    return '<div class="rh-key"><span><i style="background:' + WARM + '"></i>' +
      T.esc(dayLabel(p.a.date)) + "</span>" +
      '<span><i style="background:' + ACC_HI + '"></i>' + T.esc(dayLabel(p.b.date)) + "</span>" +
      '<span><i style="background:' + DOWN + '"></i>lower a week later</span>' +
      '<span><i style="background:' + UP + '"></i>higher a week later</span></div>';
  }

  function wowSummary(T, M) {
    var p = M.pairs[ST.pair];
    if (!p) return "";
    var ch = pctChange(p.a.mean, p.b.mean), pch = pctChange(p.a.max, p.b.max);
    return "Mean <b>" + T.fmtNum(Math.round(p.a.mean)) + "</b> to <b>" +
      T.fmtNum(Math.round(p.b.mean)) + "</b> players" +
      (ch === null ? "" : ", <b>" + signed(ch) + "%</b>") + ". High <b>" +
      T.fmtNum(p.a.max) + "</b> to <b>" + T.fmtNum(p.b.max) + "</b>" +
      (pch === null ? "" : ", <b>" + signed(pch) + "%</b>") + ". <i>" + p.a.n + " and " + p.b.n +
      " readings, " + p.a.filled + " and " + p.b.filled + " of 24 hours.</i>";
  }

  function panelWow(T) {
    var M = model(T);
    if (!M.pairs.length) return "";
    var i, items = [];
    for (i = 0; i < M.pairs.length; i++) {
      items.push([String(i), T.esc(dowLabel(M.pairs[i].a.date)) + " " +
        T.esc(dayShort(M.pairs[i].a.date)) + " to " + T.esc(dayShort(M.pairs[i].b.date))]);
    }
    var body =
      (M.pairs.length > 1
        ? '<div class="rh-ctl"><span class="rh-ctl-label">Pair</span>' + seg("pair", items, String(ST.pair)) +
          "</div>"
        : "") +
      '<div id="rh-wow-key">' + wowKey(T, M) + "</div>" +
      '<div id="rh-wow-body">' + wowSvg(T, M) + "</div>" +
      '<div class="rh-read" id="rh-wow-read"></div>';

    var note = "Both days sampled at " + M.cover + "+ of 24 hours, covering the " +
      "same part of the day. " + M.pairs.length +
      (M.pairs.length === 1 ? " such pair" : " such pairs") + " in " +
      f1(M.spanDays) + " days. Two days is an observation, not a trend.";
    return T.bigPanel("The same weekday, one week apart", body, note);
  }

  // =====================================================================
  // Panel 5: two clocks that disagree
  // =====================================================================
  function clocksSvg(T, M, A) {
    var W = 980, H = 330, padL = 46, padR = 46, padT = 18, padB = 30;
    var colW = (W - padL - padR) / 24;
    function xAt(i) { return padL + (i + 0.5) * colW; }
    function yAt(u) { return H - padB - clamp(u, 0, 1) * (H - padT - padB); }
    var i, pmax = 0, mmax = 0;
    for (i = 0; i < 24; i++) {
      if (M.hours[i].n && M.hours[i].avg > pmax) pmax = M.hours[i].avg;
      if (A.byHour[i] > mmax) mmax = A.byHour[i];
    }
    if (!pmax || !mmax) return "";

    var grid = "";
    for (i = 0; i <= 4; i++) {
      var gy = yAt(i / 4);
      grid += '<line x1="' + padL + '" y1="' + f1(gy) + '" x2="' + (W - padR) + '" y2="' + f1(gy) +
        '" stroke="var(--border)" stroke-width="1"></line>' +
        '<text x="' + (padL - 6) + '" y="' + f1(gy + 3) + '" text-anchor="end" class="chart-axis-label">' +
        Math.round((i / 4) * 100) + "%</text>";
    }

    var bars = "";
    if (ST.series === "both" || ST.series === "up") {
      for (i = 0; i < 24; i++) {
        if (!A.byHour[i]) continue;
        var by = yAt(A.byHour[i] / mmax);
        bars += '<rect x="' + f1(xAt(i) - colW * 0.32) + '" y="' + f1(by) + '" width="' +
          f1(colW * 0.64) + '" height="' + f1(H - padB - by) + '" rx="2" fill="' + WARM +
          '" opacity="0.55"></rect>';
      }
    }
    var line = "", dots = "";
    if (ST.series === "both" || ST.series === "pop") {
      var vals = [];
      for (i = 0; i < 24; i++) vals.push(M.hours[i].n ? M.hours[i].avg / pmax : null);
      line = '<path d="' + gapPath(vals, xAt, yAt) + '" fill="none" stroke="' + ACC_HI +
        '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"></path>';
      for (i = 0; i < 24; i++) {
        if (vals[i] == null) continue;
        dots += '<circle cx="' + f1(xAt(i)) + '" cy="' + f1(yAt(vals[i])) + '" r="2.8" fill="' + ACC_HI + '"></circle>';
      }
    }
    var ticks = "", hits = "";
    for (i = 0; i < 24; i += 3) {
      ticks += '<text x="' + f1(xAt(i)) + '" y="' + (H - 9) + '" text-anchor="middle" ' +
        'class="chart-axis-label">' + T.esc(T.fmtHour12(i)) + "</text>";
    }
    for (i = 0; i < 24; i++) {
      hits += '<rect class="rh-hit" data-rh-two="' + i + '" x="' + f1(padL + i * colW) + '" y="0" width="' +
        f1(colW) + '" height="' + H + '" fill="transparent"></rect>';
    }
    return '<div class="rh-scroll"><svg class="rh-wide" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMinYMid meet">' +
      grid + bars + line + dots + ticks + hits + "</svg></div>";
  }

  function panelTwoClocks(T) {
    var M = model(T), A = archive(T);
    if (!M.list.length || !A.total) return "";
    var i, pop = [], up = [];
    for (i = 0; i < 24; i++) {
      pop.push(M.hours[i].n ? M.hours[i].avg : null);
      up.push(A.byHour[i]);
    }
    var r = corr(pop, up);
    var top = A.uploaders.length ? A.uploaders[0] : null;
    var attributed = A.total - A.unattributed;

    var body =
      '<p class="rh-warn">Blue is the whole playerbase. Amber is when this archive\'s ' +
      T.fmtNum(A.total) + " matches were played. Different populations. The bars are not " +
      "when the game is busy.</p>" +
      '<div class="rh-ctl"><span class="rh-ctl-label">Show</span>' +
      seg("series", [["both", "Both"], ["pop", "Playerbase only"], ["up", "Archive only"]], ST.series) +
      "</div>" +
      '<div class="rh-key"><span><i style="background:' + ACC_HI + '"></i>players online, % of own peak</span>' +
      '<span><i style="background:' + WARM + '"></i>archived matches, % of own peak</span></div>' +
      '<div id="rh-two-body">' + clocksSvg(T, M, A) + "</div>" +
      '<div class="rh-read" id="rh-two-read"></div>';

    var note = (r === null ? "" : "Correlated at r = " + r + " across the 24 buckets. ") +
      T.fmtNum(A.unattributed) + " of " + T.fmtNum(A.total) + " matches name no uploader." +
      (attributed > 0 && top ? " " + T.fmtNum(top.n) + " of the rest came from one account." : "") +
      " Upload timing is not playerbase timing.";
    return T.bigPanel("Two clocks that disagree", body, note);
  }

  // =====================================================================
  // Panel 6: how the archive filled up
  // =====================================================================
  function archiveSvg(T, A) {
    if (!A.slots.length) return "";
    var W = 980, H = 300, padL = 52, padR = 16, padT = 16, padB = 34;
    var n = A.slots.length, colW = (W - padL - padR) / n;
    function xAt(i) { return padL + (i + 0.5) * colW; }
    var i, top = 1;
    for (i = 0; i < n; i++) {
      var v = ST.arc === "cum" ? A.slots[i].cum : A.slots[i].n;
      if (v > top) top = v;
    }
    var step = ST.arc === "cum" ? 50 : 10;
    top = Math.ceil(top / step) * step;
    function yAt(v) { return H - padB - (v / top) * (H - padT - padB); }

    var grid = "";
    for (i = 0; i <= 4; i++) {
      var gv = top * (i / 4), gy = yAt(gv);
      grid += '<line x1="' + padL + '" y1="' + f1(gy) + '" x2="' + (W - padR) + '" y2="' + f1(gy) +
        '" stroke="var(--border)" stroke-width="1"></line>' +
        '<text x="' + (padL - 6) + '" y="' + f1(gy + 3) + '" text-anchor="end" class="chart-axis-label">' +
        T.fmtNum(Math.round(gv)) + "</text>";
    }

    var draw = "";
    if (ST.arc === "cum") {
      var pts = "M" + f1(padL) + " " + f1(yAt(0));
      for (i = 0; i < n; i++) pts += "L" + f1(xAt(i)) + " " + f1(yAt(A.slots[i].cum));
      draw = '<path d="' + pts + "L" + f1(xAt(n - 1)) + " " + f1(yAt(0)) + 'Z" fill="' + ACC +
        '" opacity="0.22"></path><path d="' + pts + '" fill="none" stroke="' + ACC_HI +
        '" stroke-width="2.4" stroke-linejoin="round"></path>';
      for (i = 0; i < n; i++) {
        if (!A.slots[i].n) continue;
        draw += '<circle cx="' + f1(xAt(i)) + '" cy="' + f1(yAt(A.slots[i].cum)) + '" r="2.4" fill="' +
          ACC_HI + '"></circle>';
      }
    } else {
      for (i = 0; i < n; i++) {
        if (!A.slots[i].n) continue;
        var by = yAt(A.slots[i].n), bw = Math.max(2, colW * 0.72);
        draw += '<rect x="' + f1(xAt(i) - bw / 2) + '" y="' + f1(by) + '" width="' + f1(bw) +
          '" height="' + f1(H - padB - by) + '" rx="2" fill="' + ACC_HI + '" opacity="0.8"></rect>';
      }
    }

    var ticks = "", every = Math.max(1, Math.ceil(n / 9));
    for (i = 0; i < n; i += every) {
      ticks += '<text x="' + f1(xAt(i)) + '" y="' + (H - 10) + '" text-anchor="middle" ' +
        'class="chart-axis-label">' + T.esc(dayShort(A.slots[i].date)) + "</text>";
    }
    var hits = "";
    for (i = 0; i < n; i++) {
      hits += '<rect class="rh-hit" data-rh-arc="' + i + '" x="' + f1(padL + i * colW) + '" y="0" width="' +
        f1(Math.max(colW, 3)) + '" height="' + H + '" fill="transparent"></rect>';
    }
    return '<div class="rh-scroll"><svg class="rh-wide" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMinYMid meet">' +
      grid + draw + ticks + hits + "</svg></div>";
  }

  function panelArchive(T) {
    var A = archive(T);
    if (!A.slots.length) return "";
    var i, busiest = A.days[0], ties = 0;
    for (i = 1; i < A.days.length; i++) if (A.days[i].n > busiest.n) busiest = A.days[i];
    for (i = 0; i < A.days.length; i++) if (A.days[i].n === busiest.n) ties++;
    var busiestPhrase = ties > 1
      ? ties + " days tie at " + T.fmtNum(busiest.n)
      : "biggest day " + T.esc(dayLabel(busiest.date)) + ", " + T.fmtNum(busiest.n);

    var spanDays = A.slots.length;
    var activeDays = A.days.length;
    // How much of the archive landed in its five busiest days.
    var sorted = A.days.slice().sort(function (a, b) { return b.n - a.n; });
    var top5 = 0;
    for (i = 0; i < Math.min(5, sorted.length); i++) top5 += sorted[i].n;

    var uplLine = "";
    if (A.uploaders.length) {
      if (T.SHOW_PLAYER_PAGES) {
        var bits = [];
        for (i = 0; i < Math.min(4, A.uploaders.length); i++) {
          bits.push(T.esc(A.uploaders[i].name) + " " + T.fmtNum(A.uploaders[i].n));
        }
        uplLine = "Uploaders: " + bits.join(", ") + ".";
      } else {
        uplLine = A.uploaders.length + " named uploaders.";
      }
    }

    var body =
      '<div class="rh-ctl"><span class="rh-ctl-label">Draw</span>' +
      seg("arc", [["cum", "Running total"], ["day", "Matches per day"]], ST.arc) +
      "</div>" +
      '<div id="rh-arc-body">' + archiveSvg(T, A) + "</div>" +
      '<div class="rh-read" id="rh-arc-read"></div>';

    var note = "Each match on the day it was played. " + activeDays + " active days of " +
      spanDays + ", " + busiestPhrase + ", top five hold " + T.fmtNum(top5) + " of " +
      T.fmtNum(A.total) + ". Bulk imports, not steady collection. " + uplLine + " " +
      T.fmtNum(A.unattributed) + " name no uploader.";
    return T.bigPanel("How the archive filled up", body, note);
  }

  // ===================================================================== wire
  function upTo(el, attr, root) {
    while (el && el !== root) {
      if (el.getAttribute && el.getAttribute(attr) !== null) return el;
      el = el.parentNode;
    }
    return null;
  }
  function setHtml(root, id, html) {
    var el = root.querySelector ? root.querySelector("#" + id) : null;
    if (el) el.innerHTML = html;
    return el;
  }
  function markSeg(root, name, val) {
    if (!root.querySelectorAll) return;
    var box = root.querySelector('[data-rh-seg="' + name + '"]');
    if (!box) return;
    var bs = box.querySelectorAll("button");
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].getAttribute("data-rh-val") === val;
      bs[i].className = on ? "rh-on" : "";
    }
  }

  function wire(T, root) {
    if (!root || !root.addEventListener) return;
    var M = model(T), A = archive(T);

    function clockRead() {
      var h = ST.hour === null ? M.peakH : ST.hour;
      if (h === null) return;
      var hh = M.hours[h];
      if (!hh || !hh.n) {
        setHtml(root, "rh-clock-read", "<i>No readings in that hour.</i>");
        return;
      }
      setHtml(root, "rh-clock-read",
        "<b>" + T.esc(T.fmtHour12(h)) + "</b>: <b>" + T.fmtNum(Math.round(hh.avg)) +
        "</b> average, <b>" + T.fmtNum(hh.min) + "</b> to <b>" + T.fmtNum(hh.max) +
        "</b> across " + hh.n + (hh.n === 1 ? " reading" : " readings") +
        ". <i>" + (M.hours[M.peakH].avg ? Math.round((hh.avg / M.hours[M.peakH].avg) * 100) : 0) +
        "% of peak.</i>");
    }
    function tapeRead(key, hour) {
      var day = M.dayMap[key];
      if (!day) return;
      if (hour === null) {
        setHtml(root, "rh-tape-read",
          "<b>" + T.esc(dayLabel(day.date)) + "</b>: <b>" + T.fmtNum(Math.round(day.mean)) +
          "</b> average, <b>" + T.fmtNum(day.min) + "</b> to <b>" + T.fmtNum(day.max) +
          "</b>, " + day.filled + " sampled hours.");
        return;
      }
      var cell = day.cells[hour];
      if (!cell) return;
      setHtml(root, "rh-tape-read",
        "<b>" + T.esc(dayLabel(day.date)) + ", " + T.esc(T.fmtHour12(hour)) + "</b>: <b>" +
        T.fmtNum(Math.round(cell.v)) + "</b> players" +
        (cell.n > 1 ? " (mean of " + cell.n + ")" : "") +
        ". <i>" + T.esc(T.fmtDateTime(cell.t, true)) + ". Day " + T.fmtNum(day.min) +
        " to " + T.fmtNum(day.max) + ".</i>");
    }
    function tapeDefault() {
      setHtml(root, "rh-tape-read",
        "<i>" + T.fmtNum(M.list.length) + " readings over " + M.days.length +
        " days. Click a cell to draw that day.</i>");
    }
    function wowRead(i) {
      var p = M.pairs[ST.pair];
      if (!p) return;
      var ca = p.a.cells[i], cb = p.b.cells[i];
      if (!ca || !cb) {
        setHtml(root, "rh-wow-read", "<i>No reading at " +
          T.esc(T.fmtHour12(i)) + " on one of the days.</i>");
        return;
      }
      var ch = pctChange(ca.v, cb.v);
      setHtml(root, "rh-wow-read",
        "<b>" + T.esc(T.fmtHour12(i)) + "</b>: <b>" + T.fmtNum(Math.round(ca.v)) + "</b> on " +
        T.esc(dayShort(p.a.date)) + ", <b>" + T.fmtNum(Math.round(cb.v)) + "</b> on " +
        T.esc(dayShort(p.b.date)) + (ch === null ? "" : ", <b>" + signed(ch) + "%</b>") + ".");
    }
    function twoRead(i) {
      var hh = M.hours[i];
      setHtml(root, "rh-two-read",
        "<b>" + T.esc(T.fmtHour12(i)) + "</b>: playerbase " +
        (hh.n ? "<b>" + T.fmtNum(Math.round(hh.avg)) + "</b> from " + hh.n +
                (hh.n === 1 ? " reading" : " readings") : "<i>not sampled</i>") +
        ". Archive <b>" + T.fmtNum(A.byHour[i]) + "</b> " +
        (A.byHour[i] === 1 ? "match" : "matches") + ".");
    }
    function twoDefault() {
      setHtml(root, "rh-two-read",
        "<i>Each series is scaled to its own peak, so a taller bar is not more players.</i>");
    }
    function arcRead(i) {
      var s = A.slots[i];
      if (!s) return;
      var who = "";
      if (s.by) {
        var bits = [], k;
        for (k in s.by) {
          if (!s.by.hasOwnProperty(k)) continue;
          if (k === "") bits.push(s.by[k] + " unattributed");
          else if (T.SHOW_PLAYER_PAGES) bits.push(s.by[k] + " from " + T.esc(k));
          else bits.push(s.by[k] + " from a named account");
        }
        who = bits.length ? " " + bits.join(", ") + "." : "";
      }
      setHtml(root, "rh-arc-read",
        "<b>" + T.esc(dayLabel(s.date)) + "</b>: <b>" + T.fmtNum(s.n) + "</b> " +
        (s.n === 1 ? "match" : "matches") + ", running total <b>" + T.fmtNum(s.cum) +
        "</b>." + (who ? " <i>" + who + "</i>" : ""));
    }
    function arcDefault() {
      setHtml(root, "rh-arc-read",
        "<i>" + T.fmtNum(A.total) + " matches across " + A.slots.length + " calendar days.</i>");
    }

    clockRead();
    tapeDefault();
    if (M.pairs.length) {
      setHtml(root, "rh-wow-read", wowSummary(T, M));
    }
    twoDefault();
    arcDefault();

    root.addEventListener("click", function (e) {
      var b = upTo(e.target, "data-rh-val", root);
      if (b) {
        var box = upTo(b, "data-rh-seg", root);
        var name = box ? box.getAttribute("data-rh-seg") : null;
        var val = b.getAttribute("data-rh-val");
        if (name === "mode" && val !== ST.mode) {
          ST.mode = val; markSeg(root, "mode", val);
          setHtml(root, "rh-clock-body", clockSvg(T, M));
          setHtml(root, "rh-clock-key", clockKey(T));
          clockRead();
        } else if (name === "tape" && val !== ST.tape) {
          ST.tape = val; markSeg(root, "tape", val);
          setHtml(root, "rh-tape-body", tapeSvg(T, M));
        } else if (name === "pair" && val !== String(ST.pair)) {
          // clamped: a stale or hand fired value must not blank the panel
          ST.pair = clamp(parseInt(val, 10) || 0, 0, Math.max(0, M.pairs.length - 1));
          markSeg(root, "pair", String(ST.pair));
          setHtml(root, "rh-wow-key", wowKey(T, M));
          setHtml(root, "rh-wow-body", wowSvg(T, M));
          setHtml(root, "rh-wow-read", wowSummary(T, M));
        } else if (name === "series" && val !== ST.series) {
          ST.series = val; markSeg(root, "series", val);
          setHtml(root, "rh-two-body", clocksSvg(T, M, A)); twoDefault();
        } else if (name === "arc" && val !== ST.arc) {
          ST.arc = val; markSeg(root, "arc", val);
          setHtml(root, "rh-arc-body", archiveSvg(T, A)); arcDefault();
        }
        return;
      }
      // A click on a wedge selects it too, so the clock is usable without a
      // hovering pointer (touch, and any harness that only clicks).
      var wedge = upTo(e.target, "data-rh-h", root);
      if (wedge) {
        var wh = parseInt(wedge.getAttribute("data-rh-h"), 10);
        if (wh !== ST.hour) {
          ST.hour = wh;
          setHtml(root, "rh-clock-body", clockSvg(T, M));
        }
        clockRead();
        return;
      }
      var cell = upTo(e.target, "data-rh-cell", root);
      var dayEl = cell ? null : upTo(e.target, "data-rh-day", root);
      var key = null, hr = null;
      if (cell) {
        var parts = cell.getAttribute("data-rh-cell").split(":");
        key = parts[0]; hr = parseInt(parts[1], 10);
      } else if (dayEl) {
        key = dayEl.getAttribute("data-rh-day");
      }
      if (key) {
        ST.day = ST.day === key && hr === null ? null : key;
        setHtml(root, "rh-tape-body", tapeSvg(T, M));
        setHtml(root, "rh-tape-curve", dayCurveSvg(T, M));
        if (ST.day) tapeRead(key, hr); else tapeDefault();
      }
    });

    root.addEventListener("mouseover", function (e) {
      var el = upTo(e.target, "data-rh-h", root);
      if (el) {
        var h = parseInt(el.getAttribute("data-rh-h"), 10);
        if (h !== ST.hour) {
          ST.hour = h;
          setHtml(root, "rh-clock-body", clockSvg(T, M));
          clockRead();
        }
        return;
      }
      el = upTo(e.target, "data-rh-cell", root);
      if (el) {
        var p = el.getAttribute("data-rh-cell").split(":");
        tapeRead(p[0], parseInt(p[1], 10));
        return;
      }
      el = upTo(e.target, "data-rh-wow", root);
      if (el) { wowRead(parseInt(el.getAttribute("data-rh-wow"), 10)); return; }
      el = upTo(e.target, "data-rh-two", root);
      if (el) { twoRead(parseInt(el.getAttribute("data-rh-two"), 10)); return; }
      el = upTo(e.target, "data-rh-arc", root);
      if (el) { arcRead(parseInt(el.getAttribute("data-rh-arc"), 10)); return; }
    });
  }

  // ================================================================= preview
  function preview(T) {
    var M = model(T);
    if (!M.list.length || M.peakH === null) return "";
    var cx = 120, cy = 120, rIn = 34, rOut = 106, seg1 = (Math.PI * 2) / 24;
    var top = 1, i;
    for (i = 0; i < 24; i++) if (M.hours[i].avg != null && M.hours[i].avg > top) top = M.hours[i].avg;
    var out = '<circle cx="120" cy="120" r="106" fill="none" stroke="#232c52" stroke-width="1"/>' +
      '<circle cx="120" cy="120" r="70" fill="none" stroke="#232c52" stroke-width="1" stroke-dasharray="2 5"/>';
    for (i = 0; i < 24; i++) {
      var v = M.hours[i].avg;
      if (v == null) continue;
      var a0 = -Math.PI / 2 + (i - 0.5) * seg1 + 0.02, a1 = a0 + seg1 - 0.04;
      var t = clamp(v / top, 0, 1);
      out += '<path d="' + wedgePath(cx, cy, rIn, rIn + t * (rOut - rIn), a0, a1) +
        '" fill="' + mix(ACC_LO, ACC_HI, 0.25 + Math.sqrt(t) * 0.75) + '"/>';
    }
    return '<svg viewBox="0 0 240 240">' + out + "</svg>";
  }

  // ==================================================================== page
  function render(T) {
    var out = [
      panelClock(T),
      panelSwing(T),
      panelTape(T),
      panelWow(T),
      panelTwoClocks(T),
      panelArchive(T)
    ];
    var body = out.join("");
    if (!body) {
      return '<div class="panel"><p class="small">No player counts and no dated matches yet.' +
        "</p></div>";
    }
    return body;
  }

  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "rhythm",
    title: "Rhythm",
    blurb: "When the game is busy, by the clock and by the calendar.",
    accent: "#436f83",
    css: CSS,
    gated: false,
    preview: preview,
    render: render,
    wire: wire
  });
})();

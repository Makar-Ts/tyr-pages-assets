# Writing a suite

A suite is one themed page on the Data hub. Drop a file in here, add a
`<script>` tag for it in `site/index.html`, and it appears as a tile.

Nothing else has to change. The hub reads `window.TYR_SUITES` when it renders.

## The shape of a file

```js
(function () {
  var CSS = "...";                       // optional, injected once on first open
  window.TYR_SUITES = window.TYR_SUITES || [];
  window.TYR_SUITES.push({
    slug: "energy",                      // [a-z0-9-]+, becomes #/data/energy
    title: "Energy",
    blurb: "One plain line, under 90 characters.",
    accent: "#c9a227",                   // drives the tile edge and chip
    css: CSS,
    gated: false,                        // true if it shows player names
    preview: function (T) { return '<svg viewBox="0 0 240 240">...</svg>'; },
    render: function (T) { return '<div class="panel avg-panel">...</div>'; },
    wire: function (T, root) { }         // optional, runs after render is in the DOM
  });
})();
```

`preview` draws the tile. It is a square, it is the first and often only thing
anyone sees of your suite, and it must be built from real numbers rather than
decoration. Use `viewBox="0 0 240 240"` and no width or height attributes.

`render` returns the whole page as a string. `wire` gets the container element
once that string is in the DOM; attach listeners there. Re-render by writing
`innerHTML` on a sub-container you made, never on `root`.

Write ES5: `var` and `function`, no arrow functions, no template literals, no
`let` or `const`. It matches the rest of the codebase and there is no build
step. No imports, no external libraries, no network calls beyond `T.loadJson`.

If `render` throws, the router catches it and says so in a panel. That is a
safety net, not a plan.

## What `T` gives you

**Data**

- `T.DATA` — `site_data.json`: `matches`, `tanks`, `players`, `clans`, `maps`,
  `best_battles`, `popular_tanks`, `steam`, `labels`, `generated_unix`
- `T.STATS` — `stats.json`, about 80 aggregate keys
- `T.OFFICIAL` — the published sheet from tyrhq.com, plus `T.OFFICIAL.byTank[name]`
- `T.SHOW_PLAYER_PAGES` — if false, render no player names. Set `gated: true`
  on your suite if it is built around them and it will be hidden instead.
- `T.loadJson(url)` — a Promise, paths relative to `site/`. Per-map files are
  at `maps/<slug>.json`, per-match at `matches/<match_id>.json`.

Both `T.STATS` and `T.OFFICIAL` are guaranteed loaded before `render` runs.

**Formatting**: `T.esc`, `T.fmtNum`, `T.fmtPct`, `T.fmtDateTime`, `T.fmtHour12`

**Layout**: `T.bigPanel(title, bodyHtml, noteHtml)`, `T.card(label, value)`
(wrap cards in `<div class="stat-grid">`)

**Colour**: `T.tankColor(name)`, `T.CHART_COLORS` (8 hexes), `T.TEAM_HEX`

**Charts**, all returning an SVG string:

| Helper | Rows |
| --- | --- |
| `svgLineChart(series, opts)` | `[{label, color, values:[n]}]` |
| `svgBarChart(rows, opts)` | `{label, value, color, valueLabel, sub}` |
| `svgDivergingBars(rows, opts)` | `{label, value}`, value may be negative |
| `svgDumbbell(rows, opts)` | `{label, a, b}` + `{aName, bName, aColor, bColor}` |
| `svgBoxPlot(rows, opts)` | `{label, p10, p25, p50, p75, p90}` |
| `svgRidgeline(rows, opts)` | `{label, values:[n]}` |
| `svgRadar(axes, opts)` | `[{label, value}]`, `opts.compare` overlays |
| `svgDeviationGrid(rowLabels, colLabels, valueAt, opts)` | a heatmap |
| `svgTreemap`, `svgWaffle`, `svgPieChart`, `svgStackedBar` | `{label, value, color}` |
| `svgSankey`, `svgRibbon`, `svgSpiral`, `svgRadialClock`, `svgRadialLinks` | see source |

`T.statByTank(list, key)` turns a `[{label, ...}]` list into a `{label: value}` map.

**Read `site/app.js` and check the exact option names and row fields of any
helper before calling it.** Guessing them is the most common way to break.

You are not limited to these. Hand-written SVG and `<canvas>` are both fine and
often better. If you animate, stop the loop when the element leaves the page:
check `document.body.contains(el)` in the frame callback and bail when false,
or it keeps running after the user navigates away.

## CSS

Injected once, on first open. Prefix every class with your slug so two suites
cannot collide. Available variables:

`--bg` `--panel` `--panel2` `--border` `--text` `--dim` `--blue` `--violet`
`--grad`, and the aliases `--fg` (= text), `--line` (= border), `--accent`
(= blue).

Dark theme throughout.

## The bar for content

Every panel carries a note saying what it shows **and what it does not**. Plain
English, the register of a careful engineer rather than a marketer. No hype
words, no em-dashes.

State sample sizes. If something rests on 20 matches, the note says 20.

Never invent a statistic. If the data cannot support the panel you wanted,
drop it. A panel that no-ops by returning `""` when its inputs are missing is
correct; one that throws is not.

Beautiful is encouraged. Misleading is not. If a layout is decorative and
position carries no meaning, the note says so outright.

## Checking your work

```
node --check site/suites/<slug>.js
```

There is a jsdom harness that loads the real page, walks every route and fails
on any uncaught error, plus a second one that clicks every control on the page
and reports anything that throws or changes nothing. Ask for them to be run
against your suite before calling it done.

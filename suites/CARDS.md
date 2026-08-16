# Adding cards to the Odd page

One fact. One number big enough to read across the room. One blunt shape.
Nothing to click.

Cards live in files named `cards_*.js` and push themselves onto
`window.TYR_CARDS`. `odd.js` renders them after its own.

```js
(function () {
  window.TYR_CARDS = window.TYR_CARDS || [];
  var A = window.TYR_ART;

  window.TYR_CARDS.push({
    id: "never-blocked",          // unique, kebab-case
    color: "#c0392b",             // the accent for this card
    wide: false,                  // true spans the whole grid row
    big: function (T) { return "0"; },
    sub: function (T) { return "one short line"; },
    art: function (T) { return A.dots(100, 42, "#c0392b"); }
  });
})();
```

## The rules

**Compute everything from `T` at render time.** Never type a number into the
file. A card that hardcodes `"50%"` keeps saying 50% after the data changes,
and that is how a site starts lying. If you cannot compute it, drop the card.

**`big` is the headline.** A number, ideally under eight characters. `"0"`,
`"78%"`, `"11 / 17"`, `"400 m"`, `"8x"`. Not a sentence.

**Return `null` from `big`** when the data is missing, and the card removes
itself. That is the only error handling you need.

**`sub` is one line, twenty words at most.** Plain. It says what the number
is, not how to read the picture. No hedging, no "it is worth noting", no
explaining what the card does not show.

**`art` is one shape.** If it needs an axis, a legend or a key, it is the
wrong card for this page.

ES5 only: `var` and `function`, no arrows, no template literals, no `let` or
`const`.

## What `T` gives you

- `T.DATA` — `matches` (308, each with `map`, `duration_sec`, `winning_team`,
  `win_type`, `score_ally`, `score_enemy`, `captured_unix`, and 16 `players[]`
  carrying `label`, `team`, `tank`, `dmg`, `kills`, `assist`, `blocked`,
  `survival_sec`, `clan`), `tanks` (17 measured), `players` (2132), `clans`
  (88), `maps` (6)
- `T.STATS` — about 80 aggregates
- `T.OFFICIAL` — the game's published sheet, plus `T.OFFICIAL.byTank[name]`
- `T.SHOW_PLAYER_PAGES` — if false, no player names. Return `null` from `big`
  rather than rendering one.
- `T.fmtNum`, `T.fmtPct`, `T.esc`, `T.tankColor`

## The shapes, on `window.TYR_ART`

| call | draws |
| --- | --- |
| `A.dots(total, lit, color, {per, gap, r})` | a field of dots, `lit` of them on |
| `A.twoBars(a, b, aLabel, bLabel, color)` | two bars, for a lopsided comparison |
| `A.barRow([{k, v}], color)` | a few labelled bars, `v` a percentage |
| `A.rings(n, color)` | n identical rings, for "they are all the same" |
| `A.spanLine(lo, hi, loLabel, hiLabel, color)` | one line between two extremes |
| `A.esc(s)` | escape text |

Hand-written SVG is fine and often better. Keep it to one idea, no axes, and
`viewBox` with no width or height so it scales.

Colours already in use: `#c0392b` red, `#c9a227` gold, `#35674a` green,
`#6ea8fe` blue, `#436f83` slate, `#a06bff` violet, `#8c6739` brown,
`#8a4444` rust, `#65508a` purple.

## Before you add a card

**Check the fact in Python against the real JSON first.** Several claims that
reached this project via confident reports turned out to be wrong: that 629
seconds was a hard time limit (five matches end there, and five also end at
287, and five more at 301), and that measured reload matched the published
sheet on 10 tanks when it is 11. Print the number yourself and put the
computation in your report.

A card that is merely surprising is worth more than a card that is merely
true. "Phantom has blocked nothing in 312 games" earns its place. "The median
match is five minutes" does not.

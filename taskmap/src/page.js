// Renders a saved record as a standalone HTML report.
//
// No server, no build step, no external requests: one file you can open,
// email, or put behind a link. Stage three replaces the wrapper with a real
// page; the chart and source markup below is meant to survive that.
//
// Every visual decision lives in the token block at the top of the stylesheet
// so the look can be reworked without touching the markup or the numbers.
//
// Chart colours are the validated three-slot categorical set from the data-viz
// reference palette, checked all-pairs in both modes against this page's own
// surfaces. Warm for the work that is going, cool green for the work that stays
// yours, because a reader reads valence into a verdict whether or not one is
// intended. Segment labels use near-black ink: it beats white on all three
// hues in both modes. Green sits below 3:1 on the light surface, so colour
// never carries meaning alone here - every segment is labelled, every verdict
// is named in the rows below, and the page ships a table view.
//
// Exposure uses the reserved status palette, not the series colours, so a
// status never impersonates a series. It ships with a glyph and a word.
//
//   node src/page.js <record id>            → pages/<id>.html
//   node src/page.js --sample               → the committed sample record
import fs from "node:fs";
import path from "node:path";
import { ROOT, resources } from "./engine.js";
import { describeWef, resourceFor, resolveTurn } from "./render.js";
import { load } from "./store.js";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const pct = (n) => Math.round((n ?? 0) * 100);

const VERDICT = {
  automate: { label: "Automate", blurb: "A tool can do most of this" },
  augment: { label: "Augment", blurb: "You stay in charge, the tool does the lifting" },
  human: { label: "Stays human", blurb: "Judgment, relationships, accountability, presence" },
};
const VERDICT_ORDER = ["automate", "augment", "human"];

// ---- sources -------------------------------------------------------------

function sourceHtml(s, exchanges) {
  if (s.type === "quote") {
    const turn = resolveTurn(s.text, exchanges);
    const where = turn ? `Their words, question ${turn}` : "NOT FOUND IN ANY ANSWER";
    return `<div class="src"><span class="src-label">${esc(where)}</span>“${esc(s.text)}”</div>`;
  }
  const known = describeWef(s.id);
  return known
    ? `<div class="src"><span class="src-label">WEF Future of Jobs 2025</span>${esc(known.replace(/^WEF 2025[^:]*:\s*/, ""))}</div>`
    : `<div class="src"><span class="src-label">Unknown source</span>${esc(s.id)}</div>`;
}

let whyCount = 0;
function why(sources, exchanges) {
  if (!sources?.length) return `<p class="nosource">No source given.</p>`;
  const id = `why-${++whyCount}`;
  return `<details class="why"><summary id="${id}">Why it says that<span class="src-count">${sources.length}</span></summary>
      <div class="srcs">${sources.map((s) => sourceHtml(s, exchanges)).join("")}</div>
    </details>`;
}

// ---- charts --------------------------------------------------------------

// The hero. One bar, the whole week, segmented by task and coloured by
// verdict. Ordered automate → augment → human so the changing half of the
// week reads as one block rather than being scattered.
function weekBar(week) {
  const ordered = [...week].sort(
    (a, b) => VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict) || b.shareOfWeek - a.shareOfWeek,
  );
  const totals = VERDICT_ORDER.map((v) => ({
    verdict: v,
    share: ordered.filter((w) => w.verdict === v).reduce((a, w) => a + w.shareOfWeek, 0),
  })).filter((t) => t.share > 0);

  const segs = ordered
    .map(
      (w) => `<div class="seg v-${w.verdict}" style="flex-grow:${w.shareOfWeek}"
        tabindex="0" role="listitem"
        data-tip="${esc(w.task)} · ${pct(w.shareOfWeek)}% · ${esc(VERDICT[w.verdict].label)}">
        ${w.shareOfWeek >= 0.08 ? `<span class="seg-pct">${pct(w.shareOfWeek)}%</span>` : ""}
      </div>`,
    )
    .join("");

  const legend = VERDICT_ORDER.filter((v) => totals.some((t) => t.verdict === v))
    .map((v) => {
      const t = totals.find((x) => x.verdict === v);
      return `<div class="key"><span class="swatch v-${v}"></span><b>${esc(VERDICT[v].label)}</b>
        <span class="key-n">${pct(t.share)}% of the week</span></div>`;
    })
    .join("");

  return `<figure class="chart">
    <figcaption>Your week, by what happens to each task</figcaption>
    <div class="weekbar" role="list" aria-label="Share of the working week by task">${segs}</div>
    <div class="legend">${legend}</div>
  </figure>`;
}

// Importance against confidence for each skill, joined by the gap. The
// distance is the story, so the rows are sorted by it and the connector is
// the emphasised mark rather than the endpoints.
function gapChart(skillGaps) {
  const rows = [...skillGaps]
    .sort((a, b) => b.importance - b.confidence - (a.importance - a.confidence))
    .map((g) => {
      const posn = (v) => ((v - 1) / 4) * 100;
      const lo = Math.min(g.confidence, g.importance);
      const hi = Math.max(g.confidence, g.importance);
      return `<div class="gap-row">
        <div class="gap-name">${esc(g.skill)}</div>
        <div class="gap-track" tabindex="0"
             data-tip="${esc(g.skill)} · matters ${g.importance}/5 · confident ${g.confidence}/5">
          <span class="gap-line" style="left:${posn(lo)}%;right:${100 - posn(hi)}%"></span>
          <span class="dot conf" style="left:${posn(g.confidence)}%"><i>${g.confidence}</i></span>
          <span class="dot imp" style="left:${posn(g.importance)}%"><i>${g.importance}</i></span>
        </div>
        <div class="gap-n">${g.importance - g.confidence > 0 ? `−${g.importance - g.confidence}` : "0"}</div>
      </div>`;
    })
    .join("");

  return `<figure class="chart">
    <figcaption>Where it matters most against where you feel strongest</figcaption>
    <div class="gap-scale"><span>1 &middot; not at all</span><span>5 &middot; completely</span></div>
    <div class="gaps">${rows}</div>
    <div class="legend">
      <div class="key"><span class="dot-key conf"></span><b>How confident you are now</b></div>
      <div class="key"><span class="dot-key imp"></span><b>How much it matters where you're going</b></div>
    </div>
  </figure>`;
}

function timeline(plan, exchanges) {
  const cols = [
    ["day30", "By day 30"],
    ["day60", "By day 60"],
    ["day90", "By day 90"],
  ]
    .map(
      ([k, label]) => `<div class="period">
        <div class="period-head"><span class="node"></span>${esc(label)}</div>
        <ol class="commits">${plan[k]
          .map((c) => `<li>${esc(c.commitment)}${why(c.sources, exchanges)}</li>`)
          .join("")}</ol>
      </div>`,
    )
    .join("");
  return `<figure class="chart timeline">
    <figcaption>What you said you would do</figcaption>
    <div class="track"></div>
    <div class="periods">${cols}</div>
  </figure>`;
}

// Status, not a series: the reserved palette, always with a glyph and a word.
function exposureStatus(direction) {
  const map = {
    growing: ["var(--good)", "▲", "Growing"],
    mixed: ["var(--warn)", "◆", "Mixed"],
    declining: ["var(--bad)", "▼", "Declining"],
    unknown: ["var(--muted)", "—", "Not established"],
  };
  const [colour, glyph, label] = map[direction] ?? map.unknown;
  return `<div class="status" style="color:${colour}"><span class="glyph" aria-hidden="true">${glyph}</span>${esc(label)}</div>`;
}

function weekTable(week) {
  const rows = [...week]
    .sort((a, b) => b.shareOfWeek - a.shareOfWeek)
    .map(
      (w) =>
        `<tr><td>${esc(w.task)}</td><td class="num">${pct(w.shareOfWeek)}%</td><td>${esc(VERDICT[w.verdict].label)}</td></tr>`,
    )
    .join("");
  return `<details class="table-view"><summary>See this as a table</summary>
    <div class="tablewrap"><table>
      <thead><tr><th>Task</th><th class="num">Share of week</th><th>Verdict</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></details>`;
}

// ---- page ----------------------------------------------------------------

export function renderPage(record) {
  const { profile, report, exchanges, meta } = record;
  whyCount = 0;
  const when = new Date(record.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const weekRows = [...report.week]
    .sort((a, b) => b.shareOfWeek - a.shareOfWeek)
    .map(
      (w) => `<div class="task">
        <div class="task-head">
          <span class="chip v-${w.verdict}">${esc(VERDICT[w.verdict].label)}</span>
          <b>${esc(w.task)}</b>
          <span class="task-pct">${pct(w.shareOfWeek)}% of the week</span>
        </div>
        <p>${esc(w.reason)}</p>
        ${why(w.sources, exchanges)}
      </div>`,
    )
    .join("");

  const gapRows = [...report.skillGaps]
    .sort((a, b) => b.importance - b.confidence - (a.importance - a.confidence))
    .map(
      (g) => `<div class="task">
        <div class="task-head"><b>${esc(g.skill)}</b>
          <span class="task-pct">matters ${g.importance}/5 &middot; confident ${g.confidence}/5</span></div>
        <p>${esc(g.cost)}</p>
        ${why(g.sources, exchanges)}
      </div>`,
    )
    .join("");

  const steps = report.nextSteps
    .map((n) => {
      const r = resourceFor(n.slug);
      return r
        ? `<li><a href="${esc(resources.base + r.slug)}">${esc(r.title)}</a><span>${esc(n.why)}</span></li>`
        : `<li><b>Unknown resource: ${esc(n.slug)}</b><span>${esc(n.why)}</span></li>`;
    })
    .join("");

  const transcript = exchanges
    .map(
      (e) => `<div class="xq"><div class="xq-q"><span class="xq-n">Q${e.turn}</span>${esc(e.question)}</div>
        <div class="xq-a">${esc(e.answer)}</div></div>`,
    )
    .join("");

  const sampleNote = meta?.simulated
    ? `<div class="banner">Sample report. The answers below came from a simulated person, not a real one.</div>`
    : "";

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Task Map · ${esc(profile.role)}</title>
<style>
:root {
  color-scheme: light;
  /* Surfaces and ink. Swap this block to restyle the whole report. */
  --page: #f4f5f7;
  --surface: #ffffff;
  --panel: #eef0f3;
  --ink: #101216;
  --ink-2: #3a4252;
  --muted: #5d6573;
  --line: #d7dbe1;
  --line-soft: #e6e9ed;
  --brand: #e8285a;
  --brand-ink: #ffffff;
  /* Chart series. Validated three-slot categorical set. */
  --automate: #eb6834;
  --augment: #2a78d6;
  --human: #1baf7a;
  --series-ink: #101216;
  /* Status. Reserved: never reused for a series. */
  --good: #0ca30c;
  --warn: #fab219;
  --bad: #d03b3b;
  --grid: #e1e0d9;
  --radius: 0px;
  --measure: 64ch;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --page: #0d0e11;
    --surface: #16181d;
    --panel: #1d2027;
    --ink: #eceef1;
    --ink-2: #c3c9d3;
    --muted: #99a1af;
    --line: #2e343e;
    --line-soft: #242932;
    --brand: #ff5f87;
    --brand-ink: #101216;
    --automate: #d95926;
    --augment: #3987e5;
    --human: #199e70;
    --series-ink: #0d0e11;
    --grid: #2c2c2a;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page: #0d0e11; --surface: #16181d; --panel: #1d2027;
  --ink: #eceef1; --ink-2: #c3c9d3; --muted: #99a1af;
  --line: #2e343e; --line-soft: #242932;
  --brand: #ff5f87; --brand-ink: #101216;
  --automate: #d95926; --augment: #3987e5; --human: #199e70;
  --series-ink: #0d0e11; --grid: #2c2c2a;
}

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--page); color: var(--ink);
  font: 16px/1.6 "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  padding-inline: 20px; padding-block: 0 80px;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 780px; margin: 0 auto; }
h1, h2, h3 { text-wrap: balance; }
h1 { font-size: clamp(28px, 5vw, 40px); line-height: 1.1; letter-spacing: -0.02em; margin: 8px 0 12px; }
h2 { font-size: 22px; letter-spacing: -0.01em; margin: 0 0 4px; }
p { margin: 0 0 12px; max-width: var(--measure); }
a { color: var(--ink); text-decoration-color: var(--brand); text-underline-offset: 3px; }
.eyebrow {
  font: 500 11.5px/1 ui-monospace, "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}

header { padding-block: 48px 28px; border-bottom: 2px solid var(--ink); }
.meta { display: flex; flex-wrap: wrap; gap: 6px 24px; font: 12.5px ui-monospace, monospace; color: var(--muted); }
.meta b { color: var(--ink); font-weight: 500; }
.banner {
  margin-top: 18px; padding: 10px 14px; background: var(--panel);
  border-left: 3px solid var(--brand); font-size: 14.5px; color: var(--ink-2);
}

section { padding-block: 36px 8px; border-bottom: 1px solid var(--line-soft); }
.lede { font-size: 20px; line-height: 1.4; color: var(--ink); max-width: 34em; margin: 0 0 14px; }

/* --- sources --- */
details.why { margin: 6px 0 0; max-width: var(--measure); }
details.why summary {
  cursor: pointer; list-style: none; display: inline-flex; align-items: center; gap: 7px;
  font: 500 11.5px/1 ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--brand); padding: 4px 0;
}
details.why summary::-webkit-details-marker { display: none; }
details.why summary::before { content: "+"; font-weight: 700; font-size: 13px; }
details.why[open] summary::before { content: "−"; }
details.why summary:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; }
.src-count {
  background: var(--panel); color: var(--muted); padding: 1px 5px;
  border-radius: 999px; letter-spacing: 0;
}
.srcs { margin: 4px 0 12px; display: grid; gap: 6px; }
.src {
  padding: 9px 13px; border-left: 2px solid var(--line);
  background: var(--panel); font-size: 14.5px; color: var(--ink-2);
}
.src-label {
  display: block; font: 500 10.5px/1.4 ui-monospace, monospace;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px;
}
.nosource { color: var(--brand); font-size: 14px; }

/* --- the week bar --- */
figure.chart { margin: 18px 0 24px; }
figcaption {
  font: 500 11.5px/1 ui-monospace, monospace; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 10px;
}
.weekbar { display: flex; gap: 2px; height: 56px; width: 100%; }
.seg {
  position: relative; min-width: 3px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius); cursor: default;
}
.seg:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.seg-pct { font: 700 12.5px ui-monospace, monospace; color: var(--series-ink); }
.v-automate { background: var(--automate); }
.v-augment  { background: var(--augment); }
.v-human    { background: var(--human); }
.legend { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 12px; }
.key { display: flex; align-items: center; gap: 7px; font-size: 14px; color: var(--ink-2); }
.key b { font-weight: 600; color: var(--ink); }
.key-n { color: var(--muted); font: 12.5px ui-monospace, monospace; }
.swatch { width: 12px; height: 12px; flex: none; border-radius: var(--radius); }

/* --- task detail rows --- */
.task { padding: 14px 0; border-top: 1px solid var(--line-soft); }
.task:first-of-type { border-top: none; }
.task-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; margin-bottom: 5px; }
.task-head b { font-size: 16.5px; }
.task-pct { font: 12.5px ui-monospace, monospace; color: var(--muted); }
.task p { font-size: 15.5px; color: var(--ink-2); margin: 0 0 2px; }
.chip {
  font: 600 10.5px/1 ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 7px; color: var(--series-ink); border-radius: var(--radius); flex: none;
}

/* --- skill gaps --- */
.gap-scale {
  display: flex; justify-content: space-between; font: 11.5px ui-monospace, monospace;
  color: var(--muted); padding-left: 180px; margin-bottom: 6px;
}
.gaps { display: grid; gap: 4px; }
.gap-row { display: grid; grid-template-columns: 180px 1fr 34px; align-items: center; gap: 12px; }
.gap-name { font-size: 14.5px; color: var(--ink); text-align: right; }
.gap-track {
  position: relative; height: 30px; border-radius: var(--radius);
  background: linear-gradient(to right, var(--grid) 1px, transparent 1px) 0 0 / 25% 100%;
  border-bottom: 1px solid var(--grid);
}
.gap-track:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.gap-line { position: absolute; top: 50%; height: 2px; background: var(--muted); transform: translateY(-50%); }
.dot {
  position: absolute; top: 50%; width: 20px; height: 20px; margin-left: -10px;
  transform: translateY(-50%); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.dot i { font: 600 10.5px/1 ui-monospace, monospace; font-style: normal; }
.dot.imp { background: var(--ink); box-shadow: 0 0 0 2px var(--surface); }
.dot.imp i { color: var(--surface); }
.dot.conf { background: var(--surface); box-shadow: inset 0 0 0 2px var(--muted), 0 0 0 2px var(--surface); }
.dot.conf i { color: var(--ink-2); }
.gap-n { font: 600 13px ui-monospace, monospace; color: var(--brand); text-align: left; }
.dot-key { width: 14px; height: 14px; flex: none; border-radius: 50%; }
.dot-key.imp { background: var(--ink); }
.dot-key.conf { background: var(--surface); box-shadow: inset 0 0 0 2px var(--muted); }

/* --- timeline --- */
.timeline .track { height: 2px; background: var(--line); margin-bottom: -1px; }
.periods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.period-head {
  display: flex; align-items: center; gap: 8px; padding-top: 12px;
  font: 600 12px ui-monospace, monospace; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink);
}
.period-head .node {
  width: 9px; height: 9px; background: var(--brand); flex: none; margin-top: -21px; border-radius: 50%;
}
.commits { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 14px; }
.commits li { font-size: 15px; color: var(--ink-2); }

/* --- tiles, tables, transcript --- */
.tile { background: var(--surface); border: 1px solid var(--line); padding: 18px 20px; margin: 14px 0 8px; }
.status {
  display: inline-flex; align-items: center; gap: 7px; font: 600 12px ui-monospace, monospace;
  letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;
}
.status .glyph { font-size: 15px; }
.table-view summary {
  cursor: pointer; font: 500 11.5px/1 ui-monospace, monospace; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted); padding: 8px 0;
}
.table-view summary:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; }
.tablewrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; margin: 6px 0 10px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
th { font: 500 11px ui-monospace, monospace; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, monospace; }
ol.steps { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 12px; }
ol.steps li { display: grid; gap: 2px; }
ol.steps a { font-weight: 600; }
ol.steps span { font-size: 14.5px; color: var(--ink-2); }
.xq { padding: 14px 0; border-top: 1px solid var(--line-soft); }
.xq-q { font-weight: 600; display: flex; gap: 10px; }
.xq-n { font: 600 12px ui-monospace, monospace; color: var(--brand); flex: none; padding-top: 3px; }
.xq-a { margin-top: 6px; color: var(--ink-2); font-size: 15.5px; padding-left: 32px; }

#tip {
  position: fixed; z-index: 50; pointer-events: none; opacity: 0;
  background: var(--ink); color: var(--page); font-size: 13px; line-height: 1.35;
  padding: 7px 10px; max-width: 280px; transition: opacity .1s;
}
footer { padding-top: 22px; font-size: 13.5px; color: var(--muted); }

@media (max-width: 640px) {
  .periods { grid-template-columns: 1fr; gap: 4px; }
  .timeline .track { display: none; }
  .period-head .node { margin-top: 0; }
  .gap-row { grid-template-columns: 1fr 30px; }
  .gap-name { grid-column: 1 / -1; text-align: left; }
  .gap-scale { padding-left: 0; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
<div class="wrap">
<header>
  <span class="eyebrow">Task Map</span>
  <h1>${esc(profile.role)}</h1>
  <div class="meta">
    <span>Industry <b>${esc(profile.industry)}</b></span>
    <span>Based in <b>${esc(profile.location)}</b></span>
    <span>Date <b>${esc(when)}</b></span>
  </div>
  ${sampleNote}
</header>

<section>
  <p class="lede">${esc(report.headline.text)}</p>
  ${why(report.headline.sources, exchanges)}
  ${weekBar(report.week)}
  ${weekTable(report.week)}
</section>

<section>
  <span class="eyebrow">Task by task</span>
  <h2>What happens to each part of your week</h2>
  ${weekRows}
</section>

<section>
  <span class="eyebrow">Where your role sits</span>
  <h2>The wider picture</h2>
  <div class="tile">
    ${exposureStatus(report.exposure.direction)}
    <p>${esc(report.exposure.summary)}</p>
    ${why(report.exposure.sources, exchanges)}
  </div>
</section>

<section>
  <span class="eyebrow">Skills</span>
  <h2>The gaps worth closing first</h2>
  ${gapChart(report.skillGaps)}
  ${gapRows}
</section>

<section>
  <span class="eyebrow">The uncomfortable bit</span>
  <h2>Truth you might be avoiding</h2>
  <p class="lede">${esc(report.truth.text)}</p>
  ${why(report.truth.sources, exchanges)}
</section>

<section>
  <span class="eyebrow">The plan</span>
  <h2>The next ninety days</h2>
  ${timeline(report.plan, exchanges)}
</section>

<section>
  <span class="eyebrow">Next</span>
  <h2>What to read</h2>
  <ol class="steps">${steps}</ol>
</section>

<section>
  <details class="table-view"><summary>The whole conversation</summary>${transcript}</details>
</section>

<footer>
  Grounded in the World Economic Forum <i>Future of Jobs Report 2025</i>.
  Every claim above carries its source: their words, or a figure from the report.
  Task Map, by The Human Co.
</footer>
</div>
<div id="tip" role="status"></div>
<script>
(function () {
  var tip = document.getElementById("tip");
  function show(el, x, y) {
    tip.textContent = el.getAttribute("data-tip");
    tip.style.opacity = "1";
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8) + "px";
    tip.style.top = (y - h - 12 < 8 ? y + 18 : y - h - 12) + "px";
  }
  function hide() { tip.style.opacity = "0"; }
  document.querySelectorAll("[data-tip]").forEach(function (el) {
    el.addEventListener("mousemove", function (e) { show(el, e.clientX, e.clientY); });
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focus", function () {
      var r = el.getBoundingClientRect();
      show(el, r.left + r.width / 2, r.top);
    });
    el.addEventListener("blur", hide);
  });
})();
</script>
</body>
</html>`;
}

// ---- cli -----------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  let record;
  if (!arg || arg === "--sample") {
    record = JSON.parse(fs.readFileSync(path.join(ROOT, "data/sample/ops-logistics.json"), "utf8"));
  } else {
    record = load(arg);
    if (!record) {
      console.error(`No record with id "${arg}". Run an interview first, or pass --sample.`);
      process.exit(1);
    }
  }
  const out = path.join(ROOT, "pages", `${record.id}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderPage(record));
  console.log(path.relative(ROOT, out));
}

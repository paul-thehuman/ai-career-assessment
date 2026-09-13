// Renders an interview (transcript + case file + report) as Markdown, with
// every source shown under the claim it supports. This is the terminal
// version of the "why it says that" toggle.
import { wef, resources } from "./engine.js";

const index = new Map();
for (const h of wef.headline) index.set(h.id, `WEF 2025: ${h.claim}`);
for (const d of wef.drivers) index.set(d.id, `WEF 2025 driver: ${d.label}`);
for (const s of wef.skills) index.set(s.id, `WEF 2025 skill: ${s.label} (${s.trend}${s.core2025Rank ? `, core skill #${s.core2025Rank}` : ""}${s.risingRank ? `, rising #${s.risingRank}` : ""})`);
for (const t of wef.taskCategories) index.set(t.id, `WEF 2025 task category: ${t.label} (${t.direction}). ${t.note}`);
for (const f of wef.economies.uk.findings) index.set(f.id, `WEF 2025, United Kingdom: ${f.claim}`);
for (const c of wef.clusters) index.set(c.id, `WEF 2025 cluster: ${c.label} (${c.direction}). ${c.wefEvidence}`);
const resourceIndex = new Map(resources.items.map((r) => [r.slug, r]));

export function sourceLine(s) {
  if (s.type === "quote") return `> "${s.text ?? ""}" (turn ${s.turn ?? "?"})`;
  const known = index.get(s.id ?? "");
  return known ? `> ${known} [${s.id}]` : `> UNKNOWN WEF ID: ${s.id}`;
}

function claimBlock(text, sources) {
  const lines = [text];
  if (!sources || sources.length === 0) lines.push("> NO SOURCE GIVEN");
  else for (const s of sources) lines.push(sourceLine(s));
  return lines.join("\n");
}

export function unsourcedClaims(report) {
  const out = [];
  const check = (label, sources) => { if (!sources || sources.length === 0) out.push(label); };
  check("headline", report.headline.sources);
  report.week.forEach((w) => check(`week: ${w.task}`, w.sources));
  check("exposure", report.exposure.sources);
  report.skillGaps.forEach((g) => check(`skill gap: ${g.skill}`, g.sources));
  check("truth", report.truth.sources);
  for (const k of ["day30", "day60", "day90"]) report.plan[k].forEach((c) => check(`${k}: ${c.commitment}`, c.sources));
  return out;
}

export function badSources(report) {
  const out = [];
  const walk = (label, sources) => {
    for (const s of sources ?? []) {
      if (s.type === "wef" && !index.has(s.id ?? "")) out.push(`${label}: unknown wef id ${s.id}`);
      if (s.type === "quote" && !(s.text && s.text.trim())) out.push(`${label}: empty quote`);
    }
  };
  walk("headline", report.headline.sources);
  report.week.forEach((w) => walk(`week: ${w.task}`, w.sources));
  walk("exposure", report.exposure.sources);
  report.skillGaps.forEach((g) => walk(`skill gap: ${g.skill}`, g.sources));
  walk("truth", report.truth.sources);
  for (const k of ["day30", "day60", "day90"]) report.plan[k].forEach((c) => walk(`${k}`, c.sources));
  report.nextSteps.forEach((n) => { if (!resourceIndex.has(n.slug)) out.push(`nextSteps: invented slug ${n.slug}`); });
  return out;
}

// Quotes must actually appear in the person's answers. This catches
// paraphrase dressed up as a quote, which is the failure that would sink
// the "show your working" promise.
export function unverifiedQuotes(report, exchanges) {
  const answers = exchanges.map((e) => (e.answer ?? "").toLowerCase().replace(/\s+/g, " "));
  const all = answers.join(" \n ");
  const out = [];
  const walk = (label, sources) => {
    for (const s of sources ?? []) {
      if (s.type !== "quote" || !s.text) continue;
      const needle = s.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (!all.includes(needle)) out.push(`${label}: "${s.text}"`);
    }
  };
  walk("headline", report.headline.sources);
  report.week.forEach((w) => walk(`week: ${w.task}`, w.sources));
  walk("exposure", report.exposure.sources);
  report.skillGaps.forEach((g) => walk(`skill gap: ${g.skill}`, g.sources));
  walk("truth", report.truth.sources);
  for (const k of ["day30", "day60", "day90"]) report.plan[k].forEach((c) => walk(k, c.sources));
  return out;
}

function bar(share) {
  const n = Math.max(0, Math.min(20, Math.round((share ?? 0) * 20)));
  return "▓".repeat(n) + "░".repeat(20 - n);
}

export function renderMarkdown({ profile, exchanges, caseFile, report, usage, meta = {} }) {
  const L = [];
  L.push(`# Task Map: ${profile.role}`);
  L.push("");
  L.push(`Industry: ${profile.industry} · Location: ${profile.location}${meta.persona ? ` · Simulated persona: ${meta.persona}` : ""}`);
  L.push("");
  L.push("## Interview");
  L.push("");
  for (const e of exchanges) {
    L.push(`**Q${e.turn}.** ${e.question}`);
    if (e.rationale) L.push(`<sub>why: ${e.rationale}</sub>`);
    L.push("");
    L.push(`${e.answer ?? "(no answer)"}`);
    L.push("");
  }
  if (!report) { L.push("_Interview did not finish._"); return L.join("\n"); }

  L.push("## Report");
  L.push("");
  L.push(`**${report.headline.text}**`);
  for (const s of report.headline.sources) L.push(sourceLine(s));
  L.push("");
  L.push("### Your week, task by task");
  L.push("");
  const week = [...report.week].sort((a, b) => b.shareOfWeek - a.shareOfWeek);
  for (const w of week) {
    L.push(`- \`${bar(w.shareOfWeek)}\` ${Math.round(w.shareOfWeek * 100)}% · **${w.task}** → ${w.verdict.toUpperCase()}`);
    L.push(`  ${w.reason}`);
    for (const s of w.sources) L.push(`  ${sourceLine(s)}`);
  }
  L.push("");
  L.push(`### Exposure: ${report.exposure.direction}`);
  L.push("");
  L.push(claimBlock(report.exposure.summary, report.exposure.sources));
  L.push("");
  L.push("### Skill gaps");
  L.push("");
  for (const g of report.skillGaps) {
    L.push(`- **${g.skill}** · importance ${g.importance}/5 · confidence ${g.confidence}/5 · gap ${g.importance - g.confidence}`);
    L.push(`  ${g.cost}`);
    for (const s of g.sources) L.push(`  ${sourceLine(s)}`);
  }
  L.push("");
  L.push("### Truth you might be avoiding");
  L.push("");
  L.push(claimBlock(report.truth.text, report.truth.sources));
  L.push("");
  L.push("### The next ninety days");
  L.push("");
  for (const [k, label] of [["day30", "By day 30"], ["day60", "By day 60"], ["day90", "By day 90"]]) {
    L.push(`**${label}**`);
    for (const c of report.plan[k]) {
      L.push(`- ${c.commitment}`);
      for (const s of c.sources) L.push(`  ${sourceLine(s)}`);
    }
    L.push("");
  }
  L.push("### What to read next");
  L.push("");
  for (const n of report.nextSteps) {
    const r = resourceIndex.get(n.slug);
    L.push(r ? `- [${r.title}](${resources.base}${r.slug}): ${n.why}` : `- INVENTED SLUG ${n.slug}: ${n.why}`);
  }
  L.push("");
  L.push(`### Help wanted`);
  L.push("");
  L.push(`${report.helpWanted ?? "(not captured)"} · for: ${report.helpFor ?? "(not captured)"}`);
  L.push("");
  L.push("## Checks");
  L.push("");
  const u = unsourcedClaims(report), b = badSources(report), q = unverifiedQuotes(report, exchanges);
  L.push(`- Unsourced claims: ${u.length}${u.length ? "\n  - " + u.join("\n  - ") : ""}`);
  L.push(`- Bad sources: ${b.length}${b.length ? "\n  - " + b.join("\n  - ") : ""}`);
  L.push(`- Quotes not found verbatim in answers: ${q.length}${q.length ? "\n  - " + q.join("\n  - ") : ""}`);
  const shareSum = caseFile?.tasks?.reduce((a, t) => a + (t.shareOfWeek ?? 0), 0) ?? 0;
  L.push(`- Task shares sum: ${shareSum.toFixed(2)}`);
  if (usage) L.push(`- Tokens: in ${usage.input}, out ${usage.output}, cache read ${usage.cacheRead}, cache write ${usage.cacheWrite}`);
  L.push("");
  L.push("<details><summary>Case file</summary>");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(caseFile, null, 2));
  L.push("```");
  L.push("</details>");
  return L.join("\n");
}

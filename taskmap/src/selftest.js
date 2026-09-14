// Offline self-test: drives the engine with a fake client so the control
// flow (turn floor and cap, corrective retries, history shape) and the
// renderer's checks can be exercised without an API key. Not a quality
// test of the interviewer; that needs the real model.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interview, MIN_TURNS, MAX_TURNS } from "./engine.js";
import { renderMarkdown, unsourcedClaims, badSources, unverifiedQuotes, misattributedTurns, resolveTurn, sourceLine } from "./render.js";
import { emptyCaseFile } from "./schema.js";

const profile = { role: "Operations Manager", industry: "Logistics", location: "Manchester, UK" };
const answers = [
  "Monday mornings go on the numbers. I pull from three spreadsheets and mostly copy last week's format.",
  "When something goes wrong on the road, they ring me, not the system.",
  "I'd like to be head of operations across the region within a couple of years.",
  "I'm not worried about AI. My job is people.",
  "Honestly I haven't tried any of the tools on the reporting. No time.",
  "Help for the team really. Getting them off the spreadsheets.",
];

function turnAsking(q, n, ready = false) {
  return { caseFile: { ...emptyCaseFile(), cluster: "ops-management", tasks: [{ task: "Weekly reporting", shareOfWeek: 0.2, exposure: "high", category: "tc-info-processing", sourceTurn: 1 }, { task: "Escalations", shareOfWeek: 0.8, exposure: "low", category: "tc-customer", sourceTurn: 2 }], gaps: ["aspiration"] }, question: q, rationale: `q${n}`, readyToFinish: ready };
}
function turnDone() {
  const quote = (turn, text) => ({ type: "quote", turn, text, id: "" });
  const wef = (id) => ({ type: "wef", turn: 0, text: "", id });
  return {
      headline: { text: "A fifth of your week is assembly work.", sources: [quote(1, "mostly copy last week's format")] },
      week: [
        { task: "Weekly reporting", shareOfWeek: 0.2, verdict: "automate", reason: "Assembly, not judgment.", sources: [quote(1, "I pull from three spreadsheets"), wef("tc-info-processing")] },
        { task: "Escalations", shareOfWeek: 0.8, verdict: "human", reason: "They ring you.", sources: [quote(2, "they ring me, not the system"), wef("sk-resilience")] },
      ],
      exposure: { direction: "growing", summary: "Ops management grows.", sources: [wef("ops-management")] },
      skillGaps: [{ skill: "Analytical thinking", importance: 5, confidence: 2, cost: "You stay the person who copies numbers.", sources: [quote(1, "mostly copy last week's format"), wef("sk-analytical")] }],
      truth: { text: "You said it is about people, then described a week you have not tried to change.", sources: [quote(4, "My job is people."), quote(5, "I haven't tried any of the tools on the reporting")] },
      plan: { day30: [{ commitment: "Rebuild Monday's report with a tool before month end.", sources: [quote(1, "three spreadsheets")] }], day60: [{ commitment: "Hand the rebuilt report to a team member.", sources: [quote(5, "No time")] }], day90: [{ commitment: "Take the case for head of ops to the MD.", sources: [quote(3, "head of operations across the region")] }] },
      nextSteps: [{ slug: "ai-for-spreadsheets-formulas-and-data", why: "The report." }, { slug: "made-up-slug", why: "should be flagged" }],
      helpWanted: "Getting the team off the spreadsheets", helpFor: "team",
  };
}

// Script: the interviewer says it is ready at question 3 (below the floor,
// so the engine must ignore it), then again at question 6 (allowed).
let calls = 0;
const fake = {
  messages: {
    parse: async ({ messages, output_config }) => {
      calls++;
      const isDone = !!output_config.format.schema.properties?.week;
      const n = messages.filter((m) => m.role === "assistant").length;
      if (isDone) return { parsed_output: turnDone(), usage: {}, stop_reason: "end_turn" };
      const ready = n === 2 || n === 5;
      return { parsed_output: turnAsking(`Question ${n + 1}?`, n + 1, ready), usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: "end_turn" };
    },
  },
};

const iv = new Interview({ client: fake, profile, log: () => {} });
let r = await iv.next();
let i = 0;
while (r.phase === "asking") {
  assert.equal(r.turn, iv.exchanges.length);
  r = await iv.next(answers[i % answers.length]); i++;
}
assert.equal(r.phase, "done");
assert.equal(iv.exchanges.length, 5, `ready below the floor must be ignored, ready at ${MIN_TURNS} answers honoured; got ${iv.exchanges.length}`);
assert.ok(iv.exchanges.length >= MIN_TURNS && iv.exchanges.length <= MAX_TURNS);
// history alternates user/assistant and never ends on assistant before a call
for (let k = 1; k < iv.history.length; k++) assert.notEqual(iv.history[k].role, iv.history[k - 1].role, "history must alternate");
const md = renderMarkdown({ profile, exchanges: iv.exchanges, caseFile: iv.caseFile, report: iv.report, usage: iv.usage });
assert.equal(unsourcedClaims(iv.report).length, 0);
assert.deepEqual(badSources(iv.report), ["nextSteps: invented slug made-up-slug"]);
assert.equal(unverifiedQuotes(iv.report, iv.exchanges).length, 0, "all scripted quotes appear verbatim in answers");
assert.ok(md.includes("→ AUTOMATE") && md.includes("INVENTED SLUG made-up-slug"));
// Turn numbers come from the transcript, not the model. A live run showed the
// model getting most of them wrong in one interview out of three, so a wrong
// claimed turn must be corrected in the output and counted in the checks.
{
  const ex = iv.exchanges;
  const realTurn = resolveTurn("mostly copy last week's format", ex);
  assert.ok(realTurn >= 1, "a quote that exists must resolve to a turn");
  const lying = { type: "quote", turn: 99, text: "mostly copy last week's format", id: "" };
  assert.ok(sourceLine(lying, ex).includes(`(turn ${realTurn})`), "render must show the resolved turn, not the claimed one");
  const invented = { type: "quote", turn: 1, text: "words nobody ever said here", id: "" };
  assert.ok(sourceLine(invented, ex).includes("NOT FOUND IN ANY ANSWER"), "a quote in no answer must be flagged in the output");
  const bent = structuredClone(iv.report);
  bent.truth.sources[0].turn = 99;
  assert.equal(misattributedTurns(bent, ex).length, 1, "a wrong claimed turn must be counted");
  assert.equal(misattributedTurns(iv.report, ex).length, 0, "correct turns must not be flagged");
}
// ---- store: records are the thing a link points at, so they must round-trip
// exactly, never half-write, and never let an id become a path.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taskmap-store-"));
  process.env.TASKMAP_RECORDS_DIR = tmp;
  const store = await import(`./store.js?dir=${encodeURIComponent(tmp)}`);
  // the module reads the env var at import time, so point it at the temp dir first
  assert.equal(store.RECORDS_DIR, tmp, "store must honour TASKMAP_RECORDS_DIR");

  const a = store.save({ profile, exchanges: iv.exchanges, caseFile: iv.caseFile, report: iv.report, usage: iv.usage, cohort: "team-x" });
  const b = store.save({ profile, exchanges: iv.exchanges, caseFile: iv.caseFile, report: iv.report, usage: iv.usage, cohort: null });
  assert.notEqual(a.id, b.id, "ids must be unique");
  assert.ok(store.validId(a.id), `generated id must be valid: ${a.id}`);
  assert.deepEqual(store.load(a.id), a, "a record must round-trip unchanged");
  assert.equal(store.list().length, 2);
  assert.equal(store.byCohort("team-x").length, 1, "cohort filter must select only that team");
  assert.equal(store.byCohort(null).length, 1, "an individual record has no cohort");

  // An id arrives from a URL. It must never be trusted enough to build a path.
  for (const bad of ["../../etc/passwd", "../secrets", "SHORT", "", null, "a".repeat(17), "abc/def"]) {
    assert.equal(store.validId(bad), false, `must reject id: ${JSON.stringify(bad)}`);
    assert.equal(store.load(bad), null, `must not load id: ${JSON.stringify(bad)}`);
  }
  assert.equal(store.load("aaaaaaaaaaaaaaaa"), null, "a well-formed but absent id returns null, not a throw");
  assert.throws(() => store.save({ profile, exchanges: [], caseFile: {}, report: null }), /no report/,
    "an interview with no report must never be saved");
  assert.equal(fs.readdirSync(tmp).filter((f) => f.endsWith(".tmp")).length, 0, "no half-written files left behind");
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.TASKMAP_RECORDS_DIR;
}

// ---- page: the HTML must escape what people typed, show resolved turns, and
// never silently drop a source.
{
  const { renderPage } = await import("./page.js");
  const record = {
    id: "testtesttesttest", version: 1, createdAt: "2026-09-14T00:00:00.000Z", cohort: null,
    profile: { role: '<script>alert("x")</script>', industry: "Logistics & Co", location: "Manchester, UK" },
    exchanges: iv.exchanges,
    caseFile: structuredClone(iv.caseFile),
    report: structuredClone(iv.report),
    usage: iv.usage,
    meta: {},
  };
  record.report.truth.sources.push({ type: "quote", turn: 1, text: "words nobody ever said", id: "" });
  record.report.headline.sources.push({ type: "wef", turn: 0, text: "", id: "not-a-real-id" });

  const html = renderPage(record);
  assert.ok(!html.includes("<script>alert"), "a role must not be able to inject script");
  assert.ok(html.includes("&lt;script&gt;"), "the role is escaped, not dropped");
  assert.ok(html.includes("Logistics &amp; Co"), "ampersands are escaped");
  assert.ok(html.includes("NOT FOUND IN ANY ANSWER"), "a quote in no answer must be called out, not shown as fact");
  assert.ok(html.includes("Unknown source"), "an unknown WEF id must be called out");
  assert.ok(html.includes("See this as a table"), "the table view is the relief for the low-contrast slot");
  const opens = (html.match(/<details/g) || []).length, closes = (html.match(/<\/details>/g) || []).length;
  assert.equal(opens, closes, "details tags must balance");
  // every claim that has sources gets a toggle
  const claims = 1 + record.report.week.length + 1 + record.report.skillGaps.length + 1
    + record.report.plan.day30.length + record.report.plan.day60.length + record.report.plan.day90.length;
  assert.equal((html.match(/class="why"/g) || []).length, claims, "every sourced claim needs its own toggle");
  assert.equal((html.match(/class="nosource"/g) || []).length, 0, "no claim in this record is unsourced");
}

console.log(`selftest ok: ${iv.exchanges.length} questions, ${calls} model calls, floor enforced, early finish honoured above it, checks working, turn numbers resolved from the transcript, store and page covered.`);
console.log(md.split("\n").slice(0, 12).join("\n") + "\n...");

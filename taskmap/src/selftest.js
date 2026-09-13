// Offline self-test: drives the engine with a fake client so the control
// flow (turn floor and cap, corrective retries, history shape) and the
// renderer's checks can be exercised without an API key. Not a quality
// test of the interviewer; that needs the real model.
import assert from "node:assert/strict";
import { Interview, MIN_TURNS, MAX_TURNS } from "./engine.js";
import { renderMarkdown, unsourcedClaims, badSources, unverifiedQuotes } from "./render.js";
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
console.log(`selftest ok: ${iv.exchanges.length} questions, ${calls} model calls, floor enforced, early finish honoured above it, checks working.`);
console.log(md.split("\n").slice(0, 12).join("\n") + "\n...");

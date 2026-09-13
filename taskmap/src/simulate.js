// Runs the interviewer against simulated people so the interview quality
// can be judged before a real person sits in front of it. The personas are
// played by a second, cheaper model call. Every transcript is labeled as
// simulated. Needs ANTHROPIC_API_KEY.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Interview, ROOT } from "./engine.js";
import { renderMarkdown, unsourcedClaims, badSources, unverifiedQuotes } from "./render.js";

const PERSONA_MODEL = process.env.TASKMAP_PERSONA_MODEL || "claude-sonnet-5";

export const PERSONAS = [
  {
    key: "ops-logistics",
    profile: { role: "Operations Manager", industry: "Logistics and distribution", location: "Manchester, UK" },
    persona: "You are Dan, 41, operations manager at a regional parcel carrier with three depots. Mondays are spent pulling last week's numbers from three spreadsheets into a report for the MD, mostly by copying last week's format. A lot of your day is drivers ringing you when something goes wrong on the road, and juggling rota gaps. You've never tried an AI tool on the reporting; you say you haven't had time. You'd like to become head of operations across the region. You are a bit defensive about AI at first ('not worried, my job is people') and only open up when pressed. You'd want help mainly for your team, not yourself.",
  },
  {
    key: "hr-bp",
    profile: { role: "HR Business Partner", industry: "Professional services", location: "London, UK" },
    persona: "You are Priya, 34, HR business partner at a 300-person accountancy firm. Your week is casework and employee relations, recruitment coordination with agencies, drafting policy updates, running the performance cycle, and a lot of writing: letters, emails, meeting notes. You use ChatGPT a little for first drafts but you're unsure whether that's allowed and haven't asked. You want to move into an L&D or people development lead role. You're honest, articulate, occasionally over-explains. You would want help for yourself: knowing what's safe to use and how to get good at it.",
  },
  {
    key: "marketing-charity",
    profile: { role: "Marketing and Communications Executive", industry: "Charity", location: "Bristol, UK" },
    persona: "You are Tom, 28, the only marketing person at a mid-sized housing charity. Your week is social media scheduling, writing the newsletter and website updates, designing posts in Canva, reporting on email and social numbers to the fundraising director, and helping with fundraising campaign copy. You're worried AI makes your job look replaceable and you've been avoiding the topic. You'd like to lead communications somewhere bigger one day. You answer briefly, sometimes a bit vaguely, and need follow-ups to give specifics. You'd want help for yourself.",
  },
];

async function personaAnswer(client, persona, transcript) {
  const messages = [];
  for (const e of transcript) {
    messages.push({ role: "user", content: e.question });
    if (e.answer !== null) messages.push({ role: "assistant", content: e.answer });
  }
  const res = await client.messages.create({
    model: PERSONA_MODEL,
    max_tokens: 600,
    output_config: { effort: "low" },
    system: [
      persona,
      "You are being interviewed about your working week by a career tool. Answer each question in first person, in two to five sentences, the way a real person would over a video call: specific about your actual week, occasionally vague or defensive, never volunteering everything at once. Do not use bullet points. Do not describe yourself in the third person. Never mention that you are simulated.",
    ].join("\n\n"),
    messages,
  });
  return res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

async function run(p, client) {
  const interview = new Interview({ profile: p.profile, log: (m) => console.log(`  [${p.key}] ${m}`) });
  let result = await interview.next();
  while (result.phase === "asking") {
    console.log(`  [${p.key}] Q${result.turn}: ${result.question.slice(0, 110)}${result.question.length > 110 ? "…" : ""}`);
    const answer = await personaAnswer(client, p.persona, interview.exchanges);
    result = await interview.next(answer);
  }
  const md = renderMarkdown({ profile: p.profile, exchanges: interview.exchanges, caseFile: interview.caseFile, report: interview.report, usage: interview.usage, meta: { persona: p.key } });
  const file = path.join(ROOT, "transcripts", `sim-${p.key}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, md);
  const r = interview.report;
  return {
    key: p.key, questions: interview.exchanges.length, file,
    unsourced: unsourcedClaims(r).length, bad: badSources(r).length, unverifiedQuotes: unverifiedQuotes(r, interview.exchanges).length,
    tokens: interview.usage,
  };
}

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const chosen = only.length ? PERSONAS.filter((p) => only.includes(p.key)) : PERSONAS;
const client = new Anthropic();
const results = [];
for (const p of chosen) {
  console.log(`\nRunning ${p.key} (${p.profile.role})`);
  try { results.push(await run(p, client)); }
  catch (e) { console.error(`  [${p.key}] FAILED: ${e.message}`); results.push({ key: p.key, error: e.message }); }
}
console.log("\nSummary");
for (const r of results) {
  if (r.error) { console.log(`- ${r.key}: FAILED ${r.error}`); continue; }
  console.log(`- ${r.key}: ${r.questions} questions · unsourced ${r.unsourced} · bad sources ${r.bad} · unverified quotes ${r.unverifiedQuotes} · tokens in ${r.tokens.input} out ${r.tokens.output} cache ${r.tokens.cacheRead} · ${path.relative(ROOT, r.file)}`);
}

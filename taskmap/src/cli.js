// Run an interview in the terminal. Needs ANTHROPIC_API_KEY (or an
// `ant auth login` profile). `--dry` prints the system prompt and the JSON
// schema without calling the API.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Interview, SYSTEM_PROMPT, ROOT, MODEL, MAX_TURNS, MIN_TURNS } from "./engine.js";
import { AskTurn, DoneTurn } from "./schema.js";
import { renderMarkdown } from "./render.js";
import { save } from "./store.js";

if (process.argv.includes("--dry")) {
  console.log(SYSTEM_PROMPT);
  console.log("\n--- system prompt chars:", SYSTEM_PROMPT.length);
  const a = JSON.stringify(zodOutputFormat(AskTurn)), d = JSON.stringify(zodOutputFormat(DoneTurn));
  console.log(`--- output formats: ask schema ${a.length} chars, done schema ${d.length} chars`);
  console.log(a.slice(0, 1500) + "\n...");
  process.exit(0);
}

const rl = readline.createInterface({ input, output });
console.log(`Task Map interview · model ${MODEL} · ${MIN_TURNS} to ${MAX_TURNS} questions. Type 'skip' to skip a question.\n`);
const profile = {
  role: await rl.question("Your role: "),
  industry: await rl.question("Your industry: "),
  location: await rl.question("Where you're based: "),
};
const interview = new Interview({ profile, log: (m) => console.log(`  [engine] ${m}`) });

let result = await interview.next();
while (result.phase === "asking") {
  console.log(`\nQ${result.turn}. ${result.question}\n`);
  let answer = (await rl.question("> ")).trim();
  if (answer.toLowerCase() === "skip") answer = "I'd rather skip that one.";
  result = await interview.next(answer || "I'd rather skip that one.");
}
rl.close();

const cohort = process.env.TASKMAP_COHORT || null;
const record = save({
  profile,
  exchanges: interview.exchanges,
  caseFile: interview.caseFile,
  report: interview.report,
  usage: interview.usage,
  cohort,
});

const md = renderMarkdown({ profile, exchanges: interview.exchanges, caseFile: interview.caseFile, report: interview.report, usage: interview.usage });
const file = path.join(ROOT, "transcripts", `${record.id}.md`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, md);
console.log("\n" + md);
console.log(`\nSaved as ${record.id}${cohort ? ` (cohort: ${cohort})` : ""}`);
console.log(`  transcript  ${path.relative(ROOT, file)}`);
console.log(`  page        node src/page.js ${record.id}`);

// Run an interview in the terminal. Needs ANTHROPIC_API_KEY (or an
// `ant auth login` profile). `--dry` prints the system prompt and the JSON
// schema without calling the API.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Interview, SYSTEM_PROMPT, ROOT, MODEL, MAX_TURNS, MIN_TURNS } from "./engine.js";
import { Turn } from "./schema.js";
import { renderMarkdown } from "./render.js";

if (process.argv.includes("--dry")) {
  console.log(SYSTEM_PROMPT);
  console.log("\n--- system prompt chars:", SYSTEM_PROMPT.length);
  console.log("--- output format:");
  console.log(JSON.stringify(zodOutputFormat(Turn), null, 2).slice(0, 4000) + "\n...");
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

const md = renderMarkdown({ profile, exchanges: interview.exchanges, caseFile: interview.caseFile, report: interview.report, usage: interview.usage });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = path.join(ROOT, "transcripts", `${stamp}-${profile.role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, md);
console.log("\n" + md);
console.log(`\nSaved to ${file}`);

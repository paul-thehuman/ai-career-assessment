// Task Map: the shapes the interviewer must produce on every turn.
// Everything is required and nullable rather than optional, so the JSON
// schema handed to the API is unambiguous and the model can never omit a
// field it should have thought about.
import { z } from "zod/v4";

// A source is either a verbatim quote from the transcript (type "quote",
// with the turn number) or a WEF data point (type "wef", with its id from
// data/wef-2025.json). The report may not make a claim without one.
export const Source = z.object({
  type: z.enum(["quote", "wef"]),
  turn: z.number().int().nullable().describe("Interview turn the quote came from. Null for wef."),
  text: z.string().nullable().describe("Verbatim words from the person. Null for wef."),
  id: z.string().nullable().describe("Id from the WEF slice, e.g. sk-analytical, tc-info-processing, h-skills-change. Null for quote."),
});

export const Task = z.object({
  task: z.string(),
  shareOfWeek: z.number().describe("Estimated share of the working week, 0 to 1. All tasks together should be about 1."),
  exposure: z.enum(["high", "medium", "low", "unknown"]),
  category: z.string().nullable().describe("Task category id from the WEF slice, e.g. tc-info-processing."),
  sourceTurn: z.number().int().nullable().describe("Turn where the person described this task."),
});

export const Skill = z.object({
  skill: z.string(),
  wefId: z.string().nullable().describe("Skill id from the WEF slice if it maps, e.g. sk-analytical."),
  importance: z.number().int().describe("1 to 5, how much this skill matters for where they want to go."),
  confidence: z.number().int().describe("1 to 5, how confident they are today, from their own words."),
  evidence: z.string().nullable().describe("Verbatim words that support the rating."),
  evidenceTurn: z.number().int().nullable(),
});

export const CaseFile = z.object({
  cluster: z.string().nullable().describe("Cluster id from the WEF slice that best fits the role."),
  tasks: z.array(Task),
  skills: z.array(Skill),
  aspiration: z.string().nullable().describe("Where they want to be. Null until they have said."),
  avoiding: z.string().nullable().describe("The thing they said they should do and have not. Null until evidenced."),
  helpWanted: z.string().nullable().describe("What they said they would want help with. Null until asked."),
  helpFor: z.enum(["me", "team", "both"]).nullable(),
  challengeUsed: z.boolean().describe("True once the interviewer has used its one challenge."),
  gaps: z.array(z.string()).describe("What the interviewer still does not know, biggest first."),
});

export const Claim = z.object({ text: z.string(), sources: z.array(Source) });

export const WeekItem = z.object({
  task: z.string(),
  shareOfWeek: z.number(),
  verdict: z.enum(["automate", "augment", "human"]),
  reason: z.string().describe("One or two sentences, specific to this person."),
  sources: z.array(Source),
});

export const SkillGap = z.object({
  skill: z.string(),
  importance: z.number().int(),
  confidence: z.number().int(),
  cost: z.string().describe("What it costs them to leave this gap open. Plain and specific."),
  sources: z.array(Source),
});

export const Commitment = z.object({
  commitment: z.string().describe("Active voice. Something they will do, not something to consider."),
  sources: z.array(Source),
});

export const NextStep = z.object({
  slug: z.string().describe("Must be a slug from the resources list. Never invent one."),
  why: z.string(),
});

export const Report = z.object({
  headline: Claim.describe("One sentence that says what this person's situation is."),
  week: z.array(WeekItem).describe("Every task from the case file, with a verdict."),
  exposure: z.object({
    direction: z.enum(["growing", "mixed", "declining", "unknown"]),
    summary: z.string(),
    sources: z.array(Source),
  }),
  skillGaps: z.array(SkillGap).describe("Widest gap first."),
  truth: Claim.describe("Truth you might be avoiding. One line, evidenced by two things they said."),
  plan: z.object({
    day30: z.array(Commitment),
    day60: z.array(Commitment),
    day90: z.array(Commitment),
  }),
  nextSteps: z.array(NextStep).describe("Two or three, from the resources list only."),
  helpWanted: z.string().nullable(),
  helpFor: z.enum(["me", "team", "both"]).nullable(),
});

export const Turn = z.object({
  phase: z.enum(["asking", "done"]),
  caseFile: CaseFile,
  question: z.string().nullable().describe("The single next question. Null when phase is done."),
  rationale: z.string().describe("One line for the log: why this question, or why finishing now."),
  report: Report.nullable().describe("Null while asking. Complete when done."),
});

export function emptyCaseFile() {
  return {
    cluster: null, tasks: [], skills: [], aspiration: null, avoiding: null,
    helpWanted: null, helpFor: null, challengeUsed: false, gaps: ["everything"],
  };
}

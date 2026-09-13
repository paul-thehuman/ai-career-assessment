// Task Map: the shapes the interviewer must produce on every turn.
// Two rules keep the API's compiled grammar small: no nullable fields
// (unused fields carry "" or 0 instead), and two separate schemas rather
// than one union, so asking turns never carry the report.
import { z } from "zod/v4";

// A source is either a verbatim quote from the transcript (type "quote":
// turn number and exact words; id is "") or a WEF data point (type "wef":
// id from data/wef-2025.json; turn is 0 and text is "").
export const Source = z.object({
  type: z.enum(["quote", "wef"]),
  turn: z.number().int().describe("Interview turn the quote came from. 0 for wef."),
  text: z.string().describe("Verbatim words from the person. Empty string for wef."),
  id: z.string().describe("Id from the WEF slice, e.g. sk-analytical, tc-info-processing, h-skills-change, uk-skills-change. Empty string for quote."),
});

export const Task = z.object({
  task: z.string(),
  shareOfWeek: z.number().describe("Estimated share of the working week, 0 to 1. All tasks together should be about 1."),
  exposure: z.enum(["high", "medium", "low", "unknown"]),
  category: z.string().describe("Task category id from the WEF slice, e.g. tc-info-processing. Empty string if none fits."),
  sourceTurn: z.number().int().describe("Turn where the person described this task. 0 if inferred."),
});

export const Skill = z.object({
  skill: z.string(),
  wefId: z.string().describe("Skill id from the WEF slice if it maps, e.g. sk-analytical. Empty string otherwise."),
  importance: z.number().int().describe("1 to 5, how much this skill matters for where they want to go."),
  confidence: z.number().int().describe("1 to 5, how confident they are today, from their own words."),
  evidence: z.string().describe("Verbatim words that support the rating. Empty string if none yet."),
  evidenceTurn: z.number().int().describe("Turn of the evidence. 0 if none."),
});

export const CaseFile = z.object({
  cluster: z.string().describe("Cluster id from the WEF slice that best fits the role."),
  tasks: z.array(Task),
  skills: z.array(Skill),
  aspiration: z.string().describe("Where they want to be. Empty string until they have said."),
  avoiding: z.string().describe("The thing they said they should do and have not. Empty string until evidenced."),
  helpWanted: z.string().describe("What they said they would want help with. Empty string until asked."),
  helpFor: z.enum(["me", "team", "both", "unknown"]),
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
  helpWanted: z.string().describe("What they said they would want help with, in their words. Empty string if never said."),
  helpFor: z.enum(["me", "team", "both", "unknown"]),
});

export const AskTurn = z.object({
  caseFile: CaseFile,
  question: z.string().describe("The single next question."),
  rationale: z.string().describe("One line for the log: why this question."),
  readyToFinish: z.boolean().describe("True only when the case file is complete enough to write the report and you have nothing more worth asking. The system may still refuse if too few questions have been asked."),
});

// The final turn returns the report alone. The case file from the last
// asking turn is kept by the engine; the report carries every number the
// charts need (task shares, verdicts, skill ratings).
export const DoneTurn = Report;

export function emptyCaseFile() {
  return {
    cluster: "", tasks: [], skills: [], aspiration: "", avoiding: "",
    helpWanted: "", helpFor: "unknown", challengeUsed: false, gaps: ["everything"],
  };
}

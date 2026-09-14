# Task Map, stage one

The interview engine and the WEF data slice, run in the terminal. No interface yet, on purpose: the quality of the conversation and the report is decided here.

## What's in it

- `data/wef-2025.json`: the slice of the WEF Future of Jobs Report 2025 the interviewer reasons from: headline numbers, the nine drivers, all 26 skills with their core-skill share and rising rank, nine task categories, the four job lists, the UK economy findings, and 15 role clusters. Verified line by line against the report PDF on 2026-09-13; each entry names the figure or section it came from. `npm run check-data` re-prints anything still unverified.
- `content/resources.json`: the only links the report may recommend. All Paul's own articles and free courses.
- `src/schema.js`: the shapes the model must produce, enforced by the API's structured output mode. A source is a verbatim quote (with turn number) or a WEF id. No claim without one.
- `src/engine.js`: the interviewer. Opens from the role's cluster, keeps a case file, asks one question to fill the biggest gap, gets one challenge, finishes between 5 and 8 questions, produces the report.
- `src/render.js`: Markdown rendering with every source under its claim, plus three checks: unsourced claims, bad sources (unknown WEF ids, invented resource slugs) and quotes that don't appear verbatim in the answers.
- `src/cli.js`: sit the interview yourself.
- `src/simulate.js`: three simulated people, played by a second model, so the interviewer can be judged before a real person uses it. Transcripts land in `transcripts/` and are labeled as simulated.

## Running it

Needs an Anthropic API key. Either export `ANTHROPIC_API_KEY`, or put it in a
`.env` file next to this README and let Node load it (`.env` is gitignored):

```
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env

npm install
npm run check-data                            # data sanity check, no API
node src/cli.js --dry                         # system prompt + schemas, no API
node --env-file=.env src/cli.js               # the interview, in your terminal
node --env-file=.env src/simulate.js          # all three personas
node --env-file=.env src/simulate.js hr-bp    # or just one
```

Drop `--env-file=.env` if the key is already exported; the `npm run` scripts
assume that case.

Model defaults: interviewer `claude-opus-5` (medium effort on questions, high on the report), personas `claude-sonnet-5`. Override with `TASKMAP_MODEL` and `TASKMAP_PERSONA_MODEL`. Turn limits: `TASKMAP_MIN_TURNS` (5) and `TASKMAP_MAX_TURNS` (8).

## What a run costs

One full interview is about 18k input tokens and 10k output, with roughly 57k
more served from the cached system prompt. On Opus 5 that is a few pence per
person at the time of writing. The persona model in `simulate.js` adds a little
on top and is not part of the real product.

## What to judge in a transcript

1. Does the opening question use the cluster's task list, or does it ask "describe your role"?
2. Does each question follow from what was just said, and go after the biggest gap?
3. Is the one challenge used, and used well?
4. In the report: are the verdicts specific to this person? Is every quote real (the Checks section counts the ones that aren't)? Do the commitments read as things someone would actually do?
5. Does it feel like The Human Co., or like any career quiz?

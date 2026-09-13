// Sanity checks on the data slice and the resources list, and the
// verification checklist for the WEF entries.
import { wef, resources } from "./engine.js";

const problems = [];
const ids = new Set();
const seen = (id, where) => { if (ids.has(id)) problems.push(`duplicate id ${id} in ${where}`); ids.add(id); };
wef.headline.forEach((h) => seen(h.id, "headline"));
wef.drivers.forEach((d) => seen(d.id, "drivers"));
wef.skills.forEach((s) => seen(s.id, "skills"));
wef.taskCategories.forEach((t) => seen(t.id, "taskCategories"));
wef.clusters.forEach((c) => { seen(c.id, "clusters"); if (!c.typicalTasks?.length) problems.push(`cluster ${c.id} has no typicalTasks`); });
const slugs = resources.items.map((r) => r.slug);
if (new Set(slugs).size !== slugs.length) problems.push("duplicate resource slugs");

const unverified = [
  ...wef.headline.filter((x) => !x.verified).map((x) => `${x.id}: ${x.claim} [${x.ref}]`),
  ...wef.drivers.filter((x) => !x.verified).map((x) => `${x.id}: ${x.label} ${Math.round(x.share * 100)}% [${x.ref}]`),
  ...wef.skills.filter((x) => !x.verified).map((x) => `${x.id}: ${x.label}, core #${x.core2025Rank ?? "-"} (${x.core2025Share ?? "-"}), rising #${x.risingRank ?? "-"}, ${x.trend} [${x.ref}]`),
  ...wef.taskCategories.filter((x) => !x.verified).map((x) => `${x.id}: ${x.label} → ${x.direction} [${x.ref}]`),
  ...wef.clusters.filter((x) => !x.verified).map((x) => `${x.id}: ${x.label} → ${x.direction}; jobs: ${x.wefJobs.join("; ") || "none"}`),
  ...(wef.jobs.verified ? [] : ["jobs: all four job lists"]),
];

console.log(`WEF slice: ${wef.headline.length} headline claims, ${wef.drivers.length} drivers, ${wef.skills.length} skills, ${wef.taskCategories.length} task categories, ${wef.clusters.length} clusters, ${Object.values(wef.jobs).filter(Array.isArray).flat().length} job names.`);
console.log(`Resources: ${resources.items.length} slugs.`);
console.log(`Problems: ${problems.length}${problems.length ? "\n  - " + problems.join("\n  - ") : ""}`);
console.log(`\nVERIFICATION CHECKLIST (${unverified.length} entries still unverified against the PDF):`);
for (const u of unverified) console.log(`  [ ] ${u}`);
process.exit(problems.length ? 1 : 0);

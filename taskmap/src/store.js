// Where completed interviews are kept.
//
// One JSON file per record under data/records/, which is all a terminal
// prototype needs and makes a record readable without any tooling. The
// interface is deliberately the one a database would expose — save, load,
// list, byCohort — so moving to Postgres later replaces this file and
// nothing else.
//
// Records are immutable once written. A person's report does not change
// after they have read it, and a stable link that quietly rewrites itself
// is worse than no link.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT } from "./engine.js";

export const RECORDS_DIR = process.env.TASKMAP_RECORDS_DIR || path.join(ROOT, "data/records");

// Short, URL-safe, unguessable. A report link is the only thing protecting
// what someone said about their job, so 16 characters of base32 (80 bits)
// rather than a sequential number.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes
export function newId() {
  const bytes = crypto.randomBytes(16);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

const fileFor = (id) => path.join(RECORDS_DIR, `${id}.json`);

// Ids come from links and filenames, so never trust one enough to build a
// path from it unchecked.
export function validId(id) {
  return typeof id === "string" && /^[a-z2-9]{16}$/.test(id);
}

/**
 * Save a completed interview. Returns the record, including its new id.
 * `cohort` groups records that belong to one team; null for an individual.
 */
export function save({ profile, exchanges, caseFile, report, usage, cohort = null, meta = {} }) {
  if (!report) throw new Error("store.save: refusing to save an interview with no report");
  const record = {
    id: newId(),
    version: 1,
    createdAt: new Date().toISOString(),
    cohort,
    profile,
    exchanges,
    caseFile,
    report,
    usage,
    meta,
  };
  fs.mkdirSync(RECORDS_DIR, { recursive: true });
  // Write then rename, so a reader never sees a half-written record.
  const tmp = fileFor(record.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2));
  fs.renameSync(tmp, fileFor(record.id));
  return record;
}

export function load(id) {
  if (!validId(id)) return null;
  try {
    return JSON.parse(fs.readFileSync(fileFor(id), "utf8"));
  } catch {
    return null;
  }
}

export function list() {
  if (!fs.existsSync(RECORDS_DIR)) return [];
  return fs
    .readdirSync(RECORDS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => load(path.basename(f, ".json")))
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function byCohort(cohort) {
  return list().filter((r) => r.cohort === cohort);
}

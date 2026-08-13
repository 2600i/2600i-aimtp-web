/**
 * Stages the protocol's JSON Schemas into a directory the reverse proxy serves
 * at aimtp.net, and checks that each one is served at the URL it calls itself.
 *
 *   npm run schemas          stage into dist-schemas/
 *   npm run schemas:check    verify only, write nothing
 *
 * Why this lives here. aimtp.net is a protocol namespace before it is a
 * marketing host: the `$id` of every schema is an absolute URL on it, and
 * spec/trust-bundle cross-`$ref`s three siblings by absolute URL, so a
 * validator resolving a trust bundle fetches them over the network. They are
 * identifiers, not documentation links. This repository is what gets deployed
 * at that origin, so it is what has to put the files where the proxy expects
 * them — the same reason generate-gateway-trace.mjs reaches into the protocol
 * repo for protocol output.
 *
 * Nothing is committed. The output is derived and gitignored, so the protocol
 * repo stays the only definition of a schema and there is no vendored copy to
 * go stale.
 *
 * The check is the point. A schema whose `$id` does not match where it is
 * served resolves to nothing, or worse to the wrong document, and every
 * consumer fails at validation time rather than here.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AIMTP_REPO = process.env.AIMTP_REPO || path.resolve(root, "../2600i-AIMTP");
const OUT = path.join(root, "dist-schemas");
const ORIGIN = "https://aimtp.net";
const CHECK = process.argv.includes("--check");

/*
 * Directories whose on-disk path is also their URL path. That correspondence is
 * what makes serving them a `root` directive rather than a rewrite table, and
 * the $id check below is what keeps it true.
 */
const NAMESPACES = ["schemas", "spec", "runtime/schemas"];

function schemaFiles(dir) {
  const abs = path.join(AIMTP_REPO, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((name) => name.endsWith(".schema.json"))
    .sort()
    .map((name) => ({ rel: `${dir}/${name}`, abs: path.join(abs, name) }));
}

if (!existsSync(AIMTP_REPO)) {
  /*
   * Not a failure. A checkout without a sibling clone still has to build, and
   * staging schemas is a deploy step rather than a build step — matching how
   * trace:check behaves when the protocol repo is absent.
   */
  console.log(`stage-schemas: protocol repo not found at ${AIMTP_REPO} — nothing staged.`);
  console.log("Set AIMTP_REPO if it lives elsewhere.");
  process.exit(0);
}

const files = NAMESPACES.flatMap(schemaFiles);
if (files.length === 0) {
  console.error(`stage-schemas: no schemas found under ${AIMTP_REPO}`);
  process.exit(1);
}

const problems = [];
const staged = [];

for (const file of files) {
  const raw = readFileSync(file.abs, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    problems.push(`${file.rel}: not valid JSON — ${error.message}`);
    continue;
  }

  const expected = `${ORIGIN}/${file.rel}`;
  if (!parsed.$id) {
    problems.push(`${file.rel}: no $id. It would be served at ${expected} under no name.`);
  } else if (parsed.$id !== expected) {
    problems.push(`${file.rel}: $id is ${parsed.$id}, but it would be served at ${expected}.`);
  }

  staged.push({ ...file, raw });
}

/*
 * Every absolute $ref pointing at this origin has to land on something we are
 * about to serve. trust-bundle references three siblings this way; a dangling
 * one is a validator error at run time in someone else's process.
 */
const served = new Set(staged.map((file) => `${ORIGIN}/${file.rel}`));
for (const file of staged) {
  const refs = file.raw.match(new RegExp(`"\\$ref"\\s*:\\s*"${ORIGIN}[^"]*"`, "g")) || [];
  for (const ref of refs) {
    const target = ref.slice(ref.indexOf(ORIGIN), -1);
    if (!served.has(target)) {
      problems.push(`${file.rel}: $ref ${target} is not among the staged schemas.`);
    }
  }
}

if (problems.length > 0) {
  console.error("stage-schemas: schemas would not resolve as published.\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`stage-schemas: ${staged.length} schemas OK — every $id matches its served URL.`);
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
for (const file of staged) {
  const dest = path.join(OUT, file.rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, file.raw);
}

console.log(`stage-schemas: staged ${staged.length} schemas into ${path.relative(root, OUT)}/`);
for (const namespace of NAMESPACES) {
  const count = staged.filter((file) => file.rel.startsWith(`${namespace}/`)).length;
  console.log(`  /${namespace}/  ${count}`);
}
console.log(`\nDeploy with:\n  rsync -a --delete dist-schemas/ <host>:/srv/aimtp-schemas/`);

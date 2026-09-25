// `npm run lint:docs`: runs the doc checker against the repo's tracked and new files, exiting non-zero on a violation.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

import { checkDocs } from "./docLint.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split("\n")
  .filter((file) => file && existsSync(posix.join(root, file)));

const docs = Object.fromEntries(
  files
    .filter((file) => file.endsWith(".md"))
    .map((file) => [file, readFileSync(posix.join(root, file), "utf8")]),
);
const folders = files.flatMap((file) => {
  const parents: string[] = [];
  for (let dir = posix.dirname(file); dir !== "."; dir = posix.dirname(dir))
    parents.push(dir);
  return parents;
});

const violations = checkDocs({ docs, paths: [...files, ...new Set(folders)] });
for (const { path, line, message } of violations)
  console.error(`${path}:${line} ${message}`);
if (violations.length > 0) {
  console.error(
    `lint:docs: ${violations.length} problem(s). The limits and terms: docs/agents/prose-files.md.`,
  );
  process.exit(1);
}

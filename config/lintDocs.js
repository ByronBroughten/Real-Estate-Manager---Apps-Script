#!/usr/bin/env node
// @ts-check
// `lint-docs [--published <dir>]`: runs the doc checker against the tracked and new files of the git repo it is invoked in, exiting non-zero on a violation.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { parseArgs } from "node:util";

import { checkDocs } from "./docLint.js";

const { values } = parseArgs({ options: { published: { type: "string" } } });

/** @param {string[]} args */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const root = git(["rev-parse", "--show-toplevel"]);
const files = git([
  "-C",
  root,
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
])
  .split("\n")
  .filter(
    (file) => file && !file.endsWith("/") && existsSync(posix.join(root, file)),
  );

const docs = Object.fromEntries(
  files
    .filter((file) => file.endsWith(".md"))
    .map((file) => [file, readFileSync(posix.join(root, file), "utf8")]),
);
const folders = files.flatMap((file) => {
  const parents = [];
  for (let dir = posix.dirname(file); dir !== "."; dir = posix.dirname(dir)) {
    parents.push(dir);
  }
  return parents;
});

const violations = checkDocs({
  docs,
  paths: [...files, ...new Set(folders)],
  published: values.published,
});
for (const { path, line, message } of violations) {
  console.error(`${path}:${line} ${message}`);
}
if (violations.length > 0) {
  console.error(
    `lint-docs: ${violations.length} problem(s). What it checks: the @byronbroughten/config README.`,
  );
  process.exit(1);
}

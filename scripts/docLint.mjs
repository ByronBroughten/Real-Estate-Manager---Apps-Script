// Checks the agent-facing docs' links and size limits; a doc map in, violations out. See docs/agents/prose-files.md.
import { posix } from "node:path";

const RULES_FILES = ["DESIGN.md", "STYLE.md", "VOCABULARY.md"];
const MAX_RULE_LINE = 300;
const MAX_LEAD_LINES = 5;
const MAX_SRC_AGENTS_LINES = 15;
const MAX_FOLDER_AGENTS_LINES = 10;
const MAX_ROOT_AGENTS_BYTES = 5 * 1024;
const LINKED_ROOT_FILES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "DESIGN.md",
  "README.md",
  ...RULES_FILES,
]);

// `docs` maps every markdown path to its contents; `paths` lists the other repo files and folders a link may name.
export function checkDocs({ docs, paths = [] }) {
  const known = new Set([...Object.keys(docs), ...paths]);
  const slugs = new Map();
  const slugsOf = (path) => {
    if (!slugs.has(path)) slugs.set(path, headingSlugs(docs[path]));
    return slugs.get(path);
  };
  const violations = [];
  for (const [path, text] of Object.entries(docs)) {
    const report = (line, message) => violations.push({ path, line, message });
    if (isLinkChecked(path))
      checkLinks(path, text, { docs, known, slugsOf, report });
    if (RULES_FILES.includes(path)) checkRuleLines(text, report);
    if (path.startsWith("docs/")) checkLead(text, report);
    if (posix.basename(path) !== "AGENTS.md") continue;
    if (path === "AGENTS.md") checkRootSize(text, report);
    else {
      checkNestedSize(path, text, report);
      checkClaudePairing(path, docs, report);
    }
  }
  return violations;
}

function isLinkChecked(path) {
  const name = posix.basename(path);
  if (!path.includes("/")) return LINKED_ROOT_FILES.has(path);
  return (
    path.startsWith("docs/") || name === "AGENTS.md" || name === "CLAUDE.md"
  );
}

function checkLinks(path, text, { docs, known, slugsOf, report }) {
  for (const { line, target } of linksIn(text)) {
    const hashAt = target.indexOf("#");
    const file = hashAt === -1 ? target : target.slice(0, hashAt);
    const anchor =
      hashAt === -1 ? null : decodeURIComponent(target.slice(hashAt + 1));
    const resolved =
      file === "" ? path : resolveLink(path, decodeURIComponent(file));
    if (!known.has(resolved)) {
      report(line, `broken link ${target}: no file ${resolved}`);
      continue;
    }
    if (anchor === null || !(resolved in docs)) continue;
    if (!slugsOf(resolved).has(anchor)) {
      report(
        line,
        `broken anchor ${target}: no heading slugs to ${anchor} in ${resolved}`,
      );
    }
  }
}

function resolveLink(from, file) {
  const joined = file.startsWith("/")
    ? file.slice(1)
    : posix.join(posix.dirname(from), file);
  return posix.normalize(joined).replace(/\/$/, "");
}

function linksIn(text) {
  const links = [];
  for (const { line, content } of proseLines(text)) {
    const bare = content.replace(/`[^`]*`/g, "");
    for (const match of bare.matchAll(
      /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g,
    )) {
      links.push({ line, target: match[1] });
    }
    const reference = /^\s*\[[^\]]+\]:\s*(\S+)/.exec(bare);
    if (reference) links.push({ line, target: reference[1] });
  }
  return links.filter(({ target }) => !/^[a-z][a-z0-9+.-]*:/i.test(target));
}

// Lines outside fenced code blocks, numbered from 1.
function proseLines(text) {
  const lines = [];
  let fence = null;
  text.split("\n").forEach((content, index) => {
    const opener = /^\s*(```|~~~)/.exec(content);
    if (opener) {
      if (fence === null) fence = opener[1];
      else if (opener[1] === fence) fence = null;
      return;
    }
    if (fence === null) lines.push({ line: index + 1, content });
  });
  return lines;
}

// GitHub's slugger: lowercase, drop everything but letters, marks, numbers, spaces, `-` and `_`, then spaces to `-`.
function headingSlugs(text) {
  const slugs = new Set();
  const seen = new Map();
  for (const { content } of proseLines(text)) {
    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(content);
    if (!heading) continue;
    const rendered = heading[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*]/g, "");
    const base = rendered
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N} _-]/gu, "")
      .replace(/ /g, "-");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

function checkRuleLines(text, report) {
  for (const { line, content } of proseLines(text)) {
    if (!/^\s*- \*\*/.test(content)) continue;
    const length = [...content].length;
    if (length <= MAX_RULE_LINE) continue;
    report(
      line,
      `rule line is ${length} characters; keep it to ${MAX_RULE_LINE} and move the rest to a reasoning file`,
    );
  }
}

// A read-by-heading doc's lead: the non-blank lines after its title and before its first `##` heading.
function checkLead(text, report) {
  const lines = proseLines(text);
  const firstSection = lines.findIndex(({ content }) => /^##\s/.test(content));
  if (firstSection === -1) return;
  const lead = lines
    .slice(0, firstSection)
    .filter(({ content }) => content.trim() !== "" && !/^#\s/.test(content));
  if (lead.length <= MAX_LEAD_LINES) return;
  report(
    lead[0].line,
    `lead is ${lead.length} lines before the first ## heading; keep it to ${MAX_LEAD_LINES} and move the rest under a heading`,
  );
}

function checkRootSize(text, report) {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes <= MAX_ROOT_AGENTS_BYTES) return;
  report(
    1,
    `root AGENTS.md is ${bytes} bytes; the limit is ${MAX_ROOT_AGENTS_BYTES}`,
  );
}

function checkNestedSize(path, text, report) {
  const lines = text.replace(/\n$/, "").split("\n").length;
  const limit =
    path === "src/AGENTS.md" ? MAX_SRC_AGENTS_LINES : MAX_FOLDER_AGENTS_LINES;
  if (lines > limit)
    report(1, `nested AGENTS.md is ${lines} lines; the limit is ${limit}`);
}

function checkClaudePairing(path, docs, report) {
  const claude = posix.join(posix.dirname(path), "CLAUDE.md");
  const importsIt = (docs[claude] ?? "")
    .split("\n")
    .some((line) => line.trim() === "@AGENTS.md");
  if (!importsIt)
    report(
      1,
      `no sibling CLAUDE.md importing it; add ${claude} containing @AGENTS.md`,
    );
}

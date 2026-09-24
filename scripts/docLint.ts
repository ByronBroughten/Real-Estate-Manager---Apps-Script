// Checks the agent-facing docs' links and size limits; a doc map in, violations out. See docs/agents/prose-files.md.
import { posix } from "node:path";

const limits = {
  leadLines: 5,
  leadBytes: 800,
  unheadedDocBytes: 4 * 1024,
  srcAgentsLines: 15,
  folderAgentsLines: 10,
  rootAgentsBytes: 5 * 1024,
} as const;
const linkedRootFiles = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "README.md",
]);
const publishedRootFiles = new Set(["CONTEXT.md", "README.md"]);
const frameworkRoot = "packages/framework";

export type Docs = Record<string, string>;

export interface Violation {
  path: string;
  line: number;
  message: string;
}

type Report = (line: number, message: string) => void;

interface LinkContext {
  docs: Docs;
  known: Set<string>;
  slugsOf: (path: string) => Set<string>;
  report: Report;
}

interface ProseLine {
  line: number;
  content: string;
}

interface Link {
  line: number;
  target: string;
}

// `docs` maps every markdown path to its contents; `paths` lists the other repo files and folders a link may name.
export function checkDocs({
  docs,
  paths = [],
}: {
  docs: Docs;
  paths?: string[];
}): Violation[] {
  const known = new Set([...Object.keys(docs), ...paths]);
  const slugs = new Map<string, Set<string>>();
  function slugsOf(path: string): Set<string> {
    if (!slugs.has(path)) slugs.set(path, headingSlugs(docs[path] ?? ""));
    return slugs.get(path) ?? new Set<string>();
  }
  const violations: Violation[] = [];
  for (const [path, text] of Object.entries(docs)) {
    const report: Report = (line, message) =>
      violations.push({ path, line, message });
    if (isLinkChecked(path))
      checkLinks(path, text, { docs, known, slugsOf, report });
    if (isDocsFolderFile(path)) checkLead(text, report);
    if (posix.basename(path) !== "AGENTS.md") continue;
    if (path === "AGENTS.md") checkRootSize(text, report);
    else {
      checkNestedSize(path, text, report);
      checkClaudePairing(path, docs, report);
    }
  }
  return violations;
}

// The repo root, or the `packages/<name>` folder, that holds the doc.
function docRoot(path: string): string {
  const parts = path.split("/");
  return parts[0] === "packages" && parts.length > 2
    ? parts.slice(0, 2).join("/")
    : "";
}

// `path` relative to its doc root.
function inRoot(path: string): string {
  const root = docRoot(path);
  return root === "" ? path : path.slice(root.length + 1);
}

function isDocsFolderFile(path: string): boolean {
  return inRoot(path).startsWith("docs/");
}

function isLinkChecked(path: string): boolean {
  const name = posix.basename(path);
  const local = inRoot(path);
  if (!local.includes("/")) return linkedRootFiles.has(local);
  return isDocsFolderFile(path) || name === "AGENTS.md" || name === "CLAUDE.md";
}

// The framework ships `docs/`, `CONTEXT.md` and `README.md`, so they must stand alone.
function isPublishedFrameworkDoc(path: string): boolean {
  if (docRoot(path) !== frameworkRoot) return false;
  const local = inRoot(path);
  return local.startsWith("docs/") || publishedRootFiles.has(local);
}

function checkLinks(
  path: string,
  text: string,
  { docs, known, slugsOf, report }: LinkContext,
): void {
  const published = isPublishedFrameworkDoc(path);
  for (const { line, target } of linksIn(text)) {
    const hashAt = target.indexOf("#");
    const file = hashAt === -1 ? target : target.slice(0, hashAt);
    const anchor =
      hashAt === -1 ? null : decodeURIComponent(target.slice(hashAt + 1));
    const resolved =
      file === "" ? path : resolveLink(path, decodeURIComponent(file));
    if (published && !resolved.startsWith(`${frameworkRoot}/`))
      report(
        line,
        `link ${target} leaves the framework; its published docs link only inside ${frameworkRoot}`,
      );
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

function resolveLink(from: string, file: string): string {
  const joined = file.startsWith("/")
    ? file.slice(1)
    : posix.join(posix.dirname(from), file);
  return posix.normalize(joined).replace(/\/$/, "");
}

function linksIn(text: string): Link[] {
  const links: Link[] = [];
  for (const { line, content } of proseLines(text)) {
    const bare = content.replace(/`[^`]*`/g, "");
    for (const match of bare.matchAll(
      /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g,
    )) {
      links.push({ line, target: match[1] ?? "" });
    }
    const reference = /^\s*\[[^\]]+\]:\s*(\S+)/.exec(bare);
    if (reference) links.push({ line, target: reference[1] ?? "" });
  }
  return links.filter(({ target }) => !/^[a-z][a-z0-9+.-]*:/i.test(target));
}

// Lines outside fenced code blocks, numbered from 1.
function proseLines(text: string): ProseLine[] {
  const lines: ProseLine[] = [];
  let fence: string | null = null;
  text.split("\n").forEach((content, index) => {
    const opener = /^\s*(```|~~~)/.exec(content);
    if (opener) {
      if (fence === null) fence = opener[1] ?? null;
      else if (opener[1] === fence) fence = null;
      return;
    }
    if (fence === null) lines.push({ line: index + 1, content });
  });
  return lines;
}

// GitHub's slugger: lowercase, drop everything but letters, marks, numbers, spaces, `-` and `_`, then spaces to `-`.
function headingSlugs(text: string): Set<string> {
  const slugs = new Set<string>();
  const seen = new Map<string, number>();
  for (const { content } of proseLines(text)) {
    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(content);
    if (!heading) continue;
    const rendered = (heading[1] ?? "")
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

// A read-by-heading doc's lead: the non-blank lines after its title and before its first `##` heading.
function checkLead(text: string, report: Report): void {
  const lines = proseLines(text);
  const firstSection = lines.findIndex(({ content }) => /^##\s/.test(content));
  if (firstSection === -1) {
    const bytes = byteLength(text);
    if (bytes > limits.unheadedDocBytes)
      report(
        1,
        `doc is ${bytes} bytes with no ## heading; over ${limits.unheadedDocBytes} bytes, give it a short lead and ## headings so it can be read by section`,
      );
    return;
  }
  const lead = lines
    .slice(0, firstSection)
    .filter(({ content }) => content.trim() !== "" && !/^#\s/.test(content));
  const leadLine = lead[0]?.line ?? 1;
  if (lead.length > limits.leadLines) {
    report(
      leadLine,
      `lead is ${lead.length} lines before the first ## heading; keep it to ${limits.leadLines} and move the rest under a heading`,
    );
    return;
  }
  const bytes = byteLength(lead.map(({ content }) => content).join("\n"));
  if (bytes > limits.leadBytes)
    report(
      leadLine,
      `lead is ${bytes} bytes before the first ## heading; keep it to ${limits.leadBytes} and move the rest under a heading`,
    );
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function checkRootSize(text: string, report: Report): void {
  const bytes = byteLength(text);
  if (bytes <= limits.rootAgentsBytes) return;
  report(
    1,
    `root AGENTS.md is ${bytes} bytes; the limit is ${limits.rootAgentsBytes}`,
  );
}

function checkNestedSize(path: string, text: string, report: Report): void {
  const lines = text.replace(/\n$/, "").split("\n").length;
  const limit = isPackageSrcAgents(path)
    ? limits.srcAgentsLines
    : limits.folderAgentsLines;
  if (lines > limit)
    report(1, `nested AGENTS.md is ${lines} lines; the limit is ${limit}`);
}

function isPackageSrcAgents(path: string): boolean {
  const parts = path.split("/");
  return (
    parts.length === 4 &&
    parts[0] === "packages" &&
    parts[2] === "src" &&
    parts[3] === "AGENTS.md"
  );
}

function checkClaudePairing(path: string, docs: Docs, report: Report): void {
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

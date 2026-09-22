import { describe, expect, it } from "vitest";
import { checkDocs } from "./docLint.mjs";

const nested = (lines) =>
  Array.from({ length: lines }, (_, i) => `- rule ${i}`).join("\n") + "\n";
const baseDocs = {
  "AGENTS.md": "# Root\n",
  "CLAUDE.md": "@AGENTS.md\n",
};
const check = (docs, paths = []) =>
  checkDocs({ docs: { ...baseDocs, ...docs }, paths });
const messages = (docs, paths) =>
  check(docs, paths).map((each) => `${each.path}: ${each.message}`);

describe("checkDocs", () => {
  it("passes a clean tree", () => {
    expect(check({})).toEqual([]);
  });

  describe("links", () => {
    it("passes a relative link to an existing doc or path", () => {
      const docs = {
        "docs/a.md": "[b](./b.md) and [src](../src/x.ts) and [dir](./sub/)\n",
        "docs/b.md": "# B\n",
      };
      expect(check(docs, ["src/x.ts", "docs/sub"])).toEqual([]);
    });

    it("fails a relative link to a missing file", () => {
      expect(messages({ "docs/a.md": "See [gone](./gone.md).\n" })).toEqual([
        "docs/a.md: broken link ./gone.md: no file docs/gone.md",
      ]);
    });

    it("reports the line of a broken link", () => {
      const [violation] = check({
        "docs/a.md": "# A\n\ntext\n[gone](./gone.md)\n",
      });
      expect(violation.line).toBe(4);
    });

    it("resolves an anchor against a GitHub-style heading slug", () => {
      const docs = {
        "docs/a.md":
          "[ok](./b.md#the-gsheets-mcp-tools--more) [same](#top-level)\n# Top level\n",
        "docs/b.md": "### The `gsheets` MCP tools & more\n",
      };
      expect(check(docs)).toEqual([]);
    });

    it("fails an anchor that matches no heading", () => {
      const docs = {
        "docs/a.md": "[x](./b.md#nope)\n",
        "docs/b.md": "# Yes\n",
      };
      expect(messages(docs)).toEqual([
        "docs/a.md: broken anchor ./b.md#nope: no heading slugs to nope in docs/b.md",
      ]);
    });

    it("numbers repeated headings as GitHub does", () => {
      const docs = { "docs/a.md": "# Same\n# Same\n[x](#same-1)\n" };
      expect(check(docs)).toEqual([]);
    });

    it("ignores external links and links inside code", () => {
      const docs = {
        "docs/a.md":
          "[w](https://x.y/z) `[c](./c.md)`\n```\n[d](./d.md)\n```\n",
      };
      expect(check(docs)).toEqual([]);
    });

    it("checks README's links", () => {
      expect(messages({ "README.md": "[gone](./gone.md)\n" })).toEqual([
        "README.md: broken link ./gone.md: no file gone.md",
      ]);
    });

    it("fails a link to the old root STYLE.md once it lives at docs/style.md", () => {
      const docs = {
        "docs/a.md": "[style](../STYLE.md)\n",
        "docs/style.md": "# Style\n",
      };
      expect(messages(docs)).toEqual([
        "docs/a.md: broken link ../STYLE.md: no file STYLE.md",
      ]);
    });

    it("leaves unlisted docs such as skills unchecked", () => {
      expect(
        check({ ".claude/skills/x/SKILL.md": "[gone](./gone.md)\n" }),
      ).toEqual([]);
    });
  });

  describe("rule lines", () => {
    it("passes a rules-file rule line of any length", () => {
      expect(check({ "docs/style.md": `- **${"x".repeat(600)}**\n` })).toEqual([]);
    });
  });

  describe("sizes", () => {
    it("fails a nested AGENTS.md over 15 lines", () => {
      expect(
        messages({
          "src/AGENTS.md": nested(16),
          "src/CLAUDE.md": "@AGENTS.md\n",
        }),
      ).toEqual([
        "src/AGENTS.md: nested AGENTS.md is 16 lines; the limit is 15",
      ]);
    });

    it("passes a nested AGENTS.md of 15 lines", () => {
      expect(
        check({ "src/AGENTS.md": nested(15), "src/CLAUDE.md": "@AGENTS.md\n" }),
      ).toEqual([]);
    });

    it("fails a folder's nested AGENTS.md over 10 lines", () => {
      expect(
        messages({
          "scripts/AGENTS.md": nested(11),
          "scripts/CLAUDE.md": "@AGENTS.md\n",
        }),
      ).toEqual([
        "scripts/AGENTS.md: nested AGENTS.md is 11 lines; the limit is 10",
      ]);
    });

    it("fails a root AGENTS.md over 5 KB", () => {
      expect(messages({ "AGENTS.md": "x".repeat(5121) })).toEqual([
        "AGENTS.md: root AGENTS.md is 5121 bytes; the limit is 5120",
      ]);
    });
  });

  describe("leads", () => {
    const withLead = (lines, width = 6) =>
      `# Doc\n\n${Array.from({ length: lines }, (_, i) => `line ${i}`.padEnd(width, "x")).join("\n\n")}\n\n## Section\n\nBody.\n`;
    const unheaded = (bytes) => `# Doc\n\n${"x".repeat(bytes - 8)}\n`;

    it("fails a docs/ file whose lead before the first ## heading is over 5 lines", () => {
      expect(messages({ "docs/a.md": withLead(6) })).toEqual([
        "docs/a.md: lead is 6 lines before the first ## heading; keep it to 5 and move the rest under a heading",
      ]);
    });

    it("fails a lead over 800 bytes even at 5 lines or fewer", () => {
      expect(messages({ "docs/a.md": withLead(2, 401) })).toEqual([
        "docs/a.md: lead is 803 bytes before the first ## heading; keep it to 800 and move the rest under a heading",
      ]);
    });

    it("passes a lead of 5 lines and 800 bytes, not counting blank lines", () => {
      expect(check({ "docs/a.md": withLead(5, 159) })).toEqual([]);
    });

    it("fails a docs/ file over 4 KB with no ## heading", () => {
      expect(messages({ "docs/a.md": unheaded(4097) })).toEqual([
        "docs/a.md: doc is 4097 bytes with no ## heading; over 4096 bytes, give it a short lead and ## headings so it can be read by section",
      ]);
    });

    it("passes a docs/ file of 4 KB or less with no ## heading", () => {
      expect(check({ "docs/a.md": unheaded(4096) })).toEqual([]);
    });

    it("leaves files outside docs/ unchecked", () => {
      expect(check({ "README.md": withLead(6) })).toEqual([]);
    });
  });

  describe("CLAUDE.md pairing", () => {
    it("fails a nested AGENTS.md with no sibling CLAUDE.md", () => {
      expect(messages({ "scripts/AGENTS.md": nested(2) })).toEqual([
        "scripts/AGENTS.md: no sibling CLAUDE.md importing it; add scripts/CLAUDE.md containing @AGENTS.md",
      ]);
    });

    it("fails a sibling CLAUDE.md that does not import it", () => {
      expect(
        messages({
          "scripts/AGENTS.md": nested(2),
          "scripts/CLAUDE.md": "Read AGENTS.md\n",
        }),
      ).toEqual([
        "scripts/AGENTS.md: no sibling CLAUDE.md importing it; add scripts/CLAUDE.md containing @AGENTS.md",
      ]);
    });
  });
});

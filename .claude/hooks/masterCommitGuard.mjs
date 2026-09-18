// PreToolUse on Bash: asks the user before a git command that commits to, or pushes, master.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { readHookInput, runFailOpen, writeHookOutput } from "./lib/hookIo.mjs";

const guardedBranches = ["master", "main"];
const committingSubcommands = ["commit", "merge", "cherry-pick", "revert", "am"];

await runFailOpen(() => {
  const input = readHookInput();
  const command = input?.tool_input?.command;
  if (input?.tool_name !== "Bash" || typeof command !== "string") return;
  const reason = guardReason(command, input.cwd ?? process.cwd());
  if (!reason) return;
  writeHookOutput({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  });
});

function guardReason(command, startCwd) {
  let cwd = startCwd;
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const words = segment.trim().split(/\s+/);
    if (words[0] === "cd" && words[1]) {
      cwd = resolve(cwd, words[1].replace(/^["']|["']$/g, ""));
      continue;
    }
    if (words[0] !== "git") continue;
    const { subcommand, args, gitCwd } = parseGit(words.slice(1), cwd);
    const branch = currentBranch(gitCwd);
    const onGuarded = guardedBranches.includes(branch);
    if (committingSubcommands.includes(subcommand) && onGuarded) {
      return reasonFor(`git ${subcommand} on ${branch}`);
    }
    if (subcommand === "push" && pushesGuarded(args, onGuarded)) {
      return reasonFor(`git push to ${guardedBranches.join("/")}`);
    }
  }
  return null;
}

// Global options sit between `git` and its subcommand; -C moves the repo.
function parseGit(words, cwd) {
  let gitCwd = cwd;
  let i = 0;
  while (i < words.length && words[i].startsWith("-")) {
    if (words[i] === "-C" && words[i + 1]) gitCwd = resolve(gitCwd, words[i + 1]);
    if (words[i] === "-C" || words[i] === "-c") i += 1;
    i += 1;
  }
  return { subcommand: words[i], args: words.slice(i + 1), gitCwd };
}

// A bare `git push` or `git push origin` pushes the current branch.
function pushesGuarded(args, onGuarded) {
  const positional = args.filter((arg) => !arg.startsWith("-"));
  const namesGuarded = positional.some((arg) =>
    guardedBranches.some((branch) => new RegExp(`(^|[:/])${branch}$`).test(arg)),
  );
  return namesGuarded || (onGuarded && positional.length < 2);
}

function currentBranch(cwd) {
  try {
    return execFileSync("git", ["-C", cwd, "branch", "--show-current"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function reasonFor(action) {
  return `${action}. docs/agents/git-workflow.md: implement a spec on its issue-<n>-<slug> branch, and commit or land on master only when the user asks.`;
}

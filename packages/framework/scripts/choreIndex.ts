// Names every chore a package can run: the framework's generic ones plus the package's own homes.
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export class ChoreIndex {
  constructor({ generic, own }) {
    this.generic = generic;
    this.own = own;
  }
  static init({ genericHome, packageHomes }) {
    const generic = choresIn(genericHome);
    const own = new Map();
    for (const home of packageHomes) {
      for (const [name, path] of choresIn(home)) {
        if (generic.has(name)) {
          throw new Error(
            `${path} shadows the generic chore "${name}". Rename it.`,
          );
        }
        const other = own.get(name);
        if (other) {
          throw new Error(
            `"${name}" exists in more than one chore home: ${other}, ${path}. Rename or delete one.`,
          );
        }
        own.set(name, path);
      }
    }
    return new ChoreIndex({ generic, own });
  }
  pathOf(name) {
    return this.generic.get(name) ?? this.own.get(name) ?? null;
  }
  listing(packageDir) {
    const lines = (chores) => [...chores.keys()].map((name) => `  ${name}`);
    const ownLines = [...this.own].map(
      ([name, path]) => `  ${name}  (${relative(packageDir, path)})`,
    );
    return [
      "Generic chores:",
      ...lines(this.generic),
      "This package's chores:",
      ...(ownLines.length > 0 ? ownLines : ["  (none)"]),
    ].join("\n");
  }
}

// A home that is not there yet holds no chores, as an emptied oneOff/ does in a fresh clone.
function choresIn(home) {
  if (!existsSync(home)) return new Map();
  return new Map(
    readdirSync(home, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".ts") &&
          entry.name !== "Chore.ts",
      )
      .map((entry) => [
        entry.name.replace(/\.ts$/, ""),
        join(home, entry.name),
      ]),
  );
}

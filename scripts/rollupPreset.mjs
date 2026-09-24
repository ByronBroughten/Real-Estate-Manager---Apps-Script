import typescript from "@rollup/plugin-typescript";
import { resolve } from "node:path";
import { parseAst } from "rollup/parseAst";

export function entryFunctionNames(code) {
  return parseAst(code)
    .body.filter((node) => node.type === "FunctionDeclaration")
    .map((node) => node.id.name);
}

export function exportEntryFunctions(code) {
  const names = entryFunctionNames(code);
  if (names.length === 0) return code;
  return `${code}\nexport { ${names.join(", ")} };\n`;
}

export function stripExportStatements(code) {
  const exportStatements = parseAst(code).body.filter(
    (node) => node.type === "ExportNamedDeclaration" && !node.source,
  );
  for (const { specifiers } of exportStatements) {
    for (const { local, exported } of specifiers) {
      if (local.name !== exported.name) {
        throw new Error(
          `Rollup renamed an entry function to avoid a name clash (${local.name} as ${exported.name}). Apps Script calls it by its original name, so rename one of the two functions.`,
        );
      }
    }
  }
  return exportStatements.reduceRight(
    (stripped, { start, end }) =>
      stripped.slice(0, start) +
      stripped.slice(stripped[end] === "\n" ? end + 1 : end),
    code,
  );
}

function keepEntryFunctionsAsGlobals() {
  return {
    name: "keep-entry-functions-as-globals",
    transform(code, id) {
      if (!this.getModuleInfo(id)?.isEntry) return null;
      return { code: exportEntryFunctions(code), map: null };
    },
    renderChunk(code, chunk) {
      if (!chunk.isEntry) return null;
      return { code: stripExportStatements(code), map: null };
    },
  };
}

function failOnUnresolvedImport(warning, defaultHandler) {
  if (warning.code === "UNRESOLVED_IMPORT") throw new Error(warning.message);
  defaultHandler(warning);
}

// The TypeScript plugin treats a file outside rootDir as external, so rootDir widens to cover every package that gets bundled.
export function rollupPreset({
  input,
  treeshake = true,
  tsconfig = "./tsconfig.json",
  rootDir = ".",
}) {
  return {
    input,
    output: { file: "dist/bundle.js", format: "es", sourcemap: true },
    treeshake,
    onwarn: failOnUnresolvedImport,
    plugins: [
      typescript({
        tsconfig,
        filterRoot: false,
        compilerOptions: {
          rootDir: resolve(rootDir),
          declaration: false,
          declarationMap: false,
        },
      }),
      keepEntryFunctionsAsGlobals(),
    ],
  };
}

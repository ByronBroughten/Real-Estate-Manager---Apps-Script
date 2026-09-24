import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const frameworkSrc = "packages/framework/src";
const appSrc = "packages/real-estate/src";
const platformMessage =
  "Google Sheets code lives only in the framework's src/00_Source/GoogleSheets/. Everything else takes a platform-neutral type or a return value that the entry point handles.";
const rawImportPattern = {
  regex:
    "^(\\.\\./)+01_SpreadsheetSchema/(SheetSchema|ColumnSchema|columnConfigsTypes|valueConfigsTypes|generated/(columnConfigs|valueConfigs))(\\.js)?$",
  message:
    "Raw is positional: it addresses by GID and index and never resolves a column. Column and value lookups belong in the Identified tier or above.",
};
const appConfigsImportPattern = {
  regex: "(^|/)generated/|(^|/)appConfigs(\\.js)?$",
  message:
    "Tiers take config types from Register and values from installedConfigs(); only the app's appConfigs.ts and the framework's dev/devConfigs.ts import generated configs.",
};
const platformImportPattern = {
  regex: "GoogleSheets/|GoogleSheets/(GoogleSheetsAPI|AppsScript)(\\.js)?$",
  message: platformMessage,
};
// utils/ sits below every numbered tier.
const layerFolders = [
  "utils",
  "00_Source",
  "01_SpreadsheetSchema",
  "02_SpreadsheetRaw",
  "03_SpreadsheetIdentified",
  "04_SpreadsheetNamed",
  "05_Operators",
  "06_API",
];
// The framework's un-numbered folders built on the tiers; utils/ and testSupport/ are not among them.
const aboveTierFolders = [
  "appsScriptHost",
  "chores",
  "framework",
  "frameworkTesting",
  "nodeHost",
];
const layerImportPattern = (layer) => ({
  regex: `(^|/)(${[...layerFolders.slice(layer + 1), ...aboveTierFolders].join("|")})(/|(\\.js)?$)`,
  message: `Dependencies only point downward: ${layerFolders[layer]} imports nothing from a higher tier or from ${aboveTierFolders.join(", ")} (packages/framework/src/AGENTS.md).`,
});
// After the platform block: a later block's no-restricted-imports replaces an earlier one's, so each merges the patterns that still apply.
const layerImportBlocks = layerFolders.flatMap((folder, layer) => {
  const extra = folder === "02_SpreadsheetRaw" ? [rawImportPattern] : [];
  const restrict = (patterns) => ({
    "no-restricted-imports": [
      "error",
      { patterns: [...patterns, layerImportPattern(layer), ...extra] },
    ],
  });
  const isPlatformFolder = folder === "00_Source";
  return [
    {
      files: [`${frameworkSrc}/${folder}/**/*.ts`],
      ignores: [
        "**/*.test.ts",
        ...(isPlatformFolder
          ? [`${frameworkSrc}/00_Source/GoogleSheets/**`]
          : []),
      ],
      rules: restrict([platformImportPattern, appConfigsImportPattern]),
    },
    {
      files: [
        `${frameworkSrc}/${folder}/**/*.test.ts`,
        ...(isPlatformFolder
          ? [`${frameworkSrc}/00_Source/GoogleSheets/**/*.ts`]
          : []),
      ],
      rules: restrict([]),
    },
  ];
});

// App code reaches the framework only through its package name, and a relative import never leaves the app's src/.
const frameworkPackage = "@byronbroughten/sheets-framework";
const appTestSetupFiles = [`${appSrc}/installAppConfigs.ts`];
const appEntryMessage = `App code imports the framework only from "${frameworkPackage}", and "${frameworkPackage}/testing" only from *.test.ts (#140).`;
const appImportPatterns = (depth, allowTesting) => [
  {
    regex: `^(\\.\\./){${depth + 1}}`,
    message: "A relative import stays inside the app's src/ (#140).",
  },
  {
    regex: `^${frameworkPackage}/${allowTesting ? "(?!testing$)" : ""}`,
    message: appEntryMessage,
  },
];
// generated/ imports the framework's makeConfigs by the relative path gen:configs writes.
const appImportBlocks = [0, 1, 2, 3, 4, 5].flatMap((depth) => {
  const files = [`${appSrc}/${"*/".repeat(depth)}*.ts`];
  const restrict = (allowTesting) => ({
    "no-restricted-imports": [
      "error",
      { patterns: appImportPatterns(depth, allowTesting) },
    ],
  });
  return [
    {
      files,
      ignores: ["**/*.test.ts", `${appSrc}/generated/**`, ...appTestSetupFiles],
      rules: restrict(false),
    },
    {
      files: files.flatMap((glob) => [
        [glob, "**/*.test.ts"],
        ...(depth === 0 ? appTestSetupFiles : []),
      ]),
      rules: restrict(true),
    },
  ];
});

export default defineConfig(
  { ignores: ["**/*.mjs", "**/dist/**", "**/coverage/**"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "max-classes-per-file": ["error", 1],
      // `_` marks a parameter kept for its signature; a rest sibling is dropped on purpose.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // Props bags chain as interfaces, so an empty one can name a tier.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      // Constants are camelCase too; methods stay free, so SHOUTING multi-row deletes pass.
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
          custom: { regex: "^[A-Z][A-Z0-9]+$", match: false },
        },
      ],
    },
  },
  {
    files: ["packages/*/src/**/*.ts"],
    ignores: [
      `${frameworkSrc}/00_Source/GoogleSheets/**`,
      `${frameworkSrc}/appsScriptHost/**`,
      `${frameworkSrc}/nodeHost/**`,
      `${frameworkSrc}/chores/**`,
      `${frameworkSrc}/testSupport/**`,
      `${frameworkSrc}/TypeDeclarations/**`,
      "packages/*/src/index.ts",
      "**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [platformImportPattern] }],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSQualifiedName[left.type='Identifier'][left.name='GoogleAppsScript']",
          message: platformMessage,
        },
      ],
      "no-restricted-globals": [
        "error",
        ...["SpreadsheetApp", "ScriptApp", "PropertiesService", "Sheets"].map(
          (name) => ({ name, message: platformMessage }),
        ),
      ],
    },
  },
  ...layerImportBlocks,
  ...appImportBlocks,
);

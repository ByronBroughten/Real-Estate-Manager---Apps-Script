import { rollupPreset } from "@byronbroughten/sheets-framework/rollup";

// rootDir covers packages/, where the framework source it bundles lives.
export default rollupPreset({ input: "src/index.ts", rootDir: ".." });

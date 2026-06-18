import * as esbuild from "esbuild";
import { rmSync } from "node:fs";

rmSync("api/handler.cjs", { force: true });

await esbuild.build({
  entryPoints: ["server/app.ts"],
  outfile: "api/handler.cjs",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  packages: "external",
  footer: { js: "module.exports = app_default;" },
});

console.log("Bundled API → api/handler.cjs");

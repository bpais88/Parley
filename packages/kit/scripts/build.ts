import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { build } from "esbuild";
import { TOOL_DEFINITIONS } from "../src/tool-definitions";

const packageRoot = resolve(import.meta.dirname, "..");
const dist = resolve(packageRoot, "dist");
const publicKit = resolve(packageRoot, "../../apps/platform/public/kit/v1");
const outfile = resolve(dist, "kit.js");

await mkdir(dist, { recursive: true });
await mkdir(publicKit, { recursive: true });

await build({
  entryPoints: [resolve(packageRoot, "src/index.ts")],
  outfile,
  bundle: true,
  format: "iife",
  globalName: "ParleyKit",
  minify: true,
  target: ["es2022"],
  legalComments: "none",
  banner: { js: "/*! Parley WebMCP kit v0.1.0 */" },
});

await copyFile(outfile, resolve(publicKit, "kit.js"));
await writeFile(
  resolve(packageRoot, "tools.manifest.json"),
  `${JSON.stringify(TOOL_DEFINITIONS, null, 2)}\n`,
);

const gzipBytes = gzipSync(await readFile(outfile)).byteLength;
if (gzipBytes >= 60 * 1024) {
  throw new Error(`Kit is ${gzipBytes} bytes gzipped; budget is under 61440 bytes.`);
}
console.log(`Built kit.js (${gzipBytes} bytes gzipped) with ${TOOL_DEFINITIONS.length} tools.`);

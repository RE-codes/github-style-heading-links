import { execFile } from "node:child_process";
import esbuild from "esbuild";
import process from "process";
import { promisify } from "node:util";

const production = process.argv[2] === "production";
const runExecFile = promisify(execFile);

const syncPlugin = {
  name: "sync-vault-on-build",
  setup(build) {
    if (production) {
      return;
    }

    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        return;
      }

      await runExecFile("bash", ["scripts/sync-vault.sh"]);
    });
  }
};

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  outfile: "main.js",
  sourcemap: production ? false : "inline",
  minify: production,
  external: [
    "obsidian",
    "electron",
    "@codemirror/*",
    "@lezer/*"
  ],
  plugins: [syncPlugin]
});

if (production) {
  await context.rebuild();
  process.exit(0);
}

await context.watch();

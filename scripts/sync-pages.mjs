import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(process.cwd());
const distDir = resolve(rootDir, "dist");
const distAssetsDir = resolve(distDir, "assets");
const rootAssetsDir = resolve(rootDir, "assets");
const distIndex = existsSync(resolve(distDir, "index.html"))
  ? resolve(distDir, "index.html")
  : resolve(distDir, "app.html");
const rootIndex = resolve(rootDir, "index.html");

if (!existsSync(distIndex)) {
  throw new Error("dist/index.html not found. Run the build first.");
}

copyFileSync(distIndex, rootIndex);

if (existsSync(rootAssetsDir)) {
  rmSync(rootAssetsDir, { recursive: true, force: true });
}

if (existsSync(distAssetsDir)) {
  mkdirSync(rootAssetsDir, { recursive: true });
  cpSync(distAssetsDir, rootAssetsDir, { recursive: true });
}

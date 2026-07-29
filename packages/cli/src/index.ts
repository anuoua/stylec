#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, watch, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { compile } from "@stylec/compiler";

export interface FormatConfig {
  command: string;
  binPath: string | undefined;
}

export function findNodeModulesBin(from: string = process.cwd()): string | undefined {
  let dir = resolve(from);
  for (;;) {
    const candidate = join(dir, "node_modules", ".bin");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function runFormat(format: FormatConfig, filePath: string): void {
  const cmd = format.command.replace(/\{path\}/g, filePath);
  const env = { ...process.env };
  if (format.binPath) env.PATH = `${format.binPath}${env.PATH ? ":" + env.PATH : ""}`;
  const child = spawn(cmd, { shell: true, env, stdio: ["ignore", "ignore", "inherit"] });
  child.on("error", (err) => {
    console.error(`[stylec] format failed: ${err.message}`);
  });
}

export function outPath(cssFile: string): string {
  return cssFile.replace(/\.stylec\.css$/, ".stylec.ts");
}

export function findInputs(input: string): string[] {
  const st = statSync(input);
  if (st.isFile()) return [input];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "dist") continue;
      const p = join(dir, entry);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (p.endsWith(".stylec.css")) out.push(p);
    }
  };
  walk(input);
  return out;
}

export function compileFile(file: string, format?: FormatConfig): boolean {
  try {
    const source = readFileSync(file, "utf8");
    const { code } = compile(source, { filename: basename(file) });
    const out = outPath(file);
    writeFileSync(out, code);
    if (format) runFormat(format, out);
    return true;
  } catch (e) {
    console.error(`error compiling ${file}: ${(e as Error).message}`);
    return false;
  }
}

export function compileAll(input: string, format?: FormatConfig): number {
  let n = 0;
  for (const f of findInputs(resolve(input))) if (compileFile(f, format)) n++;
  return n;
}

function safeStat(file: string) {
  try {
    return statSync(file);
  } catch {
    return undefined;
  }
}

export function watchMode(input: string, format?: FormatConfig): void {
  const abs = resolve(input);
  compileAll(abs, format);
  console.log(`watching ${abs} for changes...`);

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = (file: string) => {
    if (!file.endsWith(".stylec.css")) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const st = safeStat(file);
      if (st && st.isFile()) compileFile(file, format);
    }, 100);
  };

  const st = statSync(abs);
  if (st.isDirectory()) {
    watch(abs, { recursive: true }, (_event, filename) => {
      if (typeof filename !== "string") return;
      schedule(join(abs, filename));
    });
  } else {
    watch(abs, () => schedule(abs));
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const watchFlag = argv.some((a) => a === "--watch" || a === "-w");
  const input = argv.find((a) => !a.startsWith("-"));
  if (!input) {
    console.error("Usage: stylec <file-or-dir> [--watch] [--format <cmd>]");
    process.exit(1);
  }

  const formatIdx = argv.indexOf("--format");
  const formatCmd = formatIdx !== -1 ? argv[formatIdx + 1] : undefined;
  const format: FormatConfig | undefined = formatCmd
    ? { command: formatCmd, binPath: findNodeModulesBin() }
    : undefined;

  if (watchFlag) {
    watchMode(input, format);
  } else {
    console.log(`done: ${compileAll(input, format)} file(s)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

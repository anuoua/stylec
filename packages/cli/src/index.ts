#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, watch } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compile } from "@stylec/compiler";

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

export function compileFile(file: string): boolean {
  try {
    const source = readFileSync(file, "utf8");
    const { code } = compile(source, { filename: basename(file) });
    writeFileSync(outPath(file), code);
    console.log(`compiled ${file} -> ${outPath(file)}`);
    return true;
  } catch (e) {
    console.error(`error compiling ${file}: ${(e as Error).message}`);
    return false;
  }
}

export function compileAll(input: string): number {
  let n = 0;
  for (const f of findInputs(resolve(input))) if (compileFile(f)) n++;
  return n;
}

function safeStat(file: string) {
  try {
    return statSync(file);
  } catch {
    return undefined;
  }
}

export function watchMode(input: string): void {
  const abs = resolve(input);
  compileAll(abs);
  console.log(`watching ${abs} for changes...`);

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = (file: string) => {
    if (!file.endsWith(".stylec.css")) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const st = safeStat(file);
      if (st && st.isFile()) compileFile(file);
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
    console.error("Usage: stylec <file-or-dir> [--watch]");
    process.exit(1);
  }
  if (watchFlag) {
    watchMode(input);
  } else {
    console.log(`done: ${compileAll(input)} file(s)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import { compile } from "@stylec/compiler";

export interface StylecOptions {
  include?: string[];
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

export function compileFile(file: string): boolean {
  try {
    const source = readFileSync(file, "utf8");
    const { code } = compile(source, { filename: basename(file) });
    writeFileSync(outPath(file), code);
    return true;
  } catch (e) {
    console.error(`error compiling ${file}: ${(e as Error).message}`);
    return false;
  }
}

export function compileAll(inputs: string[]): number {
  let n = 0;
  for (const input of inputs) {
    try {
      for (const f of findInputs(resolve(input))) if (compileFile(f)) n++;
    } catch {
      // input path missing — skip
    }
  }
  return n;
}

function isInside(file: string, dir: string): boolean {
  const rel = relative(dir, file);
  return !!rel && !rel.startsWith("..") && !isAbsolute(rel);
}

export function stylec(options?: StylecOptions): Plugin {
  const include = options?.include ?? ["src"];
  return {
    name: "stylec",
    enforce: "pre",
    buildStart() {
      compileAll(include);
    },
    configureServer(server) {
      const roots = include.map((d) => resolve(d));
      server.watcher.add(roots);
      const handle = (filepath: string) => {
        if (!filepath.endsWith(".stylec.css")) return;
        if (!roots.some((r) => isInside(filepath, r))) return;
        compileFile(filepath);
      };
      server.watcher.on("add", handle);
      server.watcher.on("change", handle);
    },
  };
}

export default stylec;

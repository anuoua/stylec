import { isAbsolute, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import {
  compileFile,
  compileAll as cliCompileAll,
  findNodeModulesBin,
  outPath,
  findInputs,
  type FormatConfig,
} from "@stylec/cli";

export { outPath, findInputs, compileFile };
export type { FormatConfig };

export interface StylecOptions {
  include?: string[];
  format?: string;
}

export function compileAll(inputs: string[], format?: FormatConfig): number {
  let n = 0;
  for (const input of inputs) {
    try {
      n += cliCompileAll(input, format);
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
  const format: FormatConfig | undefined = options?.format
    ? { command: options.format, binPath: findNodeModulesBin() }
    : undefined;
  return {
    name: "stylec",
    enforce: "pre",
    buildStart() {
      compileAll(include, format);
    },
    configureServer(server) {
      const roots = include.map((d) => resolve(d));
      server.watcher.add(roots);
      let timer: ReturnType<typeof setTimeout> | null = null;
      const handle = (filepath: string) => {
        if (!filepath.endsWith(".stylec.css")) return;
        if (!roots.some((r) => isInside(filepath, r))) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          compileFile(filepath, format);
        }, 100);
      };
      server.watcher.on("add", handle);
      server.watcher.on("change", handle);
    },
  };
}

export default stylec;

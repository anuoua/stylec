import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";
import { compile } from "@stylec/compiler";

const PREFIX = "\0stylec:";

export interface StylecOptions {
  filter?: (id: string) => boolean;
}

export function stylec(options?: StylecOptions): Plugin {
  const filter = options?.filter ?? ((id: string) => id.endsWith(".stylec.css"));
  return {
    name: "stylec",
    enforce: "pre",
    resolveId(source, importer) {
      if (!filter(source)) return null;
      const importerDir = importer ? dirname(importer) : process.cwd();
      const resolved = resolve(importerDir, source);
      if (resolved.endsWith(".stylec.css")) return PREFIX + resolved;
      return null;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const file = id.slice(PREFIX.length);
      const css = readFileSync(file, "utf8");
      const { code, map } = compile(css, { filename: file });
      this.addWatchFile(file);
      return { code, map };
    },
  };
}

export default stylec;

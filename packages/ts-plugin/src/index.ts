import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

export interface TextSpan {
  start: number;
  length: number;
}

export interface DefinitionInfo {
  fileName: string;
  textSpan: TextSpan;
  name: string;
  kind: string;
  containerName: string;
  containerKind: string;
}

export type FileHost = (path: string) => string | undefined;

export interface LanguageServiceLike {
  getDefinitionAtPosition?(
    fileName: string,
    position: number,
  ): readonly DefinitionInfo[] | undefined;
  getDefinitionAndBoundSpan?(
    fileName: string,
    position: number,
  ): { textSpan: TextSpan; definitions?: readonly DefinitionInfo[] } | undefined;
}

export interface PluginCreateInfo {
  languageService: LanguageServiceLike;
  languageServiceHost: { readFile?(path: string): string | undefined };
  serverHost: { readFile?(path: string): string | undefined };
  config?: { enabled?: boolean } | undefined;
  project: unknown;
}

const SOURCE_MAP_RE = /\/\/# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/;

function tryReadSync(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

export function makeFileHost(info: PluginCreateInfo): FileHost {
  return (path: string) =>
    info.languageServiceHost.readFile?.(path) ??
    info.serverHost.readFile?.(path) ??
    tryReadSync(path);
}

function offsetToLineCol(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return { line, column };
}

function lineColToOffset(text: string, line: number, column: number): number {
  let l = 1;
  let off = 0;
  while (l < line && off < text.length) {
    if (text.charCodeAt(off) === 10) l++;
    off++;
  }
  return Math.min(text.length, off + column);
}

export function resolveStylecDefinition(
  host: FileHost,
  def: DefinitionInfo,
): DefinitionInfo | undefined {
  if (!def.fileName.endsWith(".stylec.ts")) return undefined;

  const tsText = host(def.fileName);
  if (tsText === undefined) return undefined;

  const m = tsText.match(SOURCE_MAP_RE);
  if (!m || m[1] === undefined) return undefined;

  let tm: TraceMap;
  try {
    tm = new TraceMap(JSON.parse(Buffer.from(m[1], "base64").toString("utf8")));
  } catch {
    return undefined;
  }

  const pos = offsetToLineCol(tsText, def.textSpan.start);
  const orig = originalPositionFor(tm, { line: pos.line, column: pos.column });
  if (orig.source === null || orig.line === null || orig.column === null) return undefined;

  const cssFile = isAbsolute(orig.source)
    ? orig.source
    : resolve(dirname(def.fileName), orig.source);
  const cssText = host(cssFile);
  if (cssText === undefined) return undefined;

  const start = lineColToOffset(cssText, orig.line, orig.column);
  const name = orig.name ?? "";
  return {
    fileName: cssFile,
    textSpan: { start, length: name.length || 1 },
    name: name || def.name,
    kind: def.kind,
    containerName: def.containerName,
    containerKind: def.containerKind,
  };
}

export function create(info: PluginCreateInfo): LanguageServiceLike {
  const ls = info.languageService;
  const host = makeFileHost(info);

  const priorDef = ls.getDefinitionAtPosition?.bind(ls);
  if (priorDef) {
    ls.getDefinitionAtPosition = (fileName: string, position: number) => {
      const defs = priorDef(fileName, position);
      if (!defs) return defs;
      return defs.map((d) => {
        if (!d.fileName.endsWith(".stylec.ts")) return d;
        return resolveStylecDefinition(host, d) ?? d;
      });
    };
  }

  const priorBound = ls.getDefinitionAndBoundSpan?.bind(ls);
  if (priorBound) {
    ls.getDefinitionAndBoundSpan = (fileName: string, position: number) => {
      const res = priorBound(fileName, position);
      if (!res || !res.definitions) return res;
      return {
        textSpan: res.textSpan,
        definitions: res.definitions.map((d) => {
          if (!d.fileName.endsWith(".stylec.ts")) return d;
          return resolveStylecDefinition(host, d) ?? d;
        }),
      };
    };
  }

  return ls;
}

export default { create };

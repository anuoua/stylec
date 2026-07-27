import MagicString from "magic-string";
import { findClasses, lineColAt } from "./parse.js";
import { generate, HASH_PLACEHOLDER, type ClassInfo } from "./codegen.js";

export interface CompileOptions {
  filename?: string;
}

export interface CompileResult {
  code: string;
  map: string | null;
  hash: string;
  names: string[];
}

export function compile(source: string, options?: CompileOptions): CompileResult {
  const filename = options?.filename;
  const { occurrences, names } = findClasses(source);

  const s = new MagicString(source);
  for (const occ of occurrences) {
    s.overwrite(occ.start, occ.end, `${occ.name}_${HASH_PLACEHOLDER}`);
  }
  const templateBody = s.toString();

  const seen = new Set<string>();
  const classes: ClassInfo[] = [];
  for (const occ of occurrences) {
    if (seen.has(occ.name)) continue;
    seen.add(occ.name);
    const pos = lineColAt(source, occ.start);
    classes.push({ name: occ.name, line: pos.line, column: pos.column });
  }

  const { code, hash, map } = generate({
    templateBody,
    classes,
    source,
    srcFile: filename,
  });

  let finalCode = code;
  let mapJson: string | null = null;
  if (map) {
    mapJson = JSON.stringify(map);
    finalCode =
      code +
      "//# sourceMappingURL=data:application/json;base64," +
      Buffer.from(mapJson, "utf8").toString("base64") +
      "\n";
  }

  return { code: finalCode, map: mapJson, hash, names };
}

export { generate, HASH_PLACEHOLDER } from "./codegen.js";
export { findClasses, lineColAt } from "./parse.js";
export type { ClassOccurrence, ParseResult } from "./parse.js";
export type { CodegenInput, CodegenResult, ClassInfo } from "./codegen.js";

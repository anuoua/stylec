import postcss, { type Root, type Rule } from "postcss";
import parser from "postcss-selector-parser";

export interface ClassOccurrence {
  name: string;
  start: number;
  end: number;
}

export interface ParseResult {
  occurrences: ClassOccurrence[];
  names: string[];
}

function computeLineStarts(src: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < src.length; i++) {
    if (src.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

export function lineColAt(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 0;
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return { line, column };
}

export function findClasses(source: string): ParseResult {
  const occurrences: ClassOccurrence[] = [];
  const root: Root = postcss.parse(source);
  const docLineStarts = computeLineStarts(source);

  root.walkRules((rule: Rule) => {
    const sel = rule.selector;
    const ruleStart = rule.source?.start;
    if (!ruleStart) return;

    const ls = docLineStarts[ruleStart.line - 1];
    if (ls === undefined) return;
    const selAbsStart = ls + (ruleStart.column - 1);

    if (source.charCodeAt(selAbsStart) !== sel.charCodeAt(0)) return;

    const selLineStarts = computeLineStarts(sel);

    parser((selectors) => {
      selectors.walkClasses((cls) => {
        const name = cls.value;
        const s = cls.source?.start;
        if (!s || name === undefined) return;

        const relLine = selLineStarts[s.line - 1];
        if (relLine === undefined) return;
        const nameRelOffset = relLine + (s.column - 1);
        const absNameStart = selAbsStart + nameRelOffset;

        let dotOffset = -1;
        if (source.charCodeAt(absNameStart) === 46) {
          dotOffset = absNameStart;
        } else if (absNameStart > 0 && source.charCodeAt(absNameStart - 1) === 46) {
          dotOffset = absNameStart - 1;
        }
        if (dotOffset < 0) return;

        const nameSpan = source.slice(dotOffset + 1, dotOffset + 1 + name.length);
        if (nameSpan !== name) return;

        occurrences.push({
          name,
          start: dotOffset + 1,
          end: dotOffset + 1 + name.length,
        });
      });
    }).processSync(sel);
  });

  const names: string[] = [];
  const seen = new Set<string>();
  for (const occ of occurrences) {
    if (!seen.has(occ.name)) {
      seen.add(occ.name);
      names.push(occ.name);
    }
  }

  return { occurrences, names };
}

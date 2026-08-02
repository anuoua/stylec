import type { Properties } from "csstype";

export type CSSProperties = Properties & {
  [key: `-${string}`]: string | number | undefined;
};

export function __hash(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;
  const rem = len & 3;
  const limit = len - rem;

  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  let h = 0;
  let i = 0;

  while (i < limit) {
    let k =
      (bytes[i] ?? 0) |
      ((bytes[i + 1] ?? 0) << 8) |
      ((bytes[i + 2] ?? 0) << 16) |
      ((bytes[i + 3] ?? 0) << 24);
    i += 4;

    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }

  let k = 0;
  if (rem === 3) k ^= (bytes[i + 2] ?? 0) << 16;
  if (rem >= 2) k ^= (bytes[i + 1] ?? 0) << 8;
  if (rem >= 1) {
    k ^= bytes[i] ?? 0;
    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);
    h ^= k;
  }

  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return (h >>> 0).toString(36);
}

export function __toDecl(obj: CSSProperties): string {
  let out = "";
  const rec = obj as Record<string, string | number | undefined>;
  for (const key in rec) {
    if (!Object.prototype.hasOwnProperty.call(rec, key)) continue;
    const val = rec[key];
    if (val === undefined) continue;
    const kebab = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    out += kebab + ":" + val + ";";
  }
  return out;
}

export function __override<T extends string>(
  names: readonly T[],
  tmpl: (h: string) => string,
  cssHash: string,
  patch: Partial<Record<T, CSSProperties>>,
): { css: string; classes: Record<T, string>; cssHash: string } {
  const h = __hash(cssHash + JSON.stringify(patch));
  const classes = {} as Record<T, string>;
  let extra = "";
  for (const name of names) {
    classes[name] = name + "_" + h;
    const decl = patch[name];
    if (decl) extra += "." + name + "_" + h + "{" + __toDecl(decl) + "}";
  }
  return { css: tmpl(h) + extra, classes, cssHash: h };
}

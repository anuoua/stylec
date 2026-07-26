export function __hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function __toDecl(obj: Record<string, string>): string {
  let out = "";
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const val = obj[key];
    if (val === undefined) continue;
    const kebab = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    out += kebab + ":" + val + ";";
  }
  return out;
}

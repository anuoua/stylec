import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { generate, HASH_PLACEHOLDER } from "../dist/index.js";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import { __hash } from "@stylec/runtime";

const P = HASH_PLACEHOLDER;

function ci(...names: string[]): { name: string; line: number; column: number }[] {
  return names.map((name) => ({ name, line: 1, column: 0 }));
}

test("hash equals the content hash of the source", () => {
  const source = ".a { x: 1; }";
  const r = generate({ templateBody: "x" + P, classes: ci("a"), source });
  assert.equal(r.hash, __hash(source));
});

test("generate is deterministic", () => {
  const a = generate({
    templateBody: ".a_" + P + "{}",
    classes: ci("a"),
    source: "x",
  });
  const b = generate({
    templateBody: ".a_" + P + "{}",
    classes: ci("a"),
    source: "x",
  });
  assert.equal(a.code, b.code);
  assert.equal(a.hash, b.hash);
});

test("each placeholder becomes one ${h} interpolation", () => {
  const body = ".a_" + P + "{x:1}.b_" + P + "{y:2}.a_" + P + "{}";
  const { code } = generate({
    templateBody: body,
    classes: ci("a", "b"),
    source: "s",
  });
  assert.equal((code.match(/\$\{h\}/g) ?? []).length, 3);
});

test("classes object bakes the hash into each name", () => {
  const source = ".a{}.b{}";
  const { code, hash } = generate({
    templateBody: "x",
    classes: ci("a", "b"),
    source,
  });
  assert.ok(code.includes(`  a: "a_${hash}",`));
  assert.ok(code.includes(`  b: "b_${hash}",`));
});

test("emits classes in first-appearance order and ClassName as keyof typeof classes", () => {
  const { code } = generate({
    templateBody: "x",
    classes: ci("card", "title"),
    source: "s",
  });
  assert.match(code, /export type ClassName = keyof typeof classes;/);
  assert.ok(code.indexOf("card") < code.indexOf("title"));
});

test("empty classes -> no hashed entries, ClassName still keyof-derived", () => {
  const { code } = generate({
    templateBody: "x" + P,
    classes: [],
    source: "s",
  });
  assert.match(code, /export type ClassName = keyof typeof classes;/);
  assert.match(code, /classes = \{\s*\} as const/);
  assert.match(
    code,
    /return __override\(Object\.keys\(classes\) as ClassName\[\], _tmpl, cssHash, patch\);/,
  );
});

test("override derives names from classes and delegates to the runtime helper", () => {
  const { code } = generate({
    templateBody: "x",
    classes: ci("a", "b"),
    source: "s",
  });
  assert.match(code, /import \{ __override, type CSSProperties \} from "@stylec\/runtime";/);
  assert.match(
    code,
    /return __override\(Object\.keys\(classes\) as ClassName\[\], _tmpl, cssHash, patch\);/,
  );
});

test("non-identifier name stays a quoted key in classes", () => {
  const { code } = generate({
    templateBody: "x",
    classes: ci("my-btn"),
    source: "s",
  });
  assert.ok(code.includes('"my-btn": "my-btn_'));
  assert.ok(!code.includes('patch["my-btn"]'));
  assert.ok(!code.includes('"my-btn",'));
});

test("no srcFile -> no sourcemap", () => {
  const { map } = generate({
    templateBody: "x" + P,
    classes: ci("a"),
    source: ".a{}",
  });
  assert.equal(map, null);
});

test("with srcFile -> sourcemap maps the classes token back to its CSS position", () => {
  const classes = [{ name: "button", line: 1, column: 1 }];
  const { code, map } = generate({
    templateBody: "x" + P,
    classes,
    source: ".button{}",
    srcFile: "sample.stylec.css",
  });
  assert.ok(map);
  assert.deepEqual(map.sources, ["sample.stylec.css"]);
  assert.equal(map.sourcesContent?.[0], ".button{}");
  assert.deepEqual(map.names, ["button"]);

  const lines = code.split("\n");
  const entryLineIdx = lines.findIndex((l) => l.includes('button: "button_'));
  assert.ok(entryLineIdx >= 0);
  const col = lines[entryLineIdx]!.indexOf("button");
  const orig = originalPositionFor(new TraceMap(map), {
    line: entryLineIdx + 1,
    column: col,
  });
  assert.equal(orig.line, 1);
  assert.equal(orig.column, 1);
  assert.equal(orig.name, "button");
  assert.equal(orig.source, "sample.stylec.css");
});

async function loadGenerated(templateBody: string, names: string[], source: string) {
  const { code } = generate({ templateBody, classes: ci(...names), source });
  const file = join(import.meta.dirname, "__cg_fixture__.ts");
  writeFileSync(file, code);
  try {
    return await import(file + "?t=" + Date.now());
  } finally {
    unlinkSync(file);
  }
}

test("template body with ${, backtick and backslash is escaped and round-trips", async () => {
  const backtick = String.fromCharCode(96);
  const inner = backtick + "${y}" + "\\z";
  const body = ".a_" + P + '{content:"' + inner + '"}';
  const mod = await loadGenerated(body, ["a"], ".a{}");
  assert.ok(mod.css.includes(backtick), "backtick round-trips");
  assert.ok(mod.css.includes("${y}"), "${ round-trips");
  assert.ok(mod.css.includes("\\z"), "backslash round-trips");
});

test("override with empty patch returns _tmpl at a new hash", async () => {
  const mod = await loadGenerated(".a_" + P + "{x:1}", ["a"], ".a{x:1}");
  const v = mod.override({});
  assert.ok(v.css.includes("." + v.classes.a));
  assert.equal(v.css.includes("color:green"), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../dist/index.js";

test("finds top-level classes", () => {
  assert.deepEqual(compile(".a { color: red; } .b { x: 1; }").names, ["a", "b"]);
});

test("keeps first-appearance order", () => {
  assert.deepEqual(compile(".z { x: 1; } .a { y: 2; }").names, ["z", "a"]);
});

test("dedupes repeated class names", () => {
  const { names, code } = compile(".a { color: red; } .a:hover { color: blue; }");
  assert.deepEqual(names, ["a"]);
  // two occurrences in the template both get ${h}
  assert.equal((code.match(/a_\$\{h\}/g) ?? []).length, 2);
});

test("finds nested classes", () => {
  assert.deepEqual(compile(".card { .title { color: green; } }").names, ["card", "title"]);
});

test("preserves & verbatim", () => {
  assert.match(compile(".card { &:hover { color: red; } }").code, /&:hover/);
});

test("preserves var() verbatim", () => {
  assert.match(compile(".a { color: var(--c, red); }").code, /var\(--c, red\)/);
});

test("all classes share the file content hash", () => {
  const src = ".a { x: 1; } .b { y: 2; }";
  const { code, hash } = compile(src);
  assert.ok(code.includes(`"a_${hash}"`));
  assert.ok(code.includes(`"b_${hash}"`));
});

test("hash changes when content changes", () => {
  assert.notEqual(compile(".a { color: red; }").hash, compile(".a { color: blue; }").hash);
});

test("hash is stable for identical content", () => {
  assert.equal(compile(".a { color: red; }").hash, compile(".a { color: red; }").hash);
});

test("selectors keep the leading dot", () => {
  assert.match(compile(".a { color: red; }").code, /\.a_\$\{h\}/);
});

test("generated code declares the expected exports", () => {
  const { code } = compile(".a { x: 1; }");
  assert.match(code, /export const css/);
  assert.match(code, /export const classes/);
  assert.match(code, /export function override/);
  assert.match(code, /export type ClassName = keyof typeof classes;/);
});

test("no classes still yields a valid module", () => {
  const { code, names } = compile("@media (min-width: 0) { * { color: red; } }");
  assert.deepEqual(names, []);
  assert.match(code, /export type ClassName = keyof typeof classes;/);
  assert.match(code, /classes = \{\s*\} as const/);
});

test("with filename, output ends with an inline base64 sourcemap", () => {
  const { code, map } = compile(".a { x: 1; } .b { y: 2; }", {
    filename: "sample.stylec.css",
  });
  assert.match(
    code.trim(),
    /\/\/# sourceMappingURL=data:application\/json;base64,[A-Za-z0-9+/=]+$/,
  );
  assert.ok(map);
  const parsed = JSON.parse(map);
  assert.equal(parsed.version, 3);
  assert.deepEqual(parsed.sources, ["sample.stylec.css"]);
  assert.deepEqual(parsed.names, ["a", "b"]);
  assert.equal(parsed.sourcesContent[0], ".a { x: 1; } .b { y: 2; }");
});

test("without filename, no sourcemap is emitted", () => {
  const { code, map } = compile(".a { x: 1; }");
  assert.ok(!code.includes("sourceMappingURL"));
  assert.equal(map, null);
});

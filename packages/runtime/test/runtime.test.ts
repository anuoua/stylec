import { test } from "node:test";
import assert from "node:assert/strict";
import { __hash, __toDecl, __override } from "../dist/index.js";

test("__hash is deterministic", () => {
  assert.equal(__hash("hello"), __hash("hello"));
});

test("__hash differs for different input", () => {
  assert.notEqual(__hash("hello"), __hash("world"));
});

test("__hash returns a base36 string", () => {
  assert.match(__hash("anything"), /^[0-9a-z]+$/);
});

test("__hash is stable for empty input", () => {
  assert.equal(typeof __hash(""), "string");
  assert.equal(__hash(""), __hash(""));
});

test("__hash distinguishes chars that share a low byte", () => {
  assert.notEqual(__hash("a"), __hash("\u0161"));
  assert.notEqual(__hash("你好"), __hash("伀好"));
  assert.equal(__hash("你好"), __hash("你好"));
});

test("__toDecl converts camelCase to kebab-case", () => {
  assert.equal(
    __toDecl({ color: "red", fontWeight: "bold", backgroundColor: "x" }),
    "color:red;font-weight:bold;background-color:x;",
  );
});

test("__toDecl handles empty object", () => {
  assert.equal(__toDecl({}), "");
});

test("__toDecl stringifies number values without units", () => {
  assert.equal(__toDecl({ zIndex: 10, opacity: 0.5 }), "z-index:10;opacity:0.5;");
});

test("__toDecl passes through custom properties", () => {
  assert.equal(__toDecl({ "--gap": "8px" }), "--gap:8px;");
});

const tmpl = (h: string) => `.main_${h}{color:red}.title_${h}{color:blue}`;

test("__override returns one class per name plus base css at a new hash", () => {
  const v = __override(["main", "title"], tmpl, "abc", {});
  assert.match(v.cssHash, /^[0-9a-z]+$/);
  assert.notEqual(v.cssHash, "abc");
  assert.equal(v.classes.main, "main_" + v.cssHash);
  assert.equal(v.classes.title, "title_" + v.cssHash);
  assert.ok(v.css.includes("." + v.classes.main + "{color:red}"));
  assert.ok(v.css.includes("." + v.classes.title + "{color:blue}"));
  assert.ok(!v.css.includes("green"));
});

test("__override appends declarations only for patched classes", () => {
  const v = __override(["main", "title"], tmpl, "abc", { title: { color: "green" } });
  assert.ok(v.css.includes("." + v.classes.title + "{color:green;}"));
  assert.ok(!v.css.includes("main_" + v.cssHash + "{color:green;}"));
});

test("__override is deterministic for the same patch", () => {
  const patch = { main: { color: "green" } };
  const a = __override(["main"], tmpl, "abc", patch);
  const b = __override(["main"], tmpl, "abc", patch);
  assert.equal(a.cssHash, b.cssHash);
  assert.equal(a.css, b.css);
});

test("__override with a different patch yields a different hash", () => {
  const a = __override(["main"], tmpl, "abc", { main: { color: "green" } });
  const b = __override(["main"], tmpl, "abc", { main: { color: "blue" } });
  assert.notEqual(a.cssHash, b.cssHash);
});

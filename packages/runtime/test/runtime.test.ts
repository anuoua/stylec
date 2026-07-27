import { test } from "node:test";
import assert from "node:assert/strict";
import { __hash, __toDecl } from "../dist/index.js";

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

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { compileAll, compileFile, findInputs, outPath } from "../dist/index.js";

const tmp = join(import.meta.dirname, "__cli_fixture__");

before(() => mkdirSync(tmp, { recursive: true }));
after(() => rmSync(tmp, { recursive: true, force: true }));

test("outPath swaps .stylec.css -> .stylec.ts", () => {
  assert.equal(outPath("/a/b.stylec.css"), "/a/b.stylec.ts");
});

test("findInputs recurses dirs and lists only .stylec.css", () => {
  mkdirSync(join(tmp, "sub"), { recursive: true });
  writeFileSync(join(tmp, "a.stylec.css"), ".a{}");
  writeFileSync(join(tmp, "sub", "b.stylec.css"), ".b{}");
  writeFileSync(join(tmp, "ignore.css"), "x");
  const inputs = findInputs(tmp).sort();
  assert.deepEqual(inputs, [join(tmp, "a.stylec.css"), join(tmp, "sub", "b.stylec.css")].sort());
});

test("compileAll writes sibling .stylec.ts with hashed classes", () => {
  writeFileSync(join(tmp, "c.stylec.css"), ".btn { color: red; }");
  const n = compileAll(tmp);
  assert.ok(n >= 1);
  const out = readFileSync(join(tmp, "c.stylec.ts"), "utf8");
  assert.match(out, /export const classes/);
  assert.match(out, /btn: "s_btn_/);
});

test("compileFile returns false on a read error", () => {
  assert.equal(compileFile(join(tmp, "does-not-exist.stylec.css")), false);
});

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { stylec } from "../dist/index.js";

const tmp = join(import.meta.dirname, "__vite_fixture__");

test("resolveId maps a .stylec.css specifier to a virtual id", () => {
  mkdirSync(tmp, { recursive: true });
  const importer = join(tmp, "app.ts");
  const p = stylec();
  const r = p.resolveId.call({}, "./x.stylec.css", importer);
  assert.equal(r, "\0stylec:" + join(tmp, "x.stylec.css"));
});

test("load compiles the css, returns JS, and registers a watch file", () => {
  mkdirSync(tmp, { recursive: true });
  const cssPath = join(tmp, "x.stylec.css");
  writeFileSync(cssPath, ".btn { color: red; }");
  const p = stylec();
  const watched = [];
  const ctx = { addWatchFile: (f) => watched.push(f) };
  const r = p.load.call(ctx, "\0stylec:" + cssPath);
  assert.ok(r && typeof r.code === "string");
  assert.match(r.code, /export const classes/);
  assert.match(r.code, /btn: "s_btn_/);
  assert.deepEqual(watched, [cssPath]);
});

test("resolveId leaves non-stylec specifiers alone", () => {
  const p = stylec();
  assert.equal(p.resolveId.call({}, "./foo.ts", join(tmp, "app.ts")), null);
});

after(() => rmSync(tmp, { recursive: true, force: true }));

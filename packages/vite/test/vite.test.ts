import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { stylec, outPath, findInputs, compileFile, compileAll } from "../dist/index.js";

type FakeWatcher = EventEmitter & { add(): void };

function runConfigureServer(plugin: ReturnType<typeof stylec>, watcher: FakeWatcher) {
  (plugin.configureServer as unknown as (server: { watcher: FakeWatcher }) => void)({
    watcher,
  });
}

const tmp = join(import.meta.dirname, "__vite_fixture__");

beforeEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
});

after(() => rmSync(tmp, { recursive: true, force: true }));

test("outPath swaps .stylec.css -> .stylec.ts", () => {
  assert.equal(outPath("/a/b/Foo.stylec.css"), "/a/b/Foo.stylec.ts");
});

test("findInputs walks dirs and lists only .stylec.css", () => {
  writeFileSync(join(tmp, "a.stylec.css"), ".a { color: red; }");
  mkdirSync(join(tmp, "sub"));
  writeFileSync(join(tmp, "sub/b.stylec.css"), ".b { color: blue; }");
  writeFileSync(join(tmp, "ignore.css"), "x {}");
  const found = findInputs(tmp);
  assert.equal(found.length, 2);
});

test("compileFile writes a sibling .stylec.ts with hashed classes", () => {
  const css = join(tmp, "c.stylec.css");
  writeFileSync(css, ".btn { color: red; }");
  assert.equal(compileFile(css), true);
  const out = outPath(css);
  assert.equal(existsSync(out), true);
  const code = readFileSync(out, "utf8");
  assert.match(code, /export const classes/);
  assert.match(code, /btn: "btn_/);
});

test("compileAll compiles every .stylec.css under the given roots", () => {
  writeFileSync(join(tmp, "a.stylec.css"), ".a { color: red; }");
  mkdirSync(join(tmp, "sub"));
  writeFileSync(join(tmp, "sub/b.stylec.css"), ".b { color: blue; }");
  const n = compileAll([tmp]);
  assert.equal(n, 2);
  assert.equal(existsSync(outPath(join(tmp, "a.stylec.css"))), true);
  assert.equal(existsSync(outPath(join(tmp, "sub/b.stylec.css"))), true);
});

test("buildStart compiles all .stylec.css under include", () => {
  writeFileSync(join(tmp, "a.stylec.css"), ".a { color: red; }");
  const p = stylec({ include: [tmp] });
  (p.buildStart as (this: unknown) => void).call({});
  assert.equal(existsSync(outPath(join(tmp, "a.stylec.css"))), true);
});

test("configureServer recompiles on watcher change and add", () => {
  const css = join(tmp, "watch.stylec.css");
  writeFileSync(css, ".x { color: red; }");
  const watcher = Object.assign(new EventEmitter(), { add() {} });
  const p = stylec({ include: [tmp] });
  runConfigureServer(p, watcher);
  writeFileSync(css, ".y { color: green; }");
  watcher.emit("change", css);
  assert.match(readFileSync(outPath(css), "utf8"), /y: "y_/);
  const css2 = join(tmp, "added.stylec.css");
  writeFileSync(css2, ".z { color: blue; }");
  watcher.emit("add", css2);
  assert.equal(existsSync(outPath(css2)), true);
});

test("configureServer ignores files outside include roots", () => {
  const inside = join(tmp, "in.stylec.css");
  const outside = join(tmp, "..", "out.stylec.css");
  writeFileSync(inside, ".i { color: red; }");
  writeFileSync(outside, ".o { color: red; }");
  const watcher = Object.assign(new EventEmitter(), { add() {} });
  const p = stylec({ include: [tmp] });
  runConfigureServer(p, watcher);
  watcher.emit("add", outside);
  assert.equal(existsSync(outPath(outside)), false);
  rmSync(outside, { force: true });
});

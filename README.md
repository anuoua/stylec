# stylec

Compile-time CSS-in-JS. Write normal CSS in `*.stylec.css`; the compiler emits a `*.stylec.ts` module with hashed class names, the raw CSS string, and a typed `override()` for scoped variants. There is **no injection logic** — injecting the CSS into the DOM is the framework's job.

## Packages

| package             | what                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| `@stylec/compiler`  | core: `compile(source, { filename })` → `{ code, map, hash, names }`     |
| `@stylec/runtime`   | tiny helpers (`__hash`, `__toDecl`) used by generated modules            |
| `@stylec/cli`       | `stylec <file-or-dir> [--watch] [--format <cmd>]`                        |
| `@stylec/vite`      | Vite plugin (compiles `.stylec.css` → sibling `.stylec.ts`, watch + HMR) |
| `@stylec/ts-plugin` | go-to-def jumps from `classes.x` into the `.stylec.css`                  |
| `stylec-vscode`     | VS Code extension — bundles the ts-plugin, zero config                   |

## Install

```sh
pnpm add @stylec/compiler @stylec/runtime
pnpm add -D @stylec/cli @stylec/vite
```

## Quick start (CLI)

`Button.stylec.css` (normal CSS — nesting, `&`, `var()` all work):

```css
.button {
  color: var(--btn-color, red);
}
.button:hover {
  color: blue;
}
```

```sh
npx stylec src --watch
```

emits `Button.stylec.ts`:

```ts
export const css = ".button_<hash>:hover{color:blue}...";
export const classes: Record<ClassName, string> = { button: "button_<hash>" };
export function override(patch) {
  /* ... */
}
```

Use it:

```ts
import { classes } from "./Button.stylec.ts";
<button className={classes.button} />;
```

## override (scoped variants)

```ts
import { classes, override } from "./Button.stylec.ts";

// module scope — computed once
const green = override({ button: { color: "green" } });

<button className={classes.button} />;        // default
<button className={green.classes.button} />;  // variant — new hash, only this instance
```

- **JS object**, keys constrained to known class names.
- **Merge**: un-overridden properties are kept; overridden ones win (appended last).
- **No chaining**; bound to the file's base.

## Global theming

Use CSS custom properties in the CSS and set them upstream — no special API:

```css
.button {
  color: var(--btn-color, red);
}
```

## Vite

```ts
import { defineConfig } from "vite";
import stylec from "@stylec/vite";

export default defineConfig({
  plugins: [stylec({ include: ["src"] })],
});
```

`include` is a list of directories (relative to the current working directory) to scan and watch; it defaults to `["src"]`. On `vite dev` and `vite build`, every `.stylec.css` under those roots is compiled to a sibling `.stylec.ts` — the same file the CLI emits. Creating or editing a `.stylec.css` recompiles it on the fly; the changed `.stylec.ts` then hot-reloads through Vite's normal pipeline. Import the emitted module as in the CLI flow:

```ts
import { classes } from "./Button.stylec.ts";
```

## Formatting

Pass a format command to run after each generated file is written. `{path}` is replaced with the `.stylec.ts` path:

```sh
stylec src --watch --format "prettier --write {path}"
```

```ts
stylec({ include: ["src"], format: "prettier --write {path}" })
```

Project-local binaries in `node_modules/.bin` are found automatically — no `npx` needed.

## Go-to-definition

cmd-click `classes.button` in a `.stylec.ts` → jumps to the `.button` rule in the source `.stylec.css`.

**VS Code** — install the [Stylec](https://marketplace.visualstudio.com/items?itemName=anuoua.stylec-vscode) extension.

## License

[MIT](./LICENSE) © [anuoua](https://github.com/anuoua)

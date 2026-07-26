# stylec

Compile-time CSS-in-JS. Write normal CSS in `*.stylec.css`; the compiler emits a `*.stylec.ts` module with hashed class names, the raw CSS string, and a typed `override()` for scoped variants. There is **no injection logic** — injecting the CSS into the DOM is the framework's job.

## Packages

| package             | what                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `@stylec/compiler`  | core: `compile(source, { filename })` → `{ code, map, hash, names }` |
| `@stylec/runtime`   | tiny helpers (`__hash`, `__toDecl`) used by generated modules        |
| `@stylec/cli`       | `stylec <file-or-dir> [--watch]`                                     |
| `@stylec/vite`      | Vite plugin (watch + HMR)                                            |
| `@stylec/ts-plugin` | go-to-def jumps from `classes.x` into the `.stylec.css`              |

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
export const css = ".s_button_<hash>:hover{color:blue}...";
export const classes: Record<ClassName, string> = { button: "s_button_<hash>" };
export function override(patch) {
  /* ... */
}
```

Use it:

```ts
import { classes } from "./Button.stylec.js";
<button className={classes.button} />;
```

## override (scoped variants)

```ts
import { classes, override } from "./Button.stylec.js";

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

export default defineConfig({ plugins: [stylec()] });
```

Edits to a `.stylec.css` hot-reload.

## Go-to-definition

Add to `tsconfig.json` (consumers on TS ≤5.x):

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@stylec/ts-plugin" }]
  }
}
```

cmd-click `classes.button` → jumps to `.button` in the CSS.

## Tests

```sh
pnpm test   # builds all packages, then runs node:test across the workspace
```

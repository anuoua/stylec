# stylec

Compile-time CSS-in-JS. Write normal CSS in `*.stylec.css`; the compiler emits a `*.stylec.ts` module with hashed class names, the raw CSS string, and a typed `override()` for scoped variants. There is **no injection logic** — injecting the CSS into the DOM is the framework's job.

## CLI

### Install

```sh
pnpm add @stylec/runtime
pnpm add -D @stylec/cli
```

### Quick start

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
export const cssHash = "<hash>";
export const css = ".button_<hash>:hover{color:blue}...";
export const classes: Record<ClassName, string> = { button: "button_<hash>" };
export function override(patch) {
  /* ... */
}
```

Use it — stylec emits no injection logic, so you must insert the exported `css` string into the DOM yourself (e.g. via a `<style>` tag) for the styles to take effect:

```ts
import { css, classes } from "./Button.stylec.ts";
// insert `css` into the DOM yourself — stylec does no injection

<button className={classes.button} />;
```

## Vite

### Install

```sh
pnpm add @stylec/runtime
pnpm add -D @stylec/vite
```

### Config

```ts
import { defineConfig } from "vite";
import stylec from "@stylec/vite";

export default defineConfig({
  plugins: [stylec({ include: ["src"] })],
});
```

`include` is a list of directories (relative to the current working directory) to scan and watch; it defaults to `["src"]`. On `vite dev` and `vite build`, every `.stylec.css` under those roots is compiled to a sibling `.stylec.ts` — the same file the CLI emits. Creating or editing a `.stylec.css` recompiles it on the fly; the changed `.stylec.ts` then hot-reloads through Vite's normal pipeline. Import the emitted module and inject the `css` as in the CLI flow:

```ts
import { css, classes } from "./Button.stylec.ts";
```

## Usage

### override

Use `override()` to generate a variant stylesheet and inject it **in place of** the original `css`.

```ts
import { override } from "./Button.stylec.ts";

const { css, classes } = override({ button: { color: "green" } });
// inject `css`, then use the variant's `classes`
<button className={classes.button} />;
```

### cssHash

`cssHash` is the raw hash behind the class names — `classes.x` equals `"x_" + cssHash`, and `override()` returns its own `cssHash` for the variant. It exists as an escape hatch: `override` only emits simple `.name_hash{…}` rules, so when a complex selector buries a hashed class somewhere it can't reach (e.g. `.parent .button .child`), you can rebuild the selector yourself:

```ts
import { cssHash, classes, override } from "./Button.stylec.ts";

const overrideGreen = override({ button: { color: "green" } });
// override can't override `.parent .button .child`

const green = `.parent .button_${cssHash} .child { color: green; }`;
// insert `extra` into the DOM
```

### Global theming

Use CSS custom properties in the CSS and set them upstream — no special API:

```css
.button {
  color: var(--btn-color, red);
}
```

### Formatting

Pass a format command to run after each generated file is written. `{path}` is replaced with the `.stylec.ts` path:

```sh
stylec src --watch --format "prettier --write {path}"
```

```ts
stylec({ include: ["src"], format: "prettier --write {path}" });
```

Project-local binaries in `node_modules/.bin` are found automatically — no `npx` needed.

## VS Code

cmd-click `classes.button` in a `.stylec.ts` → jumps to the `.button` rule in the source `.stylec.css`.

Install the [Stylec](https://marketplace.visualstudio.com/items?itemName=anuoua.stylec-vscode) extension.

## License

[MIT](./LICENSE) © [anuoua](https://github.com/anuoua)

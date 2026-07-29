# Stylec

Go-to-definition from generated `.stylec.ts` classes to `.stylec.css` sources.

When you cmd-click `classes.button` in a `.stylec.ts` file, this extension jumps you to the corresponding `.button` rule in the source `.stylec.css`.

## How it works

[stylec](https://github.com/anuoua/stylec) compiles `.stylec.css` files into `.stylec.ts` modules with hashed class names. This extension bundles a TypeScript server plugin that maps those generated class names back to their original CSS source locations.

**Zero configuration.** Install the extension and go-to-definition works automatically — no `tsconfig.json` edits, no `typescript.tsserver.pluginPaths`.

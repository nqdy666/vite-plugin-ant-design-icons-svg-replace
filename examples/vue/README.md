# vite-plugin-ant-design-icons-svg-replace - Vue 3 Example

This example demonstrates how to use `vite-plugin-ant-design-icons-svg-replace` to replace Ant Design Icons SVG with custom SVG paths in a Vue 3 + Vite project.

## How it works

1. The plugin is configured in [vite.config.ts](vite.config.ts) with a `configPath` pointing to [customAntdIcon.json](customAntdIcon.json).
2. In `customAntdIcon.json`, you define which icons to replace and provide custom SVG path data (`d` for regular icons, `paths` for TwoTone icons).
3. The plugin intercepts `@ant-design/icons-svg` module resolution at both Vite's pre-bundling and runtime loading phases, replacing matched icons with generated compatible modules.

## Configuration

### JSON config file ([customAntdIcon.json](customAntdIcon.json))

```json
[
  {
    "name": "HomeOutlined",
    "d": "M458.112 ..."
  },
  {
    "name": "SettingTwoTone",
    "paths": [
      { "d": "...", "fill": "secondary" },
      { "d": "...", "fill": "primary" }
    ]
  }
]
```

### Inline config in vite.config.ts

You can also pass replacements directly in the plugin options:

```ts
VitePluginAntDesignIconsSvgReplace({
  replacements: [
    { name: 'HomeOutlined', d: 'M...' },
  ],
})
```

Inline replacements take precedence over JSON config for the same icon name.

## Running the example

```bash
cd examples/vue
pnpm install
pnpm dev
```

Then open the browser to see the replaced icons rendering with custom SVG paths.

## Build

```bash
pnpm build
pnpm preview
```

The replaced icons work in production builds as well, since the plugin handles both dev server and build phases.

<h2 align='center'><samp>vite-plugin-ant-design-icons-svg-replace</samp></h2>

<p align='center'>ant design icons svg replace plugin for Vite</p>

<p align='center'>
<a href='https://www.npmjs.com/package/vite-plugin-ant-design-icons-svg-replace'>
<img src='https://img.shields.io/npm/v/vite-plugin-ant-design-icons-svg-replace?color=222&style=flat-square'>
</a>
</p>

<br>

## Usage

Install

```bash
npm i vite-plugin-ant-design-icons-svg-replace -D # yarn add vite-plugin-ant-design-icons-svg-replace -D
```

Add it to `vite.config.js`

```ts
// vite.config.js
import ViteAntDesignIconsSvgReplace from 'vite-plugin-ant-design-icons-svg-replace'

export default {
  plugins: [
    ViteAntDesignIconsSvgReplace({
      replacements: [
        {
          name: 'DownOutlined',
          d: 'M458.112 684.032a64 64 0 0 0 107.776 0l160-249.472a64 64 0 0 0-53.824-98.56H352a64 64 0 0 0-53.888 98.56l160 249.472z'
        },
        {
          name: 'UpOutlined',
          d: 'M565.888 339.968a64 64 0 0 0-107.776 0l-160 249.472a64 64 0 0 0 53.824 98.56h320.128a64 64 0 0 0 53.824-98.56l-160-249.472z'
        },
      ],
    })
  ],
}
```

## Notes

If it doesn't work, try deleting this directory `node_modules/.vite`

## License

MIT License © 2026 [nianqin](https://github.com/nqdy666)

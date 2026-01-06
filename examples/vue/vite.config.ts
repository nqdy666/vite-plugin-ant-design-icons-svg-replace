import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import VitePluginAntDesignIconsSvgReplace from 'vite-plugin-ant-design-icons-svg-replace'

// https://vite.dev/config/
export default defineConfig({
  // optimizeDeps: {
  //   exclude: ['@ant-design/icons-svg'],
  // },
  plugins: [
    vue(),
    VitePluginAntDesignIconsSvgReplace({
      configPath: 'customAntdIcon.json',
      // replacements: [
      //   {
      //     name: 'HomeOutlined',
      //     d: 'M458.112 684.032a64 64 0 0 0 107.776 0l160-249.472a64 64 0 0 0-53.824-98.56H352a64 64 0 0 0-53.888 98.56l160 249.472z',
      //   },
      //   {
      //     name: 'HomeFilled',
      //     d: 'M458.112 684.032a64 64 0 0 0 107.776 0l160-249.472a64 64 0 0 0-53.824-98.56H352a64 64 0 0 0-53.888 98.56l160 249.472z',
      //   },
      //   {
      //     name: 'SettingTwoTone',
      //     paths: [
      //       { d: 'M458.112 684.032a64 64 0 0 0 107.776 0l160-249.472a64 64 0 0 0-53.824-98.56H352a64 64 0 0 0-53.888 98.56l160 249.472z', fill: 'secondary' },
      //       { d: 'M512 179.2c-181.12 0-329.6 148.48-329.6 329.6s148.48 329.6 329.6 329.6 329.6-148.48 329.6-329.6S693.12 179.2 512 179.2zm0 550.4c-121.344 0-220.8-99.456-220.8-220.8s99.456-220.8 220.8-220.8 220.8 99.456 220.8 220.8-99.456 220.8-220.8 220.8z', fill: 'primary' },
      //     ],
      //   },
      // ],
    }) as any,
  ],
})

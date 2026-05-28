import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import pxToViewport from 'postcss-px-to-viewport-8-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
  css: {
    postcss: {
      plugins: [
        pxToViewport({
          viewportWidth: 375,
          unitPrecision: 5,
          propList: ['*'],
          selectorBlackList: [],
          minPixelValue: 1,
          mediaQuery: false,
        }),
      ],
    },
  },
})

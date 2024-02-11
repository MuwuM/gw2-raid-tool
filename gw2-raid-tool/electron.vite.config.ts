import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const config = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          ['gw2-interface']: resolve('src/main/gw2-interface.ts'),
          ['arc-interface']: resolve('src/main/arc-interface.ts'),
          pack: resolve('src/main/pack.ts')
        },
        external: [
          'ssh2-sftp-client',
          'electron-winstaller',
          '@electron/rebuild',
          '@electron/packager',
          'minimatch'
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          'locked-skill': resolve('src/renderer/locked-skill.html')
        }
      }
    }
  }
})

export default config

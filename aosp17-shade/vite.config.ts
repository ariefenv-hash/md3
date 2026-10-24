import { defineConfig } from 'vite'

export default defineConfig({
  // base './' 使构建产物可被部署在任意子路径（预览窗口挂载于 /shade/）
  base: './',
  server: { host: '0.0.0.0', port: 3000 },
  build: { target: 'es2022' },
})

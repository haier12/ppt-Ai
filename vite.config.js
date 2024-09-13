import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/parth': {
        target: 'https://zwapi.xfyun.cn', // 第三方API的地址
        changeOrigin: true, // 改变请求的起源
        rewrite: (path) => path.replace(/^\/parth/, '') // 重写路径
      },
      '/v1': {
        target: 'https://spark-api-open.xf-yun.com',
        changeOrigin: true,    
      },
      '/openapi': {
        target: 'https://chatdoc.xfyun.cn',
        changeOrigin: true,    
      }
    }
  }
});
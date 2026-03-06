/*import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/editor/',
  plugins: [
    vue(),
    mkcert(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
*/
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

const API_TARGET = "https://10.42.205.102:8080"; // ton backend https

export default defineConfig({
  base: "/editor/",
  plugins: [vue(), mkcert()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },

  server: {
    host: true,          // accessible depuis tablette
    port: 8082,
    https: true,         // mkcert
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,   // mkcert / cert local
      },
      "/public": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
/*import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig({
  base : "/viewer/",
  plugins: [
    vue(),
    mkcert(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
*/
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

const API_TARGET = "https://10.42.205.102:8080";

export default defineConfig({
  base: "/viewer/",
  plugins: [vue(), mkcert()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },

  server: {
    host: true,
    port: 8081,
    https: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true, secure: false },
      "/public": { target: API_TARGET, changeOrigin: true, secure: false },
    },
  },
});
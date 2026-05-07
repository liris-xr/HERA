import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "fs"; // for certificates

export default defineConfig({
  base: "/viewer/", // base path
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    https: {
      // relative paths
      key: fs.readFileSync(
        fileURLToPath(
          new URL("../../backend/api/privatekey.key", import.meta.url),
        ),
      ),
      cert: fs.readFileSync(
        fileURLToPath(
          new URL("../../backend/api/certificate.crt", import.meta.url),
        ),
      ),
    },
  },
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const keyPath = path.resolve(projectRoot, "certs/dev-key.pem");
const certPath = path.resolve(projectRoot, "certs/dev.pem");

function readHttpsConfig() {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    throw new Error(
      "Missing development HTTPS certificates. Run from the repository root: node scripts/setup-dev-https.mjs",
    );
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.VITE_API_PORT || "8080";
  const apiTarget = env.VITE_DEV_API_TARGET || `https://localhost:${apiPort}`;

  return {
    base: "/editor/",
    plugins: [vue()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: command === "serve" ? {
      host: true,
      port: 8082,
      https: readHttpsConfig(),
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true, secure: false },
        "/public": { target: apiTarget, changeOrigin: true, secure: false },
      },
    } : undefined,
  };
});

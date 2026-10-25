import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// API_URL comes from the repo-root .env, shared with the mobile app.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
// Shared components (shared/) are written with React Native; on the web
// they render through react-native-web.
const reactNativeWeb = resolve(repoRoot, "node_modules/react-native-web");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiUrl = env.API_URL || "http://localhost:3000";

  return {
    envDir: repoRoot,
    plugins: [react()],
    optimizeDeps: {
      rolldownOptions: {
        resolve: {
          extensions: [
            ".web.mjs",
            ".mjs",
            ".web.js",
            ".js",
            ".web.ts",
            ".ts",
            ".web.tsx",
            ".tsx",
            ".json",
          ],
        },
      },
    },
    resolve: {
      extensions: [
        ".web.mjs",
        ".mjs",
        ".web.js",
        ".js",
        ".web.ts",
        ".ts",
        ".web.tsx",
        ".tsx",
        ".json",
      ],
      alias: {
        "react-native": reactNativeWeb,
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": apiUrl,
        "/healthcheck": apiUrl,
      },
    },
  };
});

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// API_URL comes from the repo-root .env, shared with the mobile app.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
// Shared components (shared/) are written with React Native; on the web
// they render through react-native-web.
const reactNativeWeb = resolve(repoRoot, "node_modules/react-native-web");
// react-native-svg loads its touch-sound module only on Android, but the
// bundler still resolves it; the web gets an empty stand-in.
const svgSoundModule = "../fabric/NativeSvgSoundModule";
const svgSoundStub = resolve(repoRoot, "web/src/shims/svg-sound-module.ts");

// .web files first, so a package like react-native-svg uses its web build.
const extensions = [
  ".web.mjs",
  ".mjs",
  ".web.js",
  ".js",
  ".web.ts",
  ".ts",
  ".web.tsx",
  ".tsx",
  ".json",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiUrl = env.API_URL || "http://localhost:3000";

  return {
    envDir: repoRoot,
    plugins: [react()],
    resolve: {
      extensions,
      alias: [
        { find: svgSoundModule, replacement: svgSoundStub },
        // react-native-svg looks up bundled images here; react-native-web
        // keeps the same registry under its own name.
        {
          find: "@react-native/assets-registry/registry",
          replacement: resolve(reactNativeWeb, "dist/modules/AssetRegistry"),
        },
        { find: "react-native", replacement: reactNativeWeb },
      ],
    },
    // The dev server pre-bundles dependencies separately and needs the same
    // order, or react-native-svg pulls in its native components.
    optimizeDeps: {
      rolldownOptions: {
        resolve: { extensions, alias: { [svgSoundModule]: svgSoundStub } },
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

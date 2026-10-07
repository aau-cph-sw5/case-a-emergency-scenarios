import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import node from "eslint-plugin-n";
import react from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "coverage/",
      "dist/",
      "build/",
      "web/dist/",
      "mobile/.expo/",
      "mobile/dist/",
      "mobile/expo-env.d.ts",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    extends: [
      eslint.configs.recommended,
      node.configs["flat/recommended"],
      react.configs.recommended,
      react.configs["disable-conflict-eslint-plugin-react-hooks"],
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // TypeScript API server (src/).
    files: ["src/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      node.configs["flat/recommended"],
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Frontends (web/, mobile/) and their shared packages.
    files: ["{web,mobile,packages}/**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      react.configs["recommended-typescript"],
      react.configs["disable-conflict-eslint-plugin-react-hooks"],
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["web/vite.config.ts", "mobile/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier,
]);

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import node from "eslint-plugin-n";
import react from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["coverage/", "dist/", "build/"],
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
  eslintConfigPrettier,
]);

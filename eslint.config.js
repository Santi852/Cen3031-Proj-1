import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/playwright-report/**",
    "**/test-results/**",
  ]),
  {
    files: ["**/*.{js,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ["backend/**/*.ts", "frontend/*.ts", "frontend/e2e/**/*.ts", "*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  prettier,
]);

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import { typeAwareRules } from "./typescript-rules.js";

export default tseslint.config(
  { ignores: ["dist/**", "build/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: typeAwareRules,
  },
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
);

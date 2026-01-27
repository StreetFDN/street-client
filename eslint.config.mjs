import js from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    // Ignore build artifacts
    { ignores: ["dist/**", "node_modules/**"] },

    js.configs.recommended,

    ...tsEslint.configs.recommended,

    // Turn off stylistic rules that conflict with Prettier
    eslintConfigPrettier,
];
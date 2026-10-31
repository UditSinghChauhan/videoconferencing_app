import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["build", "playwright-report", "test-results"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.strict],
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true, allowExportNames: ["useAuth", "useToast"] }],
            "no-console": ["error", { allow: ["warn", "error"] }],
            "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true }]
        }
    },
    {
        files: ["tests/**/*.js", "playwright.config.js"],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        extends: [js.configs.recommended]
    }
);

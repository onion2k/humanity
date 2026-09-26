// Lint is for mistakes, not style: the type-aware rules are the point, and
// Prettier decides the formatting.
import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "dist/",
      "dist-test/",
      "test-results/",
      ".astro/",
      "node_modules/",
      "design-system/",
      "prototype/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...astro.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["**/*.astro", "eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/*.ts"],
    rules: {
      // Numbers read fine in a template string; the rule is for objects that print as [object Object].
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    rules: {
      // Math.random would break the house rule that chance comes from one seeded source.
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the seeded source." },
      ],
    },
  },
);

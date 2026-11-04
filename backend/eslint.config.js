import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist", "coverage", "perf/results"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      complexity: ["error", 12],
      "max-depth": ["error", 3],
      "max-params": ["error", 6],
    },
  },
  {
    files: ["test/**"],
    rules: { complexity: "off" },
  }
)
